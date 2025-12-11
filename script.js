// script.js — Erstat din gamle fil med denne
document.addEventListener('DOMContentLoaded', () => {
  // --- State
  let parkingSpots = []; // loaded from spots.json (your existing file)
  let userLat = 55.6761, userLng = 12.5683;
  let map = null;
  let userMarker = null;

  // --- Init map
  map = L.map('map', { preferCanvas: true }).setView([userLat, userLng], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // --- Helpers
  function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toRad(x){ return x * Math.PI / 180; }
  function distanceKm(lat1, lon1, lat2, lon2){
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  function generateMapLinks(lat, lng, name){
    const q = encodeURIComponent(name || `${lat},${lng}`);
    return {
      apple: `https://maps.apple.com/?ll=${lat},${lng}&q=${q}`,
      google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    };
  }

  // --- User location marker (Apple style)
  function showUserLocation(lat, lng, openPopup = false){
    if (userMarker && map.hasLayer(userMarker)) map.removeLayer(userMarker);
    userMarker = L.circleMarker([lat, lng], {
      radius: 9,
      color: '#fff',
      weight: 3,
      fillColor: '#0a84ff',
      fillOpacity: 1
    }).addTo(map);
    if (openPopup) userMarker.bindPopup('Din position').openPopup();
  }

  // --- Load spots (use user's existing spots.json)
  async function loadSpots(){
    try {
      const resp = await axios.get('spots.json', { cache: 'no-store' });
      parkingSpots = resp.data.map(s => {
        // normalize lat/lng
        return Object.assign({}, s, {
          lat: s.lat !== undefined ? Number(s.lat) : null,
          lng: s.lng !== undefined ? Number(s.lng) : null,
          _id: s._id || (`spot_${Date.now()}_${Math.floor(Math.random()*10000)}`)
        });
      });
      parkingSpots.forEach(addSpotMarker);
      renderNearby();
    } catch (err) {
      console.error('Kunne ikke hente spots.json', err);
      // If you want a fallback, you can set parkingSpots = [] here
    }
  }

  // --- Add marker + popup (with Apple/Google links)
  function addSpotMarker(spot) {
    if (typeof spot.lat !== 'number' || typeof spot.lng !== 'number' || isNaN(spot.lat) || isNaN(spot.lng)) return;
    const marker = L.circleMarker([spot.lat, spot.lng], {
      radius: 6,
      color: '#0bb07b',
      weight: 2,
      fillColor: '#00c07b',
      fillOpacity: 1
    }).addTo(map);

    const links = generateMapLinks(spot.lat, spot.lng, spot.name);
    // Build popup HTML using safe concatenation
    const popupHtml =
      '<div class="popup-content">' +
        '<strong>' + escapeHtml(spot.name) + '</strong><br/>' +
        (spot.address ? (escapeHtml(spot.address) + '<br/>') : '') +
        (spot.note ? ('<small>' + escapeHtml(spot.note) + '</small><br/>') : '') +
        '<div style="margin-top:8px">' +
          '<button class="popupInfoBtn" data-id="' + spot._id + '">Se info</button>' +
        '</div>' +
        '<div style="margin-top:8px">' +
          '<a class="mapBtn" target="_blank" rel="noopener" href="' + links.apple + '">Åbn i Apple Maps</a><br/>' +
          '<a class="mapBtn" target="_blank" rel="noopener" href="' + links.google + '" style="margin-top:6px; display:inline-block;">Åbn i Google Maps</a>' +
        '</div>' +
      '</div>';

    marker.bindPopup(popupHtml);
    spot.marker = marker;

    // Bind popup open event to attach click handler to the "Se info" button
    marker.on('popupopen', () => {
      // query by data-id (safe)
      const selector = '.popupInfoBtn[data-id="' + spot._id + '"]';
      const btn = document.querySelector(selector);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openInfoModal(spot);
        });
      }
    });
  }

  // --- Render nearest 5
  function renderNearby(centerLat = userLat, centerLng = userLng) {
    const listEl = document.getElementById('parkingList');
    listEl.innerHTML = '';
    const items = parkingSpots
      .filter(s => typeof s.lat === 'number' && typeof s.lng === 'number')
      .map(s => Object.assign({}, s, { dist: distanceKm(centerLat, centerLng, s.lat, s.lng) }))
      .sort((a,b)=>a.dist - b.dist)
      .slice(0,5);

    if (items.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Ingen parkeringspladser fundet.';
      listEl.appendChild(li);
      return;
    }

    items.forEach(spot => {
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escapeHtml(spot.name)}</strong><div class="meta">${escapeHtml(spot.address || '')} • ${spot.dist.toFixed(1)} km</div></div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Se info';
      btn.addEventListener('click', (e) => { e.stopPropagation(); openInfoModal(spot); });
      li.appendChild(btn);
      li.addEventListener('click', () => {
        map.setView([spot.lat, spot.lng], 14);
        if (spot.marker) spot.marker.openPopup();
      });
      listEl.appendChild(li);
    });
  }

  // --- Info modal
  function openInfoModal(spot){
    document.getElementById('infoTitle').textContent = spot.name || 'Uden navn';
    document.getElementById('infoAddress').textContent = 'Adresse: ' + (spot.address || 'Ukendt');
    document.getElementById('infoNote').textContent = (spot.note || spot.freeInfo || '') + ' — Husk altid at tjekke skilte.';
    document.getElementById('infoModal').classList.remove('hidden');
  }
  document.getElementById('closeInfoBtn').addEventListener('click', ()=>document.getElementById('infoModal').classList.add('hidden'));

  // --- Add spot modal handling
  const addSpotBox = document.getElementById('addSpotBox');
  document.getElementById('toggleAddBtn').addEventListener('click', ()=> addSpotBox.classList.remove('hidden'));
  document.getElementById('cancelAddBtn').addEventListener('click', ()=> addSpotBox.classList.add('hidden'));

  // Geocode address string using Nominatim (returns first match or null)
  async function geocodeAddress(address){
    if (!address) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=dk&q=${encodeURIComponent(address)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const j = await res.json();
      if (j && j.length) {
        return { lat: Number(j[0].lat), lng: Number(j[0].lon), display_name: j[0].display_name, boundingbox: j[0].boundingbox };
      }
      return null;
    } catch (e) {
      console.error('Geocode fejl', e);
      return null;
    }
  }

  // Reverse geocode coordinates to address (Nominatim)
  async function reverseGeocode(lat, lng){
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      if (!res.ok) return null;
      const j = await res.json();
      return j;
    } catch(e) {
      console.error('Reverse geocode fejl', e);
      return null;
    }
  }

  // Use my location button inside add modal (fills address via reverse geocode)
  document.getElementById('useMyLocationAddBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { alert('Din browser understøtter ikke geolokation'); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      showUserLocation(lat, lng, true);
      // fill address field
      const r = await reverseGeocode(lat, lng);
      document.getElementById('spotAddress').value = (r && r.display_name) ? r.display_name : `${lat}, ${lng}`;
    }, err => {
      alert('Kunne ikke hente din lokation: ' + (err.message || err.code));
    }, { enableHighAccuracy:true, timeout:10000 });
  });

  // Add spot: geocode address to lat/lng if possible, otherwise fall back to map center
  document.getElementById('addSpotBtn').addEventListener('click', async () => {
    const name = (document.getElementById('spotName').value || '').trim();
    const address = (document.getElementById('spotAddress').value || '').trim();
    const note = (document.getElementById('spotInfo').value || '').trim();

    if (!name || !address) { alert('Udfyld både navn og adresse'); return; }

    // Try geocoding
    let location = await geocodeAddress(address);
    let lat, lng, displayName;
    if (location) {
      lat = location.lat; lng = location.lng; displayName = location.display_name;
    } else {
      // fallback to map center
      const c = map.getCenter();
      lat = c.lat; lng = c.lng;
      displayName = address;
    }

    const spot = {
      _id: `spot_${Date.now()}_${Math.floor(Math.random()*10000)}`,
      name,
      address: displayName || address,
      note,
      lat,
      lng
    };

    parkingSpots.push(spot);
    addSpotMarker(spot);
    renderNearby(userLat, userLng);
    addSpotBox.classList.add('hidden');

    // clear inputs
    document.getElementById('spotName').value = '';
    document.getElementById('spotAddress').value = '';
    document.getElementById('spotInfo').value = '';
  });

  // --- "Brug min lokation" button (main controls) - shows blue marker, recenters, updates list
  document.getElementById('useMyLocationBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { alert('Din browser understøtter ikke geolokation'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      userLat = pos.coords.latitude; userLng = pos.coords.longitude;
      showUserLocation(userLat, userLng, true);
      map.setView([userLat, userLng], 13);
      renderNearby(userLat, userLng);
    }, err => {
      alert('Kunne ikke hente din lokation: ' + (err.message || err.code));
    }, { enableHighAccuracy:true, timeout:10000 });
  });

  // --- Search: Nominatim suggestions + local matches
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  function hideSearchResults(){
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
  }
  function showSearchResults(){
    searchResults.style.display = 'block';
  }

  async function geoSearch(query){
    if (!query) return [];
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=dk&limit=6&q=${encodeURIComponent(query)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const j = await res.json();
      return j;
    } catch(e) {
      console.error('geoSearch fejl', e);
      return [];
    }
  }

  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    const qRaw = (searchInput.value || '').trim();
    const q = qRaw.toLowerCase();
    searchResults.innerHTML = '';

    if (!q) { hideSearchResults(); return; }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      // 1) geo suggestions
      const geo = await geoSearch(qRaw);

      // 2) local matches based on name/address/city
      const localMatches = parkingSpots.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q)
      );

      // Render results: geo first
      let shown = 0;
      if (geo && geo.length) {
        geo.forEach(g => {
          const title = (g.display_name || '').split(',')[0] || 'Område';
          const row = document.createElement('div');
          row.className = 'result';
          row.innerHTML = `<div><strong>${escapeHtml(title)}</strong><br><small>${escapeHtml(g.display_name || '')}</small></div>`;
          row.addEventListener('click', () => {
            // Clear input + results
            searchInput.value = '';
            hideSearchResults();
            // Zoom to area and list spots in bbox
            const lat = Number(g.lat), lon = Number(g.lon);
            map.setView([lat, lon], 12);
            // boundingbox: [south, north, west, east]
            const bb = g.boundingbox ? g.boundingbox.map(Number) : null;
            if (bb && bb.length === 4) {
              const matches = parkingSpots.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number' &&
                s.lat >= bb[0] && s.lat <= bb[1] && s.lng >= bb[2] && s.lng <= bb[3]);
              // render matches in main list
              const listEl = document.getElementById('parkingList');
              listEl.innerHTML = '';
              if (!matches.length) {
                const li = document.createElement('li'); li.textContent = 'Ingen registrerede gratis parkeringspladser i dette område.'; listEl.appendChild(li);
              } else {
                matches.forEach(spot => {
                  const li = document.createElement('li');
                  li.innerHTML = `<div><strong>${escapeHtml(spot.name)}</strong><div class="meta">${escapeHtml(spot.address || '')}</div></div>`;
                  const b = document.createElement('button'); b.textContent = 'Se info';
                  b.addEventListener('click', (e) => { e.stopPropagation(); openInfoModal(spot); });
                  li.appendChild(b);
                  li.addEventListener('click', () => { map.setView([spot.lat, spot.lng], 14); if (spot.marker) spot.marker.openPopup(); });
                  listEl.appendChild(li);
                });
              }
            } else {
              // just center if no bbox
              map.setView([lat, lon], 12);
            }
          });
          searchResults.appendChild(row);
          shown++;
        });
      }

      // render local matches below
      if (localMatches && localMatches.length) {
        localMatches.forEach(s => {
          const row = document.createElement('div');
          row.className = 'result';
          row.innerHTML = `<div><strong>${escapeHtml(s.name)}</strong><br><small>${escapeHtml(s.address || '')}</small></div>`;
          row.addEventListener('click', () => {
            hideSearchResults();
            searchInput.value = '';
            map.setView([s.lat, s.lng], 14);
            if (s.marker) s.marker.openPopup();
            openInfoModal(s);
          });
          searchResults.appendChild(row);
          shown++;
        });
      }

      if (shown > 0) showSearchResults(); else hideSearchResults();
    }, 220);
  });

  // click outside closes search results
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!searchInput.contains(target) && !searchResults.contains(target)) hideSearchResults();
  });

  // --- Start
  loadSpots();

  // expose for debugging if needed
  window.__FriPark = { parkingSpots, map };
});
