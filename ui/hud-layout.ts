export interface HudRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Shared layout facts keep the built-bundle acceptance test tied to the
// same rectangles and colors the view renders. The notice starts below the
// HELP plate, and its opaque text is a sibling of the translucent backdrop.
export const ALPINE_HELP_PLATE_RECT: Readonly<HudRect> = {
  x: 207,
  y: 6,
  width: 66,
  height: 18,
};
export const ALPINE_CONTROL_PLATE_RECT: Readonly<HudRect> = {
  x: 154,
  y: 30,
  width: 172,
  height: 24,
};
export const ALPINE_CONTROL_TEXT_RECT: Readonly<HudRect> = {
  x: 169,
  y: 33,
  width: 142,
  height: 18,
};
export const ALPINE_CONTROL_PLATE_COLOR = "#1a1208";
export const ALPINE_CONTROL_PLATE_OPACITY = 0.9;
export const ALPINE_CONTROL_TEXT_COLOR = "#ffd961";
