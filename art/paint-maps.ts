// art/paint-maps.ts — paint a map with its art script; the blocked set comes
// from the same passage table the reducer uses, so scripts can ask where
// walls and trees are without re-deriving the rules.

import { buildPassage, canEnter } from "../vendor/pocket-rpgkit/src/engine/passability.ts";
import type { MapDef, Project, Sheet } from "../vendor/pocket-rpgkit/src/engine/types.ts";
import type { Img } from "./img.ts";
import { PAINTERS } from "./maps.ts";
import { Painter } from "./painter.ts";

const SEEDS: Record<string, number> = { hub: 0x41505031, farm: 0x41505032, mine: 0x41505033, pine: 0x41505034, light: 0x41505035 };

export function paintMap(project: Project, m: MapDef): { ground: Img; upper: Img } {
  const sheets = new Map<string, Sheet>(project.sheets.map((s) => [s.id, s]));
  const table = buildPassage(m, sheets);
  const blocked = new Set<number>();
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) if (!canEnter(table, x, y)) blocked.add(y * m.width + x);
  }
  const script = PAINTERS[m.id];
  if (!script) throw new Error(`art: no painter for map ${m.id}`);
  const p = new Painter(m, blocked, SEEDS[m.id] ?? 1);
  script(p);
  return { ground: p.ground, upper: p.upper };
}
