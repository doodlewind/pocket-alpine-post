// ui/DialogBox.tsx — typewriter dialog and choices box.
// App-layer presentation, copied from the rpgkit sample and adapted: the
// interpreter (modal state, reveal clock) stays in the shared engine.

import { For, Show, type Accessor } from "solid-js";
import { Text, View } from "@pocketjs/framework/components";
import type { Modal } from "../vendor/pocket-rpgkit/src/engine/interpreter.ts";

const RIM = "#5d4a3a";
const FILL = "#1a1208";
const INK = "#ffeecf";
const DIM = "#c7a97c";
const ACCENT = "#ffd961";

function visibleLines(lines: string[], revealed: number): string[] {
  let left = revealed;
  return lines.map((line, i) => {
    if (left <= 0) return "";
    const take = Math.min(line.length, left);
    left -= take;
    if (i < lines.length - 1) left -= 1;
    return line.slice(0, take);
  });
}

const TEXT_ROWS = [0, 1, 2, 3];
const CHOICE_ROWS = [0, 1, 2, 3];

export function DialogBox(props: { modal: Accessor<Modal | null>; legend: Accessor<string> }) {
  const isChoice = () => props.modal()?.kind === "choices";
  const textLines = () => {
    const m = props.modal();
    if (m?.kind !== "text") return ["", "", "", ""];
    const visible = visibleLines(m.lines, m.revealed);
    return TEXT_ROWS.map((i) => visible[i] ?? "");
  };

  return (
    <View
      class="absolute left-0 right-0 bottom-0"
      style={{ posType: 1, height: 180 }}
      debugName="alpine-message-layer"
    >
      <Show when={props.modal()}>
        <Show when={isChoice()}>
          <View
            class="flex-col p-[2]"
            style={{ posType: 1, width: 248, height: 96, insetR: 12, insetB: 98, bgColor: RIM }}
            debugName="alpine-choices-box"
          >
            <View class="flex-col p-[6]" style={{ posType: 1, insetL: 2, insetT: 2, insetR: 2, insetB: 2, bgColor: FILL }}>
              <Text class="text-xs" style={{ textColor: DIM, lineHeight: 14, height: 14 }} debugName="alpine-choice-prompt">
                {`${isChoice() ? (props.modal() as Extract<Modal, { kind: "choices" }>).prompt : ""}`}
              </Text>
              <View class="flex-col" style={{ height: 4 }} />
              <For each={CHOICE_ROWS}>
                {(row) => {
                  const m = () => props.modal() as Extract<Modal, { kind: "choices" }> | null;
                  const exists = () => m()?.kind === "choices" && row < m()!.options.length;
                  const selected = () => exists() && m()!.index === row;
                  const label = () => (exists() ? `${selected() ? "> " : "  "}${m()!.options[row]}` : "");
                  return (
                    <Text
                      class="text-xs"
                      style={{ textColor: selected() ? ACCENT : INK, lineHeight: 14, height: 14 }}
                      debugName={`alpine-choice-${row}`}
                    >
                      {`${label()}`}
                    </Text>
                  );
                }}
              </For>
              <View class="flex-row justify-end" style={{ height: 14, insetT: 4 }}>
                <Text class="text-xs" style={{ textColor: DIM, lineHeight: 12, height: 12 }} debugName="alpine-choice-legend">
                  {`${props.legend()}`}
                </Text>
              </View>
            </View>
          </View>
        </Show>

        <Show when={!isChoice()}>
          <View
            class="flex-col p-[2]"
            style={{ posType: 1, height: 92, insetL: 8, insetR: 8, insetB: 8, bgColor: RIM }}
            debugName="alpine-message-box"
          >
            <View
              class="flex-col p-[8]"
              style={{ posType: 1, insetL: 2, insetT: 2, insetR: 2, insetB: 2, bgColor: FILL }}
            >
              <For each={TEXT_ROWS}>
                {(row) => (
                  <Text
                    class="text-xs"
                    style={{ textColor: INK, lineHeight: 15, height: 15 }}
                    debugName={`alpine-message-row-${row}`}
                  >
                    {`${textLines()[row]!}`}
                  </Text>
                )}
              </For>
              <View class="flex-row justify-end" style={{ height: 12 }}>
                <Text class="text-xs" style={{ textColor: DIM, lineHeight: 12, height: 12 }} debugName="alpine-message-legend">
                  {`${(() => {
                    const m = props.modal();
                    if (m?.kind !== "text") return "";
                    return m.complete ? props.legend() : "";
                  })()}`}
                </Text>
              </View>
            </View>
          </View>
        </Show>
      </Show>
    </View>
  );
}
