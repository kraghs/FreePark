/* FreePark – DK-only gratis parkering
   - Apple-agtig oplevelse
   - DK-area søgning, 5 nærmeste, tilføj med reverse geocoding
*/

// Nominatim endpoints (OpenStreetMap)
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

// State
let map, userMarker, userLatLng = null;
let parkingData = [];          // Merged base + user-added
let baseParkingData = [];      // Seed dataset (replace/extend from real sources)
let markersLayer = null;
let areaBBox = null;           // Current area bounding box (if search)

// Utils
function kmDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round((R * c + Number.EPSILON) * 100) / 100; // 2 decimals
}

function createUserLocationIcon() {
  return L.divIcon({
    className: 'user-location-dot',
    iconSize: [18, 18]
  });
}

function isInsideBBox(lat, lon, bbox) {
  if (!bbox) return true;
  const [minLon, minLat, maxLon, maxLat] = bbox; // Nominatim format
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

// LocalStorage for user-added places
const LS_KEY = "freepark_user_places";
function loadUserPlaces() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveUserPlace(place) {
  const list = loadUserPlaces();
  list.push(place);
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

// Map init
function initMap() {
  map = L.map('map', {
    zoomControl: true,
    attributionControl: false
  }).setView([55.6761, 12.5683], 12); // København default

  // Light basemap
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 }
  ).addTo(map);

  L.control.attribution({prefix: ''}).addAttribution('© OpenStreetMap, © CARTO');

  markersLayer = L.layerGroup().addTo(map);

  // Get location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      userLatLng = [pos.coords.latitude, pos.coords.longitude];
      map.setView(userLatLng, 14);
      userMarker = L.marker(userLatLng, { icon: createUserLocationIcon(), interactive: false }).addTo(map);
      refreshNearest();
    }, () => {
      // If blocked, still render with default city
      refreshNearest();
    }, { enableHighAccuracy: true, timeout: 8000 });
  } else {
    refreshNearest();
  }
}

// Seed data – replace/extend from curated sources
// Schema: { id, name, address, lat, lon, info }
baseParkingData = [
  // København eksempler (tidsbegrænset/forhold; verificer lokalt)
  {
    id: "kbh-fisketorvet",
    name: "Gratis parkering ved Fisketorvet",
    address: "Havneholmen 5, 2450 København SV",
    lat: 55.6617, lon: 12.5574,
    info: "Gratis i udvalgte perioder; tjek skiltning på stedet."
  },
  {
    id: "kbh-kastellet",
    name: "Gratis parkering ved Kastellet",
    address: "Gl. Hovedvagt, 2100 København Ø",
    lat: 55.6933, lon: 12.5971,
    info: "Ofte gratis/tidsbegrænset; respektér zoneregler og tider."
  },
  {
    id: "kbh-vanlose-st",
    name: "Vanløse Station (3 timers gratis)",
    address: "Vanløse Allé 40, 2720 Vanløse",
    lat: 55.6909, lon: 12.4920,
    info: "3 timers gratis hverdage; se lokal skiltning."
  },
  // Roskilde eksempel
  {
    id: "roskilde-station",
    name: "Roskilde Station – gratis i perioder",
    address: "Jernbanegade, 4000 Roskilde",
    lat: 55.6410, lon: 12.0876,
    info: "Gratis ved udvalgte tider/ordninger; tjek lokal skiltning."
  }
];

// Merge with user places
function buildData() {
  const userPlaces = loadUserPlaces();
  parkingData = [...baseParkingData, ...userPlaces];
}

// Render markers
function renderMarkers() {
  markersLayer.clearLayers();
  parkingData.forEach(p => {
    if (!isInsideBBox(p.lat, p.lon, areaBBox)) return;
    const marker = L.marker([p.lat, p.lon], {
      icon: L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: [25,41],
        iconAnchor: [12,41],
        popupAnchor: [1,-34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41,41]
      })
    });
    const html = `
      <div class="popup">
        <div class="title">${p.name}</div>
        <div class="addr">${p.address}</div>
        <div class="row" style="margin-top:8px; display:flex; gap:8px;">
          <button class="btn btn-outline" data-id="${p.id}" onclick="openInfo('${p.id}')">Vis info</button>
        </div>
      </div>
    `;
    marker.bindPopup(html);
    markersLayer.addLayer(marker);
  });
}

// Nearest list
function refreshNearest() {
  buildData();
  renderMarkers();
  const label = document.getElementById('contextLabel');
  let refPoint = null;

  if (userLatLng) {
    refPoint = userLatLng;
    label.textContent = "Ud fra din lokation";
  } else if (areaBBox) {
    const [minLon, minLat, maxLon, maxLat] = areaBBox;
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    refPoint = [centerLat, centerLon];
    label.textContent = "Ud fra valgt område";
  } else {
    refPoint = [55.6761, 12.5683]; // København
    label.textContent = "Ud fra København (standard)";
  }

  const withinArea = parkingData.filter(p => isInsideBBox(p.lat, p.lon, areaBBox));
  const ranked = withinArea
    .map(p => ({
      ...p,
      distanceKm: kmDistance(refPoint[0], refPoint[1], p.lat, p.lon)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);

  const ul = document.getElementById('nearestList');
  ul.innerHTML = ranked.map(r => `
    <li>
      <div>
        <div class="title">${r.name}</div>
        <div class="addr">${r.address}</div>
      </div>
      <div class="distance">${r.distanceKm} km</div>
    </li>
  `).join('');
}

// Open info modal
window.openInfo = function(id) {
  const p = parkingData.find(x => x.id === id);
  if (!p) return;
  const info = `
    <div style="display:grid; gap:6px;">
      <div><strong>Navn:</strong> ${p.name}</div>
      <div><strong>Adresse:</strong> ${p.address}</div>
      <div><strong>Info:</strong> ${p.info || "—"}</div>
      <div><strong>Koordinater:</strong> ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</div>
    </div>
  `;
  document.getElementById('infoContent').innerHTML = info;
  toggleModal('infoModal', true);
};

// Modal toggles
function toggleModal(id, open) {
  const m = document.getElementById(id);
  m.setAttribute('aria-hidden', open ? 'false' : 'true');
}

// Add modal handlers
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  document.getElementById('addBtn').addEventListener('click', () => toggleModal('addModal', true));
  document.getElementById('closeModal').addEventListener('click', () => toggleModal('addModal', false));
  document.getElementById('closeInfoModal').addEventListener('click', () => toggleModal('infoModal', false));

  document.getElementById('useMyLocation').addEventListener('click', async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const adr = await reverseGeocodeDK(lat, lon);
      document.getElementById('placeAddress').value = adr || '';
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
  });

  document.getElementById('savePlace').addEventListener('click', async () => {
    const name = document.getElementById('placeName').value.trim();
    const address = document.getElementById('placeAddress').value.trim();
    if (!name || !address) {
      alert('Udfyld både navn og adresse.');
      return;
    }
    const coords = await geocodeDK(address);
    if (!coords) {
      alert('Kunne ikke finde dansk adresse. Prøv igen.');
      return;
    }
    const newPlace = {
      id: `user-${Date.now()}`,
      name, address,
      lat: coords.lat,
      lon: coords.lon,
      info: "Tilføjet af bruger. Verificér lokale skiltning."
    };
    saveUserPlace(newPlace);
    toggleModal('addModal', false);
    refreshNearest();
    renderMarkers();
  });

  document.getElementById('searchBtn').addEventListener('click', doAreaSearch);
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doAreaSearch();
  });
});

// Geocode area in DK
async function doAreaSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1&countrycodes=dk`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'da' } });
  if (!res.ok) { alert('Søgning mislykkedes.'); return; }
  const data = await res.json();
  if (!data.length) { alert('Ingen danske resultater for området.'); return; }
  const item = data[0];
  areaBBox = item.boundingbox ? [item.boundingbox[2], item.boundingbox[0], item.boundingbox[3], item.boundingbox[1]] : null;
  const lat = parseFloat(item.lat), lon = parseFloat(item.lon);
  map.setView([lat, lon], 12);
  refreshNearest();
  renderMarkers();
}

// DK geocode address → coords
async function geocodeDK(address) {
  const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1&countrycodes=dk`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'da' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

// DK reverse geocode coords → address
async function reverseGeocodeDK(lat, lon) {
  const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=18`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'da' } });
  if (!res.ok) return null;
  const data = await res.json();
  const a = data.address || {};
  // Build human-readable Danish address
  const parts = [
    a.road, a.house_number,
    a.postcode, a.city || a.town || a.village
  ].filter(Boolean);
  // Enforce Denmark only
  if ((a.country_code || '').toLowerCase() !== 'dk') return null;
  return parts.join(' ');
}
