// Sky lanterns (kit/particles.js): at night, warm paper lanterns released near you rise slowly for 40-80 s, drifting on the wind, then fade.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Color, Sprite, SpriteMaterial } from "three";
import { live } from "../../state/live";
import { hash } from "../../utils/noise";
import { glowTexture } from "./textures";

const N = 26, LIFE = 55;

function paperTexture() {
  const c = document.createElement("canvas"); c.width = 32; c.height = 48;
  const x = c.getContext("2d")!, g = x.createLinearGradient(0, 0, 0, 48);
  g.addColorStop(0, "#FFB24A"); g.addColorStop(0.7, "#FFE2A0"); g.addColorStop(1, "#FFF6D8");
  x.fillStyle = g; x.beginPath(); x.moveTo(6, 2); x.lineTo(26, 2); x.lineTo(30, 44); x.lineTo(2, 44); x.closePath(); x.fill();
  x.strokeStyle = "rgba(160,80,20,.35)"; for (let i = 8; i < 44; i += 9) { x.beginPath(); x.moveTo(3, i); x.lineTo(29, i); x.stroke(); }
  return new CanvasTexture(c);
}

export function SkyLanterns() {
  const L = useMemo(() => {
    const paper = paperTexture(), glow = glowTexture();
    return Array.from({ length: N }, (_, i) => {
      const s = new Sprite(new SpriteMaterial({ map: paper, transparent: true, depthWrite: false, opacity: 0, fog: false }));
      const h = new Sprite(new SpriteMaterial({ map: glow, color: new Color("#FFB866"), transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0, fog: false }));
      s.scale.set(0.7, 1.0, 1); h.scale.setScalar(2.6); return { s, h, t: hash(i, 1) * LIFE, ox: 0, oz: 0, ph: hash(i, 2) * 6, born: false };
    });
  }, []);
  useFrame((_, dt) => {
    const car = live.car, on = live.env.stars > 0.5 && live.wx.rain < 0.3;
    for (const l of L) {
      l.t += dt * (on ? 1 : 0);
      if (l.t > LIFE || !l.born) { if (!on && l.born) { l.t = LIFE; } else { l.t = l.born ? 0 : l.t % LIFE; l.born = true; const a = Math.random() * 6.28, r = 12 + Math.random() * 50; l.ox = Math.cos(a) * r; l.oz = Math.sin(a) * r; if (l.t === 0) { l.ph = Math.random() * 6; } } }
      const t = l.t, y = car.y + 2 + t * 1.5, a = Math.min(1, t * 0.4) * Math.max(0, 1 - (t - LIFE * 0.75) / (LIFE * 0.25)) * (on ? 1 : 0);
      l.s.position.set(car.x + l.ox + Math.sin(t * 0.2 + l.ph) * t * 0.5, y, car.z + l.oz + Math.cos(t * 0.15 + l.ph) * t * 0.4); l.h.position.copy(l.s.position);
      (l.s.material as SpriteMaterial).opacity += (a - (l.s.material as SpriteMaterial).opacity) * 0.08;
      (l.h.material as SpriteMaterial).opacity = (l.s.material as SpriteMaterial).opacity * (0.7 + 0.15 * Math.sin(t * 6 + l.ph));
    }
  });
  return <>{L.map((l, i) => <group key={i}><primitive object={l.s} /><primitive object={l.h} /></group>)}</>;
}
