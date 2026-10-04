/* ============================================================
   FIREWORKS (realistic): rockets with spark tails, 8 shell types, glittering trails,
   colour-changing stars, strobe + crackle, lingering lit smoke, flash light, distance-delayed sound.
   API: const FW = makeFireworks(scene, { scale, sound }); FW.show(origin, spread, height) / FW.launch(pos, height, type)
        FW.update(dt, camera, on)
============================================================ */
function makeFireworks(scene, o = {}){
  const S = o.scale || 1, MAX = o.max || 26000, SMAX = 900;
  // additive sparks
  const g = new THREE.BufferGeometry(), P = new Float32Array(MAX*3), Cc = new Float32Array(MAX*3), Z = new Float32Array(MAX), Al = new Float32Array(MAX);
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("color", new THREE.BufferAttribute(Cc, 3)); g.setAttribute("aSize", new THREE.BufferAttribute(Z, 1)); g.setAttribute("aAlpha", new THREE.BufferAttribute(Al, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, fog: false, uniforms: { uScale: { value: 420 } },
    vertexShader: "attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA; uniform float uScale; void main(){ vC = color; vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = max(1.5, aSize*uScale/max(1.0, -mv.z)); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "varying vec3 vC; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float core = exp(-d*d*60.0), halo = exp(-d*d*9.0); gl_FragColor = vec4(vC*(halo*0.55 + core*1.6)*vA, 1.0); }" });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
  // smoke (normal blending, lit by the bursts)
  const sg = new THREE.BufferGeometry(), SP = new Float32Array(SMAX*3), SC = new Float32Array(SMAX*3), SZ = new Float32Array(SMAX), SA = new Float32Array(SMAX);
  sg.setAttribute("position", new THREE.BufferAttribute(SP, 3)); sg.setAttribute("color", new THREE.BufferAttribute(SC, 3)); sg.setAttribute("aSize", new THREE.BufferAttribute(SZ, 1)); sg.setAttribute("aAlpha", new THREE.BufferAttribute(SA, 1));
  const smat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true, uniforms: { uScale: { value: 420 } },
    vertexShader: mat.vertexShader, fragmentShader: "varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, vA*smoothstep(0.5, 0.1, d)); }" });
  const smoke = new THREE.Points(sg, smat); smoke.frustumCulled = false; scene.add(smoke);
  const lights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffffff, 0, 380*S, 1.6); scene.add(l); return l; }); let li = 0;
  const p = []; for (let i = 0; i < MAX; i++) p.push({ life: 0 }); let pn = 0;
  const sm = []; for (let i = 0; i < SMAX; i++) sm.push({ life: 0 }); let sn = 0;
  const PAL = { red: "#FF3B2F", green: "#5CFF6A", blue: "#4F86FF", gold: "#FFB547", white: "#FFF6E6", purple: "#C06BFF", pink: "#FF7FC8", teal: "#4FFFE0", orange: "#FF8A2E", silver: "#E8F0FF" };
  const col = k => new THREE.Color(PAL[k]);
  function spark(x, y, z, vx, vy, vz, life, c, size, drag, grav, f = {}){
    const q = p[pn]; pn = (pn + 1) % MAX;
    q.x = x; q.y = y; q.z = z; q.vx = vx; q.vy = vy; q.vz = vz; q.life = q.max = life; q.r = c.r; q.g = c.g; q.b = c.b; q.s = size; q.drag = drag; q.grav = grav;
    q.trail = f.trail || 0; q.tt = 0; q.tc = f.tc || null; q.strobe = f.strobe || 0; q.crackle = f.crackle || 0; q.split = f.split || 0; q.c2 = f.c2 || null; q.rocket = f.rocket || 0; q.type = f.type || ""; q.flick = f.flick ?? .25;
    return q;
  }
  function puffSmoke(x, y, z, c, n, spread){ for (let i = 0; i < n; i++){ const q = sm[sn]; sn = (sn + 1) % SMAX; q.x = x + (Math.random() - .5)*spread; q.y = y + (Math.random() - .5)*spread; q.z = z + (Math.random() - .5)*spread; q.vx = (Math.random() - .5)*1.2*S; q.vy = (.2 + Math.random()*.6)*S; q.vz = (Math.random() - .5)*1.2*S; q.life = q.max = 5 + Math.random()*4; q.c = c.clone(); q.s0 = 5*S; q.s1 = 16*S; q.glow = 1; } }
  const types = ["peony", "chrys", "willow", "ring", "palm", "crackle", "strobe", "crossette", "peony", "chrys", "willow"];
  const pals = [["red", "gold"], ["blue", "silver"], ["green", "gold"], ["purple", "pink"], ["gold", "gold"], ["teal", "white"], ["pink", "white"], ["orange", "red"], ["white", "blue"]];
  function burst(x, y, z, type, pal, cam){
    const c1 = col(pal[0]), c2 = col(pal[1]), sp = S*(type === "willow" ? 8.5 : type === "palm" ? 15 : 13 + Math.random()*3), axis = new THREE.Vector3(Math.random() - .5, 1, Math.random() - .5).normalize();
    const ring = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0)).normalize(), ring2 = new THREE.Vector3().crossVectors(axis, ring);
    const N = type === "palm" ? 9 : type === "crossette" ? 16 : type === "ring" ? 90 : type === "willow" ? 110 : 150;
    for (let i = 0; i < N; i++){
      let vx, vy, vz;
      if (type === "ring"){ const a = i/N*6.283; vx = (ring.x*Math.cos(a) + ring2.x*Math.sin(a))*sp; vy = (ring.y*Math.cos(a) + ring2.y*Math.sin(a))*sp; vz = (ring.z*Math.cos(a) + ring2.z*Math.sin(a))*sp; }
      else { const u = Math.random()*2 - 1, a = Math.random()*6.283, r = Math.sqrt(1 - u*u), k = sp*(type === "palm" ? 1 : .82 + Math.random()*.18); vx = r*Math.cos(a)*k; vy = u*k + (type === "palm" ? 3*S : 0); vz = r*Math.sin(a)*k; }
      const cc = type === "crackle" || type === "willow" ? col("gold") : (i % 4 === 0 ? c2 : c1);
      if (type === "peony") spark(x, y, z, vx, vy, vz, 1.6 + Math.random()*.6, cc, 2.4*S, 1.6, 4.5*S, { c2: Math.random() < .5 ? c2 : null, flick: .35 });
      else if (type === "chrys") spark(x, y, z, vx, vy, vz, 1.8 + Math.random()*.5, cc, 2.2*S, 1.5, 4.5*S, { trail: .03, tc: col("gold") });
      else if (type === "willow") spark(x, y, z, vx, vy, vz, 3.8 + Math.random()*.9, cc, 2.0*S, 2.4, 2.4*S, { trail: .022, tc: col("gold"), flick: .15 });
      else if (type === "ring") spark(x, y, z, vx, vy, vz, 1.7, cc, 2.4*S, 1.4, 3.5*S, { c2 });
      else if (type === "palm") spark(x, y, z, vx, vy, vz, 2.4, col("gold"), 3.6*S, 1.1, 5*S, { trail: .012, tc: col("white") });
      else if (type === "crackle") spark(x, y, z, vx, vy, vz, 1.4 + Math.random()*.5, cc, 2.0*S, 1.7, 4*S, { crackle: 1, trail: .05, tc: col("gold") });
      else if (type === "strobe") spark(x, y, z, vx, vy, vz, 2.4 + Math.random()*.6, col("white"), 2.3*S, 1.6, 3.5*S, { strobe: 1 });
      else if (type === "crossette") spark(x, y, z, vx*.8, vy*.8, vz*.8, .75, cc, 2.8*S, 1.0, 4*S, { split: 1, trail: .02, tc: cc });
    }
    // core flash + light + smoke + sound
    for (let i = 0; i < 26; i++) spark(x, y, z, (Math.random() - .5)*4*S, (Math.random() - .5)*4*S, (Math.random() - .5)*4*S, .18, col("white"), 7*S, 3, 0);
    const L = lights[li++ % 3]; L.position.set(x, y, z); L.color.copy(c1).lerp(new THREE.Color(1, 1, 1), .3); L.intensity = 9; L.userData.k = 9;
    puffSmoke(x, y, z, c1.clone().multiplyScalar(.5), 7, 10*S);
    if (o.sound && cam){ const d = cam.position.distanceTo(new THREE.Vector3(x, y, z)); o.sound.boom(d/343, type === "willow" ? .7 : 1); if (type === "crackle") o.sound.crackle(d/343 + 1.3, 40); }
  }
  const rockets = [];
  function launch(pos, height, type, pal){
    const h = height*(.8 + Math.random()*.35), g0 = 9.8*S, v = Math.sqrt(2*g0*h);
    rockets.push({ x: pos.x + (Math.random() - .5)*2, y: pos.y, z: pos.z + (Math.random() - .5)*2, vx: (Math.random() - .5)*2*S, vy: v, vz: (Math.random() - .5)*2*S, fuse: v/g0*.96, type: type || types[Math.floor(Math.random()*types.length)], pal: pal || pals[Math.floor(Math.random()*pals.length)] });
    if (o.sound && o.cam) o.sound.launch(o.cam.position.distanceTo(new THREE.Vector3(pos.x, pos.y, pos.z))/343);
  }
  let showT = 2, finaleT = 40, finaleN = 0;
  const F = { launch, show: null, origin: null, setSound(snd){ o.sound = snd; },
    update(dt, cam, on){
      o.cam = cam;
      if (on && F.origin){ showT -= dt; finaleT -= dt;
        if (finaleT <= 0 && finaleN === 0){ finaleN = 12; }
        if (finaleN > 0 && showT <= 0){ finaleN--; showT = .22; launch(F.originJ(), F.height); if (finaleN === 0) finaleT = 45 + Math.random()*20; }
        else if (showT <= 0){ showT = .9 + Math.random()*2.2; launch(F.originJ(), F.height); if (Math.random() < .3){ const t = types[Math.floor(Math.random()*types.length)]; setTimeout(() => launch(F.originJ(), F.height, t), 150); } }
      }
      for (let i = rockets.length - 1; i >= 0; i--){ const r = rockets[i]; r.fuse -= dt; r.vy -= 9.8*S*dt; r.x += r.vx*dt; r.y += r.vy*dt; r.z += r.vz*dt;
        spark(r.x, r.y, r.z, (Math.random() - .5)*S, -2*S - Math.random()*2*S, (Math.random() - .5)*S, .45 + Math.random()*.3, col("gold"), 1.4*S, 2, 3*S, { flick: .6 });
        if (Math.random() < .25) puffSmoke(r.x, r.y, r.z, new THREE.Color(.25, .23, .22), 1, 1);
        if (r.fuse <= 0){ burst(r.x, r.y, r.z, r.type, r.pal, cam); rockets.splice(i, 1); } }
      for (let i = 0; i < MAX; i++){
        const q = p[i]; if (q.life <= 0){ Al[i] = 0; continue; }
        q.life -= dt; const t = 1 - q.life/q.max, dr = Math.exp(-q.drag*dt);
        q.vx *= dr; q.vy = q.vy*dr - q.grav*dt; q.vz *= dr; q.x += q.vx*dt; q.y += q.vy*dt; q.z += q.vz*dt;
        if (q.trail){ q.tt -= dt; if (q.tt <= 0){ q.tt = q.trail; spark(q.x, q.y, q.z, q.vx*.05, q.vy*.05 - .5*S, q.vz*.05, .5 + (q.trail < .025 ? .9 : .2), q.tc || new THREE.Color(q.r, q.g, q.b), q.s*.55, 2.5, 1.2*S, { flick: .5 }); } }
        if (q.split && t > .98){ q.split = 0; const c = new THREE.Color(q.r, q.g, q.b); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) spark(q.x, q.y, q.z, a*6*S + q.vx*.3, 2*S, b*6*S + q.vz*.3, 1.1, c, 2*S, 1.6, 4*S, { trail: .03, tc: col("gold") }); }
        if (q.crackle && q.life < dt*1.5){ for (let k = 0; k < 5; k++) spark(q.x, q.y, q.z, (Math.random() - .5)*5*S, (Math.random() - .5)*5*S, (Math.random() - .5)*5*S, .07 + Math.random()*.06, col("white"), 3*S, 4, 0); }
        let br = Math.min(1, (1 - t)*2.4) * (1 - q.flick + q.flick*Math.random());
        if (q.strobe) br *= (Math.sin(q.life*38 + i) > .2 ? 1 : .05);
        let r = q.r, gg = q.g, b = q.b; if (q.c2 && t > .5){ const k = Math.min(1, (t - .5)*3); r += (q.c2.r - r)*k; gg += (q.c2.g - gg)*k; b += (q.c2.b - b)*k; }
        P[i*3] = q.x; P[i*3+1] = q.y; P[i*3+2] = q.z; Cc[i*3] = r; Cc[i*3+1] = gg; Cc[i*3+2] = b; Z[i] = q.s*(1 - t*.5); Al[i] = br;
      }
      for (let i = 0; i < SMAX; i++){ const q = sm[i]; if (q.life <= 0){ SA[i] = 0; continue; } q.life -= dt; const t = 1 - q.life/q.max; q.x += q.vx*dt; q.y += q.vy*dt; q.z += q.vz*dt; q.glow *= Math.exp(-2.5*dt);
        SP[i*3] = q.x; SP[i*3+1] = q.y; SP[i*3+2] = q.z; const base = .12 + q.glow*.5; SC[i*3] = base + q.c.r*q.glow; SC[i*3+1] = base + q.c.g*q.glow; SC[i*3+2] = base*1.1 + q.c.b*q.glow; SZ[i] = q.s0 + (q.s1 - q.s0)*t; SA[i] = .28*Math.min(1, (1 - t)*1.6)*Math.min(1, t*8); }
      lights.forEach(l => { l.intensity = Math.max(0, l.intensity - dt*l.userData.k*4 || 0); });
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.aSize.needsUpdate = g.attributes.aAlpha.needsUpdate = true;
      sg.attributes.position.needsUpdate = sg.attributes.color.needsUpdate = sg.attributes.aSize.needsUpdate = sg.attributes.aAlpha.needsUpdate = true;
    },
    setShow(origin, spread, height){ F.origin = origin; F.spread = spread; F.height = height; F.originJ = () => ({ x: origin.x + (Math.random() - .5)*spread, y: origin.y, z: origin.z + (Math.random() - .5)*spread }); }
  };
  lights.forEach(l => l.userData.k = 9);
  return F;
}
