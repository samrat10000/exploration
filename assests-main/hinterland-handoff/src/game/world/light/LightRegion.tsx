// The Lighthouse, assembled: terrain, grass, the sea below, a low stone wall along the cliff edge, pines inland, the lighthouse on its
// headland. The storm (rain, lightning, thunder) holds for the first 70% of the road, then clears; arrive and the beam comes on,
// sweeping the sea under a rainbow.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, ConeGeometry, Group, Mesh, MeshBasicMaterial, SpotLight } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash } from "../../../utils/noise";
import { audio } from "../../audio/audio";
import { M, add, bakeStatic, box, cyl, glow, halo } from "../../art/kit";
import { Grass } from "../Grass";
import { height, type Prop } from "../height";
import { Rocks } from "../Rocks";
import { Terrain } from "../Terrain";
import { Pines } from "../Vegetation";
import { waterMaterial } from "../Water";
import { LIGHT, TOP, WL, Z_END, Z_START, edgeX, lightSafePoint, roadX } from "./light";

function buildLighthouse() {
  const g = new Group(), white = M("#EFE9DC", 0.85), red = M("#C0453A", 0.8);
  add(g, cyl(5, 6.2, 1.4, 20), M("#8A8578", 0.95), [0, 0.7, 0]);
  for (let i = 0; i < 6; i++) add(g, cyl(2.7 - i * 0.18, 3.0 - i * 0.18, 3.2, 18), i % 2 ? red : white, [0, 2.2 + 1.6 + i * 3.2, 0]);
  add(g, cyl(3.3, 3.3, 0.4, 18), M("#2A2E31", 0.6), [0, 22.6, 0]);
  add(g, cyl(1.3, 1.3, 2.2, 14), glow("#FFE7A8", 0.6), [0, 24, 0]);
  add(g, new ConeGeometry(2.1, 1.8, 14), red, [0, 25.9, 0]);
  add(g, box(2.2, 3.2, 2.6), white, [4.6, 1.6, 0]);
  return g;
}

function Beats({ beam }: { beam: Group }) {
  const st = useMemo(() => ({ said: new Set<string>(), still: 0, endT: -1, bolt: 4, on: 0 }), []);
  useEffect(() => { live.safePoint = lightSafePoint; live.obstacles = false; live.wxForce = "rain"; return () => { live.wxForce = null; live.bolt = 0; }; }, []);
  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, playing = s.phase === "play", journey = s.mode === "journey" && s.journey === "light", prog = s.progress;
    const say = (k: string, text: string) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = 7; } };
    // the storm holds, then clears; the weather system adds the rainbow after a real shower
    live.wxForce = st.endT >= 0 || prog > 0.7 ? "clear" : "rain";
    live.bolt = Math.max(0, live.bolt - dt / 0.12);
    st.bolt -= dt;
    if (playing && live.wx.rain > 0.5 && st.bolt <= 0) { st.bolt = 4 + Math.random() * 7; live.bolt = 1; setTimeout(() => audio.thunder(), 900 + Math.random() * 1800); }
    if (playing && journey) {
      if (car.z > Z_START - 15) say("go", "One heavy generator for the lighthouse. The road is slick");
      if (prog > 0.8) say("clear", "The storm is breaking up behind you");
    }
    // arriving: the beam comes on and sweeps the sea
    const d = Math.hypot(car.x - LIGHT.x, car.z - LIGHT.z);
    if (playing && journey && d < 30 && Math.abs(car.speed) < 0.6) st.still += dt; else st.still = 0;
    if (st.still > 2 && st.endT < 0) { st.endT = 0; useStore.setState({ cinema: true }); live.moment = { x: LIGHT.x - 40, y: TOP + 20, z: LIGHT.z, t: 0, dur: 9 }; live.env.todTarget = Math.max(live.env.todTarget, 3.5); }
    if (st.endT >= 0) {
      st.endT += dt; st.on = Math.min(1, st.endT / 3);
      if (st.endT > 10 && playing) { s.setExtra("endingLine", "The beam sweeps the sea, under a rainbow."); s.finishJourney(); st.endT = -2; }
    }
    // the beam: a slowly turning soft cone, lit once it's on (and dim before)
    beam.rotation.y = live.clock * 0.7;
    beam.children.forEach((c) => { if ((c as Mesh).isMesh) ((c as Mesh).material as MeshBasicMaterial).opacity = (0.06 + 0.2 * st.on) * (0.7 + 0.3 * Math.sin(live.clock * 2)); if ((c as SpotLight).isSpotLight) (c as SpotLight).intensity = 600 * st.on; });
  });
  return null;
}

export function LightRegion() {
  const sea = useMemo(() => waterMaterial({ calm: 1.8 }), []);
  const lh = useMemo(() => bakeStatic(buildLighthouse()), []);
  const beam = useMemo(() => {
    const g = new Group(), cone = new Mesh(new ConeGeometry(14, 120, 16, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -60), new MeshBasicMaterial({ color: "#FFE9B0", transparent: true, opacity: 0.06, depthWrite: false, blending: AdditiveBlending, fog: false }));
    g.add(cone); g.position.set(LIGHT.x, height(LIGHT.x, LIGHT.z) + 24, LIGHT.z);
    halo(g, [0, 0, 0], "#FFE7A8", 9);
    return g;
  }, []);
  const wall = useMemo(() => {
    const g = new Group(), m = M("#7C776B", 0.95);
    for (let z = Z_START - 8; z > Z_END + 40; z -= 3.2) { const x = edgeX(z) + 4; add(g, box(0.7, 0.9, 3.3), m, [x, height(x, z) + 0.4, z], [0, -(edgeX(z - 1.6) - edgeX(z + 1.6)) / 3.2, 0]); }
    return bakeStatic(g);
  }, []);
  const rocks = useMemo<Prop[]>(() => Array.from({ length: 120 }, (_, i) => { const z = Z_START - hash(i, 1) * (Z_START - Z_END), x = edgeX(z) + 6 + hash(i, 2) * 70; return { x, y: height(x, z), z, s: 0.5 + hash(i, 3) * 1.2 }; }).filter((r) => Math.abs(r.x - roadX(r.z)) > 5), []);
  const pines = useMemo<Prop[]>(() => Array.from({ length: 520 }, (_, i) => { const z = Z_START - hash(i, 5) * (Z_START - Z_END), x = roadX(z) + 14 + hash(i, 6) * 100; return { x, y: height(x, z), z, s: 0.7 + hash(i, 7) }; }).filter((p) => Math.abs(p.x - roadX(p.z)) > 12), []);
  useEffect(() => () => sea.dispose(), [sea]);
  return (
    <>
      <Terrain />
      <Grass />
      <Pines trees={pines} collide={() => false} />
      <Rocks list={rocks} />
      <primitive object={wall} />
      <mesh material={sea} position-y={WL} rotation-x={-Math.PI / 2}><planeGeometry args={[900, 900, 1, 1]} /></mesh>
      <primitive object={lh} position={[LIGHT.x, height(LIGHT.x, LIGHT.z), LIGHT.z]} />
      <primitive object={beam} />
      <Beats beam={beam} />
    </>
  );
}
