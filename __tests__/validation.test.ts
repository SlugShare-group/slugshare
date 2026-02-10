import { describe, it, expect } from "vitest";
import {
  validateCreateRequest,
  validateDeleteRequest,
  validateAcceptRequest,
  validateFulfillmentModeOverride,
} from "@/lib/validation";

describe("validateCreateRequest", () => {
  it("accepts valid input", () => {
    const result = validateCreateRequest({
      location: "C9/C10 Dining Hall",
      pointsRequested: 5,
    });
    expect(result).toEqual({ valid: true });
  });

  it("rejects missing location", () => {
    const result = validateCreateRequest({ pointsRequested: 5 });
    expect(result).toEqual({
      valid: false,
      error: "Location is required",
      status: 400,
    });
  });

  it("rejects empty location", () => {
    const result = validateCreateRequest({
      location: "   ",
      pointsRequested: 5,
    });
    expect(result).toEqual({
      valid: false,
      error: "Location is required",
      status: 400,
    });
  });

  it("rejects non-string location", () => {
    const result = validateCreateRequest({
      location: 123,
      pointsRequested: 5,
    });
    expect(result).toEqual({
      valid: false,
      error: "Location is required",
      status: 400,
    });
  });

  it("rejects missing points", () => {
    const result = validateCreateRequest({ location: "Oakes Cafe" });
    expect(result).toEqual({
      valid: false,
      error: "Points requested must be a positive integer",
      status: 400,
    });
  });

  it("rejects zero points", () => {
    const result = validateCreateRequest({
      location: "Oakes Cafe",
      pointsRequested: 0,
    });
    expect(result).toEqual({
      valid: false,
      error: "Points requested must be a positive integer",
      status: 400,
    });
  });

  it("rejects negative points", () => {
    const result = validateCreateRequest({
      location: "Oakes Cafe",
      pointsRequested: -5,
    });
    expect(result).toEqual({
      valid: false,
      error: "Points requested must be a positive integer",
      status: 400,
    });
  });

  it("rejects non-integer points", () => {
    const result = validateCreateRequest({
      location: "Oakes Cafe",
      pointsRequested: 5.5,
    });
    expect(result).toEqual({
      valid: false,
      error: "Points requested must be a positive integer",
      status: 400,
    });
  });

  it("rejects string points", () => {
    const result = validateCreateRequest({
      location: "Oakes Cafe",
      pointsRequested: "5" as unknown as number,
    });
    expect(result).toEqual({
      valid: false,
      error: "Points requested must be a positive integer",
      status: 400,
    });
  });
});

describe("validateDeleteRequest", () => {
  const userId = "user-123";
  const otherUserId = "user-456";

  it("accepts valid delete of own pending request", () => {
    const result = validateDeleteRequest(
      { requesterId: userId, status: "pending" },
      userId
    );
    expect(result).toEqual({ valid: true });
  });

  it("rejects when request not found", () => {
    const result = validateDeleteRequest(null, userId);
    expect(result).toEqual({
      valid: false,
      error: "Request not found",
      status: 404,
    });
  });

  it("rejects deleting another user's request", () => {
    const result = validateDeleteRequest(
      { requesterId: otherUserId, status: "pending" },
      userId
    );
    expect(result).toEqual({
      valid: false,
      error: "You can only delete your own requests",
      status: 403,
    });
  });

  it("rejects deleting accepted request", () => {
    const result = validateDeleteRequest(
      { requesterId: userId, status: "accepted" },
      userId
    );
    expect(result).toEqual({
      valid: false,
      error: "You can only delete pending requests",
      status: 400,
    });
  });

  it("rejects deleting declined request", () => {
    const result = validateDeleteRequest(
      { requesterId: userId, status: "declined" },
      userId
    );
    expect(result).toEqual({
      valid: false,
      error: "You can only delete pending requests",
      status: 400,
    });
  });

  it("rejects deleting completed request", () => {
    const result = validateDeleteRequest(
      { requesterId: userId, status: "completed" },
      userId
    );
    expect(result).toEqual({
      valid: false,
      error: "You can only delete pending requests",
      status: 400,
    });
  });
});

describe("validateAcceptRequest", () => {
  const requesterId = "requester-123";
  const donorId = "donor-456";

  it("accepts valid request with sufficient balance", () => {
    const result = validateAcceptRequest(
      { requesterId, status: "pending", pointsRequested: 5 },
      donorId,
      10
    );
    expect(result).toEqual({ valid: true });
  });

  it("accepts when balance exactly matches requested points", () => {
    const result = validateAcceptRequest(
      { requesterId, status: "pending", pointsRequested: 10 },
      donorId,
      10
    );
    expect(result).toEqual({ valid: true });
  });

  it("rejects when request not found", () => {
    const result = validateAcceptRequest(null, donorId, 10);
    expect(result).toEqual({
      valid: false,
      error: "Request not found",
      status: 404,
    });
  });

  it("rejects accepting own request", () => {
    const result = validateAcceptRequest(
      { requesterId: donorId, status: "pending", pointsRequested: 5 },
      donorId,
      10
    );
    expect(result).toEqual({
      valid: false,
      error: "You cannot accept your own request",
      status: 400,
    });
  });

  it("rejects accepting already accepted request", () => {
    const result = validateAcceptRequest(
      { requesterId, status: "accepted", pointsRequested: 5 },
      donorId,
      10
    );
    expect(result).toEqual({
      valid: false,
      error: "Request is no longer pending",
      status: 400,
    });
  });

  it("rejects accepting declined request", () => {
    const result = validateAcceptRequest(
      { requesterId, status: "declined", pointsRequested: 5 },
      donorId,
      10
    );
    expect(result).toEqual({
      valid: false,
      error: "Request is no longer pending",
      status: 400,
    });
  });

  it("rejects accepting completed request", () => {
    const result = validateAcceptRequest(
      { requesterId, status: "completed", pointsRequested: 5 },
      donorId,
      10
    );
    expect(result).toEqual({
      valid: false,
      error: "Request is no longer pending",
      status: 400,
    });
  });

  it("rejects when donor has insufficient balance", () => {
    const result = validateAcceptRequest(
      { requesterId, status: "pending", pointsRequested: 15 },
      donorId,
      10
    );
    expect(result).toEqual({
      valid: false,
      error: "Insufficient points balance",
      status: 400,
    });
  });

  it("rejects when donor has zero balance", () => {
    const result = validateAcceptRequest(
      { requesterId, status: "pending", pointsRequested: 5 },
      donorId,
      0
    );
    expect(result).toEqual({
      valid: false,
      error: "Insufficient points balance",
      status: 400,
    });
  });
});

describe("validateFulfillmentModeOverride", () => {
  it("accepts undefined mode", () => {
    const result = validateFulfillmentModeOverride(undefined);
    expect(result).toEqual({ valid: true });
  });

  it("accepts a valid fulfillment mode", () => {
    const result = validateFulfillmentModeOverride("CODE_ONLY");
    expect(result).toEqual({ valid: true, mode: "CODE_ONLY" });
  });

  it("rejects invalid mode", () => {
    const result = validateFulfillmentModeOverride("INVALID_MODE");
    expect(result).toEqual({
      valid: false,
      error: "Invalid fulfillment mode",
      status: 400,
    });
  });
});
