// Drifting sprite clouds. The first 8 sit low, tucked below the northern peaks.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Sprite, SpriteMaterial } from "three";
import { live } from "../../state/live";
import { hash } from "../../utils/noise";
import { blobTexture } from "./textures";

const tint = new Color();

export function Clouds() {
  const clouds = useMemo(() => {
    const texes = [0, 1, 2].map((s) => blobTexture(256, 128, 14, s + 4));
    return Array.from({ length: 34 }, (_, i) => {
      const low = i < 8;
      const s = new Sprite(new SpriteMaterial({ map: texes[i % 3], transparent: true, depthWrite: false, fog: false, opacity: low ? 0.55 : 0.8 }));
      const ang = hash(i, 9) * Math.PI * 2, rad = low ? 160 + hash(i, 2) * 80 : 380 + hash(i, 3) * 500;
      s.position.set(Math.cos(ang) * rad, low ? 44 + hash(i, 4) * 18 : 130 + hash(i, 5) * 180, low ? -150 - hash(i, 6) * 90 : Math.sin(ang) * rad - 150);
      const sc = low ? 70 + hash(i, 7) * 50 : 180 + hash(i, 8) * 220;
      s.scale.set(sc, sc * 0.45, 1);
      s.userData.v = (low ? 1.2 : 2.5) + hash(i, 11) * 2;
      return s;
    });
  }, []);

  useFrame((_, dt) => {
    tint.setRGB(1, 1, 1).lerp(live.env.sunC, 0.35);
    for (const c of clouds) {
      c.position.x += c.userData.v * dt;
      if (c.position.x > 800) c.position.x = -800;
      c.material.color.copy(tint);
    }
  });

  return (
    <>
      {clouds.map((c, i) => (
        <primitive key={i} object={c} />
      ))}
    </>
  );
}
