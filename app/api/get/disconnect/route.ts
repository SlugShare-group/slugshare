import { getCurrentUser } from "@/lib/auth";
import { authenticatePin, revokePin } from "@/lib/get/adapter";
import { decryptCredentialPinOrThrow } from "@/lib/get/server";
import { getErrorResponse } from "@/lib/get/response";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return getErrorResponse("authentication_error", "Unauthorized", 401, false);
    }

    const credential = await prisma.getCredential.findUnique({
      where: { userId: user.id },
    });

    if (credential?.encryptedPin && credential.deviceId) {
      try {
        const pin = decryptCredentialPinOrThrow(credential.encryptedPin);
        const sessionId = await authenticatePin(pin, credential.deviceId);
        await revokePin(sessionId, credential.deviceId);
      } catch (error) {
        console.warn("GET revoke during disconnect failed:", error);
      }
    }

    await prisma.getCredential.deleteMany({ where: { userId: user.id } });

    return Response.json({ linked: false });
  } catch (error) {
    console.error("Error disconnecting GET account:", error);
    return getErrorResponse(
      "internal_error",
      "Failed to disconnect GET account",
      500,
      false
    );
  }
}
