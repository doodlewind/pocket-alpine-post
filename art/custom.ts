// art/custom.ts — the handful of pieces Ninja Adventure has no sprite for
// (a post box, a parcel, a cable car, the lighthouse lamps), drawn here as
// ASCII pixel art in the pack's own palette (Palette.png) so they sit in
// the same style. Dedicated CC0 with the rest of this repository's art.

import { newImg, type Img } from "./img.ts";

/** Ninja Adventure palette entries by role. */
export const INK = {
  O: [20, 27, 27], // outline
  r: [224, 57, 76], // red
  R: [143, 62, 86], // deep red
  p: [239, 149, 151], // pink highlight
  w: [156, 101, 70], // wood
  W: [211, 134, 95], // light wood
  d: [105, 89, 83], // dark wood / iron
  y: [255, 225, 141], // warm light
  Y: [255, 173, 93], // orange light
  o: [228, 109, 58], // flame orange
  b: [121, 184, 206], // sky blue
  B: [45, 105, 123], // deep blue
  c: [184, 220, 229], // pale blue
  g: [78, 72, 74], // charcoal
  G: [142, 124, 115], // stone
  k: [179, 149, 127], // light stone
  P: [252, 226, 202], // paper
  s: [210, 179, 125], // parcel tan
  S: [189, 121, 89], // parcel shade
  n: [94, 113, 96], // moss
  N: [141, 151, 127], // pale moss
  e: [255, 255, 255], // white
} as const satisfies Record<string, readonly [number, number, number]>;

/** Rows of characters -> RGBA; '.' is transparent. */
export function pix(rows: readonly string[]): Img {
  const h = rows.length;
  const w = rows[0]!.length;
  const img = newImg(w, h);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`pix: row ${y} is ${row.length} wide, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      const c = (INK as Record<string, readonly number[]>)[ch];
      if (!c) throw new Error(`pix: unknown ink '${ch}'`);
      img.rgba.set([c[0]!, c[1]!, c[2]!, 255], (y * w + x) * 4);
    }
  });
  return img;
}

export const MAILBOX = pix([
  "................",
  "................",
  ".....OOOOOO.....",
  "....OrrrrrpO....",
  "...OrrrrrrrpO...",
  "...OrOOOOOOrO...",
  "...OrrrrrrrrO...",
  "...OrrryyrrrO...",
  "...OrrrrrrrrO...",
  "...ORRRRRRRRO...",
  "....OOOOOOOO....",
  "......OwWO......",
  "......OwWO......",
  "......OwWO......",
  ".....OOwWOO.....",
  "......OOOO......",
]);

export const PARCEL = pix([
  "................",
  "................",
  "................",
  "................",
  "................",
  "....OOOOOOOOO...",
  "...OssssrssssO..",
  "..OssssrrssssSO.",
  "..OOOOOrOOOOOSO.",
  "..OsssSrSsssSSO.",
  "..OsssSrSsssSSO.",
  "..OrrrrrrrrrrSO.",
  "..OsssSrSsssSO..",
  "..OSSSSrSSSSO...",
  "...OOOOOOOOO....",
  "................",
]);

export const LAMP_OFF = pix([
  "......OOOO......",
  ".....OddddO.....",
  "....OddddddO....",
  "....OgcgcgcO....",
  "....OcggggcO....",
  "....OgcgcgcO....",
  "....OddddddO....",
  ".....OOddOO.....",
  "......OddO......",
  "......OddO......",
  "......OddO......",
  "......OddO......",
  "......OddO......",
  ".....OddddO.....",
  "....OddddddO....",
  "....OOOOOOOO....",
]);

/** One lit lantern frame: `glow` picks the flicker. */
export function lampLit(glow: 0 | 1): Img {
  const a = glow ? "y" : "Y";
  const b = glow ? "Y" : "y";
  return pix([
    "......OOOO......",
    ".....OddddO.....",
    "....OddddddO....",
    `....O${a}${b}${a}${b}${a}${b}O....`,
    `....O${b}yyyy${a}O....`,
    `....O${a}${b}${a}${b}${a}${b}O....`,
    "....OddddddO....",
    ".....OOddOO.....",
    "......OddO......",
    "......OddO......",
    "......OddO......",
    "......OddO......",
    "......OddO......",
    ".....OddddO.....",
    "....OddddddO....",
    "....OOOOOOOO....",
  ]);
}

/** Stone ring and logs shared by the unlit and lit campfire. */
const FIRE_BASE = [
  "....OOOOOOOO....",
  "..OOkkOwWOkkOO..",
  ".OkeOOwWwWOOekO.",
  ".OkOwWwOOwWwOkO.",
  ".OkkOOgggggOkkO.",
  "..OOkkkOOkkkOO..",
  "....OOOOOOOO....",
];

export const FIRE_OFF = pix([
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ...FIRE_BASE,
]);

/** A lit campfire frame (four-step flicker). */
export function fireLit(step: number): Img {
  const flames = [
    ["......OO........", ".....OoOO.......", "....OoyoO.O.....", "....OoyyoOoO....", "...OoyyyyoyoO...", "...OoyyeyyyoO...", "..OoyyeeyyyoO..."],
    [".......OO.......", "......OoO..O....", ".....OoyoOOoO...", "....OoyyyoyoO...", "...OoyyyyyyoO...", "...OoyyeeyyoO...", "..OoyyyeeyyoO..."],
    ["........OO......", "....O..OoO......", "...OoOOoyoO.....", "...OoyoyyyoO....", "...OoyyyyyyoO...", "...OoyyeeyyoO...", "..OoyyyeeyyyoO.."],
    [".......OO.......", ".....OOoO.......", "....OoyyoO..O...", "....OoyyyoOoO...", "...OoyyyyyyyoO..", "...OoyyeeyyyoO..", "..OoyyeeeyyyoO.."],
  ][step % 4]!;
  const top = flames.map((row) => row.padEnd(16, ".").slice(0, 16));
  return pix(["................", "................", ...top, ...FIRE_BASE]);
}

/** The red cable-car cabin (32x24), hanger on top. */
export const CABLE_CAR = pix([
  "...............OO...............",
  "...............OO...............",
  "...............dd...............",
  "............OOOddOOO............",
  "...........OddddddddO...........",
  "....OOOOOOOOOOOOOOOOOOOOOOOO....",
  "...OpprrrrrrrrrrrrrrrrrrrrrrO...",
  "...OrrrrrrrrrrrrrrrrrrrrrrrrO...",
  "...OrOOOOOrOOOOOOrOOOOOOrOOrO...",
  "...OrObbcOrObbbcOrObbbcOrObrO...",
  "...OrObbbOrObbbbOrObbbbOrObrO...",
  "...OrOBbbOrOBbbbOrOBbbbOrOBrO...",
  "...OrOOOOOrOOOOOOrOOOOOOrOOrO...",
  "...OrrrrrrrrrrrrrrrrrrrrrrrrO...",
  "...OyyyyyyyyyyyyyyyyyyyyyyyyO...",
  "...ORRRRRRRRRRRRRRRRRRRRRRRRO...",
  "...ORRRRRRRRRRRRRRRRRRRRRRRRO...",
  "....OOOOOOOOOOOOOOOOOOOOOOOO....",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
]);

export const MUSHROOMS = pix([
  "................",
  "................",
  "....OOOOO.......",
  "...OrrerrO......",
  "..OrerrrreO.....",
  "..OrrrrerrO.....",
  "..OPPPPPPPO.....",
  "...OOOOOOO......",
  ".....OPPO...OOO.",
  ".....OPPO..OreO.",
  ".....OPPO.OrrrrO",
  ".....OPPO.OPPPPO",
  ".....OPPO..OOOO.",
  "....OOPPOO..OPO.",
  "....OOOOOO..OPO.",
  "............OOO.",
]);

/** Mine rails running east-west over a dirt bed. */
export const RAIL_H = pix([
  "................",
  "................",
  "................",
  "................",
  "OOOOOOOOOOOOOOOO",
  "GkkkGkkkGkkkGkkk",
  "OwOOOwOOOwOOOwOO",
  ".w...w...w...w..",
  ".w...w...w...w..",
  "OwOOOwOOOwOOOwOO",
  "GkkkGkkkGkkkGkkk",
  "OOOOOOOOOOOOOOOO",
  "................",
  "................",
  "................",
  "................",
]);

/** An ore cart (32x24) for the track's end. */
export const ORE_CART = pix([
  "................................",
  "......OOOO......................",
  ".....OGkkGOO..OOO...............",
  "....OGkkGGkkOOGkGO..............",
  "..OOOOOOOOOOOOOOOOOOOOOOOOOOO...",
  "..OdddddddddddddddddddddddddO...",
  "..OdGGGGGGGGGGGGGGGGGGGGGGGdO...",
  "..OdGgggggggggggggggggggggGdO...",
  "..OdGgggggggggggggggggggggGdO...",
  "..OdGGGGGGGGGGGGGGGGGGGGGGGdO...",
  "..OddddddddddddddddddddddddddO..",
  "...OOOOOOOOOOOOOOOOOOOOOOOOOO...",
  ".....OggO..............OggO.....",
  "....OgGGgO............OgGGgO....",
  "....OgGGgO............OgGGgO....",
  ".....OggO..............OggO.....",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
]);

type Rgb = readonly [number, number, number];

/** The lighthouse, 32x96: cell row 0 above the map's tower cells (cap),
 *  then lamp room, gallery, the banded tower, and the stone base whose
 *  arched door sits in the right-hand cell (the walkable doorway). */
export function lighthouse(): Img {
  const W = 32, H = 96;
  const img = newImg(W, H);
  const set = (x: number, y: number, c: Rgb): void => {
    if (x >= 0 && y >= 0 && x < W && y < H) img.rgba.set([c[0], c[1], c[2], 255], (y * W + x) * 4);
  };
  const O = INK.O, r = INK.r, R = INK.R, p = INK.p, e = INK.e, P = INK.P, k = INK.k, G = INK.G, g = INK.g, c = INK.c, b = INK.b, B = INK.B, d = INK.d;
  const cx = 16;
  // Tapered banded body: rows 36..87.
  for (let y = 36; y <= 87; y++) {
    const half = Math.round(9 + ((y - 36) / 51) * 3);
    const band = y < 48 ? "white" : y < 64 ? "red" : y < 80 ? "white" : "red";
    for (let x = cx - half; x < cx + half; x++) {
      const t = (x - (cx - half)) / (2 * half);
      const edge = x === cx - half || x === cx + half - 1;
      const col: Rgb = edge ? O : band === "red" ? (t < 0.22 ? p : t > 0.7 ? R : r) : t < 0.22 ? e : t > 0.7 ? k : P;
      set(x, y, col);
    }
    if (y === 48 || y === 64 || y === 80) for (let x = cx - half + 1; x < cx + half - 1; x++) set(x, y, O);
  }
  // A small window on the white band.
  for (let y = 68; y <= 73; y++) for (let x = 13; x <= 18; x++) set(x, y, y === 68 || y === 73 || x === 13 || x === 18 ? O : y < 70 ? c : b);
  // Stone base, rows 84..95, with an arched door in the right cell.
  for (let y = 84; y <= 95; y++) {
    for (let x = 2; x <= 29; x++) {
      const edge = x === 2 || x === 29 || y === 84 || y === 95;
      const mortar = (y - 84) % 4 === 3 || (x + ((y - 84) >> 2) * 3) % 7 === 0;
      set(x, y, edge ? O : mortar ? G : k);
    }
  }
  for (let y = 85; y <= 95; y++) {
    for (let x = 18; x <= 25; x++) {
      const arch = y === 85 ? x >= 20 && x <= 23 : y === 86 ? x >= 19 && x <= 24 : true;
      if (!arch) continue;
      const rim = x === 18 || x === 25 || (y === 85) || (y === 86 && (x === 19 || x === 24));
      set(x, y, rim ? O : y > 93 ? d : g);
    }
  }
  // Gallery: a railing wider than the tower, rows 30..35.
  for (let x = 3; x <= 28; x++) {
    set(x, 30, O);
    set(x, 35, O);
    for (let y = 31; y <= 34; y++) set(x, y, (x - 3) % 3 === 0 ? O : y === 31 ? G : y >= 34 ? d : W_EMPTY(x, y));
  }
  // Lamp room: framed glass, rows 16..29.
  for (let y = 16; y <= 29; y++) {
    for (let x = 8; x <= 23; x++) {
      const frame = x === 8 || x === 23 || y === 16 || y === 29 || x === 15 || x === 16;
      set(x, y, frame ? (y === 16 || y === 29 ? O : g) : y < 20 ? c : y < 25 ? b : B);
    }
  }
  // Cap: a dark red dome and finial, rows 3..15.
  for (let y = 7; y <= 15; y++) {
    const half = Math.round(4 + ((y - 7) / 8) * 7);
    for (let x = cx - half; x < cx + half; x++) {
      const edge = x === cx - half || x === cx + half - 1 || y === 15 || y === 7;
      set(x, y, edge ? O : x < cx - half + 3 ? r : R);
    }
  }
  for (let y = 3; y <= 6; y++) {
    set(cx - 1, y, O);
    set(cx, y, O);
  }
  set(cx - 1, 2, O);
  set(cx, 2, O);
  return img;

  function W_EMPTY(_x: number, _y: number): Rgb {
    return k;
  }
}

/** The beacon lit inside the lamp room, centered on the tower (the
 *  atlas cell is nudged half a cell left onto the center line). */
export function beaconFrame(bright: 0 | 1): Img {
  return pix(
    bright
      ? [
          "................", "................", ".......y........", "...y..yYy..y....", "....yyeeeyy.....",
          "...yyeeeeeyy....", "..yYeeeeeeeYy...", "...yyeeeeeyy....", "....yyeeeyy.....", "...y..yYy..y....",
          ".......y........", "................", "................", "................", "................", "................",
        ]
      : [
          "................", "................", "................", "......yyy.......", ".....yeeey......",
          "....yeeeeey.....", "...yYeeeeeYy....", "....yeeeeey.....", ".....yeeey......", "......yyy.......",
          "................", "................", "................", "................", "................", "................",
        ],
  );
}
