/**
 * Tests the filter functions used on the requests page.
 * Unit tests so test logic in isolation so no
 * database, no network, no React components.
 * Give the unit inputs and check that the outputs are correct. 
 * 
 *
 * Set up the input data
 * Call the function
 * Check the output matches what we expect
 */

import { describe, it, expect } from "vitest";
import {
  filterByLocation,
  filterOtherRequests,
  parseMaxDonation,
} from "@/lib/requestFilters";

/**
 * Helper to create fake request objects.
 * Need objects that have (id, location, pointsRequested) that
 * our filter functions expect. 
 */
const mockRequest = (
  overrides: Partial<{
    id: string;
    requesterId: string;
    location: string;
    pointsRequested: number;
    status: string;
  }> = {}
) => ({
  id: "req-1",
  requesterId: "user-1",
  location: "Oakes Cafe",
  pointsRequested: 10,
  status: "pending",
  ...overrides,
});

describe("filterByLocation", () => {
  // 3 requests at different locations
  const requests = [
    mockRequest({ id: "1", location: "Oakes Cafe" }),
    mockRequest({ id: "2", location: "Cowell/Stevenson" }),
    mockRequest({ id: "3", location: "College 9/John R. Lewis Dining Hall" }),
  ];

  it("returns all requests when no locations selected", () => {
    // Empty Set = "show all" (no filter)
    const result = filterByLocation(requests, new Set());
    expect(result).toHaveLength(3);
    expect(result).toEqual(requests);
  });

  it("filters to only selected locations", () => {
    const selected = new Set(["Oakes Cafe", "Cowell/Stevenson"]);
    const result = filterByLocation(requests, selected);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.location)).toEqual([
      "Oakes Cafe",
      "Cowell/Stevenson",
    ]);
  });

  it("returns empty array when selected location has no matches", () => {
    // User selected "Merrill Market" but none of our test requests are there
    const result = filterByLocation(requests, new Set(["Merrill Market"]));
    expect(result).toHaveLength(0);
  });

  it("returns single match when one location selected", () => {
    const result = filterByLocation(requests, new Set(["Oakes Cafe"]));
    expect(result).toHaveLength(1);
    expect(result[0].location).toBe("Oakes Cafe");
  });
});

describe("parseMaxDonation", () => {
  /**
   * parseMaxDonation converts the users "max donation" input string to a number
   * It returns null for invalid or empty input which is "no limit" in the UI
   */

  it("returns null for empty string", () => {
    expect(parseMaxDonation("")).toBeNull();
  });

  it("parses valid positive number", () => {
    expect(parseMaxDonation("50")).toBe(50);
    expect(parseMaxDonation("0")).toBe(0);
  });

  it("returns null for invalid input", () => {
    expect(parseMaxDonation("abc")).toBeNull();
    expect(parseMaxDonation("nope")).toBeNull();
  });

  it("returns null for negative number", () => {
    expect(parseMaxDonation("-5")).toBeNull();
  });
});

describe("filterOtherRequests", () => {
  // 4 requests: different locations and point amounts
  const requests = [
    mockRequest({ id: "1", location: "Oakes Cafe", pointsRequested: 5 }),
    mockRequest({ id: "2", location: "Oakes Cafe", pointsRequested: 15 }),
    mockRequest({ id: "3", location: "Cowell/Stevenson", pointsRequested: 10 }),
    mockRequest({ id: "4", location: "Merrill Market", pointsRequested: 8 }),
  ];

  it("returns all requests when no filters applied", () => {
    const result = filterOtherRequests(requests, new Set(), "");
    expect(result).toHaveLength(4);
  });

  it("filters by location only when max donation empty", () => {
    const result = filterOtherRequests(
      requests,
      new Set(["Oakes Cafe"]),
      ""
    );
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.location === "Oakes Cafe")).toBe(true);
  });

  it("filters by max donation - excludes requests asking for more", () => {
    // Max 10: requests asking for 5, 8, 10 pass; 15 fails
    const result = filterOtherRequests(requests, new Set(), "10");
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.pointsRequested).sort((a, b) => a - b)).toEqual(
      [5, 8, 10]
    );
  });

  it("includes requests that exactly match max donation", () => {
    // Max 15: all 4 requests (5, 8, 10, 15) pass
    const result = filterOtherRequests(requests, new Set(), "15");
    expect(result).toHaveLength(4);
  });

  it("combines location and max donation filters", () => {
    // Oakes Cafe only: 5 and 15. Max 10: 5 passes, 15 fails so only 1 result
    const result = filterOtherRequests(
      requests,
      new Set(["Oakes Cafe"]),
      "10"
    );
    expect(result).toHaveLength(1);
    expect(result[0].pointsRequested).toBe(5);
  });

  it("returns empty when max donation is 0 and all requests ask for more", () => {
    const result = filterOtherRequests(requests, new Set(), "0");
    expect(result).toHaveLength(0);
  });

  it("handles invalid max donation as no limit", () => {
    // "abc" parses to nul, treat it as no limit and return all after location filter
    const result = filterOtherRequests(requests, new Set(), "abc");
    expect(result).toHaveLength(4);
  });
});
