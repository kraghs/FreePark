document.addEventListener('DOMContentLoaded', function() {

/* =========================
   Seed-data (kan udvides manuelt)
   ========================= */
let parkingSpots = [
  // Eksempler i større byer
  {name: "Tangkrogen", address: "Marselisborg Havnevej 4, 8000 Aarhus", lat: 56.1520, lng: 10.2030, note: "Stor p-plads ved havnen, ofte ledig om aftenen", timeLimit: "Ingen tidsbegrænsning", freeHours: "Hele dagen"},
  {name: "Ceres Park", address: "Stadion Allé 70, 8000 Aarhus", lat: 56.1515, lng: 10.2050, note: "Gratis i weekenden (typisk events afhænger af skiltning)", timeLimit: "Ingen tidsbegrænsning i weekenden", freeHours: "Lørdag-søndag"},
  {name: "Amager Strandpark", address: "Amager Strandvej, 2300 København S", lat: 55.6469, lng: 12.5950, note: "Stor p-plads ved stranden", timeLimit: "Varierer efter zone", freeHours: "Ofte efter kl. 18 (tjek skilte)"}
];

/* =========================
   App state
   ========================= */
let userLat = 55.6761;
let userLng = 12.5683;
let addLat = null;
let addLng = null;

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
  const dLat=toRad(lat2-lat1);
  const dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmt(text){
  return (text || "").trim();
}
function isDuplicate(a, b){
  // Duplikat hvis navn og adresse matcher, eller hvis koordinater er meget tæt på
  const nameMatch = fmt(a.name).toLowerCase() === fmt(b.name).toLowerCase();
  const addrMatch = fmt(a.address).toLowerCase() === fmt(b.address).toLowerCase();
  const close = distance(a.lat, a.lng, b.lat, b.lng) < 0.05; // 50 meter
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

/* Render eksisterende seed-markører */
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
   Render 5 nearest
   ========================= */
function renderSpots(lat=userLat,lng=userLng){
  const list=document.getElementById('parkingList');
  list.innerHTML='';
  const nearby=parkingSpots
    .map(s=>({...s,dist:distance(lat,lng,s.lat,s.lng)}))
    .sort((a,b)=>a.dist-b.dist)
    .slice(0,5);

  nearby.forEach(spot=>{
    const li=document.createElement('li');

    const left=document.createElement('div');
    left.textContent=`${spot.name} - ${spot.address} (${spot.dist.toFixed(1)} km)`;

    const infoBtn=document.createElement('button');
    infoBtn.textContent="Se info";
    infoBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openInfoModal(spot);
    });

    li.appendChild(left);
    li.appendChild(infoBtn);
    li.addEventListener('click',()=>{map.setView([spot.lat,spot.lng],15); spot.marker && spot.marker.openPopup();});
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
   Geolocation + render
   ========================= */
function initialRender(){
  renderSpots();
}
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos=>{
    userLat=pos.coords.latitude;
    userLng=pos.coords.longitude;
    setUserMarker(userLat,userLng);
    map.setView([userLat,userLng],12);
    initialRender();
  },()=>{ initialRender(); });
}else{
  initialRender();
}

/* =========================
   Brugertilføjelse (modal)
   ========================= */
const toggleAddBtn = document.getElementById('toggleAddBtn');
const addSpotBox = document.getElementById('addSpotBox');
const useMyLocationAddBtn = document.getElementById('useMyLocationAddBtn');
const addSpotBtn = document.getElementById('addSpotBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const addCoordsInfo = document.getElementById('addCoordsInfo');

toggleAddBtn.addEventListener('click', ()=>{
  addSpotBox.classList.toggle('hidden');
});

useMyLocationAddBtn.addEventListener('click', ()=>{
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      addLat = pos.coords.latitude;
      addLng = pos.coords.longitude;
      addCoordsInfo.textContent = `Valgte koordinater: ${addLat.toFixed(5)}, ${addLng.toFixed(5)}`;
    }, ()=> {
      addCoordsInfo.textContent = "Kunne ikke hente koordinater";
    });
  } else {
    addCoordsInfo.textContent = "Geolocation understøttes ikke";
  }
});

addSpotBtn.addEventListener('click', ()=>{
  const name = document.getElementById('spotName').value.trim();
  const address = document.getElementById('spotAddress').value.trim();
  const note = document.getElementById('spotNote').value.trim();
  const timeLimit = document.getElementById('spotTimeLimit').value.trim();
  const freeHours = document.getElementById('spotFreeHours').value.trim();

  if(!name || !address){
    alert("Udfyld mindst navn og adresse.");
    return;
  }
  if(addLat == null || addLng == null){
    alert("Vælg koordinater med 'Brug min lokation' før du gemmer.");
    return;
  }

  const newSpot = { name, address, lat:addLat, lng:addLng, note, timeLimit, freeHours };
  const dup = parkingSpots.some(s => isDuplicate(s, newSpot));
  if(dup){
    alert("Ser ud til at denne placering allerede findes tæt på her.");
    return;
  }

  parkingSpots.push(newSpot);
  addSpotToMap(newSpot);
  renderSpots(userLat, userLng);
  addSpotBox.classList.add('hidden');

  // Reset
  document.getElementById('spotName').value="";
  document.getElementById('spotAddress').value="";
  document.getElementById('spotNote').value="";
  document.getElementById('spotTimeLimit').value="";
  document.getElementById('spotFreeHours').value="";
  addLat=null; addLng=null; addCoordsInfo.textContent="Ingen koordinater valgt endnu";
});

cancelAddBtn.addEventListener('click', ()=>{
  addSpotBox.classList.add('hidden');
});

/* =========================
   Søgning (dummy placering)
   ========================= */
document.getElementById('useMyLocationBtn').addEventListener('click', ()=>{
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      userLat=pos.coords.latitude;
      userLng=pos.coords.longitude;
      setUserMarker(userLat,userLng);
      map.setView([userLat,userLng],12);
      renderSpots(userLat,userLng);
    });
  }
});

/* =========================
   OpenStreetMap import (Overpass)
   =========================
   Henter offentlige parkeringspladser i DK med fee=no (gratis),
   og forsøger at læse maxstay/åbningstider fra tags.
*/
async function loadOSMFreeParking(){
  try{
    // DK-bounding box (ca.): syd-vest [54.56, 8.07], nord-øst [57.75, 15.19]
    const bbox = "54.56,8.07,57.75,15.19";
    const q = `
      [out:json][timeout:25];
      (
        // Noder (punkter) med amenity=parking og gratis (fee=no)
        node["amenity"="parking"]["fee"="no"](${bbox});
        // Ways/relations, tagget uden betaling (fee=no)
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
        const addrParts = [
          tags["addr:street"],
          tags["addr:housenumber"],
          tags["addr:city"]
        ].filter(Boolean);
        const address = addrParts.join(", ") || "Adresse ukendt";

        // Infofelter fra OSM tags
        const fee = tags.fee;
        const maxstay = tags.maxstay;
        const opening = tags.opening_hours;
        const access = tags.access; // public/private
        const notePieces = [];

        if(access) notePieces.push(`Adgang: ${access}`);
        if(fee === "no") notePieces.push("Gratis parkering");
        if(tags.parking) notePieces.push(`Type: ${tags.parking}`);

        const spot = {
          name,
          address,
          lat,
          lng: lon,
          note: notePieces.join(" • "),
          timeLimit: maxstay ? maxstay : "",
          freeHours: opening ? opening : ""
        };

        // Dedup: undgå overlap med eksisterende spots
        const exists = parkingSpots.some(s => isDuplicate(s, spot));
        if(!exists){
          parkingSpots.push(spot);
          imported.push(spot);
          addSpotToMap(spot);
        }
      });
    }

    // Opdater nærmeste-liste efter import
    renderSpots(userLat, userLng);
    console.log(`OSM import: ${imported.length} gratis parkeringssteder indlæst.`);
  }catch(err){
    console.warn("Kunne ikke hente OSM-data:", err);
  }
}

// Kør import når kortet er klar
loadOSMFreeParking();

});
