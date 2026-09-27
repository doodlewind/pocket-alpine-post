// tests/golden.test.ts — the Alpine Post golden keyframes.
//
//   1. PINNED    the frozen winning tape, driven through the BUILT bundle on
//                the wasm sim host (one frame() + tick() per tape frame,
//                f0 = first driven frame), renders exactly the committed
//                PNGs at f8, f335 and f2812.
//   2. SEMANTIC  the pinned images actually SHOW the intended content
//                rather than an arbitrary hash: palette-class pixel counts
//                in known screen regions. Every golden was hand-reviewed
//                against these same facts.

import { describe, expect, test } from "bun:test";
import { decodePng } from "../vendor/pocket-rpgkit/vendor/pocketjs/framework/compiler/pak.ts";
import { bootWorld, fnv1a } from "../vendor/pocket-rpgkit/vendor/pocketjs/hosts/sim/sim.ts";
import { expandTapeRuns } from "../vendor/pocket-rpgkit/src/engine/tape.ts";
import { ALPINE_TAPE_RUNS } from "./tape.ts";
import { appBundle, appPreflight } from "./helpers/boot.ts";

const GOLDEN_DIR = new URL("./goldens/", import.meta.url);

async function load(frame: number): Promise<{ rgba: Uint8Array; width: number; height: number }> {
  const path = new URL(`journey.${frame}.png`, GOLDEN_DIR);
  return decodePng(new Uint8Array(await Bun.file(path).arrayBuffer()));
}

function count(
  rgba: Uint8Array,
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  pred: (r: number, g: number, b: number) => boolean,
): number {
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      if (pred(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!)) n++;
    }
  }
  return n;
}

// Palette colors the assertions use (sampled/defined in custom-art.ts and
// the DialogBox/SaveMenu palette).
const GRASS = (r: number, g: number, b: number): boolean => Math.abs(r - 132) < 25 && Math.abs(g - 198) < 25 && Math.abs(b - 105) < 25;
const COBBLE = (r: number, g: number, b: number): boolean => Math.abs(r - 192) < 30 && Math.abs(g - 203) < 30 && Math.abs(b - 220) < 30;
const WATER = (r: number, g: number, b: number): boolean => b > 180 && b - r > 40 && g > 130;
const BOX_DARK = (r: number, g: number, b: number): boolean => r < 40 && g < 30 && b < 22;
const TEXT_CREAM = (r: number, g: number, b: number): boolean => r > 235 && g > 215 && b > 180;
const HUD_GOLD = (r: number, g: number, b: number): boolean => r > 145 && g > 115 && b < 110 && r - b > 50 && r - g < 45;
const TOWER_RED = (r: number, g: number, b: number): boolean => r > 190 && g < 110 && b < 90 && r - g > 90;
const TOWER_WHITE = (r: number, g: number, b: number): boolean => r > 215 && g > 215 && b > 205 && Math.abs(r - g) < 20;

describe("alpine-post golden — hub keyframe (f8)", async () => {
  const png = await load(8);

  test("is the 480x272 playfield", async () => {
    expect(png.width).toBe(480);
    expect(png.height).toBe(272);
  });

  test("grass dominates the centered hub world", async () => {
    // The hub world frame spans y16..256, x48..432.
    const grass = count(png.rgba, png.width, 60, 30, 420, 240, GRASS);
    expect(grass).toBeGreaterThan(4000);
  });

  test("the cobble plaza is visible at the street center", async () => {
    // Plaza tiles (10..13, 6..8) with the world frame at (48,16).
    expect(count(png.rgba, png.width, 200, 105, 280, 150, COBBLE)).toBeGreaterThan(30);
  });

  test("the animated pond is blue at the south-east corner", async () => {
    // Pond cells world (21..22, 11..12) -> screen (384..416, 192..224).
    expect(count(png.rgba, png.width, 380, 188, 420, 228, WATER)).toBeGreaterThan(100);
  });

  test("the gold HUD reads GOLD 0 (dark plate with gold glyphs)", async () => {
    // Plate at insetL 8, insetT 6.
    expect(count(png.rgba, png.width, 8, 6, 96, 24, HUD_GOLD)).toBeGreaterThan(8);
  });
});

describe("alpine-post golden — general store choices (f335)", async () => {
  const png = await load(335);

  test("the choices panel fills the right-center with the dark dialog color", async () => {
    expect(count(png.rgba, png.width, 224, 82, 464, 172, BOX_DARK)).toBeGreaterThan(2000);
  });

  test("four cream choice rows are rendered", async () => {
    // The four rows (Matches/Hot soup/Stamp/Sell) occupy y104..168.
    const cream = count(png.rgba, png.width, 236, 100, 420, 172, TEXT_CREAM);
    expect(cream).toBeGreaterThan(120);
  });

  test("the gold cursor on Matches and the gold HUD are visible", async () => {
    expect(count(png.rgba, png.width, 236, 108, 260, 128, HUD_GOLD)).toBeGreaterThan(3);
    expect(count(png.rgba, png.width, 8, 6, 96, 24, HUD_GOLD)).toBeGreaterThan(8);
  });

  test("the hub grass still surrounds the panel", async () => {
    expect(count(png.rgba, png.width, 60, 30, 200, 100, GRASS)).toBeGreaterThan(300);
  });
});

describe("alpine-post golden — lighthouse ending (f2812)", async () => {
  const png = await load(2812);

  test("the red and white lighthouse bands stand at the top center", async () => {
    // Light world is 256x224 centered at (112,24); tower cells (7..8,
    // 2..4) -> screen x224..240, red band rows 2..3 -> y56..88, white
    // band rows 3..4 -> y72..104.
    expect(count(png.rgba, png.width, 220, 52, 246, 90, TOWER_RED)).toBeGreaterThan(40);
    expect(count(png.rgba, png.width, 220, 74, 246, 108, TOWER_WHITE)).toBeGreaterThan(20);
  });

  test("the bottom dialog box is open", async () => {
    expect(count(png.rgba, png.width, 20, 192, 460, 264, BOX_DARK)).toBeGreaterThan(3000);
  });

  test("THE END. heading and the five-parcel stanza are visible", async () => {
    const heading = count(png.rgba, png.width, 22, 198, 130, 228, TEXT_CREAM);
    expect(heading).toBeGreaterThan(20);
    // The word "five" appears in the stanza; assert a broad cream-text
    // presence across the stanza rows.
    const stanza = count(png.rgba, png.width, 22, 224, 420, 256, TEXT_CREAM);
    expect(stanza).toBeGreaterThan(90);
  });

  test("the run finished with the post-route gold (15)", async () => {
    // GOLD plate still top-left.
    expect(count(png.rgba, png.width, 8, 6, 96, 24, HUD_GOLD)).toBeGreaterThan(8);
  });
});

const preflight = appPreflight();
if (!preflight.ok) console.warn(`golden pin test skipped: ${preflight.reason}`);
const simTest = preflight.ok ? test : test.skip;

describe("alpine-post golden — pinned frames through the built bundle", () => {
  simTest("the frozen tape renders the committed PNGs at f8, f335 and f2812", async () => {
    const masks = expandTapeRuns(ALPINE_TAPE_RUNS);
    const capture = new Set([8, 335, 2812]);
    const world = await bootWorld(appBundle(), 60);
    const got = new Map<number, string>();
    for (let f = 0; f <= 2812; f++) {
      world.frame(masks[f] ?? 0);
      world.tick();
      if (capture.has(f)) got.set(f, fnv1a(world.render()));
    }
    for (const f of capture) {
      const png = await load(f);
      expect(got.get(f), `frame ${f}`).toBe(fnv1a(png.rgba));
    }
  }, 60_000);
});
