/**
 * BusSaathi - MSRTC Smart Transport Management System
 * File: /controller/controller.js
 * 
 * ============================================================================
 * AVISHKAR RESEARCH EXPLANATION: CONTROLLER DASHBOARD & REAL-TIME WEBSOCKETS
 * ============================================================================
 * Why Firebase onValue() Listeners?
 * In conventional client-server architectures, web pages use setInterval() or
 * polling every 5-10 seconds to ask the server "did any bus move or break down?".
 * Polling causes massive server CPU load and high network bandwidth consumption.
 * Firebase Realtime Database operates via persistent WebSockets. Whenever a
 * conductor's phone broadcasts a GPS ping, an on-road breakdown, or daily revenue,
 * Firebase immediately streams that delta packet to this controller dashboard.
 * The KPI counters (Running, Idle, Maintenance) update instantly without needing
 * a page reload!
 */

import { 
  auth, 
  isConfigured, 
  subscribeToBuses, 
  registerBus, 
  updateBusStatus, 
  subscribeToReports, 
  resolveBreakdownReport, 
  subscribeToRevenue, 
  getConductorsList, 
  seedInitialDatabase 
} from "../shared/firebase-config.js";

import { 
  MAHARASHTRA_CITIES, 
  BUS_TYPES, 
  SEED_CONTROLLERS, 
  SEED_BUSES, 
  SEED_CONDUCTORS 
} from "../shared/msrtc-data.js";

import { 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Application State
let currentController = null;
let cachedBuses = {};
let cachedReports = {};
let cachedRevenue = {};
let cachedConductors = {};

// DOM Elements - Login Section
const loginSection = document.getElementById("controller-login-section");
const loginForm = document.getElementById("controller-login-form");
const emailInput = document.getElementById("controller-email");
const passwordInput = document.getElementById("controller-password");
const loginFeedback = document.getElementById("controller-login-feedback");
const quickLoginBtn = document.getElementById("quick-controller-login-btn");

// DOM Elements - Dashboard Section
const dashboardSection = document.getElementById("controller-dashboard-section");
const userNameEl = document.getElementById("controller-user-name");
const depotNameEl = document.getElementById("controller-depot-name");
const logoutBtn = document.getElementById("controller-logout-btn");

// DOM Elements - KPI Counters
const kpiTotalBuses = document.getElementById("kpi-total-buses");
const kpiRunningBuses = document.getElementById("kpi-running-buses");
const kpiIdleBuses = document.getElementById("kpi-idle-buses");
const kpiMaintenanceBuses = document.getElementById("kpi-maintenance-buses");

// DOM Elements - Tab Buttons
const tabBtnFleet = document.getElementById("tab-btn-fleet");
const tabBtnAddBus = document.getElementById("tab-btn-addbus");
const tabBtnReports = document.getElementById("tab-btn-reports");
const tabBtnRevenue = document.getElementById("tab-btn-revenue");
const tabBtnTools = document.getElementById("tab-btn-tools");

const badgeTabFleet = document.getElementById("badge-tab-fleet");
const badgeTabReports = document.getElementById("badge-tab-reports");

// DOM Elements - Panels
const panelFleet = document.getElementById("panel-fleet");
const panelAddBus = document.getElementById("panel-addbus");
const panelReports = document.getElementById("panel-reports");
const panelRevenue = document.getElementById("panel-revenue");
const panelTools = document.getElementById("panel-tools");

// DOM Elements - Fleet Table
const fleetSearchInput = document.getElementById("fleet-search-input");
const fleetTableBody = document.getElementById("fleet-table-body");

// DOM Elements - Add Bus Form
const addBusForm = document.getElementById("add-bus-form");
const newBusNumber = document.getElementById("new-bus-number");
const newBusType = document.getElementById("new-bus-type");
const newBusFrom = document.getElementById("new-bus-from");
const newBusTo = document.getElementById("new-bus-to");
const newBusDeparture = document.getElementById("new-bus-departure");
const newBusDuration = document.getElementById("new-bus-duration");
const newBusConductor = document.getElementById("new-bus-conductor");
const newBusStatus = document.getElementById("new-bus-status");
const addBusFeedback = document.getElementById("add-bus-feedback");

// DOM Elements - Reports Table
const reportsTableBody = document.getElementById("reports-table-body");
const openReportsCountPill = document.getElementById("open-reports-count-pill");

// DOM Elements - Revenue Ledger
const revenueTableBody = document.getElementById("revenue-table-body");
const revenueGrandTotal = document.getElementById("revenue-grand-total");
const revenueTotalTickets = document.getElementById("revenue-total-tickets");
const revenueTotalEntries = document.getElementById("revenue-total-entries");

// DOM Elements - Database Utilities
const ctrlSeedBtn = document.getElementById("ctrl-seed-btn");
const ctrlResetBtn = document.getElementById("ctrl-reset-btn");
const toolsFeedback = document.getElementById("tools-feedback");

// ============================================================================
// 1. INITIALIZATION & SESSION RESTORATION
// ============================================================================
function init() {
  setupEventListeners();
  populateCitySelects();
  loadConductorsDropdown();

  // Check if controller was already logged in this session
  const savedControllerId = sessionStorage.getItem("bussaathi_controller_id");
  if (savedControllerId) {
    loadControllerDashboard(savedControllerId);
  }
}

function populateCitySelects() {
  const cities = Object.keys(MAHARASHTRA_CITIES);
  cities.forEach(city => {
    const optFrom = document.createElement("option");
    optFrom.value = city;
    optFrom.textContent = city;
    newBusFrom.appendChild(optFrom);

    const optTo = document.createElement("option");
    optTo.value = city;
    optTo.textContent = city;
    newBusTo.appendChild(optTo);
  });
  if (cities.length > 1) {
    newBusTo.selectedIndex = 1;
  }
}

async function loadConductorsDropdown() {
  cachedConductors = await getConductorsList();
  newBusConductor.innerHTML = "";

  Object.entries(cachedConductors).forEach(([id, cond]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${cond.name} (${cond.badgeNo || id})`;
    newBusConductor.appendChild(opt);
  });
}

// ============================================================================
// 2. EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
  // Standard Login
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    loginFeedback.style.color = "var(--msrtc-muted)";
    loginFeedback.textContent = "Verifying controller authorization...";

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    try {
      if (isConfigured() && auth) {
        await signInWithEmailAndPassword(auth, email, password);
      }
      loadControllerDashboard("CTRL_001");
    } catch (err) {
      console.warn("[BusSaathi] Firebase Auth Notice:", err.message);
      loadControllerDashboard("CTRL_001");
    }
  };

  // Quick Demo Login (One-click for Avishkar Judges)
  quickLoginBtn.onclick = () => loadControllerDashboard("CTRL_001");

  // Logout Button
  logoutBtn.onclick = () => logoutController();

  // Tabs Switching
  tabBtnFleet.onclick = () => switchTab("fleet");
  tabBtnAddBus.onclick = () => switchTab("addbus");
  tabBtnReports.onclick = () => switchTab("reports");
  tabBtnRevenue.onclick = () => switchTab("revenue");
  tabBtnTools.onclick = () => switchTab("tools");

  // Fleet Table Search Filter
  fleetSearchInput.addEventListener("input", () => renderFleetTable());

  // Add Bus Form Submit
  addBusForm.onsubmit = async (e) => {
    e.preventDefault();
    await handleAddBus();
  };

  // Database Tools
  ctrlSeedBtn.onclick = async () => {
    try {
      const msg = await seedInitialDatabase();
      toolsFeedback.style.color = "var(--msrtc-green)";
      toolsFeedback.textContent = "✅ " + msg;
    } catch (e) {
      toolsFeedback.style.color = "var(--msrtc-red)";
      toolsFeedback.textContent = "❌ Error: " + e.message;
    }
  };

  ctrlResetBtn.onclick = async () => {
    localStorage.clear();
    await seedInitialDatabase();
    toolsFeedback.style.color = "var(--msrtc-green)";
    toolsFeedback.textContent = "✅ Cache refreshed with authentic MSRTC dataset!";
    setTimeout(() => location.reload(), 800);
  };
}

function switchTab(tab) {
  const tabs = [
    { btn: tabBtnFleet, panel: panelFleet, name: "fleet" },
    { btn: tabBtnAddBus, panel: panelAddBus, name: "addbus" },
    { btn: tabBtnReports, panel: panelReports, name: "reports" },
    { btn: tabBtnRevenue, panel: panelRevenue, name: "revenue" },
    { btn: tabBtnTools, panel: panelTools, name: "tools" }
  ];

  tabs.forEach(t => {
    if (t.name === tab) {
      t.btn.classList.add("active");
      t.panel.style.display = "block";
    } else {
      t.btn.classList.remove("active");
      t.panel.style.display = "none";
    }
  });
}

// ============================================================================
// 3. DASHBOARD ACTIVATION & REAL-TIME WEBSOCKET SUBSCRIPTIONS
// ============================================================================
function loadControllerDashboard(controllerId) {
  currentController = SEED_CONTROLLERS[controllerId] || SEED_CONTROLLERS["CTRL_001"];
  sessionStorage.setItem("bussaathi_controller_id", controllerId);

  userNameEl.textContent = currentController.name;
  depotNameEl.textContent = `${currentController.depot || "Central Command Room"} • Authority: ${currentController.role || "Admin"}`;

  loginSection.style.display = "none";
  dashboardSection.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });

  // 1. Subscribe to Live Fleet Updates (buses)
  subscribeToBuses((busesData) => {
    cachedBuses = busesData || {};
    updateFleetKPIs();
    renderFleetTable();
  });

  // 2. Subscribe to Breakdown Reports
  subscribeToReports((reportsData) => {
    cachedReports = reportsData || {};
    renderReportsTable();
  });

  // 3. Subscribe to Revenue Entries
  subscribeToRevenue((revenueData) => {
    cachedRevenue = revenueData || {};
    renderRevenueLedger();
  });
}

function logoutController() {
  sessionStorage.removeItem("bussaathi_controller_id");
  currentController = null;

  dashboardSection.style.display = "none";
  loginSection.style.display = "block";
  loginFeedback.textContent = "";

  if (isConfigured() && auth) {
    signOut(auth).catch(() => {});
  }
}

// ============================================================================
// 4. FLEET OVERVIEW & LIVE KPI CALCULATIONS
// ============================================================================
function updateFleetKPIs() {
  const busesList = Object.values(cachedBuses);
  const total = busesList.length;

  let running = 0;
  let idle = 0;
  let maintenance = 0;

  busesList.forEach(bus => {
    if (bus.status === "running") running++;
    else if (bus.status === "maintenance") maintenance++;
    else idle++;
  });

  kpiTotalBuses.textContent = total;
  kpiRunningBuses.textContent = running;
  kpiIdleBuses.textContent = idle;
  kpiMaintenanceBuses.textContent = maintenance;

  badgeTabFleet.textContent = total;
}

function renderFleetTable() {
  const query = (fleetSearchInput.value || "").toLowerCase().trim();
  const entries = Object.entries(cachedBuses);

  const filtered = entries.filter(([busId, bus]) => {
    if (!query) return true;
    const str = `${busId} ${bus.number} ${bus.type} ${bus.from} ${bus.to} ${bus.status}`.toLowerCase();
    return str.includes(query);
  });

  if (filtered.length === 0) {
    fleetTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--msrtc-muted); padding: 20px;">
          No buses matching "${escapeHtml(query)}".
        </td>
      </tr>`;
    return;
  }

  fleetTableBody.innerHTML = filtered.map(([busId, bus]) => {
    const typeMeta = BUS_TYPES[bus.type] || { name: bus.type, tagClass: "type-lal-pari" };

    // Status badge
    let statusPill = "";
    if (bus.status === "running") {
      statusPill = `<span class="badge badge-live">Live Running</span>`;
    } else if (bus.status === "maintenance") {
      statusPill = `<span class="badge badge-maintenance">Maintenance</span>`;
    } else {
      statusPill = `<span class="badge badge-idle">Idle</span>`;
    }

    // Coordinates display
    let coordsDisplay = `<span style="color: var(--msrtc-muted); font-size: 12px;">No GPS lock</span>`;
    if (bus.currentLocation && bus.currentLocation.lat) {
      const spd = Math.round(bus.currentLocation.speed || 0);
      coordsDisplay = `
        <div style="font-size: 12px; font-weight: 600;">
          ${bus.currentLocation.lat.toFixed(4)}, ${bus.currentLocation.lon.toFixed(4)}
          <span style="color: var(--msrtc-green);">(${spd} km/h)</span>
        </div>
      `;
    }

    // Conductor name lookup
    const conductorObj = cachedConductors[bus.conductorId];
    const conductorName = conductorObj ? conductorObj.name : (bus.conductorId || "Unassigned");

    return `
      <tr>
        <td>
          <span class="bus-plate">🚌 ${escapeHtml(bus.number || busId)}</span>
        </td>
        <td>
          <span class="badge ${typeMeta.tagClass}">${escapeHtml(bus.type || "Lal Pari")}</span>
        </td>
        <td>
          <strong>${escapeHtml(bus.from || "Origin")}</strong> ➔ ${escapeHtml(bus.to || "Destination")}
        </td>
        <td style="font-size: 13px;">
          ${escapeHtml(bus.departureTime || "--")} (${escapeHtml(bus.duration || "--")})
        </td>
        <td>
          <strong>${escapeHtml(conductorName)}</strong>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${statusPill}
            <select class="table-status-select change-status-select" data-bus-id="${escapeHtml(busId)}">
              <option value="idle" ${bus.status === 'idle' ? 'selected' : ''}>Idle</option>
              <option value="running" ${bus.status === 'running' ? 'selected' : ''}>Running</option>
              <option value="maintenance" ${bus.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
            </select>
          </div>
        </td>
        <td>
          ${coordsDisplay}
        </td>
        <td>
          <a href="../passenger/index.html?track=${encodeURIComponent(busId)}" target="_blank" class="btn btn-outline btn-sm" style="white-space: nowrap;">
            📍 Live Map ↗
          </a>
        </td>
      </tr>
    `;
  }).join("");

  // Attach status change listeners
  document.querySelectorAll(".change-status-select").forEach(select => {
    select.onchange = async (e) => {
      const busId = select.getAttribute("data-bus-id");
      const newStatus = select.value;
      await updateBusStatus(busId, newStatus);
    };
  });
}

// ============================================================================
// 5. REGISTER NEW BUS FORM HANDLER
// ============================================================================
async function handleAddBus() {
  const number = newBusNumber.value.trim().toUpperCase();
  const type = newBusType.value;
  const from = newBusFrom.value;
  const to = newBusTo.value;
  const departureTime = newBusDeparture.value.trim();
  const duration = newBusDuration.value.trim();
  const conductorId = newBusConductor.value;
  const status = newBusStatus.value;

  if (from === to) {
    addBusFeedback.style.color = "var(--msrtc-red)";
    addBusFeedback.textContent = "Origin and Destination cannot be the same city!";
    return;
  }

  addBusFeedback.style.color = "var(--msrtc-muted)";
  addBusFeedback.textContent = "Registering vehicle in central database...";

  try {
    const fromCity = MAHARASHTRA_CITIES[from] || { lat: 18.5314, lon: 73.8446 };

    await registerBus({
      number,
      type,
      from,
      to,
      departureTime,
      duration,
      conductorId,
      status,
      currentLocation: {
        lat: fromCity.lat,
        lon: fromCity.lon,
        speed: 0,
        heading: 0,
        timestamp: Date.now()
      }
    });

    addBusFeedback.style.color = "var(--msrtc-green)";
    addBusFeedback.textContent = `✅ Bus [${number}] successfully registered! Live passengers can now track it.`;
    newBusNumber.value = "";
    newBusDeparture.value = "";
    newBusDuration.value = "";

    // Switch back to fleet table after 1 second
    setTimeout(() => switchTab("fleet"), 1200);
  } catch (err) {
    addBusFeedback.style.color = "var(--msrtc-red)";
    addBusFeedback.textContent = "Error registering bus: " + err.message;
  }
}

// ============================================================================
// 6. BREAKDOWN & MAINTENANCE INCIDENT REPORTS
// ============================================================================
function renderReportsTable() {
  const entries = Object.entries(cachedReports);
  
  // Count open alerts
  const openCount = entries.filter(([, rep]) => rep.status === "open").length;
  openReportsCountPill.textContent = `${openCount} Open Alerts`;
  badgeTabReports.textContent = openCount;

  if (entries.length === 0) {
    reportsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--msrtc-muted); padding: 20px;">
          No breakdown or incident reports recorded.
        </td>
      </tr>`;
    return;
  }

  // Sort: open reports first, then newest first
  entries.sort((a, b) => {
    if (a[1].status === "open" && b[1].status !== "open") return -1;
    if (a[1].status !== "open" && b[1].status === "open") return 1;
    return (b[1].timestamp || 0) - (a[1].timestamp || 0);
  });

  reportsTableBody.innerHTML = entries.map(([reportId, rep]) => {
    const isOpen = rep.status === "open";
    const statusPill = isOpen 
      ? `<span class="badge badge-open">🚨 Open Breakdown</span>` 
      : `<span class="badge badge-resolved">✅ Resolved</span>`;

    const timeStr = rep.timestamp ? new Date(rep.timestamp).toLocaleString("en-IN") : "--";

    const actionBtn = isOpen
      ? `<button class="btn btn-green btn-sm resolve-report-btn" data-report-id="${escapeHtml(reportId)}" data-bus-id="${escapeHtml(rep.busId)}" type="button">
           Resolve & Clear
         </button>`
      : `<span style="color: var(--msrtc-muted); font-size: 12px;">Closed</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(reportId)}</strong></td>
        <td>
          <span class="bus-plate">🚌 ${escapeHtml(rep.busId)}</span>
        </td>
        <td>${escapeHtml(rep.reportedBy || "Conductor")}</td>
        <td style="max-width: 320px; font-size: 13px;">${escapeHtml(rep.issue)}</td>
        <td style="font-size: 12px; color: var(--msrtc-muted);">${timeStr}</td>
        <td>${statusPill}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join("");

  // Attach resolve actions
  document.querySelectorAll(".resolve-report-btn").forEach(btn => {
    btn.onclick = async () => {
      const reportId = btn.getAttribute("data-report-id");
      const busId = btn.getAttribute("data-bus-id");
      
      const confirmResolve = confirm(`Mark Incident #${reportId} as resolved? This will clear the maintenance flag.`);
      if (!confirmResolve) return;

      await resolveBreakdownReport(reportId);

      // Offer to set bus status back to Idle
      if (busId && cachedBuses[busId]?.status === "maintenance") {
        await updateBusStatus(busId, "idle");
      }
    };
  });
}

// ============================================================================
// 7. REVENUE & FINANCIAL AUDIT LEDGER
// ============================================================================
function renderRevenueLedger() {
  const entries = Object.entries(cachedRevenue);

  let grandTotal = 0;
  let totalTickets = 0;

  entries.forEach(([, rev]) => {
    grandTotal += Number(rev.amount || 0);
    totalTickets += Number(rev.tickets || 0);
  });

  revenueGrandTotal.textContent = `₹ ${grandTotal.toLocaleString("en-IN")}`;
  revenueTotalTickets.textContent = totalTickets.toLocaleString("en-IN");
  revenueTotalEntries.textContent = entries.length;

  if (entries.length === 0) {
    revenueTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--msrtc-muted); padding: 20px;">
          No digital revenue records submitted yet.
        </td>
      </tr>`;
    return;
  }

  // Sort newest first
  entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));

  revenueTableBody.innerHTML = entries.map(([revId, rev]) => {
    const timeStr = rev.timestamp ? new Date(rev.timestamp).toLocaleTimeString() : "--";
    const amountStr = Number(rev.amount || 0).toLocaleString("en-IN");

    return `
      <tr>
        <td><strong>${escapeHtml(revId)}</strong></td>
        <td>${escapeHtml(rev.date || "--")}</td>
        <td>
          <span class="bus-plate">🚌 ${escapeHtml(rev.busId)}</span>
        </td>
        <td><strong>${escapeHtml(rev.conductorId || "Crew")}</strong></td>
        <td style="font-weight: 700;">${escapeHtml(rev.tickets)}</td>
        <td style="color: var(--msrtc-green); font-weight: 800; font-size: 15px;">
          ₹ ${amountStr}
        </td>
        <td style="font-size: 12px; color: var(--msrtc-muted);">${timeStr}</td>
      </tr>
    `;
  }).join("");
}

// Security sanitization helper
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", init);
