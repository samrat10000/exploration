// The Boulder Garden (JOURNEYS J3): a gorge of giant mossy boulders running from the start (z = +110) to an old stone
// bridge over a chasm (z −150 … −168). The ground is one function (boulders are flat-topped mesas with a steep face
// toward you and a gentle ramp behind), so the mesh, props and Rapier all agree. Three set pieces block the gorge:
// a single tall boulder, a chain of three with gaps between them, and a waterfall boulder. Only the winch gets you over.
import { Color, Vector3 } from "three";
import { clamp, fbm, mix, smooth } from "../../../utils/noise";
import type { GroundSample, RegionGround } from "../height";

/** centre line of the gorge floor */
export const cx = (z: number) => 5 * Math.sin(z * 0.025);
export const FLOOR = 2;
export const Z_START = 112, Z_BRIDGE_A = -150, Z_BRIDGE_B = -168, Z_END = -200;

/** where the gorge pinches to a corridor: z centre and total length */
const PINCHES = [{ z: 62, len: 16 }, { z: -30, len: 56 }, { z: -102, len: 18 }];
const pinch = (z: number) => { let p = 0; for (const q of PINCHES) p = Math.max(p, 1 - smooth(q.len / 2, q.len / 2 + 14, Math.abs(z - q.z))); return p; };
const halfW = (z: number) => mix(26 + 5 * Math.sin(z * 0.04 + 1), 3.6, pinch(z));

export interface Boulder {
  id: string; x: number; z: number;
  /** height of the flat crown above the floor, flat-top radius, foot radius on the steep (+z, approach) side and the gentle (−z) side */
  top: number; rt: number; rSteep: number; rGentle: number;
}
const B = (id: string, z: number, top: number, rt: number, rSteep: number, rGentle: number): Boulder => ({ id, x: cx(z), z, top, rt, rSteep, rGentle });
export const BOULDERS: Boulder[] = [
  B("tall", 62, 4.4, 2.6, 5.2, 12),
  B("chainA", -12, 3.6, 2.6, 5.2, 5.2), B("chainB", -30, 4.0, 2.6, 5.2, 5.2), B("chainC", -48, 3.4, 2.6, 5.2, 12),
  B("falls", -102, 5.2, 2.8, 5.6, 14),
];
export const crownY = (b: Boulder) => FLOOR + b.top;

function mesa(b: Boulder, x: number, z: number) {
  const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz), rb = dz > 0 ? b.rSteep : b.rGentle;
  if (d >= rb) return 0;
  const t = clamp((d - b.rt) / (rb - b.rt), 0, 1);
  // a rounded shoulder, then a face; lumpy so it reads as rock, flat on top so you can park on it
  const lump = d > b.rt ? fbm(x * 0.5, z * 0.5, 2) * 0.45 * t : 0;
  return Math.max(0, b.top * (1 - smooth(0, 1, t)) + lump);
}

function wallAt(x: number, z: number) {
  const d = Math.abs(x - cx(z)) - halfW(z);
  if (d <= 0) return 0;
  // sheer faces broken by ledges and crags (rough, so the walls read as rock rather than smooth slabs)
  const crag = fbm(x * 0.16, z * 0.16, 3) * 5 + fbm(x * 0.5 + 9, z * 0.5, 2) * 1.6;
  return Math.min(90, 14 * smooth(0, 4, d) + d * 1.5 + crag * smooth(0, 10, d) + (Math.round(d * 0.5) * 0.5 - d * 0.25) * 2.2 * smooth(0, 8, d));
}

/** The chasm the old bridge crosses: a sheer-sided cut across the whole gorge. */
function chasm(z: number) { return 13 * smooth(Z_BRIDGE_A + 1.6, Z_BRIDGE_A - 1.2, z) * smooth(Z_BRIDGE_B - 1.6, Z_BRIDGE_B + 1.2, z); }
const BRIDGE_Y = FLOOR + 0.12;
export const onBridge = (x: number, z: number) => z < Z_BRIDGE_A + 1 && z > Z_BRIDGE_B - 1 && Math.abs(x - cx(z)) < 3.4;

export function gorgeHeight(x: number, z: number) {
  // the floor, dipping away past the end and rising behind the start so the gorge is closed at both ends
  let h = FLOOR + fbm(x * 0.06, z * 0.06, 3) * 0.35 - smooth(0, 30, Z_END - z) * 6 + smooth(0, 14, z - Z_START - 6) * 12 - chasm(z);
  let m = 0;
  for (const b of BOULDERS) m = Math.max(m, mesa(b, x, z));
  return h + m + wallAt(x, z);
}
const deck = (x: number, z: number) => (onBridge(x, z) ? BRIDGE_Y : -Infinity);

/* ---------- rings ---------- */
export interface GorgeRing { id: string; boulder: Boulder; ring: Vector3; yaw: number; crown: Vector3 }
const ringFor = (b: Boulder): GorgeRing => {
  const crown = new Vector3(b.x, crownY(b) + 0.4, b.z);
  // the ring sits on the approach rim, a little above the crown, facing +z (the way you come from)
  // (the waterfall boulder keeps its ring to one side of the falling water)
  return { id: b.id, boulder: b, ring: new Vector3(b.x + (b.id === 'falls' ? -1.5 : 0), crownY(b) + 0.65, b.z + b.rt - 0.5), yaw: 0, crown };
};
export const RINGS: GorgeRing[] = BOULDERS.map(ringFor);

/* ---------- ground colour ---------- */
const COL = { moss: new Color("#6F8A4E"), moss2: new Color("#5E7A44"), floor: new Color("#8B8A6C"), rock: new Color("#7C766D"), rock2: new Color("#5E5B57"), lichen: new Color("#8A9070"), dirt: new Color("#8C7759") };
const tc = new Color(), out: GroundSample = { color: new Color(), grass: 1 };
function gorgeGroundAt(x: number, z: number, y: number, ny: number): GroundSample {
  const c = out.color, n1 = fbm(x * 0.05, z * 0.05, 3), n3 = fbm(x * 0.2 + 3, z * 0.2, 2);
  c.copy(COL.moss).lerp(COL.moss2, smooth(-0.3, 0.3, n1)).lerp(COL.floor, 0.25 + 0.25 * smooth(0, 0.6, n3));
  // the route is bare earth: packed along the gorge floor
  const route = 1 - smooth(1.6, 4.5, Math.abs(x - cx(z)));
  c.lerp(COL.dirt, route * 0.55 * (1 - smooth(FLOOR + 0.8, FLOOR + 1.6, y)));
  c.multiplyScalar(0.94 + n3 * 0.12);
  let grass = 0.85 * (1 - route * 0.6);
  tc.copy(COL.rock).lerp(COL.rock2, clamp(0.5 + n3, 0, 1));
  const rk = smooth(0.84, 0.62, ny + n1 * 0.04);
  // strata: bands of lighter and darker stone up the faces, and darker in the crevices
  tc.multiplyScalar(0.82 + 0.28 * (0.5 + 0.5 * Math.sin(y * 1.7 + fbm(x * 0.1, z * 0.1, 2) * 6)) + n3 * 0.12);
  c.lerp(tc, rk);
  c.lerp(COL.lichen, smooth(FLOOR + 3, FLOOR + 14, y) * 0.35 * rk);
  grass *= 1 - rk;
  out.grass = clamp(grass, 0, 1);
  return out;
}

/** No-fail recovery point: back along the gorge, level with where you went wrong. */
export function gorgeSafePoint(_x: number, z: number) {
  const zz = Math.min(Z_START, z + 24);
  return { x: cx(zz), z: zz, yaw: 0 };
}

export const gorgeGround: RegionGround = {
  id: "gorge", height: gorgeHeight, water: () => -100, deck, groundAt: gorgeGroundAt, radius: 260, seg: 512,
  start: { x: cx(Z_START), z: Z_START, yaw: 0 },
};

/** progress 0..1 along the gorge (null when far off the line) */
export const gorgeProgress = (x: number, z: number) => (Math.abs(x - cx(z)) < 60 ? clamp((Z_START - z) / (Z_START - Z_BRIDGE_B + 6), 0, 1) : null);
