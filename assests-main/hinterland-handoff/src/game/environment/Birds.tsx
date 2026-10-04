// A few distant birds circling over the valley.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial } from "three";
import { live } from "../../state/live";
import { hash } from "../../utils/noise";

export function Birds() {
  const birds = useMemo(() => {
    const mat = new MeshBasicMaterial({ color: 0x2b2a2e, side: DoubleSide });
    const wing = new BufferGeometry();
    wing.setAttribute("position", new Float32BufferAttribute([0, 0, -0.15, 0, 0, 0.2, 0.9, 0, 0], 3));
    return Array.from({ length: 9 }, (_, i) => {
      const b = new Group(), l = new Mesh(wing, mat), r = new Mesh(wing, mat);
      r.scale.x = -1;
      b.add(l, r);
      b.scale.setScalar(1.3);
      b.userData = { l, r, cx: -20 + hash(i, 1) * 120, cz: -40 + hash(i, 2) * 120, rad: 25 + hash(i, 3) * 40, h: 38 + hash(i, 4) * 30, sp: 0.08 + hash(i, 5) * 0.06, ph: hash(i, 6) * 6.28 };
      return b;
    });
  }, []);

  useFrame(() => {
    const clock = live.clock;
    for (const b of birds) {
      const u = b.userData, a = clock * u.sp + u.ph;
      b.position.set(u.cx + Math.cos(a) * u.rad, u.h + Math.sin(a * 2.3) * 2, u.cz + Math.sin(a) * u.rad);
      b.rotation.y = -a;
      const f = Math.sin(clock * 9 + u.ph * 5) * 0.55;
      u.l.rotation.z = f;
      u.r.rotation.z = -f;
    }
  });

  return (
    <>
      {birds.map((b, i) => (
        <primitive key={i} object={b} />
      ))}
    </>
  );
}
