import { GetAccount, GetErrorCode, GetService } from "@/lib/get/types";

type GetEnvelope<TParams> = {
  method: string;
  params: TParams;
};

type GetResult<TResponse> = {
  response?: TResponse;
  exception?: {
    message?: string;
    [key: string]: unknown;
  };
};

type ServiceMethodConfig = {
  service: GetService;
  method: string;
};

const DEFAULT_BASE_URL =
  "https://services.get.cbord.com/GETServices/services/json";

function parseService(value: string | undefined, fallback: GetService): GetService {
  if (value === "authentication" || value === "user" || value === "commerce") {
    return value;
  }
  return fallback;
}

function getMethodConfig(kind: "barcode" | "accounts"): ServiceMethodConfig {
  if (kind === "barcode") {
    return {
      service: parseService(process.env.GET_RPC_BARCODE_SERVICE, "authentication"),
      method: process.env.GET_RPC_BARCODE_METHOD || "retrievePatronBarcodePayload",
    };
  }

  return {
    service: parseService(process.env.GET_RPC_ACCOUNTS_SERVICE, "commerce"),
    method: process.env.GET_RPC_ACCOUNTS_METHOD || "retrieveAccounts",
  };
}

type SystemCredentials = {
  userName: string;
  password: string;
  domain: string;
};

function getSystemCredentials(): SystemCredentials {
  return {
    userName: process.env.GET_SYSTEM_USERNAME || "get_mobile",
    password: process.env.GET_SYSTEM_PASSWORD || "NOTUSED",
    domain: process.env.GET_SYSTEM_DOMAIN || "",
  };
}

function classifyErrorMessage(message: string): GetErrorCode {
  const lowered = message.toLowerCase();

  if (
    lowered.includes("invalid session") ||
    lowered.includes("session expired") ||
    lowered.includes("not authenticated") ||
    lowered.includes("authentication") ||
    lowered.includes("invalid credentials") ||
    lowered.includes("token")
  ) {
    return "authentication_error";
  }

  if (lowered.includes("forbidden") || lowered.includes("not authorized")) {
    return "authorization_error";
  }

  if (
    lowered.includes("timeout") ||
    lowered.includes("temporarily") ||
    lowered.includes("unavailable") ||
    lowered.includes("gateway") ||
    lowered.includes("network")
  ) {
    return "transient_upstream_error";
  }

  return "internal_error";
}

function defaultStatusFromCode(code: GetErrorCode): number {
  switch (code) {
    case "authentication_error":
      return 401;
    case "authorization_error":
      return 403;
    case "validation_error":
      return 400;
    case "transient_upstream_error":
      return 502;
    default:
      return 500;
  }
}

function defaultRetryable(code: GetErrorCode): boolean {
  return code === "transient_upstream_error";
}

export class GetAdapterError extends Error {
  code: GetErrorCode;
  retryable: boolean;
  status: number;
  details?: unknown;

  constructor(
    message: string,
    code: GetErrorCode,
    options?: { status?: number; retryable?: boolean; details?: unknown }
  ) {
    super(message);
    this.name = "GetAdapterError";
    this.code = code;
    this.retryable = options?.retryable ?? defaultRetryable(code);
    this.status = options?.status ?? defaultStatusFromCode(code);
    this.details = options?.details;
  }
}

function toAdapterError(error: unknown, fallbackMessage: string): GetAdapterError {
  if (error instanceof GetAdapterError) {
    return error;
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  const code = classifyErrorMessage(message);
  return new GetAdapterError(message || fallbackMessage, code);
}

export function toApiError(error: unknown, fallbackMessage: string): GetAdapterError {
  return toAdapterError(error, fallbackMessage);
}

export function generateDeviceId(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

export function generatePin(): string {
  return Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
}

export async function callGetApi<TParams, TResponse>(
  service: GetService,
  method: string,
  params: TParams
): Promise<TResponse> {
  const baseUrl = process.env.GET_API_BASE_URL || DEFAULT_BASE_URL;
  const body: GetEnvelope<TParams> = { method, params };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/${service}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    throw new GetAdapterError("GET provider is currently unreachable", "transient_upstream_error", {
      retryable: true,
      status: 502,
      details: error,
    });
  }

  let payload: GetResult<TResponse> | null = null;
  try {
    payload = (await response.json()) as GetResult<TResponse>;
  } catch {
    if (!response.ok) {
      throw new GetAdapterError(
        `GET provider returned HTTP ${response.status}`,
        response.status >= 500 ? "transient_upstream_error" : "internal_error",
        { status: response.status }
      );
    }
    throw new GetAdapterError("GET provider returned a non-JSON response", "internal_error");
  }

  const providerErrorMessage = payload?.exception?.message?.trim();
  if (providerErrorMessage) {
    const code = classifyErrorMessage(providerErrorMessage);
    throw new GetAdapterError(providerErrorMessage, code, {
      status: defaultStatusFromCode(code),
      details: payload.exception,
    });
  }

  if (!response.ok) {
    const genericMessage = `GET provider returned HTTP ${response.status}`;
    const code =
      response.status === 401
        ? "authentication_error"
        : response.status === 403
          ? "authorization_error"
          : response.status >= 500
            ? "transient_upstream_error"
            : "internal_error";
    throw new GetAdapterError(genericMessage, code, { status: response.status });
  }

  return payload?.response as TResponse;
}

type RetrieveAccountsResponse = GetAccount[] | { accounts?: GetAccount[] };

export async function retrieveAccounts(sessionId: string): Promise<GetAccount[]> {
  const config = getMethodConfig("accounts");
  const result = await callGetApi<{ sessionId: string }, RetrieveAccountsResponse>(
    config.service,
    config.method,
    { sessionId }
  );

  if (Array.isArray(result)) {
    return result;
  }

  return Array.isArray(result?.accounts) ? result.accounts : [];
}

export async function createPin(
  validatedSessionId: string,
  deviceId: string,
  pin: string
): Promise<void> {
  const response = await callGetApi<
    { sessionId: string; deviceId: string; PIN: string },
    boolean
  >("user", "createPIN", {
    sessionId: validatedSessionId,
    deviceId,
    PIN: pin,
  });

  if (response !== true) {
    throw new GetAdapterError("GET createPIN did not succeed", "internal_error");
  }
}

export async function authenticatePin(pin: string, deviceId: string): Promise<string> {
  const sessionId = await callGetApi<
    {
      pin: string;
      deviceId: string;
      systemCredentials: SystemCredentials;
    },
    string
  >("authentication", "authenticatePIN", {
    pin,
    deviceId,
    systemCredentials: getSystemCredentials(),
  });

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    throw new GetAdapterError(
      "GET authenticatePIN returned an invalid session",
      "authentication_error"
    );
  }

  return sessionId;
}

export async function verifyPin(sessionId: string, deviceId: string, pin: string): Promise<void> {
  const response = await callGetApi<
    { sessionId: string; deviceId: string; oldPIN: string; newPIN: string },
    boolean
  >("user", "updatePIN", {
    sessionId,
    deviceId,
    oldPIN: pin,
    newPIN: pin,
  });

  if (response !== true) {
    throw new GetAdapterError("GET updatePIN validation failed", "authentication_error");
  }
}

export async function revokePin(sessionId: string, deviceId: string): Promise<void> {
  const response = await callGetApi<{ deviceId: string; sessionId: string }, boolean>(
    "user",
    "deletePIN",
    {
      deviceId,
      sessionId,
    }
  );

  if (response !== true) {
    throw new GetAdapterError("GET deletePIN failed", "internal_error");
  }
}

function extractBarcodePayload(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  if (raw && typeof raw === "object") {
    const candidate = raw as { payload?: string; barcodePayload?: string; code?: string };
    const value = candidate.payload || candidate.barcodePayload || candidate.code;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export async function retrieveBarcodePayload(sessionId: string): Promise<string> {
  const config = getMethodConfig("barcode");
  const result = await callGetApi<{ sessionId: string }, unknown>(
    config.service,
    config.method,
    { sessionId }
  );
  const payload = extractBarcodePayload(result);

  if (!payload) {
    throw new GetAdapterError(
      "GET provider returned an empty barcode payload",
      "internal_error"
    );
  }

  return payload;
}
