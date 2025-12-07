document.addEventListener('DOMContentLoaded', () => {

const parkingSpots = [
  {name:"Tangkrogen", address:"Marselisborg Havnevej 4, 8000 Aarhus", lat:56.1520, lng:10.2030, note:"Stor p-plads, ofte ledig om aftenen. Gratis."},
  {name:"Ceres Park", address:"Stadion Allé 70, 8000 Aarhus", lat:56.1515, lng:10.2050, note:"Gratis i weekender. Tæt på stadion."},
  {name:"Donbækhaven", address:"Oddervej 6, 8000 Aarhus", lat:56.1440, lng:10.2100, note:"Gadeparkering, tjek skilte."},
  {name:"Marselisborg Strand", address:"Strandvejen 23, 8000 Aarhus", lat:56.1470, lng:10.2055, note:"Mindre p-plads ved strand, ofte gratis udenfor sæson."},
  {name:"Amager Strand", address:"Strandvejen 3, 2300 København S", lat:55.6469, lng:12.5950, note:"Større p-pladser ved stranden. Tjek skilte for zoner."},
  {name:"Amagerbrogade", address:"Amagerbrogade, 2300 København S", lat:55.6600, lng:12.5900, note:"Gadeparkering i dele af Amager - tidsbegrænset."}
  // tilføj alle andre spots som før
];

let userLat = 55.6761;
let userLng = 12.5683;
let map, userMarker;

map = L.map('map').setView([userLat,userLng],6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & CARTO',
  subdomains:'abcd',
  maxZoom:20
}).addTo(map);

function distance(lat1,lng1,lat2,lng2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeJs(s){ return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"'); }

/* =========================
   Marker & info popup
   ========================= */
parkingSpots.forEach(spot => {
  const marker = L.circleMarker([spot.lat, spot.lng], {
    radius:6, color:'#0bb07b', weight:2, fillColor:'#00c07b', fillOpacity:1
  }).addTo(map);

  marker.on('click', () => {
    // fjern gamle dropdowns
    document.querySelectorAll('.mapInfoDropdown').forEach(d=>d.remove());
    // lav ny
    const infoDiv = document.createElement('div');
    infoDiv.className='mapInfoDropdown';
    infoDiv.style.position='absolute';
    infoDiv.style.background='#222';
    infoDiv.style.color='#fff';
    infoDiv.style.padding='6px 8px';
    infoDiv.style.borderRadius='6px';
    infoDiv.style.boxShadow='0 2px 6px rgba(0,0,0,0.3)';
    infoDiv.innerHTML=`<strong>${escapeHtml(spot.name)}</strong><br>${escapeHtml(spot.address)}<br>${escapeHtml(spot.note)}`;
    const pos = map.latLngToContainerPoint([spot.lat, spot.lng]);
    infoDiv.style.left=`${pos.x}px`;
    infoDiv.style.top=`${pos.y-40}px`;
    document.getElementById('map').appendChild(infoDiv);
  });

  spot.marker = marker;
});

/* =========================
   User marker
   ========================= */
function setUserMarker(lat,lng){
  if(userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat,lng], { radius:7, color:'#ff4757', weight:2, fillColor:'#ff6b6b', fillOpacity:1 })
    .addTo(map).bindPopup("Du er her");
}

/* =========================
   Render 5 nærmeste
   ========================= */
function renderNearby(lat=userLat,lng=userLng){
  const list = document.getElementById('parkingList');
  list.innerHTML='';
  parkingSpots
    .map(s=>({...s, dist: distance(lat,lng,s.lat,s.lng)}))
    .sort((a,b)=>a.dist-b.dist)
    .slice(0,5)
    .forEach(spot=>{
      const li=document.createElement('li');
      const text=document.createElement('div');
      text.innerHTML=`<strong>${escapeHtml(spot.name)}</strong><div class="meta">${escapeHtml(spot.address)} • ${spot.dist.toFixed(1)} km</div>`;
      const btn=document.createElement('button');
      btn.textContent='Se info';
      btn.addEventListener('click', e=>{ e.stopPropagation(); openInfoModal(spot); });
      li.appendChild(text); li.appendChild(btn);
      li.addEventListener('click', ()=>{ map.setView([spot.lat,spot.lng],14); if(spot.marker) spot.marker.openPopup(); });
      list.appendChild(li);
    });
}

/* =========================
   Info modal
   ========================= */
function openInfoModal(spot){
  document.getElementById('infoTitle').textContent = spot.name;
  document.getElementById('infoAddress').textContent = "Adresse: "+spot.address;
  document.getElementById('infoNote').textContent = "Info: "+(spot.note||'Ingen ekstra info');
  document.getElementById('infoModal').classList.remove('hidden');
}
document.getElementById('closeInfoBtn').addEventListener('click', ()=> document.getElementById('infoModal').classList.add('hidden'));
window.openInfoFromMarker = function(name){
  const spot = parkingSpots.find(s=>s.name===name);
  if(spot) openInfoModal(spot);
};

/* =========================
   Search
   ========================= */
const searchInput=document.getElementById('searchInput');
const searchResults=document.getElementById('searchResults');
searchInput.addEventListener('input', e=>{
  const q=e.target.value.trim().toLowerCase();
  if(!q){ searchResults.classList.add('hidden'); searchResults.innerHTML=''; return; }
  const matches = parkingSpots.filter(s=>s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
  if(matches.length===0){ searchResults.classList.add('hidden'); searchResults.innerHTML=''; return; }
  searchResults.innerHTML='';
  matches.forEach(spot=>{
    const row=document.createElement('div');
    row.className='result';
    row.innerHTML=`<div><strong>${escapeHtml(spot.name)}</strong><br><small>${escapeHtml(spot.address)}</small></div><div><small>${distance(userLat,userLng,spot.lat,spot.lng).toFixed(1)} km</small></div>`;
    row.addEventListener('click', ()=>{
      map.setView([spot.lat,spot.lng],14); if(spot.marker) spot.marker.openPopup();
      openInfoModal(spot); searchResults.classList.add('hidden'); searchResults.innerHTML=''; searchInput.value='';
    });
    searchResults.appendChild(row);
  });
  searchResults.classList.remove('hidden');
});

/* =========================
   Brug min lokation
   ========================= */
document.getElementById('useMyLocationBtn').addEventListener('click', ()=>{
  if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    userLat=pos.coords.latitude; userLng=pos.coords.longitude;
    setUserMarker(userLat,userLng); map.setView([userLat,userLng],12); renderNearby(userLat,userLng);
  }, ()=>alert('Kunne ikke hente din lokation'));
});

/* =========================
   Init
   ========================= */
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos=>{
    userLat=pos.coords.latitude; userLng=pos.coords.longitude;
    setUserMarker(userLat,userLng); map.setView([userLat,userLng],12); renderNearby(userLat,userLng);
  }, ()=>renderNearby(userLat,userLng));
}else renderNearby(userLat,userLng);

}); // DOMContentLoaded end
