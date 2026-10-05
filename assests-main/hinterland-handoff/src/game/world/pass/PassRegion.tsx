// First Snow, assembled: snowy terrain, dark pines, drifts that crush flat, the frozen lake (thin ice: a warning, never a break), a
// cabin whose windows glow in the blue night. Snowfall comes from live.wxForce (Weather.tsx); the blizzard is the journey's fog keys.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CircleGeometry, IcosahedronGeometry, InstancedMesh, Mesh, MeshStandardMaterial, Object3D } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash } from "../../../utils/noise";
import { audio } from "../../audio/audio";
import { C, VC, bakeStatic, mixC, paintFaces } from "../../art/kit";
import { buildHouse } from "../props/house";
import { Rocks } from "../Rocks";
import { Terrain } from "../Terrain";
import { Pines } from "../Vegetation";
import { CABIN, LAKE, Z_CABIN, Z_START, lakeY, onIce, passHeight, passSafePoint, passTrees, trackX } from "./pass";

function Beats() {
  const st = useMemo(() => ({ said: new Set<string>(), still: 0, endT: -1, ice: 0 }), []);
  useEffect(() => { live.safePoint = passSafePoint; live.obstacles = false; live.wxForce = "snow"; return () => { live.wxForce = null; live.ice = 0; }; }, []);
  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, journey = s.mode === "journey" && s.journey === "snow", playing = s.phase === "play";
    const say = (k: string, text: string) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = 6; } };
    if (playing && journey) {
      if (car.z > Z_START - 15) say("go", "Firewood for the cabin, before the pass closes");
      if (car.z < -15 && car.z > -45 && !onIce(car.x, car.z)) say("lake", "The lake is frozen. Go gently");
    }
    // thin ice: frost creeps in from the edges above 6 m/s and melts back when you ease off. It never breaks.
    const want = playing && onIce(car.x, car.z) && Math.abs(car.speed) > 6 ? 1 : 0;
    st.ice += (want - st.ice) * Math.min(1, dt * (want ? 1.2 : 0.7));
    live.ice = st.ice;
    if (st.ice > 0.2) audio.creak(st.ice * 0.8);
    // the cabin: arrive and stop; its windows are already glowing in the blue night
    const d = Math.hypot(car.x - CABIN.x, car.z - CABIN.z);
    if (playing && journey && d < 16 && Math.abs(car.speed) < 0.6) st.still += dt; else st.still = 0;
    if (st.still > 2 && st.endT < 0) { st.endT = 0; useStore.setState({ cinema: true }); live.moment = { x: CABIN.x, y: car.y + 3, z: CABIN.z, t: 0, dur: 6 }; }
    if (st.endT >= 0) { st.endT += dt; if (st.endT > 6 && playing) { s.setExtra("endingLine", "The cabin windows glow in the blue night."); s.finishJourney(); st.endT = -2; } }
  });
  return null;
}

/** Drifts along the track: soft mounds that crush flat under the cat and stay crushed. */
function Drifts() {
  const { mesh, list } = useMemo(() => {
    const list = Array.from({ length: 36 }, (_, k) => { const z = Z_START - 20 - (k / 36) * (Z_START - Z_CABIN - 40), x = trackX(z) + (hash(k, 2) - 0.5) * 8; return { x, z, y: passHeight(x, z), s: 1.6 + hash(k, 3) * 1.5, flat: 1, yaw: hash(k, 4) * 3 }; });
    const geo = paintFaces(new IcosahedronGeometry(1, 2).scale(1, 0.32, 0.6), (_c, n) => mixC(C("#DCE3EA"), C("#F7F9FB"), n.y * 0.7 + 0.3));
    const mesh = new InstancedMesh(geo, VC(0.85), list.length); mesh.receiveShadow = mesh.castShadow = true;
    return { mesh, list };
  }, []);
  const o = useMemo(() => new Object3D(), []);
  useFrame((_, dt) => {
    const car = live.car;
    list.forEach((d, i) => {
      if (Math.hypot(car.x - d.x, car.z - d.z) < d.s * 0.9) d.flat = Math.max(0.22, d.flat - dt * 2.5);
      o.position.set(d.x, d.y - 0.05, d.z); o.rotation.set(0, d.yaw, 0); o.scale.set(d.s, d.s * d.flat, d.s); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

export function PassRegion() {
  const trees = useMemo(passTrees, []);
  const cabin = useMemo(() => bakeStatic(buildHouse({ seed: 77, w: 5, d: 4, h: 2.5, walls: "stone", shutter: "#8A4A3A" })), []);
  const ice = useMemo(() => { const m = new Mesh(new CircleGeometry(LAKE.r - 2, 48).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: "#BCD4E4", roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 })); m.position.set(LAKE.x, lakeY() + 0.05, LAKE.z); m.receiveShadow = true; return m; }, []);
  const rocks = useMemo(() => Array.from({ length: 120 }, (_, i) => { const z = Z_START - hash(i, 1) * (Z_START - Z_CABIN), x = trackX(z) + (hash(i, 2) < 0.5 ? -1 : 1) * (6 + hash(i, 3) * 50); return { x, y: passHeight(x, z), z, s: 0.5 + hash(i, 4) * 1.2 }; }).filter((r) => Math.hypot(r.x - LAKE.x, r.z - LAKE.z) > LAKE.r + 2), []);
  return (
    <>
      <Terrain />
      <Pines trees={trees} collide={(p) => Math.abs(p.x - trackX(p.z)) < 22} />
      <Rocks list={rocks} free={(x, z) => Math.abs(x - trackX(z)) > 5} />
      <primitive object={ice} />
      <primitive object={cabin} position={[CABIN.x, passHeight(CABIN.x, CABIN.z), CABIN.z]} rotation-y={Math.PI / 2} />
      <Drifts />
      <Beats />
    </>
  );
}
