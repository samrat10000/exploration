// Above the Clouds (J14, the finale): glide the valley at golden hour. The places you have found light up as you pass over them, and
// the credits drift by as place names (ui/Credits.tsx reads live.credits). Land on the start meadow and the journey ends.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Sprite, SpriteMaterial } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { glowTexture } from "../environment/textures";
import { SKY } from "../vehicle/flight";
import { FALLS, TARN, VP, height } from "./height";

const SPOTS = [{ x: VP.x, z: VP.z }, { x: FALLS.x, z: FALLS.top + 8 }, { x: TARN.x, z: TARN.z }, { x: 0, z: 60 }];

export function Finale() {
  const active = useStore((s) => s.mode === "journey" && s.journey === "above" && s.region === "valley");
  const beacons = useMemo(() => SPOTS.map((p) => { const s = new Sprite(new SpriteMaterial({ map: glowTexture(), color: "#FFD58A", transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, opacity: 0 })); s.position.set(p.x, height(p.x, p.z) + 14, p.z); s.scale.setScalar(30); return s; }), []);
  const st = useMemo(() => ({ t: -1, lit: new Float32Array(SPOTS.length), still: 0, endT: -1 }), []);
  useEffect(() => { live.credits.on = false; return () => { live.credits.on = false; }; }, []);
  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, flying = live.flight.on;
    if (!active) { beacons.forEach((b) => ((b.material as SpriteMaterial).opacity = 0)); return; }
    // the credits start when the wings first open and keep drifting while you're up
    if (live.flight.on && st.t < 0) st.t = 0;
    if (st.t >= 0) st.t += dt;
    live.credits.on = st.t >= 0 && st.endT < 0; live.credits.t = st.t;
    // places light up as you pass over (and stay lit)
    beacons.forEach((b, i) => { if (Math.hypot(car.x - SPOTS[i].x, car.z - SPOTS[i].z) < 90) st.lit[i] = Math.min(1, st.lit[i] + dt * 0.5); (b.material as SpriteMaterial).opacity = st.lit[i] * (0.6 + 0.2 * Math.sin(live.clock * 2 + i)); });
    // landing back on the start meadow: the end
    const l = SKY.valley.landings[0], d = Math.hypot(car.x - l.x, car.z - l.z);
    if (live.flight.on && !car.air && st.t > 20 && d < l.r + 8 && Math.abs(car.speed) < 2) st.still += dt; else st.still = 0;
    void flying;
    if (st.still > 1.2 && st.endT < 0) { st.endT = 0; useStore.setState({ cinema: true }); }
    if (st.endT >= 0) { st.endT += dt; if (st.endT > 4 && s.phase === "play") { s.setExtra("endingLine", "Everywhere you have been, all at once."); s.setExtra("allOpen", true); s.finishJourney(); st.endT = -2; } }
  });
  return <>{beacons.map((b, i) => <primitive key={i} object={b} />)}</>;
}
