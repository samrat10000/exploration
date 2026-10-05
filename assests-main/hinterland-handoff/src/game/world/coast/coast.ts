// Slow Coast (JOURNEYS J12): a coast road with three coves, the sea to the west. One ground function; at each cove the shore bends
// inland and the beach is a wide, flat place to make camp. The light follows how far down the coast you are: afternoon to night.
import { Color } from "three";
import { clamp, fbm, mix, smooth } from "../../../utils/noise";
import type { GroundSample, RegionGround } from "../height";

export const WL = 1.5;
export const Z_START = 200, Z_END = -230;
export const COVES = [{ z: 100, name: "First cove" }, { z: -30, name: "Fisher's cove" }, { z: -160, name: "Last cove" }];
const bay = (z: number) => COVES.reduce((m, c) => Math.max(m, 1 - smooth(18, 52, Math.abs(z - c.z))), 0);
/** x of the waterline: a gentle wander, pushed inland at each cove */
export const shoreX = (z: number) => -60 + 18 * Math.sin(z * 0.014 + 1) + 7 * Math.sin(z * 0.04) + bay(z) * 34;
export const roadX = (z: number) => shoreX(z) + 20;
export const coveCentre = (i: number) => ({ x: shoreX(COVES[i].z) + 12, z: COVES[i].z });

export function coastHeight(x: number, z: number) {
  const d = x - shoreX(z), sea = smooth(0, 60, -d);
  let h = mix(WL + 0.15 + smooth(0, 14, d) * 0.9, WL - 5.5, sea);
  // the land: a flat shelf for the road and beach, then rolling hills to the east
  const shelf = smooth(26, 70, d), hills = 8 + fbm(x * 0.02, z * 0.02, 3) * 14 + fbm(x * 0.07, z * 0.07, 2) * 2;
  h += shelf * hills * (1 - bay(z) * 0.6 * (1 - smooth(40, 90, d)));
  h += fbm(x * 0.12, z * 0.12, 2) * 0.12 * smooth(0, 6, d);
  return h + smooth(0, 30, z - Z_START - 20) * 12 + smooth(0, 30, Z_END - 10 - z) * 14;
}
export const coastWater = (x: number, z: number) => (x < shoreX(z) + 4 ? WL : -100);

const COL = { sand: new Color("#DCC598"), wet: new Color("#A8946C"), grass: new Color("#7E9457"), grass2: new Color("#6A8044"), rock: new Color("#7C766D"), road: new Color("#9A8460") };
const out: GroundSample = { color: new Color(), grass: 1 };
function coastGroundAt(x: number, z: number, y: number, ny: number): GroundSample {
  const c = out.color, n = fbm(x * 0.05, z * 0.05, 3), n3 = fbm(x * 0.25 + 3, z * 0.25, 2), d = x - shoreX(z);
  c.copy(COL.grass).lerp(COL.grass2, smooth(-0.3, 0.3, n)).multiplyScalar(0.94 + n3 * 0.12);
  const beach = 1 - smooth(8, 22, d);
  c.lerp(COL.sand, beach).lerp(COL.wet, smooth(WL + 0.5, WL - 0.1, y) * 0.7);
  c.lerp(COL.road, (1 - smooth(1.6, 3.4, Math.abs(x - roadX(z)))) * 0.7);
  c.lerp(COL.rock, smooth(0.82, 0.58, ny));
  out.grass = clamp((1 - beach) * (1 - smooth(0.82, 0.58, ny)) * 0.85, 0, 1);
  return out;
}

export const coastSafePoint = (_x: number, z: number) => { const zz = Math.min(Z_START - 5, z + 30); return { x: roadX(zz), z: zz, yaw: 0 }; };
export const coastGround: RegionGround = {
  id: "coast", height: coastHeight, water: coastWater, groundAt: coastGroundAt, radius: 250, seg: 512,
  start: { x: roadX(Z_START), z: Z_START, yaw: 0 },
};
export const coastProgress = (x: number, z: number) => (Math.abs(x - roadX(z)) < 90 ? clamp((Z_START - z) / (Z_START - Z_END), 0, 1) : null);
