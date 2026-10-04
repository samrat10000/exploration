// Wildflower drifts (ART §5): 5–15 of one species together, denser along trail edges and near water.
import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group } from "three";
import { hash } from "../../utils/noise";
import { cullByDistance, instanced, place } from "../art/kit";
import { flowerModel, type FlowerKind } from "./flora/grass";
import { height } from "./height";

const KINDS: FlowerKind[] = ["daisy", "buttercup", "lupin", "cosmos"];
/** A drift centre: where, how wide, and (optionally) which species. */
export interface Drift { x: number; z: number; r: number; kind?: FlowerKind }

export function Flowers({ drifts, ok }: { drifts: Drift[]; ok: (x: number, z: number) => boolean }) {
  const group = useMemo(() => {
    const byKind = new Map<FlowerKind, { x: number; z: number; s: number; yaw: number }[]>(KINDS.map((k) => [k, []]));
    drifts.forEach((d, i) => {
      const kind = d.kind ?? KINDS[Math.floor(hash(i, 1) * KINDS.length)], n = 5 + Math.floor(hash(i, 2) * 11);
      for (let k = 0; k < n; k++) {
        const a = hash(i * 31 + k, 3) * 6.28, r = Math.sqrt(hash(i * 31 + k, 4)) * d.r, x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r;
        if (ok(x, z)) byKind.get(kind)!.push({ x, z, s: 0.8 + hash(i * 31 + k, 5) * 0.5, yaw: hash(i * 31 + k, 6) * 6.28 });
      }
    });
    const g = new Group();
    for (const [kind, list] of byKind) {
      g.add(instanced(flowerModel(kind, 3), list.map((f) => place(f.x, height(f.x, f.z) - 0.02, f.z, f.yaw, f.s)), { cell: 48 }));
    }
    return g;
  }, [drifts, ok]);
  // flowers fade with the grass ring (ART §4)
  const camera = useThree((st) => st.camera);
  useFrame(() => cullByDistance(group, camera.position, 80));
  return <primitive object={group} />;
}
