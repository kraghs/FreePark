// FreePark – Danmark
// Clean Apple-like UI, Leaflet map, DK-only search, nearest top 5, add place with reverse geocoding
// No coordinates shown in UI.

const DK_BOUNDS = L.latLngBounds(
  L.latLng(54.56, 7.58), // approx south-west
  L.latLng(57.75, 12.69) // approx north-east
);

// Seed data – curated examples. Replace/extend with authoritative sources when available.
// Note: UI never shows coordinates, only name/address/info.
const seedPlaces = [
  {
    id: "amager-strand",
    name: "Amager Strand P-plads",
    address: "Amager Strandvej 100, 2300 København S",
    info: "3 timer gratis parkering",
    lat: 55.6549, lng: 12.6338, city: "København"
  },
  {
    id: "kastellet",
    name: "Kastellet / Den Lille Havfrue (vejparkering)",
    address: "Esplanaden, 1263 København K",
    info: "Fri parkering efter kl. 18 (kontrollér skiltning)",
    lat: 55.6923, lng: 12.5931, city: "København"
  },
  {
    id: "tangkrogen",
    name: "Tangkrogen P-plads",
    address: "Marselisborg Havnevej 4, 8000 Aarhus",
    info: "Gratis, ingen tidsbegrænsning (kontrollér skiltning)",
    lat: 56.1379, lng: 10.2061, city: "Aarhus"
  },
  {
    id: "ceres-park",
    name: "Ceres Park P-plads",
    address: "Stadion Allé 70, 8000 Aarhus",
    info: "Gratis, ingen tidsbegrænsning (kontrollér skiltning)",
    lat: 56.1505, lng: 10.1899, city: "Aarhus"
  },
  {
    id: "roskilde-havn",
    name: "Roskilde Havn P-plads",
    address: "Vindeboder 3, 4000 Roskilde",
    info: "Fri parkering efter kl. 18 (kontrollér skiltning)",
    lat: 55.6437, lng: 12.0837, city: "Roskilde"
  },
  {
    id: "fisketorvet",
    name: "Fisketorvet Shopping Center (parkering)",
    address: "Havneholmen 5, 1561 København V",
    info: "Gratis i begrænset tidsrum (kontrollér centrets regler)",
    lat: 55.6631, lng: 12.5655, city: "København"
  }
];

// Local storage key for user-added places
const LS_KEY = "freepark_user_places";

// State
let map, userMarker, places = [];
let markersLayer;
let currentCenter = L.latLng(55.6761, 12.5683); // København center as default
let currentUserLatLng = null;

// Utils
function loadUserPlaces() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveUserPlace(place) {
  const arr = loadUserPlaces();
  arr.push(place);
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}
function kmDistance(a, b) {
  const meters = map ? map.distance(a, b) : a.distanceTo(b);
  return meters / 1000;
}
function formatKm(km) {
  if (km < 0.1) return "0.1 km";
  return `${km.toFixed(1)} km`;
}
function withinDenmark(latlng) {
  return DK_BOUNDS.contains(latlng);
}
function showModal(el, show) {
  el.setAttribute("aria-hidden", show ? "false" : "true");
}
function createPinIcon() {
  return L.divIcon({ className: "pin", iconSize: [20,20], iconAnchor: [10,20] });
}
function createUserDot() {
  return L.divIcon({ className: "user-dot", iconSize: [18,18], iconAnchor: [9,9] });
}

// Map init
function initMap() {
  map = L.map("map", {
    zoomControl: true,
    attributionControl: true,
    maxBounds: DK_BOUNDS.pad(0.3),
    minZoom: 6,
  }).setView(currentCenter, 12);

  // Clean light tiles (Carto Light via OSM)
  const tiles = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    { maxZoom: 19, attribution: '&copy; OpenStreetMap & CARTO' }
  );
  tiles.addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Add seed + user places
  refreshPlaces();

  // Try geolocate user
  tryGeolocate();
}

// Build place list (seed + user)
function refreshPlaces() {
  const userPlaces = loadUserPlaces();
  places = [...seedPlaces, ...userPlaces]
    .filter(p => withinDenmark(L.latLng(p.lat, p.lng)));
  renderMarkers();
  updateNearestList();
}

// Render markers
function renderMarkers() {
  markersLayer.clearLayers();
  places.forEach(p => {
    const m = L.marker([p.lat, p.lng], { icon: createPinIcon(), title: p.name });
    const infoBtnHtml = `<button class="info-btn" data-id="${p.id}">Info</button>`;
    const popupHtml = `
      <div style="min-width:180px;">
        <div style="font-weight:600;">${escapeHtml(p.name)}</div>
        <div style="color:#5f5f62;margin:4px 0;">${escapeHtml(p.address)}</div>
        <div>${infoBtnHtml}</div>
      </div>
    `;
    m.bindPopup(popupHtml);
    m.on("popupopen", (e) => {
      const btn = e.popup._contentNode.querySelector(".info-btn");
      if (btn) {
        btn.addEventListener("click", () => openInfo(p));
      }
    });
    m.addTo(markersLayer);
  });
}

// Update nearest list
function updateNearestList() {
  const origin = currentUserLatLng || map.getCenter();
  const sorted = [...places].map(p => {
    const distKm = kmDistance(L.latLng(p.lat, p.lng), origin);
    return { ...p, distKm };
  }).sort((a,b) => a.distKm - b.distKm).slice(0, 5);

  const list = document.getElementById("nearestList");
  list.innerHTML = "";
  sorted.forEach(p => {
    const li = document.createElement("li");
    li.className = "nearest-item";
    li.innerHTML = `
      <div class="item-main">
        <div class="item-name">${escapeHtml(p.name)}</div>
        <div class="item-address">${escapeHtml(p.address)}</div>
      </div>
      <div class="item-actions">
        <span class="distance-pill">${formatKm(p.distKm)}</span>
        <button class="info-btn" data-id="${p.id}">Info</button>
      </div>
    `;
    list.appendChild(li);
    li.querySelector(".info-btn").addEventListener("click", () => openInfo(p));
    li.addEventListener("click", (ev) => {
      if (ev.target.classList.contains("info-btn")) return;
      map.setView([p.lat, p.lng], 15, { animate: true });
    });
  });
}

// Escape
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[s]));
}

// Geolocation
function tryGeolocate() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const ll = L.latLng(latitude, longitude);
      currentUserLatLng = ll;
      showUserMarker(ll);
      if (withinDenmark(ll)) {
        map.setView(ll, 14, { animate: true });
      }
      updateNearestList();
    },
    () => {}, // silent fail
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
  );
}

function showUserMarker(ll) {
  if (userMarker) {
    userMarker.setLatLng(ll);
  } else {
    userMarker = L.marker(ll, { icon: createUserDot(), interactive: false }).addTo(map);
  }
}

// Search (DK-only via Nominatim)
async function searchArea(query) {
  const q = query.trim();
  if (!q) return;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "dk");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const resp = await fetch(url, {
    headers: { "Accept": "application/json" }
  });
  if (!resp.ok) return;
  const results = await resp.json();
  if (!Array.isArray(results) || results.length === 0) return;

  const r = results[0];
  const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
  const ll = L.latLng(lat, lon);
  if (!withinDenmark(ll)) return;

  currentCenter = ll;
  map.setView(ll, 12, { animate: true });

  // Re-prioritize nearest relative to searched center
  currentUserLatLng = ll;
  updateNearestList();
}

// Reverse geocode (DK-only)
async function reverseGeocode(lat, lon) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const resp = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!resp.ok) throw new Error("Reverse geocoding fejlede");
  const data = await resp.json();
  return data.display_name || "";
}

// Add place flow
function setupAddFlow() {
  const addBtn = document.getElementById("addBtn");
  const addModal = document.getElementById("addModal");
  const addCloseBtn = document.getElementById("addCloseBtn");
  const addCancelBtn = document.getElementById("addCancelBtn");
  const addForm = document.getElementById("addForm");
  const useMyLocBtn = document.getElementById("useMyLocationBtn");
  const addressInput = document.getElementById("placeAddress");
  const nameInput = document.getElementById("placeName");
  const infoInput = document.getElementById("placeInfo");

  addBtn.addEventListener("click", () => {
    showModal(addModal, true);
    nameInput.focus();
  });
  addCloseBtn.addEventListener("click", () => showModal(addModal, false));
  addCancelBtn.addEventListener("click", () => showModal(addModal, false));

  useMyLocBtn.addEventListener("click", async () => {
    if (!navigator.geolocation) return;
    useMyLocBtn.disabled = true;
    useMyLocBtn.textContent = "Finder adresse…";
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude, longitude } = pos.coords;
        const addr = await reverseGeocode(latitude, longitude);
        addressInput.value = addr;
      } catch {
        addressInput.value = "";
      } finally {
        useMyLocBtn.disabled = false;
        useMyLocBtn.textContent = "Brug min lokation";
      }
    }, () => {
      useMyLocBtn.disabled = false;
      useMyLocBtn.textContent = "Brug min lokation";
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  });

  addForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = nameInput.value.trim();
    const address = addressInput.value.trim();
    const info = infoInput.value.trim();
    if (!name || !address || !info) return;

    // Geocode address to lat/lng, DK-only
    const loc = await geocodeAddressDK(address);
    if (!loc) {
      alert("Kunne ikke finde adressen i Danmark. Tjek venligst adressen.");
      return;
    }

    const lat = parseFloat(loc.lat), lng = parseFloat(loc.lon);
    const ll = L.latLng(lat, lng);
    if (!withinDenmark(ll)) {
      alert("Adressen ligger ikke i Danmark.");
      return;
    }

    const place = {
      id: `user-${Date.now()}`,
      name, address, info,
      lat, lng,
      city: loc.address?.city || loc.address?.town || loc.address?.municipality || ""
    };
    saveUserPlace(place);
    refreshPlaces();
    showModal(addModal, false);
    map.setView([lat, lng], 15, { animate: true });
  });
}

async function geocodeAddressDK(address) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("countrycodes", "dk");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  const resp = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!resp.ok) return null;
  const arr = await resp.json();
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

// Open info modal
function openInfo(place) {
  const modal = document.getElementById("infoModal");
  const content = document.getElementById("infoContent");
  content.innerHTML = `
    <div style="display:grid;gap:8px;">
      <div style="font-weight:600;">${escapeHtml(place.name)}</div>
      <div style="color:#5f5f62;">${escapeHtml(place.address)}</div>
      <div style="padding:10px;border:1px solid #e6e6e8;border-radius:10px;background:#f9fbff;">
        ${escapeHtml(place.info)}
      </div>
      <div style="color:#5f5f62;font-size:13px;">
        Husk: Oplysninger kan ændre sig. Kontrollér altid skiltning på stedet.
      </div>
    </div>
  `;
  showModal(modal, true);
}

// Wire UI
function setupUI() {
  document.getElementById("searchBtn").addEventListener("click", () => {
    const q = document.getElementById("searchInput").value;
    searchArea(q);
  });
  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = document.getElementById("searchInput").value;
      searchArea(q);
    }
  });

  document.getElementById("locateBtn").addEventListener("click", tryGeolocate);

  const infoModal = document.getElementById("infoModal");
  document.getElementById("infoCloseBtn").addEventListener("click", () => showModal(infoModal, false));

  // Close modals on backdrop click
  [document.getElementById("addModal"), document.getElementById("infoModal")].forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) showModal(modal, false);
    });
  });

  // Update nearest on map move
  map.on("moveend", () => {
    if (!currentUserLatLng) updateNearestList();
  });
}

// Init
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  setupAddFlow();
  setupUI();
});
