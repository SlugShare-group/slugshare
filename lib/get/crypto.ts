import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const IV_BYTES = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.GET_CREDENTIAL_SECRET;
  if (secret) {
    return createHash("sha256").update(secret).digest();
  }

  const keyBase64 = process.env.GET_CREDENTIALS_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error("GET_CREDENTIAL_SECRET or GET_CREDENTIALS_ENCRYPTION_KEY is required");
  }

  let key: Buffer;
  try {
    key = Buffer.from(keyBase64, "base64");
  } catch {
    throw new Error("GET_CREDENTIALS_ENCRYPTION_KEY must be a valid base64 string");
  }

  if (key.length !== 32) {
    throw new Error("GET_CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }

  return key;
}

export function encryptSecret(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSessionToken(payload: string): string {
  const [ivBase64, tagBase64, dataBase64] = payload.split(":");
  if (!ivBase64 || !tagBase64 || !dataBase64) {
    throw new Error("Invalid encrypted token format");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function decryptSecret(payload: string): string {
  return decryptSessionToken(payload);
}

export function encryptSessionToken(token: string): string {
  return encryptSecret(token);
}

export function getSessionFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
