import { afterEach, describe, expect, it } from "vitest";
import {
  decryptSessionToken,
  encryptSessionToken,
  getSessionFingerprint,
} from "@/lib/get/crypto";

const ORIGINAL_KEY = process.env.GET_CREDENTIALS_ENCRYPTION_KEY;

describe("GET crypto", () => {
  afterEach(() => {
    process.env.GET_CREDENTIALS_ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("encrypts and decrypts token", () => {
    process.env.GET_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");

    const token = "session-token-123";
    const encrypted = encryptSessionToken(token);
    const decrypted = decryptSessionToken(encrypted);

    expect(decrypted).toBe(token);
  });

  it("computes deterministic fingerprint", () => {
    const token = "session-token-123";

    expect(getSessionFingerprint(token)).toBe(getSessionFingerprint(token));
    expect(getSessionFingerprint(token)).not.toBe(getSessionFingerprint("other-token"));
  });
});
