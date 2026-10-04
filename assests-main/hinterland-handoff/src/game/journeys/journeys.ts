// Journey registry (JOURNEYS §1.1). A journey = one level: a region, a vehicle, a route whose
// progress (0..1) drives time of day and weather, and an ending. J1 wraps the existing valley.
import { START, START_YAW, VP } from "../world/height";
import { kettleGround, progressOf, trailAt } from "../world/kettle/kettle";

export type JourneyId = "overlook" | "longway" | "lantern" | "firefly" | "snow" | "salt" | "light" | "above";
export type RegionId = "valley" | "kettle";
export type VehicleId = "rover" | "mule" | "skymule" | "glider" | "bus" | "boat" | "tortoise" | "snowcat";

/** Weather keyframe by progress. fog multiplies the quality preset's fog density. */
export interface WeatherKey { p: number; fog: number }

export interface Journey {
  id: JourneyId;
  n: number;
  title: string;
  line: string;
  /** atlas copy for the vehicle and the rough length */
  veh: string;
  len: string;
  region: RegionId | null;
  vehicle: VehicleId;
  /** position on the atlas (1000 × 620 chart) */
  atlas: { x: number; y: number };
  /** set once the journey can actually be driven */
  playable: boolean;
  start?: { x: number; z: number; yaw: number };
  /** route the progress is measured along (xz polyline) */
  route?: { x: number; z: number }[];
  /** or a custom progress measure (null = too far off the route to say) */
  progressAt?: (x: number, z: number) => number | null;
  /** time of day across the journey: 0 dawn … 3 golden */
  tod: { from: number; to: number };
  weather: WeatherKey[];
  /** objective line while the journey is under way */
  objective: string;
  /** the end screen line when it is done */
  endLine: string;
  reward: string[];
}

export const JOURNEYS: Journey[] = [
  {
    id: "overlook", n: 1, title: "The Overlook", line: "Find a way up to the light on the ridge.",
    veh: "Rover", len: "About twenty minutes", region: "valley", vehicle: "rover", atlas: { x: 245, y: 445 }, playable: true,
    start: { x: START.x, z: START.z, yaw: START_YAW },
    route: [{ x: START.x, z: START.z }, { x: 60, z: 20 }, { x: 85, z: -80 }, { x: VP.x, z: VP.z }],
    tod: { from: 1, to: 1.6 }, weather: [{ p: 0, fog: 1 }],
    objective: "Find a way up to the light on the ridge",
    endLine: "You found the light on the ridge. Someone keeps it burning.",
    reward: ["rover-paint-dawn"],
  },
  {
    id: "longway", n: 2, title: "The Long Way Up", line: "Six crates. One road. It goes round and round, and up.",
    veh: "Mule", len: "About forty minutes", region: "kettle", vehicle: "mule", atlas: { x: 318, y: 300 }, playable: true,
    start: kettleGround.start,
    progressAt: (x, z) => { const t = trailAt(x, z, 4); return t.d < 30 ? progressOf(t.s) : null; },
    // morning on the orchard, the cloud band in the afternoon, sunset at the hut
    tod: { from: 1, to: 3.85 },
    weather: [{ p: 0, fog: 1 }, { p: 0.49, fog: 1.3 }, { p: 0.53, fog: 16 }, { p: 0.735, fog: 16 }, { p: 0.775, fog: 0.75 }, { p: 1, fog: 0.75 }],
    objective: "Take the crates up to the hut",
    endLine: "The crates are at the hut.",
    reward: ["mule-paint-monsoon", "rover-roof-lantern"],
  },
  { id: "lantern", n: 3, title: "Lantern River", line: "Five shrines along the water, and a village waiting for dusk.", veh: "Rover, on water", len: "About half an hour", region: null, vehicle: "rover", atlas: { x: 470, y: 380 }, playable: false, tod: { from: 2.6, to: 3 }, weather: [], objective: "", endLine: "", reward: ["rover-paint-ember"] },
  { id: "firefly", n: 4, title: "Firefly Road", line: "Follow the small lights through the old forest.", veh: "Rover", len: "About half an hour", region: null, vehicle: "rover", atlas: { x: 600, y: 300 }, playable: false, tod: { from: 3, to: 3 }, weather: [], objective: "", endLine: "", reward: [] },
  { id: "snow", n: 5, title: "First Snow", line: "Firewood for the cabin, before the pass closes.", veh: "Snowcat", len: "About forty minutes", region: null, vehicle: "snowcat", atlas: { x: 560, y: 140 }, playable: false, tod: { from: 2, to: 3 }, weather: [], objective: "", endLine: "", reward: [] },
  { id: "salt", n: 6, title: "The Salt Mirror", line: "A flat so wet it holds the whole sky.", veh: "Rover", len: "About twenty-five minutes", region: null, vehicle: "rover", atlas: { x: 760, y: 425 }, playable: false, tod: { from: 0, to: 1 }, weather: [], objective: "", endLine: "", reward: [] },
  { id: "light", n: 7, title: "The Lighthouse", line: "One generator, one storm, one light to bring back.", veh: "Mule", len: "About thirty-five minutes", region: null, vehicle: "mule", atlas: { x: 862, y: 250 }, playable: false, tod: { from: 2, to: 3 }, weather: [], objective: "", endLine: "", reward: ["mule-paint-harbour"] },
  { id: "above", n: 8, title: "Above the Clouds", line: "Everywhere you have been, all at once.", veh: "Rover, in the air", len: "As long as you like", region: null, vehicle: "rover", atlas: { x: 905, y: 110 }, playable: false, tod: { from: 2.8, to: 3 }, weather: [], objective: "", endLine: "", reward: [] },
];

export const journey = (id: JourneyId) => JOURNEYS.find((j) => j.id === id)!;

/** What wander mode says at the top of the screen, per region. */
export const WANDER_LINE: Record<RegionId, string> = {
  valley: "The valley is yours to wander",
  kettle: "The mountain is yours to wander",
};

export type AtlasState = "done" | "next" | "locked";
/** Finished journeys are done; the first unfinished one is next; the rest stay beyond the ridge. */
export function atlasState(id: JourneyId, done: JourneyId[]): AtlasState {
  if (done.includes(id)) return "done";
  const first = JOURNEYS.find((j) => !done.includes(j.id));
  return first?.id === id ? "next" : "locked";
}

/** Distance along a route polyline to the point nearest (x, z), as a fraction of its length. */
export function routeProgress(route: { x: number; z: number }[], x: number, z: number) {
  let total = 0, best = Infinity, at = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (len * len)));
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < best) { best = d; at = total + t * len; }
    total += len;
  }
  return total > 0 ? at / total : 0;
}

/** Weather (fog multiplier) at a progress, interpolated between keyframes. */
export function fogAt(keys: WeatherKey[], p: number) {
  if (!keys.length) return 1;
  if (p <= keys[0].p) return keys[0].fog;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (p <= b.p) { const t = (p - a.p) / Math.max(1e-6, b.p - a.p), s = t * t * (3 - 2 * t); return a.fog + (b.fog - a.fog) * s; }
  }
  return keys[keys.length - 1].fog;
}
