/* script.js - FreePark (reliable map init & UI) */
document.addEventListener('DOMContentLoaded', () => {

  // Data: få, men udbyg selv senere
  const parkingSpots = [
    { name:"Vanløse Station - P", address:"Vanløse Station, 2720 Vanløse", lat:55.6970, lng:12.4890, note:"Stationsparkering; tjek skilte." },
    { name:"Hellerup Stationsplads", address:"Hellerup St., 2900 Hellerup", lat:55.7387, lng:12.5785, note:"Stationsparkering; ofte tidsbegrænset." },
    { name:"Valby Syd P", address:"Valbyparken, 2500 Valby", lat:55.6560, lng:12.4995, note:"Større p-plads ved Valby." },
    { name:"Amager Strand P", address:"Strandvejen, 2300 København S", lat:55.6469, lng:12.5950, note:"P-pladser ved stranden; tjek skilte." },
    { name:"Tangkrogen P", address:"Marselisborg Havnevej 4, 8000 Aarhus", lat:56.1520, lng:10.2030, note:"Stor p-plads ved kysten." }
  ];

  // State
  let userLat = 55.6761, userLng = 12.5683;
  let map, userMarker;

  // Init map safely
  try {
    map = L.map('map', { preferCanvas: true }).setView([userLat, userLng], 11);
  } catch (err) {
    console.error('Fejl ved Leaflet init:', err);
    alert('Kort kunne ikke initialiseres. Tjek console for detaljer.');
    return;
  }

  // Tile layer (Carto Voyager)
  const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  });

  tiles.addTo(map);

  // If the map is inside a hidden container initially, call invalidateSize
  // We'll run once after short delay to be safe on mobile/safari
  setTimeout(()=> {
    try { map.invalidateSize(); } catch(e){/* ignore */ }
  }, 250);

  // util: haversine distance in km
  function toRad(x){ return x * Math.PI / 180; }
  function distanceKm(lat1, lon1, lat2, lon2){
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Add marker for a spot
  function addSpotMarker(spot){
    const marker = L.circleMarker([spot.lat, spot.lng], {
      radius:6, color:'#0bb07b', weight:2, fillColor:'#00c07b', fillOpacity:1
    }).addTo(map);

    // Popup with a data attribute on the button
    const popupHtml = `<strong>${escapeHtml(spot.name)}</strong><br><small>${escapeHtml(spot.address)}</small><br>
      <div style="margin-top:8px;"><button class="popupInfoBtn" data-name="${escapeHtml(spot.name)}" style="background:#0a84ff;border:none;color:white;padding:6px 8px;border-radius:8px;cursor:pointer">Se info</button></div>`;

    marker.bindPopup(popupHtml);
    spot.marker = marker;

    // Attach listener when popup opens (safe)
    marker.on('popupopen', () => {
      const btn = document.querySelector('.popupInfoBtn[data-name="'+escapeHtml(spot.name)+'"]');
      if(btn){
        btn.addEventListener('click', () => openInfoModal(spot));
      }
    });

    marker.on('click', ()=> map.setView([spot.lat, spot.lng], 14));
  }

  // Add all initial markers
  parkingSpots.forEach(s => addSpotMarker(s));

  // User marker (Apple-like)
  function setUserMarker(lat,lng){
    if(userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([lat,lng], {
      radius:9, weight:3, color:'#ffffff', fillColor:'#0a84ff', fillOpacity:1
    }).addTo(map);
    userMarker.bindPopup('Din position');
  }

  // Render 5 nearest
  function renderNearby(centerLat = userLat, centerLng = userLng){
    const list = document.getElementById('parkingList');
    list.innerHTML = '';

    const arr = parkingSpots.map(s => ({...s, dist: distanceKm(centerLat, centerLng, s.lat, s.lng)}));
    arr.sort((a,b)=> a.dist - b.dist);
    arr.slice(0,5).forEach(spot => {
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escapeHtml(spot.name)}</strong><div class="meta">${escapeHtml(spot.address)} • ${spot.dist.toFixed(1)} km</div></div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Se info';
      btn.addEventListener('click', (e)=> { e.stopPropagation(); openInfoModal(spot); });
      li.appendChild(btn);
      li.addEventListener('click', ()=> {
        map.setView([spot.lat, spot.lng], 14);
        if(spot.marker) spot.marker.openPopup();
      });
      list.appendChild(li);
    });
  }

  // Info modal
  function openInfoModal(spot){
    document.getElementById('infoTitle').textContent = spot.name;
    document.getElementById('infoAddress').textContent = 'Adresse: ' + spot.address;
    document.getElementById('infoNote').textContent = (spot.note || 'Ingen ekstra info') + ' — Husk at tjekke skilte.';
    document.getElementById('infoModal').classList.remove('hidden');
  }
  document.getElementById('closeInfoBtn').addEventListener('click', ()=> {
    document.getElementById('infoModal').classList.add('hidden');
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    searchResults.innerHTML = '';
    if(!q){ searchResults.classList.add('hidden'); return; }
    const matches = parkingSpots.filter(s => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
    if(matches.length === 0){ searchResults.classList.add('hidden'); return; }
    matches.slice(0,30).forEach(spot => {
      const row = document.createElement('div');
      row.className = 'result';
      row.innerHTML = `<div><strong>${escapeHtml(spot.name)}</strong><br><small>${escapeHtml(spot.address)}</small></div><div><small>${distanceKm(userLat,userLng,spot.lat,spot.lng).toFixed(1)} km</small></div>`;
      row.addEventListener('click', () => {
        map.setView([spot.lat, spot.lng], 13);
        if(spot.marker) spot.marker.openPopup();
        openInfoModal(spot);
        searchResults.classList.add('hidden');
        searchInput.value = '';
      });
      searchResults.appendChild(row);
    });
    searchResults.classList.remove('hidden');
  });

  // Brug min lokation (top)
  document.getElementById('useMyLocationBtn').addEventListener('click', () => {
    if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      userLat = pos.coords.latitude; userLng = pos.coords.longitude;
      setUserMarker(userLat, userLng);
      map.setView([userLat, userLng], 13);
      renderNearby(userLat, userLng);
    }, ()=> alert('Kunne ikke hente din lokation'));
  });

  // Add-spot modal toggle
  document.getElementById('toggleAddBtn').addEventListener('click', ()=> {
    document.getElementById('addSpotBox').classList.toggle('hidden');
  });
  document.getElementById('cancelAddBtn').addEventListener('click', ()=> {
    document.getElementById('addSpotBox').classList.add('hidden');
  });

  // Use my location in add modal (reverse geocode)
  document.getElementById('useMyLocationAddBtn').addEventListener('click', () => {
    if(!navigator.geolocation){ alert('Din browser understøtter ikke geolokation'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      try {
        const resp = await axios.get('https://nominatim.openstreetmap.org/reverse', { params:{ lat, lon, format:'json' }});
        const display = resp.data && (resp.data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        document.getElementById('spotAddress').value = display;
        document.getElementById('spotAddress').dataset.lat = lat;
        document.getElementById('spotAddress').dataset.lng = lon;
        alert('Din lokation er sat i adressefeltet. Tryk Gem for at gemme spotet.');
      } catch (err) {
        document.getElementById('spotAddress').value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        document.getElementById('spotAddress').dataset.lat = lat;
        document.getElementById('spotAddress').dataset.lng = lon;
        alert('Din lokation er sat (ingen adresse fundet). Tryk Gem for at gemme spotet.');
      }
    }, ()=> alert('Kunne ikke hente din lokation'));
  });

  // Save a new spot
  document.getElementById('addSpotBtn').addEventListener('click', async () => {
    const name = (document.getElementById('spotName').value || '').trim();
    const address = (document.getElementById('spotAddress').value || '').trim();
    if(!name || !address){ alert('Udfyld både navn og adresse'); return; }

    const latData = document.getElementById('spotAddress').dataset.lat;
    const lngData = document.getElementById('spotAddress').dataset.lng;
    if(latData && lngData){
      pushNewSpot(name, address, parseFloat(latData), parseFloat(lngData));
      delete document.getElementById('spotAddress').dataset.lat;
      delete document.getElementById('spotAddress').dataset.lng;
      return;
    }

    const coordMatch = address.match(/^\s*([-+]?\d+\.\d+)\s*,\s*([-+]?\d+\.\d+)\s*$/);
    if(coordMatch){
      pushNewSpot(name, address, parseFloat(coordMatch[1]), parseFloat(coordMatch[2]));
      return;
    }

    try {
      const resp = await axios.get('https://nominatim.openstreetmap.org/search', { params:{ q: address, format:'json', limit:1 }});
      if(!resp.data || resp.data.length === 0){ alert('Adresse ikke fundet'); return; }
      const lat = parseFloat(resp.data[0].lat), lng = parseFloat(resp.data[0].lon);
      pushNewSpot(name, resp.data[0].display_name || address, lat, lng);
    } catch(e){
      alert('Fejl ved geokodning. Prøv igen.');
    }
  });

  function pushNewSpot(name, address, lat, lng){
    const spot = { name, address, lat, lng, note: 'Bruger-tilføjet. Husk at tjekke skilte.' };
    parkingSpots.push(spot);
    addSpotMarker(spot);
    document.getElementById('spotName').value = '';
    document.getElementById('spotAddress').value = '';
    document.getElementById('addSpotBox').classList.add('hidden');
    renderNearby(userLat, userLng);
  }

  // Init: geolocation + initial list
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos => {
      userLat = pos.coords.latitude; userLng = pos.coords.longitude;
      setUserMarker(userLat, userLng);
      map.setView([userLat, userLng], 12);
      renderNearby(userLat, userLng);
    }, ()=> {
      renderNearby(userLat, userLng);
    }, { timeout: 5000 });
  } else {
    renderNearby(userLat, userLng);
  }

  // Compatibility helper: older popups / inline calls
  window.openInfoFromMarker = function(name){
    const spot = parkingSpots.find(s => s.name === name);
    if(spot) openInfoModal(spot);
  };

}); // DOMContentLoaded
