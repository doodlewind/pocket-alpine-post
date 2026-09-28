// art/ninja.ts — the Ninja Adventure sheets this game draws from, and the
// cell/rect accessors the painters use. Sources live under assets/src/ninja
// with the pack's own relative paths (CC0; see ATTRIBUTION.md).

import { join } from "node:path";
import { crop, loadImg, type Img } from "./img.ts";

export const NINJA_ROOT = join(import.meta.dir, "..", "assets", "src", "ninja");

export const SHEET = {
  floor: "Backgrounds/Tilesets/TilesetFloor.png",
  nature: "Backgrounds/Tilesets/TilesetNature.png",
  house: "Backgrounds/Tilesets/TilesetHouse.png",
  field: "Backgrounds/Tilesets/TilesetField.png",
  water: "Backgrounds/Tilesets/TilesetWater.png",
  element: "Backgrounds/Tilesets/TilesetElement.png",
  relief: "Backgrounds/Tilesets/TilesetRelief.png",
  reliefDetail: "Backgrounds/Tilesets/TilesetReliefDetail.png",
  floorDetail: "Backgrounds/Tilesets/TilesetFloorDetail.png",
  interiorFloor: "Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png",
  chest: "Items/Treasure/LittleTreasureChest.png",
  facesetBox: "HUD/Dialog/FacesetBox.png",
} as const;

export type SheetName = keyof typeof SHEET;

const cache = new Map<string, Img>();

export function sheet(name: SheetName | string): Img {
  const rel = (SHEET as Record<string, string>)[name] ?? name;
  let img = cache.get(rel);
  if (!img) {
    img = loadImg(join(NINJA_ROOT, rel));
    cache.set(rel, img);
  }
  return img;
}

/** A w x h block of 16px cells starting at cell (col,row). */
export function cells(name: SheetName | string, col: number, row: number, w = 1, h = 1): Img {
  return crop(sheet(name), col * 16, row * 16, w * 16, h * 16);
}

/** An arbitrary pixel rectangle. */
export function rect(name: SheetName | string, x: number, y: number, w: number, h: number): Img {
  return crop(sheet(name), x, y, w, h);
}

export function character(name: string): Img {
  return sheet(`Actor/Characters/${name}/SpriteSheet.png`);
}

export function faceset(name: string): Img {
  return sheet(`Actor/Characters/${name}/Faceset.png`);
}

/** One 16x16 frame of a character sheet: sheet columns are down, up, left,
 *  right; rows 0..3 are the walk cycle (0 and 2 standing, 1 and 3 steps). */
export function charFrame(name: string, dir: "down" | "up" | "left" | "right", row: number): Img {
  const col = { down: 0, up: 1, left: 2, right: 3 }[dir];
  return crop(character(name), col * 16, row * 16, 16, 16);
}
