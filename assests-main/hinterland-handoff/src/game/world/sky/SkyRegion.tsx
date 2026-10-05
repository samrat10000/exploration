// Sky Road, assembled: the mountain terrain, the cloud sea at 250 m with a cloud wall of cumulus, the sky hut on its timber platform
// with a beacon that stays visible, and the beats: unfold on the ridge, "Weather coming in" (SkyHazards), land at the hut and the
// journey ends. The rainbow after the storm comes from the weather system when a real shower has passed.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Sprite, SpriteMaterial } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash } from "../../../utils/noise";
import { M, add, bakeStatic, box, cyl, glow } from "../../art/kit";
import { CloudSet, makeCloudSet } from "../../environment/CozyClouds";
import { glowTexture } from "../../environment/textures";
import { buildHouse } from "../props/house";
import { Balloons } from "../Balloons";
import { Dragons, type DragonRoute } from "../Dragons";
import { Terrain } from "../Terrain";
import { CLOUD_Y, HUT, skySafePoint } from "./sky";
import { Group } from "three";

const BALLOONS = Array.from({ length: 7 }, (_, i) => ({ x: -380 + i * 130 + hash(i, 5) * 40, y: CLOUD_Y + 40 + hash(i, 6) * 60, z: 500 - i * 190 + hash(i, 7) * 60, seed: i + 1 }));

const DRAGONS: DragonRoute[] = [{ x: 0, y: CLOUD_Y + 110, z: 120, r: 190, speed: 16, palette: "jade" }, { x: -60, y: HUT.y + 90, z: HUT.z + 40, r: 130, speed: 14, palette: "ember", phase: 2 }];

function buildHut() {
  const g = new Group();
  // the timber sky platform: planks on stilts, a rail, and the hut on it
  for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) add(g, box(1.6, 0.18, 1.6), M((i + j) % 2 ? "#8C6B4A" : "#7A5C3F", 0.9), [(i - 5.5) * 1.6, 0.05, (j - 3.5) * 1.6 + 6]);
  for (const x of [-9, 9]) for (const z of [-0.5, 12.5]) add(g, cyl(0.25, 0.3, 5, 8), M("#5A4632", 0.95), [x, -2.4, z]);
  for (let i = 0; i < 12; i++) add(g, box(1.6, 0.9, 0.08), M("#6B5034", 0.9), [(i - 5.5) * 1.6, 0.6, 12.9]);
  const hut = bakeStatic(buildHouse({ seed: 88, w: 5, d: 4, h: 2.5, walls: "stone", flags: true }));
  hut.position.set(0, 0.1, 3); hut.rotation.y = Math.PI; g.add(hut);
  add(g, cyl(0.1, 0.12, 6, 8), M("#5A4632", 0.9), [7.5, 3, 2]);
  add(g, box(0.4, 0.5, 0.4), glow("#FFC874", 1.8), [7.5, 6.3, 2]);
  return g;
}

function Beacon() {
  const s = useMemo(() => { const sp = new Sprite(new SpriteMaterial({ map: glowTexture(), color: "#FFC874", transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false })); sp.position.set(HUT.x + 7.5, HUT.y + 6.3, HUT.z + 2); sp.scale.setScalar(28); return sp; }, []);
  useFrame(() => { (s.material as SpriteMaterial).opacity = 0.65 + 0.2 * Math.sin(live.clock * 2.2); });
  return <primitive object={s} />;
}

function Beats() {
  const st = useMemo(() => ({ said: new Set<string>(), still: 0, endT: -1 }), []);
  useEffect(() => { live.safePoint = skySafePoint; live.obstacles = false; }, []);
  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, playing = s.phase === "play", journey = s.mode === "journey" && s.journey === "skyroad";
    const say = (k: string, text: string) => { if (!st.said.has(k)) { st.said.add(k); live.note.text = text; live.note.t = 6; } };
    if (playing && journey) {
      if (live.vehicle === "mule" && car.z > 760) say("go", "Drive to the edge of the ridge and hold T to unfold the wings");
      if (live.vehicle === "skymule" && car.y > 300 && car.z < 700) say("fly", "Find the rising air: the clouds sit above every thermal");
      if (live.vehicle === "skymule" && car.z < -600) say("hut", "The warm light is the sky hut");
    }
    // landed on the hut's platform: the keeper is amazed
    const d = Math.hypot(car.x - HUT.x, car.z - (HUT.z + 30));
    if (playing && journey && live.vehicle === "skymule" && d < 14 && !car.air && Math.abs(car.speed) < 3) st.still += dt; else st.still = 0;
    if (st.still > 1.5 && st.endT < 0) { st.endT = 0; useStore.setState({ cinema: true }); live.moment = { x: HUT.x, y: HUT.y + 4, z: HUT.z, t: 0, dur: 5 }; }
    if (st.endT >= 0) { st.endT += dt; if (st.endT > 5.5 && playing) { s.setExtra("endingLine", "The keeper didn't think it could be done."); s.finishJourney(); st.endT = -2; } }
  });
  return null;
}

export function SkyRegion() {
  const hut = useMemo(buildHut, []);
  // the cloud sea, ending in a wall of cumulus on its north edge
  const sea = useMemo(() => {
    const c = makeCloudSet();
    c.sea(-700, 700, -1000, 1000, CLOUD_Y, 90, 5);
    for (let i = 0; i < 14; i++) c.cumulus(-600 + i * 92 + hash(i, 1) * 30, CLOUD_Y + 6, -1010 - hash(i, 2) * 30, 60 + hash(i, 3) * 30, 20 + i);
    return c;
  }, []);
  return (
    <>
      <Terrain />
      <CloudSet set={sea} />
      <Balloons spots={BALLOONS} />
      <Dragons routes={DRAGONS} />
      <primitive object={hut} position={[HUT.x, HUT.y, HUT.z + 18]} />
      <Beacon />
      <Beats />
    </>
  );
}
