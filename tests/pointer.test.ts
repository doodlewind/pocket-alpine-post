import { describe, expect, test } from "bun:test";
import { buildGame } from "../game/game-data.ts";
import {
  PointerDecoder,
  choiceButtonSequence,
  choiceSelectionSequence,
  dialogClickAt,
  findRoute,
  menuClickActions,
  screenToTile,
} from "../input/pointer.ts";
import { createSession } from "../vendor/pocket-rpgkit/src/engine/session.ts";
import type { Modal } from "../vendor/pocket-rpgkit/src/engine/interpreter.ts";

const BTN_DOWN = 0x0040;
const BTN_CIRCLE = 0x2000;

describe("Alpine Post pointer adapter", () => {
  test("emits one click when press and release share a service batch", () => {
    const decoder = new PointerDecoder();
    expect(decoder.decode(
      '{"t":"mouse","x":280,"y":216,"d":true}\n' +
      '{"t":"mouse","x":280,"y":216,"d":false}\n',
    )).toEqual({ clicks: [{ x: 280, y: 216 }], releases: [{ x: 280, y: 216 }], keys: [] });
    expect(decoder.decode('{"t":"mouse","x":281,"y":216,"d":false}\n')).toEqual({ clicks: [], releases: [], keys: [] });
  });

  test("ignores malformed, non-mouse, and right-button packets", () => {
    const decoder = new PointerDecoder();
    expect(decoder.decode(
      'bad json\n' +
      '{"t":"resize","x":1,"y":2,"d":true}\n' +
      '{"t":"mouse","x":20,"y":30,"d":true,"b":2}\n',
    )).toEqual({ clicks: [], releases: [], keys: [] });
  });

  test("retains desktop key identities for app-layer confirm/cancel aliases", () => {
    const decoder = new PointerDecoder();
    expect(decoder.decode(
      '{"t":"key","k":"z"}\n' +
      '{"t":"key","k":"Enter"}\n' +
      '{"t":"key","k":"Backspace"}\n',
    )).toEqual({ clicks: [], releases: [], keys: ["z", "enter", "backspace"] });
  });

  test("maps the centered hub playfield to tiles and rejects letterbox pixels", () => {
    const world = { x: 48, y: 16, w: 384, h: 240 };
    expect(screenToTile({ x: 280, y: 216 }, world, 24, 15)).toEqual({ x: 14, y: 12 });
    expect(screenToTile({ x: 47, y: 216 }, world, 24, 15)).toBeNull();
    expect(screenToTile({ x: 432, y: 216 }, world, 24, 15)).toBeNull();
  });
});

describe("Alpine Post click-to-walk route", () => {
  const { project } = buildGame();
  const table = createSession(project).tables.get("hub")!;

  test("finds a shortest route through the authored passage table", () => {
    expect(findRoute(table, { x: 12, y: 12 }, { x: 13, y: 12 })).toEqual([3]);
  });

  test("rejects authored walls and live blocking character bodies", () => {
    expect(findRoute(table, { x: 12, y: 12 }, { x: 9, y: 12 })).toBeNull();
    expect(findRoute(table, { x: 12, y: 12 }, { x: 14, y: 12 }, (x, y) => x === 14 && y === 12)).toBeNull();
  });

  test("does not route through a transfer pad before the clicked destination", () => {
    const pad = 7 * table.width + 23;
    expect(findRoute(table, { x: 12, y: 7 }, { x: 22, y: 7 }, () => false, new Set([pad]))).not.toBeNull();
    expect(findRoute(table, { x: 12, y: 7 }, { x: 23, y: 7 }, () => false, new Set([pad]))).not.toBeNull();
  });
});

describe("Alpine Post pointer hit regions", () => {
  test("dialog clicks target only visible text and choice rows", () => {
    const text: Modal = { kind: "text", fiber: "f", lines: ["hello"], total: 5, revealed: 5, complete: true };
    expect(dialogClickAt(text, { x: 240, y: 220 })).toEqual({ kind: "confirm" });
    expect(dialogClickAt(text, { x: 240, y: 100 })).toBeNull();

    const choices: Modal = {
      kind: "choices",
      fiber: "f",
      prompt: "Pick",
      options: ["one", "two", "three"],
      index: 0,
      cancellable: false,
    };
    expect(dialogClickAt(choices, { x: 300, y: 125 })).toEqual({ kind: "choice", index: 1 });
    expect(choiceSelectionSequence(0, 1, 3)).toEqual([BTN_DOWN, 0]);
    expect(choiceButtonSequence(0, 1, 3)).toEqual([BTN_DOWN, 0, BTN_CIRCLE, 0]);
    expect(dialogClickAt(choices, { x: 200, y: 125 })).toBeNull();
  });

  test("save-menu clicks select a visible row through reducer actions", () => {
    expect(menuClickActions({ kind: "root", index: 0 }, { x: 100, y: 75 }, false)).toEqual(["down", "confirm"]);
    expect(menuClickActions({ kind: "slots-save", index: 0 }, { x: 100, y: 105 }, true)).toEqual(["up", "confirm"]);
    expect(menuClickActions({ kind: "root", index: 0 }, { x: 20, y: 55 }, false)).toEqual([]);
  });
});
