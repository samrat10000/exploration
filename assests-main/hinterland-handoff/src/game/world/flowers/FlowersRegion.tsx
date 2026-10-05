// Valley of Flowers, assembled (J15): terrain, grass, flower drifts along the path, the meltwater stream (ford + arched bridge), pines
// and boulders, prayer flags between two cairns at the start and across the bridge, a mani wall, the chorten with eight flag lines,
// the lake and a homestay with a tent and string lights. Stop at the chorten and the journey ends: "Lake of the sky."
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, CircleGeometry, ConeGeometry, Float32BufferAttribute, Group, Mesh, SphereGeometry, Vector3 } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash } from "../../../utils/noise";
import { buildCampfire } from "../../exploration/campfire/CampfireModel";
import { M, VC, add, bakeStatic, box, cyl, glow } from "../../art/kit";
import { Flowers, type Drift } from "../Flowers";
import { Grass } from "../Grass";
import { height, type Prop } from "../height";
import { buildHouse, flagLine } from "../props/house";
import { rockGeo } from "../props/rocks";
import { Rocks } from "../Rocks";
import { Terrain } from "../Terrain";
import { Pines } from "../Vegetation";
import { waterMaterial } from "../Water";
import { BRIDGE_Z, LAKE, floorY, flowersSafePoint, flowersTerrain, pathX, streamX, vcx, waterY } from "./flowers";

const STUPA = { x: LAKE.x + 34, z: LAKE.z + 40 };
const sy = (x: number, z: number) => height(x, z);

function buildStupa() {
  const g = new Group(), white = M("#F2EFE6", 0.85), gold = M("#D9B24A", 0.4, 0.5);
  for (let i = 0; i < 3; i++) add(g, box(7 - i * 1.2, 0.7, 7 - i * 1.2), white, [0, 0.35 + i * 0.7, 0]);
  add(g, new SphereGeometry(2.8, 20, 12, 0, 6.29, 0, 1.7), white, [0, 2.1, 0]);
  add(g, box(1.4, 1.2, 1.4), gold, [0, 5.0, 0]);
  for (let k = 0; k < 6; k++) add(g, cyl(0.9 - k * 0.13, 1.0 - k * 0.13, 0.3, 14), gold, [0, 6.1 + k * 0.32, 0]);
  add(g, new ConeGeometry(0.28, 1.1, 10), gold, [0, 8.6, 0]);
  return g;
}
function buildMani() {
  const g = new Group();
  for (let i = 0; i < 26; i++) add(g, box(0.9 + hash(i, 1) * 0.5, 0.6 + hash(i, 2) * 0.4, 0.5), M(i % 3 ? "#EDE8DC" : "#D8D2C2", 0.9), [i * 1.1 - 14, 0.4, 0], [0, (hash(i, 3) - 0.5) * 0.1, 0]);
  add(g, box(28, 0.3, 0.7), M("#8A8578", 0.95), [-1, 0.05, 0]);
  return g;
}
function buildBridge() {
  const g = new Group(), stone = VC(0.95);
  add(g, box(5.4, 0.6, 20), M("#8A8578", 0.95), [0, 0.5, 0]);
  for (const sx of [-1, 1]) for (let i = 0; i < 14; i++) add(g, rockGeo(300 + i + (sx > 0 ? 30 : 0), 0.34, 0.25, 0.4, 1, 0.5), stone, [sx * 2.6, 1.0, -9.5 + i * 1.45]);
  for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; add(g, box(4.6, 1.2, 1.5), M("#838074", 0.95), [0, -0.5 - Math.sin(a) * 1.3, Math.cos(a) * 8.5]); }
  return g;
}
function ribbon(zA: number, zB: number, x: (z: number) => number, half: number, y: (z: number) => number) {
  const pos: number[] = [], idx: number[] = [];
  let r = 0;
  for (let z = zA; z > zB; z -= 4) { pos.push(x(z) - half, y(z), z, x(z) + half, y(z), z); if (r) { const i = (r - 1) * 2; idx.push(i, i + 1, i + 2, i + 2, i + 1, i + 3); } r++; }
  const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function Beats() {
  const st = useMemo(() => ({ said: new Set<string>(), still: 0, endT: -1 }), []);
  useEffect(() => { live.safePoint = flowersSafePoint; live.obstacles = false; }, []);
  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, playing = s.phase === "play", journey = s.mode === "journey" && s.journey === "flowers";
    const say = (k: string, text: string) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = 7; } };
    if (playing && journey) {
      if (car.z > 590) say("pass", "Snow on the pass. Tyres press real ruts");
      if (car.z < 380 && car.z > 330) say("open", "The valley opens");
      if (Math.abs(car.z - BRIDGE_Z) < 30) say("bridge", "An old stone bridge, hung with flags");
      if (car.z < -380) say("mani", "Prayer stones, and a long line of flags");
      // the valley opens: a slow look across the flowers
      if (car.z < 360 && !st.said.has("look")) { st.said.add("look"); live.moment = { x: car.x - 40, y: car.y + 10, z: car.z - 90, t: 0, dur: 5 }; useStore.setState({ cinema: true }); setTimeout(() => useStore.setState({ cinema: false }), 5200); }
      const d = Math.hypot(car.x - STUPA.x, car.z - STUPA.z);
      if (d < 28 && Math.abs(car.speed) < 0.6) st.still += dt; else st.still = 0;
      if (st.still > 2 && st.endT < 0) { st.endT = 0; useStore.setState({ cinema: true }); live.moment = { x: STUPA.x, y: sy(STUPA.x, STUPA.z) + 6, z: STUPA.z, t: 0, dur: 7 }; }
    }
    if (st.endT >= 0) { st.endT += dt; if (st.endT > 7 && playing) { s.setExtra("endingLine", "The flags have been saying the same thing in the wind for a hundred years."); s.finishJourney(); st.endT = -2; } }
  });
  return null;
}

export function FlowersRegion() {
  const water = useMemo(() => waterMaterial({ calm: 1 }), []);
  const stream = useMemo(() => ribbon(640, -438, streamX, 3.6, (z) => waterY(z)), []);
  const stupa = useMemo(() => bakeStatic(buildStupa()), []);
  const mani = useMemo(() => bakeStatic(buildMani()), []);
  const bridge = useMemo(() => bakeStatic(buildBridge()), []);
  const flags = useMemo(() => {
    const g = new Group(), pole = (x: number, z: number, h = 3) => { add(g, cyl(0.06, 0.08, h, 6), M("#5A4632", 0.9), [x, sy(x, z) + h / 2, z]); return new Vector3(x, sy(x, z) + h - 0.2, z); };
    // two cairns with a line between them at the start
    const a = pole(pathX(612) - 7, 612), b = pole(pathX(612) + 7, 612);
    for (const p of [a, b]) for (let i = 0; i < 5; i++) add(g, rockGeo(40 + i, 0.5 - i * 0.07, 0.4, 0.5, 1, 0.6), VC(0.95), [p.x + (i - 2) * 0.1, sy(p.x, p.z) + i * 0.3 - (p.y - sy(p.x, p.z)) + 0.2 + (p.y - sy(p.x, p.z)) * 0 , p.z]);
    flagLine(g, a, b, 12, 0.9);
    // across the bridge
    const c = pole(pathX(BRIDGE_Z) - 3.3, BRIDGE_Z, 3.4), d = pole(pathX(BRIDGE_Z) + 3.3, BRIDGE_Z, 3.4);
    flagLine(g, c, d, 8, 0.6);
    // eight lines radiating from the chorten
    const top = new Vector3(STUPA.x, sy(STUPA.x, STUPA.z) + 8.4, STUPA.z);
    for (let k = 0; k < 8; k++) { const an = (k / 8) * 6.28, x = STUPA.x + Math.cos(an) * 22, z = STUPA.z + Math.sin(an) * 22; flagLine(g, top, pole(x, z, 3), 9, 1.2); }
    return g;
  }, []);
  const home = useMemo(() => {
    const g = new Group(), h = bakeStatic(buildHouse({ seed: 31, w: 5, d: 4, h: 2.5, walls: "stone", flags: true })), x = LAKE.x - 38, z = LAKE.z + 62;
    h.position.set(x, sy(x, z), z); h.rotation.y = 0.6; g.add(h);
    const tent = new Mesh(new ConeGeometry(2.2, 2.4, 4), M("#C9643B", 0.85)); tent.position.set(x + 9, sy(x + 9, z + 3) + 1.2, z + 3); tent.rotation.y = 0.8; g.add(tent);
    const fire = buildCampfire(); fire.position.set(x + 6, sy(x + 6, z + 8), z + 8); g.add(fire);
    for (let i = 0; i < 9; i++) add(g, new SphereGeometry(0.08, 8, 6), glow("#FFC874", 0.9), [x - 4 + i * 1.1, sy(x, z) + 3.1 - Math.sin((i / 8) * Math.PI) * 0.4, z + 4]);
    return g;
  }, []);
  const manyPos = useMemo(() => { const z = -382; return { x: pathX(z) + 7, z, yaw: Math.PI / 2 }; }, []);
  const drifts = useMemo<Drift[]>(() => {
    const out: Drift[] = [];
    for (let z = 400; z > -430; z -= 7) for (const side of [-1, 1]) {
      if (hash(z, side + 9) < 0.35) continue;
      const x = pathX(z) + side * (5 + hash(z, side + 3) * 38);
      out.push({ x, z: z + hash(z, 4) * 6, r: 2 + hash(z, 5) * 3.5 });
    }
    return out;
  }, []);
  const flowerOk = useMemo(() => (x: number, z: number) => Math.abs(x - pathX(z)) > 3.2 && Math.abs(x - streamX(z)) > 4.8 && z < 420 && flowersTerrain(x, z) < 108 && Math.hypot(x - LAKE.x, z - LAKE.z) > 52, []);
  const pines = useMemo<Prop[]>(() => Array.from({ length: 700 }, (_, i) => { const z = 560 - hash(i, 1) * 1000, w = 90 + hash(i, 2) * 80, x = vcx(z) + (hash(i, 3) < 0.5 ? -1 : 1) * w; return { x, y: sy(x, z), z, s: 0.8 + hash(i, 4) }; }).filter((p) => p.y < 110 && Math.hypot(p.x - LAKE.x, p.z - LAKE.z) > 80), []);
  const rocks = useMemo<Prop[]>(() => Array.from({ length: 180 }, (_, i) => { const z = 600 - hash(i, 1) * 1100, x = pathX(z) + (hash(i, 2) - 0.5) * 120; return { x, y: sy(x, z), z, s: 0.5 + hash(i, 3) * 1.4 }; }).filter((r) => Math.abs(r.x - pathX(r.z)) > 5 && Math.abs(r.x - streamX(r.z)) > 6 && Math.hypot(r.x - LAKE.x, r.z - LAKE.z) > 60), []);
  const lake = useMemo(() => new CircleGeometry(70, 48).rotateX(-Math.PI / 2), []);
  useEffect(() => () => water.dispose(), [water]);
  return (
    <>
      <Terrain />
      <Grass />
      <Flowers drifts={drifts} ok={flowerOk} />
      <Pines trees={pines} collide={() => false} />
      <Rocks list={rocks} />
      <mesh geometry={stream} material={water} />
      <mesh geometry={lake} material={water} position={[LAKE.x, LAKE.y, LAKE.z]} />
      <primitive object={bridge} position={[pathX(BRIDGE_Z), floorY(BRIDGE_Z) + 0.3, BRIDGE_Z]} />
      <primitive object={mani} position={[manyPos.x, sy(manyPos.x, manyPos.z), manyPos.z]} rotation-y={manyPos.yaw} />
      <primitive object={stupa} position={[STUPA.x, sy(STUPA.x, STUPA.z), STUPA.z]} />
      <primitive object={flags} />
      <primitive object={home} />
      <Beats />
    </>
  );
}
