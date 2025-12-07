let parkingSpots = [
  {name: "P-plads Tangkrogen", info: "Gratis i weekender", lat: 56.1520, lng: 10.2030},
  {name: "Park & Ride", info: "Gratis 2 timer", lat: 55.6761, lng: 12.5683}
];

let userLat = 55.6761;
let userLng = 12.5683;

let map = L.map('map').setView([userLat, userLng], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Geolocation
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(position => {
    userLat = position.coords.latitude;
    userLng = position.coords.longitude;
    map.setView([userLat, userLng], 12);
    L.marker([userLat, userLng]).addTo(map).bindPopup("Du er her").openPopup();
    displayNearbySpots();
  });
}

// Beregn afstand mellem to koordinater (km)
function distance(lat1, lng1, lat2, lng2) {
  function toRad(x) { return x * Math.PI / 180; }
  let R = 6371; // km
  let dLat = toRad(lat2 - lat1);
  let dLng = toRad(lng2 - lng1);
  let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Vis kun spots nær bruger (5 km radius)
function displayNearbySpots() {
  const list = document.getElementById('parkingList');
  list.innerHTML = '';
  parkingSpots.forEach(spot => {
    let d = distance(userLat, userLng, spot.lat, spot.lng);
    if(d <= 5) { // indenfor 5 km
      const li = document.createElement('li');
      li.textContent = `${spot.name} – ${spot.info} (${d.toFixed(1)} km væk)`;
      list.appendChild(li);
      L.marker([spot.lat, spot.lng]).addTo(map)
        .bindPopup(`${spot.name}<br>${spot.info}`);
    }
  });
}

// Tilføj spot (adressen bliver gemt som info, koordinater midlertidigt i centrum)
document.getElementById('addSpotBtn').addEventListener('click', () => {
  const name = document.getElementById('spotName').value.trim();
  const address = document.getElementById('spotAddress').value.trim();
  if(name && address){
    // Midlertidig: placér spot omkring bruger
    const lat = userLat + (Math.random() - 0.5) * 0.01;
    const lng = userLng + (Math.random() - 0.5) * 0.01;
    parkingSpots.push({name, info: address, lat, lng});
    displayNearbySpots();
    document.getElementById('spotName').value = '';
    document.getElementById('spotAddress').value = '';
  } else {
    alert('Udfyld både navn og adresse');
  }
});
