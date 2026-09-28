// art/maps.ts — one art script per map. Each script reads the logical
// layout (roads, floors, walls, blocked cells) and paints it; nothing here
// changes where the player can walk.

import type { MapDef } from "../vendor/pocket-rpgkit/src/engine/types.ts";
import { crop, flipX, mapPixels, newImg, over, type Img } from "./img.ts";
import { cells, rect } from "./ninja.ts";
import { COBBLE, PATH_DARK, PATH_OLIVE, Painter, POND, TILE, type Layer } from "./painter.ts";
import { CABLE_CAR, lighthouse, MUSHROOMS, ORE_CART, RAIL_H } from "./custom.ts";

const ROAD = new Set(["town.39", "town.40", "town.41", "town.42"]);
const FLOOR = new Set(["town.43"]);

// --- trees -------------------------------------------------------------------

/** 32x32 tree crowns from TilesetNature, by mood. */
const TREES = {
  broadleaf: [[0, 0], [6, 0], [16, 0], [18, 0]] as [number, number][],
  pine: [[2, 0]] as [number, number][],
};

function tree(kind: keyof typeof TREES, pick: number): Img {
  const list = TREES[kind];
  const [c, r] = list[Math.floor(pick * list.length) % list.length]!;
  return cells("nature", c, r, 2, 2);
}

/** A dense forest edge on every blocked border cell except the gaps. Trees
 *  sit on a half-cell lattice pushed outward, so the crowns frame the map
 *  and barely overhang the walkable ring. */
export function forestBorder(p: Painter, pineShare = 0.35, skip: (x: number, y: number) => boolean = () => false): void {
  const { W, H } = p;
  const plant = (x: number, y: number, dx: number, dy: number, salt: number): void => {
    const kind = p.roll(x, y, salt) < pineShare ? "pine" : "broadleaf";
    const img = tree(kind, p.roll(x, y, salt + 1));
    p.put("upper", p.roll(x, y, salt + 2) < 0.5 ? img : flipX(img), x * TILE - 8 + dx, y * TILE - 16 + dy);
  };
  // Back row first (further out), then the row that meets the playfield.
  for (let x = -1; x <= W; x += 1) {
    if (p.blocked(x, 0) && !skip(x, 0)) plant(x, 0, (x % 2) * 2, 2 - (x % 2) * 3, 10);
  }
  for (let y = 0; y < H; y++) {
    if (p.blocked(0, y) && !skip(0, y)) plant(0, y, -8, (y % 2) * 3, 20);
    if (p.blocked(W - 1, y) && !skip(W - 1, y)) plant(W - 1, y, 8, (y % 2) * 3, 30);
  }
  for (let x = -1; x <= W; x += 1) {
    if (p.blocked(x, H - 1) && !skip(x, H - 1)) plant(x, H - 1, (x % 2) * 2, 6, 40);
  }
}

/** Small round bushes (TilesetNature row 10). */
export function bush(pick: number): Img {
  const opts: [number, number][] = [[0, 10], [1, 10], [2, 10], [6, 10], [10, 10]];
  const [c, r] = opts[Math.floor(pick * opts.length) % opts.length]!;
  return cells("nature", c, r);
}

/** Ground-level flowers and grass tufts, never on events, paths or
 *  anything blocked, so decoration can't read as an obstacle. */
export function scatterDecor(p: Painter, share: number, keep: (x: number, y: number) => boolean): void {
  const decor: [number, number][] = [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [2, 0], [3, 0]];
  const events = new Set((p.map.events ?? []).map((e) => `${e.x},${e.y}`));
  for (let y = 0; y < p.H; y++) {
    for (let x = 0; x < p.W; x++) {
      if (p.blocked(x, y) || events.has(`${x},${y}`) || !keep(x, y)) continue;
      if (p.roll(x, y, 70) >= share) continue;
      const [c, r] = decor[Math.floor(p.roll(x, y, 71) * decor.length)]!;
      p.at("ground", cells("floorDetail", c, r), x, y);
    }
  }
}

// --- structures --------------------------------------------------------------

/** Palisade pieces (TilesetHouse): corners, runs, and a post. */
const PALISADE = { tl: [8, 4], tr: [9, 4], bl: [8, 5], br: [9, 5], h: [11, 5], v: [11, 4] } as const;

function fenceCell(p: Painter, piece: readonly [number, number], x: number, y: number, layer: Layer = "ground"): void {
  p.at(layer, cells("house", piece[0], piece[1]), x, y);
}

/** Outline a rectangle of blocked wall cells with a fence set; `gaps` stay
 *  open (doors). */
export function fenceRect(p: Painter, x0: number, y0: number, x1: number, y1: number, gaps: ReadonlySet<string>, set = PALISADE): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      if (!edge || gaps.has(`${x},${y}`)) continue;
      const piece =
        x === x0 && y === y0 ? set.tl : x === x1 && y === y0 ? set.tr : x === x0 && y === y1 ? set.bl
        : x === x1 && y === y1 ? set.br : y === y0 || y === y1 ? set.h : set.v;
      fenceCell(p, piece, x, y);
    }
  }
}

/** 4-wide houses in TilesetHouse: roof rows 0..1, facade row 2, door in
 *  facade column 1. */
export const HOUSES = { orange: 0, red: 12 } as const;

/** A house stretched to `w` cells (plain middle columns repeat) with its
 *  door in column `door` (or none), facade on row `wallY`, and `roofRows`
 *  roof rows above it on the upper layer. */
export function house(p: Painter, x0: number, wallY: number, w: number, opts: { kind?: keyof typeof HOUSES; door?: number | null; roofRows?: number; stories?: number } = {}): void {
  const base = HOUSES[opts.kind ?? "orange"];
  const door = opts.door === undefined ? 1 : opts.door;
  const roofRows = opts.roofRows ?? 2;
  const roofCol = (i: number): number => (i === 0 ? 0 : i === w - 1 ? 3 : 1 + (i % 2));
  for (let i = 0; i < w; i++) {
    const rc = roofCol(i);
    const stories = opts.stories ?? 1;
    for (let r = 0; r < roofRows; r++) {
      const srcRow = r === 0 ? 0 : 1;
      p.at("upper", cells("house", base + rc, srcRow), x0 + i, wallY - (stories - 1) - roofRows + r);
    }
    for (let st = 0; st < stories; st++) {
      const ground = st === stories - 1;
      const fc = i === 0 ? 0 : i === w - 1 ? 3 : ground && i === door ? 1 : 2;
      p.at("ground", cells("house", base + fc, 2), x0 + i, wallY - (stories - 1 - st));
    }
  }
}

/** A 1-wide vertical run of a 3x3 island (field beds): each cell joins the
 *  left half of the island's left column and the right half of its right
 *  column. */
export function strip(p: Painter, sheetName: "field", island: [number, number], x: number, y0: number, y1: number, layer: Layer = "ground"): void {
  const [ix, iy] = island;
  for (let y = y0; y <= y1; y++) {
    const r = y === y0 ? 0 : y === y1 ? 2 : 1;
    p.put(layer, TILLED(rect(sheetName, ix * 16, (iy + r) * 16, 8, 16)), x * TILE, y * TILE);
    p.put(layer, TILLED(rect(sheetName, (ix + 2) * 16 + 8, (iy + r) * 16, 8, 16)), x * TILE + 8, y * TILE);
  }
}

// --- the hamlet ---------------------------------------------------------------

export function paintHub(p: Painter): void {
  p.grass("olive", 0.25);

  const plaza = (x: number, y: number): boolean => x >= 10 && x <= 13 && y >= 6 && y <= 8;
  const northTrail = (x: number, y: number): boolean => x === 12 && y >= 0 && y <= 5;
  const road = (x: number, y: number): boolean =>
    (ROAD.has(p.groundId(x, y) ?? "") || (y === 7 && (x === 0 || x === p.W - 1)) || northTrail(x, y)) && !plaza(x, y);
  p.autotile(PATH_OLIVE, (x, y) => road(x, y) || plaza(x, y), "ground", true);
  p.autotile(COBBLE, plaza);

  // The south edge under the station is a cliff: the cable car hangs over
  // the drop instead of trees. Border first, so buildings stand in front.
  const drop = (x: number, y: number): boolean => y === p.H - 1 && x >= 8 && x <= 15;
  forestBorder(p, 0.35, drop);

  // General store: yard walls, cobbled yard, the shop house behind it.
  p.autotile(COBBLE, (x, y) => x >= 3 && x <= 6 && y >= 3 && y <= 4);
  fenceRect(p, 2, 2, 7, 5, new Set(["4,5"]));
  house(p, 2, 2, 6);

  // Cable-car station: planked platform, palisade, entrance from the north.
  for (let x = 10; x <= 13; x++) p.at("ground", WEATHERED(cells("water", 5, 13)), x, 12);
  fenceRect(p, 9, 11, 14, 13, new Set(["12,11"]));

  // Chest yard.
  p.at("ground", cells("interiorFloor", 1, 13), 21, 3);
  fenceRect(p, 20, 2, 22, 4, new Set(["21,4"]));

  // Plaza well.
  p.at("ground", cells("element", 6, 2), 11, 6);

  // Pond over the blocked corner (the glint atlas animates on top), shrubs
  // on the banks, one old tree on the corner.
  p.autotile(POND, (x, y) => x >= 20 && x <= 22 && y >= 10 && y <= 12);
  for (const [x, y] of [[21, 13], [22, 13]] as const) p.at("ground", bush(p.roll(x, y, 50)), x, y);
  p.put("upper", tree("broadleaf", 0.1), 20 * TILE - 10, 13 * TILE - 14);

  for (let x = 8; x <= 15; x++) p.at("ground", cells("relief", x === 8 ? 4 : x === 15 ? 6 : 5, 2), x, p.H - 1);
  for (let y = 13 * TILE + 6; y < p.H * TILE; y++) {
    p.put("upper", CABLE, 12 * TILE - 1, y);
    p.put("upper", CABLE, 12 * TILE, y);
  }
  p.put("upper", CABLE_CAR, 11 * TILE, 13 * TILE + 2);

  // Logical decor cells: mushrooms, sprouts, and a flower bed where the
  // old map had a walkable tree.
  p.at("ground", MUSHROOMS, 3, 10);
  p.at("ground", cells("floorDetail", 0, 2), 17, 3);
  p.at("ground", cells("floorDetail", 4, 2), 6, 11);
  p.at("ground", cells("floorDetail", 5, 2), 18, 12);
  scatterDecor(p, 0.07, (x, y) => !road(x, y) && !plaza(x, y) && !(x >= 2 && x <= 7 && y >= 2 && y <= 5) && !(x >= 9 && x <= 14 && y >= 11 && y <= 13));
}

// --- the east-slope farm ---------------------------------------------------------

/** Leafy crops and flowers from TilesetNature for the logical crop ids. */
const CROP: Record<string, [number, number]> = {
  "farm.8": [2, 10], // carrots
  "farm.17": [8, 10], // turnips
  "farm.20": [3, 10], // cabbage
  "farm.31": [9, 10], // beans
  "farm.54": [6, 10], // lettuce
  "farm.83": [0, 11], // sunflower
};

export function paintFarm(p: Painter): void {
  p.grass("olive", 0.25);

  // (17,8) is a lone road cell against the barn's back wall; leave it grass.
  const road = (x: number, y: number): boolean =>
    (ROAD.has(p.groundId(x, y) ?? "") && !(x === 17 && y === 8)) || (x === 0 && y === 7);
  p.autotile(PATH_OLIVE, road, "ground", true);

  // Trough pond in the NE corner (the glint atlas animates on top).
  const trough = (x: number, y: number): boolean => x >= 19 && x <= 21 && y >= 1 && y <= 2;
  forestBorder(p, 0.3, (x, y) => trough(x, y) || (y === 0 && x >= 19));
  p.autotile(POND, trough, "ground", false);

  // Three tilled beds, planted end to end; the logical crop ids pick the
  // plant where the old map had one, the rest repeat the row's crop.
  const beds: [number, number, number][] = [[14, 1, 5], [17, 1, 5], [20, 3, 5]];
  for (const [x, y0, y1] of beds) {
    strip(p, "field", [0, 0], x, y0, y1);
    const own = [...Array(y1 - y0 + 1).keys()].map((i) => p.upperId(x, y0 + i)).find((id) => id && CROP[id]) ?? "farm.20";
    for (let y = y0; y <= y1; y++) {
      const id = p.upperId(x, y);
      const [c, r] = CROP[id && CROP[id] ? id : own]!;
      p.at("ground", cells("nature", c, r), x, y);
    }
  }
  for (let y = 0; y < p.H; y++) {
    for (let x = 0; x < p.W; x++) {
      const id = p.upperId(x, y);
      if (id === "farm.83" && !road(x, y)) p.at("ground", cells("nature", 0, 11), x, y);
    }
  }

  // Sheep pen (gate at 6,11).
  fenceRect(p, 2, 9, 6, 12, new Set(["6,11"]));

  // The barn: unreachable inside, so it is one roofed building.
  house(p, 15, 12, 6, { kind: "red", door: 2, roofRows: 2, stories: 2 });

  // Decor on walkable cells stays flat.
  p.at("ground", MUSHROOMS, 4, 8);
  scatterDecor(p, 0.06, (x, y) => !road(x, y) && !(x >= 2 && x <= 6 && y >= 9 && y <= 12) && ![14, 17, 20].includes(x));
}

/** The pack's clay beds turned to dark tilled earth. */
function TILLED(img: Img): Img {
  return mapPixels(img, (r, g, b, a) => (r + g + b < 120 ? [r, g, b, a] : [Math.round(r * 0.62), Math.round(g * 0.47), Math.round(b * 0.42), a]));
}

// --- the west-slope mine ---------------------------------------------------------

/** Boulders for rocky borders (TilesetNature), grey or brown. */
const BOULDER = {
  grey: { big: [16, 8] as [number, number], small: [18, 9] as [number, number] },
  brown: { big: [13, 8] as [number, number], small: [15, 9] as [number, number] },
};

/** A border that mixes pines with 32px boulders. */
export function rockyBorder(p: Painter, tone: keyof typeof BOULDER, rockShare: number, skip: (x: number, y: number) => boolean = () => false): void {
  const { W, H } = p;
  const plant = (x: number, y: number, dx: number, dy: number, salt: number): void => {
    const rock = p.roll(x, y, salt) < rockShare;
    const img = rock ? cells("nature", BOULDER[tone].big[0], BOULDER[tone].big[1], 2, 2) : tree("pine", 0);
    p.put("upper", p.roll(x, y, salt + 2) < 0.5 ? img : flipX(img), x * TILE - 8 + dx, y * TILE - 16 + dy + (rock ? 4 : 0));
  };
  for (let x = -1; x <= W; x++) if (p.blocked(x, 0) && !skip(x, 0)) plant(x, 0, (x % 2) * 2, 2 - (x % 2) * 3, 10);
  for (let y = 0; y < H; y++) {
    if (p.blocked(0, y) && !skip(0, y)) plant(0, y, -8, (y % 2) * 3, 20);
    if (p.blocked(W - 1, y) && !skip(W - 1, y)) plant(W - 1, y, 8, (y % 2) * 3, 30);
  }
  for (let x = -1; x <= W; x++) if (p.blocked(x, H - 1) && !skip(x, H - 1)) plant(x, H - 1, (x % 2) * 2, 6, 40);
}

export function paintMine(p: Painter): void {
  p.grass("dark", 0.3);

  // The ore track: dirt bed, timber over the ditch at (8..9,6), rails on top.
  const track = (x: number, y: number): boolean => y === 6 && x >= 4;
  p.autotile(PATH_DARK, track, "ground", true);
  for (const x of [8, 9]) p.at("ground", WEATHERED(cells("water", 5, 13)), x, 6);
  for (let x = 4; x < p.W; x++) p.at("ground", RAIL_H, x, 6);

  rockyBorder(p, "grey", 0.45, (x, y) => y <= 1 && x >= 1 && x <= 5);

  // The mine head: the hut's back wall is the rock face with the tunnel
  // mouth; the forecourt is packed earth; the east wall is the
  // apothecary's shuttered window.
  p.autotile(PATH_DARK, (x, y) => x >= 2 && x <= 4 && y >= 2 && y <= 3);
  p.at("upper", cells("reliefDetail", 0, 7, 3, 3), 2, -1);
  p.at("upper", cells("nature", 16, 8, 2, 2), 0, 1, -6, -8);
  p.at("upper", cells("nature", 16, 8, 2, 2), 0, 2, -8, 0);
  for (const [x, y] of [[1, 1], [1, 2], [1, 3], [5, 1], [5, 3]] as const) p.at("ground", cells("relief", 5, 1), x, y);
  p.at("ground", cells("house", 2, 3), 5, 2);

  // Gravel where the old map had rubble; the old prop cells stay open
  // ground with a few loose stones, so nothing walkable looks solid.
  for (const [x, y] of [[3, 9], [12, 7], [4, 10], [7, 8], [12, 9]] as const) p.at("ground", cells("floor", 14, 10), x, y);
  p.at("ground", cells("floorDetail", 0, 2), 14, 4);

  // An ore cart parked on the ledge beside the tunnel.
  p.put("upper", ORE_CART, 6 * TILE, -3);

  scatterDecor(p, 0.05, (x, y) => !track(x, y) && !(x >= 1 && x <= 5 && y >= 1 && y <= 3));
}

// --- the pine trail -----------------------------------------------------------------

/** Every blocked cell gets a crown, drawn top to bottom so nearer trees
 *  overlap farther ones; crowns stand a little low so they barely overhang
 *  the corridor above them. */
export function denseForest(p: Painter, pineShare: number, skip: (x: number, y: number) => boolean): void {
  const spots: [number, number][] = [];
  for (let y = -1; y <= p.H; y++) {
    for (let x = -1; x <= p.W; x++) {
      if (p.blocked(x, y) && !skip(x, y)) spots.push([x, y]);
    }
  }
  const events = (p.map.events ?? []).map((e) => [e.x, e.y] as const);
  const nearEvent = (x: number, y: number): boolean => events.some(([ex, ey]) => Math.abs(ex - x) <= 1 && ey - y >= -1 && ey - y <= 1);
  for (const [x, y] of spots) {
    if (nearEvent(x, y)) {
      p.at("ground", bush(p.roll(x, y, 85)), x, y);
      continue;
    }
    const kind = p.roll(x, y, 80) < pineShare ? "pine" : "broadleaf";
    const img = tree(kind, p.roll(x, y, 81));
    const jx = Math.round((p.roll(x, y, 82) - 0.5) * 6);
    const jy = Math.round(p.roll(x, y, 83) * 4);
    p.put("upper", p.roll(x, y, 84) < 0.5 ? img : flipX(img), x * TILE - 8 + jx, y * TILE - 12 + jy);
  }
}

export function paintPine(p: Painter): void {
  p.grass("dark", 0.4);

  // The trail: the center line of the 3-wide corridor, i.e. every open
  // cell whose four neighbours are open too, plus the south pad.
  const open = (x: number, y: number): boolean => p.inside(x, y) && !p.blocked(x, y);
  const trail = (x: number, y: number): boolean =>
    (open(x, y) && open(x - 1, y) && open(x + 1, y) && open(x, y - 1) && open(x, y + 1)) || (x === 9 && y >= 9);
  p.autotile(PATH_DARK, trail, "ground", true);

  // Bridgehead: the span itself runs north off the map.
  for (const [x, c] of [[9, 0], [10, 2]] as const) {
    p.at("ground", cells("water", c, 13), x, 0);
    p.at("ground", cells("water", c, 14), x, 1);
  }

  denseForest(p, 0.6, () => false);

  p.at("ground", MUSHROOMS, 7, 3);
  scatterDecor(p, 0.08, (x, y) => !trail(x, y) && !(x >= 9 && x <= 10 && y <= 1));
}

// --- the lighthouse top --------------------------------------------------------------

export function paintLight(p: Painter): void {
  p.grass("dark", 0.3);

  // The keeper's path from the south gate to the tower door, and a small
  // paved apron between the lamps.
  const apron = (x: number, y: number): boolean => x >= 6 && x <= 10 && y >= 6 && y <= 7;
  const path = (x: number, y: number): boolean => x === 8 && y >= 6;
  p.autotile(PATH_DARK, (x, y) => path(x, y) || apron(x, y), "ground", true);
  p.autotile(COBBLE, apron);

  rockyBorder(p, "grey", 0.55, (x, y) => y === 0 && x >= 6 && x <= 9);

  // The tower: cells (7..8, 1..5), cap reaching into the border row.
  // Ground layer: nothing stands behind it, the player in the doorway draws
  // in front, and the beacon atlas (object layer) lights the lamp room.
  p.put("ground", lighthouse(), 7 * TILE, 0);

  // The keeper's cottage is only ever seen from outside.
  house(p, 1, 12, 5, { door: 2 });

  // Rocks, scrub and gravel where the old map had them; all flat.
  for (const [x, y] of [[5, 6], [10, 9]] as const) p.at("ground", cells("floor", 14, 10), x, y);
  p.at("ground", MUSHROOMS, 2, 8);
  p.at("ground", cells("floorDetail", 0, 2), 5, 9);
  p.at("ground", cells("floorDetail", 3, 2), 13, 5);
  p.at("ground", cells("floorDetail", 5, 2), 12, 12);
  p.at("ground", cells("floorDetail", 1, 2), 11, 8);
  scatterDecor(p, 0.05, (x, y) => !path(x, y) && !apron(x, y) && !(x >= 1 && x <= 5 && y >= 10));
}

/** Pack planks darkened to weathered wood. */
function WEATHERED(img: Img): Img {
  return mapPixels(img, (r, g, b, a) => [Math.round(r * 0.66), Math.round(g * 0.56), Math.round(b * 0.52), a]);
}

/** One pixel of cable. */
const CABLE: Img = (() => {
  const img = newImg(1, 1);
  img.rgba.set([20, 27, 27, 255]);
  return img;
})();

export const PAINTERS: Record<string, (p: Painter) => void> = {
  hub: paintHub,
  farm: paintFarm,
  mine: paintMine,
  pine: paintPine,
  light: paintLight,
};

export { crop, newImg, over, rect };
export type { MapDef };
