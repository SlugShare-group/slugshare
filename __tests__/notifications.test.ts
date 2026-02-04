import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { GET, PATCH } from "@/app/api/notifications/route";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

function patchRequest(
  body: { notificationId?: string; read?: boolean }
): NextRequest {
  return new NextRequest("http://test", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET notifications", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it("rejects unauthenticated users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(undefined);
    const res = await GET();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns notifications for authenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});

describe("PATCH notifications", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(prisma.notification.update).mockReset();
  });

  it("rejects unauthenticated users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(undefined);
    const res = await PATCH(
      patchRequest({ notificationId: "n-1", read: true })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("rejects missing notificationId", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    const res = await PATCH(patchRequest({ read: true }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Notification ID is required" });
  });

  it("rejects non-string notificationId", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    const req = new NextRequest("http://test", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: 123, read: true }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Notification ID is required" });
  });

  it("returns updated notification on success", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" });
    const updated = {
      id: "n-1",
      userId: "user-1",
      type: "request_declined",
      message: "Someone declined your request.",
      read: true,
      createdAt: new Date("2026-02-02T19:06:58.478Z"),
      updatedAt: new Date("2026-02-02T19:07:00.000Z"),
    };
    vi.mocked(prisma.notification.update).mockResolvedValue(updated);
    const res = await PATCH(
      patchRequest({ notificationId: "n-1", read: true })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("n-1");
    expect(data.userId).toBe("user-1");
    expect(data.read).toBe(true);
  });
});