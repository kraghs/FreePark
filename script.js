// script.js — fuld version (erstat din gamle file med denne)
document.addEventListener('DOMContentLoaded', () => {
  // ----------------------
  // EmailJS config (fra dig)
  // ----------------------
  const EMAILJS_SERVICE = 'service_ccsxqgm';
  const EMAILJS_TEMPLATE = 'template_mnnib1k';
  const EMAILJS_PUBLIC_KEY = 'YWh--PawwwyjotIrc';

  if (window.emailjs && emailjs.init) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  } else {
    console.warn('EmailJS ikke indlæst korrekt - rapporter vil fejle.');
  }

  // ----------------------
  // State
  // ----------------------
  let parkingSpots = [];
  let userLat = 55.6761, userLng = 12.5683;
  let map = null;
  let userMarker = null;
  let currentSpotReport = null; // spot object when reporting a spot

  // ----------------------
  // DOM refs
  // ----------------------
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  const toggleAddBtn = document.getElementById('toggleAddBtn');
  const addSpotBox = document.getElementById('addSpotBox');
  const cancelAddBtn = document.getElementById('cancelAddBtn');
  const addSpotBtn = document.getElementById('addSpotBtn');
  const useMyLocationAddBtn = document.getElementById('useMyLocationAddBtn');

  const spotNameInput = document.getElementById('spotName');
  const spotAddressInput = document.getElementById('spotAddress');
  const spotInfoInput = document.getElementById('spotInfo');

  const useMyLocationBtn = document.getElementById('useMyLocationBtn');

  const parkingListEl = document.getElementById('parkingList');

  const infoModal = document.getElementById('infoModal');
  const infoTitle = document.getElementById('infoTitle');
  const infoAddress = document.getElementById('infoAddress');
  const infoNote = document.getElementById('infoNote');
  const reportSpotBtn = document.getElementById('reportSpotBtn');
  const closeInfoBtn = document.getElementById('closeInfoBtn');

  const reportModal = document.getElementById('reportModal');
  const reportName = document.getElementById('reportName');
  const reportEmail = document.getElementById('reportEmail');
  const reportProblem = document.getElementById('reportProblem');
  const cancelReportBtn = document.getElementById('cancelReportBtn');
  const sendReportBtn = document.getElementById('sendReportBtn');
  const reportSiteBtn = document.getElementById('reportSiteBtn');

  // ----------------------
  // Helpers
  // ----------------------
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function toRad(x) { return x * Math.PI / 180; }
  function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function generateMapLinks(lat, lng, name) {
    const q = encodeURIComponent(name || `${lat},${lng}`);
    return {
      apple: `https://maps.apple.com/?ll=${lat},${lng}&q=${q}`,
      google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    };
  }

  // ----------------------
  // Init map
  // ----------------------
  map = L.map('map', { preferCanvas: true }).setView([userLat, userLng], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // show user blue circle (apple style)
  function showUserLocation(lat, lng, openPopup = false) {
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

  // ----------------------
  // Load spots from spots.json
  // ----------------------
  async function loadSpots() {
    try {
      const resp = await axios.get('spots.json', { cache: 'no-store' });
      parkingSpots = (resp.data || []).map(s => Object.assign({}, s, {
        _id: s._id || `spot_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        lat: Number(s.lat),
        lng: Number(s.lng)
      }));
      parkingSpots.forEach(addSpotMarker);
      renderNearby();
    } catch (e) {
      console.error('Kunne ikke hente spots.json', e);
    }
  }

  // ----------------------
  // Markers & Popups
  // ----------------------
  function addSpotMarker(spot) {
    if (typeof spot.lat !== 'number' || typeof spot.lng !== 'number' || isNaN(spot.lat)) return;
    const marker = L.circleMarker([spot.lat, spot.lng], {
      radius: 6,
      color: '#0bb07b',
      weight: 2,
      fillColor: '#00c07b',
      fillOpacity: 1
    }).addTo(map);

    const links = generateMapLinks(spot.lat, spot.lng, spot.name);
    const popupHtml = `
      <div class="popup-content" style="min-width:180px">
        <strong>${escapeHtml(spot.name)}</strong><br/>
        ${spot.address ? escapeHtml(spot.address) + '<br/>' : ''}
        ${spot.note ? '<small>' + escapeHtml(spot.note) + '</small><br/>' : ''}
        <div style="margin-top:8px">
          <button class="popupInfoBtn" data-id="${spot._id}">Se info</button>
        </div>
        <div style="margin-top:8px">
          <a class="mapBtn" target="_blank" rel="noopener" href="${links.apple}">Apple Maps</a><br/>
          <a class="mapBtn" target="_blank" rel="noopener" href="${links.google}" style="margin-top:6px;display:inline-block;">Google Maps</a>
        </div>
      </div>`;

    marker.bindPopup(popupHtml);
    spot.marker = marker;

    // delegate using 'popupopen' and remove handler after invoked to avoid duplicates
    marker.on('popupopen', () => {
      const selector = `.popupInfoBtn[data-id="${spot._id}"]`;
      const btn = document.querySelector(selector);
      if (!btn) return;
      const handler = (e) => {
        e.stopPropagation();
        openInfoModal(spot);
        btn.removeEventListener('click', handler);
      };
      btn.addEventListener('click', handler);
    });
  }

  // ----------------------
  // Nearby list
  // ----------------------
  function renderNearby(centerLat = userLat, centerLng = userLng) {
    parkingListEl.innerHTML = '';
    const items = parkingSpots
      .filter(s => typeof s.lat === 'number' && typeof s.lng === 'number')
      .map(s => Object.assign({}, s, { dist: distanceKm(centerLat, centerLng, s.lat, s.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);

    if (!items.length) {
      const li = document.createElement('li');
      li.textContent = 'Ingen parkeringspladser fundet.';
      parkingListEl.appendChild(li);
      return;
    }

    items.forEach(spot => {
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${escapeHtml(spot.name)}</strong>
        <div class="meta">${escapeHtml(spot.address || '')} • ${spot.dist.toFixed(1)} km</div></div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Se info';
      btn.addEventListener('click', (e) => { e.stopPropagation(); openInfoModal(spot); });
      li.appendChild(btn);
      li.addEventListener('click', () => {
        map.setView([spot.lat, spot.lng], 14);
        if (spot.marker) spot.marker.openPopup();
      });
      parkingListEl.appendChild(li);
    });
  }

  // ----------------------
  // Info modal
  // ----------------------
  function openInfoModal(spot) {
    infoTitle.textContent = spot.name || 'Uden navn';
    infoAddress.textContent = 'Adresse: ' + (spot.address || 'Ukendt');
    infoNote.textContent = (spot.note || '') + ' — Husk altid at tjekke skilte.';
    infoModal.classList.remove('hidden');
    currentSpotReport = spot;
  }
  closeInfoBtn.addEventListener('click', () => {
    infoModal.classList.add('hidden');
    currentSpotReport = null;
  });

  // ----------------------
  // Add spot modal + geocoding
  // ----------------------
  toggleAddBtn.addEventListener('click', () => addSpotBox.classList.remove('hidden'));
  cancelAddBtn.addEventListener('click', () => addSpotBox.classList.add('hidden'));

  async function geocodeAddress(address) {
    if (!address) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=dk&q=${encodeURIComponent(address)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const j = await res.json();
      if (j && j.length) return { lat: Number(j[0].lat), lng: Number(j[0].lon), display_name: j[0].display_name };
      return null;
    } catch (e) {
      console.error('Geocode fejl', e);
      return null;
    }
  }

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Reverse geocode fejl', e);
      return null;
    }
  }

  useMyLocationAddBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { alert('Din browser understøtter ikke geolokation'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      showUserLocation(lat, lng, true);
      const r = await reverseGeocode(lat, lng);
      spotAddressInput.value = (r && r.display_name) ? r.display_name : `${lat}, ${lng}`;
    }, err => {
      alert('Kunne ikke hente din lokation: ' + (err.message || err.code));
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  addSpotBtn.addEventListener('click', async () => {
    const name = (spotNameInput.value || '').trim();
    const address = (spotAddressInput.value || '').trim();
    const note = (spotInfoInput.value || '').trim();
    if (!name || !address) { alert('Udfyld både navn og adresse'); return; }

    let loc = await geocodeAddress(address);
    let lat, lng, displayName;
    if (loc) { lat = loc.lat; lng = loc.lng; displayName = loc.display_name; }
    else { const c = map.getCenter(); lat = c.lat; lng = c.lng; displayName = address; }

    const spot = {
      _id: `spot_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      name,
      address: displayName,
      note,
      lat,
      lng
    };

    parkingSpots.push(spot);
    addSpotMarker(spot);
    renderNearby(userLat, userLng);

    spotNameInput.value = '';
    spotAddressInput.value = '';
    spotInfoInput.value = '';
    addSpotBox.classList.add('hidden');
  });

  // ----------------------
  // Main "brug min lokation" button
  // ----------------------
  useMyLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { alert('Din browser understøtter ikke geolokation'); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      userLat = pos.coords.latitude; userLng = pos.coords.longitude;
      showUserLocation(userLat, userLng, true);
      map.setView([userLat, userLng], 13);
      renderNearby(userLat, userLng);
    }, (err) => {
      alert('Kunne ikke hente din lokation: ' + (err.message || err.code));
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  // ----------------------
  // Search (Nominatim + local matches)
  // ----------------------
  async function geoSearch(query) {
    if (!query) return [];
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=dk&limit=6&q=${encodeURIComponent(query)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('geoSearch fejl', e);
      return [];
    }
  }

  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    const qRaw = (searchInput.value || '').trim();
    const q = qRaw.toLowerCase();
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    if (!q) return;

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const geo = await geoSearch(qRaw);
      const localMatches = parkingSpots.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q)
      );

      let shown = 0;

      // geo suggestions
      if (geo && geo.length) {
        geo.forEach(g => {
          const title = (g.display_name || '').split(',')[0] || 'Område';
          const row = document.createElement('div');
          row.className = 'result';
          row.innerHTML = `<div><strong>${escapeHtml(title)}</strong><br/><small>${escapeHtml(g.display_name || '')}</small></div>`;
          row.addEventListener('click', () => {
            searchInput.value = '';
            searchResults.style.display = 'none';
            const lat = Number(g.lat), lon = Number(g.lon);
            map.setView([lat, lon], 12);
            const bb = g.boundingbox ? g.boundingbox.map(Number) : null;
            if (bb && bb.length === 4) {
              const matches = parkingSpots.filter(s => s.lat >= bb[0] && s.lat <= bb[1] && s.lng >= bb[2] && s.lng <= bb[3]);
              parkingListEl.innerHTML = '';
              if (!matches.length) {
                const li = document.createElement('li');
                li.textContent = 'Ingen registrerede gratis parkeringspladser i dette område.';
                parkingListEl.appendChild(li);
              } else {
                matches.forEach(sp => {
                  const li = document.createElement('li');
                  li.innerHTML = `<div><strong>${escapeHtml(sp.name)}</strong><div class="meta">${escapeHtml(sp.address || '')}</div></div>`;
                  const b = document.createElement('button'); b.textContent = 'Se info';
                  b.addEventListener('click', e => { e.stopPropagation(); openInfoModal(sp); });
                  li.appendChild(b);
                  li.addEventListener('click', () => { map.setView([sp.lat, sp.lng], 14); if (sp.marker) sp.marker.openPopup(); });
                  parkingListEl.appendChild(li);
                });
              }
            }
          });
          searchResults.appendChild(row);
          shown++;
        });
      }

      // local matches
      if (localMatches && localMatches.length) {
        localMatches.forEach(s => {
          const row = document.createElement('div');
          row.className = 'result';
          row.innerHTML = `<div><strong>${escapeHtml(s.name)}</strong><br/><small>${escapeHtml(s.address || '')}</small></div>`;
          row.addEventListener('click', () => {
            searchResults.style.display = 'none';
            searchInput.value = '';
            map.setView([s.lat, s.lng], 14);
            if (s.marker) s.marker.openPopup();
            openInfoModal(s);
          });
          searchResults.appendChild(row);
          shown++;
        });
      }

      searchResults.style.display = shown > 0 ? 'block' : 'none';
    }, 220);
  });

  // hide search results if click outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });

  // ----------------------
  // Reporting (EmailJS)
  // ----------------------
  // site report (floating button)
  reportSiteBtn.addEventListener('click', () => {
    currentSpotReport = null;
    reportName.value = '';
    reportEmail.value = '';
    reportProblem.value = '';
    reportModal.classList.remove('hidden');
  });

  // report from info modal
  reportSpotBtn.addEventListener('click', () => {
    reportModal.classList.remove('hidden');
  });

  cancelReportBtn.addEventListener('click', () => reportModal.classList.add('hidden'));

  sendReportBtn.addEventListener('click', () => {
    const name = (reportName.value || '').trim();
    const email = (reportEmail.value || '').trim();
    const problem = (reportProblem.value || '').trim();
    if (!name || !email || !problem) { alert('Udfyld alle felter'); return; }

    const subject = currentSpotReport ? 'Fejl på parkeringsspot' : 'Fejl på hjemmesiden';
    const templateParams = {
      from_name: name,
      from_email: email,
      subject: subject,
      message: problem,
      spot_name: currentSpotReport ? currentSpotReport.name : ''
    };

    if (window.emailjs && emailjs.send) {
      emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, templateParams)
        .then(() => {
          alert('Rapport sendt! Tak.');
          reportModal.classList.add('hidden');
        })
        .catch(err => {
          console.error('EmailJS fejl', err);
          alert('Der opstod en fejl ved afsendelse. Prøv igen senere.');
        });
    } else {
      console.warn('EmailJS ikke tilgængelig');
      alert('Email-sending er ikke tilgængelig i denne browser.');
    }
  });

  // ----------------------
  // Start
  // ----------------------
  loadSpots();
  window.__FriPark = { parkingSpots, map };
});
