let map;
let userMarker = null;
let selectedSpot = null;

let parkingSpots = [
  {
    name: "Gammel Kongevej",
    address: "Gammel Kongevej 23, 1610 København V",
    lat: 55.6703,
    lng: 12.5521,
    info: "Gratis parkering efter 17 og i weekenden. Tjek skilte."
  },
  {
    name: "Amerika Plads",
    address: "Amerika Plads 29, 2100 København",
    lat: 55.7028,
    lng: 12.5938,
    info: "Gratis efter 17:00 på hverdage og hele søndag."
  },
  {
    name: "Kastelsvej",
    address: "Kastelsvej 2, 2100 København",
    lat: 55.6974,
    lng: 12.5897,
    info: "Gratis hele weekenden. Tjek skilte ved helligdage."
  },
  {
    name: "Axeltorv",
    address: "Axeltorv 1, 3000 Helsingør",
    lat: 56.0363,
    lng: 12.6133,
    info: "Gratis 24/7 — men max 2 timer. Brug P-skive."
  },
  {
    name: "Svingelport",
    address: "Svingelport 6, 3000 Helsingør",
    lat: 56.0358,
    lng: 12.6172,
    info: "Gratis om aftenen og hele søndag."
  }
];

function initMap() {
  map = L.map('map', {
    center: [55.6761, 12.5683],
    zoom: 14,
    zoomControl: false,
    attributionControl: false
  });

  const darkTiles = L.tileLayer(
    "https://{s}.tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=ZGozmDbWkE5kORjtfTw0MuxN3xWUddnVV2STT3qE6F8h0LqDoEcvJiF6V8SfSAOU",
    {
      maxZoom: 19
    }
  );
  darkTiles.addTo(map);

  parkingSpots.forEach(spot => addSpotMarker(spot));
  map.locate({ enableHighAccuracy: true });

  map.on('locationfound', e => {
    setUserMarker(e.latitude, e.longitude);
    updateNearbyList(e.latitude, e.longitude);
  });

  map.on('locationerror', () => { });
}

function setUserMarker(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat, lng], {
    radius: 8,
    color: '#ffffff',
    weight: 3,
    fillColor: '#007AFF',
    fillOpacity: 1
  }).addTo(map).bindPopup("Din position");
}

window._openSpotInfo = function(name) {
  const spot = parkingSpots.find(s => s.name === name);
  if (spot) openInfoModal(spot);
};

function addSpotMarker(spot) {
  const circle = L.circleMarker([spot.lat, spot.lng], {
    radius: 6,
    color: "#1ED760",
    weight: 2,
    fillColor: "#23E07B",
    fillOpacity: 0.9
  });

  circle.bindPopup(`
    <strong>${escapeHtml(spot.name)}</strong><br>
    <small>${escapeHtml(spot.address)}</small>
    <br>
    <div style="margin-top:8px;">
      <button style="background:#007AFF;border:none;color:white;padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:600"
        onclick="window._openSpotInfo('${escapeJs(spot.name)}')">
        Se info
      </button>
    </div>
  `);

  circle.addTo(map);

  circle.on("click", () => {
    selectedSpot = spot;
  });
}

function updateNearbyList(lat, lng) {
  let distances = parkingSpots.map(spot => {
    let d = distance(lat, lng, spot.lat, spot.lng);
    return { ...spot, dist: d };
  }).sort((a, b) => a.dist - b.dist);

  let html = '';
  distances.slice(0, 5).forEach(spot => {
    html += `
      <div class="spot-item" onclick="zoomToSpot(${spot.lat}, ${spot.lng})">
        <strong>${escapeHtml(spot.name)}</strong>
        <br><small>${spot.dist.toFixed(1)} km herfra</small>
        <br>
        <button onclick="openInfoModalByName('${escapeJs(spot.name)}')" class="info-btn">Se info</button>
      </div>
    `;
  });
  document.getElementById('nearbyList').innerHTML = html;
}

function zoomToSpot(lat, lng) { map.setView([lat, lng], 16); }

function openInfoModalByName(name) {
  const spot = parkingSpots.find(s => s.name === name);
  if (spot) openInfoModal(spot);
}

function openInfoModal(spot) {
  document.getElementById("infoName").innerText = spot.name;
  document.getElementById("infoAddress").innerText = spot.address;
  document.getElementById("infoText").innerText = spot.info;
  document.getElementById("spotInfoModal").style.display = "flex";
}

function closeInfoModal() {
  document.getElementById("spotInfoModal").style.display = "none";
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m];
  });
}

function escapeJs(text) {
  return text.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function distance(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a =
    0.5 - Math.cos(dLat) / 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    (1 - Math.cos(dLon)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

initMap();
