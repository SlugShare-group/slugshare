export const FULFILLMENT_MODES = [
  "CODE_ONLY",
  "TRANSFER_ONLY",
  "CODE_AND_TRANSFER",
] as const;

export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export const DEFAULT_FULFILLMENT_MODE: FulfillmentMode = "CODE_ONLY";

export function isFulfillmentMode(value: unknown): value is FulfillmentMode {
  return (
    typeof value === "string" &&
    (FULFILLMENT_MODES as readonly string[]).includes(value)
  );
}

export function resolveFulfillmentMode(
  value: unknown,
  fallback: FulfillmentMode = DEFAULT_FULFILLMENT_MODE
): FulfillmentMode {
  return isFulfillmentMode(value) ? value : fallback;
}

export function isCodeFulfillmentMode(
  value: FulfillmentMode | string | null | undefined
): boolean {
  return value === "CODE_ONLY" || value === "CODE_AND_TRANSFER";
}

export function isTransferFulfillmentMode(
  value: FulfillmentMode | string | null | undefined
): boolean {
  return value === "TRANSFER_ONLY" || value === "CODE_AND_TRANSFER";
}

export const FULFILLMENT_MODE_LABELS: Record<FulfillmentMode, string> = {
  CODE_ONLY: "Code only",
  TRANSFER_ONLY: "Transfer only",
  CODE_AND_TRANSFER: "Code + transfer",
};
