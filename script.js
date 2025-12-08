let map, userMarker, markersLayer;
const LS_KEY = "freepark_user_places";

const seedPlaces = [
  { id:"amager", name:"Amager Strand P-plads", address:"Amager Strandvej 100, København", info:"3 timer gratis", lat:55.6549, lng:12.6338 },
  { id:"roskilde", name:"Roskilde Havn P-plads", address:"Vindeboder 3, Roskilde", info:"Fri efter 18", lat:55.6437, lng:12.0837 }
];

function initMap() {
  map = L.map("map").setView([55.6761, 12.5683], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  refreshPlaces();
  tryGeolocate();
}

function refreshPlaces() {
  const userPlaces = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  const places = [...seedPlaces, ...userPlaces];
  markersLayer.clearLayers();
  places.forEach(p => {
    const m = L.marker([p.lat, p.lng]).addTo(markersLayer).bindPopup(`
      <b>${p.name}</b><br>${p.address}<br><button onclick="openInfo('${p.id}')">Info</button>
    `);
  });
  updateNearestList(places);
}

function updateNearestList(places) {
  const origin = userMarker ? userMarker.getLatLng() : map.getCenter();
  const sorted = places.map(p => {
    const dist = map.distance(origin, [p.lat, p.lng]) / 1000;
    return { ...p, dist };
  }).sort((a,b) => a.dist - b.dist).slice(0,5);

  const list = document.getElementById("nearestList");
  list.innerHTML = "";
  sorted.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} – ${p.address} (${p.dist.toFixed(1)} km)`;
    list.appendChild(li);
  });
}

function tryGeolocate() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    const ll = [pos.coords.latitude, pos.coords.longitude];
    if (userMarker) userMarker.setLatLng(ll);
    else userMarker = L.marker(ll, { icon: L.divIcon({ className:"user-dot", iconSize:[18,18], iconAnchor:[9,9] }) }).addTo(map);
    map.setView(ll, 14);
  });
}

async function searchArea(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=dk&format=json&limit=1`;
  const resp = await fetch(url);
  const results = await resp.json();
  if (results.length) {
    const r = results[0];
    map.setView([r.lat, r.lon], 13);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  document.getElementById("searchBtn").addEventListener("click", () => {
    searchArea(document.getElementById("searchInput").value);
  });
  document.getElementById("locateBtn").addEventListener("click", tryGeolocate);
  setupAddFlow();
});

function setupAddFlow()
