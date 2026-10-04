/* ============================================================
   WORLDKIT: TIME OF DAY (port as src/game/environment/timeOfDay.ts)
   Every look in the game is a blend of these presets. Night is a real look, not a darkened day.
============================================================ */
const TOD_PRESETS = {
  dawn:   { zen:"#4A5F8E", hor:"#F3B49A", sun:"#FFB48C", sunI:1.15, el:.10, az:.9,  hemiS:"#9DB0D0", hemiG:"#5A4A48", hemiI:.6,  fog:"#E2BBA8", stars:.15, exp:1.0,  lamps:.55, day:.5 },
  day:    { zen:"#3D79C4", hor:"#CFE3EE", sun:"#FFF4E2", sunI:2.0,  el:.95, az:1.6,  hemiS:"#BBD3EA", hemiG:"#5A5644", hemiI:.8,  fog:"#C6DAE6", stars:0,   exp:1.0,  lamps:0,   day:1 },
  golden: { zen:"#5E77A6", hor:"#F2C18E", sun:"#FFC27A", sunI:1.9,  el:.2,  az:2.5,  hemiS:"#C9D4EA", hemiG:"#8A6A58", hemiI:.75, fog:"#E9C7A4", stars:0,   exp:1.08, lamps:.45, day:.8 },
  night:  { zen:"#050A18", hor:"#1B2846", sun:"#A9BCF0", sunI:.42, el:.75, az:-1.0, hemiS:"#34477A", hemiG:"#141420", hemiI:.42, fog:"#152038", stars:1,   exp:1.3,  lamps:1,   day:0 }
};
function makeTOD(scene, renderer, opts = {}){
  const L = c => new THREE.Color(c).convertSRGBToLinear();
  const cur = {}, tgt = {};
  const keysC = ["zen", "hor", "sun", "hemiS", "hemiG", "fog"], keysN = ["sunI", "el", "az", "hemiI", "stars", "exp", "lamps", "day"];
  const load = (o, p) => { keysC.forEach(k => o[k] = L(p[k])); keysN.forEach(k => o[k] = p[k]); };
  load(cur, TOD_PRESETS[opts.start || "day"]); load(tgt, TOD_PRESETS[opts.start || "day"]);
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSunC: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() }, uStars: { value: 0 }, uDark: { value: 0 }, uTime: { value: 0 } },
    vertexShader: "varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `varying vec3 vD; uniform vec3 uZen, uHor, uSunC, uSun; uniform float uStars, uDark, uTime;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
      float n(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ vec3 d = normalize(vD); float y = d.y;
        vec3 col = mix(uHor, uZen, pow(smoothstep(-0.05, 0.6, y), 0.8));
        float s = max(dot(d, uSun), 0.0);
        float day = 1.0 - uStars;
        col += uSunC*(pow(s, 5.0)*0.3 + pow(s, 60.0)*0.55)*(1.0 - uDark)*day;
        col = mix(col, vec3(1.0,0.96,0.88)*1.7, smoothstep(0.9992, 0.9997, s)*(1.0 - uDark)*day);
        // high wispy cirrus, warm near the sun, moonlit at night
        vec2 sp = d.xz/(max(y, 0.0) + 0.09);
        float ci = n(vec3(sp*vec2(0.45, 1.5) + vec2(uTime*0.004, 0.0), 1.3))*0.62 + n(vec3(sp*vec2(1.2, 3.6) + vec2(uTime*0.007, 0.0), 4.1))*0.38;
        float cir = smoothstep(0.55, 0.86, ci)*smoothstep(0.03, 0.3, y)*(1.0 - uDark*0.85);
        vec3 cirCol = mix(vec3(1.0, 0.98, 0.95)*(0.18 + 0.82*day), uSunC*1.25, 0.25 + 0.55*pow(s, 3.0)*day);
        col = mix(col, cirCol, cir*(0.22 + 0.33*day));
        col += uHor*0.07*exp(-abs(y)*14.0);
        // night: moon disc + glow, stars, milky way band
        col += vec3(0.85,0.9,1.0)*(smoothstep(0.99955, 0.9998, s)*1.6 + pow(s, 40.0)*0.25)*uStars;
        if (uStars > 0.01 && y > -0.02){
          vec3 q = d*240.0; float st = step(0.9965, h(floor(q)))*(0.55 + 0.45*sin(uTime*2.0 + h(floor(q))*40.0));
          vec3 band = normalize(vec3(0.3, 0.75, -0.6));
          float mw = exp(-pow(dot(d, band)*4.0, 2.0))*(0.6 + 0.6*n(d*6.0) + 0.3*n(d*18.0));
          col += (vec3(st) + vec3(0.55,0.6,0.8)*mw*0.22)*uStars*smoothstep(-0.02, 0.15, y)*(1.0 - uDark);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <encodings_fragment>
      }` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(opts.radius || 4500, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const S = opts.shadow || 45; Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 500 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, .7); scene.add(hemi);
  const lamps = [];   // { mat, base } emissive materials and { sprite, base } halos and { light, base }
  const dir = new THREE.Vector3();
  const T = { sky, skyMat, sun, hemi, cur, lamps, dir, name: opts.start || "day", dark: 0,
    set(name){ this.name = name; load(tgt, TOD_PRESETS[name]); },
    lamp(o){ lamps.push(o); return o; },
    update(dt, focus, cam){
      const k = 1 - Math.exp(-1.1*dt);
      keysC.forEach(c => cur[c].lerp(tgt[c], k)); keysN.forEach(c => cur[c] += (tgt[c] - cur[c])*k);
      dir.set(Math.cos(cur.el)*Math.cos(cur.az), Math.sin(cur.el), Math.cos(cur.el)*Math.sin(cur.az)).normalize();
      skyMat.uniforms.uZen.value.copy(cur.zen); skyMat.uniforms.uHor.value.copy(cur.hor); skyMat.uniforms.uSunC.value.copy(cur.sun); skyMat.uniforms.uSun.value.copy(dir);
      skyMat.uniforms.uStars.value = cur.stars; skyMat.uniforms.uDark.value = this.dark; skyMat.uniforms.uTime.value += dt;
      sun.color.copy(cur.sun); sun.intensity = cur.sunI*(1 - this.dark*.7); hemi.color.copy(cur.hemiS); hemi.groundColor.copy(cur.hemiG); hemi.intensity = cur.hemiI*(1 - this.dark*.3);
      if (scene.fog) scene.fog.color.copy(cur.fog);
      renderer.toneMappingExposure = cur.exp;
      if (focus){ sun.position.copy(focus).addScaledVector(dir, 200); sun.target.position.copy(focus); }
      if (cam) sky.position.copy(cam.position);
      const lv = .12 + .88*cur.lamps;
      lamps.forEach(l => { if (l.mat) l.mat.emissiveIntensity = l.base*lv; if (l.sprite) l.sprite.material.opacity = Math.min(1, l.base*cur.lamps); if (l.light) l.light.intensity = l.base*cur.lamps; });
    } };
  return T;
}
function timePicker(T, el){
  const names = [["dawn","Dawn"],["day","Day"],["golden","Golden hour"],["night","Night"]];
  el.innerHTML = names.map(([k, l]) => `<button data-t="${k}" aria-pressed="${k === T.name}">${l}</button>`).join("");
  el.querySelectorAll("button").forEach(b => b.onclick = () => { T.set(b.dataset.t); el.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); });
  addEventListener("keydown", e => { const i = ["Digit1","Digit2","Digit3","Digit4"].indexOf(e.code); if (i >= 0) el.querySelectorAll("button")[i].click(); });
}

