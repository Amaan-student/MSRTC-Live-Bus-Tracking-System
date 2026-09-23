/**
 * BusSaathi - MSRTC Smart Transport Management System
 * File: /shared/msrtc-data.js
 * 
 * Purpose:
 * Central repository for Maharashtra geographic coordinates, standard MSRTC
 * bus categories, sample routes, and initial seed dataset.
 * 
 * Why this is structured this way for Avishkar:
 * 1. OSRM and Leaflet require accurate [lat, lon] coordinates to compute road geometries.
 * 2. MSRTC has distinct bus services (Lal Pari, Shivshahi, Shivneri, e-Shivai), each
 *    serving different passenger demographics and fare tiers.
 * 3. Pre-defining this ensures the application can run in standalone/demo mode
 *    as well as initialize Firebase with authentic Maharashtra transit data.
 */

// Major Maharashtra Bus Stands & City Centers with precise Coordinates [latitude, longitude]
export const MAHARASHTRA_CITIES = {
  "Pune (Swargate/Shivajinagar)": { lat: 18.5314, lon: 73.8446, shortName: "Pune" },
  "Mumbai (Dadar Asiad Stand)": { lat: 19.0178, lon: 72.8478, shortName: "Mumbai" },
  "Chhatrapati Sambhajinagar (Aurangabad CBS)": { lat: 19.8762, lon: 75.3433, shortName: "Chh. Sambhajinagar" },
  "Nashik (CBS)": { lat: 19.9975, lon: 73.7898, shortName: "Nashik" },
  "Kolhapur (CBS)": { lat: 16.7050, lon: 74.2433, shortName: "Kolhapur" },
  "Solapur (CBS)": { lat: 17.6599, lon: 75.9064, shortName: "Solapur" },
  "Satara (ST Stand)": { lat: 17.6805, lon: 73.9926, shortName: "Satara" },
  "Sangli (CBS)": { lat: 16.8524, lon: 74.5815, shortName: "Sangli" },
  "Nanded (CBS)": { lat: 19.1383, lon: 77.3210, shortName: "Nanded" },
  "Parbhani (ST Stand)": { lat: 19.2612, lon: 76.7766, shortName: "Parbhani" },
  "Nagpur (Ganeshpeth CBS)": { lat: 21.1458, lon: 79.0882, shortName: "Nagpur" },
  "Amravati (CBS)": { lat: 20.9374, lon: 77.7796, shortName: "Amravati" },
  "Ratnagiri (ST Stand)": { lat: 16.9902, lon: 73.3120, shortName: "Ratnagiri" },
  "Beed (ST Stand)": { lat: 18.9891, lon: 75.7601, shortName: "Beed" },
  "Jalgaon (CBS)": { lat: 21.0077, lon: 75.5626, shortName: "Jalgaon" }
};

// Official MSRTC Bus Services and Color Brand Schemes
export const BUS_TYPES = {
  "Lal Pari": {
    name: "Lal Pari (Ordinary)",
    marathi: "लाल परी (साधी बस)",
    tagClass: "type-lal-pari",
    badgeColor: "#C0392B",
    textColor: "#ffffff",
    description: "Maharashtra's iconic red state transport bus connecting rural and urban centers."
  },
  "Shivshahi": {
    name: "Shivshahi (AC Seater)",
    marathi: "शिवशाही (वातानुकूलित)",
    tagClass: "type-shivshahi",
    badgeColor: "#8E44AD",
    textColor: "#ffffff",
    description: "Comfortable air-conditioned intercity bus with push-back luxury seats."
  },
  "Shivneri": {
    name: "Shivneri (Volvo/Scania)",
    marathi: "शिवनेरी (व्होल्वो एक्सप्रेस)",
    tagClass: "type-shivneri",
    badgeColor: "#2980B9",
    textColor: "#ffffff",
    description: "Premium expressway AC coach operating high-density corridors like Pune-Mumbai."
  },
  "e-Shivai": {
    name: "e-Shivai (Electric AC)",
    marathi: "ई-शिवाई (इलेक्ट्रिक बस)",
    tagClass: "type-eshivai",
    badgeColor: "#27AE60",
    textColor: "#ffffff",
    description: "100% eco-friendly zero-emission electric bus for sustainable public transit."
  }
};

// Initial Seed Dataset for BusSaathi
// This powers both the 1-click Firebase seeding and the fallback offline demo mode
export const SEED_BUSES = {
  "MH20-BL-4040": {
    number: "MH 20 BL 4040",
    type: "Shivshahi",
    from: "Pune (Swargate/Shivajinagar)",
    to: "Chhatrapati Sambhajinagar (Aurangabad CBS)",
    departureTime: "07:30 AM",
    duration: "5h 15m",
    conductorId: "COND_101",
    status: "running",
    currentLocation: {
      lat: 18.8950,
      lon: 74.3450,
      speed: 54,
      heading: 65,
      timestamp: Date.now() - 30000
    }
  },
  "MH12-RN-8812": {
    number: "MH 12 RN 8812",
    type: "Shivneri",
    from: "Pune (Swargate/Shivajinagar)",
    to: "Mumbai (Dadar Asiad Stand)",
    departureTime: "08:15 AM",
    duration: "3h 45m",
    conductorId: "COND_102",
    status: "running",
    currentLocation: {
      lat: 18.7557,
      lon: 73.4091,
      speed: 68,
      heading: 310,
      timestamp: Date.now() - 15000
    }
  },
  "MH14-BT-1947": {
    number: "MH 14 BT 1947",
    type: "Lal Pari",
    from: "Pune (Swargate/Shivajinagar)",
    to: "Satara (ST Stand)",
    departureTime: "09:00 AM",
    duration: "2h 30m",
    conductorId: "COND_103",
    status: "idle",
    currentLocation: {
      lat: 18.5314,
      lon: 73.8446,
      speed: 0,
      heading: 0,
      timestamp: Date.now() - 120000
    }
  },
  "MH15-AK-3301": {
    number: "MH 15 AK 3301",
    type: "e-Shivai",
    from: "Nashik (CBS)",
    to: "Pune (Swargate/Shivajinagar)",
    departureTime: "06:45 AM",
    duration: "4h 30m",
    conductorId: "COND_104",
    status: "running",
    currentLocation: {
      lat: 19.4500,
      lon: 73.9100,
      speed: 52,
      heading: 185,
      timestamp: Date.now() - 45000
    }
  },
  "MH09-EM-5511": {
    number: "MH 09 EM 5511",
    type: "Lal Pari",
    from: "Kolhapur (CBS)",
    to: "Sangli (CBS)",
    departureTime: "10:30 AM",
    duration: "1h 15m",
    conductorId: "COND_105",
    status: "idle",
    currentLocation: {
      lat: 16.7050,
      lon: 74.2433,
      speed: 0,
      heading: 0,
      timestamp: Date.now() - 300000
    }
  },
  "MH31-FC-9002": {
    number: "MH 31 FC 9002",
    type: "Shivshahi",
    from: "Nagpur (Ganeshpeth CBS)",
    to: "Amravati (CBS)",
    departureTime: "01:00 PM",
    duration: "3h 10m",
    conductorId: "COND_106",
    status: "maintenance",
    currentLocation: {
      lat: 21.1458,
      lon: 79.0882,
      speed: 0,
      heading: 0,
      timestamp: Date.now() - 720000
    }
  }
};

export const SEED_CONDUCTORS = {
  "COND_101": {
    name: "Ramesh Jadhav",
    loginEmail: "conductor1@msrtc.in",
    assignedBusId: "MH20-BL-4040",
    depot: "Shivajinagar Depot, Pune",
    badgeNo: "MSRTC-C-45812"
  },
  "COND_102": {
    name: "Suresh Chavan",
    loginEmail: "conductor2@msrtc.in",
    assignedBusId: "MH12-RN-8812",
    depot: "Swargate Depot, Pune",
    badgeNo: "MSRTC-C-33901"
  },
  "COND_103": {
    name: "Prakash Shinde",
    loginEmail: "conductor3@msrtc.in",
    assignedBusId: "MH14-BT-1947",
    depot: "Pimpri Chinchwad Depot",
    badgeNo: "MSRTC-C-19455"
  },
  "COND_104": {
    name: "Ganesh Kulkarni",
    loginEmail: "conductor4@msrtc.in",
    assignedBusId: "MH15-AK-3301",
    depot: "Nashik CBS Depot",
    badgeNo: "MSRTC-C-52190"
  }
};

export const SEED_CONTROLLERS = {
  "CTRL_001": {
    name: "S. K. Patil (Depot Traffic Controller)",
    loginEmail: "controller@msrtc.in",
    depot: "Central Control Room, Shivajinagar, Pune",
    role: "admin"
  }
};

export const SEED_REPORTS = {
  "REP_101": {
    busId: "MH31-FC-9002",
    issue: "Clutch wire tension issue diagnosed during pre-trip inspection at Nagpur depot. Under repair by mechanical team.",
    status: "open",
    timestamp: Date.now() - 3600000 * 2,
    reportedBy: "D. M. Wankhede"
  },
  "REP_102": {
    busId: "MH20-BL-4040",
    issue: "AC cooling reduced due to dirty cabin filter near Shikrapur. Cleaned at roadside halt.",
    status: "resolved",
    timestamp: Date.now() - 3600000 * 6,
    reportedBy: "Ramesh Jadhav"
  }
};

export const SEED_REVENUE = {
  "REV_101": {
    busId: "MH12-RN-8812",
    conductorId: "COND_102",
    date: "2026-09-22",
    tickets: 44,
    amount: 22000,
    timestamp: Date.now() - 3600000 * 4
  },
  "REV_102": {
    busId: "MH20-BL-4040",
    conductorId: "COND_101",
    date: "2026-09-22",
    tickets: 38,
    amount: 14440,
    timestamp: Date.now() - 3600000 * 3
  },
  "REV_103": {
    busId: "MH14-BT-1947",
    conductorId: "COND_103",
    date: "2026-09-21",
    tickets: 52,
    amount: 8320,
    timestamp: Date.now() - 86400000
  }
};
