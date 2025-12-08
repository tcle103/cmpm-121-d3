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
let buttonControls = false;

const mapDiv = document.createElement("div");
const statusPanelDiv = document.createElement("div");
const controlsDiv = document.createElement("div");
const upMoveButt = document.createElement("button");
const leftMoveButt = document.createElement("button");
const downMoveButt = document.createElement("button");
const rightMoveButt = document.createElement("button");
const swapMove = document.createElement("button");
const resetButt = document.createElement("button");

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const CACHE_SPAWN_PROBABILITY = 0.1;
const TILE_DEGREES = 1e-4;
const DEF_COL = "#3388ff";
const POSS_VALS: number[] = [1, 2, 4, 8, 16, 32, 64, 128, 256];
const VAL_ICON = new Map();
const VAL_ICON_ACTIVE = new Map();
const SPAWNABLE_VALUE_INDEX_COUNT: number = 8;
const cacheStr = "A cache! It holds a {0} token.";

const cacheSet = {
  spawnProbability: CACHE_SPAWN_PROBABILITY,
  size: TILE_DEGREES,
  activeColor: DEF_COL,
  inactiveColor: "lightgrey",
  possVals: POSS_VALS,
  cacheStr: cacheStr,
};

const c: cacheCaretaker = {
  cacheMap: new Map(),
  get: (c: cacheCaretaker, pt: Pt) => {
    const cache: activeCache | undefined = c.cacheMap.get(pt.toString(pt));
    if (cache) {
      console.log(JSON.stringify(cacheToStore(cache)));
      return cache;
    } else {
      return undefined;
    }
  },
  set: (c: cacheCaretaker, pt: Pt, cache: activeCache) => {
    c.cacheMap.set(pt.toString(pt), cache);
  },
};

// Interface definitions
// flyweight cache implementation: immutable state interface
interface Cache {
  spawnProbability: number;
  size: number;
  activeColor: string;
  inactiveColor: string;
  possVals: number[];
  cacheStr: string;
}

// flyweight cache implementation: mutable state interface
interface activeCache {
  location: Pt;
  interactible: boolean;
  cache: boolean;
  pointVal: number;
  rectangle: leaflet.Rectangle;
  marker: leaflet.Marker;
}

interface storeCache {
  location: number[];
  interactible: boolean;
  cache: boolean;
  pointVal: number;
}

interface Pt {
  lat: number;
  lng: number;
  toString: (pt: Pt) => string;
}

// Caretaker interface for memento pattern
interface cacheCaretaker {
  cacheMap: Map<string, activeCache>;
  get: (c: cacheCaretaker, pt: Pt) => activeCache | undefined;
  set: (c: cacheCaretaker, pt: Pt, cache: activeCache) => void;
}

const currCache: Pt = { lat: 0, lng: 0, toString: ptToString };
const cacheList: activeCache[] = [];

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
  movePlayer("UP", cacheSet);
});
downMoveButt.innerHTML = "v";
downMoveButt.addEventListener("click", () => {
  movePlayer("DOWN", cacheSet);
});
controlsDiv.append(downMoveButt);
leftMoveButt.innerHTML = "<";
leftMoveButt.addEventListener("click", () => {
  movePlayer("LEFT", cacheSet);
});
controlsDiv.append(leftMoveButt);
rightMoveButt.innerHTML = ">";
rightMoveButt.addEventListener("click", () => {
  movePlayer("RIGHT", cacheSet);
});
controlsDiv.append(rightMoveButt);
swapMove.innerHTML = "swap";
swapMove.addEventListener("click", () => {
  swapMovement();
});
controlsDiv.append(swapMove);
resetButt.innerHTML = "reset";
resetButt.addEventListener("click", () => {
  localStorage.clear();
  location.reload();
});
controlsDiv.append(resetButt);

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  minZoom: 15,
  maxZoom: 30,
})
  .addTo(map);

map.on("moveend", () => {
  redrawCaches(cacheSet);
});

// Add a marker to represent the player
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("You!");
playerMarker.addTo(map);

const grid = leaflet.featureGroup();
grid.addTo(map);

for (let i = 0; i < POSS_VALS.length; ++i) {
  VAL_ICON.set(
    POSS_VALS[i],
    leaflet.divIcon({
      html: `${POSS_VALS[i]}`,
      iconUrl: "../dummyicon.png",
    }),
  );
  VAL_ICON_ACTIVE.set(
    POSS_VALS[i],
    leaflet.divIcon({
      html: `${POSS_VALS[i]}`,
      iconUrl: "../dummyicon.png",
      className: "active",
    }),
  );
}

// Function definitions
// Helpers
function mapToString(map: Map<string, activeCache>): string {
  let str = "";
  map.keys().forEach((key) => {
    console.log(key);
    str += key;
    str += ">";
    const get = map.get(key);
    if (get) {
      const stored = cacheToStore(get);
      str += JSON.stringify(stored);
    }
    str += "|";
  });
  return str;
}

function stringToMap(str: string): Map<string, activeCache> {
  const map = new Map();
  const pairs: string[] = str.split("|");
  pairs.forEach((pair) => {
    if (pair) {
      const keyVal: string[] = pair.split(">");
      const val = JSON.parse(keyVal[1]);
      map.set(keyVal[0], storeToCache(val));
    }
  });
  return map;
}

function cacheToStore(cache: activeCache): storeCache {
  const loc: number[] = [cache.location.lat, cache.location.lng];
  return {
    location: loc,
    interactible: cache.interactible,
    cache: cache.cache,
    pointVal: cache.pointVal,
  };
}

function storeToCache(stored: storeCache): activeCache {
  const pt: Pt = {
    lat: stored.location[0],
    lng: stored.location[1],
    toString: ptToString,
  };
  const rect = leaflet.rectangle(
    leaflet.latLngBounds([[
      CLASSROOM_LATLNG.lat + (-0.5 + stored.location[0]) * cacheSet.size,
      CLASSROOM_LATLNG.lng + (-0.5 + stored.location[1]) * cacheSet.size,
    ], [
      CLASSROOM_LATLNG.lat + (0.5 + stored.location[0]) * cacheSet.size,
      CLASSROOM_LATLNG.lng + (0.5 + stored.location[1]) * cacheSet.size,
    ]]),
  );
  return {
    location: pt,
    interactible: stored.interactible,
    cache: stored.cache,
    rectangle: rect,
    pointVal: stored.pointVal,
    marker: leaflet.marker([pt.lat, pt.lng]),
  };
}

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

function inCache(cache: activeCache) {
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
    -Math.round(latDiff / TILE_DEGREES),
    -Math.round(lngDiff / TILE_DEGREES),
  ];
}

function getIBounds(center: leaflet.LatLng, bounds: leaflet.LatLngBounds) {
  // north and south bounds of map in i
  // starts at center of map currently
  let i1: number = centerToIJ(center)[0];
  let i2: number = centerToIJ(center)[0];
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

function ptToString(pt: Pt) {
  return `${pt.lat},${pt.lng}`;
}

// Player state update functions
// updates or updates stuff rep. player state
function setStatus() {
  const goalVal = POSS_VALS.findLast((element) => element);
  if (playerVal < 1) {
    statusPanelDiv.innerHTML = "Nothing in hand. Time to explore!";
  } else if (playerVal == goalVal) {
    statusPanelDiv.innerHTML = `You got a ${playerVal} token! You win!`;
  } else {
    statusPanelDiv.innerHTML =
      `Currently holding a ${playerVal} token. Time to find another!`;
  }
}

function setButtons(to: boolean) {
  upMoveButt.disabled = to;
  downMoveButt.disabled = to;
  leftMoveButt.disabled = to;
  rightMoveButt.disabled = to;
}

function geolocationSet() {
  navigator.geolocation.getCurrentPosition((pos) => {
    playerMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
    map.setView([pos.coords.latitude, pos.coords.longitude]);
  }, (_e) => {
    buttonControls = true;
  });
  navigator.geolocation.watchPosition((pos) => {
    playerMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
    const posToIJ = centerToIJ(
      leaflet.latLng([pos.coords.latitude, pos.coords.longitude]),
    );
    currCache.lat = posToIJ[0];
    currCache.lng = posToIJ[1];
    console.log(currCache);
    cacheList.forEach((cache) => {
      updateCaches(currCache, cache, cacheSet);
    });
  });
}

function swapMovement() {
  if (buttonControls) {
    if ("geolocation" in navigator) {
      buttonControls = false;
      geolocationSet();
      setButtons(true);
    } else {
      console.log("cannot swap to geolocation!");
    }
  } else {
    buttonControls = true;
    const currloc = playerMarker.getLatLng();
    const ij = centerToIJ(currloc);
    playerMarker.setLatLng(iJToCenter(ij[0], ij[1]));
    setButtons(false);
  }
}

function updateRectStyle(cache: activeCache, cacheSet: Cache) {
  if (!cache.cache) {
    cache.rectangle.setStyle({ opacity: 0.0, fillOpacity: 0.0 });
    cache.marker.remove();
    cache.rectangle.unbindTooltip();
    cache.rectangle.off("click");
    return;
  }
  const formatStr = format(cacheStr, cache.pointVal.toString());
  if (cache.interactible) {
    cache.rectangle.setStyle({
      color: cacheSet.activeColor,
      fillColor: cacheSet.activeColor,
    });
    cache.marker.setIcon(VAL_ICON_ACTIVE.get(cache.pointVal));
    cache.rectangle.bindTooltip(formatStr + " Click to interact!");
  } else {
    cache.rectangle.setStyle({
      color: cacheSet.inactiveColor,
      fillColor: cacheSet.inactiveColor,
    });
    cache.marker.setIcon(VAL_ICON.get(cache.pointVal));
    cache.rectangle.bindTooltip(formatStr + " Need to get closer...");
  }
}

function movePlayer(dir: string, cacheSet: Cache) {
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
    updateCaches(currCache, cache, cacheSet);
  });
}

// Cache drawing and update functions
function drawCache(i: number, j: number, cacheSet: Cache) {
  const rect = leaflet.rectangle(
    leaflet.latLngBounds([[
      CLASSROOM_LATLNG.lat + (-0.5 + i) * cacheSet.size,
      CLASSROOM_LATLNG.lng + (-0.5 + j) * cacheSet.size,
    ], [
      CLASSROOM_LATLNG.lat + (0.5 + i) * cacheSet.size,
      CLASSROOM_LATLNG.lng + (0.5 + j) * cacheSet.size,
    ]]),
  );
  let newCache: activeCache = {
    interactible: false,
    location: { lat: i, lng: j, toString: ptToString },
    rectangle: rect,
    cache: false,
    pointVal: 0,
    marker: leaflet.marker(iJToCenter(i, j)),
  };
  // see if caretaker has a saved state for particular position
  // if so restore state, else generate using (i,j) as seed to luck
  const memento: activeCache | undefined = c.get(c, newCache.location);
  if (memento) {
    newCache = memento;
  } else {
    if (luck([i, j].toString()) < cacheSet.spawnProbability) {
      newCache.cache = true;
      newCache.marker.addTo(grid);
      // Each cache has a random point value, mutable by the player
      const pointValue = Math.floor(
        luck([i, j, "initialValue"].toString()) * SPAWNABLE_VALUE_INDEX_COUNT,
      );
      newCache.pointVal = POSS_VALS[pointValue];
    }
  }
  cacheList.push(newCache);
  grid.addLayer(newCache.rectangle);
  updateRectStyle(newCache, cacheSet);
}

function setInteractible(cache: activeCache, cacheSet: Cache) {
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
    cache.rectangle.on("dblclick", () => {
      console.log("ugh");
    });
    updateRectStyle(cache, cacheSet);
    // modified/player interacted, so save state with caretaker
    c.set(c, cache.location, cache);
    localStorage.setItem("caches", mapToString(c.cacheMap));
    localStorage.setItem("playerVal", playerVal.toString());
    console.log(localStorage.getItem("caches"));
  });
}

function redrawCaches(cacheSet: Cache) {
  cacheList.length = 0;
  grid.clearLayers();
  const center = map.getCenter();
  const bounds = map.getBounds();
  const ibounds = getIBounds(center, bounds);
  const jbounds = getJBounds(center, bounds);

  for (let i = ibounds[0]; i < ibounds[1]; ++i) {
    for (let j = jbounds[0]; j < jbounds[1]; ++j) {
      drawCache(i, j, cacheSet);
    }
  }
  cacheList.forEach((cache) => {
    updateCaches(currCache, cache, cacheSet);
  });
}

function updateCaches(pt: Pt, cache: activeCache, cacheSet: Cache) {
  if (inCache(cache)) {
    cache.interactible = true;
    setInteractible(cache, cacheSet);
    updateRectStyle(cache, cacheSet);
    cache.rectangle.bringToFront();
  } else {
    if (getDist(cache.location, pt) <= 2) {
      cache.interactible = true;
      setInteractible(cache, cacheSet);
      updateRectStyle(cache, cacheSet);
      cache.rectangle.bringToFront();
    } else {
      cache.interactible = false;
      cache.rectangle.off("click");
      updateRectStyle(cache, cacheSet);
    }
  }
}

// Start game
if ("geolocation" in navigator) {
  /* geolocation is available */
  if (!buttonControls) {
    geolocationSet();
  }
} else {
  /* geolocation IS NOT available */
  buttonControls = true;
}

if (!buttonControls) {
  setButtons(true);
}

const savedActive = localStorage.getItem("caches");
const savedPlayerVal = localStorage.getItem("playerVal");
if (savedActive && savedPlayerVal) {
  // if saved game data stored in localStorage
  c.cacheMap = stringToMap(savedActive);
  playerVal = parseInt(savedPlayerVal);
}
setStatus();
redrawCaches(cacheSet);
