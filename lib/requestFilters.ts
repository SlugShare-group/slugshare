/**
 * Functions for filtering requests on the requests page. These were
 * taken from the page component so they can be
 * Tested in isolation (see __tests__/requestFilters.test.ts)
 * Reused elsewhere if needed
 */

export interface FilterableRequest {
  id: string;
  requesterId: string;
  location: string;
  pointsRequested: number;
  status: string;
}

/**
 * Filters requests by selected locations.
 * If selectedLocations is empty (size 0) then show ALL requests (no filter)
 * If locations are selected, we only include requests whose location is in the set
 *
 * @param requests - The list of requests to filter
 * @param selectedLocations - Set of location names the user chose in the filter dropdown
 * @returns Filtered array (same type as input, preserves extra fields via generic T)
 */
export function filterByLocation<T extends FilterableRequest>(
  requests: T[],
  selectedLocations: Set<string>
): T[] {
  if (selectedLocations.size === 0) return requests;
  return requests.filter((req) => selectedLocations.has(req.location));
}

/**
 * Parse the "max donation" input string from the filter into a number.
 * Empty string returns null
 * Valid number like "50" returns 50
 * Invalid like "abc" or "-5" returns null which is treated as no limit
 * 
 * maxDonation is string from the input field
 * returns The parsed number, or null if invalid/empty
 */
export function parseMaxDonation(maxDonation: string): number | null {
  if (maxDonation === "") return null;
  const num = parseInt(maxDonation, 10);
  return !Number.isNaN(num) && num >= 0 ? num : null;
}

/**
 * requests is other users requests to filter
 * selectedLocations is locations to show and empty = all
 * maxDonation is max points user is willing to donate and empty or invalid is no limit)
 * returns filtered array of requests
 */
export function filterOtherRequests<T extends FilterableRequest>(
  requests: T[],
  selectedLocations: Set<string>,
  maxDonation: string
): T[] {
  // First filter by location
  const locationFiltered = filterByLocation(requests, selectedLocations);
  // Then apply max donation cap if set one
  const maxDonationNum = parseMaxDonation(maxDonation);
  if (maxDonationNum === null) return locationFiltered;
  return locationFiltered.filter(
    (req) => req.pointsRequested <= maxDonationNum
  );
}
