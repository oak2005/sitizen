import type { CardDef, GroupId, NamedGroupId, SpaceDef } from "./types";

export const LOOP = 40;
export const LOTS_PER_EXPANSION = 4;
export const MAX_EXPANSIONS = 50;
export const DISTRICT_LOOP = LOOP + LOTS_PER_EXPANSION * MAX_EXPANSIONS;
export const BOARD_GRID = 11;

const CORE: SpaceDef[] = [
  { id: 0, name: "GO", short: "GO", kind: "go" },
  { id: 1, name: "Ivory Lane", short: "Ivory", kind: "property", group: "brown", price: 60, rent: 16 },
  { id: 2, name: "Fortune", short: "Fortune", kind: "fortune" },
  { id: 3, name: "Cedar Court", short: "Cedar", kind: "property", group: "brown", price: 60, rent: 16 },
  { id: 4, name: "City Levy", short: "Levy", kind: "tax", tax: 200 },
  { id: 5, name: "North Line", short: "N Line", kind: "transit", group: "transit", price: 200, rent: 25 },
  { id: 6, name: "Canal Walk", short: "Canal", kind: "property", group: "sky", price: 100, rent: 24 },
  { id: 7, name: "Harbor Row", short: "Harbor", kind: "property", group: "sky", price: 100, rent: 24 },
  { id: 8, name: "Linen Street", short: "Linen", kind: "property", group: "sky", price: 120, rent: 32 },
  { id: 9, name: "Chance", short: "Chance", kind: "chance" },
  { id: 10, name: "Jail", short: "Jail", kind: "jail" },
  { id: 11, name: "Market Square", short: "Market", kind: "property", group: "rose", price: 140, rent: 40 },
  { id: 12, name: "Atlas Avenue", short: "Atlas", kind: "property", group: "rose", price: 140, rent: 40 },
  { id: 13, name: "Opera House", short: "Opera", kind: "property", group: "rose", price: 160, rent: 48 },
  { id: 14, name: "Power Plant", short: "Power", kind: "utility", group: "utility", price: 150 },
  { id: 15, name: "East Line", short: "E Line", kind: "transit", group: "transit", price: 200, rent: 25 },
  { id: 16, name: "Copper Yard", short: "Copper", kind: "property", group: "clay", price: 180, rent: 56 },
  { id: 17, name: "Brick Lane", short: "Brick", kind: "property", group: "clay", price: 180, rent: 56 },
  { id: 18, name: "Foundry Street", short: "Foundry", kind: "property", group: "clay", price: 200, rent: 64 },
  { id: 19, name: "Fortune", short: "Fortune", kind: "fortune" },
  { id: 20, name: "Civic Park", short: "Park", kind: "park" },
  { id: 21, name: "Vine Terrace", short: "Vine", kind: "property", group: "brick", price: 220, rent: 72 },
  { id: 22, name: "Ember Road", short: "Ember", kind: "property", group: "brick", price: 220, rent: 72 },
  { id: 23, name: "Grand Arcade", short: "Arcade", kind: "property", group: "brick", price: 240, rent: 80 },
  { id: 24, name: "Chance", short: "Chance", kind: "chance" },
  { id: 25, name: "South Line", short: "S Line", kind: "transit", group: "transit", price: 200, rent: 25 },
  { id: 26, name: "Olive Park", short: "Olive", kind: "property", group: "sand", price: 260, rent: 88 },
  { id: 27, name: "Saffron Hill", short: "Saffron", kind: "property", group: "sand", price: 260, rent: 88 },
  { id: 28, name: "Marigold Way", short: "Marigold", kind: "property", group: "sand", price: 280, rent: 96 },
  { id: 29, name: "Water Works", short: "Water", kind: "utility", group: "utility", price: 150 },
  { id: 30, name: "Go to Jail", short: "To Jail", kind: "gotojail" },
  { id: 31, name: "Pinecrest", short: "Pine", kind: "property", group: "pine", price: 300, rent: 104 },
  { id: 32, name: "Willow Green", short: "Willow", kind: "property", group: "pine", price: 300, rent: 104 },
  { id: 33, name: "Highgrove", short: "Grove", kind: "property", group: "pine", price: 320, rent: 112 },
  { id: 34, name: "Fortune", short: "Fortune", kind: "fortune" },
  { id: 35, name: "West Line", short: "W Line", kind: "transit", group: "transit", price: 200, rent: 25 },
  { id: 36, name: "Chance", short: "Chance", kind: "chance" },
  { id: 37, name: "Silver Quay", short: "Silver", kind: "property", group: "navy", price: 350, rent: 140 },
  { id: 38, name: "Luxury Tax", short: "L. Tax", kind: "tax", tax: 100 },
  { id: 39, name: "Crown Point", short: "Crown", kind: "property", group: "navy", price: 400, rent: 200 },
];

export interface ExpansionDef {
  tier: number;
  group: GroupId;
  label: string;
  lots: [SpaceDef, SpaceDef, SpaceDef];
  utility: SpaceDef;
}

const PRESET: ExpansionDef[] = [
  {
    tier: 1,
    group: "amber",
    label: "Lantern row",
    lots: [
      { id: 40, name: "Amber Wharf", short: "Wharf", kind: "property", group: "amber", price: 420, rent: 160 },
      { id: 41, name: "Brass Court", short: "Brass", kind: "property", group: "amber", price: 420, rent: 160 },
      { id: 42, name: "Lantern Yard", short: "Lantern", kind: "property", group: "amber", price: 460, rent: 180 },
    ],
    utility: { id: 43, name: "Beacon Grid", short: "Beacon", kind: "utility", group: "utility", price: 150 },
  },
  {
    tier: 2,
    group: "iris",
    label: "Iris row",
    lots: [
      { id: 44, name: "Iris Dock", short: "Iris", kind: "property", group: "iris", price: 480, rent: 190 },
      { id: 45, name: "Cobalt Mews", short: "Cobalt", kind: "property", group: "iris", price: 480, rent: 190 },
      { id: 46, name: "Violet Close", short: "Violet", kind: "property", group: "iris", price: 520, rent: 210 },
    ],
    utility: { id: 47, name: "Signal Works", short: "Signal", kind: "utility", group: "utility", price: 150 },
  },
  {
    tier: 3,
    group: "frost",
    label: "Frost row",
    lots: [
      { id: 48, name: "Frost Lane", short: "Frost", kind: "property", group: "frost", price: 540, rent: 220 },
      { id: 49, name: "Pearl Walk", short: "Pearl", kind: "property", group: "frost", price: 540, rent: 220 },
      { id: 50, name: "Glacier Row", short: "Glacier", kind: "property", group: "frost", price: 580, rent: 240 },
    ],
    utility: { id: 51, name: "Ice Plant", short: "Ice", kind: "utility", group: "utility", price: 150 },
  },
  {
    tier: 4,
    group: "plum",
    label: "Plum row",
    lots: [
      { id: 52, name: "Plum Court", short: "Plum", kind: "property", group: "plum", price: 600, rent: 250 },
      { id: 53, name: "Fig Terrace", short: "Fig", kind: "property", group: "plum", price: 600, rent: 250 },
      { id: 54, name: "Damson Yard", short: "Damson", kind: "property", group: "plum", price: 640, rent: 270 },
    ],
    utility: { id: 55, name: "Steam Works", short: "Steam", kind: "utility", group: "utility", price: 150 },
  },
  {
    tier: 5,
    group: "moss",
    label: "Moss row",
    lots: [
      { id: 56, name: "Moss Bank", short: "Moss", kind: "property", group: "moss", price: 660, rent: 280 },
      { id: 57, name: "Fern Alley", short: "Fern", kind: "property", group: "moss", price: 660, rent: 280 },
      { id: 58, name: "Lichen Row", short: "Lichen", kind: "property", group: "moss", price: 700, rent: 300 },
    ],
    utility: { id: 59, name: "Mill Grid", short: "Mill", kind: "utility", group: "utility", price: 150 },
  },
];

const EXTRA_STEMS = [
  "Quartz", "Opal", "Flint", "Hazel", "Garnet", "Sable", "Cinder", "Basil",
  "Umber", "Teal", "Ridge", "Cove", "Glen", "Moor", "Heath", "Wold",
  "Holm", "Ness", "Croft", "Mere", "Vale", "Ashen", "Noon", "Flax",
  "Iron", "Coral", "Maple", "Onyx", "Slate", "Dusky", "Misty", "Fell",
  "Wick", "Holt", "Bramble", "Thorn", "Lark", "Quill", "Amberly", "Nimbus",
  "Pebble", "Shale", "Gorse", "Briar", "Sedge",
];

function makeExpansion(tier: number): ExpansionDef {
  const preset = PRESET[tier - 1];
  if (preset) return preset;
  const idx = tier - 6;
  const stem = EXTRA_STEMS[idx % EXTRA_STEMS.length] ?? `Ward`;
  const gen = Math.floor(idx / EXTRA_STEMS.length);
  const tag = gen > 0 ? ` ${gen + 1}` : "";
  const base = LOOP + (tier - 1) * LOTS_PER_EXPANSION;
  const group: GroupId = `row-${tier}`;
  const price = 420 + (tier - 1) * 40;
  const rent = 160 + (tier - 1) * 16;
  return {
    tier,
    group,
    label: `${stem} row${tag}`,
    lots: [
      { id: base, name: `${stem} Wharf${tag}`, short: stem.slice(0, 7), kind: "property", group, price, rent },
      { id: base + 1, name: `${stem} Court${tag}`, short: "Court", kind: "property", group, price, rent },
      { id: base + 2, name: `${stem} Yard${tag}`, short: "Yard", kind: "property", group, price: price + 40, rent: rent + 20 },
    ],
    utility: {
      id: base + 3,
      name: `${stem} Works${tag}`,
      short: "Works",
      kind: "utility",
      group: "utility",
      price: 150,
    },
  };
}

export const EXPANSIONS: ExpansionDef[] = Array.from({ length: MAX_EXPANSIONS }, (_, i) => makeExpansion(i + 1));

export const SPACES: SpaceDef[] = [...CORE, ...EXPANSIONS.flatMap((exp) => [...exp.lots, exp.utility])];

export const CIRCUIT_SPACES: SpaceDef[] = CORE;

export function expansionAt(tier: number): ExpansionDef | undefined {
  if (tier < 1 || tier > MAX_EXPANSIONS) return undefined;
  return EXPANSIONS[tier - 1];
}

export function expansionsThrough(tier: number): ExpansionDef[] {
  const t = Math.max(0, Math.min(MAX_EXPANSIONS, Math.floor(tier)));
  return EXPANSIONS.slice(0, t);
}

export function spacesOnLoop(loop: number): SpaceDef[] {
  return SPACES.filter((s) => s.id < loop);
}

export function districtSpaces(tier: number): SpaceDef[] {
  return expansionsThrough(tier).flatMap((exp) => [...exp.lots, exp.utility]);
}

export function loopSizeForTier(tier: number): number {
  const t = Math.max(0, Math.min(MAX_EXPANSIONS, Math.floor(tier)));
  return LOOP + LOTS_PER_EXPANSION * t;
}

export function boardGridSize(_tier = 0): number {
  return BOARD_GRID;
}

export function tableCount(tier = 0): number {
  const t = Math.max(0, Math.min(MAX_EXPANSIONS, Math.floor(tier)));
  return 1 + t;
}

export function sideLength(loop: number): number {
  return loop / 4;
}

const SQUARE_TONES = ["amber", "iris", "frost", "plum", "moss", "clay", "navy", "brick"] as const;

export interface TableSquare {
  name: string;
  group: string;
  tone: string;
  from: number;
  to: number;
  spaces: number;
  loop: number;
  grid: number;
}

export function tableSquare(tier: number): TableSquare {
  const t = Math.max(0, Math.min(MAX_EXPANSIONS, Math.floor(tier)));
  const exp = t > 0 ? expansionAt(t) : undefined;
  const stem = t === 0 ? "Founders" : (exp?.label ?? "District").replace(/\s+row.*$/i, "").trim();
  const group = t === 0 ? "founders" : String(exp?.group ?? "utility");
  const tone =
    t === 0
      ? "founders"
      : SQUARE_TONES.includes(group as (typeof SQUARE_TONES)[number])
        ? group
        : SQUARE_TONES[(t - 1) % SQUARE_TONES.length]!;
  return {
    name: `${stem} Square`,
    group,
    tone,
    from: t === 0 ? 1 : t * 100,
    to: Math.min(5000, (t + 1) * 100),
    spaces: loopSizeForTier(t),
    loop: loopSizeForTier(t),
    grid: BOARD_GRID,
  };
}

export function includedSquares(tier: number): TableSquare[] {
  const t = Math.max(0, Math.min(MAX_EXPANSIONS, Math.floor(tier)));
  return Array.from({ length: t + 1 }, (_, i) => tableSquare(i));
}

const ORDER_CACHE = new Map<number, number[]>();
const INDEX_CACHE = new Map<number, Map<number, number>>();
const SLOTS_CACHE = new Map<number, [number[], number[], number[], number[]]>();

const FOUNDERS_EDGES: [number[], number[], number[], number[]] = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [11, 12, 13, 14, 15, 16, 17, 18, 19],
  [21, 22, 23, 24, 25, 26, 27, 28, 29],
  [31, 32, 33, 34, 35, 36, 37, 38, 39],
];

const EXPANSION_EDGE = [3, 2, 1, 0] as const;

export function expansionEdge(tier: number): 0 | 1 | 2 | 3 {
  if (!Number.isInteger(tier) || tier < 1) return 3;
  return EXPANSION_EDGE[(tier - 1) % 4]!;
}

export function sideSlots(loop = LOOP): [number[], number[], number[], number[]] {
  const n = Math.floor(Number(loop));
  const fallback: [number[], number[], number[], number[]] = [
    FOUNDERS_EDGES[0].slice(),
    FOUNDERS_EDGES[1].slice(),
    FOUNDERS_EDGES[2].slice(),
    FOUNDERS_EDGES[3].slice(),
  ];
  if (!Number.isInteger(n) || n < LOOP || n % LOTS_PER_EXPANSION !== 0) return fallback;
  const hit = SLOTS_CACHE.get(n);
  if (hit) return hit;
  const edges: [number[], number[], number[], number[]] = [
    FOUNDERS_EDGES[0].slice(),
    FOUNDERS_EDGES[1].slice(),
    FOUNDERS_EDGES[2].slice(),
    FOUNDERS_EDGES[3].slice(),
  ];
  const tier = (n - LOOP) / LOTS_PER_EXPANSION;
  for (let t = 1; t <= tier; t++) {
    const exp = expansionAt(t);
    if (!exp) break;
    edges[expansionEdge(t)].push(...exp.lots.map((lot) => lot.id), exp.utility.id);
  }
  SLOTS_CACHE.set(n, edges);
  return edges;
}

export function circuitOrder(loop = LOOP): number[] {
  const n = Math.floor(Number(loop));
  if (!Number.isInteger(n) || n < LOOP || n % LOTS_PER_EXPANSION !== 0) {
    return Array.from({ length: LOOP }, (_, i) => i);
  }
  const hit = ORDER_CACHE.get(n);
  if (hit) return hit;
  const edges = sideSlots(n);
  const order = [0, ...edges[0], 10, ...edges[1], 20, ...edges[2], 30, ...edges[3]];
  ORDER_CACHE.set(n, order);
  return order;
}

export function walkIndexOf(id: number, loop = LOOP): number {
  const n = Math.floor(Number(loop)) || LOOP;
  let map = INDEX_CACHE.get(n);
  if (!map) {
    map = new Map(circuitOrder(n).map((spaceId, index) => [spaceId, index]));
    INDEX_CACHE.set(n, map);
  }
  return map.get(id) ?? 0;
}

export function gridFromWalk(index: number, loop = LOOP): { col: number; row: number } {
  const side = sideLength(loop);
  const gridN = side + 1;
  if (index === 0) return { col: gridN, row: gridN };
  if (index < side) return { col: gridN - index, row: gridN };
  if (index === side) return { col: 1, row: gridN };
  if (index < 2 * side) return { col: 1, row: gridN - (index - side) };
  if (index === 2 * side) return { col: 1, row: 1 };
  if (index < 3 * side) return { col: 1 + (index - 2 * side), row: 1 };
  if (index === 3 * side) return { col: gridN, row: 1 };
  return { col: gridN, row: 1 + (index - 3 * side) };
}

export function districtCell(id: number): { col: number; row: number } | null {
  if (!Number.isInteger(id) || id < LOOP) return null;
  const offset = (id - LOOP) % LOTS_PER_EXPANSION;
  if (offset === 0) return { col: 1, row: 1 };
  if (offset === 1) return { col: 2, row: 1 };
  if (offset === 2) return { col: 2, row: 2 };
  return { col: 1, row: 2 };
}

export function spaceGrid(id: number, _loop = LOOP): { col: number; row: number } {
  if (id >= LOOP) return districtCell(id) ?? { col: 1, row: 1 };
  return gridFromWalk(id, LOOP);
}

export function spaceSide(id: number, loop = LOOP): "bottom" | "left" | "top" | "right" | "corner" {
  if (id === 0 || id === 10 || id === 20 || id === 30) return "corner";
  const edges = sideSlots(loop);
  if (edges[0].includes(id)) return "bottom";
  if (edges[1].includes(id)) return "left";
  if (edges[2].includes(id)) return "top";
  if (edges[3].includes(id)) return "right";
  return "bottom";
}

export function uniquePerimeter(loop: number): boolean {
  if (loop < LOOP || loop % LOTS_PER_EXPANSION !== 0) return false;
  const order = circuitOrder(loop);
  if (order.length !== loop || new Set(order).size !== loop) return false;
  if (order[0] !== 0 || !order.includes(10) || !order.includes(20) || !order.includes(30)) return false;
  const seen = new Set<string>();
  for (let id = 0; id < LOOP; id++) {
    const { col, row } = gridFromWalk(id, LOOP);
    if (col < 1 || row < 1 || col > BOARD_GRID || row > BOARD_GRID) return false;
    if (!(col === 1 || col === BOARD_GRID || row === 1 || row === BOARD_GRID)) return false;
    const key = `f:${col}:${row}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  const edges = sideSlots(loop);
  const ids = new Set<number>([0, 10, 20, 30]);
  for (let s = 0; s < 4; s++) {
    const edge = edges[s]!;
    for (let i = 0; i < edge.length; i++) {
      const id = edge[i]!;
      if (ids.has(id)) return false;
      ids.add(id);
      const key = `e:${s}:${i}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
  }
  return ids.size === loop;
}

export function expansionTierOf(id: number): number {
  if (id < LOOP) return 0;
  return Math.floor((id - LOOP) / LOTS_PER_EXPANSION) + 1;
}

export function cornersPinned(_loop?: number): boolean {
  const go = spaceGrid(0, LOOP);
  const jail = spaceGrid(10, LOOP);
  const park = spaceGrid(20, LOOP);
  const toJail = spaceGrid(30, LOOP);
  return (
    go.col === BOARD_GRID &&
    go.row === BOARD_GRID &&
    jail.col === 1 &&
    jail.row === BOARD_GRID &&
    park.col === 1 &&
    park.row === 1 &&
    toJail.col === BOARD_GRID &&
    toJail.row === 1 &&
    spaceSide(0) === "corner" &&
    spaceSide(10) === "corner" &&
    spaceSide(20) === "corner" &&
    spaceSide(30) === "corner"
  );
}

export function blockContiguous(ids: number[], loop: number): boolean {
  const order = circuitOrder(loop);
  const indexes = ids.map((id) => order.indexOf(id));
  if (indexes.some((i) => i < 0)) return false;
  indexes.sort((a, b) => a - b);
  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] !== indexes[i - 1]! + 1) return false;
  }
  return true;
}

export function foundersIntact(loop: number): boolean {
  if (loop < LOOP) return false;
  const base = sideSlots(LOOP);
  const now = sideSlots(loop);
  for (let s = 0; s < 4; s++) {
    const original = base[s]!;
    const edge = now[s]!;
    if (edge.length < original.length) return false;
    for (let i = 0; i < original.length; i++) {
      if (edge[i] !== original[i]) return false;
    }
  }
  for (let id = 0; id < LOOP; id++) {
    const a = spaceGrid(id, loop);
    const b = spaceGrid(id, LOOP);
    if (a.col !== b.col || a.row !== b.row) return false;
    if (spaceSide(id, loop) !== spaceSide(id, LOOP)) return false;
  }
  return cornersPinned(loop);
}

const CORE_GROUPS: Record<string, number[]> = {
  brown: [1, 3],
  sky: [6, 7, 8],
  rose: [11, 12, 13],
  clay: [16, 17, 18],
  brick: [21, 22, 23],
  sand: [26, 27, 28],
  pine: [31, 32, 33],
  navy: [37, 39],
  transit: [5, 15, 25, 35],
  utility: [14, 29],
};

for (const exp of EXPANSIONS) {
  CORE_GROUPS[exp.group] = exp.lots.map((lot) => lot.id);
  CORE_GROUPS.utility = [...(CORE_GROUPS.utility ?? []), exp.utility.id];
}

export const GROUPS: Record<string, number[]> = CORE_GROUPS;

export function lotsOfGroup(group: string | undefined): number[] {
  if (!group) return [];
  return GROUPS[group] ?? [];
}

export const FORTUNE_CARDS: CardDef[] = [
  { id: "f-go", deck: "fortune", text: "Advance to GO. Collect $200.", effect: { type: "goto", position: 0, collectGo: true } },
  { id: "f-bank", deck: "fortune", text: "Bank error in your favour. Collect $150.", effect: { type: "money", amount: 150 } },
  { id: "f-doctor", deck: "fortune", text: "Doctor's fee. Pay $50.", effect: { type: "money", amount: -50 } },
  { id: "f-jail", deck: "fortune", text: "Go to jail. Do not pass GO.", effect: { type: "jail" } },
  { id: "f-free", deck: "fortune", text: "Get out of jail free. Keep this card.", effect: { type: "jailfree" } },
  { id: "f-inherit", deck: "fortune", text: "You inherit $100.", effect: { type: "money", amount: 100 } },
  { id: "f-tax", deck: "fortune", text: "Income tax refund. Collect $75.", effect: { type: "money", amount: 75 } },
  { id: "f-repairs", deck: "fortune", text: "Street repairs. Pay $25 per property you own.", effect: { type: "repairs", perProperty: 25 } },
  { id: "f-opera", deck: "fortune", text: "Opera opening. Collect $50.", effect: { type: "money", amount: 50 } },
  { id: "f-school", deck: "fortune", text: "School fees. Pay $50.", effect: { type: "money", amount: -50 } },
];

export const CHANCE_CARDS: CardDef[] = [
  { id: "c-go", deck: "chance", text: "Advance to GO. Collect $200.", effect: { type: "goto", position: 0, collectGo: true } },
  { id: "c-crown", deck: "chance", text: "Advance to Crown Point.", effect: { type: "goto", position: 39, collectGo: true } },
  { id: "c-market", deck: "chance", text: "Advance to Market Square.", effect: { type: "goto", position: 11, collectGo: true } },
  { id: "c-jail", deck: "chance", text: "Go to jail. Do not pass GO.", effect: { type: "jail" } },
  { id: "c-free", deck: "chance", text: "Get out of jail free. Keep this card.", effect: { type: "jailfree" } },
  { id: "c-back", deck: "chance", text: "Go back three spaces.", effect: { type: "back", steps: 3 } },
  { id: "c-poor", deck: "chance", text: "Speeding fine. Pay $15.", effect: { type: "money", amount: -15 } },
  { id: "c-loan", deck: "chance", text: "Building loan matures. Collect $150.", effect: { type: "money", amount: 150 } },
  { id: "c-chair", deck: "chance", text: "Elected chairperson. Pay each player $25.", effect: { type: "each", amount: 25 } },
  { id: "c-transit", deck: "chance", text: "Advance to the nearest transit line.", effect: { type: "nearest", kind: "transit" } },
  { id: "c-util", deck: "chance", text: "Advance to the nearest utility.", effect: { type: "nearest", kind: "utility" } },
];

export const CARDS: Record<string, CardDef> = Object.fromEntries(
  [...FORTUNE_CARDS, ...CHANCE_CARDS].map((c) => [c.id, c]),
);

export function spaceAt(id: number): SpaceDef {
  if (!Number.isInteger(id) || id < 0 || id >= SPACES.length) {
    throw new Error(`Invalid space ${id}`);
  }
  const space = SPACES[id];
  if (!space) throw new Error(`Invalid space ${id}`);
  return space;
}

export function isPurchasable(space: SpaceDef): boolean {
  return space.kind === "property" || space.kind === "transit" || space.kind === "utility";
}

export function colourGroupsContiguous(): boolean {
  const blockers = new Set(["fortune", "chance", "tax", "transit", "utility", "go", "jail", "park", "gotojail"]);
  return EXPANSIONS.every((exp) => {
    const ids = exp.lots.map((lot) => lot.id);
    for (let i = 1; i < ids.length; i++) {
      if (ids[i] !== ids[i - 1]! + 1) return false;
    }
    if (exp.utility.id !== ids[ids.length - 1]! + 1) return false;
    return ids.every((id) => !blockers.has(spaceAt(id).kind));
  }) && (["sky", "rose", "clay", "brick", "sand", "pine"] as GroupId[]).every((group) => {
    const ids = lotsOfGroup(group);
    for (let i = 1; i < ids.length; i++) {
      if (ids[i] !== ids[i - 1]! + 1) return false;
    }
    return ids.every((id) => !blockers.has(spaceAt(id).kind));
  });
}

const NAMED_LABEL: Record<NamedGroupId, string> = {
  brown: "Ivory row",
  sky: "Harbor row",
  rose: "Market row",
  clay: "Foundry row",
  brick: "Arcade row",
  sand: "Hill row",
  pine: "Grove row",
  navy: "Crown row",
  amber: "Lantern row",
  iris: "Iris row",
  frost: "Frost row",
  plum: "Plum row",
  moss: "Moss row",
  transit: "Transit",
  utility: "Utilities",
};

export const GROUP_LABEL: Record<string, string> = { ...NAMED_LABEL };

for (const exp of EXPANSIONS) {
  GROUP_LABEL[exp.group] = exp.label;
}

export function groupLabel(group: string | undefined): string {
  if (!group) return "";
  return GROUP_LABEL[group] ?? group;
}
