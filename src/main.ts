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

const NEIGHBORHOOD_SIZE = 11;
//const CACHE_SPAWN_PROBABILITY = 0.1;
const TILE_DEGREES = 1e-4;

const DEF_COL = "#3388ff";

interface Cache {
  interactible: boolean;
  location: Pt;
  rectangle: leaflet.Rectangle;
  cache: boolean;
}

interface Pt {
  x: number;
  y: number;
}

const cacheList: Cache[] = [];

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

function drawRect(cache: Cache) {
  if (cache.interactible) {
    cache.rectangle.setStyle({ color: DEF_COL, fillColor: DEF_COL });
  } else {
    cache.rectangle.setStyle({ color: "grey", fillColor: "lightgrey" });
  }
}

function drawCache(i: number, j: number) {
  const rect = leaflet.rectangle(
    leaflet.latLngBounds([[
      CLASSROOM_LATLNG.lat + (-0.5 + (1 * i)) * TILE_DEGREES,
      CLASSROOM_LATLNG.lng + (-0.5 + (1 * j)) * TILE_DEGREES,
    ], [
      CLASSROOM_LATLNG.lat + (0.5 + (1 * i)) * TILE_DEGREES,
      CLASSROOM_LATLNG.lng + (0.5 + (1 * j)) * TILE_DEGREES,
    ]]),
  );
  const newCache: Cache = {
    interactible: false,
    location: { x: i, y: j },
    rectangle: rect,
    cache: true,
  };
  cacheList.push(newCache);
  grid.addLayer(rect);
  rect.bindTooltip("im generated");
  drawRect(newCache);
}

function inCache(cache: Cache) {
  return cache.rectangle.getBounds().contains(playerMarker.getLatLng());
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; ++i) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; ++j) {
    drawCache(i, j);
  }
}

cacheList.forEach((cache) => {
  if (inCache(cache)) {
    cache.interactible = true;
    drawRect(cache);
    cache.rectangle.bringToFront();
  }
});
