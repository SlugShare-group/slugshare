// Add ucsc quarter schedule dates here
// points reset every quarter
export interface Quarter {
  name: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}
// Add more dates as needed
export const QUARTERS: Quarter[] = [
  { name: "Winter 2026", start: "2026-01-05", end: "2026-03-20" },
  { name: "Spring 2026", start: "2026-03-30", end: "2026-06-11" },
  { name: "Summer 2026", start: "2026-06-22", end: "2026-08-28" },
];

function parseQuarterDate(dateStr: string): Date {
  // parse ymd by the "-"
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d); // month is 0-indexed
}


// return the quarter that contains the given date or null if no quarter contains it 
export function getQuarterForDate(date: Date): Quarter | null {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  for (const q of QUARTERS) {
    // convert YYYY-MM-DD string into date object for end and beggining of quarter
    const start = parseQuarterDate(q.start);
    const end = parseQuarterDate(q.end);
    // If date is within the quarter then return date q
    if (normalized >= start && normalized <= end) {
      return q;
    }
  }
  return null;
}


// return the current quarter if today is in one otherwise null
export function getCurrentQuarter(): Quarter | null {
  return getQuarterForDate(new Date());
}
// Check if the date falls within any quarter
export function isWithinQuarter(date: Date): boolean {
  return getQuarterForDate(date) !== null;
}


// return the number of days remaining in the quarter  
export function getDaysRemainingInQuarter(date: Date): number {
  // determines which quarter the date belongs to
  const quarter = getQuarterForDate(date);
  //if date not in quarter then there are no remaining days
  if (!quarter) return 0;

  //parse quarter end date
  const end = parseQuarterDate(quarter.end);
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = end.getTime() - normalized.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays + 1); // + 1 to include both start and end day
}
