import { getCurrentUser } from "@/lib/auth";
import { retrieveAccounts } from "@/lib/get/adapter";
import {
  detectBalanceDrop,
  parseBalanceSnapshot,
  toBalanceSnapshot,
} from "@/lib/get/fulfillment";
import { getErrorResponse } from "@/lib/get/response";
import {
  getActiveGetSessionForUser,
  getLinkedCredentialForUser,
  markCredentialInvalid,
  shouldInvalidateCredential,
} from "@/lib/get/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return getErrorResponse("authentication_error", "Unauthorized", 401, false);
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    if (!requestId) {
      return getErrorResponse("validation_error", "requestId is required", 400, false);
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { getFulfillment: true },
    });

    if (!request) {
      return getErrorResponse("validation_error", "Request not found", 404, false);
    }

    if (request.requesterId !== user.id) {
      return getErrorResponse(
        "authorization_error",
        "You cannot access this request",
        403,
        false
      );
    }

    if (request.selectedFulfillmentMode !== "qr_code") {
      return Response.json({ state: "unavailable", reason: "wrong_mode" }, { status: 200 });
    }

    if (request.status === "completed") {
      return Response.json(
        {
          state: "completed",
          completedAt: request.completedAt?.toISOString() ?? null,
          completionReason: request.completionReason,
        },
        { status: 200 }
      );
    }

    if (!request.getFulfillment || !request.donorId) {
      return Response.json({ state: "unavailable", reason: "not_ready" }, { status: 200 });
    }

    const fulfillment = request.getFulfillment;
    const now = new Date();

    if (fulfillment.status === "completed") {
      return Response.json(
        {
          state: "completed",
          completedAt: fulfillment.completedAt?.toISOString() ?? null,
          completionReason: fulfillment.completionReason,
          completionDelta: fulfillment.completionDelta,
        },
        { status: 200 }
      );
    }

    //Checks if qr code is expired, so either marked as expired or the current time has passed expiration
    if (fulfillment.status === "expired" || now >= fulfillment.expiresAt) {
      //If just expired then update database
      if (fulfillment.status !== "expired") {
        //Marks qr code expired, records why it ended, saves when it expired, updates last checked time So officailly closes out the qr code in the system
        await prisma.getFulfillment.update({
          where: { requestId: request.id },
          data: {
            status: "expired",
            completionReason: "qr_expired",
            completedAt: now,
            lastCheckedAt: now,
          },
        });
      }
      //Return the response to the frontend
      return Response.json(
        {
          state: "unavailable",
          reason: "expired",
          expiresAt: fulfillment.expiresAt.toISOString(),
        },
        { status: 200 }
      );
    }

    const credential = await getLinkedCredentialForUser(request.donorId);
    if (!credential) {
      return Response.json(
        {
          state: "unavailable",
          reason: "donor_not_linked",
        },
        { status: 200 }
      );
    }

    let accounts;
    try {
      const { sessionId } = await getActiveGetSessionForUser(request.donorId);
      accounts = await retrieveAccounts(sessionId);
    } catch (error) {
      if (shouldInvalidateCredential(error)) {
        await markCredentialInvalid(request.donorId, "auth_invalid");
        return Response.json(
          {
            state: "unavailable",
            reason: "invalid_session",
          },
          { status: 200 }
        );
      }

      return Response.json(
        {
          state: "unavailable",
          reason: "upstream_unavailable",
        },
        { status: 200 }
      );
    }

    if (!fulfillment.baselineAccountsJson) {
      await prisma.getFulfillment.update({
        where: { requestId: request.id },
        data: {
          baselineAccountsJson: JSON.stringify(toBalanceSnapshot(accounts)),
          lastCheckedAt: now,
        },
      });

      return Response.json(
        {
          state: "active",
          lastCheckedAt: now.toISOString(),
          expiresAt: fulfillment.expiresAt.toISOString(),
        },
        { status: 200 }
      );
    }

    const baseline = parseBalanceSnapshot(fulfillment.baselineAccountsJson);
    const balanceDrop = detectBalanceDrop(baseline, accounts);

    if (balanceDrop) {
      await prisma.$transaction(async (tx) => {
        const latest = await tx.request.findUnique({
          where: { id: request.id },
          select: { status: true },
        });

        if (latest?.status === "completed") {
          return;
        }

        const completedAt = new Date();

        await tx.request.update({
          where: { id: request.id },
          data: {
            status: "completed",
            completedAt,
            completionReason: "balance_drop",
          },
        });

        await tx.getFulfillment.update({
          where: { requestId: request.id },
          data: {
            status: "completed",
            completedAt,
            completionReason: `balance_drop:${balanceDrop.accountId}`,
            completionDelta: balanceDrop.delta,
            lastCheckedAt: completedAt,
          },
        });

        await tx.notification.createMany({
          data: [
            {
              userId: request.requesterId,
              type: "request_completed",
              message: `Your QR request at ${request.location} was completed.`,
              read: false,
            },
            {
              userId: request.donorId!,
              type: "request_completed_by_you",
              message: `You completed a QR request for ${request.location}.`,
              read: false,
            },
          ],
        });
      });

      return Response.json(
        {
          state: "completed",
          completedAt: now.toISOString(),
          completionReason: "balance_drop",
          completionDelta: balanceDrop.delta,
          accountName: balanceDrop.accountName,
        },
        { status: 200 }
      );
    }

    await prisma.getFulfillment.update({
      where: { requestId: request.id },
      data: {
        lastCheckedAt: now,
      },
    });

    return Response.json(
      {
        state: "active",
        lastCheckedAt: now.toISOString(),
        expiresAt: fulfillment.expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error handling /api/get/scan-state:", error);
    return getErrorResponse(
      "internal_error",
      "Failed to evaluate scan state",
      500,
      false
    );
  }
}
