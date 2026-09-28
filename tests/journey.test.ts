// tests/journey.test.ts — S4 deterministic journey gate for
// Alpine Post:
//   1. the adaptive 60 Hz driver re-derives the frozen RLE tape exactly
//   2. the same JOURNEY in virtual time reaches identical milestones at
//      60/30/20/4 Hz (state) — including dialog text (the typewriter is
//      virtual-time portable)
//   3. replaying the frozen tape against the BUILT bundle twice yields
//      byte-identical per-frame hashes and states, and bundle states
//      match the pure driver at every milestone
//   4. save -> diverge -> load -> replay gives identical states
//      (worldline), and a zero-divergence save/load gives identical
//      framebuffers
//   5. per-frame guest op peak stays at the rpgkit budget (a transfer
//      burst is bounded; steady walking is one setPropBatch)

import { describe, expect, test } from "bun:test";
import { bootWorld, fnv1a } from "../vendor/pocket-rpgkit/vendor/pocketjs/hosts/sim/sim.ts";
import { createSimFsHost } from "../vendor/pocket-rpgkit/vendor/pocketjs/hosts/sim/fs.ts";
import type { SessionState } from "../vendor/pocket-rpgkit/src/engine/session.ts";
import { canSave } from "../vendor/pocket-rpgkit/src/engine/save.ts";
import {
  Driver,
  expandRuns,
  playWinningRun,
  runsFromMasks,
  type MilestoneSnapshot,
} from "../game/journey.ts";
import { ALPINE_TAPE_FRAMES, ALPINE_TAPE_RUNS, ALPINE_MILESTONES } from "./tape.ts";
import { appBundle, appPreflight } from "./helpers/boot.ts";

// Without the built bundle/wasm these host tests cannot boot; register
// them as skips with the build command printed once.
const preflight = appPreflight();
if (!preflight.ok) console.warn(`journey sim tests skipped: ${preflight.reason}`);
const simDescribe = preflight.ok ? describe : describe.skip;

const RATES = [60, 30, 20, 4] as const;

describe("alpine-post journey — frozen tape", () => {
  test("playWinningRun(60) re-derives the committed runs", () => {
    const r = playWinningRun(60);
    expect(runsFromMasks(r.masks) as [number, number][]).toEqual([...ALPINE_TAPE_RUNS] as [number, number][]);
    expect(r.endFrame).toBe(ALPINE_TAPE_FRAMES);
  });

  test("milestones match the freeze (three letters gone, five parcels, beacon on)", () => {
    for (const [name, want] of Object.entries(ALPINE_MILESTONES)) {
      expect(playWinningRun(60).milestones[name]).toEqual(want);
    }
    const end = ALPINE_MILESTONES.end;
    expect(end.mapId).toBe("light");
    expect(end.variables.parcels).toBe(5);
    expect(end.switches["lamp-ready"]).toBe(true);
    expect(end.switches["door-open"]).toBe(true);
    expect(end.switches["farmer-done"]).toBe(true);
    expect(end.switches["miner-done"]).toBe(true);
    expect(end.switches["bridge-fixed"]).toBe(true);
    expect(end.switches["keeper-done"]).toBe(true);
    expect(end.items["letter-farmer"] ?? 0).toBe(0);
    expect(end.items["letter-miner"] ?? 0).toBe(0);
    expect(end.items["letter-keeper"] ?? 0).toBe(0);
    expect(end.gold).toBe(15);
  });
});

describe("alpine-post journey — multi-rate state and text parity", () => {
  const strip = (m: MilestoneSnapshot): Omit<MilestoneSnapshot, "frame"> => {
    const { frame, ...rest } = m;
    void frame;
    return rest;
  };

  for (const hz of RATES) {
    test(`milestones are byte-identical at ${hz} Hz (gold, items, switches, rng, tile)`, () => {
      const ref = playWinningRun(60);
      const run = playWinningRun(hz);
      for (const name of Object.keys(ref.milestones)) {
        expect(strip(run.milestones[name]!), `${name} @${hz}`).toEqual(strip(ref.milestones[name]!));
      }
    });
  }

  test("dialog text lines are identical across rates (cps is virtual time)", () => {
    // Collect every TEXT modal shown during each rate's own adaptive run;
    // the authored lines do not depend on hz.
    const collect = (hz: number): string[] => {
      const lines: string[] = [];
      playWinningRun(hz, (st) => {
        const m = st.interp.modal;
        if (m?.kind === "text") lines.push(...m.lines);
      });
      return [...new Set(lines)];
    };
    const ref = collect(60);
    for (const hz of [30, 20, 4]) {
      expect(collect(hz), `lines @${hz}`).toEqual(ref);
    }
    expect(ref.join(" ")).toContain("THE END.");
    expect(ref.join(" ")).toContain("five lost parcels");
  });
});

simDescribe("alpine-post journey — built bundle double-run", () => {
  async function drive(): Promise<{ hashes: string[]; states: SessionState[]; world: Awaited<ReturnType<typeof bootWorld>> }> {
    const world = await bootWorld(appBundle(), 60);
    const hashes: string[] = [];
    const states: SessionState[] = [];
    const g = globalThis as unknown as { __alpineState?: SessionState };
    for (const mask of expandRuns(ALPINE_TAPE_RUNS)) {
      world.frame(mask, 0x8080);
      world.tick();
      hashes.push(fnv1a(world.render()));
      states.push(structuredClone(g.__alpineState!));
    }
    return { hashes, states, world };
  }

  test("two replays of the tape are byte-identical (hash and state)", async () => {
    const a = await drive();
    const b = await drive();
    expect(b.hashes).toEqual(a.hashes);
    for (let i = 0; i < a.states.length; i++) {
      const x = a.states[i]!;
      const y = b.states[i]!;
      expect([y.mapId, y.move.tx, y.move.ty, y.sw.gold, y.sw.rng, y.sw.switches, y.sw.items, y.sw.variables]).toEqual([
        x.mapId, x.move.tx, x.move.ty, x.sw.gold, x.sw.rng, x.sw.switches, x.sw.items, x.sw.variables,
      ]);
    }
  }, 120000);

  test("bundle states land on every pure-driver milestone", async () => {
    const { states } = await drive();
    // The interp frame clock resets on every map enter, so locate each
    // milestone by its stable state values rather than the frame number.
    // Map+tile+gold+parcels disambiguate tiles visited earlier in the run.
    for (const [name, m] of Object.entries(ALPINE_MILESTONES)) {
      const parcels: number = (m.variables as Record<string, number>).parcels ?? 0;
      // The "end" milestone is held WHILE the ending dialog is open
      // (main fiber active); every other milestone settles idle.
      const requireIdle = name !== "end";
      const at = states.findIndex(
        (s) =>
          s.mapId === m.mapId &&
          s.move.tx === m.x &&
          s.move.ty === m.y &&
          s.sw.gold === m.gold &&
          (s.sw.variables.parcels ?? 0) === parcels &&
          (!requireIdle || s.interp.main === null),
      );
      expect(at, name).toBeGreaterThanOrEqual(0);
      const st = states[at]!;
      expect(st.sw.rng).toBe(m.rng);
    }
  }, 120000);
});

simDescribe("alpine-post journey — save worldline", () => {
  test("save mid-run, diverge, load, replay suffix: states converge", async () => {
    // Reference: uninterrupted run.
    const ref = await (async () => {
      const world = await bootWorld(appBundle(), 60, { fs: createSimFsHost().ns });
      const g = globalThis as unknown as { __alpineState?: SessionState; __alpineSession?: {
        saveSlot: (n: number) => void; loadSlot: (n: number) => SessionState } };
      const out: SessionState[] = [];
      const masks = expandRuns(ALPINE_TAPE_RUNS);
      for (const mask of masks) {
        world.frame(mask, 0x8080);
        world.tick();
        out.push(structuredClone(g.__alpineState!));
      }
      return { out, g, masks };
    })();

    // Find a safe hub frame (mailbag taken) using the engine's own
    // safe-point predicate — the same one the save encoder enforces.
    const saveFrame = ref.out.findIndex((s, i) =>
      i > 40 &&
      s.mapId === "hub" &&
      canSave(s.move, s.interp) &&
      s.sw.switches["mailbag"] === true,
    );
    expect(saveFrame).toBeGreaterThan(0);

    const world = await bootWorld(appBundle(), 60, { fs: createSimFsHost().ns });
    const g = globalThis as unknown as { __alpineState?: SessionState; __alpineSession?: {
      saveSlot: (n: number) => void; loadSlot: (n: number) => SessionState } };
    for (let i = 0; i <= saveFrame; i++) {
      world.frame(ref.masks[i]!, 0x8080);
      world.tick();
    }
    g.__alpineSession!.saveSlot(1);
    // Diverge for 60 frames (walk south).
    for (let i = 0; i < 60; i++) {
      world.frame(0x0040, 0x8080);
      world.tick();
    }
    const diverged = structuredClone(g.__alpineState!);
    expect([diverged.move.tx, diverged.move.ty]).not.toEqual([
      ref.out[saveFrame]!.move.tx,
      ref.out[saveFrame]!.move.ty,
    ]);
    // Load and replay the reference suffix.
    g.__alpineSession!.loadSlot(1);
    const divergedStates: SessionState[] = [];
    for (let i = saveFrame + 1; i < ref.masks.length; i++) {
      world.frame(ref.masks[i]!, 0x8080);
      world.tick();
      divergedStates.push(structuredClone(g.__alpineState!));
    }
    for (let k = 0; k < divergedStates.length; k++) {
      const a = ref.out[saveFrame + 1 + k]!;
      const b = divergedStates[k]!;
      expect([b.mapId, b.move.tx, b.move.ty, b.sw.gold, b.sw.rng, b.sw.switches, b.sw.items, b.sw.variables]).toEqual([
        a.mapId, a.move.tx, a.move.ty, a.sw.gold, a.sw.rng, a.sw.switches, a.sw.items, a.sw.variables,
      ]);
    }
  }, 120000);

  test("save and load with zero divergence gives identical framebuffers", async () => {
    const masks = expandRuns(ALPINE_TAPE_RUNS);
    // Choose the save frame from a reference run: a hub safe point after
    // the mailbag is taken.
    let saveAt = -1;
    {
      const world = await bootWorld(appBundle(), 60, { fs: createSimFsHost().ns });
      const g = globalThis as unknown as { __alpineState?: SessionState; __alpineSession?: { canSave: () => boolean } };
      for (let i = 0; i < masks.length; i++) {
        world.frame(masks[i]!, 0x8080);
        world.tick();
        if (i > 40 && g.__alpineState?.mapId === "hub" && canSave(g.__alpineState.move, g.__alpineState.interp)) {
          saveAt = i;
          break;
        }
      }
    }
    expect(saveAt).toBeGreaterThan(40);
    const stateRun = async (): Promise<SessionState[]> => {
      const world = await bootWorld(appBundle(), 60);
      const g = globalThis as unknown as { __alpineState?: SessionState };
      const out: SessionState[] = [];
      for (const mask of masks) {
        world.frame(mask, 0x8080);
        world.tick();
        out.push(structuredClone(g.__alpineState!));
      }
      return out;
    };
    const stateAt = await stateRun();
    const run = async (load?: number): Promise<string[]> => {
      const world = await bootWorld(appBundle(), 60, { fs: createSimFsHost().ns });
      const g = globalThis as unknown as { __alpineSession?: { saveSlot: (n: number) => void; loadSlot: (n: number) => unknown } };
      const hashes: string[] = [];
      let saved = false;
      for (let i = 0; i < masks.length; i++) {
        world.frame(masks[i]!, 0x8080);
        world.tick();
        // Save/load after THIS frame, matching the probe's state.
        if (!saved && load !== undefined && i >= load) {
          g.__alpineSession!.saveSlot(1);
          g.__alpineSession!.loadSlot(1);
          saved = true;
        }
        hashes.push(fnv1a(world.render()));
      }
      return hashes;
    };
    const a = await run();
    const b = await run(saveAt);
    // Maps with no vblank auto-play atlases (mine, pine) render PURELY
    // from folded state, so after a couple of resync frames their pixels
    // must be byte-identical to a run that never loaded. Animated maps
    // (hub water/lamp, farm water, light beacon) are excluded: the core
    // vblank phase is host state the save snapshot deliberately does not
    // carry (vendor/pocket-rpgkit/src/engine/save.ts), so those cells cycle at their own
    // phase after a load — state stays identical, pixels may differ there.
    const staticMaps = new Set(["mine", "pine"]);
    const staticHashes: Array<[number, string, string]> = [];
    let compared = 0;
    for (let i = saveAt + 3; i < a.length; i++) {
      const st = stateAt[i]!;
      if (staticMaps.has(st.mapId)) {
        staticHashes.push([i, a[i]!, b[i]!]);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(200);
    for (const [i, x, y] of staticHashes) {
      expect(y, `frame ${i}`).toBe(x);
    }
  }, 120000);
});

simDescribe("alpine-post journey — render op budget", () => {
  const COUNTED = ["createNode", "destroyNode", "insertBefore", "setImage", "setPropBatch", "setProp", "setSprite"] as const;

  test("peak counted ops per frame stays within the small-game budget", async () => {
    // bootWorld's mutateOps only wraps ops on the first boot, so ensure the
    // bundle is built before the instrumented boot.
    await bootWorld(appBundle(), 60);
    const delta: Record<string, number> = Object.fromEntries(COUNTED.map((o) => [o, 0]));
    const wrap = (ops: Record<string, unknown>): void => {
      for (const op of COUNTED) {
        const fn = ops[op] as (...a: unknown[]) => unknown;
        if (typeof fn !== "function") continue;
        ops[op] = (...args: unknown[]) => {
          delta[op]++;
          return fn.apply(ops, args);
        };
      }
    };
    const world = await bootWorld(appBundle(), 60, undefined, wrap);
    let peakTotal = 0;
    let peakSetProp = 0;
    let peakSetImage = 0;
    let movingFrames = 0;
    let pureMotionFrames = 0;
    let prevX = -1;
    let prevY = -1;
    const peakDetail: string[] = [];
    let i = 0;
    for (const mask of expandRuns(ALPINE_TAPE_RUNS)) {
      for (const op of COUNTED) delta[op] = 0;
      world.frame(mask, 0x8080);
      world.tick();
      // Skip the mount burst: the first frames create/destroy the whole
      // node tree (a one-time cost, not a per-frame one). Measure steady
      // play after the world has settled.
      if (i >= 60) {
        const total = COUNTED.reduce((n, op) => n + delta[op], 0);
        if (total >= peakTotal) {
          if (total > peakTotal) peakDetail.length = 0;
          if (peakDetail.length < 4) peakDetail.push(`f${i}: ${COUNTED.filter((o) => delta[o] > 0).map((o) => `${o}x${delta[o]}`).join(" ")}`);
          peakTotal = total;
        }
        peakSetProp = Math.max(peakSetProp, delta.setPropBatch);
        peakSetImage = Math.max(peakSetImage, delta.setImage);
        const st = (globalThis as unknown as { __alpineState?: SessionState }).__alpineState!;
        if (st.move.px !== prevX || st.move.py !== prevY) {
          movingFrames++;
          if (total === 1 && delta.setPropBatch === 1) pureMotionFrames++;
        }
        prevX = st.move.px;
        prevY = st.move.py;
      }
      i++;
    }
    expect(movingFrames).toBeGreaterThan(500);
    // Most moving frames emit exactly one position batch and nothing else.
    expect(pureMotionFrames).toBeGreaterThan(400);
    expect(peakSetProp).toBeLessThanOrEqual(2);
    expect(peakSetImage).toBeLessThanOrEqual(40);
    expect(peakTotal).toBeLessThanOrEqual(120);
    console.log(`op peak ${peakTotal}/frame (${peakDetail.join(" | ")}); ${pureMotionFrames}/${movingFrames} moving frames were a single batch`);
  }, 120000);
});
