document.addEventListener('DOMContentLoaded', () => {

/* =========================
   Constants and state
   ========================= */
const DK_BOUNDS = { minLat: 54.56, maxLat: 57.75, minLng: 8.07, maxLng: 15.19 };
function isInDenmark(lat, lng) {
  return lat >= DK_BOUNDS.minLat && lat <= DK_BOUNDS.maxLat &&
         lng >= DK_BOUNDS.minLng && lng <= DK_BOUNDS.maxLng;
}

// Fallback near Helsingør to reflect your location
let userLat = 56.0308;
let userLng = 12.6136;

/* =========================
   Area index for search (centers + radius in km)
   ========================= */
const AREA_INDEX = [
  // København-områder
  { key:["københavn","copenhagen","kbh"], center:[55.6761,12.5683], radiusKm:25 },
  { key:["amager","københavn s","2300"], center:[55.64,12.60], radiusKm:10 },
  { key:["brøndby","2605"], center:[55.648,12.418], radiusKm:10 },
  { key:["roskilde","4000"], center:[55.6419,12.0870], radiusKm:14 },
  { key:["hillerød","3400"], center:[55.927,12.313], radiusKm:12 },
  { key:["frederikssund","3600"], center:[55.8365,12.068], radiusKm:12 },

  // Nordsjælland
  { key:["helsingør","3000"], center:[56.036,12.611], radiusKm:12 },
  { key:["humlebæk","3050"], center:[55.969,12.533], radiusKm:10 },
  { key:["nivå","2990"], center:[55.943,12.505], radiusKm:10 },
  { key:["hørsholm","2970"], center:[55.875,12.498], radiusKm:10 },

  // Fyn
  { key:["odense","5000"], center:[55.403,10.388], radiusKm:14 },
  { key:["nyborg","5800"], center:[55.311,10.799], radiusKm:12 },

  // Jylland
  { key:["aarhus","århus","8000"], center:[56.1629,10.2039], radiusKm:14 },
  { key:["randers","8900"], center:[56.46,10.04], radiusKm:12 },
  { key:["vejle","7100"], center:[55.71,9.53], radiusKm:12 },
  { key:["esbjerg","6700"], center:[55.476,8.459], radiusKm:14 },
  { key:["aalborg","9000"], center:[57.0488,9.9217], radiusKm:14 },
  { key:["kolding","6000"], center:[55.491,9.472], radiusKm:14 },
  { key:["silkeborg","8600"], center:[56.1697,9.5451], radiusKm:12 },
  { key:["horsens","8700"], center:[55.860,9.85], radiusKm:12 }
];

function findArea(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const area of AREA_INDEX) {
    if (area.key.some(k => q.includes(k))) return area;
  }
  return null;
}

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

/* =========================
   Data: load ALL spots from local JSON
   ========================= */
let parkingSpots = [];

function validateAndKeepDK(spots) {
  return spots.filter(s => {
    const valid = typeof s.lat === 'number' && typeof s.lng === 'number';
    return valid && isInDenmark(s.lat, s.lng);
  });
}

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

function fitAllDKSpotsInitially() {
  const layers = parkingSpots.map(s => s.marker).filter(Boolean);
  if (layers.length > 0) {
    const group = L.featureGroup(layers);
    map.fitBounds(group.getBounds().pad(0.12));
  } else {
    map.setView([55.8, 11.0], 6);
  }
}

/* =========================
   Nearby list – ALL spots, sorted by distance
   ========================= */
function renderNearbyAll(lat, lng) {
  const ul = document.getElementById('parkingList');
  const meta = document.getElementById('nearbyMeta');
  ul.innerHTML = '';

  const sortedAll = parkingSpots
    .filter(s => isInDenmark(s.lat, s.lng))
    .map(s => ({ ...s, distKm: distanceKm(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.distKm - b.distKm);

  meta.textContent = `Afstand fra din position — viser alle ${sortedAll.length} spots i Danmark`;

  sortedAll.forEach(spot => {
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
   Geolocation (for sorting)
   ========================= */
let userMarker = null;
function setUserMarker(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat, lng], {
    radius: 8, color: '#ffffff', weight: 3, fillColor: '#007AFF', fillOpacity: 1
  }).addTo(map).bindPopup('Din position');
}
function initGeolocationAndNearby() {
  // Do not move the map; just set user marker and render nearby list (ALL spots sorted).
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      if (isInDenmark(userLat, userLng)) setUserMarker(userLat, userLng);
      renderNearbyAll(userLat, userLng);
    }, () => {
      renderNearbyAll(userLat, userLng);
    }, { enableHighAccuracy: true, timeout: 12000 });
  } else {
    renderNearbyAll(userLat, userLng);
  }
}

/* =========================
   Slick search with AREA matching
   - Area radius first (Amager, København, Roskilde, Helsingør, ...)
   - Fallback: name/address contains
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
      map.setView([spot.lat, spot.lng], 14);
      spot.marker && spot.marker.openPopup();
      searchInput.value = '';
      hideSearchResults();
      renderNearbyAll(userLat, userLng);
    });
    ul.appendChild(li);
  });
  searchResultsBox.innerHTML = '';
  searchResultsBox.appendChild(ul);
  searchResultsBox.classList.remove('hidden');
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  const qLower = q.toLowerCase();

  if (!qLower) {
    hideSearchResults();
    renderNearbyAll(userLat, userLng);
    return;
  }

  // 1) Area match first
  const area = findArea(qLower);
  let matches = [];
  if (area) {
    const [clat, clng] = area.center;
    matches = parkingSpots.filter(s => {
      if (!isInDenmark(s.lat, s.lng)) return false;
      const d = distanceKm(clat, clng, s.lat, s.lng);
      return d <= area.radiusKm;
    });
  }

  // 2) Fallback: name/address contains
  if (matches.length === 0) {
    matches = parkingSpots.filter(s =>
      (s.name || '').toLowerCase().includes(qLower) ||
      (s.address || '').toLowerCase().includes(qLower)
    );
  }

  if (matches.length > 0) renderSearchResults(matches);
  else showNoResults();
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  hideSearchResults();
  renderNearbyAll(userLat, userLng);
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.search-wrapper');
  if (!wrapper.contains(e.target) && !searchResultsBox.contains(e.target)) {
    hideSearchResults();
  }
});
// Close dropdown with ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideSearchResults();
});

/* =========================
   Load ALL spots from local JSON
   ========================= */
function loadLocalSpotsJSON() {
  fetch('parkingSpots.json')
    .then(res => res.json())
    .then(data => {
      const dkOnly = validateAndKeepDK(data);
      parkingSpots = dkOnly;
      // Add all to map
      parkingSpots.forEach(addSpotToMap);
      // Fit to all
      fitAllDKSpotsInitially();
      // Render list
      renderNearbyAll(userLat, userLng);
    })
    .catch(err => {
      console.error("Kunne ikke indlæse parkingSpots.json:", err);
      // Even if JSON fails, still render empty list so UI is consistent
      renderNearbyAll(userLat, userLng);
    });
}

/* =========================
   Initial render
   ========================= */
loadLocalSpotsJSON();
initGeolocationAndNearby();

});
