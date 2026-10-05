// Meadow grass that travels with the camera. A fixed set of blades lives in a 140 m square that
// wraps around the camera; each blade samples the ground's height and colour in the vertex shader,
// so the field is dense up close, clumped, fades out by 70 m, and costs the same everywhere.
// Built on MeshStandardMaterial (placement injected) so blades get exactly the terrain's lighting,
// tree shadows and fog: a blade's base is indistinguishable from the soil it grows from.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshStandardMaterial, Vector2 } from "three";
import { live } from "../../state/live";
import { QUALITY, useStore } from "../../state/store";
import { hash } from "../../utils/noise";
import { NOISE_GLSL, U } from "../shaders";
import { groundTextures } from "./ground";
import { GRID } from "./height";

const PATCH = 140, NEAR = 40, FAR = 70, SEG = 6;
const f = (n: number) => n.toFixed(1);

export function Grass() {
  const quality = useStore((s) => s.settings.quality);
  const { mesh, uCam, uCar } = useMemo(() => {
    // blade: unit width (x -1..1) and height (y 0..1), 6 segments tapering to a point (the shader curves it)
    const g = new BufferGeometry(), pos: number[] = [], nor: number[] = [], idx: number[] = [];
    for (let r = 0; r <= SEG; r++) { const t = r / SEG, w = r === SEG ? 0.04 : 1 - 0.9 * t * t; pos.push(-w, t, 0, w, t, 0); nor.push(0, 1, 0, 0, 1, 0); if (r) { const a = (r - 1) * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); } }
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    const max = QUALITY.ultra.grass, off = new Float32Array(max * 2), rnd = new Float32Array(max * 4);
    for (let i = 0; i < max; i++) {
      off[i * 2] = hash(i * 0.37, 5.1) * PATCH;
      off[i * 2 + 1] = hash(8.3, i * 0.71) * PATCH;
      rnd[i * 4] = hash(i, 13) * 6.283; // yaw
      rnd[i * 4 + 1] = hash(i, 17); // height
      rnd[i * 4 + 2] = hash(i, 19); // < 0.03 = flower
      rnd[i * 4 + 3] = hash(i, 23); // keep threshold
    }
    g.setAttribute("aOff", new InstancedBufferAttribute(off, 2));
    g.setAttribute("aRnd", new InstancedBufferAttribute(rnd, 4));

    const { height, ground } = groundTextures();
    const uCam = { value: new Vector2() }, uCar = { value: new Vector2(1e5, 1e5) };
    const mat = new MeshStandardMaterial({ roughness: 1, metalness: 0, side: DoubleSide });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uTime: U.uTime, uWet: U.uWet, uSnowC: U.uSnowC, uCam, uCar, uHeight: { value: height }, uGround: { value: ground } });
      sh.vertexShader = /* glsl */ `
        uniform float uTime, uWet, uSnowC; uniform vec2 uCam, uCar; uniform sampler2D uHeight, uGround;
        attribute vec2 aOff; attribute vec4 aRnd;
        varying float vH, vFlower; varying vec3 vBase, vTip, vFlowerC;
        ${NOISE_GLSL}
        vec3 srgbToLinear(vec3 c){ return mix(c/12.92, pow((c + 0.055)/1.055, vec3(2.4)), step(0.04045, c)); }
      ` + sh.vertexShader.replace("#include <begin_vertex>", /* glsl */ `
        const float SIZE = ${f(GRID.size)}, SEG = ${f(GRID.seg)};
        vec2 base = uCam - ${f(PATCH / 2)};
        vec2 p = base + mod(aOff - base, ${f(PATCH)});
        float d = distance(p, uCam);
        vec2 gc = clamp((p + SIZE*0.5)/(SIZE/SEG), vec2(0.0), vec2(SEG - 0.001));
        vec4 gs = texture2D(uGround, (gc + 0.5)/(SEG + 1.0));
        float clump = smoothstep(0.2, 0.75, vn(p*0.09)*0.7 + vn(p*0.31)*0.3);
        float dens = (1.0 - smoothstep(${f(NEAR)}, ${f(FAR)}, d)) * mix(0.22, 1.0, clump) * smoothstep(0.12, 0.6, gs.a);
        vec3 transformed;
        if (aRnd.w > dens) {
          transformed = vec3(0.0, -1.0e5, 0.0); // culled: collapses to a point far outside the view
        } else {
          ivec2 i0 = ivec2(floor(gc)); vec2 fr = fract(gc);
          float ha = texelFetch(uHeight, i0, 0).r, hb = texelFetch(uHeight, i0 + ivec2(1,0), 0).r;
          float hc = texelFetch(uHeight, i0 + ivec2(0,1), 0).r, hd = texelFetch(uHeight, i0 + ivec2(1,1), 0).r;
          float y0 = mix(mix(ha, hb, fr.x), mix(hc, hd, fr.x), fr.y);
          // kinds: 3% flowers, 2% wild oats (tall, seed head), 4% clover (low, wide leaves)
          float flower = step(aRnd.z, 0.03), oat = step(0.03, aRnd.z)*step(aRnd.z, 0.05), clover = step(0.05, aRnd.z)*step(aRnd.z, 0.09);
          float h = mix(0.35, 0.7, aRnd.y) * mix(0.8, 1.1, clump) * mix(1.0, 0.75, flower);
          h = mix(h, h*1.5, oat); h = mix(h, 0.07 + aRnd.y*0.03, clover);
          h *= 1.0 - smoothstep(${f(FAR - 14)}, ${f(FAR)}, d) * 0.6;
          float w = 0.05 * mix(1.0, 2.2, flower*step(0.75, position.y));
          w *= mix(1.0, 0.45, oat) * mix(1.0, 1.0 + 2.4*step(0.8, position.y), oat) * mix(1.0, 3.2, clover);
          float cy = cos(aRnd.x), sy = sin(aRnd.x);
          transformed = vec3(p.x + position.x*w*cy, y0 - 0.03 + position.y*h, p.y + position.x*w*sy);
          float gust = sin(dot(p, vec2(0.07, 0.05)) - uTime*1.5)*0.5 + 0.5;
          float n = sin(p.x*0.6 + uTime*2.1)*0.25 + sin(p.y*0.5 + uTime*1.7)*0.2;
          float bend = (0.18 + gust*0.35 + n) * position.y*position.y * h * mix(1.0, 0.5, max(flower, clover));
          transformed.x += bend*0.8; transformed.z += bend*0.45; transformed.y -= bend*bend*0.3;
          // plants part around the vehicle
          vec2 dd = p - uCar; float dc = length(dd);
          vec2 push = dc < 2.8 ? dd/max(dc, 0.001)*(2.8 - dc)*0.55 : vec2(0.0);
          transformed.xz += push*position.y*h*2.2; transformed.y -= length(push)*position.y*h*0.9;
          vBase = srgbToLinear(gs.rgb) * (1.0 - 0.28*uWet);
          vTip = vBase*vec3(1.14, 1.17, 0.9) + vec3(0.022, 0.026, 0.004) + (aRnd.y - 0.5)*0.03;
          vTip = mix(vTip, vec3(0.42, 0.36, 0.16), oat*0.7);
          vBase *= mix(vec3(1.0), vec3(0.8, 1.05, 0.7), clover); vTip = mix(vTip, vBase*1.15, clover);
          float k = fract(aRnd.z*97.0);
          vFlowerC = k < 0.4 ? vec3(0.92, 0.9, 0.84) : k < 0.7 ? vec3(0.95, 0.84, 0.42) : vec3(0.66, 0.55, 0.86);
          vFlower = flower + oat*2.0;
        }
        vH = position.y;
      `);
      sh.fragmentShader = "uniform float uSnowC; varying float vH, vFlower; varying vec3 vBase, vTip, vFlowerC;\n" + sh.fragmentShader
        .replace("#include <color_fragment>", /* glsl */ `
          diffuseColor.rgb = mix(vBase, vTip, pow(vH, 1.3));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), uSnowC*smoothstep(0.35, 0.9, vH)*0.8);
          if (vFlower > 0.5 && vFlower < 1.5 && vH > 0.74) diffuseColor.rgb = vFlowerC;
          if (vFlower > 1.5 && vH > 0.8) diffuseColor.rgb = vec3(0.64, 0.55, 0.26);`)
        // both faces lit like flat ground (no dark backsides)
        .replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\n  normal = normalize(vNormal);");
    };

    const mesh = new InstancedMesh(g, mat, max);
    const id = new Matrix4();
    for (let i = 0; i < max; i++) mesh.setMatrixAt(i, id); // placement comes from aOff in the shader
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    return { mesh, uCam, uCar };
  }, []);

  useEffect(() => { mesh.count = QUALITY[quality].grass; }, [mesh, quality]);
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as MeshStandardMaterial).dispose(); }, [mesh]);

  useFrame(({ camera }) => { uCam.value.set(camera.position.x, camera.position.z); uCar.value.set(live.car.x, live.car.z); });

  return <primitive object={mesh} />;
}
