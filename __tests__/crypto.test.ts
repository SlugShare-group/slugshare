import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

const ORIGINAL_KEY = process.env.GET_CREDENTIALS_ENCRYPTION_KEY;

afterEach(() => {
  if (ORIGINAL_KEY) {
    process.env.GET_CREDENTIALS_ENCRYPTION_KEY = ORIGINAL_KEY;
  } else {
    delete process.env.GET_CREDENTIALS_ENCRYPTION_KEY;
  }
  vi.restoreAllMocks();
});

describe("crypto helpers", () => {
  it("encrypts and decrypts secrets", () => {
    process.env.GET_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      "base64"
    );
    const encrypted = encryptSecret("sensitive-value");
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe("sensitive-value");
  });

  it("throws when key is missing", () => {
    delete process.env.GET_CREDENTIALS_ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow(
      "GET_CREDENTIALS_ENCRYPTION_KEY is not configured"
    );
  });

  it("throws when key has invalid length", () => {
    process.env.GET_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString(
      "base64"
    );
    expect(() => encryptSecret("x")).toThrow(
      "GET_CREDENTIALS_ENCRYPTION_KEY must decode to 32 bytes"
    );
  });
});
