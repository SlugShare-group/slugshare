import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/requests/[id]/accept/route";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    request: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    points: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations)
    ),
  },
}));

function postRequest(body: Record<string, unknown>) {
  return new NextRequest("http://test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params(id = "request-1") {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

describe("POST /api/requests/[id]/accept", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.request.findUnique).mockReset();
    vi.mocked(prisma.request.update).mockReset();
    vi.mocked(prisma.points.upsert).mockReset();
    vi.mocked(prisma.points.update).mockReset();
    vi.mocked(prisma.notification.create).mockReset();
    vi.mocked(prisma.$transaction).mockReset();
    vi.mocked(prisma.$transaction).mockImplementation(
      async (operations: Array<Promise<unknown>>) => Promise.all(operations)
    );
  });

  it("blocks code mode when donor has not connected GET", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "donor-1" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      defaultFulfillmentMode: "CODE_ONLY",
      getCredential: null,
    } as never);

    const res = await POST(postRequest({ fulfillmentModeOverride: "CODE_ONLY" }), params());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Connect your GET account");
  });

  it("TRANSFER_ONLY keeps transfer behavior", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "donor-1", email: "donor@test" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      defaultFulfillmentMode: "CODE_ONLY",
      getCredential: null,
    } as never);
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: "request-1",
      requesterId: "requester-1",
      location: "C9",
      pointsRequested: 5,
      status: "pending",
      requester: { id: "requester-1" },
    } as never);
    vi.mocked(prisma.points.upsert)
      .mockResolvedValueOnce({ balance: 20 } as never)
      .mockResolvedValueOnce({ balance: 0 } as never);
    vi.mocked(prisma.points.update).mockResolvedValue({} as never);
    vi.mocked(prisma.request.update).mockResolvedValue({} as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const res = await POST(
      postRequest({ fulfillmentModeOverride: "TRANSFER_ONLY" }),
      params()
    );

    expect(res.status).toBe(200);
    expect(prisma.points.update).toHaveBeenCalledTimes(2);
    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fulfillmentMode: "TRANSFER_ONLY",
          codeIssuedAt: null,
          codeExpiresAt: null,
        }),
      })
    );
  });

  it("CODE_ONLY skips transfer and initializes code fields", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "donor-1", email: "donor@test" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      defaultFulfillmentMode: "CODE_ONLY",
      getCredential: { id: "gc-1" },
    } as never);
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: "request-1",
      requesterId: "requester-1",
      location: "C9",
      pointsRequested: 5,
      status: "pending",
      requester: { id: "requester-1" },
    } as never);
    vi.mocked(prisma.request.update).mockResolvedValue({} as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const res = await POST(postRequest({ fulfillmentModeOverride: "CODE_ONLY" }), params());

    expect(res.status).toBe(200);
    expect(prisma.points.update).not.toHaveBeenCalled();
    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fulfillmentMode: "CODE_ONLY",
          codeIssuedAt: expect.any(Date),
          codeExpiresAt: expect.any(Date),
        }),
      })
    );
  });
});
