import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import {
  authenticatePIN,
  createPIN,
  deletePIN,
} from "@/lib/get-client";
import {
  extractValidatedSessionId,
  generateDeviceId,
  generatePin,
} from "@/lib/get-onboarding";
import {
  isFulfillmentMode,
  resolveFulfillmentMode,
} from "@/lib/fulfillment";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        defaultFulfillmentMode: true,
        getCredential: {
          select: {
            id: true,
            lastValidatedAt: true,
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      connected: Boolean(dbUser.getCredential),
      defaultFulfillmentMode: resolveFulfillmentMode(
        dbUser.defaultFulfillmentMode
      ),
      lastValidatedAt: dbUser.getCredential?.lastValidatedAt ?? null,
    });
  } catch (error) {
    console.error("Error fetching GET settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedUrl = body?.validatedUrl;

    if (typeof validatedUrl !== "string" || validatedUrl.trim().length === 0) {
      return NextResponse.json(
        { error: "validatedUrl is required" },
        { status: 400 }
      );
    }

    const sessionId = extractValidatedSessionId(validatedUrl);
    if (!sessionId) {
      return NextResponse.json(
        { error: "Could not parse validated GET session token from URL" },
        { status: 400 }
      );
    }

    const deviceId = generateDeviceId();
    const pin = generatePin();

    const createResult = await createPIN(sessionId, deviceId, pin);
    if (createResult !== true) {
      return NextResponse.json(
        { error: "Failed to create GET device credentials" },
        { status: 400 }
      );
    }

    await authenticatePIN(deviceId, pin);

    await prisma.getCredential.upsert({
      where: { userId: user.id },
      update: {
        encryptedDeviceId: encryptSecret(deviceId),
        encryptedPin: encryptSecret(pin),
        lastValidatedAt: new Date(),
      },
      create: {
        userId: user.id,
        encryptedDeviceId: encryptSecret(deviceId),
        encryptedPin: encryptSecret(pin),
        lastValidatedAt: new Date(),
      },
    });

    return NextResponse.json({ connected: true });
  } catch (error) {
    console.error("Error connecting GET account:", error);
    return NextResponse.json(
      { error: "Failed to connect GET account" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const mode = body?.defaultFulfillmentMode;

    if (!isFulfillmentMode(mode)) {
      return NextResponse.json(
        { error: "Invalid fulfillment mode" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { defaultFulfillmentMode: mode },
      select: {
        defaultFulfillmentMode: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating GET settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credential = await prisma.getCredential.findUnique({
      where: { userId: user.id },
    });

    if (credential) {
      try {
        const deviceId = decryptSecret(credential.encryptedDeviceId);
        const pin = decryptSecret(credential.encryptedPin);
        const sessionId = await authenticatePIN(deviceId, pin);
        await deletePIN(sessionId, deviceId);
      } catch (error) {
        // Best effort revoke; always clear local credential.
        console.warn("GET credential revoke failed during disconnect:", error);
      }

      await prisma.getCredential.delete({
        where: { userId: user.id },
      });
    }

    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error("Error disconnecting GET account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
