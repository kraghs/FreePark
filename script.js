document.addEventListener('DOMContentLoaded', function() {

let parkingSpots = [
  // Aarhus
  {name: "Tangkrogen", address: "Marselisborg Havnevej 4, 8000 Aarhus", lat: 56.1520, lng: 10.2030, note: "Stor parkeringsplads, ofte ledig om aftenen, gratis"},
  {name: "Ceres Park", address: "Stadion Allé 70, 8000 Aarhus", lat: 56.1515, lng: 10.2050, note: "Gratis i weekenden, tæt på stadion"},
  {name: "Donbækhaven", address: "Oddervej 6, 8000 Aarhus", lat: 56.1440, lng: 10.2100, note: "Gadeparkering, tjek skilte."},
  {name: "Marselisborg Strand", address: "Strandvejen 23, 8000 Aarhus", lat: 56.1470, lng: 10.2055, note: "Mindre p-plads ved strand, ofte gratis udenfor sæson."},

  // København (udvalg + Amager)
  {name: "Amager Strand", address: "Strandvejen 3, 2300 København S", lat: 55.6469, lng: 12.5950, note: "Større p-pladser ved stranden. Tjek skilte for zoner."},
  {name: "Amagerbrogade", address: "Amagerbrogade, 2300 København S", lat: 55.6600, lng: 12.5900, note: "Gadeparkering i dele af Amager - tidsbegrænset."},
  {name: "Ørestad P", address: "Ørestads Boulevard, 2300 København S", lat: 55.6356, lng: 12.5868, note: "Store p-pladser, ofte gratis i ydre områder."},
  {name: "Valby Langgade", address: "Valby Langgade, 2500 Valby", lat: 55.6575, lng: 12.4960, note: "Gadeparkering, tjek p-skiltning."},
  {name: "Vesterbro / Sønder Boulevard", address: "Sønder Boulevard, 1720 København", lat: 55.6670, lng: 12.5650, note: "Gratis efter visse tidspunkter - se skiltning."},
  {name: "Nørrebrogade (NV)", address: "Nørrebrogade, 2200 København", lat: 55.6920, lng: 12.5660, note: "Nørrebro gader - nogle steder tidsbegrænset/gratis i weekender."},
  {name: "Østerbro (sidegader)", address: "Østerbro, København", lat: 55.7030, lng: 12.5850, note: "Sidegader har ofte gratis pladser - tjek skilte."},
  {name: "Frederiksberg / Smallegade", address: "Smallegade, Frederiksberg", lat: 55.6760, lng: 12.5230, note: "Gratis tidlig morgen/visse områder - tjek lokalt."},
  {name: "Christianshavn / Torvegade", address: "Torvegade, 1400 København K", lat: 55.6760, lng: 12.5930, note: "Sidegader kan have gratis pladser."},

  // Helsingør
  {name: "Jernbanevej P-plads", address: "Jernbanevej, 3000 Helsingør", lat: 56.0390, lng: 12.6130, note: "P-plads nær station. Tjek skilte for tid."},
  {name: "Stationens P-plads", address: "Stationspladsen, 3000 Helsingør", lat: 56.0395, lng: 12.6065, note: "Korttidsparkering ved stationen."},
  {name: "Nordhavnen / Mole", address: "Nordhavnsvej, 3000 Helsingør", lat: 56.0425, lng: 12.6080, note: "Kystnær p-plads, ofte gratis."},

  // Ekstra spots (fyld op med flere i København/Amager)
  {name: "Vanløse (stationsområde)", address: "Vanløse, København", lat: 55.6970, lng: 12.4890, note: "Stationsnær parkering, tjek lokalt."},
  {name: "Hellerup område", address: "Hellerup, Gentofte", lat: 55.7390, lng: 12.5740, note: "Visse gader/tidszoner gratis uden for peak."},
  {name: "Amager Vest (ydre)", address: "Amager Vest, København", lat: 55.6450, lng: 12.5700, note: "Ydre Amager: flere gratis p-pladser."},
  {name: "Valby Syd P", address: "Valbyparken, Valby", lat: 55.6560, lng: 12.4995, note: "Større p-plads tæt ved park."},
  {name: "Ørestad P2", address: "Arne Jacobsens Allé, Ørestad", lat: 55.6366, lng: 12.5902, note: "Parkeringspladser i Ørestad, ofte med gratis zoner."}
];

let userLat = 55.6761;
let userLng = 12.5683;
let map, userMarker;

map = L.map('map', { preferCanvas: true }).setView([userLat, userLng], 6);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & CARTO',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

function toRad(x){return x*Math.PI/180}
function distance(lat1,lng1,lat2,lng2){
  const R=6371;
  const dLat=toRad(lat2-lat1);
  const dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

/* =========================
   Markers
========================= */
parkingSpots.forEach(spot=>{
  const circle = L.circleMarker([spot.lat, spot.lng], {
    radius: 6,
    color: '#0bb07b',
    weight: 2,
    fillColor: '#00c07b',
    fillOpacity: 1
  }).addTo(map);

  // bind popup with Se info as small menu under bullet
  circle.bindPopup(`<div class="popup-content"><strong>${escapeHtml(spot.name)}</strong><br><small>${escapeHtml(spot.address)}</small><br><div style="margin-top:5px;"><button class="se-info-btn" style="background:#007AFF;color:white;border:none;padding:4px 6px;border-radius:5px;cursor:pointer;font-size:0.85em">Se info</button></div></div>`);

  // after popup opens, bind button click
  circle.on('popupopen', function(e){
    const btn = e.popup._contentNode.querySelector('.se-info-btn');
    btn.addEventListener('click',()=>openInfoModal(spot));
  });

  spot.marker = circle;
  circle.on('click', () => { map.setView([spot.lat, spot.lng], 14); });
});

/* =========================
   User marker
========================= */
function setUserMarker(lat,lng){
  if(userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat,lng], {
    radius: 8,
    color: '#ffffff',
    weight: 3,
    fillColor: '#007AFF',
    fillOpacity: 1
  }).addTo(map).bindPopup("Din position");
}

/* =========================
   Render spots
========================= */
function renderSpots(lat=userLat,lng=userLng){
  const list=document.getElementById('parkingList');
  list.innerHTML='';
  const nearby=parkingSpots.map(s=>({...s,dist:distance(lat,lng,s.lat,s.lng)}))
                           .sort((a,b)=>a.dist-b.dist)
                           .slice(0,5);
  nearby.forEach(spot=>{
    const li=document.createElement('li');
    li.textContent = `${spot.name} - ${spot.address} (${spot.dist.toFixed(1)} km) `;
    const infoBtn = document.createElement('button');
    infoBtn.textContent = 'Se info';
    infoBtn.style.cssText = 'background:#007AFF;color:white;border:none;padding:4px 6px;border-radius:5px;margin-left:6px;cursor:pointer;font-size:0.85em';
    infoBtn.addEventListener('click',(e)=>{ e.stopPropagation(); openInfoModal(spot); });
    li.appendChild(infoBtn);
    li.addEventListener('click',()=>{ map.setView([spot.lat,spot.lng],15); });
    list.appendChild(li);
  });
}

/* =========================
   Info modal replacement (dropdown under bullet)
========================= */
function openInfoModal(spot){
  // Find evt. allerede åben info og luk den
  const existing = document.querySelector('.spot-info-dropdown');
  if(existing) existing.remove();

  // find li eller popup som udløste
  let anchor = document.querySelector(`#parkingList li button:focus`);
  if(!anchor) anchor = document.querySelector(`#parkingList li`); // fallback

  // create dropdown
  const div = document.createElement('div');
  div.className = 'spot-info-dropdown';
  div.style.cssText = 'background:#222;color:white;padding:8px;border-radius:6px;margin-top:4px;font-size:0.85em';
  div.innerHTML = `<strong>${spot.name}</strong><br>Adresse: ${spot.address}<br>Info: ${spot.note}`;
  if(anchor) anchor.parentNode.insertBefore(div, anchor.nextSibling);
}

/* =========================
   Close info dropdown on click outside
========================= */
document.addEventListener('click', function(e){
  if(!e.target.closest('.spot-info-dropdown') && !e.target.closest('#parkingList li button')){
    const existing = document.querySelector('.spot-info-dropdown');
    if(existing) existing.remove();
  }
});

/* =========================
   Global function for marker popup
========================= */
function openInfoFromMarker(name){
  const spot = parkingSpots.find(s => s.name === name);
  if(spot) openInfoModal(spot);
}

/* =========================
   Search
========================= */
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
searchInput.addEventListener('input',(e)=>{
  const q=e.target.value.trim().toLowerCase();
  if(!q){ searchResults.classList.add('hidden'); searchResults.innerHTML=''; return; }
  const matches = parkingSpots.filter(s=>s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
  if(matches.length===0){ searchResults.classList.add('hidden'); searchResults.innerHTML=''; return; }
  searchResults.innerHTML='';
  matches.forEach(spot=>{
    const row=document.createElement('div');
    row.className='result';
    row.innerHTML=`<div><strong>${spot.name}</strong><br><small>${spot.address}</small></div><div><small>${distance(userLat,userLng,spot.lat,spot.lng).toFixed(1)} km</small></div>`;
    row.addEventListener('click',()=>{
      map.setView([spot.lat,spot.lng],14);
      if(spot.marker) spot.marker.openPopup();
      openInfoModal(spot);
      searchResults.classList.add('hidden'); searchResults.innerHTML='';
      searchInput.value='';
    });
    searchResults.appendChild(row);
  });
  searchResults.classList.remove('hidden');
});

/* =========================
   Use my location
========================= */
document.getElementById('useMyLocationBtn').addEventListener('click',()=>{
  if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    userLat=pos.coords.latitude; userLng=pos.coords.longitude;
    setUserMarker(userLat,userLng);
    map.setView([userLat,userLng],12);
    renderSpots();
  },()=>alert('Kunne ikke hente din lokation'));
});

/* =========================
   Add spot
========================= */
document.getElementById('toggleAddBtn').addEventListener('click',()=> document.getElementById('addSpotBox').classList.toggle('hidden'));
document.getElementById('cancelAddBtn').addEventListener('click',()=> document.getElementById('addSpotBox').classList.add('hidden'));
document.getElementById('addSpotBtn').addEventListener('click',()=>{
  const name=document.getElementById('spotName').value.trim();
  const address=document.getElementById('spotAddress').value.trim();
  if(!name || !address){ alert('Udfyld navn og adresse'); return; }

  const coordMatch = address.match(/^\s*([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)\s*$/);
  if(coordMatch){
    const lat=parseFloat(coordMatch[1]), lng=parseFloat(coordMatch[2]);
    pushNewSpot(name,address,lat,lng);
    return;
  }

  axios.get('https://nominatim.openstreetmap.org/search',{params:{q:address,format:'json',limit:1}})
    .then(resp=>{
      if(!resp.data || resp.data.length===0){ alert('Adresse ikke fundet'); return; }
      const lat=parseFloat(resp.data[0].lat), lng=parseFloat(resp.data[0].lon);
      pushNewSpot(name,address,lat,lng);
    }).catch(()=> alert('Fejl ved geokodning'));
});

function pushNewSpot(name,address,lat,lng){
  const spot={name,address,lat,lng,note:'Bruger-tilføjet'};
  parkingSpots.push(spot);
  spot.marker=L.circleMarker([lat,lng], { radius:6, color:'#0bb07b', weight:2, fillColor:'#00c07b', fillOpacity:1 }).addTo(map);
  spot.marker.bindPopup(`<strong>${spot.name}</strong><br><small>${spot.address}</small><br><div style="margin-top:8px;"><button onclick="openInfoFromMarker('${spot.name}')" style="background:#007AFF;border:none;color:white;padding:6px 8px;border-radius:6px;cursor:pointer;font-weight:600">Se info</button></div>`);
  document.getElementById('spotName').value=''; document.getElementById('spotAddress').value='';
  document.getElementById('addSpotBox').classList.add('hidden');
  renderSpots();
}

/* =========================
   Init geolocation
========================= */
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos=>{
    userLat=pos.coords.latitude; userLng=pos.coords.longitude;
    setUserMarker(userLat,userLng);
    map.setView([userLat,userLng],12);
    renderSpots();
  },()=>{renderSpots();});
}else{renderSpots();}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeJs(s){ return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"'); }

});
