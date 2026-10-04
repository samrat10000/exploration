/* ============================================================
   ASSET: PINE (layered, drooping skirts, vertex-painted)
============================================================ */
const PINE = { dark: C("#21392A"), mid: C("#2F4D35"), light: C("#4E6E42"), tip: C("#7C9256"), bark: C("#4E3A2B"), barkL: C("#6E5440") };
function buildPine(seed = 1, H = 8){
  const g = new THREE.Group(), rnd = rng(seed);
  const trunk = new THREE.LatheGeometry([[.34,0],[.22,.18],[.17,.6],[.14,H*.55],[.05,H*.95]].map(p => new THREE.Vector2(p[0], p[1])), 8);
  add(g, paintFaces(trunk, (c, n, f) => mixC(PINE.bark, PINE.barkL, h3(f, 1, seed)*.6)), VC(.95));
  for (let i = 0; i < 5; i++){ const a = i/5*Math.PI*2 + rnd(); add(g, cyl(.02, .12, .7, 5), M("#4E3A2B", .95), [Math.cos(a)*.3, .08, Math.sin(a)*.3], [Math.sin(a)*1.25, 0, -Math.cos(a)*1.25]); }
  const tiers = 7 + Math.floor(rnd()*2);
  for (let i = 0; i < tiers; i++){
    const t = i/(tiers - 1), rad = H*.27*(1 - t*.8) + .25, ht = H*.25*(1 - t*.42), y0 = H*(.16 + t*.68);
    const cone = new THREE.ConeGeometry(rad, ht, 10, 3, true);
    const p = cone.attributes.position, ph = rnd()*6.28;
    for (let k = 0; k < p.count; k++){
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k), a = Math.atan2(z, x), lv = (y + ht/2)/ht;
      let r = 1 + .14*Math.sin(a*5 + ph) + .08*Math.sin(a*11 + ph*2) + .06*n3(x*2 + seed, y*2, z*2);
      let dy = 0;
      if (lv < .05){ r *= 1.08; dy = -.22*rad*(.6 + .4*Math.sin(a*5 + ph)); }
      p.setXYZ(k, x*r, y + dy, z*r);
    }
    const geo = paintFaces(cone, (c, n) => {
      const lv = (c.y + ht/2)/ht, sun = Math.max(0, n.y*.6 + n.x*.3 + .2);
      let col = mixC(PINE.dark, PINE.mid, lv*.9 + .1);
      col = mixC(col, PINE.light, sun*.8);
      if (lv < .2) col = mixC(col, PINE.tip, sun*.5);
      return mixC(col, PINE.dark, h3(c.x*3, c.y*3, c.z*3)*.25);
    });
    const m = add(g, geo, VC(.9, { side: THREE.DoubleSide }), [0, y0 + ht/2, 0], [0, rnd()*6.28, 0]);
  }
  add(g, new THREE.ConeGeometry(.18, .9, 6), M("#4E6E42", .9, 0, { flatShading: true }), [0, H*.97, 0]);
  return g;
}

/* ============================================================
   ASSET: BLOSSOM / APPLE TREE (branching trunk, lumpy canopy, real flowers)
============================================================ */
function flowerGeo(r = .07){
  const g = new THREE.CircleGeometry(r, 20), p = g.attributes.position, cols = [];
  const rim = new THREE.Color(1, 1, 1), mid = C("#F7E6A0");
  for (let i = 0; i < p.count; i++){
    const x = p.getX(i), y = p.getY(i), a = Math.atan2(y, x), d = Math.hypot(x, y);
    const k = d < 1e-5 ? 0 : .55 + .45*Math.abs(Math.cos(a*2.5));
    p.setXY(i, x*k, y*k); const c = d < 1e-5 ? mid : rim; cols.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  return g;
}
function buildBlossom(seed = 3, kind = "pink"){
  const g = new THREE.Group(), rnd = rng(seed);
  const bark = M(kind === "pink" ? "#5B4033" : "#5E4A36", .95);
  const trunkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.08, .7, .02), new THREE.Vector3(-.04, 1.35, .05), new THREE.Vector3(.05, 1.75, 0)]);
  add(g, new THREE.TubeGeometry(trunkCurve, 16, .16, 8, false), bark);
  add(g, new THREE.LatheGeometry([[.3,0],[.2,.15],[.16,.35]].map(p => new THREE.Vector2(p[0], p[1])), 8), bark);
  const lobes = [];
  const N = 7;
  for (let i = 0; i < N; i++){
    const a = i/N*Math.PI*2 + rnd()*.5, d = i === 0 ? 0 : .75 + rnd()*.35, y = 2.55 + (i === 0 ? .55 : (rnd() - .3)*.6);
    const c = new THREE.Vector3(Math.cos(a)*d, y, Math.sin(a)*d), r = (i === 0 ? 1.0 : .62 + rnd()*.28);
    lobes.push({ c, r });
    if (i > 0) add(g, new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(c.x*.4, 1.9 + rnd()*.3, c.z*.4), c.clone().multiplyScalar(.85)), 10, .055, 6, false), bark);
  }
  const leafA = C(kind === "pink" ? "#6D8A48" : "#5E7F42"), leafB = C(kind === "pink" ? "#4C6A3A" : "#3F5E33"), bloom = C(kind === "pink" ? "#E8A7BC" : "#F2ECDF");
  for (const { c, r } of lobes){
    const geo = new THREE.IcosahedronGeometry(r, 1), p = geo.attributes.position;
    for (let k = 0; k < p.count; k++){ const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k)); v.multiplyScalar(1 + .16*n3(v.x*2.2 + seed, v.y*2.2, v.z*2.2)); v.y *= .82; p.setXYZ(k, v.x, v.y, v.z); }
    add(g, paintFaces(geo, (cc, n) => {
      const sun = Math.max(0, n.y*.7 + n.x*.3);
      let col = mixC(leafB, leafA, sun + .15);
      if (h3(cc.x*5 + c.x, cc.y*5, cc.z*5) < (kind === "pink" ? .45 : .2)) col = mixC(col, bloom, .55 + sun*.3);
      return col;
    }), VC(.9), [c.x, c.y, c.z]);
  }
  // flowers on the canopy surface
  const fg = flowerGeo(kind === "pink" ? .085 : .07);
  const fm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, side: THREE.DoubleSide });
  const count = kind === "pink" ? 420 : 220, inst = new THREE.InstancedMesh(fg, fm, count), d = new THREE.Object3D(), col = new THREE.Color();
  const pinks = ["#F4B6C8", "#F7CBD7", "#EC9AB5", "#FFF1F3", "#F9D9E2"].map(C), whites = ["#FFFFFF", "#FFF6EE", "#FBEFF2", "#FFF9E6"].map(C);
  for (let i = 0; i < count; i++){
    const L = lobes[Math.floor(rnd()*lobes.length)], dir = new THREE.Vector3(rnd()*2 - 1, rnd()*1.4 - .4, rnd()*2 - 1).normalize();
    const pos = L.c.clone().add(dir.clone().multiplyScalar(L.r*(1.0 + rnd()*.08))).setY(L.c.y + dir.y*L.r*.82 + .02);
    d.position.copy(pos); d.lookAt(pos.clone().add(dir)); d.rotateZ(rnd()*6.28); d.scale.setScalar(.75 + rnd()*.6); d.updateMatrix();
    inst.setMatrixAt(i, d.matrix); inst.setColorAt(i, (kind === "pink" ? pinks : whites)[Math.floor(rnd()*5) % (kind === "pink" ? 5 : 4)]);
  }
  inst.castShadow = true; g.add(inst);
  // fallen petals ring
  const pc = 160, pet = new THREE.InstancedMesh(new THREE.CircleGeometry(.035, 6), new THREE.MeshStandardMaterial({ color: kind === "pink" ? lin("#F2BACB") : lin("#FFF8EE"), roughness: .8 }), pc);
  for (let i = 0; i < pc; i++){ const a = rnd()*6.28, r = Math.sqrt(rnd())*2.4; d.position.set(Math.cos(a)*r, .012, Math.sin(a)*r); d.rotation.set(-Math.PI/2, 0, rnd()*6); d.scale.setScalar(.6 + rnd()*.8); d.updateMatrix(); pet.setMatrixAt(i, d.matrix); }
  pet.receiveShadow = true; g.add(pet);
  if (kind === "apple"){
    for (let i = 0; i < 26; i++){
      const L = lobes[1 + Math.floor(rnd()*(lobes.length - 1))], dir = new THREE.Vector3(rnd()*2 - 1, -rnd()*.7, rnd()*2 - 1).normalize();
      const pos = L.c.clone().add(dir.multiplyScalar(L.r*.95));
      add(g, new THREE.SphereGeometry(.075, 10, 8), M(i % 3 ? "#C8452F" : "#D9A93A", .5), [pos.x, pos.y, pos.z]);
    }
  }
  return g;
}

/* ============================================================
   ASSET: ROCKS (noise-displaced, moss on top, lichen specks)
============================================================ */
const ROCK = { a: C("#8D877D"), b: C("#726E67"), c: C("#A39D91"), moss: C("#6E7F45"), mossL: C("#90A05A"), lichen: C("#C9A25A"), lichen2: C("#D9D3C1"), base: C("#4F4B45") };
function rockGeo(seed, sx = 1, sy = .7, sz = .9, detail = 2, mossy = .55){
  const geo = new THREE.IcosahedronGeometry(1, detail), p = geo.attributes.position, s = seed*1.37;
  for (let k = 0; k < p.count; k++){
    const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k));
    const nn = n3(v.x*1.2 + s, v.y*1.2, v.z*1.2)*.32 + n3(v.x*3 + s, v.y*3, v.z*3)*.1;
    v.multiplyScalar(1 + nn);
    v.x *= sx; v.y *= sy; v.z *= sz;
    if (v.y < -.3*sy) v.y = -.3*sy + (v.y + .3*sy)*.12;
    v.y += Math.round(v.y*6)/6*.06;
    p.setXYZ(k, v.x, v.y, v.z);
  }
  return paintFaces(geo, (c, n, f) => {
    const t = n3(c.x*2 + s, c.y*2, c.z*2);
    let col = t > .2 ? mixC(ROCK.a, ROCK.c, t) : mixC(ROCK.a, ROCK.b, -t + .3);
    col = mixC(col, ROCK.base, Math.max(0, -c.y/sy)*.5);
    const mossAmt = (n.y - mossy)*2.6 + n3(c.x*3.3, c.y*3.3 + s, c.z*3.3)*.6;
    if (mossAmt > 0) col = mixC(col, mixC(ROCK.moss, ROCK.mossL, h3(f, s, 2)), Math.min(1, mossAmt));
    const sp = h3(f, s, 9);
    if (sp > .965) col = mixC(col, sp > .985 ? ROCK.lichen : ROCK.lichen2, .8);
    return col;
  });
}
function buildRockGroup(){
  const g = new THREE.Group(), mat = VC(.95);
  add(g, rockGeo(1, 1.5, 1.0, 1.2, 3), mat, [0, .62, 0], [0, .4, 0]);
  add(g, rockGeo(2, .8, .55, .7, 2), mat, [1.65, .3, .55], [0, 1.2, 0]);
  add(g, rockGeo(3, .55, .4, .5, 2), mat, [-1.35, .22, .75], [0, 2, 0]);
  const rnd = rng(9);
  for (let i = 0; i < 9; i++){ const a = rnd()*6.28, r = 1.6 + rnd()*1.2, s = .1 + rnd()*.16; add(g, rockGeo(10 + i, s, s*.6, s*.8, 1), mat, [Math.cos(a)*r, s*.25, Math.sin(a)*r], [0, rnd()*6, 0]); }
  addTufts(g, 26, 1.3, 2.8, 5);
  return g;
}
function buildTrailStones(){ // replaces the plain blocks along the trail edge
  const g = new THREE.Group(), mat = VC(.95), rnd = rng(21);
  for (let i = 0; i < 7; i++){
    const s = .35 + rnd()*.25, x = -3 + i*1.0 + rnd()*.2;
    add(g, rockGeo(30 + i, s*1.2, s*.75, s, 2, .45), mat, [x, s*.35, (rnd() - .5)*.3], [0, rnd()*6, 0]);
  }
  addTufts(g, 22, .2, 3.4, 11, true);
  return g;
}

/* ============================================================
   ASSET: DRY-STONE WALL (cliff-side guard; instanced stones in game)
============================================================ */
function buildWall(len = 3.2){
  const g = new THREE.Group(), mat = VC(.95), rnd = rng(42);
  const rows = [.16, .4, .62];
  rows.forEach((y, r) => {
    let x = -len/2 + (r % 2 ? .18 : 0);
    while (x < len/2 - .12){
      const w = .26 + rnd()*.22, h = .16 + rnd()*.07;
      add(g, rockGeo(100 + r*40 + Math.floor(x*10), w*.55, h*.62, .24, 1, .6), mat, [x + w/2, y + (rnd() - .5)*.03, (rnd() - .5)*.05], [0, (rnd() - .5)*.2, (rnd() - .5)*.12]);
      x += w + .015;
    }
  });
  for (let x = -len/2 + .1; x < len/2 - .1; x += .42 + rnd()*.1) add(g, rockGeo(300 + Math.floor(x*10), .26, .07, .27, 1, .3), mat, [x + .2, .8, 0], [0, rnd(), 0]);
  addTufts(g, 18, .15, len*.5, 77, true);
  return g;
}

/* ============================================================
   ASSET: POSTS + ROPE
============================================================ */
function buildPosts(){
  const g = new THREE.Group(), rnd = rng(5), rope = M("#CDB88C", .95);
  const tops = [];
  for (let i = 0; i < 3; i++){
    const x = -2.4 + i*2.4, h = 1.05 + rnd()*.12, lean = (rnd() - .5)*.08;
    const geo = cyl(.065, .085, h, 7), p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) + n3(p.getY(k)*3, i, 0)*.012);
    const pm = add(g, paintFaces(geo, (c) => mixC(C("#5B4636"), C("#8C7458"), (c.y + h/2)/h*.7 + h3(c.x*20, c.y*20, i)*.3)), VC(.95), [x, h/2, 0], [0, 0, lean]);
    add(g, new THREE.TorusGeometry(.03, .007, 6, 12), M("#5D5A55", .5, .7), [x + lean*h, h - .12, .07]);
    tops.push(new THREE.Vector3(x - lean*h*.5, h - .12, .08));
    add(g, rockGeo(70 + i, .16, .1, .14, 1), VC(.95), [x + .12, .05, .08]);
  }
  for (let i = 0; i < 2; i++) add(g, tube(catenary(tops[i], tops[i+1], .18), .016, 20, 6), rope);
  addTufts(g, 20, .2, 3.2, 31, true);
  return g;
}

/* ============================================================
   ASSET: GRASS + WILDFLOWERS (the shader spec for the field)
============================================================ */
function bladeGeo(w = .045, h = .55, bend = .18){
  const g = new THREE.PlaneGeometry(w, h, 1, 6); g.translate(0, h/2, 0);
  const p = g.attributes.position, cols = [], base = C("#4C6232"), tip = C("#B9B86A");
  for (let i = 0; i < p.count; i++){
    const t = p.getY(i)/h;
    p.setX(i, p.getX(i)*(1 - t*.9));
    p.setZ(i, bend*t*t);
    const c = mixC(base, tip, Math.pow(t, 1.3)); cols.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  return g;
}
function addTufts(parent, n, r0, r1, seed, line){
  const rnd = rng(seed), d = new THREE.Object3D(), count = n*9;
  const inst = new THREE.InstancedMesh(bladeGeo(.035, .32, .08), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .9 }), count);
  let k = 0;
  for (let i = 0; i < n; i++){
    const a = rnd()*6.28, r = r0 + rnd()*(r1 - r0);
    const cx = line ? (rnd()*2 - 1)*r1 : Math.cos(a)*r, cz = line ? (rnd() - .5)*.9 : Math.sin(a)*r;
    for (let j = 0; j < 9; j++){
      d.position.set(cx + (rnd() - .5)*.12, 0, cz + (rnd() - .5)*.12); d.rotation.set(0, rnd()*6.28, 0); d.scale.set(1, .6 + rnd()*.8, 1); d.updateMatrix();
      inst.setMatrixAt(k++, d.matrix);
    }
  }
  inst.castShadow = false; inst.receiveShadow = true; parent.add(inst);
}
function buildGrassPatch(){
  const g = new THREE.Group(), rnd = rng(11), d = new THREE.Object3D();
  const soil = new THREE.CircleGeometry(1.6, 48); soil.rotateX(-Math.PI/2);
  add(g, paintFaces(soil, c => mixC(C("#5E6B3C"), C("#7A6A4A"), h3(c.x*6, 0, c.z*6)*.5)), VC(1), [0, .001, 0]);
  const N = 2600, blades = new THREE.InstancedMesh(bladeGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .85 }), N);
  const tint = new THREE.Color();
  for (let i = 0; i < N; i++){
    const clump = Math.floor(rnd()*90), ca = h3(clump, 1, 1)*6.28, cr = Math.sqrt(h3(clump, 2, 2))*1.45;
    const a = rnd()*6.28, rr = rnd()*.16;
    d.position.set(Math.cos(ca)*cr + Math.cos(a)*rr, 0, Math.sin(ca)*cr + Math.sin(a)*rr);
    d.rotation.set(0, rnd()*6.28, 0); d.scale.set(.8 + rnd()*.5, .55 + rnd()*.75, 1); d.updateMatrix(); blades.setMatrixAt(i, d.matrix);
    tint.setHSL(.2 + (rnd() - .5)*.05, .25 + rnd()*.2, .9 + rnd()*.15); blades.setColorAt(i, tint);
  }
  blades.receiveShadow = true; g.add(blades);
  // wild oats (seed heads)
  for (let i = 0; i < 26; i++){
    const a = rnd()*6.28, r = Math.sqrt(rnd())*1.4, x = Math.cos(a)*r, z = Math.sin(a)*r, h = .6 + rnd()*.3;
    const stem = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, h*.7, z), new THREE.Vector3(x + .08, h, z + .04));
    add(g, tube(stem, .004, 8, 4), M("#B7A96E", .9));
    for (let j = 0; j < 5; j++){ const t = .78 + j*.045, p = stem.getPoint(t); add(g, new THREE.SphereGeometry(.014, 6, 4), M("#D2C38A", .9), [p.x + .02, p.y - .015, p.z], null, [.6, 1.6, .6]); }
  }
  // flowers: daisy, buttercup, lupin, cosmos
  const daisy = flowerGeo(.035), cosmos = flowerGeo(.045);
  const fm = c => new THREE.MeshStandardMaterial({ color: lin(c), vertexColors: true, roughness: .7, side: THREE.DoubleSide });
  const stemM = M("#56703A", .9);
  const place = (k, fn) => { for (let i = 0; i < k; i++){ const a = rnd()*6.28, r = Math.sqrt(rnd())*1.45; fn(Math.cos(a)*r, Math.sin(a)*r, i); } };
  place(26, (x, z) => { const h = .18 + rnd()*.12; add(g, cyl(.003, .003, h, 4), stemM, [x, h/2, z]); add(g, daisy, fm("#FFFFFF"), [x, h, z], [-Math.PI/2 + .4, 0, rnd()*6]); });
  place(22, (x, z) => { const h = .22 + rnd()*.15; add(g, cyl(.003, .003, h, 4), stemM, [x, h/2, z]); add(g, new THREE.SphereGeometry(.022, 8, 6, 0, 6.29, 0, 1.6), M("#F2C230", .45), [x, h, z], null, [1, .7, 1]); });
  place(7, (x, z) => { const h = .45 + rnd()*.2; add(g, cyl(.006, .006, h, 5), stemM, [x, h/2, z]); for (let j = 0; j < 7; j++) add(g, new THREE.ConeGeometry(.03 - j*.003, .05, 6), M(j % 2 ? "#8F78C2" : "#A48CD6", .6), [x, h*.6 + j*.045, z]); });
  place(12, (x, z) => { const h = .38 + rnd()*.12; add(g, cyl(.004, .004, h, 4), stemM, [x, h/2, z]); add(g, cosmos, fm(rnd() > .5 ? "#F2A9C4" : "#E58AAE"), [x, h, z], [-Math.PI/2 + .5, 0, rnd()*6]); });
  // clover
  place(18, (x, z) => { for (let j = 0; j < 3; j++){ const a = j*2.09; add(g, new THREE.CircleGeometry(.018, 8), M("#4F7038", .8), [x + Math.cos(a)*.018, .035, z + Math.sin(a)*.018], [-Math.PI/2, 0, 0]); } });
  g.userData.camHint = 2.6;
  return g;
}

