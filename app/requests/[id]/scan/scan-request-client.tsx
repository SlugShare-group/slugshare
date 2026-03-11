"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pdf417Canvas } from "@/components/pdf417-canvas";

type ScanState = "active" | "completed" | "unavailable";

type ScanResponse = {
  state: ScanState;
  reason?: string;
  completedAt?: string;
  completionReason?: string;
  completionDelta?: number;
  accountName?: string;
  expiresAt?: string;
};

type BarcodeResponse = {
  state: ScanState;
  payload?: string;
  reason?: string;
  fetchedAt?: string;
  expiresAt?: string;
};

type ErrorEnvelope = {
  error?: {
    message?: string;
  };
};

function readErrorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  const parsed = value as ErrorEnvelope;
  return parsed.error?.message || fallback;
}

export function ScanRequestClient({ requestId }: { requestId: string }) {
  const [scanState, setScanState] = useState<ScanState>("unavailable");
  const [payload, setPayload] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [completionDelta, setCompletionDelta] = useState<number | null>(null);
  const [completionReason, setCompletionReason] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const poll = useCallback(async () => {
    try {
      const scanRes = await fetch(`/api/get/scan-state?requestId=${encodeURIComponent(requestId)}`, {
        cache: "no-store",
      });
      const scanData = (await scanRes.json()) as ScanResponse;

      if (!scanRes.ok) {
        setError(readErrorMessage(scanData, "Failed to fetch scan state"));
        setLoading(false);
        return;
      }

      setScanState(scanData.state);
      setReason(scanData.reason ?? null);
      setCompletedAt(scanData.completedAt ?? null);
      setCompletionReason(scanData.completionReason ?? null);
      setCompletionDelta(scanData.completionDelta ?? null);
      setAccountName(scanData.accountName ?? null);
      setExpiresAt(scanData.expiresAt ?? null);

      if (scanData.state !== "active") {
        setPayload(null);
        setLoading(false);
        return;
      }

      const barcodeRes = await fetch(`/api/get/barcode?requestId=${encodeURIComponent(requestId)}`, {
        cache: "no-store",
      });
      const barcodeData = (await barcodeRes.json()) as BarcodeResponse;

      if (!barcodeRes.ok) {
        setError(readErrorMessage(barcodeData, "Failed to fetch barcode payload"));
        setLoading(false);
        return;
      }

      if (barcodeData.state === "active" && barcodeData.payload) {
        setPayload(barcodeData.payload);
        setLastFetchedAt(barcodeData.fetchedAt ?? new Date().toISOString());
        setExpiresAt(barcodeData.expiresAt ?? scanData.expiresAt ?? null);
      } else if (barcodeData.state === "completed") {
        setScanState("completed");
        setCompletedAt(new Date().toISOString());
      } else {
        setScanState("unavailable");
        setReason(barcodeData.reason ?? "not_available");
        setExpiresAt(barcodeData.expiresAt ?? scanData.expiresAt ?? null);
        setPayload(null);
      }

      setError(null);
      setLoading(false);
    } catch {
      setError("Failed to poll scan state");
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void poll();
    }, 0);
    const interval = setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [poll]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="border-slate-300 bg-white/90 shadow-xl shadow-slate-900/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-slate-900">Live PDF417 Payload</CardTitle>
          <CardDescription>
            Keep this screen open at checkout. It refreshes every 5 seconds while active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-slate-600">Loading scan state...</p>
          ) : scanState === "active" && payload ? (
            <>
              <Pdf417Canvas
                value={payload}
                scaleX={4}
                scaleY={4}
                rowMult={4}
                maxWidthClassName="max-w-full"
              />
              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  <span className="font-semibold">Code window:</span>{" "}
                  {expiresAt ? `Until ${new Date(expiresAt).toLocaleTimeString()}` : "Active until completed"}
                </p>
                <p>
                  <span className="font-semibold">Last fetched:</span>{" "}
                  {lastFetchedAt ? new Date(lastFetchedAt).toLocaleTimeString() : "--"}
                </p>
              </div>
            </>
          ) : scanState === "completed" ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
              <p className="text-lg font-bold">Request Completed</p>
              <p className="mt-2 text-sm">
                {completionDelta ? `Detected balance drop: ${completionDelta.toFixed(2)}` : "Completion detected."}
                {accountName ? ` (${accountName})` : ""}
              </p>
              <p className="mt-1 text-xs">
                {completedAt ? `Completed at ${new Date(completedAt).toLocaleString()}` : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <p className="text-lg font-bold">Code Unavailable</p>
              <p className="mt-2 text-sm">{reason ? `Reason: ${reason}` : "Scan flow is not active right now."}</p>
            </div>
          )}

          {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3">
            <Button onClick={() => void poll()} variant="outline">
              Refresh Now
            </Button>
            <Button asChild>
              <Link href="/requests">Go to Requests</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-300 bg-slate-950 text-slate-100 shadow-xl">
        <CardHeader>
          <CardTitle>Status Feed</CardTitle>
          <CardDescription className="text-slate-400">Realtime fulfillment state from backend polling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-slate-900 p-3">
            <span className="text-slate-400">State</span>
            <span className="font-semibold uppercase tracking-wide">{scanState}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 p-3">
            <span className="text-slate-400">Expiry Policy</span>
            <span>{expiresAt ? new Date(expiresAt).toLocaleString() : "Configured in GET settings"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 p-3">
            <span className="text-slate-400">Completion Reason</span>
            <span>{completionReason ?? "-"}</span>
          </div>
          <p className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
            The server checks the donor account baseline against current balances every poll cycle. A detected
            drop marks this request as completed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
