/* ============================================================
   WORLDKIT: PARTICLES (one pooled Points system: splash, spray, snow, dust, petals, embers)
============================================================ */
function makeParticles(scene, max = 4000){
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(max*3), col = new Float32Array(max*3), size = new Float32Array(max), alpha = new Float32Array(max);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1)); g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true,
    uniforms: { uScale: { value: 400 } },
    vertexShader: "attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA; uniform float uScale; void main(){ vC = color; vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = aSize*uScale/max(1.0,-mv.z); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "varying vec3 vC; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; gl_FragColor = vec4(vC, vA*smoothstep(0.5, 0.15, d)); }" });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
  const P = []; for (let i = 0; i < max; i++) P.push({ life: 0 });
  let next = 0;
  const S = {
    emit(p, v, o){ const q = P[next]; next = (next + 1) % max;
      Object.assign(q, { x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, life: o.life, max: o.life, g: o.g ?? 9.8, drag: o.drag ?? .2, s0: o.size, s1: o.grow ?? o.size, r: o.c.r, gg: o.c.g, b: o.c.b, a: o.a ?? .9, flutter: o.flutter || 0, floor: o.floor ?? -1e9 }); },
    update(dt){
      for (let i = 0; i < max; i++){
        const q = P[i];
        if (q.life <= 0){ alpha[i] = 0; continue; }
        q.life -= dt; const t = 1 - q.life/q.max;
        q.vy -= q.g*dt; const dr = Math.exp(-q.drag*dt); q.vx *= dr; q.vy *= dr; q.vz *= dr;
        if (q.flutter){ q.vx += Math.sin(q.life*7 + i)*q.flutter*dt; q.vz += Math.cos(q.life*5 + i)*q.flutter*dt; }
        q.x += q.vx*dt; q.y += q.vy*dt; q.z += q.vz*dt; if (q.y < q.floor){ q.y = q.floor; q.vy = 0; q.vx *= .5; q.vz *= .5; }
        pos[i*3] = q.x; pos[i*3+1] = q.y; pos[i*3+2] = q.z; col[i*3] = q.r; col[i*3+1] = q.gg; col[i*3+2] = q.b;
        size[i] = q.s0 + (q.s1 - q.s0)*t; alpha[i] = q.a*Math.min(1, (1 - t)*2.2)*Math.min(1, t*12 + .2);
      }
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.aSize.needsUpdate = g.attributes.aAlpha.needsUpdate = true;
    }, mat, pts };
  return S;
}

/* ============================================================
   WORLDKIT: FIREFLIES (night + dusk only, drifting glow points)
============================================================ */
function makeFireflies(scene, n, center, rx, rz, hgt, groundFn){
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n*3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++){ const x = center.x + (Math.random() - .5)*rx*2, z = center.z + (Math.random() - .5)*rz*2; pos[i*3] = x; pos[i*3+1] = (groundFn ? groundFn(x, z) : center.y) + .4 + Math.random()*hgt; pos[i*3+2] = z; seed[i] = Math.random()*100; }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
    vertexShader: "attribute float aSeed; uniform float uTime; varying float vB; void main(){ vec3 p = position; p.x += sin(uTime*0.4 + aSeed)*1.6; p.y += sin(uTime*0.7 + aSeed*1.7)*0.6; p.z += cos(uTime*0.35 + aSeed*0.6)*1.6; vB = pow(0.5 + 0.5*sin(uTime*(1.5 + fract(aSeed)*2.0) + aSeed*7.0), 3.0); vec4 mv = modelViewMatrix*vec4(p,1.0); gl_PointSize = (2.0 + vB*5.0)*260.0/max(1.0,-mv.z); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform float uOn; varying float vB; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.85,1.0,0.45), uOn*vB*smoothstep(0.5, 0.0, d)); }" });
  const p = new THREE.Points(g, mat); p.frustumCulled = false; scene.add(p);
  return { mat, update(dt, night){ mat.uniforms.uTime.value += dt; mat.uniforms.uOn.value += (night - mat.uniforms.uOn.value)*(1 - Math.exp(-1.2*dt)); } };
}

/* ============================================================
   WORLDKIT: SKY LANTERNS
============================================================ */
let _lanternTex = null;
function lanternTex(){
  if (_lanternTex) return _lanternTex;
  const c = document.createElement("canvas"); c.width = 32; c.height = 48; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 48); g.addColorStop(0, "#FFB24A"); g.addColorStop(.7, "#FFE2A0"); g.addColorStop(1, "#FFF6D8");
  x.fillStyle = g; x.beginPath(); x.moveTo(6, 2); x.lineTo(26, 2); x.lineTo(30, 44); x.lineTo(2, 44); x.closePath(); x.fill();
  x.strokeStyle = "rgba(160,80,20,.35)"; for (let i = 8; i < 44; i += 9){ x.beginPath(); x.moveTo(3, i); x.lineTo(29, i); x.stroke(); }
  _lanternTex = new THREE.CanvasTexture(c); return _lanternTex;
}
function makeSkyLanterns(scene, origin, n, size = 1, rise = 1.6, life = 40){
  const L = [];
  for (let i = 0; i < n; i++){
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lanternTex(), transparent: true, depthWrite: false, opacity: 0, fog: false }));
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color("#FFB866"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    s.scale.set(.6*size, .85*size, 1); g.scale.setScalar(2.4*size); scene.add(s, g);
    L.push({ s, g, t: Math.random()*life, x: origin.x + (Math.random() - .5)*10*size, z: origin.z + (Math.random() - .5)*10*size, ph: Math.random()*6 });
  }
  return { update(dt, on){ L.forEach(l => {
    l.t += dt*(on ? 1 : 0); const t = l.t % life, y = origin.y + t*rise;
    l.s.position.set(l.x + Math.sin(t*.2 + l.ph)*t*.5*size, y, l.z + Math.cos(t*.15 + l.ph)*t*.4*size); l.g.position.copy(l.s.position);
    const a = on ? Math.min(1, t*.5)*Math.max(0, 1 - (t - life*.75)/(life*.25)) : 0; l.s.material.opacity += (a - l.s.material.opacity)*.05; l.g.material.opacity = l.s.material.opacity*.8*(.85 + .15*Math.sin(t*6 + l.ph));
  }); } };
}

