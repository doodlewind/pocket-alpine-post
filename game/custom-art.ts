// game/custom-art.ts — code-drawn art for Alpine Post.
//
// Two deterministic registries (no randomness; byte-stable output):
//
//   customCells  16x16 RGBA cells composed onto the virtual "custom" 8x8
//                sheet, addressed as "custom.<n>". Fills the handful of
//                props the Kenney Tiny packs omit: two grass variants,
//                mailbox, parcel, a 2-wide x 5-tall lighthouse, unlit
//                campfire and lamp sprites.
//   animAtlases  horizontal 16x16-frame strips baked as vblank auto-play
//                SPRITE pak entries (sprites.json): water, campfire, lamp,
//                beacon. The core cycles frames; guest JS sends no op.
//
// Every color is sampled from the Kenney Tiny Town/Dungeon/Farm sheets
// (see PALETTE with the source cell of each value), so the self-drawn art
// sits in the same palette; dedicated CC0 in ATTRIBUTION.md.

export const TILE = 16;

// Sampled values:
//   grass   town.0 / town.1
//   outline every Kenney Tiny sprite: 63,38,49
//   wood    town.44 / farm sunflower stem
//   stone   town blue-roof greys (90,105,136 / 139,155,180 / 192,203,220)
//   red     dungeon crab (232,69,55 / 255,112,109)
//   water   farm trough (153,216,248 / 121,167,232)
//   flame   farm hay/sunflower (253,190,83 / 227,134,40) + crab red
const C = {
  grass: [132, 198, 105],
  grassLight: [139, 216, 125],
  grassDark: [101, 165, 86],
  ink: [63, 38, 49],
  wood: [189, 108, 74],
  woodLight: [234, 165, 108],
  woodDark: [118, 59, 54],
  stone: [139, 155, 180],
  stoneLight: [192, 203, 220],
  stoneDark: [90, 105, 136],
  white: [238, 238, 238],
  whiteShade: [208, 214, 222],
  red: [232, 69, 55],
  redLight: [255, 112, 109],
  redDark: [178, 52, 44],
  water: [121, 167, 232],
  waterLight: [153, 216, 248],
  waterWhite: [198, 229, 248],
  flameYellow: [253, 190, 83],
  flameCream: [255, 216, 150],
  flameOrange: [227, 134, 40],
  flameRed: [232, 69, 55],
  glass: [62, 78, 110],
  glassDark: [38, 43, 68],
} as const satisfies Record<string, readonly [number, number, number]>;

export const CUSTOM_GRASS_SPARSE = 0;
export const CUSTOM_GRASS_FLOWER = 1;
export const CUSTOM_MAILBOX = 2;
export const CUSTOM_PARCEL = 3;
export const CUSTOM_TOWER_BASE_L = 4;
export const CUSTOM_TOWER_BASE_R = 5;
export const CUSTOM_TOWER_RED_L = 6;
export const CUSTOM_TOWER_RED_R = 7;
export const CUSTOM_TOWER_WHITE_L = 8;
export const CUSTOM_TOWER_WHITE_R = 9;
export const CUSTOM_TOWER_GALLERY_L = 10;
export const CUSTOM_TOWER_GALLERY_R = 11;
export const CUSTOM_TOWER_LAMPROOM_L = 12;
export const CUSTOM_TOWER_LAMPROOM_R = 13;
export const CUSTOM_FIRE_OFF = 14;
export const CUSTOM_LAMP_OFF = 15;

export interface AnimAtlasSpec {
  rgba: Uint8Array;
  cols: number;
  step: number;
}

class Pix {
  readonly data: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8Array(w * h * 4);
  }
  set(x: number, y: number, c: readonly number[], a = 255): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    // Pixel art replaces underneath (no AA blends).
    this.data[i] = c[0]!;
    this.data[i + 1] = c[1]!;
    this.data[i + 2] = c[2]!;
    this.data[i + 3] = a;
  }
  rect(x: number, y: number, w: number, h: number, c: readonly number[], a?: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }
  hline(x: number, y: number, w: number, c: readonly number[]): void {
    this.rect(x, y, w, 1, c);
  }
  vline(x: number, y: number, h: number, c: readonly number[]): void {
    this.rect(x, y, 1, h, c);
  }
  /** Draw from a string grid; space = transparent, chars -> colors. */
  grid(rows: string[], pal: Record<string, readonly number[]>, ox = 0, oy = 0): void {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch && ch !== " " && pal[ch]) this.set(ox + x, oy + y, pal[ch]!);
      }
    });
  }
}

function tile(): Pix {
  return new Pix(TILE, TILE);
}

// --- grass variants -----------------------------------------------------------

function grassSparse(): Uint8Array {
  const p = tile();
  p.rect(0, 0, 16, 16, C.grass);
  // One light/dark tuft, offset from the three town.1 carries.
  p.grid(
    [
      "ll",
      "dd",
    ],
    { l: C.grassLight, d: C.grassDark },
    9,
    3,
  );
  p.grid([" d", "d "], { d: C.grassDark }, 3, 11);
  return p.data;
}

function grassFlower(): Uint8Array {
  const p = tile();
  p.rect(0, 0, 16, 16, C.grass);
  p.grid(["d"], { d: C.grassDark }, 4, 10);
  // Tiny white-yellow flowers, Kenney style: cream petals + yellow center.
  const flower = (x: number, y: number): void => {
    p.set(x, y, C.white);
    p.set(x + 1, y, C.white);
    p.set(x, y + 1, C.flameYellow);
    p.set(x + 1, y + 1, C.flameCream);
  };
  flower(10, 3);
  flower(3, 12);
  return p.data;
}

// --- props -------------------------------------------------------------------

function mailbox(): Uint8Array {
  const p = tile();
  // Post.
  p.rect(7, 8, 2, 7, C.wood);
  p.set(7, 8, C.woodDark);
  // Navy box body with outline.
  p.rect(3, 3, 10, 7, C.ink);
  p.rect(4, 4, 8, 5, C.stoneDark);
  p.rect(4, 4, 8, 1, C.stone);
  // Envelope slot.
  p.hline(6, 6, 4, C.whiteShade);
  // Red signal flag.
  p.rect(12, 5, 3, 2, C.red);
  p.set(14, 5, C.redDark);
  // Feet.
  p.rect(6, 10, 4, 1, C.ink);
  return p.data;
}

function parcel(): Uint8Array {
  const p = tile();
  // Cardboard box.
  p.rect(2, 5, 12, 9, C.ink);
  p.rect(3, 6, 10, 7, C.woodLight);
  p.rect(3, 6, 10, 1, C.flameYellow);
  // String cross.
  p.rect(7, 5, 2, 9, C.ink);
  p.rect(2, 9, 12, 1, C.ink);
  // Knot.
  p.rect(6, 7, 4, 2, C.woodDark);
  p.set(8, 7, C.wood);
  return p.data;
}

function fireOff(): Uint8Array {
  const p = tile();
  // Ash bed.
  p.rect(4, 12, 8, 2, C.ink);
  p.rect(5, 12, 6, 1, C.glass);
  // Two crossed logs.
  p.grid(
    [
      "  ww            ",
      " wwwww          ",
      "wwwwwww         ",
    ].map((s) => s.padEnd(16).slice(0, 16)),
    { w: C.wood },
    1,
    7,
  );
  p.set(2, 7, C.woodDark);
  p.set(3, 8, C.woodDark);
  p.set(7, 9, C.woodDark);
  p.grid(
    [
      "         www    ",
      "        wwwww   ",
      "         www    ",
    ].map((s) => s.padEnd(16).slice(0, 16)),
    { w: C.woodLight },
    0,
    6,
  );
  p.set(9, 6, C.woodDark);
  p.set(12, 8, C.woodDark);
  return p.data;
}

function lampOff(): Uint8Array {
  const p = tile();
  // Post.
  p.rect(7, 7, 2, 9, C.wood);
  p.rect(7, 7, 1, 9, C.woodDark);
  p.rect(6, 15, 4, 1, C.ink);
  // Lantern hood.
  p.rect(5, 2, 6, 2, C.ink);
  p.rect(6, 2, 4, 1, C.redDark);
  // Dark glass housing.
  p.rect(5, 4, 6, 4, C.ink);
  p.rect(6, 5, 4, 2, C.glassDark);
  p.rect(5, 8, 6, 1, C.ink);
  return p.data;
}

// --- lighthouse (cells 4..13) ------------------------------------------------

function bandL(kind: "red" | "white"): Uint8Array {
  const p = tile();
  const main = kind === "red" ? C.red : C.white;
  const light = kind === "red" ? C.redLight : C.whiteShade;
  const dark = kind === "red" ? C.redDark : C.whiteShade;
  p.rect(0, 0, 16, 16, main);
  // Outer outline left, inner shade seam on the right edge.
  p.vline(0, 0, 16, C.ink);
  p.vline(15, 0, 16, kind === "red" ? C.redDark : C.whiteShade);
  p.rect(1, 0, 2, 16, light);
  if (kind === "red") {
    p.hline(2, 11, 12, dark);
    p.hline(1, 4, 13, C.redLight);
    p.set(10, 7, C.redDark);
  } else {
    p.hline(1, 12, 14, C.whiteShade);
    p.set(11, 6, C.whiteShade);
  }
  return p.data;
}

function bandR(kind: "red" | "white"): Uint8Array {
  const p = tile();
  const main = kind === "red" ? C.red : C.white;
  const light = kind === "red" ? C.redLight : C.white;
  p.rect(0, 0, 16, 16, main);
  p.vline(15, 0, 16, C.ink);
  p.vline(0, 0, 16, C.whiteShade);
  if (kind === "red") {
    p.hline(1, 11, 13, C.redDark);
    p.hline(0, 4, 14, C.redLight);
    p.set(4, 7, C.redDark);
  } else {
    p.hline(0, 12, 14, C.whiteShade);
    p.set(5, 5, C.whiteShade);
  }
  void light;
  return p.data;
}

function baseL(): Uint8Array {
  const p = tile();
  p.rect(0, 0, 16, 16, C.stone);
  p.vline(0, 0, 16, C.ink);
  p.vline(15, 0, 16, C.stoneDark);
  p.rect(1, 0, 2, 16, C.stoneLight);
  p.hline(0, 3, 16, C.stoneDark);
  p.hline(0, 10, 16, C.stoneDark);
  // Stone blocks.
  p.set(9, 6, C.stoneDark);
  p.set(4, 13, C.stoneDark);
  p.set(12, 13, C.stoneLight);
  return p.data;
}

function baseR(): Uint8Array {
  // Right base cell carries the dark door the keeper unlocks.
  const p = tile();
  p.rect(0, 0, 16, 16, C.stone);
  p.vline(15, 0, 16, C.ink);
  p.vline(0, 0, 16, C.stoneDark);
  p.hline(0, 3, 16, C.stoneDark);
  p.rect(0, 0, 2, 3, C.stoneLight);
  // Arched door (bottom center).
  p.rect(5, 7, 7, 9, C.ink);
  p.rect(6, 8, 5, 8, C.glassDark);
  p.set(6, 8, C.glass);
  p.set(10, 8, C.glass);
  p.set(6, 14, C.glass);
  p.set(10, 14, C.glass);
  return p.data;
}

function galleryL(): Uint8Array {
  const p = tile();
  // Railing with posts along the top.
  p.rect(0, 0, 16, 4, C.ink);
  p.rect(0, 1, 16, 1, C.stoneLight);
  p.rect(1, 0, 1, 1, C.stoneLight);
  p.rect(7, 0, 1, 1, C.stoneLight);
  p.rect(14, 0, 1, 1, C.stoneLight);
  // Platform slab.
  p.rect(0, 4, 16, 3, C.stone);
  p.hline(0, 4, 16, C.stoneLight);
  p.hline(0, 6, 16, C.stoneDark);
  p.vline(0, 4, 3, C.ink);
  // Red chamber rising behind, left half.
  p.rect(3, 7, 13, 9, C.red);
  p.vline(3, 7, 9, C.ink);
  p.rect(4, 7, 2, 9, C.redLight);
  p.hline(3, 11, 13, C.redDark);
  return p.data;
}

function galleryR(): Uint8Array {
  const p = tile();
  p.rect(0, 0, 16, 4, C.ink);
  p.rect(0, 1, 16, 1, C.stoneLight);
  p.rect(1, 0, 1, 1, C.stoneLight);
  p.rect(8, 0, 1, 1, C.stoneLight);
  p.rect(15, 0, 1, 1, C.stoneLight);
  p.rect(0, 4, 16, 3, C.stone);
  p.hline(0, 4, 16, C.stoneLight);
  p.hline(0, 6, 16, C.stoneDark);
  p.vline(15, 4, 3, C.ink);
  // Red chamber, right half; outline closes on the right edge.
  p.rect(0, 7, 12, 9, C.red);
  p.vline(15, 7, 9, C.ink);
  p.hline(0, 11, 13, C.redDark);
  p.rect(0, 7, 2, 9, C.red);
  return p.data;
}

function lamproomL(): Uint8Array {
  const p = tile();
  // Red cap over the chamber, left half of a shallow pyramid.
  p.rect(0, 0, 16, 3, C.red);
  p.vline(0, 0, 3, C.ink);
  p.hline(0, 0, 16, C.redLight);
  p.hline(0, 2, 16, C.redDark);
  // Glass chamber.
  p.rect(2, 3, 14, 12, C.ink);
  p.rect(3, 4, 13, 10, C.stoneDark);
  // Lit panes (the beacon overlay adds the flame).
  p.rect(4, 5, 11, 7, C.glass);
  p.vline(8, 5, 7, C.glassDark);
  p.vline(12, 5, 7, C.glassDark);
  p.rect(4, 5, 11, 1, C.waterLight);
  return p.data;
}

function lamproomR(): Uint8Array {
  const p = tile();
  p.rect(0, 0, 16, 3, C.red);
  p.vline(15, 0, 3, C.ink);
  p.hline(0, 0, 16, C.redLight);
  p.hline(0, 2, 16, C.redDark);
  p.rect(0, 3, 14, 12, C.ink);
  p.rect(0, 4, 13, 10, C.stoneDark);
  p.rect(0, 5, 12, 7, C.glass);
  p.vline(4, 5, 7, C.glassDark);
  p.vline(8, 5, 7, C.glassDark);
  p.rect(0, 5, 12, 1, C.waterLight);
  return p.data;
}

// --- atlases ------------------------------------------------------------------

function strip(cols: number, frame: (p: Pix, f: number) => void): Uint8Array {
  const p = new Pix(TILE * cols, TILE);
  for (let f = 0; f < cols; f++) {
    const fp = new Pix(TILE, TILE);
    frame(fp, f);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const si = (y * TILE + x) * 4;
        const di = (y * p.w + (f * TILE + x)) * 4;
        p.data.set(fp.data.subarray(si, si + 4), di);
      }
    }
  }
  return p.data;
}

function waterAtlas(): AnimAtlasSpec {
  return {
    step: 24,
    cols: 2,
    rgba: strip(2, (p, f) => {
      p.rect(0, 0, 16, 16, C.water);
      // Long light swells.
      p.hline(2, 3 + f * 2, 6, C.waterLight);
      p.hline(9, 11 - f * 2, 5, C.waterLight);
      p.hline(3, 13 - f, 4, C.waterLight);
      // White crests flip between frames.
      p.hline(11, 5 + f, 3, C.waterWhite);
      p.hline(2, 8 - f, 2, C.waterWhite);
      p.set(14, 2 + f, C.waterWhite);
      // Dark depth corners keep the tile readable against grass banks.
      p.set(0, 15, C.stoneDark);
      p.set(15, 0, C.stoneDark);
    }),
  };
}

function fireAtlas(): AnimAtlasSpec {
  return {
    step: 8,
    cols: 2,
    rgba: strip(2, (p, f) => {
      // Same logs as the unlit sprite.
      p.rect(4, 12, 8, 2, C.ink);
      p.rect(5, 12, 6, 1, C.glass);
      p.grid(["  ww            ", " wwwww          ", "wwwwwww         "].map((s) => s.slice(0, 16)), { w: C.wood }, 1, 7);
      p.set(2, 7, C.woodDark);
      p.grid(["         www    ", "        wwwww   ", "         www    "].map((s) => s.slice(0, 16)), { w: C.woodLight }, 0, 6);
      p.set(9, 6, C.woodDark);
      // Flames: frame 0 tall, frame 1 leans.
      const ox = f === 0 ? 0 : 1;
      const rows = f === 0
        ? [
            "      rr        ",
            "     rooor      ",
            "    oyyyyyo     ",
            "     yccy       ",
            "      cy        ",
          ]
        : [
            "       rr       ",
            "      rooor     ",
            "     oyyyyo     ",
            "      yccy      ",
            "       y        ",
          ];
      p.grid(
        rows.map((s) => s.slice(0, 16)),
        { r: C.flameRed, o: C.flameOrange, y: C.flameYellow, c: C.flameCream },
        ox - (f === 0 ? 0 : 0),
        2,
      );
    }),
  };
}

function lampAtlas(): AnimAtlasSpec {
  // Same post/hood as the unlit lamp; glass glows yellow and the light
  // pulses one pixel between frames.
  const frame = (p: Pix, f: number): void => {
    p.rect(7, 7, 2, 9, C.wood);
    p.rect(7, 7, 1, 9, C.woodDark);
    p.rect(6, 15, 4, 1, C.ink);
    p.rect(5, 2, 6, 2, C.ink);
    p.rect(6, 2, 4, 1, C.redDark);
    p.rect(5, 4, 6, 4, C.ink);
    // Glowing glass.
    p.rect(6, 5, 4, 2, C.flameYellow);
    p.set(7, 5, C.flameCream);
    p.set(8, 6, C.flameOrange);
    p.rect(5, 8, 6, 1, C.ink);
    if (f === 1) {
      p.set(5, 5, C.flameYellow);
      p.set(10, 6, C.flameCream);
    } else {
      p.set(10, 5, C.flameYellow);
      p.set(5, 6, C.flameCream);
    }
  };
  return { step: 22, cols: 2, rgba: strip(2, frame) };
}

function beaconAtlas(): AnimAtlasSpec {
  // The lighthouse beacon flame inside the lamp room; bright and quick.
  return {
    step: 10,
    cols: 2,
    rgba: strip(2, (p, f) => {
      const rows = f === 0
        ? [
            "    oyyyyo      ",
            "   oyCCCCyo     ",
            "   oyCCCCyo     ",
            "    oyyyyo      ",
            "     oyyo       ",
          ]
        : [
            "     oyyyo      ",
            "    oyCCCCo     ",
            "    oyCCCCo     ",
            "     oyyyyo     ",
            "      oyo       ",
          ];
      p.grid(
        rows.map((s) => s.slice(0, 16)),
        { o: C.flameOrange, y: C.flameYellow, C: C.flameCream },
        0,
        4,
      );
    }),
  };
}

export function makeCustomArt(): {
  cells: Record<number, Uint8Array>;
  atlases: Record<string, AnimAtlasSpec>;
} {
  return {
    cells: {
      [CUSTOM_GRASS_SPARSE]: grassSparse(),
      [CUSTOM_GRASS_FLOWER]: grassFlower(),
      [CUSTOM_MAILBOX]: mailbox(),
      [CUSTOM_PARCEL]: parcel(),
      [CUSTOM_TOWER_BASE_L]: baseL(),
      [CUSTOM_TOWER_BASE_R]: baseR(),
      [CUSTOM_TOWER_RED_L]: bandL("red"),
      [CUSTOM_TOWER_RED_R]: bandR("red"),
      [CUSTOM_TOWER_WHITE_L]: bandL("white"),
      [CUSTOM_TOWER_WHITE_R]: bandR("white"),
      [CUSTOM_TOWER_GALLERY_L]: galleryL(),
      [CUSTOM_TOWER_GALLERY_R]: galleryR(),
      [CUSTOM_TOWER_LAMPROOM_L]: lamproomL(),
      [CUSTOM_TOWER_LAMPROOM_R]: lamproomR(),
      [CUSTOM_FIRE_OFF]: fireOff(),
      [CUSTOM_LAMP_OFF]: lampOff(),
    },
    atlases: {
      water: waterAtlas(),
      fire: fireAtlas(),
      lamp: lampAtlas(),
      beacon: beaconAtlas(),
    },
  };
}
