// The Tortoise (assets.html → TORTOISE): a tiny round camper with portholes, a pop-up tent and a camp
// set (awning, rug, string lights, lantern, chairs, tea table). Ported unchanged from buildTortoise();
// the camp set, tent, wheels and lantern are handed back in userData so the game can make camp.
import { CircleGeometry, ConeGeometry, DoubleSide, ExtrudeGeometry, Group, MeshStandardMaterial, PlaneGeometry, QuadraticBezierCurve3, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { M, add, box, buildWheel, catenary, cyl, glow, halo, lin, tube } from "../../art/kit";

export function buildTortoise() {
  const camp = new Group(), tentG = new Group(), wheels: Group[] = [];
  const g = new Group(), W = 1.6, sage = M("#8FA68A", .5, .1), sageD = M("#6F8A6C", .55, .1), cream = M("#EFE6D3", .55), trim = M("#2A2E31", .8);
  const chrome = M("#D2D4D0", .22, .9), brass = M("#C9A04A", .4, .5), wood = M("#7A5A3E", .85), canvasM = M("#E8743B", .9, 0, { side: DoubleSide });
  const s = new Shape();
  s.moveTo(1.55, .55); s.lineTo(-1.45, .55); s.quadraticCurveTo(-1.75, .58, -1.75, .95); s.quadraticCurveTo(-1.72, 1.5, -1.2, 1.85);
  s.quadraticCurveTo(0, 2.05, 1.3, 1.85); s.quadraticCurveTo(1.6, 1.6, 1.58, .95); s.lineTo(1.55, .55);
  const bg = new ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 5, curveSegments: 16 });
  bg.rotateY(-Math.PI/2); bg.translate(W/2, 0, 0); add(g, bg, cream);
  add(g, box(W + .26, .42, 3.4), sage, [0, .78, -.05]);
  add(g, box(W + .28, .05, 3.42), brass, [0, 1.0, -.05]);
  add(g, box(W + .27, .03, 3.41), sageD, [0, .6, -.05]);
  // portholes: warm interior + curtains + glass + brass rims
  const glassM = new MeshStandardMaterial({ color: lin("#9CC2C8"), roughness: .05, metalness: .25, transparent: true, opacity: .35 });
  const warm = glow("#FFD9A0", .5);
  for (const sx of [-1, 1]) for (const z of [-.9, .1, .95]){
    if (sx === 1 && z === .1) continue;
    const px = sx*(W/2 + .118);
    add(g, new CircleGeometry(.23, 24), warm, [px, 1.42, z], [0, sx*Math.PI/2, 0]);
    add(g, new CircleGeometry(.23, 24, -.5, 1.0), M("#C9473A", .9), [px + sx*.002, 1.42, z], [0, sx*Math.PI/2, 0]);
    add(g, new CircleGeometry(.23, 24, Math.PI - .5, 1.0), M("#C9473A", .9), [px + sx*.002, 1.42, z], [0, sx*Math.PI/2, 0]);
    add(g, new CircleGeometry(.24, 24), glassM, [px + sx*.006, 1.42, z], [0, sx*Math.PI/2, 0]).castShadow = false;
    add(g, new TorusGeometry(.24, .035, 8, 24), brass, [px + sx*.006, 1.42, z], [0, sx*Math.PI/2, 0]);
  }
  // door (right side) with window, handle, step
  add(g, box(.03, 1.05, .78), sageD, [W/2 + .125, 1.15, .1]);
  add(g, new CircleGeometry(.17, 20), warm, [W/2 + .143, 1.48, .1], [0, Math.PI/2, 0]);
  add(g, new TorusGeometry(.17, .03, 8, 20), brass, [W/2 + .148, 1.48, .1], [0, Math.PI/2, 0]);
  add(g, box(.05, .03, .14), chrome, [W/2 + .16, 1.12, -.18]);
  add(g, box(.42, .05, .7), M("#8E908C", .4, .6), [W/2 + .32, .42, .1]);
  // windscreen + wiper + mirrors
  const ws = new Group(); ws.position.set(0, 1.45, -1.83); ws.rotation.x = -.5; g.add(ws);
  add(ws, new PlaneGeometry(W - .2, .5), M("#24343A", .1, .3), null, [0, Math.PI, 0]);
  add(ws, new PlaneGeometry(W - .2, .5), glassM, [0, 0, -.006], [0, Math.PI, 0]).castShadow = false;
  add(ws, box(.55, .015, .015), trim, [.15, -.18, -.02], [0, 0, .4]);
  for (const sx of [-1, 1]){ add(g, tube(new QuadraticBezierCurve3(new Vector3(sx*.8, 1.25, -1.55), new Vector3(sx*1.02, 1.25, -1.58), new Vector3(sx*1.04, 1.38, -1.55)), .012, 8, 5), chrome); add(g, new SphereGeometry(.08, 12, 8), chrome, [sx*1.05, 1.44, -1.55], null, [.4, 1, .8]); }
  // front: round headlights with glow, grille, bumper, badge, plate, indicators
  for (const sx of [-1, 1]){
    add(g, cyl(.14, .14, .1, 20), cream, [sx*.55, .98, -1.8], [Math.PI/2, 0, 0]);
    add(g, new TorusGeometry(.13, .02, 8, 20), chrome, [sx*.55, .98, -1.855]);
    add(g, new CircleGeometry(.11, 20), glow("#FFF1CF", 1.1), [sx*.55, .98, -1.858], [0, Math.PI, 0]);
    halo(g, [sx*.55, .98, -1.9], "#FFE6B0", .9, .6);
    add(g, box(.1, .05, .04), glow("#F2A03A", .4), [sx*.72, .74, -1.82]);
  }
  for (let k = 0; k < 7; k++) add(g, box(.03, .22, .02), chrome, [-.18 + k*.06, .74, -1.86]);
  add(g, new TorusGeometry(.06, .012, 6, 16), brass, [0, 1.2, -1.83]);
  add(g, cyl(.06, .06, .01, 16), M("#8FA68A", .5), [0, 1.2, -1.83], [Math.PI/2, 0, 0]);
  add(g, box(1.4, .12, .14), chrome, [0, .62, -1.92]); add(g, box(.3, .08, .015), M("#E8C547", .6), [0, .5, -1.9]);
  // rear: bumper, tail lights, ladder to the tent, spare wheel with cover, bike rack
  add(g, box(1.4, .12, .14), chrome, [0, .62, 1.92]);
  for (const sx of [-1, 1]){ add(g, cyl(.07, .07, .05, 14), glow("#C2321F", .7), [sx*.62, .95, 1.78], [Math.PI/2, 0, 0]); halo(g, [sx*.62, .95, 1.84], "#FF6A50", .35); }
  for (const sx of [-1, 1]) add(g, box(.035, 1.2, .035), chrome, [.45 + sx*.17, 1.45, 1.86]);
  for (let k = 0; k < 5; k++) add(g, box(.36, .025, .03), chrome, [.45, .95 + k*.24, 1.86]);
  const spare = buildWheel(.32, .2, { rim: "#EFE6D3" }); spare.rotation.y = Math.PI/2; spare.position.set(-.35, 1.15, 1.92); g.add(spare);
  add(g, cyl(.33, .33, .1, 22), sage, [-.35, 1.15, 2.03], [Math.PI/2, 0, 0]);
  add(g, new TorusGeometry(.2, .015, 6, 18), brass, [-.35, 1.15, 2.085]);
  // roof: rack rails + pop-up tent with windows and guy lines
  for (const sx of [-1, 1]) add(g, box(.04, .04, 2.6), chrome, [sx*.7, 1.98, -.05]);
  const tent = new Shape(); tent.moveTo(-1.1, 0); tent.lineTo(1.1, 0); tent.lineTo(-.9, .9); tent.lineTo(-1.1, 0);
  const tg = new ExtrudeGeometry(tent, { depth: W - .1, bevelEnabled: false }); tg.rotateY(-Math.PI/2); tg.translate((W - .1)/2, 0, 0);
  add(tentG, tg, canvasM, [0, 2.0, .1]);
  add(g, box(W - .05, .1, 2.25), cream, [0, 2.0, .1]);
  add(tentG, new CircleGeometry(.14, 16), glow("#FFD9A0", .6), [W/2 - .02, 2.28, -.6], [0, Math.PI/2, 0]);
  add(tentG, new CircleGeometry(.14, 16), glow("#FFD9A0", .6), [-(W/2 - .02), 2.28, -.6], [0, -Math.PI/2, 0]);
  // awning: striped canvas, poles to the ground, rug, string lights, hanging lantern
  const aw = W/2 + .14;
  for (let k = 0; k < 7; k++) add(camp, box(1.25, .02, .3), M(k % 2 ? "#F2EFE6" : "#C9473A", .9, 0, { side: DoubleSide }), [aw + .6, 1.86 - .015*k, -.95 + k*.3], [0, 0, -.18]);
  for (let k = 0; k < 8; k++) add(camp, new ConeGeometry(.05, .12, 3), M(k % 2 ? "#F2EFE6" : "#C9473A", .9), [aw + 1.22, 1.68, -.98 + k*.28], [0, 0, Math.PI]);
  for (const z of [-1.0, 1.05]) add(camp, cyl(.02, .02, 1.7, 6), chrome, [aw + 1.22, .86, z]);
  add(camp, box(1.4, .01, 1.9), M("#B5843A", .95), [aw + .62, .01, .03]);
  for (let k = 0; k < 6; k++) add(camp, box(1.4, .012, .06), M(k % 2 ? "#8C4A3A" : "#E6D7B4", .95), [aw + .62, .012, -.7 + k*.28]);
  const lights = catenary(new Vector3(aw + 1.2, 1.7, -1.0), new Vector3(aw + 1.2, 1.7, 1.05), .18);
  add(camp, tube(lights, .006, 20, 4), M("#3A342C", .9));
  for (let i = 1; i <= 8; i++){ const p = lights.getPoint(i/9); add(camp, new SphereGeometry(.05, 10, 8), glow("#FFC874", 1.2), [p.x, p.y - .06, p.z]).castShadow = false; halo(camp, [p.x, p.y - .06, p.z], "#FFC874", .38); }
  add(camp, cyl(.004, .004, .3, 4), M("#3A342C", .9), [aw + .9, 1.6, .5]);
  add(camp, box(.16, .22, .16), M("#2E2B27", .5, .6), [aw + .9, 1.36, .5]);
  const lantern = add(camp, box(.12, .16, .12), glow("#FFC874", 1.6), [aw + .9, 1.36, .5]);
  halo(camp, [aw + .9, 1.36, .5], "#FFC874", 1.1, .9);
  // two camp chairs + a little table with a pot of tea
  for (const z of [-.45, .55]){
    const c = new Group(); c.position.set(aw + .75, 0, z); c.rotation.y = z < 0 ? .5 : -.4; camp.add(c);
    for (const sx of [-1, 1]) add(c, cyl(.012, .012, .62, 5), M("#4A4740", .5, .6), [sx*.2, .3, 0], [sx*.35, 0, 0]);
    add(c, box(.42, .03, .38), M(z < 0 ? "#3E6FA8" : "#4F8A54", .9), [0, .42, 0]);
    add(c, box(.42, .4, .03), M(z < 0 ? "#3E6FA8" : "#4F8A54", .9), [0, .64, .19], [-.25, 0, 0]);
  }
  add(camp, cyl(.24, .24, .025, 16), wood, [aw + .95, .5, .05]); add(camp, cyl(.015, .015, .5, 5), wood, [aw + .95, .25, .05]);
  add(camp, new SphereGeometry(.07, 12, 10), M("#3E6FA8", .4), [aw + .95, .58, .05], null, [1, .8, 1]);
  for (const dx of [.1, -.08]) add(camp, cyl(.03, .025, .06, 10), M("#F2EFE6", .4), [aw + .95 + dx, .55, .12]);
  // window box (left) with flowers
  add(g, box(.12, .14, .6), wood, [-(W/2 + .18), 1.12, -.9]);
  for (let k = 0; k < 8; k++) add(g, new SphereGeometry(.05, 8, 6), M(["#D8445A", "#F2C230", "#F4F0E6", "#E58AAE"][k % 4], .6), [-(W/2 + .2), 1.24, -1.15 + k*.07]);
  // wheels with cream hubs, mud flaps
  for (const sx of [-1, 1]) for (const z of [-1.15, 1.05]){ const w = buildWheel(.36, .26, { rim: "#EFE6D3", hub: "#C9A04A" }); w.position.set(sx*.82, .36, z); g.add(w); wheels.push(w); }
  for (const sx of [-1, 1]) add(g, box(.24, .22, .02), trim, [sx*.82, .26, 1.45], [-.1, 0, 0]);
  g.add(tentG, camp);
  g.userData = { wheels, camp, tent: tentG, lantern, paint: sage };
  return g;
}
