// art/img.ts — the few RGBA operations the art pipeline needs: load a PNG,
// crop, and composite with straight-alpha "over". Pure functions over
// Uint8Array; the PNG codec is the vendored PocketJS one, so every baked
// byte is reproducible.

import { readFileSync } from "node:fs";
import { decodePng } from "../vendor/pocket-rpgkit/vendor/pocketjs/framework/compiler/pak.ts";

export interface Img {
  width: number;
  height: number;
  rgba: Uint8Array;
}

export function newImg(width: number, height: number): Img {
  return { width, height, rgba: new Uint8Array(width * height * 4) };
}

export function loadImg(path: string): Img {
  const png = decodePng(new Uint8Array(readFileSync(path)));
  return { width: png.width, height: png.height, rgba: png.rgba };
}

export function crop(src: Img, sx: number, sy: number, sw: number, sh: number): Img {
  if (sx < 0 || sy < 0 || sx + sw > src.width || sy + sh > src.height) {
    throw new Error(`crop (${sx},${sy} ${sw}x${sh}) outside ${src.width}x${src.height}`);
  }
  const out = newImg(sw, sh);
  for (let y = 0; y < sh; y++) {
    const from = ((sy + y) * src.width + sx) * 4;
    out.rgba.set(src.rgba.subarray(from, from + sw * 4), y * sw * 4);
  }
  return out;
}

/** Composite `src` over `dst` at (dx,dy), clipping to dst. */
export function over(dst: Img, src: Img, dx: number, dy: number): void {
  for (let y = 0; y < src.height; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const sp = (y * src.width + x) * 4;
      const a = src.rgba[sp + 3]!;
      if (a === 0) continue;
      const dp = (ty * dst.width + tx) * 4;
      if (a === 255) {
        dst.rgba[dp] = src.rgba[sp]!;
        dst.rgba[dp + 1] = src.rgba[sp + 1]!;
        dst.rgba[dp + 2] = src.rgba[sp + 2]!;
        dst.rgba[dp + 3] = 255;
        continue;
      }
      const da = dst.rgba[dp + 3]!;
      const below = (da * (255 - a)) / 255;
      const outA = a + below;
      for (let k = 0; k < 3; k++) {
        dst.rgba[dp + k] = Math.round((src.rgba[sp + k]! * a + dst.rgba[dp + k]! * below) / outA);
      }
      dst.rgba[dp + 3] = Math.round(outA);
    }
  }
}

/** Per-pixel color transform (alpha untouched unless returned). */
export function mapPixels(src: Img, f: (r: number, g: number, b: number, a: number) => [number, number, number, number]): Img {
  const out = newImg(src.width, src.height);
  for (let i = 0; i < src.rgba.length; i += 4) {
    const [r, g, b, a] = f(src.rgba[i]!, src.rgba[i + 1]!, src.rgba[i + 2]!, src.rgba[i + 3]!);
    out.rgba[i] = r;
    out.rgba[i + 1] = g;
    out.rgba[i + 2] = b;
    out.rgba[i + 3] = a;
  }
  return out;
}

/** Horizontal mirror. */
export function flipX(src: Img): Img {
  const out = newImg(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const sp = (y * src.width + x) * 4;
      const dp = (y * src.width + (src.width - 1 - x)) * 4;
      out.rgba.set(src.rgba.subarray(sp, sp + 4), dp);
    }
  }
  return out;
}

/** Deterministic 32-bit hash of integers (cell variants without an RNG). */
export function hash(...ns: number[]): number {
  let h = 0x811c9dc5;
  for (const n of ns) {
    h ^= n & 0xffff;
    h = Math.imul(h, 0x01000193);
    h ^= n >>> 16;
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return h >>> 0;
}
