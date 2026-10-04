/* ============================================================
   VALLEY OF FLOWERS DEMO (J15)
============================================================ */
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle("on", on);
const isTouch = matchMedia("(pointer: coarse)").matches;
const canvas = $("c");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (e){ $("veil").querySelector("p").textContent = "WebGL is off in this browser, so the valley can't render. Turn on hardware acceleration and reload."; return; }
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0xc6dae6, .0021);
const camera = new THREE.PerspectiveCamera(56, 1, .2, 6000);
const timeU = { value: 0 }, carU = { value: new THREE.Vector3(0, -99, 0) };
const TOD = makeTOD(scene, renderer, { start: "day", shadow: 38 });
timePicker(TOD, $("time"));
const sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0)/(e1 - e0))); return t*t*(3 - 2*t); };
const mixN = (a, b, t) => a + (b - a)*t;
const fbm = (x, z, o) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++){ s += a*n3(x*f, 7.31 + i, z*f); f *= 2.03; a *= .5; } return s; };

/* ---------- valley shape: one height function drives mesh, props and wheels ---------- */
const vcx = z => 30*Math.sin(z*.004) + 14*Math.sin(z*.011 + 1);
const pathX = z => vcx(z) + 16*Math.sin(z*.012 + .4);
const streamX = z => vcx(z) - 26*Math.sin(z*.009 + .5) + 6;
const floorY = z => 3 + 113*sm(160, 640, z) - 3*sm(160, -420, z);
const halfW = z => (72 + 26*fbm(z*.008, 3, 2))*mixN(.42, 1, 1 - sm(330, 600, z));
const LAKE = { x: vcx(-505) - 10, z: -505 }; LAKE.y = -.55;
const pathNoise = z => fbm(z*.02, 11, 2)*.5;
function baseH(x, z){
  const d = Math.abs(x - vcx(z));
  let h = floorY(z) + fbm(x*.03, z*.03, 3)*1.6 + fbm(x*.11, z*.11, 2)*.35;
  const w = Math.max(0, d - halfW(z));
  h += Math.pow(w, 1.32)*.42*(.75 + .5*fbm(x*.008, z*.008, 3)) + w*w*.004;
  h += Math.max(0, fbm(x*.005 + 4, z*.005, 4))*Math.min(w, 140)*1.5;
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < 88) h = mixN(h, -2.2, 1 - sm(46, 88, dl));
  return h;
}
const HOLES = [];
{ const r = rng(5); for (let z = 400; z > -400; z -= 22 + r()*26){ HOLES.push({ z, dx: (r() - .5)*2.4, r: .5 + r()*.35, d: r() > .35 ? -(.13 + r()*.1) : .16 + r()*.06 }); } }
let FORD_Z = null, BRIDGE_Z = null;
{ let prev = streamX(620) - pathX(620); const cross = []; for (let z = 618; z > -420; z -= 2){ const v = streamX(z) - pathX(z); if (Math.sign(v) !== Math.sign(prev)) cross.push(z); prev = v; } FORD_Z = cross.find(z => z < 380 && z > 120) ?? cross[0]; BRIDGE_Z = cross.find(z => z < (FORD_Z ?? 400) - 120) ?? null; }
const bridgeH = z => floorY(z) + 1.0;
function terrainH(x, z){
  let h = baseH(x, z);
  const dp = Math.abs(x - pathX(z));
  if (dp < 4.4){ const ph = floorY(z) + pathNoise(z); h = mixN(h, ph, 1 - sm(2.4, 4.4, dp)); }
  if (z < 640 && z > -440){
    const ds = Math.abs(x - streamX(z)), bed = floorY(z) - .7;
    if (ds < 6.5 && h > bed) h = mixN(h, bed, (1 - sm(2.0, 6.5, ds))*(1 - sm(-430, -445, z)));
  }
  for (const o of HOLES){ const dz = z - o.z; if (Math.abs(dz) > 1.2) continue; const dd = Math.hypot(x - (pathX(o.z) + o.dx), dz); if (dd < o.r) h += o.d*(1 - (dd/o.r)**2); }
  return h;
}
const waterY = z => floorY(z) - .18;
function groundH(x, z){
  let h = terrainH(x, z);
  if (BRIDGE_Z !== null && Math.abs(z - BRIDGE_Z) < 9 && Math.abs(x - pathX(z)) < 2.5) h = Math.max(h, mixN(floorY(z) + pathNoise(z), bridgeH(BRIDGE_Z), 1 - sm(5.5, 9, Math.abs(z - BRIDGE_Z))));
  return h;
}
const SNOW_Z0 = 430, SNOW_Z1 = 640;

/* ---------- terrain mesh (vertex-painted: meadow with flower haze, stone, snow, wet bed) ---------- */
const X0 = -300, X1 = 330, Z0 = -580, Z1 = 720, SX = 190, SZ = 430;
const terrain = (() => {
  const g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, SX, SZ); g.rotateX(-Math.PI/2); g.translate((X0 + X1)/2, 0, (Z0 + Z1)/2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrainH(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const n = g.attributes.normal, cols = new Float32Array(p.count*3), c = new THREE.Color();
  const K = { m1: C("#5F7F3A"), m2: C("#7E9446"), dry: C("#A59A5E"), rock: C("#7C766E"), rock2: C("#5C5852"), snow: C("#EEF2F5"), bed: C("#4F4A40"), path: C("#8E8270"), pink: C("#D98AB0"), blue: C("#7FA9DA"), yel: C("#E3C24A"), pur: C("#9C7AC6"), white: C("#EDE9E0") };
  const haze = [K.pink, K.blue, K.yel, K.pur, K.white];
  for (let i = 0; i < p.count; i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = n.getY(i);
    const nn = fbm(x*.04, z*.04, 3), d = Math.abs(x - vcx(z)), hw = halfW(z);
    c.copy(K.m1).lerp(K.m2, Math.max(0, Math.min(1, .5 + nn)));
    const floorness = 1 - sm(hw - 8, hw + 10, d);
    if (floorness > .2 && z < 420 && z > -420){ const k = fbm(x*.09 + 3, z*.09, 2), sp = fbm(x*.21, z*.21 + 9, 2), hz = haze[Math.floor((k + .5)*5.99) % 5 + (k < -.5 ? 0 : 0)] || K.pink; c.lerp(hz, Math.max(0, sp + .05)*.75*floorness); }
    c.lerp(K.dry, sm(30, 90, y)*.5);
    const steep = sm(.86, .62, ny); c.lerp(mixC(K.rock, K.rock2, h3(Math.floor(x*.3), Math.floor(y*.3), Math.floor(z*.3))), steep);
    const snowAmt = sm(150, 210, y + nn*30)*sm(.5, .75, ny) + (z > SNOW_Z0 ? sm(SNOW_Z0, SNOW_Z0 + 40, z)*sm(.55, .8, ny) : 0);
    c.lerp(K.snow, Math.min(1, snowAmt));
    if (z < 640 && z > -440 && Math.abs(x - streamX(z)) < 3.2) c.lerp(K.bed, .85);
    if (Math.abs(x - pathX(z)) < 3) c.lerp(K.path, .7*(1 - (z > SNOW_Z0 ? sm(SNOW_Z0, SNOW_Z0 + 30, z) : 0)));
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < 64) c.lerp(K.bed, .6);
    cols[i*3] = c.r; cols[i*3+1] = c.g; cols[i*3+2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); m.receiveShadow = true; scene.add(m);
  m.userData = { arr: p.array, W: SX + 1 };
  return m;
})();
function gH(x, z){ // fast bilinear lookup on the mesh (for placing props)
  const { arr, W } = terrain.userData, fx = Math.max(0, Math.min(SX - 1e-3, (x - X0)/(X1 - X0)*SX)), fz = Math.max(0, Math.min(SZ - 1e-3, (z - Z0)/(Z1 - Z0)*SZ));
  const c = Math.floor(fx), r = Math.floor(fz), u = fx - c, v = fz - r, h = i => arr[i*3 + 1];
  return mixN(mixN(h(r*W + c), h(r*W + c + 1), u), mixN(h((r+1)*W + c), h((r+1)*W + c + 1), u), v);
}

/* ---------- merge helper: many vertex-coloured parts → one geometry (for instancing) ---------- */
function mergeParts(parts){
  const P = [], N = [], Cc = [];
  parts.forEach(({ geo, color, m }) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone(); if (m) g.applyMatrix4(m); g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    for (let i = 0; i < p.count; i++){ P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); if (c) Cc.push(c.getX(i), c.getY(i), c.getZ(i)); else Cc.push(color.r, color.g, color.b); }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); out.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); out.setAttribute("color", new THREE.Float32BufferAttribute(Cc, 3));
  return out;
}
function mergeGroup(group){
  group.updateMatrixWorld(true); const parts = [];
  group.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.geometry.attributes.position){ const mc = o.material.color ? o.material.color : new THREE.Color(1, 1, 1); parts.push({ geo: o.geometry, color: mc, m: o.matrixWorld }); } });
  return mergeParts(parts);
}
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));

/* ---------- meadow material: wind sway + plants part around the vehicle ---------- */
function meadowMat(opts = {}){
  const m = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: .8, side: THREE.DoubleSide }, opts));
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = timeU; sh.uniforms.uCar = carU;
    sh.vertexShader = "uniform float uTime; uniform vec3 uCar;\n" + sh.vertexShader.replace("#include <project_vertex>", `
      vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        float hgt = max(transformed.y, 0.0);
        mvPosition = instanceMatrix*mvPosition;
        vec3 ip = instanceMatrix[3].xyz;
        float gust = sin(dot(ip.xz, vec2(0.05, 0.035)) - uTime*1.3)*0.5 + 0.5;
        float sway = (sin(uTime*1.7 + ip.x*0.4 + ip.z*0.3)*0.05 + sin(uTime*3.1 + ip.x*1.7)*0.015)*(0.6 + gust);
        vec2 dd = ip.xz - uCar.xz; float dist = length(dd);
        vec2 push = dist < 2.8 ? (dd/max(dist, 0.001))*(2.8 - dist)*0.55 : vec2(0.0);
        mvPosition.x += (sway + push.x)*hgt*2.2; mvPosition.z += (sway*0.6 + push.y)*hgt*2.2;
        mvPosition.y -= length(push)*hgt*0.9;
      #endif
      mvPosition = modelViewMatrix*mvPosition; gl_Position = projectionMatrix*mvPosition;`);
  };
  return m;
}

/* ---------- flower species (Himalayan valley: blue poppy, primula, potentilla, geranium, anemone, lupin, balsam) ---------- */
const stemC = C("#4F6B33");
function stem(h){ const g = new THREE.CylinderGeometry(.005, .008, h, 4); g.translate(0, h/2, 0); return g; }
function disc(r, petal, center, petals = 5){
  const g = new THREE.CircleGeometry(r, petals*4), p = g.attributes.position, cols = [], P = C(petal), Ce = C(center);
  for (let i = 0; i < p.count; i++){ const x = p.getX(i), y = p.getY(i), a = Math.atan2(y, x), d = Math.hypot(x, y), k = d < 1e-5 ? 0 : .5 + .5*Math.abs(Math.cos(a*petals/2)); p.setXY(i, x*k, y*k); const c = d < 1e-5 ? Ce : P; cols.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); g.rotateX(-Math.PI/2 + .35); return g;
}
const SPECIES = [
  { name: "blue poppy", w: 1.0, geo: () => { const h = .48; const cup = new THREE.LatheGeometry([[0,0],[.03,.01],[.07,.05],[.085,.1]].map(q => new THREE.Vector2(q[0], q[1])), 7); return mergeParts([{ geo: stem(h), color: stemC }, { geo: cup, color: C("#7FB2E8"), m: M4(0, h, 0) }, { geo: new THREE.SphereGeometry(.022, 6, 4), color: C("#F2C230"), m: M4(0, h + .03, 0) }, { geo: disc(.05, "#5F8E3E", "#5F8E3E", 3), color: stemC, m: M4(.03, h*.4, 0, 0, 0, .6) }]); } },
  { name: "primula", w: 1.1, geo: () => { const h = .24, parts = [{ geo: stem(h), color: stemC }]; for (let k = 0; k < 5; k++){ const a = k*1.256; parts.push({ geo: disc(.028, "#E58AAE", "#F7E6A0"), m: M4(Math.cos(a)*.035, h, Math.sin(a)*.035, .3*Math.sin(a), 0, .3*Math.cos(a)) }); } return mergeParts(parts); } },
  { name: "potentilla", w: 1.2, geo: () => mergeParts([{ geo: stem(.14), color: stemC }, { geo: disc(.04, "#F2C230", "#E89A2E"), m: M4(0, .14, 0) }, { geo: disc(.034, "#F2C230", "#E89A2E"), m: M4(.07, .1, .02) }]) },
  { name: "geranium", w: 1.0, geo: () => mergeParts([{ geo: stem(.32), color: stemC }, { geo: disc(.05, "#9A6BC8", "#E8D8F0"), m: M4(0, .32, 0) }, { geo: disc(.045, "#8E5FC0", "#E8D8F0"), m: M4(-.06, .26, .03, 0, 1, 0) }]) },
  { name: "anemone", w: .9, geo: () => mergeParts([{ geo: stem(.3), color: stemC }, { geo: disc(.05, "#FBF8F2", "#F2C230", 6), m: M4(0, .3, 0) }]) },
  { name: "lupin", w: .55, geo: () => { const h = .62, parts = [{ geo: stem(h*.6), color: stemC }]; for (let k = 0; k < 9; k++) parts.push({ geo: new THREE.ConeGeometry(.04 - k*.0035, .06, 5), color: C(k % 2 ? "#7B6FD0" : "#9A8AE0"), m: M4(0, h*.45 + k*.045, 0) }); return mergeParts(parts); } },
  { name: "balsam", w: .7, geo: () => mergeParts([{ geo: stem(.36), color: stemC }, { geo: disc(.045, "#E8843B", "#F7D06A"), m: M4(0, .36, 0) }, { geo: disc(.04, "#F09A4E", "#F7D06A"), m: M4(.05, .3, -.03, 0, 2, 0) }]) }
];
const clumpGeo = (() => { const parts = []; for (let k = 0; k < 5; k++){ const a = k*1.26; parts.push({ geo: bladeGeo(.04, .34 + (k % 3)*.08, .1), m: M4(Math.cos(a)*.05, 0, Math.sin(a)*.05, 0, a*1.7, 0) }); } return mergeParts(parts); })();

/* place meadow plants: species chosen by drift noise, denser near the path */
(() => {
  const FN = 24000, GN = 11000, rnd = rng(77);
  const lists = SPECIES.map(() => []), grass = [];
  const inFloor = (x, z) => { const d = Math.abs(x - vcx(z)); if (d > halfW(z) - 4) return false; if (Math.abs(x - pathX(z)) < 2.7) return false; if (Math.abs(x - streamX(z)) < 3.4) return false; if (Math.hypot(x - LAKE.x, z - LAKE.z) < 66) return false; return true; };
  let tries = 0;
  while ((lists.reduce((a, l) => a + l.length, 0) < FN || grass.length < GN) && tries < 260000){
    tries++;
    const z = -440 + rnd()*860, x = vcx(z) + (rnd()*2 - 1)*halfW(z);
    if (!inFloor(x, z)) continue;
    const dp = Math.abs(x - pathX(z)); if (rnd() > 1/(1 + dp/30)) continue;
    const y = gH(x, z);
    if (grass.length < GN && rnd() < .45){ grass.push([x, y, z]); continue; }
    let best = 0, bv = -9; SPECIES.forEach((s, i) => { const v = fbm(x*.045 + i*13.1, z*.045 - i*7.7, 2)*s.w; if (v > bv){ bv = v; best = i; } });
    if (rnd() < .3) best = Math.floor(rnd()*SPECIES.length);
    lists[best].push([x, y, z]);
  }
  const d = new THREE.Object3D(), tint = new THREE.Color();
  const put = (geo, list, mat, sc) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, y, z], i) => { d.position.set(x, y - .02, z); d.rotation.set(0, rnd()*6.28, 0); const s = sc[0] + rnd()*(sc[1] - sc[0]); d.scale.set(s, s*(.8 + rnd()*.5), s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); tint.setScalar(.85 + rnd()*.3); im.setColorAt(i, tint); }); im.receiveShadow = true; im.frustumCulled = false; scene.add(im); };
  const fm = meadowMat();
  SPECIES.forEach((s, i) => put(s.geo(), lists[i], fm, [1.0, 1.9]));
  put(clumpGeo, grass, meadowMat({ roughness: .9 }), [1.1, 2.0]);
})();

const PAVE_MATS = [];
/* ---------- the stone path: individually laid flat stones + bigger edge stones ---------- */
(() => {
  const pave = new THREE.IcosahedronGeometry(1, 0); { const p = pave.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i)*.18); }
  const paveG = paintFaces(pave, (c, n, f) => mixC(C("#8E877C"), C("#A9A193"), h3(f, 3, 1)).lerp(C("#6F6A62"), Math.max(0, -n.y)));
  const edgeG = rockGeo(901, .5, .35, .4, 1, .5);
  const list = [], edges = [], rnd = rng(19);
  for (let z = 640; z > -405; z -= .62){
    const px = pathX(z), y = floorY(z) + pathNoise(z);
    if (BRIDGE_Z !== null && Math.abs(z - BRIDGE_Z) < 6) continue;
    if (FORD_Z !== null && Math.abs(z - FORD_Z) < 3.5) continue;
    for (let k = -2; k <= 2; k++){ if (rnd() < .12) continue; const x = px + k*.82 + (rnd() - .5)*.25; list.push([x, terrainH(x, z) + .02, z + (rnd() - .5)*.2, .32 + rnd()*.14]); }
    if (rnd() < .5) for (const sd of [-1, 1]) if (rnd() < .45) edges.push([px + sd*(2.6 + rnd()*.4), terrainH(px + sd*2.7, z), z, .6 + rnd()*.6]);
  }
  const d = new THREE.Object3D();
  const paveMat = VC(.92); PAVE_MATS.push(paveMat); const im = new THREE.InstancedMesh(paveG, paveMat, list.length);
  list.forEach(([x, y, z, s], i) => { d.position.set(x, y, z); d.rotation.set(0, rnd()*6.28, 0); d.scale.set(s, 1, s*(.8 + rnd()*.4)); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
  im.receiveShadow = true; scene.add(im);
  const ie = new THREE.InstancedMesh(edgeG, VC(.95), edges.length);
  edges.forEach(([x, y, z, s], i) => { d.position.set(x, y + .05, z); d.rotation.set(0, rnd()*6.28, 0); d.scale.setScalar(s); d.updateMatrix(); ie.setMatrixAt(i, d.matrix); });
  ie.castShadow = ie.receiveShadow = true; scene.add(ie);
  // pothole puddles (some hold water: splash) + bump stones
  HOLES.forEach(o => { const x = pathX(o.z) + o.dx, y = terrainH(x, o.z);
    if (o.d < 0){ const pd = new THREE.Mesh(new THREE.CircleGeometry(o.r*.8, 16), new THREE.MeshStandardMaterial({ color: lin("#5E6E78"), roughness: .05, metalness: .3 })); pd.rotation.x = -Math.PI/2; pd.position.set(x, y + .05, o.z); scene.add(pd); o.puddle = true; o.mesh = pd; }
    else { add(scene, rockGeo(700 + Math.floor(o.z), o.r*.8, o.d*1.6, o.r*.7, 1, .4), VC(.95), [x, y - o.d*.4, o.z]); } });
})();

/* ---------- streams, lake, waterfalls: one flowing-water shader ---------- */
const waterMat = new THREE.ShaderMaterial({ transparent: true, fog: true,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uSky: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uDir: { value: new THREE.Vector3() }, uFlow: { value: 1 }, uNight: { value: 0 } }]),
  vertexShader: `varying vec3 vW; varying vec2 vUv;
#include <fog_pars_vertex>
void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
  fragmentShader: `varying vec3 vW; varying vec2 vUv; uniform float uTime, uFlow, uNight; uniform vec3 uSky, uSun, uDir;
    #include <fog_pars_fragment>
    float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),u.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),u.x),u.y); }
    void main(){
      vec2 p = vW.xz*0.6 + vec2(0.0, uTime*1.4*uFlow);
      float a = vn(p) + 0.5*vn(p*2.3 + uTime*0.3), e = 0.1;
      float dx = vn(p + vec2(e,0.0)) - vn(p), dz = vn(p + vec2(0.0,e)) - vn(p);
      vec3 N = normalize(vec3(-dx*3.0, 1.0, -dz*3.0)); vec3 V = normalize(cameraPosition - vW);
      float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      vec3 deep = mix(vec3(0.12,0.24,0.26), vec3(0.03,0.05,0.09), uNight);
      vec3 col = mix(deep, uSky, 0.18 + fr*0.7);
      col += uSun*pow(max(dot(reflect(-V, N), uDir), 0.0), 120.0)*2.0;
      float foam = smoothstep(0.38, 0.5, abs(vUv.x - 0.5))*uFlow*(0.5 + 0.5*vn(p*3.0));
      col = mix(col, vec3(0.92,0.95,0.97)*(1.0 - uNight*0.7), foam*0.7);
      gl_FragColor = vec4(col, 0.86);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      #include <fog_fragment>
    }` });
(() => { // stream ribbon
  const verts = [], uvs = [], idx = []; let row = 0;
  for (let z = 640; z > -446; z -= 2){ const x = streamX(z), y = waterY(z), w = 2.4 + sm(400, 0, z)*1.2; verts.push(x - w, y, z, x + w, y, z); uvs.push(0, row*.1, 1, row*.1); if (row > 0){ const i = (row - 1)*2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); } row++; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, waterMat); m.renderOrder = 1; scene.add(m);
})();
const lake = new THREE.Mesh(new THREE.CircleGeometry(64, 48).rotateX(-Math.PI/2), waterMat.clone()); lake.material.uniforms = THREE.UniformsUtils.clone(waterMat.uniforms); lake.material.uniforms.uFlow.value = .08; lake.position.set(LAKE.x, LAKE.y, LAKE.z); scene.add(lake);
const fallsMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uTime: timeU },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
  fragmentShader: `varying vec2 vUv; uniform float uTime; float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); } float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),u.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),u.x),u.y); }
    void main(){ float s = vn(vec2(vUv.x*12.0, vUv.y*6.0 - uTime*2.4))*0.6 + vn(vec2(vUv.x*30.0, vUv.y*14.0 - uTime*3.6))*0.4; float edge = smoothstep(0.0, 0.25, vUv.x)*smoothstep(1.0, 0.75, vUv.x); gl_FragColor = vec4(vec3(0.88,0.94,0.96)*(0.75 + 0.35*s), edge*(0.35 + 0.55*s)); }` });
const mists = [];
[[1, 90], [-1, -130], [1, -300]].forEach(([side, z]) => {
  const xTop = vcx(z) + side*(halfW(z) + 95), xBot = vcx(z) + side*(halfW(z) - 2), rows = 26, verts = [], uvs = [], idx = [];
  for (let r = 0; r <= rows; r++){ const t = r/rows, x = mixN(xTop, xBot, t), y = terrainH(x, z) + .5; verts.push(x, y, z - 2.5, x, y, z + 2.5); uvs.push(0, t, 1, t); if (r < rows){ const i = r*2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); scene.add(new THREE.Mesh(g, fallsMat));
  for (let k = 0; k < 4; k++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: 0xffffff, transparent: true, depthWrite: false, opacity: .25 })); s.position.set(xBot + (Math.random() - .5)*4, terrainH(xBot, z) + 2 + k, z + (Math.random() - .5)*4); s.scale.setScalar(7 + k*2); scene.add(s); mists.push(s); }
});

/* ---------- trees, rhododendron, boulders (merged geometry, instanced) ---------- */
(() => {
  const rnd = rng(31), d = new THREE.Object3D();
  const pines = [0, 1, 2].map(s => mergeGroup(buildPine(10 + s, 8 + s)));
  const rhodo = (() => { const parts = []; for (let k = 0; k < 4; k++){ const g = new THREE.IcosahedronGeometry(.6 + k*.08, 1); parts.push({ geo: paintFaces(g, (c, n) => mixC(C("#2F4A30"), C("#4C6A3A"), n.y*.5 + .5)), m: M4(Math.cos(k*1.6)*.5, .55 + (k % 2)*.2, Math.sin(k*1.6)*.5) }); } for (let k = 0; k < 40; k++){ const u = rnd()*2 - 1, a = rnd()*6.28, r = Math.sqrt(1 - u*u); parts.push({ geo: new THREE.SphereGeometry(.09, 6, 4), color: C(k % 3 ? "#D9468A" : "#F07AAE"), m: M4(Math.cos(a)*r*.95, .7 + u*.55, Math.sin(a)*r*.95) }); } return mergeParts(parts); })();
  const rocks = [0, 1, 2, 3].map(k => rockGeo(500 + k, 1.4, .9, 1.1, 2));
  const lists = { pine: [[], [], []], rhodo: [], rock: [[], [], [], []] };
  for (let i = 0; i < 26000; i++){
    const z = -520 + rnd()*1150, side = rnd() > .5 ? 1 : -1, d0 = halfW(z) - 6 + rnd()*90, x = vcx(z) + side*d0;
    if (x < X0 + 5 || x > X1 - 5) continue; const y = gH(x, z); if (y > 175) continue;
    if (Math.abs(x - pathX(z)) < 6 || Math.abs(x - streamX(z)) < 5 || Math.hypot(x - LAKE.x, z - LAKE.z) < 70) continue;
    const r = rnd(), cl = fbm(x*.02, z*.02 + 40, 2);
    if (cl > .05 && r < .5 && lists.pine[0].length + lists.pine[1].length + lists.pine[2].length < 900) lists.pine[Math.floor(rnd()*3)].push([x, y, z, .7 + rnd()*.8]);
    else if (r < .62 && z < 380 && lists.rhodo.length < 420) lists.rhodo.push([x, y, z, .8 + rnd()*.9]);
    else if (r < .7) lists.rock[Math.floor(rnd()*4)].push([x, y, z, .4 + Math.pow(rnd(), 2)*2.4]);
  }
  for (let i = 0; i < 160; i++){ const z = -420 + rnd()*820, x = vcx(z) + (rnd()*2 - 1)*(halfW(z) - 10); if (Math.abs(x - pathX(z)) < 4 || Math.abs(x - streamX(z)) < 4 || Math.hypot(x - LAKE.x, z - LAKE.z) < 70) continue; lists.rock[i % 4].push([x, gH(x, z), z, .3 + rnd()*.9]); }
  const put = (geo, list, mat, cast = true) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, y, z, s], i) => { d.position.set(x, y - .1, z); d.rotation.set(0, rnd()*6.28, 0); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = cast; im.receiveShadow = true; scene.add(im); };
  pines.forEach((g, k) => put(g, lists.pine[k], VC(.9, { side: THREE.DoubleSide })));
  put(rhodo, lists.rhodo, VC(.85));
  rocks.forEach((g, k) => put(g, lists.rock[k], VC(.95)));
})();

/* ---------- landmarks: pass cairns + flags, stone bridge, mani wall, chorten (stupa), camp ---------- */
const flagLines = [], ANIM = [];
const P3 = (x, y, z) => new THREE.Vector3(x, y, z);
{ // the pass gate
  const z = 610, px = pathX(z);
  for (const sd of [-1, 1]){ const x = px + sd*5.5, y = terrainH(x, z); for (let k = 0; k < 7; k++) add(scene, rockGeo(950 + k + (sd > 0 ? 10 : 0), .7 - k*.07, .28, .6 - k*.06, 1, .5), VC(.95), [x, y + .2 + k*.32, z], [0, k, 0]); add(scene, cyl(.06, .08, 4.2, 6), M("#6B5034", .9), [x, y + 2.1, z]); }
  flagLines.push({ a: P3(px - 5.5, terrainH(px - 5.5, z) + 4.1, z), b: P3(px + 5.5, terrainH(px + 5.5, z) + 4.1, z), sag: .9, n: 22 });
  flagLines.push({ a: P3(px - 5.5, terrainH(px - 5.5, z) + 3.6, z), b: P3(px - 14, terrainH(px - 14, z + 6) + .4, z + 6), sag: .6, n: 14 });
  flagLines.push({ a: P3(px + 5.5, terrainH(px + 5.5, z) + 3.6, z), b: P3(px + 13, terrainH(px + 13, z - 7) + .4, z - 7), sag: .6, n: 14 });
}
if (BRIDGE_Z !== null){ // stone arch bridge
  const z = BRIDGE_Z, x = pathX(z), y = bridgeH(z), g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  add(g, box(4.6, .35, 11), M("#8C857A", .95), [0, y - .17, 0]);
  const arch = new THREE.CylinderGeometry(2.6, 2.6, 4.4, 20, 1, true, 0, Math.PI); arch.rotateZ(Math.PI/2); add(g, arch, M("#7E776C", .95, 0, { side: THREE.DoubleSide }), [0, y - 2.9, 0], [0, 0, 0]);
  for (const sx of [-1, 1]) for (let k = 0; k < 13; k++) add(g, rockGeo(1300 + k + (sx > 0 ? 20 : 0), .42, .3, .42, 1, .6), VC(.95), [sx*2.25, y + .25 + (k % 2)*.12, -5.2 + k*.86]);
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) add(g, rockGeo(1400 + sz + sx*3, .6, .9, .6, 1, .6), VC(.95), [sx*2.3, y + .7, sz*5.3]);
  for (let k = 0; k < 14; k++) add(g, box(4.2, .05, .7), M(k % 2 ? "#9A9387" : "#8A8378", .9), [0, y + .02, -4.9 + k*.75], [0, (k % 3 - 1)*.02, 0]);
  flagLines.push({ a: P3(x - 2.3, y + 1.4, z - 5.3), b: P3(x + 2.3, y + 1.4, z + 5.3), sag: .35, n: 16 });
  flagLines.push({ a: P3(x + 2.3, y + 1.4, z - 5.3), b: P3(x - 2.3, y + 1.4, z + 5.3), sag: .35, n: 16 });
}
const STUPA = { x: pathX(-405) + 14, z: -405 }; STUPA.y = terrainH(STUPA.x, STUPA.z);
const fwOrigin = () => ({ x: LAKE.x - 25, y: LAKE.y + 1, z: LAKE.z - 30 });
{ // chorten
  const g = new THREE.Group(); g.position.set(STUPA.x, STUPA.y - .2, STUPA.z); scene.add(g);
  const white = M("#F1EDE4", .85), gold = M("#D9A93A", .3, .7), red = M("#9E3A2E", .8);
  [[6, .8], [5, .7], [4.1, .6]].reduce((y, [w, h]) => { add(g, box(w, h, w), white, [0, y + h/2, 0]); add(g, box(w + .1, .08, w + .1), red, [0, y + h, 0]); return y + h; }, 0);
  const dome = new THREE.LatheGeometry([[0,0],[1.9,0],[2.0,.3],[1.85,1.4],[1.2,2.2],[0,2.5]].map(q => new THREE.Vector2(q[0], q[1])), 28);
  add(g, dome, white, [0, 2.1, 0]);
  add(g, box(1.3, .7, 1.3), white, [0, 4.85, 0]); add(g, box(1.45, .12, 1.45), gold, [0, 5.25, 0]);
  for (const r of [0, Math.PI/2, Math.PI, Math.PI*1.5]){ const e = new THREE.Group(); e.rotation.y = r; e.position.set(0, 4.9, 0); g.add(e); for (const sx of [-1, 1]){ add(e, new THREE.CircleGeometry(.1, 12, 0, Math.PI), M("#2A2E31", .6), [sx*.22, .05, .66], [0, 0, 0], [1.6, .9, 1]); } }
  for (let k = 0; k < 13; k++) add(g, cyl(.46 - k*.024, .48 - k*.024, .16, 18), gold, [0, 5.4 + k*.19, 0]);
  add(g, cyl(.9, .7, .1, 18), gold, [0, 7.95, 0]); add(g, new THREE.SphereGeometry(.18, 14, 10), gold, [0, 8.2, 0]); add(g, new THREE.ConeGeometry(.09, .5, 10), gold, [0, 8.55, 0]);
  const top = P3(STUPA.x, STUPA.y + 8, STUPA.z);
  for (let k = 0; k < 8; k++){ const a = k/8*Math.PI*2 + .2, r = 17; const bx = STUPA.x + Math.cos(a)*r, bz = STUPA.z + Math.sin(a)*r; const by = terrainH(bx, bz); add(scene, cyl(.05, .06, 1.6, 6), M("#6B5034", .9), [bx, by + .8, bz]); flagLines.push({ a: top, b: P3(bx, by + 1.5, bz), sag: 1.2, n: 24 }); }
  for (let k = 0; k < 8; k++){ const a = k/8*Math.PI*2; const lamp = add(scene, box(.18, .26, .18), glow("#FFC874", 1.6), [STUPA.x + Math.cos(a)*4, STUPA.y + .3, STUPA.z + Math.sin(a)*4]); TOD.lamp({ mat: lamp.material, base: 1.6 }); const hs = halo(scene, [STUPA.x + Math.cos(a)*4, STUPA.y + .5, STUPA.z + Math.sin(a)*4], "#FFC874", 1.2); TOD.lamp({ sprite: hs, base: .9 }); }
}
{ // mani wall along the last stretch
  for (let z = -330; z > -390; z -= 1.1){ const x = pathX(z) - 4.6, y = terrainH(x, z); add(scene, rockGeo(1500 + Math.floor(-z), .55, .4, .5, 1, .7), VC(.95), [x, y + .3, z]); if (Math.floor(-z) % 3 === 0) add(scene, box(.5, .34, .06), M("#E8E2D4", .8), [x + .3, y + .62, z], [0, Math.PI/2, -.15]); }
  flagLines.push({ a: P3(pathX(-330) - 4.6, terrainH(pathX(-330) - 4.6, -330) + 2.8, -330), b: P3(pathX(-392) - 4.6, terrainH(pathX(-392) - 4.6, -392) + 2.8, -392), sag: .8, n: 30 });
  for (const z of [-330, -392]){ const x = pathX(z) - 4.6; add(scene, cyl(.05, .07, 3, 6), M("#6B5034", .9), [x, terrainH(x, z) + 1.5, z]); }
}
const CAMP = { x: LAKE.x + 52, z: LAKE.z + 28 }; CAMP.y = terrainH(CAMP.x, CAMP.z);
{ // homestay + camp by the lake
  const hs = buildHouse({ seed: 52, walls: "stone", w: 4.6, d: 3.8, h: 2.4, pitch: .5, shutter: "#3E6FA8" }); hs.position.set(CAMP.x + 8, CAMP.y - .3, CAMP.z + 4); hs.rotation.y = -.6; scene.add(hs);
  const cf = buildCampfire(); cf.position.set(CAMP.x, CAMP.y, CAMP.z); scene.add(cf); ANIM.push(cf, hs);
  const tent = new THREE.Shape(); tent.moveTo(-1.4, 0); tent.lineTo(1.4, 0); tent.lineTo(0, 1.9); tent.lineTo(-1.4, 0);
  const tg = new THREE.ExtrudeGeometry(tent, { depth: 3, bevelEnabled: false }); add(scene, tg, M("#E8743B", .9, 0, { side: THREE.DoubleSide }), [CAMP.x - 5, CAMP.y, CAMP.z - 3], [0, .8, 0]);
  add(scene, box(.3, .5, .3), glow("#FFC874", 1.4), [CAMP.x - 3.4, CAMP.y + .9, CAMP.z - 2]);
  const lc = catenary(P3(CAMP.x - 4, CAMP.y + 2.6, CAMP.z - 5), P3(CAMP.x + 6, CAMP.y + 2.6, CAMP.z + 2), .5);
  add(scene, tube(lc, .008, 20, 4), M("#3A342C", .9));
  for (let i = 1; i <= 12; i++){ const p = lc.getPoint(i/13); const b = add(scene, new THREE.SphereGeometry(.08, 8, 6), glow("#FFC874", 1.3), [p.x, p.y - .08, p.z]); TOD.lamp({ mat: b.material, base: 1.3 }); TOD.lamp({ sprite: halo(scene, [p.x, p.y - .08, p.z], "#FFC874", .6), base: .8 }); }
  for (const sx of [-4, 6]) add(scene, cyl(.05, .06, 2.8, 6), M("#6B5034", .9), [CAMP.x + sx, CAMP.y + 1.4, CAMP.z + (sx < 0 ? -5 : 2)]);
  const p = buildPerson("traveler"); p.position.set(CAMP.x + 1.6, CAMP.y + .05, CAMP.z + 1.2); p.rotation.y = -2.2; scene.add(p);
}
makeFlagLines(scene, flagLines, timeU);
emissives.forEach(e => { if (e.light) TOD.lamp({ light: e.light, base: 1.6 }); if (e.sprite) TOD.lamp({ sprite: e.sprite, base: e.base }); if (e.plight) TOD.lamp({ light: e.plight, base: e.base }); if (e.m) TOD.lamp({ mat: e.m, base: e.base }); });
emissives.length = 0;

/* ---------- clouds around the peaks, butterflies (day), fireflies + sky lanterns (night) ---------- */
const cloudTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d"); const r = rng(3); for (let i = 0; i < 16; i++){ const cx = 40 + r()*176, cy = 64 + (r() - .5)*30, rad = 22 + r()*36; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
const CL = makeClouds(scene, 5000);
{ const r = rng(23); for (let i = 0; i < 24; i++){ const z = -520 + r()*1200, side = r() > .5 ? 1 : -1, x = vcx(z) + side*(halfW(z) + 50 + r()*160); CL.cumulus(x, 125 + r()*80, z, 30 + r()*30, 5 + i); }
  for (let i = 0; i < 10; i++){ const z = -500 + r()*1100, x = vcx(z) + (r() - .5)*120; CL.cumulus(x, 190 + r()*60, z, 26 + r()*22, 60 + i); } }
CL.build();
const butterflies = [];
{ const wing = new THREE.CircleGeometry(.07, 8); wing.translate(.07, 0, 0); const cols = ["#F2C230", "#FFFFFF", "#E8843B", "#7FB2E8", "#E58AAE"];
  for (let i = 0; i < 46; i++){ const b = new THREE.Group(), m = M(cols[i % 5], .7, 0, { side: THREE.DoubleSide }); const l = new THREE.Mesh(wing, m), r = new THREE.Mesh(wing, m); r.scale.x = -1; b.add(l, r); scene.add(b); butterflies.push({ b, l, r, ph: Math.random()*6.28, off: new THREE.Vector3((Math.random() - .5)*40, .6 + Math.random()*1.2, (Math.random() - .5)*40) }); } }
const flies = makeFireflies(scene, 1300, { x: vcx(-100), y: 0, z: -100 }, 80, 330, 2.4, (x, z) => gH(x, z));
const skyLanterns = makeSkyLanterns(scene, { x: CAMP.x + 2, y: CAMP.y + 1.5, z: CAMP.z }, 24);
const parts = makeParticles(scene, 5000);
const FW = makeFireworks(scene, { scale: 1.25, max: 16000 });
const SKYX = makeSkyExtras(scene, TOD, { aurora: true, geese: 1, geeseY: 170 });
let SND = null;

/* ============================================================
   WEATHER (clear / mist / rain / snow): arrives, soaks, dries, leaves a rainbow
   port as src/game/environment/weather.ts — see docs/WEATHER.md
============================================================ */
const WX = { target: "clear", rain: 0, mist: 0, snow: 0, wet: 0, snowCover: 0, rainbowT: 0, peakRain: 0, curtain: 0 };
const wetU = { value: 0 }, snowCoverU = { value: 0 }, cloudShU = { value: 0 };
function patchGround(mat){ // wet darkening + cloud shadows + settled snow, on any ground material
  mat.onBeforeCompile = sh => {
    sh.uniforms.uWet = wetU; sh.uniforms.uSnowC = snowCoverU; sh.uniforms.uCloudSh = cloudShU; sh.uniforms.uTime = timeU;
    sh.vertexShader = "varying vec3 vWp; varying vec3 vWn;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vec4 wpq = vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n wpq = instanceMatrix*wpq;\n #endif\n vWp = (modelMatrix*wpq).xyz; vWn = normalize(mat3(modelMatrix)*objectNormal);");
    sh.fragmentShader = "uniform float uWet, uSnowC, uCloudSh, uTime; varying vec3 vWp; varying vec3 vWn;\nfloat wh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }\nfloat wn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(wh(i),wh(i+vec2(1,0)),u.x),mix(wh(i+vec2(0,1)),wh(i+vec2(1,1)),u.x),u.y); }\n" +
      sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        float cs = wn(vWp.xz*0.004 + vec2(uTime*0.012, uTime*0.006))*0.65 + wn(vWp.xz*0.011 + vec2(uTime*0.02, 0.0))*0.35;
        diffuseColor.rgb *= 1.0 - uCloudSh*smoothstep(0.48, 0.62, cs);
        diffuseColor.rgb *= 1.0 - 0.28*uWet;
        float sn = smoothstep(0.72, 0.95, vWn.y)*smoothstep(0.25, 0.6, wn(vWp.xz*0.35)*0.5 + uSnowC*0.8);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), sn*uSnowC);`)
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.32, uWet*smoothstep(0.6, 0.95, vWn.y));");
  };
  mat.needsUpdate = true;
}
patchGround(terrain.material);
// rain streaks + snow flakes around the camera
const RAIN_N = 2600, rainPos = new Float32Array(RAIN_N*6);
for (let i = 0; i < RAIN_N; i++){ const x = (Math.random() - .5)*60, y = Math.random()*34, z = (Math.random() - .5)*60; rainPos.set([x, y, z, x + .05, y - .9, z], i*6); }
const rainG = new THREE.BufferGeometry(); rainG.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
const rainLines = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0xcfdbe6, transparent: true, opacity: 0, depthWrite: false })); rainLines.frustumCulled = false; scene.add(rainLines);
const SNOW_N = 2200, flakePos = new Float32Array(SNOW_N*3), flakeSeed = new Float32Array(SNOW_N);
for (let i = 0; i < SNOW_N; i++){ flakePos[i*3] = (Math.random() - .5)*60; flakePos[i*3+1] = Math.random()*30; flakePos[i*3+2] = (Math.random() - .5)*60; flakeSeed[i] = Math.random()*10; }
const flakeG = new THREE.BufferGeometry(); flakeG.setAttribute("position", new THREE.BufferAttribute(flakePos, 3));
const flakes = new THREE.Points(flakeG, new THREE.PointsMaterial({ color: 0xffffff, size: .12, transparent: true, opacity: 0, depthWrite: false })); flakes.frustumCulled = false; scene.add(flakes);
// the rain curtain you can watch coming down the valley
const curtainTex = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 256; const x = c.getContext("2d"); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "rgba(120,130,145,0)"); g.addColorStop(.25, "rgba(120,130,145,.7)"); g.addColorStop(1, "rgba(150,160,170,.55)"); x.fillStyle = g; x.fillRect(0, 0, 128, 256); x.globalCompositeOperation = "destination-out"; for (let i = 0; i < 70; i++){ x.fillStyle = `rgba(0,0,0,${Math.random()*.5})`; x.fillRect(Math.random()*128, 0, 1 + Math.random()*3, 256); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t; })();
const curtains = [];
for (let i = 0; i < 7; i++){ const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 160), new THREE.MeshBasicMaterial({ map: curtainTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: true })); m.position.y = -999; scene.add(m); curtains.push(m); }
// mist banks that roll across the valley floor
const mistBanks = [];
for (let i = 0; i < 34; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0 })); s.scale.set(60 + Math.random()*40, 10 + Math.random()*8, 1); scene.add(s); mistBanks.push({ s, ox: (Math.random() - .5)*220, oz: (Math.random() - .5)*260, h: 2 + Math.random()*6, sp: 1 + Math.random()*1.5 }); }
// puddles: the pothole ones grow, new ones appear along the path in rain; they mirror the sky
const puddleMat = waterMat.clone(); puddleMat.uniforms = THREE.UniformsUtils.clone(waterMat.uniforms); puddleMat.uniforms.uFlow.value = 0;
const puddles = [];
{ const rnd = rng(404); for (let i = 0; i < 70; i++){ const z = 400 - rnd()*800, x = pathX(z) + (rnd() - .5)*4.2; const m = new THREE.Mesh(new THREE.CircleGeometry(.6 + rnd()*1.1, 20), puddleMat); m.rotation.x = -Math.PI/2; m.position.set(x, terrainH(x, z) + .04, z); m.scale.setScalar(.001); m.userData.s = (.6 + rnd()*.6); scene.add(m); puddles.push(m); } }
// rainbow after the rain
const rainbow = new THREE.Mesh(new THREE.TorusGeometry(420, 16, 8, 90, Math.PI), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uO: { value: 0 } },
  vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
  fragmentShader: "varying vec3 vP; uniform float uO; vec3 h(float t){ return clamp(abs(mod(t*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); } void main(){ float r = clamp((length(vP.xy) - 405.0)/30.0, 0.0, 1.0); gl_FragColor = vec4(h(r*0.8), uO*0.42*sin(r*3.14159)); }" }));
scene.add(rainbow);
function setWeather(k){ WX.target = k; document.querySelectorAll("#weather button").forEach(b => b.setAttribute("aria-pressed", b.dataset.w === k)); }
$("weather").innerHTML = [["clear","Clear"],["mist","Mist"],["rain","Rain"],["snow","Snow"]].map(([k, l]) => `<button data-w="${k}" aria-pressed="${k === "clear"}">${l}</button>`).join("");
document.querySelectorAll("#weather button").forEach(b => b.onclick = () => setWeather(b.dataset.w));
const GREY = new THREE.Color(.5, .54, .6).convertSRGBToLinear();
function updateWeather(dt){
  const want = { rain: WX.target === "rain" ? 1 : 0, mist: WX.target === "mist" ? 1 : 0, snow: WX.target === "snow" ? 1 : 0 };
  WX.rain += (want.rain - WX.rain)*(1 - Math.exp(-(want.rain > WX.rain ? .09 : .14)*dt));
  WX.mist += (want.mist - WX.mist)*(1 - Math.exp(-.12*dt)); WX.snow += (want.snow - WX.snow)*(1 - Math.exp(-.1*dt));
  WX.wet = Math.max(WX.rain > .3 ? Math.min(1, WX.wet + dt*.06*WX.rain) : WX.wet - dt*.012, 0);
  WX.snowCover = Math.max(0, Math.min(1, WX.snowCover + (WX.snow > .4 ? dt*.02 : -dt*(.008 + WX.rain*.03))));
  WX.peakRain = Math.max(WX.peakRain, WX.rain);
  if (WX.peakRain > .45 && WX.rain < .12 && want.rain === 0){ WX.rainbowT = 70; WX.peakRain = 0; }
  wetU.value = WX.wet; snowCoverU.value = WX.snowCover;
  cloudShU.value = .3*TOD.cur.day*(1 - WX.rain)*(1 - WX.mist)*(1 - WX.snow);
  TOD.dark = Math.min(.7, WX.rain*.55 + WX.snow*.25 + WX.mist*.15);
  scene.fog.color.lerp(GREY.clone().multiplyScalar(.35 + .65*TOD.cur.day), Math.max(WX.rain*.7, WX.mist*.55, WX.snow*.6));
  scene.fog.density = .0021 + WX.rain*.006 + WX.mist*.013 + WX.snow*.008;
  // rain + snow around the camera
  const cp = camera.position, rp = rainG.attributes.position;
  for (let i = 0; i < RAIN_N; i++){ let y = rp.getY(i*2) - dt*26; let x = rp.getX(i*2), z = rp.getZ(i*2); if (y < cp.y - 8 || Math.abs(x - cp.x) > 30 || Math.abs(z - cp.z) > 30){ x = cp.x + (Math.random() - .5)*60; z = cp.z + (Math.random() - .5)*60; y = cp.y + 6 + Math.random()*24; } rp.setXYZ(i*2, x, y, z); rp.setXYZ(i*2 + 1, x + .05, y - .9, z); }
  rp.needsUpdate = true; rainLines.material.opacity = .32*WX.rain; rainLines.visible = WX.rain > .02;
  const fp = flakeG.attributes.position;
  for (let i = 0; i < SNOW_N; i++){ let x = fp.getX(i) + Math.sin(T*.8 + flakeSeed[i])*dt*.6, y = fp.getY(i) - dt*(1.1 + (flakeSeed[i] % 1)*.6), z = fp.getZ(i) + Math.cos(T*.6 + flakeSeed[i])*dt*.6; if (y < cp.y - 6 || Math.abs(x - cp.x) > 30 || Math.abs(z - cp.z) > 30){ x = cp.x + (Math.random() - .5)*60; z = cp.z + (Math.random() - .5)*60; y = cp.y + 4 + Math.random()*24; } fp.setXYZ(i, x, y, z); }
  fp.needsUpdate = true; flakes.material.opacity = .9*WX.snow; flakes.visible = WX.snow > .02;
  // curtain approaches down the valley while the rain builds, then you're inside it
  const approach = want.rain ? Math.max(0, 1 - WX.rain/.55) : 0;
  curtains.forEach((m, i) => { if (approach > .02){ const z = car.z - 30 - approach*330 + (i - 3)*6; m.position.set(vcx(z) + (i - 3)*34, floorY(z) + 70, z); m.lookAt(camera.position.x, m.position.y, camera.position.z); m.material.opacity = .55*Math.min(1, (1 - approach)*2.5); m.material.map.offset.y = -T*.6; } else m.material.opacity *= .95; });
  // mist banks
  mistBanks.forEach(o => { o.ox += o.sp*dt; if (o.ox > 120) o.ox = -120; const z = car.z + o.oz, x = vcx(z) + o.ox; o.s.position.set(x, gH(x, z) + o.h, z); o.s.material.opacity = .5*WX.mist + .12*WX.rain; o.s.material.color.copy(scene.fog.color).lerp(new THREE.Color(1, 1, 1), .5); });
  // puddles + rain ripples + drops splashing on the stones
  puddles.forEach(m => m.scale.setScalar(Math.max(.001, m.userData.s*sm(.15, .8, WX.wet))));
  HOLES.forEach(o => { if (o.mesh) o.mesh.scale.setScalar(1 + WX.wet*.7); });
  if (WX.rain > .2){
    for (let k = 0; k < 3; k++){ const p = puddles[Math.floor(Math.random()*puddles.length)]; if (p.scale.x > .2 && p.position.distanceTo(cp) < 60) ripple(p.position.x + (Math.random() - .5), p.position.y + .02, p.position.z + (Math.random() - .5)); }
    for (let k = 0; k < Math.floor(25*WX.rain); k++){ const x = car.x + (Math.random() - .5)*24, z = car.z + (Math.random() - .5)*24; parts.emit({ x, y: groundH(x, z) + .05, z }, { x: (Math.random() - .5)*.6, y: 1 + Math.random(), z: (Math.random() - .5)*.6 }, { life: .25, size: .04, c: new THREE.Color("#DDE8F0"), g: 9.8, a: .7 }); }
  }
  [puddleMat].forEach(m => { m.uniforms.uTime.value = T; m.uniforms.uSky.value.copy(TOD.cur.hor); m.uniforms.uSun.value.copy(TOD.cur.sun); m.uniforms.uDir.value.copy(TOD.dir); m.uniforms.uNight.value = 1 - TOD.cur.day; m.uniforms.fogColor.value.copy(scene.fog.color); m.uniforms.fogDensity.value = scene.fog.density; });
  // rainbow: opposite the sun, only in daylight
  if (WX.rainbowT > 0){ WX.rainbowT -= dt; if (WX.rainbowT < 60 && !WX.rbShown && TOD.cur.day > .4){ WX.rbShown = true; hint("A rainbow, over the far end of the valley", 5); } }
  const anti = new THREE.Vector3(-TOD.dir.x, 0, -TOD.dir.z).normalize();
  rainbow.position.set(cp.x + anti.x*900, gH(cp.x, cp.z) - 60, cp.z + anti.z*900); rainbow.lookAt(cp.x, rainbow.position.y, cp.z);
  const ro = WX.rainbowT > 0 ? Math.min(1, (70 - WX.rainbowT)/6, WX.rainbowT/8)*TOD.cur.day*(1 - WX.rain) : 0;
  rainbow.material.uniforms.uO.value += (ro - rainbow.material.uniforms.uO.value)*(1 - Math.exp(-1.5*dt)); if (WX.rainbowT <= 0) WX.rbShown = false;
}

PAVE_MATS.forEach(patchGround);
function hint(t, d = 4){ $("hint").textContent = t; show("hint", true); clearTimeout(hint._t); hint._t = setTimeout(() => show("hint", false), d*1000); }

/* ---------- deformable snow over the pass (tyres press real ruts) ---------- */
const SNOW = (() => {
  const COLS = 30, STEP = .5, W = COLS*STEP, rows = Math.floor((SNOW_Z1 - SNOW_Z0)/STEP);
  const n = (rows + 1)*(COLS + 1), pos = new Float32Array(n*3), base = new Float32Array(n), depth = new Float32Array(n), idx = [];
  for (let r = 0; r <= rows; r++){ const z = SNOW_Z1 - r*STEP, px = pathX(z); for (let c = 0; c <= COLS; c++){ const x = px - W/2 + c*STEP, i = r*(COLS + 1) + c; pos[i*3] = x; pos[i*3+2] = z; base[i] = terrainH(x, z); const edge = Math.min(c, COLS - c)/3; depth[i] = Math.min(1, edge)*(.3 + .06*n3(x*.4, 1, z*.4)) + .01; pos[i*3+1] = base[i] + depth[i]; } }
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++){ const a = r*(COLS + 1) + c, b = a + 1, d2 = a + COLS + 1, e = d2 + 1; idx.push(a, d2, b, b, d2, e); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: lin("#F4F7FA"), roughness: .7, metalness: 0 });
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; scene.add(mesh);
  let dirty = 0;
  return { inside: (x, z) => z > SNOW_Z0 && z < SNOW_Z1 && Math.abs(x - pathX(z)) < W/2 - .2,
    press(x, z, r){ // returns snow top height after compaction
      const rr = (SNOW_Z1 - z)/STEP, cc = (x - (pathX(z) - W/2))/STEP; const r0 = Math.floor(rr) - 2, c0 = Math.floor(cc) - 2; let top = -1e9;
      for (let a = r0; a <= r0 + 4; a++) for (let b = c0; b <= c0 + 4; b++){ if (a < 0 || a > rows || b < 0 || b > COLS) continue; const i = a*(COLS + 1) + b, dx = pos[i*3] - x, dz = pos[i*3+2] - z, d = Math.hypot(dx, dz);
        if (d < r){ if (depth[i] > .05){ depth[i] = Math.max(.05, depth[i] - .5*(1 - d/r) - .04); dirty = 2; } }
        else if (d < r + .35 && depth[i] < .42){ depth[i] += .006; dirty = 2; }
        pos[i*3+1] = base[i] + depth[i]; if (d < r*.6) top = Math.max(top, pos[i*3+1]); }
      return top;
    },
    update(){ if (dirty > 0){ g.attributes.position.needsUpdate = true; if (--dirty === 0 || Math.random() < .5) g.computeVertexNormals(); } },
    reset(){ for (let i = 0; i < n; i++){ const c = i % (COLS + 1), edge = Math.min(c, COLS - c)/3; depth[i] = Math.min(1, edge)*(.3 + .06*n3(pos[i*3]*.4, 1, pos[i*3+2]*.4)) + .01; pos[i*3+1] = base[i] + depth[i]; } dirty = 2; } };
})();

/* ============================================================
   THE ROVER: per-wheel spring-damper suspension (real bounce over holes and stones)
============================================================ */
const rover = buildRover(); scene.add(rover);
const wheels = [];
rover.children.slice().forEach(ch => { if (ch.isGroup && Math.abs(ch.position.y - .46) < .01 && Math.abs(Math.abs(ch.position.x) - .98) < .01){ const pivot = new THREE.Group(); pivot.position.copy(ch.position); rover.remove(ch); ch.position.set(0, 0, 0); pivot.add(ch); rover.add(pivot); wheels.push({ pivot, spin: ch, lx: pivot.position.x, lz: pivot.position.z }); } });
const bodyParts = rover.children.filter(c => !wheels.some(w => w.pivot === c));
const chassis = new THREE.Group(); rover.add(chassis); bodyParts.forEach(c => { rover.remove(c); chassis.add(c); });
emissives.forEach(e => { if (e.sprite) TOD.lamp({ sprite: e.sprite, base: e.base }); if (e.plight) TOD.lamp({ light: e.plight, base: e.base }); if (e.m) TOD.lamp({ mat: e.m, base: e.base }); }); emissives.length = 0;
const SUS = { rest: .5, travel: .26, k: 28, c: 1.9, r: .46, g: 13.7, Ip: 2.4, Ir: 1.05 };
const car = { x: 0, z: 0, yaw: 0, speed: 0, steer: 0, y: 0, vy: 0, pitch: 0, pv: 0, roll: 0, rv: 0, surf: "path", still: 0 };
wheels.forEach(w => { w.comp = 0; w.prev = 0; w.h = 0; w.contact = false; w.water = false; w.snow = false; w.off = 0; });
function resetCar(){
  car.z = 628; car.x = pathX(628); car.yaw = Math.PI + Math.atan2(pathX(626) - pathX(628), 2)*0; car.yaw = 0; car.speed = 0; car.steer = 0; car.vy = 0; car.pitch = car.roll = car.pv = car.rv = 0;
  car.y = groundH(car.x, car.z) + SUS.r + SUS.rest - .12; SNOW.reset();
}
const fwdOf = yaw => [-Math.sin(yaw), -Math.cos(yaw)];
function wheelXZ(w){ const c = Math.cos(car.yaw), s = Math.sin(car.yaw); return [car.x + w.lx*c + w.lz*s, car.z - w.lx*s + w.lz*c]; }
let landThud = 0, splashCD = 0;
function stepCar(dt, inp){
  car.steer += (inp.steer - car.steer)*(1 - Math.exp(-6*dt));
  const [fx, fz] = fwdOf(car.yaw);
  // --- surface under the vehicle ---
  let inWater = 0, onSnow = 0, onMeadow = 0;
  wheels.forEach(w => { const [x, z] = wheelXZ(w); let h = groundH(x, z); w.snow = SNOW.inside(x, z); if (w.snow){ const top = SNOW.press(x, z, .34); if (top > -1e8) h = Math.max(h, top - .04); onSnow++; }
    const wy = (z < 640 && z > -446 && Math.abs(x - streamX(z)) < 3.6) ? waterY(z) : (Math.hypot(x - LAKE.x, z - LAKE.z) < 64 ? LAKE.y : -1e9);
    const hole = HOLES.find(o => o.puddle && Math.hypot(x - (pathX(o.z) + o.dx), z - o.z) < o.r*.8);
    w.water = wy > h + .05 || !!hole; if (w.water) inWater++; if (Math.abs(x - pathX(z)) > 3 && !w.snow && !w.water) onMeadow++; w.h = h; w.wy = hole ? h + .1 : wy; });
  car.surf = onSnow >= 2 ? "snow" : inWater >= 2 ? "water" : onMeadow >= 2 ? "meadow" : "stone path";
  const hF = groundH(car.x + fx*1.6, car.z + fz*1.6), hB = groundH(car.x - fx*1.6, car.z - fz*1.6), slope = (hF - hB)/3.2;
  const contacts = wheels.filter(w => w.contact).length;
  const maxF = car.surf === "snow" ? 10 : car.surf === "water" ? 6 : car.surf === "meadow" ? 13 : 18;
  const drag = car.surf === "snow" ? .65 : car.surf === "water" ? 1.8 : car.surf === "meadow" ? .5 : .22;
  const t = inp.throttle;
  if (contacts >= 2){
    if (t > 0) car.speed += car.speed < -.5 ? 18*dt : 8.5*t*dt*Math.max(0, 1 - car.speed/maxF);
    else if (t < 0) car.speed += car.speed > .5 ? -16*dt : -5*dt*Math.max(0, 1 + car.speed/6);
    if (inp.brake){ const d = 20*dt; car.speed = Math.abs(car.speed) < d ? 0 : car.speed - Math.sign(car.speed)*d; }
    car.speed -= slope*9.8*.42*dt; car.speed -= car.speed*drag*dt;
    if (t === 0 && Math.abs(slope) < .35 && Math.abs(car.speed) < .4) car.speed = 0;
    const sp = Math.abs(car.speed), grip = Math.min(1, sp/4);
    car.yaw += car.steer*1.45*grip*(1 - .35*Math.min(1, sp/18))*(car.speed < 0 ? -1 : 1)*dt*(car.surf === "snow" ? .85 : 1);
  }
  car.x += fx*car.speed*dt; car.z += fz*car.speed*dt;
  // keep inside the valley (soft walls) and the map
  const d = car.x - vcx(car.z), lim = halfW(car.z) + 24; if (Math.abs(d) > lim){ car.x = vcx(car.z) + Math.sign(d)*lim; car.speed *= .9; }
  car.z = Math.max(-500, Math.min(650, car.z));
  // --- suspension (4 substeps, semi-implicit) ---
  const N = 4, h = dt/N;
  for (let s = 0; s < N; s++){
    let F = 0, tp = 0, tr = 0;
    wheels.forEach(w => {
      const attach = car.y + (-w.lz)*Math.sin(car.pitch) + w.lx*Math.sin(car.roll);
      const len = attach - (w.h + SUS.r); // distance from attach to wheel-on-ground
      const x = SUS.rest - len; // compression (+)
      w.contact = x > -SUS.travel*.2;
      if (x > -SUS.travel*.2){ const v = (x - w.prev)/h; let f = SUS.k*Math.max(0, x) + SUS.c*v; if (x > SUS.travel){ f += (x - SUS.travel)*400; } f = Math.max(0, f); F += f; tp += f*(-w.lz); tr += f*w.lx; }
      w.prev = x; w.comp = x;
    });
    const ay = F - SUS.g; car.vy += ay*h; car.y += car.vy*h;
    car.pv += (tp/SUS.Ip - car.pv*.6)*h; car.rv += (tr/SUS.Ir - car.rv*.6)*h;
    car.pitch += car.pv*h; car.roll += car.rv*h;
    car.pitch *= .999; car.roll *= .999;
  }
  // keep the attitude near the terrain's own tilt so it never drifts
  const avg = f => { const l = wheels.filter(f); return l.reduce((a, w) => a + w.h, 0)/l.length; }; const tilt = { p: Math.atan2(avg(w => w.lz < 0) - avg(w => w.lz > 0), 2.76), r: Math.atan2(avg(w => w.lx > 0) - avg(w => w.lx < 0), 1.96) };
  car.pitch += (tilt.p - car.pitch)*(1 - Math.exp(-1.2*dt)); car.roll += (tilt.r - car.roll)*(1 - Math.exp(-1.2*dt));
  if (car.vy < -3 && contacts === 4) landThud = Math.min(1, -car.vy*.12);
  // --- splash, spray, dust, petals ---
  splashCD -= dt; const sp = Math.abs(car.speed);
  wheels.forEach(w => {
    const [x, z] = wheelXZ(w), side = Math.sign(w.lx);
    const right = [Math.cos(car.yaw), -Math.sin(car.yaw)];
    if (w.water && sp > 1.2){
      for (let k = 0; k < Math.min(10, sp*.9); k++){ const up = 2.2 + Math.random()*2.8 + sp*.18; parts.emit({ x: x + side*.25, y: w.wy + .05, z }, { x: right[0]*side*(1.2 + Math.random()*2.4) + fx*car.speed*.35, y: up, z: right[1]*side*(1.2 + Math.random()*2.4) + fz*car.speed*.35 }, { life: .7 + Math.random()*.5, size: .16 + Math.random()*.16, grow: .05, c: new THREE.Color("#E6F2F7"), g: 9.8, drag: .4, a: .85, floor: w.wy }); }
      if (Math.random() < .5) parts.emit({ x, y: w.wy + .2, z }, { x: 0, y: .6, z: 0 }, { life: 1.2, size: .5, grow: 1.6, c: new THREE.Color("#F4F8FA"), g: 0, a: .25 });
      if (splashCD <= 0){ ripple(x, w.wy + .02, z); splashCD = .12; playSplash(sp); }
    } else if (w.snow && sp > 1.5){
      for (let k = 0; k < 4; k++) parts.emit({ x: x + side*.2, y: w.h + .15, z }, { x: right[0]*side*(.6 + Math.random()) - fx*car.speed*.15, y: 1 + Math.random()*1.6, z: right[1]*side*(.6 + Math.random()) - fz*car.speed*.15 }, { life: .9, size: .12, grow: .22, c: new THREE.Color("#FFFFFF"), g: 5, drag: .8, a: .9 });
      if (Math.random() < .25) crunch();
    } else if (car.surf === "stone path" && sp > 6 && Math.random() < .35){
      parts.emit({ x, y: w.h + .1, z }, { x: -fx*2 + (Math.random() - .5), y: .4 + Math.random()*.6, z: -fz*2 + (Math.random() - .5) }, { life: 1.8, size: .4, grow: 1.6, c: TOD.cur.day > .5 ? new THREE.Color("#C9B89A") : new THREE.Color("#6B6458"), g: -.2, drag: 1.2, a: .28 });
    } else if (car.surf === "meadow" && sp > 2 && Math.random() < .5){
      const pc = ["#E58AAE", "#7FB2E8", "#F2C230", "#9A6BC8", "#FFFFFF"][Math.floor(Math.random()*5)];
      parts.emit({ x, y: w.h + .4, z }, { x: (Math.random() - .5)*1.5, y: .8 + Math.random(), z: (Math.random() - .5)*1.5 }, { life: 2.5, size: .07, c: new THREE.Color(pc), g: .6, drag: 1.5, flutter: 3, a: 1 });
    }
  });
  car.still = sp < .3 && t === 0 ? car.still + dt : 0;
}
const ripples = [];
for (let i = 0; i < 24; i++){ const r = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); r.rotation.x = -Math.PI/2; scene.add(r); ripples.push({ r, t: 1 }); }
let rippleI = 0; function ripple(x, y, z){ const o = ripples[rippleI++ % ripples.length]; o.r.position.set(x, y, z); o.t = 0; }
function syncRover(dt){
  rover.position.set(car.x, car.y - SUS.rest - .46, car.z);
  rover.rotation.set(car.pitch, car.yaw, car.roll, "YXZ");
  wheels.forEach(w => { w.off += (Math.max(-SUS.travel, Math.min(SUS.travel, w.comp)) - w.off)*(1 - Math.exp(-30*dt)); w.pivot.position.y = .46 + w.off; w.spin.rotation.x -= car.speed*dt/SUS.r; if (w.lz < 0) w.pivot.rotation.y = car.steer*.45; });
  chassis.rotation.z = -car.steer*Math.min(1, Math.abs(car.speed)/12)*.03;
}

/* ============================================================
   AUDIO
============================================================ */
const A = {};
function initAudio(){
  if (A.ctx){ if (A.ctx.state === "suspended") A.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = new AC(); A.ctx = ctx; A.m = ctx.createGain(); A.m.gain.value = 0; A.m.connect(ctx.destination); A.m.gain.setTargetAtTime(.8, ctx.currentTime, 1.5);
  const buf = ctx.createBuffer(1, ctx.sampleRate*3, ctx.sampleRate), d = buf.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++){ const w = Math.random()*2 - 1; b = (b + .02*w)/1.02; d[i] = b*3.5 + w*.15; } A.buf = buf;
  const src = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random()*2); return s; };
  const chain = (type, f, q) => { const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; src().connect(fl); fl.connect(g); g.connect(A.m); return { fl, g }; };
  A.wind = chain("lowpass", 500); A.stream = chain("bandpass", 1300, .6); A.rain = chain("highpass", 1800);
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), eg = ctx.createGain(); o1.type = "sawtooth"; o2.type = "triangle"; lp.type = "lowpass"; eg.gain.value = 0; o1.connect(lp); o2.connect(lp); lp.connect(eg); eg.connect(A.m); o1.start(); o2.start(); Object.assign(A, { o1, o2, lp, eg });
  A.nextBird = 0; A.nextCricket = 0;
  SND = makeSound(ctx, ctx.destination); SND.start(); FW.setSound(SND);
}
function burst(type, f, dur, vol){ if (!A.ctx) return; const ctx = A.ctx, t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = A.buf; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(A.m); s.start(t, Math.random()*2); s.stop(t + dur + .05); }
let splashT = 0; function playSplash(sp){ if (splashT > 0) return; splashT = .18; burst("highpass", 900, .35, Math.min(.5, .1 + sp*.03)); }
let crunchT = 0; function crunch(){ if (crunchT > 0) return; crunchT = .09; burst("bandpass", 2200, .08, .12); }
function tone(f0, f1, dur, vol, type = "sine"){ if (!A.ctx) return; const ctx = A.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(A.m); o.start(t); o.stop(t + dur + .02); }
function updateAudio(dt){
  if (!A.ctx) return; const t = A.ctx.currentTime; splashT -= dt; crunchT -= dt;
  const alt = Math.max(0, Math.min(1, (car.y - 10)/110)), day = TOD.cur.day;
  A.wind.g.gain.setTargetAtTime(.12 + alt*.35 + .05*Math.sin(t*.3), t, .6); A.wind.fl.frequency.setTargetAtTime(380 + alt*500, t, .6);
  const ds = Math.abs(car.x - streamX(car.z)); A.stream.g.gain.setTargetAtTime(.32*(1 - sm(3, 40, ds)) + .08, t, .4);
  const rpm = .2 + Math.min(1, Math.abs(car.speed)/18)*.75 + (car.surf === "snow" || car.surf === "water" ? .2 : 0);
  A.o1.frequency.setTargetAtTime(40 + rpm*70, t, .08); A.o2.frequency.setTargetAtTime(20 + rpm*35, t, .08); A.lp.frequency.setTargetAtTime(240 + rpm*800, t, .1);
  const on = state === "drive" && car.still < 4; A.eg.gain.setTargetAtTime(on ? .04 + rpm*.09 : 0, t, on ? .15 : 1.2);
  if (t > A.nextBird && day > .4 && car.y < 60){ A.nextBird = t + 1.5 + Math.random()*4; const f = 2600 + Math.random()*1500; for (let i = 0; i < 3; i++) setTimeout(() => tone(f, f*1.3, .08, .04), i*120); }
  if (t > A.nextCricket && day < .3){ A.nextCricket = t + .25 + Math.random()*.5; tone(4200, 4100, .05, .02, "square"); }
  if (typeof WX !== "undefined"){ A.rain.g.gain.setTargetAtTime(WX.rain*.4, t, .5); if (WX.rain > .7 && Math.random() < dt*.04) burst("lowpass", 120, 3, .4); }
  if (landThud > 0){ burst("lowpass", 160, .25, landThud*.5); landThud = 0; }
}
addEventListener("pointerdown", initAudio, { once: true });


/* ============================================================
   DIRT, MUD, SNOW ON THE VEHICLE (one shader patch on every body material)
============================================================ */
const dirtU = { value: 0 }, mudColU = { value: new THREE.Color("#B5A27E").convertSRGBToLinear() }, roofSnowU = { value: 0 }, carPosU = { value: new THREE.Vector3() }, invRotU = { value: new THREE.Matrix3() };
const DUST = new THREE.Color("#B5A27E").convertSRGBToLinear(), MUD = new THREE.Color("#5B4632").convertSRGBToLinear();
const dirtState = { dirt: .05, mud: 0, snow: 0 };
rover.traverse(o => {
  if (!o.isMesh || !o.material || o.material.transparent || o.material.emissiveIntensity > 0 && o.material.emissive && o.material.emissive.r > .1) return;
  const m = o.material.clone();
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uDirt: dirtU, uMud: mudColU, uRoofSnow: roofSnowU, uCarPos: carPosU, uInvRot: invRotU });
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
  };
  o.material = m;
});
const _q = new THREE.Matrix4();
function updateDirt(dt){
  const sp = Math.abs(car.speed), wetGround = WX.wet > .35;
  if (car.surf === "water") dirtState.dirt = Math.max(0, dirtState.dirt - dt*.22*Math.min(1, sp/2 + .3));
  else if (car.surf === "meadow" || car.surf === "stone path"){ const rate = (wetGround ? .016 : .004)*(car.surf === "meadow" ? 1.6 : 1); dirtState.dirt = Math.min(1, dirtState.dirt + dt*rate*sp/8); dirtState.mud += ((wetGround ? 1 : 0) - dirtState.mud)*(1 - Math.exp(-dt*(wetGround ? .4 : .05))); }
  if (WX.rain > .5 && sp < 3) dirtState.dirt = Math.max(0, dirtState.dirt - dt*.012*WX.rain);
  dirtState.snow = Math.max(0, Math.min(1, dirtState.snow + (WX.snow > .4 ? dt*.03 : -dt*(car.z > SNOW_Z0 ? .002 : .012)) + (car.surf === "snow" && sp > 4 ? dt*.004 : 0)));
  dirtU.value = dirtState.dirt; roofSnowU.value = dirtState.snow;
  mudColU.value.copy(DUST).lerp(MUD, dirtState.mud);
  carPosU.value.set(car.x, rover.position.y, car.z);
  _q.makeRotationFromEuler(rover.rotation); invRotU.value.setFromMatrix4(_q).transpose();
  if (wetGround && (car.surf === "meadow") && sp > 3 && Math.random() < .6){ wheels.forEach(w => { const [x, z] = wheelXZ(w); parts.emit({ x, y: w.h + .2, z }, { x: (Math.random() - .5)*2 + Math.sin(car.yaw)*sp*.25, y: 1.2 + Math.random()*1.5, z: (Math.random() - .5)*2 + Math.cos(car.yaw)*sp*.25 }, { life: .8, size: .1, c: new THREE.Color("#4A3A2A"), g: 9.8, a: .9 }); }); }
}

/* ============================================================
   SEEDS → PLANT ANYWHERE → THEY GROW (and are remembered)
============================================================ */
const GARDEN_KEY = "hinterland.demo.garden";
const pouch = [];
const seedCols = ["#7FB2E8", "#E58AAE", "#F2C230", "#9A6BC8", "#FBF8F2", "#8A7BD8", "#E8843B"];
const pods = [];
{ const rnd = rng(909);
  for (let i = 0; i < 26; i++){ const z = 380 - i*30 - rnd()*12, side = rnd() > .5 ? 1 : -1, x = pathX(z) + side*(4 + rnd()*7); if (Math.abs(x - streamX(z)) < 4) continue;
    const sp = Math.floor(rnd()*SPECIES.length), g = new THREE.Group(); g.position.set(x, gH(x, z), z); scene.add(g);
    add(g, cyl(.01, .015, .6, 4), M("#56703A", .9), [0, .3, 0]);
    const puffM = new THREE.MeshStandardMaterial({ color: lin("#F7F4EC"), emissive: lin(seedCols[sp]), emissiveIntensity: .6, roughness: .9, transparent: true, opacity: .92 });
    const ball = add(g, new THREE.IcosahedronGeometry(.16, 1), puffM, [0, .66, 0]);
    for (let k = 0; k < 14; k++){ const u = rnd()*2 - 1, a = rnd()*6.28, r = Math.sqrt(1 - u*u); add(g, cyl(.003, .003, .14, 3), M("#FFFFFF", .9), [Math.cos(a)*r*.18, .66 + u*.18, Math.sin(a)*r*.18], [Math.sin(a)*1.2, 0, Math.cos(a)*1.2]); }
    const hs = halo(g, [0, .66, 0], seedCols[sp], .9); TOD.lamp({ sprite: hs, base: .5 });
    pods.push({ g, sp, ball, got: false, ph: rnd()*6 }); } }
const garden = [];
function plantAt(x, z, sp, t0, instant){
  const N = 34, geo = SPECIES[sp].geo(), im = new THREE.InstancedMesh(geo, meadowMat(), N), rnd = rng(Math.floor(x*13 + z*7));
  const slots = []; for (let i = 0; i < N; i++){ const a = rnd()*6.28, r = Math.sqrt(rnd())*1.6; const px = x + Math.cos(a)*r, pz = z + Math.sin(a)*r; slots.push([px, gH(px, pz), pz, rnd()*6.28, 1.1 + rnd()*.8, rnd()*.4]); }
  im.frustumCulled = false; scene.add(im);
  const stake = new THREE.Group(); stake.position.set(x, gH(x, z), z); scene.add(stake);
  add(stake, box(.05, .7, .05), M("#7A5A3E", .85), [0, .35, 0]); add(stake, box(.03, .22, .12), M(seedCols[sp], .8, 0, { side: THREE.DoubleSide }), [.04, .6, .07]);
  const p = { x, z, sp, t0, im, slots, grown: instant ? 1 : 0 }; garden.push(p); setPatch(p, instant ? 1 : 0);
  return p;
}
const _d = new THREE.Object3D();
function setPatch(p, g){ p.slots.forEach(([x, y, z, r, s, delay], i) => { const k = Math.max(0, Math.min(1, (g - delay)/(1 - delay))); const e = k*k*(3 - 2*k); _d.position.set(x, y - .02, z); _d.rotation.set(0, r, 0); _d.scale.set(s*Math.max(.001, e), s*Math.max(.001, e), s*Math.max(.001, e)); _d.updateMatrix(); p.im.setMatrixAt(i, _d.matrix); }); p.im.instanceMatrix.needsUpdate = true; }
function saveGarden(){ try { localStorage.setItem(GARDEN_KEY, JSON.stringify(garden.map(p => ({ x: p.x, z: p.z, sp: p.sp })))); } catch (e) {} }
try { (JSON.parse(localStorage.getItem(GARDEN_KEY) || "[]") || []).forEach(p => plantAt(p.x, p.z, p.sp, 0, true)); } catch (e) {}
function drawPouch(){ $("seeds").innerHTML = pouch.length ? `<span>seeds</span>${pouch.map(s => `<i style="background:${seedCols[s]}"></i>`).join("")}` : ""; show("seeds", pouch.length > 0 && !hideUI); }
function canPlant(){ return pouch.length && Math.abs(car.speed) < .6 && Math.abs(car.x - pathX(car.z)) > 3.2 && car.surf !== "water" && car.surf !== "snow" && (state === "drive" || state === "free"); }
function plant(){
  if (!canPlant()){ if (pouch.length && car.surf === "snow") hint("Too cold for seeds up here", 3); return; }
  const sp = pouch.shift(); const rx = Math.cos(car.yaw), rz = -Math.sin(car.yaw);
  const p = plantAt(car.x + rx*3.2, car.z + rz*3.2, sp, T, false); saveGarden(); drawPouch();
  tone(520, 780, .5, .05); setTimeout(() => tone(780, 1040, .6, .04), 180);
  hint(["Blue poppies, here, forever now", "Primulas. They'll spread a little each year", "Potentilla, the colour of the evening", "Geraniums, for whoever comes next", "Anemones, small and stubborn", "Lupins. Give them a minute", "Balsam, by the path"][sp], 4);
}
function updateSeeds(dt){
  pods.forEach(o => { if (o.got){ o.g.scale.multiplyScalar(Math.exp(-6*dt)); return; } o.ball.position.y = .66 + Math.sin(T*1.6 + o.ph)*.04; o.ball.rotation.y += dt*.4;
    if (Math.hypot(car.x - o.g.position.x, car.z - o.g.position.z) < 3.2 && (state === "drive" || state === "free")){ o.got = true; pouch.push(o.sp); drawPouch(); tone(880, 1320, .35, .05); for (let k = 0; k < 24; k++) parts.emit({ x: o.g.position.x, y: o.g.position.y + .66, z: o.g.position.z }, { x: (Math.random() - .5)*2, y: .5 + Math.random()*1.4, z: (Math.random() - .5)*2 }, { life: 2.5, size: .05, c: new THREE.Color("#FFFFFF"), g: -.15, drag: 1.4, flutter: 2, a: 1 }); if (pods.filter(q => q.got).length === 1) hint("A seed. Stop anywhere off the path and press G to plant it", 6); } });
  garden.forEach(p => { if (p.grown < 1){ p.grown = Math.min(1, (T - p.t0)/24); setPatch(p, p.grown); if (Math.random() < .3) parts.emit({ x: p.x + (Math.random() - .5)*2.4, y: gH(p.x, p.z) + .3, z: p.z + (Math.random() - .5)*2.4 }, { x: 0, y: .5, z: 0 }, { life: 1.2, size: .05, c: new THREE.Color(seedCols[p.sp]), g: -.2, a: .9 }); } });
  show("plant", !!canPlant() && !hideUI);
}

/* ============================================================
   HORN THAT ECHOES OFF THE VALLEY WALLS (and sometimes a shepherd answers)
============================================================ */
function horn(){
  if (!A.ctx) return; const ctx = A.ctx, t = ctx.currentTime;
  if (!A.echo){ A.echo = ctx.createDelay(2); A.echo.delayTime.value = .62; const fb = ctx.createGain(); fb.gain.value = .38; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400; const out = ctx.createGain(); out.gain.value = .55; A.echo.connect(lp); lp.connect(fb); fb.connect(A.echo); lp.connect(out); out.connect(A.m); }
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .03); g.gain.setValueAtTime(.09, t + .45); g.gain.linearRampToValueAtTime(0, t + .6);
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1900; g.connect(f); f.connect(A.m); f.connect(A.echo);
  [370, 466].forEach(fr => { const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = fr; o.connect(g); o.start(t); o.stop(t + .62); });
  if (Math.random() < .4) setTimeout(() => { tone(1800, 2500, .35, .03); setTimeout(() => tone(2500, 1700, .45, .03), 380); }, 1700);
}

/* ============================================================
   INPUT, STATES, CAMERA, LOOP
============================================================ */
const keys = new Set(), input = { throttle: 0, steer: 0, brake: false, tt: 0, ts: 0 };
let state = "loading", T = 0, introT = 0, hideUI = false, feelOn = false;
addEventListener("keydown", e => { initAudio(); keys.add(e.code);
  if (e.code === "Escape"){ if (state === "drive" || state === "free") pauseGame(); else if (state === "paused") resumeGame(); }
  if (e.code === "KeyH"){ hideUI = !hideUI; document.body.classList.toggle("noui", hideUI); ["obj", "keys", "time", "weather", "music", "seeds", "plant", "scrim", "feel"].forEach(i => $(i).style.visibility = hideUI ? "hidden" : ""); }
  if (e.code === "KeyF"){ feelOn = !feelOn; show("feel", feelOn); }
  const wi = ["Digit5","Digit6","Digit7","Digit8"].indexOf(e.code); if (wi >= 0) setWeather(["clear","mist","rain","snow"][wi]);
  if (e.code === "KeyG") plant(); if (e.code === "KeyQ") horn();
  if (e.code === "KeyM") toggleMusic(); if (e.code === "KeyC") lightFireworks();
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); });
addEventListener("keyup", e => keys.delete(e.code)); addEventListener("blur", () => keys.clear());
function readInput(){ const k = c => keys.has(c); input.throttle = Math.max(-1, Math.min(1, ((k("KeyW") || k("ArrowUp")) ? 1 : 0) - ((k("KeyS") || k("ArrowDown")) ? 1 : 0) + input.tt)); input.steer = Math.max(-1, Math.min(1, ((k("KeyA") || k("ArrowLeft")) ? 1 : 0) - ((k("KeyD") || k("ArrowRight")) ? 1 : 0) + input.ts)); input.brake = k("Space") || input.tb; }
let tid = null, tx0 = 0, ty0 = 0;
$("tzone").addEventListener("pointerdown", e => { tid = e.pointerId; tx0 = e.clientX; ty0 = e.clientY; $("tzone").setPointerCapture(e.pointerId); const s = $("stick"); s.style.left = tx0 + "px"; s.style.top = ty0 + "px"; s.classList.add("on"); });
$("tzone").addEventListener("pointermove", e => { if (e.pointerId !== tid) return; const dx = Math.max(-1, Math.min(1, (e.clientX - tx0)/50)), dy = Math.max(-1, Math.min(1, (e.clientY - ty0)/50)); input.ts = -dx; input.tt = -dy; $("stick").firstElementChild.style.transform = `translate(${dx*36}px,${dy*36}px)`; });
const tEnd = e => { if (e.pointerId !== tid) return; tid = null; input.ts = input.tt = 0; $("stick").classList.remove("on"); $("stick").firstElementChild.style.transform = ""; };
$("tzone").addEventListener("pointerup", tEnd); $("tzone").addEventListener("pointercancel", tEnd);
$("tbrake").addEventListener("pointerdown", () => input.tb = true); $("tbrake").addEventListener("pointerup", () => input.tb = false);
const look = { drag: false, lx: 0, orbit: 0, idle: 0 };
canvas.addEventListener("pointerdown", e => { if (e.pointerType === "touch") return; look.drag = true; look.lx = e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => { if (!look.drag) return; look.orbit -= (e.clientX - look.lx)*.006; look.lx = e.clientX; look.idle = 0; });
canvas.addEventListener("pointerup", () => look.drag = false);

const cinema = on => document.body.classList.toggle("cinema", on);
const found = new Set(); let foundT = 0;
const PLACES = {
  valley: { t: "The valley opens", s: "Every colour the mountain was saving all year." },
  ford: { t: "Meltwater", s: "Cold enough to make the engine sigh." },
  bridge: { t: "The stone bridge", s: "Someone carried every one of these stones up here." }
};
function discover(id){ if (found.has(id)) return; found.add(id); if (SND) SND.chime(); const p = PLACES[id]; $("found").querySelector(".t").textContent = p.t; $("found").querySelector(".s").textContent = p.s; show("found", true); cinema(true); foundT = 6; tone(660, 880, 1.6, .05); setTimeout(() => tone(990, 1320, 1.8, .035), 350); }
function startIntro(){ state = "intro"; introT = 0; resetCar(); found.clear(); cinema(true); ["end", "pause", "found", "keys", "obj", "scrim", "tzone", "tbrake"].forEach(i => show(i, false)); show("time", true); show("weather", true); show("music", true); setTimeout(() => show("intro", true), 500); }
function handoff(){ state = "drive"; cinema(false); show("intro", false); show("obj", true); show("scrim", true); $("obj").textContent = "Follow the stone path down into the valley"; show("keys", !isTouch); setTimeout(() => show("keys", false), 15000); if (isTouch){ show("tzone", true); show("tbrake", true); } }
function pauseGame(){ pauseGame.from = state; state = "paused"; show("pause", true); }
function resumeGame(){ state = pauseGame.from; show("pause", false); }
$("plant").onclick = () => plant();
function toggleMusic(){ initAudio(); if (!SND) return; const on = SND.toggleMusic(); $("music").textContent = on ? "Music on" : "Music off"; }
$("music").onclick = toggleMusic;
function lightFireworks(){ initAudio(); const [fx, fz] = fwdOf(car.yaw); for (let i = 0; i < 4; i++) setTimeout(() => { const x = car.x + fx*(38 + Math.random()*20) + (Math.random() - .5)*20, z = car.z + fz*(38 + Math.random()*20) + (Math.random() - .5)*20; FW.launch({ x, y: groundH(x, z) + .5, z }, 55); }, i*420); if (TOD.cur.lamps < .4) hint("Fireworks look best after dark. Try Night (4)", 4); }
$("resume").onclick = resumeGame; $("restart").onclick = () => { show("pause", false); fade(startIntro); };
$("again").onclick = () => fade(startIntro);
$("stay").onclick = () => { show("end", false); cinema(false); state = "free"; show("obj", true); $("obj").textContent = "Stay as long as you like. Try the night (4)."; if (isTouch){ show("tzone", true); show("tbrake", true); } };
function fade(fn){ show("veil", true); setTimeout(() => { fn(); show("veil", false); }, 1200); }

const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), want = new THREE.Vector3(), wantL = new THREE.Vector3();
let camYaw = 0, shake = 0, endT = 0;
function resize(){ renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last)/1000); last = now; T += dt; timeU.value = T;
  if (state === "intro"){ introT += dt; if (introT > 6.5) handoff(); }
  if (state === "drive" || state === "free"){ readInput(); stepCar(dt, input);
    if (car.z < 380) discover("valley");
    if (FORD_Z !== null && Math.abs(car.z - FORD_Z) < 4 && car.surf === "water") discover("ford");
    if (BRIDGE_Z !== null && Math.abs(car.z - BRIDGE_Z) < 3){ discover("bridge"); $("obj").textContent = "Find the lake at the end of the valley"; }
    if (state === "drive" && Math.hypot(car.x - STUPA.x, car.z - STUPA.z) < 26 && Math.abs(car.speed) < 4){ state = "end"; endT = 0; cinema(true); ["obj", "keys", "scrim", "tzone", "tbrake"].forEach(i => show(i, false)); setTimeout(() => show("end", true), 2200); }
    $("obj").classList.toggle("dim", Math.abs(car.speed) > 5);
  } else if (state === "intro" || state === "loading"){ car.y = groundH(car.x, car.z) + SUS.r + SUS.rest - .12; }
  if (foundT > 0){ foundT -= dt; if (foundT <= 0){ show("found", false); if (state === "drive" || state === "free") cinema(false); } }
  if (state === "end") endT += dt;
  syncRover(dt);
  updateDirt(dt); updateSeeds(dt);
  carU.value.set(car.x, car.y, car.z);
  if (feelOn) $("feel").innerHTML = `<b>Surface</b> ${car.surf} &nbsp; <b>Speed</b> ${(Math.abs(car.speed)*3.6).toFixed(0)} km/h<br><b>Suspension</b> ${wheels.map(w => "▁▂▃▄▅▆▇"[Math.max(0, Math.min(6, Math.round((w.comp + .1)/.36*6)))]).join(" ")} &nbsp; <b>Pitch</b> ${(car.pitch*57.3).toFixed(1)}° <b>Roll</b> ${(car.roll*57.3).toFixed(1)}°<br><b>Dirt</b> ${(dirtState.dirt*100).toFixed(0)}% ${dirtState.mud > .5 ? "mud" : "dust"} &nbsp; <b>Roof snow</b> ${(dirtState.snow*100).toFixed(0)}% &nbsp; <b>Ground wet</b> ${(WX.wet*100).toFixed(0)}% &nbsp; <b>Snow cover</b> ${(WX.snowCover*100).toFixed(0)}%`;
  // world
  TOD.update(dt, rover.position, camera);
  updateWeather(dt);
  const night = 1 - TOD.cur.day;
  waterMat.uniforms.uTime.value = T; lake.material.uniforms.uTime.value = T;
  [waterMat, lake.material].forEach(m => { m.uniforms.uSky.value.copy(TOD.cur.hor); m.uniforms.uSun.value.copy(TOD.cur.sun); m.uniforms.uDir.value.copy(TOD.dir); m.uniforms.uNight.value = night; m.uniforms.fogColor.value.copy(scene.fog.color); m.uniforms.fogDensity.value = scene.fog.density; });
  flies.update(dt, night > .55 ? 1 : night > .3 ? .35 : 0);
  skyLanterns.update(dt, night > .6);
  parts.update(dt);
  SNOW.update();
  ANIM.forEach(o => o.userData.update && o.userData.update(T));
  ripples.forEach(o => { if (o.t < 1){ o.t += dt*1.4; o.r.scale.setScalar(.3 + o.t*2.4); o.r.material.opacity = (1 - o.t)*.5; } else o.r.material.opacity = 0; });
  CL.update(dt, camera, TOD, { dark: Math.min(.9, WX.rain*.85 + WX.snow*.35 + WX.mist*.2) }); SKYX.update(dt, camera);
  if (!FW.origin) FW.setShow(fwOrigin(), 40, 60);
  FW.update(dt, camera, TOD.cur.lamps > .6 && WX.rain < .3 && car.z < -150);
  if (SND) SND.setMood(WX.rain > .4 ? "rain" : TOD.cur.day < .3 ? "night" : (TOD.name === "golden" || TOD.name === "dawn") ? "golden" : "day");
  mists.forEach((m, i) => m.material.opacity = .18 + .08*Math.sin(T*.7 + i));
  butterflies.forEach((o, i) => { const vis = TOD.cur.day > .45 && state !== "loading"; o.b.visible = vis; if (!vis) return; if (o.b.position.distanceTo(rover.position) > 45 || o.b.position.y === 0){ o.off.set((Math.random() - .5)*50, .5 + Math.random()*1.4, (Math.random() - .5)*50); o.b.position.set(car.x + o.off.x, 0, car.z + o.off.z); } const p = o.b.position; p.x += Math.sin(T*.8 + o.ph)*dt*1.2; p.z += Math.cos(T*.6 + o.ph*1.3)*dt*1.2; p.y = gH(p.x, p.z) + o.off.y + Math.sin(T*2 + o.ph)*.2; o.b.rotation.y = T*.3 + o.ph; const f = Math.sin(T*16 + o.ph*9)*.9; o.l.rotation.y = f; o.r.rotation.y = -f; });
  // camera
  if (state === "intro" || state === "loading"){ const a = 2.6 + Math.sin(T*.1)*.25 + introT*.03; want.set(car.x + Math.sin(a)*14, car.y + 4.5, car.z + Math.cos(a)*14); wantL.set(car.x, car.y + 1, car.z - 20); if (state === "loading"){ camPos.copy(want); camLook.copy(wantL); } }
  else if (state === "end"){ const a = endT*.04 + 1; want.set(STUPA.x + Math.sin(a)*24, STUPA.y + 7 + endT*.05, STUPA.z + Math.cos(a)*24); wantL.set(STUPA.x, STUPA.y + 4, STUPA.z); }
  else { if (!look.drag){ look.idle += dt; if (look.idle > 1.8) look.orbit *= Math.exp(-1.5*dt); } if (Math.abs(car.speed) > .5) camYaw += ((car.yaw - camYaw + Math.PI*3) % (Math.PI*2) - Math.PI)*(1 - Math.exp(-2.4*dt)); const y = camYaw + look.orbit, dist = 8.4 + Math.abs(car.speed)*.1; want.set(car.x + Math.sin(y)*dist, car.y + 2.6, car.z + Math.cos(y)*dist); const gh = groundH(want.x, want.z) + 1.4; if (want.y < gh) want.y = gh; wantL.set(car.x - Math.sin(y)*3, car.y + .9, car.z - Math.cos(y)*3); }
  const k = state === "drive" || state === "free" ? 5 : 1.5;
  camPos.lerp(want, 1 - Math.exp(-k*dt)); camLook.lerp(wantL, 1 - Math.exp(-(k + 2)*dt));
  camera.position.copy(camPos); if (landThud > 0) shake = Math.max(shake, landThud);
  const bump = wheels.reduce((a, w) => a + Math.max(0, w.comp - .2), 0); shake = Math.max(shake, bump*.6);
  if (shake > 0){ camera.position.y += (Math.random() - .5)*shake*.18; shake *= Math.exp(-6*dt); }
  camera.lookAt(camLook);
  updateAudio(dt);
  renderer.render(scene, camera);
}
resetCar(); syncRover(.016); state = "loading";
requestAnimationFrame(t => { last = t; frame(t); });
setTimeout(() => { show("veil", false); startIntro(); }, 900);
})();
</script>
</body>
</html>
