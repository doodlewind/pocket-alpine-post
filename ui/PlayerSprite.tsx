// ui/PlayerSprite.tsx — reducer-driven walker image (one
// static 16x16 <Image>, pose chosen from the saved mover phase). Copied
// from the rpgkit sample; the pose manifest is this app's own assets.ts.

import { Image, type NodeMirror } from "@pocketjs/framework/components";
import type { Facing } from "../vendor/pocket-rpgkit/src/engine/types.ts";
import type { WalkPose } from "../vendor/pocket-rpgkit/src/engine/movement.ts";
import { PLAYER_IDLE, PLAYER_WALK_L, PLAYER_WALK_R } from "./assets.ts";

export interface PlayerSpriteProps {
  pose: WalkPose;
  facing: Facing;
  ref: (n: NodeMirror) => void;
}

export function playerImageKey(pose: WalkPose, facing: Facing): string {
  if (pose === 1) return PLAYER_WALK_L[facing]!;
  if (pose === 2) return PLAYER_WALK_R[facing]!;
  return PLAYER_IDLE[facing]!;
}

export function PlayerSprite(props: PlayerSpriteProps) {
  return (
    <Image
      class="absolute w-[16] h-[16]"
      src={playerImageKey(props.pose, props.facing)}
      style={{ posType: 1, insetL: 0, insetT: 0 }}
      ref={props.ref}
    />
  );
}
