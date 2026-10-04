// Highfall: a strip that hugs the cliff face, plus soft mist over the plunge pool.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, ShaderMaterial, Sprite, SpriteMaterial } from "three";
import { live } from "../../state/live";
import { hash, mix } from "../../utils/noise";
import { blobTexture } from "../environment/textures";
import { FOG_GLSL, NOISE_GLSL, OUTPUT_GLSL, U } from "../shaders";
import { FALLS, POOL, WATER, height } from "./height";

function fallsGeometry() {
  const ROWS = 16, W = 9, verts: number[] = [], uvs: number[] = [], idx: number[] = [];
  for (let r = 0; r <= ROWS; r++) {
    const t = r / ROWS, z = mix(FALLS.top, FALLS.bottom, t);
    const yL = Math.max(height(FALLS.x - W / 2, z), height(FALLS.x, z), height(FALLS.x + W / 2, z));
    const y = r === ROWS ? WATER + 0.05 : yL + 0.45;
    verts.push(FALLS.x - W / 2, y, z, FALLS.x + W / 2, y, z);
    uvs.push(0, t, 1, t);
    if (r < ROWS) { const i = r * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(verts, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

export function Waterfall() {
  const { geometry, material, mists } = useMemo(() => {
    const material = new ShaderMaterial({
      transparent: true, depthWrite: false, side: DoubleSide,
      uniforms: { uTime: U.uTime, uFogC: U.uFogC, uFogD: U.uFogD, uTint: { value: new Color("#DDEFF0") } },
      vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vW; uniform float uTime; uniform vec3 uTint;
        ${NOISE_GLSL} ${FOG_GLSL}
        void main(){
          float s = vn(vec2(vUv.x*16.0, vUv.y*5.0 - uTime*2.6))*0.65 + vn(vec2(vUv.x*40.0, vUv.y*12.0 - uTime*4.0))*0.35;
          float edge = smoothstep(0.0, 0.18, vUv.x)*smoothstep(1.0, 0.82, vUv.x);
          float foam = smoothstep(0.8, 1.0, vUv.y);
          vec3 col = mix(uTint*0.7, uTint*1.15, s) + foam*0.25;
          float a = edge*(0.45 + 0.5*s + foam*0.3)*smoothstep(0.0, 0.06, vUv.y);
          col = applyFog(col, vW);
          gl_FragColor = vec4(col, a);
          ${OUTPUT_GLSL}
        }`,
    });
    const tex = blobTexture(128, 128, 6, 21);
    const mists = Array.from({ length: 7 }, (_, i) => {
      const m = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.35 }));
      m.position.set(POOL.x + (hash(i, 1) - 0.5) * 10, WATER + 2 + hash(i, 2) * 4, FALLS.bottom + (hash(i, 3) - 0.5) * 6);
      m.scale.setScalar(9 + hash(i, 4) * 6);
      m.userData.p = hash(i, 5) * 6.28;
      return m;
    });
    return { geometry: fallsGeometry(), material, mists };
  }, []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame(() => {
    const clock = live.clock;
    for (const m of mists) {
      m.material.opacity = 0.22 + 0.12 * Math.sin(clock * 0.7 + m.userData.p);
      m.position.y += Math.sin(clock * 0.5 + m.userData.p) * 0.004;
    }
  });

  return (
    <>
      <mesh geometry={geometry} material={material} />
      {mists.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
