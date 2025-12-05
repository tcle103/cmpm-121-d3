# D3: World of Bits

## Game Design Vision

Location-based game (like Pokemon Go) where players can navigate the real world to pick up and deposit tokens to craft a specific high-valued token through combining lower-value ones (like 4096 and Threes).

## Technologies

- TypeScript for most game code, little to no explicit HTML, and all CSS collected in common `style.css` file
- Deno and Vite for building
- GitHub Actions + GitHub Pages for deployment automation

## Assignments

### D3.a: Core mechanics (token collection and crafting)

- [x] copy main.ts to reference.ts for future reference
- [x] delete everything in main.ts
- [x] put a basic leaflet map on the screen
- [x] draw the player's location on the map
- [x] draw a rectangle representing one cell on the map
- [x] use loops to draw a whole grid of cells on the map
- [x] make interfaces to represent caches
- [x] draw caches as grey or blue based on interactibility
- [x] detect if player is within cell
- [x] detect if cells are within 3 of active cell
- [x] make some cells caches and some cells not with luck
- [x] make tooltip display cache number
- [x] make text display player status on page
- [x] bind function that picks up token, make player status update
- [x] implement check and interaction for when player is already holding a token
- [x] implement win con/token number check.

### D3.b: Globe-spanning Gameplay

- [x] add buttons to interface for moving character
- [x] implement player movement by grid space
- [x] make sure that whenever player moves grid interactibility is updated
- [x] draw grid to fill to screen view instead of neighborhood size
- [x] detect when new grids need to be drawn (i.e. edge of curr grids are visible)
- [x] redraw grid to fill screen when happens
- [x] make caches stateless and "despawn" when off screen

### D3.c: Core Mechanics

- [x] refactor updateCaches to better suit changes to cache storage required
- [x] split cache interface into two, one immutable shared and one mutable
- [x] update all cache functions to take the immutable shared class
- [x] create a map for caches that have been modified for memento pattern
- [x] create caretaker interface for memento pattern
- [x] modify drawCache to interact with stored caches to draw using data from memento

### D3.d: Gameplay Across Real-world Space and Time

- [x] test access to the geolocation api
- [ ] see how watchPosition behaves
