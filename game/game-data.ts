// game/game-data.ts — 《山巅邮路》(Alpine Post), the
// complete five-map mail-route game authored against rpgkit-project/v1
// types. gen-assets.ts bakes the maps and emits data/alpine-post.json from
// buildGame(). Data only: the engine is a pure reducer elsewhere.
//
// Decor rule (user-visible visual upgrade #1): large grass/dirt areas are
// broken into 2-3 tile variants by a mulberry32 stream with a FIXED seed
// constant per map. The same seed always produces the same village, the
// output is byte-stable in git, and the choice lives in the authored data
// (not the cooker), so re-bakes cannot drift.

import type {
  Command,
  GameEvent,
  MapDef,
  Project,
  Sheet,
  TileId,
} from "../vendor/pocket-rpgkit/src/engine/types.ts";

// --- sheets ------------------------------------------------------------------

const TOWN: Sheet = { id: "town", cols: 12, rows: 11, pak: "chunks" };
const DUN: Sheet = {
  id: "dun",
  cols: 12,
  rows: 11,
  pak: "chunks",
  defaultPassage: "block",
  pass: [24, 25, 30, 42, 48, 50, 52],
};
const FARM: Sheet = { id: "farm", cols: 12, rows: 11, pak: "chunks" };
const CUSTOM: Sheet = { id: "custom", cols: 8, rows: 8, pak: "chunks" };

export const SHEETS = [TOWN.id, FARM.id, DUN.id, CUSTOM.id] as const;

const t = (cell: number): TileId => `town.${cell}`;
const f = (cell: number): TileId => `farm.${cell}`;
const d = (cell: number): TileId => `dun.${cell}`;
const cu = (cell: number): TileId => `custom.${cell}`;
const txt = (lines: string[]): Command => ({ op: "text", lines });

// --- seeded variant picker ----------------------------------------------------

/** Same mulberry32 the engine uses (interpreter.ts), so the decor stream is
 *  the documented deterministic generator. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Per-map decor seeds. Change a seed -> a different but deterministic
// layout; the shipped worlds are the constants below.
const SEEDS = { hub: 0xa1_70_5e_01, farm: 0xa1_70_5e_02, mine: 0xa1_70_5e_03, pine: 0xa1_70_5e_04, light: 0xa1_70_5e_05 } as const;

const GRASS_VARIANTS: TileId[] = [t(0), t(1), t(1), cu(0), cu(1)];
const ROAD_VARIANTS: TileId[] = [t(39), t(40), t(41), t(42)];

export function fill<X>(w: number, h: number, v: X): X[] {
  return Array.from({ length: w * h }, () => v);
}

export function paint(map: MapDef, x: number, y: number, tile: TileId, flag?: "pass" | "block"): void {
  map.ground[y * map.width + x] = tile;
  if (flag) (map.passage ??= []).push([y * map.width + x, flag]);
}

export function upper(map: MapDef, x: number, y: number, tile: TileId, block = false): void {
  (map.upper ??= []).push([y * map.width + x, tile]);
  if (block) (map.passage ??= []).push([y * map.width + x, "block"]);
}

function road(m: MapDef, x: number, y: number, rnd: () => number): void {
  paint(m, x, y, ROAD_VARIANTS[Math.floor(rnd() * ROAD_VARIANTS.length)]!);
}

/** Replace untouched base-grass cells with seeded variants; runs AFTER the
 *  structural painting (roads, plaza, buildings, water beds). */
function scatterGrass(m: MapDef, seed: number): void {
  const rnd = mulberry32(seed);
  for (let i = 0; i < m.ground.length; i++) {
    if (m.ground[i] !== t(0)) continue;
    const roll = rnd();
    if (roll < 0.5) continue;
    m.ground[i] = GRASS_VARIANTS[Math.floor(rnd() * GRASS_VARIANTS.length)]!;
  }
}

function treeRing(m: MapDef, rnd: () => number, gaps: ReadonlySet<number>): void {
  const W = m.width;
  const H = m.height;
  const greens = [t(3), t(15), t(26), f(3), f(15), f(26)];
  const autumn = [t(2), t(14), t(27)];
  const ring = (x: number, y: number): void => {
    if (gaps.has(y * W + x)) return;
    upper(m, x, y, rnd() < 0.22 ? autumn[Math.floor(rnd() * autumn.length)]! : greens[Math.floor(rnd() * greens.length)]!, true);
  };
  for (let x = 0; x < W; x++) {
    ring(x, 0);
    ring(x, H - 1);
  }
  for (let y = 1; y < H - 1; y++) {
    ring(0, y);
    ring(W - 1, y);
  }
}

// ===========================================================================
// ① hub — Mountain Hamlet (24x15)
// ===========================================================================

function hub(): MapDef {
  const W = 24;
  const H = 15;
  const m: MapDef = {
    id: "hub",
    name: "Mountain Hamlet",
    width: W,
    height: H,
    sheets: [...SHEETS],
    ground: fill(W, H, t(0)),
    events: [],
  };
  const rnd = mulberry32(SEEDS.hub);

  // Main street, plaza cobble, well.
  for (let x = 1; x <= 22; x++) road(m, x, 7, rnd);
  for (const [x, y] of [
    [10, 6], [11, 6], [12, 6], [13, 6],
    [10, 8], [11, 8], [12, 8], [13, 8],
  ]) paint(m, x, y, t(43));
  upper(m, 11, 6, t(102), true);

  // General store, NW: beam frame rows 2..5 cols 2..7, door (4,5).
  for (let x = 2; x <= 7; x++) upper(m, x, 2, t(44), true);
  for (const x of [2, 3, 5, 6, 7]) upper(m, x, 5, t(44), true);
  for (let y = 3; y <= 4; y++) {
    upper(m, 2, y, t(46), true);
    upper(m, 7, y, t(47), true);
    for (let x = 3; x <= 6; x++) paint(m, x, y, t(43));
  }
  paint(m, 4, 5, t(88));

  // Cable-car station, S: rows 11..13 cols 9..14, door (12,11).
  for (const x of [9, 10, 11, 13, 14]) upper(m, x, 11, t(44), true);
  for (let x = 9; x <= 14; x++) upper(m, x, 13, t(44), true);
  upper(m, 9, 12, t(46), true);
  upper(m, 14, 12, t(47), true);
  paint(m, 12, 11, t(88));
  paint(m, 10, 12, t(43));
  paint(m, 11, 12, t(43));
  paint(m, 12, 12, t(43));
  paint(m, 13, 12, t(43));

  // Chested yard, NE: fence rows 2..4 cols 20..22, opening (21,4).
  for (let x = 20; x <= 22; x++) upper(m, x, 2, t(68), true);
  for (const x of [20, 22]) upper(m, x, 3, t(71), true);
  for (const x of [20, 22]) upper(m, x, 4, t(68), true);
  upper(m, 21, 4, t(85), false); // low gate hurdle, walkable
  paint(m, 21, 3, t(43));

  // Pond, SE corner.
  for (const [x, y] of [
    [21, 11], [22, 11], [21, 12], [22, 12],
  ]) paint(m, x, y, d(30), "block");
  for (const [x, y] of [
    [20, 10], [21, 10], [22, 10], [23, 10],
    [20, 13], [21, 13], [22, 13], [23, 13],
    [20, 11], [20, 12], [23, 11], [23, 12],
  ]) upper(m, x, y, t(3), true);

  // Decor.
  upper(m, 3, 10, t(29));
  upper(m, 17, 3, t(17));
  upper(m, 6, 11, t(30));
  upper(m, 18, 12, t(3));

  scatterGrass(m, SEEDS.hub);
  // Border gaps (row-major y*W+x): north gate (12,0), west pad (0,7),
  // east pad (23,7).
  treeRing(m, rnd, new Set([12, 7 * W + 0, 7 * W + 23]));

  m.events = [
    {
      id: "postmaster",
      name: "Postmaster",
      x: 12,
      y: 9,
      pages: [
        {
          trigger: "action",
          sprite: "postmaster",
          blocks: true,
          commands: [
            txt([
              "POSTMASTER: Storm took the road out.",
              "The last cable car leaves at dusk.",
              "Three letters must go up the mountain",
              "today. Will you carry the bag?",
            ]),
            {
              op: "choices",
              prompt: "Take the mail route?",
              options: [
                {
                  text: "Take the mail",
                  commands: [
                    {
                      op: "if",
                      if: { kind: "switch", id: "mailbag" },
                      then: [txt(["POSTMASTER: Farm, mine, lighthouse.", "Don't miss a single one."])],
                      else: [
                        { op: "switch", id: "mailbag", value: true },
                        { op: "item", item: "letter-farmer", set: "add", count: 1 },
                        { op: "item", item: "letter-miner", set: "add", count: 1 },
                        { op: "item", item: "letter-keeper", set: "add", count: 1 },
                        { op: "se", name: "receive" },
                        txt(["POSTMASTER: Farm east, mine west, and the", "lighthouse beyond the pine trail."]),
                      ],
                    },
                  ],
                },
                { text: "Not yet", commands: [txt(["POSTMASTER: Dusk won't wait, courier."])] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "shopkeeper",
      name: "Shopkeeper",
      x: 4,
      y: 3,
      pages: [
        {
          trigger: "action",
          sprite: "shopkeeper",
          blocks: true,
          commands: [
            txt(["KEEPER: Matches, hot soup, stamps —", "everything a mountain route needs."]),
            {
              op: "choices",
              prompt: "General store:",
              options: [
                {
                  text: "Matches (5g)",
                  commands: [
                    {
                      op: "if",
                      if: { kind: "gold", amount: 5 },
                      then: [
                        { op: "gold", set: "sub", amount: 5 },
                        { op: "item", item: "matches", set: "add", count: 1 },
                        txt(["KEEPER: Dry tinder meets its match."]),
                      ],
                      else: [txt(["KEEPER: Five gold, friend. The chest", "up north has loose coin, they say."])],
                    },
                  ],
                },
                {
                  text: "Hot soup (15g)",
                  commands: [
                    {
                      op: "if",
                      if: { kind: "gold", amount: 15 },
                      then: [
                        { op: "gold", set: "sub", amount: 15 },
                        { op: "item", item: "soup", set: "add", count: 1 },
                        txt(["KEEPER: Still steaming. For the miner?", "He has not left his hut in days."]),
                      ],
                      else: [txt(["KEEPER: Fifteen gold a bowl. The rain", "makes every copper feel farther."])],
                    },
                  ],
                },
                {
                  text: "Stamp (10g)",
                  commands: [
                    {
                      op: "if",
                      if: { kind: "gold", amount: 10 },
                      then: [
                        { op: "gold", set: "sub", amount: 10 },
                        { op: "item", item: "stamp", set: "add", count: 1 },
                        txt(["KEEPER: First-class ink, mountain-grade."]),
                      ],
                      else: [txt(["KEEPER: Stamps cost ten. The east farm", "pays well for a hand with sheep."])],
                    },
                  ],
                },
                {
                  text: "Sell mushrooms",
                  commands: [
                    {
                      op: "if",
                      if: { kind: "item", id: "mushroom", count: 2 },
                      then: [
                        { op: "item", item: "mushroom", set: "sub", count: 2 },
                        { op: "gold", set: "add", amount: 6 },
                        txt(["KEEPER: Two woodland mushrooms, six gold.", "A fair price on a wet day."]),
                      ],
                      else: [
                        {
                          op: "if",
                          if: { kind: "item", id: "mushroom", count: 1 },
                          then: [
                            { op: "item", item: "mushroom", set: "sub", count: 1 },
                            { op: "gold", set: "add", amount: 3 },
                            txt(["KEEPER: One mushroom, three gold. The", "pine trail grows more by the minute."]),
                          ],
                          else: [txt(["KEEPER: Bring pine-trail mushrooms and", "I will buy them, three gold each."])],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "clerk",
      name: "Parcel Clerk",
      x: 6,
      y: 3,
      pages: [
        {
          trigger: "action",
          sprite: "clerk",
          blocks: true,
          commands: [
            txt(["CLERK: Five of my parcels blew across", "the mountain. I would pay twenty gold", "for all five."])
            ,
            {
              op: "if",
              if: { kind: "variable", id: "parcels", op: ">=", value: 5 },
              then: [
                {
                  op: "if",
                  if: { kind: "switch", id: "parcels-done" },
                  then: [txt(["CLERK: The route is safer with you on it."])],
                  else: [
                    { op: "switch", id: "parcels-done", value: true },
                    { op: "gold", set: "add", amount: 20 },
                    { op: "se", name: "coin" },
                    txt(["CLERK: All five! Here is twenty gold,", "and my thanks. Rain or shine, courier."]),
                  ],
                },
              ],
              else: [txt(["CLERK: Check the farm, mine, pine trail,", "and the lighthouse path. Wind travels."])],
            },
          ],
        },
      ],
    },
    {
      id: "village-chest",
      name: "Rainy-Day Chest",
      x: 21,
      y: 3,
      pages: [
        {
          trigger: "action",
          sprite: "chest-closed",
          blocks: true,
          commands: [
            { op: "gold", set: "add", amount: 25 },
            { op: "se", name: "coin" },
            { op: "selfSwitch", key: "A", value: true },
            txt(["Found 25 gold saved for cable repairs.", "The mountain can have it, for today."]),
          ],
        },
        {
          condition: { selfSwitch: "A" },
          trigger: "action",
          sprite: "chest-open",
          blocks: true,
          commands: [txt(["Empty now. The rain drums the lid like", "a counter waiting for coin."])],
        },
      ],
    },
    {
      id: "sign",
      name: "Hamlet Sign",
      x: 9,
      y: 8,
      pages: [
        {
          trigger: "action",
          sprite: "sign",
          blocks: false,
          commands: [txt(["<Mountain Hamlet>", "E: East-Slope Farm   W: West Mine", "N: Pine Trail -> Lighthouse"])],
        },
      ],
    },
    {
      id: "mailbox",
      name: "Post Box",
      x: 14,
      y: 10,
      pages: [
        {
          trigger: "action",
          sprite: "mailbox",
          blocks: true,
          commands: [txt(["Out of service — the road is out.", "All mail goes by hand up the trail."])],
        },
      ],
    },
    {
      id: "ropeway-sign",
      name: "Cable-Car Notice",
      x: 16,
      y: 11,
      pages: [
        {
          trigger: "action",
          sprite: "sign",
          blocks: false,
          commands: [txt(["<Cable Car Station>", "Last car today: dusk. After that,", "the mountain walks alone."])],
        },
      ],
    },
    {
      id: "wanderer",
      name: "Wandering Farmer",
      x: 16,
      y: 9,
      pages: [
        {
          trigger: "action",
          sprite: "wanderer",
          blocks: true,
          moveType: "random",
          commands: [txt(["FARMER: The east bridge holds, mostly.", "Mind the sheep. They have opinions."])],
        },
      ],
    },
    {
      id: "gate-east",
      name: "Path to the Farm",
      x: 23,
      y: 7,
      pages: [{ trigger: "playerTouch", sprite: null, commands: [{ op: "transfer", map: "farm", x: 1, y: 7, dir: "right" }] }],
    },
    {
      id: "gate-west",
      name: "Path to the Mine",
      x: 0,
      y: 7,
      pages: [{ trigger: "playerTouch", sprite: null, commands: [{ op: "transfer", map: "mine", x: 14, y: 6, dir: "left" }] }],
    },
    {
      id: "gate-north",
      name: "Path to the Pines",
      x: 12,
      y: 0,
      pages: [{ trigger: "playerTouch", sprite: null, commands: [{ op: "transfer", map: "pine", x: 9, y: 10, dir: "up", fade: 0.3 }] }],
    },
  ];
  return m;
}

// ===========================================================================
// ② farm — East-Slope Farm (22x14)
// ===========================================================================

function farm(): MapDef {
  const W = 22;
  const H = 14;
  const m: MapDef = {
    id: "farm",
    name: "East-Slope Farm",
    width: W,
    height: H,
    sheets: [...SHEETS],
    ground: fill(W, H, t(0)),
    events: [],
  };
  const rnd = mulberry32(SEEDS.farm);

  // Roads: west entry along row 7, north to the fields on col 12,
  // south to the barn door on col 17.
  for (let x = 1; x <= 10; x++) road(m, x, 7, rnd);
  for (let y = 1; y <= 7; y++) road(m, 12, y, rnd);
  for (let y = 8; y <= 12; y++) road(m, 17, y, rnd);
  road(m, 11, 7, rnd);
  road(m, 12, 7, rnd);

  // Three raised beds, cols 14/17/20 rows 1..5, crops on the middles.
  for (const bx of [14, 17, 20]) {
    paint(m, bx, 1, bx === 17 ? f(1) : f(0));
    for (let y = 2; y <= 4; y++) paint(m, bx, y, f(bx === 20 ? 25 : 24));
    paint(m, bx, 5, f(bx === 17 ? 13 : 12));
  }
  upper(m, 14, 2, f(8));
  upper(m, 14, 4, f(8));
  upper(m, 17, 2, f(17));
  upper(m, 17, 4, f(20));
  upper(m, 20, 2, f(29));
  upper(m, 20, 4, f(31));
  upper(m, 12, 2, f(83));
  upper(m, 9, 2, f(83));
  upper(m, 9, 5, f(54));

  // Barn (red), rows 9..12 cols 15..20, door (17,12).
  for (let x = 15; x <= 20; x++) upper(m, x, 9, t(44), true);
  for (const x of [15, 16, 18, 19, 20]) upper(m, x, 12, t(44), true);
  for (let y = 10; y <= 11; y++) {
    upper(m, 15, y, t(46), true);
    upper(m, 20, y, t(47), true);
    for (let x = 16; x <= 19; x++) paint(m, x, y, t(43));
  }
  paint(m, 17, 12, t(88));
  upper(m, 17, 9, t(93), true); // hanging sign on the beam

  // Sheep pen, SW: fence rows 9..12 cols 2..6, gate opening (6,11).
  for (let x = 2; x <= 6; x++) upper(m, x, 9, t(68), true);
  upper(m, 2, 10, t(69), true);
  // East gate at (6,11): a low hurdle the herd route (and the player)
  // crosses; tall posts stand on either side.
  upper(m, 6, 10, t(71), true);
  upper(m, 6, 11, t(85), false);
  upper(m, 2, 11, t(69), true);
  upper(m, 2, 12, t(68), true);
  for (const x of [3, 4, 5]) upper(m, x, 12, t(68), true);
  upper(m, 6, 12, t(71), true);

  // Creek, NE corner.
  for (const [x, y] of [[20, 1], [20, 2], [21, 1]]) paint(m, x, y, d(30), "block");
  for (const [x, y] of [[19, 1], [19, 2], [20, 3], [21, 2], [21, 3], [19, 3]]) upper(m, x, y, t(3), true);

  // Decor.
  upper(m, 8, 11, f(122)); // chicken
  upper(m, 8, 8, f(123)); // milk can
  upper(m, 12, 8, f(85)); // rain barrel
  upper(m, 13, 9, f(74)); // sack
  upper(m, 2, 7, f(78)); // berry bush by the road
  upper(m, 15, 7, f(96)); // loose hay bale
  upper(m, 4, 8, t(29));

  scatterGrass(m, SEEDS.farm);
  treeRing(m, rnd, new Set([7 * W]));

  const parcel = (id: string, x: number, y: number): GameEvent => ({
    id,
    name: "Lost Parcel",
    x,
    y,
    pages: [
      {
        trigger: "action",
        sprite: "parcel",
        blocks: true,
        commands: [
          { op: "common", id: "ce-pick-parcel" },
          { op: "selfSwitch", key: "A", value: true },
          txt(["A damp parcel with the shop's seal.", "You tuck it into the bag."]),
        ],
      },
      { condition: { selfSwitch: "A" }, trigger: "action", sprite: null, blocks: false, commands: [] },
    ],
  });
  const haybale = (id: string, x: number, y: number): GameEvent => ({
    id,
    name: "Dry Hay",
    x,
    y,
    pages: [
      {
        trigger: "action",
        sprite: "hay",
        blocks: true,
        commands: [
          { op: "item", item: "hay", set: "add", count: 1 },
          { op: "selfSwitch", key: "A", value: true },
          txt(["Bound a bundle of dry hay."]),
        ],
      },
      { condition: { selfSwitch: "A" }, trigger: "action", sprite: null, blocks: false, commands: [] },
    ],
  });

  m.events = [
    {
      id: "farm-return",
      name: "Path to the Hamlet",
      x: 0,
      y: 7,
      pages: [{ trigger: "playerTouch", sprite: null, commands: [{ op: "transfer", map: "hub", x: 22, y: 7, dir: "left" }] }],
    },
    {
      id: "farmer",
      name: "East-Slope Farmer",
      x: 10,
      y: 8,
      pages: [
        {
          trigger: "action",
          sprite: "farmer",
          blocks: true,
          commands: [
            txt(["FARMER: A letter? Aye — but first,", "three hay bundles from the field edge,", "or the sheep won't follow me home."]),
            {
              op: "if",
              if: { kind: "item", id: "letter-farmer", count: 1 },
              then: [
                {
                  op: "choices",
                  prompt: "Open the pen with three hay?",
                  options: [
                    {
                      text: "Herd them home",
                      commands: [
                        {
                          op: "if",
                          if: { kind: "item", id: "hay", count: 3 },
                          then: [
                            { op: "item", item: "hay", set: "sub", count: 3 },
                            { op: "item", item: "letter-farmer", set: "sub", count: 1 },
                            { op: "gold", set: "add", amount: 10 },
                            { op: "switch", id: "sheep-herd", value: true },
                            { op: "switch", id: "farmer-done", value: true },
                            { op: "se", name: "receive" },
                            txt(["FARMER: Watch — they know the way.", "Ten gold for the route, courier."]),
                          ],
                          else: [txt(["FARMER: Three dry bundles, by the field", "edge. Rain swells the rest."])],
                        },
                      ],
                    },
                    { text: "Later", commands: [txt(["FARMER: They will wait. Hay won't."])] },
                  ],
                },
              ],
              else: [txt(["FARMER: Post's business, is it? I'll take", "my letter once the sheep are settled."])],
            },
          ],
        },
        {
          condition: { switch: "farmer-done" },
          trigger: "action",
          sprite: "farmer",
          blocks: true,
          commands: [txt(["FARMER: Sheep are quiet, letter is read.", "Safe on the rocks up high."])],
        },
      ],
    },
    {
      id: "sheep",
      name: "Stray Sheep",
      x: 10,
      y: 10,
      pages: [
        { trigger: "action", sprite: "sheep", blocks: true, commands: [txt(["Baa. It stares at the open hillside."])] },
        {
          // When the herd switch flips, the sheep walks its waited route
          // through the (6,11) gate to (4,11), then hands off to the
          // pen-sheep page below.
          condition: { switch: "sheep-herd" },
          trigger: "autorun",
          sprite: "sheep",
          blocks: false,
          commands: [
            { op: "wait", seconds: 0.4 },
            {
              op: "moveRoute",
              target: "this",
              wait: true,
              route: {
                steps: [
                  "moveLeft", "moveLeft", "moveLeft",
                  "moveDown",
                  "moveLeft", "moveLeft", "moveLeft",
                ],
                repeat: false,
                skippable: false,
              },
            },
            { op: "selfSwitch", key: "A", value: true },
            { op: "exit" },
          ],
        },
        { condition: { selfSwitch: "A" }, trigger: "action", sprite: null, blocks: false, commands: [] },
      ],
    },
    {
      // Persistent in-pen sheep after herding. Stands one tile west of the
      // route end so the moving sheep can occupy (4,11): characters never
      // enter another character's tile.
      id: "pen-sheep",
      name: "Penned Sheep",
      x: 3,
      y: 11,
      pages: [
        { trigger: "action", sprite: null, blocks: false, commands: [] },
        {
          condition: { switch: "sheep-herd" },
          trigger: "action",
          sprite: "sheep",
          blocks: false,
          commands: [txt(["Baa. Warm, dry, and home."])],
        },
      ],
    },
    haybale("hay-1", 13, 6),
    haybale("hay-2", 16, 6),
    haybale("hay-3", 19, 6),
    parcel("parcel-farm-1", 13, 7),
    parcel("parcel-farm-2", 19, 8),
  ];
  return m;
}

// ===========================================================================
// ③ mine — West-Slope Mine (16x12)
// ===========================================================================

function mine(): MapDef {
  const W = 16;
  const H = 12;
  const m: MapDef = {
    id: "mine",
    name: "West-Slope Mine",
    width: W,
    height: H,
    sheets: [...SHEETS],
    ground: fill(W, H, t(0)),
    events: [],
  };
  const rnd = mulberry32(SEEDS.mine);

  for (let x = 4; x <= 15; x++) road(m, x, 6, rnd);
  paint(m, 8, 6, t(80));
  paint(m, 9, 6, t(80));

  // Stone hut rows 1..4 cols 1..5, door (3,4).
  for (let x = 1; x <= 5; x++) upper(m, x, 1, d(28), true);
  for (let y = 2; y <= 3; y++) {
    upper(m, 1, y, d(28), true);
    upper(m, 5, y, d(28), true);
    for (let x = 2; x <= 4; x++) paint(m, x, y, d(48));
  }
  paint(m, 3, 4, d(30), "pass");

  // Gravel and track works.
  paint(m, 3, 9, d(24));
  paint(m, 12, 7, d(24));
  paint(m, 4, 10, d(25));
  upper(m, 6, 8, d(69));
  upper(m, 7, 8, d(69));
  upper(m, 9, 8, d(82));
  upper(m, 11, 9, d(89));
  upper(m, 12, 9, d(89));
  upper(m, 5, 9, t(112));
  upper(m, 13, 10, d(77));
  upper(m, 8, 3, d(54));
  upper(m, 14, 4, t(30));

  scatterGrass(m, SEEDS.mine);
  treeRing(m, rnd, new Set([6 * W + 15]));

  m.events = [
    {
      id: "mine-return",
      name: "Path to the Hamlet",
      x: 15,
      y: 6,
      pages: [{ trigger: "playerTouch", sprite: null, commands: [{ op: "transfer", map: "hub", x: 1, y: 7, dir: "right" }] }],
    },
    {
      id: "miner",
      name: "Fevered Miner",
      x: 3,
      y: 2,
      pages: [
        {
          trigger: "action",
          sprite: "miner",
          blocks: true,
          commands: [
            txt(["MINER: That fever... the rain bit deep.", "Hot soup would put me right. The", "general store keeps it simmering."]),
            {
              op: "if",
              if: { kind: "item", id: "letter-miner", count: 1 },
              then: [
                {
                  op: "choices",
                  prompt: "Offer something hot?",
                  options: [
                    {
                      text: "Give hot soup",
                      commands: [
                        {
                          op: "if",
                          if: { kind: "item", id: "soup", count: 1 },
                          then: [
                            { op: "item", item: "soup", set: "sub", count: 1 },
                            { op: "item", item: "letter-miner", set: "sub", count: 1 },
                            { op: "switch", id: "miner-done", value: true },
                            { op: "se", name: "receive" },
                            txt(["MINER: Steam right to the bones. Here,", "your letter — stamped and read. Go,", "the trail worsens past the pines."]),
                          ],
                          else: [txt(["MINER: Soup from the hamlet store.", "Fifteen gold, worth every copper."])],
                        },
                      ],
                    },
                    { text: "Rest now", commands: [txt(["MINER: I'll be here. The mountain", "is in no hurry today."])] },
                  ],
                },
              ],
              else: [txt(["MINER: Post can wait till my hands stop", "shaking. Soup first, letters after."])],
            },
          ],
        },
        {
          condition: { switch: "miner-done" },
          trigger: "action",
          sprite: "miner",
          blocks: true,
          commands: [txt(["MINER: Warm again. The pine bridge is", "out, you know. The hermit can help."])],
        },
      ],
    },
    {
      id: "med-window",
      name: "Apothecary Window",
      x: 5,
      y: 2,
      pages: [
        {
          trigger: "action",
          sprite: null,
          blocks: false,
          commands: [txt(["The apothecary's window is shuttered.", "A chalk note: SOUP, HOT, OFTEN."])],
        },
      ],
    },
    {
      id: "mine-sign",
      name: "Mine Sign",
      x: 14,
      y: 5,
      pages: [
        {
          trigger: "action",
          sprite: "sign",
          blocks: false,
          commands: [txt(["<West-Slope Mine>", "The ore waits. The fever doesn't."])],
        },
      ],
    },
    {
      id: "parcel-mine",
      name: "Lost Parcel",
      x: 6,
      y: 9,
      pages: [
        {
          trigger: "action",
          sprite: "parcel",
          blocks: true,
          commands: [
            { op: "common", id: "ce-pick-parcel" },
            { op: "selfSwitch", key: "A", value: true },
            txt(["A parcel wedged behind the cart", "rails. Into the bag it goes."]),
          ],
        },
        { condition: { selfSwitch: "A" }, trigger: "action", sprite: null, blocks: false, commands: [] },
      ],
    },
  ];
  return m;
}

// ===========================================================================
// ④ pine — Pine Trail (18x12)
// ===========================================================================

function pine(): MapDef {
  const W = 18;
  const H = 12;
  const m: MapDef = {
    id: "pine",
    name: "Pine Trail",
    width: W,
    height: H,
    sheets: [...SHEETS],
    ground: fill(W, H, t(0)),
    events: [],
  };
  const rnd = mulberry32(SEEDS.pine);

  // Three-wide winding corridor from (9,10) up to the bridge row 0.
  const path = new Set<number>();
  const seg = (x0: number, y0: number, x1: number, y1: number): void => {
    const dx = Math.sign(x1 - x0);
    const dy = Math.sign(y1 - y0);
    let x = x0;
    let y = y0;
    for (;;) {
      path.add(y * W + x);
      if (dx !== 0) {
        path.add((y - 1) * W + x);
        path.add((y + 1) * W + x);
      }
      if (dy !== 0) {
        path.add(y * W + x - 1);
        path.add(y * W + x + 1);
      }
      if (x === x1 && y === y1) break;
      x += dx;
      y += dy;
    }
  };
  seg(9, 10, 9, 8);
  seg(9, 8, 5, 8);
  seg(5, 8, 5, 3);
  seg(5, 3, 13, 3); // east branch: mushroom at (13,3)
  seg(10, 8, 13, 8); // south branch: parcel at (13,8)
  seg(10, 3, 10, 0);
  // The hermit's camp clearing stays open around (4,3)/(4,5).
  for (const [cx, cy] of [
    [3, 3], [4, 3], [5, 3], [6, 3],
    [3, 4], [4, 4], [5, 4], [6, 4],
    [3, 5], [4, 5], [5, 5],
    [4, 2], [4, 6],
  ]) path.add(cy * W + cx);
  const trees = [t(3), t(15), t(26), f(3), f(26), t(2), t(27)];
  for (let i = 0; i < W * H; i++) {
    if (path.has(i)) continue;
    const x = i % W;
    const y = Math.floor(i / W);
    if (x === 0 || y === H - 1 || x === W - 1) continue; // ring fills borders
    upper(m, x, y, trees[Math.floor(rnd() * trees.length)]!, true);
  }
  // Bridge planks north.
  for (const x of [8, 9, 10]) {
    paint(m, x, 0, t(80));
    paint(m, x, 1, t(80));
  }
  upper(m, 7, 3, t(29));
  upper(m, 12, 5, t(17));

  scatterGrass(m, SEEDS.pine);
  // Gaps: bridge cells (8..10,0) and the south return pad (9,11).
  treeRing(m, rnd, new Set([8, 9, 10, 11 * W + 9]));

  const shroom = (id: string, x: number, y: number): GameEvent => ({
    id,
    name: "Woodland Mushrooms",
    x,
    y,
    pages: [
      {
        trigger: "action",
        sprite: "mushrooms",
        blocks: true,
        commands: [
          { op: "item", item: "mushroom", set: "add", count: 1 },
          { op: "selfSwitch", key: "A", value: true },
          txt(["Picked woodland mushrooms. The shop", "buys these on wet days."]),
        ],
      },
      { condition: { selfSwitch: "A" }, trigger: "action", sprite: null, blocks: false, commands: [] },
    ],
  });

  m.events = [
    {
      id: "pine-return",
      name: "Path to the Hamlet",
      x: 9,
      y: 11,
      pages: [{ trigger: "playerTouch", sprite: null, commands: [{ op: "transfer", map: "hub", x: 12, y: 1, dir: "down" }] }],
    },
    {
      id: "hermit",
      name: "Trail Hermit",
      x: 4,
      y: 3,
      pages: [
        {
          trigger: "action",
          sprite: "hermit",
          blocks: true,
          commands: [
            txt(["HERMIT: Bridge north is out. I can cut", "new planks, but my tinder is soaked.", "One box of matches and I'll work."]),
            {
              op: "choices",
              prompt: "Help repair the bridge?",
              options: [
                {
                  text: "Give matches",
                  commands: [
                    {
                      op: "if",
                      if: { kind: "item", id: "matches", count: 1 },
                      then: [
                        { op: "item", item: "matches", set: "sub", count: 1 },
                        { op: "switch", id: "fire-lit", value: true },
                        { op: "switch", id: "bridge-fixed", value: true },
                        { op: "se", name: "unlock" },
                        txt(["HERMIT: Smoke, then flame. Listen —", "planks already falling into place.", "The lighthouse road is yours."]),
                      ],
                      else: [txt(["HERMIT: The hamlet store sells them,", "five gold the box."])],
                    },
                  ],
                },
                { text: "Not yet", commands: [txt(["HERMIT: Rain waits. The bridge waits."])] },
              ],
            },
          ],
        },
        {
          condition: { switch: "bridge-fixed" },
          trigger: "action",
          sprite: "hermit",
          blocks: true,
          commands: [txt(["HERMIT: Cross anywhere on the planks.", "Tell the keeper the mountain still", "remembers its lights."])],
        },
      ],
    },
    {
      id: "campfire",
      name: "Hermit's Campfire",
      x: 4,
      y: 5,
      pages: [
        { trigger: "action", sprite: "fire-off", blocks: true, commands: [txt(["Cold ash and wet kindling."])] },
        {
          condition: { switch: "fire-lit" },
          trigger: "action",
          sprite: "fire-lit",
          blocks: false,
          commands: [txt(["The fire pops, dry and warm. Somewhere", "north, new planks settle on the bridge."])],
        },
      ],
    },
    shroom("mushroom-1", 6, 7),
    shroom("mushroom-2", 13, 3),
    {
      id: "parcel-pine",
      name: "Lost Parcel",
      x: 13,
      y: 8,
      pages: [
        {
          trigger: "action",
          sprite: "parcel",
          blocks: true,
          commands: [
            { op: "common", id: "ce-pick-parcel" },
            { op: "selfSwitch", key: "A", value: true },
            txt(["A parcel hung on a low pine bough.", "The bag is getting full."]),
          ],
        },
        { condition: { selfSwitch: "A" }, trigger: "action", sprite: null, blocks: false, commands: [] },
      ],
    },
    {
      id: "loose-plank",
      name: "Loose Plank",
      x: 8,
      y: 1,
      pages: [
        {
          trigger: "action",
          sprite: null,
          blocks: false,
          commands: [
            txt(["A loose plank rattles over the gap.", "You kick it into place."]),
            { op: "erase" },
          ],
        },
      ],
    },
    {
      id: "bridge",
      name: "Broken Bridge",
      x: 10,
      y: 0,
      pages: [
        {
          trigger: "action",
          sprite: null,
          blocks: true,
          commands: [txt(["The bridge is gone — wet timber and air", "between here and the lighthouse."])],
        },
        {
          condition: { switch: "bridge-fixed" },
          trigger: "playerTouch",
          sprite: null,
          blocks: false,
          commands: [{ op: "transfer", map: "light", x: 8, y: 12, dir: "up", fade: 0.4 }],
        },
      ],
    },
  ];
  return m;
}

// ===========================================================================
// ⑤ light — Lighthouse Top (16x14)
// ===========================================================================

function light(): MapDef {
  const W = 16;
  const H = 14;
  const m: MapDef = {
    id: "light",
    name: "Lighthouse Top",
    width: W,
    height: H,
    sheets: [...SHEETS],
    ground: fill(W, H, t(0)),
    events: [],
  };
  const rnd = mulberry32(SEEDS.light);

  for (let y = 6; y <= 13; y++) road(m, 8, y, rnd);

  // Keeper's cottage, SW: rows 10..12 cols 1..5, door (3,12).
  for (let x = 1; x <= 5; x++) upper(m, x, 10, t(44), true);
  for (const x of [1, 2, 4, 5]) upper(m, x, 12, t(44), true);
  for (let y = 11; y <= 11; y++) {
    upper(m, 1, y, t(46), true);
    upper(m, 5, y, t(47), true);
    for (let x = 2; x <= 4; x++) paint(m, x, y, t(43));
  }
  paint(m, 3, 12, t(88));

  // Lighthouse tower, cols 7..8 rows 1..5.
  const tower: Array<[number, number, number, boolean]> = [
    [7, 1, 12, true], [8, 1, 13, true],
    [7, 2, 10, true], [8, 2, 11, true],
    [7, 3, 6, true], [8, 3, 7, true],
    [7, 4, 8, true], [8, 4, 9, true],
    [7, 5, 4, true], [8, 5, 5, false], // doorway cell (page event lives here)
  ];
  for (const [x, y, cell, block] of tower) upper(m, x, y, cu(cell), block);
  paint(m, 8, 5, d(30), "pass");

  // Rocks and scrub.
  upper(m, 11, 8, d(89));
  upper(m, 5, 9, t(30));
  upper(m, 12, 12, t(4));
  upper(m, 2, 8, t(29));
  upper(m, 13, 5, t(3));
  upper(m, 11, 13, f(77));
  paint(m, 10, 9, d(24));
  paint(m, 5, 6, d(25));

  scatterGrass(m, SEEDS.light);
  treeRing(m, rnd, new Set([13 * W + 8]));

  const lamp = (id: string, x: number, y: number, sw: string): GameEvent => ({
    id,
    name: "Beacon Lamp",
    x,
    y,
    pages: [
      {
        trigger: "action",
        sprite: "lamp-off",
        blocks: true,
        commands: [
          {
            op: "if",
            if: { kind: "switch", id: "keeper-done" },
            then: [
              { op: "switch", id: sw, value: true },
              { op: "selfSwitch", key: "A", value: true },
              { op: "se", name: "chime" },
              txt(["The lamp catches and holds, bright", "against the rain."]),
            ],
            else: [txt(["An unlit beacon lamp. The keeper says", "when all three are to be lit."])],
          },
        ],
      },
      {
        condition: { selfSwitch: "A" },
        trigger: "action",
        sprite: "lamp-lit",
        blocks: false,
        commands: [txt(["The lamp burns steady."])],
      },
    ],
  });

  m.events = [
    {
      id: "light-return",
      name: "Path to the Pines",
      x: 8,
      y: 13,
      pages: [{ trigger: "playerTouch", sprite: null, commands: [{ op: "transfer", map: "pine", x: 9, y: 1, dir: "down", fade: 0.4 }] }],
    },
    {
      id: "keeper",
      name: "Lighthouse Keeper",
      x: 8,
      y: 9,
      pages: [
        {
          trigger: "action",
          sprite: "keeper",
          blocks: true,
          commands: [
            txt(["KEEPER: You are late. The beam must", "turn before the cable car stops."]),
            {
              op: "if",
              if: { kind: "item", id: "letter-keeper", count: 1 },
              then: [
                { op: "item", item: "letter-keeper", set: "sub", count: 1 },
                { op: "switch", id: "keeper-done", value: true },
                { op: "se", name: "receive" },
                txt(["KEEPER: My letter, in the rain. Light", "the three lamps by the tower, then", "the door will open."]),
              ],
              else: [txt(["KEEPER: No time for visitors. Post first."])],
            },
          ],
        },
        {
          condition: { switch: "keeper-done" },
          trigger: "action",
          sprite: "keeper",
          blocks: true,
          commands: [txt(["KEEPER: Three lamps. They burn on their", "own once they catch."])],
        },
      ],
    },
    lamp("lamp-1", 6, 7, "lamp-1"),
    lamp("lamp-2", 10, 7, "lamp-2"),
    lamp("lamp-3", 8, 11, "lamp-3"),
    {
      id: "tower-door",
      name: "Beacon Door",
      x: 8,
      y: 6,
      pages: [
        {
          trigger: "action",
          sprite: null,
          blocks: true,
          commands: [
            {
              op: "if",
              if: { kind: "switch", id: "lamp-1" },
              then: [
                {
                  op: "if",
                  if: { kind: "switch", id: "lamp-2" },
                  then: [
                    {
                      op: "if",
                      if: { kind: "switch", id: "lamp-3" },
                      then: [
                        { op: "switch", id: "lamp-ready", value: true },
                        { op: "switch", id: "door-open", value: true },
                        { op: "selfSwitch", key: "A", value: true },
                        { op: "se", name: "unlock" },
                        txt(["Three locks release in one breath.", "The beacon door swings open."]),
                      ],
                      else: [txt(["One lamp is still dark."])],
                    },
                  ],
                  else: [txt(["Two lamps burn. One is still dark."])],
                },
              ],
              else: [txt(["The lamps are not all lit yet."])],
            },
          ],
        },
        {
          condition: { selfSwitch: "A" },
          trigger: "playerTouch",
          sprite: null,
          blocks: false,
          commands: [],
        },
      ],
    },
    {
      id: "beacon-end",
      name: "The Beacon",
      x: 8,
      y: 5,
      pages: [
        {
          trigger: "action",
          sprite: null,
          blocks: false,
          commands: [txt(["The great lamp is cold and silent."])],
        },
        {
          // Fires on entry once the door opens: playerTouch gives the
          // "ending when you walk into the lamp room" behavior without an
          // autorun, which this engine starts regardless of distance.
          condition: { switch: "door-open" },
          trigger: "playerTouch",
          sprite: null,
          commands: [
            { op: "wait", seconds: 0.5 },
            {
              op: "if",
              if: { kind: "variable", id: "parcels", op: ">=", value: 5 },
              then: [
                txt([
                  "THE END.",
                  "The beam cuts the storm open. Three",
                  "letters delivered, five lost parcels",
                  "home. The cable car waits with its",
                ]),
              ],
              else: [
                txt(["THE END.", "The beam cuts the storm open. Three", "letters delivered to the mountain."]),
              ],
            },
            txt(["The last car of the day carries the", "courier down, and the rain lightens."]),
            { op: "selfSwitch", key: "A", value: true },
            { op: "exit" },
          ],
        },
        {
          condition: { selfSwitch: "A" },
          trigger: "parallel",
          sprite: null,
          commands: [],
        },
      ],
    },
    {
      id: "parcel-light",
      name: "Lost Parcel",
      x: 2,
      y: 9,
      pages: [
        {
          trigger: "action",
          sprite: "parcel",
          blocks: true,
          commands: [
            { op: "common", id: "ce-pick-parcel" },
            { op: "selfSwitch", key: "A", value: true },
            txt(["The last parcel, at the top of the", "world. The clerk will not believe it."]),
          ],
        },
        { condition: { selfSwitch: "A" }, trigger: "action", sprite: null, blocks: false, commands: [] },
      ],
    },
  ];
  return m;
}

// ===========================================================================
// project
// ===========================================================================

export const STATIC_SPRITES = {
  postmaster: "dun.88",
  shopkeeper: "dun.86",
  clerk: "dun.85",
  farmer: "farm.109",
  miner: "dun.87",
  hermit: "dun.111",
  keeper: "dun.100",
  wanderer: "farm.108",
  sheep: "farm.120",
  "chest-closed": "dun.90",
  "chest-open": "dun.91",
  sign: "town.83",
  mailbox: "custom.2",
  parcel: "custom.3",
  hay: "farm.96",
  mushrooms: "town.29",
  "fire-off": "custom.14",
  "lamp-off": "custom.15",
} as const;

/** Event page sprite keys that bind an animated vblank atlas instead of a
 *  static <Image> (GameView mounts both nodes per slot and toggles). */
export const ANIM_SPRITE_KEYS: Record<string, { atlas: AnimAtlas; frameStep: number }> = {
  "fire-lit": { atlas: "fire", frameStep: 8 },
  "lamp-lit": { atlas: "lamp", frameStep: 22 },
};

export type AnimAtlas = "water" | "fire" | "lamp" | "beacon";

export interface AnimCell {
  x: number;
  y: number;
  atlas: AnimAtlas;
  layer: "ground" | "object";
  frameStep: number;
  when?: string;
}

export const ANIMATIONS: Record<string, AnimCell[]> = {
  hub: [
    { x: 21, y: 11, atlas: "water", layer: "ground", frameStep: 24 },
    { x: 22, y: 11, atlas: "water", layer: "ground", frameStep: 24 },
    { x: 21, y: 12, atlas: "water", layer: "ground", frameStep: 24 },
    { x: 22, y: 12, atlas: "water", layer: "ground", frameStep: 24 },
    { x: 9, y: 5, atlas: "lamp", layer: "object", frameStep: 22 },
    { x: 14, y: 5, atlas: "lamp", layer: "object", frameStep: 22 },
  ],
  farm: [
    { x: 20, y: 1, atlas: "water", layer: "ground", frameStep: 24 },
    { x: 20, y: 2, atlas: "water", layer: "ground", frameStep: 24 },
    { x: 21, y: 1, atlas: "water", layer: "ground", frameStep: 24 },
  ],
  mine: [],
  pine: [],
  light: [{ x: 8, y: 1, atlas: "beacon", layer: "object", frameStep: 10, when: "lamp-ready" }],
};

export function buildGame(): { project: Project; maps: MapDef[] } {
  const maps = [hub(), farm(), mine(), pine(), light()];
  // Collapse duplicate passage overrides; "pass" wins ties.
  for (const m of maps) {
    if (!m.passage) continue;
    const byIndex = new Map<number, "pass" | "block">();
    for (const [idx, flag] of m.passage) byIndex.set(idx, byIndex.get(idx) === "pass" ? "pass" : flag);
    m.passage = [...byIndex.entries()].sort((a, b) => a[0] - b[0]);
  }
  const sprites: NonNullable<Project["sprites"]> = {};
  for (const [name] of Object.entries(STATIC_SPRITES)) {
    sprites[name] = { kind: "image", src: `assets/npc/${name}.png` };
  }
  const project: Project = {
    format: "rpgkit-project/v1",
    title: "Alpine Post",
    tileSize: 16,
    start: { map: "hub", x: 12, y: 12, dir: "up" },
    initialGold: 0,
    sheets: [TOWN, DUN, FARM, CUSTOM],
    commonEvents: [
      {
        id: "ce-pick-parcel",
        trigger: "none",
        commands: [
          { op: "variable", id: "parcels", set: { op: "add", value: 1 } },
          { op: "se", name: "coin", volume: 50 },
        ],
      },
    ],
    items: [
      { id: "letter-farmer", name: "Letter: Farm", sprite: "town.93" },
      { id: "letter-miner", name: "Letter: Mine", sprite: "town.94" },
      { id: "letter-keeper", name: "Letter: Keeper", sprite: "town.95" },
      { id: "hay", name: "Dry Hay", sprite: "farm.96" },
      { id: "soup", name: "Hot Soup", sprite: "dun.116" },
      { id: "matches", name: "Matches", sprite: "town.126" },
      { id: "stamp", name: "Stamp", sprite: "town.105" },
      { id: "mushroom", name: "Mushrooms", sprite: "town.29" },
    ],
    sprites,
    maps,
  };
  return { project, maps };
}
