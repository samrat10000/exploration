// The Salt Mirror (JOURNEYS J11): a wet salt flat that holds the whole sky, ringed by dunes. Mirages shimmer ahead and fade as
// you approach them; one oasis, at the far end, is real. The ground is flat (a thin reflective sheet lies on it, visual only),
// so driving is easy and the mood is all light.
import { Color } from "three";
import { clamp, fbm, mix, smooth } from "../../../utils/noise";
import type { GroundSample, RegionGround } from "../height";

export const FLOOR = 2;
export const START = { x: 0, z: 215 };
export const OASIS = { x: 28, z: -228, r: 16 };
/** fake oases: where the mirages hang (they fade out as you close in) */
export const MIRAGES = [{ x: -70, z: 120 }, { x: 80, z: 60 }, { x: -110, z: -10 }, { x: 60, z: -110 }, { x: -50, z: -170 }];

const ridge = (x: number, z: number) => 1 - Math.abs(fbm(x * 0.012, z * 0.012, 3) * 2);
export function saltHeight(x: number, z: number) {
  const r = Math.hypot(x * 0.8, z * 0.95);
  // the flat, then dunes rising toward the rim, with a few low dunes out in the open
  const rim = smooth(215, 285, r), open = smooth(0.78, 0.95, ridge(x + 40, z - 30)) * smooth(60, 90, Math.hypot(x - 28, z + 228)) * smooth(90, 140, Math.hypot(x, z - 215)) * 2.2;
  let h = FLOOR + fbm(x * 0.05, z * 0.05, 2) * 0.05 + open;
  h += rim * (8 + ridge(x, z) * 22 + fbm(x * 0.03, z * 0.03, 3) * 6);
  return h;
}

const COL = { salt: new Color("#E6DFD0"), salt2: new Color("#D9D0BC"), sand: new Color("#D9B98A"), sand2: new Color("#C99E6A") };
const out: GroundSample = { color: new Color(), grass: 0 };
function saltGroundAt(x: number, z: number, y: number, ny: number): GroundSample {
  const c = out.color, n = fbm(x * 0.06, z * 0.06, 3), n3 = fbm(x * 0.3 + 3, z * 0.3, 2);
  // hexagonal-ish salt cracks: fine darker lines in a noise pattern
  const crack = smooth(0.82, 0.95, Math.abs(Math.sin(x * 0.9 + n * 6) * Math.sin(z * 0.9 - n * 5)));
  c.copy(COL.salt).lerp(COL.salt2, smooth(-0.3, 0.4, n)).multiplyScalar(0.96 + n3 * 0.06 - crack * 0.06);
  const dune = smooth(FLOOR + 0.6, FLOOR + 6, y);
  c.lerp(COL.sand, dune).lerp(COL.sand2, smooth(0.9, 0.7, ny) * 0.5 + n3 * 0.15);
  out.grass = 0;
  return out;
}

export const saltSafePoint = (_x: number, _z: number) => ({ x: START.x, z: START.z - 10, yaw: 0 });
export const saltGround: RegionGround = {
  id: "salt", height: saltHeight, water: () => -100, groundAt: saltGroundAt, radius: 250, seg: 480,
  start: { x: START.x, z: START.z, yaw: 0 },
};
export const saltProgress = (_x: number, z: number) => clamp((START.z - z) / (START.z - OASIS.z), 0, 1);
void mix;
