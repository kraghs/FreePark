document.addEventListener('DOMContentLoaded', function() {

/* =========================
   Seed-data
   ========================= */
let parkingSpots = [
  {name:"Tangkrogen",address:"Marselisborg Havnevej 4, 8000 Aarhus",lat:56.1520,lng:10.2030,note:"Stor p-plads ved havnen, ofte ledig om aftenen",timeLimit:"Ingen tidsbegrænsning",freeHours:"Hele dagen"},
  {name:"Ceres Park",address:"Stadion Allé 70, 8000 Aarhus",lat:56.1515,lng:10.2050,note:"Gratis i weekenden (tjek skiltning ved events)",timeLimit:"Ingen tidsbegrænsning i weekenden",freeHours:"Lørdag-søndag"},
  {name:"Amager Strandpark",address:"Amager Strandvej, 2300 København S",lat:55.6469,lng:12.5950,note:"Stor p-plads ved stranden",timeLimit:"Varierer efter zone",freeHours:"Ofte efter kl. 18"}
];

/* =========================
   App state
   ========================= */
let userLat = 55.6761;
let userLng = 12.5683;

/* =========================
   Map (Carto Voyager = clean look)
   ========================= */
const map = L.map('map', { preferCanvas: true }).setView([userLat, userLng], 6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & CARTO',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

/* =========================
   Utils
   ========================= */
function toRad(x){return x*Math.PI/180}
function distance(lat1,lng1,lat2,lng2){
  const R=6371;
  const dLat=toRad(lat2-lat1), dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmt(text){ return (text||"").trim(); }
function isDuplicate(a,b){
  const nameMatch = fmt(a.name).toLowerCase() === fmt(b.name).toLowerCase();
  const addrMatch = fmt(a.address).toLowerCase() === fmt(b.address).toLowerCase();
  const close = distance(a.lat,a.lng,b.lat,b.lng) < 0.05; // 50 meter
  return (nameMatch && addrMatch) || close;
}

/* =========================
   Marker rendering
   ========================= */
function markerPopupHTML(spot){
  const tl = spot.timeLimit ? `<p><strong>Tidsbegrænsning:</strong> ${spot.timeLimit}</p>` : "";
  const fh = spot.freeHours ? `<p><strong>Gratisperioder:</strong> ${spot.freeHours}</p>` : "";
  const note = spot.note ? `<p>${spot.note}</p>` : "";
  return `
    <strong>${spot.name}</strong><br>
    <small>${spot.address}</small><br>
    <details style="margin-top:8px;">
      <summary>Se info</summary>
      ${note}
      ${tl}
      ${fh}
      <div style="margin-top:8px;">
        <button data-open-info style="background:#007AFF;border:none;color:white;padding:6px 8px;border-radius:6px;cursor:pointer;font-weight:600">Åbn detaljer</button>
      </div>
    </details>
  `;
}
function addSpotToMap(spot){
  const circle = L.circleMarker([spot.lat, spot.lng], {
    radius: 6, color: '#0bb07b', weight: 2,
    fillColor: '#00c07b', fillOpacity: 1
  }).addTo(map);
  circle.bindPopup(markerPopupHTML(spot));
  circle.on('popupopen', () => {
    const container = circle.getPopup().getElement();
    const btn = container.querySelector('button[data-open-info]');
    if(btn){
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openInfoModal(spot);
      });
    }
  });
  spot.marker = circle;
}
parkingSpots.forEach(addSpotToMap);

/* =========================
   User marker
   ========================= */
let userMarker;
function setUserMarker(lat,lng){
  if(userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat,lng], {
    radius: 8, color: '#ffffff', weight: 3,
    fillColor: '#007AFF', fillOpacity: 1
  }).addTo(map).bindPopup("Din position");
}

/* =========================
   Ny "Spots i nærheden"
   ========================= */
function renderNearbySpots(lat=userLat, lng=userLng){
  const list = document.getElementById('parkingList');
  list.innerHTML = '';

  // lav en kopi med afstand
  const withDist = parkingSpots
    .map(s => {
      const dist = distance(lat, lng, s.lat, s.lng);
      return {...s, dist};
    })
    .sort((a,b) => a.dist - b.dist); // sorter nærmest først

  withDist.forEach(spot => {
    const li = document.createElement('li');

    // altid vis adresse – hvis mangler, brug "Ukendt adresse"
    const addr = spot.address && spot.address.trim() ? spot.address : "Ukendt adresse";

    li.textContent = `${spot.name} — ${addr} (${spot.dist.toFixed(1)} km)`;

    li.addEventListener('click', () => {
      map.setView([spot.lat, spot.lng], 15);
      spot.marker && spot.marker.openPopup();
    });

    list.appendChild(li);
  });
}


/* =========================
   Info modal
   ========================= */
function openInfoModal(spot){
  document.getElementById('infoTitle').textContent=spot.name;
  document.getElementById('infoAddress').textContent="Adresse: "+spot.address;
  const details = [];
  if (spot.note) details.push(`<p>${spot.note}</p>`);
  if (spot.timeLimit) details.push(`<p><strong>Tidsbegrænsning:</strong> ${spot.timeLimit}</p>`);
  if (spot.freeHours) details.push(`<p><strong>Gratisperioder:</strong> ${spot.freeHours}</p>`);
  document.getElementById('infoDetails').innerHTML = details.join("");
  document.getElementById('infoModal').classList.remove('hidden');
}
document.getElementById('closeInfoBtn').addEventListener('click',()=>document.getElementById('infoModal').classList.add('hidden'));

/* =========================
   Geolocation + initial render
   ========================= */
function initialRender(){ renderSpots(); }
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos=>{
    userLat=pos.coords.latitude;
    userLng=pos.coords.longitude;
    setUserMarker(userLat,userLng);
    map.setView([userLat,userLng],12);
    initialRender();
  },()=>{ initialRender(); });
}else{ initialRender(); }

/* =========================
   Slick search: filter + fit bounds
   ========================= */
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');

function applySearch(){
  const query = searchInput.value.trim().toLowerCase();
  const list = document.getElementById('parkingList');
  list.innerHTML = '';

  const results = query
    ? parkingSpots.filter(spot =>
        spot.name.toLowerCase().includes(query) ||
        spot.address.toLowerCase().includes(query))
    : parkingSpots
        .map(s=>({...s,dist:distance(userLat,userLng,s.lat,s.lng)}))
        .sort((a,b)=>a.dist-b.dist)
        .slice(0,10);

  results.forEach(spot=>{
    const li=document.createElement('li');
    li.textContent=`${spot.name} - ${spot.address}`;
    li.addEventListener('click',()=>{
      map.setView([spot.lat,spot.lng],14);
      spot.marker && spot.marker.openPopup();
    });
    list.appendChild(li);
  });

  if(results.length>0){
    const group = L.featureGroup(results.map(s=>s.marker).filter(Boolean));
    if(group.getLayers().length>0){
      map.fitBounds(group.getBounds().pad(0.2));
    }
  }
}
searchInput.addEventListener('input', applySearch);
clearSearch.addEventListener('click', ()=>{
  searchInput.value = '';
  map.setView([userLat,userLng],12);
  renderSpots(userLat,userLng);
});

/* =========================
   Add parking modal
   ========================= */
const addFab = document.getElementById('addFab');
const addModal = document.getElementById('addModal');
const addCloseBtn = document.getElementById('addCloseBtn');
const addName = document.getElementById('addName');
const addAddress = document.getElementById('addAddress');
const addUseLocation = document.getElementById('addUseLocation');
const addStatus = document.getElementById('addStatus');
const addNote = document.getElementById('addNote');
const addTimeLimit = document.getElementById('addTimeLimit');
const addFreeHours = document.getElementById('addFreeHours');
const addSaveBtn = document.getElementById('addSaveBtn');

let addLat = null;
let addLng = null;

function openAddModal(){
  addModal.classList.remove('hidden');
  addName.value=""; addAddress.value="";
  addNote.value=""; addTimeLimit.value=""; addFreeHours.value="";
  addStatus.textContent="Koordinater: ikke valgt";
  addLat=null; addLng=null;
}
function closeAddModal(){ addModal.classList.add('hidden'); }

addFab.addEventListener('click', openAddModal);
addCloseBtn.addEventListener('click', closeAddModal);
document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeAddModal(); });
addModal.addEventListener('click',(e)=>{ if(e.target===addModal) closeAddModal(); });

/* Reverse geocoding (Nominatim) */
async function reverseGeocode(lat,lng){
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'FreeParkApp/1.0' }});
  if(res.data && res.data.address){
    const a = res.data.address;
    const parts = [
      a.road || a.footway || a.pedestrian || a.path,
      a.house_number,
      a.postcode,
      a.city || a.town || a.village
    ].filter(Boolean);
    return parts.join(", ") || res.data.display_name;
  }
  return res.data && res.data.display_name ? res.data.display_name : "Adresse ukendt";
}

addUseLocation.addEventListener('click', ()=>{
  addStatus.textContent="Finder lokation...";
  if(!navigator.geolocation){ addStatus.textContent="Geolocation ikke understøttet"; return; }
  navigator.geolocation.getCurrentPosition(async (pos)=>{
    addLat = pos.coords.latitude;
    addLng = pos.coords.longitude;
    addStatus.textContent = `Koordinater: ${addLat.toFixed(5)}, ${addLng.toFixed(5)}`;
    try {
      const addr = await reverseGeocode(addLat, addLng);
      addAddress.value = addr || "";
    } catch {
      addStatus.textContent = "Kunne ikke finde adresse";
    }
  }, ()=>{ addStatus.textContent="Kunne ikke hente koordinater"; }, { enableHighAccuracy:true, timeout:12000 });
});

addSaveBtn.addEventListener('click', ()=>{
  const name = fmt(addName.value);
  const address = fmt(addAddress.value);
  const note = fmt(addNote.value);
  const timeLimit = fmt(addTimeLimit.value);
  const freeHours = fmt(addFreeHours.value);
  if(!name || !address){ alert("Udfyld mindst navn og adresse."); return; }
  if(addLat == null || addLng == null){ alert("Brug 'Brug min lokation' først."); return; }

  const newSpot = { name, address, lat:addLat, lng:addLng, note, timeLimit, freeHours };
  if(parkingSpots.some(s=>isDuplicate(s,newSpot))){ alert("Denne placering findes allerede tæt på her."); return; }

  parkingSpots.push(newSpot);
  addSpotToMap(newSpot);
  renderSpots(userLat, userLng);
  closeAddModal();
});

/* =========================
   OSM import (Overpass) – fee=no
   ========================= */
async function loadOSMFreeParking(){
  try{
    const bbox = "54.56,8.07,57.75,15.19"; // DK approx
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
    if(data && data.elements){
      data.elements.forEach(el=>{
        const lat = el.lat || (el.center && el.center.lat);
        const lon = el.lon || (el.center && el.center.lon);
        if(!lat || !lon) return;

        const tags = el.tags || {};
        const name = tags.name || "Offentlig parkering";
        const addrParts = [ tags["addr:street"], tags["addr:housenumber"], tags["addr:city"] ].filter(Boolean);
        const address = addrParts.join(", ") || "Adresse ukendt";

        const fee = tags.fee;
        const maxstay = tags.maxstay;
        const opening = tags.opening_hours;
        const access = tags.access;
        const notePieces = [];
        if(access) notePieces.push(`Adgang: ${access}`);
        if(fee === "no") notePieces.push("Gratis parkering");
        if(tags.parking) notePieces.push(`Type: ${tags.parking}`);

        const spot = {
          name, address, lat, lng: lon,
          note: notePieces.join(" • "),
          timeLimit: maxstay || "",
          freeHours: opening || ""
        };

        const exists = parkingSpots.some(s => isDuplicate(s, spot));
        if(!exists){
          parkingSpots.push(spot);
          imported.push(spot);
          addSpotToMap(spot);
        }
      });
    }
    renderSpots(userLat, userLng);
    console.log(`OSM import: ${imported.length} gratis parkeringssteder indlæst.`);
  }catch(err){
    console.warn("Kunne ikke hente OSM-data:", err);
  }
}
loadOSMFreeParking();

});

/* =========================
   Ny søgning: dropdown under feltet
   - Filtrerer spots efter navn/adresse
   - Flytter IKKE kortet automatisk
   - Klik på resultat centrerer kortet og åbner popup
   ========================= */
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const searchResultsBox = document.getElementById('searchResults');

function renderSearchResults(items){
  const ul = document.createElement('ul');
  items.forEach(spot => {
    const li = document.createElement('li');
    li.textContent = `${spot.name} — ${spot.address}`;
    li.addEventListener('click', () => {
      // Når man klikker: centrer kortet og åbn popup
      map.setView([spot.lat, spot.lng], 14);
      spot.marker && spot.marker.openPopup();
      // Ryd og skjul dropdown
      searchInput.value = '';
      hideSearchResults();
      // Gendan standard listen (nærmeste)
      renderSpots(userLat, userLng);
    });
    ul.appendChild(li);
  });
  searchResultsBox.innerHTML = '';
  searchResultsBox.appendChild(ul);
}

function showNoResults(){
  searchResultsBox.innerHTML = '<div class="no-results">Ingen resultater</div>';
  searchResultsBox.classList.remove('hidden');
}

function hideSearchResults(){
  searchResultsBox.classList.add('hidden');
  searchResultsBox.innerHTML = '';
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if(!q){
    hideSearchResults();
    // Gendan standard listen uden at flytte kortet
    renderSpots(userLat, userLng);
    return;
  }
  const matches = parkingSpots.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.address.toLowerCase().includes(q)
  );
  if(matches.length > 0){
    renderSearchResults(matches);
    searchResultsBox.classList.remove('hidden');
  }else{
    showNoResults();
  }
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  hideSearchResults();
  renderSpots(userLat, userLng);
});

// Luk dropdown ved ESC
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    hideSearchResults();
  }
});

// Luk dropdown hvis man klikker udenfor
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.search-wrapper');
  const inside = wrapper.contains(e.target) || searchResultsBox.contains(e.target);
  if(!inside){
    hideSearchResults();
  }
});

renderNearbySpots(userLat, userLng);
