// ui/SaveMenu.tsx — save/load menu presentation. App
// layer; the pure navigation reducer lives in the shared engine
// (vendor/pocket-rpgkit/src/engine/save-menu.ts).

import { createMemo, For, Show, type Accessor } from "solid-js";
import { Text, View } from "@pocketjs/framework/components";
import { Osk } from "@pocketjs/framework/osk";
import type { OskController } from "@pocketjs/framework/osk";
import type { FsSlotInfo } from "../save-fs.ts";
import { ROOT_CODE, ROOT_FS, type MenuState } from "../vendor/pocket-rpgkit/src/engine/save-menu.ts";

const RIM = "#5d4a3a";
const FILL = "#1a1208";
const INK = "#ffeecf";
const DIM = "#c7a97c";
const ACCENT = "#ffd961";

export type SlotInfo = (FsSlotInfo | { slot: number; error: string } | null)[];

export interface SaveMenuProps {
  menu: Accessor<MenuState>;
  hasFs: boolean;
  slots: Accessor<SlotInfo>;
  saveCode: Accessor<string>;
  osk: OskController;
  legend: Accessor<string>;
}

const CODE_COLS = 24;
const CODE_ROWS = 10;

function codePages(code: string): string[] {
  const pages: string[] = [];
  for (let i = 0; i < code.length; i += CODE_COLS * CODE_ROWS) {
    pages.push(code.slice(i, i + CODE_COLS * CODE_ROWS));
  }
  return pages.length ? pages : [""];
}

function pageRows(page: string): string[] {
  const rows: string[] = [];
  for (let i = 0; i < CODE_ROWS; i++) rows.push(page.slice(i * CODE_COLS, (i + 1) * CODE_COLS));
  return rows;
}

function slotLabel(info: SlotInfo[number]): string {
  if (info === null) return "- empty";
  if ("error" in info) return "! damaged save";
  return `${info.map}  f${info.frame}`;
}

function isIndex(m: MenuState, i: number): boolean {
  return (m.kind === "root" || m.kind === "slots-save" || m.kind === "slots-load") && m.index === i;
}

export function SaveMenu(props: SaveMenuProps) {
  const pages = createMemo(() => codePages(props.saveCode()));

  return (
    <Show when={props.menu().kind !== "closed"}>
      <View
        class="absolute inset-0 flex-row justify-center items-center"
        style={{ posType: 1, bgColor: "#00000a" }}
        debugName="alpine-save-overlay"
      >
        <View
          class="flex-col p-[2]"
          style={{ posType: 1, width: 420, height: 232, bgColor: RIM }}
          debugName="alpine-save-panel"
        >
          <View
            class="flex-col grow p-[8]"
            style={{ posType: 1, insetL: 2, insetT: 2, insetR: 2, insetB: 2, bgColor: FILL }}
          >
            <Show when={props.menu().kind === "root"}>
              <Text class="text-sm" style={{ textColor: ACCENT, lineHeight: 18, height: 18 }} debugName="alpine-save-title">
                ALPINE POST — SAVE
              </Text>
              <View style={{ height: 6 }} />
              <For each={props.hasFs ? ROOT_FS : ROOT_CODE}>
                {(row, i) => (
                  <Text
                    class="text-sm"
                    style={{ textColor: isIndex(props.menu(), i()) ? ACCENT : INK, lineHeight: 20, height: 20 }}
                    debugName={`alpine-save-root-${i()}`}
                  >
                    {`${isIndex(props.menu(), i()) ? "> " : "  "}${row.label}`}
                  </Text>
                )}
              </For>
              <View class="grow" />
              <Text class="text-xs" style={{ textColor: DIM, lineHeight: 14, height: 14 }} debugName="alpine-save-legend">
                {`${props.legend()}`}
              </Text>
            </Show>

            <Show when={props.menu().kind === "slots-save" || props.menu().kind === "slots-load"}>
              {(() => {
                const m = props.menu();
                if (m.kind !== "slots-save" && m.kind !== "slots-load") return null;
                const saving = m.kind === "slots-save";
                return (
                  <>
                    <Text class="text-sm" style={{ textColor: ACCENT, lineHeight: 18, height: 18 }} debugName="alpine-slot-title">
                      {saving ? "SAVE TO SLOT" : "LOAD FROM SLOT"}
                    </Text>
                    <View style={{ height: 6 }} />
                    <For each={[0, 1, 2]}>
                      {(row) => (
                        <Text
                          class="text-sm"
                          style={{ textColor: m.index === row ? ACCENT : INK, lineHeight: 22, height: 22 }}
                          debugName={`alpine-slot-${row}`}
                        >
                          {`${m.index === row ? "> " : "  "}${row + 1}. ${slotLabel(props.slots()[row]!)}`}
                        </Text>
                      )}
                    </For>
                    <View class="grow" />
                    <Text class="text-xs" style={{ textColor: DIM, lineHeight: 14, height: 14 }} debugName="alpine-slot-legend">
                      {`${props.legend()}`}
                    </Text>
                  </>
                );
              })()}
            </Show>

            <Show when={props.menu().kind === "code-export"}>
              {(() => {
                const m = props.menu();
                if (m.kind !== "code-export") return null;
                const all = pages();
                const page = Math.min(m.page, all.length - 1);
                return (
                  <>
                    <Text class="text-xs" style={{ textColor: ACCENT, lineHeight: 15, height: 15 }} debugName="alpine-code-title">
                      {`SAVE CODE — page ${page + 1}/${all.length}  (up/down: page)`}
                    </Text>
                    <View style={{ height: 4 }} />
                    <For each={pageRows(all[page]!)}>
                      {(line) => (
                        <Text class="text-xs" style={{ textColor: INK, lineHeight: 15, height: 15 }} debugName="alpine-code-row">
                          {line}
                        </Text>
                      )}
                    </For>
                    <View class="grow" />
                    <Text class="text-xs" style={{ textColor: DIM, lineHeight: 14, height: 14 }} debugName="alpine-code-hint">
                      Write this code down; import it with "Load code". x: back.
                    </Text>
                  </>
                );
              })()}
            </Show>

            <Show when={props.menu().kind === "code-import"}>
              <Text class="text-sm" style={{ textColor: ACCENT, lineHeight: 18, height: 18 }} debugName="alpine-import-title">
                TYPE A SAVE CODE
              </Text>
              <View style={{ height: 4 }} />
              <Text class="text-xs" style={{ textColor: INK, lineHeight: 15, height: 15 }} debugName="alpine-import-hint">
                The keyboard opens below; START commits, x cancels.
              </Text>
            </Show>

            <Show when={props.menu().kind === "message"}>
              {(() => {
                const m = props.menu();
                if (m.kind !== "message") return null;
                return (
                  <>
                    <View class="grow" />
                    <Text class="text-sm" style={{ textColor: ACCENT, lineHeight: 18, height: 18 }} debugName="alpine-message-title">
                      {m.title}
                    </Text>
                    <View style={{ height: 6 }} />
                    <Text class="text-sm" style={{ textColor: INK, lineHeight: 18, height: 18 }} debugName="alpine-message-body">
                      {m.body}
                    </Text>
                    <View class="grow" />
                    <Text class="text-xs" style={{ textColor: DIM, lineHeight: 14, height: 14 }} debugName="alpine-message-legend">
                      {`${props.legend()}`}
                    </Text>
                  </>
                );
              })()}
            </Show>
          </View>
        </View>
      </View>
      <Osk osk={props.osk} />
    </Show>
  );
}
