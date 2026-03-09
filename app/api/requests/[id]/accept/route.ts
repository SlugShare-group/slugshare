import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateAcceptRequest } from "@/lib/validation";
import { sendRequestAcceptedEmail } from "@/lib/email";

const QR_EXPIRY_MS = 10 * 365 * 24 * 60 * 60 * 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = (await req.json()) as { mode?: unknown };
    const mode = body.mode;

    if (mode !== "in_person" && mode !== "qr_code") {
      return NextResponse.json(
        { error: "Mode is required and must be in_person or qr_code" },
        { status: 400 }
      );
    }

    // Get the request
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (request.requesterId === user.id) {
      return NextResponse.json(
        { error: "You cannot accept your own request" },
        { status: 400 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "Request is no longer pending" },
        { status: 400 }
      );
    }

    if (mode === "in_person" && !request.inPersonAllowed) {
      return NextResponse.json(
        { error: "This request does not allow in-person fulfillment" },
        { status: 400 }
      );
    }

    if (mode === "qr_code" && !request.qrCodeAllowed) {
      return NextResponse.json(
        { error: "This request does not allow QR fulfillment" },
        { status: 400 }
      );
    }

    if (mode === "in_person") {
      const donorPoints = await prisma.points.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          balance: 0,
        },
      });

      const validation = validateAcceptRequest(request, user.id, donorPoints.balance);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: validation.status }
        );
      }

      await prisma.points.upsert({
        where: { userId: request.requesterId },
        update: {},
        create: {
          userId: request.requesterId,
          balance: 0,
        },
      });

      const completedAt = new Date();
      await prisma.$transaction([
        prisma.points.update({
          where: { userId: user.id },
          data: {
            balance: {
              decrement: request.pointsRequested,
            },
          },
        }),
        prisma.points.update({
          where: { userId: request.requesterId },
          data: {
            balance: {
              increment: request.pointsRequested,
            },
          },
        }),
        prisma.request.update({
          where: { id: requestId },
          data: {
            status: "completed",
            donorId: user.id,
            selectedFulfillmentMode: "in_person",
            completedAt,
            completionReason: "in_person_accept",
          },
        }),
        prisma.notification.create({
          data: {
            userId: request.requesterId,
            type: "request_completed",
            message: `${user.name || user.email} completed your request for ${request.pointsRequested} points at ${request.location}`,
            read: false,
          },
        }),
        prisma.notification.create({
          data: {
            userId: user.id,
            type: "request_completed_by_you",
            message: `You completed ${request.requester.name || request.requester.email}'s request for ${request.pointsRequested} points at ${request.location}`,
            read: false,
          },
        }),
      ]);

      // Email notification for in-person completes
      if (request.requester.email) {
        await sendRequestAcceptedEmail({
          requesterEmail: request.requester.email,
          requesterName: request.requester.name,
          donorEmail: user.email || "",
          donorName: user.name,
          location: request.location,
          pointsRequested: request.pointsRequested,
          mode: "completed",
        });
      }
    } else {
      const credential = await prisma.getCredential.findUnique({
        where: { userId: user.id },
      });

      if (
        !credential ||
        credential.status !== "linked" ||
        !credential.deviceId ||
        !credential.encryptedPin
      ) {
        return NextResponse.json(
          { error: "Link your GET account before accepting QR requests" },
          { status: 400 }
        );
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + QR_EXPIRY_MS);

      await prisma.$transaction([
        prisma.request.update({
          where: { id: requestId },
          data: {
            status: "accepted",
            donorId: user.id,
            selectedFulfillmentMode: "qr_code",
            completedAt: null,
            completionReason: null,
          },
        }),
        prisma.getFulfillment.upsert({
          where: { requestId },
          create: {
            requestId,
            requesterId: request.requesterId,
            donorId: user.id,
            status: "active",
            issuedAt: now,
            expiresAt,
          },
          update: {
            requesterId: request.requesterId,
            donorId: user.id,
            status: "active",
            issuedAt: now,
            expiresAt,
            baselineAccountsJson: null,
            completedAt: null,
            completionReason: null,
            completionDelta: null,
            lastCheckedAt: null,
          },
        }),
        prisma.notification.create({
          data: {
            userId: request.requesterId,
            type: "request_accepted",
            message: `${user.name || user.email} accepted your QR request for ${request.pointsRequested} points at ${request.location}. Open the scan screen to redeem.`,
            read: false,
          },
        }),
        prisma.notification.create({
          data: {
            userId: user.id,
            type: "request_accepted_by_you",
            message: `You accepted ${request.requester.name || request.requester.email}'s QR request for ${request.pointsRequested} points at ${request.location}`,
            read: false,
          },
        }),
      ]);

      // Email notification for QR accepts
      if (request.requester.email) {
        await sendRequestAcceptedEmail({
          requesterEmail: request.requester.email,
          requesterName: request.requester.name,
          donorEmail: user.email || "",
          donorName: user.name,
          location: request.location,
          pointsRequested: request.pointsRequested,
          mode: "qr_code",
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
