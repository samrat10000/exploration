// First Snow (JOURNEYS J8): a high pass in winter. A snowcat track climbs from the start (z +130) over a frozen lake (thin ice
// that never breaks) to a cabin (z −220). One ground function; everything is snow, drifts and dark pines.
import { Color } from "three";
import { clamp, fbm, mix, smooth } from "../../../utils/noise";
import type { GroundSample, Prop, RegionGround } from "../height";

export const Z_START = 130, Z_CABIN = -220;
export const trackX = (z: number) => 26 * Math.sin(z * 0.013 + 0.8) + 8 * Math.sin(z * 0.04);
export const LAKE = { x: trackX(-60), z: -60, r: 46 };
export const CABIN = { x: trackX(Z_CABIN) + 12, z: Z_CABIN };
const base = (x: number, z: number) => 6 + fbm(x * 0.01, z * 0.01, 4) * 14 + fbm(x * 0.05, z * 0.05, 2) * 1.8;
const dTrack = (x: number, z: number) => Math.abs(x - trackX(z));
/** the pass rises toward the middle and falls to the cabin hollow */
const climb = (z: number) => 12 * Math.sin(smooth(Z_START, Z_CABIN, z) * Math.PI);

export function passHeight(x: number, z: number) {
  let h = base(x, z) + climb(z);
  const cut = 1 - smooth(3.5, 9, dTrack(x, z));
  h = mix(h, base(trackX(z), z) + climb(z), cut);
  const l = 1 - smooth(LAKE.r - 4, LAKE.r + 12, Math.hypot(x - LAKE.x, z - LAKE.z));
  h = mix(h, base(LAKE.x, LAKE.z) + climb(LAKE.z) - 0.4, l);
  const c = 1 - smooth(14, 26, Math.hypot(x - CABIN.x, z - CABIN.z));
  h = mix(h, base(CABIN.x, CABIN.z) + climb(CABIN.z), c);
  return h + smooth(0, 30, z - Z_START - 8) * 14 + smooth(0, 40, Z_CABIN - 30 - z) * 16;
}
export const lakeY = () => passHeight(LAKE.x, LAKE.z);
export const onIce = (x: number, z: number) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r - 2;

const hash2 = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
export function passTrees(): Prop[] {
  const out: Prop[] = [];
  for (let i = 0; i < 4000 && out.length < 700; i++) {
    const x = (hash2(i, 1) - 0.5) * 380, z = Z_CABIN - 20 + hash2(i, 2) * (Z_START - Z_CABIN + 40);
    if (dTrack(x, z) < 9 + hash2(i, 5) * 4) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 8 || Math.hypot(x - CABIN.x, z - CABIN.z) < 22) continue;
    if (hash2(i, 7) > 0.3 + 0.7 * smooth(10, 50, dTrack(x, z))) continue;
    out.push({ x, y: passHeight(x, z), z, s: 0.8 + hash2(i, 9) * 1.0 });
  }
  return out;
}

const COL = { snow: new Color("#EEF2F6"), snow2: new Color("#DCE5EE"), rock: new Color("#7A766F"), ice: new Color("#BFD6E4"), pack: new Color("#D2DBE4") };
const tc = new Color(), out: GroundSample = { color: new Color(), grass: 0 };
function passGroundAt(x: number, z: number, _y: number, ny: number): GroundSample {
  const c = out.color, n1 = fbm(x * 0.05, z * 0.05, 3), n3 = fbm(x * 0.3 + 3, z * 0.3, 2);
  c.copy(COL.snow).lerp(COL.snow2, smooth(-0.3, 0.4, n1)).multiplyScalar(0.97 + n3 * 0.05);
  c.lerp(COL.pack, (1 - smooth(2.2, 4.5, dTrack(x, z))) * 0.55);
  c.lerp(COL.ice, (1 - smooth(LAKE.r - 6, LAKE.r - 1, Math.hypot(x - LAKE.x, z - LAKE.z))) * 0.5);
  tc.copy(COL.rock).multiplyScalar(0.85 + n3 * 0.2);
  c.lerp(tc, smooth(0.74, 0.5, ny));
  out.grass = 0;
  return out;
}

export const passSafePoint = (_x: number, z: number) => { const zz = Math.min(Z_START - 8, z + 30); return { x: trackX(zz), z: zz, yaw: 0 }; };
export const passGround: RegionGround = {
  id: "pass", height: passHeight, water: () => -100, groundAt: passGroundAt, radius: 240, seg: 512,
  start: { x: trackX(Z_START), z: Z_START, yaw: 0 },
};
export const passProgress = (x: number, z: number) => (dTrack(x, z) < 80 ? clamp((Z_START - z) / (Z_START - Z_CABIN), 0, 1) : null);
