import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCodeFulfillmentMode } from "@/lib/fulfillment";
import { decryptSecret } from "@/lib/crypto";
import {
  authenticatePIN,
  retrievePatronBarcodePayload,
  retrieveTransactionsSince,
} from "@/lib/get-client";

const CODE_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_MS = 5_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;

    const requestRecord = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        donor: {
          select: {
            id: true,
            getCredential: {
              select: {
                userId: true,
                encryptedDeviceId: true,
                encryptedPin: true,
              },
            },
          },
        },
      },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (requestRecord.requesterId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (requestRecord.status === "completed" && requestRecord.completedAt) {
      return NextResponse.json({
        state: "completed",
        completedAt: requestRecord.completedAt.toISOString(),
      });
    }

    if (requestRecord.status !== "accepted") {
      return NextResponse.json({
        state: "unavailable",
        reason: "not_accepted",
      });
    }

    if (!isCodeFulfillmentMode(requestRecord.fulfillmentMode)) {
      return NextResponse.json({
        state: "unavailable",
        reason: "not_code_mode",
      });
    }

    if (!requestRecord.donor?.getCredential) {
      return NextResponse.json({
        state: "unavailable",
        reason: "donor_unlinked",
      });
    }

    const now = new Date();
    const patchData: { codeIssuedAt?: Date; codeExpiresAt?: Date } = {};
    let codeIssuedAt = requestRecord.codeIssuedAt;
    let codeExpiresAt = requestRecord.codeExpiresAt;

    if (!codeIssuedAt) {
      codeIssuedAt = now;
      patchData.codeIssuedAt = now;
    }

    if (!codeExpiresAt || codeExpiresAt.getTime() <= now.getTime()) {
      codeExpiresAt = new Date(now.getTime() + CODE_EXPIRY_MS);
      patchData.codeExpiresAt = codeExpiresAt;
    }

    if (Object.keys(patchData).length > 0) {
      await prisma.request.update({
        where: { id: requestId },
        data: patchData,
      });
    }

    const credential = requestRecord.donor.getCredential;

    let sessionId = "";
    let payload = "";
    let transactionsCount = 0;

    try {
      const deviceId = decryptSecret(credential.encryptedDeviceId);
      const pin = decryptSecret(credential.encryptedPin);
      sessionId = await authenticatePIN(deviceId, pin);
      payload = await retrievePatronBarcodePayload(sessionId);
      const transactions = await retrieveTransactionsSince(sessionId, codeIssuedAt);
      transactionsCount = transactions.length;

      await prisma.getCredential.update({
        where: { userId: credential.userId },
        data: { lastValidatedAt: new Date() },
      });
    } catch (error) {
      console.error("Failed to fetch GET scan payload:", error);
      return NextResponse.json({
        state: "unavailable",
        reason: "donor_unlinked",
      });
    }

    if (transactionsCount > 0) {
      const completedAt = new Date();

      await prisma.request.update({
        where: { id: requestId },
        data: {
          status: "completed",
          completedAt,
          completionTrigger: "first_get_transaction",
          codeExpiresAt: completedAt,
        },
      });

      return NextResponse.json({
        state: "completed",
        completedAt: completedAt.toISOString(),
      });
    }

    if (!sessionId || !payload) {
      return NextResponse.json({
        state: "unavailable",
        reason: "donor_unlinked",
      });
    }

    return NextResponse.json({
      state: "active",
      payload,
      expiresAt: codeExpiresAt.toISOString(),
      refreshMs: REFRESH_MS,
    });
  } catch (error) {
    console.error("Error fetching request scan payload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
