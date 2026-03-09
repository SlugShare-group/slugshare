"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GetStatus = {
  linked: boolean;
  model: string;
  status: string;
  linkedAt: string | null;
  lastValidatedAt: string | null;
  invalidatedAt: string | null;
  lastErrorCode: string | null;
  deviceIdTail: string | null;
};

export function GetPageClient() {
  const [status, setStatus] = useState<GetStatus | null>(null);
  const [validatedInput, setValidatedInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "error">("ok");
  const [testingData, setTestingData] = useState<Record<string, unknown> | null>(null);

  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/get/status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error?.message || "Failed to load status");
        setMessageTone("error");
        return;
      }
      setStatus(data);
    } catch {
      setMessage("Failed to load GET status");
      setMessageTone("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleConnect = async () => {
    if (!validatedInput.trim()) {
      setMessage("Paste a validated GET URL (or validated session id)");
      setMessageTone("error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/get/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validatedInput: validatedInput.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error?.message || "Failed to link GET account");
        setMessageTone("error");
        return;
      }
      setMessage(`GET linked (${data.accountCount ?? 0} account(s) validated).`);
      setMessageTone("ok");
      setValidatedInput("");
      await refreshStatus();
    } catch {
      setMessage("Failed to link GET account");
      setMessageTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/get/disconnect", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error?.message || "Failed to disconnect GET account");
        setMessageTone("error");
        return;
      }
      setMessage("GET account disconnected.");
      setMessageTone("ok");
      setTestingData(null);
      await refreshStatus();
    } catch {
      setMessage("Failed to disconnect GET account");
      setMessageTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const runTesting = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/get/testing", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error?.message || "Testing endpoint unavailable");
        setMessageTone("error");
        return;
      }
      setTestingData(data);
      setMessage("Diagnostics loaded.");
      setMessageTone("ok");
    } catch {
      setMessage("Failed to run diagnostics");
      setMessageTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toneClasses =
    messageTone === "ok"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-border bg-card/90 shadow-xl shadow-black/5 backdrop-blur dark:shadow-black/20">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-foreground">Link Donor GET Device</CardTitle>
          <CardDescription>
            Paste a validated GET redirect URL (or validated session id). We create a device + PIN and store it encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Validated Link Input
          </label>
          <textarea
            value={validatedInput}
            onChange={(event) => setValidatedInput(event.target.value)}
            placeholder="https://...validated... OR validated session UUID"
            className="min-h-[160px] w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isSubmitting}
              onClick={handleConnect}
            >
              {isSubmitting ? "Working..." : "Connect GET"}
            </Button>
            <Button
              variant="outline"
              disabled={isSubmitting || !status?.linked}
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={runTesting}
            >
              Run Diagnostics
            </Button>
          </div>
          {message && <div className={`rounded-xl border px-4 py-3 text-sm ${toneClasses}`}>{message}</div>}
        </CardContent>
      </Card>

      <Card className="border-border bg-card text-card-foreground shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Link Status</CardTitle>
          <CardDescription>
            Current donor GET connection metadata
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !status ? (
            <p className="text-sm text-muted-foreground">Loading status...</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Linked</dt>
                <dd className="font-semibold">{status.linked ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-semibold capitalize">{status.status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Credential Model</dt>
                <dd className="font-semibold">{status.model}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Linked At</dt>
                <dd>{status.linkedAt ? new Date(status.linkedAt).toLocaleString() : "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Last Validated</dt>
                <dd>
                  {status.lastValidatedAt ? new Date(status.lastValidatedAt).toLocaleString() : "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Invalidated At</dt>
                <dd>{status.invalidatedAt ? new Date(status.invalidatedAt).toLocaleString() : "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Last Error</dt>
                <dd>{status.lastErrorCode ?? "-"}</dd>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Device ID Tail</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {status.deviceIdTail ?? "-"}
                </p>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {testingData && (
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Diagnostics Snapshot</CardTitle>
            <CardDescription>Redacted output from /api/get/testing</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl border border-border bg-background/60 p-4 text-xs text-foreground">
              {JSON.stringify(testingData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
