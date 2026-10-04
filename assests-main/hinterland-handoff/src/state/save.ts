// localStorage persistence. Save schema v2 (journeys) with a one-way migration from v1.
import type { JourneyId, RegionId } from "../game/journeys/journeys";

export const SET_KEY = "hinterland.settings.v1";
const V1_KEY = "hinterland.save.v1", V2_KEY = "hinterland.save.v2";

export const storage = {
  get<T>(k: string): T | null {
    try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
  },
  set(k: string, v: unknown) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode / quota: play on without saving */ }
  },
};

/** Where you were: the journey (or wander session) Continue resumes. */
export interface Session {
  journey: JourneyId;
  mode: "journey" | "wander";
  region: RegionId;
  x: number; z: number; yaw: number;
  tod: number;
  progress: number;
}

export interface Postcard { id: string; tod: number }

export interface SaveV2 {
  v: 2;
  session: Session | null;
  /** discovered places, all regions */
  found: string[];
  postcards: Postcard[];
  done: JourneyId[];
  rewards: string[];
  paint: { rover: number; mule: number };
  /** per-journey extra state (e.g. crates left on the mountain) */
  extra: Record<string, unknown>;
  t: number;
}

interface SaveV1 { x: number; z: number; yaw: number; tod?: number; found?: string[]; t?: number }

export const emptySave = (): SaveV2 => ({ v: 2, session: null, found: [], postcards: [], done: [], rewards: [], paint: { rover: 0, mule: 0 }, extra: {}, t: Date.now() });

/** v1 → v2: the valley session carries over; having reached the Overlook means J1 is finished. */
export function migrateV1(s: SaveV1): SaveV2 {
  const found = (s.found ?? []).filter((f) => typeof f === "string");
  const reached = found.includes("overlook");
  return {
    ...emptySave(),
    session: {
      journey: "overlook", mode: reached ? "wander" : "journey", region: "valley",
      x: s.x, z: s.z, yaw: s.yaw, tod: s.tod ?? 1, progress: reached ? 1 : 0,
    },
    found,
    postcards: found.map((id) => ({ id, tod: s.tod ?? 1 })),
    done: reached ? ["overlook"] : [],
    rewards: reached ? ["rover-paint-dawn"] : [],
    t: s.t ?? Date.now(),
  };
}

export function loadSave(): SaveV2 | null {
  const v2 = storage.get<SaveV2>(V2_KEY);
  if (v2 && v2.v === 2) return { ...emptySave(), ...v2 };
  const v1 = storage.get<SaveV1>(V1_KEY);
  if (v1 && Number.isFinite(v1.x) && Number.isFinite(v1.z)) {
    const m = migrateV1(v1);
    storage.set(V2_KEY, m); // keep v1 in place; v2 wins from now on
    return m;
  }
  return null;
}

export const writeSaveV2 = (s: SaveV2) => storage.set(V2_KEY, s);
