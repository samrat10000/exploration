// Weather you can watch arrive (WEATHER.md §1): Clear · Mist · Rain · Snow. The target comes from the dev
// panel or the Forecast; the state eases toward it (rain builds at 0.09/s and stops at 0.14/s, mist 0.12, snow 0.1).
// Rain: a curtain of streaked planes walks down toward you, then 2,600 streaks around the camera, wet darker
// ground, puddles on the route, a rain hiss, and a rainbow after a real shower. Mist: low banks. Snow: flakes
// and settled snow on upward faces. Fog / sky darkening are applied in Sky.tsx from live.wx.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Color, DoubleSide, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, Points, PointsMaterial, RepeatWrapping, ShaderMaterial, Sprite, SpriteMaterial, TorusGeometry, Vector3, RingGeometry } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp, hash, smooth } from "../../utils/noise";
import { audio } from "../audio/audio";
import { U } from "../shaders";
import { ROUTE } from "../world/ground";
import { height, waterLevel } from "../world/height";
import { blobTexture } from "./textures";

const RAIN = 2600, FLAKES = 2200, BOX = 60, PUDDLES = 60;
export type Wx = "clear" | "mist" | "rain" | "snow";

/** Where the weather wants to go: the dev panel first, then tomorrow's forecast. */
function target(): Wx {
  const dw = live.dev.weather, f = useStore.getState().extra.forecast;
  if (dw === "mist" || dw === "rain" || dw === "snow") return dw;
  if (dw === "clear" || dw === "fog") return "clear";
  const st = useStore.getState();
  // a region's own weather only counts while you are in that region (and never on the title screen)
  if (st.phase === "menu" || st.phase === "loading") return "clear";
  if (live.wxForce && (st.region === "pass" || st.region === "light")) return live.wxForce;
  // the valleys and the first level stay snow-free; tomorrow's snow only falls on high ground
  if (f === "snow") return st.region === "kettle" || st.region === "flowers" ? "snow" : "clear";
  return f === "mist" || f === "rain" ? f : "clear";
}

/** a soft round flake (default points are hard squares) */
function flakeTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const x = c.getContext("2d")!, g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return new CanvasTexture(c);
}

function curtainTexture() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 256;
  const x = c.getContext("2d")!, g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(120,130,145,0)"); g.addColorStop(0.25, "rgba(120,130,145,.7)"); g.addColorStop(1, "rgba(150,160,170,.55)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 256); x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(0,0,0,${hash(i, 1) * 0.5})`; x.fillRect(hash(i, 2) * 128, 0, 1 + hash(i, 3) * 3, 256); }
  const t = new CanvasTexture(c); t.wrapS = RepeatWrapping; return t;
}

export function Weather() {
  const region = useStore((s) => s.region);
  const k = useMemo(() => {
    const rp = new Float32Array(RAIN * 6);
    for (let i = 0; i < RAIN; i++) { const x = (hash(i, 5) - 0.5) * BOX, y = hash(i, 6) * 34, z = (hash(i, 7) - 0.5) * BOX; rp.set([x, y, z, x + 0.05, y - 0.9, z], i * 6); }
    const rg = new BufferGeometry(); rg.setAttribute("position", new BufferAttribute(rp, 3));
    const rain = new LineSegments(rg, new LineBasicMaterial({ color: 0xcfdbe6, transparent: true, opacity: 0, depthWrite: false })); rain.frustumCulled = false;
    const fp = new Float32Array(FLAKES * 3), fs = new Float32Array(FLAKES);
    for (let i = 0; i < FLAKES; i++) { fp.set([(hash(i, 8) - 0.5) * BOX, hash(i, 9) * 30, (hash(i, 10) - 0.5) * BOX], i * 3); fs[i] = hash(i, 11) * 10; }
    const fg = new BufferGeometry(); fg.setAttribute("position", new BufferAttribute(fp, 3));
    const flakes = new Points(fg, new PointsMaterial({ color: 0xffffff, size: 0.09, map: flakeTexture(), alphaTest: 0.02, transparent: true, opacity: 0, depthWrite: false })); flakes.frustumCulled = false;
    const ct = curtainTexture();
    const curtains = Array.from({ length: 7 }, () => { const m = new Mesh(new PlaneGeometry(90, 160), new MeshBasicMaterial({ map: ct.clone(), transparent: true, opacity: 0, depthWrite: false, side: DoubleSide })); m.material.map!.wrapS = RepeatWrapping; m.visible = false; m.frustumCulled = false; return m; });
    const mt = blobTexture(256, 128, 14, 9);
    const banks = Array.from({ length: 34 }, (_, i) => { const s = new Sprite(new SpriteMaterial({ map: mt, transparent: true, depthWrite: false, opacity: 0 })); s.scale.set(60 + hash(i, 20) * 40, 10 + hash(i, 21) * 8, 1); s.visible = false; return { s, ox: (hash(i, 22) - 0.5) * 220, oz: (hash(i, 23) - 0.5) * 260, h: 2 + hash(i, 24) * 6, sp: 1 + hash(i, 25) * 1.5 }; });
    const pm = new MeshBasicMaterial({ color: 0xaec4d2, transparent: true, opacity: 0.8, depthWrite: false });
    const puddles = region === "valley" ? Array.from({ length: PUDDLES }, (_, i) => {
      const t = hash(i, 30), x = ROUTE.ax + (ROUTE.bx - ROUTE.ax) * t + (hash(i, 31) - 0.5) * 4.2, z = ROUTE.az + (ROUTE.bz - ROUTE.az) * t + (hash(i, 32) - 0.5) * 4.2;
      const m = new Mesh(new CircleGeometry(0.6 + hash(i, 33) * 1.1, 20), pm); m.rotation.x = -Math.PI / 2; m.position.set(x, height(x, z) + 0.05, z); m.scale.setScalar(0.001); m.userData.s = 0.6 + hash(i, 34) * 0.6;
      return m;
    }) : [];
    const rainbow = new Mesh(new TorusGeometry(420, 16, 8, 90, Math.PI), new ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, uniforms: { uO: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "varying vec3 vP; uniform float uO; vec3 h(float t){ return clamp(abs(mod(t*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); } void main(){ float r = clamp((length(vP.xy) - 405.0)/30.0, 0.0, 1.0); gl_FragColor = vec4(h(r*0.8), uO*0.42*sin(r*3.14159)); }",
    }));
    rainbow.frustumCulled = false;
    // rain ripples: little rings that open on the ground (and the water) near you
    const ringGeo = new RingGeometry(0.85, 1, 20).rotateX(-Math.PI / 2), rings = Array.from({ length: 28 }, () => { const m = new Mesh(ringGeo, new MeshBasicMaterial({ color: 0xdfeaf2, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.frustumCulled = false; return m; });
    return { rings, ringAge: new Float32Array(28).fill(9), ringNext: 0, ringT: 0, rain, flakes, fs, curtains, banks, puddles, rainbow, st: { hissT: 0, thunderT: 8, shown: false }, tmp: new Color(), grey: new Color(0.5, 0.54, 0.6) };
  }, [region]);

  useEffect(() => () => { live.wx.rain = live.wx.mist = live.wx.snow = 0; }, []);

  useFrame(({ camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), w = live.wx, tg = target(), car = live.car, cp = camera.position, playing = useStore.getState().phase !== "menu";
    const want = { rain: tg === "rain" ? 1 : 0, mist: tg === "mist" ? 1 : 0, snow: tg === "snow" ? 1 : 0 };
    w.rain += (want.rain - w.rain) * (1 - Math.exp(-(want.rain > w.rain ? 0.09 : 0.14) * dt));
    w.mist += (want.mist - w.mist) * (1 - Math.exp(-0.12 * dt));
    w.snow += (want.snow - w.snow) * (1 - Math.exp(-0.1 * dt));
    // the dev panel can jump (no 15 s wait) by holding the target for review: dev weather arrives 4x faster
    if (live.dev.weather === "rain" || live.dev.weather === "mist" || live.dev.weather === "snow") { const f = 1 - Math.exp(-0.4 * dt); w.rain += (want.rain - w.rain) * f; w.mist += (want.mist - w.mist) * f; w.snow += (want.snow - w.snow) * f; }
    w.wet = Math.max(0, w.rain > 0.3 ? Math.min(1, w.wet + dt * 0.06 * w.rain) : w.wet - dt * 0.012);
    w.snowCover = clamp(w.snowCover + (w.snow > 0.4 ? dt * 0.02 : -dt * (0.008 + w.rain * 0.03)), 0, 1);
    w.peak = Math.max(w.peak, w.rain);
    if (w.peak > 0.45 && w.rain < 0.12 && want.rain === 0) { w.rainbowT = 70; w.peak = 0; k.st.shown = false; }
    const day = 1 - live.env.stars;
    U.uWet.value = w.wet; U.uSnowC.value = w.snowCover;
    U.uCloudSh.value = 0.3 * day * (1 - w.rain) * (1 - w.mist) * (1 - w.snow);
    w.dark = Math.min(0.7, w.rain * 0.55 + w.snow * 0.25 + w.mist * 0.15);

    // streaks and flakes in a box around the camera
    k.rain.visible = w.rain > 0.02 && playing;
    if (k.rain.visible) {
      const a = k.rain.geometry.attributes.position as BufferAttribute;
      for (let i = 0; i < RAIN; i++) {
        let y = a.getY(i * 2) - dt * 26, x = a.getX(i * 2), z = a.getZ(i * 2);
        if (y < cp.y - 8 || Math.abs(x - cp.x) > BOX / 2 || Math.abs(z - cp.z) > BOX / 2) { x = cp.x + (Math.random() - 0.5) * BOX; z = cp.z + (Math.random() - 0.5) * BOX; y = cp.y + 6 + Math.random() * 24; }
        a.setXYZ(i * 2, x, y, z); a.setXYZ(i * 2 + 1, x + 0.05, y - 0.9, z);
      }
      a.needsUpdate = true; (k.rain.material as LineBasicMaterial).opacity = 0.32 * w.rain;
    }
    k.flakes.visible = w.snow > 0.02 && playing;
    if (k.flakes.visible) {
      const a = k.flakes.geometry.attributes.position as BufferAttribute, T = live.clock;
      for (let i = 0; i < FLAKES; i++) {
        let x = a.getX(i) + Math.sin(T * 0.8 + k.fs[i]) * dt * 0.6, y = a.getY(i) - dt * (1.1 + (k.fs[i] % 1) * 0.6), z = a.getZ(i) + Math.cos(T * 0.6 + k.fs[i]) * dt * 0.6;
        if (y < cp.y - 6 || Math.abs(x - cp.x) > BOX / 2 || Math.abs(z - cp.z) > BOX / 2) { x = cp.x + (Math.random() - 0.5) * BOX; z = cp.z + (Math.random() - 0.5) * BOX; y = cp.y + 4 + Math.random() * 24; }
        a.setXYZ(i, x, y, z);
      }
      a.needsUpdate = true; (k.flakes.material as PointsMaterial).opacity = 0.9 * w.snow;
    }
    // the curtain walks down toward you while the rain builds
    const approach = want.rain ? Math.max(0, 1 - w.rain / 0.55) : 0, fwx = -Math.sin(car.yaw), fwz = -Math.cos(car.yaw);
    k.curtains.forEach((m, i) => {
      m.visible = approach > 0.02 && playing;
      if (!m.visible) return;
      const d = 30 + approach * 330, side = (i - 3) * 34;
      m.position.set(car.x + fwx * d - fwz * side, height(car.x + fwx * d, car.z + fwz * d) + 70, car.z + fwz * d + fwx * side);
      m.lookAt(cp.x, m.position.y, cp.z);
      const mat = m.material as MeshBasicMaterial; mat.opacity = 0.55 * Math.min(1, (1 - approach) * 2.5); mat.map!.offset.y = -live.clock * 0.6;
    });
    // mist banks roll across the valley floor
    k.banks.forEach((o) => {
      o.s.visible = w.mist + w.rain > 0.02 && playing;
      if (!o.s.visible) return;
      o.ox += o.sp * dt; if (o.ox > 120) o.ox = -120;
      const x = car.x + o.ox, z = car.z + o.oz;
      o.s.position.set(x, height(x, z) + o.h, z);
      const m = o.s.material as SpriteMaterial; m.opacity = 0.5 * w.mist + 0.12 * w.rain; m.color.copy(live.env.fogC).lerp(k.tmp.set(1, 1, 1), 0.5);
    });
    // puddles grow with the wet; they mirror the sky
    (k.puddles[0]?.material as MeshBasicMaterial | undefined)?.color.copy(live.env.horC).lerp(k.tmp.set(0.7, 0.78, 0.84), 0.4);
    k.puddles.forEach((m) => m.scale.setScalar(Math.max(0.001, m.userData.s * smooth(0.15, 0.8, w.wet))));
    // rainbow opposite the sun, daylight only, announced with one quiet line
    if (w.rainbowT > 0) {
      w.rainbowT -= dt;
      if (w.rainbowT < 60 && !k.st.shown && day > 0.4) { k.st.shown = true; live.note.text = "A rainbow, over the far end of the valley"; live.note.t = 5; }
    }
    const anti = new Vector3(-live.env.sunDir.x, 0, -live.env.sunDir.z).normalize();
    k.rainbow.position.set(cp.x + anti.x * 900, height(cp.x, cp.z) - 60, cp.z + anti.z * 900); k.rainbow.lookAt(cp.x, k.rainbow.position.y, cp.z);
    const ro = w.rainbowT > 0 ? Math.min(1, (70 - w.rainbowT) / 6, w.rainbowT / 8) * day * (1 - w.rain) : 0, u = (k.rainbow.material as ShaderMaterial).uniforms.uO;
    u.value += (ro - u.value) * (1 - Math.exp(-1.5 * dt));
    // ripples: about nine a second while it really rains, each opening to 0.55 m over half a second
    k.ringT -= dt;
    if (w.rain > 0.3 && playing && k.ringT <= 0) {
      k.ringT = 0.11;
      const i = k.ringNext; k.ringNext = (i + 1) % k.rings.length;
      const a = Math.random() * 6.28, r = 2 + Math.random() * 14, x = car.x + Math.cos(a) * r, z = car.z + Math.sin(a) * r, wl = waterLevel(x, z);
      k.rings[i].position.set(x, Math.max(height(x, z), wl) + 0.04, z); k.ringAge[i] = 0;
    }
    k.rings.forEach((m, i) => { k.ringAge[i] += dt; const u = k.ringAge[i] / 0.5; m.visible = u < 1; if (u < 1) { m.scale.setScalar(0.1 + 0.55 * u); (m.material as MeshBasicMaterial).opacity = 0.4 * (1 - u) * Math.min(1, w.rain * 1.5); } });
    // sound: a rain hiss and rare distant thunder
    if (w.rain > 0.2 && playing) {
      k.st.hissT -= dt; if (k.st.hissT <= 0) { k.st.hissT = 0.5; audio.rain(w.rain); }
      k.st.thunderT -= dt; if (k.st.thunderT <= 0) { k.st.thunderT = 25 + Math.random() * 40; if (w.rain > 0.7) audio.thunder(); }
    }
  }, 4);

  return (
    <>
      {k.rings.map((m, i) => <primitive key={`r${i}`} object={m} />)}
      <primitive object={k.rain} /><primitive object={k.flakes} /><primitive object={k.rainbow} />
      {k.curtains.map((m, i) => <primitive key={`c${i}`} object={m} />)}
      {k.banks.map((o, i) => <primitive key={`b${i}`} object={o.s} />)}
      {k.puddles.map((m, i) => <primitive key={`p${i}`} object={m} />)}
    </>
  );
}
