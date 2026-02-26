import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/get/status/route";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    getCredential: {
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /api/get/status", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(prisma.getCredential.findUnique).mockReset();
  });

  it("returns 401 for unauthenticated users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(undefined);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns linked status for authenticated users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as unknown as never);
    vi.mocked(prisma.getCredential.findUnique).mockResolvedValue({
      userId: "user-1",
      status: "linked",
      deviceId: "abcdef0123456789",
      encryptedPin: "ciphertext",
      linkedAt: new Date("2026-02-01T00:00:00.000Z"),
      lastValidatedAt: new Date("2026-02-01T01:00:00.000Z"),
      invalidatedAt: null,
      lastErrorCode: null,
    } as unknown as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.linked).toBe(true);
    expect(data.status).toBe("linked");
    expect(data.model).toBe("pin_device");
    expect(data.deviceIdTail).toBe("6789");
  });
});
