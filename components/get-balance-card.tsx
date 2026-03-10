"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type AccountEntry = {
  id: string;
  name: string;
  balance: number | null;
  isActive: boolean;
};

type AccountsPayload = {
  linked: boolean;
  accounts: AccountEntry[];
  fetchedAt?: string;
};

const POLL_INTERVAL_MS = 30_000;

function formatCurrency(cents: number | null) {
  if (cents === null || !Number.isFinite(cents)) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 1000
  );
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function GetBalanceCard() {
  const [data, setData] = useState<AccountsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAccounts = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const res = await fetch("/api/get/accounts", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error?.message || `Request failed (${res.status})`
        );
      }
      const payload = (await res.json()) as AccountsPayload;
      setData(payload);
      setLastRefreshed(payload.fetchedAt ?? new Date().toISOString());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccounts();
    intervalRef.current = setInterval(() => void fetchAccounts(), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAccounts]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GET Meal Plan</CardTitle>
          <CardDescription>Loading account balances…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data && !data.linked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GET Meal Plan</CardTitle>
          <CardDescription>
            Link your GET account to see live balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/get">Link GET Account</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>GET Meal Plan</CardTitle>
          <CardDescription>
            {lastRefreshed
              ? `Updated ${timeAgo(lastRefreshed)} · refreshes every 30s`
              : "Live account balances"}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fetchAccounts(true)}
          disabled={loading}
          className="text-xs"
        >
          {loading ? "…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {data?.accounts.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">No accounts found.</p>
        )}
        {data?.accounts.map((acct) => (
          <div
            key={acct.id}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <span className="text-sm font-medium">{acct.name}</span>
            <span className="text-lg font-bold tabular-nums">
              {formatCurrency(acct.balance)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
