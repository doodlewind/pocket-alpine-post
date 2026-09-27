# Asset attribution — Alpine Post (《山巅邮路》)

Every asset in this game is CC0 or CC-BY. No RPG Maker or other commercial
game assets are included. This file and the verbatim license texts under
`assets/src/` cover everything this repository ships; the Pocket RPG Kit
submodule carries its own attribution for its examples.

## Kenney — Tiny Town

- File: `assets/src/town-tiles.png` (192×176, 12×11 grid of 16×16 cells).
- Source: https://kenney.nl/assets/tiny-town (Tiny Town 1.1, 2023-01-11).
- License: **CC0 1.0 Universal** (public domain dedication).
  Verbatim license text: `assets/src/LICENSE-kenney-town.txt`.
- Used for: grass, dirt roads, cobble, buildings, fences, signs, props.
  Credit is not required by CC0 but is given: Kenney (www.kenney.nl).

## Kenney — Tiny Dungeon

- File: `assets/src/dungeon-tiles.png` (192×176, 12×11 grid of 16×16 cells).
- Source: https://kenney.nl/assets/tiny-dungeon
- License: **CC0 1.0 Universal**. Verbatim license text:
  `assets/src/LICENSE-kenney-dungeon.txt`.
- Used for: character sprites (villager, merchant, boy, miner, hooded
  hermit, keeper), chests, mine props and stone trim. Kenney
  (www.kenney.nl).

## Kenney — Tiny Farm

- File: `assets/src/farm-tiles.png` (192×176, 12×11 grid of 16×16 cells).
  Pixel-for-pixel RGBA conversion of the pack's palette-indexed
  `Tilemap/tilemap_packed.png` (Tiny Farm 1.0, 2026-07-01); no pixels were
  altered.
- Source: https://kenney.nl/assets/tiny-farm
- License: **CC0 1.0 Universal**. Verbatim license text:
  `assets/src/LICENSE-kenney-farm.txt`.
- Used for: tilled field strips, crops, the sheep, farmer character,
  hay bales, sunflowers, sacks, tools and farm props. Kenney (www.kenney.nl).

## Lanea Zimmerman (Sharm) — Tiny 16 basic character set (player)

- Files: `assets/src/hero-down.png`, `hero-left.png`, `hero-right.png`,
  `hero-up.png` (four 64×16 three-frame walker atlases).
- Source: https://opengameart.org/content/tiny-16-basic
  (Lanea Zimmerman, "Tiny 16", via OpenGameArt.org).
- License: **CC-BY 3.0**, https://creativecommons.org/licenses/by/3.0/
  Verbatim license text: `assets/src/LICENSE-sharm-ccby3.txt`.
- Required credit: **Lanea Zimmerman (Sharm), "Tiny 16"**, via
  OpenGameArt.org. `assets/player-*.png` are crops of the atlas cells; no
  pixels were altered.

## Generated in this repository (dedicated CC0)

- `assets/map-*-{ground,upper}.png` — 512×512 PSM_4444 per-map images baked
  by `gen-assets.ts` from the three Kenney sheets above (CC0 derivatives).
- `assets/npc/*.png` — 16×16 event sprites: 14 cells cropped verbatim from
  the Kenney Tiny Town / Tiny Dungeon / Tiny Farm sheets (CC0), and four
  drawn in code (`mailbox`, `parcel`, `fire-off`, `lamp-off`; see below).
- The code-drawn cells in `game/custom-art.ts` (mailbox, parcel, unlit
  campfire and lamps, lighthouse tower, grass variants), which also bake
  into the map images, and the `assets/anim/*.png` vblank atlases (water,
  campfire, lamps, beacon): original 16px art drawn for this project in
  colors sampled from the Kenney Tiny palette. Dedicated **CC0 1.0** by
  the Alpine Post authors.
- `tests/goldens/journey.*.png` — frames rendered by the PocketJS wasm sim
  from the assets above; the same licenses apply.
- `assets/player-dir*.png`, `assets/player-pose*.png` — crops of the Sharm
  walker (**CC-BY 3.0**; the credit line above applies).
