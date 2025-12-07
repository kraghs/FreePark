document.addEventListener('DOMContentLoaded', function() {

let parkingSpots = [
  {name:"Tangkrogen", address:"Marselisborg Havnevej 4, 8000 Aarhus", lat:56.1520, lng:10.2030, note:"Stor parkeringsplads, ofte ledig om aftenen, gratis"},
  {name:"Ceres Park", address:"Stadion Allé 70, 8000 Aarhus", lat:56.1515, lng:10.2050, note:"Gratis i weekenden, tæt på stadion"},
  {name:"Valby Syd", address:"Valby, København", lat:55.657, lng:12.499, note:"Gratis parkering 2 timer, tjek skilte"},
  {name:"Amager Strand", address:"Amager, København", lat:55.648, lng:12.599, note:"Gratis i visse zoner"}
];

let userLat = 55.6761;
let userLng = 12.5683;

// Map
let map = L.map('map').setView([userLat, userLng], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
let userMarker;

// Marker funktion
function setUserMarker(lat,lng){
  if(userMarker) map.removeLayer(userMarker);
  userMarker=L.circleMarker([lat,lng],{radius:8,color:'#ff0000',fillColor:'#ff5555',fillOpacity:1}).addTo(map).bindPopup("Du er her");
}

function distance(lat1,lng1,lat2,lng2){
  function toRad(x){return x*Math.PI/180;}
  let R=6371;
  let dLat=toRad(lat2-lat1);
  let dLng=toRad(lng2-lng1);
  let a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return (2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}

// Render spots i nærheden
function renderSpots(){
  const list=document.getElementById('parkingList');
  list.innerHTML='';
  parkingSpots.map(s=>({...s,dist:distance(userLat,userLng,s.lat,s.lng)}))
    .sort((a,b)=>a.dist-b.dist)
    .slice(0,5)
    .forEach(spot=>{
      const li=document.createElement('li');
      const infoBtn=document.createElement('button');
      infoBtn.textContent="Se info";
      infoBtn.addEventListener('click',()=>openInfoModal(spot));
      li.innerHTML=`${spot.name} - ${spot.address} (${spot.dist.toFixed(1)} km) `;
      li.appendChild(infoBtn);
      li.addEventListener('click',()=>{map.setView([spot.lat,spot.lng],15);});
      list.appendChild(li);
      if(!spot.marker) spot.marker=L.marker([spot.lat,spot.lng]).addTo(map).bindPopup(spot.name);
    });
}

// Info modal
function openInfoModal(spot){
  document.getElementById('infoTitle').textContent=spot.name;
  document.getElementById('infoAddress').textContent="Adresse: "+spot.address;
  document.getElementById('infoNote').textContent="Info: "+spot.note;
  document.getElementById('infoModal').classList.remove('hidden');
}
document.getElementById('closeInfoBtn').addEventListener('click',()=>document.getElementById('infoModal').classList.add('hidden'));

// Brug min lokation (i søgefelt)
document.getElementById('useMyLocationBtn').addEventListener('click',()=>{
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      userLat=pos.coords.latitude;
      userLng=pos.coords.longitude;
      setUserMarker(userLat,userLng);
      map.setView([userLat,userLng],12);
      renderSpots();
    },()=>{alert("Kan ikke hente din lokation");});
  } else alert("Din browser understøtter ikke geolokation");
});

// Søgefunktion
document.getElementById('searchInput').addEventListener('input', e=>{
  const q=e.target.value.toLowerCase();
  const list=document.getElementById('parkingList');
  list.innerHTML='';
  parkingSpots.filter(s=>s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q))
              .slice(0,5)
              .forEach(spot=>{
    const li=document.createElement('li');
    const infoBtn=document.createElement('button');
    infoBtn.textContent="Se info";
    infoBtn.addEventListener('click',()=>openInfoModal(spot));
    li.innerHTML=`${spot.name} - ${spot.address} (${distance(userLat,userLng,spot.lat,spot.lng).toFixed(1)} km) `;
    li.appendChild(infoBtn);
    li.addEventListener('click',()=>{map.setView([spot.lat,spot.lng],15);});
    list.appendChild(li);
  });
});

// Tilføj spot
document.getElementById('toggleAddBtn').addEventListener('click',()=>document.getElementById('addSpotBox').classList.toggle('hidden'));
document.getElementById('cancelAddBtn').addEventListener('click',()=>document.getElementById('addSpotBox').classList.add('hidden'));

document.getElementById('addSpotBtn').addEventListener('click',()=>{
  const name=document.getElementById('spotName').value.trim();
  const address=document.getElementById('spotAddress').value.trim();
  if(!name || !address){alert("Udfyld navn og adresse"); return;}

  // Geokod adresse via OpenStreetMap Nominatim
  axios.get('https://nominatim.openstreetmap.org/search', {
    params:{ q: address, format:'json', limit:1 }
  }).then(resp=>{
    if(resp.data.length==0){alert("Adresse ikke fundet"); return;}
    const lat=parseFloat(resp.data[0].lat);
    const lng=parseFloat(resp.data[0].lon);
    parkingSpots.push({name,address,lat,lng,note:"Bruger tilføjet spot"});
    document.getElementById('spotName').value='';
    document.getElementById('spotAddress').value='';
    document.getElementById('addSpotBox').classList.add('hidden');
    renderSpots();
  }).catch(()=>{alert("Fejl ved geokodning");});
});

// Init geolocation
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
