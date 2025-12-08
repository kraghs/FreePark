document.addEventListener('DOMContentLoaded', () => {

  let parkingSpots = [];
  let userLat = 55.6761, userLng = 12.5683;
  let map, userMarker;

  // Init map
  map = L.map('map', { preferCanvas: true }).setView([userLat, userLng], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toRad(x){ return x*Math.PI/180; }
  function distanceKm(lat1, lon1, lat2, lon2){
    const R=6371; const dLat=toRad(lat2-lat1); const dLon=toRad(lon2-lon1);
    const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Load spots from JSON
  axios.get('spots.json').then(resp=>{
    parkingSpots = resp.data;
    parkingSpots.forEach(addSpotMarker);
    renderNearby();
  }).catch(err=>console.error('Kunne ikke hente spots.json', err));

  function addSpotMarker(spot){
    const marker = L.circleMarker([spot.lat, spot.lng], { radius:6, color:'#0bb07b', weight:2, fillColor:'#00c07b', fillOpacity:1 }).addTo(map);
    const popupHtml = `<strong>${escapeHtml(spot.name)}</strong><br>${escapeHtml(spot.address)}<br>
      <div style="margin-top:6px"><button class="popupInfoBtn" data-name="${escapeHtml(spot.name)}">Se info</button></div>`;
    marker.bindPopup(popupHtml);
    spot.marker = marker;
    marker.on('popupopen', ()=>{
      const btn = document.querySelector(`.popupInfoBtn[data-name="${escapeHtml(spot.name)}"]`);
      if(btn) btn.addEventListener('click', ()=> openInfoModal(spot));
    });
  }

  function renderNearby(centerLat=userLat, centerLng=userLng){
    const list = document.getElementById('parkingList');
    list.innerHTML = '';
    parkingSpots.map(s=>({...s, dist: distanceKm(centerLat, centerLng, s.lat, s.lng)}))
                .sort((a,b)=>a.dist-b.dist).slice(0,5)
                .forEach(spot=>{
                  const li = document.createElement('li');
                  li.innerHTML = `<div><strong>${escapeHtml(spot.name)}</strong><div class="meta">${escapeHtml(spot.address)} • ${spot.dist.toFixed(1)} km</div></div>`;
                  const btn = document.createElement('button'); btn.textContent='Se info';
                  btn.addEventListener('click', e=>{ e.stopPropagation(); openInfoModal(spot); });
                  li.appendChild(btn);
                  li.addEventListener('click', ()=>{ map.setView([spot.lat,spot.lng],14); if(spot.marker) spot.marker.openPopup(); });
                  list.appendChild(li);
                });
  }

  function openInfoModal(spot){
    document.getElementById('infoTitle').textContent=spot.name;
    document.getElementById('infoAddress').textContent='Adresse: '+spot.address;
    document.getElementById('infoNote').textContent=spot.note+' — Husk altid at tjekke skilte.';
    document.getElementById('infoModal').classList.remove('hidden');
  }
  document.getElementById('closeInfoBtn').addEventListener('click', ()=>document.getElementById('infoModal').classList.add('hidden'));

  // Brug min lokation
  document.getElementById('useMyLocationBtn').addEventListener('click', ()=>{
    if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      userLat = pos.coords.latitude; userLng=pos.coords.longitude;
      if(userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker([userLat,userLng], { radius:9, weight:3, color:'#fff', fillColor:'#0a84ff', fillOpacity:1 }).addTo(map).bindPopup('Din position');
      map.setView([userLat,userLng],13);
      renderNearby(userLat,userLng);
    }, ()=>alert('Kunne ikke hente lokation'));
  });
// =========================
// Søg
// =========================
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = '';
  if (!q) {
    searchResults.classList.add('hidden');
    return;
  }

  const matches = parkingSpots.filter(s => 
    s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    searchResults.classList.add('hidden');
    return;
  }

  matches.forEach(spot => {
    const row = document.createElement('div');
    row.className = 'result';
    row.innerHTML = `
      <div>
        <strong>${spot.name}</strong><br>
        <small>${spot.address}</small>
      </div>
    `;
    row.addEventListener('click', () => {
      map.setView([spot.lat, spot.lng], 14);
      if (spot.marker) spot.marker.openPopup();
      openInfoModal(spot);
      searchResults.classList.add('hidden');
      searchInput.value = '';
    });
    searchResults.appendChild(row);
  });

  searchResults.classList.remove('hidden');
});

});
