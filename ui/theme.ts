// ui/theme.ts — the panel colours, taken from the Ninja Adventure HUD
// (HUD/Dialog/DialogBox.png): a brown border, an orange rim, parchment
// fill, and dark ink. Every framed panel (dialog, choices, save menu,
// help) layers border -> rim -> paper with these.

export const PANEL = {
  border: "#965340",
  rim: "#ffad5d",
  paper: "#f2eaf1",
  ink: "#3b3643",
  dim: "#965340",
  accent: "#d14b34",
} as const;

/** "POSTMASTER: Storm took the road out." -> speaker + the spoken text.
 *  Only names that have a portrait count as speakers. */
export function splitSpeaker(line: string, known: Readonly<Record<string, string>>): { name: string | null; rest: string; cut: number } {
  const m = /^([A-Z][A-Z]+): /.exec(line);
  if (!m || !known[m[1]!]) return { name: null, rest: line, cut: 0 };
  return { name: m[1]!, rest: line.slice(m[0].length), cut: m[0].length };
}
