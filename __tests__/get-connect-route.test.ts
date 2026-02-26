import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/get/connect/route";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  authenticatePin,
  createPin,
  generateDeviceId,
  generatePin,
  retrieveAccounts,
  verifyPin,
} from "@/lib/get/adapter";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    getCredential: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/get/adapter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/get/adapter")>("@/lib/get/adapter");
  return {
    ...actual,
    authenticatePin: vi.fn(),
    createPin: vi.fn(),
    generateDeviceId: vi.fn(),
    generatePin: vi.fn(),
    retrieveAccounts: vi.fn(),
    verifyPin: vi.fn(),
  };
});

const ORIGINAL_SECRET = process.env.GET_CREDENTIAL_SECRET;

function postRequest(body: unknown) {
  return new NextRequest("http://test/api/get/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/get/connect", () => {
  beforeEach(() => {
    process.env.GET_CREDENTIAL_SECRET = "test-secret";
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(prisma.getCredential.upsert).mockReset();
    vi.mocked(authenticatePin).mockReset();
    vi.mocked(createPin).mockReset();
    vi.mocked(generateDeviceId).mockReset();
    vi.mocked(generatePin).mockReset();
    vi.mocked(retrieveAccounts).mockReset();
    vi.mocked(verifyPin).mockReset();

    vi.mocked(generateDeviceId).mockReturnValue("abcdef0123456789");
    vi.mocked(generatePin).mockReturnValue("1234");
    vi.mocked(authenticatePin).mockResolvedValue("session-1");
    vi.mocked(verifyPin).mockResolvedValue();
    vi.mocked(createPin).mockResolvedValue();
  });

  afterEach(() => {
    process.env.GET_CREDENTIAL_SECRET = ORIGINAL_SECRET;
  });

  it("returns 401 for unauthenticated users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(undefined);

    const res = await POST(postRequest({ validatedInput: "token-abc" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when validatedInput is missing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as unknown as never);

    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("links account on valid input", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as unknown as never);
    vi.mocked(retrieveAccounts).mockResolvedValue([
      { id: "acc-1", accountDisplayName: "Slug Points", balance: 10 },
    ] as unknown as never);
    vi.mocked(prisma.getCredential.upsert).mockResolvedValue({} as unknown as never);

    const res = await POST(
      postRequest({ validatedInput: "https://x.test/cb?sessionId=123e4567-e89b-12d3-a456-426614174000" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.linked).toBe(true);
    expect(createPin).toHaveBeenCalled();
    expect(authenticatePin).toHaveBeenCalled();
    expect(verifyPin).toHaveBeenCalled();
    expect(prisma.getCredential.upsert).toHaveBeenCalled();
  });
});
