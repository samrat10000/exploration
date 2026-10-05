// The old forest (JOURNEYS J6, Firefly Road): a winding dirt road through rolling, dark pine woods to a glade where
// a ruined observatory stands. One ground function; the road is bare and level, the glade a flat bowl.
import { Color } from "three";
import { clamp, fbm, hash, mix, smooth } from "../../../utils/noise";
import type { GroundSample, Prop, RegionGround } from "../height";

export const Z_START = 130, Z_GLADE = -215;
/** the road's centre line: winding gently from the start to the glade */
export const roadX = (z: number) => 24 * Math.sin(z * 0.016 + 0.4) + 9 * Math.sin(z * 0.045);
export const GLADE = { x: roadX(Z_GLADE), z: Z_GLADE, r: 30 };

const hills = (x: number, z: number) => 5 + fbm(x * 0.012, z * 0.012, 4) * 11 + fbm(x * 0.05, z * 0.05, 2) * 1.6;
const roadD = (x: number, z: number) => Math.abs(x - roadX(z));

export function forestHeight(x: number, z: number) {
  let h = hills(x, z);
  // the road is a level cut through the hills; the glade a flat bowl
  const level = hills(roadX(z), z), onRoad = 1 - smooth(3.2, 7.5, roadD(x, z));
  h = mix(h, level + 0.0, onRoad);
  const g = 1 - smooth(GLADE.r - 4, GLADE.r + 14, Math.hypot(x - GLADE.x, z - GLADE.z));
  h = mix(h, hills(GLADE.x, GLADE.z) - 0.4, g);
  // a ridge closes the world at both ends
  return h + smooth(0, 30, z - Z_START - 10) * 14 + smooth(0, 40, Z_GLADE - 40 - z) * 16;
}

/** trees: dense pines off the road and out of the glade, thinner near the road */
export function forestTrees(): Prop[] {
  const out: Prop[] = [];
  for (let i = 0; i < 5200 && out.length < 1500; i++) {
    const x = (hash(i, 1.3) - 0.5) * 420, z = Z_GLADE - 30 + hash(2.7, i) * (Z_START - Z_GLADE + 60);
    if (roadD(x, z) < 6 + hash(i, 5) * 3) continue;
    if (Math.hypot(x - GLADE.x, z - GLADE.z) < GLADE.r + 3) continue;
    if (hash(i, 7) > 0.35 + 0.65 * smooth(8, 40, roadD(x, z))) continue;
    out.push({ x, y: forestHeight(x, z), z, s: 0.8 + hash(i, 9) * 1.1 });
  }
  return out;
}

const COL = { floor: new Color("#4F5E3A"), floor2: new Color("#3F4F31"), moss: new Color("#5C7040"), dirt: new Color("#7A6548"), rut: new Color("#5E4E38"), rock: new Color("#6F6A60"), needles: new Color("#6A4E34") };
const tc = new Color(), out: GroundSample = { color: new Color(), grass: 1 };
function forestGroundAt(x: number, z: number, _y: number, ny: number): GroundSample {
  const c = out.color, n1 = fbm(x * 0.04, z * 0.04, 3), n3 = fbm(x * 0.25 + 3, z * 0.25, 2);
  c.copy(COL.floor).lerp(COL.floor2, smooth(-0.3, 0.3, n1)).lerp(COL.moss, smooth(0.1, 0.5, fbm(x * 0.09 + 9, z * 0.09, 2)) * 0.5).lerp(COL.needles, 0.2 + 0.2 * smooth(0, 0.5, n3));
  const d = roadD(x, z), road = 1 - smooth(2.4, 4.4, d);
  c.lerp(COL.dirt, road * 0.9).lerp(COL.rut, road * smooth(0.6, 0.9, Math.abs(Math.sin((x - roadX(z)) * 1.5))) * 0.4);
  const g = 1 - smooth(GLADE.r - 6, GLADE.r + 8, Math.hypot(x - GLADE.x, z - GLADE.z));
  c.lerp(COL.moss, g * 0.5);
  c.multiplyScalar(0.92 + n3 * 0.16);
  tc.copy(COL.rock).multiplyScalar(0.85 + n3 * 0.2);
  const rk = smooth(0.82, 0.62, ny);
  c.lerp(tc, rk);
  out.grass = clamp((1 - rk) * (1 - road) * (0.55 + g * 0.4), 0, 1);
  return out;
}

export const forestSafePoint = (_x: number, z: number) => { const zz = Math.min(Z_START - 8, z + 30); return { x: roadX(zz), z: zz, yaw: 0 }; };
export const forestGround: RegionGround = {
  id: "forest", height: forestHeight, water: () => -100, groundAt: forestGroundAt, radius: 250, seg: 512,
  start: { x: roadX(Z_START), z: Z_START, yaw: 0 },
};
/** progress 0..1 along the road (null when far off it) */
export const forestProgress = (x: number, z: number) => (roadD(x, z) < 70 ? clamp((Z_START - z) / (Z_START - Z_GLADE), 0, 1) : null);
/** the road as points, for the guiding fireflies */
export const roadAt = (z: number) => ({ x: roadX(z), z, y: forestHeight(roadX(z), z) });
