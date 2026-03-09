import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getErrorResponse } from "@/lib/get/response";
import {
  DEFAULT_QR_CODE_EXPIRY_MINUTES,
  MAX_QR_CODE_EXPIRY_MINUTES,
  MIN_QR_CODE_EXPIRY_MINUTES,
  normalizeQrCodeExpiryMinutes,
} from "@/lib/get/qr-expiry";

// If auto-pull is missing in DB, we default to OFF for safety.
const DEFAULT_AUTO_PULL_QR_ENABLED = false;

// Shape of one SQL row when reading settings from the User table.
type SettingsRow = {
  qrCodeExpiryMinutes: number | null;
  autoPullQrEnabled: boolean | null;
  autoPullQrThreshold: number | null;
};

// Read settings via raw SQL so the endpoint still works during migration/client mismatch.
async function getSettings(userId: string) {
  try {
    const rows = await prisma.$queryRawUnsafe<SettingsRow[]>(
      'SELECT "qrCodeExpiryMinutes", "autoPullQrEnabled", "autoPullQrThreshold" FROM "User" WHERE "id" = $1 LIMIT 1',
      userId
    );

    // We expect 0 or 1 row since user id is unique.
    const row = rows[0];

    // Normalize everything before returning so UI code gets predictable values.
    return {
      // Clamp qr expiry to allowed range if DB has weird values.
      qrCodeExpiryMinutes: normalizeQrCodeExpiryMinutes(row?.qrCodeExpiryMinutes),
      // Keep boolean strict; fallback to safe default if null/missing.
      autoPullQrEnabled:
        typeof row?.autoPullQrEnabled === "boolean"
          ? row.autoPullQrEnabled
          : DEFAULT_AUTO_PULL_QR_ENABLED,
      // Threshold can be null, but if provided it must be a finite number.
      autoPullQrThreshold:
        typeof row?.autoPullQrThreshold === "number" && Number.isFinite(row.autoPullQrThreshold)
          ? row.autoPullQrThreshold
          : null,
    };
  } catch (error) {
    // If DB query fails, keep app usable with defaults instead of hard crash.
    console.warn("Falling back to default GET settings:", error);
    return {
      qrCodeExpiryMinutes: DEFAULT_QR_CODE_EXPIRY_MINUTES,
      autoPullQrEnabled: DEFAULT_AUTO_PULL_QR_ENABLED,
      autoPullQrThreshold: null,
    };
  }
}

export async function GET() {
  try {
    // Who is calling this endpoint?
    const user = await getCurrentUser();
    if (!user?.id) {
      return getErrorResponse("authentication_error", "Unauthorized", 401, false);
    }

    // Get connection metadata + settings in parallel for speed.
    const [credential, settings] = await Promise.all([
      prisma.getCredential.findUnique({ where: { userId: user.id } }),
      getSettings(user.id),
    ]);

    // Return one payload the UI can render directly.
    return NextResponse.json({
      linked: !!credential,
      model: credential?.encryptedPin && credential?.deviceId ? "pin_device" : "unknown",
      status: credential?.status ?? "unlinked",
      linkedAt: credential?.linkedAt ?? null,
      lastValidatedAt: credential?.lastValidatedAt ?? null,
      invalidatedAt: credential?.invalidatedAt ?? null,
      lastErrorCode: credential?.lastErrorCode ?? null,
      deviceIdTail: credential?.deviceId ? credential.deviceId.slice(-4) : null,
      qrCodeExpiryMinutes: settings.qrCodeExpiryMinutes,
      autoPullQrEnabled: settings.autoPullQrEnabled,
      autoPullQrThreshold: settings.autoPullQrThreshold,
    });
  } catch (error) {
    console.error("Error fetching GET link status:", error);
    return getErrorResponse("internal_error", "Failed to fetch GET status", 500, false);
  }
}

export async function PATCH(req: Request) {
  try {
    // Validate caller first.
    const user = await getCurrentUser();
    if (!user?.id) {
      return getErrorResponse("authentication_error", "Unauthorized", 401, false);
    }

    // Endpoint supports partial updates (any subset of settings).
    const body = (await req.json()) as {
      qrCodeExpiryMinutes?: unknown;
      autoPullQrEnabled?: unknown;
      autoPullQrThreshold?: unknown;
    };

    const hasQrExpiry = body.qrCodeExpiryMinutes !== undefined;
    const hasAutoEnabled = body.autoPullQrEnabled !== undefined;
    const hasAutoThreshold = body.autoPullQrThreshold !== undefined;

    // Reject empty updates to avoid accidental no-op calls.
    if (!hasQrExpiry && !hasAutoEnabled && !hasAutoThreshold) {
      return getErrorResponse("validation_error", "No settings provided", 400, false);
    }

    // Start from current values and then override only provided fields.
    const current = await getSettings(user.id);

    let nextQrExpiry = current.qrCodeExpiryMinutes;
    if (hasQrExpiry) {
      // qrCodeExpiryMinutes must be numeric.
      if (typeof body.qrCodeExpiryMinutes !== "number" || !Number.isFinite(body.qrCodeExpiryMinutes)) {
        return getErrorResponse("validation_error", "qrCodeExpiryMinutes must be a number", 400, false);
      }

      // Round down decimals, then enforce supported bounds.
      const roundedMinutes = Math.trunc(body.qrCodeExpiryMinutes);
      if (roundedMinutes < MIN_QR_CODE_EXPIRY_MINUTES || roundedMinutes > MAX_QR_CODE_EXPIRY_MINUTES) {
        return getErrorResponse(
          "validation_error",
          `qrCodeExpiryMinutes must be between ${MIN_QR_CODE_EXPIRY_MINUTES} and ${MAX_QR_CODE_EXPIRY_MINUTES}`,
          400,
          false
        );
      }
      nextQrExpiry = roundedMinutes;
    }

    let nextAutoEnabled = current.autoPullQrEnabled;
    if (hasAutoEnabled) {
      // autoPullQrEnabled must be true/false.
      if (typeof body.autoPullQrEnabled !== "boolean") {
        return getErrorResponse("validation_error", "autoPullQrEnabled must be a boolean", 400, false);
      }
      nextAutoEnabled = body.autoPullQrEnabled;
    }

    let nextAutoThreshold = current.autoPullQrThreshold;
    if (hasAutoThreshold) {
      // Blank/null clears the threshold.
      if (body.autoPullQrThreshold === null || body.autoPullQrThreshold === "") {
        nextAutoThreshold = null;
      } else if (typeof body.autoPullQrThreshold !== "number" || !Number.isFinite(body.autoPullQrThreshold)) {
        // Non-numeric threshold is invalid.
        return getErrorResponse("validation_error", "autoPullQrThreshold must be a number or null", 400, false);
      } else {
        nextAutoThreshold = body.autoPullQrThreshold;
      }
    }

    try {
      // Persist settings in one SQL update, then return saved values.
      const rows = await prisma.$queryRawUnsafe<SettingsRow[]>(
        'UPDATE "User" SET "qrCodeExpiryMinutes" = $1, "autoPullQrEnabled" = $2, "autoPullQrThreshold" = $3 WHERE "id" = $4 RETURNING "qrCodeExpiryMinutes", "autoPullQrEnabled", "autoPullQrThreshold"',
        nextQrExpiry,
        nextAutoEnabled,
        nextAutoThreshold,
        user.id
      );

      const updated = rows[0];
      return NextResponse.json({
        qrCodeExpiryMinutes: normalizeQrCodeExpiryMinutes(updated?.qrCodeExpiryMinutes),
        autoPullQrEnabled:
          typeof updated?.autoPullQrEnabled === "boolean"
            ? updated.autoPullQrEnabled
            : DEFAULT_AUTO_PULL_QR_ENABLED,
        autoPullQrThreshold:
          typeof updated?.autoPullQrThreshold === "number" ? updated.autoPullQrThreshold : null,
      });
    } catch (error) {
      // Most likely the database has not run the latest migration yet.
      console.error("Error updating GET settings in database:", error);
      return getErrorResponse(
        "validation_error",
        "GET settings are unavailable until database migrations are applied.",
        409,
        false
      );
    }
  } catch (error) {
    console.error("Error updating GET settings:", error);
    return getErrorResponse("internal_error", "Failed to update GET settings", 500, false);
  }
}
