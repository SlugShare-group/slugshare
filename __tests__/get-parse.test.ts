import { describe, expect, it } from "vitest";
import { extractGetSessionToken } from "@/lib/get/parse";

describe("extractGetSessionToken", () => {
  it("extracts uuid from validated URL", () => {
    const token = extractGetSessionToken(
      "https://example.edu/validated?sessionId=123e4567-e89b-12d3-a456-426614174000"
    );

    expect(token).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("accepts raw token", () => {
    const token = extractGetSessionToken("abcDEF0123456789token");
    expect(token).toBe("abcDEF0123456789token");
  });

  it("rejects invalid input", () => {
    expect(extractGetSessionToken("   ")).toBeNull();
  });
});
