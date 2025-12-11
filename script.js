document.addEventListener('DOMContentLoaded', () => {

let parkingSpots = [];
let userLat=55.6761, userLng=12.5683;
let map = L.map('map').setView([userLat,userLng],11);
let userMarker;

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution:'&copy; OpenStreetMap & CARTO', subdomains:'abcd', maxZoom:20
}).addTo(map);

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function distanceKm(lat1,lon1,lat2,lon2){
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// Brugers position som Apple Maps-stil blå cirkel med hvid kant
function showUserLocation(lat,lng){
  if(userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat,lng],{
    radius:9,
    color:'#fff',
    weight:3,
    fillColor:'#0a84ff',
    fillOpacity:1
  }).addTo(map).bindPopup('Din position');
}

// Load spots fra spots.json
axios.get('spots.json').then(resp=>{
  parkingSpots=resp.data;
  parkingSpots.forEach(addSpotMarker);
  renderNearby();
}).catch(console.error);

// Tilføj marker
function addSpotMarker(spot){
  const marker=L.circleMarker([spot.lat,spot.lng],{radius:6,color:'#0bb07b',weight:2,fillColor:'#00c07b',fillOpacity:1}).addTo(map);
  const popupHtml=`<strong>${escapeHtml(spot.name)}</strong><br>${escapeHtml(spot.address)}<br>
      <div style="margin-top:6px"><button class="popupInfoBtn" data-name="${escapeHtml(spot.name)}">Se info</button></div>`;
  marker.bindPopup(popupHtml);
  spot.marker=marker;
  marker.on('popupopen',()=>{
    const btn=document.querySelector(`.popupInfoBtn[data-name="${escapeHtml(spot.name)}"]`);
    if(btn) btn.addEventListener('click',()=>openInfoModal(spot));
  });
}

// Render nærmeste spots
const parkingListEl=document.getElementById('parkingList');
function renderNearby(centerLat=userLat,centerLng=userLng){
  parkingListEl.innerHTML='';
  parkingSpots.map(s=>({...s,dist:distanceKm(centerLat,centerLng,s.lat,s.lng)}))
    .sort((a,b)=>a.dist-b.dist).slice(0,5)
    .forEach(spot=>{
      const li=document.createElement('li');
      li.innerHTML=`<div><strong>${escapeHtml(spot.name)}</strong><div class="meta">${escapeHtml(spot.address)} • ${spot.dist.toFixed(1)} km</div></div>`;
      const btn=document.createElement('button'); btn.textContent='Se info';
      btn.addEventListener('click',e=>{e.stopPropagation(); openInfoModal(spot)});
      li.appendChild(btn);
      li.addEventListener('click',()=>{map.setView([spot.lat,spot.lng],14); if(spot.marker) spot.marker.openPopup()});
      parkingListEl.appendChild(li);
    });
}

// Info modal
function openInfoModal(spot){
  document.getElementById('infoTitle').textContent=spot.name;
  document.getElementById('infoAddress').textContent='Adresse: '+spot.address;
  document.getElementById('infoNote').textContent=spot.note||'Ingen info';
  document.getElementById('infoModal').classList.remove('hidden');
}
document.getElementById('closeInfoBtn').addEventListener('click',()=>document.getElementById('infoModal').classList.add('hidden'));

// Tilføj spot modal
const addSpotBox=document.getElementById('addSpotBox');
document.getElementById('toggleAddBtn').addEventListener('click',()=>addSpotBox.classList.remove('hidden'));
document.getElementById('cancelAddBtn').addEventListener('click',()=>addSpotBox.classList.add('hidden'));

// Brug min lokation i input
document.getElementById('useMyLocationAddBtn').addEventListener('click',()=>{
  if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude, lng=pos.coords.longitude;
    showUserLocation(lat,lng);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
      .then(r=>r.json()).then(d=>document.getElementById('spotAddress').value=d.display_name||`${lat},${lng}`)
      .catch(()=>document.getElementById('spotAddress').value=`${lat},${lng}`);
  });
});

// Gem spot
document.getElementById('addSpotBtn').addEventListener('click',()=>{
  const name=document.getElementById('spotName').value.trim();
  const address=document.getElementById('spotAddress').value.trim();
  const note=document.getElementById('spotInfo').value.trim();
  if(!name||!address){ alert('Udfyld både navn og adresse'); return; }

  // midlertidigt placering = center på kort
  const latLng=map.getCenter();
  const spot={name,address,note,lat:latLng.lat,lng:latLng.lng};
  parkingSpots.push(spot);
  addSpotMarker(spot);
  renderNearby();
  addSpotBox.classList.add('hidden');
  document.getElementById('spotName').value='';
  document.getElementById('spotAddress').value='';
  document.getElementById('spotInfo').value='';
});

// Brug min lokation (blå cirkel)
document.getElementById('useMyLocationBtn')?.addEventListener('click',()=>{
  if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    userLat=pos.coords.latitude; userLng=pos.coords.longitude;
    showUserLocation(userLat,userLng);
    map.setView([userLat,userLng],13);
    renderNearby(userLat,userLng);
  });
});

// Søg funktion
const searchInput=document.getElementById('searchInput');
const searchResults=document.getElementById('searchResults');
function hideSearchResults(){ searchResults.innerHTML=''; searchResults.style.display='none'; }
function showSearchResults(){ searchResults.style.display='block'; }

let searchTimeout=null;
searchInput.addEventListener('input',()=>{
  const q=searchInput.value.trim().toLowerCase();
  if(!q){ hideSearchResults(); return; }
  clearTimeout(searchTimeout);
  searchTimeout=setTimeout(()=>{
    const matches=parkingSpots.filter(s=>(s.name||'').toLowerCase().includes(q)||(s.address||'').toLowerCase().includes(q));
    if(matches.length===0){ hideSearchResults(); return; }
    searchResults.innerHTML='';
    matches.forEach(s=>{
      const row=document.createElement('div'); row.className='result';
      row.innerHTML=`<div><strong>${escapeHtml(s.name)}</strong><br><small>${escapeHtml(s.address)}</small></div>`;
      row.addEventListener('click',()=>{
        hideSearchResults();
        searchInput.value='';
        map.setView([s.lat,s.lng],14);
        if(s.marker) s.marker.openPopup();
        openInfoModal(s);
      });
      searchResults.appendChild(row);
    });
    showSearchResults();
  },150);
});

document.addEventListener('click',(e)=>{
  if(!searchInput.contains(e.target) && !searchResults.contains(e.target)) hideSearchResults();
});

});
