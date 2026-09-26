# BusSaathi — MSRTC Smart Transport Management System
### Avishkar Research Convention Prototype

BusSaathi is a full-featured, zero-hardware transport management platform designed for the **Maharashtra State Road Transport Corporation (MSRTC)**. It provides real-time bus tracking for passengers, smartphone-based GPS broadcasting for conductors, and a live depot traffic command room for controllers.

---

## 📁 Project Directory Structure

```
Avishkar/
├── index.html                     # Main Portal / Landing Page (Avishkar overview & role launchpads)
├── AVISHKAR_RESEARCH_DEFENSE.md   # Research documentation, cost analysis & viva Q&A for judges
├── README.md                      # Quick start & deployment instructions
│
├── shared/
│   ├── firebase-config.js         # Firebase 10 SDK setup, RTDB & Auth helpers, fallback demo engine
│   ├── msrtc-data.js              # Maharashtra cities, coordinates, MSRTC routes & bus types
│   └── styles.css                 # Unified MSRTC brand styling (Red #C0392B, Amber, Green)
│
├── passenger/
│   ├── index.html                 # Passenger UI: Bus number & route search, schedule browser
│   ├── passenger.js               # Passenger logic: Leaflet map, OSRM highway routing, ETA calculator
│   └── passenger.css              # Passenger-specific map & card styling
│
├── conductor/
│   ├── index.html                 # Conductor Cockpit: Login, Start/Stop Trip GPS toggle, Issue & Revenue forms
│   ├── conductor.js               # Conductor logic: Geolocation watchPosition (15-20s), WakeLock, DB writes
│   └── conductor.css              # Mobile-optimized high-contrast controls for sunlight readability
│
└── controller/
    ├── index.html                 # Controller Command: Fleet overview KPI counters, Bus registration, Reports
    ├── controller.js              # Controller logic: onValue WebSocket listeners, breakdown resolver, revenue ledger
    └── controller.css             # Responsive desktop/tablet dashboard styles
```

---

## 🚀 Quick Start Guide

### Option A: Local Testing / Demonstration (Zero Setup Needed)
1. Simply double-click `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).
2. The application will launch immediately!
3. By default, it runs in **Avishkar Rehearsal / Offline Demo Mode** with pre-loaded Maharashtra routes, animated bus tracking, and sample data.

### Option B: Connecting Live Firebase Realtime Database & Authentication
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g. `bussaathi-msrtc`).
2. In the Firebase console:
   - Click **Build > Realtime Database** and click **Create Database** (Select *Start in Test Mode* for testing).
   - Click **Build > Authentication** and enable **Email/Password** sign-in provider.
3. In **Project Settings > General > Your Apps**, add a **Web App** `</>` and copy the `firebaseConfig` object.
4. Open `shared/firebase-config.js` in any text editor and paste your credentials:
   ```javascript
   export const firebaseConfig = {
     apiKey: "YOUR_COPIED_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
5. Click **"Seed Authentic MSRTC Data"** on the home page or in the Controller Dashboard to populate your live Firebase Realtime Database with one click!

---

## 🌐 Deploying to the Web

### Deploying to GitHub Pages (Free):
1. Push this folder to a GitHub repository.
2. In the GitHub repository, navigate to **Settings > Pages**.
3. Under **Branch**, select `main` (or `master`) and folder `/ (root)`, then click **Save**.
4. Your application will be live at `https://<username>.github.io/<repo-name>/`.

### Deploying to Firebase Hosting (Free):
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Login and initialize:
   ```bash
   firebase login
   firebase init hosting
   ```
   *(Select current directory as public folder `.`)*
3. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

---

## 🎓 Preparing for the Avishkar Viva
Before presenting to your college research professors and judges, review the comprehensive guide:
👉 **[AVISHKAR_RESEARCH_DEFENSE.md](AVISHKAR_RESEARCH_DEFENSE.md)**

It contains:
* The ₹37.5 Crores cost saving calculation (Smartphone vs AIS-140 GPS hardware).
* Technical justifications for choosing Firebase WebSockets over HTTP polling.
* How the 15–20 second throttling algorithm preserves phone battery life.
* Direct answers to the most common questions asked by Avishkar judges.
