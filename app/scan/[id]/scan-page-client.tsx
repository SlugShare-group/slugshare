"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as PDF417 from "pdf417-generator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ActiveState = {
  state: "active";
  payload: string;
  expiresAt: string;
  refreshMs: number;
};

type CompletedState = {
  state: "completed";
  completedAt: string;
};

type UnavailableState = {
  state: "unavailable";
  reason: "not_code_mode" | "not_accepted" | "donor_unlinked";
};

type ScanState = ActiveState | CompletedState | UnavailableState;

const DEFAULT_REFRESH_MS = 5_000;

const reasonLabels: Record<UnavailableState["reason"], string> = {
  not_code_mode: "This request does not use code fulfillment.",
  not_accepted: "This request is not currently accepted.",
  donor_unlinked: "The donor is not linked to GET right now.",
};

export default function ScanPageClient({ requestId }: { requestId: string }) {
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchScanState = useCallback(async () => {
    try {
      const response = await fetch(`/api/requests/${requestId}/scan`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load scan code");
        return;
      }

      setScanState(data);
      setError("");
    } catch (fetchError) {
      console.error("Error loading scan state:", fetchError);
      setError("Failed to load scan code");
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchScanState();
  }, [fetchScanState]);

  const pollIntervalMs =
    scanState?.state === "active" ? scanState.refreshMs : DEFAULT_REFRESH_MS;

  useEffect(() => {
    const timer = setInterval(fetchScanState, pollIntervalMs);
    return () => clearInterval(timer);
  }, [fetchScanState, pollIntervalMs]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scanState?.state !== "active" || !canvasRef.current) {
      return;
    }

    PDF417.draw(scanState.payload, canvasRef.current, 3);
  }, [scanState]);

  const secondsLeft = useMemo(() => {
    if (scanState?.state !== "active") return null;
    const delta = new Date(scanState.expiresAt).getTime() - now;
    return Math.max(0, Math.ceil(delta / 1000));
  }, [scanState, now]);

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/requests"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Requests
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Temporary Scan Code</CardTitle>
            <CardDescription>
              This code refreshes automatically every 5 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Loading code...</p>
            )}

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {!isLoading && scanState?.state === "active" && (
              <div className="space-y-3">
                <div className="rounded-md border bg-white p-3">
                  <canvas
                    ref={canvasRef}
                    className="h-[220px] w-full"
                    aria-label="PDF417 scan barcode"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Expires in {secondsLeft ?? 0}s
                </p>
                <Button type="button" variant="outline" onClick={fetchScanState}>
                  Refresh Now
                </Button>
              </div>
            )}

            {!isLoading && scanState?.state === "completed" && (
              <div className="space-y-2">
                <p className="text-sm text-emerald-700">
                  Request completed at{" "}
                  {new Date(scanState.completedAt).toLocaleString()}.
                </p>
                <Button asChild variant="outline">
                  <Link href="/requests">Return to Requests</Link>
                </Button>
              </div>
            )}

            {!isLoading && scanState?.state === "unavailable" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {reasonLabels[scanState.reason]}
                </p>
                <Button asChild variant="outline">
                  <Link href="/requests">Return to Requests</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
