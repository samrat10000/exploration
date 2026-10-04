/* ============================================================
   WORLDKIT: DRAGON (friendly lantern-festival dragon; serpentine body rebuilt every frame)
============================================================ */
function buildDragon(palette = "jade"){
  const P = palette === "jade" ? { back: "#2E7D63", back2: "#3FA07C", belly: "#E8C770", mane: "#F2EFE6", horn: "#E8C770", fin: "#C9473A" }
                               : { back: "#B0352B", back2: "#D9563A", belly: "#F2CF6A", mane: "#F7E7B8", horn: "#F2CF6A", fin: "#2E7D63" };
  const N = 64, SIDES = 12, LEN = 34;
  const g = new THREE.Group();
  const geo = new THREE.BufferGeometry(), pos = new Float32Array((N + 1)*SIDES*3), colA = new Float32Array((N + 1)*SIDES*3), idx = [];
  for (let i = 0; i < N; i++) for (let s = 0; s < SIDES; s++){ const a = i*SIDES + s, b = i*SIDES + (s + 1) % SIDES, c = (i + 1)*SIDES + s, d = (i + 1)*SIDES + (s + 1) % SIDES; idx.push(a, c, b, b, c, d); }
  geo.setIndex(idx); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(colA, 3));
  const cB = C(P.back), cB2 = C(P.back2), cBe = C(P.belly);
  for (let i = 0; i <= N; i++) for (let s = 0; s < SIDES; s++){ const a = s/SIDES*Math.PI*2, belly = Math.max(0, -Math.cos(a)); const scale = (Math.sin(i*1.9 + s*2.3) > .2) ? 1 : .82; const col = mixC(mixC(cB, cB2, ((i + s) % 3)/3), cBe, Math.pow(belly, .7)*1.1).multiplyScalar(scale); const k = (i*SIDES + s)*3; colA[k] = col.r; colA[k+1] = col.g; colA[k+2] = col.b; }
  const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, metalness: .15 })); body.frustumCulled = false; body.castShadow = true; g.add(body);
  const finM = M(P.fin, .6, 0, { side: THREE.DoubleSide }), maneM = M(P.mane, .9), hornM = M(P.horn, .4, .3);
  const fins = []; for (let i = 3; i < N - 2; i += 2){ const f = new THREE.Mesh(new THREE.ConeGeometry(.16, .7, 4), finM); f.castShadow = true; g.add(f); fins.push({ m: f, i }); }
  const manes = []; for (let i = 1; i < 8; i++) for (const sd of [-1, 1]){ const m = new THREE.Mesh(new THREE.ConeGeometry(.12, .9, 5), maneM); g.add(m); manes.push({ m, i, sd }); }
  const head = new THREE.Group(); g.add(head);
  const skull = new THREE.IcosahedronGeometry(1, 1); skull.scale(.62, .5, .95);
  add(head, paintFaces(skull, (c, n) => n.y < -.3 ? C(P.belly) : mixC(C(P.back), C(P.back2), n.y*.5 + .5)), VC(.5), [0, 0, 0]);
  const snout = new THREE.IcosahedronGeometry(1, 1); snout.scale(.42, .3, .6); add(head, paintFaces(snout, (c, n) => n.y < -.2 ? C(P.belly) : C(P.back2)), VC(.5), [0, -.08, -.95]);
  add(head, box(.5, .08, .62), M("#7A2A22", .6), [0, -.3, -.85], [.2, 0, 0]);
  for (let k = 0; k < 6; k++) add(head, new THREE.ConeGeometry(.03, .1, 4), M("#FFFFFF", .4), [-.18 + k*.072, -.33, -1.05], [Math.PI, 0, 0]);
  for (const sx of [-1, 1]){
    add(head, new THREE.SphereGeometry(.13, 12, 10), glow("#FFD24A", 1.2), [sx*.36, .18, -.5]);
    add(head, new THREE.SphereGeometry(.06, 8, 6), M("#1A1410", .2), [sx*.4, .19, -.6]);
    const horn = tube(new THREE.CatmullRomCurve3([new THREE.Vector3(sx*.25, .35, -.1), new THREE.Vector3(sx*.45, .9, .3), new THREE.Vector3(sx*.38, 1.3, .9), new THREE.Vector3(sx*.6, 1.5, 1.2)]), .06, 16, 6); add(head, horn, hornM);
    add(head, tube(new THREE.CatmullRomCurve3([new THREE.Vector3(sx*.42, .9, .35), new THREE.Vector3(sx*.75, 1.15, .4)]), .035, 6, 5), hornM);
    add(head, new THREE.ConeGeometry(.12, .5, 5), M(P.back2, .6), [sx*.55, .3, .2], [0, 0, sx*1.2]);
  }
  const whiskers = [-1, 1].map(sx => { const w = new THREE.Mesh(new THREE.BufferGeometry(), M(P.mane, .8)); head.add(w); return { w, sx }; });
  const beard = []; for (let k = 0; k < 5; k++) beard.push(add(head, new THREE.ConeGeometry(.05, .6, 4), maneM, [-.16 + k*.08, -.55, -.7], [Math.PI*.85, 0, 0]));
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(.45, 18, 14), glow("#FFF2C8", 1.4)); g.add(pearl);
  const pearlHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color("#FFE7A0"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .7 })); pearlHalo.scale.setScalar(3.2); g.add(pearlHalo);
  const legs = []; for (const at of [10, 34]) for (const sd of [-1, 1]){ const L = new THREE.Group(); add(L, cyl(.12, .09, .9, 6), M(P.back, .6), [0, -.45, 0]); for (let k = 0; k < 3; k++) add(L, new THREE.ConeGeometry(.05, .25, 4), M("#F2EFE6", .4), [(-1 + k)*.08, -.95, -.08], [Math.PI*.8, 0, 0]); g.add(L); legs.push({ L, at, sd }); }
  const tailFin = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.6, 4), finM); g.add(tailFin);
  // spine follows a history of the head's path
  const hist = []; const spine = []; for (let i = 0; i <= N; i++) spine.push(new THREE.Vector3());
  const up = new THREE.Vector3(0, 1, 0), tg = new THREE.Vector3(), nm = new THREE.Vector3(), bn = new THREE.Vector3(), tmpv = new THREE.Vector3();
  const radius = i => { const t = i/N; return (t < .06 ? .55 + t*6 : 1.0 - t*.82)*.95 + .08; };
  g.userData.update = (t, headPos, headDir) => {
    hist.unshift(headPos.clone()); const need = 520; if (hist.length > need) hist.length = need;
    // resample spine at equal arc lengths
    let acc = 0, j = 0; spine[0].copy(hist[0]); const step = LEN/N;
    for (let i = 1; i <= N; i++){ const target = i*step; while (j < hist.length - 1){ const d = hist[j].distanceTo(hist[j+1]); if (acc + d >= target){ spine[i].copy(hist[j]).lerp(hist[j+1], (target - acc)/Math.max(d, 1e-5)); break; } acc += d; j++; } if (j >= hist.length - 1) spine[i].copy(hist[hist.length - 1]).addScaledVector(headDir, -(target - acc)); }
    for (let i = 0; i <= N; i++){
      const a = spine[Math.max(0, i - 1)], b = spine[Math.min(N, i + 1)]; tg.subVectors(a, b).normalize(); if (tg.lengthSq() < .5) tg.copy(headDir);
      nm.crossVectors(tg, up).normalize(); if (nm.lengthSq() < .5) nm.set(1, 0, 0); bn.crossVectors(nm, tg).normalize();
      const r = radius(i), wob = Math.sin(t*3 - i*.35)*.05;
      for (let s = 0; s < SIDES; s++){ const ang = s/SIDES*Math.PI*2, k = (i*SIDES + s)*3; tmpv.copy(spine[i]).addScaledVector(nm, Math.sin(ang)*r).addScaledVector(bn, Math.cos(ang)*r*(1 + wob)); pos[k] = tmpv.x; pos[k+1] = tmpv.y; pos[k+2] = tmpv.z; }
      const f = fins.find(o => o.i === i); if (f){ f.m.position.copy(spine[i]).addScaledVector(bn, r + .25); f.m.lookAt(tmpv.copy(f.m.position).add(bn)); f.m.rotateX(Math.PI/2); }
      manes.forEach(m => { if (m.i === i){ m.m.position.copy(spine[i]).addScaledVector(bn, r*.7).addScaledVector(nm, m.sd*r*.7); m.m.lookAt(tmpv.copy(m.m.position).addScaledVector(tg, -1).addScaledVector(nm, m.sd*.6).addScaledVector(bn, .3)); m.m.rotateX(Math.PI/2); m.m.rotation.z += Math.sin(t*5 + i)*.15; } });
      legs.forEach(L => { if (L.at === i){ L.L.position.copy(spine[i]).addScaledVector(nm, L.sd*r*.9).addScaledVector(bn, -r*.4); L.L.lookAt(tmpv.copy(L.L.position).add(tg)); L.L.rotation.x += Math.sin(t*4 + i)*.4; } });
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    head.position.copy(spine[0]).addScaledVector(headDir, .3); head.lookAt(tmpv.copy(head.position).sub(headDir)); head.rotateY(Math.PI);
    tailFin.position.copy(spine[N]); tailFin.lookAt(tmpv.copy(spine[N - 2])); tailFin.rotateX(-Math.PI/2); tailFin.scale.set(.25, 1, 1.4);
    pearl.position.copy(spine[0]).addScaledVector(headDir, 3.2 + Math.sin(t*1.3)*.6); pearl.position.y += Math.sin(t*2)*.4; pearlHalo.position.copy(pearl.position);
    whiskers.forEach(({ w, sx }) => { const pts = []; for (let k = 0; k < 6; k++) pts.push(new THREE.Vector3(sx*(.3 + k*.35), -.1 - k*.12 + Math.sin(t*3 + k + sx)*.12*k, -1.2 + k*.45 + Math.cos(t*2 + k)*.1*k)); w.geometry.dispose(); w.geometry = tube(new THREE.CatmullRomCurve3(pts), .025, 14, 4); });
    beard.forEach((b, k) => b.rotation.z = Math.sin(t*3 + k)*.15);
  };
  return g;
}
