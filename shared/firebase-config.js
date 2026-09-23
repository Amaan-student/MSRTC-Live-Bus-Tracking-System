/**
 * BusSaathi - MSRTC Smart Transport Management System
 * File: /shared/firebase-config.js
 * 
 * ============================================================================
 * AVISHKAR RESEARCH PROJECT - BACKEND ARCHITECTURE
 * ============================================================================
 * Why Firebase Realtime Database (RTDB) is ideal for MSRTC Fleet Tracking:
 * 1. Low Latency WebSockets: Unlike traditional REST polling (which wastes cellular
 *    data and server requests every 5 seconds), RTDB maintains a persistent
 *    WebSocket connection. A GPS coordinate update is pushed instantly to all
 *    listening passenger maps with <100ms latency.
 * 2. Cost-Effectiveness: Operates within Firebase free Spark tier (up to 100 simultaneous
 *    connections and 1 GB stored), which costs ₹0 for prototype research and can scale.
 * 3. Offline Resilience & Demo Mode: If the internet drops during the Avishkar
 *    stage presentation or before you insert your personal API keys, this module
 *    seamlessly falls back to an interactive simulated state engine using LocalStorage.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getDatabase, ref, set, push, update, onValue, get, child, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { 
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
  SEED_BUSES, SEED_CONDUCTORS, SEED_CONTROLLERS, SEED_REPORTS, SEED_REVENUE 
} from "./msrtc-data.js";

// ============================================================================
// STEP 1: FIREBASE CONFIGURATION
// Replace the placeholder values below with your keys from Firebase Console:
// (Firebase Console > Project Settings > General > Your Apps > Web App Config)
// ============================================================================
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if actual configuration keys have been provided
export const isConfigured = () => {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith("YOUR_") &&
    !firebaseConfig.apiKey.startsWith("PASTE") &&
    firebaseConfig.databaseURL &&
    !firebaseConfig.databaseURL.includes("YOUR_PROJECT_ID")
  );
};

// Initialize Firebase SDK instances if configured
let app = null;
let db = null;
let auth = null;

if (isConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    console.log("[BusSaathi] Firebase Realtime Database & Auth initialized successfully.");
  } catch (err) {
    console.warn("[BusSaathi] Failed to initialize Firebase with current keys. Falling back to Demo Mode.", err);
  }
} else {
  console.info("[BusSaathi] Running in Avishkar Rehearsal / Offline Demo Mode. (Paste keys in /shared/firebase-config.js to activate live Firebase).");
}

export { app, db, auth };

// ============================================================================
// LOCAL STORAGE DEMO CACHE INITIALIZATION
// Ensures the demo app is never empty, even on first load without Firebase
// ============================================================================
const initDemoStorage = () => {
  if (!localStorage.getItem("bussaathi_buses")) {
    localStorage.setItem("bussaathi_buses", JSON.stringify(SEED_BUSES));
  }
  if (!localStorage.getItem("bussaathi_conductors")) {
    localStorage.setItem("bussaathi_conductors", JSON.stringify(SEED_CONDUCTORS));
  }
  if (!localStorage.getItem("bussaathi_reports")) {
    localStorage.setItem("bussaathi_reports", JSON.stringify(SEED_REPORTS));
  }
  if (!localStorage.getItem("bussaathi_revenue")) {
    localStorage.setItem("bussaathi_revenue", JSON.stringify(SEED_REVENUE));
  }
};
initDemoStorage();

// Helper to notify local listeners when LocalStorage updates in demo mode
const demoListeners = {
  buses: [],
  reports: [],
  revenue: []
};

const notifyDemoListeners = (channel, data) => {
  if (demoListeners[channel]) {
    demoListeners[channel].forEach(fn => fn(data));
  }
};

// ============================================================================
// UNIFIED DATA ACCESS HELPERS
// (Work automatically with either live Firebase or Demo Mode)
// ============================================================================

/**
 * Listen to all buses in real time.
 * In Firebase: Uses WebSocket onValue listener.
 * In Demo Mode: Emits cached buses and listens for local mutations.
 */
export const subscribeToBuses = (callback) => {
  if (db) {
    const busesRef = ref(db, "buses");
    const unsubscribe = onValue(busesRef, (snapshot) => {
      const data = snapshot.val() || {};
      callback(data);
    }, (error) => {
      console.error("[BusSaathi] Error reading buses from Firebase:", error);
    });
    return unsubscribe;
  } else {
    // Demo Mode listener
    const getLocal = () => JSON.parse(localStorage.getItem("bussaathi_buses") || "{}");
    callback(getLocal());
    demoListeners.buses.push(callback);
    return () => {
      demoListeners.buses = demoListeners.buses.filter(fn => fn !== callback);
    };
  }
};

/**
 * Listen to a single bus by its ID (e.g. "MH20-BL-4040")
 */
export const subscribeToBus = (busId, callback) => {
  const cleanId = busId.replace(/\s+/g, "-").toUpperCase();
  if (db) {
    const busRef = ref(db, `buses/${cleanId}`);
    return onValue(busRef, (snapshot) => {
      callback(snapshot.val());
    });
  } else {
    const checkBus = () => {
      const all = JSON.parse(localStorage.getItem("bussaathi_buses") || "{}");
      callback(all[cleanId] || null);
    };
    checkBus();
    const interval = setInterval(checkBus, 3000);
    return () => clearInterval(interval);
  }
};

/**
 * Update a bus's live GPS coordinates (called by conductor app every 15-20s)
 */
export const updateBusGPS = async (busId, { lat, lon, speed = 0, heading = 0, accuracy = 10 }) => {
  const cleanId = busId.replace(/\s+/g, "-").toUpperCase();
  const locationData = {
    lat: Number(lat),
    lon: Number(lon),
    speed: Number(speed),
    heading: Number(heading),
    accuracy: Number(accuracy),
    timestamp: Date.now()
  };

  if (db) {
    // Write directly to Firebase
    await update(ref(db, `buses/${cleanId}`), {
      currentLocation: locationData,
      status: "running"
    });
  } else {
    // Update LocalStorage cache
    const all = JSON.parse(localStorage.getItem("bussaathi_buses") || "{}");
    if (all[cleanId]) {
      all[cleanId].currentLocation = locationData;
      all[cleanId].status = "running";
      localStorage.setItem("bussaathi_buses", JSON.stringify(all));
      notifyDemoListeners("buses", all);
    }
  }
};

/**
 * Update bus operational status ("running", "idle", "maintenance")
 */
export const updateBusStatus = async (busId, status) => {
  const cleanId = busId.replace(/\s+/g, "-").toUpperCase();
  if (db) {
    await update(ref(db, `buses/${cleanId}`), { status });
  } else {
    const all = JSON.parse(localStorage.getItem("bussaathi_buses") || "{}");
    if (all[cleanId]) {
      all[cleanId].status = status;
      localStorage.setItem("bussaathi_buses", JSON.stringify(all));
      notifyDemoListeners("buses", all);
    }
  }
};

/**
 * Register a new bus (used in Controller Dashboard)
 */
export const registerBus = async (busData) => {
  const cleanId = busData.number.replace(/\s+/g, "-").toUpperCase();
  const record = {
    number: busData.number.toUpperCase(),
    type: busData.type,
    from: busData.from,
    to: busData.to,
    departureTime: busData.departureTime || "08:00 AM",
    duration: busData.duration || "4h 00m",
    conductorId: busData.conductorId || "UNASSIGNED",
    status: busData.status || "idle",
    currentLocation: busData.currentLocation || {
      lat: 18.5314,
      lon: 73.8446,
      speed: 0,
      heading: 0,
      timestamp: Date.now()
    }
  };

  if (db) {
    await set(ref(db, `buses/${cleanId}`), record);
  } else {
    const all = JSON.parse(localStorage.getItem("bussaathi_buses") || "{}");
    all[cleanId] = record;
    localStorage.setItem("bussaathi_buses", JSON.stringify(all));
    notifyDemoListeners("buses", all);
  }
  return cleanId;
};

/**
 * Breakdown Reports Management
 */
export const subscribeToReports = (callback) => {
  if (db) {
    const reportsRef = ref(db, "reports");
    return onValue(reportsRef, (snapshot) => {
      callback(snapshot.val() || {});
    });
  } else {
    const getLocal = () => JSON.parse(localStorage.getItem("bussaathi_reports") || "{}");
    callback(getLocal());
    demoListeners.reports.push(callback);
    return () => {
      demoListeners.reports = demoListeners.reports.filter(fn => fn !== callback);
    };
  }
};

export const submitBreakdownReport = async (reportData) => {
  const reportId = "REP_" + Date.now().toString(36).toUpperCase();
  const record = {
    busId: reportData.busId,
    issue: reportData.issue,
    status: "open",
    timestamp: Date.now(),
    reportedBy: reportData.reportedBy || "Conductor"
  };

  if (db) {
    await set(ref(db, `reports/${reportId}`), record);
  } else {
    const all = JSON.parse(localStorage.getItem("bussaathi_reports") || "{}");
    all[reportId] = record;
    localStorage.setItem("bussaathi_reports", JSON.stringify(all));
    notifyDemoListeners("reports", all);
  }
  return reportId;
};

export const resolveBreakdownReport = async (reportId) => {
  if (db) {
    await update(ref(db, `reports/${reportId}`), {
      status: "resolved",
      resolvedAt: Date.now()
    });
  } else {
    const all = JSON.parse(localStorage.getItem("bussaathi_reports") || "{}");
    if (all[reportId]) {
      all[reportId].status = "resolved";
      all[reportId].resolvedAt = Date.now();
      localStorage.setItem("bussaathi_reports", JSON.stringify(all));
      notifyDemoListeners("reports", all);
    }
  }
};

/**
 * Revenue Management
 */
export const subscribeToRevenue = (callback) => {
  if (db) {
    const revenueRef = ref(db, "revenue");
    return onValue(revenueRef, (snapshot) => {
      callback(snapshot.val() || {});
    });
  } else {
    const getLocal = () => JSON.parse(localStorage.getItem("bussaathi_revenue") || "{}");
    callback(getLocal());
    demoListeners.revenue.push(callback);
    return () => {
      demoListeners.revenue = demoListeners.revenue.filter(fn => fn !== callback);
    };
  }
};

export const submitDailyRevenue = async (revenueData) => {
  const revId = "REV_" + Date.now().toString(36).toUpperCase();
  const record = {
    busId: revenueData.busId,
    conductorId: revenueData.conductorId,
    date: revenueData.date || new Date().toISOString().split("T")[0],
    tickets: Number(revenueData.tickets),
    amount: Number(revenueData.amount),
    timestamp: Date.now()
  };

  if (db) {
    await set(ref(db, `revenue/${revId}`), record);
  } else {
    const all = JSON.parse(localStorage.getItem("bussaathi_revenue") || "{}");
    all[revId] = record;
    localStorage.setItem("bussaathi_revenue", JSON.stringify(all));
    notifyDemoListeners("revenue", all);
  }
  return revId;
};

/**
 * Conductors & Controllers Lookups
 */
export const getConductorsList = async () => {
  if (db) {
    const snap = await get(ref(db, "conductors"));
    if (snap.exists()) return snap.val();
  }
  return JSON.parse(localStorage.getItem("bussaathi_conductors") || JSON.stringify(SEED_CONDUCTORS));
};

/**
 * 1-Click Database Seeding Function
 * Seeds Firebase Realtime Database (or LocalStorage) with authentic MSRTC data
 */
export const seedInitialDatabase = async () => {
  if (db) {
    await set(ref(db, "buses"), SEED_BUSES);
    await set(ref(db, "conductors"), SEED_CONDUCTORS);
    await set(ref(db, "controllers"), SEED_CONTROLLERS);
    await set(ref(db, "reports"), SEED_REPORTS);
    await set(ref(db, "revenue"), SEED_REVENUE);
    return "Firebase Realtime Database seeded with authentic MSRTC fleet data!";
  } else {
    localStorage.setItem("bussaathi_buses", JSON.stringify(SEED_BUSES));
    localStorage.setItem("bussaathi_conductors", JSON.stringify(SEED_CONDUCTORS));
    localStorage.setItem("bussaathi_reports", JSON.stringify(SEED_REPORTS));
    localStorage.setItem("bussaathi_revenue", JSON.stringify(SEED_REVENUE));
    notifyDemoListeners("buses", SEED_BUSES);
    notifyDemoListeners("reports", SEED_REPORTS);
    notifyDemoListeners("revenue", SEED_REVENUE);
    return "Local rehearsal memory re-seeded with authentic MSRTC fleet data!";
  }
};
