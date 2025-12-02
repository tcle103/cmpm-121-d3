// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

//const NEIGHBORHOOD_SIZE = 8;
//const CACHE_SPAWN_PROBABILITY = 0.1;
const TILE_DEGREES = 1e-4;

const map = leaflet.map("map", {
  center: CLASSROOM_LATLNG,
  zoom: 20,
  minZoom: 10,
  maxZoom: 30,
});

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  minZoom: 15,
  maxZoom: 30,
})
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("You!");
playerMarker.addTo(map);

const grid = leaflet.featureGroup();
grid.addTo(map);

function drawCache(i: number, j: number) {
  const rect = leaflet.rectangle(
    leaflet.latLngBounds([[
      CLASSROOM_LATLNG.lat + (-0.5 + (0.5 * i)) * TILE_DEGREES,
      CLASSROOM_LATLNG.lng + (-0.5 + (0.5 * j)) * TILE_DEGREES,
    ], [
      CLASSROOM_LATLNG.lat + (0.5 + (0.5 * i)) * TILE_DEGREES,
      CLASSROOM_LATLNG.lng + (0.5 + (0.5 * j)) * TILE_DEGREES,
    ]]),
  );
  grid.addLayer(rect);
  rect.bindTooltip("im generated");
}

drawCache(0, 0);
