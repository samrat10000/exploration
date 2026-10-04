// The cloud band: from below a soft grey ceiling wrapped round the mountain, from above a sea
// of cloud catching the low sun. Plus light snow on the last turn, drifting with the wind.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, Mesh, Object3D, PlaneGeometry, Points, ShaderMaterial } from "three";
import { C, VC, mixC, paintFaces } from "../../art/kit";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { hash, smooth } from "../../../utils/noise";
import { FOG_GLSL, NOISE_GLSL, OUTPUT_GLSL, U } from "../../shaders";
import { FEATURES, kettleGround, pointAt } from "./kettle";

export const CLOUD_TOP = pointAt(FEATURES.cloudTop).h - 3;

function layerMaterial(density: number, dark: number) {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: { uTime: U.uTime, uSunC: U.uSunC, uSunDir: U.uSunDir, uFogC: U.uFogC, uFogD: U.uFogD, uDensity: { value: density }, uDark: { value: dark }, uShade: { value: new Color("#8C93A3") } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; uniform float uTime, uDensity, uDark; uniform vec3 uSunC, uSunDir, uShade;
      ${NOISE_GLSL} ${FOG_GLSL}
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a*vn(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
      void main(){
        vec2 p = vW.xz*0.011 + vec2(uTime*0.006, uTime*0.003);
        float d = fbm(p) + 0.35*fbm(p*3.1 - uTime*0.01);
        float a = smoothstep(0.42 - uDensity*0.2, 0.78, d);
        // seen from above: lit tops; from below: a grey underside
        bool below = cameraPosition.y < vW.y;
        vec3 lit = mix(uShade, vec3(1.0, 0.98, 0.95), 0.55) + uSunC*0.55*(0.5 + 0.5*d);
        vec3 col = below ? uShade*(0.75 - uDark*0.15) + uSunC*0.08 : lit;
        // far away it thins into haze
        float r = length(vW.xz);
        a *= 1.0 - smoothstep(900.0, 1300.0, r);
        col = applyFog(col, vW);
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.97));
        ${OUTPUT_GLSL}
      }`,
  });
}

export function CloudSea() {
  const layers = useMemo(() => [
    { y: CLOUD_TOP, m: layerMaterial(0.25, 0) },
    { y: CLOUD_TOP - 7, m: layerMaterial(0.55, 0.5) },
    { y: CLOUD_TOP - 18, m: layerMaterial(0.8, 1) },
  ], []);
  const geo = useMemo(() => new PlaneGeometry(2600, 2600, 1, 1).rotateX(-Math.PI / 2), []);
  useEffect(() => () => { geo.dispose(); layers.forEach((l) => l.m.dispose()); }, [geo, layers]);
  return <>{layers.map((l, i) => <mesh key={i} geometry={geo} material={l.m} position-y={l.y} renderOrder={2} />)}</>;
}

/** Light snow on the last turn, in a box that follows the camera. */
export function Snow() {
  const N = 1800, BOX = 46;
  const pts = useMemo(() => {
    const g = new BufferGeometry(), p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i * 3] = (hash(i, 1) - 0.5) * BOX; p[i * 3 + 1] = hash(i, 2) * BOX * 0.6; p[i * 3 + 2] = (hash(i, 3) - 0.5) * BOX; }
    g.setAttribute("position", new Float32BufferAttribute(p, 3));
    const m = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uTime: U.uTime, uCam: { value: [0, 0, 0] }, uWind: { value: [0, 0] }, uAmount: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform float uTime, uAmount; uniform vec3 uCam; uniform vec2 uWind; varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y - uTime*(1.1 + fract(p.x*7.3)*0.6), ${(BOX * 0.6).toFixed(1)});
          p.xz += uWind*(${(BOX * 0.6).toFixed(1)} - p.y)*0.25 + vec2(sin(uTime*0.7 + p.y), cos(uTime*0.5 + p.x))*0.4;
          p.xz = mod(p.xz - uCam.xz + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)} + uCam.xz;
          p.y += uCam.y - 8.0;
          vec4 mv = viewMatrix*vec4(p, 1.0);
          vA = uAmount*(1.0 - smoothstep(10.0, ${(BOX / 2).toFixed(1)}, length(mv.xyz)));
          gl_PointSize = min(6.0, 26.0/max(1.0, -mv.z));
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.15, length(c))*vA*0.85; gl_FragColor = vec4(vec3(1.0), a); }`,
    });
    const points = new Points(g, m);
    points.frustumCulled = false;
    return points;
  }, []);
  useFrame(({ camera }) => {
    const m = pts.material as ShaderMaterial, prog = useStore.getState().progress;
    m.uniforms.uCam.value = [camera.position.x, camera.position.y, camera.position.z];
    m.uniforms.uWind.value = [live.wind.x * 0.4, live.wind.z * 0.4];
    const dw = live.dev.weather;
    m.uniforms.uAmount.value = dw ? (dw === "snow" ? 1 : 0) : smooth(FEATURES.snowFrom - 0.02, FEATURES.snowFrom + 0.03, prog);
    pts.visible = m.uniforms.uAmount.value > 0.01;
  });
  return <primitive object={pts} />;
}

export type { Mesh };

/** Snow drifts across the upper trail: soft mounds that squash flat when something drives through. */
export function Drifts() {
  const { mesh, list } = useMemo(() => {
    const list = Array.from({ length: 16 }, (_, k) => {
      const prog = FEATURES.snowFrom + 0.01 + (k / 16) * (0.97 - FEATURES.snowFrom), p = pointAt(prog);
      const side = (hash(k, 2) - 0.5) * p.half * 1.2, x = p.x + p.dz * side, z = p.z - p.dx * side;
      return { x, z, y: kettleGround.height(x, z), yaw: Math.atan2(p.dx, p.dz), s: 1.6 + hash(k, 3) * 1.4, flat: 1 };
    });
    const geo = paintFaces(new IcosahedronGeometry(1, 2).scale(1, 0.32, 0.6), (_c, n) => mixC(C("#DCE3EA"), C("#F7F9FB"), n.y * 0.7 + 0.3));
    const mesh = new InstancedMesh(geo, VC(0.85), list.length);
    mesh.receiveShadow = true; mesh.castShadow = true;
    return { mesh, list };
  }, []);
  const o = useMemo(() => new Object3D(), []);
  useFrame((_, dt) => {
    const car = live.car;
    list.forEach((d, i) => {
      if (Math.hypot(car.x - d.x, car.z - d.z) < d.s * 0.9) d.flat = Math.max(0.22, d.flat - dt * 2.5); // crushed, and it stays crushed
      o.position.set(d.x, d.y - 0.05, d.z); o.rotation.set(0, d.yaw, 0); o.scale.set(d.s, d.s * d.flat, d.s); o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}
