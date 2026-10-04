/* ============================================================
   ASSET: MULE (3-wheel cargo auto). Forward = -Z. Units = meters.
============================================================ */
function buildMule(opts = {}){
  const g = new THREE.Group(), Y = .2, W = 1.26;
  const paint = M(opts.paint || "#4F8C88", .5, .12), paintD = M(opts.paintDark || "#3C6F6B", .55, .12);
  const cream = M("#E6DCC4", .6), chrome = M("#D2D4D0", .22, .9), dark = M("#2B2A27", .8), rubber = M("#232220", .95);
  const glassM = new THREE.MeshStandardMaterial({ color: lin("#9CC2C8"), roughness: .05, metalness: .2, transparent: true, opacity: .45 });
  const interior = M("#1E2A2C", .9);
  // cab shell: side profile (z,y) extruded across X with a soft bevel
  const s = new THREE.Shape();
  s.moveTo(-.32, .42 + Y); s.lineTo(-1.28, .42 + Y);
  s.quadraticCurveTo(-1.52, .44 + Y, -1.53, .74 + Y);
  s.lineTo(-1.50, .98 + Y); s.lineTo(-1.31, 1.70 + Y);
  s.quadraticCurveTo(-1.28, 1.77 + Y, -1.18, 1.77 + Y);
  s.lineTo(-.42, 1.77 + Y); s.quadraticCurveTo(-.32, 1.77 + Y, -.32, 1.67 + Y); s.lineTo(-.32, .42 + Y);
  const cabG = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 4, curveSegments: 12 });
  cabG.rotateY(-Math.PI/2); cabG.translate(W/2, 0, 0);
  add(g, cabG, paint);
  // lower two-tone skirt + belt line
  for (const sx of [-1, 1]){
    add(g, box(.02, .3, 1.14), paintD, [sx*(W/2 + .065), .62 + Y, -.9]);
    add(g, box(.025, .035, 1.16), chrome, [sx*(W/2 + .068), .8 + Y, -.9]);
  }
  // windscreen: interior + glass + rubber seal + wiper
  const ang = Math.atan2(.19, .72), wsLen = Math.hypot(.19, .72);
  const ws = new THREE.Group(); ws.position.set(0, 1.34 + Y, -1.47); ws.rotation.x = ang; g.add(ws);
  add(ws, new THREE.PlaneGeometry(W - .1, wsLen - .1), interior, [0, 0, -.052], [0, Math.PI, 0]);
  add(ws, new THREE.PlaneGeometry(W - .1, wsLen - .1), glassM, [0, 0, -.062], [0, Math.PI, 0]).castShadow = false;
  for (const [w, h, x, y] of [[W - .06, .03, 0, (wsLen - .07)/2], [W - .06, .03, 0, -(wsLen - .07)/2], [.03, wsLen - .06, (W - .07)/2, 0], [.03, wsLen - .06, -(W - .07)/2, 0]]) add(ws, box(w, h, .02), rubber, [x, y, -.06]);
  add(ws, box(.5, .018, .015), dark, [.12, -.2, -.075], [0, 0, .5]);
  // side windows (door glass) + door seam + handle
  const sw = new THREE.Shape(); sw.moveTo(-1.35, 1.06 + Y); sw.lineTo(-.56, 1.06 + Y); sw.lineTo(-.56, 1.6 + Y); sw.lineTo(-1.2, 1.6 + Y); sw.lineTo(-1.35, 1.06 + Y);
  for (const sx of [-1, 1]){
    const gi = new THREE.ShapeGeometry(sw); gi.rotateY(-Math.PI/2);
    add(g, gi, interior, [sx*(W/2 + .062), 0, 0]).material.side = THREE.DoubleSide;
    const gg = new THREE.ShapeGeometry(sw); gg.rotateY(-Math.PI/2);
    const gl = add(g, gg, glassM, [sx*(W/2 + .07), 0, 0]); gl.castShadow = false; glassM.side = THREE.DoubleSide;
    add(g, box(.015, 1.22, .015), paintD, [sx*(W/2 + .066), 1.05 + Y, -.5]);
    add(g, box(.03, .03, .12), chrome, [sx*(W/2 + .08), .98 + Y, -.66]);
  }
  // roof: rounded slab with overhang + gutter
  const rr = new THREE.Shape(), RL = 1.42, RW = 1.46, rc = .14;
  rr.moveTo(-RW/2 + rc, -RL/2); rr.lineTo(RW/2 - rc, -RL/2); rr.quadraticCurveTo(RW/2, -RL/2, RW/2, -RL/2 + rc); rr.lineTo(RW/2, RL/2 - rc); rr.quadraticCurveTo(RW/2, RL/2, RW/2 - rc, RL/2);
  rr.lineTo(-RW/2 + rc, RL/2); rr.quadraticCurveTo(-RW/2, RL/2, -RW/2, RL/2 - rc); rr.lineTo(-RW/2, -RL/2 + rc); rr.quadraticCurveTo(-RW/2, -RL/2, -RW/2 + rc, -RL/2);
  const roofG = new THREE.ExtrudeGeometry(rr, { depth: .05, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 }); roofG.rotateX(Math.PI/2);
  add(g, roofG, cream, [0, 1.92 + Y, -.92]);
  add(g, box(RW - .1, .04, RL - .1), M("#D6CBB1", .7), [0, 1.86 + Y, -.92]);
  // nose: headlight pod, indicators, horn grille, plate
  const pod = add(g, cyl(.13, .14, .12, 20), paint, [0, .82 + Y, -1.6], [Math.PI/2, 0, 0]);
  add(g, new THREE.TorusGeometry(.12, .018, 8, 24), chrome, [0, .82 + Y, -1.665]);
  add(g, new THREE.CircleGeometry(.11, 24), glow("#FFF1CF", .9), [0, .82 + Y, -1.668], [0, Math.PI, 0]);
  for (const sx of [-1, 1]) add(g, box(.09, .05, .04), glow("#F2A03A", .35), [sx*.52, .64 + Y, -1.55]);
  for (let i = 0; i < 4; i++) add(g, box(.36, .012, .02), dark, [0, .5 + Y + i*.03, -1.56]);
  add(g, box(.32, .09, .015), M("#E8C547", .6), [0, .32 + Y, -1.56]);
  // front wheel, fork, mudguard
  const fw = buildWheel(.32, .2, { blocks: 20 }); fw.position.set(0, .32, -1.2); g.add(fw);
  const guard = new THREE.CylinderGeometry(.4, .4, .26, 18, 1, true, -Math.PI*.15, Math.PI*.95); guard.rotateZ(Math.PI/2);
  add(g, guard, paint, [0, .32, -1.2]).material.side = THREE.DoubleSide;
  for (const sx of [-1, 1]) add(g, cyl(.025, .025, .5, 8), chrome, [sx*.14, .55, -1.12], [-.25, 0, 0]);
  // mirrors on stalks + bell charm
  for (const sx of [-1, 1]){
    const a = new THREE.Vector3(sx*.62, 1.02 + Y, -1.42), b = new THREE.Vector3(sx*.86, 1.26 + Y, -1.4);
    add(g, tube(new THREE.QuadraticBezierCurve3(a, new THREE.Vector3(sx*.84, 1.04 + Y, -1.44), b), .012, 12, 6), dark);
    const mh = add(g, new THREE.SphereGeometry(.1, 14, 10), dark, [sx*.88, 1.3 + Y, -1.4], null, [.75, 1.1, .28]);
    add(g, new THREE.CircleGeometry(.08, 18), chrome, [sx*.88, 1.3 + Y, -1.37], null, [1, 1.35, 1]);
    if (sx === 1){
      add(g, tube(new THREE.LineCurve3(new THREE.Vector3(.86, 1.2 + Y, -1.4), new THREE.Vector3(.86, 1.05 + Y, -1.4)), .004, 2, 4), M("#B23B2E", .9));
      const bell = new THREE.LatheGeometry([[0,.06],[.025,.055],[.035,.02],[.045,0],[0,0]].map(p => new THREE.Vector2(p[0], p[1])), 12);
      add(g, bell, M("#C8A24A", .3, .9), [.86, .98 + Y, -1.4]);
    }
  }
  // chassis, axle, springs, exhaust
  for (const sx of [-1, 1]) add(g, box(.08, .1, 2.1), dark, [sx*.42, .56, .55]);
  add(g, cyl(.045, .045, 1.18, 10), dark, [0, .32, 1.15], [0, 0, Math.PI/2]);
  add(g, new THREE.SphereGeometry(.12, 12, 10), dark, [0, .32, 1.15], null, [1, .8, 1.1]);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) add(g, box(.06, .02, .7 - i*.15), M("#3B3934", .6, .5), [sx*.42, .42 + i*.025, 1.15]);
  add(g, tube(new THREE.CatmullRomCurve3([new THREE.Vector3(-.3, .45, .2), new THREE.Vector3(-.5, .4, 1.2), new THREE.Vector3(-.55, .42, 1.7)]), .03, 16, 8), M("#6E6A63", .4, .7));
  // bed: floor planks, posts, slatted gates, headboard, ladder rack
  const BY = .8, BZ0 = -.27, BZ1 = 1.66, BL = BZ1 - BZ0, BW = 1.44, rnd = rng(7);
  const woods = ["#8A6A45", "#94724B", "#7F6040", "#9C7A50"], wood = () => M(woods[Math.floor(rnd()*4)], .85), post = M("#6B5034", .85);
  add(g, box(BW + .04, .06, BL), dark, [0, BY - .06, (BZ0 + BZ1)/2]);
  for (let i = 0; i < 7; i++){ const pw = BW/7 - .008; add(g, box(pw, .04, BL - .02), wood(), [-BW/2 + pw/2 + .004 + i*(BW/7), BY - .01, (BZ0 + BZ1)/2]); }
  const gateH = .46, slat = (len, x, y, z, rotY) => add(g, box(len, .075, .035), wood(), [x, y, z], [0, rotY, 0]);
  for (const sx of [-1, 1]){
    for (const z of [BZ0 + .03, .7, BZ1 - .03]) add(g, box(.06, gateH + .08, .06), post, [sx*(BW/2 - .01), BY + gateH/2, z]);
    for (const y of [BY + .1, BY + .24, BY + .38]) slat(BL - .02, sx*(BW/2 + .015), y, (BZ0 + BZ1)/2, Math.PI/2);
    add(g, new THREE.TorusGeometry(.03, .008, 6, 12), chrome, [sx*(BW/2 + .04), BY + .4, .2], [0, Math.PI/2, 0]);
    add(g, new THREE.TorusGeometry(.03, .008, 6, 12), chrome, [sx*(BW/2 + .04), BY + .4, 1.2], [0, Math.PI/2, 0]);
  }
  for (const y of [BY + .1, BY + .24, BY + .38]) slat(BW, 0, y, BZ1 + .02, 0);
  for (const sx of [-1, 1]) add(g, tube(catenary(new THREE.Vector3(sx*.6, BY + .44, BZ1 + .03), new THREE.Vector3(sx*.72, BY + .3, BZ1 - .1), .05), .007, 8, 4), chrome);
  for (const sx of [-1, 1]) add(g, box(.07, 1.12, .07), post, [sx*(BW/2 - .02), BY + .56, BZ0 - .02]);
  for (const y of [BY + .12, BY + .28, BY + .44, BY + .6, BY + .78]) slat(BW - .04, 0, y, BZ0 - .02, 0);
  for (const sx of [-1, 1]){
    add(g, box(.045, .045, BL + .05), M("#5E4630", .8), [sx*(BW/2 - .02), BY + 1.1, (BZ0 + BZ1)/2]);
    add(g, box(.05, .62, .05), post, [sx*(BW/2 - .02), BY + .79, BZ1 - .02]);
  }
  for (const z of [.35, 1.0]) add(g, box(BW - .04, .035, .045), M("#5E4630", .8), [0, BY + 1.1, z]);
  // rear: wheels, lights, flaps, plate
  for (const sx of [-1, 1]){
    const rw = buildWheel(.32, .2, { blocks: 20 }); rw.position.set(sx*.66, .32, 1.15); g.add(rw);
    const fender = new THREE.CylinderGeometry(.38, .38, .24, 16, 1, true, -Math.PI*.05, Math.PI*.6); fender.rotateZ(Math.PI/2);
    add(g, fender, paintD, [sx*.66, .34, 1.15]).material.side = THREE.DoubleSide;
    add(g, box(.12, .1, .03), glow("#C2321F", .55), [sx*.6, BY - .02, BZ1 + .04]);
    add(g, box(.05, .05, .02), glow("#F2A03A", .25), [sx*.6, BY + .07, BZ1 + .04]);
    add(g, box(.22, .26, .015), rubber, [sx*.66, .26, 1.5], [-.15, 0, 0]);
  }
  add(g, box(.3, .09, .015), M("#E8C547", .6), [0, BY - .05, BZ1 + .045]);
  // cargo
  if (opts.cargo !== false){
    const crates = [[-.36, BY + .2, .05, .62, .4, .5, 2], [.34, BY + .2, .08, .6, .4, .55, 3], [-.33, BY + .22, .78, .62, .44, .58, 4], [.33, BY + .2, .8, .56, .4, .52, 5], [0, BY + .62, .45, .7, .4, .6, 6], [.02, BY + .2, 1.38, .9, .4, .44, 8]];
    for (const [x, y, z, w, h, d, sd] of crates){ const c = buildCrate(w, h, d, sd); c.position.set(x, y, z); c.rotation.y = (sd % 3 - 1)*.06; g.add(c); }
    const rope = M("#D9C9A0", .95);
    for (const z of [.15, .9]) add(g, tube(new THREE.CatmullRomCurve3([new THREE.Vector3(-.76, BY + .4, z), new THREE.Vector3(-.4, BY + .86, z + .1), new THREE.Vector3(.4, BY + .86, z + .1), new THREE.Vector3(.76, BY + .4, z)]), .012, 20, 5), rope);
  }
  return g;
}

/* ============================================================
   ASSET: ROVER (refined). Forward = -Z.
============================================================ */
function buildRover(){
  const g = new THREE.Group(), W = 1.9;
  const paint = M("#C7AB78", .48, .15), trim = M("#2A2E31", .8, .1), chrome = M("#C9CCCB", .25, .9), rubber = M("#232220", .95);
  const glassM = new THREE.MeshStandardMaterial({ color: lin("#8FB0BC"), roughness: .05, metalness: .25, transparent: true, opacity: .5, side: THREE.DoubleSide });
  const interior = M("#1C2427", .9);
  const s = new THREE.Shape();
  s.moveTo(2.05, .62); s.lineTo(-2.0, .62); s.quadraticCurveTo(-2.12, .62, -2.12, .78); s.lineTo(-2.1, 1.12); s.quadraticCurveTo(-2.06, 1.24, -1.9, 1.25);
  s.lineTo(-.95, 1.3); s.lineTo(-.7, 1.98); s.quadraticCurveTo(-.66, 2.04, -.56, 2.04); s.lineTo(1.9, 2.04); s.quadraticCurveTo(2.02, 2.04, 2.04, 1.92); s.lineTo(2.05, .62);
  const body = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .07, bevelSize: .07, bevelSegments: 4, curveSegments: 10 });
  body.rotateY(-Math.PI/2); body.translate(W/2, 0, 0);
  add(g, body, paint);
  add(g, box(W + .18, .2, 4.3), trim, [0, .66, 0]);
  // glass: windscreen + side + rear
  const ang = Math.atan2(.25, .68), wl = Math.hypot(.25, .68);
  const ws = new THREE.Group(); ws.position.set(0, 1.64, -.84); ws.rotation.x = ang; g.add(ws);
  add(ws, new THREE.PlaneGeometry(W - .2, wl - .12), interior, [0, 0, -.075], [0, Math.PI, 0]);
  add(ws, new THREE.PlaneGeometry(W - .2, wl - .12), glassM, [0, 0, -.085], [0, Math.PI, 0]).castShadow = false;
  for (const sx of [-1, 1]) for (const [z0, z1] of [[-.72, .3], [.42, 1.85]]){
    const sh = new THREE.Shape(); sh.moveTo(z0, 1.4); sh.lineTo(z1, 1.4); sh.lineTo(z1, 1.92); sh.lineTo(z0 + (z0 < 0 ? .16 : 0), 1.92); sh.lineTo(z0, 1.4);
    const a = new THREE.ShapeGeometry(sh); a.rotateY(-Math.PI/2); add(g, a, interior, [sx*(W/2 + .072), 0, 0]).material.side = THREE.DoubleSide;
    const b = new THREE.ShapeGeometry(sh); b.rotateY(-Math.PI/2); add(g, b, glassM, [sx*(W/2 + .08), 0, 0]).castShadow = false;
  }
  add(g, new THREE.PlaneGeometry(1.5, .5), interior, [0, 1.66, 2.125]);
  add(g, new THREE.PlaneGeometry(1.5, .5), glassM, [0, 1.66, 2.13]).castShadow = false;
  // door seams, handles, steps
  for (const sx of [-1, 1]){
    for (const z of [-.75, .36, 1.5]) add(g, box(.012, .62, .012), trim, [sx*(W/2 + .072), 1.0, z]);
    add(g, box(.03, .03, .16), chrome, [sx*(W/2 + .085), 1.2, .15]);
    add(g, box(.18, .05, 1.4), trim, [sx*(W/2 + .1), .55, .15]);
  }
  // flares
  for (const sx of [-1, 1]) for (const z of [-1.38, 1.38]){
    const f = new THREE.CylinderGeometry(.62, .62, .24, 16, 1, true, -Math.PI*.12, Math.PI*.82); f.rotateZ(Math.PI/2);
    add(g, f, trim, [sx*(W/2 + .02), .5, z]).material.side = THREE.DoubleSide;
  }
  // front: grille, lamps, bull bar, light bar
  for (let i = 0; i < 6; i++) add(g, box(.05, .32, .02), trim, [-.5 + i*.2, 1.0, -2.2]);
  for (const sx of [-1, 1]){
    add(g, cyl(.11, .11, .06, 18), trim, [sx*.72, 1.02, -2.19], [Math.PI/2, 0, 0]);
    add(g, new THREE.CircleGeometry(.085, 18), glow("#FFF1CF", .9), [sx*.72, 1.02, -2.225], [0, Math.PI, 0]);
    add(g, box(.12, .06, .03), glow("#F2A03A", .3), [sx*.85, .8, -2.2]);
  }
  add(g, tube(new THREE.CatmullRomCurve3([new THREE.Vector3(-.85, .55, -2.3), new THREE.Vector3(-.75, .95, -2.38), new THREE.Vector3(.75, .95, -2.38), new THREE.Vector3(.85, .55, -2.3)]), .04, 24, 8), trim);
  add(g, box(1.2, .1, .14), trim, [0, 2.13, -.62]);
  for (let i = 0; i < 4; i++) add(g, box(.2, .06, .02), glow("#FFF6E0", .5), [-.45 + i*.3, 2.13, -.7]);
  // snorkel
  add(g, tube(new THREE.CatmullRomCurve3([new THREE.Vector3(.98, 1.05, -1.5), new THREE.Vector3(1.0, 1.4, -1.0), new THREE.Vector3(1.0, 2.1, -.82), new THREE.Vector3(.95, 2.3, -.8)]), .055, 20, 8), trim);
  // roof rack: rails, crossbars, jerry cans, rolled tarp
  for (const sx of [-1, 1]) add(g, box(.05, .05, 2.5), M("#8E908C", .35, .6), [sx*.82, 2.2, .65]);
  for (let i = 0; i < 4; i++) add(g, box(1.7, .04, .05), M("#8E908C", .35, .6), [0, 2.2, -.5 + i*.75]);
  for (const x of [-.45, .45]) add(g, box(.3, .42, .5), M("#5F6E52", .6), [x, 2.44, 1.4]);
  add(g, cyl(.16, .16, 1.3, 14), M("#A88E5E", .9), [0, 2.38, .3], [0, 0, Math.PI/2]);
  for (const x of [-.4, .4]) add(g, new THREE.TorusGeometry(.165, .015, 6, 18), M("#5A4632", .8), [x, 2.38, .3], [0, Math.PI/2, 0]);
  // rear: ladder, spare, lights
  for (const sx of [-1, 1]) add(g, box(.035, 1.3, .035), M("#8E908C", .35, .6), [sx*.55 + .5, 1.45, 2.2]);
  for (let i = 0; i < 5; i++) add(g, box(.33, .03, .03), M("#8E908C", .35, .6), [.5, .95 + i*.25, 2.2]);
  const spare = buildWheel(.42, .28); spare.rotation.y = Math.PI/2; spare.position.set(-.35, 1.25, 2.28); g.add(spare);
  add(g, cyl(.43, .43, .1, 24), M("#6B6F5A", .9), [-.35, 1.25, 2.43], [Math.PI/2, 0, 0]);
  for (const sx of [-1, 1]) add(g, box(.12, .3, .04), glow("#C2321F", .55), [sx*.86, 1.08, 2.13]);
  add(g, box(2.0, .2, .18), trim, [0, .72, 2.18]);
  for (const sx of [-1, 1]) for (const z of [-1.38, 1.38]){ const w = buildWheel(.46, .38); w.position.set(sx*.98, .46, z); g.add(w); }
  for (const sx of [-1, 1]){
    add(g, tube(new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx*.9, 1.38, -.72), new THREE.Vector3(sx*1.1, 1.38, -.75), new THREE.Vector3(sx*1.14, 1.5, -.72)), .014, 10, 6), trim);
    add(g, new THREE.SphereGeometry(.11, 12, 10), trim, [sx*1.15, 1.55, -.72], null, [.4, 1, .8]);
  }
  return g;
}

/* ============================================================
   ASSET: SKY MULE (Mule + Sky Kit: fold-out wings, pusher prop, tail)
============================================================ */
function buildSkyMule(){
  const g = buildMule({ cargo: false }), canvas = M("#EFE6D3", .85, 0, { side: THREE.DoubleSide }), strut = M("#6B5034", .8), Y = .2;
  const wing = new THREE.Shape(); wing.moveTo(0, 0); wing.lineTo(3.4, .18); wing.quadraticCurveTo(3.6, .2, 3.55, .5); wing.lineTo(.0, .95); wing.lineTo(0, 0);
  for (const sx of [-1, 1]){
    const wg = new THREE.ExtrudeGeometry(wing, { depth: .05, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 1 });
    wg.rotateX(Math.PI/2); if (sx < 0) wg.scale(-1, 1, 1);
    add(g, wg, canvas, [sx*.72, 2.02 + Y, -1.3]);
    for (let k = 1; k < 4; k++) add(g, box(.03, .03, .9 - k*.12), strut, [sx*(.72 + k*.85), 2.05 + Y, -.85 + k*.02]);
    add(g, tube(new THREE.LineCurve3(new THREE.Vector3(sx*.7, 1.0 + Y, -1.0), new THREE.Vector3(sx*2.3, 2.0 + Y, -.9)), .02, 4, 6), strut);
    add(g, box(.5, .03, .3), M("#C9473A", .7), [sx*3.95, 2.06 + Y, -.95]);
  }
  add(g, box(.08, .9, .7), canvas, [0, 1.65, 1.5]);
  add(g, box(1.6, .05, .5), canvas, [0, 1.25, 1.62]);
  const hub = new THREE.Group(); hub.position.set(0, 1.25, 1.95); g.add(hub);
  add(hub, new THREE.ConeGeometry(.09, .2, 12), M("#C9CCCB", .3, .8), null, [Math.PI/2, 0, 0]);
  for (let k = 0; k < 3; k++){ const bl = add(hub, box(.09, .75, .02), M("#7A5A3E", .6), [0, 0, 0]); bl.rotation.z = k*2.094; bl.geometry.translate(0, .38, 0); }
  chainUpdate(g, t => { hub.rotation.z = t*28; });
  return g;
}

/* ============================================================
   ASSET: TORTOISE (tiny camper van, pop-up tent, the "home" vehicle) — detailed
============================================================ */
function buildTortoise(){
  const g = new THREE.Group(), W = 1.6, sage = M("#8FA68A", .5, .1), sageD = M("#6F8A6C", .55, .1), cream = M("#EFE6D3", .55), trim = M("#2A2E31", .8);
  const chrome = M("#D2D4D0", .22, .9), brass = M("#C9A04A", .4, .5), wood = M("#7A5A3E", .85), canvasM = M("#E8743B", .9, 0, { side: THREE.DoubleSide });
  const s = new THREE.Shape();
  s.moveTo(1.55, .55); s.lineTo(-1.45, .55); s.quadraticCurveTo(-1.75, .58, -1.75, .95); s.quadraticCurveTo(-1.72, 1.5, -1.2, 1.85);
  s.quadraticCurveTo(0, 2.05, 1.3, 1.85); s.quadraticCurveTo(1.6, 1.6, 1.58, .95); s.lineTo(1.55, .55);
  const bg = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 5, curveSegments: 16 });
  bg.rotateY(-Math.PI/2); bg.translate(W/2, 0, 0); add(g, bg, cream);
  add(g, box(W + .26, .42, 3.4), sage, [0, .78, -.05]);
  add(g, box(W + .28, .05, 3.42), brass, [0, 1.0, -.05]);
  add(g, box(W + .27, .03, 3.41), sageD, [0, .6, -.05]);
  // portholes: warm interior + curtains + glass + brass rims
  const glassM = new THREE.MeshStandardMaterial({ color: lin("#9CC2C8"), roughness: .05, metalness: .25, transparent: true, opacity: .35 });
  const warm = glow("#FFD9A0", .5);
  for (const sx of [-1, 1]) for (const z of [-.9, .1, .95]){
    if (sx === 1 && z === .1) continue;
    const px = sx*(W/2 + .118);
    add(g, new THREE.CircleGeometry(.23, 24), warm, [px, 1.42, z], [0, sx*Math.PI/2, 0]);
    add(g, new THREE.CircleGeometry(.23, 24, -.5, 1.0), M("#C9473A", .9), [px + sx*.002, 1.42, z], [0, sx*Math.PI/2, 0]);
    add(g, new THREE.CircleGeometry(.23, 24, Math.PI - .5, 1.0), M("#C9473A", .9), [px + sx*.002, 1.42, z], [0, sx*Math.PI/2, 0]);
    add(g, new THREE.CircleGeometry(.24, 24), glassM, [px + sx*.006, 1.42, z], [0, sx*Math.PI/2, 0]).castShadow = false;
    add(g, new THREE.TorusGeometry(.24, .035, 8, 24), brass, [px + sx*.006, 1.42, z], [0, sx*Math.PI/2, 0]);
  }
  // door (right side) with window, handle, step
  add(g, box(.03, 1.05, .78), sageD, [W/2 + .125, 1.15, .1]);
  add(g, new THREE.CircleGeometry(.17, 20), warm, [W/2 + .143, 1.48, .1], [0, Math.PI/2, 0]);
  add(g, new THREE.TorusGeometry(.17, .03, 8, 20), brass, [W/2 + .148, 1.48, .1], [0, Math.PI/2, 0]);
  add(g, box(.05, .03, .14), chrome, [W/2 + .16, 1.12, -.18]);
  add(g, box(.42, .05, .7), M("#8E908C", .4, .6), [W/2 + .32, .42, .1]);
  // windscreen + wiper + mirrors
  const ws = new THREE.Group(); ws.position.set(0, 1.45, -1.83); ws.rotation.x = -.5; g.add(ws);
  add(ws, new THREE.PlaneGeometry(W - .2, .5), M("#24343A", .1, .3), null, [0, Math.PI, 0]);
  add(ws, new THREE.PlaneGeometry(W - .2, .5), glassM, [0, 0, -.006], [0, Math.PI, 0]).castShadow = false;
  add(ws, box(.55, .015, .015), trim, [.15, -.18, -.02], [0, 0, .4]);
  for (const sx of [-1, 1]){ add(g, tube(new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx*.8, 1.25, -1.55), new THREE.Vector3(sx*1.02, 1.25, -1.58), new THREE.Vector3(sx*1.04, 1.38, -1.55)), .012, 8, 5), chrome); add(g, new THREE.SphereGeometry(.08, 12, 8), chrome, [sx*1.05, 1.44, -1.55], null, [.4, 1, .8]); }
  // front: round headlights with glow, grille, bumper, badge, plate, indicators
  for (const sx of [-1, 1]){
    add(g, cyl(.14, .14, .1, 20), cream, [sx*.55, .98, -1.8], [Math.PI/2, 0, 0]);
    add(g, new THREE.TorusGeometry(.13, .02, 8, 20), chrome, [sx*.55, .98, -1.855]);
    add(g, new THREE.CircleGeometry(.11, 20), glow("#FFF1CF", 1.1), [sx*.55, .98, -1.858], [0, Math.PI, 0]);
    halo(g, [sx*.55, .98, -1.9], "#FFE6B0", .9, .6);
    add(g, box(.1, .05, .04), glow("#F2A03A", .4), [sx*.72, .74, -1.82]);
  }
  for (let k = 0; k < 7; k++) add(g, box(.03, .22, .02), chrome, [-.18 + k*.06, .74, -1.86]);
  add(g, new THREE.TorusGeometry(.06, .012, 6, 16), brass, [0, 1.2, -1.83]);
  add(g, cyl(.06, .06, .01, 16), M("#8FA68A", .5), [0, 1.2, -1.83], [Math.PI/2, 0, 0]);
  add(g, box(1.4, .12, .14), chrome, [0, .62, -1.92]); add(g, box(.3, .08, .015), M("#E8C547", .6), [0, .5, -1.9]);
  // rear: bumper, tail lights, ladder to the tent, spare wheel with cover, bike rack
  add(g, box(1.4, .12, .14), chrome, [0, .62, 1.92]);
  for (const sx of [-1, 1]){ add(g, cyl(.07, .07, .05, 14), glow("#C2321F", .7), [sx*.62, .95, 1.78], [Math.PI/2, 0, 0]); halo(g, [sx*.62, .95, 1.84], "#FF6A50", .35); }
  for (const sx of [-1, 1]) add(g, box(.035, 1.2, .035), chrome, [.45 + sx*.17, 1.45, 1.86]);
  for (let k = 0; k < 5; k++) add(g, box(.36, .025, .03), chrome, [.45, .95 + k*.24, 1.86]);
  const spare = buildWheel(.32, .2, { rim: "#EFE6D3" }); spare.rotation.y = Math.PI/2; spare.position.set(-.35, 1.15, 1.92); g.add(spare);
  add(g, cyl(.33, .33, .1, 22), sage, [-.35, 1.15, 2.03], [Math.PI/2, 0, 0]);
  add(g, new THREE.TorusGeometry(.2, .015, 6, 18), brass, [-.35, 1.15, 2.085]);
  // roof: rack rails + pop-up tent with windows and guy lines
  for (const sx of [-1, 1]) add(g, box(.04, .04, 2.6), chrome, [sx*.7, 1.98, -.05]);
  const tent = new THREE.Shape(); tent.moveTo(-1.1, 0); tent.lineTo(1.1, 0); tent.lineTo(-.9, .9); tent.lineTo(-1.1, 0);
  const tg = new THREE.ExtrudeGeometry(tent, { depth: W - .1, bevelEnabled: false }); tg.rotateY(-Math.PI/2); tg.translate((W - .1)/2, 0, 0);
  add(g, tg, canvasM, [0, 2.0, .1]);
  add(g, box(W - .05, .1, 2.25), cream, [0, 2.0, .1]);
  add(g, new THREE.CircleGeometry(.14, 16), glow("#FFD9A0", .6), [W/2 - .02, 2.28, -.6], [0, Math.PI/2, 0]);
  add(g, new THREE.CircleGeometry(.14, 16), glow("#FFD9A0", .6), [-(W/2 - .02), 2.28, -.6], [0, -Math.PI/2, 0]);
  // awning: striped canvas, poles to the ground, rug, string lights, hanging lantern
  const aw = W/2 + .14;
  for (let k = 0; k < 7; k++) add(g, box(1.25, .02, .3), M(k % 2 ? "#F2EFE6" : "#C9473A", .9, 0, { side: THREE.DoubleSide }), [aw + .6, 1.86 - .015*k, -.95 + k*.3], [0, 0, -.18]);
  for (let k = 0; k < 8; k++) add(g, new THREE.ConeGeometry(.05, .12, 3), M(k % 2 ? "#F2EFE6" : "#C9473A", .9), [aw + 1.22, 1.68, -.98 + k*.28], [0, 0, Math.PI]);
  for (const z of [-1.0, 1.05]) add(g, cyl(.02, .02, 1.7, 6), chrome, [aw + 1.22, .86, z]);
  add(g, box(1.4, .01, 1.9), M("#B5843A", .95), [aw + .62, .01, .03]);
  for (let k = 0; k < 6; k++) add(g, box(1.4, .012, .06), M(k % 2 ? "#8C4A3A" : "#E6D7B4", .95), [aw + .62, .012, -.7 + k*.28]);
  const lights = catenary(new THREE.Vector3(aw + 1.2, 1.7, -1.0), new THREE.Vector3(aw + 1.2, 1.7, 1.05), .18);
  add(g, tube(lights, .006, 20, 4), M("#3A342C", .9));
  for (let i = 1; i <= 8; i++){ const p = lights.getPoint(i/9); add(g, new THREE.SphereGeometry(.05, 10, 8), glow("#FFC874", 1.2), [p.x, p.y - .06, p.z]).castShadow = false; halo(g, [p.x, p.y - .06, p.z], "#FFC874", .38); }
  add(g, cyl(.004, .004, .3, 4), M("#3A342C", .9), [aw + .9, 1.6, .5]);
  add(g, box(.16, .22, .16), M("#2E2B27", .5, .6), [aw + .9, 1.36, .5]);
  add(g, box(.12, .16, .12), glow("#FFC874", 1.6), [aw + .9, 1.36, .5]);
  halo(g, [aw + .9, 1.36, .5], "#FFC874", 1.1, .9);
  // two camp chairs + a little table with a pot of tea
  for (const z of [-.45, .55]){
    const c = new THREE.Group(); c.position.set(aw + .75, 0, z); c.rotation.y = z < 0 ? .5 : -.4; g.add(c);
    for (const sx of [-1, 1]) add(c, cyl(.012, .012, .62, 5), M("#4A4740", .5, .6), [sx*.2, .3, 0], [sx*.35, 0, 0]);
    add(c, box(.42, .03, .38), M(z < 0 ? "#3E6FA8" : "#4F8A54", .9), [0, .42, 0]);
    add(c, box(.42, .4, .03), M(z < 0 ? "#3E6FA8" : "#4F8A54", .9), [0, .64, .19], [-.25, 0, 0]);
  }
  add(g, cyl(.24, .24, .025, 16), wood, [aw + .95, .5, .05]); add(g, cyl(.015, .015, .5, 5), wood, [aw + .95, .25, .05]);
  add(g, new THREE.SphereGeometry(.07, 12, 10), M("#3E6FA8", .4), [aw + .95, .58, .05], null, [1, .8, 1]);
  for (const dx of [.1, -.08]) add(g, cyl(.03, .025, .06, 10), M("#F2EFE6", .4), [aw + .95 + dx, .55, .12]);
  // window box (left) with flowers
  add(g, box(.12, .14, .6), wood, [-(W/2 + .18), 1.12, -.9]);
  for (let k = 0; k < 8; k++) add(g, new THREE.SphereGeometry(.05, 8, 6), M(["#D8445A", "#F2C230", "#F4F0E6", "#E58AAE"][k % 4], .6), [-(W/2 + .2), 1.24, -1.15 + k*.07]);
  // wheels with cream hubs, mud flaps
  for (const sx of [-1, 1]) for (const z of [-1.15, 1.05]){ const w = buildWheel(.36, .26, { rim: "#EFE6D3", hub: "#C9A04A" }); w.position.set(sx*.82, .36, z); g.add(w); }
  for (const sx of [-1, 1]) add(g, box(.24, .22, .02), trim, [sx*.82, .26, 1.45], [-.1, 0, 0]);
  return g;
}

/* ============================================================
   ASSET: THE LOAF (vintage village bus; replaces the gyrocopter)
============================================================ */
function buildBus(){
  const g = new THREE.Group(), W = 2.3, L = 7.4;
  const yellow = M("#E1B640", .45, .12), cream = M("#F1E9D6", .5), red = M("#B0473A", .6), trim = M("#2A2E31", .8), chrome = M("#D2D4D0", .22, .9);
  const s = new THREE.Shape(), F = -L/2, B = L/2;
  s.moveTo(B, .62); s.lineTo(F + .25, .62); s.quadraticCurveTo(F, .64, F, 1.0); s.lineTo(F + .02, 1.55);
  s.quadraticCurveTo(F + .05, 2.6, F + .7, 2.9); s.quadraticCurveTo(0, 3.08, B - .7, 2.92); s.quadraticCurveTo(B, 2.75, B - .02, 1.9); s.lineTo(B, .62);
  const bg = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .1, bevelSize: .1, bevelSegments: 5, curveSegments: 18 });
  bg.rotateY(-Math.PI/2); bg.translate(W/2, 0, 0);
  add(g, paintFaces(bg, c => c.y > 1.52 ? C("#F1E9D6") : C("#E1B640")), VC(.5, { flatShading: false }));
  for (const sx of [-1, 1]){
    add(g, box(.025, .05, L - .2), chrome, [sx*(W/2 + .105), 1.52, 0]);
    add(g, box(.022, .03, L - .3), red, [sx*(W/2 + .1), 1.42, 0]);
  }
  add(g, box(W + .22, .14, L - .1), trim, [0, .66, 0]);
  // side windows: warm interior, seats + passenger silhouettes, glass, frames
  const glassM = new THREE.MeshStandardMaterial({ color: lin("#9CC2C8"), roughness: .05, metalness: .25, transparent: true, opacity: .32 });
  const warm = glow("#FFDCA8", .45), seat = M("#8C4A3A", .9), skin = M("#C99A74", .8);
  const rnd = rng(66);
  for (const sx of [-1, 1]){
    for (let k = 0; k < 6; k++){
      const z = -2.15 + k*.95, px = sx*(W/2 + .102);
      if (sx === 1 && k === 0) continue;
      add(g, new THREE.PlaneGeometry(.82, .78), warm, [px, 2.05, z], [0, sx*Math.PI/2, 0]);
      add(g, box(.04, .32, .5), seat, [sx*(W/2 - .2), 1.82, z + .05]);
      if (rnd() > .35){ add(g, new THREE.SphereGeometry(.13, 12, 10), skin, [sx*(W/2 - .25), 2.12, z]); add(g, cyl(.16, .2, .3, 10), M(["#3E6FA8", "#4F8A54", "#B0473A", "#5F7A8C"][k % 4], .9), [sx*(W/2 - .25), 1.88, z]); if (rnd() > .5) add(g, cyl(.18, .18, .03, 14), M("#8C6E4A", .85), [sx*(W/2 - .25), 2.24, z]); }
      add(g, new THREE.PlaneGeometry(.84, .8), glassM, [sx*(W/2 + .11), 2.05, z], [0, sx*Math.PI/2, 0]).castShadow = false;
      add(g, box(.03, .9, .05), trim, [sx*(W/2 + .11), 2.05, z + .47]);
    }
    add(g, box(.03, .06, 5.9), trim, [sx*(W/2 + .11), 2.48, .25]);
    add(g, box(.03, .06, 5.9), trim, [sx*(W/2 + .11), 1.63, .25]);
  }
  // folding door (right front)
  for (const dz of [-.2, .2]){ add(g, box(.03, 1.6, .38), yellow, [W/2 + .11, 1.45, -2.65 + dz]); add(g, new THREE.PlaneGeometry(.3, .9), glassM, [W/2 + .13, 1.75, -2.65 + dz], [0, Math.PI/2, 0]); }
  add(g, box(.5, .1, .9), M("#8E908C", .4, .6), [W/2 + .22, .5, -2.65]);
  // windscreen (split), destination board glowing, wipers
  for (const sx of [-1, 1]){
    const ws = new THREE.Group(); ws.position.set(sx*.56, 2.08, F - .06); ws.rotation.x = .08; g.add(ws);
    add(ws, new THREE.PlaneGeometry(1.0, .82), M("#1E2A2C", .9), null, [0, Math.PI, 0]);
    add(ws, new THREE.PlaneGeometry(1.0, .82), glassM, [0, 0, -.01], [0, Math.PI, 0]).castShadow = false;
    add(ws, box(.6, .015, .015), trim, [sx*.05, -.33, -.03], [0, 0, sx*.5]);
  }
  add(g, box(.06, .9, .05), trim, [0, 2.08, F - .07]);
  add(g, box(1.5, .26, .06), trim, [0, 2.68, F + .05]);
  add(g, new THREE.PlaneGeometry(1.4, .2), glow("#FFE6A8", 1.0), [0, 2.68, F + .015], [0, Math.PI, 0]);
  halo(g, [0, 2.68, F - .1], "#FFE6A8", 1.4);
  // front: round headlights, chrome grille, bumper, fog lamps, indicators, badge
  for (const sx of [-1, 1]){
    add(g, cyl(.19, .19, .12, 22), cream, [sx*.82, 1.08, F - .02], [Math.PI/2, 0, 0]);
    add(g, new THREE.TorusGeometry(.18, .025, 8, 22), chrome, [sx*.82, 1.08, F - .085]);
    add(g, new THREE.CircleGeometry(.15, 22), glow("#FFF1CF", 1.1), [sx*.82, 1.08, F - .088], [0, Math.PI, 0]);
    halo(g, [sx*.82, 1.08, F - .2], "#FFE6B0", 1.2, .7);
    add(g, cyl(.08, .08, .08, 14), glow("#FFE7B0", .6), [sx*.55, .78, F - .1], [Math.PI/2, 0, 0]);
    add(g, box(.14, .07, .04), glow("#F2A03A", .45), [sx*.98, .82, F - .04]);
  }
  for (let k = 0; k < 9; k++) add(g, box(.035, .5, .03), chrome, [-.32 + k*.08, 1.05, F - .06]);
  add(g, box(.75, .06, .05), chrome, [0, 1.32, F - .06]);
  add(g, box(W + .2, .16, .16), chrome, [0, .66, F - .12]);
  add(g, box(.36, .1, .02), M("#E8C547", .6), [0, .52, F - .2]);
  // three-tone alpine horn on the roof
  for (let k = 0; k < 3; k++) add(g, new THREE.ConeGeometry(.07 + k*.015, .5 + k*.12, 14, 1, true), chrome, [-.15 + k*.15, 2.98, F + .7], [-Math.PI/2, 0, 0]);
  // roof: rack with suitcases, a bicycle, a goat crate
  for (const sx of [-1, 1]) add(g, box(.05, .08, 3.6), chrome, [sx*.95, 3.12, .9]);
  for (let k = 0; k < 6; k++) add(g, box(1.9, .04, .05), chrome, [0, 3.08, -.8 + k*.68]);
  const cases = [["#7A4A36", .7, .32, .5], ["#3E6FA8", .6, .28, .45], ["#C9A04A", .55, .4, .4], ["#4F6B46", .8, .3, .55], ["#B0473A", .5, .25, .38]];
  cases.forEach(([c, w, h, d], i) => { const x = -.55 + (i % 3)*.55, z = -.3 + Math.floor(i/3)*.8 + (i % 2)*.1; add(g, box(w, h, d), M(c, .8), [x, 3.1 + h/2, z], [0, (i - 2)*.12, 0]); add(g, box(w + .01, .03, .06), M("#3A2E25", .8), [x, 3.1 + h, z], [0, (i - 2)*.12, 0]); });
  const crate = buildCrate(.7, .5, .6, 9); crate.position.set(.45, 3.37, 1.75); g.add(crate);
  add(g, new THREE.SphereGeometry(.12, 10, 8), M("#E9E2D3", .95), [.45, 3.5, 1.75], null, [1, .8, 1.3]);
  for (const z of [2.35, 3.25]){ add(g, new THREE.TorusGeometry(.32, .025, 6, 20), M("#2B2925", .8), [-.45, 3.45, z], [0, Math.PI/2, 0]); }
  add(g, tube(new THREE.CatmullRomCurve3([new THREE.Vector3(-.45, 3.45, 2.35), new THREE.Vector3(-.45, 3.75, 2.8), new THREE.Vector3(-.45, 3.45, 3.25)]), .02, 10, 5), M("#3E6FA8", .5, .4));
  // rear: ladder, tail lights, bumper, rear window glow
  for (const sx of [-1, 1]) add(g, box(.035, 2.4, .035), chrome, [.6 + sx*.2, 1.95, B + .1]);
  for (let k = 0; k < 8; k++) add(g, box(.42, .025, .03), chrome, [.6, .9 + k*.3, B + .1]);
  add(g, new THREE.PlaneGeometry(1.0, .55), warm, [-.3, 2.15, B + .1]);
  for (const sx of [-1, 1]){ add(g, cyl(.09, .09, .05, 16), glow("#C2321F", .7), [sx*.95, 1.0, B + .06], [Math.PI/2, 0, 0]); halo(g, [sx*.95, 1.0, B + .14], "#FF6A50", .45); }
  add(g, box(W + .2, .16, .16), chrome, [0, .66, B + .12]);
  // mirrors on long arms
  for (const sx of [-1, 1]){ add(g, tube(new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx*1.15, 2.0, F + .3), new THREE.Vector3(sx*1.45, 2.1, F + .1), new THREE.Vector3(sx*1.4, 2.3, F - .05)), .02, 10, 6), chrome); add(g, box(.06, .34, .2), trim, [sx*1.4, 2.35, F - .05]); }
  // wheels, arches, mud flaps
  for (const sx of [-1, 1]) for (const z of [F + 1.35, B - 1.45]){
    const w = buildWheel(.5, .34, { rim: "#F1E9D6", hub: "#B0473A" }); w.position.set(sx*1.0, .5, z); g.add(w);
    const arch = new THREE.CylinderGeometry(.66, .66, .3, 18, 1, true, -Math.PI*.1, Math.PI*.8); arch.rotateZ(Math.PI/2);
    add(g, arch, trim, [sx*(W/2 + .02), .52, z]).material.side = THREE.DoubleSide;
  }
  for (const sx of [-1, 1]) add(g, box(.32, .3, .02), trim, [sx*1.0, .35, B - .8], [-.1, 0, 0]);
  return g;
}
function buildBusStop(){
  const g = new THREE.Group(), wood = M("#7A5A3E", .85), roof = M("#B5583C", .8);
  add(g, box(2.6, .1, 1.2), M("#8E887E", .95), [0, .05, 0]);
  for (const x of [-1.15, 1.15]) for (const z of [-.45, .45]) add(g, box(.1, 2.2, .1), wood, [x, 1.15, z]);
  add(g, box(2.4, 1.6, .05), M("#9A7A55", .85), [0, 1.2, .5]);
  for (let k = 0; k < 6; k++) add(g, box(2.4, .02, .06), M("#6B5034", .85), [0, .5 + k*.28, .53]);
  for (const sz of [-1, 1]) add(g, box(2.9, .07, .85), roof, [0, 2.45 - .0, sz*.35], [sz*.35, 0, 0]);
  add(g, box(1.8, .06, .4), wood, [0, .5, .2]); for (const x of [-.8, .8]) add(g, box(.08, .45, .35), wood, [x, .25, .2]);
  add(g, cyl(.04, .04, 2.6, 8), M("#4A4740", .5, .6), [1.6, 1.3, -.4]);
  add(g, cyl(.32, .32, .04, 24), M("#E1B640", .5), [1.6, 2.5, -.4], [Math.PI/2, 0, 0]);
  add(g, cyl(.24, .24, .045, 24), M("#2A2E31", .6), [1.6, 2.5, -.4], [Math.PI/2, 0, 0]);
  add(g, box(.5, .65, .03), M("#F2EFE6", .7), [-.6, 1.4, .47]);
  add(g, box(.12, .2, .12), glow("#FFC874", 1.4), [0, 2.15, 0]); halo(g, [0, 2.15, 0], "#FFC874", .9, .6);
  const p = buildPerson("traveler"); p.position.set(.6, .1, -.1); p.rotation.y = .4; g.add(p);
  addTufts(g, 24, 1.6, 3, 21);
  return g;
}

/* ============================================================
   ASSET: SNOWCAT (tracked, tows a firewood sled) — detailed
============================================================ */
function buildSnowcat(){
  const g = new THREE.Group(), W = 1.9, orange = M("#D9773A", .5, .1), orangeD = M("#B85F2C", .55, .1), trim = M("#2A2E31", .8), track = M("#232220", .95);
  const chrome = M("#D2D4D0", .25, .9), steel = M("#7A7D80", .4, .6), snow = M("#F4F6F8", .9);
  const s = new THREE.Shape(); s.moveTo(1.4, .9); s.lineTo(-1.5, .9); s.lineTo(-1.6, 1.4); s.lineTo(-1.1, 2.4); s.lineTo(1.3, 2.4); s.quadraticCurveTo(1.45, 2.4, 1.45, 2.25); s.lineTo(1.4, .9);
  const cg = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .07, bevelSize: .07, bevelSegments: 3 }); cg.rotateY(-Math.PI/2); cg.translate(W/2, 0, 0); add(g, cg, orange);
  add(g, box(W + .16, .14, 2.95), orangeD, [0, 1.0, -.08]);
  add(g, box(W + .17, .04, 2.96), M("#F2EFE6", .6), [0, 1.42, -.08]);
  const gl = M("#24343A", .1, .3), warm = glow("#FFDCA8", .35);
  const wsg = new THREE.Group(); wsg.position.set(0, 1.92, -1.42); wsg.rotation.x = -.46; g.add(wsg);
  add(wsg, new THREE.PlaneGeometry(W - .3, .8), gl, null, [0, Math.PI, 0]);
  for (const sx of [-1, 1]) add(wsg, box(.6, .015, .015), trim, [sx*.35, -.33, -.02], [0, 0, sx*.5]);
  add(wsg, box(.05, .82, .03), trim, [0, 0, -.02]);
  for (const sx of [-1, 1]){
    add(g, new THREE.PlaneGeometry(1.9, .62), gl, [sx*(W/2 + .075), 1.95, .1], [0, sx*Math.PI/2, 0]);
    add(g, box(.025, .66, .04), trim, [sx*(W/2 + .08), 1.95, .2]);
    add(g, box(.04, .03, .14), chrome, [sx*(W/2 + .09), 1.6, -.4]);
    for (let k = 0; k < 2; k++) add(g, box(.3, .04, .18), steel, [sx*(W/2 + .22), .95 + k*.32, -.3]);
    add(g, tube(new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx*.95, 1.9, -1.2), new THREE.Vector3(sx*1.2, 1.9, -1.25), new THREE.Vector3(sx*1.25, 2.05, -1.2)), .014, 8, 5), trim);
    add(g, box(.06, .26, .16), trim, [sx*1.26, 2.12, -1.2]);
  }
  add(g, new THREE.PlaneGeometry(1.4, .5), warm, [0, 1.95, 1.53]);
  // tracks with drive sprocket, idler, road wheels, cleats, fenders
  for (const sx of [-1, 1]){
    const tr = new THREE.Shape(), L = 3.4, Hh = .9, r = .45; tr.moveTo(-L/2 + r, 0); tr.lineTo(L/2 - r, 0); tr.absarc(L/2 - r, r, r, -Math.PI/2, Math.PI/2); tr.lineTo(-L/2 + r, Hh); tr.absarc(-L/2 + r, r, r, Math.PI/2, Math.PI*1.5);
    const tg = new THREE.ExtrudeGeometry(tr, { depth: .55, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); tg.rotateY(-Math.PI/2); tg.translate(.275, 0, 0);
    add(g, tg, track, [sx*1.05, 0, 0]);
    for (let k = 0; k < 5; k++){ add(g, cyl(.28, .28, .58, 16), steel, [sx*1.05, .45, -1.2 + k*.6], [0, 0, Math.PI/2]); add(g, cyl(.1, .1, .6, 10), trim, [sx*1.05, .45, -1.2 + k*.6], [0, 0, Math.PI/2]); }
    for (let k = 0; k < 10; k++){ const a = k/10*Math.PI*2; add(g, box(.6, .07, .08), steel, [sx*1.05, .45 + Math.cos(a)*.4, 1.25 + Math.sin(a)*.4], [a, 0, 0]); }
    for (let k = 0; k < 18; k++){ add(g, box(.6, .05, .07), M("#3A3836", .9), [sx*1.05, .0, -1.55 + k*.18]); add(g, box(.6, .05, .07), M("#3A3836", .9), [sx*1.05, .9, -1.55 + k*.18]); }
    add(g, box(.64, .04, 3.3), orangeD, [sx*1.05, 1.0, 0]);
    add(g, box(.66, .06, .4), snow, [sx*1.05, 1.04, .6]);
  }
  // plow blade with hydraulic arms
  const blade = new THREE.Group(); blade.position.set(0, .55, -2.15); blade.rotation.x = .2; g.add(blade);
  add(blade, box(2.9, .8, .1), M("#E8E2D4", .5, .3));
  for (let k = 0; k < 4; k++) add(blade, box(2.9, .03, .04), M("#C9C2B4", .6), [0, -.3 + k*.2, -.06]);
  add(blade, box(2.95, .1, .14), trim, [0, -.42, 0]);
  for (const sx of [-1, 1]){ add(g, cyl(.05, .05, .9, 8), chrome, [sx*.6, .75, -1.75], [1.3, 0, 0]); add(g, cyl(.08, .08, .5, 8), steel, [sx*.6, .9, -1.55], [1.3, 0, 0]); }
  add(blade, box(1.2, .25, .2), snow, [.4, .42, -.08]);
  // headlights, roof light bar, amber beacon, antenna, exhaust stack
  for (const sx of [-1, 1]){ add(g, cyl(.11, .11, .08, 18), trim, [sx*.65, 1.25, -1.62], [Math.PI/2, 0, 0]); add(g, new THREE.CircleGeometry(.09, 18), glow("#FFF1CF", 1.1), [sx*.65, 1.25, -1.665], [0, Math.PI, 0]); halo(g, [sx*.65, 1.25, -1.75], "#FFE6B0", 1.0, .6); }
  add(g, box(1.5, .1, .16), trim, [0, 2.5, -1.15]);
  for (const sx of [-.54, -.18, .18, .54]){ add(g, box(.16, .08, .04), glow("#FFF1CF", .9), [sx, 2.5, -1.24]); halo(g, [sx, 2.5, -1.32], "#FFF1CF", .45); }
  add(g, cyl(.08, .1, .14, 14), glow("#F2A03A", 1.2), [-.6, 2.52, .7]); halo(g, [-.6, 2.56, .7], "#F2A03A", .8);
  add(g, cyl(.01, .01, 1.2, 4), trim, [.75, 3.0, 1.1]);
  add(g, cyl(.06, .06, .9, 10), steel, [.75, 2.7, .3]); add(g, cyl(.09, .06, .08, 10), trim, [.75, 3.18, .3]);
  add(g, box(W + .1, .12, 2.5), snow, [0, 2.47, .05]);
  // roof rack: skis, shovel, jerry cans
  for (const sx of [-1, 1]) add(g, box(.04, .04, 2.2), chrome, [sx*.75, 2.56, .2]);
  for (const x of [-.4, -.3]) add(g, box(.08, .02, 1.9), M("#C9473A", .6), [x, 2.6, .2]);
  add(g, box(.18, .3, .4), M("#5F6E52", .6), [.35, 2.72, .8]);
  add(g, cyl(.02, .02, 1.1, 5), M("#7A5A3E", .85), [.45, 2.6, -.1], [Math.PI/2, 0, 0]); add(g, box(.22, .02, .28), steel, [.45, 2.6, -.75]);
  // sled + firewood + rope ties + lantern
  const sled = new THREE.Group(); sled.position.set(0, 0, 3.6); g.add(sled);
  for (const sx of [-1, 1]) add(sled, tube(new THREE.CatmullRomCurve3([new THREE.Vector3(sx*.7, .05, 1.3), new THREE.Vector3(sx*.7, .05, -1.2), new THREE.Vector3(sx*.7, .35, -1.45)]), .04, 12, 6), steel);
  for (const z of [-.9, 0, .9]) for (const sx of [-1, 1]) add(sled, box(.05, .25, .05), steel, [sx*.7, .17, z]);
  add(sled, box(1.6, .08, 2.4), M("#8A6A45", .85), [0, .3, 0]);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6 - r; k++){ const lg = add(sled, cyl(.11, .11, 1.8, 8), M(k % 2 ? "#8C6B4A" : "#7A5C3F", .9), [-.55 + k*.22 + r*.11, .45 + r*.19, 0], [Math.PI/2, 0, 0]); add(sled, new THREE.CircleGeometry(.1, 8), M("#C9A87A", .9), [-.55 + k*.22 + r*.11, .45 + r*.19, -.905], [0, Math.PI, 0]); }
  for (const z of [-.5, .5]) add(sled, tube(new THREE.CatmullRomCurve3([new THREE.Vector3(-.75, .35, z), new THREE.Vector3(-.4, 1.05, z), new THREE.Vector3(.4, 1.05, z), new THREE.Vector3(.75, .35, z)]), .015, 16, 5), M("#D9C9A0", .95));
  add(sled, box(1.3, .08, 1.9), snow, [0, 1.06, 0]);
  add(sled, box(.14, .2, .14), glow("#FFC874", 1.3), [.7, .55, -1.1]); halo(sled, [.7, .55, -1.1], "#FFC874", .7, .4);
  add(g, tube(new THREE.LineCurve3(new THREE.Vector3(0, .6, 1.5), new THREE.Vector3(0, .4, 2.15)), .03, 2, 6), trim);
  return g;
}

/* ============================================================
   ASSET: GRAPPLE WINCH (Rover mod): bumper drum, cable, hook, anchor ring
============================================================ */
function buildHook(){
  const g = new THREE.Group(), steel = M("#6E6A63", .35, .85);
  add(g, new THREE.TorusGeometry(.07, .02, 8, 16), steel, [0, .14, 0]);
  add(g, cyl(.03, .03, .16, 8), steel, [0, .02, 0]);
  const hook = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.06, 0), new THREE.Vector3(0, -.2, 0), new THREE.Vector3(.08, -.3, 0), new THREE.Vector3(.16, -.22, 0), new THREE.Vector3(.15, -.1, 0)]);
  add(g, tube(hook, .025, 16, 8), steel);
  add(g, new THREE.ConeGeometry(.03, .06, 8), steel, [.15, -.07, 0]);
  return g;
}
function buildWinch(){
  const g = new THREE.Group(), trim = M("#2A2E31", .8), steel = M("#8E908C", .35, .7);
  add(g, box(2.0, .22, .2), trim, [0, .72, 0]);
  add(g, cyl(.13, .13, .5, 16), M("#3A3D3F", .5, .6), [0, .72, -.2], [0, 0, Math.PI/2]);
  for (const sx of [-1, 1]) add(g, box(.08, .34, .3), trim, [sx*.3, .72, -.2]);
  add(g, box(.3, .1, .06), steel, [0, .62, -.38]);
  const anchor = new THREE.Vector3(.4, 3.0, -5.2);
  add(g, rockGeo(1200, 1.4, 1.2, 1.1, 3), VC(.95), [anchor.x, anchor.y - .9, anchor.z - .6]);
  add(g, box(.3, .3, .05), M("#4A4740", .5, .7), [anchor.x, anchor.y + .05, anchor.z + .42], [-.3, 0, 0]);
  add(g, new THREE.TorusGeometry(.12, .025, 8, 18), M("#6E6A63", .35, .85), [anchor.x, anchor.y - .08, anchor.z + .48], [.3, 0, 0]);
  const glint = add(g, new THREE.SphereGeometry(.05, 8, 6), glow("#FFE7B0", 1.4), [anchor.x + .08, anchor.y, anchor.z + .52]);
  const start = new THREE.Vector3(0, .7, -.4), end = new THREE.Vector3(anchor.x, anchor.y - .2, anchor.z + .5);
  add(g, tube(catenary(start, end, .25), .012, 30, 6), M("#3B3934", .6, .4));
  const h = buildHook(); h.position.copy(end).add(new THREE.Vector3(0, .1, 0)); h.rotation.x = -.5; g.add(h);
  chainUpdate(g, t => { glint.material.emissiveIntensity = 1.4*(.6 + .4*Math.sin(t*3)); });
  return g;
}

