export type GetService = "authentication" | "user" | "commerce";

export type GetErrorCode =
  | "authentication_error"
  | "authorization_error"
  | "transient_upstream_error"
  | "validation_error"
  | "internal_error";

export type ApiErrorEnvelope = {
  error: {
    code: GetErrorCode;
    message: string;
    retryable: boolean;
    details?: unknown;
  };
};

export type GetAccount = {
  id: string;
  accountDisplayName: string;
  isActive?: boolean;
  isAccountTenderActive?: boolean;
  depositAccepted?: boolean;
  balance: number | null;
};

export type BalanceSnapshotEntry = {
  id: string;
  name: string;
  balance: number | null;
};

