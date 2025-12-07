document.addEventListener('DOMContentLoaded', function() {

let parkingSpots = [
  {name: "Tangkrogen", address: "Marselisborg Havnevej 4, 8000 Aarhus", lat: 56.1520, lng: 10.2030, note: "Stor parkeringsplads, ofte ledig om aftenen, gratis", timeLimit: "Ingen tidsbegrænsning", freeHours: "Hele dagen"},
  {name: "Ceres Park", address: "Stadion Allé 70, 8000 Aarhus", lat: 56.1515, lng: 10.2050, note: "Gratis i weekenden, tæt på stadion", timeLimit: "Ingen tidsbegrænsning i weekenden", freeHours: "Lørdag-søndag"},
  {name: "Amager Strand", address: "Strandvejen 3, 2300 København S", lat: 55.6469, lng: 12.5950, note: "Større p-pladser ved stranden. Tjek skilte for zoner.", timeLimit: "Ofte 3 timer", freeHours: "Efter kl. 18"}
];

/* =========================
   App state
   ========================= */
let userLat = 55.6761;
let userLng = 12.5683;
let map = L.map('map', { preferCanvas: true }).setView([userLat, userLng], 6);

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
    radius: 6, color: '#0bb07b', weight: 2,
    fillColor: '#00c07b', fillOpacity: 1
  }).addTo(map);

  circle.bindPopup(`
    <strong>${spot.name}</strong><br>
    <small>${spot.address}</small><br>
    <details style="margin-top:8px;">
      <summary>Se info</summary>
      <p>${spot.note}</p>
      ${spot.timeLimit ? `<p>Tidsbegrænsning: ${spot.timeLimit}</p>` : ""}
      ${spot.freeHours ? `<p>Gratisperioder: ${spot.freeHours}</p>` : ""}
    </details>
  `);

  spot.marker = circle;
  circle.on('click', () => {
    map.setView([spot.lat, spot.lng], 14);
    circle.openPopup();
  });
});

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
   Render 5 nearest
   ========================= */
function renderSpots(lat=userLat,lng=userLng){
  const list=document.getElementById('parkingList');
  list.innerHTML='';
  const nearby=parkingSpots.map(s=>({...s,dist:distance(lat,lng,s.lat,s.lng)}))
                           .sort((a,b)=>a.dist-b.dist)
                           .slice(0,5);
  nearby.forEach(spot=>{
    const li=document.createElement('li');
    const infoBtn=document.createElement('button');
    infoBtn.textContent="Se info";
    infoBtn.addEventListener('click',()=>openInfoModal(spot));
    li.innerHTML=`${spot.name} - ${spot.address} (${spot.dist.toFixed(1)} km) `;
    li.appendChild(infoBtn);
    li.addEventListener('click',()=>{map.setView([spot.lat,spot.lng],15);});
    list.appendChild(li);
  });
}

/* =========================
   Info modal
   ========================= */
function openInfoModal(spot){
  document.getElementById('infoTitle').textContent=spot.name;
  document.getElementById('infoAddress').textContent="Adresse: "+spot.address;

  let infoText = "Info: " + spot.note;
  if (spot.timeLimit) infoText += "\nTidsbegrænsning: " + spot.timeLimit;
  if (spot.freeHours) infoText += "\nGratisperioder: " + spot.freeHours;

  document.getElementById('infoNote').textContent=infoText;
  document.getElementById('infoModal').classList.remove('hidden');
}
document.getElementById('closeInfoBtn').addEventListener('click',()=>document.getElementById('infoModal').classList.add('hidden'));

/* =========================
   Init geolocation
   ========================= */
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos=>{
    userLat=pos.coords.latitude;
    userLng=pos.coords.longitude;
    setUserMarker(userLat,userLng);
    map.setView([userLat,userLng],12);
    renderSpots();
  },()=>{renderSpots();});
}else{render
