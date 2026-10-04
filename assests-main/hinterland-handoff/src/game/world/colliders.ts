// Static (fixed) colliders created straight on the Rapier world. Thousands of trees and rocks
// as React components would be slow to mount and buy nothing, so they are built imperatively.
import { useEffect } from "react";
import { useRapier } from "@react-three/rapier";
import type { ColliderDesc } from "@dimforge/rapier3d-compat";

type Rapier = ReturnType<typeof useRapier>["rapier"];

export function useFixedColliders(build: (r: Rapier) => ColliderDesc[], deps: unknown[]) {
  const { world, rapier } = useRapier();
  useEffect(() => {
    const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());
    for (const d of build(rapier)) world.createCollider(d, body);
    return () => world.removeRigidBody(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, rapier, ...deps]);
}
