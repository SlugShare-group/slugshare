import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";


Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});


vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));


vi.mock("@/lib/locations", () => ({
  UCSC_LOCATIONS_DATA: [
    {
      name: "Dining Hall Alpha",
      category: "Dining Halls",
      standardPricing: true,
      schedule: { wed: { open: "11:00", close: "14:00" } },
    },
    {
      name: "Dining Hall Beta",
      category: "Dining Halls",
      standardPricing: true,
      schedule: { wed: { open: "17:00", close: "20:00" } },
    },
  ],
  DINING_HALL_PRICES: {
    slugPoints: { breakfast: 4, lunch: 6, dinner: 8, lateNight: 10 },
  },
}));


import CreateRequestPage from "@/app/requests/create/page";


describe("Create Request page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 18, 12, 0)); // Wed 12:00
  });


  afterEach(() => {
    vi.useRealTimers();
  });


  it("shows food locations + status, dining hall pricing + location required validation", async () => {
    render(<CreateRequestPage />);
    fireEvent.click(screen.getByRole("button", { name: /dining halls/i }));


    const alpha = await screen.findByText("Dining Hall Alpha");
    const beta = await screen.findByText("Dining Hall Beta");


    expect(alpha).toBeTruthy();
    expect(beta).toBeTruthy();
    expect(screen.getByText("Open until 14:00")).toBeTruthy();
    expect(screen.getByText("Currently Closed")).toBeTruthy();


    const betaButton = beta.closest("button") as HTMLButtonElement;
    expect(betaButton.disabled).toBe(true);


    fireEvent.click(alpha.closest("button")!);
    await waitFor(() => {
      expect(screen.queryByLabelText(/Points Requested/i)).not.toBeDefined();
    });


    fireEvent.click(screen.getByRole("button", { name: /create request/i }));
    expect(await screen.findByText("Location is required")).toBeTruthy();
  });
});
