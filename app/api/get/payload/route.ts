import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import {
  authenticatePIN,
  retrievePatronBarcodePayload,
  isTransientGetError,
} from "@/lib/get-client";
import {
  clearCachedSession,
  getCachedSession,
  setCachedSession,
} from "@/lib/get-session-cache";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credential = await prisma.getCredential.findUnique({
      where: { userId: user.id },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Connect GET first at /dashboard" },
        { status: 400 }
      );
    }

    const deviceId = decryptSecret(credential.encryptedDeviceId);
    const pin = decryptSecret(credential.encryptedPin);

    const resolveSession = async (forceRefresh = false): Promise<string> => {
      if (!forceRefresh) {
        const cached = getCachedSession(user.id);
        if (cached) return cached;
      }
      const freshSession = await authenticatePIN(deviceId, pin);
      setCachedSession(user.id, freshSession);
      return freshSession;
    };

    let sessionId = await resolveSession(false);
    let payload = "";
    try {
      payload = await retrievePatronBarcodePayload(sessionId);
    } catch (error) {
      if (!isTransientGetError(error)) {
        throw error;
      }
      clearCachedSession(user.id);
      sessionId = await resolveSession(true);
      payload = await retrievePatronBarcodePayload(sessionId);
    }

    await prisma.getCredential.update({
      where: { userId: user.id },
      data: { lastValidatedAt: new Date() },
    });

    return NextResponse.json({
      payload,
      fetchedAt: new Date().toISOString(),
      length: payload.length,
    });
  } catch (error) {
    console.error("Error fetching GET barcode payload:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch GET barcode payload";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
