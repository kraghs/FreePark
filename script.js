/* FreePark – ultra-stabil rebuild
   Fokus: Det virker. Enkle afhængigheder, korrekt kort-højde, DK-only geokodning.
*/

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

let map, markersLayer, userMarker;
let userLatLng = null;
let areaBBox = null; // [minLon, minLat, maxLon, maxLat]

let parkingData = [];
let baseParkingData = [
  // Mindste fungerende liste (erstattes med din fulde)
  {
    id: "kbh-vanlose-st",
    name: "Vanløse Station (3 timers gratis)",
    address: "Vanløse Allé 40, 2720 Vanløse",
    lat: 55.6909, lon: 12.4920,
    info: "3 timers gratis hverdage; tjek skiltning."
  },
  {
    id: "roskilde-st",
    name: "Roskilde Station – gratis i perioder",
    address: "Jernbanegade, 4000 Roskilde",
    lat: 55.6410, lon: 12.0876,
    info: "Gratis ved udvalgte tider; tjek skiltning."
  }
];

const LS_KEY = "freepark_user_places";
function loadUserPlaces() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveUserPlace(place) {
  const list = loadUserPlaces();
  list.push(place);
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function kmDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round((R * c + Number.EPSILON) * 100) / 100;
}

function createUserLocationIcon() {
  return L.divIcon({
    className: 'user-location-dot',
    iconSize: [18, 18]
  });
}

function isInsideBBox(lat, lon, bbox) {
  if (!bbox) return true;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

function buildData() {
  parkingData = [...baseParkingData, ...loadUserPlaces()];
}

function initMap() {
  // Sikr kort-højde er til stede (fallback)
  const mapEl = document.getElementById('map');
  if (!mapEl) {
    console.error('#map mangler i DOM.');
    return;
  }
  if (mapEl.clientHeight < 100) {
    mapEl.style.height = '80vh';
  }

  // Minimal, stabil map-init
  map = L.map('map').setView([55.6761, 12.5683], 12); // København default

  // Brug den mest robuste OSM tile (ingen CORS problemer)
// Clean, Apple-agtig light map fra Carto
L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '© OpenStreetMap © CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }
).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Geolocation (kræver localhost eller HTTPS)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLatLng = [pos.coords.latitude, pos.coords.longitude];
        map.setView(userLatLng, 14);
        userMarker = L.marker(userLatLng, { icon: createUserLocationIcon(), interactive: false }).addTo(map);
        refreshNearest();
      },
      () => {
        // Ingen lokation? Fint, brug default
        refreshNearest();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  } else {
    refreshNearest();
  }
}

function renderMarkers() {
  markersLayer.clearLayers();
  parkingData.forEach(p => {
    if (!isInsideBBox(p.lat, p.lon, areaBBox)) return;
    const marker = L.marker([p.lat, p.lon]);
    const html = `
      <div class="popup">
        <div class="title">${p.name}</div>
        <div class="addr">${p.address}</div>
        <div style="margin-top:8px; display:flex; gap:8px;">
          <button class="btn btn-outline" onclick="openInfo('${p.id}')">Vis info</button>
        </div>
      </div>
    `;
    marker.bindPopup(html);
    markersLayer.addLayer(marker);
  });
}

function refreshNearest() {
  buildData();
  renderMarkers();

  const label = document.getElementById('contextLabel');
  let refPoint;

  if (userLatLng) {
    refPoint = userLatLng;
    label.textContent = "Ud fra din lokation";
  } else if (areaBBox) {
    const [minLon, minLat, maxLon, maxLat] = areaBBox;
    refPoint = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
    label.textContent = "Ud fra valgt område";
  } else {
    refPoint = [55.6761, 12.5683];
    label.textContent = "Ud fra København (standard)";
  }

  const withinArea = parkingData.filter(p => isInsideBBox(p.lat, p.lon, areaBBox));
  const ranked = withinArea
    .map(p => ({ ...p, distanceKm: kmDistance(refPoint[0], refPoint[1], p.lat, p.lon) }))
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
  `;
  document.getElementById('infoContent').innerHTML = info;
  toggleModal('infoModal', true);
};
};

function toggleModal(id, open) {
  const m = document.getElementById(id);
  if (!m) return;
  m.setAttribute('aria-hidden', open ? 'false' : 'true');
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();

  // Add modal
  document.getElementById('addBtn').addEventListener('click', () => toggleModal('addModal', true));
  document.getElementById('closeModal').addEventListener('click', () => toggleModal('addModal', false));
  document.getElementById('closeInfoModal').addEventListener('click', () => toggleModal('infoModal', false));

  // Brug min lokation → reverse geocode til adresse
  document.getElementById('useMyLocation').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const adr = await reverseGeocodeDK(pos.coords.latitude, pos.coords.longitude);
      document.getElementById('placeAddress').value = adr || '';
    });
  });

  // Gem ny plads
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
      info: "Tilføjet af bruger. Tjek lokal skiltning."
    };
    saveUserPlace(newPlace);
    toggleModal('addModal', false);
    refreshNearest();
    renderMarkers();
  });

  // Søgning efter område i DK
  const doAreaSearch = async () => {
    const q = document.getElementById('searchInput').value.trim();
    if (!q) return;
    try {
      const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1&countrycodes=dk`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'da' } });
      if (!res.ok) throw new Error('Søgning mislykkedes');
      const data = await res.json();
      if (!data.length) { alert('Ingen danske resultater for området.'); return; }
      const item = data[0];
      // boundingbox: [south, north, west, east]
      const bb = item.boundingbox;
      areaBBox = [parseFloat(bb[2]), parseFloat(bb[0]), parseFloat(bb[3]), parseFloat(bb[1])];
      const lat = parseFloat(item.lat), lon = parseFloat(item.lon);
      map.setView([lat, lon], 12);
      refreshNearest();
      renderMarkers();
    } catch (e) {
      alert('Kunne ikke søge området. Prøv igen.');
      console.error(e);
    }
  };

  document.getElementById('searchBtn').addEventListener('click', doAreaSearch);
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doAreaSearch();
  });
});

// DK geocode address → coords
async function geocodeDK(address) {
  try {
    const url = `${NOMINATIM_SEARCH}?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1&countrycodes=dk`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'da' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { return null; }
}

// Reverse geocode coords → DK address
async function reverseGeocodeDK(lat, lon) {
  try {
    const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=18`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'da' } });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    if ((a.country_code || '').toLowerCase() !== 'dk') return null;
    const parts = [a.road, a.house_number, a.postcode, a.city || a.town || a.village].filter(Boolean);
    return parts.join(' ');
  } catch { return null; }
}
