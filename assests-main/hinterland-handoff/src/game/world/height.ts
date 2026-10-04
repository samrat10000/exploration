// SINGLE source of truth for the ground. The terrain mesh, prop placement, the Rapier
// heightfield and the wheel probes all read from here. Constants are ported verbatim
// from the prototype's TERRAIN FUNCTION.
import { clamp, fbm, gauss, mix, smooth } from "../../utils/noise";

export const WATER = 0.6;
export const riverX = (z: number) => -30 + 34 * Math.sin(z * 0.011 + 0.6) + 12 * Math.sin(z * 0.031);

export const FALLS = { x: riverX(-76), top: -97, bottom: -75 };
export const POOL = { x: FALLS.x, z: -72 };
export const MAP_RADIUS = 252;

function baseHeight(x: number, z: number) {
  let h = 4 + fbm(x * 0.012, z * 0.012, 4) * 4.5 + fbm(x * 0.05, z * 0.05, 3) * 0.8;
  const m = 100 * gauss(x, z, 10, -215, 85) + 78 * gauss(x, z, -150, -175, 70) + 92 * gauss(x, z, 160, -235, 80) + 30 * gauss(x, z, 95, -130, 45);
  h += m * (1 + 0.35 * fbm(x * 0.03 + 10, z * 0.03 - 4, 4));
  h += Math.max(0, m - 15) * 0.12 * fbm(x * 0.08, z * 0.08, 3);
  const r = Math.hypot(x, z);
  h += smooth(230, 300, r) * 70 * (0.7 + 0.3 * fbm(x * 0.02, z * 0.02, 3));
  const fx = x - FALLS.x;
  h += 20 * smooth(-76, -94, z) * Math.exp(-(fx * fx) / (30 * 30));
  return h;
}

export const VP = { x: 95, z: -122, h: baseHeight(95, -122) };
export const START = { x: riverX(140) + 28, z: 140 };
export const START_YAW = Math.atan2(-(VP.x - START.x), -(VP.z - START.z));

/* ---------- hidden path: an old track up the west side of Highfall to the tarn that feeds it ---------- */
/** Still lake above the falls. Its south shore is the lip Highfall pours over. */
export const TARN = { x: FALLS.x, z: -110, level: 37.2, radius: 12.5 };

function tarnCarve(x: number, z: number, h: number) {
  const R = TARN.radius, L = TARN.level, d = Math.hypot(x - TARN.x, z - TARN.z);
  if (d > R + 9) return h;
  // bowl
  const wall = mix(L - 1.6, L + 1.2, smooth(R - 4.5, R + 1.5, d));
  h = mix(h, Math.min(h, wall), 1 - smooth(R + 1, R + 5, d));
  // a low moraine rim holds the water in, open only where it spills over into Highfall
  const lip = z > TARN.z ? 1 - smooth(4, 8, Math.abs(x - TARN.x)) : 0;
  const rim = d < R + 1.5 ? wall : L + 1.2 - (d - R - 1.5) * 0.55;
  return mix(h, Math.max(h, rim), smooth(R - 3, R - 0.5, d) * (1 - lip));
}

/** Trail centreline, valley floor -> tarn shore. Entrance hides in trees west of the plunge pool. */
const TRAIL_PTS: [number, number][] = [[-76, -58], [-91, -70], [-100, -86], [-96, -101], [-82, -110], [-68, -113], [-59, -110]];
/** Even grade from the valley to the shore, so the track reads as made, not found. */
export const TRAIL = (() => {
  const ends = [TRAIL_PTS[0], TRAIL_PTS[TRAIL_PTS.length - 1]].map(([x, z]) => tarnCarve(x, z, baseHeight(x, z)));
  const s = [0];
  for (let i = 1; i < TRAIL_PTS.length; i++) s.push(s[i - 1] + Math.hypot(TRAIL_PTS[i][0] - TRAIL_PTS[i - 1][0], TRAIL_PTS[i][1] - TRAIL_PTS[i - 1][1]));
  const len = s[s.length - 1];
  return TRAIL_PTS.map(([x, z], i) => ({ x, z, s: s[i], h: mix(ends[0], ends[1], s[i] / len) }));
})();
const TRAIL_BOX = { x0: -110, x1: -45, z0: -122, z1: -45 };

/** Distance to the trail and the trail's own (smoothly interpolated) height at the nearest point. */
export function trailInfo(x: number, z: number) {
  let best = Infinity, th = 0;
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const a = TRAIL[i], b = TRAIL[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < best) { best = d; th = mix(a.h, b.h, t); }
  }
  return { d: best, h: th };
}

function valleyHeight(x: number, z: number) {
  let h = baseHeight(x, z);
  // overlook plateau
  const dv = Math.hypot(x - VP.x, z - VP.z);
  h = mix(h, VP.h, 1 - smooth(9, 22, dv));
  h = tarnCarve(x, z, h);
  // trail: a shelf cut into the slope (cut and fill toward the trail's own grade)
  if (x > TRAIL_BOX.x0 && x < TRAIL_BOX.x1 && z > TRAIL_BOX.z0 && z < TRAIL_BOX.z1) {
    const t = trailInfo(x, z);
    if (t.d < 9) h = mix(h, t.h, 1 - smooth(2.6, 8.5, t.d));
  }
  // river channel + plunge pool
  const target = WATER - 1.6;
  if (z > -84) {
    const d = Math.abs(x - riverX(z)), w = 7 + clamp(z, 0, 300) * 0.012;
    const c = (1 - smooth(w, w + 9, d)) * smooth(-84, -74, z);
    if (h > target) h = mix(h, target, c);
  }
  const dp = Math.hypot(x - POOL.x, z - POOL.z);
  const cp = 1 - smooth(9, 19, dp);
  if (h > target) h = mix(h, target, cp);
  return h;
}

/** Valley water surface (the tarn sits higher than the river). */
const valleyWater = (x: number, z: number) => (Math.hypot(x - TARN.x, z - TARN.z) < TARN.radius + 1 ? TARN.level : WATER);

/* ---------- building pads (ART §5): houses never sit on raw slope ---------- */
export interface Pad { x: number; z: number; r: number; h: number }
const PAD_BLEND = 2.5;
/** Flatten height h to any pad it is on: flat within r, easing back to the slope over 2.5 m. */
export function flattenPad(pads: Pad[], x: number, z: number, h: number) {
  for (const p of pads) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r + PAD_BLEND) h = mix(h, p.h, 1 - smooth(p.r, p.r + PAD_BLEND, d));
  }
  return h;
}
/** Steepest rise across a circle of radius r (as a slope, rise/run), for choosing pad sites. */
export function slopeUnder(hf: (x: number, z: number) => number, x: number, z: number, r: number) {
  let worst = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI, c = Math.cos(a) * r, s = Math.sin(a) * r;
    worst = Math.max(worst, Math.abs(hf(x + c, z + s) - hf(x - c, z - s)) / (2 * r));
  }
  return worst;
}
export const MAX_PAD_SLOPE = Math.tan((12 * Math.PI) / 180);

/* ---------- regions: every system asks the ACTIVE region about the ground ---------- */
export interface GroundSample { color: import("three").Color; grass: number }
export interface Prop { x: number; y: number; z: number; s: number }
export interface RegionGround {
  id: "valley" | "kettle";
  /** true surface (river beds included) */
  height(x: number, z: number): number;
  water(x: number, z: number): number;
  /** extra drivable surface above the terrain (a plank bridge), or -Infinity */
  deck?(x: number, z: number): number;
  /** surface grip multiplier (mud, snow), 1 = normal */
  grip?(x: number, z: number): number;
  /** ground albedo + grassiness (filled in by ground.ts for the valley) */
  groundAt?(x: number, z: number, y: number, ny: number): GroundSample;
  /** trees near a point, for camera occlusion (filled in by props.ts for the valley) */
  treesNear?(x: number, z: number): Prop[];
  /** soft edge of the drivable world */
  radius: number;
  /** physics/lookup grid segments over GRID.size (finer where roads are narrow) */
  seg?: number;
  start: { x: number; z: number; yaw: number };
}

export const valleyGround: RegionGround = {
  id: "valley", height: valleyHeight, water: valleyWater, radius: MAP_RADIUS, start: { x: START.x, z: START.z, yaw: START_YAW },
};
let active: RegionGround = valleyGround;
export const activeGround = () => active;
/** Switch the world's ground. Call before mounting the region's scene. */
export function setGround(g: RegionGround) { active = g; GRID.seg = g.seg ?? 320; }

export const height = (x: number, z: number) => active.height(x, z);
export const waterLevel = (x: number, z: number) => active.water(x, z);
/** What the wheels and chassis touch. Water is driven like a ford: an invisible floor
 *  sits 1.05 below the surface, exactly as the prototype clamped it. */
export const groundHeight = (x: number, z: number) =>
  Math.max(active.height(x, z), active.water(x, z) - 1.05, active.deck ? active.deck(x, z) : -Infinity);
export const gripAt = (x: number, z: number) => (active.grip ? active.grip(x, z) : 1);

/* ---------- cached grid (physics heightfield + fast lookups for prop placement) ---------- */
export const GRID = { size: 640, seg: 320 };
const grids = new Map<string, Float32Array>();

/** Row-major [row along z][col along x], (seg+1)^2 samples of the true surface height(). */
export function heightGrid() {
  const cached = grids.get(active.id);
  if (cached && cached.length === (GRID.seg + 1) ** 2) return cached;
  const { size, seg } = GRID, step = size / seg, W = seg + 1;
  const grid = new Float32Array(W * W);
  for (let r = 0; r < W; r++) for (let c = 0; c < W; c++) grid[r * W + c] = height(-size / 2 + c * step, -size / 2 + r * step);
  grids.set(active.id, grid);
  return grid;
}

/** Bilinear lookup on the cached grid (true surface, riverbed included). */
export function gridH(x: number, z: number) {
  const g = heightGrid(), { size, seg } = GRID, step = size / seg, W = seg + 1;
  const fx = clamp((x + size / 2) / step, 0, seg - 1e-3), fz = clamp((z + size / 2) / step, 0, seg - 1e-3);
  const c = Math.floor(fx), r = Math.floor(fz), u = fx - c, v = fz - r;
  const a = g[r * W + c], b = g[r * W + c + 1], d = g[(r + 1) * W + c], e = g[(r + 1) * W + c + 1];
  return mix(mix(a, b, u), mix(d, e, u), v);
}

/** y-component of the ground normal (1 = flat). Same metric the prototype used for placement. */
export function gridSlope(x: number, z: number) {
  const e = 1.5, hx = gridH(x + e, z) - gridH(x - e, z), hz = gridH(x, z + e) - gridH(x, z - e);
  return (2 * e) / Math.hypot(hx, 2 * e, hz);
}

