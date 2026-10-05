// The Salt Mirror, assembled: terrain, a thin mirror sheet over the flat, five mirages that fade as you approach, and the one real oasis
// (palms, a pool, a tent). Reach the oasis and stop: a slow look back across the reflected sunrise ends the journey.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CircleGeometry, ConeGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, Sprite, SpriteMaterial } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash } from "../../../utils/noise";
import { M, add, bakeStatic, box, cyl } from "../../art/kit";
import { glowTexture } from "../../environment/textures";
import { Rocks } from "../Rocks";
import { Terrain } from "../Terrain";
import { waterMaterial } from "../Water";
import { FLOOR, MIRAGES, OASIS, saltHeight, saltSafePoint } from "./salt";

function palm(g: Group, x: number, z: number, h: number, lean: number, trunk: ReturnType<typeof M> | MeshBasicMaterial, leaf: ReturnType<typeof M> | MeshBasicMaterial, w = 1) {
  const t = add(g, cyl(0.12 * w, 0.2 * w, h, 7), trunk, [x, h / 2, z], [0, 0, lean]);
  t.castShadow = false;
  for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28; add(g, new ConeGeometry(0.28 * w, 3.2, 4), leaf, [x + Math.sin(lean) * h * -0.5 + Math.cos(a) * 1.3, h - 0.2, z + Math.sin(a) * 1.3], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]); }
}

function buildOasis() {
  const g = new Group(), trunk = M("#7A5E40", 0.9), leaf = M("#5E8A46", 0.85);
  const pool = new Mesh(new CircleGeometry(OASIS.r * 0.55, 32).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: "#5FA9B8" })); pool.position.y = 0.06; g.add(pool);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28 + hash(i, 1), d = OASIS.r * (0.55 + hash(i, 2) * 0.35); palm(g, Math.cos(a) * d, Math.sin(a) * d, 5 + hash(i, 3) * 3, (hash(i, 4) - 0.5) * 0.18, trunk, leaf); }
  add(g, box(3.4, 0.12, 3), M("#B9A57C", 0.9), [OASIS.r * 0.9, 0.06, 2]);
  add(g, cyl(0.05, 0.05, 2.4, 5), M("#5A4632", 0.9), [OASIS.r * 0.9 - 1.4, 1.2, 0.6]); add(g, cyl(0.05, 0.05, 2.4, 5), M("#5A4632", 0.9), [OASIS.r * 0.9 + 1.4, 1.2, 0.6]);
  add(g, box(3.4, 0.08, 3), M("#E9DFC9", 0.85), [OASIS.r * 0.9, 2.4, 2], [0.18, 0, 0]);
  for (let i = 0; i < 12; i++) add(g, new SphereGeometry(0.32 + hash(i, 5) * 0.25, 7, 5), M("#8A8578", 0.95), [Math.cos(i * 1.9) * (OASIS.r * 0.62), 0.1, Math.sin(i * 1.9) * (OASIS.r * 0.62)]);
  return g;
}

/** A mirage: pale, shimmering palms and a bright pool of sky, gone when you get close. */
function buildMirage() {
  const g = new Group(), haze = new MeshBasicMaterial({ color: "#DCE8F0", transparent: true, opacity: 0, depthWrite: false, fog: false });
  const sky = new Mesh(new CircleGeometry(9, 24).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: "#BFE0F2", transparent: true, opacity: 0, depthWrite: false, fog: false })); sky.position.y = 0.3; g.add(sky);
  for (let i = 0; i < 6; i++) palm(g, (hash(i, 7) - 0.5) * 14, (hash(i, 8) - 0.5) * 10, 5 + hash(i, 9) * 3, 0, haze, haze, 2.6);
  const glow = new Sprite(new SpriteMaterial({ map: glowTexture(), color: "#FFE9C0", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false })); glow.scale.setScalar(40); glow.position.y = 5; g.add(glow);
  g.userData = { haze, sky, glow };
  return g;
}

function Beats({ mirages }: { mirages: Group[] }) {
  const st = useMemo(() => ({ said: new Set<string>(), still: 0, endT: -1, faded: new Set<number>() }), []);
  useEffect(() => { live.safePoint = saltSafePoint; live.obstacles = false; }, []);
  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, t = live.clock, playing = s.phase === "play", journey = s.mode === "journey" && s.journey === "salt";
    const say = (k: string, text: string) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = 6; } };
    mirages.forEach((g, i) => {
      const m = MIRAGES[i], d = Math.hypot(car.x - m.x, car.z - m.z);
      // visible from afar, thinning as you approach, gone inside 60 m, and shimmering all the while
      const a = smooth01(55, 130, d) * (0.5 + 0.2 * Math.sin(t * 1.3 + i * 2));
      const u = g.userData as { haze: MeshBasicMaterial; sky: Mesh; glow: Sprite };
      u.haze.opacity = a * 0.55; (u.sky.material as MeshBasicMaterial).opacity = a * 0.7; (u.glow.material as SpriteMaterial).opacity = a * 0.5;
      g.scale.y = 1 + 0.06 * Math.sin(t * 2.2 + i); g.visible = a > 0.01;
      if (d < 55 && !st.faded.has(i)) { st.faded.add(i); if (st.faded.size === 1) say("fade", "It was only the light"); }
    });
    if (playing && journey) {
      if (car.z > OASIS.z + 400) say("go", "Something green, far across the flat. Perhaps");
      const d = Math.hypot(car.x - OASIS.x, car.z - OASIS.z);
      if (d < OASIS.r + 8 && Math.abs(car.speed) < 0.6) st.still += dt; else st.still = 0;
      if (st.still > 1.5 && st.endT < 0) { st.endT = 0; useStore.setState({ cinema: true }); live.moment = { x: car.x, y: FLOOR + 1.2, z: car.z + 80, t: 0, dur: 8 }; }
    }
    if (st.endT >= 0) { st.endT += dt; if (st.endT > 8 && playing) { s.setExtra("endingLine", "You drove across a reflected sunrise."); s.finishJourney(); st.endT = -2; } }
  });
  return null;
}
const smooth01 = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function SaltRegion() {
  const mirror = useMemo(() => waterMaterial({ calm: 0.04 }), []);
  const oasis = useMemo(() => bakeStatic(buildOasis()), []);
  const mirages = useMemo(() => MIRAGES.map(buildMirage), []);
  const rocks = useMemo(() => Array.from({ length: 60 }, (_, i) => { const a = hash(i, 1) * 6.28, r = 150 + hash(i, 2) * 90, x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r * 1.1; return { x, y: saltHeight(x, z), z, s: 0.6 + hash(i, 3) }; }).filter((p) => p.y > FLOOR + 4), []);
  useEffect(() => () => mirror.dispose(), [mirror]);
  return (
    <>
      <Terrain />
      <mesh material={mirror} position-y={FLOOR + 0.03} rotation-x={-Math.PI / 2}><planeGeometry args={[600, 600, 1, 1]} /></mesh>
      <Rocks list={rocks} />
      <primitive object={oasis} position={[OASIS.x, FLOOR, OASIS.z]} />
      {mirages.map((g, i) => <primitive key={i} object={g} position={[MIRAGES[i].x, FLOOR, MIRAGES[i].z]} />)}
      <Beats mirages={mirages} />
    </>
  );
}
