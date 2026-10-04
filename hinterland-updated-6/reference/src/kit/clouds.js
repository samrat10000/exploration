/* ============================================================
   CLOUDS (cozy cumulus): instanced soft puffs, each lit like a little sphere by the sun or moon.
   Fluffy noisy edges, warm tops, cool undersides, silver linings when backlit, slow billowing,
   storm darkening + lightning glow. Sorted back-to-front a few times a second.
   API: const CL = makeClouds(scene, max); CL.cumulus(x,y,z,size,seed,{dark}); CL.sea(...); CL.update(dt, camera, TOD, {dark, flash})
============================================================ */
function makeClouds(scene, MAX = 9000){
  const geo = new THREE.PlaneGeometry(1, 1);
  const aPuff = new Float32Array(MAX*4); // x density, y seed, z storm, w lift (0 base .. 1 top)
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSunV: { value: new THREE.Vector3() }, uLit: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uRim: { value: new THREE.Color() }, uTime: { value: 0 }, uFlash: { value: 0 }, uDark: { value: 0 } }]),
    vertexShader: `attribute vec4 aPuff; varying vec2 vUv; varying vec4 vP; uniform float uTime;
      #include <fog_pars_vertex>
      void main(){
        vUv = uv*2.0 - 1.0; vP = aPuff;
        vec3 c = instanceMatrix[3].xyz; float s = length(instanceMatrix[0].xyz);
        float b = 1.0 + 0.05*sin(uTime*0.25 + aPuff.y*31.0) + 0.03*sin(uTime*0.11 + aPuff.y*7.0);
        vec4 mvPosition = viewMatrix*vec4(c, 1.0);
        mvPosition.xy += position.xy*s*b;
        gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uSunV, uLit, uShade, uRim; uniform float uTime, uFlash, uDark; varying vec2 vUv; varying vec4 vP;
      #include <fog_pars_fragment>
      float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0 - 2.0*f); return mix(mix(hh(i), hh(i + vec2(1, 0)), u.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), u.x), u.y); }
      void main(){
        vec2 q = vUv; float seed = vP.y*17.0;
        float e = vn(q*2.2 + seed + uTime*0.02)*0.55 + vn(q*5.0 - seed + uTime*0.03)*0.3 + vn(q*11.0 + seed)*0.15;
        float r = length(q) + (e - 0.5)*0.55;
        float a = smoothstep(1.0, 0.35, r);
        if (a < 0.004) discard;
        float rr = clamp(length(q), 0.0, 1.0);
        vec3 n = normalize(vec3(q*0.9, sqrt(max(0.05, 1.0 - rr*rr))));
        float l = dot(n, normalize(uSunV));
        float lit = smoothstep(-0.45, 0.9, l)*(0.55 + 0.45*vP.w) + vP.w*0.15;
        float dens = vn(q*3.0 + seed*2.0);
        vec3 col = mix(uShade, uLit, clamp(lit - dens*0.12, 0.0, 1.0));
        col += uRim*pow(1.0 - n.z, 2.5)*max(0.0, -uSunV.z)*1.1*(1.0 - vP.z);
        col = mix(col, col*vec3(0.42, 0.45, 0.52), max(vP.z, uDark*0.6));
        col += vec3(0.75, 0.82, 1.0)*uFlash*(0.35 + 0.65*(1.0 - lit))*(0.3 + vP.z);
        gl_FragColor = vec4(col, a*vP.x);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
      }` });
  const im = new THREE.InstancedMesh(geo, mat, MAX); im.count = 0; im.frustumCulled = false; im.renderOrder = 2;
  geo.setAttribute("aPuff", new THREE.InstancedBufferAttribute(aPuff, 4));
  scene.add(im);
  const pos = [], rad = [], data = [];
  const d = new THREE.Object3D();
  function addPuff(x, y, z, r, dens, seed, storm, lift){ if (pos.length >= MAX*3) return; pos.push(x, y, z); rad.push(r); data.push(dens, seed, storm, lift); }
  const C = {
    mat, im,
    puff: addPuff,
    // one cumulus: flat base, rounded towers, smaller puffs on top
    cumulus(x, y, z, size, seed = 1, o = {}){
      const R = rng(Math.floor(seed*997) + 3), storm = o.dark || 0, tall = o.tall || 1;
      const nb = 6 + Math.floor(size/14);
      for (let i = 0; i < nb; i++){ const a = R()*6.28, rr = Math.sqrt(R())*size*.85; addPuff(x + Math.cos(a)*rr, y + R()*size*.06, z + Math.sin(a)*rr*.75, size*(.32 + R()*.22), .9, R(), storm, .05); }
      const towers = 2 + Math.floor(R()*3);
      for (let t = 0; t < towers; t++){
        const ta = R()*6.28, tr = R()*size*.45, tx = x + Math.cos(ta)*tr, tz = z + Math.sin(ta)*tr*.75, th = size*(.5 + R()*.6)*tall;
        const levels = 3 + Math.floor(th/size*4);
        for (let k = 0; k < levels; k++){ const f = k/(levels - 1), rs = size*(.42 - f*.2)*(.8 + R()*.4); for (let j = 0; j < 2 + Math.floor(R()*2); j++){ const ja = R()*6.28, jr = rs*.5*R(); addPuff(tx + Math.cos(ja)*jr, y + size*.12 + f*th, tz + Math.sin(ja)*jr*.75, rs, .95, R(), storm, .3 + f*.7); } }
      }
    },
    // flat-topped storm tower with an anvil
    cumulonimbus(x, y, z, size, seed = 1){
      C.cumulus(x, y, z, size, seed, { dark: .7, tall: 2.6 });
      const R = rng(seed*31 + 7); for (let i = 0; i < 26; i++){ const a = R()*6.28, rr = Math.sqrt(R())*size*1.4; addPuff(x + Math.cos(a)*rr, y + size*2.9 + R()*size*.2, z + Math.sin(a)*rr*.8, size*(.35 + R()*.2), .9, R(), .45, .9); }
    },
    // a lumpy carpet of cloud tops between x0..x1, z0..z1 at height y
    sea(x0, x1, z0, z1, y, step = 70, seed = 5){
      const R = rng(seed);
      for (let z = z0; z < z1; z += step*.8) for (let x = x0; x < x1; x += step){
        const jx = x + (R() - .5)*step, jz = z + (R() - .5)*step*.8, big = R();
        addPuff(jx, y + R()*6, jz, step*(.75 + R()*.5), .95, R(), 0, .2);
        if (big > .55) addPuff(jx + (R() - .5)*20, y + 10 + R()*14, jz + (R() - .5)*20, step*(.45 + R()*.35), .95, R(), 0, .55 + R()*.3);
        if (big > .9) addPuff(jx, y + 26 + R()*14, jz, step*(.35 + R()*.2), .95, R(), 0, .9);
      }
    },
    build(){ im.count = rad.length; const N = im.count; for (let i = 0; i < N; i++){ d.position.set(pos[i*3], pos[i*3+1], pos[i*3+2]); d.scale.setScalar(rad[i]*2); d.updateMatrix(); im.setMatrixAt(i, d.matrix); aPuff.set(data.slice(i*4, i*4 + 4), i*4); } im.instanceMatrix.needsUpdate = true; geo.attributes.aPuff.needsUpdate = true; C.order = new Uint32Array(N).map((_, i) => i); C.key = new Float32Array(N); C.src = { m: im.instanceMatrix.array.slice(0, N*16), a: aPuff.slice(0, N*4) }; },
    sortT: 0,
    sort(cam){ const N = im.count, s = C.src, k = C.key, o = C.order, cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
      for (let i = 0; i < N; i++){ const dx = s.m[i*16 + 12] - cx, dy = s.m[i*16 + 13] - cy, dz = s.m[i*16 + 14] - cz; k[i] = dx*dx + dy*dy + dz*dz; }
      o.sort((a, b) => k[b] - k[a]);
      const M = im.instanceMatrix.array; for (let j = 0; j < N; j++){ const i = o[j]; M.set(s.m.subarray(i*16, i*16 + 16), j*16); aPuff.set(s.a.subarray(i*4, i*4 + 4), j*4); }
      im.instanceMatrix.needsUpdate = true; geo.attributes.aPuff.needsUpdate = true; },
    // colours come from the time of day: warm tops / lavender shade at golden hour, moon-silver at night
    update(dt, cam, TOD, o = {}){
      const u = mat.uniforms; u.uTime.value += dt; u.uFlash.value = o.flash || 0; u.uDark.value = o.dark || 0;
      cam.updateMatrixWorld(); u.uSunV.value.copy(TOD.dir).transformDirection(cam.matrixWorldInverse);
      const day = TOD.cur.day, white = new THREE.Color(1, 1, 1);
      u.uLit.value.copy(TOD.cur.sun).lerp(white, .35*day).multiplyScalar(.55 + .55*day);
      u.uShade.value.copy(TOD.cur.hemiS).lerp(TOD.cur.zen, .35).multiplyScalar(.5 + .3*day);
      u.uRim.value.copy(TOD.cur.sun).multiplyScalar(.6 + .6*day);
      u.fogColor.value.copy(scene.fog.color); u.fogDensity.value = scene.fog.density;
      C.sortT -= dt; if (C.sortT <= 0 && im.count){ C.sortT = .35; C.sort(cam); }
    } };
  return C;
}
