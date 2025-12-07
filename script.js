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

  // Ekstra spots
  {name: "Vanløse (stationsområde)", address: "Vanløse, København", lat: 55.6970, lng: 12.4890, note: "Stationsnær parkering, tjek lokalt."},
  {name: "Hellerup område", address: "Hellerup, Gentofte", lat: 55.7390, lng: 12.5740, note: "Visse gader/tidszoner gratis uden for peak."},
  {name: "Amager Vest (ydre)", address: "Amager Vest, København", lat: 55.6450, lng: 12.5700, note: "Ydre Amager: flere gratis p-pladser."},
  {name: "Valby Syd P", address: "Valbyparken, Valby", lat: 55.6560, lng: 12.4995, note: "Større p-plads tæt ved park."},
  {name: "Ørestad P2", address: "Arne Jacobsens Allé, Ørestad", lat: 55.6366, lng: 12.5902, note: "Parkeringspladser i Ørestad, ofte med gratis zoner."}
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
    <div style="margin-top:8px;">
      <button onclick="openInfoFromMarker('${spot.name}')" style="background:#007AFF;border:none;color:white;padding:6px 8px;border-radius:6px;cursor:pointer;font-weight:600">Se info</button>
    </div>`);

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
  document.getElementById('infoNote').textContent="Info: "+spot.note;
  document.getElementById('infoModal').classList.remove('hidden');
}
document.getElementById('closeInfoBtn').addEventListener('click',()=>document.getElementById('infoModal').classList.add('hidden'));
window.openInfoFromMarker = function(name){
  const spot = parkingSpots.find(s => s.name === name);
  if(spot) openInfoModal(spot);
};

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
}else{renderSpots();}

});
