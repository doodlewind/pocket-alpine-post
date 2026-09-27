// gen-assets.ts — build-time cooker for Alpine Post.
//
//   bun gen-assets.ts
//
// Inputs (committed CC0/CC-BY art, see ATTRIBUTION.md):
//   assets/src/town-tiles.png    Kenney Tiny Town, 12x11 grid of 16px
//   assets/src/dungeon-tiles.png Kenney Tiny Dungeon, 12x11
//   assets/src/farm-tiles.png    Kenney Tiny Farm, 12x11 (RGBA conversion
//                                of the pack's palette PNG; pixels verbatim)
//   assets/src/hero-*.png        Sharm Tiny 16 walker, 4x1 16px cells
//
// Outputs (committed; byte-stable, regenerated only from the sources and
// the authored project below):
//   assets/map-*-{ground,upper}.png  one 512x512 PSM_4444 pair per map
//   assets/npc/*.png                 16x16 static event sprites
//   assets/player-*.png              idle/walk-pose frames
//   data/alpine-post.json            emitted rpgkit-project/v1 document
//   images.json, sprites.json        bake metadata
//   ui/assets.ts                     full-literal runtime asset manifest

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePng } from "./vendor/pocket-rpgkit/vendor/pocketjs/framework/compiler/pak.ts";
import { encodePNG } from "./vendor/pocket-rpgkit/vendor/pocketjs/tests/png.ts";
import { TILE } from "./vendor/pocket-rpgkit/src/engine/tiles.ts";
import { buildGame, STATIC_SPRITES } from "./game/game-data.ts";
import { makeCustomArt } from "./game/custom-art.ts";

const HERE = new URL(".", import.meta.url).pathname; // repository root
const ASSETS = join(HERE, "assets");
const SRC = join(ASSETS, "src");
mkdirSync(ASSETS, { recursive: true });
mkdirSync(join(ASSETS, "npc"), { recursive: true });
mkdirSync(join(HERE, "ui"), { recursive: true });
mkdirSync(join(HERE, "data"), { recursive: true });

const MAP_CANVAS = 512;

interface SheetPng {
  width: number;
  height: number;
  rgba: Uint8Array;
  cols: number;
  rows: number;
}

const loadSheet = async (name: string, cols: number, rows: number): Promise<SheetPng> => {
  const png = decodePng(new Uint8Array(await Bun.file(join(SRC, name)).arrayBuffer()));
  if (png.width !== cols * TILE || png.height !== rows * TILE) {
    throw new Error(`${name}: expected ${cols * TILE}x${rows * TILE}, got ${png.width}x${png.height}`);
  }
  return { ...png, cols, rows };
};

const { cells: customCells, atlases: animAtlases } = makeCustomArt();

const sheets = new Map<string, SheetPng>();
sheets.set("town", await loadSheet("town-tiles.png", 12, 11));
sheets.set("dun", await loadSheet("dungeon-tiles.png", 12, 11));
sheets.set("farm", await loadSheet("farm-tiles.png", 12, 11));
sheets.set("custom", { width: 8 * TILE, height: 8 * TILE, cols: 8, rows: 8, rgba: composeCustomSheet() });

function composeCustomSheet(): Uint8Array {
  const W = 8 * TILE;
  const canvas = new Uint8Array(W * 8 * TILE * 4);
  for (const [cell, art] of Object.entries(customCells)) {
    const i = Number(cell);
    const cx = i % 8;
    const cy = Math.floor(i / 8);
    blit(canvas, W, cx * TILE, cy * TILE, art);
  }
  return canvas;
}

function blit(canvas: Uint8Array, W: number, px0: number, py0: number, art: Uint8Array): void {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const sp = (y * TILE + x) * 4;
      const a = art[sp + 3];
      const dp = ((py0 + y) * W + (px0 + x)) * 4;
      if (a === 255) {
        canvas.set(art.subarray(sp, sp + 4), dp);
      } else if (a !== 0) {
        for (let k = 0; k < 4; k++) {
          const below = canvas[dp + k];
          canvas[dp + k] = k === 3 ? a : Math.round((art[sp + k] * a + below * (255 - a)) / 255);
        }
      }
    }
  }
}

const cellCache = new Map<string, Uint8Array>();
function tileArt(tileId: string | null): Uint8Array | null {
  if (!tileId) return null;
  const dot = tileId.lastIndexOf(".");
  const sheetId = tileId.slice(0, dot);
  const cell = Number(tileId.slice(dot + 1));
  const key = `${sheetId}.${cell}`;
  let art = cellCache.get(key);
  if (!art) {
    const sheet = sheets.get(sheetId);
    if (!sheet) throw new Error(`bake: unknown sheet "${sheetId}" in ${tileId}`);
    const cx = cell % sheet.cols;
    const cy = Math.floor(cell / sheet.cols);
    if (cy >= sheet.rows) throw new Error(`bake: cell ${cell} outside ${sheetId} (${sheet.cols}x${sheet.rows})`);
    art = new Uint8Array(TILE * TILE * 4);
    for (let y = 0; y < TILE; y++) {
      const src = ((cy * TILE + y) * sheet.width + cx * TILE) * 4;
      art.set(sheet.rgba.subarray(src, src + TILE * 4), y * TILE * 4);
    }
    cellCache.set(key, art);
  }
  return art;
}

// --- maps -------------------------------------------------------------------

const { project, maps } = buildGame();
writeFileSync(join(HERE, "data", "alpine-post.json"), JSON.stringify(project, null, 2) + "\n");

// Every map is outdoors: pad the 512 canvas with grass (the world frame
// clips the spare rows/columns to the map rectangle).
const padCell = tileArt("town.0")!;
const mapGroundNames: string[] = [];
const mapUpperNames: string[] = [];
for (const m of maps) {
  const ground = new Uint8Array(MAP_CANVAS * MAP_CANVAS * 4);
  for (let py = 0; py < MAP_CANVAS; py += TILE) {
    for (let px = 0; px < MAP_CANVAS; px += TILE) blit(ground, MAP_CANVAS, px, py, padCell);
  }
  for (let ty = 0; ty < m.height; ty++) {
    for (let tx = 0; tx < m.width; tx++) {
      const art = tileArt(m.ground[ty * m.width + tx] ?? null);
      if (art) blit(ground, MAP_CANVAS, tx * TILE, ty * TILE, art);
    }
  }
  const groundFile = `map-${m.id}-ground.png`;
  writeFileSync(join(ASSETS, groundFile), encodePNG(ground, MAP_CANVAS, MAP_CANVAS));
  mapGroundNames.push(`assets/${groundFile}`);

  const upperCanvas = new Uint8Array(MAP_CANVAS * MAP_CANVAS * 4);
  for (const [idx, id] of m.upper ?? []) {
    const art = tileArt(id);
    if (art) blit(upperCanvas, MAP_CANVAS, (idx % m.width) * TILE, Math.floor(idx / m.width) * TILE, art);
  }
  const upperFile = `map-${m.id}-upper.png`;
  writeFileSync(join(ASSETS, upperFile), encodePNG(upperCanvas, MAP_CANVAS, MAP_CANVAS));
  mapUpperNames.push(`assets/${upperFile}`);
}

// --- static event sprites: verbatim 16x16 sheet crops ------------------------

for (const [name, source] of Object.entries(STATIC_SPRITES) as [string, string][]) {
  const art = tileArt(source);
  if (!art) throw new Error(`sprite ${name}: missing crop source ${source}`);
  writeFileSync(join(ASSETS, "npc", `${name}.png`), encodePNG(art, TILE, TILE));
}

// --- player walker (Sharm Tiny 16, CC-BY — see ATTRIBUTION.md) --------------

const HERO_ATLASES = ["down", "left", "up", "right"];
for (const [facing, dir] of HERO_ATLASES.entries()) {
  const atlas = decodePng(new Uint8Array(await Bun.file(join(SRC, `hero-${dir}.png`)).arrayBuffer()));
  if (atlas.height !== TILE || atlas.width !== 4 * TILE) {
    throw new Error(`hero-${dir}.png: expected a 4x1 strip of 16px cells`);
  }
  const copyCell = (cell: number): Uint8Array => {
    const frame = new Uint8Array(TILE * TILE * 4);
    for (let y = 0; y < TILE; y++) {
      const src = (y * atlas.width + cell * TILE) * 4;
      frame.set(atlas.rgba.subarray(src, src + TILE * 4), y * TILE * 4);
    }
    return frame;
  };
  writeFileSync(join(ASSETS, `player-dir${facing}.png`), encodePNG(copyCell(1), TILE, TILE));
  writeFileSync(join(ASSETS, `player-pose${facing}-l.png`), encodePNG(copyCell(0), TILE, TILE));
  writeFileSync(join(ASSETS, `player-pose${facing}-r.png`), encodePNG(copyCell(2), TILE, TILE));
}

// --- animated vblank atlases (game/custom-art.ts) ----------------------------

mkdirSync(join(ASSETS, "anim"), { recursive: true });
const animFiles: string[] = [];
for (const [name, a] of Object.entries(animAtlases)) {
  const file = `assets/anim/${name}.png`;
  writeFileSync(join(ASSETS, "anim", `${name}.png`), encodePNG(a.rgba, a.cols * TILE, TILE));
  animFiles.push(file);
}
void animFiles;

// --- bake manifests -----------------------------------------------------------

const imageMeta: Record<string, { psm: number }> = {};
for (const name of [...mapGroundNames, ...mapUpperNames]) imageMeta[name] = { psm: 2 };
writeFileSync(join(HERE, "images.json"), JSON.stringify(imageMeta, null, 2) + "\n");

// sprites.json marks the auto-play atlases the core cycles from vblanks.
// PSM_4444 keeps the hard-alpha Kenney cells at 2 B/px on every target.
const spritesMeta: Record<string, { cols: number; rows: number; frames: number; step: number; psm: number }> = {};
for (const [name, a] of Object.entries(animAtlases)) {
  spritesMeta[`assets/anim/${name}.png`] = { cols: a.cols, rows: 1, frames: a.cols, step: a.step, psm: 2 };
}
writeFileSync(join(HERE, "sprites.json"), JSON.stringify(spritesMeta, null, 2) + "\n");

const poseList = (kind: string): string =>
  [0, 1, 2, 3].map((f) => `  ${JSON.stringify(`assets/player-pose${f}-${kind}.png`)},`).join("\n");
const manifest =
  `// AUTO-GENERATED by gen-assets.ts — full string literals\n` +
  `// so tools/build.ts bakes every image, plus per-map geometry.\n\n` +
  `export const MAP_CANVAS_PX = ${MAP_CANVAS};\n\n` +
  `export const MAP_GROUND: Record<string, string> = {\n` +
  maps.map((m) => `  ${JSON.stringify(m.id)}: ${JSON.stringify(`assets/map-${m.id}-ground.png`)},`).join("\n") +
  `\n};\n\n` +
  `export const MAP_UPPER: Record<string, string> = {\n` +
  maps.map((m) => `  ${JSON.stringify(m.id)}: ${JSON.stringify(`assets/map-${m.id}-upper.png`)},`).join("\n") +
  `\n};\n\n` +
  `export const MAP_WORLD: Record<string, { w: number; h: number }> = {\n` +
  maps.map((m) => `  ${JSON.stringify(m.id)}: { w: ${m.width * TILE}, h: ${m.height * TILE} },`).join("\n") +
  `\n};\n\n` +
  `export const MAP_ORDER: readonly string[] = ${JSON.stringify(maps.map((m) => m.id))};\n\n` +
  `export const NPC_SRC: Record<string, string> = {\n` +
  Object.keys(STATIC_SPRITES).map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(`assets/npc/${k}.png`)},`).join("\n") +
  `\n};\n\n` +
  `export const PLAYER_IDLE: string[] = [\n` +
  [0, 1, 2, 3].map((f) => `  ${JSON.stringify(`assets/player-dir${f}.png`)},`).join("\n") +
  `\n];\n\n` +
  `export const PLAYER_WALK_L: string[] = [\n${poseList("l")}\n];\n\n` +
  `export const PLAYER_WALK_R: string[] = [\n${poseList("r")}\n];\n\n` +
  `// Vblank auto-play atlases (sprites.json); the core cycles the frames,\n` +
  `// guest JS never touches them per frame. src key -> frame step.\n` +
  `export const ANIM_ATLASES: Record<string, { src: string; frames: number; step: number }> = {\n` +
  Object.entries(animAtlases).map(([name, a]) => `  ${JSON.stringify(name)}: { src: ${JSON.stringify(`assets/anim/${name}.png`)}, frames: ${a.cols}, step: ${a.step} },`).join("\n") +
  `\n};\n`;
writeFileSync(join(HERE, "ui", "assets.ts"), manifest);

console.log(
  `alpine-post gen-assets: ${maps.length} map(s) (${maps.map((m) => `${m.id} ${m.width}x${m.height}`).join(", ")}), ` +
    `${Object.keys(STATIC_SPRITES).length} static sprite(s), ${Object.keys(animAtlases).length} anim atlas(es)`,
);
