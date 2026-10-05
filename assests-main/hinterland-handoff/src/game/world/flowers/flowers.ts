// Valley of Flowers (J15), ported from reference/src/levels/valley.js: one height function for mesh, props and wheels. A 1.1 km valley that
// falls from a snowy pass (z +640, 116 m up) to a lake at the bottom (z −505): a stone path, a meltwater stream that crosses it at a ford
// and again at a bridge, a mani wall, a chorten by the lake. (The prototype's potholes are 0.15 m deep: finer than this grid, left out.)
import { Color } from "three";
import { clamp, fbm, mix, smooth } from "../../../utils/noise";
import type { GroundSample, RegionGround } from "../height";

export const vcx = (z: number) => 30 * Math.sin(z * 0.004) + 14 * Math.sin(z * 0.011 + 1);
export const pathX = (z: number) => vcx(z) + 16 * Math.sin(z * 0.012 + 0.4);
export const streamX = (z: number) => vcx(z) - 26 * Math.sin(z * 0.009 + 0.5) + 6;
export const floorY = (z: number) => 3 + 113 * smooth(160, 640, z) - 3 * smooth(160, -420, z);
const halfW = (z: number) => (72 + 26 * fbm(z * 0.008, 3, 2)) * mix(0.42, 1, 1 - smooth(330, 600, z));
export const LAKE = { x: vcx(-505) - 10, z: -505, y: -0.55 };
const pathNoise = (z: number) => fbm(z * 0.02, 11, 2) * 0.5;

function baseH(x: number, z: number) {
  const d = Math.abs(x - vcx(z));
  let h = floorY(z) + fbm(x * 0.03, z * 0.03, 3) * 1.6 + fbm(x * 0.11, z * 0.11, 2) * 0.35;
  const w = Math.max(0, d - halfW(z));
  h += Math.pow(w, 1.32) * 0.42 * (0.75 + 0.5 * fbm(x * 0.008, z * 0.008, 3)) + w * w * 0.004;
  h += Math.max(0, fbm(x * 0.005 + 4, z * 0.005, 4)) * Math.min(w, 140) * 1.5;
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < 88) h = mix(h, -2.2, 1 - smooth(46, 88, dl));
  return h;
}

/** where the stream crosses the path: the ford (first) and the bridge (a good way after it) */
export const { FORD_Z, BRIDGE_Z } = (() => {
  let prev = streamX(620) - pathX(620);
  const cross: number[] = [];
  for (let z = 618; z > -420; z -= 2) { const v = streamX(z) - pathX(z); if (Math.sign(v) !== Math.sign(prev)) cross.push(z); prev = v; }
  const ford = cross.find((z) => z < 380 && z > 120) ?? cross[0], bridge = cross.find((z) => z < ford - 120) ?? ford - 160;
  return { FORD_Z: ford, BRIDGE_Z: bridge };
})();
const bridgeH = () => floorY(BRIDGE_Z) + 1.0;

export function flowersTerrain(x: number, z: number) {
  let h = baseH(x, z);
  const dp = Math.abs(x - pathX(z));
  if (dp < 4.4) h = mix(h, floorY(z) + pathNoise(z), 1 - smooth(2.4, 4.4, dp));
  if (z < 640 && z > -440) {
    const ds = Math.abs(x - streamX(z)), bed = floorY(z) - 0.7;
    if (ds < 6.5 && h > bed) h = mix(h, bed, (1 - smooth(2.0, 6.5, ds)) * (1 - smooth(-430, -445, z)));
  }
  return h;
}
/** the arched bridge deck (drivable) */
const deck = (x: number, z: number) => (Math.abs(z - BRIDGE_Z) < 9 && Math.abs(x - pathX(z)) < 2.5 ? mix(floorY(z) + pathNoise(z), bridgeH(), 1 - smooth(5.5, 9, Math.abs(z - BRIDGE_Z))) : -Infinity);
export const waterY = (z: number) => floorY(z) - 0.18;
export const flowersWater = (x: number, z: number) => {
  if (z < 640 && z > -440 && Math.abs(x - streamX(z)) < 4.6) return waterY(z);
  return Math.hypot(x - LAKE.x, z - LAKE.z) < 70 ? LAKE.y : -100;
};
/** snow on the pass: the first 200 m are deep and slow */
const grip = (_x: number, z: number) => 1 - 0.28 * smooth(430, 470, z) * (1 - smooth(600, 640, z) * 0);

const COL = { meadow: new Color("#8AA45C"), meadow2: new Color("#6F9048"), rock: new Color("#7E786F"), rock2: new Color("#5C5A55"), snow: new Color("#EEF2F6"), path: new Color("#9A8C74"), bank: new Color("#8A7A5C") };
const tc = new Color(), out: GroundSample = { color: new Color(), grass: 1 };
function flowersGroundAt(x: number, z: number, y: number, ny: number): GroundSample {
  const c = out.color, n = fbm(x * 0.04, z * 0.04, 3), n3 = fbm(x * 0.2 + 3, z * 0.2, 2);
  c.copy(COL.meadow).lerp(COL.meadow2, smooth(-0.3, 0.3, n)).multiplyScalar(0.94 + n3 * 0.12);
  c.lerp(COL.path, (1 - smooth(1.4, 3.2, Math.abs(x - pathX(z)))) * 0.75);
  c.lerp(COL.bank, (1 - smooth(2.8, 6, Math.abs(x - streamX(z)))) * 0.5);
  tc.copy(COL.rock).lerp(COL.rock2, clamp(0.5 + n3, 0, 1));
  const rk = smooth(0.84, 0.6, ny);
  c.lerp(tc, rk);
  // snow: the pass and the high ground, patchier lower down
  const sn = Math.max(smooth(430, 470, z + n * 30), smooth(95, 120, y + n3 * 6)) * smooth(0.4, 0.7, ny);
  c.lerp(COL.snow, sn);
  out.grass = clamp((1 - rk) * (1 - sn) * 0.95 * (1 - (1 - smooth(2.5, 4.5, Math.abs(x - pathX(z)))) * 0.9), 0, 1);
  return out;
}

export const flowersSafePoint = (_x: number, z: number) => { const zz = Math.min(600, z + 25); return { x: pathX(zz), z: zz, yaw: 0 }; };
export const flowersGround: RegionGround = {
  id: "flowers", height: flowersTerrain, water: flowersWater, deck, grip, groundAt: flowersGroundAt, radius: 620, size: 1300, seg: 512,
  start: { x: pathX(610), z: 610, yaw: 0 },
};
export const flowersProgress = (x: number, z: number) => (Math.abs(x - vcx(z)) < 160 ? clamp((610 - z) / (610 - LAKE.z), 0, 1) : null);
