import { NextResponse } from "next/server";
import { GetAdapterError, toApiError } from "@/lib/get/adapter";
import { GetErrorCode } from "@/lib/get/types";

export function getErrorResponse(
  code: GetErrorCode,
  message: string,
  status: number,
  retryable: boolean,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        retryable,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

export function fromGetError(error: unknown, fallbackMessage: string) {
  const normalized: GetAdapterError = toApiError(error, fallbackMessage);
  return getErrorResponse(
    normalized.code,
    normalized.message || fallbackMessage,
    normalized.status,
    normalized.retryable
  );
}

