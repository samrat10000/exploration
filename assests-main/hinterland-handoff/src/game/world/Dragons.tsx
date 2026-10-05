// Friendly dragons that circle a place and never touch the player (J9 Sky Road: the jade dragon over the cloud sea, the ember dragon
// past the storm by the hut). The head flies a slow circle; dragon.ts rebuilds the body behind it.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { live } from "../../state/live";
import { buildDragon } from "./props/dragon";

export interface DragonRoute { x: number; y: number; z: number; r: number; speed: number; palette: "jade" | "ember"; phase?: number }

export function Dragons({ routes }: { routes: DragonRoute[] }) {
  const ds = useMemo(() => routes.map((r) => ({ r, g: buildDragon(r.palette), p: new Vector3(), d: new Vector3() })), [routes]);
  useFrame(() => {
    const t = live.clock;
    for (const o of ds) {
      const { r } = o, a = t * (r.speed / r.r) + (r.phase ?? 0);
      // a gently undulating circle; the head faces along the path
      o.p.set(r.x + Math.cos(a) * r.r, r.y + Math.sin(a * 2.3) * 8, r.z + Math.sin(a) * r.r);
      o.d.set(Math.sin(a), Math.cos(a * 2.3) * 0.1, -Math.cos(a)).normalize();
      (o.g.userData.update as (t: number, p: Vector3, d: Vector3) => void)(t, o.p, o.d);
    }
  });
  return <>{ds.map((o, i) => <primitive key={i} object={o.g} />)}</>;
}
