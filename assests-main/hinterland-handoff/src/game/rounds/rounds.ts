// Hut Rounds data (JOURNEYS §1.11): five huts with orders and gifts, a depot, and the pure rules
// (what to load, whether an order is complete). Gifts become cargo for other huts, so rounds chain.
import type { HutKind } from "../world/props/huts";

export const ITEMS = {
  flour: ["sack of flour", "sacks of flour"], sugar: ["tin of sugar", "tins of sugar"], batteries: ["set of batteries", "sets of batteries"],
  paper: ["paper roll", "paper rolls"], firewood: ["bundle of firewood", "bundles of firewood"], jars: ["crate of empty jars", "crates of empty jars"],
  lens: ["lens cloth", "lens cloths"], honey: ["pot of honey", "pots of honey"], tea: ["tin of tea", "tins of tea"],
} as const;
export type Item = keyof typeof ITEMS;
export type Bag = Partial<Record<Item, number>>;
/** items the depot supplies; honey and tea only come as gifts */
export const DEPOT_ITEMS: Item[] = ["flour", "sugar", "batteries", "paper", "firewood", "jars", "lens"];
export const CAPACITY = 6;

export const noun = (i: Item, n: number) => `${n} ${ITEMS[i][n === 1 ? 0 : 1]}`;
export const bagText = (b: Bag) => (Object.entries(b) as [Item, number][]).filter(([, n]) => n > 0).map(([i, n]) => noun(i, n)).join(" · ");
export const count = (b: Bag) => Object.values(b).reduce((a, n) => a + (n ?? 0), 0);

export interface Hut {
  id: string; kind: HutKind; name: string; keeper: string; order: Bag; gift: Bag; giftText: string;
  /** what else the visit unlocks */
  unlock?: "forecast" | "meteors"; line: string; colour: string; emblem: string;
  /** world position (open, dry meadow east of the start; scanned for slope and trees); the door faces the depot */
  x: number; z: number; yaw: number;
}
export const HUTS: Hut[] = [
  { id: "tea", kind: "tea", name: "Tea house", keeper: "Marlo", order: { flour: 2, sugar: 1 }, gift: { tea: 1 }, giftText: "a thermos and a tin of tea", line: "Flour, and sugar! The kettle never went cold. Take a thermos, and some tea for the star-watcher.", colour: "#B0473A", emblem: "☕", x: 100, z: 26, yaw: 0 },
  { id: "weather", kind: "weather", name: "Weather station", keeper: "Ines", order: { batteries: 1, paper: 1 }, gift: {}, giftText: "the forecast", line: "Batteries and paper. Now I can write the weather down. Rest anywhere, and I'll tell you what tomorrow could be.", colour: "#3E6FA8", emblem: "⌁", unlock: "forecast", x: 52, z: 74, yaw: 0 },
  { id: "bakery", kind: "bakery", name: "Bakery", keeper: "Dov", order: { firewood: 1, flour: 1, honey: 1 }, gift: {}, giftText: "a warm loaf", line: "Firewood, flour and honey. The oven is roaring. Here, a loaf for the road.", colour: "#C9A04A", emblem: "◐", x: 88, z: 86, yaw: 0 },
  { id: "bees", kind: "bees", name: "Beekeeper", keeper: "Odo", order: { jars: 1 }, gift: { honey: 1 }, giftText: "3 pots of honey", line: "Jars! The bees have been impatient. Take some honey for the bakery.", colour: "#D9A93A", emblem: "★", x: 76, z: -34, yaw: 0 },
  { id: "stars", kind: "stars", name: "Star-watcher", keeper: "Wen", order: { lens: 1, tea: 1 }, gift: {}, giftText: "a night of meteors", line: "A clean lens and hot tea. Come back after dark, and keep looking up.", colour: "#3B4A6B", emblem: "✦", unlock: "meteors", x: 4, z: -46, yaw: 0 },
];
export const DEPOT = { x: 76, z: 50, yaw: 0 };
/** a yaw that turns a door (local −z) toward a point */
const facing = (x: number, z: number) => Math.atan2(-(DEPOT.x - x), -(DEPOT.z - z));
HUTS.forEach((h) => { h.yaw = facing(h.x, h.z); });
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

/** What the depot loads next: each undelivered hut's missing depot items, in order, up to the rack's capacity. */
export function loadPlan(carried: Bag, delivered: Set<string>): Bag {
  const out: Bag = {}, have = { ...carried };
  let room = CAPACITY - count(carried);
  for (const h of HUTS) {
    if (delivered.has(h.id)) continue;
    for (const [i, n] of Object.entries(h.order) as [Item, number][]) {
      if (!DEPOT_ITEMS.includes(i)) continue;
      const use = Math.min(have[i] ?? 0, n), need = Math.min(n - use, room);
      have[i] = (have[i] ?? 0) - use;
      if (need > 0) { out[i] = (out[i] ?? 0) + need; room -= need; }
    }
  }
  return out;
}
export const missing = (h: Hut, carried: Bag): Bag => {
  const m: Bag = {};
  for (const [i, n] of Object.entries(h.order) as [Item, number][]) if ((carried[i] ?? 0) < n) m[i] = n - (carried[i] ?? 0);
  return m;
};

if (import.meta.env.DEV) {
  const p = loadPlan({}, new Set());
  console.assert(count(p) === CAPACITY, "depot fills the rack", p);
  console.assert(count(missing(HUTS[0], { flour: 2, sugar: 1 })) === 0, "complete order");
}
