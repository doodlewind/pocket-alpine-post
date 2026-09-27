// tools/build.ts — build Alpine Post against the PocketJS the kit pins
// (vendor/pocket-rpgkit/vendor/pocketjs). External-project invocation:
//
//   bun tools/build.ts        ->  dist/alpine-post.js + dist/alpine-post.pak
//
// Pass 1 resolves @pocketjs/framework/* into the vendored framework and
// walks every RELATIVE import from the entry, so the kit's engine modules
// (vendor/pocket-rpgkit/src/engine) are transformed with the game.
// images.json and sprites.json are read from the entry's directory (the
// repository root). Outputs land in this repo's dist/.

import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
mkdirSync(join(root, "dist"), { recursive: true });

const buildTs = join(root, "vendor", "pocket-rpgkit", "vendor", "pocketjs", "tools", "build.ts");
const proc = Bun.spawn({
  cmd: [process.execPath, buildTs, join(root, "alpine-post.tsx"), `--project-root=${root}`, `--outdir=${join(root, "dist")}`],
  cwd: root,
  stdio: ["inherit", "inherit", "inherit"],
});
const exit = await proc.exited;
if (exit !== 0) process.exit(exit);
