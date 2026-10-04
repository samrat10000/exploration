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
};

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
