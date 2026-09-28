// art/anim.ts — the vblank auto-play atlases (sprites.json): horizontal
// strips of 16x16 frames the core cycles on its own clock. Steps match the
// frameStep values the game data binds (game/game-data.ts ANIMATIONS and
// ANIM_SPRITE_KEYS), so only the pictures change.

import { newImg, over, type Img } from "./img.ts";
import { fireLit, lampLit, pix } from "./custom.ts";

export interface Atlas {
  frames: Img[];
  step: number;
}

function strip(frames: Img[]): Img {
  const out = newImg(frames.length * 16, 16);
  frames.forEach((f, i) => over(out, f, i * 16, 0));
  return out;
}

/** Light glinting on the pond: sparse, mostly transparent, so the painted
 *  pond and its banks show through. */
const WATER = [
  pix([
    "................", "................", "................", "....ee..........", "................",
    "..........ce....", "................", "................", "......c.........", "................",
    "................", "...........ee...", "................", "................", "................", "................",
  ]),
  pix([
    "................", "................", "................", "................", ".....ce.........",
    "................", "...........e....", "................", "................", ".......ee.......",
    "................", "................", "..........c.....", "................", "................", "................",
  ]),
];

export function atlases(beacon: Atlas): Record<string, Atlas & { strip: Img }> {
  const all: Record<string, Atlas> = {
    water: { frames: WATER, step: 24 },
    fire: { frames: [0, 1, 2, 3].map((i) => fireLit(i)), step: 8 },
    lamp: { frames: [lampLit(0), lampLit(1)], step: 22 },
    beacon,
  };
  return Object.fromEntries(Object.entries(all).map(([k, a]) => [k, { ...a, strip: strip(a.frames) }]));
}
