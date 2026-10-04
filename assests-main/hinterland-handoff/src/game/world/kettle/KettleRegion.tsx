// Kettle Peak, assembled: terrain, grass, trees, the trail's edge, places, obstacles, sky and beats.
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferGeometry, Group, Mesh, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cullByDistance, instanced, place } from "../../art/kit";
import { live } from "../../../state/live";
import { hash } from "../../../utils/noise";
import { useFixedColliders } from "../colliders";
import { Flowers, type Drift } from "../Flowers";
import { Grass } from "../Grass";
import { Rocks } from "../Rocks";
import { Terrain } from "../Terrain";
import { BlossomTrees, Pines } from "../Vegetation";
import { CloudSea, Drifts, Snow } from "./CloudSea";
import { KettleBeats } from "./KettleBeats";
import { KettleObstacles } from "./KettleObstacles";
import { KettlePlaces } from "./KettlePlaces";
import { TRAIL, kettleGround, kettleRocks, kettleTrees, safePointNear, trailAt } from "./kettle";
import { EDGE, TERRACES, beside, outward, type Post, type Seg } from "./layout";
import { POST_TIE_Y, buildPost, ropeGeo, ropeMat } from "./posts";
import { buildTrailStones } from "./trailEdge";
import { buildWall } from "./wall";

/** Wall segments (assets.html → WALL, built along X) laid along each segment's yaw and length. */
function walls(list: Seg[], len: number, hScale: number) {
  const model = buildWall(len);
  return instanced(model, list.map((s, i) => place(s.x, s.y - 0.06, s.z, s.yaw + Math.PI / 2, [s.len / len, hScale * (0.9 + hash(i, 2) * 0.2), 1], [0, (hash(i, 1) - 0.5) * 0.04])), { cell: 48 });
}

/** Posts (3 seeded variants) with rope hung between neighbours along the trail. */
function posts(list: (Post & { i: number })[]) {
  const g = new Group(), V = 3;
  for (let v = 0; v < V; v++) {
    const mine = list.map((p, gi) => ({ p, gi })).filter(({ gi }) => gi % V === v);
    g.add(instanced(buildPost(v + 1), mine.map(({ p, gi }) => place(p.x, p.y - 0.05, p.z, hash(gi, 4) * 6.28)), { cell: 48 }));
  }
  const ropes: BufferGeometry[] = [];
  for (let k = 1; k < list.length; k++) {
    const a = list[k - 1], b = list[k];
    if (b.i - a.i > 2) continue;
    ropes.push(ropeGeo(new Vector3(a.x, a.y + POST_TIE_Y - 0.05, a.z), new Vector3(b.x, b.y + POST_TIE_Y - 0.05, b.z)));
  }
  if (ropes.length) { const m = new Mesh(mergeGeometries(ropes), ropeMat()); m.castShadow = true; g.add(m); }
  return g;
}

/** Low trail-side stones (assets.html → TRAIL, built along X), half-buried. */
function stones(list: Seg[]) {
  return instanced(buildTrailStones(), list.map((s, i) => place(s.x, s.y - 0.08, s.z, s.yaw + Math.PI / 2 + (hash(i, 7) - 0.5) * 0.1, 0.8 + hash(i, 8) * 0.4)), { cell: 48 });
}

const quat = (yaw: number) => ({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
/** The trail's outer edge (walls, posts + rope, stones) and the orchard terraces. Colliders match what you see. */
function Edge() {
  const group = useMemo(() => new Group().add(walls(EDGE.walls, 3.2, 1), walls(TERRACES, 4.4, 0.7), posts(EDGE.posts), stones(EDGE.stones)), []);
  const camera = useThree((st) => st.camera);
  useFrame(() => cullByDistance(group, camera.position, 170));
  useFixedColliders((r) => [
    ...EDGE.walls.map((s) => r.ColliderDesc.cuboid(0.28, 0.45, s.len / 2).setTranslation(s.x, s.y + 0.35, s.z).setRotation(quat(s.yaw))),
    ...EDGE.posts.map((p) => r.ColliderDesc.cylinder(0.55, 0.1).setTranslation(p.x, p.y + 0.5, p.z)),
    ...EDGE.stones.map((s) => r.ColliderDesc.cuboid(0.3, 0.22, s.len / 2).setTranslation(s.x, s.y + 0.1, s.z).setRotation(quat(s.yaw))),
    ...TERRACES.map((s) => r.ColliderDesc.cuboid(0.3, 0.3, s.len / 2).setTranslation(s.x, s.y + 0.18, s.z).setRotation(quat(s.yaw))),
  ], []);
  return <primitive object={group} />;
}

/** Flower drifts: thick along the lower trail's edges, scattered over the orchard meadows. */
const kettleDrifts = (): Drift[] => {
  const list: Drift[] = [];
  for (let i = 4; i < TRAIL.length * 0.52; i += 4) for (const side of [-1, 1]) {
    if (hash(i, side + 3) < 0.4) continue;
    const p = TRAIL[i], o = outward(i), off = side * (p.half + 1.4 + hash(i, side + 5) * 2.5);
    list.push({ x: p.x + o.x * off, z: p.z + o.z * off, r: 1.2 + hash(i, 7) * 1.2 });
  }
  for (let i = 0; i < 90; i++) {
    const b = beside(0.02 + hash(i, 11) * 0.22, (hash(i, 12) - 0.3) * 50);
    list.push({ x: b.x, z: b.z, r: 1.5 + hash(i, 13) * 2 });
  }
  return list;
};
const offRoad = (x: number, z: number) => { const t = trailAt(x, z); return t.d > t.half + 2.5; };
const flowerOk = (x: number, z: number) => { const t = trailAt(x, z); return t.d > t.half + 0.6 && kettleGround.height(x, z) < 105; };

export function KettleRegion() {
  const drifts = useMemo(kettleDrifts, []);
  const pines = useMemo(() => kettleTrees().filter((t) => t.kind === "pine"), []);
  const apples = useMemo(() => kettleTrees().filter((t) => t.kind === "apple"), []);
  const rocks = useMemo(kettleRocks, []);
  const blossoms = useMemo(() => kettleTrees().filter((t) => t.kind === "blossom"), []);
  // trunks near the trail are solid; the far forest is scenery
  const nearTrail = useMemo(() => (p: { x: number; z: number }) => trailAt(p.x, p.z).d < 12, []);
  useEffect(() => {
    live.safePoint = safePointNear;
    live.obstacles = true;
    return () => { live.obstacles = false; };
  }, []);
  return (
    <>
      <Terrain />
      <Grass />
      <Pines trees={pines} collide={nearTrail} />
      <BlossomTrees trees={apples} kind="apple" />
      <BlossomTrees trees={blossoms} kind="pink" />
      <Edge />
      <Rocks list={rocks} free={offRoad} />
      <Flowers drifts={drifts} ok={flowerOk} />
      <KettlePlaces />
      <KettleObstacles />
      <CloudSea />
      <Snow />
      <Drifts />
      <KettleBeats />
    </>
  );
}
