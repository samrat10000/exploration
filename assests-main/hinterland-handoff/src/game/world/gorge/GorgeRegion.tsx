// The Boulder Garden, assembled: terrain, grass, scattered rocks, the old stone bridge, the waterfall boulder's falling
// water, and the beats (winch hints, the crossing, the ending). Boulders themselves are terrain (gorge.ts); the rings are Anchors.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, PlaneGeometry, Points, PointsMaterial, ShaderMaterial } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash } from "../../../utils/noise";
import { M, VC, add, bakeStatic, box } from "../../art/kit";
import { U } from "../../shaders";
import { useFixedColliders } from "../colliders";
import { Grass } from "../Grass";
import { height, type Prop } from "../height";
import { rockGeo } from "../props/rocks";
import { Rocks } from "../Rocks";
import { Terrain } from "../Terrain";
import { BOULDERS, FLOOR, RINGS, Z_BRIDGE_A, Z_BRIDGE_B, Z_END, Z_START, cx, gorgeSafePoint } from "./gorge";

/** The old stone bridge (built along −z from its near end): a worn slab deck, parapet stones, abutments and an arch below. */
function buildBridge() {
  const g = new Group(), stone = VC(0.95), len = Z_BRIDGE_A - Z_BRIDGE_B + 3;
  add(g, box(7.2, 0.5, len), M("#8A8578", 0.95), [0, FLOOR + 0.1 - 0.25, -len / 2]);
  for (let i = 0; i < 26; i++) for (const sx of [-1, 1]) {
    add(g, rockGeo(900 + i + (sx > 0 ? 40 : 0), 0.34, 0.2, 0.55, 1, 0.5), stone, [sx * 3.45, FLOOR + 0.45, -(i / 26) * len]);
  }
  for (let i = 0; i < 14; i++) add(g, box(6.2, 0.04, 0.9), M(i % 2 ? "#9A9588" : "#8E897C", 0.9), [0, FLOOR + 0.37, -0.5 - i * ((len - 1) / 14)]);
  for (const z of [0.2, -len + 0.2]) add(g, box(7.4, 14, 3.4), M("#7C776B", 0.95), [0, FLOOR - 7, z]);
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI * (k / 12);
    add(g, box(5.2, 1.3, 1.6), M("#838074", 0.95), [0, FLOOR - 1.0 - Math.sin(a) * 4.2, -len / 2 + Math.cos(a) * (len / 2 - 2)]);
  }
  return g;
}

/** Falling water down the waterfall boulder's face, with spray at its foot. */
function Falls() {
  const b = BOULDERS.find((q) => q.id === "falls")!;
  const { sheet, spray } = useMemo(() => {
    const topY = FLOOR + b.top, topZ = b.z + b.rt - 0.2, footZ = b.z + b.rSteep - 0.5, len = Math.hypot(topY - FLOOR, footZ - topZ);
    const sheet = new Mesh(new PlaneGeometry(2.0, len, 1, 8), new ShaderMaterial({
      transparent: true, depthWrite: false, side: DoubleSide, uniforms: { uTime: U.uTime },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "varying vec2 vUv; uniform float uTime; float h(float x){ return fract(sin(x*127.1)*43758.5453); } void main(){ float s = h(floor(vUv.x*14.0)); float f = fract(vUv.y*3.0 + uTime*(1.4 + s)); float a = (0.45 + 0.4*f)*smoothstep(0.0, 0.08, vUv.x)*smoothstep(1.0, 0.92, vUv.x); gl_FragColor = vec4(mix(vec3(0.7,0.82,0.9), vec3(1.0), f), a*0.75); }",
    }));
    // a plane stood along the face: from the crown rim down to the floor in front of the boulder
    sheet.position.set(b.x + 1.3, (topY + FLOOR) / 2 + 0.1, (topZ + footZ) / 2 + 0.1);
    sheet.rotation.x = -Math.atan2(footZ - topZ, topY - FLOOR); sheet.frustumCulled = false;
    const N = 70, p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) p.set([b.x + 1.3 + (hash(i, 1) - 0.5) * 2.6, FLOOR + hash(i, 2) * 2, footZ + 0.6 + hash(i, 3) * 1.8], i * 3);
    const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(p, 3));
    const spray = new Points(g, new PointsMaterial({ color: 0xeaf4ff, size: 0.32, transparent: true, opacity: 0.55, depthWrite: false }));
    spray.frustumCulled = false;
    return { sheet, spray };
  }, [b]);
  useFrame(() => {
    const a = spray.geometry.attributes.position as BufferAttribute, t = live.clock;
    for (let i = 0; i < a.count; i++) a.setY(i, FLOOR + 0.2 + ((t * (0.6 + hash(i, 5)) + hash(i, 4) * 3) % 1) * 2.2);
    a.needsUpdate = true;
  });
  return <><primitive object={sheet} /><primitive object={spray} /></>;
}

/** Each boulder wears a real rock: a wide mossy dome that peaks just under its crown, over the terrain's mesa. */
function buildBoulders() {
  const g = new Group(), mat = VC(0.95);
  BOULDERS.forEach((b, i) => {
    for (const [dz, k] of [[0, 1], [b.rSteep * 0.35, 0.72], [-b.rGentle * 0.25, 0.7]] as const) {
      const r = (b.rt + (b.rSteep - b.rt) * 0.55) * k * (dz === 0 ? 1 : 0.8);
      const m = add(g, rockGeo(300 + i * 7 + Math.round(dz), r, b.top * 0.98 * k, r * 1.05, 3), mat, [b.x, FLOOR - 0.2, b.z + dz]);
      m.rotation.y = hash(i, dz) * 6.28;
    }
  });
  return g;
}

const rocks = (): Prop[] => {
  const out: Prop[] = [];
  for (let i = 0; i < 160; i++) {
    const z = Z_START - 6 - hash(i, 1) * (Z_START - Z_END - 10), side = hash(i, 2) < 0.5 ? -1 : 1, x = cx(z) + side * (5 + hash(i, 3) * 20);
    if (z < Z_BRIDGE_A + 4 && z > Z_BRIDGE_B - 4) continue;
    const y = height(x, z);
    if (y > FLOOR + 1.2) continue; // only on the floor, never stuck to a wall
    out.push({ x, y, z, s: 0.5 + hash(i, 4) * 1.2 });
  }
  return out;
};
const offRoute = (x: number, z: number) => Math.abs(x - cx(z)) > 4;

function Beats() {
  const st = useMemo(() => ({ said: new Set<string>(), crossed: false }), []);
  useEffect(() => { live.safePoint = gorgeSafePoint; live.obstacles = true; return () => { live.obstacles = false; }; }, []);
  useFrame(() => {
    const s = useStore.getState(), car = live.car, w = live.winch, playing = s.phase === "play" && s.mode === "journey" && s.journey === "boulder";
    const say = (k: string, text: string) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = 6; } };
    if (s.phase === "play") {
      // the one hint the winch gets, at the first boulder; then how to wind, and the gap
      if (car.z < 100 && Math.abs(car.speed) < 3) say("aim", "Hold the right mouse button to aim at an iron ring, then let go to throw the hook");
      if (w.state === "latched") say("reel", "W winds you up the rope, S lets you down, Q lets go");
      const a = RINGS.find((r) => r.id === "chainA")!;
      if (Math.hypot(car.x - a.crown.x, car.z - a.crown.z) < 3 && car.y > FLOOR + 2) say("gap", "Hook the next ring across the gap");
    }
    // the crossing: all the way over the old bridge, with the gorge below
    if (playing && !st.crossed && car.z < Z_BRIDGE_B - 1 && Math.abs(car.x - cx(car.z)) < 4 && car.y > FLOOR - 1) {
      st.crossed = true;
      live.moment = { x: car.x, y: car.y - 8, z: Z_BRIDGE_A + 10, t: 0, dur: 4 };
      s.setExtra("endingLine", "The gorge is easier the second time.");
      s.finishJourney();
    }
  });
  return null;
}

export function GorgeRegion() {
  const list = useMemo(rocks, []);
  const bridge = useMemo(() => bakeStatic(buildBridge()), []);
  const boulders = useMemo(() => bakeStatic(buildBoulders()), []);
  // parapets are solid; the deck itself is part of the ground (gorge.ts deck())
  useFixedColliders((r) => [-3.5, 3.5].map((dx) => r.ColliderDesc.cuboid(0.3, 0.5, (Z_BRIDGE_A - Z_BRIDGE_B + 2) / 2).setTranslation(cx(Z_BRIDGE_A) + dx, FLOOR + 0.5, (Z_BRIDGE_A + Z_BRIDGE_B) / 2)), []);
  return (
    <>
      <Terrain />
      <Grass />
      <Rocks list={list} free={offRoute} />
      <primitive object={bridge} position={[cx(Z_BRIDGE_A), 0, Z_BRIDGE_A + 1.5]} />
      <primitive object={boulders} />
      <mesh position={[cx(Z_BRIDGE_A), FLOOR - 11.2, (Z_BRIDGE_A + Z_BRIDGE_B) / 2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[70, Z_BRIDGE_A - Z_BRIDGE_B + 4]} />
        <meshStandardMaterial color="#5F8EA6" roughness={0.12} metalness={0.3} />
      </mesh>
      <Falls />
      <Beats />
    </>
  );
}
