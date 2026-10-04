// Soft procedural sprite textures (clouds, mist, lantern glow). No image files.
import { CanvasTexture, SRGBColorSpace } from "three";
import { hash } from "../../utils/noise";

export function blobTexture(w: number, h: number, blobs: number, seed: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  for (let i = 0; i < blobs; i++) {
    const r1 = hash(i, seed), r2 = hash(seed, i * 3.1), r3 = hash(i * 7.7, seed + 1);
    const cx = w * (0.2 + 0.6 * r1), cy = h * (0.45 + 0.25 * (r2 - 0.5)), rad = h * (0.18 + 0.3 * r3);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, "rgba(255,255,255,.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!, g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,240,200,1)");
  g.addColorStop(0.25, "rgba(255,200,120,.55)");
  g.addColorStop(1, "rgba(255,180,90,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c); // left linear on purpose: the additive glow reads brighter, as in the prototype
}
