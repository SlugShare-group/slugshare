/**
 * Tests the DELETE endpoint that runs when a user clicks "Delete" on
 * one of their pending requests. We're testing the API route directly—the
 * server-side code—not the button or UI.
 *
 * Import the actual DELETE function from the route file 
 * Then call it with mock data (no real database, no real auth)
 * Then check that it returns the correct HTTP status codes and JSON responses
 *
 * Mocking because we can avoid using the database and avoid using a logged in user
 *
 * Replace the auth and database modules with fake versions 
 * When the DELETE function calls getCurrentUser(), it gets whatever
 * we told the mock to return—not a real user from the session.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/requests/[id]/route";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * vi.mock() replaces the real module with a fake one for ALL tests in the file
 * and it runs before the test code. The second argument is a  factory function that
 * returns the fake module. vi.fn() creates a mock function that returns returns specific values.
 */
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    request: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

/**
 * describe() groups related tests together. The first argument is a
 * name that will show up in test output and the second is a function containing
 * all the tests for this group.
 */
describe("DELETE /api/requests/[id]", () => {
  // Shared test data—used across multiple tests
  const requestId = "req-123";
  const userId = "user-456";

  /**
   * beforeEach() runs before each test in the describe block
   * Every test starts with no leftover mock configs from prev tests
   */
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(prisma.request.findUnique).mockReset();
    vi.mocked(prisma.request.delete).mockReset();
  });

  /**
   * it() defines a single test. string describes what were testing. 
   * A test passes if no assertions fail and no errors are thrown.
   */
  it("rejects unauthenticated users", async () => {
    // When getCurrentUser is called, return undefined (no user)
    vi.mocked(getCurrentUser).mockResolvedValue(undefined);

    // now call DELETE handler and Next.js passes params
    const res = await DELETE(
      new Request("http://test"),
      { params: Promise.resolve({ id: requestId }) }
    );

    // Check the response, expect() is the assertion and it fails the test if the value doesnt match
    expect(res.status).toBe(401); // 401 = Unauthorized
    const data = await res.json();
    expect(data).toEqual({ error: "Unauthorized" });
    // make sure the the database isnt touched if user isnt logged in
    expect(prisma.request.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when request not found", async () => {
    // User is logged in, but the request ID doesn't exist in the database
    vi.mocked(getCurrentUser).mockResolvedValue({ id: userId });
    vi.mocked(prisma.request.findUnique).mockResolvedValue(null);

    const res = await DELETE(
      new Request("http://test"),
      { params: Promise.resolve({ id: requestId }) }
    );

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toEqual({ error: "Request not found" });
    // Should not attempt to delete something that doesntt exist
    expect(prisma.request.delete).not.toHaveBeenCalled();
  });

  it("returns 403 when trying to delete another user's request", async () => {
    // User is logged in but the request belongs to someone else so the requesterId differs
    vi.mocked(getCurrentUser).mockResolvedValue({ id: userId });
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: requestId,
      requesterId: "other-user",
      status: "pending",
    } as never);

    const res = await DELETE(
      new Request("http://test"),
      { params: Promise.resolve({ id: requestId }) }
    );

    expect(res.status).toBe(403); // 403 = Forbidden
    const data = await res.json();
    expect(data).toEqual({ error: "You can only delete your own requests" });
    expect(prisma.request.delete).not.toHaveBeenCalled();
  });

  it("returns 400 when trying to delete an already accepted request", async () => {
    // User owns the request but its already been accepted so cant delete it now
    vi.mocked(getCurrentUser).mockResolvedValue({ id: userId });
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: requestId,
      requesterId: userId,
      status: "accepted",
    } as never);

    const res = await DELETE(
      new Request("http://test"),
      { params: Promise.resolve({ id: requestId }) }
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "You can only delete pending requests" });
    expect(prisma.request.delete).not.toHaveBeenCalled();
  });

  it("returns 400 when trying to delete a declined request", async () => {
    // Same as above, declined requests also cant be deleted
    vi.mocked(getCurrentUser).mockResolvedValue({ id: userId });
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: requestId,
      requesterId: userId,
      status: "declined",
    } as never);

    const res = await DELETE(
      new Request("http://test"),
      { params: Promise.resolve({ id: requestId }) }
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "You can only delete pending requests" });
    expect(prisma.request.delete).not.toHaveBeenCalled();
  });

  it("deletes own pending request and returns success", async () => {
    // user owns the request and it is pending so delete should succeed
    vi.mocked(getCurrentUser).mockResolvedValue({ id: userId });
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: requestId,
      requesterId: userId,
      status: "pending",
    } as never);
    vi.mocked(prisma.request.delete).mockResolvedValue({} as never);

    const res = await DELETE(
      new Request("http://test"),
      { params: Promise.resolve({ id: requestId }) }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ success: true });
    // Verify we called delete with the correct argument
    expect(prisma.request.delete).toHaveBeenCalledWith({
      where: { id: requestId },
    });
  });
});
