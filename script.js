// script.js — komplet og fungerende version
document.addEventListener('DOMContentLoaded', () => {

let parkingSpots=[],userLat=55.6761,userLng=12.5683,map=null,userMarker=null,reportingSpotId=null;

// --- INIT MAP ---
map=L.map('map',{preferCanvas:true}).setView([userLat,userLng],11);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
  attribution:'&copy; OpenStreetMap & CARTO',subdomains:'abcd',maxZoom:20
}).addTo(map);

// --- HELPERS ---
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toRad(x){return x*Math.PI/180;}
function distanceKm(lat1,lon1,lat2,lon2){
  const R=6371,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function generateMapLinks(lat,lng,name){const q=encodeURIComponent(name||`${lat},${lng}`);return {apple:`https://maps.apple.com/?ll=${lat},${lng}&q=${q}`,google:`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`};}

// --- USER LOCATION ---
function showUserLocation(lat,lng,openPopup=false){
  if(userMarker && map.hasLayer(userMarker)) map.removeLayer(userMarker);
  userMarker=L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:3,fillColor:'#0a84ff',fillOpacity:1}).addTo(map);
  if(openPopup) userMarker.bindPopup('Din position').openPopup();
}

// --- LOAD SPOTS ---
async function loadSpots(){
  try{
    const resp=await axios.get('spots.json',{cache:'no-store'});
    parkingSpots=resp.data.map(s=>({_id:s._id||`spot_${Date.now()}_${Math.floor(Math.random()*10000)}`,name:s.name,address:s.address,note:s.note,lat:Number(s.lat),lng:Number(s.lng)}));
    parkingSpots.forEach(addSpotMarker);
    renderNearby();
  }catch(err){console.error('Kunne ikke hente spots.json',err);}
}

// --- ADD SPOT MARKER ---
function addSpotMarker(spot){
  if(typeof spot.lat!=='number'||typeof spot.lng!=='number'||isNaN(spot.lat)) return;
  const marker=L.circleMarker([spot.lat,spot.lng],{radius:6,color:'#0bb07b',weight:2,fillColor:'#00c07b',fillOpacity:1}).addTo(map);
  const links=generateMapLinks(spot.lat,spot.lng,spot.name);
  const popupHtml=`<div class="popup-content"><strong>${escapeHtml(spot.name)}</strong><br/>${spot.address?escapeHtml(spot.address)+'<br/>':''}${spot.note?'<small>'+escapeHtml(spot.note)+'</small><br/>':''}<div style="margin-top:8px"><button class="popupInfoBtn" data-id="${spot._id}">Se info</button></div><div style="margin-top:8px"><a class="mapBtn" target="_blank" rel="noopener" href="${links.apple}">Åbn i Apple Maps</a><br/><a class="mapBtn" target="_blank" rel="noopener" href="${links.google}" style="margin-top:6px;display:inline-block;">Åbn i Google Maps</a></div></div>`;
  marker.bindPopup(popupHtml);
  spot.marker=marker;
  marker.on('popupopen',()=>{const btn=document.querySelector(`.popupInfoBtn[data-id="${spot._id}"]`);if(btn) btn.addEventListener('click',e=>{e.stopPropagation();openInfoModal(spot);});});
}

// --- RENDER NEARBY ---
function renderNearby(centerLat=userLat,centerLng=userLng){
  const listEl=document.getElementById('parkingList');listEl.innerHTML='';
  const items=parkingSpots.filter(s=>typeof s.lat==='number'&&typeof s.lng==='number').map(s=>Object.assign({},s,{dist:distanceKm(centerLat,centerLng,s.lat,s.lng)})).sort((a,b)=>a.dist-b.dist).slice(0,5);
  if(items.length===0){listEl.innerHTML='<li>Ingen parkeringspladser fundet.</li>';return;}
  items.forEach(spot=>{const li=document.createElement('li');li.innerHTML=`<div><strong>${escapeHtml(spot.name)}</strong><div class="meta">${escapeHtml(spot.address||'')} • ${spot.dist.toFixed(1)} km</div></div>`;const btn=document.createElement('button');btn.textContent='Se info';btn.addEventListener('click',e=>{e.stopPropagation();openInfoModal(spot);});li.appendChild(btn);li.addEventListener('click',()=>{map.setView([spot.lat,spot.lng],14);if(spot.marker) spot.marker.openPopup();});listEl.appendChild(li);});
}

// --- INFO MODAL ---
function openInfoModal(spot){document.getElementById('infoTitle').textContent=spot.name||'Uden navn';document.getElementById('infoAddress').textContent='Adresse: '+(spot.address||'Ukendt');document.getElementById('infoNote').textContent=(spot.note||'')+' — Husk altid at tjekke skilte.';document.getElementById('infoModal').classList.remove('hidden');reportingSpotId=spot._id;}
document.getElementById('closeInfoBtn').addEventListener('click',()=>document.getElementById('infoModal').classList.add('hidden'));

// --- ADD SPOT MODAL ---
const addSpotBox=document.getElementById('addSpotBox');
document.getElementById('toggleAddBtn').addEventListener('click',()=>addSpotBox.classList.remove('hidden'));
document.getElementById('cancelAddBtn').addEventListener('click',()=>addSpotBox.classList.add('hidden'));
async function geocodeAddress(address){if(!address)return null;const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=dk&q=${encodeURIComponent(address)}`;try{const res=await fetch(url);if(!res.ok)return null;const j=await res.json();if(j && j.length)return {lat:Number(j[0].lat),lng:Number(j[0].lon),display_name:j[0].display_name};return null}catch(e){console.error('Geocode fejl',e);return null;}}
