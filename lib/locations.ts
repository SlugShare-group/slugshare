export type LocationData = typeof UCSC_LOCATIONS_DATA[number];
export type LocationCategory = LocationData['category'];
export type LocationSchedule = LocationData['schedule'];

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
    //Dining halls
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

  //Markets
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

  //Perks
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

  //cafes & restaurants
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

  //additional resources

  {    
    name: "Meal swipe request form",
    category: "Services",
    siteURL: "https://basicneeds.ucsc.edu/food-security/on-campus/", //redirect to this site where the form is
    description: "Short-term assistance is available to any currently enrolled degree-seeking student facing immediate food insecurity. Emergency assistance is available via the request form up to twice a year. If this program sounds right for your needs, please fill out the Swipes for Slugs request form.",
    schedule: {
      mon: null,
      tues: null,
      wed: null,
      thurs: null,
      fri: null,
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "Calfresh (SNAP)",
    category: "Services",
    siteURL: "https://basicneeds.ucsc.edu/food-security/calfresh/", //redirect to this site where the forms are
    description: "Eligible students can receive up to $291/month for groceries on an EBT card usable at Porter Market, Merill Market, Produce Pop-Up, Trader Joe’s, Safeway, Costco, and many farmers’ markets.",
    schedule: {
      mon: null,
      tues: null,
      wed: null,
      thurs: null,
      fri: null,
      sat: null,
      sun: null
    },
    standardPricing: false,
  },


  {    
    name: "Women's Center Cultural Pantry",
    category: "Food Pantries",
    siteURL: "https://womenscenter.ucsc.edu/resources/cardiff-services/",
    location: "Cardiff House",
    mapURL: "https://maps.app.goo.gl/BhdhYpobXhc78CGv8",
    description: "Our year-round FREE cultural food pantry is open for all! We are fully stocked with pasta, ramen, Japanese curry, rice, oatmeal, beans, soups, sauces, snacks, and so much more!",
    schedule: {
      mon: null,
      tues: { open: "10:00", close: "17:00" },
      wed: { open: "10:00", close: "17:00" },
      thurs: { open: "10:00", close: "17:00" },
      fri: { open: "10:00", close: "17:00" },
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "Redwood Free Market",
    category: "Food Pantries",
    siteURL: "https://www.instagram.com/redwoodfreemarket/",
    location: "Rachel Carson College Café (formerly College Eight Café)",
    mapURL: "https://maps.app.goo.gl/4tVPs22mfeccS3Tn6",
    description: "A self-serve pantry stocked with fresh produce, dry goods, hygiene items, and CalFresh information. Choice-based & no limits—take what you need!",
    schedule: {
      mon: [{ open: "14:00", close: "17:00" }],
      tues: [
        { open: "09:00", close: "13:00" }, 
        { open: "14:00", close: "17:00" }
      ],
      wed: [
        { open: "09:00", close: "13:00" },
        { open: "14:00", close: "17:00", note: "Grad Students Only" }
      ],
      thurs: [
        { open: "11:00", close: "13:00" },
        { open: "14:00", close: "17:00" }
      ],
      fri: [{ open: "09:00", close: "12:00" }],
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "Terry Freitas Commons",
    category: "Food Pantries",
    siteURL: "https://www.instagram.com/tfc_ucsc",
    location: "Terry Freitas Commons at John R. Lewis College",
    mapURL: "https://maps.app.goo.gl/TrQtvHMQydCHGwJ77",
    description: "A satellite location of Redwood Free Market, Terry Freitas Commons (TFC) provides free groceries and essentials to support food access for students on the east side of campus.",
    customNote: "Hours vary quarterly. Check Instagram for latest updates (ex: restocks).",
    schedule: {
      mon: null,
      tues: null,
      wed: null,
      thurs: null,
      fri: null,
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "Cowell Coffee Shop",
    category: "Food Pantries",
    siteURL: "https://linktr.ee/cowellcoffeeshop",
    location: "Near Cowell/Stevenson Dining Hall",
    mapURL: "https://maps.app.goo.gl/rWfzaLwwAG89bktD6",
    description: "A student-run, non-transactional café serving soups, curries, baked goods, and tea completely free with your UCSC student ID. Bring a reusable mug for hot drinks! Enjoy free coffee, salads, soups, bagels, baked goods, and other seasonal and culturally relevant dishes—available to all UCSC students.",
    schedule: {
      mon: { open: "10:00", close: "15:30" },
      tues: { open: "10:00", close: "15:30" },
      wed: { open: "10:00", close: "15:30" },
      thurs: { open: "10:00", close: "15:30" },
      fri: { open: "10:00", close: "15:30" },
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "Produce Pop-Up",
    category: "Services",
    siteURL: "https://www.instagram.com/ucscproducepopup",
    description: "Shop affordable, organic produce and flowers grown on the UCSC Farm. EBT accepted (EBT doubles up to $10 with Market Match!).",
    schedule: {
      mon: null,
      tues: null,
      wed: { 
        open: "11:00", close: "15:00", 
        displayLocation: "McHenry Library", 
        mapURL: "https://maps.app.goo.gl/iWNJnQvHRvvobfQb6" 
      },
      thurs: null,
      fri: { 
        open: "11:00", close: "15:00", 
        displayLocation: "Science & Engineering Library", 
        mapURL: "https://maps.app.goo.gl/jHstAgVpG39ZBRuq6" 
      },
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "Ethnic Resource Center’s Food Pantry",
    category: "Food Pantries",
    siteURL: "https://belong.ucsc.edu/resource-centers/",
    location: "Crown Provost House",
    mapURL: "https://maps.app.goo.gl/dHTPw9xBW4Rrczcm7",
    description: "Located at the Ethnic Resource Center, this pantry supports students with shelf-stable groceries and other food access resources.",
    schedule: {
      mon: { open: "10:00", close: "17:00" },
      tues: { open: "10:00", close: "17:00" },
      wed: { open: "10:00", close: "17:00" },
      thurs: { open: "10:00", close: "17:00" },
      fri: { open: "10:00", close: "17:00" },
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "Family Student Housing Pantry",
    category: "Food Pantries",
    siteURL: "https://belong.ucsc.edu/diverse-pathways/student-parents/",
    location: "In the Community Room (the building west of the Family Student Housing office).",
    mapURL: "https://maps.app.goo.gl/KZodQjbNjU5T2L7z5",
    description: "Located in the Family Student Housing community, this pantry offers free groceries and household essentials.",
    customNote: "Open every 1st and 3rd Wednesday of the month, 4:00 PM – 6:00 PM.",
    schedule: {
      mon: null,
      tues: null,
      wed: [{ open: "16:00", close: "18:00" }],
      thurs: null,
      fri: null,
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {
    name: "Lionel Cantu Queer Center Pantry",
    category: "Food Pantries",
    siteURL: "https://queer.ucsc.edu/resources/cantu-services/",
    location: "Cantú Cabin, behind Merrill and Crown Colleges",
    mapURL: "https://maps.app.goo.gl/8U4ffXqMiNeAjqWk7",
    description: "Hosted at the Cantú Queer Center, this pantry offers free grocery items and snacks to all UCSC students. (Accepts donations)",
    schedule: {
      mon: null,
      tues: null,
      wed: null,
      thurs: null,
      fri: null,
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "SlugCents Pantry",
    category: "Food Pantries",
    siteURL: "https://slugcents.ucsc.edu/free-stuff/",
    location: "Hahn Student Services, Room 203",
    mapURL: "https://maps.app.goo.gl/ajxgRSqAy8tYisCz7",
    description: "SlugCents is UCSC's official financial wellness program! Visit our office or make an appointment to get help with money questions & challenges.",
    schedule: {
      mon: { open: "13:00", close: "16:00" },
      tues: { open: "13:00", close: "16:00" },
      wed: { open: "13:00", close: "16:00" },
      thurs: { open: "13:00", close: "16:00" },
      fri: { open: "13:00", close: "16:00" },
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "engaging education Nutrition Lounge",
    category: "Food Pantries",
    siteURL: "https://engagingeducation.org/",
    location: "Redwood Building, across from Bay Tree Bookstore and above Bike Co-op",
    mapURL: "https://maps.app.goo.gl/zN2HVmEN4oBBLGjj9",
    description: "Visit the center for a quick snack, a space to study, and learn about our programs and other resources!",
    schedule: {
      mon: { open: "10:00", close: "17:00" },
      tues: { open: "10:00", close: "17:00" },
      wed: { open: "10:00", close: "17:00" },
      thurs: { open: "10:00", close: "17:00" },
      fri: { open: "10:00", close: "17:00" },
      sat: null,
      sun: null
    },
    standardPricing: false,
  },

  {    
    name: "STARRS Personal Care Pantry",
    category: "Food Pantries",
    siteURL: "https://belong.ucsc.edu/diverse-pathways/re-entry/",
    location: "Academic Resource Center 121",
    mapURL: "https://maps.app.goo.gl/HB2ddpbvxh7yDbCa9",
    description: "A welcoming space created with transfer and re-entry students in mind. All are welcome.",
    schedule: {
      mon: { open: "9:00", close: "17:00" },
      tues: { open: "9:00", close: "17:00" },
      wed: { open: "9:00", close: "17:00" },
      thurs: { open: "9:00", close: "17:00" },
      fri: { open: "9:00", close: "17:00" },
      sat: null,
      sun: null,
    },
    standardPricing: false,
  },

  {    
    name: "EOP Food Pantry",
    category: "Food Pantries",
    siteURL: "https://slugcents.ucsc.edu/free-stuff/",
    location: "121 Academic Resources Center",
    mapURL: "https://maps.app.goo.gl/5X1jtGrYgHHZctNu8",
    description: "Educational Opportunity Programs (EOP) at UC Santa Cruz provide dedicated support to first-generation, low-income, and educationally disadvantaged students.",
    schedule: {
      mon: { open: "9:00", close: "17:00" },
      tues: { open: "9:00", close: "17:00" },
      wed: { open: "9:00", close: "17:00" },
      thurs: { open: "9:00", close: "17:00" },
      fri: { open: "9:00", close: "17:00" },
      sat: null,
      sun: null,
    },
    standardPricing: false,
  },
  
] as const;