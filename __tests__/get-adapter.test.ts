import { describe, expect, it } from "vitest";
import { toApiError } from "@/lib/get/adapter";

describe("toApiError", () => {
  it("maps invalid session errors to authentication_error", () => {
    const error = toApiError(new Error("Invalid session token"), "fallback");
    expect(error.code).toBe("authentication_error");
    expect(error.status).toBe(401);
  });

  it("maps upstream timeout errors to transient_upstream_error", () => {
    const error = toApiError(new Error("Gateway timeout"), "fallback");
    expect(error.code).toBe("transient_upstream_error");
    expect(error.retryable).toBe(true);
  });
});
