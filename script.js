/* Clean, Apple-like parking map
   - All markers shown on a calm map
   - Clicking shows name + address + "Vis info"
   - Bottom sheet contains factual parking notes
   - Coordinates are internal only; never displayed
*/

// ===== Sample data (REPLACE with verified, factual spots) =====
// Structure:
// {
//   id: "unique-id",
//   name: "Navn på parkeringssted",
//   address: "Adresse, Postnummer By",
//   lat: 55.XXXX, lng: 12.XXXX,   // Internal only
//   facts: ["Kort tekst om regler eller tider", ...],
//   notes: "Valgfri ekstra info, begrænsninger, særlige forhold.",
//   verified: true|false
// }
const parkingSpots = [
  {
    id: "krbh-østergade-24",
    name: "Østergade P-område",
    address: "Østergade 24, 1100 København K",
    lat: 55.679188, lng: 12.579588,
    facts: [
      "Fri parkering efter 18:00 på hverdage (zoneregler kan variere)",
      "3 timer gratis lørdag mellem 10:00–18:00 (bekræft lokale skilte)"
    ],
    notes: "Kontrollér altid lokale skilte for gældende tider og undtagelser.",
    verified: false
  },
  {
    id: "frederiksberg-solbjergplads",
    name: "Solbjerg Plads område",
    address: "Solbjerg Plads, 2000 Frederiksberg",
    lat: 55.68066, lng: 12.52367,
    facts: [
      "Begrænset gratis periode for beboere (kræver beboerlicens)",
      "Fri parkering søn- og helligdage i visse lommer"
    ],
    notes: "Områderegler opdateres jævnligt af kommunen.",
    verified: false
  },
  {
    id: "valby-spinderiet",
    name: "Valby Spinderiet",
    address: "Spinderiet, 2500 Valby",
    lat: 55.66179, lng: 12.50520,
    facts: [
      "3 timer gratis ved indkøb (butikscenter-betingelser)",
      "Overtrædelse kan medføre kontrolafgift"
    ],
    notes: "Læs centerets p-skilte for aktuelle betingelser.",
    verified: false
  }
];

// ===== Map init =====
const map = L.map("map", {
  zoomControl: true,
  attributionControl: true
});

// OpenStreetMap tile: neutral base; styled via UI for a clean feel
const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

// Fit map to DK; soft center Copenhagen for initial view
map.setView([55.6761, 12.5683], 12);

// ===== Custom marker (Apple-like dot) =====
const MarkerDot = L.DivIcon.extend({
  options: {
    className: "",
    html: '<div class="marker-dot" aria-hidden="true"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12]
  }
});
const markerDot = new MarkerDot();

// ===== UI elements =====
const inlineCard = document.getElementById("inlineCard");
const cardName = document.getElementById("cardName");
const cardAddress = document.getElementById("cardAddress");
const cardBadge = document.getElementById("cardBadge");
const infoButton = document.getElementById("infoButton");
const closeCardBtn = document.getElementById("closeCard");

const sheet = document.getElementById("sheet");
const sheetBackdrop = document.getElementById("sheetBackdrop");
const sheetTitle = document.getElementById("sheetTitle");
const sheetAddress = document.getElementById("sheetAddress");
const sheetBadge = document.getElementById("sheetBadge");
const sheetFacts = document.getElementById("sheetFacts");
const sheetNotes = document.getElementById("sheetNotes");
const closeSheetBtn = document.getElementById("closeSheet");

const aboutButton = document.getElementById("aboutButton");

// ===== State =====
let currentSpotId = null;
let markers = [];

// ===== Helpers =====
function openInlineCard(spot) {
  cardName.textContent = spot.name;
  cardAddress.textContent = spot.address;

  if (spot.verified) {
    cardBadge.hidden = false;
  } else {
    cardBadge.hidden = true;
  }
  inlineCard.hidden = false;
}

function closeInlineCard() {
  inlineCard.hidden = true;
  currentSpotId = null;
}

function openSheet(spot) {
  sheetTitle.textContent = spot.name;
  sheetAddress.textContent = spot.address;
  sheetBadge.hidden = !spot.verified;

  // Build facts list
  sheetFacts.innerHTML = "";
  if (Array.isArray(spot.facts)) {
    spot.facts.forEach(text => {
      const li = document.createElement("li");
      const icon = document.createElement("div");
      icon.className = "icon";
      const p = document.createElement("div");
      p.className = "text";
      p.textContent = text;
      li.appendChild(icon);
      li.appendChild(p);
      sheetFacts.appendChild(li);
    });
  }

  // Optional notes
  if (spot.notes && spot.notes.trim().length > 0) {
    sheetNotes.hidden = false;
    sheetNotes.textContent = spot.notes;
  } else {
    sheetNotes.hidden = true;
    sheetNotes.textContent = "";
  }

  sheet.hidden = false;
}

function closeSheet() {
  sheet.hidden = true;
}

// ===== Events =====
infoButton.addEventListener("click", () => {
  if (!currentSpotId) return;
  const spot = parkingSpots.find(s => s.id === currentSpotId);
  if (spot) openSheet(spot);
});

closeCardBtn.addEventListener("click", closeInlineCard);
sheetBackdrop.addEventListener("click", closeSheet);
closeSheetBtn.addEventListener("click", closeSheet);

aboutButton.addEventListener("click", () => {
  // Simple inline info (non-modal) for now
  const tmplFacts = [
    "Klik på markører for navn og adresse.",
    "Tryk 'Vis info' for regler som 3 timer gratis eller fri efter 18.",
    "Alle oplysninger bør verificeres mod lokale skilte og kommunale kilder."
  ];
  sheetTitle.textContent = "Om appen";
  sheetAddress.textContent = "Faktuel, dansk parkering";
  sheetBadge.hidden = true;
  sheetFacts.innerHTML = "";
  tmplFacts.forEach(t => {
    const li = document.createElement("li");
    const icon = document.createElement("div");
    icon.className = "icon";
    const p = document.createElement("div");
    p.className = "text";
    p.textContent = t;
    li.appendChild(icon);
    li.appendChild(p);
    sheetFacts.appendChild(li);
  });
  sheetNotes.hidden = false;
  sheetNotes.textContent = "Erstat sample-data i script.js med verificerede steder. Koordinater bruges kun internt og vises ikke.";
  sheet.hidden = false;
});

// Keyboard accessibility
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!sheet.hidden) closeSheet();
    if (!inlineCard.hidden) closeInlineCard();
  }
});

// ===== Render markers =====
function addMarkers() {
  // Clear old
  markers.forEach(m => m.remove());
  markers = [];

  parkingSpots.forEach(spot => {
    const marker = L.marker([spot.lat, spot.lng], { icon: markerDot, title: spot.name })
      .addTo(map);

    marker.on("click", () => {
      currentSpotId = spot.id;
      openInlineCard(spot);
    });

    markers.push(marker);
  });
}

addMarkers();

// Fit bounds to all markers (if multiple)
(function fitToMarkers() {
  if (markers.length === 0) return;
  const group = new L.FeatureGroup(markers);
  const bounds = group.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
})();

// Prevent double-tap zoom interfering with sheet
sheet.addEventListener("touchstart", (e) => {
  e.stopPropagation();
}, { passive: true });

// ===== Production notes =====
//
// 1) Replace 'parkingSpots' with a curated, factual list.
//    Do not show coordinates in UI; they are only for marker placement.
//
// 2) For verified spots, set verified: true to display the green "Verificeret" badge.
//
// 3) Keep facts short, clear, and local (e.g., "Fri parkering efter 18" or "3 timer gratis").
//    Avoid ambiguous wording; prefer what is on official signage.
//
// 4) If you later add filters or area-based search, keep UI calm and uncluttered.
//
