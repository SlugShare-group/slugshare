import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/requests/[id]/scan/route";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  authenticatePIN,
  retrievePatronBarcodePayload,
  retrieveTransactionsSince,
} from "@/lib/get-client";
import { decryptSecret } from "@/lib/crypto";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    request: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    getCredential: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/get-client", () => ({
  authenticatePIN: vi.fn(),
  retrievePatronBarcodePayload: vi.fn(),
  retrieveTransactionsSince: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  decryptSecret: vi.fn((value: string) => value.replace(/^enc:/, "")),
}));

function params(id = "request-1") {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

describe("GET /api/requests/[id]/scan", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(prisma.request.findUnique).mockReset();
    vi.mocked(prisma.request.update).mockReset();
    vi.mocked(prisma.getCredential.update).mockReset();
    vi.mocked(authenticatePIN).mockReset();
    vi.mocked(retrievePatronBarcodePayload).mockReset();
    vi.mocked(retrieveTransactionsSince).mockReset();
    vi.mocked(decryptSecret).mockClear();
  });

  it("rejects non-requester access", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-2" });
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: "request-1",
      requesterId: "user-1",
      status: "accepted",
    } as never);

    const res = await GET(new Request("http://test"), params());
    expect(res.status).toBe(403);
  });

  it("returns active payload state", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: "request-1",
      requesterId: "user-1",
      status: "accepted",
      fulfillmentMode: "CODE_ONLY",
      codeIssuedAt: new Date("2026-02-10T10:00:00.000Z"),
      codeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      donor: {
        id: "donor-1",
        getCredential: {
          userId: "donor-1",
          encryptedDeviceId: "enc:device-1",
          encryptedPin: "enc:1234",
        },
      },
    } as never);
    vi.mocked(authenticatePIN).mockResolvedValue("session-1");
    vi.mocked(retrievePatronBarcodePayload).mockResolvedValue("payload-abc");
    vi.mocked(retrieveTransactionsSince).mockResolvedValue([]);
    vi.mocked(prisma.getCredential.update).mockResolvedValue({} as never);

    const res = await GET(new Request("http://test"), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state).toBe("active");
    expect(data.payload).toBe("payload-abc");
    expect(data.refreshMs).toBe(10000);
  });

  it("auto-completes after first transaction record", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: "request-1",
      requesterId: "user-1",
      status: "accepted",
      fulfillmentMode: "CODE_ONLY",
      codeIssuedAt: new Date("2026-02-10T10:00:00.000Z"),
      codeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      donor: {
        id: "donor-1",
        getCredential: {
          userId: "donor-1",
          encryptedDeviceId: "enc:device-1",
          encryptedPin: "enc:1234",
        },
      },
    } as never);
    vi.mocked(authenticatePIN).mockResolvedValue("session-1");
    vi.mocked(retrievePatronBarcodePayload).mockResolvedValue("payload-abc");
    vi.mocked(retrieveTransactionsSince).mockResolvedValue([
      {
        transactionId: "tx-1",
        actualDate: new Date().toISOString(),
      },
    ]);
    vi.mocked(prisma.getCredential.update).mockResolvedValue({} as never);
    vi.mocked(prisma.request.update).mockResolvedValue({} as never);

    const res = await GET(new Request("http://test"), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state).toBe("completed");
    expect(prisma.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "completed",
          completionTrigger: "first_get_transaction",
        }),
      })
    );
  });
});
