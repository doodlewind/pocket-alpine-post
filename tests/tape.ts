// tests/tape.ts — test-only milestone oracle.
// The shipped frame stream lives beside the game and is re-exported here
// so existing journey tests and attract mode consume one frozen source.

export { ALPINE_TAPE_FRAMES, ALPINE_TAPE_RUNS } from "../game/demo-tape.ts";

export const ALPINE_MILESTONES = {
    "mailbag": {
      "frame": 32,
      "mapId": "hub",
      "x": 12,
      "y": 10,
      "switches": {
        "mailbag": true
      },
      "items": {
        "letter-farmer": 1,
        "letter-miner": 1,
        "letter-keeper": 1
      },
      "variables": {},
      "gold": 0,
      "rng": 305419896
    },
    "chest": {
      "frame": 160,
      "mapId": "hub",
      "x": 21,
      "y": 4,
      "switches": {
        "mailbag": true
      },
      "items": {
        "letter-farmer": 1,
        "letter-miner": 1,
        "letter-keeper": 1
      },
      "variables": {},
      "gold": 25,
      "rng": 305419896
    },
    "supplies": {
      "frame": 359,
      "mapId": "hub",
      "x": 4,
      "y": 4,
      "switches": {
        "mailbag": true
      },
      "items": {
        "letter-farmer": 1,
        "letter-miner": 1,
        "letter-keeper": 1,
        "matches": 1,
        "soup": 1
      },
      "variables": {},
      "gold": 5,
      "rng": 305419896
    },
    "farm": {
      "frame": 406,
      "mapId": "farm",
      "x": 10,
      "y": 9,
      "switches": {
        "mailbag": true,
        "sheep-herd": true,
        "farmer-done": true
      },
      "items": {
        "letter-farmer": 0,
        "letter-miner": 1,
        "letter-keeper": 1,
        "matches": 1,
        "soup": 1,
        "hay": 0
      },
      "variables": {
        "parcels": 2
      },
      "gold": 15,
      "rng": 305419896
    },
    "mine": {
      "frame": 200,
      "mapId": "mine",
      "x": 3,
      "y": 3,
      "switches": {
        "mailbag": true,
        "sheep-herd": true,
        "farmer-done": true,
        "miner-done": true
      },
      "items": {
        "letter-farmer": 0,
        "letter-miner": 0,
        "letter-keeper": 1,
        "matches": 1,
        "soup": 0,
        "hay": 0
      },
      "variables": {
        "parcels": 3
      },
      "gold": 15,
      "rng": 305419896
    },
    "bridge": {
      "frame": 304,
      "mapId": "pine",
      "x": 4,
      "y": 4,
      "switches": {
        "mailbag": true,
        "sheep-herd": true,
        "farmer-done": true,
        "miner-done": true,
        "fire-lit": true,
        "bridge-fixed": true
      },
      "items": {
        "letter-farmer": 0,
        "letter-miner": 0,
        "letter-keeper": 1,
        "matches": 0,
        "soup": 0,
        "hay": 0,
        "mushroom": 2
      },
      "variables": {
        "parcels": 4
      },
      "gold": 15,
      "rng": 305419896
    },
    "keeper": {
      "frame": 180,
      "mapId": "light",
      "x": 8,
      "y": 10,
      "switches": {
        "mailbag": true,
        "sheep-herd": true,
        "farmer-done": true,
        "miner-done": true,
        "fire-lit": true,
        "bridge-fixed": true,
        "keeper-done": true
      },
      "items": {
        "letter-farmer": 0,
        "letter-miner": 0,
        "letter-keeper": 0,
        "matches": 0,
        "soup": 0,
        "hay": 0,
        "mushroom": 2
      },
      "variables": {
        "parcels": 5
      },
      "gold": 15,
      "rng": 305419896
    },
    "lamps": {
      "frame": 316,
      "mapId": "light",
      "x": 8,
      "y": 12,
      "switches": {
        "mailbag": true,
        "sheep-herd": true,
        "farmer-done": true,
        "miner-done": true,
        "fire-lit": true,
        "bridge-fixed": true,
        "keeper-done": true,
        "lamp-1": true,
        "lamp-2": true,
        "lamp-3": true
      },
      "items": {
        "letter-farmer": 0,
        "letter-miner": 0,
        "letter-keeper": 0,
        "matches": 0,
        "soup": 0,
        "hay": 0,
        "mushroom": 2
      },
      "variables": {
        "parcels": 5
      },
      "gold": 15,
      "rng": 305419896
    },
    "end": {
      "frame": 652,
      "mapId": "light",
      "x": 8,
      "y": 5,
      "switches": {
        "mailbag": true,
        "sheep-herd": true,
        "farmer-done": true,
        "miner-done": true,
        "fire-lit": true,
        "bridge-fixed": true,
        "keeper-done": true,
        "lamp-1": true,
        "lamp-2": true,
        "lamp-3": true,
        "lamp-ready": true,
        "door-open": true
      },
      "items": {
        "letter-farmer": 0,
        "letter-miner": 0,
        "letter-keeper": 0,
        "matches": 0,
        "soup": 0,
        "hay": 0,
        "mushroom": 2
      },
      "variables": {
        "parcels": 5
      },
      "gold": 15,
      "rng": 305419896
    }
  } as const;
