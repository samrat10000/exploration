// Valley water (river + plunge pool share one plane) and the still tarn above Highfall.
import { useEffect, useMemo } from "react";
import { Color, ShaderMaterial, Vector2 } from "three";
import { FOG_GLSL, NOISE_GLSL, OUTPUT_GLSL, U } from "../shaders";
import { TARN, WATER } from "./height";

function waterMaterial(opts: { calm: number; center?: Vector2; radius?: number }) {
  return new ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: U.uTime, uSky: U.uSky, uSunC: U.uSunC, uSunDir: U.uSunDir, uFogC: U.uFogC, uFogD: U.uFogD,
      uDeep: { value: new Color("#1F4A52") },
      uCalm: { value: opts.calm },
      uCenter: { value: opts.center ?? new Vector2() },
      uRadius: { value: opts.radius ?? 0 },
    },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; uniform float uTime, uCalm, uRadius; uniform vec2 uCenter; uniform vec3 uDeep, uSky, uSunC, uSunDir;
      ${NOISE_GLSL} ${FOG_GLSL}
      float wav(vec2 p){ float t = uTime*uCalm; return vn(p + t*vec2(0.06, 0.16)) + 0.5*vn(p*2.3 - t*vec2(0.12, 0.05)); }
      void main(){
        vec2 p = vW.xz*0.18; float e = 0.08;
        float a = wav(p), dx = wav(p+vec2(e,0.0)) - a, dz = wav(p+vec2(0.0,e)) - a;
        vec3 N = normalize(vec3(-dx*2.2*uCalm, 1.0, -dz*2.2*uCalm));
        vec3 V = normalize(cameraPosition - vW);
        float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
        vec3 col = mix(uDeep, uSky, 0.12 + fr*0.78);
        float sp = pow(max(dot(reflect(-V, N), uSunDir), 0.0), 140.0);
        col += uSunC*sp*2.2;
        col = applyFog(col, vW);
        float alpha = 0.9;
        if (uRadius > 0.0) alpha *= 1.0 - smoothstep(uRadius - 1.5, uRadius, length(vW.xz - uCenter));
        gl_FragColor = vec4(col, alpha);
        ${OUTPUT_GLSL}
      }`,
  });
}

export function Water() {
  const valley = useMemo(() => waterMaterial({ calm: 1 }), []);
  // the tarn is nearly still: slower, flatter ripples so it mirrors the sky
  const tarn = useMemo(() => waterMaterial({ calm: 0.45, center: new Vector2(TARN.x, TARN.z), radius: TARN.radius }), []);
  useEffect(() => () => { valley.dispose(); tarn.dispose(); }, [valley, tarn]);

  return (
    <>
      <mesh material={valley} position-y={WATER} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[700, 700, 1, 1]} />
      </mesh>
      <mesh material={tarn} position={[TARN.x, TARN.level, TARN.z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[TARN.radius, 48]} />
      </mesh>
    </>
  );
}
