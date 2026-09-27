// Alpine Post's D1/D2 acceptance gates over the shared AttractController.
// The tests compare complete reducer states, not selected quest fields.

import { describe, expect, test } from "bun:test";
import { AttractController } from "../vendor/pocket-rpgkit/src/engine/attract.ts";
import { startSession, type SessionState } from "../vendor/pocket-rpgkit/src/engine/session.ts";
import { buildGame } from "../game/game-data.ts";
import { alpineAttractTape } from "../game/demo-tape.ts";

const BTN_RIGHT = 0x0020;
const BTN_LTRIGGER = 0x0100;
const RATES = [60, 30, 20, 4] as const;
const { project } = buildGame();

function make(hz: number, tape: readonly number[]): AttractController {
  return new AttractController(project, tape, {
    hz,
    tapeHz: 60,
    idleFrames: hz * 10,
    endHoldFrames: 60,
  });
}

function replay(hz: number, tape: readonly number[], count: number): SessionState {
  const c = make(hz, tape);
  c.startAttract();
  for (let i = 0; i < count; i++) c.step(0);
  return c.state;
}

function replayComplete(hz: number, tape: readonly number[]): AttractController {
  const c = make(hz, tape);
  c.startAttract();
  const limit = hz * 60 * 10;
  let hostFrames = 0;
  while (c.status().demoFrame < c.status().tapeFrames && hostFrames++ < limit) c.step(0);
  if (c.status().demoFrame !== c.status().tapeFrames) {
    throw new Error(`Alpine attract route did not complete within ${limit} frames at ${hz} Hz`);
  }
  return c;
}

describe("Alpine Post attract mode", () => {
  test("takeover frame k is field-identical to uninterrupted replay frame k", () => {
    const tape = alpineAttractTape();
    const k = 900;
    const uninterrupted = make(60, tape);
    uninterrupted.startAttract();
    for (let i = 0; i <= k; i++) uninterrupted.step(0);

    const takeover = make(60, tape);
    takeover.startAttract();
    for (let i = 0; i < k; i++) takeover.step(0);
    const result = takeover.step(BTN_RIGHT);

    expect(result.status.phase).toBe("play");
    expect(result.status.demoFrame).toBe(uninterrupted.status().demoFrame);
    expect(result.state).toEqual(uninterrupted.state);
  });

  test("rewind from k lands field-identically on a frame-zero replay at k-180", () => {
    const tape = alpineAttractTape();
    const k = 1200;
    const c = make(60, tape);
    c.startAttract();
    while (c.length < k) c.step(0);
    const before = c.length;
    const result = c.step(BTN_LTRIGGER);

    expect(result.status.rewound).toBe(true);
    expect(c.length).toBe(before - 180);
    const direct = make(60, tape);
    for (let i = 0; i < c.status().demoFrame; i++) direct.step(tape[i]!);
    expect(result.state).toEqual(direct.state);
  });

  test("the same published tape reaches the unpaced gameplay state at 60/30/20/4 Hz", () => {
    const tape = alpineAttractTape();
    const states = RATES.map((hz) => replayComplete(hz, tape).state);
    for (const state of states.slice(1)) expect(state).toEqual(states[0]);
    const plain = make(60, tape);
    for (const mask of tape) plain.step(mask);
    for (const state of states) expect(state).toEqual(plain.state);
  }, 30_000);

  test("every published mask advances the same route state as direct replay", () => {
    const tape = alpineAttractTape();
    const paced = make(60, tape);
    const direct = new AttractController(project, tape, {
      hz: 60, tapeHz: 60, idleFrames: 1_000_000, endHoldFrames: 60,
    });
    paced.startAttract();
    let sourceFrame = 0;
    while (sourceFrame < tape.length) {
      const before = paced.status().demoFrame;
      paced.step(0);
      if (paced.status().demoFrame === before) continue;
      expect(paced.status().demoFrame).toBe(before + 1);
      direct.step(tape[sourceFrame]!);
      expect(paced.state, `world after source mask ${sourceFrame}`).toEqual(direct.state);
      sourceFrame++;
    }
    expect(paced.state.mapId).toBe("light");
    expect(paced.state.sw.variables.parcels).toBe(5);
    expect(paced.state.sw.gold).toBe(15);
  }, 30_000);

  test("each completed dialog rests for its length-weighted interval at every host rate", () => {
    const tape = alpineAttractTape();
    for (const hz of RATES) {
      const c = make(hz, tape);
      c.startAttract();
      let previousKey: string | null = null;
      const holds: { chars: number; sourceFrames: number }[] = [];
      for (let hostFrame = 0; hostFrame < hz * 600 && c.status().demoFrame < tape.length; hostFrame++) {
        const before = c.length;
        c.step(0);
        const modal = c.presentedModal();
        if (modal?.kind !== "text" || !modal.complete) continue;
        const key = `${modal.fiber}\u0000${modal.lines.join("\u0000")}`;
        if (key === previousKey || c.status().readHold <= 0) continue;
        previousKey = key;
        const start = c.length;
        let guard = 0;
        while (c.status().readHold > 0 && guard++ < hz * 4) c.step(0);
        holds.push({ chars: modal.total, sourceFrames: c.length - start + (start - before) });
      }
      expect(holds.length, `dialog count @${hz}`).toBeGreaterThanOrEqual(10);
      for (const hold of holds) {
        const wantSeconds = Math.min(2.5, 1.5 + hold.chars / 120);
        expect(hold.sourceFrames, `${hold.chars} chars @${hz}`).toBeGreaterThanOrEqual(Math.ceil(wantSeconds * 60));
        expect(hold.sourceFrames / 60).toBeGreaterThanOrEqual(1.5);
        expect(wantSeconds).toBeLessThanOrEqual(2.5);
      }
    }
  }, 30_000);

  test("every choice menu remains visible for at least 1.5 seconds at every host rate", () => {
    const tape = alpineAttractTape();
    for (const hz of RATES) {
      const c = make(hz, tape);
      c.startAttract();
      let current: string | null = null;
      let visible = 0;
      const dwell: number[] = [];
      for (let host = 0; host < hz * 600 && c.status().demoFrame < tape.length; host++) {
        c.step(0);
        const m = c.state.interp.modal;
        const key = m?.kind === "choices" ? `${m.fiber}\u0000${m.prompt}\u0000${m.options.join("\u0000")}` : null;
        if (key !== current) {
          if (current !== null) dwell.push(visible / hz);
          current = key;
          visible = 0;
        }
        if (key !== null) visible++;
      }
      expect(dwell.length, `choice count @${hz}`).toBeGreaterThanOrEqual(5);
      for (const seconds of dwell) expect(seconds, `choice dwell @${hz}`).toBeGreaterThanOrEqual(1.5);
    }
  }, 30_000);

  test("a completed loop resets every world field before replaying", () => {
    const tape = alpineAttractTape();
    const c = replayComplete(60, tape);
    expect(c.status().demoFrame).toBe(tape.length);
    for (let i = 0; i < 60; i++) c.step(0);
    expect(c.status().loopReset).toBe(true);
    expect(c.state).toEqual(startSession(project, c.getSession()));
  });
});
