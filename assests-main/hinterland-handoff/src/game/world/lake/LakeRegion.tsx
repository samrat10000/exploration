// Lake of Islands, assembled (J7): terrain, grass, the water, nine islands (a small house, pines, a jetty, a flagpole) and the
// post round. Boat mode from the beach slipway; stop beside an island's jetty and hold E to hand over the post: the flag goes up.
// All nine and the lake has its news.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash } from "../../../utils/noise";
import { audio } from "../../audio/audio";
import { M, add, bakeStatic, box, cyl } from "../../art/kit";
import { input } from "../../vehicle/input";
import { Grass } from "../Grass";
import { height, type Prop } from "../height";
import { buildHouse } from "../props/house";
import { Terrain } from "../Terrain";
import { Pines } from "../Vegetation";
import { waterMaterial } from "../Water";
import { ISLANDS, WL, jettyOf, lakeSafePoint, type Island } from "./lake";

function buildIsland(i: Island) {
  const g = new Group(), h = buildHouse({ seed: 90 + i.id, w: 3.4, d: 3, h: 2.1, walls: i.id % 2 ? "stone" : undefined, shutter: i.flag });
  h.scale.setScalar(0.85);
  const jy = hash(i.id, 5) * 6.28;
  const hx = Math.cos(jy) * i.r * 0.25, hz = Math.sin(jy) * i.r * 0.25;
  const hm = bakeStatic(h); hm.position.set(hx, 0, hz); hm.rotation.y = jy + Math.PI; g.add(hm);
  g.userData.house = { x: hx, z: hz };
  return g;
}

/** A jetty: planks out over the water on posts, ending at the hand-over point. */
function buildJetty() {
  const g = new Group(), tones = ["#7A5E40", "#86674A", "#6E5439"];
  for (let k = 0; k < 9; k++) add(g, box(2.0, 0.08, 0.42), M(tones[k % 3], 0.9), [0, 0.12, k * 0.5 - 2]);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) add(g, cyl(0.07, 0.09, 1.6, 6), M("#5A4632", 0.95), [sx * 0.95, -0.5, k * 1.8 - 1.9]);
  return g;
}

function Flag({ island, raise }: { island: Island; raise: () => number }) {
  const { pole, cloth, mat } = useMemo(() => {
    const pole = new Group();
    add(pole, cyl(0.045, 0.06, 5, 6), M("#6A5A48", 0.9), [0, 2.5, 0]);
    const mat = new MeshStandardMaterial({ color: island.flag, roughness: 0.8, side: 2 });
    const cloth = new Mesh(new PlaneGeometry(1.5, 0.9, 6, 1), mat); cloth.position.set(0.8, 0.5, 0); cloth.castShadow = false;
    pole.add(cloth);
    return { pole, cloth, mat };
  }, [island]);
  useFrame(() => {
    const k = raise(), t = live.clock;
    cloth.position.y = 0.6 + k * 3.7; cloth.visible = k > 0.001;
    const a = cloth.geometry.attributes.position;
    for (let v = 0; v < a.count; v++) a.setZ(v, Math.sin(t * 3 + a.getX(v) * 3 + island.id) * 0.1 * (a.getX(v) + 0.75));
    a.needsUpdate = true;
  });
  void mat;
  return <primitive object={pole} />;
}

function Beats({ done }: { done: React.MutableRefObject<number[]> }) {
  const st = useMemo(() => ({ said: new Set<string>(), hold: 0, endT: -1 }), []);
  useEffect(() => { live.safePoint = lakeSafePoint; live.obstacles = false; live.lake.done = ISLANDS.map(() => false); live.lake.prompt = false; }, []);
  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, l = live.lake, boat = live.vehicle === "boat" && s.phase === "play", journey = s.mode === "journey" && s.journey === "islands";
    const say = (k: string, text: string, sec = 6) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = sec; } };
    if (s.phase === "play" && journey) {
      if (live.vehicle === "rover" && car.z > 150) say("launch", "Drive onto the slipway and hold T to float the Rover. There's post to deliver");
      if (boat) say("sail", "Nine islands. Stop beside a jetty and hold E to hand over the post");
    }
    l.prompt = false; l.target = -1;
    if (boat) {
      ISLANDS.forEach((i) => { const j = jettyOf(i); if (!l.done[i.id] && Math.hypot(car.x - j.x, car.z - j.z) < 9 && Math.abs(car.speed) < 1.6) l.target = i.id; });
      if (l.target >= 0) { l.prompt = true; st.hold = input.action ? st.hold + dt : 0; l.hold = Math.min(1, st.hold / 1.0); } else { st.hold = 0; l.hold = 0; }
      if (st.hold >= 1 && l.target >= 0) {
        st.hold = 0; const i = ISLANDS[l.target]; l.done[i.id] = true; done.current[i.id] = live.clock;
        const j = jettyOf(i); audio.bell(j.x, 3, j.z);
        useStore.setState({ label: { text: i.line, x: j.x, y: height(j.x, j.z) + 3.2, z: j.z } });
        setTimeout(() => { if (useStore.getState().label?.text === i.line) useStore.setState({ label: null }); }, 4500 + i.line.length * 60);
        const n = l.done.filter(Boolean).length;
        if (n < 9) { live.note.text = `${i.name} has its post. ${n} of 9`; live.note.t = 4; if (s.mode === "journey") s.setProgress(n / 9); }
        else if (journey && st.endT < 0) { st.endT = 0; useStore.setState({ cinema: true }); live.moment = { x: i.x, y: WL + 8, z: i.z, t: 0, dur: 6 }; }
      }
    }
    if (st.endT >= 0) { st.endT += dt; if (st.endT > 7 && s.phase === "play") { s.setExtra("endingLine", "The post is early for once."); s.finishJourney(); st.endT = -2; } }
  });
  return null;
}

export function LakeRegion() {
  const water = useMemo(() => waterMaterial({ calm: 0.9 }), []);
  const isles = useMemo(() => ISLANDS.map(buildIsland), []);
  const jetty = useMemo(() => bakeStatic(buildJetty()), []);
  const done = useMemo(() => ({ current: ISLANDS.map(() => -1) as number[] }), []);
  const trees = useMemo<Prop[]>(() => ISLANDS.flatMap((i) => Array.from({ length: 5 }, (_, k) => { const a = hash(i.id, k + 20) * 6.28, d = i.r * (0.35 + hash(i.id, k + 30) * 0.3), x = i.x + Math.cos(a) * d, z = i.z + Math.sin(a) * d; return { x, y: height(x, z), z, s: 0.6 + hash(i.id, k + 40) * 0.6 }; })), []);
  useEffect(() => () => water.dispose(), [water]);
  return (
    <>
      <Terrain />
      <Grass />
      <Pines trees={trees} collide={() => false} />
      <mesh material={water} position-y={WL} rotation-x={-Math.PI / 2}><planeGeometry args={[900, 900, 1, 1]} /></mesh>
      {ISLANDS.map((i, k) => {
        const j = jettyOf(i), h = isles[k].userData.house as { x: number; z: number }, y = height(i.x, i.z);
        return (
          <group key={i.id}>
            <primitive object={isles[k]} position={[i.x, y, i.z]} />
            <primitive object={jetty.clone()} position={[j.x, WL + 0.1, j.z]} rotation-y={Math.atan2(i.x - j.x, i.z - j.z)} />
            <group position={[i.x + h.x * 1.6, y + 0.1, i.z + h.z * 1.6 + 2]}><Flag island={i} raise={() => (done.current[i.id] < 0 ? 0 : Math.min(1, (live.clock - done.current[i.id]) / 3))} /></group>
          </group>
        );
      })}
      <Beats done={done} />
    </>
  );
}
