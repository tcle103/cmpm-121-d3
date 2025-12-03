// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

let playerVal = 0;

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

const controlsDiv = document.createElement("div");
controlsDiv.id = "controls";
document.body.append(controlsDiv);

const upMoveButt = document.createElement("button");
upMoveButt.innerHTML = "^";
controlsDiv.append(upMoveButt);
const leftMoveButt = document.createElement("button");
leftMoveButt.innerHTML = "<";
leftMoveButt.addEventListener("click", () => {
  movePlayer("LEFT");
});
controlsDiv.append(leftMoveButt);
const downMoveButt = document.createElement("button");
downMoveButt.innerHTML = "v";
downMoveButt.addEventListener("click", () => {
  movePlayer("DOWN");
});
controlsDiv.append(downMoveButt);
const rightMoveButt = document.createElement("button");
rightMoveButt.innerHTML = ">";
upMoveButt.addEventListener("click", () => {
  movePlayer("UP");
});
rightMoveButt.addEventListener("click", () => {
  movePlayer("RIGHT");
});
controlsDiv.append(rightMoveButt);

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const NEIGHBORHOOD_SIZE = 11;
const CACHE_SPAWN_PROBABILITY = 0.1;
const TILE_DEGREES = 1e-4;

const DEF_COL = "#3388ff";

const POSS_VALS: number[] = [1, 2, 4, 8, 16, 32, 64, 128, 256];

const cacheStr = "A cache! It holds a {0} token.";

interface Cache {
  interactible: boolean;
  location: Pt;
  rectangle: leaflet.Rectangle;
  cache: boolean;
  pointVal: number;
}

interface Pt {
  x: number;
  y: number;
}

const currCache: Pt = { x: 0, y: 0 };

const cacheList: Cache[] = [];

const map = leaflet.map("map", {
  center: CLASSROOM_LATLNG,
  zoom: 20,
  minZoom: 10,
  maxZoom: 22,
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

function getDist(pt1: Pt, pt2: Pt) {
  const x1 = pt1.x;
  const x2 = pt2.x;
  const y1 = pt1.y;
  const y2 = pt2.y;
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// from geeksforgeeks https://www.geeksforgeeks.org/javascript/javascript-string-formatting/
function format(str: string, ...values: string[]) {
  return str.replace(/{(\d+)}/g, function (match, index) {
    return typeof values[index] !== "undefined" ? values[index] : match;
  });
}

function drawRect(cache: Cache) {
  if (!cache.cache) {
    cache.rectangle.setStyle({ opacity: 0.0, fillOpacity: 0.0 });
    cache.rectangle.unbindTooltip();
    return;
  }
  const formatStr = format(cacheStr, cache.pointVal.toString());
  if (cache.interactible) {
    cache.rectangle.setStyle({ color: DEF_COL, fillColor: DEF_COL });
    cache.rectangle.bindTooltip(formatStr + " Click to interact!");
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
        statusPanelDiv.innerHTML =
          "Already holding a token! Nothing happened...";
        setTimeout(() => {
          setStatus();
        }, 1500);
      }
      drawRect(cache);
    });
  } else {
    cache.rectangle.setStyle({ color: "grey", fillColor: "lightgrey" });
    cache.rectangle.bindTooltip(formatStr + " Need to get closer...");
  }
}

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
    location: { x: i, y: j },
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

function updateCaches(pt: Pt) {
  cacheList.forEach((cache) => {
    if (inCache(cache)) {
      cache.interactible = true;
      drawRect(cache);
      cache.rectangle.bringToFront();
    } else {
      if (getDist(cache.location, pt) <= 2) {
        cache.interactible = true;
        drawRect(cache);
        cache.rectangle.bringToFront();
      } else {
        cache.interactible = false;
        drawRect(cache);
      }
    }
  });
}

function movePlayer(dir: string) {
  const newLoc = playerMarker.getLatLng();
  switch (dir) {
    case "UP":
      newLoc.lat += TILE_DEGREES;
      currCache.x += 1;
      break;
    case "LEFT":
      newLoc.lng -= TILE_DEGREES;
      currCache.y -= 1;
      break;
    case "DOWN":
      newLoc.lat -= TILE_DEGREES;
      currCache.x -= 1;
      break;
    case "RIGHT":
      newLoc.lng += TILE_DEGREES;
      currCache.y += 1;
      break;
  }
  playerMarker.setLatLng(newLoc);
  updateCaches(currCache);
}

setStatus();
updateCaches(currCache);
