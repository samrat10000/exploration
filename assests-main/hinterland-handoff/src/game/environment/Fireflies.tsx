// Fireflies (kit/particles.js → FIREFLIES): drifting glow points that come out at golden hour and glow all
// night over the meadow near the vehicle. They live in a box that wraps around the vehicle, so they cost the same everywhere.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { hash, smooth } from "../../utils/noise";
import { U } from "../shaders";
import { height } from "../world/height";

const N = 260, B = 70, wrap = (v: number, m: number) => ((v % m) + m) % m;

export function Fireflies() {
  const quality = useStore((s) => s.settings.quality);
  const { pts, mat, pos } = useMemo(() => {
    const g = new BufferGeometry(), pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) seed[i] = hash(i, 3.7) * 100;
    g.setAttribute("position", new BufferAttribute(pos, 3)); g.setAttribute("aSeed", new BufferAttribute(seed, 1));
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uTime: U.uTime, uOn: { value: 0 } },
      vertexShader: /* glsl */ `attribute float aSeed; uniform float uTime; varying float vB; void main(){
        vec3 p = position; p.x += sin(uTime*0.4 + aSeed)*1.6; p.y += sin(uTime*0.7 + aSeed*1.7)*0.6; p.z += cos(uTime*0.35 + aSeed*0.6)*1.6;
        vB = pow(0.5 + 0.5*sin(uTime*(1.5 + fract(aSeed)*2.0) + aSeed*7.0), 3.0);
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_PointSize = (2.0 + vB*5.0)*260.0/max(1.0, -mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `uniform float uOn; varying float vB; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.85, 1.0, 0.45), uOn*vB*smoothstep(0.5, 0.0, d)); }`,
    });
    const pts = new Points(g, mat); pts.frustumCulled = false;
    return { pts, mat, pos };
  }, []);

  useFrame(() => {
    // the first ones at golden hour (35%), all of them by night
    const on = 0.35 * smooth(2.6, 3.4, live.env.tod) + 0.65 * live.env.stars;
    mat.uniforms.uOn.value += (on - mat.uniforms.uOn.value) * 0.03;
    pts.visible = mat.uniforms.uOn.value > 0.01;
    if (!pts.visible) return;
    const car = live.car;
    pts.geometry.setDrawRange(0, quality === "low" ? 100 : N);
    for (let i = 0; i < N; i++) {
      const x = car.x - B + wrap(hash(i, 11.3) * 2 * B - car.x, 2 * B), z = car.z - B + wrap(hash(7.1, i) * 2 * B - car.z, 2 * B);
      pos[i * 3] = x; pos[i * 3 + 2] = z; pos[i * 3 + 1] = Math.max(height(x, z), 0.8) + 0.4 + hash(i, 5.5) * 2.2;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });
  return <primitive object={pts} />;
}
