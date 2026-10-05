// Hot air balloons drifting slowly over a region (J9 Sky Road: seven over the cloud sea; the valley: three over the meadows).
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../../state/store";
import { live } from "../../state/live";
import { hash } from "../../utils/noise";
import { buildBalloon } from "./props/balloon";

export interface BalloonSpot { x: number; y: number; z: number; seed: number }
const SCALE = 1.4;

export function Balloons({ spots }: { spots: BalloonSpot[] }) {
  const list = useMemo(() => spots.map((s) => { const b = buildBalloon(s.seed); b.scale.setScalar(SCALE); b.position.set(s.x, s.y, s.z); return { b, s }; }), [spots]);
  useFrame((_, dt) => {
    const t = live.clock, night = live.env.stars;
    if (useStore.getState().phase === "menu") { /* still drift in the title view */ }
    list.forEach(({ b, s }, i) => {
      b.position.set(s.x + Math.sin(t * 0.03 + i * 2) * 36, s.y + Math.sin(t * 0.21 + i) * 2.2, s.z + Math.cos(t * 0.025 + i) * 28);
      b.rotation.y = t * 0.02 + hash(i, 3) * 6;
      (b.userData.update as (t: number, dt: number, n: number) => void)(t, dt, night);
    });
  });
  return <>{list.map(({ b }, i) => <primitive key={i} object={b} />)}</>;
}
