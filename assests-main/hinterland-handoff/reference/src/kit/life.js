/* ============================================================
   ASSET: GOAT (crossing obstacle)
============================================================ */
function buildGoat(){
  const g = new THREE.Group(), coat = VC(.95);
  const body = new THREE.IcosahedronGeometry(1, 1); body.scale(.24, .22, .42);
  add(g, paintFaces(body, (c, n) => h3(Math.floor(c.x*8), Math.floor(c.y*8), Math.floor(c.z*8)) > .78 || c.z > .25 ? C("#7A5638") : mixC(C("#E9E2D3"), C("#FFFFFF"), n.y*.5 + .3)), coat, [0, .66, 0]);
  add(g, cyl(.08, .1, .34, 8), M("#EDE6D8", .95), [0, .86, -.36], [.7, 0, 0]);
  const head = new THREE.IcosahedronGeometry(1, 1); head.scale(.09, .1, .17);
  add(g, paintFaces(head, () => C("#F1EBDF")), coat, [0, .98, -.52], [.3, 0, 0]);
  for (const sx of [-1, 1]){
    add(g, tube(new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx*.04, 1.06, -.5), new THREE.Vector3(sx*.06, 1.2, -.42), new THREE.Vector3(sx*.07, 1.16, -.3)), .016, 8, 5), M("#8B7A62", .6));
    add(g, box(.12, .03, .05), M("#E3DBCB", .95), [sx*.12, 1.0, -.47], [0, 0, sx*.4]);
    add(g, new THREE.SphereGeometry(.014, 6, 4), M("#1B1A18", .3), [sx*.065, 1.0, -.6]);
    for (const z of [-.26, .26]){ add(g, cyl(.028, .022, .5, 6), M("#E6DED0", .95), [sx*.12, .25, z]); add(g, cyl(.024, .024, .05, 6), M("#3A332B", .8), [sx*.12, .025, z]); }
  }
  add(g, new THREE.ConeGeometry(.025, .1, 5), M("#D8D0C0", .95), [0, .86, -.64], [Math.PI, 0, 0]);
  add(g, new THREE.ConeGeometry(.04, .12, 5), M("#7A5638", .95), [0, .86, .42], [-.6, 0, 0]);
  return g;
}

/* ============================================================
   ASSET: TRAVELER / KEEPER (friendly NPCs)
============================================================ */
function buildPerson(kind = "traveler"){
  const g = new THREE.Group(), keeper = kind === "keeper";
  const skin = M(keeper ? "#B98A68" : "#C99A74", .8), coat = M(keeper ? "#8C5A3C" : "#5F7A8C", .85), pants = M(keeper ? "#4A4038" : "#5E5446", .9), boots = M("#3A2E25", .8);
  for (const sx of [-1, 1]){ add(g, cyl(.075, .065, .82, 8), pants, [sx*.1, .46, 0]); add(g, box(.13, .1, .24), boots, [sx*.1, .05, -.04]); }
  add(g, cyl(.2, .24, .72, 10), coat, [0, 1.2, 0]);
  add(g, cyl(.245, .26, .1, 10), M("#4A3A2E", .8), [0, .88, 0]);
  if (keeper) add(g, box(.36, .62, .03), M("#C9B48A", .9), [0, 1.0, -.22]);
  for (const sx of [-1, 1]){ add(g, cyl(.06, .055, .62, 7), coat, [sx*.27, 1.22, 0], [0, 0, sx*.16]); add(g, new THREE.SphereGeometry(.055, 8, 6), skin, [sx*.32, .9, 0]); }
  add(g, cyl(.06, .07, .1, 8), skin, [0, 1.6, 0]);
  add(g, new THREE.SphereGeometry(.15, 14, 12), skin, [0, 1.76, 0], null, [1, 1.08, 1]);
  add(g, new THREE.TorusGeometry(.12, .05, 8, 16), M(keeper ? "#C9473A" : "#E1B640", .9), [0, 1.6, 0], [Math.PI/2, 0, 0]);
  if (keeper){
    add(g, new THREE.SphereGeometry(.16, 14, 8, 0, 6.29, 0, 1.6), M("#C9473A", .9), [0, 1.8, 0]);
    add(g, new THREE.SphereGeometry(.11, 10, 8), M("#D9D3C6", .95), [0, 1.66, -.07], null, [1, .9, .7]);
  } else {
    add(g, cyl(.3, .3, .02, 18), M("#8C6E4A", .85), [0, 1.86, 0]);
    add(g, cyl(.14, .16, .14, 14), M("#8C6E4A", .85), [0, 1.94, 0]);
    add(g, box(.38, .5, .22), M("#6E7F54", .85), [0, 1.22, .3]);
    add(g, cyl(.09, .09, .44, 10), M("#B7563C", .9), [0, 1.54, .3], [0, 0, Math.PI/2]);
    add(g, cyl(.018, .018, 1.6, 6), M("#7A5C3F", .9), [.36, .8, -.05], [0, 0, -.06]);
  }
  for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(.018, 6, 4), M("#1E1C19", .3), [sx*.055, 1.78, -.14]);
  return g;
}

