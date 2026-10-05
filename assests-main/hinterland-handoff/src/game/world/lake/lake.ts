// Lake of Islands (JOURNEYS J7): a wide lake with nine islands, each with a jetty, a resident and a flagpole. The Rover
// launches from a beach slipway (boat mode, as on the river) and brings the island post. One ground function; the water is
// a level inside the shore, a slow swirl of current between the islands.
import { Color, Vector3 } from "three";
import { clamp, fbm, mix, smooth } from "../../../utils/noise";
import type { GroundSample, RegionGround } from "../height";

export const WL = 2;
/** shoreline radius by direction */
export const shoreR = (a: number) => 212 + 22 * Math.sin(3 * a) + 12 * Math.sin(5 * a + 1);

export interface Island { id: number; x: number; z: number; r: number; top: number; name: string; resident: string; line: string; flag: string }
const I = (id: number, x: number, z: number, r: number, top: number, name: string, resident: string, line: string, flag: string): Island => ({ id, x, z, r, top, name, resident, line, flag });
export const ISLANDS: Island[] = [
  I(0, -30, 130, 15, 2.6, "Pebble", "Hana", "A letter! Nobody writes to the pebbles.", "#E9C47E"),
  I(1, 62, 100, 17, 3.0, "Heron", "Bram", "Second post this month. I'll have to hide my delight.", "#D96A4A"),
  I(2, -92, 70, 14, 2.4, "Reed", "Ola", "The reeds have been talking about you all morning.", "#5F9A6A"),
  I(3, 10, 28, 19, 3.6, "Middle", "Pia", "You came right through. Most go around.", "#4F86C6"),
  I(4, 104, -8, 16, 2.8, "Gull", "Teo", "Oh good, the gulls will stop complaining.", "#E8E2D2"),
  I(5, -62, -32, 18, 3.2, "Willow", "Mara", "Tea? No? The post will do just as well.", "#9A7BC0"),
  I(6, 44, -84, 15, 2.7, "Stone", "Jun", "Light as ever. Thank you for the weight.", "#C9A04A"),
  I(7, -102, -92, 20, 4.0, "Far", "Ivo", "Nobody comes this far. I kept the kettle on anyway.", "#D98FB0"),
  I(8, 2, -150, 16, 3.4, "Last", "Sef", "The last one! Now the whole lake has its news.", "#7FC2B5"),
];

export const START = { x: 0, z: shoreR(Math.PI / 2) - 1.5 };
export const SLIPWAY = { x: START.x, z: START.z, yaw: 0 }; // water end of the ramp, facing out over the lake (−z)
export const LAKE_START = { x: START.x, z: START.z + 8, yaw: 0 };

const dist = (x: number, z: number, i: Island) => Math.hypot(x - i.x, z - i.z);

export function lakeHeight(x: number, z: number) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x), R = shoreR(a);
  // the bed: a shelf near the shore, deepening toward the middle
  const bed = WL - 0.25 - 5.2 * smooth(R - 6, R - 70, r) + fbm(x * 0.05, z * 0.05, 2) * 0.35;
  // the land beyond: a flat beach, then low hills
  const land = WL + 0.5 + smooth(R + 4, R + 22, r) * 3 + smooth(R + 20, R + 90, r) * (12 + fbm(x * 0.02, z * 0.02, 3) * 12);
  let h = mix(bed, land, smooth(R - 3, R + 3, r));
  for (const i of ISLANDS) {
    const d = dist(x, z, i), k = 1 - smooth(i.r * 0.55, i.r * 1.15, d);
    if (k > 0) h = Math.max(h, mix(bed, WL + i.top, k) + (d < i.r ? fbm(x * 0.2, z * 0.2, 2) * 0.12 : 0));
  }
  return h;
}
export const lakeWater = (x: number, z: number) => { const r = Math.hypot(x, z); return r < shoreR(Math.atan2(z, x)) + 2 ? WL : -100; };

/** a slow swirl around the lake, calmer near the shore */
export function lakeFlow(x: number, z: number, out = new Vector3()) {
  const r = Math.hypot(x, z) + 1e-3, s = 0.7 * smooth(30, 80, r) * (1 - smooth(150, 205, r));
  return out.set((-z / r) * s, 0, (x / r) * s);
}

/** where the post is handed over: the jetty, on the side of the island facing the start beach */
export function jettyOf(i: Island) {
  const dx = START.x - i.x, dz = START.z - i.z, l = Math.hypot(dx, dz);
  return { x: i.x + (dx / l) * (i.r + 2.5), z: i.z + (dz / l) * (i.r + 2.5) };
}

const COL = { sand: new Color("#C9B88F"), wet: new Color("#8A7A58"), grass: new Color("#7C9456"), grass2: new Color("#68833F"), rock: new Color("#7C766D"), hill: new Color("#6E8247") };
const tc = new Color(), out: GroundSample = { color: new Color(), grass: 1 };
function lakeGroundAt(x: number, z: number, y: number, ny: number): GroundSample {
  const c = out.color, n1 = fbm(x * 0.04, z * 0.04, 3), n3 = fbm(x * 0.2 + 3, z * 0.2, 2);
  c.copy(COL.grass).lerp(COL.grass2, smooth(-0.3, 0.3, n1)).lerp(COL.hill, smooth(WL + 5, WL + 20, y) * 0.6).multiplyScalar(0.94 + n3 * 0.12);
  const shore = smooth(WL + 1.3, WL + 0.1, y), wet = smooth(WL + 0.2, WL - 0.6, y);
  c.lerp(COL.sand, shore * 0.9).lerp(COL.wet, wet * 0.7);
  tc.copy(COL.rock).multiplyScalar(0.85 + n3 * 0.2);
  const rk = smooth(0.78, 0.55, ny);
  c.lerp(tc, rk);
  out.grass = clamp((1 - rk) * (1 - shore * 0.9), 0, 1);
  return out;
}

export const lakeSafePoint = (_x: number, _z: number) => ({ x: LAKE_START.x, z: LAKE_START.z, yaw: 0 });
export const lakeGround: RegionGround = {
  id: "lake", height: lakeHeight, water: lakeWater, groundAt: lakeGroundAt, radius: 270, seg: 512, flow: lakeFlow,
  start: LAKE_START,
};
/** progress 0..1: islands delivered is set by the region; null elsewhere */
export const lakeProgress = () => null;
