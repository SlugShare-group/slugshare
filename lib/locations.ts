export const UCSC_LOCATIONS = [
  "C9/C10 Dining Hall",
  "Oakes Cafe",
  "Cowell/Stevenson Dining Hall",
  "Crown/Merrill Dining Hall",
  "Porter/Kresge Dining Hall",
  "Other",
] as const;

export type Location = (typeof UCSC_LOCATIONS)[number];



export const UCSC_LOCATIONS_DATA = [
  { 
    name: "C9/JRL Dining Hall", 
    category: "Dining Halls", 
    prices: {
      slugPoints: { breakfast: 12.60, lunch: 13.65, dinner: 14.70, lateNight: 13.65 },
      
      credit: { breakfast: 14.55, lunch: 15.60, dinner: 16.65, lateNight: 15.60 }
    },
  },
] as const;