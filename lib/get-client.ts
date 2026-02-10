const GET_ENDPOINT = "https://services.get.cbord.com/GETServices/services/json";

type GETService = "authentication" | "user" | "commerce";

interface GETEnvelope<T> {
  response?: T;
  exception?: unknown;
}

function parseException(exception: unknown): string {
  if (!exception) {
    return "Unknown GET API error";
  }

  if (typeof exception === "string") {
    return exception;
  }

  if (typeof exception === "object") {
    const maybeMessage =
      (exception as { message?: string }).message ||
      (exception as { detailMessage?: string }).detailMessage ||
      (exception as { error?: string }).error ||
      (exception as { errorMessage?: string }).errorMessage ||
      (exception as { description?: string }).description;
    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }

    try {
      return JSON.stringify(exception);
    } catch {
      return "Unknown GET API error";
    }
  }

  return "Unknown GET API error";
}

export class GETAPIError extends Error {
  service: GETService;
  method: string;
  rawException?: unknown;

  constructor(
    message: string,
    service: GETService,
    method: string,
    rawException?: unknown
  ) {
    super(message);
    this.name = "GETAPIError";
    this.service = service;
    this.method = method;
    this.rawException = rawException;
  }
}

export function isTransientGetError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("unexpected error") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("temporar")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function makeGETRequest<T>(
  service: GETService,
  method: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(`${GET_ENDPOINT}/${service}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      method,
      params,
    }),
  });

  const payload = (await response.json()) as GETEnvelope<T>;

  if (!response.ok) {
    throw new GETAPIError(
      `GET API ${service}.${method} failed (${response.status})`,
      service,
      method
    );
  }

  if (payload.exception) {
    throw new GETAPIError(
      `GET API ${service}.${method} exception: ${parseException(payload.exception)}`,
      service,
      method,
      payload.exception
    );
  }

  if (typeof payload.response === "undefined") {
    throw new GETAPIError(
      `GET API ${service}.${method} response did not include response payload`,
      service,
      method
    );
  }

  return payload.response;
}

export async function makeGETRequestWithRetry<T>(
  service: GETService,
  method: string,
  params: Record<string, unknown> = {},
  retries = 2
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await makeGETRequest<T>(service, method, params);
    } catch (error) {
      lastError = error;
      if (!isTransientGetError(error) || attempt === retries) {
        throw error;
      }
      await sleep(250 * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("GET API request failed");
}

export async function createPIN(
  sessionId: string,
  deviceId: string,
  pin: string
): Promise<boolean> {
  return makeGETRequestWithRetry<boolean>("user", "createPIN", {
    sessionId,
    deviceId,
    PIN: pin,
  });
}

export async function authenticatePIN(
  deviceId: string,
  pin: string
): Promise<string> {
  return makeGETRequestWithRetry<string>("authentication", "authenticatePIN", {
    pin,
    deviceId,
    systemCredentials: {
      password: "NOTUSED",
      userName: "get_mobile",
      domain: "",
    },
  });
}

export async function deletePIN(
  sessionId: string,
  deviceId: string
): Promise<boolean> {
  return makeGETRequestWithRetry<boolean>("user", "deletePIN", {
    sessionId,
    deviceId,
  });
}

export async function retrievePatronBarcodePayload(
  sessionId: string
): Promise<string> {
  return makeGETRequestWithRetry<string>(
    "authentication",
    "retrievePatronBarcodePayload",
    { sessionId }
  );
}

type GETTransaction = {
  transactionId: string;
  actualDate: string;
  [key: string]: unknown;
};

type GETAccount = {
  id: string;
  accountDisplayName?: string;
  isActive?: boolean;
  isAccountTenderActive?: boolean;
  balance?: number | null;
  [key: string]: unknown;
};

export async function retrieveTransactionsSince(
  sessionId: string,
  oldestDate: Date
): Promise<GETTransaction[]> {
  type TxnResponse = {
    transactions?: GETTransaction[];
  };

  const response = await makeGETRequestWithRetry<TxnResponse>(
    "commerce",
    "retrieveTransactionHistoryWithinDateRange",
    {
      sessionId,
      paymentSystemType: 0,
      queryCriteria: {
        maxReturnMostRecent: 1000,
        newestDate: null,
        oldestDate: oldestDate.toISOString(),
        accountId: null,
      },
    }
  );

  return response.transactions ?? [];
}

export async function retrieveAccounts(
  sessionId: string
): Promise<GETAccount[]> {
  type AccountsResponse = {
    accounts?: GETAccount[];
  };

  const response = await makeGETRequestWithRetry<AccountsResponse>(
    "commerce",
    "retrieveAccounts",
    { sessionId }
  );

  return response.accounts ?? [];
}
