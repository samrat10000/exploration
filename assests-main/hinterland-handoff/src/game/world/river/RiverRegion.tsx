// Lantern River, assembled: terrain, grass, the water, shrines, an old stone arch, rapids foam, jumping fish, a lake
// village and the lanterns. Beats: stop beside a shrine in the boat and hold E to set a lantern (it floats off
// downstream and keeps glowing). Five lit and the lake reached: the village sets hundreds of lanterns on the water.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ConeGeometry, Group, Mesh, MeshBasicMaterial, Points, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash } from "../../../utils/noise";
import { audio } from "../../audio/audio";
import { M, VC, add, bakeStatic, box, glow } from "../../art/kit";
import { input } from "../../vehicle/input";
import { U } from "../../shaders";
import { Grass } from "../Grass";
import { height, type Prop } from "../height";
import { rockGeo } from "../props/rocks";
import { buildHouse } from "../props/house";
import { Rocks } from "../Rocks";
import { Terrain } from "../Terrain";
import { waterMaterial } from "../Water";
import { ARCH_Z, RAPIDS, SHRINES, VILLAGE, WL, Z_END, Z_START, halfW, riverFlow, riverSafePoint, xc } from "./river";

const ndist = (a: number, b: number, c: number, d: number) => Math.hypot(a - c, b - d);

function buildShrine() {
  const g = new Group(), stone = VC(0.95), tile = M("#6B5A48", 0.85);
  add(g, box(1.7, 0.3, 1.7), M("#8A8578", 0.95), [0, 0.1, 0]);
  add(g, box(0.9, 1.2, 0.9), M("#7C776B", 0.95), [0, 0.85, 0]);
  add(g, box(0.5, 0.5, 0.06), glow("#FFC874", 0.35), [0, 0.95, 0.47]); // the niche the lantern will be set in
  add(g, new ConeGeometry(0.95, 0.7, 4), tile, [0, 1.8, 0], [0, Math.PI / 4, 0]);
  for (let i = 0; i < 5; i++) add(g, rockGeo(500 + i, 0.3, 0.2, 0.3, 1), stone, [Math.cos(i * 1.3) * 1.2, 0.1, Math.sin(i * 1.3) * 1.2]);
  return g;
}

function buildArch() {
  const g = new Group(), stone = M("#8A8578", 0.95), span = 14;
  for (let k = 0; k <= 16; k++) {
    const a = (k / 16) * Math.PI, x = Math.cos(a) * span, y = Math.sin(a) * 11 + 4;
    add(g, box(1.7, 1.8, 6), stone, [x, y, 0], [0, 0, a + Math.PI / 2]);
  }
  for (const sx of [-1, 1]) add(g, box(3, 8, 6.4), M("#7C776B", 0.95), [sx * (span + 0.4), 1.2, 0]);
  add(g, box(2 * span + 5, 0.7, 6.6), M("#8E897C", 0.95), [0, 15.3, 0]);
  return g;
}

function buildVillage() {
  const g = new Group();
  for (let i = 0; i < 7; i++) {
    const h = buildHouse({ seed: 60 + i, w: 4 + (i % 3) * 0.6, d: 3.4 + (i % 2) * 0.5, h: 2.3, walls: i % 3 === 0 ? "stone" : undefined, shutter: ["#B0473A", "#3E6FA8", "#C9A04A", "#5E7B5C"][i % 4], flags: i === 3 });
    const x = (i - 3) * 13, z = -4 - Math.abs(i - 3) * 2.6, yaw = Math.PI + (i - 3) * 0.12;
    const m = bakeStatic(h); m.position.set(x, 0, z); m.rotation.y = yaw; m.userData.local = { x, z };
    g.add(m);
  }
  return g;
}

/** Glowing paper lanterns drifting on the water: the five you set, then the village's hundreds. */
function useLanterns() {
  return useMemo(() => {
    const N = 460, pos = new Float32Array(N * 3), seed = new Float32Array(N), on = new Float32Array(N), size = new Float32Array(N);
    for (let i = 0; i < N; i++) { seed[i] = hash(i, 9) * 10; pos[i * 3 + 1] = -50; }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3)); g.setAttribute("aSeed", new BufferAttribute(seed, 1)); g.setAttribute("aOn", new BufferAttribute(on, 1)); g.setAttribute("aSize", new BufferAttribute(size, 1));
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uTime: U.uTime },
      vertexShader: "attribute float aSeed, aOn, aSize; uniform float uTime; varying float vA; void main(){ vec3 p = position; p.y += sin(uTime*1.3 + aSeed)*0.04; vA = aOn*(0.85 + 0.15*sin(uTime*3.0 + aSeed*7.0)); vec4 mv = modelViewMatrix*vec4(p,1.0); gl_PointSize = aSize*340.0/max(1.0,-mv.z); gl_Position = projectionMatrix*mv; }",
      fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(1.0, 0.62, 0.22)*(0.8 + a*1.2), a*vA); }",
    });
    const pts = new Points(g, mat); pts.frustumCulled = false;
    return { pts, pos, on, size, seed, N, used: 0, vel: new Float32Array(N * 3) };
  }, []);
}

function Beats({ lan, shrines }: { lan: ReturnType<typeof useLanterns>; shrines: Group[] }) {
  const st = useMemo(() => ({ said: new Set<string>(), hold: 0, show: -1, spawned: 0, fish: 5, fishT: 9, ending: false, fl: new Vector3() }), []);
  const fish = useMemo(() => { const m = new Mesh(new SphereGeometry(0.22, 8, 6).scale(1, 0.4, 2.2), new MeshBasicMaterial({ color: 0xC9D6DC })); m.visible = false; return m; }, []);
  const foam = useMemo(() => {
    const N = 260, p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const r = RAPIDS[i % 2], z = r.z1 + hash(i, 1) * (r.z0 - r.z1); p.set([xc(z) + (hash(i, 2) - 0.5) * 2 * halfW(z) * 0.8, WL + 0.05, z], i * 3); }
    const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(p, 3));
    const pts = new Points(g, new ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: "uniform float s; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = 5.0*220.0/max(1.0,-mv.z); gl_Position = projectionMatrix*mv; }", fragmentShader: "void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0), smoothstep(0.5, 0.1, d)*0.5); }", uniforms: { s: { value: 1 } } }));
    pts.frustumCulled = false;
    return pts;
  }, []);
  useEffect(() => { live.safePoint = riverSafePoint; live.obstacles = false; live.river.lit = [false, false, false, false, false]; live.river.prompt = false; }, []);

  const spawn = (x: number, z: number, big: boolean) => {
    const i = lan.used++ % lan.N;
    lan.pos[i * 3] = x; lan.pos[i * 3 + 1] = WL + 0.15; lan.pos[i * 3 + 2] = z; lan.size[i] = big ? 1.2 : 0.8; lan.on[i] = 0;
    return i;
  };
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), s = useStore.getState(), car = live.car, r = live.river, t = live.clock;
    const journey = s.mode === "journey" && s.journey === "lantern", boat = live.vehicle === "boat" && s.phase === "play";
    const say = (k: string, text: string, sec = 6) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = sec; } };
    if (s.phase === "play" && journey) {
      if (live.vehicle === "rover" && car.z > 120) say("launch", "Drive onto the slipway and hold T to float the Rover");
      if (boat) say("sail", "Follow the river downstream. Stop beside a shrine to set a lantern");
    }
    // shrines: stop beside one, hold E
    r.prompt = false; r.target = -1;
    if (boat) {
      SHRINES.forEach((sh) => { if (!r.lit[sh.id] && ndist(car.x, car.z, sh.water.x, sh.water.z) < 8 && Math.abs(car.speed) < 1.6) r.target = sh.id; });
      if (r.target >= 0) { r.prompt = true; st.hold = input.action ? st.hold + dt : 0; r.hold = Math.min(1, st.hold / 1.0); }
      else { st.hold = 0; r.hold = 0; }
      if (st.hold >= 1 && r.target >= 0) {
        st.hold = 0; const sh = SHRINES[r.target]; r.lit[sh.id] = true;
        const i = spawn(sh.water.x, sh.water.z, true); lan.on[i] = 1; audio.bell(sh.water.x, 2, sh.water.z);
        const n = r.lit.filter(Boolean).length; live.note.text = n < 5 ? `The lantern drifts off. ${n} of 5` : "The last lantern. The lake is waiting downstream"; live.note.t = 4;
      }
    }
    // lanterns drift with the current; the ones you set fade in as they leave your hand
    for (let i = 0; i < lan.used && i < lan.N; i++) {
      const x = lan.pos[i * 3], z = lan.pos[i * 3 + 2];
      if (lan.on[i] > 0 || lan.size[i] > 0) {
        riverFlow(x, z, st.fl);
        lan.pos[i * 3] += (st.fl.x * 0.7 + Math.sin(t * 0.3 + lan.seed[i]) * 0.05) * dt; lan.pos[i * 3 + 2] += st.fl.z * 0.7 * dt;
        lan.pos[i * 3 + 1] = WL + 0.12;
        if (lan.on[i] < 1 && lan.on[i] >= 0) lan.on[i] = Math.min(1, lan.on[i] + dt * 0.5);
      }
    }
    (lan.pts.geometry.attributes.position as BufferAttribute).needsUpdate = true; (lan.pts.geometry.attributes.aOn as BufferAttribute).needsUpdate = true; (lan.pts.geometry.attributes.aSize as BufferAttribute).needsUpdate = true;
    // shrines glow warm once lit
    shrines.forEach((g, i) => g.children.forEach((c) => { const m = c as Mesh; if (m.userData.niche) (m.material as MeshBasicMaterial).opacity = r.lit[i] ? 1 : 0.3; }));
    // the lake: five lit and arrived, the village sets hundreds of lanterns on the water
    const lit = r.lit.filter(Boolean).length;
    if (boat && journey && !st.ending && car.z < VILLAGE.z + 95) {
      if (lit >= 5) {
        st.ending = true; st.show = 0; useStore.setState({ cinema: true });
        live.moment = { x: VILLAGE.x, y: WL + 6, z: VILLAGE.z - 10, t: 0, dur: 9 };
      } else say("dark", `${5 - lit} shrine${5 - lit > 1 ? "s" : ""} upstream still dark. The river is easy to row back up`, 7);
    }
    if (st.ending) {
      st.show += dt;
      // 320 lanterns, a few every frame over about 8 s, scattered across the lake near the village
      while (st.spawned < Math.min(320, st.show * 40)) {
        const a = hash(st.spawned, 3) * 6.28, rr = Math.sqrt(hash(st.spawned, 4)) * 55, x = xc(-245) + Math.cos(a) * rr * 1.1, z = -245 + Math.sin(a) * rr * 0.7;
        const i = spawn(x, z, false); lan.on[i] = 0.001; st.spawned++;
      }
      if (st.show > 11 && s.phase === "play") { s.setExtra("endingLine", "The village sets hundreds of lanterns on the lake."); s.finishJourney(); }
    }
    // fish: one jumps every 6-14 s somewhere near you, a silver arc and gone
    st.fishT -= dt;
    if (st.fishT <= 0 && boat) { st.fishT = 6 + Math.random() * 8; st.fish = 0; fish.userData = { x: car.x + (Math.random() - 0.5) * 24, z: car.z - 6 - Math.random() * 18 }; }
    if (st.fish < 1) {
      st.fish += dt / 0.85; const f = st.fish, u = fish.userData as { x: number; z: number };
      fish.visible = f < 1; fish.position.set(u.x, WL - 0.1 + Math.sin(Math.PI * f) * 1.3, u.z - f * 1.6); fish.rotation.x = Math.cos(Math.PI * f) * 0.9;
    }
    foam.visible = car.z < RAPIDS[0].z0 + 60 && car.z > RAPIDS[1].z1 - 60;
    if (foam.visible) {
      const a = foam.geometry.attributes.position as BufferAttribute;
      for (let i = 0; i < a.count; i++) { const rr = RAPIDS[i % 2]; let z = a.getZ(i) - 4.2 * dt; if (z < rr.z1) z = rr.z0; a.setXYZ(i, xc(z) + (hash(i, 2) - 0.5) * 2 * halfW(z) * 0.8, WL + 0.06, z); }
      a.needsUpdate = true;
    }
  });
  return <><primitive object={lan.pts} /><primitive object={fish} /><primitive object={foam} /></>;
}

const bankRocks = (): Prop[] => {
  const out: Prop[] = [];
  for (let i = 0; i < 260; i++) {
    const z = Z_START - hash(i, 1) * (Z_START - Z_END), side = hash(i, 2) < 0.5 ? -1 : 1, x = xc(z) + side * (halfW(z) + 1.5 + hash(i, 3) * 14), y = height(x, z);
    if (y < WL + 0.4 || y > WL + 5) continue;
    out.push({ x, y, z, s: 0.5 + hash(i, 4) * 1.3 });
  }
  return out;
};

export function RiverRegion() {
  const water = useMemo(() => waterMaterial({ calm: 1.2 }), []);
  const rocks = useMemo(bankRocks, []);
  const lan = useLanterns();
  const shrineModels = useMemo(() => SHRINES.map((sh) => {
    const g = buildShrine(); g.children.forEach((c) => { const m = c as Mesh; if (m.material && (m.material as { emissive?: Color }).emissive && m.position.z > 0.4) m.userData.niche = true; });
    void sh; return g;
  }), []);
  const arch = useMemo(() => bakeStatic(buildArch()), []);
  const village = useMemo(() => buildVillage(), []);
  useEffect(() => { village.children.forEach((c) => { const l = c.userData.local as { x: number; z: number }; const x = VILLAGE.x + l.x, z = VILLAGE.z + l.z; c.position.set(x, height(x, z), z); }); }, [village]);
  useEffect(() => () => water.dispose(), [water]);
  return (
    <>
      <Terrain />
      <Grass />
      <Rocks list={rocks} />
      <mesh material={water} position-y={WL} rotation-x={-Math.PI / 2}><planeGeometry args={[900, 900, 1, 1]} /></mesh>
      {SHRINES.map((sh, i) => <primitive key={sh.id} object={shrineModels[i]} position={[sh.x, height(sh.x, sh.z), sh.z]} rotation-y={sh.yaw} />)}
      <primitive object={arch} position={[xc(ARCH_Z), WL + 1, ARCH_Z]} />
      <primitive object={village} />
      <Beats lan={lan} shrines={shrineModels} />
    </>
  );
}
