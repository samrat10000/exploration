// Cozy clouds (SKY_SOUND §1, kit/clouds.js): every cloud is a cluster of soft instanced puffs, each shaded like a
// small sphere by the sun or moon: warm bright tops, cool undersides, a silver lining when backlit, noisy
// fluffy edges, a slow billow. Sorted back-to-front every 0.35 s. Storms darken them, lightning lights them.
// API: const set = makeCloudSet(); set.cumulus(...) / cumulonimbus / sea; then <CloudSet set={set} />.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from "three";
import { live } from "../../state/live";
import { rng } from "../art/kit";
import { zenith } from "./timeOfDay";

export interface CloudOpts { dark?: number; tall?: number }
export interface CloudSetApi {
  /** x, y, z, radius, density, seed, storm (0..1), lift (0 base .. 1 top) */
  puff(x: number, y: number, z: number, r: number, dens: number, seed: number, storm: number, lift: number): void;
  cumulus(x: number, y: number, z: number, size: number, seed?: number, o?: CloudOpts): void;
  cumulonimbus(x: number, y: number, z: number, size: number, seed?: number): void;
  sea(x0: number, x1: number, z0: number, z1: number, y: number, step?: number, seed?: number): void;
  count(): number;
  readonly pos: number[]; readonly rad: number[]; readonly data: number[];
}

export function makeCloudSet(): CloudSetApi {
  const pos: number[] = [], rad: number[] = [], data: number[] = [];
  const puff: CloudSetApi["puff"] = (x, y, z, r, dens, seed, storm, lift) => { pos.push(x, y, z); rad.push(r); data.push(dens, seed, storm, lift); };
  const api: CloudSetApi = {
    pos, rad, data, puff, count: () => rad.length,
    // one cumulus: flat base, rounded towers, smaller puffs on top
    cumulus(x, y, z, size, seed = 1, o = {}) {
      const R = rng(Math.floor(seed * 997) + 3), storm = o.dark || 0, tall = o.tall || 1, nb = 6 + Math.floor(size / 14);
      for (let i = 0; i < nb; i++) { const a = R() * 6.28, rr = Math.sqrt(R()) * size * 0.85; puff(x + Math.cos(a) * rr, y + R() * size * 0.06, z + Math.sin(a) * rr * 0.75, size * (0.32 + R() * 0.22), 0.9, R(), storm, 0.05); }
      const towers = 2 + Math.floor(R() * 3);
      for (let t = 0; t < towers; t++) {
        const ta = R() * 6.28, tr = R() * size * 0.45, tx = x + Math.cos(ta) * tr, tz = z + Math.sin(ta) * tr * 0.75, th = size * (0.5 + R() * 0.6) * tall, levels = 3 + Math.floor((th / size) * 4);
        for (let k = 0; k < levels; k++) {
          const f = k / (levels - 1), rs = size * (0.42 - f * 0.2) * (0.8 + R() * 0.4);
          for (let j = 0; j < 2 + Math.floor(R() * 2); j++) { const ja = R() * 6.28, jr = rs * 0.5 * R(); puff(tx + Math.cos(ja) * jr, y + size * 0.12 + f * th, tz + Math.sin(ja) * jr * 0.75, rs, 0.95, R(), storm, 0.3 + f * 0.7); }
        }
      }
    },
    // flat-topped storm tower with an anvil
    cumulonimbus(x, y, z, size, seed = 1) {
      api.cumulus(x, y, z, size, seed, { dark: 0.7, tall: 2.6 });
      const R = rng(seed * 31 + 7);
      for (let i = 0; i < 26; i++) { const a = R() * 6.28, rr = Math.sqrt(R()) * size * 1.4; puff(x + Math.cos(a) * rr, y + size * 2.9 + R() * size * 0.2, z + Math.sin(a) * rr * 0.8, size * (0.35 + R() * 0.2), 0.9, R(), 0.45, 0.9); }
    },
    // a lumpy carpet of cloud tops
    sea(x0, x1, z0, z1, y, step = 70, seed = 5) {
      const R = rng(seed);
      for (let z = z0; z < z1; z += step * 0.8) for (let x = x0; x < x1; x += step) {
        const jx = x + (R() - 0.5) * step, jz = z + (R() - 0.5) * step * 0.8, big = R();
        puff(jx, y + R() * 6, jz, step * (0.75 + R() * 0.5), 0.95, R(), 0, 0.2);
        if (big > 0.55) puff(jx + (R() - 0.5) * 20, y + 10 + R() * 14, jz + (R() - 0.5) * 20, step * (0.45 + R() * 0.35), 0.95, R(), 0, 0.55 + R() * 0.3);
        if (big > 0.9) puff(jx, y + 26 + R() * 14, jz, step * (0.35 + R() * 0.2), 0.95, R(), 0, 0.9);
      }
    },
  };
  return api;
}

const VERT = /* glsl */ `attribute vec4 aPuff; varying vec2 vUv; varying vec4 vP; uniform float uTime;
  #include <fog_pars_vertex>
  void main(){
    vUv = uv*2.0 - 1.0; vP = aPuff;
    vec3 c = instanceMatrix[3].xyz; float s = length(instanceMatrix[0].xyz);
    float b = 1.0 + 0.05*sin(uTime*0.25 + aPuff.y*31.0) + 0.03*sin(uTime*0.11 + aPuff.y*7.0);
    vec4 mvPosition = modelViewMatrix*vec4(c, 1.0);
    mvPosition.xy += position.xy*s*b;
    gl_Position = projectionMatrix*mvPosition;
    #include <fog_vertex>
  }`;
const FRAG = /* glsl */ `uniform vec3 uSunV, uLit, uShade, uRim; uniform float uTime, uFlash, uDark; varying vec2 vUv; varying vec4 vP;
  #include <fog_pars_fragment>
  float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0 - 2.0*f); return mix(mix(hh(i), hh(i + vec2(1, 0)), u.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), u.x), u.y); }
  void main(){
    vec2 q = vUv; float seed = vP.y*17.0;
    float e = vn(q*2.2 + seed + uTime*0.02)*0.55 + vn(q*5.0 - seed + uTime*0.03)*0.3 + vn(q*11.0 + seed)*0.15;
    float r = length(q) + (e - 0.5)*0.55;
    float a = smoothstep(1.0, 0.35, r);
    if (a < 0.004) discard;
    float rr = clamp(length(q), 0.0, 1.0);
    vec3 n = normalize(vec3(q*0.9, sqrt(max(0.05, 1.0 - rr*rr))));
    float l = dot(n, normalize(uSunV));
    float lit = smoothstep(-0.45, 0.9, l)*(0.55 + 0.45*vP.w) + vP.w*0.15;
    float dens = vn(q*3.0 + seed*2.0);
    vec3 col = mix(uShade, uLit, clamp(lit - dens*0.12, 0.0, 1.0));
    col += uRim*pow(1.0 - n.z, 2.5)*max(0.0, -uSunV.z)*1.1*(1.0 - vP.z);
    col = mix(col, col*vec3(0.42, 0.45, 0.52), max(vP.z, uDark*0.6));
    col += vec3(0.75, 0.82, 1.0)*uFlash*(0.35 + 0.65*(1.0 - lit))*(0.3 + vP.z);
    gl_FragColor = vec4(col, a*vP.x);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

const white = new Color(1, 1, 1);

/** Renders one cloud set. `drift` slides the whole set sideways (m/s) and wraps it every `wrap` metres (the set is drawn twice, so the join never shows). */
export function CloudSet({ set, drift = 0, wrap = 0, flash, max, show }: { set: CloudSetApi; drift?: number; wrap?: number; flash?: () => number; max?: number; show?: () => boolean }) {
  const { mesh, mat, geo, src, order, key, aPuff } = useMemo(() => {
    const copies = wrap ? 2 : 1, n = Math.min(set.count() * copies, max ?? 1e9), one = set.count();
    const geo = new PlaneGeometry(1, 1), aPuff = new Float32Array(n * 4), d = new Object3D();
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: UniformsUtils.merge([UniformsLib.fog, { uSunV: { value: new Vector3() }, uLit: { value: new Color() }, uShade: { value: new Color() }, uRim: { value: new Color() }, uTime: { value: 0 }, uFlash: { value: 0 }, uDark: { value: 0 } }]),
      vertexShader: VERT, fragmentShader: FRAG,
    });
    const mesh = new InstancedMesh(geo, mat, Math.max(1, n)); mesh.count = n; mesh.frustumCulled = false; mesh.renderOrder = 2;
    for (let i = 0; i < n; i++) {
      const j = i % one, off = i >= one ? wrap : 0;
      d.position.set(set.pos[j * 3] + off, set.pos[j * 3 + 1], set.pos[j * 3 + 2]); d.scale.setScalar(set.rad[j] * 2); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
      aPuff.set(set.data.slice(j * 4, j * 4 + 4), i * 4);
    }
    geo.setAttribute("aPuff", new InstancedBufferAttribute(aPuff, 4));
    const src = { m: mesh.instanceMatrix.array.slice(0, n * 16) as Float32Array, a: aPuff.slice(0, n * 4) };
    return { mesh, mat, geo, src, order: new Uint32Array(n).map((_, i) => i), key: new Float32Array(n), aPuff };
  }, [set, wrap, max]);
  const sortT = useMemo(() => ({ t: 0 }), []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); mesh.dispose(); }, [geo, mat, mesh]);

  useFrame(({ camera, scene }, dt) => {
    mesh.visible = show ? show() : true;
    const u = mat.uniforms, env = live.env, day = 1 - env.stars;
    u.uTime.value += dt; u.uFlash.value = flash ? flash() : 0; u.uDark.value = live.wx.dark;
    mesh.position.x = drift && wrap ? -((live.clock * drift) % wrap) : 0;
    mesh.updateMatrixWorld(); camera.updateMatrixWorld();
    u.uSunV.value.copy(env.sunDir).transformDirection(camera.matrixWorldInverse);
    // warm tops and lavender shade at golden hour, moon-silver and deep blue at night
    u.uLit.value.copy(env.sunC).lerp(white, 0.35 * day).multiplyScalar(0.55 + 0.55 * day);
    u.uShade.value.copy(env.hemiSky).lerp(zenith, 0.35).multiplyScalar(0.5 + 0.3 * day);
    u.uRim.value.copy(env.sunC).multiplyScalar(0.6 + 0.6 * day);
    if (scene.fog) { u.fogColor.value.copy(scene.fog.color); u.fogDensity.value = (scene.fog as unknown as { density: number }).density; }
    sortT.t -= dt;
    if (sortT.t <= 0 && mesh.count) {
      sortT.t = 0.35;
      const n = mesh.count, cx = camera.position.x - mesh.position.x, cy = camera.position.y, cz = camera.position.z;
      for (let i = 0; i < n; i++) { const dx = src.m[i * 16 + 12] - cx, dy = src.m[i * 16 + 13] - cy, dz = src.m[i * 16 + 14] - cz; key[i] = dx * dx + dy * dy + dz * dz; }
      order.sort((a, b) => key[b] - key[a]);
      const M = mesh.instanceMatrix.array as Float32Array;
      for (let j = 0; j < n; j++) { const i = order[j]; M.set(src.m.subarray(i * 16, i * 16 + 16), j * 16); aPuff.set(src.a.subarray(i * 4, i * 4 + 4), j * 4); }
      mesh.instanceMatrix.needsUpdate = true; geo.attributes.aPuff.needsUpdate = true;
    }
  });
  return <primitive object={mesh} />;
}
