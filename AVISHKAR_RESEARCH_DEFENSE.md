# BusSaathi: Smart MSRTC Fleet & Passenger Transit System
## Avishkar Research Convention — Project Defense & Technical Documentation

---

### 1. Project Synopsis & Classification
* **Project Name:** BusSaathi (बस साथी) — Smart Transport Management System for MSRTC
* **Target Organization:** Maharashtra State Road Transport Corporation (MSRTC / एस. टी. महामंडळ)
* **Category:** Engineering and Technology / Computer Science & Information Systems
* **Academic Level:** Undergraduate (BCA — Bachelor of Computer Applications)
* **Author / Researcher:** Amaan & Team
* **College: Shri Shivaji College Prbhani.

---

### 2. Problem Statement: Real-World MSRTC Challenges
MSRTC operates one of the largest public bus fleets in the world, with over **15,000 buses**, **250+ depots**, and carrying over **65 Lakh passengers daily** across urban, rural, and remote tribal regions of Maharashtra. Despite its extensive reach, three critical systemic problems persist:

1. **Passenger Uncertainty & Transit Anxiety:**
   Passengers at village stops (*phatas*) and roadside stands have zero real-time visibility of bus locations. They wait indefinitely without knowing if a bus is running 10 minutes late or has already passed.
2. **Overcrowded Stand Enquiry Counters:**
   Due to lack of digital schedules and live ETAs, enquiry windows at major stands (Swargate, Pune Station, Dadar, Aurangabad CBS) experience overwhelming queues and frustrated commuters.
3. **Manual Paper-Based Breakdown & Revenue Auditing:**
   When a bus breaks down on state highways (e.g., Kasara Ghat, Shikrapur, Khandala), the crew relies on voice phone calls to report issues. Furthermore, ticket revenues from Electronic Ticket Machines (ETMs) are compiled using manual paper printouts, causing reporting delays and audit bottlenecks.

---

### 3. Core Research Innovation: The "Zero-Hardware" Architecture

#### The Problem with Existing AIS-140 GPS Installations:
Government mandates require AIS-140 GPS hardware units on public transit vehicles. However:
* Each commercial AIS-140 GPS unit costs approximately **₹20,000 – ₹25,000** per bus.
* Annual Maintenance Contracts (AMC) and separate 4G SIM subscriptions cost **₹5,000 – ₹7,000** per bus per year.
* **Capital Cost for 15,000 MSRTC buses:**
  $$\text{Capital Expenditure} = 15,000 \times ₹25,000 = \mathbf{₹37.5\text{ Crores}}$$
  $$\text{Recurring Annual Cost} = 15,000 \times ₹6,000 = \mathbf{₹9\text{ Crores / year}}$$
* In real-world conditions, dedicated hardware suffers from vibration damage, battery drain when the engine is off, and antenna detachment in rural terrains.

#### The BusSaathi Innovation:
BusSaathi completely eliminates hardware procurement by converting the **conductor's existing smartphone** into a secure, intelligent GPS telemetry terminal.
* **Hardware Cost:** **₹0 (Zero)**.
* **Deployment Time:** Instantaneous — runs in any mobile browser (Chrome, Firefox, Safari) via Progressive Web Standards without requiring an app store download.
* **Battery & Data Optimization:** Uses an intelligent **15–20 second throttling algorithm**, preserving phone battery for full 8+ hour shifts while transmitting less than 2 MB of data per round trip.

---

### 4. Technical Architecture & System Design

```
                     ┌─────────────────────────────────────────┐
                     │          MSRTC Bus Ecosystem            │
                     └─────────────────────────────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
      │   PASSENGER VIEW    │ │   CONDUCTOR VIEW    │ │   CONTROLLER VIEW   │
      │   (Public Web)      │ │   (Mobile PWA)      │ │   (Command Room)    │
      ├─────────────────────┤ ├─────────────────────┤ ├─────────────────────┤
      │ • Bus No. Search    │ │ • Secure Auth       │ │ • Live Fleet KPIs   │
      │ • Route From-To     │ │ • Start/Stop Trip   │ │ • Fleet Table       │
      │ • Live Leaflet Map  │ │ • 15s GPS Watcher   │ │ • Add New Bus Form  │
      │ • OSRM Highway Path │ │ • Screen WakeLock   │ │ • Breakdown Alerts  │
      │ • Live ETA & %      │ │ • Breakdown Report  │ │ • Revenue Ledger    │
      │ • Timetable Browser │ │ • Digital E-Revenue │ │ • Database Seed/Sync│
      └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                 ▲                       │                       ▲
                 │ (Live WebSocket Sync) │ (GPS Push & Forms)    │ (onValue Stream)
                 └───────────────────────┼───────────────────────┘
                                         ▼
                     ┌─────────────────────────────────────────┐
                     │       FIREBASE BACKEND SERVICES         │
                     ├─────────────────────────────────────────┤
                     │ 1. Firebase Realtime Database (RTDB)    │
                     │    - /buses/{id} (Location, Status)     │
                     │    - /reports/{id} (Breakdown Alerts)   │
                     │    - /revenue/{id} (Financial Ledger)   │
                     │ 2. Firebase Authentication (Auth)       │
                     │    - Role-based Conductor & Controller  │
                     └─────────────────────────────────────────┘
                                         │
                                         ▼
                     ┌─────────────────────────────────────────┐
                     │      OPEN SPATIAL DATA SERVICES         │
                     ├─────────────────────────────────────────┤
                     │ • Leaflet.js (Open-Source Map Engine)   │
                     │ • OpenStreetMap (OSM Standard Tiles)    │
                     │ • OSRM API (Real Road Geometry GeoJSON) │
                     └─────────────────────────────────────────┘
```

#### Why These Technologies Were Chosen (Justifications for Viva):
1. **Vanilla HTML5, CSS3, JavaScript (ES6 Modules):**
   * *Why not React/Angular/Vue?*
     Frameworks add 300KB–1MB of bundled JavaScript overhead, slowing down low-end Android smartphones used in rural India. Vanilla JS executes natively with zero compilation steps, instant load times, and crystal-clear maintainability.
2. **Firebase Realtime Database (RTDB) via WebSockets:**
   * *Why not standard HTTP REST APIs / MySQL?*
     HTTP REST polling requires the browser to send a request every 5 seconds, resulting in unnecessary HTTP header overhead, battery drain, and latency. Firebase uses a single persistent WebSocket connection (`onValue` listener), pushing coordinate changes instantly with $<100\text{ ms}$ latency.
3. **Leaflet.js + OpenStreetMap vs Google Maps:**
   * Google Maps requires a paid API key and credit card billing.
   * Leaflet + OpenStreetMap is 100% free, privacy-friendly, open-source, and does not incur any recurring API fees.
4. **OSRM (Open Source Routing Machine):**
   * Computes driving paths along real state highways (e.g., NH 48, Samruddhi Mahamarg) instead of drawing misleading straight lines between coordinates.

---

### 5. Avishkar Viva Defense: Anticipated Questions & Answers

#### Q1: "What happens if a bus travels through a ghat with no mobile network connectivity?"
> **Answer:**
> In remote ghat sections (like Kasara Ghat or Amboli Ghat) where cellular connectivity drops, the browser's `navigator.geolocation` continues to record GPS coordinates using satellite signals (GPS hardware works offline). When cellular coverage is re-established, the WebSockets connection automatically reconnects and syncs the updated location to Firebase. For passengers, the interface displays the last recorded timestamp (e.g. *"Signal lost 4 mins ago near Kasara"*) rather than misleading them.

#### Q2: "Why did you throttle the GPS updates to 15–20 seconds instead of sending updates every second?"
> **Answer:**
> Sending updates every 1 second causes severe drawbacks:
> 1. Rapid battery depletion on the conductor's phone within 2 hours.
> 2. High mobile data consumption.
> 3. Database write rate limits.
> At an average highway speed of $60\text{ km/h}$, a bus travels approximately 16.6 meters per second. In 15 seconds, it covers ~250 meters. For intercity transit where stops are several kilometers apart, a 15–20 second refresh rate provides smooth tracking with high accuracy while allowing the conductor's phone to last through an entire 8–10 hour shift.

#### Q3: "What prevents the conductor's smartphone screen from turning off and pausing the app?"
> **Answer:**
> Mobile operating systems automatically sleep screens to save power, which suspends background JavaScript. We implemented the **Screen Wake Lock API** (`navigator.wakeLock.request('screen')`). When the conductor taps *"Start Trip"*, the browser requests a system wake lock to keep the display awake. When the conductor taps *"End Trip"*, the lock is cleanly released.

#### Q4: "How does your system benefit MSRTC financially?"
> **Answer:**
> 1. **Immediate Capital Savings:** Saves over **₹37.5 Crores** in hardware procurement and **₹9 Crores/year** in hardware AMC.
> 2. **Digitized Revenue Auditing:** Replaces physical paper tickets and manual waybills with instant digital submission, preventing fare reconciliation discrepancies.
> 3. **Reduced Fleet Downtime:** On-road breakdown alerts reach the depot workshop instantly with exact GPS coordinates, reducing passenger rescue and repair times.

---

### 6. Authentic Maharashtra Fleet Representation
All data models and UI themes reflect official MSRTC operations:
* **Lal Pari (Ordinary / Parivartan):** Red livery (`#C0392B`), connecting rural villages.
* **Shivshahi:** Luxury AC seating (`#8E44AD`), connecting district headquarters.
* **Shivneri:** Premium Volvo/Scania coaches (`#2980B9`), operating on express corridors like Pune-Mumbai Dadar.
* **e-Shivai:** Electric AC coaches (`#27AE60`), operating on clean-energy green corridors.
