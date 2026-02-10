import { describe, expect, it } from "vitest";
import {
  extractValidatedSessionId,
  generateDeviceId,
  generatePin,
} from "@/lib/get-onboarding";

describe("extractValidatedSessionId", () => {
  const sessionId = "123e4567-e89b-12d3-a456-426614174000";

  it("extracts a token from full URL", () => {
    const result = extractValidatedSessionId(
      `https://get.cbord.com/ucsc/full/validated.php?sessionId=${sessionId}`
    );
    expect(result).toBe(sessionId);
  });

  it("extracts a token from raw input text", () => {
    const result = extractValidatedSessionId(`validated: ${sessionId}`);
    expect(result).toBe(sessionId);
  });

  it("returns null for invalid input", () => {
    const result = extractValidatedSessionId("https://example.com/no-token");
    expect(result).toBeNull();
  });
});

describe("device credential generation", () => {
  it("generates a 16-char device ID", () => {
    const deviceId = generateDeviceId();
    expect(deviceId).toHaveLength(16);
  });

  it("generates a 4-char PIN", () => {
    const pin = generatePin();
    expect(pin).toMatch(/^\d{4}$/);
  });
});
