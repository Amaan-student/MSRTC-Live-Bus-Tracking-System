// ===========================================
// BusSaathi — Parbhani District & Taluka Route Data
// ===========================================
// Covers:
// Parbhani + all 9 talukas
// Nanded, Hingoli, Latur and Chh. Sambhajinagar
//
// Coordinates are approximate town-center coordinates.
// Distances, fares and durations are curated realistic estimates.
// They are NOT live MSRTC data.
// ===========================================

const cities = {
    "Parbhani": {
        lat: 19.2704,
        lon: 76.7767,
        rto: "MH-22"
    },

    "Jintur": {
        lat: 19.6167,
        lon: 76.6833,
        rto: "MH-22"
    },

    "Selu": {
        lat: 19.3667,
        lon: 76.4333,
        rto: "MH-22"
    },

    "Manwat": {
        lat: 19.2967,
        lon: 76.5000,
        rto: "MH-22"
    },

    "Sonpeth": {
        lat: 19.0333,
        lon: 76.5833,
        rto: "MH-22"
    },

    "Gangakhed": {
        lat: 18.9667,
        lon: 76.7667,
        rto: "MH-22"
    },

    "Palam": {
        lat: 19.0167,
        lon: 76.9833,
        rto: "MH-22"
    },

    "Purna": {
        lat: 19.1667,
        lon: 76.9333,
        rto: "MH-22"
    },

    "Pathri": {
        lat: 19.2667,
        lon: 76.4333,
        rto: "MH-22"
    },

    "Nanded": {
        lat: 19.1383,
        lon: 77.3210,
        rto: "MH-26"
    },

    "Hingoli": {
        lat: 19.7145,
        lon: 77.1449,
        rto: "MH-46"
    },

    "Latur": {
        lat: 18.4088,
        lon: 76.5604,
        rto: "MH-24"
    },

    "Chh. Sambhajinagar": {
        lat: 19.8762,
        lon: 75.3433,
        rto: "MH-20"
    }
};


// ===========================================
// Bus Data
// ===========================================
// Each bus contains:
// number, type, from, to, departure,
// duration, fare and distanceKm
// ===========================================

const buses = [

    // -----------------------------------------
    // Parbhani → Talukas
    // -----------------------------------------

    {
        number: "MH22 AA 1001",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Jintur",
        departure: "06:00 AM",
        duration: "1h 22m",
        fare: 90,
        distanceKm: 52
    },

    {
        number: "MH22 AA 1002",
        type: "Shivshahi",
        from: "Parbhani",
        to: "Jintur",
        departure: "02:30 PM",
        duration: "1h 10m",
        fare: 115,
        distanceKm: 52
    },

    {
        number: "MH22 AB 1003",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Selu",
        departure: "06:30 AM",
        duration: "1h 17m",
        fare: 85,
        distanceKm: 49
    },

    {
        number: "MH22 AB 1004",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Manwat",
        departure: "07:00 AM",
        duration: "1h 00m",
        fare: 65,
        distanceKm: 38
    },

    {
        number: "MH22 AC 1005",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Manwat",
        departure: "03:00 PM",
        duration: "1h 00m",
        fare: 65,
        distanceKm: 38
    },

    {
        number: "MH22 AC 1006",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Sonpeth",
        departure: "07:15 AM",
        duration: "1h 08m",
        fare: 75,
        distanceKm: 43
    },

    {
        number: "MH22 AD 1007",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Gangakhed",
        departure: "08:00 AM",
        duration: "1h 09m",
        fare: 75,
        distanceKm: 44
    },

    {
        number: "MH22 AD 1008",
        type: "Shivshahi",
        from: "Parbhani",
        to: "Gangakhed",
        departure: "04:00 PM",
        duration: "1h 00m",
        fare: 95,
        distanceKm: 44
    },

    {
        number: "MH22 AE 1009",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Palam",
        departure: "08:30 AM",
        duration: "1h 12m",
        fare: 80,
        distanceKm: 46
    },

    {
        number: "MH22 AE 1010",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Purna",
        departure: "09:00 AM",
        duration: "0h 43m",
        fare: 45,
        distanceKm: 27
    },

    {
        number: "MH22 AF 1011",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Purna",
        departure: "05:00 PM",
        duration: "0h 43m",
        fare: 45,
        distanceKm: 27
    },

    {
        number: "MH22 AF 1012",
        type: "Lal Pari",
        from: "Parbhani",
        to: "Pathri",
        departure: "09:30 AM",
        duration: "1h 14m",
        fare: 80,
        distanceKm: 47
    },


    // -----------------------------------------
    // Parbhani ↔ Other District Headquarters
    // -----------------------------------------

    {
        number: "MH22 BA 2001",
        type: "Shivshahi",
        from: "Parbhani",
        to: "Nanded",
        departure: "06:00 AM",
        duration: "2h 02m",
        fare: 130,
        distanceKm: 77
    },

    {
        number: "MH26 BA 2002",
        type: "Lal Pari",
        from: "Nanded",
        to: "Parbhani",
        departure: "07:30 AM",
        duration: "2h 10m",
        fare: 125,
        distanceKm: 77
    },

    {
        number: "MH22 BB 2003",
        type: "Shivshahi",
        from: "Parbhani",
        to: "Hingoli",
        departure: "07:00 AM",
        duration: "2h 09m",
        fare: 140,
        distanceKm: 82
    },

    {
        number: "MH46 BB 2004",
        type: "Lal Pari",
        from: "Hingoli",
        to: "Parbhani",
        departure: "08:00 AM",
        duration: "2h 15m",
        fare: 135,
        distanceKm: 82
    },

    {
        number: "MH22 BC 2005",
        type: "Shivneri",
        from: "Parbhani",
        to: "Latur",
        departure: "06:30 AM",
        duration: "3h 03m",
        fare: 280,
        distanceKm: 128
    },

    {
        number: "MH24 BC 2006",
        type: "Shivshahi",
        from: "Latur",
        to: "Parbhani",
        departure: "09:00 AM",
        duration: "3h 22m",
        fare: 220,
        distanceKm: 128
    },

    {
        number: "MH22 BD 2007",
        type: "Shivneri",
        from: "Parbhani",
        to: "Chh. Sambhajinagar",
        departure: "05:30 AM",
        duration: "5h 06m",
        fare: 470,
        distanceKm: 214
    },

    {
        number: "MH20 BD 2008",
        type: "Shivshahi",
        from: "Chh. Sambhajinagar",
        to: "Parbhani",
        departure: "10:00 AM",
        duration: "5h 38m",
        fare: 370,
        distanceKm: 214
    },


    // -----------------------------------------
    // Cross-Taluka Routes
    // -----------------------------------------

    {
        number: "MH22 CA 3001",
        type: "Lal Pari",
        from: "Jintur",
        to: "Selu",
        departure: "07:45 AM",
        duration: "1h 19m",
        fare: 85,
        distanceKm: 50
    },

    {
        number: "MH22 CB 3002",
        type: "Lal Pari",
        from: "Manwat",
        to: "Sonpeth",
        departure: "08:15 AM",
        duration: "1h 03m",
        fare: 70,
        distanceKm: 40
    },

    {
        number: "MH22 CC 3003",
        type: "Lal Pari",
        from: "Gangakhed",
        to: "Palam",
        departure: "09:45 AM",
        duration: "0h 47m",
        fare: 50,
        distanceKm: 30
    },

    {
        number: "MH26 CD 3004",
        type: "Shivshahi",
        from: "Purna",
        to: "Nanded",
        departure: "10:15 AM",
        duration: "1h 24m",
        fare: 90,
        distanceKm: 53
    },

    {
        number: "MH22 CE 3005",
        type: "Lal Pari",
        from: "Selu",
        to: "Pathri",
        departure: "11:00 AM",
        duration: "0h 22m",
        fare: 25,
        distanceKm: 14
    },

    {
        number: "MH46 CF 3006",
        type: "Lal Pari",
        from: "Hingoli",
        to: "Jintur",
        departure: "07:30 AM",
        duration: "1h 41m",
        fare: 110,
        distanceKm: 64
    }
];


// ===========================================
// Export
// ===========================================
// Works with CommonJS / Node.js
// ===========================================

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        cities,
        buses
    };
}