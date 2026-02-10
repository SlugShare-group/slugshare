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
      (exception as { detailMessage?: string }).detailMessage;
    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }
  }

  return "Unknown GET API error";
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
    throw new Error(`GET API request failed (${response.status})`);
  }

  if (payload.exception) {
    throw new Error(parseException(payload.exception));
  }

  if (typeof payload.response === "undefined") {
    throw new Error("GET API response did not include response payload");
  }

  return payload.response;
}

export async function createPIN(
  sessionId: string,
  deviceId: string,
  pin: string
): Promise<boolean> {
  return makeGETRequest<boolean>("user", "createPIN", {
    sessionId,
    deviceId,
    PIN: pin,
  });
}

export async function authenticatePIN(
  deviceId: string,
  pin: string
): Promise<string> {
  return makeGETRequest<string>("authentication", "authenticatePIN", {
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
  return makeGETRequest<boolean>("user", "deletePIN", {
    sessionId,
    deviceId,
  });
}

export async function retrievePatronBarcodePayload(
  sessionId: string
): Promise<string> {
  return makeGETRequest<string>(
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

export async function retrieveTransactionsSince(
  sessionId: string,
  oldestDate: Date
): Promise<GETTransaction[]> {
  type TxnResponse = {
    transactions?: GETTransaction[];
  };

  const response = await makeGETRequest<TxnResponse>(
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
