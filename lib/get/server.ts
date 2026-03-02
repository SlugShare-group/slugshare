import { prisma } from "@/lib/prisma";
import { authenticatePin, GetAdapterError, verifyPin } from "@/lib/get/adapter";
import { decryptSecret } from "@/lib/get/crypto";

export async function markCredentialInvalid(userId: string, errorCode: string) {
  await prisma.getCredential.updateMany({
    where: { userId },
    data: {
      status: "invalid",
      invalidatedAt: new Date(),
      lastErrorCode: errorCode,
    },
  });
}

export async function getLinkedCredentialForUser(userId: string) {
  return prisma.getCredential.findFirst({
    where: {
      userId,
      status: "linked",
      deviceId: { not: null },
      encryptedPin: { not: null },
    },
  });
}

export function shouldInvalidateCredential(error: unknown): boolean {
  if (!(error instanceof GetAdapterError)) {
    return false;
  }
  return (
    error.code === "authentication_error" || error.code === "authorization_error"
  );
}

export function decryptCredentialPinOrThrow(encryptedPin: string): string {
  return decryptSecret(encryptedPin);
}

export async function getActiveGetSessionForUser(userId: string) {
  const credential = await getLinkedCredentialForUser(userId);
  if (!credential || !credential.encryptedPin || !credential.deviceId) {
    throw new Error("GET account is not linked");
  }

  const pin = decryptCredentialPinOrThrow(credential.encryptedPin);
  const sessionId = await authenticatePin(pin, credential.deviceId);
  await verifyPin(sessionId, credential.deviceId, pin);

  await prisma.getCredential.update({
    where: { userId },
    data: {
      lastValidatedAt: new Date(),
      status: "linked",
      invalidatedAt: null,
      lastErrorCode: null,
    },
  });

  return { sessionId, deviceId: credential.deviceId };
}
