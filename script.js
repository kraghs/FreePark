document.addEventListener('DOMContentLoaded', () => {

/* =========================
   DATA: spots (København, Aarhus, Helsingør, Amager m.fl.)
   NOTE: Jeg har samlet mange eksempler. Tjek skilte i virkeligheden.
   ========================= */
const parkingSpots = [
  // AARHUS
  {name:"Tangkrogen", address:"Marselisborg Havnevej 4, 8000 Aarhus", lat:56.1520, lng:10.2030, note:"Stor p-plads, ofte ledig om aftenen. Gratis."},
  {name:"Ceres Park", address:"Stadion Allé 70, 8000 Aarhus", lat:56.1515, lng:10.2050, note:"Gratis i weekender. Tæt på stadion."},
  {name:"Donbækhaven", address:"Oddervej 6, 8000 Aarhus", lat:56.1440, lng:10.2100, note:"Gadeparkering, tjek skilte."},
  {name:"Marselisborg Strand", address:"Strandvejen 23, 8000 Aarhus", lat:56.1470, lng:10.2055, note:"Mindre p-plads ved strand, ofte gratis udenfor sæson."},

  // KØBENHAVN (udvalg + Amager)
  {name:"Amager Strand", address:"Strandvejen 3, 2300 København S", lat:55.6469, lng:12.5950, note:"Større p-pladser ved stranden. Tjek skilte for zoner."},
  {name:"Amagerbrogade", address:"Amagerbrogade, 2300 København S", lat:55.6600, lng:12.5900, note:"Gadeparkering i dele af Amager - tidsbegrænset."},
  {name:"Ørestad P", address:"Ørestads Boulevard, 2300 København S", lat:55.6356, lng:12.5868, note:"Store p-pladser, ofte gratis i ydre områder."},
  {name:"Valby Langgade", address:"Valby Langgade, 2500 Valby", lat:55.6575, lng:12.4960, note:"Gadeparkering, tjek p-skiltning."},
  {name:"Vesterbro / Sønder Boulevard", address:"Sønder Boulevard, 1720 København", lat:55.6670, lng:12.5650, note:"Gratis efter visse tidspunkter - se skiltning."},
  {name:"Nørrebrogade (NV)", address:"Nørrebrogade, 2200 København", lat:55.6920, lng:12.5660, note:"Nørrebro gader - nogle steder tidsbegrænset/gratis i weekender."},
  {name:"Østerbro (sidegader)", address:"Østerbro, København", lat:55.7030, lng:12.5850, note:"Sidegader har ofte gratis pladser - tjek skilte."},
  {name:"Frederiksberg / Smallegade", address:"Smallegade, Frederiksberg", lat:55.6760, lng:12.5230, note:"Gratis tidlig morgen/visse områder - tjek lokalt."},
  {name:"Christianshavn / Torvegade", address:"Torvegade, 1400 København K", lat:55.6760, lng:12.5930, note:"Sidegader kan have gratis pladser."},

  // HELSINGØR
  {name:"Jernbanevej P-plads", address:"Jernbanevej, 3000 Helsingør", lat:56.0390, lng:12.6130, note:"P-plads nær station. Tjek skilte for tid."},
  {name:"Stationens P-plads", address:"Stationspladsen, 3000 Helsingør", lat:56.0395, lng:12.6065, note:"Korttidsparkering ved stationen."},
  {name:"Nordhavnen / Mole", address:"Nordhavnsvej, 3000 Helsingør", lat:56.0425, lng:12.6080, note:"Kystnær p-plads, ofte gratis."},

  // Ekstra spots (fyld op med flere i København/Amager)
  {name:"Vanløse (stationsområde)", address:"Vanløse, København", lat:55.6970, lng:12.4890, note:"Stationsnær parkering, tjek lokalt."},
  {name:"Hellerup område", address:"Hellerup, Gentofte", lat:55.7390, lng:12.5740, note:"Visse gader/tidszoner gratis uden for peak."},
  {name:"Amager Vest (ydre)", address:"Amager Vest, København", lat:55.6450, lng:12.5700, note:"Ydre Amager: flere gratis p-pladser."},
  {name:"Valby Syd P", address:"Valbyparken, Valby", lat:55.6560, lng:12.4995, note:"Større p-plads tæt ved park."},
  {name:"Ørestad P2", address:"Arne Jacobsens Allé, Ørestad", lat:55.6366, lng:12.5902, note:"Parkeringspladser i Ørestad, ofte med gratis zoner."}
];

/* =========================
   App state
   ========================= */
let userLat = 55.6761;
let userLng = 12.5683;
let map, userMarker;

/* =========================
   Init map (Carto Voyager)
   ========================= */
map = L.map('map', { preferCanvas: true }).setView([userLat, userLng], 6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & CARTO',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

/* =========================
   Utility functions
   ========================= */
function toRad(x){return x*Math.PI/180}
function distance(lat1,lng1,lat2,lng2){
  const R=6371;
  const dLat=toRad(lat2-lat1);
  const dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

/* =========================
   Markers: add all spots
   ========================= */
parkingSpots.forEach(spot=>{
  const circle = L.circleMarker([spot.lat, spot.lng], {
    radius: 6,
    color: '#0bb07b',
    weight: 2,
    fillColor: '#00c07b',
    fillOpacity: 1
  }).addTo(map);

 circle.on('click', () => {
  // Luk eksisterende info-bokse på kortet
  document.querySelectorAll('.mapInfoDropdown').forEach(d => d.remove());

  // Lav en div til info
  const infoDiv = document.createElement('div');
  infoDiv.className = 'mapInfoDropdown';
  infoDiv.style.position = 'absolute';
  infoDiv.style.backgroundColor = '#222';
  infoDiv.style.color = '#fff';
  infoDiv.style.padding = '8px';
  infoDiv.style.borderRadius = '6px';
  infoDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
  infoDiv.innerHTML = `<strong>${escapeHtml(spot.name)}</strong><br>${escapeHtml(spot.address)}<br>${escapeHtml(spot.note)}`;

  // Beregn position over markøren
  const pos = map.latLngToContainerPoint([spot.lat, spot.lng]);
  infoDiv.style.left = `${pos.x}px`;
  infoDiv.style.top = `${pos.y - 50}px`; // 50px over markøren

  // Tilføj til map container
  document.getElementById('map').appendChild(infoDiv);
});
});

/* =========================
   User marker
   ========================= */
function setUserMarker(lat,lng){
  if(userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat,lng], {
    radius:7,
    color:'#ff4757',
    weight:2,
    fillColor:'#ff6b6b',
    fillOpacity:1
  }).addTo(map).bindPopup("Du er her");
}

/* =========================
   Render 5 nearest
   ========================= */
function renderNearby(centerLat=userLat, centerLng=userLng){
  const list = document.getElementById('parkingList');
  list.innerHTML = '';
  parkingSpots
    .map(s => ({...s, dist: distance(centerLat, centerLng, s.lat, s.lng)}))
    .sort((a,b) => a.dist - b.dist)
    .slice(0,5)
    .forEach(spot => {
      const li = document.createElement('li');
      const text = document.createElement('div');
      text.innerHTML = `<strong>${escapeHtml(spot.name)}</strong><div class="meta">${escapeHtml(spot.address)} • ${spot.dist.toFixed(1)} km</div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Se info';
      btn.addEventListener('click', (e)=> { e.stopPropagation(); openInfoModal(spot); });
      li.appendChild(text);
      li.appendChild(btn);
      li.addEventListener('click', ()=> {
        map.setView([spot.lat, spot.lng], 14);
        if(spot.marker) spot.marker.openPopup();
      });
      list.appendChild(li);
    });
}

/* =========================
   Info modal
   ========================= */
function openInfoModal(spot){
  document.getElementById('infoTitle').textContent = spot.name;
  document.getElementById('infoAddress').textContent = "Adresse: " + spot.address;
  document.getElementById('infoNote').textContent = "Info: " + (spot.note || 'Ingen ekstra info');
  document.getElementById('infoModal').classList.remove('hidden');
}
document.getElementById('closeInfoBtn').addEventListener('click', ()=> document.getElementById('infoModal').classList.add('hidden'));

window.openInfoFromMarker = function(name){
  const spot = parkingSpots.find(s => s.name === name);
  if(spot) openInfoModal(spot);
};

/* =========================
   Search
   ========================= */
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if(!q){
    searchResults.classList.add('hidden'); searchResults.innerHTML = ''; return;
  }
  const matches = parkingSpots.filter(s => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
  if(matches.length === 0){ searchResults.classList.add('hidden'); searchResults.innerHTML=''; return; }
  searchResults.innerHTML = '';
  matches.forEach(spot => {
    const row = document.createElement('div');
    row.className = 'result';
    row.innerHTML = `<div><strong>${escapeHtml(spot.name)}</strong><br><small>${escapeHtml(spot.address)}</small></div><div><small>${distance(userLat,userLng,spot.lat,spot.lng).toFixed(1)} km</small></div>`;
    row.addEventListener('click', () => {
      map.setView([spot.lat, spot.lng], 14);
      if(spot.marker) spot.marker.openPopup();
      openInfoModal(spot);
      searchResults.classList.add('hidden'); searchResults.innerHTML='';
      searchInput.value = '';
    });
    searchResults.appendChild(row);
  });
  searchResults.classList.remove('hidden');
});

/* =========================
   Brug min lokation
   ========================= */
document.getElementById('useMyLocationBtn').addEventListener('click', () => {
  if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude; userLng = pos.coords.longitude;
    setUserMarker(userLat, userLng);
    map.setView([userLat, userLng], 12);
    renderNearby(userLat, userLng);
  }, ()=> alert('Kunne ikke hente din lokation'));
});

document.getElementById('useMyLocationAddBtn').addEventListener('click', () => {
  if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude; userLng = pos.coords.longitude;
    document.getElementById('spotAddress').value = `${userLat.toFixed(6)}, ${userLng.toFixed(6)}`;
    alert('Din lokation er sat i adressefeltet. Tryk Gem for at gemme spotet her.');
  }, ()=> alert('Kunne ikke hente din lokation'));
});

/* =========================
   Add spot
   ========================= */
document.getElementById('toggleAddBtn').addEventListener('click', ()=> document.getElementById('addSpotBox').classList.toggle('hidden'));
document.getElementById('cancelAddBtn').addEventListener('click', ()=> document.getElementById('addSpotBox').classList.add('hidden'));

document.getElementById('addSpotBtn').addEventListener('click', () => {
  const name = document.getElementById('spotName').value.trim();
  const address = document.getElementById('spotAddress').value.trim();
  if(!name || !address){ alert('Udfyld navn og adresse'); return; }

  const coordMatch = address.match(/^\s*([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)\s*$/);
  if(coordMatch){
    const lat = parseFloat(coordMatch[1]), lng = parseFloat(coordMatch[2]);
    pushNewSpot(name, address, lat, lng);
    return;
  }

  axios.get('https://nominatim.openstreetmap.org/search', { params:{ q: address, format:'json', limit:1 }})
    .then(resp => {
      if(!resp.data || resp.data.length===0){ alert('Adresse ikke fundet'); return; }
      const lat = parseFloat(resp.data[0].lat), lng = parseFloat(resp.data[0].lon);
      pushNewSpot(name, address, lat, lng);
    }).catch(()=> alert('Fejl ved geokodning'));
});

function pushNewSpot(name,address,lat,lng){
  const spot = {name,address,lat,lng,note:'Bruger-tilføjet'};
  parkingSpots.push(spot);
  spot.marker = L.circleMarker([lat,lng], { radius:6, color:'#0bb07b', weight:2, fillColor:'#00c07b', fillOpacity:1 }).addTo(map);
  spot.marker.bindPopup(`<strong>${escapeHtml(spot.name)}</strong><br><small>${escapeHtml(spot.address)}</small><br><div style="margin-top:8px;"><button onclick="openInfoFromMarker('${escapeJs(spot.name)}')" style="background:#00c07b;border:none;color:#111;padding:6px 8px;border-radius:6px;cursor:pointer;font-weight:600">Se info</button></div>`);
  document.getElementById('spotName').value=''; document.getElementById('spotAddress').value='';
  document.getElementById('addSpotBox').classList.add('hidden');
  renderNearby(userLat,userLng);
}

/* =========================
   Init geolocation
   ========================= */
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude; userLng = pos.coords.longitude;
    setUserMarker(userLat, userLng);
    map.setView([userLat, userLng], 12);
    renderNearby(userLat, userLng);
  }, ()=> { renderNearby(userLat, userLng); });
} else {
  renderNearby(userLat,userLng);
}

/* =========================
   Escape helpers
   ========================= */
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeJs(s){ return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"'); }

}); // DOMContentLoaded end
