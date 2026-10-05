// Journey registry (JOURNEYS §1.1). A journey = one level: a region, a vehicle, a route whose
// progress (0..1) drives time of day and weather, and an ending. J1 wraps the existing valley.
import { UNLOCK_ALL } from "../vehicle/roster";
import { START, START_YAW, VP } from "../world/height";
import { kettleGround, progressOf, trailAt } from "../world/kettle/kettle";
import { gorgeGround, gorgeProgress } from "../world/gorge/gorge";
import { riverGround, riverProgress } from "../world/river/river";
import { DEPOT } from "../rounds/rounds";
import { forestGround, forestProgress } from "../world/forest/forest";
import { lakeGround } from "../world/lake/lake";
import { passGround, passProgress } from "../world/pass/pass";
import { skyGround, skyProgress } from "../world/sky/sky";
import { saltGround, saltProgress } from "../world/salt/salt";
import { coastGround, coastProgress } from "../world/coast/coast";
import { lightGround, lightProgress } from "../world/light/light";
import { flowersGround, flowersProgress } from "../world/flowers/flowers";

export type JourneyId = "overlook" | "longway" | "boulder" | "lantern" | "hutrounds" | "islands" | "market" | "coast" | "lighthouse" | "flowers" | "skyroad" | "firefly" | "snow" | "salt" | "light" | "above";
export type RegionId = "valley" | "kettle" | "gorge" | "river" | "forest" | "lake" | "pass" | "sky" | "salt" | "coast" | "light" | "flowers";
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
  {
    id: "boulder", n: 3, title: "Boulder Garden", line: "A gorge of giant mossy boulders, and an old bridge on the far side.",
    veh: "Rover, with a winch", len: "About thirty minutes", region: "gorge", vehicle: "rover", atlas: { x: 392, y: 352 }, playable: true,
    start: gorgeGround.start,
    progressAt: (x, z) => gorgeProgress(x, z),
    // late morning to noon
    tod: { from: 1.5, to: 2.1 }, weather: [{ p: 0, fog: 1 }],
    objective: "Find a way over the boulders, to the old bridge",
    endLine: "The gorge is easier the second time.",
    reward: [],
  },
  {
    id: "lantern", n: 4, title: "Lantern River", line: "Five shrines along the water, and a village waiting for dusk.", veh: "Rover, on water", len: "About half an hour", region: "river", vehicle: "rover", atlas: { x: 470, y: 380 }, playable: true,
    start: riverGround.start,
    progressAt: (x, z) => riverProgress(x, z),
    // dusk to blue hour
    tod: { from: 3.4, to: 4.7 }, weather: [{ p: 0, fog: 1 }],
    objective: "Set a lantern at each shrine along the river",
    endLine: "The village sets hundreds of lanterns on the lake.",
    reward: ["rover-paint-ember", "boat-horn"],
  },
  {
    id: "hutrounds", n: 5, title: "Hut Rounds", line: "Five huts along the meadow ridge, and each one is waiting on something.", veh: "Mule", len: "About forty minutes", region: "valley", vehicle: "mule", atlas: { x: 535, y: 392 }, playable: true,
    start: { x: DEPOT.x + 9, z: DEPOT.z + 11, yaw: Math.atan2(-(DEPOT.x - (DEPOT.x + 9)), -(DEPOT.z - (DEPOT.z + 11))) },
    // progress is how many huts are done (HutRounds sets it); morning to dusk, a drift of mist at midday
    tod: { from: 1, to: 3.6 }, weather: [{ p: 0, fog: 1 }, { p: 0.4, fog: 2.4 }, { p: 0.7, fog: 1 }],
    objective: "Fill every hut's order",
    endLine: "The ridge knows your engine now.",
    reward: ["stamp-passport"],
  },
  {
    id: "firefly", n: 6, title: "Firefly Road", line: "Follow the small lights through the old forest.", veh: "Rover, with headlights", len: "About half an hour", region: "forest", vehicle: "rover", atlas: { x: 600, y: 300 }, playable: true,
    start: forestGround.start,
    progressAt: (x, z) => forestProgress(x, z),
    tod: { from: 4.4, to: 5 }, weather: [{ p: 0, fog: 1 }, { p: 0.5, fog: 1.6 }, { p: 1, fog: 0.8 }],
    objective: "Follow the small lights",
    endLine: "A meteor shower, for the ones who stopped to look.",
    reward: [],
  },
  {
    id: "islands", n: 7, title: "Lake of Islands", line: "Nine islands, one lake, and the post.", veh: "Rover, on water", len: "About thirty minutes", region: "lake", vehicle: "rover", atlas: { x: 700, y: 360 }, playable: true,
    start: lakeGround.start,
    // progress = islands delivered / 9 (the region sets it); a bright morning
    tod: { from: 0.9, to: 1.8 }, weather: [{ p: 0, fog: 1.2 }, { p: 0.5, fog: 0.9 }],
    objective: "Deliver the post to all nine islands",
    endLine: "The post is early for once.",
    reward: [],
  },
  {
    id: "snow", n: 8, title: "First Snow", line: "Firewood for the cabin, before the pass closes.", veh: "Snowcat", len: "About forty minutes", region: "pass", vehicle: "snowcat", atlas: { x: 560, y: 140 }, playable: true,
    start: passGround.start,
    progressAt: (x, z) => passProgress(x, z),
    // winter afternoon to a blue night; a blizzard in the middle of the pass, then calm
    tod: { from: 2.2, to: 4.9 }, weather: [{ p: 0, fog: 1 }, { p: 0.3, fog: 2 }, { p: 0.45, fog: 9 }, { p: 0.65, fog: 9 }, { p: 0.78, fog: 1 }, { p: 1, fog: 0.8 }],
    objective: "Get the firewood up to the cabin",
    endLine: "The cabin windows glow in the blue night.",
    reward: ["snow-tyres"],
  },
  {
    id: "skyroad", n: 9, title: "Sky Road", line: "Three parcels, one glider, and a hut above the clouds.", veh: "Sky Mule", len: "About thirty minutes", region: "sky", vehicle: "mule", atlas: { x: 820, y: 175 }, playable: true,
    start: skyGround.start,
    progressAt: (x, z) => skyProgress(x, z),
    // morning, a storm in the middle, a clear evening
    tod: { from: 1.2, to: 3.4 }, weather: [{ p: 0, fog: 0.6 }, { p: 0.6, fog: 0.6 }, { p: 0.8, fog: 1.2 }, { p: 1, fog: 0.5 }],
    objective: "Fly the parcels to the sky hut",
    endLine: "The keeper didn't think it could be done.",
    reward: ["sky-kit"],
  },
  {
    id: "market", n: 10, title: "Market Day", line: "Seven stops along the valley, and the autumn fair at the end.", veh: "The Loaf", len: "About forty minutes", region: "valley", vehicle: "bus", atlas: { x: 690, y: 250 }, playable: true,
    start: { x: START.x + 9, z: START.z - 6, yaw: START_YAW },
    // morning to dusk; progress is stops served / 7 (the route sets it)
    tod: { from: 1, to: 3.5 }, weather: [{ p: 0, fog: 1 }],
    objective: "Run the market bus to the fair",
    endLine: "Everyone waves as they get off.",
    reward: ["loaf"],
  },
  {
    id: "salt", n: 11, title: "The Salt Mirror", line: "A flat so wet it holds the whole sky.", veh: "Rover", len: "About twenty-five minutes", region: "salt", vehicle: "rover", atlas: { x: 760, y: 425 }, playable: true,
    start: saltGround.start,
    progressAt: (x, z) => saltProgress(x, z),
    // sunrise: dawn to morning
    tod: { from: 0, to: 1.1 }, weather: [{ p: 0, fog: 1.6 }, { p: 0.6, fog: 0.8 }, { p: 1, fog: 0.5 }],
    objective: "Cross the flat. One of the green things is real",
    endLine: "You drove across a reflected sunrise.",
    reward: ["sand-tyres"],
  },
  {
    id: "coast", n: 12, title: "Slow Coast", line: "A coast road, three coves, and nowhere to be.", veh: "Tortoise", len: "As long as you like", region: "coast", vehicle: "tortoise", atlas: { x: 840, y: 330 }, playable: true,
    start: coastGround.start,
    progressAt: (x, z) => coastProgress(x, z),
    // afternoon to night, following the road
    tod: { from: 2.2, to: 4.6 }, weather: [{ p: 0, fog: 0.9 }],
    objective: "Make camp at each cove",
    endLine: "Nowhere to be. Nowhere you'd rather.",
    reward: ["tortoise"],
  },
  {
    id: "light", n: 13, title: "The Lighthouse", line: "One generator, one storm, one light to bring back.", veh: "Mule", len: "About thirty-five minutes", region: "light", vehicle: "mule", atlas: { x: 862, y: 250 }, playable: true,
    start: lightGround.start,
    progressAt: (x, z) => lightProgress(x, z),
    // a stormy afternoon clearing into a sunset
    tod: { from: 2, to: 3.7 }, weather: [{ p: 0, fog: 3 }, { p: 0.6, fog: 3.5 }, { p: 0.75, fog: 1 }, { p: 1, fog: 0.7 }],
    objective: "Take the generator to the lighthouse",
    endLine: "The beam sweeps the sea, under a rainbow.",
    reward: ["mule-paint-harbour"],
  },
  {
    id: "above", n: 14, title: "Above the Clouds", line: "Everywhere you have been, all at once.", veh: "Rover, in the air", len: "As long as you like", region: "valley", vehicle: "rover", atlas: { x: 905, y: 110 }, playable: true,
    start: { x: VP.x - 4, z: VP.z + 8, yaw: Math.atan2(-(START.x - VP.x), -(START.z - VP.z)) },
    // golden hour the whole way
    tod: { from: 2.8, to: 3.1 }, weather: [{ p: 0, fog: 0.8 }],
    objective: "Glide over everywhere you have been",
    endLine: "Everywhere you have been, all at once.",
    reward: [],
  },
  {
    id: "flowers", n: 15, title: "Valley of Flowers", line: "From the snow pass, down into a valley full of flowers.", veh: "Rover", len: "About forty minutes", region: "flowers", vehicle: "rover", atlas: { x: 960, y: 205 }, playable: true,
    start: flowersGround.start,
    progressAt: (x, z) => flowersProgress(x, z),
    // morning the whole way; any time of day works (the dev panel and camp sleep change it)
    tod: { from: 1, to: 1.9 }, weather: [{ p: 0, fog: 1.4 }, { p: 0.35, fog: 0.8 }, { p: 1, fog: 0.7 }],
    objective: "Follow the path down to the lake",
    endLine: "Lake of the sky.",
    reward: ["rover-paint-poppy"],
  },
];

export const journey = (id: JourneyId) => JOURNEYS.find((j) => j.id === id)!;

/** What wander mode says at the top of the screen, per region. */
export const WANDER_LINE: Record<RegionId, string> = {
  valley: "The valley is yours to wander",
  kettle: "The mountain is yours to wander",
  gorge: "The gorge is yours to wander",
  river: "The river is yours to wander",
  forest: "The forest is yours to wander",
  lake: "The lake is yours to wander",
  pass: "The pass is yours to wander",
  sky: "The sky is yours to wander",
  salt: "The flat is yours to wander",
  coast: "The coast is yours to wander",
  light: "The cliffs are yours to wander",
  flowers: "The valley of flowers is yours to wander",
};

export type AtlasState = "done" | "next" | "locked";
/** Finished journeys are done; the first unfinished one is next; the rest stay beyond the ridge. */
export function atlasState(id: JourneyId, done: JourneyId[]): AtlasState {
  if (done.includes(id)) return "done";
  if (UNLOCK_ALL) return "next";
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
