"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as PDF417 from "pdf417-generator";
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  DecodeHintType,
} from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TestingAccount = {
  id: string;
  accountDisplayName?: string;
  balance?: number | null;
  isActive?: boolean;
  isAccountTenderActive?: boolean;
  [key: string]: unknown;
};

type TestingTransaction = {
  transactionId: string;
  actualDate?: string;
  amount?: number;
  locationName?: string;
  [key: string]: unknown;
};

type TestingPayload = {
  connected: boolean;
  appBalance: number;
  totalGetBalance?: number;
  barcodePayload?: string;
  accounts?: TestingAccount[];
  transactions?: TestingTransaction[];
  transactionsWindowHours?: number;
  returnedTransactions?: number;
  fetchedAt?: string;
  warning?: string;
  error?: string;
};

type ApiConsoleResponse = {
  status: number;
  body: string;
  fetchedAt: string;
};

type PayloadProbeResponse = {
  payload: string;
  fetchedAt: string;
  length: number;
  error?: string;
};

type ProbeChangeEvent = {
  at: string;
  deltaMs: number | null;
  payload: string;
  length: number;
};

const DEFAULT_HOURS = 24;
const DEFAULT_LIMIT = 25;
const DEFAULT_PROBE_INTERVAL_MS = 5000;

export default function TestingPageClient() {
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [data, setData] = useState<TestingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [apiPath, setApiPath] = useState("/api/get/testing?hours=24&limit=25");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiBody, setApiBody] = useState("{\n  \n}");
  const [apiResponse, setApiResponse] = useState<ApiConsoleResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [probeIntervalMs, setProbeIntervalMs] = useState(
    DEFAULT_PROBE_INTERVAL_MS
  );
  const [probeRunning, setProbeRunning] = useState(false);
  const [probeSamples, setProbeSamples] = useState(0);
  const [probeLatest, setProbeLatest] = useState<{
    payload: string;
    fetchedAt: string;
    length: number;
  } | null>(null);
  const [probeChanges, setProbeChanges] = useState<ProbeChangeEvent[]>([]);
  const [probeError, setProbeError] = useState("");
  const [decodeImageUrl, setDecodeImageUrl] = useState("");
  const [decodeResult, setDecodeResult] = useState("");
  const [decodeError, setDecodeError] = useState("");
  const [isDecoding, setIsDecoding] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodeImageRef = useRef<HTMLImageElement | null>(null);
  const decoderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastProbePayloadRef = useRef<string | null>(null);
  const lastProbeChangeAtRef = useRef<number | null>(null);
  const probeRunningRef = useRef(false);
  const probeAbortRef = useRef<AbortController | null>(null);
  const probeInFlightRef = useRef(false);

  const fetchTestingData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/get/testing?hours=${hours}&limit=${limit}`
      );
      const payload = (await response.json()) as TestingPayload;

      if (!response.ok) {
        setError(payload.error || "Failed to load testing data");
        setData(null);
        return;
      }

      setData(payload);
    } catch (requestError) {
      console.error("Failed loading testing data:", requestError);
      setError("Failed to load testing data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hours, limit]);

  useEffect(() => {
    fetchTestingData();
  }, [fetchTestingData]);

  useEffect(() => {
    if (!canvasRef.current || !data?.barcodePayload) return;
    PDF417.draw(data.barcodePayload, canvasRef.current, 3);
  }, [data?.barcodePayload]);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]);
    decoderRef.current = new BrowserMultiFormatReader(hints);

    return () => {
      decoderRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (decodeImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(decodeImageUrl);
      }
    };
  }, [decodeImageUrl]);

  const replaceDecodeImage = useCallback((file: File) => {
    const nextUrl = URL.createObjectURL(file);
    setDecodeImageUrl((previousUrl) => {
      if (previousUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }
      return nextUrl;
    });
    setDecodeResult("");
    setDecodeError("");
  }, []);

  const handleDecodeFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      replaceDecodeImage(file);
      event.currentTarget.value = "";
    },
    [replaceDecodeImage]
  );

  const handleDecodePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();
        replaceDecodeImage(file);
        return;
      }
    },
    [replaceDecodeImage]
  );

  const decodeCurrentImage = useCallback(async () => {
    if (!decodeImageRef.current || !decoderRef.current || !decodeImageUrl) {
      setDecodeError("Upload or paste an image first.");
      return;
    }

    const imageElement = decodeImageRef.current;
    setIsDecoding(true);
    setDecodeError("");

    try {
      if (!imageElement.complete || imageElement.naturalWidth === 0) {
        await new Promise<void>((resolve, reject) => {
          const onLoad = () => {
            imageElement.removeEventListener("load", onLoad);
            imageElement.removeEventListener("error", onError);
            resolve();
          };
          const onError = () => {
            imageElement.removeEventListener("load", onLoad);
            imageElement.removeEventListener("error", onError);
            reject(new Error("Image failed to load."));
          };
          imageElement.addEventListener("load", onLoad);
          imageElement.addEventListener("error", onError);
        });
      }

      const result = await decoderRef.current.decodeFromImageElement(imageElement);
      setDecodeResult(result.getText());
    } catch (decodeFailure) {
      setDecodeResult("");
      setDecodeError(
        decodeFailure instanceof Error
          ? decodeFailure.message
          : "Could not decode PDF417 from image."
      );
    } finally {
      setIsDecoding(false);
    }
  }, [decodeImageUrl]);

  const sendApiRequest = async () => {
    setApiLoading(true);
    setApiResponse(null);

    try {
      const init: RequestInit = {
        method: apiMethod,
      };

      if (apiMethod !== "GET" && apiMethod !== "DELETE") {
        const trimmed = apiBody.trim();
        if (trimmed) {
          init.headers = { "Content-Type": "application/json" };
          init.body = trimmed;
        }
      }

      const response = await fetch(apiPath, init);
      const text = await response.text();

      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // Keep raw text when response is not JSON.
      }

      setApiResponse({
        status: response.status,
        body: pretty,
        fetchedAt: new Date().toISOString(),
      });
    } catch (requestError) {
      setApiResponse({
        status: 0,
        body:
          requestError instanceof Error
            ? requestError.message
            : "Unknown API console error",
        fetchedAt: new Date().toISOString(),
      });
    } finally {
      setApiLoading(false);
    }
  };

  const resetProbe = useCallback(() => {
    setProbeSamples(0);
    setProbeLatest(null);
    setProbeChanges([]);
    setProbeError("");
    lastProbePayloadRef.current = null;
    lastProbeChangeAtRef.current = null;
  }, []);

  useEffect(() => {
    probeRunningRef.current = probeRunning;
    if (!probeRunning) {
      probeAbortRef.current?.abort();
      probeAbortRef.current = null;
    }
  }, [probeRunning]);

  const runProbeSample = useCallback(async () => {
    if (!probeRunningRef.current) return;

    const controller = new AbortController();
    if (probeInFlightRef.current) return;
    probeInFlightRef.current = true;
    probeAbortRef.current = controller;

    try {
      const response = await fetch("/api/get/payload", {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json()) as PayloadProbeResponse;

      if (!probeRunningRef.current) return;

      if (!response.ok) {
        setProbeError(payload.error || "Probe request failed");
        return;
      }

      const fetchedAtMs = new Date(payload.fetchedAt).getTime();
      const safeTimestamp = Number.isFinite(fetchedAtMs)
        ? fetchedAtMs
        : Date.now();

      setProbeSamples((count) => count + 1);
      setProbeLatest({
        payload: payload.payload,
        fetchedAt: payload.fetchedAt,
        length: payload.length,
      });
      setProbeError("");

      if (lastProbePayloadRef.current === null) {
        lastProbePayloadRef.current = payload.payload;
        lastProbeChangeAtRef.current = safeTimestamp;
        return;
      }

      if (lastProbePayloadRef.current !== payload.payload) {
        const previousChangedAt = lastProbeChangeAtRef.current;
        const deltaMs =
          previousChangedAt !== null
            ? Math.max(0, safeTimestamp - previousChangedAt)
            : null;

        lastProbePayloadRef.current = payload.payload;
        lastProbeChangeAtRef.current = safeTimestamp;

        setProbeChanges((events) =>
          [
            {
              at: payload.fetchedAt,
              deltaMs,
              payload: payload.payload,
              length: payload.length,
            },
            ...events,
          ].slice(0, 20)
        );
      }
    } catch (probeRequestError) {
      if (
        probeRequestError instanceof DOMException &&
        probeRequestError.name === "AbortError"
      ) {
        return;
      }

      setProbeError(
        probeRequestError instanceof Error
          ? probeRequestError.message
          : "Unknown probe error"
      );
    } finally {
      probeInFlightRef.current = false;
      if (probeAbortRef.current === controller) {
        probeAbortRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (!probeRunning) return;

    runProbeSample();
    const timer = setInterval(runProbeSample, probeIntervalMs);

    return () => {
      clearInterval(timer);
      probeAbortRef.current?.abort();
      probeAbortRef.current = null;
    };
  }, [probeRunning, probeIntervalMs, runProbeSample]);

  const metrics = useMemo(
    () => [
      {
        label: "SlugShare Points",
        value:
          typeof data?.appBalance === "number"
            ? data.appBalance.toString()
            : "-",
      },
      {
        label: "GET Balance",
        value:
          typeof data?.totalGetBalance === "number"
            ? data.totalGetBalance.toFixed(2)
            : "-",
      },
      {
        label: "Transactions",
        value:
          typeof data?.returnedTransactions === "number"
            ? data.returnedTransactions.toString()
            : "0",
      },
      {
        label: "Payload Length",
        value: data?.barcodePayload?.length
          ? data.barcodePayload.length.toString()
          : "0",
      },
    ],
    [data]
  );

  const averageChangeSeconds = useMemo(() => {
    const deltas = probeChanges
      .map((event) => event.deltaMs)
      .filter((value): value is number => typeof value === "number");

    if (deltas.length === 0) return null;

    const total = deltas.reduce((sum, value) => sum + value, 0);
    return total / deltas.length / 1000;
  }, [probeChanges]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.1),_transparent_55%)] p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Integration Testing Lab</h1>
            <p className="text-sm text-muted-foreground">
              Quick testing for balances, transactions, barcode generation, and
              direct API calls.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>
              Adjust query window and refresh live testing data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-36 space-y-1">
                <Label htmlFor="hours">Hours Back</Label>
                <Input
                  id="hours"
                  type="number"
                  min={1}
                  max={336}
                  value={hours}
                  onChange={(event) =>
                    setHours(Number.parseInt(event.target.value || "24", 10))
                  }
                />
              </div>
              <div className="w-36 space-y-1">
                <Label htmlFor="limit">Transaction Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(event) =>
                    setLimit(Number.parseInt(event.target.value || "25", 10))
                  }
                />
              </div>
              <Button type="button" onClick={fetchTestingData} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh Testing Data"}
              </Button>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {data?.warning && (
              <div className="mt-4 rounded-md bg-amber-100 p-3 text-sm text-amber-800">
                {data.warning}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardDescription>{metric.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Generated Barcode</CardTitle>
              <CardDescription>
                Live PDF417 rendered from `/api/get/testing`.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border bg-white p-3">
                <canvas
                  ref={canvasRef}
                  className="h-[220px] w-full"
                  aria-label="Generated barcode"
                />
              </div>
              <div>
                <Button type="button" variant="outline" onClick={fetchTestingData} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh Barcode"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Last fetch:{" "}
                {data?.fetchedAt
                  ? new Date(data.fetchedAt).toLocaleString()
                  : "not yet fetched"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accounts Snapshot</CardTitle>
              <CardDescription>
                GET accounts and balances returned by the test endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[280px] space-y-2 overflow-auto pr-2">
                {(data?.accounts || []).map((account) => (
                  <div
                    key={String(account.id)}
                    className="rounded-md border p-2 text-sm"
                  >
                    <p className="font-medium">
                      {String(account.accountDisplayName || account.id)}
                    </p>
                    <p className="text-muted-foreground">
                      Balance: {typeof account.balance === "number"
                        ? account.balance.toFixed(2)
                        : "N/A"}
                    </p>
                  </div>
                ))}
                {(!data?.accounts || data.accounts.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    No account data loaded.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              Recent transactions returned by GET (most recent first).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[320px] overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.transactions || []).map((txn) => (
                    <tr key={String(txn.transactionId)} className="border-t">
                      <td className="px-3 py-2">
                        {txn.actualDate
                          ? new Date(txn.actualDate).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {String(txn.locationName || "-")}
                      </td>
                      <td className="px-3 py-2">
                        {typeof txn.amount === "number"
                          ? txn.amount.toFixed(2)
                          : "-"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {String(txn.transactionId || "-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data?.transactions || data.transactions.length === 0) && (
                <p className="p-3 text-sm text-muted-foreground">
                  No transactions loaded in this window.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PDF417 Image Decoder</CardTitle>
            <CardDescription>
              Paste an image or upload one, then decode its PDF417 payload.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full max-w-sm space-y-1">
                <Label htmlFor="decode-upload">Upload Image</Label>
                <Input
                  id="decode-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleDecodeFileChange}
                />
              </div>
              <Button
                type="button"
                onClick={decodeCurrentImage}
                disabled={!decodeImageUrl || isDecoding}
              >
                {isDecoding ? "Decoding..." : "Decode PDF417"}
              </Button>
            </div>

            <div
              tabIndex={0}
              onPaste={handleDecodePaste}
              className="rounded-md border border-dashed p-3 text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Click here and paste an image from clipboard (`Cmd/Ctrl + V`).
            </div>

            {decodeError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {decodeError}
              </div>
            )}

            {decodeImageUrl && (
              <div className="space-y-2">
                <img
                  ref={decodeImageRef}
                  src={decodeImageUrl}
                  alt="Uploaded PDF417 sample"
                  className="max-h-[260px] rounded-md border bg-white object-contain p-2"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDecodeImageUrl((previousUrl) => {
                      if (previousUrl.startsWith("blob:")) {
                        URL.revokeObjectURL(previousUrl);
                      }
                      return "";
                    });
                    setDecodeResult("");
                    setDecodeError("");
                  }}
                >
                  Clear Image
                </Button>
              </div>
            )}

            {decodeResult && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Decoded Payload</p>
                <pre className="max-h-[260px] overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                  {decodeResult}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Change Probe</CardTitle>
            <CardDescription>
              Measures how often the barcode payload actually changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-44 space-y-1">
                <Label htmlFor="probe-interval">Poll Interval (ms)</Label>
                <Input
                  id="probe-interval"
                  type="number"
                  min={1}
                  max={30000}
                  value={probeIntervalMs}
                  onChange={(event) =>
                    setProbeIntervalMs(
                      Number.parseInt(event.target.value || "2000", 10)
                    )
                  }
                  disabled={probeRunning}
                />
              </div>
              <Button
                type="button"
                onClick={() => setProbeRunning((running) => !running)}
              >
                {probeRunning ? "Stop Probe" : "Start Probe"}
              </Button>
              <Button type="button" variant="outline" onClick={resetProbe}>
                Reset Probe Data
              </Button>
            </div>

            {probeError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {probeError}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Samples</p>
                <p className="text-xl font-semibold">{probeSamples}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Detected Changes</p>
                <p className="text-xl font-semibold">{probeChanges.length}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Avg Change Interval</p>
                <p className="text-xl font-semibold">
                  {averageChangeSeconds !== null
                    ? `${averageChangeSeconds.toFixed(2)}s`
                    : "-"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Latest Data</p>
                <p className="text-xl font-semibold">
                  {probeLatest ? "Captured" : "-"}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Latest sample:{" "}
              {probeLatest?.fetchedAt
                ? new Date(probeLatest.fetchedAt).toLocaleString()
                : "not sampled yet"}
              {probeLatest?.length
                ? ` • payload length ${probeLatest.length}`
                : ""}
            </p>

            {probeLatest?.payload && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Latest Payload</p>
                <pre className="max-h-[140px] overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                  {probeLatest.payload}
                </pre>
              </div>
            )}

            <div className="max-h-[260px] overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Changed At</th>
                    <th className="px-3 py-2">Delta</th>
                    <th className="px-3 py-2">Payload Data</th>
                    <th className="px-3 py-2">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {probeChanges.map((event, index) => (
                    <tr
                      key={`${event.at}-${event.length}-${index}`}
                      className="border-t font-mono text-xs"
                    >
                      <td className="px-3 py-2">
                        {new Date(event.at).toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-2">
                        {event.deltaMs === null
                          ? "-"
                          : `${(event.deltaMs / 1000).toFixed(2)}s`}
                      </td>
                      <td className="max-w-[440px] px-3 py-2">
                        <details>
                          <summary className="cursor-pointer text-[11px] text-blue-700">
                            View payload
                          </summary>
                          <pre className="mt-1 max-h-[140px] overflow-auto rounded bg-slate-950 p-2 text-[10px] text-slate-100">
                            {event.payload}
                          </pre>
                        </details>
                      </td>
                      <td className="px-3 py-2">{event.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {probeChanges.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  No payload changes detected yet. Start probe and wait.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Console</CardTitle>
            <CardDescription>
              Manual request runner to interact with app APIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[140px_1fr]">
              <div className="space-y-1">
                <Label htmlFor="method">Method</Label>
                <select
                  id="method"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  value={apiMethod}
                  onChange={(event) => setApiMethod(event.target.value)}
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PATCH</option>
                  <option>DELETE</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="path">Path</Label>
                <Input
                  id="path"
                  value={apiPath}
                  onChange={(event) => setApiPath(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="body">JSON Body (optional)</Label>
              <textarea
                id="body"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={apiBody}
                onChange={(event) => setApiBody(event.target.value)}
              />
            </div>

            <Button type="button" onClick={sendApiRequest} disabled={apiLoading}>
              {apiLoading ? "Sending..." : "Send Request"}
            </Button>

            {apiResponse && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Status: {apiResponse.status} •{" "}
                  {new Date(apiResponse.fetchedAt).toLocaleString()}
                </p>
                <pre className="max-h-[320px] overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                  {apiResponse.body}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
