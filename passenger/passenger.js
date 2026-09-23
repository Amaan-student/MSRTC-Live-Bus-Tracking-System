/**
 * BusSaathi - MSRTC Smart Transport Management System
 * File: /passenger/passenger.js
 * 
 * ============================================================================
 * AVISHKAR RESEARCH EXPLANATION: PASSENGER TRACKING & MAPPING
 * ============================================================================
 * Why Leaflet.js + OpenStreetMap + OSRM?
 * 1. Zero Cost & No Credit Card: Commercial services like Google Maps API require
 *    billing profiles and charge per tile request and route calculation. Leaflet
 *    with OpenStreetMap (OSM) tiles is 100% free and open-source.
 * 2. Real Road Geometries via OSRM: Straight-line markers look unrealistic because
 *    buses follow ghats, state highways, and expressways. OSRM (Open Source Routing
 *    Machine) provides real road turnings as GeoJSON coordinates.
 * 3. Coordinate Systems: GeoJSON coordinates are in [longitude, latitude] format
 *    (GeoJSON RFC 7946), whereas Leaflet expects [latitude, longitude]. This file
 *    handles the necessary coordinate transposition.
 */

import { 
  subscribeToBuses, 
  subscribeToBus, 
  updateBusGPS 
} from "../shared/firebase-config.js";

import { 
  MAHARASHTRA_CITIES, 
  BUS_TYPES 
} from "../shared/msrtc-data.js";

// Application State
let allBuses = {};
let activeTab = "number"; // 'number' | 'route' | 'schedule'
let currentTrackedBusId = null;
let busUnsubscribe = null;

// Leaflet Map & Routing Instances
let map = null;
let busMarker = null;
let routePolyline = null;
let startMarker = null;
let endMarker = null;
let osrmRoutePoints = []; // GeoJSON [lat, lon] points along the highway
let simulationInterval = null;
let simulationIndex = 0;

// DOM Selectors
const searchView = document.getElementById("search-view");
const trackerView = document.getElementById("tracker-view");

const tabBtnNumber = document.getElementById("tab-btn-number");
const tabBtnRoute = document.getElementById("tab-btn-route");
const tabBtnSchedule = document.getElementById("tab-btn-schedule");

const panelNumber = document.getElementById("panel-number");
const panelRoute = document.getElementById("panel-route");
const panelSchedule = document.getElementById("panel-schedule");

const busNumberInput = document.getElementById("bus-number-input");
const clearSearchBtn = document.getElementById("clear-search-btn");

const fromCitySelect = document.getElementById("from-city-select");
const toCitySelect = document.getElementById("to-city-select");
const swapRouteBtn = document.getElementById("swap-route-btn");
const filterRouteBtn = document.getElementById("filter-route-btn");

const busesListContainer = document.getElementById("buses-list-container");
const resultsCountBadge = document.getElementById("results-count");
const backToSearchBtn = document.getElementById("back-to-search-btn");
const simulateMovementBtn = document.getElementById("simulate-movement-btn");

// ============================================================================
// 1. INITIALIZATION & DROPDOWN POPULATION
// ============================================================================
function init() {
  populateCityDropdowns();
  setupEventListeners();
  
  // Connect to real-time buses feed
  resultsCountBadge.textContent = "Connecting to fleet...";
  subscribeToBuses((buses) => {
    allBuses = buses || {};
    renderBuses();
    
    // If currently tracking a bus, refresh its data in the top panel
    if (currentTrackedBusId && allBuses[currentTrackedBusId]) {
      updateTrackerHeader(allBuses[currentTrackedBusId]);
    }
  });

  // Check URL query parameters (e.g. ?track=MH20-BL-4040)
  const params = new URLSearchParams(window.location.search);
  const trackId = params.get("track");
  if (trackId) {
    setTimeout(() => openTracker(trackId), 500);
  }
}

/**
 * Populate "From" and "To" dropdowns with authentic Maharashtra transit hubs
 */
function populateCityDropdowns() {
  const cityNames = Object.keys(MAHARASHTRA_CITIES);
  
  cityNames.forEach(cityName => {
    const optFrom = document.createElement("option");
    optFrom.value = cityName;
    optFrom.textContent = cityName;
    fromCitySelect.appendChild(optFrom);

    const optTo = document.createElement("option");
    optTo.value = cityName;
    optTo.textContent = cityName;
    toCitySelect.appendChild(optTo);
  });
}

// ============================================================================
// 2. TAB NAVIGATION & EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
  // Tab Switching
  tabBtnNumber.onclick = () => switchTab("number");
  tabBtnRoute.onclick = () => switchTab("route");
  tabBtnSchedule.onclick = () => switchTab("schedule");

  // Number Input Instant Search
  busNumberInput.addEventListener("input", () => renderBuses());
  clearSearchBtn.onclick = () => {
    busNumberInput.value = "";
    renderBuses();
  };

  // Route Filters
  filterRouteBtn.onclick = () => renderBuses();
  swapRouteBtn.onclick = () => {
    const temp = fromCitySelect.value;
    fromCitySelect.value = toCitySelect.value;
    toCitySelect.value = temp;
    renderBuses();
  };

  // Back from Map to Search View
  backToSearchBtn.onclick = () => closeTracker();

  // Viva Demonstration Simulation Mode
  simulateMovementBtn.onclick = () => toggleMovementSimulation();
}

function switchTab(tab) {
  activeTab = tab;
  [tabBtnNumber, tabBtnRoute, tabBtnSchedule].forEach(btn => btn.classList.remove("active"));
  panelNumber.style.display = "none";
  panelRoute.style.display = "none";
  panelSchedule.style.display = "none";

  if (tab === "number") {
    tabBtnNumber.classList.add("active");
    panelNumber.style.display = "block";
    busNumberInput.focus();
  } else if (tab === "route") {
    tabBtnRoute.classList.add("active");
    panelRoute.style.display = "block";
  } else if (tab === "schedule") {
    tabBtnSchedule.classList.add("active");
    panelSchedule.style.display = "block";
  }
  renderBuses();
}

// ============================================================================
// 3. RENDER BUSES CARDS
// ============================================================================
function renderBuses() {
  const busEntries = Object.entries(allBuses);
  const totalCount = busEntries.length;

  if (totalCount === 0) {
    busesListContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 24px;">
        <p style="color: var(--msrtc-muted);">No buses currently available in database.</p>
        <p style="font-size: 13px; margin-top: 6px;">Check connection or seed sample data from the home portal.</p>
      </div>`;
    resultsCountBadge.textContent = "0 buses";
    return;
  }

  // Filter based on active tab
  let filtered = busEntries;

  if (activeTab === "number") {
    const query = busNumberInput.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (query) {
      filtered = filtered.filter(([id, bus]) => {
        const cleanNumber = (bus.number || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        return cleanNumber.includes(query);
      });
    }
  } else if (activeTab === "route") {
    const fromVal = fromCitySelect.value;
    const toVal = toCitySelect.value;
    if (fromVal) {
      filtered = filtered.filter(([, bus]) => bus.from === fromVal);
    }
    if (toVal) {
      filtered = filtered.filter(([, bus]) => bus.to === toVal);
    }
  }

  resultsCountBadge.textContent = `${filtered.length} of ${totalCount} buses`;

  if (filtered.length === 0) {
    busesListContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 24px;">
        <p style="color: var(--msrtc-muted); font-size: 15px;">No buses found matching your criteria.</p>
        <button id="reset-filter-btn" class="btn btn-outline btn-sm" style="margin-top: 10px;">
          View All Buses
        </button>
      </div>`;
    const resetBtn = document.getElementById("reset-filter-btn");
    if (resetBtn) {
      resetBtn.onclick = () => {
        busNumberInput.value = "";
        fromCitySelect.value = "";
        toCitySelect.value = "";
        renderBuses();
      };
    }
    return;
  }

  // Build HTML for bus cards
  busesListContainer.innerHTML = filtered.map(([busId, bus]) => {
    const busTypeMeta = BUS_TYPES[bus.type] || {
      name: bus.type || "MSRTC Ordinary",
      tagClass: "type-lal-pari"
    };

    // Status pill
    let statusPill = "";
    if (bus.status === "running") {
      statusPill = `<span class="badge badge-live">Live GPS</span>`;
    } else if (bus.status === "maintenance") {
      statusPill = `<span class="badge badge-maintenance">Maintenance</span>`;
    } else {
      statusPill = `<span class="badge badge-idle">Idle at Depot</span>`;
    }

    return `
      <div class="bus-result-card" data-bus-id="${escapeHtml(busId)}">
        <div class="bus-card-top">
          <span class="bus-plate">🚌 ${escapeHtml(bus.number || busId)}</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span class="badge ${busTypeMeta.tagClass}">${escapeHtml(bus.type || "Lal Pari")}</span>
            ${statusPill}
          </div>
        </div>

        <div class="bus-route-visual">
          <span>${escapeHtml(bus.from || "Source")}</span>
          <span class="bus-route-arrow">➔</span>
          <span>${escapeHtml(bus.to || "Destination")}</span>
        </div>

        <div class="bus-meta-row">
          <div>
            <span>Dep: <strong>${escapeHtml(bus.departureTime || "--")}</strong></span>
            <span style="margin-left: 10px;">Duration: <strong>${escapeHtml(bus.duration || "--")}</strong></span>
          </div>
          <button class="btn btn-primary btn-sm track-bus-trigger" data-bus-id="${escapeHtml(busId)}" type="button">
            📍 Track Live
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Attach click events to "Track Live" buttons
  document.querySelectorAll(".track-bus-trigger").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const busId = btn.getAttribute("data-bus-id");
      openTracker(busId);
    };
  });
}

// ============================================================================
// 4. LIVE BUS TRACKER (LEAFLET + OSRM)
// ============================================================================
async function openTracker(busId) {
  currentTrackedBusId = busId;
  const bus = allBuses[busId];
  if (!bus) {
    alert("Bus record not found!");
    return;
  }

  // Switch Views
  searchView.style.display = "none";
  trackerView.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });

  updateTrackerHeader(bus);

  // Initialize or re-render Leaflet Map
  initMapIfNeeded();

  // Fetch Origin & Destination coordinates
  const fromCity = MAHARASHTRA_CITIES[bus.from] || { lat: 18.5314, lon: 73.8446 };
  const toCity = MAHARASHTRA_CITIES[bus.to] || { lat: 19.8762, lon: 75.3433 };

  // Render Origin and Destination ST Stand markers
  renderRouteWaypoints(fromCity, toCity, bus.from, bus.to);

  // Fetch real road polyline from OSRM
  await fetchAndDrawRoadRoute(fromCity, toCity);

  // Render Bus Marker at current coordinates
  const busLoc = bus.currentLocation || { lat: fromCity.lat, lon: fromCity.lon };
  updateBusMarkerPosition(busLoc.lat, busLoc.lon, busLoc.speed, busLoc.heading);

  // Subscribe to real-time GPS changes for this specific bus
  if (busUnsubscribe) busUnsubscribe();
  busUnsubscribe = subscribeToBus(busId, (updatedBus) => {
    if (updatedBus && currentTrackedBusId === busId) {
      allBuses[busId] = updatedBus;
      updateTrackerHeader(updatedBus);
      if (updatedBus.currentLocation) {
        updateBusMarkerPosition(
          updatedBus.currentLocation.lat,
          updatedBus.currentLocation.lon,
          updatedBus.currentLocation.speed,
          updatedBus.currentLocation.heading
        );
      }
    }
  });
}

function closeTracker() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    simulateMovementBtn.textContent = "▶ Simulate Movement";
    simulateMovementBtn.classList.remove("btn-dark");
    simulateMovementBtn.classList.add("btn-accent");
  }

  if (busUnsubscribe) {
    busUnsubscribe();
    busUnsubscribe = null;
  }
  currentTrackedBusId = null;

  trackerView.style.display = "none";
  searchView.style.display = "block";
}

function updateTrackerHeader(bus) {
  document.getElementById("track-bus-number").textContent = bus.number || currentTrackedBusId;
  
  const typeBadge = document.getElementById("track-bus-type");
  const typeMeta = BUS_TYPES[bus.type] || { name: bus.type, tagClass: "type-lal-pari" };
  typeBadge.textContent = bus.type || "Lal Pari";
  typeBadge.className = `badge ${typeMeta.tagClass}`;

  const statusBadge = document.getElementById("track-bus-status");
  if (bus.status === "running") {
    statusBadge.className = "badge badge-live";
    statusBadge.textContent = "Live GPS";
  } else if (bus.status === "maintenance") {
    statusBadge.className = "badge badge-maintenance";
    statusBadge.textContent = "Maintenance";
  } else {
    statusBadge.className = "badge badge-idle";
    statusBadge.textContent = "Idle at Stand";
  }

  document.getElementById("track-from").textContent = bus.from || "Origin";
  document.getElementById("track-to").textContent = bus.to || "Destination";
  document.getElementById("track-departure").textContent = bus.departureTime || "--";
  document.getElementById("track-duration").textContent = bus.duration || "--";
  document.getElementById("track-conductor").textContent = bus.conductorId || "Unassigned";

  const loc = bus.currentLocation;
  if (loc) {
    const speed = Math.round(loc.speed || 0);
    document.getElementById("track-speed").textContent = `${speed} km/h`;
    
    const timeAgoSec = Math.max(0, Math.round((Date.now() - (loc.timestamp || Date.now())) / 1000));
    document.getElementById("track-last-updated").textContent = 
      timeAgoSec < 60 ? `Updated ${timeAgoSec}s ago` : `Updated ${Math.round(timeAgoSec / 60)} min ago`;
  }
}

/**
 * Initialize Leaflet Map instance
 */
function initMapIfNeeded() {
  if (!map) {
    // Center initially on Maharashtra geographic center
    map = L.map("map", {
      zoomControl: true,
      attributionControl: true
    }).setView([19.2, 75.0], 7);

    // Free OpenStreetMap Tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
  } else {
    // Invalidate map size so it correctly calculates dimensions after unhiding
    setTimeout(() => map.invalidateSize(), 150);
  }
}

/**
 * Render Origin and Destination ST Stand pins
 */
function renderRouteWaypoints(fromCity, toCity, fromName, toName) {
  if (startMarker) map.removeLayer(startMarker);
  if (endMarker) map.removeLayer(endMarker);

  const createIcon = (label, color) => {
    return L.divIcon({
      className: "custom-stop-marker-wrapper",
      html: `<div class="custom-stop-marker" style="background: ${color};" title="${label}">🚏</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  };

  startMarker = L.marker([fromCity.lat, fromCity.lon], {
    icon: createIcon(fromName, "var(--msrtc-dark)")
  }).addTo(map).bindPopup(`<b>Origin Stand:</b><br>${fromName}`);

  endMarker = L.marker([toCity.lat, toCity.lon], {
    icon: createIcon(toName, "var(--msrtc-red)")
  }).addTo(map).bindPopup(`<b>Destination Stand:</b><br>${toName}`);
}

/**
 * Fetch real highway route geometry from OSRM driving engine
 */
async function fetchAndDrawRoadRoute(fromCity, toCity) {
  if (routePolyline) {
    map.removeLayer(routePolyline);
    routePolyline = null;
  }

  // OSRM Public Driving Routing Service API
  // Query format: /route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
  const url = `https://router.project-osrm.org/route/v1/driving/${fromCity.lon},${fromCity.lat};${toCity.lon},${toCity.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("OSRM service response was not ok");
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // Note: OSRM GeoJSON gives coordinates as [lon, lat]. Leaflet needs [lat, lon]!
      osrmRoutePoints = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

      // Draw road route polyline
      routePolyline = L.polyline(osrmRoutePoints, {
        color: "#C0392B",
        weight: 5,
        opacity: 0.85,
        smoothFactor: 1
      }).addTo(map);

      // Zoom map to fit the entire route
      map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

      // Total road distance in km
      const totalKm = Math.round(route.distance / 1000);
      const totalHours = Math.floor(route.duration / 3600);
      const totalMins = Math.round((route.duration % 3600) / 60);
      document.getElementById("track-duration").textContent = `${totalKm} km (~${totalHours}h ${totalMins}m)`;
    } else {
      throw new Error("No driving route returned");
    }
  } catch (err) {
    console.warn("[BusSaathi] OSRM Highway Route Fetch Fallback:", err.message);
    // Graceful fallback to straight line if offline or OSRM unavailable
    osrmRoutePoints = [
      [fromCity.lat, fromCity.lon],
      [toCity.lat, toCity.lon]
    ];
    routePolyline = L.polyline(osrmRoutePoints, {
      color: "#C0392B",
      dashArray: "6, 8",
      weight: 4
    }).addTo(map);
    map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });
  }
}

/**
 * Move or create the animated Bus Marker on Leaflet map
 */
function updateBusMarkerPosition(lat, lon, speed = 0, heading = 0) {
  if (!map) return;

  const latLng = [lat, lon];

  if (!busMarker) {
    const busIcon = L.divIcon({
      className: "custom-bus-marker-wrapper",
      html: `<div class="custom-bus-marker" id="live-bus-icon">🚌</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    busMarker = L.marker(latLng, { icon: busIcon, zIndexOffset: 1000 }).addTo(map);
    busMarker.bindPopup(`<b>Bus Location</b><br>Speed: ${Math.round(speed)} km/h`);
  } else {
    // Smooth transition
    busMarker.setLatLng(latLng);
  }

  // Update ETA and Progress percentage along the route
  calculateProgressAndETA(lat, lon, speed);
}

/**
 * Calculate distance, percentage, and ETA using Great-Circle Haversine formula
 */
function calculateProgressAndETA(currentLat, currentLon, speed) {
  if (osrmRoutePoints.length < 2) return;

  const destination = osrmRoutePoints[osrmRoutePoints.length - 1];
  const origin = osrmRoutePoints[0];

  // Total route straight distance
  const totalDist = haversineDistance(origin[0], origin[1], destination[0], destination[1]);
  // Distance remaining to destination
  const distRemaining = haversineDistance(currentLat, currentLon, destination[0], destination[1]);

  // Trip completion percentage
  let progressPct = Math.min(100, Math.max(5, Math.round(((totalDist - distRemaining) / totalDist) * 100)));
  document.getElementById("track-progress-bar").style.width = `${progressPct}%`;
  document.getElementById("track-progress-text").textContent = `Trip Progress: ${progressPct}% (${Math.round(distRemaining)} km left)`;

  // Estimated Arrival Time (ETA)
  const effectiveSpeed = speed > 20 ? speed : 45; // average highway speed 45 km/h if stopped or idle
  const etaMinutes = Math.max(1, Math.round((distRemaining / effectiveSpeed) * 60));
  
  const etaPill = document.getElementById("track-eta-pill");
  if (etaMinutes < 60) {
    etaPill.textContent = `ETA: ~${etaMinutes} mins`;
  } else {
    const etaH = Math.floor(etaMinutes / 60);
    const etaM = etaMinutes % 60;
    etaPill.textContent = `ETA: ~${etaH}h ${etaM}m`;
  }
}

/**
 * Mathematical Haversine formula to compute great-circle distance between two GPS coordinates
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// 5. DEMO SIMULATION ENGINE (FOR AVISHKAR STAGE PRESENTATION)
// ============================================================================
function toggleMovementSimulation() {
  if (simulationInterval) {
    // Stop simulation
    clearInterval(simulationInterval);
    simulationInterval = null;
    simulateMovementBtn.textContent = "▶ Simulate Movement";
    simulateMovementBtn.classList.remove("btn-dark");
    simulateMovementBtn.classList.add("btn-accent");
    return;
  }

  if (osrmRoutePoints.length === 0) {
    alert("Wait for route to load before simulating movement.");
    return;
  }

  simulateMovementBtn.textContent = "⏸ Pause Simulation";
  simulateMovementBtn.classList.remove("btn-accent");
  simulateMovementBtn.classList.add("btn-dark");

  // Step through coordinates along the OSRM highway
  simulationIndex = 0;
  const stepJump = Math.max(1, Math.floor(osrmRoutePoints.length / 40));

  simulationInterval = setInterval(() => {
    if (simulationIndex >= osrmRoutePoints.length) {
      simulationIndex = 0; // loop back for continuous demo
    }

    const point = osrmRoutePoints[simulationIndex];
    const simSpeed = 55 + Math.round(Math.random() * 15); // simulate 55 - 70 km/h

    // Update local and shared Firebase/LocalStorage bus GPS
    updateBusGPS(currentTrackedBusId, {
      lat: point[0],
      lon: point[1],
      speed: simSpeed,
      heading: 45,
      accuracy: 5
    });

    updateBusMarkerPosition(point[0], point[1], simSpeed, 45);

    simulationIndex += stepJump;
  }, 1200);
}

// Security sanitization helper
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Initialize application on DOM ready
document.addEventListener("DOMContentLoaded", init);
