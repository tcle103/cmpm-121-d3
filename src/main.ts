// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

// Variable definitions
let playerVal = 0;

const mapDiv = document.createElement("div");
const statusPanelDiv = document.createElement("div");
const controlsDiv = document.createElement("div");
const upMoveButt = document.createElement("button");
const leftMoveButt = document.createElement("button");
const downMoveButt = document.createElement("button");
const rightMoveButt = document.createElement("button");

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const CACHE_SPAWN_PROBABILITY = 0.1;
const TILE_DEGREES = 1e-4;
const DEF_COL = "#3388ff";
const POSS_VALS: number[] = [1, 2, 4, 8, 16, 32, 64, 128, 256];
const cacheStr = "A cache! It holds a {0} token.";

// Interface definitions
interface Cache {
  interactible: boolean;
  location: Pt;
  rectangle: leaflet.Rectangle;
  cache: boolean;
  pointVal: number;
}

interface Pt {
  lat: number;
  lng: number;
}

const currCache: Pt = { lat: 0, lng: 0 };
const cacheList: Cache[] = [];

// HTML set-up
mapDiv.id = "map";
document.body.append(mapDiv);
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);
controlsDiv.id = "controls";
document.body.append(controlsDiv);

const map = leaflet.map("map", {
  center: CLASSROOM_LATLNG,
  zoom: 20,
  minZoom: 10,
  maxZoom: 22,
});

upMoveButt.innerHTML = "^";
controlsDiv.append(upMoveButt);
upMoveButt.addEventListener("click", () => {
  movePlayer("UP");
});
downMoveButt.innerHTML = "v";
downMoveButt.addEventListener("click", () => {
  movePlayer("DOWN");
});
controlsDiv.append(downMoveButt);
leftMoveButt.innerHTML = "<";
leftMoveButt.addEventListener("click", () => {
  movePlayer("LEFT");
});
controlsDiv.append(leftMoveButt);
rightMoveButt.innerHTML = ">";
rightMoveButt.addEventListener("click", () => {
  movePlayer("RIGHT");
});
controlsDiv.append(rightMoveButt);

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  minZoom: 15,
  maxZoom: 30,
})
  .addTo(map);

map.on("moveend", () => {
  redrawCaches();
});

// Add a marker to represent the player
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("You!");
playerMarker.addTo(map);

const grid = leaflet.featureGroup();
grid.addTo(map);

// Function definitions
// Helpers
function getDist(pt1: Pt, pt2: Pt) {
  const x1 = pt1.lat;
  const x2 = pt2.lat;
  const y1 = pt1.lng;
  const y2 = pt2.lng;
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// from geeksforgeeks https://www.geeksforgeeks.org/javascript/javascript-string-formatting/
function format(str: string, ...values: string[]) {
  return str.replace(/{(\d+)}/g, function (match, index) {
    return typeof values[index] !== "undefined" ? values[index] : match;
  });
}

function inCache(cache: Cache) {
  return cache.rectangle.getBounds().contains(playerMarker.getLatLng());
}

function iJToCenter(i: number, j: number) {
  return leaflet.latLng([
    CLASSROOM_LATLNG.lat + i * TILE_DEGREES,
    CLASSROOM_LATLNG.lng + j * TILE_DEGREES,
  ]);
}

function centerToIJ(center: leaflet.LatLng) {
  const latDiff: number = CLASSROOM_LATLNG.lat - center.lat;
  const lngDiff: number = CLASSROOM_LATLNG.lng - center.lng;
  return [
    Math.round(latDiff / TILE_DEGREES),
    Math.round(lngDiff / TILE_DEGREES),
  ];
}

function getIBounds(center: leaflet.LatLng, bounds: leaflet.LatLngBounds) {
  // north and south bounds of map in i
  // starts at center of map currently
  let i1: number = centerToIJ(center)[0];
  let i2: number = centerToIJ(center)[0];
  console.log(center);
  while (iJToCenter(i1, 0).lat < bounds.getNorth()) {
    i1 += 1;
  }
  while (iJToCenter(i2, 0).lat > bounds.getSouth()) {
    i2 -= 1;
  }
  return [i2, i1];
}

function getJBounds(center: leaflet.LatLng, bounds: leaflet.LatLngBounds) {
  // east and west bounds of map in j
  // starts at center of map currently
  let j1: number = centerToIJ(center)[1];
  let j2: number = centerToIJ(center)[1];
  // move east and west bounds of map in i until
  // they are within the bounds of the map currently
  while (iJToCenter(0, j1).lng < bounds.getEast()) {
    j1 += 1;
  }
  while (iJToCenter(0, j2).lng > bounds.getWest()) {
    j2 -= 1;
  }
  return [j2, j1];
}

// Player state update functions
// updates or updates stuff rep. player state
function setStatus() {
  if (playerVal < 1) {
    statusPanelDiv.innerHTML = "Nothing in hand. Time to explore!";
  } else if (playerVal == POSS_VALS[-1]) {
    statusPanelDiv.innerHTML = `You got a ${playerVal} token! You win!`;
  } else {
    statusPanelDiv.innerHTML =
      `Currently holding a ${playerVal} token. Time to find another!`;
  }
}

function updateRectStyle(cache: Cache) {
  if (!cache.cache) {
    cache.rectangle.setStyle({ opacity: 0.0, fillOpacity: 0.0 });
    cache.rectangle.unbindTooltip();
    cache.rectangle.off("click");
    return;
  }
  const formatStr = format(cacheStr, cache.pointVal.toString());
  if (cache.interactible) {
    cache.rectangle.setStyle({ color: DEF_COL, fillColor: DEF_COL });
    cache.rectangle.bindTooltip(formatStr + " Click to interact!");
  } else {
    cache.rectangle.setStyle({ color: "grey", fillColor: "lightgrey" });
    cache.rectangle.bindTooltip(formatStr + " Need to get closer...");
  }
}

function movePlayer(dir: string) {
  switch (dir) {
    case "UP":
      currCache.lat += 1;
      break;
    case "LEFT":
      currCache.lng -= 1;
      break;
    case "DOWN":
      currCache.lat -= 1;
      break;
    case "RIGHT":
      currCache.lng += 1;
      break;
  }
  playerMarker.setLatLng(iJToCenter(currCache.lat, currCache.lng));
  cacheList.forEach((cache) => {
    updateCaches(currCache, cache);
  });
}

// Cache drawing and update functions
function drawCache(i: number, j: number) {
  const rect = leaflet.rectangle(
    leaflet.latLngBounds([[
      CLASSROOM_LATLNG.lat + (-0.5 + i) * TILE_DEGREES,
      CLASSROOM_LATLNG.lng + (-0.5 + j) * TILE_DEGREES,
    ], [
      CLASSROOM_LATLNG.lat + (0.5 + i) * TILE_DEGREES,
      CLASSROOM_LATLNG.lng + (0.5 + j) * TILE_DEGREES,
    ]]),
  );
  const newCache: Cache = {
    interactible: false,
    location: { lat: i, lng: j },
    rectangle: rect,
    cache: false,
    pointVal: 0,
  };
  if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
    newCache.cache = true;
    // Each cache has a random point value, mutable by the player
    const pointValue = Math.floor(
      luck([i, j, "initialValue"].toString()) * 5,
    );
    newCache.pointVal = POSS_VALS[pointValue];
  }
  cacheList.push(newCache);
  grid.addLayer(rect);
  updateRectStyle(newCache);
}

function setInteractible(cache: Cache) {
  cache.rectangle.on("click", () => {
    if (playerVal < 1) {
      playerVal = cache.pointVal;
      cache.cache = false;
      setStatus();
    } else if (cache.pointVal == playerVal) {
      statusPanelDiv.innerHTML =
        `Deposited ${cache.pointVal} into cache, making a ${
          cache.pointVal * 2
        } token!`;
      setTimeout(() => {
        setStatus();
      }, 1500);
      cache.pointVal += playerVal;
      playerVal = 0;
    } else {
      statusPanelDiv.innerHTML = "Already holding a token! Nothing happened...";
      setTimeout(() => {
        setStatus();
      }, 1500);
    }
    updateRectStyle(cache);
  });
}

function redrawCaches() {
  cacheList.length = 0;
  grid.clearLayers();
  const center = map.getCenter();
  const bounds = map.getBounds();
  const ibounds = getIBounds(center, bounds);
  const jbounds = getJBounds(center, bounds);

  console.log(ibounds, jbounds);
  for (let i = ibounds[0]; i < ibounds[1]; ++i) {
    for (let j = jbounds[0]; j < jbounds[1]; ++j) {
      drawCache(i, j);
    }
  }
  cacheList.forEach((cache) => {
    updateCaches(currCache, cache);
  });
}

function updateCaches(pt: Pt, cache: Cache) {
  if (inCache(cache)) {
    cache.interactible = true;
    setInteractible(cache);
    updateRectStyle(cache);
    cache.rectangle.bringToFront();
  } else {
    if (getDist(cache.location, pt) <= 2) {
      cache.interactible = true;
      setInteractible(cache);
      updateRectStyle(cache);
      cache.rectangle.bringToFront();
    } else {
      cache.interactible = false;
      cache.rectangle.off("click");
      updateRectStyle(cache);
    }
  }
}

// Start game
setStatus();
redrawCaches();
