// art/painter.ts — paints one map into its two 512px canvases.
//
// The game's maps are authored in logical tile ids (game/game-data.ts); the
// ids decide passability and nothing else here. A map's art script
// (art/maps.ts) reads the logical layout — which cells block, where the
// roads, floors, walls and events are — and paints Ninja Adventure art on
// top of it: terrain autotiles on the ground canvas, and anything drawn
// over characters (tree crowns, roofs, overhangs) on the upper canvas.
// Multi-cell sprites are placed by pixel, so a 32x32 tree or a 5x3 house
// is one stamp rather than a grid of unrelated cells.

import type { MapDef } from "../vendor/pocket-rpgkit/src/engine/types.ts";
import { hash, newImg, over, type Img } from "./img.ts";
import { cells, type SheetName } from "./ninja.ts";

export const TILE = 16;
export const CANVAS = 512;

export type Layer = "ground" | "upper";

export interface Autotile {
  sheet: SheetName;
  /** Top-left cell of the 3x3 island (corners, edges, center). */
  island: [number, number];
  /** Top cell of the 1-wide vertical run (top end, middle, bottom end). */
  vertical: [number, number];
  /** Left cell of the 1-wide horizontal run (left end, middle, right end). */
  horizontal: [number, number];
  /** An isolated single cell. */
  single: [number, number];
}

/** Dirt paths on the olive grass of TilesetFloor. */
export const PATH_OLIVE: Autotile = { sheet: "floor", island: [0, 7], vertical: [3, 7], horizontal: [0, 10], single: [3, 10] };
/** Dirt paths on the dark (forest) grass of TilesetFloor. */
export const PATH_DARK: Autotile = { sheet: "floor", island: [11, 7], vertical: [14, 7], horizontal: [11, 10], single: [14, 10] };
/** Warm framed cobblestone (TilesetInteriorFloor). */
export const COBBLE: Autotile = { sheet: "interiorFloor", island: [0, 12], vertical: [3, 12], horizontal: [0, 15], single: [3, 15] };
/** Water in grass (TilesetWater). */
export const POND: Autotile = { sheet: "water", island: [0, 6], vertical: [3, 6], horizontal: [0, 9], single: [1, 7] };

export type GrassStyle = "olive" | "dark";

const GRASS: Record<GrassStyle, { plain: [number, number]; variants: [number, number][] }> = {
  olive: { plain: [0, 12], variants: [[1, 12], [2, 12], [3, 12], [4, 12], [2, 11], [3, 11]] },
  dark: { plain: [11, 12], variants: [[12, 12], [13, 12], [14, 12], [15, 12]] },
};

export class Painter {
  readonly ground = newImg(CANVAS, CANVAS);
  readonly upper = newImg(CANVAS, CANVAS);
  readonly W: number;
  readonly H: number;
  private readonly upperIds: Map<number, string>;
  private readonly blockedSet: ReadonlySet<number>;

  constructor(
    readonly map: MapDef,
    blocked: ReadonlySet<number>,
    readonly seed: number,
  ) {
    this.W = map.width;
    this.H = map.height;
    this.upperIds = new Map((map.upper ?? []).map(([i, t]) => [i, t as string]));
    this.blockedSet = blocked;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.W && y < this.H;
  }

  groundId(x: number, y: number): string | null {
    return this.inside(x, y) ? ((this.map.ground[y * this.W + x] as string | null) ?? null) : null;
  }

  upperId(x: number, y: number): string | null {
    return this.inside(x, y) ? this.upperIds.get(y * this.W + x) ?? null : null;
  }

  blocked(x: number, y: number): boolean {
    return !this.inside(x, y) || this.blockedSet.has(y * this.W + x);
  }

  /** Deterministic per-cell roll in [0,1). */
  roll(x: number, y: number, salt = 0): number {
    return hash(this.seed, x, y, salt) / 4294967296;
  }

  put(layer: Layer, img: Img, px: number, py: number): void {
    over(layer === "ground" ? this.ground : this.upper, img, px, py);
  }

  /** Put a 16px-aligned stamp whose top-left cell lands on map cell (x,y). */
  at(layer: Layer, img: Img, x: number, y: number, dx = 0, dy = 0): void {
    this.put(layer, img, x * TILE + dx, y * TILE + dy);
  }

  /** Cover the whole canvas with grass (the world frame clips to the map). */
  grass(style: GrassStyle, variantShare = 0.35): void {
    const g = GRASS[style];
    const plain = cells("floor", g.plain[0], g.plain[1]);
    const variants = g.variants.map(([c, r]) => cells("floor", c, r));
    for (let y = 0; y < CANVAS / TILE; y++) {
      for (let x = 0; x < CANVAS / TILE; x++) {
        const r = this.roll(x, y, 1);
        const img = r < variantShare ? variants[Math.floor(this.roll(x, y, 2) * variants.length)]! : plain;
        this.at("ground", img, x, y);
      }
    }
  }

  /** Autotile every cell where `on(x,y)`; `edgeOn` decides how out-of-map
   *  neighbours count (a road that runs off the edge keeps going). */
  autotile(tile: Autotile, on: (x: number, y: number) => boolean, layer: Layer = "ground", edgeOn = false): void {
    const is = (x: number, y: number): boolean => (this.inside(x, y) ? on(x, y) : edgeOn);
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        if (!on(x, y)) continue;
        const n = is(x, y - 1), e = is(x + 1, y), s = is(x, y + 1), w = is(x - 1, y);
        const [c, r] = autotileCell(tile, n, e, s, w);
        this.at(layer, cells(tile.sheet, c, r), x, y);
      }
    }
  }
}

function autotileCell(t: Autotile, n: boolean, e: boolean, s: boolean, w: boolean): [number, number] {
  const [ix, iy] = t.island;
  const [vx, vy] = t.vertical;
  const [hx, hy] = t.horizontal;
  const horiz = e || w;
  const vert = n || s;
  if (!horiz && !vert) return t.single;
  if (!vert) return e && w ? [hx + 1, hy] : e ? [hx, hy] : [hx + 2, hy];
  if (!horiz) return n && s ? [vx, vy + 1] : s ? [vx, vy] : [vx, vy + 2];
  const col = e && w ? 1 : e ? 0 : 2;
  const row = n && s ? 1 : s ? 0 : 2;
  return [ix + col, iy + row];
}
