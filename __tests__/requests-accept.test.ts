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
    getCredential: {
      findUnique: vi.fn(),
    },
    getFulfillment: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(async () => Promise.resolve()),
  },
}));

function postRequest(mode: "in_person" | "qr_code") {
  return new NextRequest("http://test/api/requests/req-1/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

const baseRequest = {
  id: "req-1",
  requesterId: "requester-1",
  donorId: null,
  location: "C9",
  pointsRequested: 10,
  status: "pending",
  inPersonAllowed: true,
  qrCodeAllowed: true,
  selectedFulfillmentMode: null,
  completedAt: null,
  completionReason: null,
  message: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  requester: {
    id: "requester-1",
    name: "Requester",
    email: "requester@test.com",
  },
};

describe("POST /api/requests/[id]/accept", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(prisma.request.findUnique).mockReset();
    vi.mocked(prisma.request.update).mockReset();
    vi.mocked(prisma.points.upsert).mockReset();
    vi.mocked(prisma.points.update).mockReset();
    vi.mocked(prisma.notification.create).mockReset();
    vi.mocked(prisma.getCredential.findUnique).mockReset();
    vi.mocked(prisma.getFulfillment.upsert).mockReset();
    vi.mocked(prisma.$transaction).mockReset();
    vi.mocked(prisma.$transaction).mockImplementation(async () => Promise.resolve());
  });

  it("returns 401 for unauthenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(undefined);

    const res = await POST(postRequest("in_person"), {
      params: Promise.resolve({ id: "req-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("completes in-person request immediately", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "donor-1", email: "d@test.com" });
    vi.mocked(prisma.request.findUnique).mockResolvedValue(baseRequest as unknown as never);
    vi.mocked(prisma.points.upsert)
      .mockResolvedValueOnce({ userId: "donor-1", balance: 100 } as unknown as never)
      .mockResolvedValueOnce({ userId: "requester-1", balance: 0 } as unknown as never);
    vi.mocked(prisma.points.update).mockResolvedValue({} as unknown as never);
    vi.mocked(prisma.request.update).mockResolvedValue({} as unknown as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as unknown as never);

    const res = await POST(postRequest("in_person"), {
      params: Promise.resolve({ id: "req-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "completed",
          selectedFulfillmentMode: "in_person",
          completionReason: "in_person_accept",
        }),
      })
    );
  });

  it("rejects qr accept when donor has not linked GET", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "donor-1", email: "d@test.com" });
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      ...baseRequest,
      inPersonAllowed: false,
      qrCodeAllowed: true,
    } as unknown as never);
    vi.mocked(prisma.getCredential.findUnique).mockResolvedValue(null);

    const res = await POST(postRequest("qr_code"), {
      params: Promise.resolve({ id: "req-1" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Link your GET account");
  });

  it("creates active fulfillment for qr mode", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "donor-1", email: "d@test.com" });
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      ...baseRequest,
      inPersonAllowed: false,
      qrCodeAllowed: true,
    } as unknown as never);
    vi.mocked(prisma.getCredential.findUnique).mockResolvedValue({
      userId: "donor-1",
      status: "linked",
    } as unknown as never);
    vi.mocked(prisma.request.update).mockResolvedValue({} as unknown as never);
    vi.mocked(prisma.getFulfillment.upsert).mockResolvedValue({} as unknown as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as unknown as never);

    const res = await POST(postRequest("qr_code"), {
      params: Promise.resolve({ id: "req-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "accepted",
          selectedFulfillmentMode: "qr_code",
        }),
      })
    );
    expect(prisma.getFulfillment.upsert).toHaveBeenCalled();
  });
});
