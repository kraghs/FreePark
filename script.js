// Simpel FreePark – kun kort, lokation og pins

let map, userMarker;

// Startkort i København
function initMap() {
  map = L.map("map").setView([55.6761, 12.5683], 13);

  // Lys baggrund
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // Eksempel-parkeringspladser
  const places = [
    { name: "Amager Strand P-plads", lat: 55.6549, lng: 12.6338 },
    { name: "Roskilde Havn P-plads", lat: 55.6437, lng: 12.0837 }
  ];

  places.forEach(p => {
    L.marker([p.lat, p.lng]).addTo(map).bindPopup(p.name);
  });

  // Find brugerens lokation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      if (userMarker) {
        userMarker.setLatLng(ll);
      } else {
        userMarker = L.marker(ll, {
          icon: L.divIcon({ className: "user-dot", iconSize: [18,18], iconAnchor: [9,9] })
        }).addTo(map);
      }
      map.setView(ll, 14);
    });
  }
}

document.addEventListener("DOMContentLoaded", initMap);
