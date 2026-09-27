// save-fs.ts — desktop save store over the framework fs
// module (data.fs). App-layer adapter; the save envelope/encoder is the
// shared engine module vendor/pocket-rpgkit/src/engine/save.ts.

import { file, fsHost, write } from "@pocketjs/framework/fs";
import {
  loadFromStore,
  saveToStore,
  slotPath,
  summarizeEnvelope,
  type SaveSnapshot,
  type SaveStore,
  type SlotSummary,
} from "./vendor/pocket-rpgkit/src/engine/save.ts";
export interface FsSlotInfo extends SlotSummary {
  checksum: string;
}

export function hasFsSave(): boolean {
  return fsHost() !== null;
}

class FsSaveStore implements SaveStore {
  exists(slot: number): boolean {
    return file(slotPath(slot)).exists();
  }
  read(slot: number): string | null {
    const f = file(slotPath(slot));
    return f.exists() ? f.text() : null;
  }
  write(slot: number, envelope: string): void {
    write(slotPath(slot), envelope);
  }
}

let store: FsSaveStore | null = null;

export function fsSaveStore(): SaveStore | null {
  if (!hasFsSave()) return null;
  store ??= new FsSaveStore();
  return store;
}

export function saveSlotFs(slot: number, snapshot: SaveSnapshot): void {
  const s = fsSaveStore();
  if (!s) throw new Error("save: fs module is not mounted on this target");
  saveToStore(s, slot, snapshot);
}

export function loadSlotFs(slot: number): SaveSnapshot {
  const s = fsSaveStore();
  if (!s) throw new Error("save: fs module is not mounted on this target");
  return loadFromStore(s, slot);
}

export function listSlotsFs(): (FsSlotInfo | { slot: number; error: string } | null)[] {
  const s = fsSaveStore();
  if (!s) return [null, null, null];
  return [1, 2, 3].map((slot) => {
    const text = s.read(slot);
    if (text === null) return null;
    try {
      return { ...summarizeEnvelope(slot, text) };
    } catch (e) {
      return { slot, error: (e as Error).message };
    }
  });
}
