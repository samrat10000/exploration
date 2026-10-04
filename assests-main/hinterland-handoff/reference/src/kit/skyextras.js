/* ============================================================
   SKY EXTRAS: sun rays at dawn/golden, aurora + shooting stars at night, V-formations of geese
   (the high wispy cirrus lives inside the time-of-day sky shader)
   API: const SX = makeSkyExtras(scene, TOD, { aurora: true, geese: 2 }); SX.update(dt, camera)
============================================================ */
function makeSkyExtras(scene, TOD, o = {}){
  const R = o.radius || 3600, add2 = (m) => { m.frustumCulled = false; scene.add(m); return m; };
  // sun rays: a soft star of beams around the sun
  const rayTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); x.translate(128, 128);
    for (let i = 0; i < 26; i++){ x.rotate(Math.PI*2/26 + Math.random()*.08); const w = 2 + Math.random()*7, L = 70 + Math.random()*58; const g = x.createLinearGradient(0, 0, L, 0); g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.moveTo(0, -w*.3); x.lineTo(L, -w); x.lineTo(L, w); x.lineTo(0, w*.3); x.fill(); }
    const g2 = x.createRadialGradient(0, 0, 0, 0, 0, 60); g2.addColorStop(0, "rgba(255,255,255,.9)"); g2.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g2; x.fillRect(-60, -60, 120, 120); return new THREE.CanvasTexture(c); })();
  const rays = add2(new THREE.Sprite(new THREE.SpriteMaterial({ map: rayTex, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false, opacity: 0 })));
  const rays2 = add2(new THREE.Sprite(new THREE.SpriteMaterial({ map: rayTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 })));
  // aurora: three tall shimmering curtains far away
  const auroraMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uTime: { value: 0 }, uO: { value: 0 } },
    vertexShader: "varying vec2 vUv; uniform float uTime; void main(){ vUv = uv; vec3 p = position; p.z += sin(uv.x*9.0 + uTime*0.15)*60.0 + sin(uv.x*23.0 - uTime*0.1)*20.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0); }",
    fragmentShader: `varying vec2 vUv; uniform float uTime, uO;
      void main(){ float x = vUv.x, v = vUv.y;
        float rays = 0.55 + 0.45*sin(x*220.0 + sin(x*31.0 + uTime*0.6)*4.0 + uTime*0.9);
        float body = smoothstep(0.0, 0.18, v)*smoothstep(1.0, 0.3, v)*(0.6 + 0.4*sin(x*7.0 + uTime*0.2));
        float edge = smoothstep(0.0, 0.08, x)*smoothstep(1.0, 0.92, x);
        vec3 col = mix(vec3(0.2, 1.0, 0.6), vec3(0.65, 0.4, 1.0), smoothstep(0.35, 1.0, v));
        gl_FragColor = vec4(col*body*rays*edge*uO*0.5, 1.0); }` });
  const auroras = o.aurora ? [0, 1, 2].map(i => { const m = add2(new THREE.Mesh(new THREE.PlaneGeometry(2600, 520, 80, 1), auroraMat)); m.userData.a = -.4 + i*.5; m.userData.h = 650 + i*120; return m; }) : [];
  // shooting stars
  const ssTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 8; const x = c.getContext("2d"); const g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.85, "rgba(220,235,255,.8)"); g.addColorStop(1, "rgba(255,255,255,1)"); x.fillStyle = g; x.fillRect(0, 2, 256, 4); return new THREE.CanvasTexture(c); })();
  const shoot = add2(new THREE.Mesh(new THREE.PlaneGeometry(220, 3), new THREE.MeshBasicMaterial({ map: ssTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 })));
  const ss = { t: 99, next: 6 + Math.random()*8, dir: new THREE.Vector3(), start: new THREE.Vector3() };
  // geese in V formation
  const goose = new THREE.BufferGeometry(); goose.setAttribute("position", new THREE.Float32BufferAttribute([0,0,-.3, 0,0,.35, 1.4,0,0], 3));
  const gm = new THREE.MeshBasicMaterial({ color: 0x2b2a2e, side: THREE.DoubleSide });
  const flocks = []; for (let f = 0; f < (o.geese || 0); f++){ const birds = []; for (let i = 0; i < 9; i++){ const b = new THREE.Group(), l = new THREE.Mesh(goose, gm), r = new THREE.Mesh(goose, gm); r.scale.x = -1; b.add(l, r); b.scale.setScalar(2.4); scene.add(b); birds.push({ b, l, r, slot: i }); } flocks.push({ birds, ph: f*3.1, y: (o.geeseY || 180) + f*60 }); }
  return { update(dt, cam){
    const day = TOD.cur.day, night = TOD.cur.stars, low = 1 - Math.min(1, TOD.cur.el/.6);
    const sp = cam.position.clone().addScaledVector(TOD.dir, R*.9);
    rays.position.copy(sp); rays2.position.copy(sp); rays.scale.setScalar(R*.55); rays2.scale.setScalar(R*.38);
    rays.material.rotation += dt*.006; rays2.material.rotation -= dt*.009;
    const ro = day*(.15 + .5*low)*(1 - TOD.dark); rays.material.opacity = ro*.45; rays2.material.opacity = ro*.3;
    rays.material.color.copy(TOD.cur.sun); rays2.material.color.copy(TOD.cur.sun);
    auroraMat.uniforms.uTime.value += dt; auroraMat.uniforms.uO.value += ((night > .8 ? 1 : 0)*(1 - TOD.dark) - auroraMat.uniforms.uO.value)*(1 - Math.exp(-.5*dt));
    auroras.forEach(m => { const a = m.userData.a; m.position.set(cam.position.x + Math.sin(a)*R*.7, cam.position.y + m.userData.h, cam.position.z - Math.cos(a)*R*.7); m.lookAt(cam.position.x, m.position.y, cam.position.z); });
    // shooting star
    ss.t += dt; ss.next -= dt;
    if (ss.next <= 0 && night > .8 && TOD.dark < .3){ ss.next = 7 + Math.random()*12; ss.t = 0; const a = Math.random()*6.28; ss.start.set(Math.cos(a)*R*.6, R*(.35 + Math.random()*.2), Math.sin(a)*R*.6).add(cam.position); ss.dir.set(-Math.cos(a) + (Math.random() - .5), -.45, -Math.sin(a) + (Math.random() - .5)).normalize(); }
    if (ss.t < .9){ shoot.position.copy(ss.start).addScaledVector(ss.dir, ss.t*900); shoot.lookAt(cam.position); const sd = ss.dir.clone().project(cam), so = new THREE.Vector3().project(cam); shoot.rotation.z = Math.atan2(sd.y - so.y, sd.x - so.x); shoot.material.opacity = Math.sin(ss.t/.9*Math.PI)*.9; } else shoot.material.opacity = 0;
    // geese: slow V-formations across the sky (day + dusk)
    flocks.forEach((f, fi) => { const t = performance.now()/1000*.012 + f.ph, cx = Math.cos(t)*900, cz = -700 + Math.sin(t)*900, head = t + Math.PI/2;
      const fwd = new THREE.Vector3(-Math.sin(head), 0, -Math.cos(head)), side = new THREE.Vector3(Math.cos(head), 0, -Math.sin(head));
      f.birds.forEach(b => { const k = Math.ceil(b.slot/2), s = b.slot % 2 ? 1 : -1; b.b.position.set(cx, f.y, cz).addScaledVector(fwd, -k*6).addScaledVector(side, s*k*5); b.b.rotation.y = head + Math.PI; const fl = Math.sin(performance.now()/1000*5 + b.slot)*.5; b.l.rotation.z = fl; b.r.rotation.z = -fl; b.b.visible = day > .25; }); });
  } };
}
