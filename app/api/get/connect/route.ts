import { getCurrentUser } from "@/lib/auth";
import {
  authenticatePin,
  createPin,
  generateDeviceId,
  generatePin,
  retrieveAccounts,
  verifyPin,
} from "@/lib/get/adapter";
import { encryptSecret } from "@/lib/get/crypto";
import { extractValidatedSessionId } from "@/lib/get/parse";
import { fromGetError, getErrorResponse } from "@/lib/get/response";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return getErrorResponse("authentication_error", "Unauthorized", 401, false);
    }

    const body = (await req.json()) as { validatedInput?: unknown };
    if (typeof body.validatedInput !== "string") {
      return getErrorResponse(
        "validation_error",
        "validatedInput is required",
        400,
        false
      );
    }

    const validatedSessionId = extractValidatedSessionId(body.validatedInput);
    if (!validatedSessionId) {
      return getErrorResponse(
        "validation_error",
        "Could not extract a valid validated GET session id",
        400,
        false
      );
    }

    const deviceId = generateDeviceId();
    const pin = generatePin();

    await createPin(validatedSessionId, deviceId, pin);
    const apiSessionId = await authenticatePin(pin, deviceId);
    await verifyPin(apiSessionId, deviceId, pin);
    const accounts = await retrieveAccounts(apiSessionId);
    const now = new Date();

    await prisma.getCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        deviceId,
        encryptedPin: encryptSecret(pin),
        encryptedSessionToken: null,
        sessionFingerprint: null,
        status: "linked",
        linkedAt: now,
        lastValidatedAt: now,
        invalidatedAt: null,
        lastErrorCode: null,
      },
      update: {
        deviceId,
        encryptedPin: encryptSecret(pin),
        encryptedSessionToken: null,
        sessionFingerprint: null,
        status: "linked",
        linkedAt: now,
        lastValidatedAt: now,
        invalidatedAt: null,
        lastErrorCode: null,
      },
    });

    return Response.json({
      linked: true,
      status: "linked",
      accountCount: accounts.length,
      lastValidatedAt: now.toISOString(),
    });
  } catch (error) {
    return fromGetError(error, "Failed to connect GET account");
  }
}
