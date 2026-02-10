import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, PATCH, POST } from "@/app/api/get/route";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticatePIN, createPIN } from "@/lib/get-client";
import { extractValidatedSessionId } from "@/lib/get-onboarding";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    getCredential: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/get-client", () => ({
  createPIN: vi.fn(),
  authenticatePIN: vi.fn(),
  deletePIN: vi.fn(),
}));

vi.mock("@/lib/get-onboarding", () => ({
  extractValidatedSessionId: vi.fn(),
  generateDeviceId: vi.fn(() => "9999999999999999"),
  generatePin: vi.fn(() => "1234"),
}));

vi.mock("@/lib/crypto", () => ({
  encryptSecret: vi.fn((value: string) => `enc:${value}`),
  decryptSecret: vi.fn((value: string) => value.replace(/^enc:/, "")),
}));

function jsonRequest(method: string, body: Record<string, unknown>) {
  return new NextRequest("http://test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/get route", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.update).mockReset();
    vi.mocked(prisma.getCredential.upsert).mockReset();
    vi.mocked(prisma.getCredential.findUnique).mockReset();
    vi.mocked(prisma.getCredential.delete).mockReset();
    vi.mocked(createPIN).mockReset();
    vi.mocked(authenticatePIN).mockReset();
    vi.mocked(extractValidatedSessionId).mockReset();
  });

  it("GET rejects unauthenticated users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(undefined);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST connects GET account successfully", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(extractValidatedSessionId).mockReturnValue(
      "123e4567-e89b-12d3-a456-426614174000"
    );
    vi.mocked(createPIN).mockResolvedValue(true);
    vi.mocked(authenticatePIN).mockResolvedValue("auth-session");
    vi.mocked(prisma.getCredential.upsert).mockResolvedValue({
      id: "gc-1",
    } as never);

    const res = await POST(
      jsonRequest("POST", {
        validatedUrl:
          "https://get.cbord.com/ucsc/full/validated.php?sessionId=123e4567-e89b-12d3-a456-426614174000",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ connected: true });
    expect(prisma.getCredential.upsert).toHaveBeenCalled();
  });

  it("POST returns failure when GET API throws", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(extractValidatedSessionId).mockReturnValue(
      "123e4567-e89b-12d3-a456-426614174000"
    );
    vi.mocked(createPIN).mockRejectedValue(new Error("GET exception"));

    const res = await POST(
      jsonRequest("POST", {
        validatedUrl:
          "https://get.cbord.com/ucsc/full/validated.php?sessionId=123e4567-e89b-12d3-a456-426614174000",
      })
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to connect GET account");
  });

  it("PATCH updates default fulfillment mode", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.user.update).mockResolvedValue({
      defaultFulfillmentMode: "TRANSFER_ONLY",
    } as never);

    const res = await PATCH(
      jsonRequest("PATCH", { defaultFulfillmentMode: "TRANSFER_ONLY" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.defaultFulfillmentMode).toBe("TRANSFER_ONLY");
  });

  it("DELETE clears local credential even if none exists", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.getCredential.findUnique).mockResolvedValue(null);

    const res = await DELETE();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ connected: false });
  });
});
