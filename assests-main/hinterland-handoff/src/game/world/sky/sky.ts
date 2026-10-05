// Sky Road (JOURNEYS J9): a high mountain world seen from above. A launch ridge in the south (z +800), a chain of thermals up through
// the cloud sea, two bird zones, a storm cell, and a sky hut on a timber platform on the highest summit in the north (z −800).
// The ground is far below (hills and peaks poking through the clouds); it only matters near the two summits and for the hard-hit recovery.
import { Color } from "three";
import { clamp, fbm, mix, smooth } from "../../../utils/noise";
import type { GroundSample, RegionGround } from "../height";
import type { SkyMap } from "../../vehicle/flight";

export const CLOUD_Y = 205;
export const LAUNCH = { x: 0, z: 790, y: 430 };
export const HUT = { x: -60, z: -800, y: 440 };

const base = (x: number, z: number) => 30 + fbm(x * 0.004, z * 0.004, 4) * 120 + fbm(x * 0.02, z * 0.02, 3) * 18;
const PEAKS = [[-200, 300, 320, 90], [220, 120, 350, 110], [-260, -250, 360, 100], [240, -520, 380, 120], [120, -1000, 340, 110]];

export function skyHeight(x: number, z: number) {
  let h = base(x, z);
  for (const [px, pz, top, r] of PEAKS) h = Math.max(h, mix(h, top, 1 - smooth(r * 0.2, r * 1.6, Math.hypot(x - px, z - pz))) * 1);
  // the two summits: flat tops the player can stand on, falling away in cliffs
  // the hut's summit: a flat top falling away on all sides
  h = mix(h, HUT.y, 1 - smooth(36, 110, Math.hypot(x - HUT.x, z - HUT.z)));
  // the launch ridge: flat behind and under the ramp, then a sheer drop to the north, so the Mule goes straight off the edge into the air
  const edge = LAUNCH.z - 14, toward = Math.max(0, edge - z), side = Math.hypot(x - LAUNCH.x, Math.max(0, z - edge - 20));
  h = mix(h, LAUNCH.y, (1 - smooth(0, 14, toward)) * (1 - smooth(40, 90, side)));
  return h;
}

/** thermals chain up toward the cloud base; a cumulus caps each one (SkyHazards) */
export const SKY_MAP: SkyMap = {
  launches: [{ x: LAUNCH.x, z: LAUNCH.z, yaw: 0, r: 9 }],
  thermals: [
    { x: 30, z: 480, r: 32, lift: 8, top: 500 },
    { x: -40, z: 130, r: 34, lift: 8, top: 520 },
    { x: 70, z: -260, r: 32, lift: 8, top: 540 },
    { x: -30, z: -560, r: 30, lift: 8, top: 550 },
  ],
  landings: [{ x: HUT.x, z: HUT.z + 30, r: 9, yaw: 0 }],
  flocks: [{ x: 0, z: 40, y: 470, r: 20, n: 70 }, { x: 40, z: -420, y: 480, r: 22, n: 80 }],
  storms: [{ x: 10, z: -660, r: 100, y0: 380, y1: 540 }],
};

const COL = { grass: new Color("#7A8F52"), rock: new Color("#7C766D"), rock2: new Color("#5E5B57"), snow: new Color("#EEF1F3"), plank: new Color("#8C7759") };
const tc = new Color(), out: GroundSample = { color: new Color(), grass: 0 };
function skyGroundAt(x: number, z: number, y: number, ny: number): GroundSample {
  const c = out.color, n3 = fbm(x * 0.12 + 3, z * 0.12, 2);
  c.copy(COL.grass).multiplyScalar(0.92 + n3 * 0.2);
  tc.copy(COL.rock).lerp(COL.rock2, clamp(0.5 + n3, 0, 1));
  c.lerp(tc, smooth(0.9, 0.6, ny) + smooth(150, 260, y) * 0.5);
  c.lerp(COL.snow, smooth(330, 400, y + n3 * 12) * smooth(0.55, 0.8, ny));
  out.grass = 0;
  return out;
}

export const skySafePoint = () => ({ x: LAUNCH.x, z: LAUNCH.z, yaw: 0 });
export const skyGround: RegionGround = {
  id: "sky", height: skyHeight, water: () => -100, groundAt: skyGroundAt, radius: 1100, size: 2000, seg: 512,
  start: { x: LAUNCH.x, z: LAUNCH.z + 4, yaw: 0 },
};
/** progress along the route, south to north */
export const skyProgress = (_x: number, z: number) => clamp((LAUNCH.z - z) / (LAUNCH.z - HUT.z), 0, 1);
