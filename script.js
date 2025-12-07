document.addEventListener('DOMContentLoaded', () => {

/* =========================
   Constants and state
   ========================= */
const DK_BOUNDS = { minLat: 54.56, maxLat: 57.75, minLng: 8.07, maxLng: 15.19 };
function isInDenmark(lat, lng) {
  return lat >= DK_BOUNDS.minLat && lat <= DK_BOUNDS.maxLat &&
         lng >= DK_BOUNDS.minLng && lng <= DK_BOUNDS.maxLng;
}

let userLat = 56.0308; // fallback near Helsingør
let userLng = 12.6136;

/* =========================
   Seed spots (DK-only) – shown immediately
   ========================= */
let parkingSpots = [
  // Sjælland/Nordsjælland
  { name:"Helsingør Nordhavn", address:"Nordhavnsvej, 3000 Helsingør", lat:56.0390, lng:12.6130, note:"Gratis på udvalgte tider" },
  { name:"Kronborg Område", address:"Kronborg 2 C, 3000 Helsingør", lat:56.0385, lng:12.6201, note:"Gratis zoner tæt på slottet (tjek skiltning)" },
  { name:"Nivå Havn", address:"Havnen 1, 2990 Nivå", lat:55.9434, lng:12.5050, note:"Ofte gratis efter 18" },
  { name:"Hørsholm Parkvej", address:"Parkvej, 2970 Hørsholm", lat:55.8750, lng:12.4980, note:"Offentlige p-pladser" },
  { name:"Humlebæk Strand", address:"Strandvejen, 3050 Humlebæk", lat:55.9690, lng:12.5330, note:"Gratis strandparkering uden for sæson" },

  // København og omegn
  { name:"Amager Strandpark", address:"Amager Strandvej, 2300 København S", lat:55.6469, lng:12.5950, note:"Stor p‑plads ved stranden" },
  { name:"Brøndby Stadion", address:"Brøndby Stadion 1, 2605 Brøndby", lat:55.6480, lng:12.4180, note:"Gratis ved kampdage" },
  { name:"Roskilde Havn", address:"Strandgade, 4000 Roskilde", lat:55.6420, lng:12.0830, note:"Stor p‑plads nær havnen" },

  // Fyn
  { name:"Odense Havn", address:"Havnegade, 5000 Odense", lat:55.4038, lng:10.3883, note:"Gratis efter kl. 18" },

  // Jylland
  { name:"Tangkrogen", address:"Marselisborg Havnevej 4, 8000 Aarhus", lat:56.1520, lng:10.2030, note:"Stor p‑plads ved havnen" },
  { name:"Ceres Park", address:"Stadion Allé 70, 8000 Aarhus", lat:56.1515, lng:10.2050, note:"Gratis i weekenden" },
  { name:"Esbjerg Strand", address:"Strandpromenaden, 6700 Esbjerg", lat:55.4737, lng:8.4200, note:"Offentlig p‑plads, ofte ledig" },
  { name:"Aalborg Vestby", address:"Nørresundby nær Broen, 9000 Aalborg", lat:57.0500, lng:9.9210, note:"Gratis zoner – tjek skiltning" },
  { name:"Kolding Marina", address:"Marinavej, 6000 Kolding", lat:55.4900, lng:9.4800, note:"Gratis efter 18" }
].filter(s => isInDenmark(s.lat, s.lng));

/* =========================
   Map setup with clean Apple-like style
   ========================= */
const map = L.map('map', { preferCanvas: true }).setView([55.8, 11.0], 6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & CARTO',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

/* =========================
   Utilities
   ========================= */
function toRad(x) { return x * Math.PI / 180; }
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function fmt(text){ return (text||"").trim(); }
function isDuplicate(a,b){
  const nameMatch = fmt(a.name).toLowerCase() === fmt(b.name).toLowerCase();
  const addrMatch = fmt(a.address).toLowerCase() === fmt(b.address).toLowerCase();
  const close = distanceKm(a.lat,a.lng,b.lat,b.lng) < 0.05; // 50 meter
  return (nameMatch && addrMatch) || close;
}

/* =========================
   Marker creation – show ALL spots immediately
   ========================= */
function markerPopupHTML(spot) {
  const note = spot.note ? `<p>${spot.note}</p>` : '';
  return `
    <div>
      <strong>${spot.name}</strong><br/>
      <small>${spot.address || 'Ukendt adresse'}</small>
      ${note}
      <div style="margin-top:8px;">
        <button class="open-info-btn" style="background:#007AFF;border:none;color:#fff;padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:700">Se detaljer</button>
      </div>
    </div>
  `;
}
function addSpotToMap(spot) {
  if (!isInDenmark(spot.lat, spot.lng)) return;
  const marker = L.circleMarker([spot.lat, spot.lng], {
    radius: 6,
    color: '#0bb07b',
    weight: 2,
    fillColor: '#00c07b',
    fillOpacity: 1
  }).addTo(map);
  marker.bindPopup(markerPopupHTML(spot));
  marker.on('popupopen', () => {
    const el = marker.getPopup().getElement();
    const btn = el.querySelector('.open-info-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openInfoModal(spot);
      });
    }
  });
  spot.marker = marker;
}
// Add all spots to the map immediately
parkingSpots.forEach(addSpotToMap);

/* =========================
   Fit to all DK spots initially
   ========================= */
(function fitAllDKSpotsInitially() {
  const layers = parkingSpots.map(s => s.marker).filter(Boolean);
  if (layers.length > 0) {
    const group = L.featureGroup(layers);
    map.fitBounds(group.getBounds().pad(0.12));
  } else {
    map.setView([55.8, 11.0], 6);
  }
})();

/* =========================
   User geolocation (optional, for nearby)
   ========================= */
let userMarker = null;
function setUserMarker(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat, lng], {
    radius: 8, color: '#ffffff', weight: 3, fillColor: '#007AFF', fillOpacity: 1
  }).addTo(map).bindPopup('Din position');
}
function initGeolocationAndNearby() {
  // Do not move the map; just set user marker and render nearby
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      if (isInDenmark(userLat, userLng)) {
        setUserMarker(userLat, userLng);
      }
      renderNearbySpotsTop5(userLat, userLng);
    }, () => {
      renderNearbySpotsTop5(userLat, userLng);
    }, { enableHighAccuracy: true, timeout: 12000 });
  } else {
    renderNearbySpotsTop5(userLat, userLng);
  }
}

/* =========================
   Nearby spots list – TOP 5, sorted by distance
   ========================= */
function renderNearbySpotsTop5(lat, lng) {
  const ul = document.getElementById('parkingList');
  const meta = document.getElementById('nearbyMeta');
  ul.innerHTML = '';

  const sortedAll = parkingSpots
    .filter(s => isInDenmark(s.lat, s.lng))
    .map(s => ({ ...s, distKm: distanceKm(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.distKm - b.distKm);

  const top5 = sortedAll.slice(0, 5);
  meta.textContent = `Afstand fra din position — viser top 5 af ${sortedAll.length} spots`;

  top5.forEach(spot => {
    const li = document.createElement('li');

    const left = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'parking-item-title';
    title.textContent = spot.name;

    const sub = document.createElement('div');
    sub.className = 'parking-item-sub';
    sub.textContent = spot.address && spot.address.trim() ? spot.address : 'Ukendt adresse';

    left.appendChild(title);
    left.appendChild(sub);

    const right = document.createElement('div');
    const badge = document.createElement('span');
    badge.className = 'distance-badge';
    badge.textContent = `${spot.distKm.toFixed(1)} km`;
    right.appendChild(badge);

    li.appendChild(left);
    li.appendChild(right);

    li.addEventListener('click', () => {
      map.setView([spot.lat, spot.lng], 14);
      spot.marker && spot.marker.openPopup();
    });

    ul.appendChild(li);
  });
}

/* =========================
   Info modal
   ========================= */
function openInfoModal(spot) {
  document.getElementById('infoTitle').textContent = spot.name;
  document.getElementById('infoAddress').textContent = `Adresse: ${spot.address || 'Ukendt adresse'}`;
  const details = [];
  if (spot.note) details.push(`<p>${spot.note}</p>`);
  document.getElementById('infoDetails').innerHTML = details.join('');
  const overlay = document.getElementById('infoModal');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}
function closeInfoModal() {
  const overlay = document.getElementById('infoModal');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}
document.getElementById('closeInfoBtn').addEventListener('click', closeInfoModal);
document.getElementById('infoModal').addEventListener('click', (e) => {
  if (e.target.id === 'infoModal') closeInfoModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeInfoModal();
});

/* =========================
   Slick search with dropdown
   - Does not move the map while typing
   - Moves only when a result is clicked
   ========================= */
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const searchResultsBox = document.getElementById('searchResults');

function hideSearchResults() {
  searchResultsBox.classList.add('hidden');
  searchResultsBox.innerHTML = '';
}
function showNoResults() {
  searchResultsBox.innerHTML = '<div class="no-results">Ingen resultater</div>';
  searchResultsBox.classList.remove('hidden');
}
function renderSearchResults(items) {
  const ul = document.createElement('ul');
  items.forEach(spot => {
    const li = document.createElement('li');
    li.textContent = `${spot.name} — ${spot.address || 'Ukendt adresse'}`;
    li.addEventListener('click', () => {
      // Only on click: move the map and open popup
      map.setView([spot.lat, spot.lng], 14);
      spot.marker && spot.marker.openPopup();
      // Clear dropdown and input, restore nearby list
      searchInput.value = '';
      hideSearchResults();
      renderNearbySpotsTop5(userLat, userLng);
    });
    ul.appendChild(li);
  });
  searchResultsBox.innerHTML = '';
  searchResultsBox.appendChild(ul);
  searchResultsBox.classList.remove('hidden');
}
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    hideSearchResults();
    renderNearbySpotsTop5(userLat, userLng);
    return;
  }
  const matches = parkingSpots.filter(s =>
    (s.name || '').toLowerCase().includes(q) ||
    (s.address || '').toLowerCase().includes(q)
  );
  if (matches.length > 0) renderSearchResults(matches);
  else showNoResults();
});
clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  hideSearchResults();
  renderNearbySpotsTop5(userLat, userLng);
});
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.search-wrapper');
  if (!wrapper.contains(e.target) && !searchResultsBox.contains(e.target)) {
    hideSearchResults();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideSearchResults();
});

/* =========================
   Optional: Overpass import for DK-only free parking
   - Loads amenity=parking with fee=no inside DK bounds
   - Dedupes and adds markers without moving the map
   ========================= */
async function loadOSMFreeParkingDK() {
  try {
    const bbox = `${DK_BOUNDS.minLat},${DK_BOUNDS.minLng},${DK_BOUNDS.maxLat},${DK_BOUNDS.maxLng}`;
    const q = `
      [out:json][timeout:30];
      (
        node["amenity"="parking"]["fee"="no"](${bbox});
        way["amenity"="parking"]["fee"="no"](${bbox});
        relation["amenity"="parking"]["fee"="no"](${bbox});
      );
      out center tags;
    `;
    const url = "https://overpass-api.de/api/interpreter";
    const res = await axios.post(url, q, { headers: { 'Content-Type':'text/plain' } });
    const data = res.data;
    const imported = [];

    if (data && data.elements) {
      data.elements.forEach(el => {
        const lat = el.lat || (el.center && el.center.lat);
        const lon = el.lon || (el.center && el.center.lon);
        if (!lat || !lon) return;
        if (!isInDenmark(lat, lon)) return;

        const tags = el.tags || {};
        const name = tags.name || "Offentlig parkering";
        const addrParts = [
          tags["addr:street"],
          tags["addr:housenumber"],
          tags["addr:postcode"],
          tags["addr:city"]
        ].filter(Boolean);
        const address = addrParts.join(", ") || "Ukendt adresse";

        const maxstay = tags.maxstay || "";
        const opening = tags.opening_hours || "";
        const access = tags.access || "";
        const parkingType = tags.parking || "";

        const notePieces = [];
        if (access) notePieces.push(`Adgang: ${access}`);
        notePieces.push("Gratis parkering");
        if (parkingType) notePieces.push(`Type: ${parkingType}`);

        const spot = {
          name,
          address,
          lat,
          lng: lon,
          note: notePieces.join(" • "),
          timeLimit: maxstay,
          freeHours: opening
        };

        const exists = parkingSpots.some(s => isDuplicate(s, spot));
        if (!exists) {
          parkingSpots.push(spot);
          addSpotToMap(spot);
          imported.push(spot);
        }
      });
    }

    // Do not move map; just refresh nearby list with top 5
    renderNearbySpotsTop5(userLat, userLng);
    console.log(`OSM import: indlæst ${imported.length} gratis p-pladser i DK.`);
  } catch (err) {
    console.warn("Kunne ikke hente OSM-data:", err);
  }
}

/* =========================
   Initial render
   ========================= */
// Geolocation + nearby top 5
initGeolocationAndNearby();

// Optionally load DK-only free parking from OSM (comment out if you prefer only seed)
loadOSMFreeParkingDK();

});
