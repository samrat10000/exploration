// Ground colour: ONE function used by the terrain mesh (vertex colours) and baked into a texture
// for the grass, so every blade's base is exactly the colour of the soil it grows from.
import { Color, DataTexture, FloatType, NearestFilter, RedFormat, RGBAFormat, LinearFilter, UnsignedByteType } from "three";
import { clamp, distToSeg, fbm, smooth } from "../../utils/noise";
import { GRID, START, VP, activeGround, gridH, heightGrid, trailInfo, valleyGround, waterLevel, type GroundSample } from "./height";
import { treesNear } from "./props";

const C = {
  sage: new Color("#7C8F55"), olive: new Color("#6F8545"), straw: new Color("#A49A62"),
  dirt: new Color("#8A7556"), rock: new Color("#7E786F"), rock2: new Color("#5E5B57"),
  snow: new Color("#EEF1F3"), mud: new Color("#7C6B52"), track: new Color("#8C7759"),
};
const oliveLum = 0.2126 * C.olive.r + 0.7152 * C.olive.g + 0.0722 * C.olive.b;
const t = new Color(), u = new Color();

/** The worn route the first drivers took from the valley floor toward the light on the ridge. */
export const ROUTE = { ax: START.x, az: START.z - 8, bx: VP.x - 6, bz: VP.z + 18 };
export const routeDist = (x: number, z: number) => distToSeg(x, z, ROUTE.ax, ROUTE.az, ROUTE.bx, ROUTE.bz);

export type { GroundSample };
const out: GroundSample = { color: new Color(), grass: 1 };

/**
 * Ground albedo (linear) and how grassy it is (0..1) at a point.
 * `ny` is the surface normal's y (1 = flat).
 */
function valleyGroundAt(x: number, z: number, y: number, ny: number): GroundSample {
  const c = out.color;
  const n1 = fbm(x * 0.012, z * 0.012, 3), n2 = fbm(x * 0.045 + 7, z * 0.045, 3), n3 = fbm(x * 0.15 + 3, z * 0.15, 2);
  // macro meadow: olive ↔ sage, drifting to straw in dry patches and with altitude
  c.copy(C.olive).lerp(C.sage, smooth(-0.3, 0.3, n1));
  const dry = clamp(smooth(0.1, 0.45, n2) * 0.75 + smooth(16, 42, y) * 0.6, 0, 1);
  c.lerp(C.straw, dry * 0.65);
  // small detail so nothing is a single flat colour
  c.multiplyScalar(0.93 + n3 * 0.14);
  // a little toward olive everywhere: nothing neon
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  c.lerp(u.copy(C.olive).multiplyScalar(lum / oliveLum), 0.2);
  let grass = 1 - dry * 0.45;

  // dirt patches
  const dp = smooth(0.28, 0.42, fbm(x * 0.07 + 31, z * 0.07 - 9, 3));
  c.lerp(C.dirt, dp * 0.7);
  grass *= 1 - dp * 0.85;

  // rock on steep ground
  t.copy(C.rock).lerp(C.rock2, clamp(0.5 + n3, 0, 1));
  const rk = smooth(0.86, 0.7, ny + n1 * 0.04);
  c.lerp(t, rk);
  grass *= 1 - rk;

  // mud at every shoreline
  const wl = waterLevel(x, z), md = smooth(wl + 1.6, wl + 0.2, y);
  c.lerp(C.mud, md);
  grass *= 1 - smooth(wl + 1.2, wl + 0.5, y);

  // snow high up
  const sn = smooth(74, 86, y + n1 * 9) * smooth(0.55, 0.72, ny);
  c.lerp(C.snow, sn);
  grass *= 1 - smooth(48, 56, y) - sn;

  // the worn route toward the ridge, and the hidden track
  const rw = routeDist(x, z) < 6 ? (1 - smooth(1.2, 4.5, routeDist(x, z))) * smooth(0, 14, Math.hypot(x - ROUTE.ax, z - ROUTE.az)) : 0;
  const tw = x > -112 && x < -45 && z > -125 && z < -45 ? 1 - smooth(2.5, 6, trailInfo(x, z).d) : 0;
  c.lerp(C.track, Math.max(rw * 0.45, tw * 0.55));
  grass *= 1 - Math.max(rw * 0.7, tw);

  // fake ambient occlusion: darker, bare-ish soil under tree clusters
  let ao = 0;
  for (const tr of treesNear(x, z)) {
    const r = 3.4 * tr.s, dx = x - tr.x, dz = z - tr.z, d2 = dx * dx + dz * dz;
    if (d2 < 9 * r * r) ao += Math.exp(-d2 / (r * r));
  }
  ao = Math.min(1, ao);
  c.multiplyScalar(1 - 0.38 * ao);
  grass *= 1 - 0.55 * ao;

  out.grass = clamp(grass, 0, 1);
  return out;
}

valleyGround.groundAt = valleyGroundAt;
/** Ground colour of the active region. */
export const groundAt = (x: number, z: number, y: number, ny: number) => (activeGround().groundAt ?? valleyGroundAt)(x, z, y, ny);

/* ---------- textures for the grass shader (same grid as physics) ---------- */
const texCache = new Map<string, { height: DataTexture; ground: DataTexture }>();

/** Height (R32F, nearest: the shader interpolates itself) + ground colour/grassiness (RGBA8, sRGB-encoded rgb). */
export function groundTextures() {
  const id = activeGround().id, cached = texCache.get(id);
  if (cached) return cached;
  const { seg } = GRID, W = seg + 1, step = GRID.size / seg, g = heightGrid();
  const height = new DataTexture(Float32Array.from(g), W, W, RedFormat, FloatType);
  height.magFilter = height.minFilter = NearestFilter;
  height.needsUpdate = true;
  const rgba = new Uint8Array(W * W * 4), e = 1.5;
  const enc = (v: number) => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
  for (let r = 0; r < W; r++)
    for (let c = 0; c < W; c++) {
      const x = -GRID.size / 2 + c * step, z = -GRID.size / 2 + r * step;
      const hx = gridH(x + e, z) - gridH(x - e, z), hz = gridH(x, z + e) - gridH(x, z - e);
      const s = groundAt(x, z, g[r * W + c], (2 * e) / Math.hypot(hx, 2 * e, hz)), i = (r * W + c) * 4;
      rgba[i] = enc(s.color.r); rgba[i + 1] = enc(s.color.g); rgba[i + 2] = enc(s.color.b);
      rgba[i + 3] = Math.round(255 * s.grass);
    }
  const ground = new DataTexture(rgba, W, W, RGBAFormat, UnsignedByteType);
  ground.magFilter = ground.minFilter = LinearFilter;
  ground.needsUpdate = true;
  const tex = { height, ground };
  texCache.set(id, tex);
  return tex;
}
