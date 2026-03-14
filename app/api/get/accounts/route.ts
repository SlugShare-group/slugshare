import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { retrieveAccounts, GetAdapterError } from "@/lib/get/adapter";
import {
  getActiveGetSessionForUser,
  getLinkedCredentialForUser,
  markCredentialInvalid,
  shouldInvalidateCredential,
} from "@/lib/get/server";
import { fromGetError } from "@/lib/get/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credential = await getLinkedCredentialForUser(user.id);
    if (!credential) {
      return NextResponse.json(
        { linked: false, accounts: [] },
        { status: 200 }
      );
    }

    const { sessionId } = await getActiveGetSessionForUser(user.id);
    const accounts = await retrieveAccounts(sessionId);

    return NextResponse.json({
      linked: true,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.accountDisplayName,
        balance: a.balance,
        isActive: a.isActive ?? true,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const user = await getCurrentUser().catch(() => null);
    if (user?.id && shouldInvalidateCredential(error)) {
      await markCredentialInvalid(
        user.id,
        error instanceof GetAdapterError ? error.code : "internal_error"
      );
    }

    return fromGetError(error, "Failed to retrieve GET accounts");
  }
}
