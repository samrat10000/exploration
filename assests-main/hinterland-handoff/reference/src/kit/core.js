/* ============================================================
   CORE HELPERS (port as src/game/art/kit.ts)
============================================================ */
const lin = h => new THREE.Color(h).convertSRGBToLinear();
const matCache = new Map();
function M(hex, rough = .8, metal = 0, extra){
  const k = hex + rough + metal + JSON.stringify(extra || {});
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial(Object.assign({ color: lin(hex), roughness: rough, metalness: metal }, extra || {})));
  return matCache.get(k);
}
const VC = (rough = .9, extra) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: rough, flatShading: true }, extra || {}));
const emissives = []; // [{mat, base}] scaled by light preset
function glow(hex, base){ const m = new THREE.MeshStandardMaterial({ color: lin(hex), emissive: lin(hex), emissiveIntensity: base, roughness: .4 }); emissives.push({ m, base }); return m; }
function add(parent, geo, mat, p, r, s){
  const m = new THREE.Mesh(geo, mat);
  if (p) m.position.set(p[0], p[1], p[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  if (s) typeof s === "number" ? m.scale.setScalar(s) : m.scale.set(s[0], s[1], s[2]);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
function rng(seed){ let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
function h3(x, y, z){ const s = Math.sin(x*127.1 + y*311.7 + z*74.7)*43758.5453; return s - Math.floor(s); }
function n3(x, y, z){
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf), w = zf*zf*(3-2*zf), L = (a, b, t) => a + (b - a)*t;
  const c = (i, j, k) => h3(xi+i, yi+j, zi+k);
  return L(L(L(c(0,0,0), c(1,0,0), u), L(c(0,1,0), c(1,1,0), u), v), L(L(c(0,0,1), c(1,0,1), u), L(c(0,1,1), c(1,1,1), u), v), w)*2 - 1;
}
/* paint a flat-shaded geometry face by face: fn(centroid, normal, faceIndex) -> THREE.Color */
function paintFaces(geo, fn){
  geo = geo.index ? geo.toNonIndexed() : geo;
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, cols = new Float32Array(p.count*3);
  const c = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let f = 0; f < p.count/3; f++){
    c.set(0,0,0); nn.set(0,0,0);
    for (let k = 0; k < 3; k++){ const i = f*3 + k; c.x += p.getX(i)/3; c.y += p.getY(i)/3; c.z += p.getZ(i)/3; nn.x += n.getX(i); nn.y += n.getY(i); nn.z += n.getZ(i); }
    nn.normalize();
    const col = fn(c, nn, f);
    for (let k = 0; k < 3; k++){ const i = (f*3 + k)*3; cols[i] = col.r; cols[i+1] = col.g; cols[i+2] = col.b; }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  return geo;
}
const C = h => lin(h);
const mixC = (a, b, t) => a.clone().lerp(b, Math.max(0, Math.min(1, t)));
function catenary(a, b, sag, seg = 16){ const mid = a.clone().lerp(b, .5); mid.y -= sag; return new THREE.QuadraticBezierCurve3(a, mid, b); }
const tube = (curve, r, seg = 20, rad = 6) => new THREE.TubeGeometry(curve, seg, r, rad, false);

/* ============================================================
   ASSET: WHEEL (shared by all vehicles)
============================================================ */
function buildWheel(r, w, opts = {}){
  const g = new THREE.Group(), inner = r*.6, rr = Math.min(w*.32, r*.18), pts = [];
  pts.push(new THREE.Vector2(inner, -w/2));
  for (let i = 0; i <= 5; i++){ const a = -Math.PI/2 + i/5*Math.PI/2; pts.push(new THREE.Vector2(r - rr + Math.cos(a)*rr, -w/2 + rr + Math.sin(a)*rr)); }
  for (let i = 0; i <= 5; i++){ const a = i/5*Math.PI/2; pts.push(new THREE.Vector2(r - rr + Math.cos(a)*rr, w/2 - rr + Math.sin(a)*rr)); }
  pts.push(new THREE.Vector2(inner, w/2));
  const tire = new THREE.LatheGeometry(pts, 28); tire.rotateZ(Math.PI/2);
  const rubber = M("#232220", .95);
  add(g, tire, rubber);
  const n = opts.blocks || 22;
  for (let i = 0; i < n; i++){
    const a = i/n*Math.PI*2, side = i % 2 ? 1 : -1;
    const b = add(g, box(w*.42, r*.09, r*.16), rubber, [side*w*.2, Math.cos(a)*(r + r*.02), Math.sin(a)*(r + r*.02)], [a, 0, 0]);
    b.castShadow = false;
  }
  const rim = M(opts.rim || "#B9B4A8", .35, .7);
  add(g, cyl(inner*.98, inner*.98, w*.72, 20), rim, null, [0, 0, Math.PI/2]);
  add(g, cyl(inner*.55, inner*.7, w*.8, 16), M(opts.hub || "#8E897F", .4, .6), null, [0, 0, Math.PI/2]);
  for (let i = 0; i < 5; i++){ const a = i/5*Math.PI*2; add(g, cyl(r*.035, r*.035, w*.86, 6), M("#4A4740", .5, .6), [0, Math.cos(a)*inner*.38, Math.sin(a)*inner*.38], [0, 0, Math.PI/2]); }
  return g;
}

/* ============================================================
   ASSET: CRATE (cargo; physics collider = its bounding box)
============================================================ */
function buildCrate(w, h, d, seed = 1){
  const g = new THREE.Group(), rnd = rng(seed);
  const tones = ["#C9A56C", "#BE9960", "#D3B07A", "#B88F58"], plank = () => M(tones[Math.floor(rnd()*tones.length)], .85);
  const batten = M("#8C6A42", .85), t = .022, gap = .012;
  const rows = Math.max(2, Math.round(h/.13)), ph = (h - gap*(rows - 1))/rows;
  for (let i = 0; i < rows; i++){
    const y = -h/2 + ph/2 + i*(ph + gap);
    add(g, box(w, ph, t), plank(), [0, y, d/2 - t/2]); add(g, box(w, ph, t), plank(), [0, y, -d/2 + t/2]);
    add(g, box(t, ph, d - t*2), plank(), [w/2 - t/2, y, 0]); add(g, box(t, ph, d - t*2), plank(), [-w/2 + t/2, y, 0]);
  }
  const tops = Math.max(2, Math.round(w/.14)), tw = (w - gap*(tops - 1))/tops;
  for (let i = 0; i < tops; i++) add(g, box(tw, t, d), plank(), [-w/2 + tw/2 + i*(tw + gap), h/2 - t/2, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, box(.05, h + .01, .05), batten, [sx*(w/2 - .015), 0, sz*(d/2 - .015)]);
  for (const sz of [-1, 1]){ const diag = Math.hypot(w, h)*.92; add(g, box(diag, .055, .02), batten, [0, 0, sz*(d/2 + .006)], [0, 0, Math.atan2(h, w)*(sz)]); }
  return g;
}

/* ============================================================
   GLOW HALOS (lab stand-in for in-game bloom: soft additive sprite + optional point light)
============================================================ */
let _haloTex = null;
function haloTex(){
  if (_haloTex) return _haloTex;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.2, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  _haloTex = new THREE.CanvasTexture(c); return _haloTex;
}
function halo(parent, p, hex, size = .5, light = 0){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(hex), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 }));
  s.position.set(p[0], p[1], p[2]); s.scale.setScalar(size); parent.add(s);
  emissives.push({ sprite: s, base: .8 });
  if (light){ const l = new THREE.PointLight(new THREE.Color(hex), light, 6, 2); l.position.set(p[0], p[1], p[2]); parent.add(l); emissives.push({ plight: l, base: light }); }
  return s;
}

