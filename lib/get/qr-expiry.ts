export const DEFAULT_QR_CODE_EXPIRY_MINUTES = 60;
export const MIN_QR_CODE_EXPIRY_MINUTES = 1;
export const MAX_QR_CODE_EXPIRY_MINUTES = 24 * 60;

export function normalizeQrCodeExpiryMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_QR_CODE_EXPIRY_MINUTES;
  }

  const rounded = Math.trunc(value);
  if (rounded < MIN_QR_CODE_EXPIRY_MINUTES) {
    return MIN_QR_CODE_EXPIRY_MINUTES;
  }
  if (rounded > MAX_QR_CODE_EXPIRY_MINUTES) {
    return MAX_QR_CODE_EXPIRY_MINUTES;
  }
  return rounded;
}

export function toQrCodeExpiryMs(minutes: number): number {
  return normalizeQrCodeExpiryMinutes(minutes) * 60 * 1000;
}
