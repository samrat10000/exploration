// Slow Coast, assembled: terrain, grass, the sea, tide pools and rocks at each cove, a fisherman at the middle one, pines on the hills.
// No pressure: make camp at each cove (hold E on the beach in the Tortoise). At the last one the stars come out and the lantern is lit.
// Camp there for a while and the journey ends.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CircleGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash } from "../../../utils/noise";
import { LINES, speak, type Traveler } from "../../life/travelers";
import { buildPerson } from "../../life/person";
import { Grass } from "../Grass";
import { height, type Prop } from "../height";
import { Rocks } from "../Rocks";
import { Terrain } from "../Terrain";
import { Pines } from "../Vegetation";
import { waterMaterial } from "../Water";
import { COVES, WL, Z_END, Z_START, coastSafePoint, coveCentre, roadX, shoreX } from "./coast";

function Beats() {
  const st = useMemo(() => ({ said: new Set<string>(), camped: new Set<number>(), endT: -1, campT: 0 }), []);
  const fisher = useMemo(() => { const p = buildPerson("traveler"); const c = coveCentre(1); p.position.set(c.x - 6, height(c.x - 6, c.z + 4), c.z + 4); p.rotation.y = Math.PI / 2 + 0.3; return p; }, []);
  const list = useMemo<Traveler[]>(() => { const c = coveCentre(1); return [{ id: "fisher", x: c.x - 6, y: height(c.x - 6, c.z + 4) + 2.3, z: c.z + 4, lines: LINES.fisher }]; }, []);
  useEffect(() => { live.safePoint = coastSafePoint; live.obstacles = false; }, []);
  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, playing = s.phase === "play", journey = s.mode === "journey" && s.journey === "coast";
    const say = (k: string, text: string) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = 7; } };
    if (playing && journey) {
      if (car.z > Z_START - 20) say("go", "Nowhere to be. Make camp at each cove when you like");
      COVES.forEach((_c, i) => { const cc = coveCentre(i); if (!st.camped.has(i) && Math.hypot(car.x - cc.x, car.z - cc.z) < 40 && Math.abs(car.speed) < 1) say(`cove${i}`, "A good beach. Hold E to make camp"); });
    }
    // camp at a cove: counted when the tent goes up
    if (s.camping) {
      COVES.forEach((c, i) => { const cc = coveCentre(i); if (Math.hypot(car.x - cc.x, car.z - cc.z) < 40 && !st.camped.has(i)) { st.camped.add(i); if (journey) s.setProgress(st.camped.size / 3); live.note.text = `${c.name}. ${st.camped.size} of 3`; live.note.t = 5; } });
      // the last cove: stars, waves, the lantern on
      const last = coveCentre(2);
      if (Math.hypot(car.x - last.x, car.z - last.z) < 40) {
        live.camp.lantern = true; live.env.todTarget = Math.max(live.env.todTarget, 4.9); st.campT += dt;
        if (journey && st.camped.size >= 3 && st.campT > 14 && st.endT < 0) { st.endT = 0; useStore.setState({ cinema: true }); }
      }
    }
    if (st.endT >= 0) { st.endT += dt; if (st.endT > 6 && playing) { s.setExtra("endingLine", "Nowhere to be. Nowhere you'd rather."); s.finishJourney(); st.endT = -2; } }
    const label = playing && !s.sitting && !s.photo ? speak(list, car, dt, live.clock) : null;
    if (label?.text !== s.label?.text && (label || s.label?.text && list.some((t) => t.lines.some((l) => l.text === s.label?.text)))) useStore.setState({ label });
  });
  return <primitive object={fisher} />;
}

export function CoastRegion() {
  const sea = useMemo(() => waterMaterial({ calm: 1.4 }), []);
  const rocks = useMemo<Prop[]>(() => Array.from({ length: 140 }, (_, i) => { const z = Z_START - hash(i, 1) * (Z_START - Z_END), x = shoreX(z) + (hash(i, 2) - 0.1) * 70; return { x, y: height(x, z), z, s: 0.5 + hash(i, 3) * 1.3 }; }).filter((r) => r.y > WL - 0.6), []);
  const pines = useMemo<Prop[]>(() => Array.from({ length: 700 }, (_, i) => { const z = Z_START + 10 - hash(i, 5) * (Z_START - Z_END + 20), x = roadX(z) + 14 + hash(i, 6) * 110; return { x, y: height(x, z), z, s: 0.7 + hash(i, 7) * 1.0 }; }).filter((p) => p.y > WL + 2 && Math.abs(p.x - roadX(p.z)) > 12), []);
  const pools = useMemo(() => {
    const g = new Group(), m = new MeshBasicMaterial({ color: "#7DB5C4", transparent: true, opacity: 0.75 });
    COVES.forEach((_, ci) => { const c = coveCentre(ci); for (let k = 0; k < 4; k++) { const x = c.x - 8 - hash(ci, k) * 6, z = c.z - 10 + hash(k, ci + 4) * 20, p = new Mesh(new CircleGeometry(0.8 + hash(ci + k, 3) * 0.9, 14).rotateX(-Math.PI / 2), m); p.position.set(x, height(x, z) + 0.04, z); g.add(p); } });
    return g;
  }, []);
  useEffect(() => () => sea.dispose(), [sea]);
  return (
    <>
      <Terrain />
      <Grass />
      <Pines trees={pines} collide={() => false} />
      <Rocks list={rocks} />
      <mesh material={sea} position-y={WL} rotation-x={-Math.PI / 2}><planeGeometry args={[900, 900, 1, 1]} /></mesh>
      <primitive object={pools} />
      <Beats />
    </>
  );
}
