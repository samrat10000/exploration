// Flight in the world (JOURNEYS §1.10): launch ridges (windsock + stone ramp; stop and hold T to
// unfold the wings), thermals you can see (a shimmer column with seeds rising), and landing spots
// (a ring of light on the ground and 7 warm lights on a 6° glide path). No HUD markers.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Points, RingGeometry, ShaderMaterial, Sprite, SpriteMaterial } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp, hash } from "../../utils/noise";
import { C, M, VC, add, bakeStatic, cyl, h3, mixC, paintFaces } from "../art/kit";
import { glowTexture } from "../environment/textures";
import { U } from "../shaders";
const DAY = { value: 1 };
import { SKY, type Launch, type Landing, type Thermal } from "../vehicle/flight";
import { input } from "../vehicle/input";
import { height } from "./height";
import { rockGeo } from "./props/rocks";

const HOLD = 1.2;

/** Windsock on a pole beside a ramp of flat stones pointing out over the drop. */
function launchModel() {
  const g = new Group(), mat = VC(0.95);
  for (let i = 0; i < 7; i++) add(g, rockGeo(1300 + i, 0.9, 0.1, 0.8, 1, 0.3), mat, [(i % 2 - 0.5) * 1.4, 0.02, -i * 1.3], [0, i * 0.6, 0]);
  const pole = cyl(0.05, 0.07, 4, 7);
  add(g, paintFaces(pole, (c) => mixC(C("#4E3A2B"), C("#7A6048"), (c.y + 2) / 4 * 0.6 + h3(c.x * 20, c.y * 20, 5) * 0.3)), VC(0.95), [2.4, 2, 0]);
  const sock = new Group(); sock.position.set(2.4, 3.85, 0); g.add(sock);
  for (let k = 0; k < 4; k++) add(sock, new CylinderGeometry(0.22 - k * 0.04, 0.18 - k * 0.04, 0.32, 10, 1, true), M(k % 2 ? "#F2EFE6" : "#E8743B", 0.8, 0, { side: DoubleSide }), [0, 0, -0.18 - k * 0.32], [Math.PI / 2, 0, 0]);
  const out = bakeStatic(g);
  const s = sock.clone(); out.add(s);
  out.userData.sock = s;
  return out;
}

function LaunchRidge({ l }: { l: Launch }) {
  const model = useMemo(launchModel, []);
  useFrame((_, dt) => {
    // the sock streams in the breeze
    const sock = model.userData.sock as Group;
    sock.rotation.y = Math.sin(live.clock * 0.4) * 0.3;
    sock.rotation.x = 0.25 + Math.sin(live.clock * 2.3) * 0.06;
    // stopped on the ramp in the Mule: hold T to unfold
    const s = useStore.getState(), car = live.car;
    const ground = live.vehicle === "mule" || live.vehicle === "rover";
    const here = s.phase === "play" && ground && Math.hypot(car.x - l.x, car.z - l.z) < l.r && Math.abs(car.speed) < 0.8;
    if (here) {
      live.flight.prompt = "unfold";
      live.flight.hold = input.wings ? Math.min(1, live.flight.hold + dt / HOLD) : 0;
      if (live.flight.hold >= 1) {
        live.flight.hold = 0; live.flight.prompt = ""; live.flight.start = "launch";
        live.spawnAt = { x: car.x, z: car.z, yaw: l.yaw };
        useStore.setState({ vehicle: live.vehicle === "rover" ? "glider" : "skymule" });
      }
    } else if (live.flight.prompt === "unfold" && ground && Math.hypot(car.x - l.x, car.z - l.z) < l.r + 6) { live.flight.prompt = ""; live.flight.hold = 0; }
  });
  return <primitive object={model} position={[l.x, height(l.x, l.z), l.z]} rotation-y={l.yaw} />;
}

/** A column of shimmering air with seeds drifting up it. */
function ThermalColumn({ t }: { t: Thermal }) {
  useFrame(() => { DAY.value = 1 - live.env.stars; });
  const { col, seeds } = useMemo(() => {
    const base = height(t.x, t.z), h = t.top - base;
    const col = new Mesh(new CylinderGeometry(t.r * 0.9, t.r * 1.5, h, 32, 1, true), new ShaderMaterial({
      transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending, fog: false,
      uniforms: { uTime: U.uTime, uDay: DAY },
      vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `varying vec2 vUv; varying vec3 vN, vV; uniform float uTime, uDay;
        void main(){
          // a soft haze, not a tube: the sides melt away (view-angle fade), slow billows instead of stripes, and it is gone at night
          float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
          float w = 0.55 + 0.45*sin(vUv.y*7.0 - uTime*0.6 + sin(vUv.x*5.0)*2.0);
          float a = w*0.03*edge*uDay*smoothstep(0.0, 0.35, vUv.y)*(1.0 - smoothstep(0.45, 1.0, vUv.y));
          gl_FragColor = vec4(vec3(1.0, 0.97, 0.88), a); }`,
    }));
    col.position.set(t.x, base + h / 2, t.z);
    const N = 160, p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const a = hash(i, 1) * 6.28, r = Math.sqrt(hash(i, 2)) * t.r * 0.6; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = hash(i, 3) * h; p[i * 3 + 2] = Math.sin(a) * r; }
    const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(p, 3));
    const seeds = new Points(g, new ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uH: { value: h } },
      vertexShader: /* glsl */ `uniform float uTime, uH; void main(){ vec3 q = position; float a = uTime*0.4 + q.y*0.05;
        q.y = mod(q.y + uTime*3.0, uH); q.xz = mat2(cos(a), -sin(a), sin(a), cos(a))*q.xz;
        vec4 mv = modelViewMatrix*vec4(q,1.0); gl_PointSize = min(4.0, 40.0/max(1.0,-mv.z)); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `void main(){ vec2 c = gl_PointCoord - 0.5; gl_FragColor = vec4(vec3(1.0,0.98,0.92), smoothstep(0.5,0.1,length(c))*0.8); }`,
    }));
    seeds.position.set(t.x, base, t.z);
    seeds.frustumCulled = false;
    return { col, seeds };
  }, [t]);
  return <><primitive object={col} /><primitive object={seeds} /></>;
}

/** The landing ring (light on the ground) and 7 warm glide-path lights on a 6° approach. */
function LandingSpot({ l }: { l: Landing }) {
  const { ring, lights } = useMemo(() => {
    const y = height(l.x, l.z);
    const ring = new Mesh(new RingGeometry(l.r - 0.35, l.r, 48), new MeshBasicMaterial({ color: C("#FFE2A8"), transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(l.x, y + 0.08, l.z);
    const tex = glowTexture(), lights = new Group(), tan6 = Math.tan((6 * Math.PI) / 180);
    for (let k = 0; k < 7; k++) {
      const d = 40 + k * 38, x = l.x + Math.sin(l.yaw) * d, z = l.z + Math.cos(l.yaw) * d; // back along the approach
      const sp = new Sprite(new SpriteMaterial({ map: tex, color: C("#FFC874"), transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }));
      sp.position.set(x, y + 2 + d * tan6, z); sp.scale.setScalar(3.2);
      lights.add(sp);
    }
    return { ring, lights };
  }, [l]);
  useFrame(() => {
    const car = live.car, show = live.flight.on;
    ring.visible = lights.visible = show;
    ring.material.opacity = 0.4 + 0.15 * Math.sin(live.clock * 2);
    // each light fades as you pass it, and they only show on approach (within 300 m)
    for (const sp of lights.children as Sprite[]) {
      const d = Math.hypot(sp.position.x - car.x, sp.position.z - car.z), toRing = Math.hypot(car.x - l.x, car.z - l.z);
      sp.material.opacity = live.flight.nearLanding ? clamp((d - 12) / 30, 0, 1) * clamp(Math.hypot(sp.position.x - l.x, sp.position.z - l.z) < toRing ? 1 : 0.15, 0, 1) : 0;
    }
  });
  return <><primitive object={ring} /><primitive object={lights} /></>;
}

export function SkyPlaces() {
  const region = useStore((s) => s.region), map = SKY[region];
  return (
    <>
      {map.launches.map((l, i) => <LaunchRidge key={`l${i}`} l={l} />)}
      {map.thermals.map((t, i) => <ThermalColumn key={`t${i}`} t={t} />)}
      {map.landings.map((l, i) => <LandingSpot key={`g${i}`} l={l} />)}
    </>
  );
}

