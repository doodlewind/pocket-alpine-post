// tests/scaffold.test.ts — S1 gate for the Alpine Post app:
// the built alpine-post bundle boots the sim host, the shared session
// reducer drives the live view, the dialog opens on confirm, START reaches
// the save menu, save-code export/import round-trips through the hooks, and
// two runs of the same tape are byte-identical.

import { describe, expect, test } from "bun:test";
import { bootWorld, fnv1a, type SimWorld } from "../vendor/pocket-rpgkit/vendor/pocketjs/hosts/sim/sim.ts";
import { BTN } from "../vendor/pocket-rpgkit/vendor/pocketjs/contracts/spec/spec.ts";
import type { SessionState } from "../vendor/pocket-rpgkit/src/engine/session.ts";
import type { MenuState } from "../vendor/pocket-rpgkit/src/engine/save-menu.ts";
import { appBundle, appPreflight } from "./helpers/boot.ts";

// Without the built bundle/wasm these host tests cannot boot; register
// them as skips with the build command printed once.
const preflight = appPreflight();
if (!preflight.ok) console.warn(`scaffold sim tests skipped: ${preflight.reason}`);
const simDescribe = preflight.ok ? describe : describe.skip;

interface Hooks {
  hasFs: () => boolean;
  canSave: () => boolean;
  snapshot: () => unknown;
  restore: (snap: unknown) => void;
  saveSlot: (slot: number) => void;
  loadSlot: (slot: number) => unknown;
  encodeCode: () => string;
  decodeCode: (code: string) => unknown;
  menu: () => MenuState;
  slots: () => unknown[];
}

async function boot(): Promise<{ world: SimWorld; state: () => SessionState; hooks: () => Hooks }> {
  const world = await bootWorld(appBundle(), 60);
  world.frame(0, 0x8080);
  world.tick();
  const g = globalThis as unknown as { __alpineState?: SessionState; __alpineSession?: Hooks };
  return {
    world,
    state: () => g.__alpineState!,
    hooks: () => {
      if (!g.__alpineSession) throw new Error("alpine-post: session hooks missing");
      return g.__alpineSession;
    },
  };
}

simDescribe("alpine-post scaffold — built bundle boots the session", () => {
  test("starts on the hub at the authored start tile facing up", async () => {
    const { state } = await boot();
    expect(state().mapId).toBe("hub");
    expect([state().move.tx, state().move.ty]).toEqual([12, 12]);
    expect(state().move.facing).toBe(2);
  });

  test("confirm on the adjacent postmaster opens and closes his dialog", async () => {
    const { world, state } = await boot();
    // Walk north two tiles through the door to (12,10), directly below
    // the blocking postmaster at (12,9).
    for (let i = 0; i < 20; i++) world.frame(BTN.UP, 0x8080), world.tick();
    expect([state().move.tx, state().move.ty]).toEqual([12, 10]);
    expect(state().interp.main).toBeNull();
    world.frame(BTN.CIRCLE, 0x8080);
    world.tick();
    expect(state().interp.modal?.kind).toBe("text");
    // Pulse confirm until the box closes.
    for (let i = 0; i < 60; i++) {
      world.frame(i % 2 === 0 ? BTN.CIRCLE : 0, 0x8080);
      world.tick();
      if (state().interp.modal === null && state().interp.main === null) break;
    }
    expect(state().interp.modal).toBeNull();
    expect(state().interp.main).toBeNull();
  });

  test("START opens the save menu at a safe point and closes again", async () => {
    const { world, hooks } = await boot();
    world.frame(0, 0x8080);
    world.tick();
    expect(hooks().menu().kind).toBe("closed");
    world.frame(BTN.START, 0x8080);
    world.tick();
    expect(hooks().menu().kind).toBe("root");
    // The sim mounts no fs: root offers the two code rows only.
    world.frame(0, 0x8080);
    world.tick();
    world.frame(BTN.START, 0x8080);
    world.tick();
    expect(hooks().menu().kind).toBe("closed");
  });

  test("save code export -> import restores the exact position across boots", async () => {
    const a = await boot();
    for (let i = 0; i < 8; i++) a.world.frame(BTN.LEFT, 0x8080), a.world.tick();
    for (let i = 0; i < 4; i++) a.world.frame(0, 0x8080), a.world.tick();
    const before = a.state().move;
    const code = a.hooks().encodeCode();
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);

    const b = await boot();
    b.hooks().decodeCode(code);
    const after = b.state().move;
    expect([after.tx, after.ty]).toEqual([before.tx, before.ty]);
    expect(after.px).toBe(before.px);
  });

  test("a fixed tape replays byte-identically across two boots", async () => {
    const tape = [
      ...Array<number>(8).fill(BTN.LEFT),
      ...Array<number>(8).fill(BTN.UP),
      ...Array<number>(8).fill(BTN.RIGHT),
      ...Array<number>(8).fill(0),
    ];
    const run = async (): Promise<string[]> => {
      const { world } = await boot();
      const hashes: string[] = [];
      for (const mask of tape) {
        world.frame(mask, 0x8080);
        world.tick();
        hashes.push(fnv1a(world.render()));
      }
      return hashes;
    };
    expect(await run()).toEqual(await run());
  });
});
