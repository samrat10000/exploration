// Cargo crate (assets.html → CRATE). Planks with gaps, corner battens, diagonal braces; tones seeded.
import { Group } from "three";
import { M, add, box, mergeByMaterial, rng } from "../../art/kit";

export function buildCrate(w: number, h: number, d: number, seed = 1) {
  const g = new Group(), rnd = rng(seed);
  const tones = ["#C9A56C", "#BE9960", "#D3B07A", "#B88F58"], plank = () => M(tones[Math.floor(rnd() * tones.length)], 0.85);
  const batten = M("#8C6A42", 0.85), t = 0.022, gap = 0.012;
  const rows = Math.max(2, Math.round(h / 0.13)), ph = (h - gap * (rows - 1)) / rows;
  for (let i = 0; i < rows; i++) {
    const y = -h / 2 + ph / 2 + i * (ph + gap);
    add(g, box(w, ph, t), plank(), [0, y, d / 2 - t / 2]); add(g, box(w, ph, t), plank(), [0, y, -d / 2 + t / 2]);
    add(g, box(t, ph, d - t * 2), plank(), [w / 2 - t / 2, y, 0]); add(g, box(t, ph, d - t * 2), plank(), [-w / 2 + t / 2, y, 0]);
  }
  const tops = Math.max(2, Math.round(w / 0.14)), tw = (w - gap * (tops - 1)) / tops;
  for (let i = 0; i < tops; i++) add(g, box(tw, t, d), plank(), [-w / 2 + tw / 2 + i * (tw + gap), h / 2 - t / 2, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, box(0.05, h + 0.01, 0.05), batten, [sx * (w / 2 - 0.015), 0, sz * (d / 2 - 0.015)]);
  for (const sz of [-1, 1]) { const diag = Math.hypot(w, h) * 0.92; add(g, box(diag, 0.055, 0.02), batten, [0, 0, sz * (d / 2 + 0.006)], [0, 0, Math.atan2(h, w) * sz]); }
  return g;
}

/** A game crate: the builder merged to a few draw calls (collider stays a CRATE cube). */
export const crateModel = (size: number, seed: number) => mergeByMaterial(buildCrate(size, size, size, seed));
