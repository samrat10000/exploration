// Placement lists for trees and rocks. Pure data, computed once and shared by the
// instanced meshes and their colliders, so what you see is exactly what you hit.
import { distToSeg, fbm, hash, vnoise } from "../../utils/noise";
import type { Drift } from "./Flowers";
import { ROUTE } from "./ground";
import { DEPOT, HUTS } from "../rounds/rounds";
import { POOL, START, TARN, TRAIL, VP, WATER, activeGround, gridH, gridSlope, riverX, trailInfo, valleyGround, type Prop } from "./height";

export type { Prop };

const nearTrail = (x: number, z: number, r: number) => x > -112 && x < -45 && z > -125 && z < -45 && trailInfo(x, z).d < r;
const nearTarn = (x: number, z: number, r: number) => Math.hypot(x - TARN.x, z - TARN.z) < TARN.radius + r;

let trees: Prop[] | null = null, blossoms: Prop[] = [];
/** Pink blossom trees where the woods meet the meadow (ART §5 forest edges). */
export const blossomList = () => (treeList(), blossoms);
export function treeList() {
  if (trees) return trees;
  const pts: Prop[] = [];
  for (let i = 0; i < 11000 && pts.length < 1300; i++) {
    const x = (hash(i, 1.3) - 0.5) * 500, z = (hash(2.7, i) - 0.5) * 500;
    if (Math.hypot(x, z) > 240) continue;
    const forest = fbm(x * 0.018 + 40, z * 0.018, 3), thr = 0.02 + hash(i, 5) * 0.18;
    // just outside a forest's edge: saplings, so woods thin out instead of stopping
    const sapling = forest < thr;
    if (sapling && (forest < thr - 0.1 || hash(i, 7) > 0.35)) continue;
    const y = gridH(x, z);
    if (y < WATER + 1.4 || y > 66) continue;
    if (gridSlope(x, z) < 0.8) continue;
    // clearings get ragged edges, never straight walls
    const rag = vnoise(x * 0.09, z * 0.09);
    if (Math.abs(x - riverX(z)) < 13 + rag * 5 && z > -86) continue;
    if (Math.hypot(x - START.x, z - START.z) < 16 || Math.hypot(x - VP.x, z - VP.z) < 16 || Math.hypot(x - POOL.x, z - POOL.z) < 20) continue;
    if (distToSeg(x, z, START.x, START.z, VP.x, VP.z) < 8 + rag * 6) continue;
    if (nearTrail(x, z, 4.5) || nearTarn(x, z, 2)) continue;
    if (HUTS.some((h) => Math.hypot(x - h.x, z - h.z) < 14) || Math.hypot(x - DEPOT.x, z - DEPOT.z) < 11) continue;
    if (sapling && hash(i, 8) < 0.16 && y < 40) { blossoms.push({ x, y, z, s: 0.75 + hash(i, 9) * 0.4 }); continue; }
    // saplings at the edge 0.4–0.6×, grown trees 0.6–1.8× (ART §2.5)
    pts.push({ x, y, z, s: sapling ? 0.4 + hash(i, 9) * 0.2 : 0.6 + Math.pow(hash(i, 9), 1.3) * 1.2 });
  }
  // The track's mouth hides in a stand of pines: dense on both sides, open only along the trail.
  const a = TRAIL[0], b = TRAIL[1], len = Math.hypot(b.x - a.x, b.z - a.z), fx = (b.x - a.x) / len, fz = (b.z - a.z) / len;
  for (let i = 0; i < 46; i++) {
    const along = -10 + hash(i, 61) * 26, side = (hash(i, 62) < 0.5 ? -1 : 1) * (5 + hash(i, 63) * 11);
    const x = a.x + fx * along - fz * side, z = a.z + fz * along + fx * side;
    if (nearTrail(x, z, 4.5) || Math.hypot(x - POOL.x, z - POOL.z) < 18) continue;
    pts.push({ x, y: gridH(x, z), z, s: 0.95 + hash(i, 64) * 0.7 });
  }
  return (trees = pts);
}

/* spatial grid over trees, for cheap "is there a tree here" checks (camera occlusion) */
const CELL = 10;
let treeGrid: Map<string, Prop[]> | null = null;
function valleyTreesNear(x: number, z: number): Prop[] {
  if (!treeGrid) {
    treeGrid = new Map();
    for (const t of treeList()) {
      const k = `${Math.floor(t.x / CELL)},${Math.floor(t.z / CELL)}`;
      if (!treeGrid.has(k)) treeGrid.set(k, []);
      treeGrid.get(k)!.push(t);
    }
  }
  const out: Prop[] = [], cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const l = treeGrid.get(`${cx + i},${cz + j}`);
    if (l) out.push(...l);
  }
  return out;
}

/** Rock groups may spread anywhere but the hidden track. */
export const rockFree = (x: number, z: number) => !nearTrail(x, z, 3.5);

let rocks: Prop[] | null = null;
export function rockList() {
  if (rocks) return rocks;
  const list: Prop[] = [];
  for (let i = 0; i < 4000 && list.length < 340; i++) {
    const x = (hash(i, 31) - 0.5) * 480, z = (hash(37, i) - 0.5) * 480;
    const y = gridH(x, z), ny = gridSlope(x, z);
    const nearRiver = z > -90 && Math.abs(x - riverX(z)) < 16;
    if (!(ny < 0.86 || nearRiver || hash(i, 41) < 0.08)) continue;
    if (y > 90 || Math.hypot(x - START.x, z - START.z) < 14 || Math.hypot(x - VP.x, z - VP.z) < 13) continue;
    if (distToSeg(x, z, START.x, START.z, VP.x, VP.z) < 5) continue;
    if (nearTrail(x, z, 3.5) || nearTarn(x, z, -2)) continue;
    list.push({ x, y, z, s: 0.5 + Math.pow(hash(i, 43), 2) * 3.2 });
  }
  // a few boulders frame the tarn's shore
  for (let i = 0; i < 9; i++) {
    const ang = Math.PI * 1.05 + hash(i, 71) * Math.PI * 0.95, r = TARN.radius + 1.5 + hash(i, 72) * 3;
    const x = TARN.x + Math.cos(ang) * r, z = TARN.z + Math.sin(ang) * r;
    if (nearTrail(x, z, 3.5)) continue;
    list.push({ x, y: gridH(x, z), z, s: 0.7 + hash(i, 73) * 1.4 });
  }
  return (rocks = list);
}

/** Flower drifts along the river banks, the drive up to the ridge, the hidden track and the tarn. */
let drifts: Drift[] | null = null;
export const driftList = () => (drifts ??= (() => {
  const list: Drift[] = [];
  for (let z = -80; z < 230; z += 7) for (const side of [-1, 1]) {
    if (hash(z, side + 2) < 0.45) continue;
    list.push({ x: riverX(z) + side * (6 + hash(z, side + 4) * 9), z: z + (hash(z, 6) - 0.5) * 4, r: 1.2 + hash(z, 7) * 1.6 });
  }
  for (let i = 0; i < 40; i++) {
    const t = hash(i, 21), x = ROUTE.ax + (ROUTE.bx - ROUTE.ax) * t, z = ROUTE.az + (ROUTE.bz - ROUTE.az) * t, side = (hash(i, 22) - 0.5) * 30;
    list.push({ x: x + side, z: z + (hash(i, 23) - 0.5) * 10, r: 1.5 + hash(i, 24) * 2 });
  }
  for (let i = 0; i < 18; i++) { const p = TRAIL[Math.floor(hash(i, 31) * (TRAIL.length - 1))]; list.push({ x: p.x + (hash(i, 32) - 0.5) * 9, z: p.z + (hash(i, 33) - 0.5) * 9, r: 1.2 }); }
  for (let i = 0; i < 10; i++) { const a = hash(i, 41) * 6.28; list.push({ x: TARN.x + Math.cos(a) * (TARN.radius + 3), z: TARN.z + Math.sin(a) * (TARN.radius + 3), r: 1.4, kind: "buttercup" }); }
  return list;
})());
export const flowerOk = (x: number, z: number) => gridH(x, z) > WATER + 0.4 && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => valleyGround.water(x + dx, z + dz) < valleyGround.height(x + dx, z + dz) - 0.1) && trailInfo(x, z).d > 2.2;


valleyGround.treesNear = valleyTreesNear;
/** Trees near a point in the active region (camera occlusion). */
export const treesNear = (x: number, z: number) => activeGround().treesNear?.(x, z) ?? [];
