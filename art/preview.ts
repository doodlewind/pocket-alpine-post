// art/preview.ts — render each map as the player would see it (ground,
// event sprites at their start pages, the player at the start tile, upper
// layer), scaled up, for reviewing the art without booting the game.
//
//   bun art/preview.ts [outDir] [mapId...]      (default outDir: dist/preview)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodePNG } from "../vendor/pocket-rpgkit/vendor/pocketjs/tests/png.ts";
import { activePage, createSwitchState } from "../vendor/pocket-rpgkit/src/engine/interpreter.ts";
import { ANIMATIONS, buildGame } from "../game/game-data.ts";
import { atlases } from "./anim.ts";
import { beaconFrame } from "./custom.ts";
import { crop, newImg, over, type Img } from "./img.ts";
import { paintMap } from "./paint-maps.ts";
import { npcSprites, playerFrames } from "./sprites.ts";

const outDir = process.argv[2] ?? join(import.meta.dir, "..", "dist", "preview");
const only = new Set(process.argv.slice(3));
mkdirSync(outDir, { recursive: true });

const { project, maps } = buildGame();
const sprites = npcSprites();
const anims = atlases({ frames: [beaconFrame(0), beaconFrame(1)], step: 10 });
const player = playerFrames().idle[0]!;
const sw = createSwitchState();

function scale(img: Img, s: number): Img {
  const out = newImg(img.width * s, img.height * s);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const sp = (Math.floor(y / s) * img.width + Math.floor(x / s)) * 4;
      out.rgba.set(img.rgba.subarray(sp, sp + 4), (y * out.width + x) * 4);
    }
  }
  return out;
}

for (const m of maps) {
  if (only.size && !only.has(m.id)) continue;
  const painted = paintMap(project, m);
  const w = m.width * 16;
  const h = m.height * 16;
  const view = newImg(w, h);
  over(view, crop(painted.ground, 0, 0, w, h), 0, 0);
  for (const a of ANIMATIONS[m.id] ?? []) if (a.layer === "ground") over(view, anims[a.atlas]!.frames[0]!, a.x * 16, a.y * 16);
  for (const a of ANIMATIONS[m.id] ?? []) if (a.layer === "object" && !a.when) over(view, anims[a.atlas]!.frames[0]!, a.x * 16 + (a.dx ?? 0), a.y * 16);
  for (const ev of m.events ?? []) {
    const key = activePage(ev as never, sw, m.id)?.page.sprite;
    const img = key ? sprites[key] : undefined;
    if (img) over(view, img, ev.x * 16, ev.y * 16);
  }
  if (project.start.map === m.id) over(view, player, project.start.x * 16, project.start.y * 16);
  over(view, crop(painted.upper, 0, 0, w, h), 0, 0);
  const big = scale(view, 3);
  writeFileSync(join(outDir, `${m.id}.png`), encodePNG(big.rgba, big.width, big.height));
  console.log(`${m.id}: ${join(outDir, `${m.id}.png`)}`);
}
