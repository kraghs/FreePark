document.addEventListener('DOMContentLoaded', () => {

  let parkingSpots = [];
  let userLat = 55.6761, userLng = 12.5683;
  let map, userMarker;

  // Init map
  map = L.map('map', { preferCanvas: true }).setView([userLat, userLng], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toRad(x){ return x*Math.PI/180; }
  function distanceKm(lat1, lon1, lat2, lon2){
    const R=6371; const dLat=toRad(lat2-lat1); const dLon=toRad(lon2-lon1);
    const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Load spots from JSON
  axios.get('spots.json').then(resp=>{
    parkingSpots = resp.data;
    parkingSpots.forEach(addSpotMarker);
    renderNearby();
  }).catch(err=>console.error('Kunne ikke hente spots.json', err));

  function addSpotMarker(spot){
    const marker = L.circleMarker([spot.lat, spot.lng], { radius:6, color:'#0bb07b', weight:2, fillColor:'#00c07b', fillOpacity:1 }).addTo(map);
    const popupHtml = `<strong>${escapeHtml(spot.name)}</strong><br>${escapeHtml(spot.address)}<br>
      <div style="margin-top:6px"><button class="popupInfoBtn" data-name="${escapeHtml(spot.name)}">Se info</button></div>`;
    marker.bindPopup(popupHtml);
    spot.marker = marker;
    marker.on('popupopen', ()=>{
      const btn = document.querySelector(`.popupInfoBtn[data-name="${escapeHtml(spot.name)}"]`);
      if(btn) btn.addEventListener('click', ()=> openInfoModal(spot));
    });
  }

  function renderNearby(centerLat=userLat, centerLng=userLng){
    const list = document.getElementById('parkingList');
    list.innerHTML = '';
    parkingSpots.map(s=>({...s, dist: distanceKm(centerLat, centerLng, s.lat, s.lng)}))
                .sort((a,b)=>a.dist-b.dist).slice(0,5)
                .forEach(spot=>{
                  const li = document.createElement('li');
                  li.innerHTML = `<div><strong>${escapeHtml(spot.name)}</strong><div class="meta">${escapeHtml(spot.address)} • ${spot.dist.toFixed(1)} km</div></div>`;
                  const btn = document.createElement('button'); btn.textContent='Se info';
                  btn.addEventListener('click', e=>{ e.stopPropagation(); openInfoModal(spot); });
                  li.appendChild(btn);
                  li.addEventListener('click', ()=>{ map.setView([spot.lat,spot.lng],14); if(spot.marker) spot.marker.openPopup(); });
                  list.appendChild(li);
                });
  }

  function openInfoModal(spot){
    document.getElementById('infoTitle').textContent=spot.name;
    document.getElementById('infoAddress').textContent='Adresse: '+spot.address;
    document.getElementById('infoNote').textContent=spot.note+' — Husk altid at tjekke skilte.';
    document.getElementById('infoModal').classList.remove('hidden');
  }
  document.getElementById('closeInfoBtn').addEventListener('click', ()=>document.getElementById('infoModal').classList.add('hidden'));

  // Brug min lokation
  document.getElementById('useMyLocationBtn').addEventListener('click', ()=>{
    if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      userLat = pos.coords.latitude; userLng=pos.coords.longitude;
      if(userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker([userLat,userLng], { radius:9, weight:3, color:'#fff', fillColor:'#0a84ff', fillOpacity:1 }).addTo(map).bindPopup('Din position');
      map.setView([userLat,userLng],13);
      renderNearby(userLat,userLng);
    }, ()=>alert('Kunne ikke hente lokation'));
  });


  matches.forEach(spot => {
    const row = document.createElement('div');
    row.className = 'result';
    row.innerHTML = `
      <div>
        <strong>${spot.name}</strong><br>
        <small>${spot.address}</small>
      </div>
    `;
    row.addEventListener('click', () => {
      map.setView([spot.lat, spot.lng], 14);
      if (spot.marker) spot.marker.openPopup();
      openInfoModal(spot);
      searchResults.classList.add('hidden');
      searchInput.value = '';
    });
    searchResults.appendChild(row);
  });

  searchResults.classList.remove('hidden');
});

});
async function fetchParkingFromOSM(bbox=null) {
  // Hvis du vil søge i hele Danmark:
  // bbox = [8.080, 54.560, 15.180, 57.800]; // DK bounding box
  // bbox = null; // så søges uden bbox

  // Overpass query (leder efter parking = free eller permissive)
  const query = `
    [out:json][timeout:25];
    ${bbox ? `(
      node["amenity"="parking"]["parking:fee"="no"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
      way["amenity"="parking"]["parking:fee"="no"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
    );` :
    `(
      node["amenity"="parking"]["parking:fee"="no"];
      way["amenity"="parking"]["parking:fee"="no"];
    );
    `}
    out center;
  `;

  const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

  const response = await fetch(url);
  const data = await response.json();
  const elements = data.elements;

  // formatter output
  const parkings = elements.map(p => ({
      name: p.tags.name || "Gratis parkering",
      lat: p.lat || p.center?.lat,
      lng: p.lon || p.center?.lon,
      freeInfo: "Gratis ifølge OSM",
      osmId: p.id
  }));

  return parkings;
}

// Eksempel på brug:
fetchParkingFromOSM().then(parkings => {
  console.log("Hentede parkeringer:", parkings);
  // Her kan du markere dem på kortet

  // ================================
// NY SØGEFUNKTION — SIKKER VERSION
// ================================

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

// Geo-søgning fra Nominatim (by, område, adresse)
// NOTE: Vi undlader at sætte User-Agent header fordi browsere blokerer den.
async function geoSearch(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=dk&limit=8&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("GeoSearch fejl:", e);
    return [];
  }
}

// Filtrér spots i et område (bounding box)
function filterSpotsInBBox(bbox) {
  // boundingbox fra Nominatim = [south, north, west, east] eller [south, north, west, east] strings
  // Vi normaliserer til [minLon, minLat, maxLon, maxLat]
  // Nominatim giver boundingbox som [south, north, west, east] (lat/lon strings)
  const south = Number(bbox[0]);
  const north = Number(bbox[1]);
  const west = Number(bbox[2]);
  const east = Number(bbox[3]);
  const minLat = south, maxLat = north, minLon = west, maxLon = east;

  return parkingSpots.filter(s =>
    typeof s.lat === 'number' && typeof s.lng === 'number' &&
    s.lat >= minLat &&
    s.lat <= maxLat &&
    s.lng >= minLon &&
    s.lng <= maxLon
  );
}

// Render resultater (kombineret geo + spots)
function renderSearchResults(geoResults, spotResults) {
  searchResults.innerHTML = "";

  if ((!geoResults || geoResults.length === 0) && (!spotResults || spotResults.length === 0)) {
    searchResults.classList.add("hidden");
    return;
  }

  // GEO RESULTATER (øverst)
  if (geoResults && geoResults.length > 0) {
    geoResults.forEach(g => {
      const row = document.createElement("div");
      row.className = "result";
      const title = (g.display_name || "").split(",")[0];
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(title)}</strong><br>
          <small>${escapeHtml(g.display_name || "")}</small>
        </div>
      `;
      row.addEventListener("click", () => {
        searchInput.value = "";
        searchResults.classList.add("hidden");

        const lat = Number(g.lat);
        const lon = Number(g.lon);

        // Zoom til område
        map.setView([lat, lon], 13);

        // Filtrer spots i det valgte bbox
        const matches = filterSpotsInBBox(g.boundingbox);

        // Udskift nærmeste liste med område-spots
        const list = document.getElementById("parkingList");
        list.innerHTML = "";

        if (matches.length === 0) {
          const li = document.createElement('li');
          li.textContent = "Ingen registrerede gratis parkeringspladser i dette område.";
          list.appendChild(li);
        } else {
          matches.forEach(spot => {
            const li = document.createElement("li");
            li.innerHTML = `
              <div>
                <strong>${escapeHtml(spot.name)}</strong>
                <div class="meta">${escapeHtml(spot.address || '')}</div>
              </div>
            `;
            const btn = document.createElement("button");
            btn.textContent = "Se info";
            btn.addEventListener("click", e => {
              e.stopPropagation();
              openInfoModal(spot);
            });
            li.appendChild(btn);

            li.addEventListener("click", () => {
              map.setView([spot.lat, spot.lng], 14);
              if (spot.marker) spot.marker.openPopup();
            });

            list.appendChild(li);
          });
        }
      });

      searchResults.appendChild(row);
    });
  }

  // SPOT MATCHES (der matcher navn/adresse)
  if (spotResults && spotResults.length > 0) {
    spotResults.forEach(s => {
      const row = document.createElement("div");
      row.className = "result";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(s.name)}</strong><br>
          <small>${escapeHtml(s.address || '')}</small>
        </div>
      `;
      row.addEventListener("click", () => {
        map.setView([s.lat, s.lng], 14);
        if (s.marker) s.marker.openPopup();
        openInfoModal(s);
        searchResults.classList.add("hidden");
        searchInput.value = "";
      });

      searchResults.appendChild(row);
    });
  }

  searchResults.classList.remove("hidden");
}

// Input-handler med debounce
let searchTimeout = null;
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  searchResults.innerHTML = "";

  if (!q) {
    searchResults.classList.add("hidden");
    return;
  }

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    // GEO SØGNING
    const geoResults = await geoSearch(q);

    // SPOT MATCHES (lokal tekstmatch)
    const lower = q.toLowerCase();
    const spotResults = parkingSpots.filter(s =>
      (s.name || '').toLowerCase().includes(lower) ||
      (s.address || '').toLowerCase().includes(lower) ||
      (s.city || '').toLowerCase().includes(lower)
    );

    renderSearchResults(geoResults, spotResults);
  }, 220);
});

// Klik udenfor → luk listen
document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.classList.add("hidden");
  }
});

});

