// Shared GLSL + uniforms. Every custom material references the SAME uniform objects,
// so time, fog and sun are updated once per frame (in Sky) instead of per material.
import { Color, ShaderChunk, Vector3 } from "three";

export const U = {
  uTime: { value: 0 },
  uFogC: { value: new Color() },
  uFogD: { value: 0.0028 },
  uSunC: { value: new Color() },
  uSunDir: { value: new Vector3(0, 1, 0) },
  /** horizon colour, used as the sky reflection on water */
  uSky: { value: new Color() },
  /** weather (Weather.tsx): wet ground, settled snow, cloud shadows */
  uWet: { value: 0 },
  uSnowC: { value: 0 },
  uCloudSh: { value: 0 },
};

/** One shader patch for ground-like standard materials: cloud shadows, wet darkening + shine, settled snow on upward faces. */
export function patchGround(sh: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) {
  Object.assign(sh.uniforms, { uWet: U.uWet, uSnowC: U.uSnowC, uCloudSh: U.uCloudSh, uTime: U.uTime });
  sh.vertexShader = "varying vec3 vWp; varying vec3 vWn;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vec4 wpq = vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n wpq = instanceMatrix*wpq;\n #endif\n vWp = (modelMatrix*wpq).xyz; vWn = normalize(mat3(modelMatrix)*objectNormal);");
  sh.fragmentShader = "uniform float uWet, uSnowC, uCloudSh, uTime; varying vec3 vWp; varying vec3 vWn;\nfloat wh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }\nfloat wn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(wh(i),wh(i+vec2(1,0)),u.x),mix(wh(i+vec2(0,1)),wh(i+vec2(1,1)),u.x),u.y); }\n" +
    sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float cs = wn(vWp.xz*0.004 + vec2(uTime*0.012, uTime*0.006))*0.65 + wn(vWp.xz*0.011 + vec2(uTime*0.02, 0.0))*0.35;
      diffuseColor.rgb *= 1.0 - uCloudSh*smoothstep(0.48, 0.62, cs);
      diffuseColor.rgb *= 1.0 - 0.28*uWet;
      float sn = smoothstep(0.72, 0.95, vWn.y)*smoothstep(0.25, 0.6, wn(vWp.xz*0.35)*0.5 + uSnowC*0.8);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), sn*uSnowC);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.32, uWet*smoothstep(0.6, 0.95, vWn.y));");
}

export const NOISE_GLSL = /* glsl */ `
  float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hh(i), hh(i+vec2(1,0)), u.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), u.x), u.y); }`;

/** Light distance haze between 60 and 200 m, on top of the exponential fog (2.1). */
const HAZE = 0.2;
ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  float fogFactor = max(1.0 - exp(-fogDensity*fogDensity*vFogDepth*vFogDepth), smoothstep(60.0, 200.0, vFogDepth)*${HAZE.toFixed(2)});
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;

export const FOG_GLSL = /* glsl */ `
  #define HAZE ${HAZE.toFixed(2)}
  uniform vec3 uFogC; uniform float uFogD;
  vec3 applyFog(vec3 col, vec3 w){ float d = length(cameraPosition - w); float f = max(1.0 - exp(-d*d*uFogD*uFogD), smoothstep(60.0, 200.0, d)*HAZE); return mix(col, uFogC, f); }`;

/** Close a custom fragment shader the same way three's own materials do. */
export const OUTPUT_GLSL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`;
