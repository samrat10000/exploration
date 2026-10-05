// The old forest, assembled (J6 Firefly Road): terrain, grass, dark pines, the guiding fireflies, an owl and a deer by the road,
// and the ruined observatory in the glade. Stop in the glade and the sky gives you a meteor shower.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, ConeGeometry, Group, Points, ShaderMaterial, SphereGeometry } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash, smooth } from "../../../utils/noise";
import { audio } from "../../audio/audio";
import { LINES, speak, type Traveler } from "../../life/travelers";
import { M, VC, add, bakeStatic, box, cyl, glow, halo } from "../../art/kit";
import { U } from "../../shaders";
import { useFixedColliders } from "../colliders";
import { Grass } from "../Grass";
import { height } from "../height";
import { rockGeo } from "../props/rocks";
import { Rocks } from "../Rocks";
import { Terrain } from "../Terrain";
import { Pines } from "../Vegetation";
import { GLADE, Z_GLADE, Z_START, forestSafePoint, forestTrees, roadX } from "./forest";

function buildOwl() {
  const g = new Group(), body = M("#7A6A55", 0.9), face = M("#C9B99B", 0.9);
  add(g, new SphereGeometry(0.28, 12, 10).scale(1, 1.3, 0.9), body, [0, 0.45, 0]);
  const head = new Group(); head.position.set(0, 0.85, 0); g.add(head);
  add(head, new SphereGeometry(0.2, 12, 10), body, [0, 0, 0]);
  add(head, new SphereGeometry(0.16, 10, 8).scale(1, 1, 0.5), face, [0, -0.02, -0.12]);
  for (const sx of [-1, 1]) { add(head, new SphereGeometry(0.06, 8, 6), glow("#FFC247", 1.4), [sx * 0.075, 0.03, -0.17]); add(head, new ConeGeometry(0.05, 0.16, 5), body, [sx * 0.12, 0.2, 0], [0, 0, -sx * 0.3]); }
  add(head, new ConeGeometry(0.03, 0.07, 4), M("#8A6A3A", 0.7), [0, -0.04, -0.2], [-Math.PI / 2, 0, 0]);
  add(g, box(0.5, 0.5, 0.5), M("#5A4632", 0.95), [0, 0.0, 0.05]);
  g.userData.head = head;
  return g;
}

function buildDeer() {
  const g = new Group(), fur = M("#9A7550", 0.9), pale = M("#D9C9A8", 0.9);
  add(g, new SphereGeometry(0.55, 12, 8).scale(1.5, 0.8, 0.8), fur, [0, 1.15, 0]);
  const neck = new Group(); neck.position.set(0, 1.35, -0.7); g.add(neck);
  add(neck, cyl(0.12, 0.18, 0.7, 8), fur, [0, 0.3, -0.12], [-0.5, 0, 0]);
  const head = new Group(); head.position.set(0, 0.7, -0.35); neck.add(head);
  add(head, new SphereGeometry(0.17, 10, 8).scale(1, 0.9, 1.4), fur, [0, 0, 0]);
  add(head, new ConeGeometry(0.07, 0.16, 6), pale, [0, -0.03, -0.26], [-Math.PI / 2, 0, 0]);
  for (const sx of [-1, 1]) { add(head, new SphereGeometry(0.04, 6, 5), M("#1A1612", 0.3), [sx * 0.1, 0.06, -0.1]); add(head, new ConeGeometry(0.06, 0.2, 5), fur, [sx * 0.14, 0.2, 0.02], [0, 0, -sx * 0.5]); }
  for (const [x, z] of [[-0.25, -0.5], [0.25, -0.5], [-0.25, 0.5], [0.25, 0.5]]) add(g, cyl(0.05, 0.035, 1.0, 6), pale, [x, 0.5, z]);
  add(g, new SphereGeometry(0.1, 8, 6), pale, [0, 1.2, 0.8]);
  g.userData.neck = neck;
  return g;
}

/** The ruined observatory: a broken ring wall, the ribs of a dome, a telescope on its pillar, fallen stones. */
function buildObservatory() {
  const g = new Group(), stone = VC(0.95), wall = M("#7C776B", 0.95), R = 7;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.4) continue; // the doorway
    const h = 1.2 + hash(i, 3) * 3.4 * (i % 5 === 0 ? 0.3 : 1);
    add(g, box(2.4, h, 0.9), wall, [Math.cos(a) * R, h / 2, Math.sin(a) * R], [0, -a + Math.PI / 2, 0]);
  }
  for (let k = 0; k < 5; k++) { // dome ribs, the east half still standing
    const a0 = -Math.PI / 2 + k * 0.4;
    for (let j = 0; j < 12; j++) { const e = (j / 12) * 1.25; add(g, box(0.25, 0.25, 0.7), M("#5E5A52", 0.9), [Math.cos(a0) * Math.cos(e) * (R - 0.3), 3.6 + Math.sin(e) * 3.6, Math.sin(a0) * Math.cos(e) * (R - 0.3)], [0, -a0, e * 0.9]); }
  }
  add(g, cyl(0.5, 0.7, 1.6, 10), M("#8A8578", 0.95), [0, 0.8, 0]);
  add(g, cyl(0.22, 0.26, 3.4, 10), M("#B8B2A4", 0.4, 0.7), [0.3, 2.9, -0.5], [0.5, 0.2, 0.3]);
  add(g, box(0.5, 0.5, 0.5), glow("#9FD0FF", 0.6), [0.3, 4.3, -1.3]);
  for (let i = 0; i < 12; i++) add(g, rockGeo(700 + i, 0.4 + hash(i, 1) * 0.5, 0.3, 0.45, 1), stone, [Math.cos(i * 1.7) * (R + 1.5 + hash(i, 2) * 4), 0.1, Math.sin(i * 1.7) * (R + 1.5 + hash(i, 2) * 4)]);
  halo(g, [0.3, 4.3, -1.3], "#9FD0FF", 1.6);
  return g;
}

function Guide() {
  const k = useMemo(() => {
    const N = 44, p = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) seed[i] = hash(i, 1) * 50;
    const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(p, 3)); g.setAttribute("aSeed", new BufferAttribute(seed, 1)); g.setAttribute("aB", new BufferAttribute(new Float32Array(N), 1));
    const pts = new Points(g, new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uTime: U.uTime },
      vertexShader: "attribute float aSeed, aB; uniform float uTime; varying float vB; void main(){ vB = aB*(0.55 + 0.45*sin(uTime*(1.5 + fract(aSeed)*2.0) + aSeed*7.0)); vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = (2.5 + vB*5.0)*260.0/max(1.0,-mv.z); gl_Position = projectionMatrix*mv; }",
      fragmentShader: "varying float vB; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.85,1.0,0.45), vB*smoothstep(0.5, 0.0, d)); }" }));
    pts.frustumCulled = false;
    return { pts, p, N };
  }, []);
  useFrame(() => {
    const car = live.car, t = live.clock, STEP = 2.6, zq = Math.floor(car.z / STEP) * STEP, a = k.pts.geometry.attributes;
    const on = useStore.getState().phase === "play" && car.z > Z_GLADE + 12 ? 1 : 0;
    for (let i = 0; i < k.N; i++) {
      const z = zq - 7 - i * STEP, side = hash(i + Math.floor(zq / STEP), 5) < 0.5 ? -1 : 1, off = side * (1.6 + hash(i + Math.floor(zq / STEP), 6) * 2.4), x = roadX(z) + off;
      k.p[i * 3] = x + Math.sin(t * 0.6 + i) * 0.5; k.p[i * 3 + 1] = height(x, z) + 0.7 + Math.sin(t * 0.9 + i * 1.7) * 0.35; k.p[i * 3 + 2] = z + Math.cos(t * 0.5 + i) * 0.4;
      (a.aB as BufferAttribute).setX(i, on * (1 - smooth(10, k.N * STEP, i * STEP)) * (0.35 + 0.65 * smooth(0, 14, i * STEP)));
    }
    (a.position as BufferAttribute).needsUpdate = true; (a.aB as BufferAttribute).needsUpdate = true;
  });
  return <primitive object={k.pts} />;
}

const OWL = { x: roadX(-120) + 7, z: -120 }, DEER = { x: roadX(-68) - 9, z: -68 };

function Beats() {
  const owl = useMemo(buildOwl, []), deer = useMemo(buildDeer, []);
  const st = useMemo(() => ({ said: new Set<string>(), hoot: 3, still: 0, ending: 0, deerAway: 0, deerT: 0 }), []);
  const list = useMemo<Traveler[]>(() => [
    { id: "owl", x: OWL.x, y: height(OWL.x, OWL.z) + 2.1, z: OWL.z, lines: LINES.owl },
    { id: "deer", x: DEER.x, y: height(DEER.x, DEER.z) + 2.4, z: DEER.z, lines: LINES.deer },
  ], []);
  useEffect(() => {
    live.safePoint = forestSafePoint; live.obstacles = false; live.shower = 0;
    owl.position.set(OWL.x, height(OWL.x, OWL.z) + 0.55, OWL.z);
    deer.position.set(DEER.x, height(DEER.x, DEER.z), DEER.z);
    return () => { live.shower = 0; };
  }, [owl, deer]);
  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, t = live.clock, journey = s.mode === "journey" && s.journey === "firefly", playing = s.phase === "play";
    const say = (k: string, text: string) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = 6; } };
    if (playing && journey && car.z > Z_START - 20) say("go", "The small lights know the way");
    // the owl turns its head to follow you, and hoots now and then when you stop near
    const od = Math.hypot(car.x - OWL.x, car.z - OWL.z), head = owl.userData.head as Group;
    const want = od < 22 ? Math.atan2(car.x - OWL.x, car.z - OWL.z) + Math.PI - owl.rotation.y : 0;
    head.rotation.y += Math.max(-1.5, Math.min(1.5, want - head.rotation.y)) * Math.min(1, dt * 3);
    owl.rotation.y = Math.PI / 2 - 0.3;
    st.hoot -= dt;
    if (playing && od < 12 && Math.abs(car.speed) < 1 && st.hoot <= 0) { st.hoot = 7 + Math.random() * 5; audio.hoot(); }
    // the deer stands at the forest's edge; stopped nearby for a moment, it wanders off between the trees
    const dd = Math.hypot(car.x - DEER.x, car.z - DEER.z);
    (deer.userData.neck as Group).rotation.x = Math.sin(t * 0.7) * 0.08 + (st.deerAway > 0 ? 0.25 : -0.12 * smooth(30, 8, dd));
    deer.rotation.y = st.deerAway > 0 ? -Math.PI / 2 + 0.4 : Math.atan2(car.x - DEER.x, car.z - DEER.z) + Math.PI;
    if (playing && dd < 9 && Math.abs(car.speed) < 0.8) st.deerT += dt; else if (dd > 14) st.deerT = Math.max(0, st.deerT - dt);
    if (st.deerT > 4.5 && st.deerAway === 0) st.deerAway = 0.001;
    if (st.deerAway > 0 && st.deerAway < 9) {
      st.deerAway += dt; deer.position.x -= 1.1 * dt; deer.position.y = height(deer.position.x, deer.position.z); deer.position.z += 0.1 * dt;
      deer.visible = st.deerAway < 8.5;
    }
    // speech: one line per stop, from the owl and the deer
    const label = playing && !s.sitting && !s.photo ? speak(list, car, dt, t) : null;
    if (label?.text !== s.label?.text) useStore.setState({ label });
    // the glade: stop in it and the sky answers
    const gd = Math.hypot(car.x - GLADE.x, car.z - GLADE.z);
    if (playing && journey && gd < GLADE.r * 0.8 && Math.abs(car.speed) < 0.6) st.still += dt; else st.still = 0;
    if (st.still > 2.5 && st.ending === 0) { st.ending = 0.001; useStore.setState({ cinema: true }); live.moment = { x: car.x, y: car.y + 60, z: car.z - 20, t: 0, dur: 12 }; live.note.text = "Look up"; live.note.t = 5; }
    if (st.ending > 0) {
      st.ending += dt; live.shower = smooth(0, 4, st.ending) * (1 - smooth(14, 17, st.ending));
      if (st.ending > 15 && s.phase === "play") { s.setExtra("endingLine", "A meteor shower, for the ones who stopped to look."); s.finishJourney(); live.shower = 0; }
    }
  });
  return <><primitive object={owl} /><primitive object={deer} /></>;
}

export function ForestRegion() {
  const trees = useMemo(forestTrees, []);
  const obs = useMemo(() => bakeStatic(buildObservatory()), []);
  const rocks = useMemo(() => Array.from({ length: 160 }, (_, i) => { const z = Z_START - hash(i, 1) * (Z_START - Z_GLADE + 20), x = roadX(z) + (hash(i, 2) < 0.5 ? -1 : 1) * (6 + hash(i, 3) * 40); return { x, y: height(x, z), z, s: 0.5 + hash(i, 4) * 1.1 }; }), []);
  useFixedColliders((r) => Array.from({ length: 20 }, (_, i) => i).filter((i) => Math.abs((i / 20) * Math.PI * 2 - Math.PI / 2) >= 0.4).map((i) => {
    const a = (i / 20) * Math.PI * 2;
    return r.ColliderDesc.cuboid(1.2, 1.2, 0.45).setTranslation(GLADE.x + Math.cos(a) * 7, height(GLADE.x, GLADE.z) + 1, GLADE.z + Math.sin(a) * 7).setRotation({ x: 0, y: Math.sin((-a + Math.PI / 2) / 2), z: 0, w: Math.cos((-a + Math.PI / 2) / 2) });
  }), []);
  return (
    <>
      <Terrain />
      <Grass />
      <Pines trees={trees} collide={(p) => Math.abs(p.x - roadX(p.z)) < 22} />
      <Rocks list={rocks} free={(x, z) => Math.abs(x - roadX(z)) > 5} />
      <primitive object={obs} position={[GLADE.x, height(GLADE.x, GLADE.z), GLADE.z]} />
      <Guide />
      <Beats />
    </>
  );
}
