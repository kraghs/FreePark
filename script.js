document.addEventListener('DOMContentLoaded', () => {
  emailjs.init("YWh--PawwwyjotIrc");

  let parkingSpots = [];
  let userLat = 55.6761, userLng = 12.5683;
  let map = L.map('map').setView([userLat, userLng], 11);
  let userMarker = null;
  let currentSpotReport = null;

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; OpenStreetMap & CARTO', subdomains:'abcd', maxZoom:20
  }).addTo(map);

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function distanceKm(lat1, lon1, lat2, lon2){
    const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function generateMapLinks(lat,lng,name){
    const q = encodeURIComponent(name || `${lat},${lng}`);
    return { apple:`https://maps.apple.com/?ll=${lat},${lng}&q=${q}`, google:`https://www.google.com/maps/search/?api=1&query=${lat},${lng}` };
  }

  function showUserLocation(lat,lng){
    if(userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:3,fillColor:'#0a84ff',fillOpacity:1}).addTo(map);
  }

  async function loadSpots(){
    try{
      const resp = await axios.get('spots.json');
      parkingSpots = resp.data.map(s=>({...s,_id:s._id||`spot_${Date.now()}_${Math.floor(Math.random()*10000)}`}));
      parkingSpots.forEach(addSpotMarker);
      renderNearby();
    }catch(e){ console.error('Fejl ved indlæsning', e); }
  }

  function addSpotMarker(spot){
    const marker = L.circleMarker([spot.lat,spot.lng],{radius:6,color:'#0bb07b',weight:2,fillColor:'#00c07b',fillOpacity:1}).addTo(map);
    const links = generateMapLinks(spot.lat,spot.lng,spot.name);
    const html = `<strong>${escapeHtml(spot.name)}</strong><br>${escapeHtml(spot.address || '')}<br>
      <div style="margin-top:6px">
        <button class="popupInfoBtn" data-id="${spot._id}">Se info</button>
      </div>
      <div style="margin-top:8px">
        <a href="${links.apple}" target="_blank" class="mapBtn">Apple Maps</a><br>
        <a href="${links.google}" target="_blank" class="mapBtn">Google Maps</a>
      </div>`;
    marker.bindPopup(html);
    spot.marker = marker;

    marker.on('popupopen', ()=>{
      const btn = document.querySelector(`.popupInfoBtn[data-id="${spot._id}"]`);
      if(btn) btn.addEventListener('click',()=>openInfoModal(spot));
    });
  }

  function renderNearby(){
    const listEl = document.getElementById('parkingList');
    listEl.innerHTML = '';
    parkingSpots.map(s=>({...s,dist:distanceKm(userLat,userLng,s.lat,s.lng)}))
      .sort((a,b)=>a.dist-b.dist).slice(0,5).forEach(s=>{
        const li=document.createElement('li');
        li.innerHTML = `<div><strong>${escapeHtml(s.name)}</strong><div class="meta">${escapeHtml(s.address)} • ${s.dist.toFixed(1)} km</div></div>`;
        const btn=document.createElement('button'); btn.textContent='Se info'; btn.addEventListener('click',()=>openInfoModal(s));
        li.appendChild(btn);
        li.addEventListener('click',()=>{ map.setView([s.lat,s.lng],14); if(s.marker) s.marker.openPopup(); });
        listEl.appendChild(li);
      });
  }

  function openInfoModal(spot){
    document.getElementById('infoTitle').textContent = spot.name;
    document.getElementById('infoAddress').textContent = 'Adresse: '+spot.address;
    document.getElementById('infoNote').textContent = spot.note || '';
    document.getElementById('infoModal').classList.remove('hidden');
  }

  document.getElementById('closeInfoBtn').addEventListener('click',()=>document.getElementById('infoModal').classList.add('hidden'));

  // Rapport modal funktion
  function openReportModal(spot=null){
    currentSpotReport = spot;
    document.getElementById('reportName').value='';
    document.getElementById('reportEmail').value='';
    document.getElementById('reportProblem').value='';
    document.getElementById('reportModal').classList.remove('hidden');
  }

  document.getElementById('cancelReportBtn').addEventListener('click',()=>document.getElementById('reportModal').classList.add('hidden'));

  document.getElementById('sendReportBtn').addEventListener('click',()=>{
    const name=document.getElementById('reportName').value.trim();
    const email=document.getElementById('reportEmail').value.trim();
    const problem=document.getElementById('reportProblem').value.trim();
    if(!name||!email||!problem){ alert('Udfyld alle felter'); return; }
    const subject = currentSpotReport ? 'Fejl på parkeringsspot' : 'Fejl på hjemmesiden';
    const params = {from_name:name,from_email:email,subject,message:problem,spot_name:currentSpotReport?.name||''};
    emailjs.send('service_ccsxqgm','template_mnnib1k',params)
      .then(()=>{ alert('Rapport sendt!'); document.getElementById('reportModal').classList.add('hidden'); })
      .catch(()=>alert('Fejl ved afsendelse'));
  });

  document.getElementById('reportSpotBtn').addEventListener('click',()=>openReportModal(window.__FriPark.parkingSpots.find(s=>s.name===document.getElementById('infoTitle').textContent)));
  document.getElementById('reportSiteBtn').addEventListener('click',()=>openReportModal(null));

  loadSpots();
  window.__FriPark = { parkingSpots,map };
});
