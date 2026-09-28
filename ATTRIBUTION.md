# Asset attribution — Alpine Post (《山巅邮路》)

Every asset in this game is CC0. No RPG Maker or other commercial game
assets are included. This file and the verbatim license text under
`assets/src/ninja/` cover everything this repository ships; the Pocket RPG
Kit submodule carries its own attribution for its examples.

## Pixel-Boy and AAA — Ninja Adventure Asset Pack

- Files: everything under `assets/src/ninja/`, kept at the pack's own
  relative paths:
  - `Backgrounds/Tilesets/` — `TilesetFloor`, `TilesetNature`,
    `TilesetHouse`, `TilesetField`, `TilesetWater`, `TilesetElement`,
    `TilesetRelief`, `TilesetReliefDetail`, `TilesetFloorDetail`,
    `Interior/TilesetInteriorFloor` (terrain, paths, cobblestone, trees,
    boulders, houses, fences, fields, ponds, planks, the mine mouth);
  - `Actor/Characters/*/SpriteSheet.png` — Greenman (the player), OldMan,
    Woman, Inspector, OldMan3, Villager3, EggBoy, Monk, OldMan2;
    `Actor/Characters/*/Faceset.png` for the six speakers;
    `Actor/Animals/Pig/SpriteSheetPink.png`;
  - `HUD/Dialog/FacesetBox.png` (the portrait frame);
  - `Items/Treasure/LittleTreasureChest.png`.
- Sources: https://pixel-boy.itch.io/ninja-adventure-asset-pack and
  https://github.com/pixel-boy/NinjaAdventure. The pack's GitHub repository
  ships only part of the pack; the full-pack files were taken from a public
  project that vendors the unmodified pack
  (https://github.com/MarioLDD/Kuroshiro-adventure,
  `Assets/NinjaAdventure/`, whose `LICENSE.txt` is the same CC0 text).
- License: **CC0 1.0 Universal** (public domain dedication),
  https://creativecommons.org/publicdomain/zero/1.0/legalcode. Verbatim
  text: `assets/src/ninja/LICENSE.txt`.
- One file shipped as a palette PNG (`Items/Treasure/LittleTreasureChest.png`)
  and is stored as a pixel-identical RGBA conversion, because the PocketJS
  PNG decoder reads RGBA only; no pixels were altered.
- Credit is not required by CC0 but is given: **Ninja Adventure Asset Pack
  — Pixel-Boy and AAA**.

## Made for this game (dedicated CC0)

All of the following are **CC0 1.0**,
https://creativecommons.org/publicdomain/zero/1.0/, by the Alpine Post
authors:

- the baked maps `assets/map-*-{ground,upper}.png`, composed by the art
  scripts in `art/` from the pack sheets above;
- pieces drawn in the pack's palette in `art/custom.ts`: the post box,
  parcel, lanterns (unlit and the lit animation), the campfire (unlit and
  the lit animation), cable car, mine rails, ore cart, lighthouse, beacon,
  and woodland mushrooms;
- recolours made in `art/`: the sheep (the pack's pig re-wooled), the
  weathered station and mine planks, the tilled field beds;
- `assets/anim/*.png` water glints and the other vblank strips;
- `assets/face/*.png` (pack facesets inside the pack's portrait frame) and
  `assets/npc/*.png`, `assets/player-*.png` (pack frames and the pieces
  above, one 16x16 image each);
- `tests/goldens/*.png` and `docs/screenshots/*.png`, rendered from the
  assets above.
