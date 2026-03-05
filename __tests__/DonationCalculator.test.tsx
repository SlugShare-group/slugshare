/**
 * Test the DonationCalculator React component. Testing the UI and how it behaves
 * render() Renders the component into a fake DOM (jsdom)
 * screen - Queries the rendered output to find elements (by text, role, label)
 * fireEvent / userEvent - Simulate user actions (typing, clicking)
 * expect() ssserts that the right things appear or that state changed correctly
 *
 * - getByX: Finds one element, throws if not found, use this when you expect it to exist
 * - findByX: Same but async, waits for the element, use this after state updates/fetch
 * - queryByX: Returns null if not found, use this when checking something is absent
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DonationCalculator } from "@/components/DonationCalculator";
import * as quarters from "@/lib/quarters";

/**
 * Mock for recharts. The ResponsiveContainer measures the parents width and height
 * In jsdom there's no real layout, so it gets -1 and logs warnings. We replace
 * the chart components with simple pass-through or null to avoid that.
 */
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: unknown }) => children,
  LineChart: () => null,
  Line: () => null,
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

/**
 * Mock the quarters modulet for getCurrentQuarter and
 * getDaysRemainingInQuarter so tests dont depend on todays date
 */
vi.mock("@/lib/quarters", () => ({
  getCurrentQuarter: vi.fn(),
  getDaysRemainingInQuarter: vi.fn(),
  QUARTERS: [
    { name: "Winter 2026", start: "2026-01-05", end: "2026-03-20" },
    { name: "Spring 2026", start: "2026-03-30", end: "2026-06-11" },
  ],
}));

describe("DonationCalculator", () => {
  /**
   * beforeEach runs before each test so we can set up
   * a fake "current quarter" (Winter 2026, 21 days left)
   * and a mock for global.fetch so we control API responses
   */
  beforeEach(() => {
    vi.mocked(quarters.getCurrentQuarter).mockReturnValue({
      name: "Winter 2026",
      start: "2026-01-05",
      end: "2026-03-20",
    });
    vi.mocked(quarters.getDaysRemainingInQuarter).mockReturnValue(21);
    global.fetch = vi.fn();
  });

  it("renders the page title and description", async () => {
    // mockResolvedValueOnce: next call to fetch returns this; subsequent calls unaffected
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 100 }),
    } as Response);

    render(<DonationCalculator />);

    // findByDisplayValue waits for the balance to load (async) so we dont 
    //  get "act()" warnings because state updates happen after render
    await screen.findByDisplayValue("100");

    expect(
      screen.getByRole("heading", { name: /donation calculator/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/plan how many points you can donate/i)
    ).toBeInTheDocument();
  });

  it("shows loading state for balance initially", async () => {
    // A Promise that never resolves so fetch is "in progress" forever
    vi.mocked(fetch).mockImplementation(
      () => new Promise(() => {})
    );

    render(<DonationCalculator />);

    // Immediately check, should see "Loading..." before fetch completes
    const balanceInput = screen.getByLabelText(/current balance/i);
    expect(balanceInput).toHaveValue("Loading...");
  });

  it("displays balance when fetch succeeds", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 250 }),
    } as Response);

    render(<DonationCalculator />);

    // findBy waits for the element to appear because balance loads asynchronously
    const balanceInput = await screen.findByDisplayValue("250");
    expect(balanceInput).toBeInTheDocument();
  });

  it("shows error when balance fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to load balance" }),
    } as Response);

    render(<DonationCalculator />);

    expect(
      await screen.findByText(/failed to load balance/i)
    ).toBeInTheDocument();
  });

  it("shows not in quarter message when outside active quarter", async () => {
    // no current quarter so in between quarters
    vi.mocked(quarters.getCurrentQuarter).mockReturnValue(null);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 100 }),
    } as Response);

    render(<DonationCalculator />);

    expect(
      await screen.findByText(/not currently in a quarter/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/donation calculator is only available during an active/i)
    ).toBeInTheDocument();
  });

  it("displays quarter info when in active quarter", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 100 }),
    } as Response);

    render(<DonationCalculator />);

    expect(await screen.findByText(/winter 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/21 days remaining/)).toBeInTheDocument();
  });

  it("calculates and displays results when user enters average daily spending", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 300 }),
    } as Response);

    render(<DonationCalculator />);

    await screen.findByDisplayValue("300");

    // Simulate user typing "5" into the average daily spending input
    const avgSpendingInput = screen.getByLabelText(/average daily spending/i);
    fireEvent.change(avgSpendingInput, { target: { value: "5" } });

    // With balance 300, spending 5/day, 21 days: need 105 for self, can donate 195
    expect(await screen.findByText(/105/)).toBeInTheDocument();
    expect(screen.getByText(/195/)).toBeInTheDocument();
  });

  it("shows donation pace options when user can donate", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 300 }),
    } as Response);

    render(<DonationCalculator />);

    await screen.findByDisplayValue("300");
    const avgSpendingInput = screen.getByLabelText(/average daily spending/i);
    fireEvent.change(avgSpendingInput, { target: { value: "5" } });

    // Pace options only show when user has donatable points
    expect(
      await screen.findByRole("button", { name: /evenly over quarter/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /donate now/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /donate at end/i })).toBeInTheDocument();
  });
});
