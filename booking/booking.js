/**
 * BusSaathi - MSRTC Online Bus Reservation / Ticket Booking
 * File: /booking/booking.js
 * 
 * ============================================================================
 * AVISHKAR RESEARCH EXPLANATION: CONCURRENCY & DIGITAL RESERVATION
 * ============================================================================
 * 1. Why Firebase runTransaction() for Seat Reservation?
 *    In bus booking systems, race conditions happen when two passengers attempt
 *    to book the exact same seat simultaneously. A simple database write (`set()`)
 *    would blindly overwrite the first passenger's booking.
 *    Firebase's `runTransaction()` provides atomic check-and-set semantics:
 *    the server verifies that the seats are vacant before committing. If another
 *    user booked the seat a millisecond prior, the transaction aborts and cleanly
 *    notifies the user without data corruption.
 * 2. Shared Fleet Data Architecture:
 *    This module does NOT maintain a separate list of buses. It reads directly
 *    from the `/buses` collection shared with the Passenger, Conductor, and
 *    Controller modules, ensuring real-time operational consistency across MSRTC.
 * 3. 2+2 Bus Cabin Grid:
 *    MSRTC standard coaches (Lal Pari, Shivshahi, Shivneri) use a 2+2 seating
 *    arrangement with a central aisle. This layout is rendered dynamically with
 *    accessible tap targets (>= 44px) conforming to mobile touch guidelines.
 */

import { 
  db, 
  isConfigured, 
  subscribeToBuses 
} from "../shared/firebase-config.js";

import { 
  MAHARASHTRA_CITIES, 
  BUS_TYPES, 
  SEED_BUSES 
} from "../shared/msrtc-data.js";

import { 
  ref, 
  get, 
  set, 
  runTransaction 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Application State
let allBuses = {};
let currentBus = null;
let currentTravelDate = "";
let selectedSeats = [];
let bookedSeats = [];
let currentStep = 1;

// Standard MSRTC Bus Fare Estimates based on Service Class
const FARE_RATES = {
  "Lal Pari": 160,
  "Shivshahi": 260,
  "Shivneri": 440,
  "e-Shivai": 220
};

// DOM Element Selectors
const fromSelect = document.getElementById("fromSelect");
const toSelect = document.getElementById("toSelect");
const swapCitiesBtn = document.getElementById("swapCitiesBtn");
const travelDateInput = document.getElementById("travelDate");
const searchBusesBtn = document.getElementById("searchBusesBtn");
const errorSearch = document.getElementById("errorSearch");

const busListArea = document.getElementById("busListArea");
const selectedRouteSummary = document.getElementById("selectedRouteSummary");
const backToStep1Btn = document.getElementById("backToStep1Btn");

const selectedBusInfoBox = document.getElementById("selectedBusInfoBox");
const seatGrid = document.getElementById("seatGrid");
const selectedSeatsText = document.getElementById("selectedSeatsText");
const farePerSeatText = document.getElementById("farePerSeatText");
const totalFareText = document.getElementById("totalFareText");
const goToPassengerBtn = document.getElementById("goToPassengerBtn");
const errorSeats = document.getElementById("errorSeats");
const backToStep2Btn = document.getElementById("backToStep2Btn");

const passengerDetailsForm = document.getElementById("passengerDetailsForm");
const passNameInput = document.getElementById("passName");
const passAgeInput = document.getElementById("passAge");
const passGenderInput = document.getElementById("passGender");
const passPhoneInput = document.getElementById("passPhone");
const errorPassenger = document.getElementById("errorPassenger");
const confirmBookingBtn = document.getElementById("confirmBookingBtn");
const backToStep3Btn = document.getElementById("backToStep3Btn");

const reviewBusName = document.getElementById("reviewBusName");
const reviewTravelDate = document.getElementById("reviewTravelDate");
const reviewSeats = document.getElementById("reviewSeats");
const reviewTotalFare = document.getElementById("reviewTotalFare");

const togglePnrLookupBtn = document.getElementById("toggle-pnr-lookup-btn");
const pnrLookupPanel = document.getElementById("pnr-lookup-panel");
const pnrQueryInput = document.getElementById("pnr-query-input");
const fetchPnrBtn = document.getElementById("fetch-pnr-btn");
const pnrResultArea = document.getElementById("pnr-result-area");

const printTicketBtn = document.getElementById("printTicketBtn");
const bookAnotherBtn = document.getElementById("bookAnotherBtn");

// ============================================================================
// 1. INITIALIZATION & SETUP
// ============================================================================
function init() {
  populateCityDropdowns();
  setupDateConstraints();
  setupEventListeners();

  // Subscribe to the shared /buses collection
  subscribeToBuses((busesData) => {
    allBuses = busesData || SEED_BUSES;
  });
}

function setupDateConstraints() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  travelDateInput.min = todayStr;
  travelDateInput.value = todayStr;
}

function populateCityDropdowns() {
  const cities = Object.keys(MAHARASHTRA_CITIES);

  cities.forEach((city, index) => {
    const optFrom = document.createElement("option");
    optFrom.value = city;
    optFrom.textContent = city;
    fromSelect.appendChild(optFrom);

    const optTo = document.createElement("option");
    optTo.value = city;
    optTo.textContent = city;
    toSelect.appendChild(optTo);
  });

  // Default to popular route: Pune -> Chh. Sambhajinagar
  if (cities.length >= 3) {
    fromSelect.selectedIndex = 0; // Pune
    toSelect.selectedIndex = 2;   // Chh. Sambhajinagar
  }
}

// ============================================================================
// 2. EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
  // Swap From and To
  swapCitiesBtn.onclick = () => {
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
  };

  // Search Buses
  searchBusesBtn.onclick = () => handleSearchBuses();

  // Wizard Navigation Back Buttons
  backToStep1Btn.onclick = () => goToStep(1);
  backToStep2Btn.onclick = () => goToStep(2);
  backToStep3Btn.onclick = () => goToStep(3);

  // Seat Selection Continue
  goToPassengerBtn.onclick = () => handleSeatSelectionContinue();

  // Passenger Form Submit
  passengerDetailsForm.onsubmit = async (e) => {
    e.preventDefault();
    await handleBookingConfirmation();
  };

  // PNR Status Lookup Toggle
  togglePnrLookupBtn.onclick = () => {
    const isHidden = pnrLookupPanel.style.display === "none";
    pnrLookupPanel.style.display = isHidden ? "block" : "none";
    togglePnrLookupBtn.textContent = isHidden ? "✕ Close PNR" : "🔍 Check PNR";
    if (isHidden) pnrQueryInput.focus();
  };

  // PNR Fetch
  fetchPnrBtn.onclick = () => handlePnrLookup();
  pnrQueryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handlePnrLookup();
  });

  // Ticket Actions
  printTicketBtn.onclick = () => window.print();
  bookAnotherBtn.onclick = () => resetBookingWizard();
}

// ============================================================================
// 3. STEP WIZARD PROGRESS NAVIGATION
// ============================================================================
function goToStep(step) {
  currentStep = step;

  // Toggle active step panel
  const steps = ["step1", "step2", "step3", "step4", "stepConfirmation"];
  steps.forEach((sId, idx) => {
    const el = document.getElementById(sId);
    if (!el) return;
    if (step === 5 && sId === "stepConfirmation") {
      el.classList.add("active");
    } else if (idx + 1 === step) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  // Update progress dots (1 through 4)
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById("dot" + i);
    const label = document.getElementById("label-step" + i);
    if (dot) {
      dot.className = "booking-step-dot" + (i < step || step === 5 ? " done" : i === step ? " active" : "");
    }
    if (label) {
      label.className = i === step ? "active" : "";
    }
  }

  window.scrollTo({ top: 100, behavior: "smooth" });
}

// ============================================================================
// 4. STEP 1 -> STEP 2: BUS SEARCH
// ============================================================================
function handleSearchBuses() {
  const fromCity = fromSelect.value;
  const toCity = toSelect.value;
  const travelDate = travelDateInput.value;

  if (fromCity === toCity) {
    showError(errorSearch, "Origin and Destination stands cannot be the same. Please select different cities.");
    return;
  }

  if (!travelDate) {
    showError(errorSearch, "Please select a valid date of travel.");
    return;
  }

  errorSearch.style.display = "none";
  currentTravelDate = travelDate;

  // Filter buses from shared /buses collection
  const busEntries = Object.entries(allBuses);
  const matchingBuses = busEntries.filter(([id, b]) => {
    return b.from === fromCity && b.to === toCity;
  });

  selectedRouteSummary.textContent = `${fromCity} ➔ ${toCity} • ${formatDisplayDate(travelDate)}`;

  if (matchingBuses.length === 0) {
    busListArea.innerHTML = `
      <div class="card" style="text-align: center; padding: 24px;">
        <p style="color: var(--msrtc-muted); font-size: 15px; margin-bottom: 8px;">
          No direct scheduled buses found for this route on this date.
        </p>
        <p style="font-size: 13px; color: var(--msrtc-muted);">
          Popular demonstration routes with available buses:
        </p>
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
          <button class="btn btn-outline btn-sm quick-route-btn" data-from="Pune (Swargate/Shivajinagar)" data-to="Chhatrapati Sambhajinagar (Aurangabad CBS)">
            Pune ➔ Chh. Sambhajinagar
          </button>
          <button class="btn btn-outline btn-sm quick-route-btn" data-from="Pune (Swargate/Shivajinagar)" data-to="Mumbai (Dadar Asiad Stand)">
            Pune ➔ Mumbai Dadar
          </button>
          <button class="btn btn-outline btn-sm quick-route-btn" data-from="Nashik (CBS)" data-to="Pune (Swargate/Shivajinagar)">
            Nashik ➔ Pune
          </button>
        </div>
      </div>
    `;

    document.querySelectorAll(".quick-route-btn").forEach(btn => {
      btn.onclick = () => {
        fromSelect.value = btn.getAttribute("data-from");
        toSelect.value = btn.getAttribute("data-to");
        handleSearchBuses();
      };
    });
  } else {
    // Render matching bus cards
    busListArea.innerHTML = matchingBuses.map(([busId, bus]) => {
      const typeMeta = BUS_TYPES[bus.type] || { name: bus.type, tagClass: "type-lal-pari" };
      const fare = bus.fare || FARE_RATES[bus.type] || 200;

      return `
        <div class="booking-bus-card" data-bus-id="${escapeHtml(busId)}">
          <div class="booking-bus-top">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="bus-plate">🚌 ${escapeHtml(bus.number || busId)}</span>
              <span class="badge ${typeMeta.tagClass}">${escapeHtml(bus.type || "Lal Pari")}</span>
            </div>
            <div class="booking-bus-fare">₹ ${fare} <span style="font-size: 11px; font-weight: 400; color: var(--msrtc-muted);">/ seat</span></div>
          </div>

          <div class="bus-route-visual" style="margin: 6px 0 10px;">
            <span>${escapeHtml(bus.from)}</span>
            <span class="bus-route-arrow">➔</span>
            <span>${escapeHtml(bus.to)}</span>
          </div>

          <div class="bus-meta-row">
            <div>
              <span>Departs: <strong>${escapeHtml(bus.departureTime || "--")}</strong></span>
              <span style="margin-left: 12px;">Duration: <strong>${escapeHtml(bus.duration || "--")}</strong></span>
            </div>
            <button class="btn btn-primary btn-sm select-bus-btn" data-bus-id="${escapeHtml(busId)}" type="button">
              Select Seats →
            </button>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".select-bus-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const busId = btn.getAttribute("data-bus-id");
        selectBus(busId);
      };
    });
  }

  goToStep(2);
}

// ============================================================================
// 5. STEP 2 -> STEP 3: SEAT MAP INITIALIZATION
// ============================================================================
async function selectBus(busId) {
  currentBus = allBuses[busId] || { number: busId, type: "Lal Pari", from: fromSelect.value, to: toSelect.value };
  currentBus.id = busId;
  currentBus.fare = currentBus.fare || FARE_RATES[currentBus.type] || 200;

  selectedSeats = [];
  errorSeats.style.display = "none";

  // Display selected bus summary
  const typeMeta = BUS_TYPES[currentBus.type] || { tagClass: "type-lal-pari" };
  selectedBusInfoBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="font-size: 15px; color: var(--msrtc-dark);">${escapeHtml(currentBus.number || currentBus.id)}</strong>
        <span class="badge ${typeMeta.tagClass}" style="margin-left: 6px;">${escapeHtml(currentBus.type)}</span>
      </div>
      <strong style="color: var(--msrtc-green); font-size: 15px;">₹ ${currentBus.fare} / seat</strong>
    </div>
    <div style="font-size: 12.5px; color: var(--msrtc-muted); margin-top: 4px;">
      ${escapeHtml(currentBus.from)} ➔ ${escapeHtml(currentBus.to)} • Departs: ${escapeHtml(currentBus.departureTime || "--")} • Date: ${formatDisplayDate(currentTravelDate)}
    </div>
  `;

  // Fetch booked seats for this bus and date
  await fetchBookedSeats(busId, currentTravelDate);

  // Render 2+2 layout
  renderSeatGrid();
  updateSeatSummary();

  goToStep(3);
}

/**
 * Fetch occupied seats from Firebase (or LocalStorage demo cache)
 */
async function fetchBookedSeats(busId, travelDate) {
  const cleanKey = `${busId.replace(/[^a-zA-Z0-9]/g, "_")}_${travelDate}`;
  bookedSeats = [];

  if (db) {
    try {
      const snap = await get(ref(db, `bus_seats/${cleanKey}`));
      if (snap.exists()) {
        bookedSeats = Object.keys(snap.val() || {});
      }
    } catch (err) {
      console.warn("[BusSaathi] Error reading seat allocations:", err.message);
    }
  } else {
    // Demo Mode Cache in LocalStorage
    const stored = JSON.parse(localStorage.getItem(`bussaathi_bus_seats_${cleanKey}`) || "null");
    if (stored) {
      bookedSeats = Object.keys(stored);
    } else {
      // Seed 4 realistic occupied seats so judges see visual contrast immediately
      const defaultOccupied = { "A2": "BS-102938", "B3": "BS-948102", "C1": "BS-554109", "D4": "BS-391024" };
      localStorage.setItem(`bussaathi_bus_seats_${cleanKey}`, JSON.stringify(defaultOccupied));
      bookedSeats = Object.keys(defaultOccupied);
    }
  }
}

/**
 * Render standard MSRTC 2+2 Seat Cabin Grid
 * Layout:
 * Col 1, Col 2 | Aisle | Col 3, Col 4
 */
function renderSeatGrid() {
  seatGrid.innerHTML = "";
  const rows = ["A", "B", "C", "D", "E", "F", "G"]; // 7 rows x 4 = 28 seats

  rows.forEach(rowLetter => {
    // Left pair: seats 1 and 2
    [1, 2].forEach(colNum => {
      const seatId = `${rowLetter}${colNum}`;
      seatGrid.appendChild(createSeatElement(seatId));
    });

    // Center Aisle spacer
    const aisleSpacer = document.createElement("div");
    aisleSpacer.className = "seat-aisle-spacer";
    aisleSpacer.textContent = rowLetter;
    seatGrid.appendChild(aisleSpacer);

    // Right pair: seats 3 and 4
    [3, 4].forEach(colNum => {
      const seatId = `${rowLetter}${colNum}`;
      seatGrid.appendChild(createSeatElement(seatId));
    });
  });
}

function createSeatElement(seatId) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "seat-tap-btn";
  btn.textContent = seatId;
  btn.setAttribute("aria-label", `Seat ${seatId}`);

  if (bookedSeats.includes(seatId)) {
    btn.classList.add("booked");
    btn.disabled = true;
    btn.title = `Seat ${seatId} is already booked`;
  } else {
    btn.classList.add("available");
    btn.title = `Seat ${seatId} - Available (₹${currentBus.fare})`;
    btn.onclick = () => toggleSeatSelection(seatId, btn);
  }

  return btn;
}

function toggleSeatSelection(seatId, btnElement) {
  errorSeats.style.display = "none";

  if (selectedSeats.includes(seatId)) {
    // Unselect
    selectedSeats = selectedSeats.filter(s => s !== seatId);
    btnElement.classList.remove("selected");
    btnElement.classList.add("available");
  } else {
    // Max 6 seats limit per booking
    if (selectedSeats.length >= 6) {
      showError(errorSeats, "Maximum 6 seats can be selected per single booking.");
      return;
    }
    selectedSeats.push(seatId);
    btnElement.classList.remove("available");
    btnElement.classList.add("selected");
  }

  updateSeatSummary();
}

function updateSeatSummary() {
  selectedSeats.sort();
  selectedSeatsText.textContent = selectedSeats.length ? selectedSeats.join(", ") : "None";
  farePerSeatText.textContent = `₹ ${currentBus.fare}`;
  
  const total = selectedSeats.length * currentBus.fare;
  totalFareText.textContent = `₹ ${total.toLocaleString("en-IN")}`;
}

// ============================================================================
// 6. STEP 3 -> STEP 4: PASSENGER FORM REVIEW
// ============================================================================
function handleSeatSelectionContinue() {
  if (selectedSeats.length === 0) {
    showError(errorSeats, "Please select at least one available seat to proceed.");
    return;
  }

  errorSeats.style.display = "none";

  // Populate Review Details
  reviewBusName.textContent = `${currentBus.number || currentBus.id} (${currentBus.type})`;
  reviewTravelDate.textContent = formatDisplayDate(currentTravelDate);
  reviewSeats.textContent = selectedSeats.join(", ");
  
  const total = selectedSeats.length * currentBus.fare;
  reviewTotalFare.textContent = `₹ ${total.toLocaleString("en-IN")}`;
  confirmBookingBtn.textContent = `🔒 Reserve Seats & Generate PNR (Demo Pay ₹${total})`;

  goToStep(4);
}

// ============================================================================
// 7. STEP 4 -> CONFIRMATION: ATOMIC FIREBASE TRANSACTION
// ============================================================================
async function handleBookingConfirmation() {
  const name = passNameInput.value.trim();
  const age = passAgeInput.value.trim();
  const gender = passGenderInput.value;
  const phone = passPhoneInput.value.trim();

  // Field validation
  if (!name || name.length < 3) {
    showError(errorPassenger, "Please enter passenger's full name (minimum 3 characters).");
    return;
  }

  if (!age || isNaN(age) || age < 1 || age > 110) {
    showError(errorPassenger, "Please enter a valid age between 1 and 110.");
    return;
  }

  if (!phone || !/^\d{10}$/.test(phone)) {
    showError(errorPassenger, "Please enter a valid 10-digit mobile number.");
    return;
  }

  errorPassenger.style.display = "none";
  confirmBookingBtn.disabled = true;
  confirmBookingBtn.textContent = "Processing atomic reservation...";

  const pnr = "BS-" + Math.floor(100000 + Math.random() * 900000);
  const totalFare = selectedSeats.length * currentBus.fare;
  const cleanKey = `${currentBus.id.replace(/[^a-zA-Z0-9]/g, "_")}_${currentTravelDate}`;

  const bookingRecord = {
    pnr: pnr,
    busId: currentBus.id,
    busNumber: currentBus.number || currentBus.id,
    busType: currentBus.type || "Lal Pari",
    from: currentBus.from,
    to: currentBus.to,
    departureTime: currentBus.departureTime || "08:00 AM",
    travelDate: currentTravelDate,
    seats: selectedSeats,
    passenger: {
      name: name,
      age: Number(age),
      gender: gender,
      phone: phone
    },
    totalFare: totalFare,
    timestamp: Date.now(),
    status: "confirmed",
    paymentMode: "demo_simulated"
  };

  try {
    if (db) {
      // ----------------------------------------------------------------------
      // LIVE FIREBASE TRANSACTION: ATOMIC CONCURRENCY LOCK
      // ----------------------------------------------------------------------
      const seatLockRef = ref(db, `bus_seats/${cleanKey}`);
      
      const transactionResult = await runTransaction(seatLockRef, (currentSeats) => {
        currentSeats = currentSeats || {};

        // Verify none of the requested seats are already claimed
        for (const seat of selectedSeats) {
          if (currentSeats[seat]) {
            // Seat already booked by another user! Abort transaction.
            return; 
          }
        }

        // All seats available! Atomically allocate to this PNR
        for (const seat of selectedSeats) {
          currentSeats[seat] = pnr;
        }
        return currentSeats;
      });

      if (!transactionResult.committed) {
        throw new Error("One or more of your selected seats were just booked by another passenger. Please return to seat selection and choose different seats.");
      }

      // Persist full booking record
      await set(ref(db, `bookings/${pnr}`), bookingRecord);

    } else {
      // ----------------------------------------------------------------------
      // OFFLINE / DEMO REHEARSAL MODE TRANSACTION EMULATION
      // ----------------------------------------------------------------------
      const localSeatsKey = `bussaathi_bus_seats_${cleanKey}`;
      const currentAllocations = JSON.parse(localStorage.getItem(localSeatsKey) || "{}");

      // Check for conflict
      for (const seat of selectedSeats) {
        if (currentAllocations[seat]) {
          throw new Error(`Seat ${seat} was just booked by another user. Please choose another seat.`);
        }
      }

      // Commit lock
      for (const seat of selectedSeats) {
        currentAllocations[seat] = pnr;
      }
      localStorage.setItem(localSeatsKey, JSON.stringify(currentAllocations));

      // Save booking in local store
      const allBookings = JSON.parse(localStorage.getItem("bussaathi_bookings") || "{}");
      allBookings[pnr] = bookingRecord;
      localStorage.setItem("bussaathi_bookings", JSON.stringify(allBookings));
    }

    // Success! Render Boarding Pass
    renderBoardingPass(bookingRecord);
    goToStep(5);

  } catch (err) {
    showError(errorPassenger, err.message);
  } finally {
    confirmBookingBtn.disabled = false;
    confirmBookingBtn.textContent = `🔒 Reserve Seats & Generate PNR (Demo Pay ₹${totalFare})`;
  }
}

function renderBoardingPass(record) {
  document.getElementById("ticketPnr").textContent = record.pnr;
  document.getElementById("ticketBusNumber").textContent = record.busNumber;
  
  const typeMeta = BUS_TYPES[record.busType] || { tagClass: "type-lal-pari" };
  const typeBadge = document.getElementById("ticketBusType");
  typeBadge.textContent = record.busType;
  typeBadge.className = `badge ${typeMeta.tagClass}`;

  document.getElementById("ticketTravelDate").textContent = formatDisplayDate(record.travelDate);
  document.getElementById("ticketFrom").textContent = record.from;
  document.getElementById("ticketTo").textContent = record.to;
  document.getElementById("ticketPassengerName").textContent = `${record.passenger.name} (${record.passenger.age}, ${record.passenger.gender})`;
  document.getElementById("ticketPassengerPhone").textContent = record.passenger.phone;
  document.getElementById("ticketSeats").textContent = record.seats.join(", ");
  document.getElementById("ticketTotalFare").textContent = `₹ ${record.totalFare.toLocaleString("en-IN")}`;
}

// ============================================================================
// 8. PNR STATUS LOOKUP ENQUIRY
// ============================================================================
async function handlePnrLookup() {
  const query = pnrQueryInput.value.trim().toUpperCase();

  if (!query || query.length < 5) {
    pnrResultArea.innerHTML = `<div class="alert alert-danger">Please enter a valid PNR number (e.g. BS-849201).</div>`;
    return;
  }

  pnrResultArea.innerHTML = `<div style="font-size: 13px; color: var(--msrtc-muted);">Searching booking database for ${escapeHtml(query)}...</div>`;

  try {
    let booking = null;

    if (db) {
      const snap = await get(ref(db, `bookings/${query}`));
      if (snap.exists()) {
        booking = snap.val();
      }
    } else {
      const allBookings = JSON.parse(localStorage.getItem("bussaathi_bookings") || "{}");
      booking = allBookings[query];
    }

    if (!booking) {
      pnrResultArea.innerHTML = `
        <div class="alert alert-warning" style="margin-top: 8px;">
          ❌ No confirmed booking found for PNR: <strong>${escapeHtml(query)}</strong>. Please verify the code and try again.
        </div>`;
      return;
    }

    // Render Mini Ticket Card
    pnrResultArea.innerHTML = `
      <div class="card" style="border: 2px solid var(--msrtc-green); background: #FAFDF9; margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: var(--msrtc-dark); font-size: 16px;">PNR: ${escapeHtml(booking.pnr)}</strong>
          <span class="badge badge-resolved">Confirmed</span>
        </div>
        <div style="font-size: 13.5px; margin: 4px 0;">
          <strong>${escapeHtml(booking.from)} ➔ ${escapeHtml(booking.to)}</strong>
        </div>
        <div style="font-size: 12.5px; color: var(--msrtc-muted); margin-bottom: 6px;">
          Bus: <strong>${escapeHtml(booking.busNumber)}</strong> (${escapeHtml(booking.busType)}) • Date: ${formatDisplayDate(booking.travelDate)}
        </div>
        <div style="font-size: 13px; display: flex; justify-content: space-between; border-top: 1px dashed var(--msrtc-line); padding-top: 8px;">
          <span>Seats: <strong style="color: var(--msrtc-red);">${escapeHtml(booking.seats.join(", "))}</strong></span>
          <span>Passenger: <strong>${escapeHtml(booking.passenger.name)}</strong></span>
          <span style="color: var(--msrtc-green); font-weight: 800;">₹ ${booking.totalFare}</span>
        </div>
      </div>
    `;

  } catch (err) {
    pnrResultArea.innerHTML = `<div class="alert alert-danger">Error retrieving booking: ${err.message}</div>`;
  }
}

// ============================================================================
// 9. HELPER UTILITIES
// ============================================================================
function resetBookingWizard() {
  selectedSeats = [];
  currentBus = null;
  passNameInput.value = "";
  passAgeInput.value = "";
  passPhoneInput.value = "";
  errorSearch.style.display = "none";
  errorSeats.style.display = "none";
  errorPassenger.style.display = "none";
  goToStep(1);
}

function showError(el, message) {
  el.textContent = message;
  el.style.display = "block";
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "--";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
  } catch (e) {}
  return dateStr;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", init);
