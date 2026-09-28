// gen-assets.ts — build-time cooker for Alpine Post.
//
//   bun gen-assets.ts
//
// Inputs: the Ninja Adventure sheets under assets/src/ninja (CC0; see
// ATTRIBUTION.md) and the art scripts under art/ — the map painters
// (art/maps.ts), the cast (art/sprites.ts), a few pieces drawn in the
// pack's palette (art/custom.ts) and the vblank atlases (art/anim.ts).
//
// Outputs (committed; byte-stable, regenerated only from the inputs and
// the authored project):
//   assets/map-*-{ground,upper}.png  one 512x512 pair per map
//   assets/npc/*.png                 16x16 event sprites
//   assets/player-*.png              idle/walk-pose frames
//   assets/anim/*.png                vblank auto-play strips
//   assets/face/*.png                64x64 framed speaker portraits
//   data/alpine-post.json            emitted rpgkit-project/v1 document
//   images.json, sprites.json        bake metadata
//   ui/assets.ts                     full-literal runtime asset manifest

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodePNG } from "./vendor/pocket-rpgkit/vendor/pocketjs/tests/png.ts";
import { PSM } from "./vendor/pocket-rpgkit/vendor/pocketjs/contracts/spec/spec.ts";
import { TILE } from "./vendor/pocket-rpgkit/src/engine/tiles.ts";
import { buildGame, STATIC_SPRITES } from "./game/game-data.ts";
import { atlases } from "./art/anim.ts";
import { beaconFrame } from "./art/custom.ts";
import type { Img } from "./art/img.ts";
import { paintMap } from "./art/paint-maps.ts";
import { CANVAS } from "./art/painter.ts";
import { CAST, npcSprites, playerFrames, portrait, type Speaker } from "./art/sprites.ts";

const HERE = new URL(".", import.meta.url).pathname; // repository root
const ASSETS = join(HERE, "assets");
for (const dir of ["npc", "anim", "face"]) {
  rmSync(join(ASSETS, dir), { recursive: true, force: true });
  mkdirSync(join(ASSETS, dir), { recursive: true });
}
mkdirSync(join(HERE, "ui"), { recursive: true });
mkdirSync(join(HERE, "data"), { recursive: true });

const png = (img: Img): Uint8Array => encodePNG(img.rgba, img.width, img.height);

// --- maps -------------------------------------------------------------------

const { project, maps } = buildGame();
writeFileSync(join(HERE, "data", "alpine-post.json"), JSON.stringify(project, null, 2) + "\n");

// Ground canvases are fully opaque: PSM_5650 keeps 5/6/5 bits of color.
// Upper canvases need alpha; the pack's hard 0/255 edges survive PSM_4444.
const imageMeta: Record<string, { psm: number }> = {};
for (const m of maps) {
  const { ground, upper } = paintMap(project, m);
  for (const [layer, img, psm] of [["ground", ground, PSM.PSM_5650], ["upper", upper, PSM.PSM_4444]] as const) {
    const name = `assets/map-${m.id}-${layer}.png`;
    writeFileSync(join(HERE, name), png(img));
    imageMeta[name] = { psm };
  }
}
writeFileSync(join(HERE, "images.json"), JSON.stringify(imageMeta, null, 2) + "\n");

// --- event sprites, player, portraits -----------------------------------------

const sprites = npcSprites();
const missing = Object.keys(STATIC_SPRITES).filter((k) => !sprites[k]);
if (missing.length) throw new Error(`gen-assets: no art for sprite(s) ${missing.join(", ")}`);
for (const name of Object.keys(STATIC_SPRITES)) writeFileSync(join(ASSETS, "npc", `${name}.png`), png(sprites[name]!));

const walker = playerFrames();
for (let f = 0; f < 4; f++) {
  writeFileSync(join(ASSETS, `player-dir${f}.png`), png(walker.idle[f]!));
  writeFileSync(join(ASSETS, `player-pose${f}-l.png`), png(walker.walkL[f]!));
  writeFileSync(join(ASSETS, `player-pose${f}-r.png`), png(walker.walkR[f]!));
}

// Portraits only for the names that actually open a line in the script.
const spoken = new Set<string>();
const scan = (v: unknown): void => {
  if (Array.isArray(v)) v.forEach(scan);
  else if (v && typeof v === "object") {
    const o = v as { op?: string; lines?: string[] };
    if (o.op === "text" && o.lines?.[0]) {
      const m = /^([A-Z][A-Z]+): /.exec(o.lines[0]);
      if (m) spoken.add(m[1]!.toLowerCase());
    }
    Object.values(o).forEach(scan);
  }
};
scan(project);
const speakers = (Object.keys(CAST) as (keyof typeof CAST)[]).filter((k): k is Speaker => k !== "player" && spoken.has(k));
for (const s of speakers) writeFileSync(join(ASSETS, "face", `${s}.png`), png(portrait(s)));

// --- vblank atlases ------------------------------------------------------------

const anims = atlases({ frames: [beaconFrame(0), beaconFrame(1)], step: 10 });
const spritesMeta: Record<string, { cols: number; rows: number; frames: number; step: number; psm: number }> = {};
for (const [name, a] of Object.entries(anims)) {
  writeFileSync(join(ASSETS, "anim", `${name}.png`), png(a.strip));
  spritesMeta[`assets/anim/${name}.png`] = { cols: a.frames.length, rows: 1, frames: a.frames.length, step: a.step, psm: PSM.PSM_4444 };
}
writeFileSync(join(HERE, "sprites.json"), JSON.stringify(spritesMeta, null, 2) + "\n");

// --- runtime manifest ------------------------------------------------------------

const q = JSON.stringify;
const list = (names: string[]): string => names.map((n) => `  ${q(n)},`).join("\n");
const manifest =
  `// AUTO-GENERATED by gen-assets.ts — full string literals\n` +
  `// so tools/build.ts bakes every image, plus per-map geometry.\n\n` +
  `export const MAP_CANVAS_PX = ${CANVAS};\n\n` +
  `export const MAP_GROUND: Record<string, string> = {\n` +
  maps.map((m) => `  ${q(m.id)}: ${q(`assets/map-${m.id}-ground.png`)},`).join("\n") +
  `\n};\n\n` +
  `export const MAP_UPPER: Record<string, string> = {\n` +
  maps.map((m) => `  ${q(m.id)}: ${q(`assets/map-${m.id}-upper.png`)},`).join("\n") +
  `\n};\n\n` +
  `export const MAP_WORLD: Record<string, { w: number; h: number }> = {\n` +
  maps.map((m) => `  ${q(m.id)}: { w: ${m.width * TILE}, h: ${m.height * TILE} },`).join("\n") +
  `\n};\n\n` +
  `export const MAP_ORDER: readonly string[] = ${q(maps.map((m) => m.id))};\n\n` +
  `export const NPC_SRC: Record<string, string> = {\n` +
  Object.keys(STATIC_SPRITES).map((k) => `  ${q(k)}: ${q(`assets/npc/${k}.png`)},`).join("\n") +
  `\n};\n\n` +
  `export const PLAYER_IDLE: string[] = [\n${list([0, 1, 2, 3].map((f) => `assets/player-dir${f}.png`))}\n];\n\n` +
  `export const PLAYER_WALK_L: string[] = [\n${list([0, 1, 2, 3].map((f) => `assets/player-pose${f}-l.png`))}\n];\n\n` +
  `export const PLAYER_WALK_R: string[] = [\n${list([0, 1, 2, 3].map((f) => `assets/player-pose${f}-r.png`))}\n];\n\n` +
  `// Speaker portraits for the dialog box, keyed by the name a line starts\n` +
  `// with ("POSTMASTER: ...").\n` +
  `export const FACE_SRC: Record<string, string> = {\n` +
  speakers.map((s) => `  ${q(s.toUpperCase())}: ${q(`assets/face/${s}.png`)},`).join("\n") +
  `\n};\n\n` +
  `// Vblank auto-play atlases (sprites.json); the core cycles the frames,\n` +
  `// guest JS never touches them per frame. src key -> frame step.\n` +
  `export const ANIM_ATLASES: Record<string, { src: string; frames: number; step: number }> = {\n` +
  Object.entries(anims).map(([name, a]) => `  ${q(name)}: { src: ${q(`assets/anim/${name}.png`)}, frames: ${a.frames.length}, step: ${a.step} },`).join("\n") +
  `\n};\n`;
writeFileSync(join(HERE, "ui", "assets.ts"), manifest);

console.log(
  `alpine-post gen-assets: ${maps.length} map(s) (${maps.map((m) => `${m.id} ${m.width}x${m.height}`).join(", ")}), ` +
    `${Object.keys(STATIC_SPRITES).length} sprite(s), ${speakers.length} portrait(s), ${Object.keys(anims).length} atlas(es)`,
);
