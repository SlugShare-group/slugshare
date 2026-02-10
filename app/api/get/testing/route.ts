import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import {
  authenticatePIN,
  retrieveAccounts,
  retrievePatronBarcodePayload,
  retrieveTransactionsSince,
  isTransientGetError,
} from "@/lib/get-client";
import {
  clearCachedSession,
  getCachedSession,
  setCachedSession,
} from "@/lib/get-session-cache";

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max: number
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const hours = parsePositiveInt(searchParams.get("hours"), 24, 24 * 14);
    const limit = parsePositiveInt(searchParams.get("limit"), 25, 200);

    const points = await prisma.points.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, balance: 0 },
    });

    const credential = await prisma.getCredential.findUnique({
      where: { userId: user.id },
    });

    if (!credential) {
      return NextResponse.json({
        connected: false,
        appBalance: points.balance,
        error: "Connect GET first at /dashboard",
      });
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
    let accounts: Awaited<ReturnType<typeof retrieveAccounts>> = [];
    let payload = "";
    let transactions: Awaited<ReturnType<typeof retrieveTransactionsSince>> = [];
    let warning: string | undefined;

    try {
      [accounts, payload, transactions] = await Promise.all([
        retrieveAccounts(sessionId),
        retrievePatronBarcodePayload(sessionId),
        retrieveTransactionsSince(
          sessionId,
          new Date(Date.now() - hours * 60 * 60 * 1000)
        ),
      ]);
    } catch (error) {
      if (!isTransientGetError(error)) {
        throw error;
      }

      clearCachedSession(user.id);
      sessionId = await resolveSession(true);
      warning = "Recovered after transient GET error; session was refreshed.";

      [accounts, payload, transactions] = await Promise.all([
        retrieveAccounts(sessionId),
        retrievePatronBarcodePayload(sessionId),
        retrieveTransactionsSince(
          sessionId,
          new Date(Date.now() - hours * 60 * 60 * 1000)
        ),
      ]);
    }

    const totalGetBalance = accounts
      .filter((account) => account.isActive && account.isAccountTenderActive)
      .reduce((sum, account) => sum + (account.balance ?? 0), 0);

    const sortedTransactions = [...transactions]
      .sort((a, b) => {
        const left = new Date(String(a.actualDate ?? 0)).getTime();
        const right = new Date(String(b.actualDate ?? 0)).getTime();
        return right - left;
      })
      .slice(0, limit);

    await prisma.getCredential.update({
      where: { userId: user.id },
      data: { lastValidatedAt: new Date() },
    });

    return NextResponse.json({
      connected: true,
      appBalance: points.balance,
      totalGetBalance,
      barcodePayload: payload,
      accounts,
      transactions: sortedTransactions,
      transactionsWindowHours: hours,
      returnedTransactions: sortedTransactions.length,
      fetchedAt: new Date().toISOString(),
      warning,
    });
  } catch (error) {
    console.error("Error in GET testing endpoint:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load GET testing data";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
