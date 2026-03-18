import { getCurrentUser } from "@/lib/auth"; //identify current user
import { retrieveAccounts } from "@/lib/get/adapter"; //fetch account balances from external GET system
import { getErrorResponse } from "@/lib/get/response"; //error responses
//Helper for managing GET credentials and sessions
import {
  getActiveGetSessionForUser,
  getLinkedCredentialForUser,
  markCredentialInvalid,
  shouldInvalidateCredential,
} from "@/lib/get/server";
import { prisma } from "@/lib/prisma"; //For database access 
//type describing user settings pulled from DB
type SettingsRow = {
  autoPullQrEnabled: boolean | null;
  autoPullQrThreshold: number | null;
};

// Pull the donor's auto-pull settings from DB.
async function getAutoPullSettings(userId: string) {
  try {
    //SQL query to get settings from user table
    const rows = await prisma.$queryRawUnsafe<SettingsRow[]>(
      'SELECT "autoPullQrEnabled", "autoPullQrThreshold" FROM "User" WHERE "id" = $1 LIMIT 1',
      userId
    );

    const row = rows[0];
    return {
      //Ensure value is a valid boolean, otherwise defualt to false
      autoPullQrEnabled: typeof row?.autoPullQrEnabled === "boolean" ? row.autoPullQrEnabled : false,
      autoPullQrThreshold:
        typeof row?.autoPullQrThreshold === "number" && Number.isFinite(row.autoPullQrThreshold)
          ? row.autoPullQrThreshold
          : null,
    };
  } catch {
    // If settings cannot be read, use safe defaults (auto disabled)
    return {
      autoPullQrEnabled: false,
      autoPullQrThreshold: null,
    };
  }
}

// Convert account balances into one trigger value: minimum balance. 
function minNumericBalance(accounts: { balance: unknown }[]): number | null {
  const numeric = accounts
    .map((account) =>
      typeof account.balance === "number" && Number.isFinite(account.balance)
        ? account.balance
        : null
    )
    .filter((value): value is number => value !== null);

  // Return null when no valid numeric balances are available.
  return numeric.length > 0 ? Math.min(...numeric) : null;
}
//Main API
export async function GET(req: Request) {
  try {
    // 1) Validate user session.
    const user = await getCurrentUser();
    //if user is not logged in
    if (!user?.id) {
      return getErrorResponse("authentication_error", "Unauthorized", 401, false);
    }

    // 2) Donor must have an active GET link before access can be managed, so user must have linked their get account
    const credential = await getLinkedCredentialForUser(user.id);
    if (!credential) {
      return getErrorResponse("validation_error", "Link GET before managing QR access", 400, false);
    }

    // Query param determines whether this is manual press or auto-check loop.
    const force = new URL(req.url).searchParams.get("force") === "true";
    const settings = await getAutoPullSettings(user.id);

    try {
      // 3) Fetch current account balances from GET.
      // get actice session for GEt
      const { sessionId } = await getActiveGetSessionForUser(user.id);
      //Fetch account balance
      const accounts = await retrieveAccounts(sessionId);

      // 4) Evaluate threshold condition for auto mode.
      const currentMinBalance = minNumericBalance(accounts);
      //Check is user is below their saftey threshold
      const thresholdMet =
        settings.autoPullQrThreshold !== null &&
        currentMinBalance !== null &&
        currentMinBalance <= settings.autoPullQrThreshold;

      // Manual button always pulls; auto mode only pulls when both enabled and threshold met.
      // So decide whether to remove QR code access, always revoke is manaully trigger , otherwise only if automode is enabled and threshold is met
      const shouldPullAccess = force || (settings.autoPullQrEnabled && thresholdMet);
      //If we should not revoke access then return status
      if (!shouldPullAccess) {
        return Response.json({
          pulled: false,
          reason: settings.autoPullQrEnabled ? "threshold_not_met" : "auto_pull_disabled",
          currentMinBalance,
          threshold: settings.autoPullQrThreshold,
          checkedAt: new Date().toISOString(),
          revokedCount: 0,
        });
      }

      // 5) Find all currently active QR fulfillments owned by this donor.
      const activeFulfillments = await prisma.getFulfillment.findMany({
        where: {
          donorId: user.id,
          status: "active",
        },
        include: {
          request: {
            select: {
              id: true,
              requesterId: true,
              location: true,
              pointsRequested: true,
            },
          },
        },
      });

      const requestIds = activeFulfillments.map((fulfillment) => fulfillment.requestId);
      const now = new Date();

      // 6) If there are active fulfillments, revoke them in one transaction.
      if (requestIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          // Mark fulfillment records unavailable so scan screens cannot keep using them.
          await tx.getFulfillment.updateMany({
            where: {
              donorId: user.id,
              status: "active",
              requestId: { in: requestIds },
            },
            data: {
              status: "unavailable",
              completionReason: "qr_access_revoked",
              completedAt: now,
              lastCheckedAt: now,
            },
          });

          // Re-open each request by putting it back to pending and clearing donor/mode fields.
          await tx.request.updateMany({
            where: {
              id: { in: requestIds },
              selectedFulfillmentMode: "qr_code",
            },
            data: {
              status: "pending",
              donorId: null,
              selectedFulfillmentMode: null,
              completedAt: null,
              completionReason: null,
            },
          });

          // Notify requesters so they know why their scan flow stopped.
          await tx.notification.createMany({
            data: activeFulfillments.map((fulfillment) => ({
              userId: fulfillment.request.requesterId,
              type: "request_update",
              message: `QR access was removed for your ${fulfillment.request.pointsRequested} point request at ${fulfillment.request.location}. Your request is back to pending.`,
              read: false,
            })),
          });
        });
      }

      // 7) Return operation summary for UI status panel.
      return Response.json({
        pulled: true,
        reason: force ? "manual" : "threshold_met",
        currentMinBalance,
        threshold: settings.autoPullQrThreshold,
        pulledAt: now.toISOString(),
        revokedCount: requestIds.length,
      });
    } catch (error) {
      // If upstream auth/session broke, mark credential invalid so UI prompts relink.
      if (shouldInvalidateCredential(error)) {
        await markCredentialInvalid(user.id, "auth_invalid");
      }
      throw error;
    }
  } catch (error) {
    console.error("Error pulling QR access:", error);
    return getErrorResponse("internal_error", "Failed to pull QR access", 500, false);
  }
}
