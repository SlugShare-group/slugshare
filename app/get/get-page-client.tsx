"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Shape of the GET status payload coming from /api/get/status.
type GetStatus = {
  linked: boolean;
  model: string;
  status: string;
  linkedAt: string | null;
  lastValidatedAt: string | null;
  invalidatedAt: string | null;
  lastErrorCode: string | null;
  deviceIdTail: string | null;
  qrCodeExpiryMinutes: number;
  autoPullQrEnabled: boolean;
  autoPullQrThreshold: number | null;
};

// Shape of response from /api/get/pull-qr.
type PullQrResponse = {
  pulled?: boolean;
  reason?: string;
  currentMinBalance?: number | null;
  threshold?: number | null;
  pulledAt?: string;
  checkedAt?: string;
  revokedCount?: number;
  error?: {
    message?: string;
  };
};

export function GetPageClient() {
  // Main server status (what is persisted in DB).
  const [status, setStatus] = useState<GetStatus | null>(null);

  // Form inputs for link flow + settings.
  const [validatedInput, setValidatedInput] = useState("");
  const [qrCodeExpiryMinutes, setQrCodeExpiryMinutes] = useState("60");
  const [autoPullQrEnabled, setAutoPullQrEnabled] = useState(false);
  const [autoPullQrThreshold, setAutoPullQrThreshold] = useState("");

  // UI loading flags.
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Shared feedback banner state.
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "error">("ok");

  // Optional diagnostics panel payload.
  const [testingData, setTestingData] = useState<Record<string, unknown> | null>(null);

  // Pull-access result metadata (shown on the right status card).
  const [pullReason, setPullReason] = useState<string | null>(null);
  const [pullBalance, setPullBalance] = useState<number | null>(null);
  const [pullCheckedAt, setPullCheckedAt] = useState<string | null>(null);
  const [pullRevokedCount, setPullRevokedCount] = useState<number>(0);

  // Refresh status from server and sync form fields to saved values.
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

      // Save full server payload.
      setStatus(data);

      // Copy persisted settings into editable form controls.
      setQrCodeExpiryMinutes(String(data.qrCodeExpiryMinutes ?? 60));
      setAutoPullQrEnabled(Boolean(data.autoPullQrEnabled));
      setAutoPullQrThreshold(
        typeof data.autoPullQrThreshold === "number" && Number.isFinite(data.autoPullQrThreshold)
          ? String(data.autoPullQrThreshold)
          : ""
      );
    } catch {
      setMessage("Failed to load GET status");
      setMessageTone("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial page load fetch.
  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  // Calls API to "pull" (revoke) active QR access.
  // force=true = manual button click.
  // force=false = auto-check cycle.
  const pullQrAccess = useCallback(async (force: boolean) => {
    setIsPulling(true);
    try {
      const response = await fetch(`/api/get/pull-qr?force=${force ? "true" : "false"}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as PullQrResponse;

      if (!response.ok) {
        setMessage(data?.error?.message || "Failed to pull QR access");
        setMessageTone("error");
        return;
      }

      // Update right-panel telemetry.
      setPullReason(data.reason ?? null);
      setPullBalance(typeof data.currentMinBalance === "number" ? data.currentMinBalance : null);
      setPullCheckedAt(data.pulledAt ?? data.checkedAt ?? new Date().toISOString());
      setPullRevokedCount(typeof data.revokedCount === "number" ? data.revokedCount : 0);

      // User-facing banner text differs for manual vs auto actions.
      if (data.pulled) {
        setMessage(
          force
            ? `Pulled QR access for ${data.revokedCount ?? 0} active request(s).`
            : `Auto pull triggered and removed QR access for ${data.revokedCount ?? 0} active request(s).`
        );
        setMessageTone("ok");
      } else if (force) {
        setMessage("No active QR access was found to pull.");
        setMessageTone("error");
      }
    } catch {
      setMessage("Failed to pull QR access");
      setMessageTone("error");
    } finally {
      setIsPulling(false);
    }
  }, []);

  // Auto-pull loop:
  // This only runs from persisted server settings (status.*), not unsaved form edits.
  useEffect(() => {
    const shouldAutoPull =
      Boolean(status?.linked) &&
      Boolean(status?.autoPullQrEnabled) &&
      typeof status?.autoPullQrThreshold === "number";

    if (!shouldAutoPull) {
      return;
    }

    // Poll every 15s while conditions remain true.
    const interval = setInterval(() => {
      void pullQrAccess(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [pullQrAccess, status?.linked, status?.autoPullQrEnabled, status?.autoPullQrThreshold]);

  // Link GET account using validated URL/session input.
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

      // Pull fresh status after linking so UI updates instantly.
      await refreshStatus();
    } catch {
      setMessage("Failed to link GET account");
      setMessageTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disconnect GET account and clear diagnostics panel.
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

  // Save QR expiry minutes setting.
  const handleSaveQrExpiry = async () => {
    const parsedMinutes = Number(qrCodeExpiryMinutes);

    if (!Number.isFinite(parsedMinutes)) {
      setMessage("QR code time limit must be a number of minutes.");
      setMessageTone("error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/get/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeExpiryMinutes: parsedMinutes }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error?.message || "Failed to save QR time limit");
        setMessageTone("error");
        return;
      }

      // Update local status cache and form to match saved server value.
      setStatus((current) =>
        current
          ? {
              ...current,
              qrCodeExpiryMinutes: data.qrCodeExpiryMinutes,
            }
          : current
      );
      setQrCodeExpiryMinutes(String(data.qrCodeExpiryMinutes));
      setMessage("QR code time limit saved.");
      setMessageTone("ok");
    } catch {
      setMessage("Failed to save QR time limit");
      setMessageTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save auto-pull toggle + threshold settings.
  const handleSaveAutoPull = async () => {
    const parsedThreshold = autoPullQrThreshold.trim() === "" ? null : Number(autoPullQrThreshold);

    if (parsedThreshold !== null && !Number.isFinite(parsedThreshold)) {
      setMessage("Auto-pull threshold must be a number or blank.");
      setMessageTone("error");
      return;
    }

    // If enabling auto mode, threshold is required.
    if (autoPullQrEnabled && parsedThreshold === null) {
      setMessage("Set a threshold before enabling auto-pull.");
      setMessageTone("error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/get/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoPullQrEnabled,
          autoPullQrThreshold: parsedThreshold,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error?.message || "Failed to save auto-pull settings");
        setMessageTone("error");
        return;
      }

      // Update local status + form to exactly what server persisted.
      setStatus((current) =>
        current
          ? {
              ...current,
              autoPullQrEnabled: data.autoPullQrEnabled,
              autoPullQrThreshold: data.autoPullQrThreshold,
            }
          : current
      );
      setAutoPullQrEnabled(Boolean(data.autoPullQrEnabled));
      setAutoPullQrThreshold(
        typeof data.autoPullQrThreshold === "number" ? String(data.autoPullQrThreshold) : ""
      );
      setMessage("Auto-pull settings saved.");
      setMessageTone("ok");
    } catch {
      setMessage("Failed to save auto-pull settings");
      setMessageTone("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run diagnostics endpoint and show raw snapshot.
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

  // Shared style classes for success/error feedback banner.
  const toneClasses =
    messageTone === "ok"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-red-300 bg-red-50 text-red-700";

  // Map backend reason keys to friendlier labels for the status card.
  const pullStateText = useMemo(() => {
    if (!pullReason) return "-";
    if (pullReason === "manual") return "Manual";
    if (pullReason === "threshold_met") return "Threshold met";
    if (pullReason === "threshold_not_met") return "Threshold not met";
    if (pullReason === "auto_pull_disabled") return "Auto-pull disabled";
    return pullReason;
  }, [pullReason]);

  return (
    // Two-column layout: controls on left, live status on right.
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-slate-300 bg-white/90 shadow-xl shadow-slate-900/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-slate-900">Link Donor GET Device</CardTitle>
          <CardDescription>
            Paste a validated GET redirect URL (or validated session id). We create a device + PIN and store it encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Link input section */}
          <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Validated Link Input
          </label>
          <textarea
            value={validatedInput}
            onChange={(event) => setValidatedInput(event.target.value)}
            placeholder="https://...validated... OR validated session UUID"
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
                <dt className="text-slate-400">QR time limit</dt>
                <dd className="font-semibold">{status.qrCodeExpiryMinutes} minute(s)</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Auto-pull</dt>
                <dd className="font-semibold">{status.autoPullQrEnabled ? "On" : "Off"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Threshold</dt>
                <dd className="font-semibold">{status.autoPullQrThreshold ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Pull state</dt>
                <dd className="font-semibold">{pullStateText}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Min balance</dt>
                <dd className="font-semibold">{typeof pullBalance === "number" ? pullBalance.toFixed(2) : "-"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Revoked count</dt>
                <dd className="font-semibold">{pullRevokedCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Credential Model</dt>
                <dd className="font-semibold">{status.model}</dd>
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
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Device ID Tail</p>
                <p className="mt-1 truncate font-mono text-xs text-slate-300">{status.deviceIdTail ?? "-"}</p>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Optional diagnostics JSON card */}
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
