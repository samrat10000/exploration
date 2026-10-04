/* ============================================================
   WORLDKIT: HOT AIR BALLOON (striped envelope, wicker basket, ropes, burner + flame, passengers)
============================================================ */
function buildBalloon(seed = 1, pal){
  const g = new THREE.Group(), rnd = rng(seed);
  pal = pal || [["#E1B640","#C9473A"],["#3E6FA8","#F2EFE6"],["#4F8A54","#E8C547"],["#E58AAE","#F2EFE6"],["#E8743B","#5E3C7A"]][seed % 5];
  const prof = []; for (let i = 0; i <= 24; i++){ const t = i/24, y = t*14; const r = t < .62 ? 1.6 + Math.sin(t/.62*Math.PI*.5)*5.9 : 7.5*Math.sqrt(Math.max(0, 1 - Math.pow((t - .62)/.38, 2))) + .001; prof.push(new THREE.Vector2(Math.max(r, .05), y)); }
  const env = new THREE.LatheGeometry(prof, 32), A = C(pal[0]), B = C(pal[1]), band = C("#F2EFE6");
  add(g, paintFaces(env, (c, n, f) => { const a = Math.atan2(c.z, c.x), gore = Math.floor((a + Math.PI)/(Math.PI*2)*16); let col = gore % 2 ? A : B; if (c.y > 8.4 && c.y < 9.2) col = band; if (c.y < 1.2) col = C("#3A3632"); return mixC(col, C("#000000"), Math.max(0, -n.y)*.15); }), VC(.75, { flatShading: false }), [0, 4.2, 0]);
  add(g, new THREE.TorusGeometry(1.62, .05, 6, 24), M("#3A3632", .7), [0, 4.2, 0], [Math.PI/2, 0, 0]);
  for (let i = 0; i < 8; i++){ const a = i/8*Math.PI*2; add(g, tube(new THREE.LineCurve3(new THREE.Vector3(Math.cos(a)*1.6, 4.2, Math.sin(a)*1.6), new THREE.Vector3(Math.cos(a)*.62, 1.3, Math.sin(a)*.62)), .015, 2, 4), M("#4A4238", .8)); }
  const bk = box(1.3, .9, 1.3); add(g, paintFaces(bk, (c, n) => mixC(C("#8C6A45"), C("#B08A5C"), (Math.sin(c.y*60) > 0 ? .7 : 0) + (Math.sin((c.x + c.z)*55) > .3 ? .3 : 0))), VC(.95), [0, .45, 0]);
  add(g, new THREE.TorusGeometry(.66, .06, 6, 4), M("#6B4A30", .8), [0, .92, 0], [Math.PI/2, 0, Math.PI/4], [1.33, 1.33, 1]);
  add(g, cyl(.06, .08, .9, 8), M("#C9CCCB", .3, .8), [0, 1.55, 0]);
  for (const sx of [-1, 1]) add(g, cyl(.09, .09, .25, 10), M("#B9B4A8", .35, .7), [sx*.14, 1.45, 0]);
  const flame = add(g, new THREE.ConeGeometry(.22, 1.1, 8), new THREE.MeshBasicMaterial({ color: lin("#FFB04A"), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), [0, 2.4, 0]);
  const fl = new THREE.PointLight(0xffa04a, 0, 18, 2); fl.position.set(0, 2.6, 0); g.add(fl);
  const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color("#FFB04A"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); glowS.position.set(0, 3, 0); glowS.scale.setScalar(5); g.add(glowS);
  for (let i = 0; i < 4; i++){ const a = i/4*Math.PI*2 + .4; add(g, tube(new THREE.LineCurve3(new THREE.Vector3(Math.cos(a)*.66, .1, Math.sin(a)*.66), new THREE.Vector3(Math.cos(a)*.66, -.5, Math.sin(a)*.66)), .008, 2, 3), M("#4A4238", .8)); add(g, cyl(.09, .1, .22, 8), M("#C9B48A", .95), [Math.cos(a)*.66, -.6, Math.sin(a)*.66]); }
  const people = [];
  [[-.3, .2], [.3, -.15]].forEach(([x, z], i) => { const p = buildPerson(i ? "keeper" : "traveler"); p.scale.setScalar(.55); p.position.set(x, .35, z); g.add(p); people.push(p); });
  add(g, cyl(.01, .01, .9, 4), M("#4A4238", .8), [.6, 1.3, .6]); add(g, box(.3, .18, .01), M(pal[0], .8, 0, { side: THREE.DoubleSide }), [.76, 1.65, .6]);
  let burn = 0, nextBurn = 1 + rnd()*4;
  g.userData.update = (t, dt, night) => {
    nextBurn -= dt; if (nextBurn <= 0){ burn = 1.2 + rnd()*1.2; nextBurn = 3 + rnd()*6; }
    burn = Math.max(0, burn - dt); const on = burn > 0 ? 1 : 0, k = on*(.8 + .2*Math.sin(t*30));
    flame.material.opacity = k*.9; flame.scale.set(1, .8 + k*.4, 1); fl.intensity = k*(night ? 3 : 1.2); glowS.material.opacity = k*(night ? .9 : .35);
    people[0].rotation.y = Math.sin(t*.4)*.6; people[1].rotation.y = Math.PI + Math.sin(t*.3 + 1)*.5;
  };
  return g;
}

