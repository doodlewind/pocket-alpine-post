// Built-bundle acceptance for Alpine Post's optional desktop pointer path.
// The injected mailbox has the same batched JSON-lines shape as the native
// desktop host, while an ordinary boot proves keyboard-only degradation.

import { describe, expect, test } from "bun:test";
import { BTN } from "../vendor/pocket-rpgkit/vendor/pocketjs/contracts/spec/spec.ts";
import { bootWorld, type SimWorld } from "../vendor/pocket-rpgkit/vendor/pocketjs/hosts/sim/sim.ts";
import { createSimFsHost } from "../vendor/pocket-rpgkit/vendor/pocketjs/hosts/sim/fs.ts";
import type { SessionState } from "../vendor/pocket-rpgkit/src/engine/session.ts";
import type { MenuState } from "../vendor/pocket-rpgkit/src/engine/save-menu.ts";
import type { AttractStatus } from "../vendor/pocket-rpgkit/src/engine/attract.ts";
import type { PointerMarker } from "../ui/GameView.tsx";
import {
  ALPINE_CONTROL_PLATE_COLOR,
  ALPINE_CONTROL_PLATE_OPACITY,
  ALPINE_CONTROL_PLATE_RECT,
  ALPINE_CONTROL_TEXT_COLOR,
  ALPINE_CONTROL_TEXT_RECT,
  ALPINE_HELP_PLATE_RECT,
  type HudRect,
} from "../ui/hud-layout.ts";
import { expandRuns } from "../game/journey.ts";
import { ALPINE_TAPE_RUNS } from "../game/demo-tape.ts";
import { encodePNG } from "../vendor/pocket-rpgkit/vendor/pocketjs/tests/png.ts";
import { appBundle, appPreflight } from "./helpers/boot.ts";

// Without the built bundle/wasm these host tests cannot boot; register
// them as skips with the build command printed once.
const preflight = appPreflight();
if (!preflight.ok) console.warn(`pointer sim tests skipped: ${preflight.reason}`);
const simDescribe = preflight.ok ? describe : describe.skip;

interface Hooks {
  attract(): AttractStatus;
  menu(): MenuState;
  pointer(): {
    connected: boolean;
    route: { x: number; y: number } | null;
    marker: PointerMarker | null;
    help: boolean;
  };
}

interface PointerBoot {
  world: SimWorld;
  state(): SessionState;
  hooks(): Hooks;
  click(x: number, y: number): void;
  mouse(x: number, y: number, down: boolean): void;
  key(name: string): void;
  frame(buttons?: number): void;
}

const CAPTURE_DIR = process.env.ALPINE_POINTER_CAPTURE;

async function capture(app: PointerBoot, name: string): Promise<void> {
  if (!CAPTURE_DIR) return;
  await Bun.write(`${CAPTURE_DIR}/${name}.png`, encodePNG(app.world.render(), 480, 272));
}

async function bootPointer(withFs = false): Promise<PointerBoot> {
  const batches: string[] = [];
  const fs = withFs ? createSimFsHost() : null;
  const world = await bootWorld(
    appBundle(),
    60,
    fs ? { fs: fs.ns } : undefined,
    (ops) => {
      ops.svcOpen = (name: string) => name === "alpine-post";
      ops.svcPoll = () => batches.shift();
    },
  );
  const g = globalThis as unknown as { __alpineState?: SessionState; __alpineSession?: Hooks };
  const frame = (buttons = 0): void => {
    world.frame(buttons, 0x8080);
    for (let i = 0; i < world.ticksPerFrame; i++) world.tick();
  };
  const click = (x: number, y: number): void => {
    batches.push(
      JSON.stringify({ t: "mouse", x, y, d: true, b: 0 }) + "\n" +
      JSON.stringify({ t: "mouse", x, y, d: false, b: 0 }) + "\n",
    );
  };
  const mouse = (x: number, y: number, down: boolean): void => {
    batches.push(JSON.stringify({ t: "mouse", x, y, d: down, b: 0 }) + "\n");
  };
  const key = (name: string): void => {
    batches.push(JSON.stringify({ t: "key", k: name }) + "\n");
  };
  frame();
  return {
    world,
    state: () => g.__alpineState!,
    hooks: () => {
      if (!g.__alpineSession) throw new Error("alpine-post pointer hooks missing");
      return g.__alpineSession;
    },
    click,
    mouse,
    key,
    frame,
  };
}

function pixels(
  rgba: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  match: (r: number, g: number, b: number) => boolean,
): number {
  let found = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * 480 + x) * 4;
      if (match(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!)) found++;
    }
  }
  return found;
}

const CYAN = (r: number, g: number, b: number): boolean => r < 130 && g > 190 && b > 210;
const RED = (r: number, g: number, b: number): boolean => r > 210 && g < 150 && b < 140;
const GOLD = (r: number, g: number, b: number): boolean => r > 175 && g > 140 && b < 125;
const DARK = (r: number, g: number, b: number): boolean => r < 90 && g < 80 && b < 70;
// Panel theme (ui/theme.ts): parchment paper, dark ink, red-orange accent.
const PAPER = (r: number, g: number, b: number): boolean => r > 230 && g > 222 && b > 230;
const INK = (r: number, g: number, b: number): boolean => r < 75 && g < 70 && b < 80;
const ACCENT = (r: number, g: number, b: number): boolean => r > 180 && g < 110 && b < 90;

function intersects(a: HudRect, b: HudRect): boolean {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function contains(outer: HudRect, inner: HudRect): boolean {
  return inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height;
}

function rgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function luminance([r8, g8, b8]: readonly number[]): number {
  const linear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r8!) + 0.7152 * linear(g8!) + 0.0722 * linear(b8!);
}

function contrast(a: readonly number[], b: readonly number[]): number {
  const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (bright! + 0.05) / (dark! + 0.05);
}

function overWhite(color: string, opacity: number): [number, number, number] {
  return rgb(color).map((channel) => Math.round(channel * opacity + 255 * (1 - opacity))) as [number, number, number];
}

simDescribe("Alpine Post pointer — built bundle", () => {
  test("takeover notice has a high-contrast plate clear of the HELP plate", async () => {
    expect(intersects(ALPINE_CONTROL_PLATE_RECT, ALPINE_HELP_PLATE_RECT)).toBe(false);
    expect(contains(ALPINE_CONTROL_PLATE_RECT, ALPINE_CONTROL_TEXT_RECT)).toBe(true);
    // White is the brightest possible scene pixel behind the translucent
    // plate, so this is the notice's lowest text/background contrast.
    expect(contrast(rgb(ALPINE_CONTROL_TEXT_COLOR), overWhite(ALPINE_CONTROL_PLATE_COLOR, ALPINE_CONTROL_PLATE_OPACITY))).toBeGreaterThanOrEqual(4.5);

    const app = await bootPointer();
    app.frame(BTN.SELECT);
    app.frame();
    expect(app.hooks().attract().phase).toBe("attract");
    app.frame(BTN.RTRIGGER);
    app.frame();
    expect(app.hooks().attract().phase).toBe("play");
    await capture(app, "takeover-notice");
    const { x, y, width, height } = ALPINE_CONTROL_PLATE_RECT;
    expect(pixels(app.world.render(), x, y, x + width, y + height, DARK)).toBeGreaterThan(2500);
    expect(pixels(app.world.render(), x, y, x + width, y + height, GOLD)).toBeGreaterThan(20);
  });

  test("map click follows a passable route and paints target/rejection feedback", async () => {
    const app = await bootPointer();
    expect(app.hooks().pointer().connected).toBe(true);

    // Hub (24x15) is centered at (48,16). Tile (13,12) begins at (256,208).
    app.click(264, 216);
    app.frame();
    expect(app.hooks().pointer().route).toEqual({ x: 13, y: 12 });
    expect(pixels(app.world.render(), 256, 208, 272, 224, CYAN)).toBeGreaterThan(30);
    await capture(app, "pointer-walk");
    for (let i = 0; i < 10; i++) app.frame();
    expect([app.state().move.tx, app.state().move.ty]).toEqual([13, 12]);
    expect(app.hooks().pointer().route).toBeNull();

    // Building wall tile (9,12) is not reachable. It gets a red visible
    // marker and the reducer state stays on the accepted destination.
    app.click(200, 216);
    app.frame();
    expect(app.hooks().pointer().marker?.kind).toBe("rejected");
    expect(pixels(app.world.render(), 192, 208, 208, 224, RED)).toBeGreaterThan(30);
    await capture(app, "pointer-rejected");
    expect([app.state().move.tx, app.state().move.ty]).toEqual([13, 12]);
  });

  test("dialog click advances text and a visible choice row selects", async () => {
    const textApp = await bootPointer();
    for (let i = 0; i < 20; i++) textApp.frame(BTN.UP);
    textApp.frame();
    textApp.frame(BTN.CIRCLE);
    textApp.frame();
    expect(textApp.state().interp.modal?.kind).toBe("text");
    // The visible parchment panel itself is the hit region; text is still
    // at the typewriter's first frame here.
    expect(pixels(textApp.world.render(), 20, 192, 460, 264, PAPER)).toBeGreaterThan(2500);
    textApp.click(240, 220);
    textApp.frame();
    textApp.frame();
    const afterClick = textApp.state().interp.modal;
    expect(afterClick?.kind).toBe("text");
    expect(afterClick?.kind === "text" && afterClick.complete).toBe(true);
    await capture(textApp, "pointer-dialog");

    const app = await bootPointer();
    const tape = expandRuns(ALPINE_TAPE_RUNS);
    for (let i = 0; i <= 335; i++) app.frame(tape[i]!);
    expect(app.state().interp.modal?.kind).toBe("choices");
    expect(pixels(app.world.render(), 236, 104, 430, 164, INK)).toBeGreaterThan(8);
    await capture(app, "pointer-choice");

    // Press row 2 ("Hot soup") and hold: the press moves the cursor but
    // never confirms while the primary button remains down.
    app.mouse(300, 125, true);
    for (let i = 0; i < 60; i++) app.frame();
    const selected = app.state().interp.modal;
    expect(selected?.kind).toBe("choices");
    expect(selected?.kind === "choices" ? selected.options[selected.index] : "").toContain("Hot soup");
    expect(pixels(app.world.render(), 236, 118, 430, 134, ACCENT)).toBeGreaterThan(8);
    await capture(app, "pointer-hot-soup-held");

    // Release over the row confirms the held selection.
    app.mouse(300, 125, false);
    for (let i = 0; i < 3; i++) app.frame();
    const modal = app.state().interp.modal;
    expect(modal?.kind).toBe("text");
    expect(modal?.kind === "text" ? modal.lines.join(" ") : "").toContain("Still steaming");
    expect(app.state().sw.items.soup).toBe(1);
  });

  for (const held of [1, 3, 4, 10, 60]) {
    test(`choice release confirms its row after ${held} held frame(s)`, async () => {
      const app = await bootPointer();
      const tape = expandRuns(ALPINE_TAPE_RUNS);
      for (let i = 0; i <= 335; i++) app.frame(tape[i]!);
      expect(app.state().interp.modal?.kind).toBe("choices");

      app.mouse(300, 125, true);
      for (let i = 0; i < held; i++) {
        app.frame();
        expect(app.state().interp.modal?.kind, `held frame ${i}`).toBe("choices");
      }
      app.mouse(300, 139, false);
      for (let i = 0; i < 12; i++) app.frame();

      const modal = app.state().interp.modal;
      expect(modal?.kind).toBe("text");
      expect(modal?.kind === "text" ? modal.lines.join(" ") : "").toContain("First-class ink");
      expect(app.state().sw.items.stamp).toBe(1);
      expect(app.state().sw.items.soup).toBeUndefined();
    });
  }

  for (const held of [1, 3, 4, 10, 60]) {
    test(`choice drag-out cancels after ${held} held frame(s)`, async () => {
      const app = await bootPointer();
      const tape = expandRuns(ALPINE_TAPE_RUNS);
      for (let i = 0; i <= 335; i++) app.frame(tape[i]!);
      app.mouse(300, 125, true);
      for (let i = 0; i < held; i++) app.frame();
      app.mouse(40, 40, false);
      for (let i = 0; i < 12; i++) app.frame();
      expect(app.state().interp.modal?.kind).toBe("choices");
      expect(app.state().sw.items.stamp).toBeUndefined();
      expect(app.state().sw.items.soup).toBeUndefined();
    });
  }

  test("save-menu rows are visible and click through menuStep", async () => {
    const app = await bootPointer(true);
    app.frame(BTN.START);
    app.frame();
    expect(app.hooks().menu().kind).toBe("root");
    expect(pixels(app.world.render(), 40, 54, 220, 74, ACCENT)).toBeGreaterThan(3);
    await capture(app, "pointer-save-menu");

    app.click(100, 60); // Save to slot
    app.frame();
    expect(app.hooks().menu().kind).toBe("slots-save");
    expect(pixels(app.world.render(), 40, 54, 220, 120, INK)).toBeGreaterThan(20);

    app.click(100, 80); // Slot 2
    app.frame();
    expect(app.hooks().menu().kind).toBe("message");
    expect((app.hooks().menu() as Extract<MenuState, { kind: "message" }>).title).toContain("SLOT 2");
  });

  test("no service silently keeps keyboard movement and dialog input", async () => {
    const world = await bootWorld(appBundle(), 60);
    const g = globalThis as unknown as { __alpineState?: SessionState; __alpineSession?: Hooks };
    world.frame(0, 0x8080);
    world.tick();
    expect(g.__alpineSession!.pointer().connected).toBe(false);
    world.frame(BTN.SQUARE, 0x8080);
    world.tick();
    expect(g.__alpineSession!.pointer().help).toBe(true);
    expect(pixels(world.render(), 40, 45, 340, 190, INK)).toBeGreaterThan(80);
    if (CAPTURE_DIR) await Bun.write(`${CAPTURE_DIR}/keyboard-help.png`, encodePNG(world.render(), 480, 272));
    world.frame(0, 0x8080);
    world.tick();
    world.frame(BTN.TRIANGLE, 0x8080);
    world.tick();
    expect(g.__alpineSession!.pointer().help).toBe(false);
    world.frame(0, 0x8080);
    world.tick();
    for (let i = 0; i < 20; i++) world.frame(BTN.UP, 0x8080), world.tick();
    expect([g.__alpineState!.move.tx, g.__alpineState!.move.ty]).toEqual([12, 10]);
    world.frame(0, 0x8080);
    world.tick();
    world.frame(BTN.CIRCLE, 0x8080);
    world.tick();
    expect(g.__alpineState!.interp.modal?.kind).toBe("text");
  });

  test("desktop Z/Enter confirm and X/Backspace cancel at the app boundary", async () => {
    const app = await bootPointer();
    for (let i = 0; i < 20; i++) app.frame(BTN.UP);
    app.frame();
    app.key("z");
    app.frame(BTN.CROSS); // raw host bit from hosts/desktop/src/buttons.rs
    app.frame();
    expect(app.state().interp.modal?.kind).toBe("text");

    // At a safe point, raw CIRCLE from X/Backspace must become the app's
    // cancel intent and close the save root rather than confirm its row.
    const menuApp = await bootPointer();
    menuApp.frame(BTN.START);
    menuApp.frame();
    expect(menuApp.hooks().menu().kind).toBe("root");
    menuApp.key("backspace");
    menuApp.frame(BTN.CIRCLE);
    menuApp.frame();
    expect(menuApp.hooks().menu().kind).toBe("closed");
  });
});
