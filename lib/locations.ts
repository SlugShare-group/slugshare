export const DINING_HALL_PRICES = {
  slugPoints: { breakfast: 12.60, lunch: 13.65, dinner: 14.70, lateNight: 13.65 },
  
  // stretch goal: allow people to donate flexi dollars? or buy food for other people?
  flexi: { breakfast: 12.95, lunch: 14.00, dinner: 15.05, lateNight: 14.00 },
  credit: { breakfast: 14.55, lunch: 15.60, dinner: 16.65, lateNight: 15.60 }
} as const;

// stretch goal: add Perks items + their prices
// export const PERKS_PRICES = {
//   
// } as const;

export const UCSC_LOCATIONS_DATA = [
  {
    name: "Cowell/Stevenson", 
    category: "Dining Halls", 
    schedule: {
      mon: { open: "07:00", close: "23:00" }, 
      tues: { open: "07:00", close: "23:00" },
      wed: { open: "07:00", close: "23:00" },
      thurs: { open: "07:00", close: "23:00" },
      fri: { open: "07:00", close: "20:00" },
      sat: { open: "07:00", close: "20:00" },
      sun: { open: "07:00", close: "23:00" }
    },
    standardPricing: true,
  },
  { 
    name: "Crown/Merrill", 
    category: "Dining Halls", 
    schedule: {
      mon: { open: "07:00", close: "20:00" }, 
      tues: { open: "07:00", close: "20:00" },
      wed: { open: "07:00", close: "20:00" },
      thurs: { open: "07:00", close: "20:00" },
      fri: { open: "07:00", close: "20:00" },
      sat: null,
      sun: null
    },
    standardPricing: true,
  },
  { 
    name: "Porter/Kresge", 
    category: "Dining Halls", 
    schedule: {
      mon: { open: "07:00", close: "19:00" }, 
      tues: { open: "07:00", close: "19:00" },
      wed: { open: "07:00", close: "19:00" },
      thurs: { open: "07:00", close: "19:00" },
      fri: { open: "07:00", close: "19:00" },
      sat: null,
      sun: null
    },
    standardPricing: true
  },
  { 
    name: "Rachel Carson/Oakes", 
    category: "Dining Halls", 
    schedule: {
      mon: { open: "07:00", close: "23:00" }, 
      tues: { open: "07:00", close: "23:00" },
      wed: { open: "07:00", close: "23:00" },
      thurs: { open: "07:00", close: "23:00" },
      fri: { open: "07:00", close: "20:00" },
      sat: { open: "07:00", close: "20:00" },
      sun: { open: "07:00", close: "23:00" }
    },
    standardPricing: true
  },
  { 
    name: "College 9/John R. Lewis Dining Hall", 
    category: "Dining Halls", 
    schedule: {
      mon: { open: "07:00", close: "20:00" }, 
      tues: { open: "07:00", close: "23:00" },
      wed: { open: "07:00", close: "23:00" },
      thurs: { open: "07:00", close: "23:00" },
      fri: { open: "07:00", close: "23:00" },
      sat: { open: "07:00", close: "23:00" },
      sun: { open: "07:00", close: "20:00" }
    },
    standardPricing: true
  },

  { 
    name: "Merrill Market", 
    category: "Markets", 
    schedule: {
      mon: { open: "09:00", close: "20:00" }, 
      tues: { open: "09:00", close: "20:00" },
      wed: { open: "09:00", close: "20:00" },
      thurs: { open: "09:00", close: "20:00" },
      fri: { open: "09:00", close: "20:00" },
      sat: null,
      sun: null
    },
    standardPricing: false
  },
  { 
    name: "Porter Market", 
    category: "Markets", 
    schedule: {
      mon: { open: "07:00", close: "20:00" }, 
      tues: { open: "07:00", close: "20:00" },
      wed: { open: "07:00", close: "20:00" },
      thurs: { open: "07:00", close: "20:00" },
      fri: { open: "07:00", close: "20:00" },
      sat: null,
      sun: null
    },
    standardPricing: false
  },

  { 
    name: "Baskin Engineering", 
    category: "Perks Coffee Bar", 
    schedule: {
      mon: { open: "08:00", close: "18:00" }, 
      tues: { open: "08:00", close: "18:00" },
      wed: { open: "08:00", close: "18:00" },
      thurs: { open: "08:00", close: "18:00" },
      fri: { open: "08:00", close: "17:00" },
      sat: null,
      sun: null
    },
    standardPricing: false
  },
  { 
    name: "Earth and Marine",
    category: "Perks Coffee Bar",
    schedule: {
      mon: { open: "08:00", close: "18:00" },
      tues: { open: "08:00", close: "18:00" },
      wed: { open: "08:00", close: "18:00" },
      thurs: { open: "08:00", close: "18:00" },
      fri: { open: "08:00", close: "17:00" },
      sat: null,
      sun: null
    },
    standardPricing: false
  },
  { 
    name: "Physical Sciences", 
    category: "Perks Coffee Bar", 
    schedule: {
      mon: { open: "08:00", close: "17:00" }, 
      tues: { open: "08:00", close: "17:00" },
      wed: { open: "08:00", close: "17:00" },
      thurs: { open: "08:00", close: "17:00" },
      fri: { open: "08:00", close: "17:00" },
      sat: null,
      sun: null
    },
    standardPricing: false
  },

  { 
    name: "Banana Joe’s Late Night", 
    category: "Cafes and Restaurants", 
    schedule: {
      mon: { open: "20:00", close: "23:00" }, 
      tues: { open: "20:00", close: "23:00" }, 
      wed: { open: "20:00", close: "23:00" }, 
      thurs: { open: "20:00", close: "23:00" }, 
      fri: { open: "20:00", close: "23:00" }, 
      sat: null,
      sun: null
    },
    standardPricing: false
  },
  { 
    name: "Global Village Cafe", 
    category: "Cafes and Restaurants", 
    schedule: {
      mon: { open: "08:00", close: "20:00" }, 
      tues: { open: "08:00", close: "20:00" }, 
      wed: { open: "08:00", close: "20:00" }, 
      thurs: { open: "08:00", close: "20:00" }, 
      fri: { open: "08:00", close: "17:00" },
      sat: null,
      sun: null
    },
    standardPricing: false
  },
  { 
    name: "Oakes Cafe", 
    category: "Cafes and Restaurants", 
    schedule: {
      mon: { open: "08:00", close: "20:00" },  
      tues: { open: "08:00", close: "20:00" }, 
      wed: { open: "08:00", close: "20:00" }, 
      thurs: { open: "08:00", close: "20:00" }, 
      fri: { open: "08:00", close: "20:00" }, 
      sat: null,
      sun: null
    },
    standardPricing: false
  },
  { 
    name: "Stevenson Coffee House", 
    category: "Cafes and Restaurants", 
    schedule: {
      mon: { open: "08:00", close: "20:00" },  
      tues: { open: "08:00", close: "20:00" }, 
      wed: { open: "08:00", close: "20:00" }, 
      thurs: { open: "08:00", close: "20:00" }, 
      fri: { open: "08:00", close: "20:00" }, 
      sat: null,
      sun: null
    },
    standardPricing: false
  },
  { 
    name: "University Center Cafe", 
    category: "Cafes and Restaurants", 
    schedule: {
      mon: { open: "08:00", close: "17:00" }, 
      tues: { open: "08:00", close: "17:00" },
      wed: { open: "08:00", close: "17:00" },
      thurs: { open: "08:00", close: "17:00" },
      fri: { open: "08:00", close: "16:00" }, 
      sat: null,
      sun: null
    },
    standardPricing: false
  },
  { 
    name: "Owl’s Nest", 
    category: "Cafes and Restaurants", 
    schedule: {
      mon: { open: "08:00", close: "17:00" }, 
      tues: { open: "08:00", close: "17:00" },
      wed: { open: "08:00", close: "17:00" },
      thurs: { open: "08:00", close: "17:00" },
      fri: { open: "08:00", close: "17:00" },
      sat: null,
      sun: null
    },
    standardPricing: false
  },
  { 
    name: "University Center Bistro", 
    category: "Cafes and Restaurants", 
    schedule: {
      mon: { open: "11:30", close: "14:00" },
      tues: { open: "11:30", close: "14:00" },
      wed: { open: "11:30", close: "14:00" },
      thurs: { open: "11:30", close: "14:00" },
      fri: { open: "11:30", close: "14:00" },
      sat: null,
      sun: null
    },
    standardPricing: false
  },
] as const;