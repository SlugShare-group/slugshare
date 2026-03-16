"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_QR_CODE_EXPIRY_MINUTES, MIN_QR_CODE_EXPIRY_MINUTES } from "@/lib/get/qr-expiry";

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

  // Pull-access result metadata (shown on the right status card).
  const [pullReason, setPullReason] = useState<string | null>(null);
  const [pullBalance, setPullBalance] = useState<number | null>(null);
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

  // Disconnect GET account.
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

  // Shared style classes for success/error feedback banner.
  const toneClasses =
    messageTone === "ok"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200";

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
      <div className="space-y-6">
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
              <Button asChild variant="outline">
                <a
                  href="https://get.cbord.com/ucsc/full/login.php?mobileapp=1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Login Link
                </a>
              </Button>
            </div>
            {message && <div className={`rounded-xl border px-4 py-3 text-sm ${toneClasses}`}>{message}</div>}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-black">QR Access Controls</CardTitle>
            <CardDescription>Manually revoke active QR access for all open QR requests.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={isPulling || !status?.linked}
              onClick={() => pullQrAccess(true)}
            >
              {isPulling ? "Pulling..." : "Pull QR Access Now"}
            </Button>
            {!status?.linked && (
              <p className="text-sm text-muted-foreground">Link a GET account to enable QR access controls.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-black">QR Code Time Limit</CardTitle>
            <CardDescription>
              Set how long QR codes remain valid before expiring. Allowed range: {MIN_QR_CODE_EXPIRY_MINUTES} to{" "}
              {MAX_QR_CODE_EXPIRY_MINUTES} minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qr-expiry-minutes">QR time limit (minutes)</Label>
              <Input
                id="qr-expiry-minutes"
                type="number"
                min={MIN_QR_CODE_EXPIRY_MINUTES}
                max={MAX_QR_CODE_EXPIRY_MINUTES}
                value={qrCodeExpiryMinutes}
                onChange={(event) => setQrCodeExpiryMinutes(event.target.value)}
                disabled={isSubmitting || !status?.linked}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={isSubmitting || !status?.linked}
                onClick={handleSaveQrExpiry}
              >
                {isSubmitting ? "Saving..." : "Save Time Limit"}
              </Button>
              {!status?.linked && (
                <p className="text-sm text-muted-foreground">Link a GET account to update QR time limits.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-black">Auto-Pull QR Access</CardTitle>
            <CardDescription>
              Automatically revoke QR access when the minimum balance drops below your threshold.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                checked={autoPullQrEnabled}
                onChange={(event) => setAutoPullQrEnabled(event.target.checked)}
                disabled={isSubmitting || !status?.linked}
              />
              <span className="text-sm font-medium text-foreground">Enable auto-pull</span>
            </label>
            <div className="space-y-2">
              <Label htmlFor="auto-pull-threshold">Balance threshold (minimum)</Label>
              <Input
                id="auto-pull-threshold"
                type="number"
                min={0}
                value={autoPullQrThreshold}
                onChange={(event) => setAutoPullQrThreshold(event.target.value)}
                disabled={isSubmitting || !status?.linked}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to disable auto-pull, or set a number to auto-revoke when balance dips below it.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={isSubmitting || !status?.linked}
                onClick={handleSaveAutoPull}
              >
                {isSubmitting ? "Saving..." : "Save Auto-Pull Settings"}
              </Button>
              {!status?.linked && (
                <p className="text-sm text-muted-foreground">Link a GET account to enable auto-pull.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
