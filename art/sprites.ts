// art/sprites.ts — every 16x16 event sprite, the player's walker frames and
// the speaker portraits, cast from Ninja Adventure characters and props.
// The keys are the game's STATIC_SPRITES names (game/game-data.ts); the
// project document keeps pointing at assets/npc/<name>.png.

import { crop, mapPixels, newImg, over, type Img } from "./img.ts";
import { cells, charFrame, faceset, rect, sheet } from "./ninja.ts";
import { FIRE_OFF, LAMP_OFF, MAILBOX, MUSHROOMS, PARCEL } from "./custom.ts";

/** Who plays whom. */
export const CAST = {
  player: "Greenman",
  postmaster: "OldMan",
  shopkeeper: "Woman",
  clerk: "Inspector",
  farmer: "OldMan3",
  wanderer: "Villager3",
  miner: "EggBoy",
  hermit: "Monk",
  keeper: "OldMan2",
} as const;

export type Speaker = Exclude<keyof typeof CAST, "player">;

/** A pig from the pack re-wooled: cream fleece with a curly texture, a
 *  charcoal face on the snout side, dark legs. */
function sheep(): Img {
  return wool(rect("Actor/Animals/Pig/SpriteSheetPink.png", 0, 0, 16, 16));
}

function wool(pig: Img): Img {
  const out = mapPixels(pig, (r, g, b, a) => [r, g, b, a]);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4;
      if (out.rgba[i + 3] === 0) continue;
      const r = out.rgba[i]!, g = out.rgba[i + 1]!, b = out.rgba[i + 2]!;
      const lum = (r * 3 + g * 6 + b) / 10;
      if (lum < 60) continue; // outline
      const head = x <= 5 && y >= 5 && y <= 11; // the snout side
      const leg = y >= 13;
      const c = head || leg ? [78, 72, 74] : (x + y) % 3 === 0 ? [214, 206, 192] : [244, 239, 227];
      out.rgba.set(c, i);
    }
  }
  return out;
}

export function npcSprites(): Record<string, Img> {
  const face = (name: string): Img => charFrame(name, "down", 0);
  return {
    postmaster: face(CAST.postmaster),
    shopkeeper: face(CAST.shopkeeper),
    clerk: face(CAST.clerk),
    farmer: face(CAST.farmer),
    miner: face(CAST.miner),
    hermit: face(CAST.hermit),
    keeper: face(CAST.keeper),
    wanderer: face(CAST.wanderer),
    sheep: sheep(),
    "chest-closed": rect("chest", 0, 0, 16, 16),
    "chest-open": rect("chest", 16, 0, 16, 16),
    sign: cells("house", 29, 16),
    mailbox: MAILBOX,
    parcel: PARCEL,
    hay: cells("nature", 9, 8),
    mushrooms: MUSHROOMS,
    "fire-off": FIRE_OFF,
    "lamp-off": LAMP_OFF,
  };
}

/** The player walker in the engine's facing order (0 down, 1 left, 2 up,
 *  3 right): idle stance plus the two step extremes. */
export function playerFrames(): { idle: Img[]; walkL: Img[]; walkR: Img[] } {
  const dirs = ["down", "left", "up", "right"] as const;
  return {
    idle: dirs.map((d) => charFrame(CAST.player, d, 0)),
    walkL: dirs.map((d) => charFrame(CAST.player, d, 1)),
    walkR: dirs.map((d) => charFrame(CAST.player, d, 3)),
  };
}

/** A speaker portrait for the dialog box: the face inside the pack's
 *  48x48 portrait frame, on a 64x64 canvas (pak images are power-of-two;
 *  the spare margin is transparent). */
export function portrait(name: Speaker): Img {
  const out = newImg(64, 64);
  const frame = sheet("facesetBox");
  over(out, frame, 0, 0);
  over(out, faceset(CAST[name]), 5, 5);
  return out;
}

export { crop, over, sheet };
