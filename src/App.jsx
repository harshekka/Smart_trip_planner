import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Leaf, Clock, Map as MapIcon, TrendingDown, IndianRupee, Activity, Zap, Server, Code, Smartphone, Wind, Search, AlertCircle, MapPin, Car, Bus, PersonStanding, Bike, Train, Plane, Star, Building2, X } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './App.css';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// WAQI API token - get yours free at https://aqicn.org/data-platform/token/
const WAQI_TOKEN = import.meta.env.VITE_WAQI_API_KEY || '';

// Base styling for the container
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px'
};

const center = {
  lat: 37.7800,
  lng: -122.4100
};

// Premium dark theme matching the glassmorphism UI
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] }
];

const fallbackRoutes = [
  { id: 0, name: 'Balanced Path', timeText: '32 min', cost: '₹150', lengthKm: 5.2, timeSec: 1920, aqi: 'Moderate', aqiScore: 65, aqiBadge: 'medium', rec: 'Balanced', hotelPrice: '₹2,500/night', co2Emission: 624, emissionTag: { text: 'High Emission', emoji: '🔴' } },
  { id: 1, name: 'Direct Path', timeText: '28 min', cost: '₹250', lengthKm: 7.8, timeSec: 1680, aqi: 'High', aqiScore: 120, aqiBadge: 'high', rec: 'Fastest', hotelPrice: '₹2,500/night', co2Emission: 936, emissionTag: { text: 'High Emission', emoji: '🔴' } },
  { id: 2, name: 'Green Path', timeText: '40 min', cost: '₹80', lengthKm: 3.1, timeSec: 2400, aqi: 'Good', aqiScore: 30, aqiBadge: 'low', rec: 'Eco-Friendly', hotelPrice: '₹2,500/night', co2Emission: 0, emissionTag: { text: 'Low Emission', emoji: '🟢' } },
  { id: 3, name: '🚆 Train', timeText: '1h 20m', cost: '₹160', lengthKm: 82, timeSec: 4800, aqi: 'Good', aqiScore: 35, aqiBadge: 'low', rec: 'Balanced', hotelPrice: '₹2,500/night', co2Emission: 3280, emissionTag: { text: 'Low Emission', emoji: '🟢' } },
  { id: 4, name: '✈️ Flight', timeText: '2h 30m', cost: '₹3,200', lengthKm: 63, timeSec: 9000, aqi: 'Good', aqiScore: 20, aqiBadge: 'low', rec: 'Fastest', hotelPrice: '₹2,500/night', co2Emission: 15750, emissionTag: { text: 'High Emission', emoji: '🔴' } },
  { id: 5, name: '🏍️ Motorbike', timeText: '25 min', cost: '₹60', lengthKm: 7.8, timeSec: 1500, aqi: 'High', aqiScore: 120, aqiBadge: 'high', rec: 'Fastest', hotelPrice: '₹2,500/night', co2Emission: 468, emissionTag: { text: 'Medium Emission', emoji: '🟡' } },
  { id: 6, name: '🔋 EV Car', timeText: '32 min', cost: '₹100', lengthKm: 5.2, timeSec: 1920, aqi: 'Moderate', aqiScore: 65, aqiBadge: 'medium', rec: 'Eco-Friendly', hotelPrice: '₹2,500/night', co2Emission: 0, emissionTag: { text: 'Zero Emission', emoji: '🟢' } },
];

function App() {
  const [activeRouteId, setActiveRouteId] = useState(0);
  const [startAddr, setStartAddr] = useState('San Francisco City Hall');
  const [destAddr, setDestAddr] = useState('Ferry Building, San Francisco');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [routesData, setRoutesData] = useState(fallbackRoutes);
  const [directionsRes, setDirectionsRes] = useState(null);
  const [hotelsData, setHotelsData] = useState([]);
  const [isHotelsLoading, setIsHotelsLoading] = useState(false);
  const [flightOffers, setFlightOffers] = useState([]);
  const [isFlightsLoading, setIsFlightsLoading] = useState(false);
  const [flightSearchError, setFlightSearchError] = useState('');
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [trainOffers, setTrainOffers] = useState([]);
  const [isTrainsLoading, setIsTrainsLoading] = useState(false);
  const [trainSearchError, setTrainSearchError] = useState('');
  const [showTrainModal, setShowTrainModal] = useState(false);

  const [attractionsData, setAttractionsData] = useState([]);
  const [isAttractionsLoading, setIsAttractionsLoading] = useState(false);
  const [routePreference, setRoutePreference] = useState('balanced');
  const [weatherData, setWeatherData] = useState(null);

  // Apply weather-matched background image to the whole page
  useEffect(() => {
    const bgMap = {
      clear: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=1800&auto=format&fit=crop&q=80',
      cloudy: 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=1800&auto=format&fit=crop&q=80',
      rain: 'https://images.unsplash.com/photo-1529635696814-d26e4afe7ed0?w=1800&auto=format&fit=crop&q=80',
      snow: 'https://images.unsplash.com/photo-1511131341194-24e2eeeebb09?w=1800&auto=format&fit=crop&q=80',
      fog: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?w=1800&auto=format&fit=crop&q=80',
      thunder: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=1800&auto=format&fit=crop&q=80',
    };

    if (weatherData?.condition) {
      const img = bgMap[weatherData.condition] || bgMap.clear;
      document.body.style.backgroundImage = `url(${img})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center top';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundRepeat = 'no-repeat';
    } else {
      // Reset to default gradient when no weather loaded
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundAttachment = 'fixed';
    }

    return () => {
      document.body.style.backgroundImage = '';
    };
  }, [weatherData]);

  const getModeIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('ev car') || n.includes('ev')) return <Zap size={22} color="#10b981" />;
    if (n.includes('motorbike') || n.includes('motorcycle')) return <Bike size={22} color="#f97316" />;
    if (n.includes('taxi') || n.includes('auto') || n.includes('car')) return <Car size={22} color="#f59e0b" />;
    if (n.includes('bus')) return <Bus size={22} color="#3b82f6" />;
    if (n.includes('walk')) return <PersonStanding size={22} color="#10b981" />;
    if (n.includes('bicycle') || n.includes('bike') || n.includes('cycling')) return <Bike size={22} color="#06b6d4" />;
    if (n.includes('train')) return <Train size={22} color="#8b5cf6" />;
    if (n.includes('flight') || n.includes('plane')) return <Plane size={22} color="#ec4899" />;
    return <MapIcon size={22} color="#64748b" />;
  };

  const getAqiBadge = (score) => {
    if (score <= 50) return { text: 'Good', type: 'low' };
    if (score <= 100) return { text: 'Moderate', type: 'medium' };
    return { text: 'Poor/High', type: 'high' };
  };

  // Hotel price lookup by city keyword (avg per night in INR)
  const getHotelPrice = (destName) => {
    const d = destName.toLowerCase();
    if (d.includes('mumbai')) return '₹4,500–5,500/night';
    if (d.includes('delhi') || d.includes('new delhi')) return '₹3,800–5,000/night';
    if (d.includes('bangalore') || d.includes('bengaluru')) return '₹3,500–4,500/night';
    if (d.includes('hyderabad')) return '₹3,000–4,200/night';
    if (d.includes('chennai')) return '₹3,200–4,000/night';
    if (d.includes('kolkata')) return '₹2,800–3,800/night';
    if (d.includes('jaipur')) return '₹2,500–3,500/night';
    if (d.includes('goa')) return '₹5,000–8,000/night';
    if (d.includes('pune')) return '₹2,800–3,800/night';
    if (d.includes('ahmedabad')) return '₹2,200–3,200/night';
    if (d.includes('agra')) return '₹2,000–3,500/night';
    if (d.includes('varanasi')) return '₹1,800–3,000/night';
    if (d.includes('san francisco') || d.includes('sf')) return '$150–250/night';
    if (d.includes('new york') || d.includes('nyc')) return '$200–350/night';
    if (d.includes('london')) return '£130–220/night';
    return '₹2,500–4,000/night'; // default fallback
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!startAddr || !destAddr) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      // Smart geocoder: tries full address, then simplified, then first 2 parts
      const smartGeocode = async (addr) => {
        const tryNominatim = async (query) => {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`,
            { headers: { 'Accept-Language': 'en' }, timeout: 8000 }
          );
          return res.data && res.data.length > 0 ? res.data[0] : null;
        };

        // Attempt 1: full address as-is
        let result = await tryNominatim(addr);
        if (result) return result;

        // Attempt 2: simplified — locality + mid-part + country
        const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 3) {
          const simplified = `${parts[0]}, ${parts[Math.floor(parts.length / 2)]}, ${parts[parts.length - 1]}`;
          result = await tryNominatim(simplified);
          if (result) return result;
        }

        // Attempt 3: just first 2 meaningful parts (e.g. "Kokar Chowk, Ranchi")
        if (parts.length >= 2) {
          result = await tryNominatim(`${parts[0]}, ${parts[1]}`);
          if (result) return result;
        }

        return null;
      };

      const [startGeo, destGeo] = await Promise.all([
        smartGeocode(startAddr),
        smartGeocode(destAddr),
      ]);

      if (!startGeo) throw new Error(`Could not find starting location: "${startAddr.split(',')[0].trim()}". Try a well-known landmark or area name.`);
      if (!destGeo) throw new Error(`Could not find destination: "${destAddr.split(',')[0].trim()}". Try a well-known landmark or area name.`);

      const startCoord = { lat: parseFloat(startGeo.lat), lng: parseFloat(startGeo.lon) };
      const destCoord = { lat: parseFloat(destGeo.lat), lng: parseFloat(destGeo.lon) };

      // 2. Fetch directions using OSRM for all modes concurrently
      const fetchRoute = async (mode) => {
        const osrmUrl = `https://router.project-osrm.org/route/v1/${mode}/${startCoord.lng},${startCoord.lat};${destCoord.lng},${destCoord.lat}?overview=full&geometries=geojson`;
        const res = await axios.get(osrmUrl);
        if (res.data && res.data.code === 'Ok' && res.data.routes && res.data.routes.length > 0) {
          return { mode, route: res.data.routes[0] };
        }
        throw new Error(`No route for ${mode}`);
      };

      const results = await Promise.allSettled([
        fetchRoute('driving'),
        fetchRoute('walking'),
        fetchRoute('cycling')
      ]);

      setDirectionsRes({ start: startCoord, dest: destCoord });

      // Helper: fetch real-time AQI from WAQI API (registered token → demo → OpenAQ v2)
      const fetchAqi = async (lat, lng) => {
        const tryWaqi = async (token) => {
          const res = await axios.get(
            `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`,
            { timeout: 5000 }
          );
          const aqi = res.data?.data?.aqi;
          if (typeof aqi === 'number' && aqi > 0) return aqi;
          return null;
        };

        // 1. Try registered WAQI token (real-time, global coverage)
        if (WAQI_TOKEN && WAQI_TOKEN !== 'YOUR_WAQI_API_KEY_HERE') {
          try { const r = await tryWaqi(WAQI_TOKEN); if (r) return r; } catch { /* next */ }
        }

        // 2. Try WAQI demo token (works for most major cities)
        try { const r = await tryWaqi('demo'); if (r) return r; } catch { /* next */ }

        // 3. Try OpenAQ v2 — PM2.5 → AQI using EPA breakpoints (no key needed)
        try {
          const res = await axios.get(
            `https://api.openaq.org/v2/latest?coordinates=${lat},${lng}&radius=30000&parameter=pm25&limit=1&sort=desc`,
            { timeout: 5000, headers: { Accept: 'application/json' } }
          );
          const pm25 = res.data?.results?.[0]?.measurements?.find(m => m.parameter === 'pm25')?.value;
          if (pm25 != null) {
            const bp = [
              [0, 12, 0, 50], [12.1, 35.4, 51, 100],
              [35.5, 55.4, 101, 150], [55.5, 150.4, 151, 200],
              [150.5, 250.4, 201, 300], [250.5, 500.4, 301, 500],
            ];
            for (const [cLo, cHi, iLo, iHi] of bp) {
              if (pm25 >= cLo && pm25 <= cHi)
                return Math.round(((iHi - iLo) / (cHi - cLo)) * (pm25 - cLo) + iLo);
            }
          }
        } catch { /* fall through */ }

        return 50; // last-resort default
      };

      const formatTime = (secs) => {
        const mins = Math.round(secs / 60);
        return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
      };

      const allPaths = [];
      let globalId = 0;

      for (const res of results) {
        if (res.status === 'fulfilled') {
          const { mode, route } = res.value;

          let pathTimeSec = route.duration || 0;
          let pathDistMeters = route.distance || 0;
          let distKm = pathDistMeters / 1000;

          const coords = route.geometry.coordinates;
          const midpointIndex = Math.floor(coords.length / 2);
          const midpt = coords[midpointIndex] || [startCoord.lng, startCoord.lat];
          const aqiScore = await fetchAqi(midpt[1], midpt[0]);

          if (mode === 'driving') {
            const drivingKm = distKm; // Use distKm from OSRM result
            if (drivingKm <= 500) { // Driving not realistic above 500km for local search
              allPaths.push({
                id: globalId++, name: 'Auto / Taxi',
                timeText: formatTime(pathTimeSec), timeSec: pathTimeSec,
                lengthKm: drivingKm, cost: `₹${Math.max(50, Math.round(drivingKm * 15))}`,
                aqiScore: aqiScore, coordinates: coords,
                objective: 'fastest' // Assuming driving is often fastest
              });
              allPaths.push({
                id: globalId++, name: 'EV Car',
                timeText: formatTime(pathTimeSec), timeSec: pathTimeSec,
                lengthKm: drivingKm, cost: `₹${Math.max(40, Math.round(drivingKm * 10))}`,
                aqiScore: aqiScore, coordinates: coords,
                objective: 'eco'
              });
              allPaths.push({
                id: globalId++, name: 'Motorbike',
                timeText: formatTime(pathTimeSec * 0.85), timeSec: pathTimeSec * 0.85,
                lengthKm: drivingKm, cost: `₹${Math.max(20, Math.round(drivingKm * 5))}`,
                aqiScore: aqiScore, coordinates: coords,
                objective: 'fastest'
              });
            }
            if (drivingKm <= 1000) { // Bus might cover longer distances than taxi
              allPaths.push({
                id: globalId++, name: 'Public Bus',
                timeText: formatTime(pathTimeSec * 1.5), timeSec: pathTimeSec * 1.5, // Bus is typically slower
                lengthKm: drivingKm, cost: `₹20`,
                aqiScore: aqiScore, coordinates: coords,
                objective: 'eco' // Bus is often more eco-friendly than taxi per person
              });
            }

          } else if (mode === 'walking') {
            const walkKm = distKm;
            if (walkKm <= 15) { // Walking not realistic above 15km
              const walkSec = (walkKm / 6.4) * 3600; // Fixed walking speed of 6.4 km/h
              allPaths.push({
                id: globalId++, name: 'Walking',
                timeText: formatTime(walkSec), timeSec: walkSec,
                lengthKm: walkKm, cost: `₹0`,
                aqiScore: aqiScore, coordinates: coords,
                objective: 'eco' // Walking is inherently eco-friendly
              });
            }

          } else if (mode === 'cycling') {
            const cycleKm = distKm;
            if (cycleKm <= 50) { // Cycling not realistic above 50km
              const cycleSec = (cycleKm / 20) * 3600; // Fixed cycling speed of 20 km/h
              allPaths.push({
                id: globalId++, name: 'Bicycle',
                timeText: formatTime(cycleSec), timeSec: cycleSec,
                lengthKm: cycleKm, cost: `₹0`,
                aqiScore: aqiScore, coordinates: coords,
                objective: 'shortest' // Cycling is often chosen for shortest path or exercise
              });
            }
          }
        }
      }

      // --- Train & Flight: estimated from straight-line (Haversine) distance ---
      const toRad = (deg) => (deg * Math.PI) / 180;
      const haversineKm = (a, b) => {
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.asin(Math.sqrt(h));
      };
      const straightKm = haversineKm(startCoord, destCoord);
      // Straight line coords for polyline rendering
      const straightLineCoords = [[startCoord.lng, startCoord.lat], [destCoord.lng, destCoord.lat]];
      const destAqi = await fetchAqi(destCoord.lat, destCoord.lng);

      // Train: avg 80 km/h, rail distance ~1.3× straight line
      if (straightKm >= 20) { // Train not realistic for short intra-city trips
        const trainDistKm = straightKm * 1.3;
        const trainTimeSec = (trainDistKm / 80) * 3600;
        allPaths.push({
          id: globalId++,
          name: '🚆 Train',
          timeText: formatTime(trainTimeSec),
          timeSec: trainTimeSec,
          lengthKm: trainDistKm,
          cost: `₹${Math.max(100, Math.round(trainDistKm * 2))}`,
          aqiScore: destAqi,
          coordinates: straightLineCoords
        });
      }

      // Flight: avg 800 km/h + 1.5h airport overhead
      if (straightKm >= 200) { // Flights require significant minimum distance
        const flightTimeSec = (straightKm / 800) * 3600 + 5400;
        const flightCost = Math.max(3000, Math.round(straightKm * 5));
        allPaths.push({
          id: globalId++,
          name: '✈️ Flight',
          timeText: formatTime(flightTimeSec),
          timeSec: flightTimeSec,
          lengthKm: straightKm,
          cost: `₹${flightCost.toLocaleString('en-IN')}`,
          aqiScore: destAqi,
          coordinates: straightLineCoords
        });
      }

      if (allPaths.length === 0) {
        throw new Error('No valid routes could be generated for any transportation mode between these points.');
      }

      // Extract numeric cost for comparison (strip currency symbol & commas)
      const numCost = (r) => parseFloat(r.cost.replace(/[^0-9.]/g, '')) || 0;

      const sortedByTime = [...allPaths].sort((a, b) => a.timeSec - b.timeSec);
      const sortedByAQI = [...allPaths].sort((a, b) => a.aqiScore - b.aqiScore);
      const sortedByCost = [...allPaths].sort((a, b) => numCost(a) - numCost(b));
      const sortedByDist = [...allPaths].sort((a, b) => (a.lengthKm || 0) - (b.lengthKm || 0));

      const fastestId = sortedByTime[0]?.id;
      const cleanestId = sortedByAQI[0]?.id;
      const cheapestId = sortedByCost[0]?.id;
      const shortestId = sortedByDist[0]?.id;

      const processedRoutes = allPaths.map(r => {
        const aqiMeta = getAqiBadge(r.aqiScore);
        const hotelPrice = getHotelPrice(destAddr);

        const tags = [];
        if (fastestId !== undefined && r.id === fastestId) tags.push('Fastest');
        if (cleanestId !== undefined && r.id === cleanestId) tags.push('Eco-Friendly');
        if (cheapestId !== undefined && r.id === cheapestId) tags.push('Cheapest');
        if (shortestId !== undefined && r.id === shortestId) tags.push('Shortest');

        // legacy rec string for map colouring
        const rec = tags.includes('Eco-Friendly') ? 'Eco-Friendly'
          : tags.includes('Fastest') ? 'Fastest'
            : tags.includes('Cheapest') ? 'Cheapest'
              : tags.includes('Shortest') ? 'Shortest'
                : 'Balanced';

        // CO2 Emission Calculation
        let emissionRate = 0; // grams per km
        let emoji = '';
        let tagText = 'Unknown';
        const mode = r.name.toLowerCase();

        if (mode.includes('ev car') || mode.includes('ev')) {
          emissionRate = 0;
          emoji = '🟢';
          tagText = 'Zero Emission';
        } else if (mode.includes('flight') || mode.includes('plane') || mode.includes('air')) {
          emissionRate = 250;
          emoji = '🔴';
          tagText = 'High Emission';
        } else if (mode.includes('car') || mode.includes('auto') || mode.includes('taxi')) {
          emissionRate = 120;
          emoji = '🔴';
          tagText = 'High Emission';
        } else if (mode.includes('bus') || mode.includes('motorbike')) {
          emissionRate = 60;
          emoji = '🟡';
          tagText = 'Medium Emission';
        } else if (mode.includes('train')) {
          emissionRate = 40;
          emoji = '🟢';
          tagText = 'Low Emission';
        } else if (mode.includes('walk') || mode.includes('bicycle') || mode.includes('bike')) {
          emissionRate = 0;
          emoji = '🟢';
          tagText = 'Low Emission';
        }

        const co2Emission = Math.round((r.lengthKm || 0) * emissionRate);
        const emissionTag = { text: tagText, emoji: emoji };

        return {
          ...r,
          aqi: aqiMeta.text, aqiBadge: aqiMeta.type,
          co2Emission,
          emissionTag,
          hotelPrice,
          tags, rec
        };
      });

      setRoutesData(processedRoutes);

      // Select the top route based on the user's chosen preference
      const prefRoute = (() => {
        switch (routePreference) {
          case 'speed': return [...processedRoutes].sort((a, b) => a.timeSec - b.timeSec)[0];
          case 'eco': return [...processedRoutes].sort((a, b) => (a.co2Emission || 0) - (b.co2Emission || 0))[0];
          case 'cost': return [...processedRoutes].sort((a, b) => (parseFloat(a.cost.replace(/[^0-9.]/g, '')) || 0) - (parseFloat(b.cost.replace(/[^0-9.]/g, '')) || 0))[0];
          case 'health': return [...processedRoutes].sort((a, b) => (a.aqiScore || 999) - (b.aqiScore || 999))[0];
          default: return processedRoutes[0]; // balanced: first scored route
        }
      })();
      setActiveRouteId(prefRoute?.id ?? processedRoutes[0].id);

      // 3. Fetch Hotels using Amadeus API
      setIsHotelsLoading(true);
      try {
        const AMADEUS_KEY = import.meta.env.VITE_AMADEUS_API_KEY;
        const AMADEUS_SECRET = import.meta.env.VITE_AMADEUS_API_SECRET;
        if (AMADEUS_KEY && AMADEUS_SECRET) {
          const tokenRes = await axios.post(
            'https://test.api.amadeus.com/v1/security/oauth2/token',
            new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: AMADEUS_KEY,
              client_secret: AMADEUS_SECRET
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
          if (tokenRes.data && tokenRes.data.access_token) {
            const hotelsRes = await axios.get(
              `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode?latitude=${destCoord.lat}&longitude=${destCoord.lng}&radius=5&radiusUnit=KM&ratings=3,4,5`,
              { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }, timeout: 6000 }
            );
            const rawHotels = hotelsRes.data?.data?.slice(0, 4) || [];

            // Fetch live prices individually (Amadeus Sandbox bulk queries fail if ANY hotel lacks inventory)
            const pricedHotels = await Promise.all(rawHotels.map(async (h) => {
              try {
                const offerRes = await axios.get(
                  `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${h.hotelId}&adults=1`,
                  { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }, timeout: 4000 }
                );
                if (offerRes.data?.data?.[0]?.offers?.[0]?.price) {
                  h.livePrice = offerRes.data.data[0].offers[0].price;
                }
              } catch (err) {
                h.livePriceError = true; // Expected in Sandbox environment
              }
              return h;
            }));

            setHotelsData(pricedHotels);
          }
        }
      } catch (e) {
        console.warn("Hotel fetch failed:", e);
        setHotelsData([]);
      } finally {
        setIsHotelsLoading(false);
      }

      // 4. Fetch Tourist Attractions using OpenStreetMap Overpass API
      const fetchAttractions = async (lat, lng) => {
        setIsAttractionsLoading(true);
        try {
          // Query to find top attractions/museums/historic places within 5km
          const query = `
          [out:json][timeout:15];
          (
            node["tourism"="attraction"](around:5000,${lat},${lng});
            node["tourism"="museum"](around:5000,${lat},${lng});
            node["historic"="monument"](around:5000,${lat},${lng});
          );
          out center 6;
        `;
          const res = await axios.post('https://overpass-api.de/api/interpreter', query, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000
          });

          if (res.data?.elements) {
            const attractions = res.data.elements
              .filter(el => el.tags && el.tags.name)
              .map(el => ({
                id: el.id,
                name: el.tags.name,
                type: el.tags.tourism || el.tags.historic || 'attraction',
                lat: el.lat,
                lon: el.lon,
                // Approx distance logic could be added, but skipping for simplicity
              }));

            // Deduplicate by name and slice to Top 4
            const uniqueAttractions = Array.from(new Map(attractions.map(item => [item.name, item])).values()).slice(0, 4);

            // Curated list of premium travel/museum images for places without Wikipedia photos
            const fallbackImages = [
              'https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=800&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1549896796-03f90b3cd691?q=80&w=800&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1565552637207-68db0bfd7a04?q=80&w=800&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1533106958148-da0d0ec1b681?q=80&w=800&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?q=80&w=800&auto=format&fit=crop',
            ];

            // Fetch images via Wikipedia REST API (with search resolution and fallbacks)
            const attractionsWithImages = await Promise.all(uniqueAttractions.map(async (place) => {
              let fetchedImg = null;
              try {
                // 1. Search Wikipedia first so we don't rely on exact OSM name matching
                const searchRes = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(place.name)}&utf8=&format=json&origin=*`, { timeout: 3000 });
                if (searchRes.data?.query?.search?.length > 0) {
                  const title = searchRes.data.query.search[0].title;
                  // 2. Fetch the page summary for the exact title
                  const wikiRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { timeout: 3000 });
                  if (wikiRes.data && (wikiRes.data.thumbnail || wikiRes.data.originalimage)) {
                    fetchedImg = wikiRes.data.thumbnail?.source || wikiRes.data.originalimage?.source;
                  }
                }
              } catch (e) {
                // Silently ignore wiki failure 
              }
              // 3. Fallback to a high-quality relevant image based on the node ID modulo
              place.imageUrl = fetchedImg || fallbackImages[place.id % fallbackImages.length];
              return place;
            }));

            setAttractionsData(attractionsWithImages);
          }
        } catch (err) {
          console.warn("Attractions fetch failed:", err);
          setAttractionsData([]);
        } finally {
          setIsAttractionsLoading(false);
        }
      };

      fetchAttractions(destCoord.lat, destCoord.lng);

      // 5. Fetch Real-time Weather using Open-Meteo (free, no API key required)
      try {
        const wRes = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${destCoord.lat}&longitude=${destCoord.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh&temperature_unit=celsius`,
          { timeout: 5000 }
        );
        const c = wRes.data?.current;
        if (c) {
          // WMO Weather interpretation codes → label
          const wmoLabel = (code) => {
            if (code === 0) return { label: 'Clear', icon: '☀️', condition: 'clear' };
            if (code <= 2) return { label: 'Partly Cloudy', icon: '⛅', condition: 'cloudy' };
            if (code === 3) return { label: 'Overcast', icon: '☁️', condition: 'cloudy' };
            if (code <= 49) return { label: 'Foggy', icon: '🌫️', condition: 'fog' };
            if (code <= 67) return { label: 'Rainy', icon: '🌧️', condition: 'rain' };
            if (code <= 77) return { label: 'Snowy', icon: '🌨️', condition: 'snow' };
            if (code <= 82) return { label: 'Rain Showers', icon: '🌦️', condition: 'rain' };
            if (code <= 86) return { label: 'Snow Showers', icon: '❄️', condition: 'snow' };
            if (code <= 99) return { label: 'Thunderstorm', icon: '⛈️', condition: 'thunder' };
            return { label: 'Unknown', icon: '🌡️', condition: 'clear' };
          };
          const meta = wmoLabel(c.weather_code);
          setWeatherData({
            temp: Math.round(c.temperature_2m),
            humidity: c.relative_humidity_2m,
            wind: Math.round(c.wind_speed_10m),
            condition: meta.condition,
            label: meta.label,
            icon: meta.icon,
          });
        }
      } catch (_) { /* weather is optional, silently skip */ }

    } catch (err) {
      console.warn(err);
      setErrorMsg(err.message || 'Failed to search routes. Reverting to demonstration mode.');
      setRoutesData(fallbackRoutes); // Reset to mock data for demo
      setDirectionsRes(null);
      setHotelsData([]);
      setAttractionsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFlights = async (startCoord, destCoord) => {
    setIsFlightsLoading(true);
    setFlightSearchError('');
    setShowFlightModal(true);
    setFlightOffers([]);

    try {
      const AMADEUS_KEY = import.meta.env.VITE_AMADEUS_API_KEY;
      const AMADEUS_SECRET = import.meta.env.VITE_AMADEUS_API_SECRET;

      if (!AMADEUS_KEY || !AMADEUS_SECRET) {
        throw new Error("Amadeus API Credentials are missing in .env");
      }

      // 1. Get Token
      const tokenRes = await axios.post(
        'https://test.api.amadeus.com/v1/security/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: AMADEUS_KEY,
          client_secret: AMADEUS_SECRET
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const token = tokenRes.data.access_token;

      // 2. Resolve start coordinate to nearest IATA
      const originRes = await axios.get(
        `https://test.api.amadeus.com/v1/reference-data/locations/airports?latitude=${startCoord.lat}&longitude=${startCoord.lng}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 6000 }
      );
      const originIata = originRes.data?.data?.[0]?.iataCode;

      // 3. Resolve dest coordinate to nearest IATA
      const destRes = await axios.get(
        `https://test.api.amadeus.com/v1/reference-data/locations/airports?latitude=${destCoord.lat}&longitude=${destCoord.lng}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 6000 }
      );
      const destIata = destRes.data?.data?.[0]?.iataCode;

      if (!originIata || !destIata) {
        throw new Error("Could not find nearby airports for the given coordinates.");
      }

      // 4. Fetch Flight Offers (departure 2 days from today to ensure sandbox has some data)
      const depDate = new Date();
      depDate.setDate(depDate.getDate() + 2);
      const dateStr = depDate.toISOString().split('T')[0];

      const flightRes = await axios.get(
        `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originIata}&destinationLocationCode=${destIata}&departureDate=${dateStr}&adults=1&currencyCode=INR&nonStop=false&max=5`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
      );

      setFlightOffers(flightRes.data?.data || []);
      if (!flightRes.data?.data || flightRes.data.data.length === 0) {
        setFlightSearchError(`No flights found from ${originIata} to ${destIata} on ${dateStr} in the Sandbox environment.`);
      }

    } catch (err) {
      console.warn("Flight fetch failed:", err);
      setFlightSearchError(err.message || 'Failed to fetch actual flights. Try another route or check API.');
    } finally {
      setIsFlightsLoading(false);
    }
  };

  const fetchTrains = async (startCity, destCity) => {
    setIsTrainsLoading(true);
    setTrainSearchError('');
    setShowTrainModal(true);
    setTrainOffers([]);

    try {
      const TRAIN_API_KEY = import.meta.env.VITE_TRAIN_API_KEY;
      if (!TRAIN_API_KEY) {
        throw new Error("Train API Credentials are missing in .env");
      }

      // 1. Basic Station Code Mapping (Fallback/Mock for Indian Cities)
      const getStationCode = (city) => {
        const c = city.toLowerCase();
        if (c.includes('mumbai')) return 'BCT';
        if (c.includes('delhi')) return 'NDLS';
        if (c.includes('bangalore') || c.includes('bengaluru')) return 'SBC';
        if (c.includes('hyderabad')) return 'HYB';
        if (c.includes('chennai')) return 'MAS';
        if (c.includes('kolkata')) return 'HWH';
        if (c.includes('jaipur')) return 'JP';
        if (c.includes('goa')) return 'MAO'; // Madgaon
        if (c.includes('pune')) return 'PUNE';
        if (c.includes('ahmedabad')) return 'ADI';
        if (c.includes('agra')) return 'AGC';
        if (c.includes('varanasi')) return 'BSB';
        return null;
      };

      const originCode = getStationCode(startCity);
      const destCode = getStationCode(destCity);

      if (!originCode || !destCode) {
        throw new Error(`Could not map "${startCity}" or "${destCity}" to an Indian Railway station code. Please try major Indian cities.`);
      }

      // 2. Fetch Trains from RapidAPI IRCTC endpoint
      // Using a publicly available endpoint format for the key provided
      const depDate = new Date();
      depDate.setDate(depDate.getDate() + 2); // Train booking often requires future dates
      const dateStr = depDate.toISOString().split('T')[0];

      // Note: We use irctc1.p.rapidapi.com as an example standard mapping for this key class.
      const response = await axios.get(
        'https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations',
        {
          params: {
            fromStationCode: originCode,
            toStationCode: destCode,
            dateOfJourney: dateStr
          },
          headers: {
            'X-RapidAPI-Key': TRAIN_API_KEY,
            'X-RapidAPI-Host': 'irctc1.p.rapidapi.com'
          },
          timeout: 10000
        }
      );

      // Map the IRCTC data format into a consistent expected array shape for UI
      const trains = response.data?.data || [];
      const mappedOffers = trains.map(t => ({
        id: t.train_number,
        trainName: t.train_name,
        trainNumber: t.train_number,
        departureTime: t.from_sta,
        arrivalTime: t.to_sta,
        duration: t.duration,
        fromStation: t.from_station_name || originCode,
        toStation: t.to_station_name || destCode,
        // Mocking price based on distance logic dynamically or using any available class price
        price: '₹' + Math.max(500, Math.floor(Math.random() * 2000 + 800)).toLocaleString('en-IN')
      }));

      setTrainOffers(mappedOffers);
      if (mappedOffers.length === 0) {
        setTrainSearchError(`No direct trains found between ${originCode} and ${destCode} on ${dateStr}. Try another major city route.`);
      }

    } catch (err) {
      console.warn("Train fetch failed:", err);
      // Fallback for demo when RapidAPI is exhausted/sandbox fails on specific keys
      setTrainSearchError(err.response?.data?.message || err.message || 'Failed to fetch actual trains. The API key might be expired, rate-limited, or the route is invalid.');
    } finally {
      setIsTrainsLoading(false);
    }
  };

  const activeRouteObj = useMemo(() => routesData.find(r => r.id === activeRouteId) || routesData[0], [routesData, activeRouteId]);

  return (
    <>
      <nav className="navbar">
        <div className="logo">
          <Leaf className="gradient-text green" />
          <span>Smart<span className="gradient-text green">Eco</span>Route</span>
        </div>
        <div className="nav-links">
          <a href="#solution" className="nav-link">Solution</a>
          <a href="#dashboard" className="nav-link">Dashboard</a>
          <a href="#tech" className="nav-link">Tech Stack</a>
        </div>
      </nav>

      <main className="app-container animate-fade-in">
        {/* HERO SECTION */}
        <section className="hero" style={{ paddingBottom: '2rem' }}>
          <div className="badge badge-low animate-fade-in stagger-1">OpenStreetMap & WAQI Powered</div>
          <h1 className="animate-fade-in stagger-2">
            Smart Multi-Modal <br />
            <span className="gradient-text green">Eco Route Planner</span>
          </h1>
          <p className="animate-fade-in stagger-3">
            An intelligent routing system that balances Time, Cost, and Pollution Exposure to suggest cleaner, healthier paths for urban commuters.
          </p>
        </section>

        {/* ROUTE PREFERENCE PILLS */}
        <section className="animate-fade-in stagger-4" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { key: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'All factors' },
              { key: 'speed', label: 'Speed', icon: '⚡', desc: 'Fastest route' },
              { key: 'eco', label: 'Eco', icon: '🌿', desc: 'Lowest CO₂' },
              { key: 'cost', label: 'Cost', icon: '💰', desc: 'Cheapest fare' },
              { key: 'health', label: 'Health', icon: '🫁', desc: 'Lowest pollution' },
            ].map(p => {
              const active = routePreference === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  title={p.desc}
                  onClick={() => setRoutePreference(p.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1.1rem', borderRadius: '999px', fontWeight: 600,
                    fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
                    border: active ? '2px solid #10b981' : '2px solid rgba(0,0,0,0.1)',
                    background: active ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.7)',
                    color: active ? '#10b981' : 'var(--text-muted)',
                    boxShadow: active ? '0 2px 12px rgba(16,185,129,0.2)' : 'none',
                    transform: active ? 'translateY(-1px)' : 'none',
                  }}
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* SEARCH FORM */}
        <section className="search-section animate-fade-in stagger-4" style={{ display: 'flex', justifyContent: 'center', marginBottom: '4rem' }}>
          <form className="glass-panel" onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '800px', flexWrap: 'wrap', alignItems: 'flex-end', padding: '1.5rem 2rem' }}>
            <LocationInput
              label="Starting Point"
              value={startAddr}
              onChange={setStartAddr}
              placeholder="Enter start location..."
              icon={<MapPin size={18} className="input-icon" />}
            />
            <LocationInput
              label="Destination"
              value={destAddr}
              onChange={setDestAddr}
              placeholder="Enter destination..."
              icon={<MapIcon size={18} className="input-icon" />}
            />
            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ height: '48px', padding: '0 2rem', marginTop: '1.5rem', marginLeft: 'auto' }}>
              {isLoading ? <span className="spinner"></span> : <><Search size={18} /> Find Route</>}
            </button>
          </form>
        </section>

        {/* Dashboard Error Alert */}
        {errorMsg && (
          <div className="animate-fade-in" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', color: '#b45309', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '1200px', margin: '0 auto 2rem' }}>
            <AlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* DASHBOARD PREVIEW */}
        <section id="dashboard" className="section" style={{ paddingTop: '2rem' }}>
          <h2 className="section-title">Live Route Analysis <br /><span className="gradient-text" style={{ fontSize: '1.2rem', display: 'block', marginTop: '0.5rem' }}>Multi-Objective Route Scoring</span></h2>

          <div className="dashboard-container">
            <div className="glass-panel">
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapIcon className="gradient-text" /> Route Comparison
              </h3>

              <div className="table-wrapper">
                <table className="route-table">
                  <thead>
                    <tr>
                      <th>Mode</th>
                      <th>Distance</th>
                      <th>Time</th>
                      <th>Travel Cost</th>
                      <th>Live AQI</th>
                      <th>CO₂ Emission</th>
                      <th>Rec.</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routesData.map((route) => (
                      <tr
                        key={route.id}
                        className={activeRouteId === route.id ? 'active-row' : ''}
                        onClick={() => setActiveRouteId(route.id)}
                      >
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            {getModeIcon(route.name)}
                            <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {route.name.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '')}
                            </span>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{route.lengthKm != null ? `${Number(route.lengthKm).toFixed(1)} km` : '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} />{route.timeText}</div></td>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><IndianRupee size={14} />{route.cost}</div></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`badge badge-${route.aqiBadge}`}>{route.aqi}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({route.aqiScore})</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                            <div>
                              <span>CO₂ Emission: </span>
                              <span style={{ fontWeight: '600' }}>{route.co2Emission || 0} g</span>
                            </div>
                            <div>
                              <span>Tag: </span>
                              <span className={`badge badge-${route.emissionTag?.emoji === '🔴' ? 'high' : route.emissionTag?.emoji === '🟡' ? 'medium' : 'low'}`} style={{ padding: '0.2rem 0.5rem', fontWeight: 'bold' }}>
                                {route.emissionTag?.emoji || '🟢'} {route.emissionTag?.text || 'Low Emission'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>{route.rec}</td>
                        <td>
                          {!route.name.toLowerCase().includes('walk') && !route.name.toLowerCase().includes('bicycle') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (route.name.includes('Flight')) {
                                  if (directionsRes) fetchFlights(directionsRes.start, directionsRes.dest);
                                } else if (route.name.includes('Train')) {
                                  fetchTrains(startAddr, destAddr);
                                } else {
                                  alert(`Booking integration for ${route.name.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '')} is coming soon!`);
                                }
                              }}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
                            >
                              Book
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel map-mockup" style={{ padding: 0, height: '100%', position: 'relative' }}>
              <MapContainer
                center={[center.lat, center.lng]}
                zoom={12}
                className="map-container"
                style={{ height: '100%', width: '100%', borderRadius: '12px', zIndex: 1 }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {directionsRes && activeRouteObj?.coordinates && (
                  <>
                    <Polyline
                      positions={activeRouteObj.coordinates.map(coord => [coord[1], coord[0]])} // GeoJSON is [lng, lat], Leaflet is [lat, lng]
                      pathOptions={{
                        color: activeRouteObj?.rec === 'Eco-Friendly' ? '#10b981' : activeRouteObj?.rec === 'Fastest' ? '#f59e0b' : '#3b82f6',
                        weight: 6,
                        opacity: 0.9
                      }}
                    />
                    <Marker position={[directionsRes.start.lat, directionsRes.start.lng]}>
                      <Popup>Start: {startAddr}</Popup>
                    </Marker>
                    <Marker position={[directionsRes.dest.lat, directionsRes.dest.lng]}>
                      <Popup>Destination: {destAddr}</Popup>
                    </Marker>
                    <MapBoundsUpdater start={directionsRes.start} dest={directionsRes.dest} activeRouteCoords={activeRouteObj.coordinates} />
                  </>
                )}
              </MapContainer>

              <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.95)', padding: '1rem', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(79,110,247,0.15)', textAlign: 'center', minWidth: '220px', boxShadow: '0 8px 24px rgba(79,110,247,0.12)' }}>
                <MapIcon size={24} className={activeRouteObj?.rec === 'Eco-Friendly' ? 'gradient-text green' : activeRouteObj?.rec === 'Fastest' ? 'gradient-text' : ''} style={{ margin: '0 auto 0.5rem', color: '#3b82f6' }} />
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>Viewing {activeRouteObj?.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Live AQI Score: {activeRouteObj?.aqiScore} • {activeRouteObj?.rec}</div>
              </div>
            </div>
          </div>

          {/* REAL-TIME WEATHER BANNER */}
          {directionsRes && weatherData && (() => {
            // High-quality Unsplash images mapped to each weather condition (always load reliably)
            const bgMap = {
              clear: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=1400&auto=format&fit=crop&q=80',  // sunny blue sky
              cloudy: 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=1400&auto=format&fit=crop&q=80',  // cloudy sky
              rain: 'https://images.unsplash.com/photo-1529635696814-d26e4afe7ed0?w=1400&auto=format&fit=crop&q=80',  // rainy city
              snow: 'https://images.unsplash.com/photo-1511131341194-24e2eeeebb09?w=1400&auto=format&fit=crop&q=80',  // snowfall
              fog: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?w=1400&auto=format&fit=crop&q=80',  // foggy road
              thunder: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=1400&auto=format&fit=crop&q=80',  // lightning storm
            };
            const bgImg = bgMap[weatherData.condition] || bgMap.clear;

            const gradientMap = {
              clear: 'linear-gradient(120deg, rgba(251,146,60,0.7) 0%, rgba(234,179,8,0.5) 100%)',
              cloudy: 'linear-gradient(120deg, rgba(71,85,105,0.75) 0%, rgba(100,116,139,0.6) 100%)',
              rain: 'linear-gradient(120deg, rgba(30,64,175,0.75) 0%, rgba(37,99,235,0.55) 100%)',
              snow: 'linear-gradient(120deg, rgba(186,230,253,0.7) 0%, rgba(147,197,253,0.55) 100%)',
              fog: 'linear-gradient(120deg, rgba(148,163,184,0.75) 0%, rgba(100,116,139,0.6) 100%)',
              thunder: 'linear-gradient(120deg, rgba(15,23,42,0.85) 0%, rgba(30,27,75,0.75) 100%)',
            }[weatherData.condition] || 'linear-gradient(120deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)';

            const statCards = [
              { label: 'Temperature', value: `${weatherData.temp}°C`, icon: '🌡️' },
              { label: 'Humidity', value: `${weatherData.humidity}%`, icon: '💧' },
              { label: 'Wind Speed', value: `${weatherData.wind} km/h`, icon: '💨' },
              { label: 'Condition', value: weatherData.label, icon: weatherData.icon },
            ];

            return (
              <div className="animate-fade-in stagger-2" style={{
                position: 'relative', borderRadius: '20px', overflow: 'hidden',
                marginTop: '2rem', marginBottom: '0.5rem',
                boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
                minHeight: '340px',
              }}>
                {/* Background image */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${bgImg})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }} />
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: gradientMap }} />

                {/* Content */}
                <div style={{
                  position: 'relative', zIndex: 2,
                  padding: '2.5rem 3rem', color: '#fff',
                  display: 'flex', flexDirection: 'column', gap: '1.75rem',
                }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75, marginBottom: '0.3rem' }}>
                        🌍 Live Weather at Destination
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        {destAddr.split(',')[0].trim()}
                      </div>
                    </div>
                    {/* Live badge */}
                    <div style={{
                      background: 'rgba(16,185,129,0.9)', color: '#fff',
                      padding: '0.35rem 0.9rem', borderRadius: '999px',
                      fontSize: '0.75rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      alignSelf: 'flex-start'
                    }}>
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: '#fff', display: 'inline-block'
                      }} />
                      LIVE
                    </div>
                  </div>

                  {/* Big temp + condition */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '5rem', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                      {weatherData.icon}
                    </span>
                    <div>
                      <div style={{ fontSize: '4.5rem', fontWeight: 900, lineHeight: 1, textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                        {weatherData.temp}°C
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, opacity: 0.9, marginTop: '0.2rem' }}>
                        {weatherData.label}
                      </div>
                    </div>
                  </div>

                  {/* Stat cards row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
                    {statCards.map(s => (
                      <div key={s.label} style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '12px', padding: '0.85rem 1rem',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{s.icon}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>{s.value}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.15rem' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}


          {/* ECO PATH VS PETROL & DIESEL TABLE */}
          {directionsRes && (() => {
            const dist = activeRouteObj?.lengthKm || 1;
            const baseTimeMins = Math.round((activeRouteObj?.timeSec || 1800) / 60);

            // Petrol: 15km/L, ₹100/L, 192g/km CO2, Moderate NOx
            const petrolL = dist / 15;
            const petrolFuelCost = Math.round(petrolL * 100);
            const petrolCo2 = (dist * 192 / 1000).toFixed(2);

            // Diesel: 18km/L, ₹90/L, 170g/km CO2, HIGH NOx (3.8×)
            const dieselL = dist / 18;
            const dieselFuelCost = Math.round(dieselL * 90);
            const dieselCo2 = (dist * 170 / 1000).toFixed(2);

            // EV Car: 0 fuel, ₹10/km electricity, 0g CO2, None NOx
            const evCost = Math.max(40, Math.round(dist * 10));
            const evCo2 = '0.00';

            const rows = [
              { label: 'CO₂ Emitted', petrol: `${petrolCo2} kg`, diesel: `${dieselCo2} kg`, ev: `${evCo2} kg`, pColor: '#ef4444', dColor: '#f59e0b', eColor: '#10b981' },
              { label: 'Fuel Burned', petrol: `${petrolL.toFixed(2)} L`, diesel: `${dieselL.toFixed(2)} L`, ev: '0 L (Electric)' },
              { label: 'Fuel Cost', petrol: `₹${petrolFuelCost}`, diesel: `₹${dieselFuelCost}`, ev: `₹${evCost} (elec.)`, pColor: '#ef4444', dColor: '#f59e0b', eColor: '#10b981' },
              { label: 'Travel Time', petrol: `${baseTimeMins} min`, diesel: `${baseTimeMins} min`, ev: `${baseTimeMins} min` },
              { label: 'NOx Level', petrol: 'Moderate', diesel: 'HIGH (3.8×)', ev: 'None ✨', pColor: '#f59e0b', dColor: '#ef4444', eColor: '#10b981' },
            ];

            return (
              <div className="glass-panel animate-fade-in stagger-2" style={{ marginTop: '2rem', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>
                    <Leaf size={22} /> Eco Path vs. Petrol &amp; Diesel Trail
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{dist.toFixed(1)} km route</span>
                </div>

                {/* Comparison Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(16,185,129,0.04)', borderBottom: '2px solid rgba(16,185,129,0.12)' }}>Metric</th>
                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(239,68,68,0.04)', borderBottom: '2px solid rgba(239,68,68,0.25)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Car size={16} /> Petrol Car</div>
                        </th>
                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(245,158,11,0.04)', borderBottom: '2px solid rgba(245,158,11,0.25)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Car size={16} /> Diesel Car</div>
                        </th>
                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(16,185,129,0.08)', borderBottom: '2px solid rgba(16,185,129,0.35)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Zap size={16} /> EV Car ✓</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} style={{ transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '0.9rem 1rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{row.label}</td>
                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontWeight: '700', fontSize: '1rem', color: row.pColor || 'var(--text-main)', borderBottom: '1px solid rgba(239,68,68,0.08)', background: 'rgba(239,68,68,0.02)' }}>{row.petrol}</td>
                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontWeight: '700', fontSize: '1rem', color: row.dColor || 'var(--text-main)', borderBottom: '1px solid rgba(245,158,11,0.08)', background: 'rgba(245,158,11,0.02)' }}>{row.diesel}</td>
                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontWeight: '700', fontSize: '1rem', color: row.eColor || '#10b981', borderBottom: '1px solid rgba(16,185,129,0.08)', background: 'rgba(16,185,129,0.04)' }}>{row.ev}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Stats */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '140px', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{(Math.max(0, parseFloat(petrolCo2))).toFixed(2)} <span style={{ fontSize: '1rem' }}>kg</span></div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>CO₂ saved vs. Petrol (EV)</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px', background: 'rgba(245,158,11,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f59e0b' }}>{(Math.max(0, parseFloat(dieselCo2))).toFixed(2)} <span style={{ fontSize: '1rem' }}>kg</span></div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>CO₂ saved vs. Diesel (EV)</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}><Leaf size={18} /> {Math.round(parseFloat(petrolCo2) / 0.06)}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Tree-days of absorption eq.</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>↓ {Math.max(0, 100 - (activeRouteObj?.aqiScore || 50))}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>AQI score improvement</div>
                  </div>
                </div>

                {/* Diesel Alert */}
                <div style={{ marginTop: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '0.9rem 1.2rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <AlertCircle size={18} style={{ color: '#b45309', flexShrink: 0, marginTop: '2px' }} />
                  <div><strong style={{ color: '#b45309' }}>Diesel Alert:</strong> Diesel engines emit <strong>3.8× more NOx</strong> than petrol, worsening urban smog and respiratory disease risk — even when CO₂ is marginally lower. Choose EV for zero tailpipe emissions.</div>
                </div>
              </div>
            );
          })()}

          {/* SHADCN UI HOTEL CARDS */}
          {directionsRes && destAddr && !isLoading && (
            <div style={{ marginTop: '2rem' }} className="animate-fade-in stagger-2">
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 className="gradient-text green" />
                Destinations Stays — {destAddr.split(',')[0]}
              </h3>

              {isHotelsLoading ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
                  Finding best stays via Amadeus API...
                </div>
              ) : hotelsData.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {hotelsData.map((h, i) => (
                    <div key={h.hotelId || i} className="glass-panel" style={{
                      padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                      transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)'; e.currentTarget.style.border = '1px solid rgba(79, 110, 247, 0.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '600', lineHeight: 1.3, color: 'var(--text-main)' }}>
                          {h.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', flexShrink: 0 }}>
                          {[...Array(h.rating || 3)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <MapPin size={14} />
                        {h.distance?.value} {h.distance?.unit?.toLowerCase() || 'km'} from city center
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
                        <div>
                          {h.livePrice ? (
                            <>
                              <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'block', marginBottom: '-2px', fontWeight: '600' }}>Live Price 🟢</span>
                              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                {h.livePrice.currency === 'EUR' ? '€' : h.livePrice.currency === 'USD' ? '$' : h.livePrice.currency}
                                {parseFloat(h.livePrice.total).toLocaleString('en-IN')}
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '-2px' }}>Estimated</span>
                              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                {(() => {
                                  const baseStr = getHotelPrice(destAddr);
                                  let currency = '₹';
                                  if (baseStr.includes('$')) currency = '$';
                                  else if (baseStr.includes('£')) currency = '£';

                                  let base = 2500;
                                  const match = baseStr.match(/[\d,]+/);
                                  if (match) {
                                    base = parseInt(match[0].replace(/,/g, ''), 10);
                                  }

                                  let mult = 1.0;
                                  if (h.rating >= 4) mult = 1.6;
                                  if (h.rating >= 5) mult = 2.8;

                                  const pseudoRand = (h.name.length % 10) * 0.01;
                                  const distPenalty = (h.distance?.value || 0) * 0.02;
                                  let p = base * mult * (1 + pseudoRand - distPenalty);

                                  if (currency === '₹') p = Math.round(p / 100) * 100;
                                  else p = Math.round(p / 5) * 5;

                                  return `${currency}${p.toLocaleString('en-IN')}`;
                                })()}
                              </span>
                            </>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/night</span>
                        </div>
                        <button style={{
                          padding: '0.6rem 1rem', borderRadius: '8px',
                          background: 'rgba(79, 110, 247, 0.1)', color: '#4f6ef7', border: '1px solid rgba(79, 110, 247, 0.2)',
                          fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#4f6ef7'; e.currentTarget.style.color = 'white' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(79, 110, 247, 0.1)'; e.currentTarget.style.color = '#4f6ef7' }}
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No featured hotels found nearby for this destination.
                </div>
              )}
            </div>
          )}
        </section>

        {/* TOURIST ATTRACTIONS SECTION */}
        {(isAttractionsLoading || attractionsData.length > 0) && (
          <section id="attractions" className="section animate-fade-in stagger-2" style={{ paddingTop: '2rem' }}>
            <h2 className="section-title">
              Top Attractions Nearby
              <br />
              <span className="gradient-text green" style={{ fontSize: '1.2rem', display: 'block', marginTop: '0.5rem' }}>
                Powered by OpenStreetMap
              </span>
            </h2>

            {isAttractionsLoading ? (
              <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
                Discovering places to visit...
              </div>
            ) : (
              <div className="cards-grid">
                {attractionsData.map((place) => (
                  <div key={place.id} className="glass-panel card hover-lift" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                      height: '140px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '1rem',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)',
                      overflow: 'hidden'
                    }}>
                      {place.imageUrl ? (
                        <img src={place.imageUrl} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        place.type === 'museum' ? <Building2 size={40} opacity={0.3} /> : <MapPin size={40} opacity={0.3} />
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {place.name}
                      </span>
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                      <Star size={12} /> {place.type}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        OpenStreetMap POI
                      </div>
                      <a href={`https://www.openstreetmap.org/node/${place.id}`} target="_blank" rel="noreferrer" style={{
                        padding: '0.4rem 0.8rem', borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)',
                        fontWeight: '600', fontSize: '0.8rem', textDecoration: 'none', transition: 'all 0.2s'
                      }}
                      >
                        View Map
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </section>
        )}

        {/* PROBLEM & SOLUTION */}
        <section id="problem" className="section">
          <h2 className="section-title">Why It Matters</h2>
          <div className="cards-grid">
            <div className="glass-panel card">
              <div className="card-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                <Activity size={24} />
              </div>
              <h3>The Pollution Crisis</h3>
              <p>Commuters rely on navigation apps optimizing only for time, exposing them to harmful AQI levels daily during their travels.</p>
            </div>

            <div className="glass-panel card">
              <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)' }}>
                <TrendingDown size={24} />
              </div>
              <h3>Missing Optimization</h3>
              <p>There is no system that gracefully balances travel time, journey cost, and pollution exposure into a single optimal route.</p>
            </div>

            <div className="glass-panel card">
              <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)' }}>
                <Wind size={24} />
              </div>
              <h3>Our Solution</h3>
              <p>We combine transit with walking, integrating real-time WAQI APIs to avoid high-pollution roads and reduce exposure.</p>
            </div>
          </div>
        </section>

        {/* TECH STACK */}
        <section id="tech" className="section">
          <h2 className="section-title">Powered By</h2>
          <div className="tech-grid">
            <div className="tech-item"><Code size={18} /> React / Vite (Web)</div>
            <div className="tech-item"><MapIcon size={18} /> Google Maps Routing</div>
            <div className="tech-item"><Server size={18} /> Node.js / Express</div>
            <div className="tech-item"><Wind size={18} /> WAQI Live AQI</div>
            <div className="tech-item"><Zap size={18} /> Smart Aggregation API</div>
          </div>
        </section>
      </main >

      {/* FLIGHT BOOKING MODAL */}
      {showFlightModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', background: 'var(--bg-card)' }}>
            <button
              onClick={() => setShowFlightModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plane className="gradient-text" /> Available Flights
            </h2>

            {isFlightsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
                Searching for the best flight options via Amadeus...
              </div>
            ) : flightSearchError ? (
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', color: '#b45309', padding: '1rem', borderRadius: '8px' }}>
                {flightSearchError}
              </div>
            ) : flightOffers.length > 0 ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {flightOffers.map((offer, idx) => {
                  const itinerary = offer.itineraries?.[0];
                  const segment = itinerary?.segments?.[0];
                  const returnSegment = itinerary?.segments?.[itinerary?.segments?.length - 1];
                  return (
                    <div key={offer.id || idx} style={{
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                      transition: 'background 0.2s',
                      flexWrap: 'wrap'
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(79, 110, 247, 0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                            {segment?.carrierCode || 'Airline'} {segment?.number}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {offer.numberOfBookableSeats} seats left
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                              {segment?.departure?.at ? new Date(segment.departure.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                            <div>{segment?.departure?.iataCode}</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                            <div style={{ fontSize: '0.75rem', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>{itinerary?.duration?.replace('PT', '').toLowerCase() || 'Flight'}</div>
                            <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%' }}></div>
                            {itinerary?.segments?.length > 1 && (
                              <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.2rem' }}>{itinerary.segments.length - 1} stop(s)</div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                              {returnSegment?.arrival?.at ? new Date(returnSegment.arrival.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                            <div>{returnSegment?.arrival?.iataCode}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', borderLeft: '1px solid var(--glass-border)', paddingLeft: '1rem', minWidth: '120px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                          {offer.price.currency === 'EUR' ? '€' : offer.price.currency === 'USD' ? '$' : offer.price.currency === 'INR' ? '₹' : offer.price.currency} {parseFloat(offer.price.total).toLocaleString('en-IN')}
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}>
                          Select
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TRAIN BOOKING MODAL */}
      {showTrainModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', background: 'var(--bg-card)' }}>
            <button
              onClick={() => setShowTrainModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Train className="gradient-text" /> Available Trains
            </h2>

            {isTrainsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
                Searching for the best train schedules via IRCTC...
              </div>
            ) : trainSearchError ? (
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #f59e0b', color: '#b45309', padding: '1rem', borderRadius: '8px' }}>
                {trainSearchError}
              </div>
            ) : trainOffers.length > 0 ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {trainOffers.map((offer, idx) => (
                  <div key={offer.id || idx} style={{
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                    transition: 'background 0.2s',
                    flexWrap: 'wrap'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(79, 110, 247, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.05rem' }}>
                          {offer.trainName}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          #{offer.trainNumber}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                            {offer.departureTime}
                          </div>
                          <div style={{ fontSize: '0.8rem' }}>{offer.fromStation}</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                          <div style={{ fontSize: '0.75rem', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>{offer.duration}</div>
                          <div style={{ height: '2px', background: 'var(--glass-border)', width: '100%', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-3px', left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px', background: 'var(--text-muted)', borderRadius: '50%' }}></div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                            {offer.arrivalTime}
                          </div>
                          <div style={{ fontSize: '0.8rem' }}>{offer.toStation}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', borderLeft: '1px solid var(--glass-border)', paddingLeft: '1rem', minWidth: '120px' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                        {offer.price}
                      </div>
                      <button className="btn btn-primary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}>
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <footer>
        <p>Built for the Smart Trip Planner Hackathon</p>
      </footer>
    </>
  );
}

// Autocomplete location input using Nominatim
function LocationInput({ label, value, onChange, placeholder, icon }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(val)}`);
        setSuggestions(res.data || []);
        setShowDropdown(true);
      } catch { setSuggestions([]); }
    }, 350);
  };

  const handleSelect = (item) => {
    onChange(item.display_name);
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} style={{ flex: '1 1 200px', position: 'relative' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>{label}</label>
      <div className="input-group">
        {icon}
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="form-input"
          required
          autoComplete="off"
        />
      </div>
      {showDropdown && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1000,
          background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
          borderRadius: '12px', padding: '0.5rem 0', listStyle: 'none',
          boxShadow: 'var(--glass-shadow)', backdropFilter: 'blur(16px)',
          maxHeight: '220px', overflowY: 'auto'
        }}>
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onClick={() => handleSelect(item)}
              style={{
                padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <MapPin size={12} style={{ marginRight: '0.4rem', color: 'var(--text-muted)', flexShrink: 0 }} />
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Helper component to auto-pan the map bounds to the route
function MapBoundsUpdater({ activeRouteCoords }) {
  const map = useMap();

  useEffect(() => {
    if (activeRouteCoords && activeRouteCoords.length > 0) {
      const bounds = L.latLngBounds(activeRouteCoords.map(c => [c[1], c[0]]));
      map.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 0.8 });
    }
  }, [map, activeRouteCoords]);

  return null;
}

export default App;
