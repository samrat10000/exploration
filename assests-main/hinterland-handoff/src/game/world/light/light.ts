// The Lighthouse (JOURNEYS J13): a road along coastal cliffs, the sea far below on the west, to a headland with a lighthouse. One ground
// function; the road is slick in rain (grip). Storm first, then it clears into a sunset with the beam sweeping under a rainbow.
import { Color } from "three";
import { clamp, fbm, mix, smooth } from "../../../utils/noise";
import { live } from "../../../state/live";
import type { GroundSample, RegionGround } from "../height";

export const WL = 1.5, TOP = 16;
export const Z_START = 200, Z_END = -230;
/** the cliff edge and the road, set a little inland of it */
export const edgeX = (z: number) => -50 + 22 * Math.sin(z * 0.013 + 0.5) + 8 * Math.sin(z * 0.043);
export const roadX = (z: number) => edgeX(z) + 17;
export const LIGHT = { x: edgeX(Z_END + 18) + 8, z: Z_END + 18 };

export function lightHeight(x: number, z: number) {
  const d = x - edgeX(z), plateau = TOP + fbm(x * 0.03, z * 0.03, 3) * 2.4 + smooth(24, 90, d) * (10 + fbm(x * 0.02, z * 0.02, 3) * 14);
  // a sheer cliff at the edge (a few metres of lumpy rock), the sea far below
  const sea = WL - 4 + fbm(x * 0.05, z * 0.05, 2) * 0.6, cliff = smooth(-2, 3, d);
  let h = mix(sea, plateau, cliff);
  h = mix(h, plateau - 2.5 * (1 - smooth(-6, 0, d)) + 1.2, (1 - cliff) * smooth(-14, -2, d) * 0.7); // ledges down the face
  // the road is level and smooth where it runs
  const r = 1 - smooth(3.2, 6.5, Math.abs(x - roadX(z)));
  h = mix(h, TOP + 0.4, r * cliff);
  // the headland: a round knob the lighthouse stands on
  const hd = 1 - smooth(18, 34, Math.hypot(x - LIGHT.x, z - LIGHT.z));
  h = mix(h, TOP + 0.4, hd * cliff);
  return h + smooth(0, 30, z - Z_START - 20) * 12 + smooth(0, 30, Z_END - 40 - z) * 10;
}
export const lightWater = (x: number, z: number) => (x < edgeX(z) + 10 ? WL : -100);
/** slick when it rains: 0.78 on a soaked road */
const grip = () => 1 - 0.22 * clamp(live.wx.wet / 0.8, 0, 1);

const COL = { grass: new Color("#7B9158"), grass2: new Color("#677F44"), rock: new Color("#77716A"), rock2: new Color("#58554F"), road: new Color("#8E7C5C") };
const out: GroundSample = { color: new Color(), grass: 1 };
function lightGroundAt(x: number, z: number, _y: number, ny: number): GroundSample {
  const c = out.color, n = fbm(x * 0.05, z * 0.05, 3), n3 = fbm(x * 0.25 + 3, z * 0.25, 2);
  c.copy(COL.grass).lerp(COL.grass2, smooth(-0.3, 0.3, n)).multiplyScalar(0.94 + n3 * 0.12);
  c.lerp(COL.road, (1 - smooth(1.8, 3.6, Math.abs(x - roadX(z)))) * 0.75);
  const rk = smooth(0.84, 0.55, ny);
  c.lerp(COL.rock, rk).multiplyScalar(1 - rk * 0.1 * n3);
  out.grass = clamp((1 - rk) * 0.85, 0, 1);
  return out;
}

export const lightSafePoint = (_x: number, z: number) => { const zz = Math.min(Z_START - 5, z + 30); return { x: roadX(zz), z: zz, yaw: 0 }; };
export const lightGround: RegionGround = {
  id: "light", height: lightHeight, water: lightWater, grip, groundAt: lightGroundAt, radius: 250, seg: 512,
  start: { x: roadX(Z_START), z: Z_START, yaw: 0 },
};
export const lightProgress = (x: number, z: number) => (Math.abs(x - roadX(z)) < 90 ? clamp((Z_START - z) / (Z_START - Z_END), 0, 1) : null);
