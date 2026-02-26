import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/get/connect/route";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { retrieveAccounts } from "@/lib/get/adapter";

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
    retrieveAccounts: vi.fn(),
  };
});

const ORIGINAL_KEY = process.env.GET_CREDENTIALS_ENCRYPTION_KEY;

function postRequest(body: unknown) {
  return new NextRequest("http://test/api/get/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/get/connect", () => {
  beforeEach(() => {
    process.env.GET_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(prisma.getCredential.upsert).mockReset();
    vi.mocked(retrieveAccounts).mockReset();
  });

  afterEach(() => {
    process.env.GET_CREDENTIALS_ENCRYPTION_KEY = ORIGINAL_KEY;
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

    const res = await POST(postRequest({ validatedInput: "session-token-123456" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.linked).toBe(true);
    expect(prisma.getCredential.upsert).toHaveBeenCalled();
  });
});
