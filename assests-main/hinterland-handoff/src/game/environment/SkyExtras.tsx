// Sky extras (SKY_SOUND §2, kit/skyextras.js): a slowly turning star of sun rays at dawn and golden hour, aurora
// curtains and shooting stars on clear nights, V-formations of geese by day. The high wispy cirrus lives in the sky shader.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, CanvasTexture, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, Sprite, SpriteMaterial, Vector3 } from "three";
import { live } from "../../state/live";
import { hash } from "../../utils/noise";

const R = 1400; // inside the sky dome (1500)

function rayTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d")!; x.translate(128, 128);
  for (let i = 0; i < 26; i++) {
    x.rotate((Math.PI * 2) / 26 + hash(i, 1) * 0.08);
    const w = 2 + hash(i, 2) * 7, L = 70 + hash(i, 3) * 58, g = x.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.moveTo(0, -w * 0.3); x.lineTo(L, -w); x.lineTo(L, w); x.lineTo(0, w * 0.3); x.fill();
  }
  const g2 = x.createRadialGradient(0, 0, 0, 0, 0, 60); g2.addColorStop(0, "rgba(255,255,255,.9)"); g2.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g2; x.fillRect(-60, -60, 120, 120);
  return new CanvasTexture(c);
}

export function SkyExtras() {
  const k = useMemo(() => {
    const tex = rayTexture(), sm = (o: number) => new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, opacity: o });
    const rays = new Sprite(sm(0)), rays2 = new Sprite(sm(0));
    rays.frustumCulled = rays2.frustumCulled = false;
    const aurora = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false, uniforms: { uTime: { value: 0 }, uO: { value: 0 } },
      vertexShader: "varying vec2 vUv; uniform float uTime; void main(){ vUv = uv; vec3 p = position; p.z += sin(uv.x*9.0 + uTime*0.15)*60.0 + sin(uv.x*23.0 - uTime*0.1)*20.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0); }",
      fragmentShader: `varying vec2 vUv; uniform float uTime, uO;
        void main(){ float x = vUv.x, v = vUv.y;
          float rays = 0.55 + 0.45*sin(x*220.0 + sin(x*31.0 + uTime*0.6)*4.0 + uTime*0.9);
          float body = smoothstep(0.0, 0.18, v)*smoothstep(1.0, 0.3, v)*(0.6 + 0.4*sin(x*7.0 + uTime*0.2));
          float edge = smoothstep(0.0, 0.08, x)*smoothstep(1.0, 0.92, x);
          vec3 col = mix(vec3(0.2, 1.0, 0.6), vec3(0.65, 0.4, 1.0), smoothstep(0.35, 1.0, v));
          gl_FragColor = vec4(col*body*rays*edge*uO*0.5, 1.0); }`,
    });
    const curtains = [0, 1, 2].map((i) => { const m = new Mesh(new PlaneGeometry(1500, 300, 80, 1), aurora); m.frustumCulled = false; m.userData = { a: -0.4 + i * 0.5, h: 420 + i * 60 }; return m; });
    const c = document.createElement("canvas"); c.width = 256; c.height = 8;
    const x = c.getContext("2d")!, g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.85, "rgba(220,235,255,.8)"); g.addColorStop(1, "rgba(255,255,255,1)");
    x.fillStyle = g; x.fillRect(0, 2, 256, 4);
    const meteorTex = new CanvasTexture(c);
    const shoots = Array.from({ length: 6 }, () => { const m = new Mesh(new PlaneGeometry(160, 2.4), new MeshBasicMaterial({ map: meteorTex, transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, opacity: 0 })); m.frustumCulled = false; return { m, t: 99, dir: new Vector3(), start: new Vector3() }; });
    const wing = new BufferGeometry(); wing.setAttribute("position", new Float32BufferAttribute([0, 0, -0.3, 0, 0, 0.35, 1.4, 0, 0], 3));
    const gm = new MeshBasicMaterial({ color: 0x2b2a2e, side: DoubleSide });
    const flocks = [0, 1].map((f) => {
      const birds = Array.from({ length: 9 }, (_, i) => { const b = new Group(), l = new Mesh(wing, gm), r = new Mesh(wing, gm); r.scale.x = -1; b.add(l, r); b.scale.setScalar(2.4); return { b, l, r, slot: i }; });
      return { birds, ph: f * 3.1, y: 180 + f * 60 };
    });
    return { rays, rays2, aurora, curtains, shoots, flocks, next: 6 + hash(1, 1) * 8 };
  }, []);

  useEffect(() => () => { k.rays.material.dispose(); k.aurora.dispose(); }, [k]);

  useFrame(({ camera }, dt) => {
    const env = live.env, day = 1 - env.stars, night = env.stars, low = 1 - Math.min(1, Math.asin(Math.min(1, Math.max(-1, env.sunDir.y))) / 0.6);
    const cp = camera.position, dark = live.wx.dark;
    const sp = new Vector3().copy(cp).addScaledVector(env.sunDir, R * 0.9);
    k.rays.position.copy(sp); k.rays2.position.copy(sp); k.rays.scale.setScalar(R * 0.55); k.rays2.scale.setScalar(R * 0.38);
    k.rays.material.rotation += dt * 0.006; k.rays2.material.rotation -= dt * 0.009;
    // strongest at dawn and golden hour, gone at night and under cloud
    const ro = day * (0.15 + 0.5 * low) * (1 - dark) * (1 - live.wx.rain);
    k.rays.material.opacity = ro * 0.45; k.rays2.material.opacity = ro * 0.3;
    k.rays.material.color.copy(env.sunC); k.rays2.material.color.copy(env.sunC);
    // aurora on clear nights
    const au = k.aurora.uniforms; au.uTime.value += dt; au.uO.value += ((night > 0.8 ? 1 : 0) * (1 - dark) - au.uO.value) * (1 - Math.exp(-0.5 * dt));
    k.curtains.forEach((m) => { const a = m.userData.a; m.visible = au.uO.value > 0.01; m.position.set(cp.x + Math.sin(a) * R * 0.7, cp.y + m.userData.h, cp.z - Math.cos(a) * R * 0.7); m.lookAt(cp.x, m.position.y, cp.z); });
    // shooting stars every 7-19 s on clear nights; a meteor shower (live.shower) sends one every ~0.3 s
    k.next -= dt;
    const shower = live.shower > 0.01;
    if (k.next <= 0 && (shower || (night > 0.8 && dark < 0.3))) {
      k.next = shower ? 0.18 + Math.random() * 0.3 : 7 + Math.random() * 12;
      const ss = k.shoots.find((q) => q.t >= 0.9);
      if (ss) {
        ss.t = 0; const a = Math.random() * 6.28;
        ss.start.set(Math.cos(a) * R * 0.6, R * (0.3 + Math.random() * 0.3), Math.sin(a) * R * 0.6).add(cp);
        ss.dir.set(-Math.cos(a) + (Math.random() - 0.5), -0.45, -Math.sin(a) + (Math.random() - 0.5)).normalize();
      }
    }
    for (const ss of k.shoots) {
      ss.t += dt;
      const sm = ss.m.material as MeshBasicMaterial;
      if (ss.t < 0.9) {
        ss.m.position.copy(ss.start).addScaledVector(ss.dir, ss.t * 700); ss.m.lookAt(cp);
        const sd = ss.dir.clone().project(camera), so = new Vector3().project(camera);
        ss.m.rotation.z = Math.atan2(sd.y - so.y, sd.x - so.x); sm.opacity = Math.sin((ss.t / 0.9) * Math.PI) * 0.9;
      } else sm.opacity = 0;
    }
    // geese: slow V-formations across the sky, by day and at dusk
    const T = live.clock;
    k.flocks.forEach((f) => {
      const t = T * 0.012 + f.ph, cx = cp.x + Math.cos(t) * 900, cz = cp.z - 500 + Math.sin(t) * 900, head = t + Math.PI / 2;
      const fx = -Math.sin(head), fz = -Math.cos(head), sx = Math.cos(head), sz = -Math.sin(head);
      f.birds.forEach((b) => {
        const kk = Math.ceil(b.slot / 2), s = b.slot % 2 ? 1 : -1;
        b.b.position.set(cx - fx * kk * 6 + sx * s * kk * 5, f.y, cz - fz * kk * 6 + sz * s * kk * 5); b.b.rotation.y = head + Math.PI;
        const fl = Math.sin(T * 5 + b.slot) * 0.5; b.l.rotation.z = fl; b.r.rotation.z = -fl; b.b.visible = day > 0.25;
      });
    });
  });

  return (
    <>
      <primitive object={k.rays} /><primitive object={k.rays2} />{k.shoots.map((q, i) => <primitive key={`m${i}`} object={q.m} />)}
      {k.curtains.map((m, i) => <primitive key={i} object={m} />)}
      {k.flocks.map((f, i) => f.birds.map((b, j) => <primitive key={`${i}-${j}`} object={b.b} />))}
    </>
  );
}
