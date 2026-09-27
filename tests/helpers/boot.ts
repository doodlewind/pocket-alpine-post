// tests/helpers/boot.ts — where the built game lives for the sim tests.
//
// The vendored PocketJS sim host (hosts/sim/sim.ts bootWorld) boots an
// external project's bundle by absolute path: tools/build.ts writes
// dist/alpine-post.js and .pak, and appBundle() names them without the
// extension. appPreflight() lets a sim suite register as skipped, with the
// build command printed, before anything is built.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DIST = join(ROOT, "dist");
const WASM_PATH = join(ROOT, "vendor", "pocket-rpgkit", "vendor", "pocketjs", "hosts", "web", "pocketjs.wasm");

/** Absolute bundle path (no extension) for bootWorld. */
export function appBundle(): string {
  return join(DIST, "alpine-post");
}

export function appPreflight(): { ok: true } | { ok: false; reason: string } {
  const bundle = `${appBundle()}.js`;
  if (!existsSync(bundle)) return { ok: false, reason: `missing ${bundle} — run \`bun run build\`` };
  if (!existsSync(WASM_PATH)) return { ok: false, reason: `missing ${WASM_PATH} — run \`bun run build:wasm\`` };
  return { ok: true };
}
