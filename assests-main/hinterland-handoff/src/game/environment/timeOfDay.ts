// Time-of-day palettes (prototype SKY section). t runs 0..5: dawn, morning, day, golden, sunset, night (TIME.md).
// Everything interpolates; nothing is ever switched abruptly.
import { Color, MathUtils } from "three";
import { live } from "../../state/live";
import { clamp, mix, smooth } from "../../utils/noise";

interface Palette { el: number; az: number; sun: string; si: number; zen: string; hor: string; hs: string; hg: string; hi: number }
// 2.1: sun warmer, sky fill (hs) and ground bounce (hg) cooler so shadows read blue, zenith deeper.
const RAW: Palette[] = [
  { el: 5,  az: 20,  sun: "#FFAE84", si: 1.15, zen: "#2E4670", hor: "#EDB9A2", hs: "#8597BF", hg: "#3F4658", hi: 0.55 }, // dawn
  { el: 18, az: 60,  sun: "#FFDDB0", si: 1.45, zen: "#3A6AA6", hor: "#CFDFE8", hs: "#9DB6D8", hg: "#435064", hi: 0.62 }, // morning
  { el: 46, az: 110, sun: "#FFF0D6", si: 1.6,  zen: "#2C62AE", hor: "#CDE1EE", hs: "#A6C0E0", hg: "#46526A", hi: 0.64 }, // day
  { el: 9,  az: 160, sun: "#FFA457", si: 1.5,  zen: "#3A5385", hor: "#F1C496", hs: "#8FA2C6", hg: "#45475A", hi: 0.55 }, // golden
  { el: 2,  az: 175, sun: "#FF8048", si: 1.15, zen: "#2E3A66", hor: "#F2A07C", hs: "#8487B4", hg: "#433E55", hi: 0.46 }, // sunset (J2's summit)
  // night: the moon takes the sun's place; hemisphere lifted and blue so silhouettes always read
  { el: 40, az: 300, sun: "#A9BCF0", si: 0.55, zen: "#050A18", hor: "#1B2846", hs: "#34477A", hg: "#141420", hi: 0.5 },
];
// three's ColorManagement converts hex (sRGB) to linear on construction, matching the prototype's lin().
const PALETTES = RAW.map((p) => ({
  ...p, sunC: new Color(p.sun), zenC: new Color(p.zen), horC: new Color(p.hor), hsC: new Color(p.hs), hgC: new Color(p.hg),
}));

export const TOD = { menu: 2.85, playStart: 1, playMax: 2.95, /** real seconds from morning to golden */ warmSeconds: (18 * 60) / 1.95 };

export const zenith = new Color();

/** Writes the interpolated palette into live.env (+ zenith). Lights and shaders read from there. */
export function applyTimeOfDay(t: number) {
  t = clamp(t, 0, PALETTES.length - 1);
  const i = Math.min(PALETTES.length - 2, Math.floor(t)), f = smooth(0, 1, t - i), a = PALETTES[i], b = PALETTES[i + 1];
  const el = MathUtils.degToRad(mix(a.el, b.el, f)), az = MathUtils.degToRad(mix(a.az, b.az, f));
  const e = live.env;
  e.sunDir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
  e.sunC.copy(a.sunC).lerp(b.sunC, f);
  e.horC.copy(a.horC).lerp(b.horC, f);
  zenith.copy(a.zenC).lerp(b.zenC, f);
  e.sunI = mix(a.si, b.si, f);
  e.hemiSky.copy(a.hsC).lerp(b.hsC, f);
  e.hemiGround.copy(a.hgC).lerp(b.hgC, f);
  e.hemiI = mix(a.hi, b.hi, f);
  e.fogC.copy(e.horC).multiplyScalar(0.94);
  // stars come in through sunset to night; exposure 1.0, golden 1.08, night 1.3 (lifted so night stays readable)
  e.stars = smooth(3.9, 5, t);
  e.exp = t < 3 ? 1 + 0.08 * smooth(2, 3, t) : t < 4 ? 1.08 : mix(1.08, 1.3, smooth(4, 5, t));
}
