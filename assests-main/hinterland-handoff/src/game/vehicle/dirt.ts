// Dirt, mud and roof snow on the vehicle (WEATHER.md §2): one shader patch on every body material. Dirt is worked
// out in the vehicle's own space (low panels first, more toward the rear, broken up by splatter noise) so it moves
// with the vehicle and never covers glass or lights. The state lives here; Dirt.tsx drives it each frame.
import { Color, Material, Matrix3, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { live } from "../../state/live";

export const dirt = { dirt: 0.05, mud: 0, snow: 0 };
const U = { uDirt: { value: 0.05 }, uMud: { value: new Color("#B5A27E") }, uRoofSnow: { value: 0 }, uCarPos: { value: new Vector3() }, uInvRot: { value: new Matrix3() } };
export const DUST = new Color("#B5A27E"), MUD = new Color("#5B4632");

function patch(sh: { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string }) {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = "uniform vec3 uCarPos; uniform mat3 uInvRot; varying vec3 vRel; varying vec3 vWnD;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vRel = uInvRot*((modelMatrix*vec4(transformed, 1.0)).xyz - uCarPos); vWnD = normalize(mat3(modelMatrix)*objectNormal);");
  sh.fragmentShader = "uniform float uDirt, uRoofSnow; uniform vec3 uMud; varying vec3 vRel; varying vec3 vWnD;\nfloat dh(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }\nfloat dn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(mix(dh(i),dh(i+vec3(1,0,0)),f.x),mix(dh(i+vec3(0,1,0)),dh(i+vec3(1,1,0)),f.x),f.y),mix(mix(dh(i+vec3(0,0,1)),dh(i+vec3(1,0,1)),f.x),mix(dh(i+vec3(0,1,1)),dh(i+vec3(1,1,1)),f.x),f.y),f.z); }\n" +
    sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float low = 1.0 - smoothstep(0.35, 1.7, vRel.y);
      float splat = dn(vRel*7.0)*0.6 + dn(vRel*19.0)*0.4;
      float back = smoothstep(-0.5, 2.2, vRel.z);
      float d = clamp(uDirt*(low*1.25 + back*0.35 + 0.15) - (1.0 - splat)*0.55, 0.0, 1.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, uMud, d*0.92);
      float cap = smoothstep(0.65, 0.9, vWnD.y)*smoothstep(1.3, 1.9, vRel.y)*uRoofSnow*(0.75 + 0.25*dn(vRel*9.0));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.97, 1.0), clamp(cap, 0.0, 1.0));`);
}

/**
 * Make a vehicle's body take dirt. Materials in `own` (the vehicle's own paint) are patched in place so the
 * Garage can still recolour them; every other material is cloned first (the kit shares them with houses and props).
 * Glass and lights are left alone.
 */
export function dirtify(root: Object3D, own: Material[] = []) {
  const done = new Map<Material, Material>();
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const src = m.material as MeshStandardMaterial;
    if (!src.isMeshStandardMaterial || src.transparent || (src.emissiveIntensity > 0 && src.emissive.r + src.emissive.g + src.emissive.b > 0.3)) return;
    if (!done.has(src)) {
      const mat = own.includes(src) ? src : src.clone();
      mat.onBeforeCompile = patch;
      mat.customProgramCacheKey = () => "dirt";
      mat.needsUpdate = true;
      done.set(src, mat);
    }
    m.material = done.get(src)!;
  });
}

const rot = new Matrix3();
/** Per-frame: dirt builds on the ground (mud twice as fast when wet), washes off in water and heavy rain; roof snow builds in snowfall. */
export function stepDirt(dt: number, surf: "water" | "meadow" | "path" | "snow" | "air") {
  const w = live.wx, car = live.car, sp = Math.abs(car.speed), wet = w.wet > 0.35;
  if (surf === "water") dirt.dirt = Math.max(0, dirt.dirt - dt * 0.22 * Math.min(1, sp / 2 + 0.3));
  else if (surf === "meadow" || surf === "path") {
    dirt.dirt = Math.min(1, dirt.dirt + dt * (wet ? 0.016 : 0.004) * (surf === "meadow" ? 1.6 : 1) * sp / 8);
    dirt.mud += ((wet ? 1 : 0) - dirt.mud) * (1 - Math.exp(-dt * (wet ? 0.4 : 0.05)));
  }
  if (w.rain > 0.5 && sp < 3) dirt.dirt = Math.max(0, dirt.dirt - dt * 0.012 * w.rain);
  dirt.snow = Math.max(0, Math.min(1, dirt.snow + (w.snow > 0.4 ? dt * 0.03 : -dt * 0.012) + (surf === "snow" && sp > 4 ? dt * 0.004 : 0)));
  U.uDirt.value = dirt.dirt; U.uRoofSnow.value = dirt.snow;
  U.uMud.value.copy(DUST).lerp(MUD, dirt.mud);
  U.uCarPos.value.set(car.x, car.y, car.z);
  // world → vehicle space: rotate by −yaw about y (heading is −z at yaw 0)
  const c = Math.cos(car.yaw), s = Math.sin(car.yaw);
  rot.set(c, 0, -s, 0, 1, 0, s, 0, c);
  U.uInvRot.value.copy(rot);
}
