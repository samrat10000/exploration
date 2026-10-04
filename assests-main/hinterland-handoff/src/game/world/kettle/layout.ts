// Where everything on Kettle Peak goes, as plain data placed along the trail. Visuals and colliders
// both read from here, so what you see is what you hit.
import { hash } from "../../../utils/noise";
import { FARM_SITE, FEATURES, HUT, TRAIL, TRAIL_STEP, kettleGround, pointAt, sAt, trailAt } from "./kettle";

const H = (x: number, z: number) => kettleGround.height(x, z);

/** Outward (away from the summit) unit normal at a trail point. */
export function outward(i: number) {
  const p = TRAIL[i], nx = p.dz, nz = -p.dx, s = Math.sign(p.x * nx + p.z * nz) || 1;
  return { x: nx * s, z: nz * s };
}
const idx = (prog: number) => Math.max(0, Math.min(TRAIL.length - 1, Math.round(sAt(prog) / TRAIL_STEP)));
/** A spot beside the trail at a progress: `off` metres outward (negative = inward, uphill). */
export function beside(prog: number, off: number) {
  const i = idx(prog), p = TRAIL[i], o = outward(i), x = p.x + o.x * off, z = p.z + o.z * off;
  return { x, z, y: H(x, z), yaw: Math.atan2(-p.dx, -p.dz), i };
}

export interface Seg { x: number; y: number; z: number; yaw: number; len: number }
export interface Post { x: number; y: number; z: number }

/**
 * The trail's outer edge (ART §5), classified every 2 m by how far the ground falls away: dry-stone
 * walls on real drops (with a gap now and then, so they feel old), posts with rope where it drops a
 * little, and low half-buried stones where it hardly drops at all.
 */
export const EDGE = (() => {
  const walls: Seg[] = [], posts: (Post & { i: number })[] = [], stones: Seg[] = [];
  for (let i = 6; i < TRAIL.length - 4; i++) {
    const p = TRAIL[i];
    if (Math.abs(p.s - sAt(FEATURES.bridge)) < 9) continue;
    if (Math.abs(p.s - sAt(FEATURES.log)) < 14) continue; // the log has to be able to roll off here
    const o = outward(i), e = p.half + 0.55, x = p.x + o.x * e, z = p.z + o.z * e, yaw = Math.atan2(p.dx, p.dz);
    // worst fall within 6 m (a hairpin's lower leg can sit 6 m out, flat, below a steep edge)
    const drop = Math.max(...[1.5, 3, 6].map((k) => p.h - H(p.x + o.x * (e + k), p.z + o.z * (e + k)))), y = H(x, z);
    if (drop > 4) {
      if (i % 2 === 0 && hash(i, 3) > 0.16) walls.push({ x, y, z, yaw, len: 3.2 + hash(i, 4) * 0.5 });
    } else if (drop > 1.5) {
      if (hash(i, 5) > 0.08) posts.push({ x, y, z, i });
    } else if (i % 4 === 0 && hash(i, 6) < 0.5) {
      const xs = p.x + o.x * (e + 0.3), zs = p.z + o.z * (e + 0.3);
      stones.push({ x: xs, y: H(xs, zs), z: zs, yaw, len: 6 });
    }
  }
  return { walls, posts, stones };
})();

/** Low dry-stone terraces stepping down the orchard below the first turn. */
export const TERRACES: Seg[] = (() => {
  const list: Seg[] = [];
  for (let i = idx(0.03); i < idx(0.24); i += 2) {
    const p = TRAIL[i], o = outward(i);
    for (const off of [11, 19, 28]) {
      if (hash(i, off) < 0.25) continue;
      const x = p.x + o.x * off, z = p.z + o.z * off;
      if (trailAt(x, z).d < 6) continue;
      list.push({ x, y: H(x, z), z, yaw: Math.atan2(p.dx, p.dz), len: 4.4 });
    }
  }
  return list;
})();

/** Bell poles along the cloud band: you hear the next one before you see it. */
export const BELLS: Post[] = (() => {
  const list: Post[] = [];
  for (let prog = FEATURES.bellsFrom; prog < FEATURES.bellsTo; prog += 0.022) {
    const b = beside(prog, pointAt(prog).half + 1.2);
    list.push({ x: b.x, y: b.y, z: b.z });
  }
  return list;
})();

/** Prayer-flag lines on the final ramp and around the hut. */
export const FLAGS: { a: Post; b: Post }[] = (() => {
  const list: { a: Post; b: Post }[] = [];
  for (let prog = 0.9; prog < 0.995; prog += 0.018) {
    const a = beside(prog, -(pointAt(prog).half + 1.4)), b = beside(prog + 0.012, pointAt(prog).half + 1.4);
    list.push({ a: { x: a.x, y: a.y + 3.4, z: a.z }, b: { x: b.x, y: b.y + 3.4, z: b.z } });
  }
  return list;
})();

/** Stacked stones by the last bends. */
export const CAIRNS = [0.93, 0.965, 0.985].map((p, k) => beside(p, (k % 2 ? 1 : -1) * (pointAt(p).half + 1.6)));

/** The farm on its pad, its door facing the trail. */
export const FARM = (() => {
  const t = TRAIL[trailAt(FARM_SITE.x, FARM_SITE.z, 8).i], fx = t.x - FARM_SITE.x, fz = t.z - FARM_SITE.z;
  return { x: FARM_SITE.x, z: FARM_SITE.z, y: H(FARM_SITE.x, FARM_SITE.z), yaw: Math.atan2(-fx, -fz) };
})();
export const TRAVELER = beside(FEATURES.farm + 0.006, -(pointAt(FEATURES.farm).half + 2.2));
export const CAMPS = [
  { ...beside(FEATURES.camp1, 9), name: "terrace" },
  { ...beside(FEATURES.camp2, -(pointAt(FEATURES.camp2).half + 3.2)), name: "shelter" },
];
export const SHELTER = beside(FEATURES.camp2, -(pointAt(FEATURES.camp2).half + 5.5));

export const BRIDGE = (() => {
  const i = idx(FEATURES.bridge), p = TRAIL[i];
  return { x: p.x, z: p.z, y: p.h + 0.12, yaw: Math.atan2(p.dx, p.dz), dx: p.dx, dz: p.dz, i };
})();

/** The fallen log lies across the trail at a slight angle. */
export const LOG = (() => {
  const i = idx(FEATURES.log), p = TRAIL[i], o = outward(i);
  // a little toward the outer edge, clear of the cut bank
  return { x: p.x + o.x * 0.6, y: p.h + 0.45, z: p.z + o.z * 0.6, yaw: Math.atan2(p.dx, p.dz) + Math.PI / 2 + 0.2, out: o };
})();

/** Small rocks spilled across the trail. */
export const SLIDE: Post[] = (() => {
  const list: Post[] = [];
  for (let k = 0; k < 26; k++) {
    const prog = FEATURES.slide[0] + hash(k, 1) * (FEATURES.slide[1] - FEATURES.slide[0]);
    const b = beside(prog, (hash(k, 2) - 0.5) * 2 * pointAt(prog).half);
    list.push({ x: b.x, y: b.y + 0.6, z: b.z });
  }
  return list;
})();

export const GOATS = (() => {
  const c = beside(FEATURES.goats, 0);
  return { ...c, herd: Array.from({ length: 6 }, (_, k) => ({ along: (hash(k, 7) - 0.5) * 7, across: (hash(k, 8) - 0.5) * 3.2, s: 0.85 + hash(k, 9) * 0.3 })) };
})();

/** Lantern posts in an arc in front of the hut: one lights for each crate delivered. */
export const LANTERNS: Post[] = Array.from({ length: 6 }, (_, k) => {
  const a = HUT.yaw + Math.PI + (k - 2.5) * 0.32, x = HUT.x + Math.sin(a) * 9, z = HUT.z + Math.cos(a) * 9;
  return { x, y: H(x, z), z };
});
export const CRATE_STACK = { x: HUT.x + Math.cos(HUT.yaw) * 3.4, z: HUT.z - Math.sin(HUT.yaw) * 3.4 };
