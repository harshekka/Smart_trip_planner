# 🗺️ Smart Trip Planner

A modern, AI-assisted travel planning web app that helps users find the **optimal route** between two locations — factoring in travel time, cost, air quality, and carbon emissions — all in a sleek, mobile-first UI.

---

## 🌟 What It Does

Enter a **start location** and a **destination**, and the app instantly generates a comparison of every viable transport option:

| Feature | Details |
|---|---|
| 🚗 **Multi-mode Routing** | Auto/Taxi, EV Car, Motorbike, Public Bus, Walking, Bicycle, Train, Flight |
| 🌿 **Eco Score** | Real-time AQI fetched along the route plus CO₂ emission estimates per mode |
| 💰 **Cost Estimates** | Estimated fare for each transport option in INR |
| 🏨 **Nearby Hotels** | Live hotel listings near the destination via Amadeus API |
| ✈️ **Flight Search** | Real flight offers from nearest airports via Amadeus API |
| 🚆 **Train Search** | Indian Railways train lookup between major city pairs |
| 🏛️ **Attractions** | Top tourist spots near the destination pulled from OpenStreetMap |
| 🌤️ **Live Weather** | Current temperature, humidity, wind & condition at the destination |
| 🗺️ **Interactive Map** | OpenStreetMap via Leaflet with polylines for each route option |

---

## 🛠️ Tech Stack

### Frontend
- **React 19** (with hooks: `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`)
- **Vite** — lightning-fast dev server and bundler
- **Leaflet + React Leaflet** — interactive maps with route polylines
- **Lucide React** — icon library
- **Axios** — HTTP requests to all external APIs
- Vanilla CSS with glassmorphism-inspired styling

### APIs Used
| API | Purpose | Key Required |
|---|---|---|
| [Nominatim (OpenStreetMap)](https://nominatim.org/) | Free geocoding (address → coordinates) | No |
| [OSRM](http://project-osrm.org/) | Free routing engine (driving, walking, cycling) | No |
| [WAQI](https://aqicn.org/api/) | Real-time Air Quality Index along routes | Yes (`VITE_WAQI_API_KEY`) |
| [OpenAQ v2](https://openaq.org/) | Fallback AQI from PM2.5 measurements | No |
| [Open-Meteo](https://open-meteo.com/) | Live weather at destination | No |
| [Amadeus](https://developers.amadeus.com/) | Hotels near destination & flight offers | Yes (`VITE_AMADEUS_API_KEY`, `VITE_AMADEUS_API_SECRET`) |
| [Overpass API](https://overpass-api.de/) | Tourist attractions near destination (OSM) | No |
| [Wikipedia REST API](https://www.mediawiki.org/wiki/API:REST_API) | Attraction photos | No |

---

## ⚙️ How It Works (Implementation Overview)

1. **Geocoding** — User-entered addresses are resolved to `{lat, lng}` using Nominatim with a 3-attempt fallback strategy (full address → simplified → first two parts).

2. **Routing** — OSRM fetches real road geometry for driving, walking, and cycling modes. Train and flight routes are estimated from the straight-line (Haversine) distance.

3. **AQI Lookup** — For each route's midpoint, the app queries WAQI (registered token → demo token → OpenAQ v2 as fallback) to get the real-time AQI score.

4. **Scoring & Tags** — Routes are scored across four dimensions (fastest, cheapest, cleanest air, shortest distance) and tagged accordingly. A user-selectable **route preference** (`balanced`, `speed`, `eco`, `cost`, `health`) determines the default highlighted route.

5. **CO₂ Emission** — Calculated per transport mode using standard grams/km emission rates (e.g., flight: 250 g/km, car: 120 g/km, EV/walk: 0 g/km).

6. **Hotels & Flights** — Fetched from Amadeus via OAuth2 client-credentials flow. Hotel pricing uses the Amadeus v3 hotel-offers endpoint; flights use the v2 flight-offers endpoint resolving nearest IATA codes from coordinates.

7. **Attractions** — Queried from the Overpass API (OpenStreetMap) for tourism/museum/monument nodes within 5 km of the destination. Wikipedia is used to fetch attractive images for each place.

8. **Weather** — Fetched from Open-Meteo using WMO weather codes, which also drive a dynamic background image (sun → clear sky photo, rain → rainy scene, etc.).

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/your-username/Smart-Trip-Planner.git
cd Smart-Trip-Planner
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root (or edit the existing one):

```env
VITE_WAQI_API_KEY=your_waqi_token_here
VITE_AMADEUS_API_KEY=your_amadeus_client_id
VITE_AMADEUS_API_SECRET=your_amadeus_client_secret
VITE_TRAIN_API_KEY=your_train_api_key
```

> **Note:** The app works without any API keys — it falls back to demo data for routes and skips hotel/flight/train searches gracefully.

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
Smart-Trip-Planner/
├── src/
│   ├── App.jsx        # Main app component — all routing, API calls, and UI
│   ├── App.css        # Component-level styles
│   ├── index.css      # Global styles and design tokens
│   └── main.jsx       # React entry point
├── public/            # Static assets
├── index.html         # HTML shell
├── vite.config.js     # Vite configuration
├── .env               # API keys (not committed)
└── package.json       # Dependencies
```

---

## 📸 Screenshots

> Run the app locally and search any two cities to see the full experience.

---

## 📄 License

MIT — free to use, modify, and distribute.
