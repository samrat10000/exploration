/* ============================================================
   SKY ROAD DEMO
============================================================ */
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle("on", on);
const isTouch = matchMedia("(pointer: coarse)").matches;
const canvas = $("c");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (e){ $("veil").querySelector("p").textContent = "WebGL is off in this browser, so the flight can't run. Turn on hardware acceleration and reload."; return; }
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
const scene = new THREE.Scene();
const SKY = { zen: new THREE.Color("#5E77A6"), hor: new THREE.Color("#F2C18E"), fog: new THREE.Color("#E9C7A4") };
const STORM = { zen: new THREE.Color("#2E3647"), hor: new THREE.Color("#6B7385"), fog: new THREE.Color("#5D6575") };
scene.fog = new THREE.FogExp2(SKY.fog.clone(), .0005);
const camera = new THREE.PerspectiveCamera(58, 1, .5, 6000);
const sunDir = new THREE.Vector3(-.55, .2, -.8).normalize();

/* time of day (dawn / day / golden / night) */
const TOD = makeTOD(scene, renderer, { start: "golden", radius: 4500, shadow: 40 });
timePicker(TOD, $("time"));
const sun = TOD.sun;
const STORM_FOG = STORM.fog.clone().convertSRGBToLinear(), STORM_ZEN = STORM.zen.clone().convertSRGBToLinear(), STORM_HOR = STORM.hor.clone().convertSRGBToLinear(), WHITE = new THREE.Color(1, 1, 1);
const parts = makeParticles(scene, 7000);


/* cozy cumulus: a lumpy cloud sea, a cloud wall where it ends, big fair-weather clouds above */
const CLOUD_Y = 100, SEA_END = -1150;
const CL = makeClouds(scene, 12000);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 5200).rotateX(-Math.PI/2).translate(0, 0, SEA_END + 2600), new THREE.MeshBasicMaterial({ color: new THREE.Color("#C9C2CF"), fog: true }));
sea.position.y = CLOUD_Y - 14; scene.add(sea);
CL.sea(-2400, 2400, SEA_END + 30, 1800, CLOUD_Y - 6, 86, 5);
{ const r = rng(12);
  for (let x = -1750; x < 1750; x += 120) CL.cumulus(x + r()*50, CLOUD_Y - 14, SEA_END + 14 + r()*30, 64 + r()*36, 3 + x*.01, { tall: 1.3 });
  for (let i = 0; i < 24; i++){ const a = r()*6.28, rr = 500 + r()*1500, x = Math.cos(a)*rr, z = -650 + Math.sin(a)*rr; if (Math.abs(x) < 160 && z > -1600 && z < 100) continue; CL.cumulus(x, 240 + r()*130, z, 38 + r()*44, 11 + i); }
  for (let i = 0; i < 16; i++){ const x = -1500 + r()*3000, z = -1350 - r()*1900; if (Math.abs(x - 40) < 200 && z > -1700) continue; CL.cumulus(x, 230 + r()*110, z, 48 + r()*40, 40 + i); } }

/* peaks poking through the clouds */
function peakGeo(R, H, seed, flatTop){
  const g = new THREE.ConeGeometry(R, H, 44, 22), p = g.attributes.position;
  for (let k = 0; k < p.count; k++){
    const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k)), t = (v.y + H/2)/H, a = Math.atan2(v.z, v.x);
    let rr = 1 + .22*n3(Math.cos(a)*2 + seed, t*3, Math.sin(a)*2) + .08*n3(v.x*.08, v.y*.08 + seed, v.z*.08) + .12*Math.sin(a*3 + seed);
    if (flatTop && t > .9){ v.y = H*.4; rr = Math.max(rr, 1); }
    p.setXYZ(k, v.x*rr, v.y + n3(v.x*.05, seed, v.z*.05)*H*.04, v.z*rr);
  }
  return paintFaces(g, (c, n, f) => {
    const t = (c.y + H/2)/H;
    let col = mixC(C("#6E6A66"), C("#8C847C"), h3(f, seed, 1));
    col = mixC(col, C("#4B4744"), Math.max(0, 1 - n.y*1.6)*.5);
    const snow = (t - .55)*3 + n.y*1.2 + n3(c.x*.04, c.y*.04, c.z*.04)*.6 - .9;
    if (snow > 0) col = mixC(col, mixC(C("#EEF2F6"), C("#FFFFFF"), n.y), Math.min(1, snow*1.6));
    return col;
  });
}
const PEAKS = [];
function addPeak(x, z, R, H, seed, flat){ const m = new THREE.Mesh(peakGeo(R, H, seed, flat), VC(.95)); m.position.set(x, H/2 + CLOUD_Y - 140, z); m.castShadow = m.receiveShadow = true; scene.add(m); PEAKS.push({ x, z, R: R*1.08, base: CLOUD_Y - 140, H: flat ? H*.9 : H }); return m; }
addPeak(0, 40, 120, 330, 3);
addPeak(-420, -300, 170, 360, 7); addPeak(380, -520, 150, 300, 11); addPeak(-330, -1250, 190, 420, 13); addPeak(480, -1700, 220, 480, 17);
addPeak(-900, -800, 260, 520, 19); addPeak(1000, -1100, 240, 500, 23); addPeak(-150, -2400, 320, 600, 29);
const DEST = { x: 40, z: -1520 };
addPeak(DEST.x, DEST.z, 150, 420, 31, true);
DEST.y = CLOUD_Y - 140 + 420*.9;

/* start: launch ridge (timber ramp + windsock) */
const START = { x: 0, z: 40 }; START.y = CLOUD_Y - 140 + 330*.5 + 0;
{
  const top = new THREE.Vector3(START.x, 0, START.z);
  const rc = new THREE.Raycaster(new THREE.Vector3(START.x, 900, START.z), new THREE.Vector3(0, -1, 0));
  scene.updateMatrixWorld(true);
  const hit = rc.intersectObjects(scene.children.filter(o => o.isMesh && o.geometry.type !== "PlaneGeometry"), false)[0];
  START.y = hit ? hit.point.y : 190;
}
const ramp = new THREE.Group(); ramp.position.set(START.x, START.y + .1, START.z); scene.add(ramp);
add(ramp, box(5, .25, 14), M("#7A5A3E", .85), [0, .8, -3], [-.08, 0, 0]);
for (let k = 0; k < 10; k++) add(ramp, box(5.1, .04, .1), M("#5E4630", .85), [0, .95 - k*.11*0 , 3 - k*1.35], [-.08, 0, 0]);
for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) add(ramp, cyl(.1, .12, 2.6, 6), M("#5E4630", .9), [sx*2.3, -.4, 2.5 - k*3.6]);
add(ramp, cyl(.05, .06, 4, 6), M("#C9CCCB", .3, .8), [3.4, 2, 1]);
const sockG = new THREE.ConeGeometry(.25, 1.6, 10, 4, true); sockG.rotateZ(Math.PI/2);
const sock = add(ramp, sockG, M("#E8743B", .8, 0, { side: THREE.DoubleSide }), [4.2, 3.8, 1]);
for (let k = 0; k < 8; k++) add(ramp, rockGeo(400 + k, 1.2, .7, 1, 2), VC(.95), [(k % 2 ? -1 : 1)*(3.5 + k*.4), -.3, 6 - k*2]);

/* the sky hut on the destination deck */
const deck = new THREE.Group(); deck.position.set(DEST.x, DEST.y + .2, DEST.z); scene.add(deck);
add(deck, box(34, .5, 34), M("#7A5A3E", .85), [0, 0, 0]);
for (let k = 0; k < 16; k++) add(deck, box(34, .04, .1), M("#5E4630", .85), [0, .26, -16 + k*2.1]);
for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(deck, cyl(.25, .35, 9, 7), M("#5E4630", .9), [sx*16, -4.5, sz*16]);
for (let k = 0; k < 18; k++){ const a = k/18*Math.PI*2; add(deck, cyl(.06, .06, 1.1, 5), M("#5E4630", .9), [Math.cos(a)*16.6, .8, Math.sin(a)*16.6]); }
const ringMat = glow("#FFE2A8", 1.4); const ringM = add(deck, new THREE.TorusGeometry(7, .16, 8, 64), ringMat, [0, .3, 3], [Math.PI/2, 0, 0]);
const hut = buildHouse({ seed: 33, walls: "stone", w: 5.4, d: 4.4, h: 2.6, pitch: .5, shutter: "#7A4A36", flags: true });
hut.position.set(0, .2, -11); hut.scale.setScalar(1.2); deck.add(hut);
const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color("#FFC874"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
beacon.position.set(DEST.x, DEST.y + 16, DEST.z - 11); scene.add(beacon);
add(deck, cyl(.2, .25, 14, 8), M("#4A4740", .5, .5), [9, 7, -11]);
add(deck, box(.9, 1.2, .9), glow("#FFC874", 2.2), [9, 14.4, -11]);
const beaconLight = new THREE.PointLight(0xffc874, 2.2, 60, 2); beaconLight.position.set(DEST.x + 9, DEST.y + 15, DEST.z - 11); scene.add(beaconLight);
const KEEPER_HUT = new THREE.Vector3(DEST.x, DEST.y + .5, DEST.z + 3);

/* glide path lights */
const pathLights = [];
for (let i = 0; i < 9; i++){
  const d = 40 + i*34, p = new THREE.Vector3(DEST.x + Math.sin(.1)*d, DEST.y + 4 + d*Math.tan(6*Math.PI/180), DEST.z + d);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color("#FFDFA0"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
  s.position.copy(p); s.scale.setScalar(4 + i*.3); scene.add(s); pathLights.push(s);
}

/* thermals: rising seed columns + a soft shimmer */
const THERMALS = [
  { x: 10, z: -240, r: 30, top: 322 }, { x: -70, z: -560, r: 34, top: 345 }, { x: 140, z: -1180, r: 32, top: 375 }, { x: -30, z: -1360, r: 28, top: 365 }
];
THERMALS.forEach(t => {
  const N = 260, g = new THREE.BufferGeometry(), pos = new Float32Array(N*3);
  for (let i = 0; i < N; i++){ const a = Math.random()*6.28, r = Math.sqrt(Math.random())*t.r; pos[i*3] = t.x + Math.cos(a)*r; pos[i*3+1] = CLOUD_Y + Math.random()*(t.top - CLOUD_Y); pos[i*3+2] = t.z + Math.sin(a)*r; }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  t.pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff1d6, size: .7, transparent: true, opacity: .75, depthWrite: false }));
  scene.add(t.pts);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(t.r, t.r*1.2, t.top - CLOUD_Y, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0d8, transparent: true, opacity: .05, side: THREE.DoubleSide, depthWrite: false }));
  col.position.set(t.x, (t.top + CLOUD_Y)/2, t.z); scene.add(col);
  CL.cumulus(t.x, t.top + 4, t.z, 24, 70 + t.x*.01, { tall: .8 });
});

/* bird flocks */
const FLOCKS = [ { x: -10, y: 325, z: -420, n: 70 }, { x: 60, y: 350, z: -1090, n: 80 } ];
const birdMat = new THREE.MeshBasicMaterial({ color: 0x2b2a2e, side: THREE.DoubleSide });
const wingG = new THREE.BufferGeometry(); wingG.setAttribute("position", new THREE.Float32BufferAttribute([0,0,-.25, 0,0,.3, 1.1,0,0], 3));
const birds = [];
FLOCKS.forEach((f, fi) => { for (let i = 0; i < f.n; i++){
  const b = new THREE.Group(), l = new THREE.Mesh(wingG, birdMat), r = new THREE.Mesh(wingG, birdMat); r.scale.x = -1; b.add(l, r); b.scale.setScalar(1.6);
  b.userData = { f, l, r, ph: Math.random()*6.28, rad: 6 + Math.random()*26, h: (Math.random() - .5)*16, sp: .35 + Math.random()*.25, off: new THREE.Vector3(), push: new THREE.Vector3() };
  scene.add(b); birds.push(b);
} });

/* the storm */
const STORMBOX = { x0: -190, x1: 190, z0: -1000, z1: -760, y0: 170, y1: 430 };
[[-100, -860], [60, -930], [130, -800], [-50, -965], [-150, -790]].forEach(([x, z], i) => CL.cumulonimbus(x, STORMBOX.y0, z, 62 + i*6, 90 + i));
const rainG = new THREE.BufferGeometry(), RN = 1800, rainPos = new Float32Array(RN*3);
for (let i = 0; i < RN; i++){ rainPos[i*3] = STORMBOX.x0 + Math.random()*(STORMBOX.x1 - STORMBOX.x0); rainPos[i*3+1] = CLOUD_Y + Math.random()*(STORMBOX.y0 - CLOUD_Y + 20); rainPos[i*3+2] = STORMBOX.z0 + Math.random()*(STORMBOX.z1 - STORMBOX.z0); }
rainG.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.Points(rainG, new THREE.PointsMaterial({ color: 0xcfdcea, size: .5, transparent: true, opacity: .55, depthWrite: false })); scene.add(rain);
const bolt = new THREE.PointLight(0xdfe8ff, 0, 900, 1.5); bolt.position.set(0, 250, -880); scene.add(bolt);
const rainbow = new THREE.Mesh(new THREE.TorusGeometry(260, 9, 8, 80, Math.PI), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uO: { value: 0 } },
  vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
  fragmentShader: "varying vec3 vP; uniform float uO; vec3 h(float t){ return clamp(abs(mod(t*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); } void main(){ float r = (length(vP.xy) - 251.0)/18.0; gl_FragColor = vec4(h(clamp(r,0.0,1.0)*0.8), uO*0.35*sin(clamp(r,0.0,1.0)*3.14)); }" }));
rainbow.position.set(-60, CLOUD_Y - 20, -1750); rainbow.rotation.y = .3; scene.add(rainbow);

CL.build();
const ANIM2 = [];
/* ============================================================
   BELOW THE CLOUDS: hills → farmland plains → forest → river → the festival village
============================================================ */
const sm2 = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0)/(e1 - e0))); return t*t*(3 - 2*t); };
const fbm2 = (x, z, o) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++){ s += a*n3(x*f, 3.7 + i, z*f); f *= 2.03; a *= .5; } return s; };
const VIL = { x: -230, z: -1770 };
const riverXv = z => 140*Math.sin(z*.0021) - 40;
function valleyH(x, z){
  let h = 22 + fbm2(x*.0035, z*.0035, 4)*55 + fbm2(x*.02, z*.02, 3)*5;
  h = mixN2(h, 6, 1 - sm2(140, 420, Math.hypot(x - VIL.x, z - VIL.z)));
  h = mixN2(h, 10 + fbm2(x*.01, z*.01, 2)*4, sm2(-1700, -2100, z)*(1 - sm2(-2700, -3000, z))*.85);
  const dr = Math.abs(x - riverXv(z)); if (dr < 46) h = mixN2(h, 1.5, 1 - sm2(14, 46, dr));
  const r = Math.hypot(x, (z + 2350)*1.15); h += sm2(1050, 1650, r)*520*(.6 + .4*fbm2(x*.003, z*.003, 3));
  return h;
}
function mixN2(a, b, t){ return a + (b - a)*t; }
const VAL = { x0: -1900, x1: 1900, z0: -3700, z1: -1000 };
const valley = (() => {
  const g = new THREE.PlaneGeometry(VAL.x1 - VAL.x0, VAL.z1 - VAL.z0, 220, 160); g.rotateX(-Math.PI/2); g.translate((VAL.x0 + VAL.x1)/2, 0, (VAL.z0 + VAL.z1)/2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, valleyH(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const n = g.attributes.normal, cols = new Float32Array(p.count*3), c = new THREE.Color();
  const F = ["#7E9A46", "#C9B04A", "#5F7F3A", "#A99A5E", "#D9B24A", "#6E8A45"].map(C), forest = C("#2F4A30"), rock = C("#7A746C"), snow = C("#EEF2F5"), bank = C("#7C6B52");
  for (let i = 0; i < p.count; i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = n.getY(i);
    const cell = h3(Math.floor(x/55), 0, Math.floor(z/38)); c.copy(F[Math.floor(cell*F.length)]);
    c.lerp(F[0], sm2(20, 70, y)*.6);
    const fo = fbm2(x*.006 + 9, z*.006, 3); if (fo > .08) c.lerp(forest, Math.min(1, (fo - .08)*6));
    c.lerp(rock, sm2(.85, .6, ny)); c.lerp(snow, sm2(260, 380, y)*sm2(.5, .75, ny));
    if (Math.abs(x - riverXv(z)) < 20) c.lerp(bank, .5);
    cols[i*3] = c.r; cols[i*3+1] = c.g; cols[i*3+2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); m.receiveShadow = true; scene.add(m); return m;
})();
{ // river ribbon
  const v = [], ix = []; let r = 0;
  for (let z = -1000; z > -3600; z -= 12){ const x = riverXv(z), w = 9 + Math.sin(z*.01)*2; v.push(x - w, 2.2, z, x + w, 2.2, z); if (r){ const i = (r - 1)*2; ix.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); } r++; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setIndex(ix); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: lin("#7FA3B8"), roughness: .12, metalness: .35 })));
}
{ // forests (low-poly pines, instanced) + orchard rows near the village
  const lowPine = (() => { const parts = []; const t = new THREE.CylinderGeometry(.15, .25, 2, 5); t.translate(0, 1, 0); parts.push({ geo: t, color: C("#4E3A2B") }); [[2.6, 4.2, 2.2], [1.9, 3.6, 4.4], [1.1, 2.8, 6.4]].forEach(([r, h, y]) => { const c = new THREE.ConeGeometry(r, h, 6); c.translate(0, y, 0); parts.push({ geo: c, color: C("#2F4D35") }); }); return mergeFlat(parts); })();
  const list = [], rnd = rng(81);
  for (let i = 0; i < 30000 && list.length < 2600; i++){ const x = VAL.x0 + rnd()*(VAL.x1 - VAL.x0), z = VAL.z0 + rnd()*(VAL.z1 - VAL.z0); if (fbm2(x*.006 + 9, z*.006, 3) < .1) continue; if (Math.hypot(x - VIL.x, z - VIL.z) < 200 || Math.abs(x - riverXv(z)) < 30) continue; const y = valleyH(x, z); if (y > 250) continue; list.push([x, y, z, 1.6 + rnd()*1.6]); }
  const im = new THREE.InstancedMesh(lowPine, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true }), list.length), d = new THREE.Object3D(), tint = new THREE.Color();
  list.forEach(([x, y, z, s], i) => { d.position.set(x, y - .3, z); d.rotation.y = rnd()*6; d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); tint.setScalar(.8 + rnd()*.35); im.setColorAt(i, tint); });
  scene.add(im);
}
function mergeFlat(parts){ const P = [], N = [], Cc = []; parts.forEach(({ geo, color }) => { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); const p = g.attributes.position, nn = g.attributes.normal; for (let i = 0; i < p.count; i++){ P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(nn.getX(i), nn.getY(i), nn.getZ(i)); Cc.push(color.r, color.g, color.b); } }); const o = new THREE.BufferGeometry(); o.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); o.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); o.setAttribute("color", new THREE.Float32BufferAttribute(Cc, 3)); return o; }
const village = new THREE.Group(); scene.add(village);
const VLIGHTS = [];
{ // the village: houses around a festival square, lantern strings, a lantern arch
  const rnd = rng(5), shut = ["#5E7B5C", "#B0473A", "#3E6FA8", "#C9A04A", "#7A4A36"];
  for (let i = 0; i < 18; i++){
    const a = i/18*Math.PI*2 + rnd()*.2, r = 38 + (i % 3)*22 + rnd()*10, x = VIL.x + Math.cos(a)*r, z = VIL.z + Math.sin(a)*r;
    const h = buildHouse({ seed: 60 + i, w: 4 + rnd()*2, d: 3.4 + rnd()*1.4, h: 2.3 + rnd()*.6, shutter: shut[i % 5], walls: i % 4 === 0 ? "stone" : "plaster" });
    h.position.set(x, valleyH(x, z) - .3, z); h.rotation.y = -a + Math.PI/2; h.scale.setScalar(1.5); village.add(h); ANIM2.push(h);
  }
  const sq = new THREE.Mesh(new THREE.CircleGeometry(30, 32).rotateX(-Math.PI/2), M("#B8A88A", .95)); sq.position.set(VIL.x, valleyH(VIL.x, VIL.z) + .2, VIL.z); village.add(sq);
  const Y0 = valleyH(VIL.x, VIL.z);
  for (let k = 0; k < 8; k++){ const a = k/8*Math.PI*2, b = a + Math.PI*(.6 + rnd()*.4); const A = P3v(VIL.x + Math.cos(a)*30, Y0 + 7, VIL.z + Math.sin(a)*30), B = P3v(VIL.x + Math.cos(b)*30, Y0 + 7, VIL.z + Math.sin(b)*30);
    const cv = catenary(A, B, 3); village.add(new THREE.Mesh(tube(cv, .03, 30, 4), M("#3A342C", .9)));
    for (let i = 1; i < 18; i++){ const p = cv.getPoint(i/18), col = ["#FFC874", "#FF8A6A", "#F4B6C8", "#FFE7A0"][i % 4]; const m = new THREE.Mesh(new THREE.SphereGeometry(.35, 8, 6), glow(col, 1.4)); m.position.copy(p); village.add(m); VLIGHTS.push(halo(village, [p.x, p.y, p.z], col, 4)); } }
  for (let k = 0; k < 8; k++){ const a = k/8*Math.PI*2; add(village, cyl(.2, .25, 8, 6), M("#7A2A22", .7), [VIL.x + Math.cos(a)*30, Y0 + 4, VIL.z + Math.sin(a)*30]); }
}
function P3v(x, y, z){ return new THREE.Vector3(x, y, z); }
const fireworks = makeFireworks(scene, { scale: 3.2, max: 26000 });
fireworks.setShow({ x: VIL.x, y: valleyH(VIL.x, VIL.z) + 4, z: VIL.z }, 170, 110);
const SX = makeSkyExtras(scene, TOD, { aurora: true, geese: 2, geeseY: 250 });
let SND = null;
const villageLanterns = makeSkyLanterns(scene, { x: VIL.x, y: valleyH(VIL.x, VIL.z) + 6, z: VIL.z }, 46, 5, 3.6, 80);

/* hot air balloons over the cloud sea and above the valley */
const balloons = [];
[[-160, 210, -360, 1], [120, 260, -640, 2], [-60, 330, -980, 3], [220, 300, -1300, 4], [-300, 200, -1600, 0], [-140, 150, -1820, 2], [60, 240, -2050, 1]].forEach(([x, y, z, s], i) => {
  const b = buildBalloon(s + i, null); b.scale.setScalar(1.7); b.position.set(x, y, z); scene.add(b); balloons.push({ b, base: new THREE.Vector3(x, y, z), ph: i*1.7 });
});

/* two friendly dragons: jade over the cloud sea, ember past the storm */
const dragons = [
  { d: buildDragon("jade"), c: new THREE.Vector3(30, 300, -470), r: 140, sp: .085, ph: 0, name: "The jade dragon", line: "It has been flying this road longer than the road.", seen: false },
  { d: buildDragon("ember"), c: new THREE.Vector3(-90, 330, -1290), r: 120, sp: -.1, ph: 2, name: "The ember dragon", line: "Warm as a hearth, and in no hurry at all.", seen: false }
];
dragons.forEach(o => { scene.add(o.d); o.head = o.c.clone().add(new THREE.Vector3(o.r, 0, 0)); o.vel = new THREE.Vector3(); o.escort = 0; o.escortT = 0; });

/* the Sky Mule: Mule + parcels + fold-out wings, tail and prop (all animated) */
const mule = new THREE.Group(); scene.add(mule);
const body = buildMule({ cargo: false }); body.position.set(0, -.9, 0); mule.add(body);
const parcels = [];
[[-.34, 1.0, .25], [.34, 1.0, .35], [0, 1.0, 1.05]].forEach(([x, y, z], i) => { const c = buildCrate(.58, .4, .5, 20 + i); c.position.set(x, y + .02 - .9 + .2, z); body.add(c); parcels.push(c); });
const canvasM = M("#EFE6D3", .85, 0, { side: THREE.DoubleSide }), strutM = M("#6B5034", .8);
const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.lineTo(3.4, .18); wingShape.quadraticCurveTo(3.6, .2, 3.55, .5); wingShape.lineTo(0, .95); wingShape.lineTo(0, 0);
const wings = [-1, 1].map(sx => {
  const pivot = new THREE.Group(); pivot.position.set(sx*.72, 2.22 - .9, -1.3); body.add(pivot);
  const wg = new THREE.ExtrudeGeometry(wingShape, { depth: .05, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 1 }); wg.rotateX(Math.PI/2); if (sx < 0) wg.scale(-1, 1, 1);
  add(pivot, wg, canvasM);
  for (let k = 1; k < 4; k++) add(pivot, box(.03, .03, .9 - k*.12), strutM, [sx*k*.85, .03, .45]);
  add(pivot, box(.5, .03, .3), M("#C9473A", .7), [sx*3.25, .03, .35]);
  const tip = halo(pivot, [sx*3.5, .05, .35], sx < 0 ? "#FF6A50" : "#7DFFB0", .5);
  pivot.userData.sx = sx; return pivot;
});
const tail = new THREE.Group(); tail.position.set(0, 1.25 - .9, 1.5); body.add(tail);
add(tail, box(.08, .9, .7), canvasM, [0, .4, 0]); add(tail, box(1.6, .05, .5), canvasM, [0, 0, .1]);
const hub = new THREE.Group(); hub.position.set(0, 1.25 - .9, 1.95); body.add(hub);
add(hub, new THREE.ConeGeometry(.09, .2, 12), M("#C9CCCB", .3, .8), null, [Math.PI/2, 0, 0]);
const blades = []; for (let k = 0; k < 3; k++){ const bl = add(hub, box(.09, .75, .02), M("#7A5A3E", .6)); bl.geometry.translate(0, .38, 0); bl.rotation.z = k*2.094; blades.push(bl); }
const discM = new THREE.Mesh(new THREE.CircleGeometry(.78, 24), new THREE.MeshBasicMaterial({ color: 0x8a6a48, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); discM.position.z = .02; hub.add(discM);
function setUnfold(u){
  const e = u < .5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3)/2;
  wings.forEach(w => { w.rotation.z = w.userData.sx*(1 - Math.min(1, e*1.25))*1.45; w.scale.setScalar(.55 + .45*Math.min(1, e*1.4)); });
  tail.scale.set(1, Math.max(.01, Math.min(1, (e - .4)*2)), 1);
  hub.scale.setScalar(Math.max(.01, Math.min(1, (e - .55)*2.2)));
}
setUnfold(0);

emissives.forEach(e => { if (e.sprite) TOD.lamp({ sprite: e.sprite, base: e.base }); if (e.plight) TOD.lamp({ light: e.plight, base: e.base }); if (e.m && e.m !== ringMat) TOD.lamp({ mat: e.m, base: e.base }); if (e.light) TOD.lamp({ light: e.light, base: e.base }); }); emissives.length = 0;
VLIGHTS.forEach(h => TOD.lamp({ sprite: h, base: .9 }));
/* ---------------- state ---------------- */
const F = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, bank: 0, speed: 0, vy: 0, puffs: 3, puffT: 0, recharge: 0, inThermal: false, slow: 0 };
const safe = { pos: new THREE.Vector3(), yaw: 0 };
let state = "loading", T = 0, unfold = 0, hold = 0, introT = 0, launchT = 0, endT = 0, landT = 0, lost = 0, bumpCD = 0, stormSeen = false, warnT = 0, riseShown = 0, slowHinted = false, recoverT = 0, freeFly = false, landFrom = null, shake = 0, flashT = 0, nextBolt = 2, stormMix = 0, rainbowO = 0, dimT = 0;
const keys = new Set(), input = { pitch: 0, bank: 0, tp: 0, tb: 0 };
function resetFlight(){
  F.pos.set(START.x, START.y + 1.85, START.z - 2); F.yaw = 0; F.pitch = -.08; F.bank = 0; F.speed = 0; F.vy = 0; F.puffs = 3; F.puffT = 0;
  safe.pos.set(START.x, START.y + 40, START.z - 60); safe.yaw = 0;
  lost = 0; stormSeen = false; unfold = 0; hold = 0; setUnfold(0); landFrom = null; freeFly = false;
  parcels.forEach(p => p.visible = true); [...$("cargo").children].forEach(i => i.classList.remove("lost"));
  $("bStorm").style.opacity = 0; $("lStorm").style.opacity = 0;
}
resetFlight();

/* ---------------- audio ---------------- */
const A = {};
function initAudio(){
  if (A.ctx){ if (A.ctx.state === "suspended") A.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = new AC(); A.ctx = ctx; A.master = ctx.createGain(); A.master.gain.value = 0; A.master.connect(ctx.destination); A.master.gain.setTargetAtTime(.8, ctx.currentTime, 1.2);
  const buf = ctx.createBuffer(1, ctx.sampleRate*3, ctx.sampleRate), d = buf.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++){ const w = Math.random()*2 - 1; b = (b + .02*w)/1.02; d[i] = b*3.5 + w*.12; }
  const src = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random()*2); return s; };
  A.windF = ctx.createBiquadFilter(); A.windF.type = "bandpass"; A.windF.Q.value = .6; A.windG = ctx.createGain(); A.windG.gain.value = .2; src().connect(A.windF); A.windF.connect(A.windG); A.windG.connect(A.master);
  A.rainF = ctx.createBiquadFilter(); A.rainF.type = "highpass"; A.rainF.frequency.value = 2500; A.rainG = ctx.createGain(); A.rainG.gain.value = 0; src().connect(A.rainF); A.rainF.connect(A.rainG); A.rainG.connect(A.master);
  const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 60; A.propF = ctx.createBiquadFilter(); A.propF.type = "lowpass"; A.propF.frequency.value = 300; A.propG = ctx.createGain(); A.propG.gain.value = 0; o.connect(A.propF); A.propF.connect(A.propG); A.propG.connect(A.master); o.start(); A.prop = o;
  A.buf = buf;
  SND = makeSound(ctx, ctx.destination); SND.start(); fireworks.setSound(SND);
}
function thunder(dist){ if (SND){ SND.thunder(dist, .8 + Math.random()*.4); return; }
  if (!A.ctx) return; const ctx = A.ctx, t = ctx.currentTime + dist, s = ctx.createBufferSource(); s.buffer = A.buf;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 180; const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.9, t + .08); g.gain.exponentialRampToValueAtTime(.001, t + 3.5);
  s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random()*1.5); s.stop(t + 3.6);
}
function boom(s){ if (!A.ctx) return; const d = F.pos.distanceTo(new THREE.Vector3(s.x, s.y, s.z)); thunder(Math.min(2.5, d/340)); }
function chirp(){
  if (!A.ctx) return; const ctx = A.ctx, t0 = ctx.currentTime, g = ctx.createGain(); g.connect(A.master);
  for (let i = 0; i < 3; i++){ const o = ctx.createOscillator(), s = t0 + i*.11; o.frequency.setValueAtTime(3000, s); o.frequency.exponentialRampToValueAtTime(4100, s + .06); o.connect(g); o.start(s); o.stop(s + .08); g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.05, s + .01); g.gain.linearRampToValueAtTime(0, s + .07); }
}
addEventListener("pointerdown", initAudio, { once: true });

/* ---------------- input ---------------- */
addEventListener("keydown", e => {
  initAudio();
  if (e.code === "Escape"){ if (state === "fly" || state === "free") pauseGame(); else if (state === "paused") resumeGame(); return; }
  keys.add(e.code); if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.code === "Space" && (state === "fly" || state === "free")) usePuff();
  if (e.code === "KeyM") toggleMusic();
  if (e.code === "KeyC") lightFireworks();
});
addEventListener("keyup", e => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
const promptEl = $("prompt"); let pHold = false;
promptEl.addEventListener("pointerdown", () => { pHold = true; initAudio(); }); addEventListener("pointerup", () => pHold = false);
let tid = null, tx = 0, ty = 0;
$("tzone").addEventListener("pointerdown", e => { tid = e.pointerId; tx = e.clientX; ty = e.clientY; $("tzone").setPointerCapture(e.pointerId); const s = $("stick"); s.style.left = tx + "px"; s.style.top = ty + "px"; s.classList.add("on"); });
$("tzone").addEventListener("pointermove", e => { if (e.pointerId !== tid) return; const dx = Math.max(-1, Math.min(1, (e.clientX - tx)/50)), dy = Math.max(-1, Math.min(1, (e.clientY - ty)/50)); input.tb = -dx; input.tp = dy; $("stick").firstElementChild.style.transform = `translate(${dx*36}px,${dy*36}px)`; });
const endT2 = e => { if (e.pointerId !== tid) return; tid = null; input.tb = input.tp = 0; $("stick").classList.remove("on"); $("stick").firstElementChild.style.transform = ""; };
$("tzone").addEventListener("pointerup", endT2); $("tzone").addEventListener("pointercancel", endT2);
$("tpuff").addEventListener("pointerdown", () => { if (state === "fly" || state === "free") usePuff(); });
$("tpause").onclick = () => pauseGame();
function toggleMusic(){ initAudio(); if (!SND) return; const on = SND.toggleMusic(); $("music").textContent = on ? "Music on" : "Music off"; }
$("music").onclick = toggleMusic;
function lightFireworks(){ initAudio(); const nearDeck = Math.hypot(F.pos.x - DEST.x, F.pos.z - DEST.z) < 500; const o = nearDeck ? { x: DEST.x, y: DEST.y + 1, z: DEST.z } : { x: VIL.x, y: valleyH(VIL.x, VIL.z) + 4, z: VIL.z }; for (let i = 0; i < 4; i++) setTimeout(() => fireworks.launch({ x: o.x + (Math.random() - .5)*40, y: o.y, z: o.z + (Math.random() - .5)*40 }, nearDeck ? 60 : 120), i*350); if (TOD.cur.lamps < .4) hint("Fireworks look best after dark. Try Night (4)", 4); }
function usePuff(){ if (F.puffT > 0 || F.puffs <= 0) return; F.puffs--; F.puffT = 4; drawPuffs(); }
function drawPuffs(){ [...$("puff").children].forEach((i, k) => { i.className = k < F.puffs ? "" : "e"; if (F.puffT > 0 && k === F.puffs) i.className = "go"; }); }

/* ---------------- UI flow ---------------- */
const cinema = on => document.body.classList.toggle("cinema", on);
const hudIds = ["ribbon", "puff", "cargo", "scrim", "obj"];
function setObj(t){ $("obj").textContent = t; }
function hint(t, dur = 4){ $("hint").textContent = t; show("hint", true); clearTimeout(hint._t); hint._t = setTimeout(() => show("hint", false), dur*1000); }
function startIntro(){
  state = "intro"; introT = 0; cinema(true); resetFlight();
  ["end", "pause", "edge", "rain", "flash", "keys", "tpuff", "tzone", "tpause"].forEach(i => show(i, false)); hudIds.forEach(i => show(i, false));
  show("intro", false); setTimeout(() => show("intro", true), 600); show("time", true); show("music", true);
}
function pauseGame(){ state = state === "free" ? "pausedFree" : "paused"; if (state === "pausedFree") state = "paused", pauseGame.free = true; else pauseGame.free = false; show("pause", true); }
function resumeGame(){ state = pauseGame.free ? "free" : "fly"; show("pause", false); }
$("resume").onclick = resumeGame; $("restart").onclick = () => { show("pause", false); fadeThen(startIntro); };
$("again").onclick = () => fadeThen(startIntro);
$("free").onclick = () => { show("end", false); cinema(false); state = "free"; freeFly = true; F.pos.set(DEST.x, DEST.y + 6, DEST.z + 20); F.yaw = 0; F.speed = 18; F.pitch = 0; landFrom = null; setUnfold(1); hudIds.forEach(i => show(i, true)); setObj("Fly anywhere. Esc to pause."); if (isTouch){ show("tzone", true); show("tpuff", true); show("tpause", true); } };
function fadeThen(fn){ show("veil", true); setTimeout(() => { fn(); show("veil", false); }, 1200); }

/* ---------------- flight model ---------------- */
const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
function readInput(){
  const k = c => keys.has(c);
  input.pitch = Math.max(-1, Math.min(1, ((k("KeyW") || k("ArrowUp")) ? 1 : 0) - ((k("KeyS") || k("ArrowDown")) ? 1 : 0) + input.tp));
  input.bank = Math.max(-1, Math.min(1, ((k("KeyA") || k("ArrowLeft")) ? 1 : 0) - ((k("KeyD") || k("ArrowRight")) ? 1 : 0) + input.tb));
}
function inStorm(p){ return p.x > STORMBOX.x0 && p.x < STORMBOX.x1 && p.z > STORMBOX.z0 && p.z < STORMBOX.z1 && p.y > STORMBOX.y0 - 10 && p.y < STORMBOX.y1 + 30; }
function stepFlight(dt){
  readInput();
  let tp = input.pitch !== 0 ? -input.pitch*.42 : -.06;
  if (input.pitch < 0) tp = Math.min(.32, tp);
  if (F.speed < 12){ tp = Math.min(tp, -.18*(12 - F.speed)/4); F.slow += dt; } else F.slow = 0;
  if (F.slow > 3 && !slowHinted){ slowHinted = true; hint("Nose down to pick up speed"); }
  F.pitch += (tp - F.pitch)*(1 - Math.exp(-2.2*dt));
  F.bank += (input.bank*.62 - F.bank)*(1 - Math.exp(-2.6*dt));
  let acc = -9.8*Math.sin(F.pitch)*.9 - .0016*F.speed*F.speed;
  if (F.puffT > 0){ acc += 3.2; F.puffT -= dt; if (F.puffT <= 0) drawPuffs(); }
  F.speed = Math.max(7, Math.min(42, F.speed + acc*dt));
  let lift = 0; F.inThermal = false;
  for (const t of THERMALS){ const d = Math.hypot(F.pos.x - t.x, F.pos.z - t.z); if (d < t.r){ F.inThermal = true; lift += 8*(1 - (d/t.r)**2)*(F.pos.y < t.top ? 1 : .15); if (riseShown < 2 && !t.seen){ t.seen = true; riseShown++; } safe.pos.set(t.x, Math.max(F.pos.y, CLOUD_Y + 60), t.z); safe.yaw = F.yaw; } }
  const storm = inStorm(F.pos);
  let turb = storm ? (Math.sin(T*3.1)*Math.sin(T*1.7 + 2)*6 + (Math.random() - .5)*4) : 0;
  F.vy = F.speed*Math.sin(F.pitch)*.75 - .9 - F.bank*F.bank*2.2 + lift + (F.puffT > 0 ? 3.5 : 0) + turb;
  F.vy = Math.min(F.vy, 9);
  F.recharge += dt*(F.inThermal ? .4 : .1);
  if (F.recharge >= 1 && F.puffs < 3){ F.recharge = 0; F.puffs++; drawPuffs(); } else if (F.puffs >= 3) F.recharge = 0;
  F.yaw += F.bank*.8*Math.max(.6, Math.min(1.2, F.speed/20))*dt;
  fwd.set(-Math.sin(F.yaw), 0, -Math.cos(F.yaw));
  F.pos.addScaledVector(fwd, F.speed*Math.cos(F.pitch)*dt); F.pos.y += F.vy*dt;
  if (storm && !stormSeen){ stormSeen = true; }
  if (!warnT && !freeFly && F.pos.z < STORMBOX.z1 + 260){ warnT = 5; setObj("Weather coming in"); $("bStorm").style.opacity = 1; $("lStorm").style.opacity = 1; }
  // obstacles: birds
  bumpCD -= dt;
  if (bumpCD <= 0) for (const b of birds){ if (b.position.distanceToSquared(F.pos) < 9){ bump(b); break; } }
  // ground + peaks + cloud sea: no fail, recover softly
  if (F.pos.y < CLOUD_Y - 8 || hitPeak(F.pos) || Math.hypot(F.pos.x, F.pos.z + 700) > 2100){ recover(); }
}
function hitPeak(p){
  for (const k of PEAKS){ const t = (p.y - k.base)/k.H; if (t < 0 || t > 1) continue; const r = k.R*(1 - t); if (Math.hypot(p.x - k.x, p.z - k.z) < r*.92){ if (Math.hypot(p.x - DEST.x, p.z - DEST.z) < 20 && p.y > DEST.y - 2) continue; return true; } }
  return false;
}
function bump(b){
  bumpCD = 1.4; shake = Math.min(1, shake + .5); F.speed *= .85; chirp();
  show("edge", true); setTimeout(() => show("edge", false), 400);
  birds.forEach(o => { if (o.position.distanceToSquared(F.pos) < 220){ o.userData.push.copy(o.position).sub(F.pos).setLength(14); } });
  $("cargo").classList.add("lit"); clearTimeout(bump._t); bump._t = setTimeout(() => $("cargo").classList.remove("lit"), 3000);
  if (Math.abs(F.bank) > .42 && lost < 3){ const p = parcels[2 - lost]; p.visible = false; $("cargo").children[2 - lost].classList.add("lost"); lost++; }
}
function recover(){
  if (state !== "fly" && state !== "free") return;
  state = state === "free" ? "recoverFree" : "recover"; recoverT = 0; show("veil", true);
  setTimeout(() => { F.pos.copy(safe.pos); F.yaw = safe.yaw; F.speed = 20; F.pitch = -.05; F.bank = 0; camPos.copy(F.pos).add(new THREE.Vector3(0, 6, 16)); show("veil", false); state = state === "recoverFree" ? "free" : "fly"; }, 1000);
}

/* ---------------- birds ---------------- */
function stepBirds(dt){
  birds.forEach(b => {
    const u = b.userData, f = u.f, a = T*u.sp + u.ph;
    const cx = f.x + Math.sin(T*.07 + f.z)*40, cz = f.z + Math.cos(T*.05)*30;
    u.off.set(Math.cos(a)*u.rad + Math.sin(a*2.7 + u.ph)*5, u.h + Math.sin(a*1.9)*4, Math.sin(a)*u.rad*.7);
    u.push.multiplyScalar(Math.exp(-.8*dt));
    b.position.set(cx + u.off.x + u.push.x, f.y + u.off.y + u.push.y, cz + u.off.z + u.push.z);
    b.rotation.y = -a + Math.PI/2; const fl = Math.sin(T*10 + u.ph*5)*.6; u.l.rotation.z = fl; u.r.rotation.z = -fl;
  });
}

/* ---------------- camera ---------------- */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), want = new THREE.Vector3(), wantLook = new THREE.Vector3();
function chase(out, outLook){
  const back = tmp.set(Math.sin(F.yaw), 0, Math.cos(F.yaw));
  out.copy(F.pos).addScaledVector(back, 13 + F.speed*.08).add(new THREE.Vector3(0, 4.2 - F.pitch*6, 0));
  outLook.copy(F.pos).addScaledVector(back, -12).add(new THREE.Vector3(0, 1.2, 0));
}

/* ---------------- loop ---------------- */
function resize(){ renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
let last = performance.now();
const ribbonY = y => (1 - (y - 60)/(400 - 60))*100;
$("bCloud").style.top = ribbonY(CLOUD_Y + 14) + "%"; $("bCloud").style.height = (ribbonY(CLOUD_Y - 8) - ribbonY(CLOUD_Y + 14)) + "%"; $("lCloud").style.top = ribbonY(CLOUD_Y + 3) + "%";
$("bStorm").style.top = ribbonY(STORMBOX.y1) + "%"; $("bStorm").style.height = (ribbonY(STORMBOX.y0) - ribbonY(STORMBOX.y1)) + "%"; $("lStorm").style.top = ribbonY((STORMBOX.y0 + STORMBOX.y1)/2) + "%";
$("goal").style.top = ribbonY(DEST.y) + "%"; $("lGoal").style.top = ribbonY(DEST.y) + "%";
const proj = new THREE.Vector3();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last)/1000); last = now; T += dt;
  timeUpdate(dt);
  renderer.render(scene, camera);
}
function timeUpdate(dt){
  // --- states ---
  if (state === "intro"){
    introT += dt;
    if (introT > 5.2 && introT < 5.4){ show("intro", false); }
    if (introT > 5.6){ show("prompt", true); }
    const holding = keys.has("KeyT") || pHold;
    if (introT > 5.6 && unfold === 0){
      hold = Math.max(0, Math.min(1, hold + (holding ? dt/1.2 : -dt*1.5)));
      $("ringFill").setAttribute("stroke-dashoffset", 100 - hold*100);
      if (hold >= 1){ unfold = .0001; show("prompt", false); }
    }
    if (unfold > 0){ unfold = Math.min(1, unfold + dt/3); setUnfold(unfold); if (unfold >= 1){ state = "launch"; launchT = 0; } }
  } else if (state === "launch"){
    launchT += dt; F.speed = Math.min(22, F.speed + 9*dt); fwd.set(0, 0, -1); F.pos.addScaledVector(fwd, F.speed*dt);
    if (launchT > .9) F.pos.y -= (launchT - .9)*3*dt*10;
    if (launchT > 2.0){ state = "fly"; cinema(false); hudIds.forEach(i => show(i, true)); setObj("Fly the parcels to the sky hut"); show("keys", !isTouch); setTimeout(() => show("keys", false), 14000); if (isTouch){ show("tzone", true); show("tpuff", true); show("tpause", true); } drawPuffs(); dimT = 0; }
  } else if (state === "fly" || state === "free"){
    stepFlight(dt);
    dimT += dt; $("obj").classList.toggle("dim", dimT > 8 && warnT <= 0);
    if (warnT > 0){ warnT -= dt; if (warnT <= 0){ warnT = -1; setObj(freeFly ? "Fly anywhere. Esc to pause." : "Fly the parcels to the sky hut"); } }
    if (state === "fly"){
      const dh = Math.hypot(F.pos.x - DEST.x, F.pos.z - (DEST.z + 3)), dy = F.pos.y - DEST.y;
      if (dh < 24 && dy > -1 && dy < 14 && F.speed < 34){ state = "land"; landT = 0; landFrom = { p: F.pos.clone(), yaw: F.yaw, pitch: F.pitch, bank: F.bank }; hudIds.forEach(i => show(i, false)); show("keys", false); show("tzone", false); show("tpuff", false); show("tpause", false); cinema(true); }
    }
  } else if (state === "land"){
    landT += dt; const t = Math.min(1, landT/2.6), e = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
    F.pos.lerpVectors(landFrom.p, KEEPER_HUT.clone().add(new THREE.Vector3(0, 1.0, 0)), e);
    F.pitch = landFrom.pitch*(1 - e); F.bank = landFrom.bank*(1 - e); F.speed = 20*(1 - e);
    if (landT > 2.8) setUnfold(Math.max(0, 1 - (landT - 2.8)/2.2));
    if (landT > 4.6 && state === "land"){ state = "end"; endT = 0; showEnd(); }
  } else if (state === "end"){ endT += dt; }

  // --- mule pose + prop ---
  mule.position.copy(F.pos); mule.rotation.set(F.pitch, F.yaw, F.bank, "YXZ");
  const propSpd = state === "fly" || state === "free" ? (F.puffT > 0 ? 38 : 16) : state === "launch" ? 30 : unfold >= 1 && state !== "end" ? 12 : 0;
  hub.rotation.z += propSpd*dt; discM.material.opacity = Math.min(.35, propSpd/80);
  if (A.ctx){ const t = A.ctx.currentTime, airborne = state === "fly" || state === "free" || state === "launch"; A.windG.gain.setTargetAtTime(airborne ? .12 + F.speed/42*.5 : .12, t, .3); A.windF.frequency.setTargetAtTime(300 + F.speed*28, t, .3); A.propG.gain.setTargetAtTime(propSpd > 0 ? .02 + propSpd/38*.05 : 0, t, .2); A.prop.frequency.setTargetAtTime(30 + propSpd*2.2, t, .2); A.rainG.gain.setTargetAtTime(stormMix*.35, t, .6); }

  // --- world animation ---
  stepBirds(dt);
  sock.rotation.y = Math.sin(T*.8)*.3; sock.scale.y = 1 + Math.sin(T*5)*.06;
  THERMALS.forEach(t => { const p = t.pts.geometry.attributes.position; for (let i = 0; i < p.count; i++){ let y = p.getY(i) + dt*(6 + (i % 7)); if (y > t.top) y = CLOUD_Y; p.setY(i, y); } p.needsUpdate = true; });
  const rp = rain.geometry.attributes.position; for (let i = 0; i < rp.count; i++){ let y = rp.getY(i) - dt*40; if (y < CLOUD_Y) y = STORMBOX.y0 + 10; rp.setY(i, y); } rp.needsUpdate = true;
  beacon.scale.setScalar(10 + Math.min(60, F.pos.distanceTo(beacon.position)*.03) + Math.sin(T*2)*1.5);
  ringMat.emissiveIntensity = 1 + .6*Math.sin(T*2.4);
  const dDest = Math.hypot(F.pos.x - DEST.x, F.pos.z - DEST.z);
  pathLights.forEach((s, i) => { const near = dDest < 520 ? 1 : 0, passed = F.pos.z < s.position.z - 5 ? 0 : 1; s.material.opacity += ((near*passed*(.55 + .35*Math.sin(T*3 - i*.6))) - s.material.opacity)*(1 - Math.exp(-2*dt)); });
  if (hut.userData.update) hut.userData.update(T);

  // --- storm atmosphere ---
  const sm = inStorm(F.pos) ? 1 : Math.max(0, 1 - Math.min(Math.abs(F.pos.z - (STORMBOX.z0 + STORMBOX.z1)/2) - 120, 200)/200)*.45*(Math.abs(F.pos.x) < 260 ? 1 : 0);
  stormMix += (sm - stormMix)*(1 - Math.exp(-1.2*dt));
  show("rain", stormMix > .55 && (state === "fly" || state === "free"));
  TOD.dark = stormMix; TOD.update(dt, F.pos, camera);
  const nightK = .25 + .75*TOD.cur.day;
  scene.fog.color.lerp(STORM_FOG.clone().multiplyScalar(nightK), stormMix); scene.fog.density = .0005 + stormMix*.0035;
  TOD.skyMat.uniforms.uZen.value.lerp(STORM_ZEN.clone().multiplyScalar(nightK), stormMix*.8); TOD.skyMat.uniforms.uHor.value.lerp(STORM_HOR.clone().multiplyScalar(nightK), stormMix*.8);
  // clouds take the light of the sky: warm at golden hour, blue-silver at night
  CL.update(dt, camera, TOD, { flash: flashT > 0 ? 1.4 : 0 });
  sea.material.color.copy(CL.mat.uniforms.uShade.value).lerp(CL.mat.uniforms.uLit.value, .3);
  SX.update(dt, camera);
  if (SND) SND.setMood(stormMix > .5 ? "storm" : TOD.cur.day < .3 ? "night" : (TOD.name === "golden" || TOD.name === "dawn") ? "golden" : "day");
  const night = 1 - TOD.cur.day;
  fireworks.update(dt, camera, TOD.cur.lamps > .5); villageLanterns.update(dt, TOD.cur.lamps > .5); parts.update(dt);
  balloons.forEach(o => { o.b.position.set(o.base.x + Math.sin(T*.03 + o.ph)*30 + T*.6, o.base.y + Math.sin(T*.25 + o.ph)*3, o.base.z + Math.cos(T*.02 + o.ph)*20); o.b.rotation.y = T*.05 + o.ph; o.b.userData.update(T, dt, night > .5); });
  ANIM2.forEach(o => o.userData.update && o.userData.update(T));
  dragons.forEach(o => {
    const a = T*o.sp + o.ph, path = new THREE.Vector3(o.c.x + Math.cos(a)*o.r, o.c.y + Math.sin(a*2.3)*22, o.c.z + Math.sin(a)*o.r*.7);
    const near = F.pos.distanceTo(o.head) < 170 && (state === "fly" || state === "free");
    if (near && o.escortT < 22){ o.escortT += dt; o.escort = Math.min(1, o.escort + dt*.3); } else o.escort = Math.max(0, o.escort - dt*.2);
    const side = new THREE.Vector3(Math.cos(F.yaw), 0, -Math.sin(F.yaw)).multiplyScalar(26).add(new THREE.Vector3(0, 6 + Math.sin(T*.8)*4, 0)).add(F.pos).addScaledVector(new THREE.Vector3(-Math.sin(F.yaw), 0, -Math.cos(F.yaw)), 10);
    const target = path.lerp(side, o.escort);
    o.vel.lerp(target.sub(o.head).multiplyScalar(.9), 1 - Math.exp(-1.2*dt)); const spd = o.vel.length(); if (spd > 34) o.vel.multiplyScalar(34/spd);
    o.head.addScaledVector(o.vel, dt);
    o.d.userData.update(T, o.head, o.vel.clone().normalize());
    if (!o.seen && F.pos.distanceTo(o.head) < 140 && state === "fly") discover(o);
  });
  if (foundT > 0){ foundT -= dt; if (foundT <= 0) show("found", false); }
  nextBolt -= dt;
  if (stormMix > .3 && nextBolt <= 0){ nextBolt = 2 + Math.random()*5; flashT = .12; bolt.position.set((Math.random() - .5)*300, 280, -880 + (Math.random() - .5)*200); thunder(1 + Math.random()*2*(1 - stormMix)); if (inStorm(F.pos)) shake = Math.min(1, shake + .25); }
  if (flashT > 0){ flashT -= dt; bolt.intensity = 6; show("flash", true); } else { bolt.intensity = 0; show("flash", false); }
  const passedStorm = F.pos.z < STORMBOX.z0 - 120 ? 1 : 0;
  rainbowO += (passedStorm*(1 - stormMix) - rainbowO)*(1 - Math.exp(-.4*dt)); rainbow.material.uniforms.uO.value = rainbowO;

  // --- camera ---
  if (state === "intro" || state === "loading"){
    const a = .9 + Math.sin(T*.12)*.15, r = 11 + (unfold > 0 ? 3*unfold : 0);
    want.set(F.pos.x + Math.sin(a)*r, F.pos.y + 3 + unfold*2, F.pos.z + Math.cos(a)*r*-1); wantLook.copy(F.pos).add(tmp.set(0, 1.2, 0));
    if (state === "loading"){ camPos.copy(want); camLook.copy(wantLook); }
  } else if (state === "launch"){ chase(want, wantLook); }
  else if (state === "land" || state === "end"){
    const a = 2.6 + (state === "end" ? endT*.035 : 0);
    want.set(DEST.x + Math.sin(a)*34, DEST.y + 10 + (state === "end" ? endT*.25 : 0), DEST.z + 3 + Math.cos(a)*34); wantLook.set(DEST.x, DEST.y + 4, DEST.z - 4);
  } else { chase(want, wantLook); }
  const k = state === "fly" || state === "free" ? 4 : 1.6;
  camPos.lerp(want, 1 - Math.exp(-k*dt)); camLook.lerp(wantLook, 1 - Math.exp(-(k + 2)*dt));
  camera.position.copy(camPos);
  if (shake > 0){ camera.position.x += (Math.random() - .5)*shake*.8; camera.position.y += (Math.random() - .5)*shake*.8; shake *= Math.exp(-4*dt); if (shake < .01) shake = 0; }
  camera.lookAt(camLook);
  if (state === "fly" || state === "free") camera.rotateZ(F.bank*.18);
  const fov = (state === "fly" || state === "free") ? 58 + Math.min(1, (F.speed - 14)/24)*8 : 52;
  camera.fov += (fov - camera.fov)*(1 - Math.exp(-2*dt)); camera.updateProjectionMatrix();

  // --- hud ---
  $("me").style.top = Math.max(0, Math.min(100, ribbonY(F.pos.y))) + "%";
  const tr = THERMALS.find(t => t.seen && !t.tagDone && Math.hypot(F.pos.x - t.x, F.pos.z - t.z) < 260);
  if (tr && (state === "fly")){ proj.set(tr.x, F.pos.y + 20, tr.z).project(camera); const vis = proj.z < 1 && Math.abs(proj.x) < .9 && Math.abs(proj.y) < .9; const el = $("tagRise"); el.style.left = ((proj.x + 1)/2*innerWidth) + "px"; el.style.top = ((1 - proj.y)/2*innerHeight) + "px"; el.style.opacity = vis ? 1 : 0; if (Math.hypot(F.pos.x - tr.x, F.pos.z - tr.z) < tr.r) setTimeout(() => { tr.tagDone = true; }, 3000); }
  else { const nxt = THERMALS.find(t => !t.seen && riseShown < 2 && Math.hypot(F.pos.x - t.x, F.pos.z - t.z) < 300); const el = $("tagRise"); if (nxt && state === "fly"){ proj.set(nxt.x, F.pos.y + 15, nxt.z).project(camera); const vis = proj.z < 1 && Math.abs(proj.x) < .9 && Math.abs(proj.y) < .9; el.style.left = ((proj.x + 1)/2*innerWidth) + "px"; el.style.top = ((1 - proj.y)/2*innerHeight) + "px"; el.style.opacity = vis ? 1 : 0; } else el.style.opacity = 0; }
  if (dDest < 520 && state === "fly" && !timeUpdate.landHint){ timeUpdate.landHint = true; hint("Follow the lights down to the deck", 5); }
}
let foundT = 0;
function discover(o){ o.seen = true; if (SND) SND.chime(); $("found").querySelector(".t").textContent = o.name; $("found").querySelector(".s").textContent = o.line; show("found", true); foundT = 6; }
function showEnd(){ if (SND) SND.chime();
  const n = 3 - lost;
  $("endT").textContent = n === 3 ? "All three parcels made it." : n === 2 ? "Two of three made it." : n === 1 ? "One parcel made it." : "The parcels are somewhere in the clouds.";
  $("endS").textContent = n >= 2 ? "The keeper didn't think it could be done." : "The keeper laughs. He's never seen a flying Mule anyway.";
  $("endL").innerHTML = [0, 1, 2].map(i => `<i class="${i < n ? "" : "off"}"></i>`).join("");
  show("end", true);
}

/* boot */
F.pos.set(START.x, START.y + 1.85, START.z - 2); mule.position.copy(F.pos); state = "loading";
requestAnimationFrame(t => { last = t; frame(t); });
setTimeout(() => { show("veil", false); startIntro(); timeUpdate.landHint = false; }, 900);
})();
</script>
</body>
</html>
