import { isFulfillmentMode, type FulfillmentMode } from "@/lib/fulfillment";

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; status: number };

export function validateCreateRequest(body: {
  location?: unknown;
  pointsRequested?: unknown;
}): ValidationResult {
  const { location, pointsRequested } = body;

  if (
    !location ||
    typeof location !== "string" ||
    location.trim().length === 0
  ) {
    return { valid: false, error: "Location is required", status: 400 };
  }

  if (
    typeof pointsRequested !== "number" ||
    pointsRequested <= 0 ||
    !Number.isInteger(pointsRequested)
  ) {
    return {
      valid: false,
      error: "Points requested must be a positive integer",
      status: 400,
    };
  }

  return { valid: true };
}

export function validateDeleteRequest(
  request: { requesterId: string; status: string } | null,
  userId: string
): ValidationResult {
  if (!request) {
    return { valid: false, error: "Request not found", status: 404 };
  }

  if (request.requesterId !== userId) {
    return {
      valid: false,
      error: "You can only delete your own requests",
      status: 403,
    };
  }

  if (request.status !== "pending") {
    return {
      valid: false,
      error: "You can only delete pending requests",
      status: 400,
    };
  }

  return { valid: true };
}

export function validateAcceptRequest(
  request: { requesterId: string; status: string; pointsRequested: number } | null,
  userId: string,
  donorBalance: number
): ValidationResult {
  if (!request) {
    return { valid: false, error: "Request not found", status: 404 };
  }

  if (request.requesterId === userId) {
    return {
      valid: false,
      error: "You cannot accept your own request",
      status: 400,
    };
  }

  if (request.status !== "pending") {
    return {
      valid: false,
      error: "Request is no longer pending",
      status: 400,
    };
  }

  if (donorBalance < request.pointsRequested) {
    return { valid: false, error: "Insufficient points balance", status: 400 };
  }

  return { valid: true };
}

export type FulfillmentModeValidationResult =
  | { valid: true; mode?: FulfillmentMode }
  | { valid: false; error: string; status: number };

export function validateFulfillmentModeOverride(
  mode: unknown
): FulfillmentModeValidationResult {
  if (typeof mode === "undefined") {
    return { valid: true };
  }

  if (!isFulfillmentMode(mode)) {
    return {
      valid: false,
      error: "Invalid fulfillment mode",
      status: 400,
    };
  }

  return { valid: true, mode };
}
