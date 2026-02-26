"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GetStatus = {
  linked: boolean;
  status: string;
  linkedAt: string | null;
  lastValidatedAt: string | null;
  invalidatedAt: string | null;
  lastErrorCode: string | null;
  sessionFingerprint: string | null;
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
      setMessage("Paste a validated GET URL or a session token");
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
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-red-300 bg-red-50 text-red-700";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-slate-300 bg-white/90 shadow-xl shadow-slate-900/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-slate-900">Connect Donor Session</CardTitle>
          <CardDescription>
            Paste a validated GET redirect URL or a raw session token. The token is encrypted at rest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Session Input
          </label>
          <textarea
            value={validatedInput}
            onChange={(event) => setValidatedInput(event.target.value)}
            placeholder="https://...validated... OR raw session token"
            className="min-h-[160px] w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none transition focus:border-amber-300"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              className="rounded-full bg-slate-900 px-5 hover:bg-slate-800"
              disabled={isSubmitting}
              onClick={handleConnect}
            >
              {isSubmitting ? "Working..." : "Connect GET"}
            </Button>
            <Button
              className="rounded-full"
              variant="outline"
              disabled={isSubmitting || !status?.linked}
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
            <Button
              className="rounded-full"
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

      <Card className="border-slate-300 bg-slate-950 text-slate-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Link Status</CardTitle>
          <CardDescription className="text-slate-400">
            Current donor GET connection metadata
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !status ? (
            <p className="text-sm text-slate-300">Loading status...</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Linked</dt>
                <dd className="font-semibold">{status.linked ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Status</dt>
                <dd className="font-semibold capitalize">{status.status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Linked At</dt>
                <dd>{status.linkedAt ? new Date(status.linkedAt).toLocaleString() : "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Last Validated</dt>
                <dd>
                  {status.lastValidatedAt ? new Date(status.lastValidatedAt).toLocaleString() : "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Invalidated At</dt>
                <dd>{status.invalidatedAt ? new Date(status.invalidatedAt).toLocaleString() : "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Last Error</dt>
                <dd>{status.lastErrorCode ?? "-"}</dd>
              </div>
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fingerprint</p>
                <p className="mt-1 truncate font-mono text-xs text-slate-300">
                  {status.sessionFingerprint ?? "-"}
                </p>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {testingData && (
        <Card className="border-slate-300 lg:col-span-2">
          <CardHeader>
            <CardTitle>Diagnostics Snapshot</CardTitle>
            <CardDescription>Redacted output from /api/get/testing</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl border bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(testingData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
