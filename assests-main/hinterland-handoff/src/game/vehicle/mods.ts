// Garage mods (JOURNEYS §1.8): each one changes handling by 5–10% at most, and is earned on a journey.
// Tyres change grip and top speed; the horn changes pitch. Saved per vehicle in extra.mods.
import { useStore } from "../../state/store";
import { live } from "../../state/live";

export interface TyreSet { name: string; line: string; grip: number; speed: number; need?: string }
export const TYRES: Record<string, TyreSet> = {
  allterrain: { name: "All-terrain", line: "Steady on almost anything.", grip: 1, speed: 1 },
  grippy: { name: "Deep tread", line: "More grip on mud and snow, a little slower on the flat.", grip: 1.08, speed: 0.95, need: "longway" },
  snow: { name: "Snow tyres", line: "Chains and deep lugs: a little more grip, a little slower.", grip: 1.07, speed: 0.96, need: "snow" },
  sand: { name: "Sand tyres", line: "Wide and soft: a little quicker on the flat, a touch looser.", grip: 0.96, speed: 1.05, need: "salt" },
  road: { name: "Smooth", line: "A touch quicker, a touch looser on the corners.", grip: 0.92, speed: 1.06, need: "overlook" },
};
export interface HornSet { name: string; pitch: number; need?: string }
export const HORNS: Record<string, HornSet> = {
  low: { name: "Low and polite", pitch: 1 },
  bright: { name: "Bright", pitch: 1.26, need: "overlook" },
  boat: { name: "Boat horn", pitch: 0.72, need: "lantern" },
};
export type VehicleKey = "rover" | "mule";
export const RACKS: Record<string, { name: string; need?: string }> = {
  plain: { name: "Plain" },
  lights: { name: "Rack lights", need: "hutrounds" },
  flags: { name: "Prayer flags", need: "flowers" },
};
export const CHARMS: Record<string, { name: string; need?: string }> = {
  none: { name: "None" },
  star: { name: "Star charm", need: "firefly" },
  scarf: { name: "Scarf", need: "snow" },
};
export interface Mods { tyres: string; horn: string; rack: string; charm: string }
const DEFAULT: Mods = { tyres: "allterrain", horn: "low", rack: "plain", charm: "none" };

export const modsOf = (veh: string): Mods => ({ ...DEFAULT, ...((useStore.getState().extra.mods as Record<string, Partial<Mods>> | undefined)?.[veh] ?? {}) });
export const earned = (need: string | undefined) => !need || (useStore.getState().done as string[]).includes(need);

/** What the current vehicle's tyres do to handling; the controller multiplies grip and top speed by these. */
export function handling() {
  const t = TYRES[modsOf(live.vehicle).tyres] ?? TYRES.allterrain;
  return { grip: t.grip, speed: t.speed };
}
export function setMod<K extends keyof Mods>(veh: string, k: K, v: string) {
  const s = useStore.getState(), all = (s.extra.mods as Record<string, Partial<Mods>> | undefined) ?? {};
  s.setExtra("mods", { ...all, [veh]: { ...all[veh], [k]: v } });
  if (s.save) s.writeSave();
}
