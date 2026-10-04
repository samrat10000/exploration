// Kettle Peak (J2): a conical mountain with one trail that spirals 3.5 turns counter-clockwise to
// the hut. The trail is a spline built by "driving" a heading along the slope at a steady grade;
// the terrain is carved to it (3° inward bank, wheel ruts), and progress along it drives the day.
import { Color } from "three";
import { clamp, fbm, gauss, hash, mix, smooth } from "../../../utils/noise";
import { flattenPad, slopeUnder, type GroundSample, type Pad, type Prop, type RegionGround } from "../height";

/* ---------------- the mountain ---------------- */
const R = 260, PEAK = 240, P = 1.3;
const cone = (r: number) => PEAK * Math.pow(Math.max(0, 1 - r / R), P);
const coneInv = (y: number) => R * (1 - Math.pow(clamp(y / PEAK, 0, 1), 1 / P));

function natural(x: number, z: number) {
  const r = Math.hypot(x, z);
  // lowland meadows around the foot, a little rolling
  let h = 3 + fbm(x * 0.01 + 7, z * 0.01, 4) * 4 + fbm(x * 0.045, z * 0.045 - 3, 3) * 0.7;
  // the cone, with ridges and gullies that grow toward the middle slopes
  const c = cone(r);
  h += c * (1 + 0.1 * fbm(x * 0.02 + 3, z * 0.02 + 9, 4));
  h += Math.max(0, c - 10) * 0.05 * fbm(x * 0.07, z * 0.07, 3);
  // distant hills close the horizon
  h += smooth(290, 340, r) * 55 * (0.65 + 0.35 * fbm(x * 0.015, z * 0.015, 3));
  // a neighbouring shoulder to the north-west for silhouette
  h += 34 * gauss(x, z, -250, -170, 70);
  return h;
}

/* ---------------- the trail ---------------- */
export interface TrailPt { x: number; z: number; h: number; s: number; half: number; dx: number; dz: number }
export const TRAIL_STEP = 2;
const GRADE = 0.085, RAMP = 0.12, LOWLAND = 3;

/** Build the trail by steering a heading up the slope (spiral), with two hairpins in the cloud band. */
function buildTrail(): TrailPt[] {
  const pts: TrailPt[] = [];
  // start flush with the meadow at the mountain's foot
  const th0 = -0.55, r0 = 244;
  let x = r0 * Math.cos(th0), z = -r0 * Math.sin(th0), H = natural(x, z);
  // start heading: counter-clockwise tangent
  let hx = -Math.sin(th0), hz = -Math.cos(th0);
  let s = 0, mode: "spiral" | "pin1" | "leg" | "pin2" | "ramp" = "spiral", modeS = 0, pinSign = 0, legR = 0;
  // after the switchbacks the path sits inside the natural slope; let that offset fade slowly
  // (snapping back outward would cut straight through the hairpins below)
  let offset = 0;
  const ds = 1;
  const turn = (ang: number) => { const c = Math.cos(ang), n = Math.sin(ang), nx = hx * c - hz * n, nz = hx * n + hz * c; hx = nx; hz = nz; };
  while (s < 4000) {
    const r = Math.hypot(x, z), ux = x / r, uz = z / r; // outward
    const tx = uz, tz = -ux; // counter-clockwise tangent (as built above)
    let grade = GRADE, half = 2.5;
    if (mode === "spiral") {
      // keep to the natural slope at this height; a gentle radial correction
      // stay on the natural slope: the cone sits on meadows ~3 m up
      offset *= 1 - ds / 260;
      const want = coneInv(H - LOWLAND) + offset, corr = clamp((r - want) * 0.05, -0.45, 0.45);
      let dx = tx - ux * corr, dz = tz - uz * corr;
      const l = Math.hypot(dx, dz); dx /= l; dz /= l;
      const cross = hx * dz - hz * dx, dot = hx * dx + hz * dz;
      turn(clamp(Math.atan2(cross, dot), -ds / 14, ds / 14));
      // two short 12% ramps on the way up
      const p = s / 2500;
      if ((p > 0.17 && p < 0.185) || (p > 0.86 && p < 0.875)) grade = RAMP;
      // the cloud band's switchbacks begin here
      // turn sign that swings the heading toward the summit
      if (s > 1460 && pinSign === 0) { mode = "pin1"; modeS = s; pinSign = hz * ux - hx * uz > 0 ? 1 : -1; }
      if (r < 44 && mode === "spiral") { mode = "ramp"; modeS = s; }
    } else if (mode === "pin1" || mode === "pin2") {
      // a tight 180° hairpin, turning toward the mountain; flatter, narrower
      const sign = mode === "pin1" ? pinSign : -pinSign;
      turn((sign * Math.PI * ds) / (Math.PI * 6));
      grade = 0.05; half = 2.4; // hairpins are a little wider than the ledges, for forgiveness
      if (s - modeS >= Math.PI * 6) {
        if (mode === "pin1") { mode = "leg"; modeS = s; legR = r; }
        else { mode = "spiral"; modeS = s; offset = r - coneInv(H - LOWLAND); }
      }
    } else if (mode === "leg") {
      // back the other way along the ledge, a steady radius
      const dx = -tx - ux * clamp((r - legR) * 0.05, -0.3, 0.3), dz = -tz - uz * clamp((r - legR) * 0.05, -0.3, 0.3);
      const l = Math.hypot(dx, dz), cross = hx * (dz / l) - hz * (dx / l), dot = hx * (dx / l) + hz * (dz / l);
      turn(clamp(Math.atan2(cross, dot), -ds / 10, ds / 10));
      grade = 0.1; half = 1.8;
      if (s - modeS > 46) { mode = "pin2"; modeS = s; }
    } else if (mode === "ramp") {
      // the last stretch to the hut: one steady 12% ramp, still curving round the summit
      const dx = tx, dz = tz, cross = hx * dz - hz * dx, dot = hx * dx + hz * dz;
      turn(clamp(Math.atan2(cross, dot), -ds / 14, ds / 14));
      grade = RAMP;
      if (s - modeS > 70) break;
    }
    // ledges in the cloud band are narrower
    if (s > 1380 && s < 1760 && mode !== "pin1" && mode !== "pin2") half = Math.min(half, 1.8);
    if (s % TRAIL_STEP === 0) pts.push({ x, z, h: H, s, half, dx: hx, dz: hz });
    x += hx * ds; z += hz * ds; H += grade * ds; s += ds;
  }
  pts.push({ x, z, h: H, s, half: 2.5, dx: hx, dz: hz });
  return pts;
}

export const TRAIL = buildTrail();
export const TRAIL_LEN = TRAIL[TRAIL.length - 1].s;
export const HUT = (() => {
  const e = TRAIL[TRAIL.length - 1];
  return { x: e.x + e.dx * 9, z: e.z + e.dz * 9, h: e.h, yaw: Math.atan2(-e.dx, -e.dz) };
})();

/* spatial hash over trail points for nearest-point queries */
const CELL = 8;
const cells = new Map<number, number[]>();
const key = (cx: number, cz: number) => cx * 4096 + cz;
TRAIL.forEach((p, i) => {
  const k = key(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
  if (!cells.has(k)) cells.set(k, []);
  cells.get(k)!.push(i);
});

export interface TrailHit { d: number; side: number; h: number; s: number; half: number; i: number }
const hit: TrailHit = { d: Infinity, side: 0, h: 0, s: 0, half: 2.5, i: 0 };
/** Nearest point on the trail: lateral distance, which side (+ = outward, away from the summit), trail height there. */
export function trailAt(x: number, z: number, reach = 2): TrailHit {
  hit.d = Infinity;
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  let best = -1, bd = Infinity;
  for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) {
    const l = cells.get(key(cx + i, cz + j));
    if (l) for (const k of l) { const p = TRAIL[k], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = k; } }
  }
  if (best < 0) return hit;
  // refine on the neighbouring segment
  const a = TRAIL[Math.max(0, best - 1)], b = TRAIL[Math.min(TRAIL.length - 1, best + 1)];
  const sx = b.x - a.x, sz = b.z - a.z, len2 = sx * sx + sz * sz;
  const t = clamp(((x - a.x) * sx + (z - a.z) * sz) / len2, 0, 1);
  const px = a.x + sx * t, pz = a.z + sz * t, l = Math.sqrt(len2);
  // lateral: + toward the outside of the mountain
  const nx = sz / l, nz = -sx / l, out = Math.sign((px * nx + pz * nz) || 1);
  hit.d = Math.hypot(x - px, z - pz);
  hit.side = ((x - px) * nx + (z - pz) * nz) * out;
  hit.h = mix(a.h, b.h, t);
  hit.s = mix(a.s, b.s, t);
  hit.half = Math.min(a.half, b.half);
  hit.i = best;
  return hit;
}

/** Progress 0..1 of a trail distance. */
export const progressOf = (s: number) => clamp(s / TRAIL_LEN, 0, 1);
/** Trail distance at a progress. */
export const sAt = (p: number) => p * TRAIL_LEN;
/** Trail point nearest a given progress. */
export function pointAt(p: number) { return TRAIL[clamp(Math.round(sAt(p) / TRAIL_STEP), 0, TRAIL.length - 1)]; }

/* ---------------- features placed along the trail ---------------- */
export const FEATURES = {
  farm: 0.075, goats: 0.115, mud: [0.185, 0.2] as [number, number], camp1: 0.215,
  log: 0.3, slide: [0.355, 0.37] as [number, number], eagle: 0.4, bridge: 0.445,
  bellsFrom: 0.52, bellsTo: 0.74, camp2: 0.63, cloudTop: 0.765, snowFrom: 0.78, gustsFrom: 0.8,
};

/* ---------------- building pads ---------------- */
/** The farm: the flattest site near the first turn, clear of the trail (ART §5: pad slope ≤ 12°). */
export const FARM_SITE = (() => {
  let best = { x: 0, z: 0, slope: Infinity, prog: FEATURES.farm };
  for (let prog = 0.05; prog <= 0.11; prog += 0.004) {
    const p = pointAt(prog), nx = p.dz, nz = -p.dx, o = Math.sign(p.x * nx + p.z * nz) || 1;
    for (const off of [-34, -28, -22, -16, 16, 22, 28, 34, 40]) {
      const x = p.x + nx * o * off, z = p.z + nz * o * off;
      if (trailAt(x, z).d < 13) continue;
      const slope = slopeUnder(natural, x, z, 7);
      if (slope < best.slope) best = { x, z, slope, prog };
    }
  }
  return best;
})();
/** The stone shelter in the cloud band, dug into the bank on the inside of the trail. */
export const SHELTER_SITE = (() => {
  const p = pointAt(FEATURES.camp2), nx = p.dz, nz = -p.dx, o = Math.sign(p.x * nx + p.z * nz) || 1, off = -(p.half + 5.5);
  return { x: p.x + nx * o * off, z: p.z + nz * o * off, h: p.h + 0.3 };
})();
export const PADS: Pad[] = [
  { x: FARM_SITE.x, z: FARM_SITE.z, r: 6.4, h: natural(FARM_SITE.x, FARM_SITE.z) },
  { x: SHELTER_SITE.x, z: SHELTER_SITE.z, r: 3.4, h: SHELTER_SITE.h },
];

// the deck reaches past the gully's sloped edges on both sides, so there is never a hole before the planks
const BRIDGE_S = sAt(FEATURES.bridge), BRIDGE_HALF_LEN = 7.5, BRIDGE_HALF_W = 1.9, GAP_HALF = 6;

/** Height of the carved trail surface (bank + ruts) at a lateral offset. */
function roadAt(t: TrailHit) {
  const bank = t.side * Math.tan((3 * Math.PI) / 180); // outer edge higher: everything leans toward the mountain
  const rut = 0.07 * (Math.exp(-(((t.side - 0.65) / 0.18) ** 2)) + Math.exp(-(((t.side + 0.65) / 0.18) ** 2)));
  return t.h + bank - rut;
}

function kettleHeight(x: number, z: number) {
  let h = flattenPad(PADS, x, z, natural(x, z));
  // the hut's shoulder: a small flat, laid before the trail so the road below always wins
  const dh = Math.hypot(x - HUT.x, z - HUT.z);
  if (dh < 20) h = mix(h, HUT.h - 0.1, 1 - smooth(9, 18, dh));
  const r = Math.hypot(x, z);
  if (r < 250) {
    const t = trailAt(x, z);
    if (t.d < t.half + 12) {
      const road = roadAt(t);
      // inner side: a cut wall; outer side: the slope falls away (fill only where needed)
      const shoulder = t.side < 0 ? 2.4 : 3.8;
      h = mix(h, road, 1 - smooth(t.half + 0.7, t.half + 0.7 + shoulder, t.d));
      // the washed-out gap under the bridge
      const ds = Math.abs(t.s - BRIDGE_S);
      if (ds < GAP_HALF + 1) h -= 9 * (1 - smooth(3, GAP_HALF, ds)) * (1 - smooth(6, 16, t.d));
    }
  }
  return h;
}

/** The plank bridge across the gap: a drivable deck a little above where the road would be. */
function deck(x: number, z: number) {
  const t = trailAt(x, z, 1);
  if (Math.abs(t.s - BRIDGE_S) > BRIDGE_HALF_LEN || t.d > BRIDGE_HALF_W) return -Infinity;
  return t.h + 0.12;
}
export const onBridge = (x: number, z: number) => deck(x, z) > -Infinity;

function grip(x: number, z: number) {
  const t = trailAt(x, z, 1);
  if (t.d > t.half + 0.5) return 1;
  const p = progressOf(t.s);
  if (p > FEATURES.mud[0] && p < FEATURES.mud[1]) return 0.6; // mud: −40%
  if (p > FEATURES.snowFrom) return 0.75; // light snow: −25%
  return 1;
}

/* ---------------- colour ---------------- */
const C = {
  meadow: new Color("#7C8F55"), olive: new Color("#6F8545"), straw: new Color("#A49A62"),
  forest: new Color("#5E5A3C"), needles: new Color("#7A5A3C"), rock: new Color("#7E786F"), rock2: new Color("#5E5B57"),
  lichen: new Color("#8A8F72"), snow: new Color("#EEF1F3"), dirt: new Color("#8C7759"), rut: new Color("#6E5C44"),
  mud: new Color("#5A4632"), terrace: new Color("#8D8676"),
};
const tc = new Color();
const out: GroundSample = { color: new Color(), grass: 1 };
function kettleGroundAt(x: number, z: number, y: number, ny: number): GroundSample {
  const c = out.color, n1 = fbm(x * 0.013, z * 0.013, 3), n3 = fbm(x * 0.15 + 3, z * 0.15, 2);
  // by altitude: orchard meadows, pine floor, rock and lichen in the cloud band, snow above it
  c.copy(C.olive).lerp(C.meadow, smooth(-0.3, 0.3, n1)).lerp(C.straw, clamp(smooth(0.15, 0.5, fbm(x * 0.04 + 7, z * 0.04, 3)) * 0.6, 0, 1));
  c.lerp(C.forest, smooth(55, 75, y) * (1 - smooth(110, 125, y)) * 0.75);
  c.lerp(C.lichen, smooth(110, 135, y));
  c.multiplyScalar(0.93 + n3 * 0.14);
  let grass = (1 - smooth(55, 80, y)) * 0.9 + smooth(55, 80, y) * (1 - smooth(110, 125, y)) * 0.25;
  tc.copy(C.rock).lerp(C.rock2, clamp(0.5 + n3, 0, 1));
  const rk = smooth(0.78, 0.6, ny + n1 * 0.05);
  c.lerp(tc, rk);
  grass *= 1 - rk;
  const sn = smooth(168, 185, y + n1 * 10) * smooth(0.5, 0.72, ny);
  c.lerp(C.snow, sn);
  grass *= 1 - sn - smooth(120, 135, y);
  // the trail: packed dirt, darker ruts, a grassy middle strip; needles, mud and snow where they are
  const r = Math.hypot(x, z);
  if (r < 250) {
    const t = trailAt(x, z, 1);
    if (t.d < t.half + 1.2) {
      const p = progressOf(t.s), on = 1 - smooth(t.half - 0.3, t.half + 1.2, t.d);
      tc.copy(C.dirt);
      if (p > 0.25 && p < 0.5) tc.lerp(C.needles, 0.55);
      if (p > FEATURES.mud[0] && p < FEATURES.mud[1]) tc.copy(C.mud);
      const rut = Math.exp(-(((Math.abs(t.side) - 0.65) / 0.25) ** 2));
      tc.lerp(C.rut, rut * 0.6);
      if (p > FEATURES.snowFrom) tc.lerp(C.snow, 0.35 + 0.35 * smooth(-0.2, 0.4, fbm(x * 0.3, z * 0.3, 2)));
      c.lerp(tc, on);
      const strip = p < 0.5 ? Math.exp(-((t.side / 0.3) ** 2)) : 0; // grass along the middle
      grass = mix(grass, strip * 0.9, on);
    }
  }
  // yards: packed earth on building pads
  for (const pd of PADS) {
    const d = Math.hypot(x - pd.x, z - pd.z);
    if (d < pd.r + 2) { const k = 1 - smooth(pd.r - 1.5, pd.r + 2, d); c.lerp(C.terrace, k * 0.45); grass *= 1 - k * 0.85; }
  }
  // the hut's flat
  const dh = Math.hypot(x - HUT.x, z - HUT.z);
  if (dh < 14) c.lerp(C.terrace, (1 - smooth(6, 14, dh)) * 0.5);
  // darker soil under the pines
  let ao = 0;
  for (const tr of kettleTreesNear(x, z)) {
    const rr = 3 * tr.s, d2 = (x - tr.x) ** 2 + (z - tr.z) ** 2;
    if (d2 < 9 * rr * rr) ao += Math.exp(-d2 / (rr * rr));
  }
  c.multiplyScalar(1 - 0.35 * Math.min(1, ao));
  out.grass = clamp(grass * (1 - 0.5 * Math.min(1, ao)), 0, 1);
  return out;
}

/* ---------------- trees (pines + the orchard) ---------------- */
export interface KTree extends Prop { kind: "pine" | "apple" | "blossom" }
let treeCache: KTree[] | null = null;
/** Is (x, z) free for a tree: off the road and its shoulder, off building pads. */
const treeFree = (x: number, z: number, margin = 3.5) => {
  const t = trailAt(x, z);
  return t.d > t.half + margin && !PADS.some((pd) => Math.hypot(x - pd.x, z - pd.z) < pd.r + 5) && Math.hypot(x - HUT.x, z - HUT.z) > 14;
};
/**
 * Trees by ART §5: the orchard in rows along the terrace contours (6–7 m apart), pines in groves
 * with saplings round their rims and a blossom tree or two where a grove meets the meadow, and
 * the forest round the foot of the mountain thinning to saplings at its edge.
 */
export function kettleTrees(): KTree[] {
  if (treeCache) return treeCache;
  const list: KTree[] = [];
  const add = (x: number, z: number, s: number, kind: KTree["kind"], margin?: number) => { if (treeFree(x, z, margin)) list.push({ x, y: natural(x, z), z, s, kind }); };
  const along = (s0: number, off: number, j: number) => {
    const p = TRAIL[clamp(Math.round(s0 / TRAIL_STEP), 0, TRAIL.length - 1)], nx = p.dz, nz = -p.dx, o = Math.sign(p.x * nx + p.z * nz) || 1;
    return { x: p.x + nx * o * off + p.dx * j, z: p.z + nz * o * off + p.dz * j };
  };
  // the orchard: rows between the terraces (outward 11 / 19 / 28 m), following the trail's contour
  for (const off of [15, 23.5]) for (let sd = sAt(0.035); sd < sAt(0.235); sd += 6.5) {
    const k = sd * 0.37 + off;
    if (hash(k, 1) < 0.1) continue; // a gap in the row now and then
    const q = along(sd, off + (hash(k, 2) - 0.5) * 0.8, (hash(k, 3) - 0.5) * 0.8);
    add(q.x, q.z, 0.85 + hash(k, 4) * 0.35, "apple", 4);
  }
  // pine groves on the shoulder (and a few small ones in the cloud band)
  for (let sd = sAt(0.24); sd < sAt(0.7); sd += 19) for (const side of [-1, 1]) {
    const k = sd * 0.11 + side, band = progressOf(sd) > 0.52;
    if (hash(k, 1) < (band ? 0.7 : 0.2)) continue;
    const c = along(sd, side * (12 + hash(k, 2) * 24), 0), R = band ? 4 + hash(k, 3) * 3 : 7 + hash(k, 3) * 6;
    const n = Math.round(R * (band ? 0.6 : 1.3));
    for (let i = 0; i < n; i++) { // sunflower spiral: dense middle, no rows
      const a = i * 2.39996 + k, d = Math.sqrt((i + 0.5) / n) * R * 0.8;
      add(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, 0.75 + Math.pow(hash(k + i, 4), 1.3) * 0.95, "pine");
    }
    for (let i = 0; i < 3 + Math.floor(hash(k, 5) * 4); i++) { // saplings round the rim
      const a = hash(k + i, 6) * 6.28, d = R * (0.9 + hash(k + i, 7) * 0.3);
      add(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, 0.4 + hash(k + i, 8) * 0.2, "pine");
    }
    if (!band && natural(c.x, c.z) < 72 && hash(k, 9) < 0.6) { // blossom where the grove meets the meadow
      const a = hash(k, 10) * 6.28, d = R * 1.25;
      add(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, 0.75 + hash(k, 11) * 0.35, "blossom");
    }
  }
  // the forest round the foot of the mountain, thinning to saplings and the odd blossom at its edge
  for (let i = 0; i < 3200 && list.length < 2200; i++) {
    const a = hash(i, 11) * Math.PI * 2, rr = 236 + hash(i, 12) * 70, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const f = fbm(x * 0.02 + 5, z * 0.02, 3);
    if (f < 0.0 || Math.hypot(x - TRAIL[0].x, z - TRAIL[0].z) < 18 || trailAt(x, z).d < 9) continue;
    if (f < 0.07) { if (hash(i, 14) < 0.1) list.push({ x, y: natural(x, z), z, s: 0.75 + hash(i, 13) * 0.3, kind: "blossom" }); else if (hash(i, 14) < 0.5) list.push({ x, y: natural(x, z), z, s: 0.4 + hash(i, 13) * 0.2, kind: "pine" }); continue; }
    list.push({ x, y: natural(x, z), z, s: 0.7 + hash(i, 13) * 0.9, kind: "pine" });
  }
  return (treeCache = list);
}
/** Boulders on the open rocky slopes (shoulder to summit), off the road: grouped by Rocks. */
let rockCache: Prop[] | null = null;
export function kettleRocks(): Prop[] {
  if (rockCache) return rockCache;
  const list: Prop[] = [];
  for (let sd = sAt(0.3); sd < sAt(0.97); sd += 11) for (const side of [-1, 1]) {
    const k = sd * 0.23 + side;
    if (hash(k, 1) < 0.62) continue;
    const p = TRAIL[clamp(Math.round(sd / TRAIL_STEP), 0, TRAIL.length - 1)], nx = p.dz, nz = -p.dx, o = Math.sign(p.x * nx + p.z * nz) || 1;
    const off = side * (7 + hash(k, 2) * 30), x = p.x + nx * o * off, z = p.z + nz * o * off;
    if (!treeFree(x, z, 4.5) || kettleTreesNear(x, z).some((t) => Math.hypot(t.x - x, t.z - z) < 4)) continue;
    list.push({ x, y: kettleHeight(x, z), z, s: 0.7 + Math.pow(hash(k, 3), 1.6) * 1.9 });
  }
  return (rockCache = list);
}

const TCELL = 10;
let tgrid: Map<number, KTree[]> | null = null;
function kettleTreesNear(x: number, z: number): KTree[] {
  if (!tgrid) {
    tgrid = new Map();
    for (const t of kettleTrees()) {
      const k = key(Math.floor(t.x / TCELL), Math.floor(t.z / TCELL));
      if (!tgrid.has(k)) tgrid.set(k, []);
      tgrid.get(k)!.push(t);
    }
  }
  const res: KTree[] = [], cx = Math.floor(x / TCELL), cz = Math.floor(z / TCELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = tgrid.get(key(cx + i, cz + j)); if (l) res.push(...l); }
  return res;
}

const s0 = TRAIL[3], s1 = TRAIL[6];
export const kettleGround: RegionGround = {
  id: "kettle", height: kettleHeight, water: () => -100, deck, grip, groundAt: kettleGroundAt, treesNear: kettleTreesNear,
  radius: 300, seg: 512, start: { x: s0.x, z: s0.z, yaw: Math.atan2(-(s1.x - s0.x), -(s1.z - s0.z)) },
};

/** Safe point for no-fail recovery: back along the trail from where the vehicle went over. */
export function safePointNear(x: number, z: number) {
  const t = trailAt(x, z, 4);
  // well back along the trail (20 m), so a hazard can't catch you again straight away
  const i = Math.max(1, (t.d < Infinity ? t.i : 0) - 10), p = TRAIL[i];
  return { x: p.x, z: p.z, yaw: Math.atan2(-p.dx, -p.dz) };
}
