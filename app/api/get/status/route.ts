import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getErrorResponse } from "@/lib/get/response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return getErrorResponse("authentication_error", "Unauthorized", 401, false);
    }

    const credential = await prisma.getCredential.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      linked: !!credential,
      model: credential?.encryptedPin && credential?.deviceId ? "pin_device" : "unknown",
      status: credential?.status ?? "unlinked",
      linkedAt: credential?.linkedAt ?? null,
      lastValidatedAt: credential?.lastValidatedAt ?? null,
      invalidatedAt: credential?.invalidatedAt ?? null,
      lastErrorCode: credential?.lastErrorCode ?? null,
      deviceIdTail: credential?.deviceId ? credential.deviceId.slice(-4) : null,
    });
  } catch (error) {
    console.error("Error fetching GET link status:", error);
    return getErrorResponse(
      "internal_error",
      "Failed to fetch GET status",
      500,
      false
    );
  }
}
