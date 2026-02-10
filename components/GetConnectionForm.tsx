"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FULFILLMENT_MODES,
  FULFILLMENT_MODE_LABELS,
  type FulfillmentMode,
} from "@/lib/fulfillment";

interface GetSettingsResponse {
  connected: boolean;
  defaultFulfillmentMode: FulfillmentMode;
  lastValidatedAt: string | null;
}

export function GetConnectionForm() {
  const [settings, setSettings] = useState<GetSettingsResponse | null>(null);
  const [validatedUrl, setValidatedUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingMode, setIsSavingMode] = useState(false);
  const [modeDraft, setModeDraft] = useState<FulfillmentMode>("CODE_ONLY");

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/get");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to fetch GET settings");
        return;
      }

      setSettings(data);
      setModeDraft(data.defaultFulfillmentMode);
      setError("");
    } catch (fetchError) {
      console.error("Error fetching GET settings:", fetchError);
      setError("Failed to fetch GET settings");
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validatedUrl }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to connect GET account");
        return;
      }

      setValidatedUrl("");
      setSuccess("GET account connected");
      await fetchSettings();
    } catch (connectError) {
      console.error("Error connecting GET account:", connectError);
      setError("Failed to connect GET account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/get", {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to disconnect GET account");
        return;
      }

      setSuccess("GET account disconnected");
      await fetchSettings();
    } catch (disconnectError) {
      console.error("Error disconnecting GET account:", disconnectError);
      setError("Failed to disconnect GET account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMode = async () => {
    setError("");
    setSuccess("");
    setIsSavingMode(true);

    try {
      const response = await fetch("/api/get", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultFulfillmentMode: modeDraft }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update default fulfillment mode");
        return;
      }

      setSuccess("Default fulfillment mode updated");
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              defaultFulfillmentMode: data.defaultFulfillmentMode,
            }
          : prev
      );
    } catch (saveModeError) {
      console.error("Error updating default fulfillment mode:", saveModeError);
      setError("Failed to update default fulfillment mode");
    } finally {
      setIsSavingMode(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-emerald-100 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="default-fulfillment-mode">Default Fulfillment Mode</Label>
        <div className="flex gap-2">
          <select
            id="default-fulfillment-mode"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
            value={modeDraft}
            onChange={(event) =>
              setModeDraft(event.target.value as FulfillmentMode)
            }
          >
            {FULFILLMENT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {FULFILLMENT_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveMode}
            disabled={isSavingMode}
          >
            {isSavingMode ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {settings?.connected ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Connected to GET.
            {settings.lastValidatedAt
              ? ` Last validated ${new Date(settings.lastValidatedAt).toLocaleString()}.`
              : ""}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleDisconnect}
            disabled={isLoading}
          >
            {isLoading ? "Disconnecting..." : "Disconnect GET"}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-2">
          <Label htmlFor="validated-get-url">
            Paste validated GET URL/session token
          </Label>
          <Input
            id="validated-get-url"
            value={validatedUrl}
            onChange={(event) => setValidatedUrl(event.target.value)}
            placeholder="https://get.cbord.com/...validated..."
            required
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect GET"}
          </Button>
        </form>
      )}
    </div>
  );
}
