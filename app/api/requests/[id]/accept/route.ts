import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isCodeFulfillmentMode,
  isTransferFulfillmentMode,
  resolveFulfillmentMode,
} from "@/lib/fulfillment";
import {
  validateAcceptRequest,
  validateFulfillmentModeOverride,
} from "@/lib/validation";

const CODE_EXPIRY_MS = 15 * 60 * 1000;

async function parseBody(request: NextRequest): Promise<{
  fulfillmentModeOverride?: unknown;
}> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    const body = await request.json();
    return {
      fulfillmentModeOverride: body?.fulfillmentModeOverride,
    };
  } catch {
    return {};
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const { fulfillmentModeOverride } = await parseBody(request);

    const donorSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        defaultFulfillmentMode: true,
        getCredential: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!donorSettings) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const modeValidation = validateFulfillmentModeOverride(
      fulfillmentModeOverride
    );
    if (!modeValidation.valid) {
      return NextResponse.json(
        { error: modeValidation.error },
        { status: modeValidation.status }
      );
    }

    const fulfillmentMode =
      modeValidation.mode ??
      resolveFulfillmentMode(donorSettings.defaultFulfillmentMode);
    const shouldTransfer = isTransferFulfillmentMode(fulfillmentMode);
    const shouldIssueCode = isCodeFulfillmentMode(fulfillmentMode);

    if (shouldIssueCode && !donorSettings.getCredential) {
      return NextResponse.json(
        { error: "Connect your GET account before using code fulfillment" },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (existingRequest.requesterId === user.id) {
      return NextResponse.json(
        { error: "You cannot accept your own request" },
        { status: 400 }
      );
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Request is no longer pending" },
        { status: 400 }
      );
    }

    let donorBalance = 0;
    if (shouldTransfer) {
      const donorPoints = await prisma.points.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          balance: 0,
        },
      });

      donorBalance = donorPoints.balance;
      const validation = validateAcceptRequest(
        existingRequest,
        user.id,
        donorBalance
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: validation.status }
        );
      }

      await prisma.points.upsert({
        where: { userId: existingRequest.requesterId },
        update: {},
        create: {
          userId: existingRequest.requesterId,
          balance: 0,
        },
      });
    }

    const now = new Date();
    const codeExpiresAt = shouldIssueCode
      ? new Date(now.getTime() + CODE_EXPIRY_MS)
      : null;

    const operations = [];

    if (shouldTransfer) {
      operations.push(
        prisma.points.update({
          where: { userId: user.id },
          data: {
            balance: {
              decrement: existingRequest.pointsRequested,
            },
          },
        })
      );
      operations.push(
        prisma.points.update({
          where: { userId: existingRequest.requesterId },
          data: {
            balance: {
              increment: existingRequest.pointsRequested,
            },
          },
        })
      );
    }

    operations.push(
      prisma.request.update({
        where: { id: requestId },
        data: {
          status: "accepted",
          donorId: user.id,
          fulfillmentMode,
          codeIssuedAt: shouldIssueCode ? now : null,
          codeExpiresAt,
          completedAt: null,
          completionTrigger: null,
        },
      })
    );

    operations.push(
      prisma.notification.create({
        data: {
          userId: existingRequest.requesterId,
          type: "request_accepted",
          message: `${user.name || user.email} accepted your request for ${existingRequest.pointsRequested} points at ${existingRequest.location}`,
          read: false,
        },
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({
      success: true,
      fulfillmentMode,
      transferredPoints: shouldTransfer ? existingRequest.pointsRequested : 0,
      donorBalanceBeforeTransfer: shouldTransfer ? donorBalance : null,
    });
  } catch (error) {
    console.error("Error accepting request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
