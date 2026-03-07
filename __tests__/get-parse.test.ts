import { describe, expect, it } from "vitest";
import { extractValidatedSessionId } from "@/lib/get/parse";

describe("extractValidatedSessionId", () => {
  it("extracts uuid from validated URL", () => {
    const token = extractValidatedSessionId(
      "https://example.edu/validated?sessionId=123e4567-e89b-12d3-a456-426614174000"
    );

    expect(token).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("accepts raw uuid input", () => {
    const token = extractValidatedSessionId("123e4567-e89b-12d3-a456-426614174000");
    expect(token).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("rejects invalid input", () => {
    expect(extractValidatedSessionId("not-a-session")).toBeNull();
  });
});
