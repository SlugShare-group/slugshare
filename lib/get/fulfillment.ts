import { BalanceSnapshotEntry, GetAccount } from "@/lib/get/types";

export function toBalanceSnapshot(accounts: GetAccount[]): BalanceSnapshotEntry[] {
  return accounts.map((account) => ({
    id: account.id,
    name: account.accountDisplayName,
    balance: typeof account.balance === "number" && Number.isFinite(account.balance)
      ? account.balance
      : null,
  }));
}

export function parseBalanceSnapshot(value: string | null): BalanceSnapshotEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as BalanceSnapshotEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function detectBalanceDrop(
  baseline: BalanceSnapshotEntry[],
  currentAccounts: GetAccount[]
): { delta: number; accountName: string; accountId: string } | null {
  if (baseline.length === 0 || currentAccounts.length === 0) {
    return null;
  }

  const byId = new Map(currentAccounts.map((account) => [account.id, account]));

  let bestDrop: { delta: number; accountName: string; accountId: string } | null = null;

  for (const snapshot of baseline) {
    if (typeof snapshot.balance !== "number" || Number.isNaN(snapshot.balance)) {
      continue;
    }

    const current = byId.get(snapshot.id);
    if (!current || typeof current.balance !== "number" || Number.isNaN(current.balance)) {
      continue;
    }

    const delta = snapshot.balance - current.balance;
    if (delta <= 0) {
      continue;
    }

    if (!bestDrop || delta > bestDrop.delta) {
      bestDrop = {
        delta,
        accountName: snapshot.name,
        accountId: snapshot.id,
      };
    }
  }

  return bestDrop;
}

