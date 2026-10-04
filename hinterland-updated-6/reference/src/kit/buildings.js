/* ============================================================
   ASSET: HOUSE (farmhouse / summit hut) — sits ON a foundation pad
============================================================ */
function buildHouse(opts = {}){
  const g = new THREE.Group(), rnd = rng(opts.seed || 12);
  const W = opts.w || 5, D = opts.d || 4, H = opts.h || 2.6, stoneWalls = opts.walls === "stone";
  const plaster = M("#EFE6D3", .95), timber = M("#5A4030", .85), stone = VC(.95);
  // terrain pad + foundation plinth (goes 1.2 m BELOW ground: never floats on a slope)
  const pad = new THREE.CircleGeometry(Math.max(W, D)*.85, 40); pad.rotateX(-Math.PI/2);
  add(g, paintFaces(pad, c => mixC(C("#7C6B52"), C("#8F8162"), h3(c.x*3, 0, c.z*3))), VC(1), [0, .005, 0]);
  add(g, box(W + .5, 1.6, D + .5), M("#837D73", .95), [0, -.45, 0]);
  for (let x = -W/2 - .2; x < W/2 + .2; x += .4 + rnd()*.15) for (const z of [-(D/2 + .26), D/2 + .26]) add(g, rockGeo(500 + Math.floor(x*10) + (z > 0 ? 50 : 0), .2 + rnd()*.06, .13, .06, 1, .7), stone, [x, .12 + rnd()*.12, z]);
  for (let z = -D/2 - .1; z < D/2 + .1; z += .4 + rnd()*.15) for (const x of [-(W/2 + .26), W/2 + .26]) add(g, rockGeo(600 + Math.floor(z*10) + (x > 0 ? 50 : 0), .06, .13, .2 + rnd()*.06, 1, .7), stone, [x, .12 + rnd()*.12, z]);
  const base = .35;
  // walls
  const wallG = box(W, H, D);
  add(g, paintFaces(wallG, (c, n) => stoneWalls ? mixC(C("#8E887E"), C("#A49D90"), h3(Math.floor(c.x*4), Math.floor(c.y*6), Math.floor(c.z*4))) : mixC(C("#D9CFBA"), C("#F2EADA"), (c.y + H/2)/H*.8 + .2)), VC(.95), [0, base + H/2, 0]);
  if (stoneWalls){ for (let y = base + .25; y < base + H; y += .32) for (let x = -W/2 + .2; x < W/2; x += .45 + rnd()*.2) add(g, rockGeo(700 + Math.floor(x*10 + y*100), .22, .12, .05, 1, .8), stone, [x, y, D/2 + .03]); }
  else {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, box(.16, H, .16), timber, [sx*(W/2 - .05), base + H/2, sz*(D/2 - .05)]);
    for (const sz of [-1, 1]) add(g, box(W + .02, .14, .05), timber, [0, base + H*.52, sz*(D/2 + .01)]);
    for (const sz of [-1, 1]) add(g, box(W + .02, .16, .05), timber, [0, base + H - .08, sz*(D/2 + .01)]);
    for (const sx of [-1, 1]) add(g, box(.05, .14, D), timber, [sx*(W/2 + .01), base + H*.52, 0]);
  }
  // windows: frame, warm glass, shutters, sill, flower box
  const win = (x, y, z, face) => {
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = face; g.add(grp);
    add(grp, new THREE.PlaneGeometry(.62, .78), glow("#FFD9A0", .35), [0, 0, .03]);
    for (const [w, h, px, py] of [[.74, .06, 0, .42], [.74, .06, 0, -.42], [.06, .9, .34, 0], [.06, .9, -.34, 0], [.62, .03, 0, 0], [.03, .78, 0, 0]]) add(grp, box(w, h, .06), M("#F4EFE4", .7), [px, py, .05]);
    for (const sx of [-1, 1]){ const sh = add(grp, box(.34, .84, .035), M(opts.shutter || "#5E7B5C", .7), [sx*.58, 0, .12], [0, sx*.35, 0]); for (let k = 0; k < 6; k++) add(grp, box(.3, .015, .01), M("#4C6649", .7), [sx*.58, -.34 + k*.13, .14], [0, sx*.35, 0]); }
    add(grp, box(.8, .05, .16), M("#D8CFBE", .8), [0, -.47, .1]);
    add(grp, box(.7, .14, .16), M("#7A5A3E", .85), [0, -.57, .17]);
    for (let k = 0; k < 9; k++) add(grp, new THREE.SphereGeometry(.045, 8, 6), M(["#D8445A", "#F2C230", "#F4F0E6", "#E58AAE"][k % 4], .6), [-.3 + k*.075, -.46 + (k % 2)*.03, .2]);
  };
  win(-W*.25, base + H*.55, D/2 + .03, 0); win(W*.28, base + H*.55, D/2 + .03, 0); win(W/2 + .03, base + H*.55, 0, Math.PI/2); win(-W/2 - .03, base + H*.55, 0, -Math.PI/2);
  // door + step stones
  const dx = W*.02;
  add(g, box(.9, 1.85, .08), M("#6A4A33", .85), [dx, base + .93, -D/2 - .03]);
  for (let k = 0; k < 5; k++) add(g, box(.16, 1.8, .02), M(k % 2 ? "#714F36" : "#634430", .85), [dx - .36 + k*.18, base + .93, -D/2 - .08]);
  add(g, box(1.06, .1, .12), timber, [dx, base + 1.9, -D/2 - .05]);
  add(g, new THREE.SphereGeometry(.035, 8, 6), M("#2E2B27", .4, .8), [dx + .3, base + .95, -D/2 - .11]);
  for (let k = 0; k < 3; k++) add(g, rockGeo(800 + k, .55 - k*.05, .12, .3, 1, .5), stone, [dx, .3 - k*.12, -D/2 - .45 - k*.45]);
  // roof (tiles or shingles, laid in overlapping rows)
  const pitch = opts.pitch || .62, over = .45, half = D/2 + over, rise = Math.tan(pitch)*(D/2), slopeLen = half/Math.cos(pitch);
  const rows = Math.ceil(slopeLen/.28), tileTones = stoneWalls ? ["#6B5A48", "#5E4F40", "#77634E"] : ["#B5583C", "#A94E36", "#C2654A", "#9E4732"];
  for (const sz of [-1, 1]){
    for (let r = 0; r < rows; r++){
      const t = (r + .5)/rows, zz = sz*(t*half), yy = base + H + rise - t*slopeLen*Math.sin(pitch) - .02;
      const strip = add(g, box(W + over*2, .06, .32), M(tileTones[Math.floor(rnd()*tileTones.length)], .8), [0, yy, zz], [sz*pitch, 0, 0]);
      if (!stoneWalls) for (let k = -W/2 - over + .2; k < W/2 + over; k += .26) add(g, cyl(.06, .06, .3, 6, 1), M(tileTones[Math.floor(rnd()*4)], .8), [k, yy + .045*Math.cos(pitch), zz - sz*.045*Math.sin(pitch)], [sz*pitch + Math.PI/2, 0, 0], [1, 1, .55]);
    }
  }
  add(g, cyl(.11, .11, W + over*2, 8), M(stoneWalls ? "#4F4236" : "#8E3F2C", .8), [0, base + H + rise + .04, 0], [0, 0, Math.PI/2]);
  for (const sx of [-1, 1]){
    const tri = new THREE.Shape(); tri.moveTo(-D/2, 0); tri.lineTo(D/2, 0); tri.lineTo(0, rise); tri.lineTo(-D/2, 0);
    const tg = new THREE.ShapeGeometry(tri); tg.rotateY(Math.PI/2);
    add(g, tg, stoneWalls ? M("#948D80", .95) : plaster, [sx*(W/2 + .005), base + H, 0]).material.side = THREE.DoubleSide;
  }
  // chimney + smoke puffs
  const chX = W*.3, chH = rise + 1.0;
  add(g, box(.5, chH, .5), M("#8E887E", .95), [chX, base + H + chH/2 - .2, D*.15]);
  add(g, box(.62, .08, .62), M("#6F6A62", .9), [chX, base + H + chH - .16, D*.15]);
  const smoke = [];
  for (let k = 0; k < 4; k++){ const s = add(g, new THREE.IcosahedronGeometry(.18 + k*.07, 1), new THREE.MeshStandardMaterial({ color: 0xf2efe8, transparent: true, opacity: .32 - k*.06, roughness: 1, flatShading: true }), [chX, base + H + chH + .1 + k*.35, D*.15]); s.castShadow = false; smoke.push(s); }
  // porch props: bench, woodpile, potted plants
  add(g, box(1.4, .06, .38), M("#7A5A3E", .85), [-W*.28, .82, -D/2 - .45]);
  for (const x of [-.6, .6]) add(g, box(.08, .4, .32), M("#5E4630", .85), [-W*.28 + x, .6, -D/2 - .45]);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6 - r; k++) add(g, cyl(.09, .09, .7, 8), M(k % 2 ? "#8C6B4A" : "#7A5C3F", .9), [W/2 + .5, .44 + r*.16, -D/2 + .5 + k*.18 + r*.09], [Math.PI/2, 0, 0]);
  for (let k = 0; k < 3; k++){ add(g, cyl(.14, .1, .22, 10), M("#B26A44", .8), [W*.16 + k*.38, .46, -D/2 - .32]); add(g, new THREE.IcosahedronGeometry(.17, 0), M("#5E7F42", .9, 0, { flatShading: true }), [W*.16 + k*.38, .66, -D/2 - .32]); }
  if (opts.flags){
    const a = new THREE.Vector3(-W/2 - over, base + H + rise*.6, 0), b = new THREE.Vector3(-W/2 - 4, .9, -1.2);
    add(g, cyl(.05, .06, 1.2, 6), M("#5A4632", .9), [b.x, .6, b.z]);
    flagLine(g, a, b, 10, .5);
    for (const sx of [-.7, .7]){ add(g, box(.2, .28, .2), glow("#FFC874", 1.2), [dx + sx, base + 1.7, -D/2 - .2]); }
  }
  g.userData.update = t => smoke.forEach((s, k) => { const ph = (t*.25 + k*.25) % 1; s.position.y = base + H + chH + .1 + ph*1.6; s.position.x = chX + ph*.5; s.scale.setScalar(.6 + ph*1.4); s.material.opacity = .34*(1 - ph); });
  return g;
}
function flagLine(g, a, b, n, sag){
  const curve = catenary(a, b, sag), cols = ["#3E6FA8", "#F2EFE6", "#C9473A", "#4F8A54", "#E1B640"];
  add(g, tube(curve, .008, 24, 4), M("#D9C9A0", .95));
  const flags = [];
  for (let i = 1; i <= n; i++){ const p = curve.getPoint(i/(n + 1)); const f = add(g, new THREE.PlaneGeometry(.26, .32, 4, 1), M(cols[i % 5], .9, 0, { side: THREE.DoubleSide }), [p.x, p.y - .17, p.z]); f.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI/2; f.castShadow = false; flags.push(f); }
  const prev = g.userData.update;
  g.userData.update = t => { if (prev) prev(t); flags.forEach((f, i) => { f.rotation.x = Math.sin(t*2.4 + i)*.25; }); };
}

/* ============================================================
   ASSET: CAMPFIRE (stones, logs, animated flame, warm light)
============================================================ */
function buildCampfire(){
  const g = new THREE.Group(), rnd = rng(17), mat = VC(.95);
  for (let i = 0; i < 9; i++){ const a = i/9*6.28; add(g, rockGeo(900 + i, .2, .14, .17, 1, .7), mat, [Math.cos(a)*.62, .08, Math.sin(a)*.62], [0, a, 0]); }
  add(g, new THREE.CircleGeometry(.55, 20), M("#2E2925", 1), [0, .01, 0], [-Math.PI/2, 0, 0]);
  for (let i = 0; i < 5; i++){ const a = i/5*6.28 + .3; const l = add(g, cyl(.06, .07, .85, 8), M("#6A4C35", .95), [Math.cos(a)*.18, .3, Math.sin(a)*.18], [Math.sin(a)*.7, 0, -Math.cos(a)*.7]); }
  const flames = [];
  [["#FFB347", .34, .7], ["#FFD27A", .22, .55], ["#FF7A2E", .3, .45]].forEach(([c, r, h], i) => { const f = add(g, new THREE.ConeGeometry(r, h, 7, 1), new THREE.MeshBasicMaterial({ color: lin(c), transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }), [0, .2 + h/2, 0]); f.castShadow = false; flames.push(f); });
  const light = new THREE.PointLight(0xffa255, 1.6, 9, 2); light.position.set(0, .8, 0); g.add(light); emissives.push({ light, base: 1.6 });
  const logSeat = add(g, cyl(.22, .24, 1.6, 10), M("#6E5139", .95), [1.6, .22, .5], [0, .5, Math.PI/2]);
  addTufts(g, 20, 1.1, 2.6, 61);
  g.userData.update = t => flames.forEach((f, i) => { const k = .85 + .25*Math.sin(t*9 + i*2) + .1*Math.sin(t*17 + i); f.scale.set(1 + .08*Math.sin(t*7 + i), k, 1 + .08*Math.cos(t*6 + i)); f.rotation.y = t*(.6 + i*.3); light.intensity = light.userData.k*(1.4 + .25*Math.sin(t*11) + .15*Math.sin(t*23)); });
  light.userData.k = 1;
  return g;
}

/* ============================================================
   ASSET: BELL POLE (wayfinding in the cloud band)
============================================================ */
function buildBellPole(){
  const g = new THREE.Group(), mat = VC(.95);
  for (let i = 0; i < 6; i++) add(g, rockGeo(950 + i, .34 - i*.04, .12, .3 - i*.035, 1, .5), mat, [0, .08 + i*.18, 0], [0, i*1.1, 0]);
  const pole = cyl(.06, .08, 3.2, 7), p = pole.attributes.position; for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) + n3(p.getY(k)*2, 3, 0)*.02);
  add(g, paintFaces(pole, c => mixC(C("#5B4636"), C("#8C7458"), h3(c.x*30, c.y*14, 1)*.5 + .2)), VC(.95), [0, 1.6, 0]);
  add(g, box(.7, .07, .07), M("#5B4636", .9), [0, 2.9, 0]);
  const bellG = new THREE.LatheGeometry([[0,.2],[.05,.19],[.07,.12],[.1,.03],[.12,0],[0,0]].map(q => new THREE.Vector2(q[0], q[1])), 16);
  const bell = new THREE.Group(); bell.position.set(.28, 2.86, 0); g.add(bell);
  add(bell, cyl(.004, .004, .14, 4), M("#3A342C", .9), [0, -.07, 0]);
  add(bell, bellG, M("#C29A45", .3, .9), [0, -.34, 0]);
  add(bell, new THREE.SphereGeometry(.025, 8, 6), M("#3A342C", .5, .6), [0, -.33, 0]);
  flagLine(g, new THREE.Vector3(0, 3.1, 0), new THREE.Vector3(3.6, .5, 1.4), 9, .45);
  add(g, cyl(.04, .05, 1, 6), M("#5A4632", .9), [3.6, .5, 1.4]);
  const prev = g.userData.update; g.userData.update = t => { prev(t); bell.rotation.z = Math.sin(t*1.7)*.18; };
  addTufts(g, 18, .5, 2.4, 91);
  return g;
}

/* ============================================================
   ASSET: HUT VARIANTS (Hut Rounds + summits): tea house, weather station, bakery, beekeeper, star-watcher
============================================================ */
function stringLights(g, a, b, n, color = "#FFC874"){
  const curve = catenary(a, b, .35); add(g, tube(curve, .006, 20, 4), M("#3A342C", .9));
  for (let i = 1; i <= n; i++){ const p = curve.getPoint(i/(n + 1)); add(g, new THREE.SphereGeometry(.07, 10, 8), glow(color, .9), [p.x, p.y - .08, p.z]).castShadow = false; }
}
function chainUpdate(g, fn){ const prev = g.userData.update; g.userData.update = t => { if (prev) prev(t); fn(t); }; }
function buildHut(kind){
  const base = {
    tea:     { seed: 41, w: 4.6, d: 3.8, h: 2.4, shutter: "#B0473A" },
    weather: { seed: 42, w: 3.6, d: 3.2, h: 2.3, walls: "stone", shutter: "#3E6FA8", pitch: .45 },
    bakery:  { seed: 43, w: 5.2, d: 4.0, h: 2.6, shutter: "#C9A04A" },
    bees:    { seed: 44, w: 3.8, d: 3.2, h: 2.2, walls: "stone", shutter: "#D9A93A", pitch: .55 },
    stars:   { seed: 45, w: 4.0, d: 3.6, h: 2.4, walls: "stone", shutter: "#3B4A6B", pitch: .5 }
  }[kind];
  const g = buildHouse(base), W = base.w, D = base.d;
  if (kind === "tea"){
    for (const x of [-1.6, .4]){
      add(g, cyl(.5, .5, .05, 16), M("#7A5A3E", .8), [x, .78, -D/2 - 1.6]); add(g, cyl(.05, .07, .72, 8), M("#5E4630", .85), [x, .4, -D/2 - 1.6]);
      for (let k = 0; k < 3; k++){ const a = k*2.1; add(g, cyl(.045, .035, .07, 10), M("#F2EFE6", .4), [x + Math.cos(a)*.25, .84, -D/2 - 1.6 + Math.sin(a)*.25]); }
      for (const sx of [-.75, .75]) add(g, box(.36, .42, .36), M("#8C6A48", .85), [x + sx, .21, -D/2 - 1.6]);
    }
    stringLights(g, new THREE.Vector3(-W/2, 2.5, -D/2 - .1), new THREE.Vector3(-W/2 - 1, 2.0, -D/2 - 3.4), 8);
    add(g, cyl(.04, .05, 2.2, 6), M("#5A4632", .9), [-W/2 - 1, 1.1, -D/2 - 3.4]);
    add(g, box(1.1, .35, .04), M("#E9DFC9", .8), [.6, 2.3, -D/2 - .12]);
  }
  if (kind === "weather"){
    add(g, cyl(.04, .05, 4.2, 8), M("#C9CCCB", .3, .8), [W/2 + .8, 2.1, 0]);
    const cups = new THREE.Group(); cups.position.set(W/2 + .8, 4.25, 0); g.add(cups);
    for (let k = 0; k < 3; k++){ const a = k*2.094; add(cups, box(.45, .015, .015), M("#C9CCCB", .3, .8), [Math.cos(a)*.22, 0, Math.sin(a)*.22], [0, -a, 0]); add(cups, new THREE.SphereGeometry(.08, 10, 6, 0, 6.29, 0, 1.6), M("#C9473A", .5), [Math.cos(a)*.45, 0, Math.sin(a)*.45], [0, 0, Math.PI/2]); }
    const sock = new THREE.ConeGeometry(.14, .9, 10, 4, true); sock.rotateZ(Math.PI/2);
    const sk = add(g, sock, M("#E8743B", .8, 0, { side: THREE.DoubleSide }), [W/2 + 1.25, 3.6, 0]);
    add(g, box(.6, .7, .5), M("#F2EFE6", .7), [-W/2 - 1, .95, 0]);
    for (let k = 0; k < 4; k++) add(g, box(.6, .02, .52), M("#D9D6CE", .7), [-W/2 - 1, .7 + k*.15, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, cyl(.025, .025, .6, 6), M("#F2EFE6", .7), [-W/2 - 1 + sx*.25, .3, sz*.2]);
    chainUpdate(g, t => { cups.rotation.y = t*3.2; sk.rotation.y = Math.sin(t*.7)*.4; sk.scale.y = 1 + Math.sin(t*5)*.08; });
  }
  if (kind === "bakery"){
    const dome = new THREE.SphereGeometry(1.0, 14, 10, 0, 6.29, 0, Math.PI/2);
    add(g, paintFaces(dome, c => mixC(C("#B98A62"), C("#D6A87A"), h3(Math.floor(c.x*5), Math.floor(c.y*5), Math.floor(c.z*5)))), VC(.9), [W/2 + 1.4, .3, .6]);
    add(g, new THREE.CircleGeometry(.32, 16, 0, Math.PI), M("#1E1714", 1), [W/2 + 1.4, .32, -.41]);
    add(g, new THREE.CircleGeometry(.22, 16, 0, Math.PI), glow("#FF8A3A", .9), [W/2 + 1.4, .33, -.42]);
    add(g, box(1.2, 1.0, .35), M("#7A5A3E", .85), [-W/2 - .2, .85, -D/2 - .6]);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) add(g, new THREE.SphereGeometry(.11, 10, 8), M(j % 2 ? "#C98A4A" : "#B87A3E", .7), [-W/2 - .62 + j*.28, .55 + k*.3, -D/2 - .72], null, [1.3, .7, .9]);
  }
  if (kind === "bees"){
    const cols = ["#F2EFE6", "#E1B640", "#9FC0C8", "#E8B4A8", "#B6C79A"];
    for (let k = 0; k < 5; k++){
      const x = -W/2 - 1 + k*1.1, z = -D/2 - 2.4 - (k % 2)*.6;
      add(g, box(.5, .12, .5), M("#6E5139", .85), [x, .06, z]);
      for (let j = 0; j < 3; j++) add(g, box(.46, .22, .46), M(cols[(k + j) % 5], .7), [x, .24 + j*.23, z]);
      add(g, box(.56, .06, .56), M("#8C8A84", .5, .4), [x, .95, z]);
    }
    const bees = []; for (let k = 0; k < 14; k++) bees.push(add(g, new THREE.SphereGeometry(.03, 6, 4), M("#2E2A1E", .6), [0, 1, 0]));
    chainUpdate(g, t => bees.forEach((b, i) => { const a = t*(1.2 + i*.07) + i; b.position.set(-W/2 + 1.2 + Math.cos(a)*1.6, .9 + Math.sin(a*2.3)*.3, -D/2 - 2.6 + Math.sin(a)*1.0); }));
    addTufts(g, 30, 2, 4, 7);
  }
  if (kind === "stars"){
    add(g, cyl(1.05, 1.05, .9, 20), M("#8E887E", .9), [W/2 + 1.4, .45, 0]);
    add(g, new THREE.SphereGeometry(1.05, 20, 10, 0, 6.29, 0, Math.PI/2), M("#D9DCDF", .35, .6), [W/2 + 1.4, .9, 0]);
    add(g, box(.3, .9, 1.4), M("#1C2230", .8), [W/2 + 1.4, 1.3, -.2], [.6, 0, 0]);
    add(g, cyl(.08, .11, 1.0, 12), M("#3A4258", .4, .6), [-W/2 - .9, 1.1, -D/2 - .6], [-.7, .4, 0]);
    for (const a of [0, 2.1, 4.2]) add(g, cyl(.015, .015, 1.0, 5), M("#3A342C", .6), [-W/2 - .9 + Math.cos(a)*.25, .45, -D/2 - .6 + Math.sin(a)*.25], [Math.sin(a)*.3, 0, -Math.cos(a)*.3]);
  }
  return g;
}

