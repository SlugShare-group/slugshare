import { getCurrentUser } from "@/lib/auth";
import { retrieveAccounts, retrieveBarcodePayload } from "@/lib/get/adapter";
import { getErrorResponse } from "@/lib/get/response";
import {
  getActiveGetSessionForUser,
  markCredentialInvalid,
  shouldInvalidateCredential,
} from "@/lib/get/server";
import { prisma } from "@/lib/prisma";

function testingEnabled() {
  return process.env.ENABLE_TESTING_LAB === "true";
}

export async function GET(req: Request) {
  if (!testingEnabled()) {
    return getErrorResponse("authorization_error", "Testing lab is disabled", 404, false);
  }

  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return getErrorResponse("authentication_error", "Unauthorized", 401, false);
    }

    const credential = await prisma.getCredential.findUnique({
      where: { userId: user.id },
    });

    if (!credential || credential.status !== "linked") {
      return Response.json({
        linked: false,
        status: credential?.status ?? "unlinked",
      });
    }

    let accounts: Awaited<ReturnType<typeof retrieveAccounts>> | null = null;
    let barcodeSampleState = "not_requested";
    let activeSessionId: string | null = null;

    try {
      const activeSession = await getActiveGetSessionForUser(user.id);
      activeSessionId = activeSession.sessionId;
      accounts = await retrieveAccounts(activeSession.sessionId);
    } catch (error) {
      if (shouldInvalidateCredential(error)) {
        await markCredentialInvalid(user.id, "auth_invalid");
      }
      throw error;
    }

    const requestId = new URL(req.url).searchParams.get("requestId");
    if (requestId) {
      const request = await prisma.request.findUnique({
        where: { id: requestId },
      });

      if (request && request.requesterId === user.id && request.selectedFulfillmentMode === "qr_code") {
        try {
          if (activeSessionId) {
            await retrieveBarcodePayload(activeSessionId);
          }
          barcodeSampleState = "ok";
        } catch {
          barcodeSampleState = "failed";
        }
      } else {
        barcodeSampleState = "skipped";
      }
    }

    return Response.json({
      linked: true,
      status: credential.status,
      model: credential.encryptedPin && credential.deviceId ? "pin_device" : "unknown",
      deviceIdTail: credential.deviceId ? credential.deviceId.slice(-4) : null,
      linkedAt: credential.linkedAt,
      lastValidatedAt: credential.lastValidatedAt,
      accountsCount: accounts?.length ?? 0,
      accountsPreview: (accounts ?? []).slice(0, 5).map((account) => ({
        id: account.id,
        accountDisplayName: account.accountDisplayName,
        balance: account.balance,
      })),
      barcodeSampleState,
    });
  } catch (error) {
    console.error("GET testing endpoint failed:", error);
    return getErrorResponse(
      "internal_error",
      "GET testing diagnostics failed",
      500,
      false
    );
  }
}
