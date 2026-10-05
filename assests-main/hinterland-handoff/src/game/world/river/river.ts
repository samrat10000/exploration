// Lantern River (JOURNEYS J4): a river gorge that opens into a lake with a village. The Rover launches from a slipway
// and sails (boat mode) downstream to five shrines on the banks, through two stretches of rapids and under an old
// stone arch, to the lake. One ground function for mesh, props and physics; water is a level inside the channel.
import { Color, Vector3 } from "three";
import { clamp, fbm, mix, smooth } from "../../../utils/noise";
import type { GroundSample, RegionGround } from "../height";

export const WL = 2;
export const Z_START = 150, Z_LAKE = -240, Z_END = -300;
/** centre line of the river */
export const xc = (z: number) => 22 * Math.sin(z * 0.011) + 7 * Math.sin(z * 0.033 + 1);
const lakeT = (z: number) => smooth(-170, -240, z);
/** half width of the water: a gorge, opening into the lake, closing at its far shore */
export const halfW = (z: number) => mix(8.5 + 1.5 * Math.sin(z * 0.07), 72, lakeT(z)) * (1 - smooth(-255, -292, z));

export const RAPIDS = [{ z0: -50, z1: -90 }, { z0: -118, z1: -146 }];
const inRapids = (z: number) => RAPIDS.some((r) => z < r.z0 && z > r.z1);
/** the clear line through the rapids, winding a little: stay on it and the boat never touches */
export const channel = (z: number) => xc(z) + 2.6 * Math.sin(z * 0.17);

export function riverHeight(x: number, z: number) {
  const d = Math.abs(x - xc(z)), w = Math.max(0.01, halfW(z));
  const bank = WL + 3.2 + fbm(x * 0.05, z * 0.05, 3) * 0.9;
  // gorge walls beyond the banks (none on the lake's wide, low shores)
  const wall = (1 - lakeT(z)) * (smooth(w + 3, w + 11, d) * 38 + Math.max(0, d - w - 11) * 1.6 + fbm(x * 0.12, z * 0.12, 3) * 5 * smooth(w + 3, w + 20, d));
  const hills = lakeT(z) * smooth(w + 6, w + 60, d) * (14 + fbm(x * 0.02, z * 0.02, 3) * 12);
  // the bed: deep in the middle, shelving up to the bank
  let bed = WL - 3.1 * (1 - smooth(0.5 * w, w, d));
  if (inRapids(z)) {
    // boulders in the water everywhere except the clear line
    const r = RAPIDS.find((q) => z < q.z0 && z > q.z1)!, rock = fbm(x * 0.35 + 5, z * 0.35, 2), clear = Math.abs(x - channel(z));
    const edge = smooth(0, 1, Math.min(z - r.z1, r.z0 - z) / 6);
    bed += smooth(0.05, 0.3, rock) * smooth(2.4, 4.2, clear) * 3.6 * edge * (1 - smooth(w * 0.85, w, d));
  }
  const inChan = 1 - smooth(w - 1.2, w + 1.2, d);
  return mix(bank, bed, inChan) + wall + hills;
}
export const riverWater = (x: number, z: number) => (Math.abs(x - xc(z)) < halfW(z) + 0.3 && z < Z_START + 20 && z > Z_END ? WL : -100);

/** Which way the water runs, and how fast (m/s): a gentle flow, quick through the rapids, almost still on the lake. */
export function riverFlow(x: number, z: number, out = new Vector3()) {
  if (riverWater(x, z) < 0) return out.set(0, 0, 0);
  const dz = 1, dx = (xc(z - dz) - xc(z + dz)) / (2 * dz), len = Math.hypot(dx, 1);
  const speed = (inRapids(z) ? 4.2 : 1.5) * (1 - lakeT(z) * 0.85);
  return out.set((dx / len) * speed, 0, (-1 / len) * speed);
}

/* ---------- shrines ---------- */
export interface Shrine { id: number; x: number; z: number; yaw: number; /** where the lantern is set (on the water, beside the shrine) */ water: Vector3 }
const shrineAt = (id: number, z: number, side: number): Shrine => {
  const w = halfW(z), x = xc(z) + side * (w + 2.4), yaw = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  return { id, x, z, yaw, water: new Vector3(xc(z) + side * (w - 2.2), WL, z) };
};
export const SHRINES: Shrine[] = [shrineAt(0, 98, -1), shrineAt(1, 30, 1), shrineAt(2, -100, -1), shrineAt(3, -160, 1), shrineAt(4, -225, -1)];

export const ARCH_Z = -22;
export const VILLAGE = { x: xc(-292), z: -300 };
export const START_SLIP = { z: 140, side: 1 };
const slipX = (z: number, side: number) => xc(z) + side * (halfW(z) - 0.4);
export const SLIPWAY = { x: slipX(START_SLIP.z, START_SLIP.side), z: START_SLIP.z, yaw: START_SLIP.side > 0 ? Math.PI / 2 : -Math.PI / 2 };
export const RIVER_START = { x: SLIPWAY.x + Math.sin(SLIPWAY.yaw) * 8, z: SLIPWAY.z, yaw: SLIPWAY.yaw + Math.PI * 0 };

/* ---------- ground colour ---------- */
const COL = { grass: new Color("#7A8F52"), grass2: new Color("#66803F"), bank: new Color("#8C7B5C"), rock: new Color("#7A746B"), rock2: new Color("#5D5A55"), pebble: new Color("#9A9484"), moss: new Color("#5E7A44") };
const tc = new Color(), out: GroundSample = { color: new Color(), grass: 1 };
function riverGroundAt(x: number, z: number, y: number, ny: number): GroundSample {
  const c = out.color, n1 = fbm(x * 0.04, z * 0.04, 3), n3 = fbm(x * 0.2 + 3, z * 0.2, 2);
  c.copy(COL.grass).lerp(COL.grass2, smooth(-0.3, 0.3, n1)).multiplyScalar(0.94 + n3 * 0.12);
  // shingle at the water line, wet and dark under it
  const wet = smooth(WL + 0.8, WL - 0.2, y), shore = smooth(WL + 1.6, WL + 0.2, y);
  c.lerp(COL.bank, shore * 0.8).lerp(COL.pebble, shore * 0.2 * (0.5 + n3));
  c.multiplyScalar(1 - wet * 0.35);
  tc.copy(COL.rock).lerp(COL.rock2, clamp(0.5 + n3, 0, 1));
  tc.multiplyScalar(0.84 + 0.26 * (0.5 + 0.5 * Math.sin(y * 1.6 + n1 * 6)));
  const rk = smooth(0.84, 0.62, ny + n1 * 0.04);
  c.lerp(tc, rk);
  out.grass = clamp((1 - rk) * (1 - shore * 0.85) * 0.9, 0, 1);
  return out;
}

export function riverSafePoint(_x: number, z: number) {
  const zz = Math.min(Z_START - 10, z + 18);
  return { x: xc(zz), z: zz, yaw: Math.PI };
}

export const riverGround: RegionGround = {
  id: "river", height: riverHeight, water: riverWater, groundAt: riverGroundAt, radius: 280, seg: 512,
  flow: riverFlow, start: RIVER_START,
};
/** progress 0..1 down the river (null when off in the hills) */
export const riverProgress = (x: number, z: number) => (Math.abs(x - xc(z)) < halfW(z) + 70 ? clamp((Z_START - z) / (Z_START - VILLAGE.z), 0, 1) : null);
