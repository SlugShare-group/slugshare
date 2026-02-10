import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import ScanPageClient from "@/app/scan/[id]/scan-page-client";
import * as PDF417 from "pdf417-generator";

vi.mock("pdf417-generator", () => ({
  draw: vi.fn(),
}));

describe("ScanPageClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("polls and transitions from active to completed", async () => {
    const intervalCallbacks: Array<() => void> = [];
    vi.spyOn(global, "setInterval").mockImplementation((handler: TimerHandler) => {
      if (typeof handler === "function") {
        intervalCallbacks.push(handler as () => void);
      }
      return intervalCallbacks.length as unknown as NodeJS.Timeout;
    });
    vi.spyOn(global, "clearInterval").mockImplementation(() => {});

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            state: "active",
            payload: "payload-1",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            refreshMs: 5000,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            state: "completed",
            completedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    render(<ScanPageClient requestId="request-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Expires in/i)).toBeTruthy();
    });
    expect(PDF417.draw).toHaveBeenCalledWith(
      "payload-1",
      expect.any(HTMLCanvasElement),
      3
    );

    await act(async () => {
      intervalCallbacks[0]?.();
    });

    await waitFor(() => {
      expect(screen.getByText(/Request completed at/i)).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
