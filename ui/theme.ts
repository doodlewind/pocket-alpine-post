// ui/theme.ts — the panel colours, taken from the Ninja Adventure HUD
// (HUD/Dialog/DialogBox.png): a brown border, an orange rim, parchment
// fill, and dark ink. The kit's DialogBox, SaveMenu and Panel draw every
// framed panel (dialog, choices, save menu, help) border -> rim -> paper
// with these.

import type { UiTheme } from "../vendor/pocket-rpgkit/src/ui/theme.ts";

export const PANEL = {
  border: "#965340",
  rim: "#ffad5d",
  paper: "#f2eaf1",
  ink: "#3b3643",
  dim: "#965340",
  accent: "#d14b34",
} as const satisfies Partial<UiTheme>;
