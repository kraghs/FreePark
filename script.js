/* FreePark — script.js
   - Leaflet map
   - sample dataset (kan udvides)
   - search via Nominatim
   - add marker with reverse geocode using Nominatim
*/

const spotsKey = 'freepark_spots_v1';

// ---------- Sample dataset (start) ----------
// Disse poster er eksempler samlet fra kommunale oversigter/parkeringguides.
// Udvid ved at hente kommunale API'er eller CSV'er og push ind i samme format.
let initialSpots = [
  {
    id: 'cp_hellerup_station',
    name: 'Hellerup Station P-område (tidsbegrænset)',
    address: 'Ryvangs Allé 79C, 2900 Hellerup',
    lat: 55.7253,
    lon: 12.5667,
    info: 'Korttidsparkering / gratis i visse tidsrum eller ved registrering — tjek lokal skiltning.'
  },
  {
    id: 'cp_vanlose_station',
    name: 'Vanløse Station P-område',
    address: 'Vanløse Station, Vanløse, København',
    lat: 55.6857,
    lon: 12.4883,
    info: 'Korttidsparkering i nærheden af station; lokale regler kan gælde.'
  },
  {
    id: 'roskilde_musicon',
    name: 'Musicon P-plads (Roskilde)',
    address: 'Musicon, Roskilde',
    lat: 55.6390,
    lon: 12.0800,
    info: 'Betalingsparkering med de første 2 timer gratis (kommunal information).'
  },
  {
    id: 'odense_turist',
    name: 'Odense - Gratis p-pladser ved udvalgte attraktioner',
    address: 'Odense bymidte (udvalgte pladser)',
    lat: 55.4038,
    lon: 10.4024,
    info: 'Se Odense kommunes parkeringsoversigt for nøjagtige pladser og regler.'
  }
];

// load from localStorage or use initial
let stored = JSON.parse(localStorage.getItem(spotsKey) || 'null');
let spots = stored && Array.isArray(stored) ? stored : initialSpots.slice();
localStorage.setItem(spotsKey, JSON.stringify(spots));

// ---------- Map init ----------
const map = L.map('map', {zoomControl: false}).setView([56.0, 10.0], 6);

// Clean tile (Carto Positron)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors & CartoDB',
  maxZoom: 19
}).addTo(map);

// custom blue location marker (circle with white border)
let userLocationMarker = null;
function showUserLocation(lat, lon){
  if(userLocationMarker) map.removeLayer(userLocationMarker);
  userLocationMarker = L.circleMarker([lat,lon], {
    radius: 10,
    color: '#fff',
    weight: 4,
    fillColor: '#007aff',
    fillOpacity: 1
  }).addTo(map);
  map.setView([lat,lon], 14);
  refreshNearest(lat, lon);
}

// ---------- Markers ----------
let markersLayer = L.layerGroup().addTo(map);

function renderMarkers(){
  markersLayer.clearLayers();
  spots.forEach(s => {
    const m = L.marker([s.lat, s.lon]).addTo(markersLayer);
    const popupHtml = `
      <div style="min-width:220px">
        <div style="font-weight:700">${escapeHtml(s.name)}</div>
        <div style="font-size:13px;color:#666">${escapeHtml(s.address)}</div>
        <div style="margin-top:8px;text-align:right">
          <button class="infoBtn" data-id="${s.id}">Info</button>
        </div>
      </div>
    `;
    m.bindPopup(popupHtml);
    m.on('popupopen', () => {
      // hook info button
      setTimeout(() => {
        const btn = document.querySelector('.infoBtn[data-id="'+s.id+'"]');
        if(btn) btn.addEventListener('click', () => openInfoModal(s));
      }, 10);
    });
  });
}
renderMarkers();

// ---------- Nearest 5 calculation ----------
function getDistanceKm(lat1, lon1, lat2, lon2){
  // haversine
  const R=6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

function refreshNearest(userLat, userLon){
  const list = spots.map(s => {
    const d = getDistanceKm(userLat, userLon, s.lat, s.lon);
    return {...s, dist: d};
  }).sort((a,b)=>a.dist-b.dist).slice(0,5);

  const ul = document.getElementById('nearList');
  ul.innerHTML = '';
  list.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="spot-left">
        <div class="spot-name">${escapeHtml(s.name)}</div>
        <div class="spot-addr">${escapeHtml(s.address)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${s.dist.toFixed(2)} km</div>
        <div style="font-size:12px;color:#666"> </div>
      </div>
    `;
    li.addEventListener('click', () => {
      map.setView([s.lat, s.lon], 16);
    });
    ul.appendChild(li);
  });
}

// if no user location yet, center on Denmark and show top 5 by nearest to Copenhagen center
refreshNearest(55.6759, 12.5655);

// ---------- Search (Nominatim) ----------
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if(e.key === 'Enter') doSearch(); });

async function doSearch(){
  const q = searchInput.value.trim();
  if(!q) return;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Denmark')}&limit=1`;
  try {
    const res = await fetch(url, {headers:{'Accept-Language':'da'}});
    const data = await res.json();
    if(data && data[0]){
      const bbox = data[0].boundingbox.map(Number);
      const lat = Number(data[0].lat), lon = Number(data[0].lon);
      map.setView([lat, lon], 13);
      // after moving, refresh nearest to center of view
      refreshNearest(lat, lon);
    } else {
      alert('Ingen resultater fra søgningen.');
    }
  } catch(err){
    console.error(err); alert('Søgning fejlede.');
  }
}

// ---------- Geolocation button ----------
document.getElementById('locateBtn').addEventListener('click', () => {
  if(!navigator.geolocation){ alert('Geolocation ikke understøttet i denne browser.'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    showUserLocation(lat, lon);
  }, err => {
    alert('Kunne ikke hente din lokation: ' + err.message);
  }, {enableHighAccuracy:true});
});

// ---------- Add marker modal ----------
const addBtn = document.getElementById('addBtn');
const addModal = document.getElementById('addModal');
const addName = document.getElementById('addName');
const addAddress = document.getElementById('addAddress');
const addInfo = document.getElementById('addInfo');
const useMyLocationBtn = document.getElementById('useMyLocation');
let pendingLat = null, pendingLon = null;

addBtn.addEventListener('click', () => {
  addModal.classList.remove('hidden');
  addName.value=''; addAddress.value=''; addInfo.value=''; pendingLat=null; pendingLon=null;
});

document.getElementById('cancelAdd').addEventListener('click', ()=> addModal.classList.add('hidden'));

useMyLocationBtn.addEventListener('click', async () => {
  if(!navigator.geolocation){ alert('Geolocation ikke understøttet.'); return; }
  useMyLocationBtn.innerText = 'Finder ...';
  navigator.geolocation.getCurrentPosition(async pos => {
    pendingLat = pos.coords.latitude; pendingLon = pos.coords.longitude;
    // reverse geocode via Nominatim
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pendingLat}&lon=${pendingLon}`);
      const j = await r.json();
      addAddress.value = j.display_name || '';
    } catch(e){
      console.error(e);
      alert('Kunne ikke opslå adresse.');
    } finally {
      useMyLocationBtn.innerText = 'Brug min lokation';
    }
  }, err => {
    alert('Fejl i geolocation: ' + err.message);
    useMyLocationBtn.innerText = 'Brug min lokation';
  }, {enableHighAccuracy:true});
});

document.getElementById('saveAdd').addEventListener('click', () => {
  const name = addName.value.trim();
  const address = addAddress.value.trim();
  const info = addInfo.value.trim();
  if(!name || !address){ alert('Udfyld navn og adresse.'); return; }

  // if user ikke brugte "brug min lokation", geocode address to get coords
  (async () => {
    let lat= pendingLat, lon=pendingLon;
    if(!lat || !lon){
      // geocode address
      try{
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Denmark')}&limit=1`);
        const j = await res.json();
        if(j && j[0]){ lat = Number(j[0].lat); lon = Number(j[0].lon); }
        else { alert('Kunne ikke finde koordinater for adressen. Prøv "Brug min lokation" eller skriv mere præcist.'); return; }
      }catch(e){ alert('Geokodning fejlede.'); return; }
    }

    const id = 'u_' + Date.now();
    const newSpot = {id,name,address,lat,lon,info};
    spots.push(newSpot);
    localStorage.setItem(spotsKey, JSON.stringify(spots));
    renderMarkers();
    addModal.classList.add('hidden');
    // center to new spot
    map.setView([lat,lon],16);
    // update nearest list relative to new spot
    refreshNearest(lat,lon);
  })();
});

// ---------- Info modal ----------
const infoModal = document.getElementById('infoModal');
function openInfoModal(s){
  document.getElementById('infoName').innerText = s.name;
  document.getElementById('infoAddress').innerText = s.address;
  document.getElementById('infoText').innerText = s.info || '';
  infoModal.classList.remove('hidden');
}
document.getElementById('closeInfo').addEventListener('click', ()=> infoModal.classList.add('hidden'));

// ---------- Utilities ----------
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

map.on('moveend', () => {
  const center = map.getCenter();
  refreshNearest(center.lat, center.lng);
});

// ensure initial render of nearest relative to center (if user not located)
const c = map.getCenter();
refreshNearest(c.lat, c.lng);
