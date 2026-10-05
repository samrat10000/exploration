// Headlights (ART §3, TIME §2): two real soft-cone SpotLights on the front of any ground vehicle that come on toward
// dusk and are full at night, with moths fluttering in the beams. They follow the shared pose (live.car).
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, PointsMaterial, SpotLight } from "three";
import { live } from "../../state/live";
import { clamp, hash, smooth } from "../../utils/noise";

const GROUND = new Set(["rover", "mule", "bus", "tortoise", "snowcat"]);
const MOTHS = 36;

export function Headlights() {
  const scene = useThree((s) => s.scene);
  const { lights, moths, pos } = useMemo(() => {
    const lights = [-1, 1].map(() => { const l = new SpotLight(0xffe2b0, 0, 70, 0.5, 0.75, 1.5); l.castShadow = false; return l; });
    const pos = new Float32Array(MOTHS * 3), g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    const moths = new Points(g, new PointsMaterial({ color: 0xfff1c8, size: 0.09, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
    moths.frustumCulled = false;
    return { lights, moths, pos };
  }, []);
  useEffect(() => {
    lights.forEach((l) => scene.add(l, l.target)); scene.add(moths);
    if (import.meta.env.DEV) (window as unknown as { __lights?: unknown }).__lights = lights;
    return () => { lights.forEach((l) => { scene.remove(l, l.target); l.dispose(); }); scene.remove(moths); moths.geometry.dispose(); };
  }, [scene, lights, moths]);

  useFrame(() => {
    // from dusk (golden hour is 3) toward full night at 4.4
    const k = !GROUND.has(live.vehicle) ? 0 : live.lights === "on" ? 1 : live.lights === "off" ? 0 : smooth(3.3, 4.4, live.env.tod), car = live.car, t = live.clock;
    const fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw), rx = Math.cos(car.yaw), rz = -Math.sin(car.yaw);
    lights.forEach((l, i) => {
      const side = i ? 1 : -1;
      l.intensity = k * 900;
      l.position.set(car.x + fx * 2.1 + rx * side * 0.7, car.y + 0.95, car.z + fz * 2.1 + rz * side * 0.7);
      l.target.position.set(car.x + fx * 26 + rx * side * 1.5, car.y - 0.6, car.z + fz * 26 + rz * side * 1.5);
    });
    moths.visible = k > 0.2;
    (moths.material as PointsMaterial).opacity = clamp(k, 0, 1) * 0.8;
    if (moths.visible) {
      for (let i = 0; i < MOTHS; i++) {
        const d = 4 + hash(i, 1) * 14 + Math.sin(t * 1.3 + i) * 0.8, s = (hash(i, 2) - 0.5) * 4 + Math.sin(t * 2.1 + i * 3) * 0.5;
        pos[i * 3] = car.x + fx * d + rx * s; pos[i * 3 + 1] = car.y + 0.8 + hash(i, 3) * 2.2 + Math.sin(t * 3 + i * 5) * 0.3; pos[i * 3 + 2] = car.z + fz * d + rz * s;
      }
      (moths.geometry.attributes.position as BufferAttribute).needsUpdate = true;
    }
  });
  return null;
}
