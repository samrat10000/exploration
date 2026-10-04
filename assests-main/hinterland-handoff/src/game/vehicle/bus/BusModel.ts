// The Loaf (assets.html → THE LOAF): a loaf-shaped alpine postbus. Ported unchanged from buildBus();
// the four road wheels are handed back in userData.wheels.
import { CatmullRomCurve3, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, MeshStandardMaterial, PlaneGeometry, QuadraticBezierCurve3, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { C, M, VC, add, box, buildWheel, cyl, glow, halo, lin, paintFaces, rng, tube } from "../../art/kit";
import { buildCrate } from "../cargo/CrateModel";

export function buildBus() {
  const wheels: Group[] = [];
  const g = new Group(), W = 2.3, L = 7.4;
  const yellow = M("#E1B640", .45, .12), cream = M("#F1E9D6", .5), red = M("#B0473A", .6), trim = M("#2A2E31", .8), chrome = M("#D2D4D0", .22, .9);
  const s = new Shape(), F = -L/2, B = L/2;
  s.moveTo(B, .62); s.lineTo(F + .25, .62); s.quadraticCurveTo(F, .64, F, 1.0); s.lineTo(F + .02, 1.55);
  s.quadraticCurveTo(F + .05, 2.6, F + .7, 2.9); s.quadraticCurveTo(0, 3.08, B - .7, 2.92); s.quadraticCurveTo(B, 2.75, B - .02, 1.9); s.lineTo(B, .62);
  const bg = new ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .1, bevelSize: .1, bevelSegments: 5, curveSegments: 18 });
  bg.rotateY(-Math.PI/2); bg.translate(W/2, 0, 0);
  add(g, paintFaces(bg, c => c.y > 1.52 ? C("#F1E9D6") : C("#E1B640")), VC(.5, { flatShading: false }));
  for (const sx of [-1, 1]){
    add(g, box(.025, .05, L - .2), chrome, [sx*(W/2 + .105), 1.52, 0]);
    add(g, box(.022, .03, L - .3), red, [sx*(W/2 + .1), 1.42, 0]);
  }
  add(g, box(W + .22, .14, L - .1), trim, [0, .66, 0]);
  // side windows: warm interior, seats + passenger silhouettes, glass, frames
  const glassM = new MeshStandardMaterial({ color: lin("#9CC2C8"), roughness: .05, metalness: .25, transparent: true, opacity: .32 });
  const warm = glow("#FFDCA8", .45), seat = M("#8C4A3A", .9), skin = M("#C99A74", .8);
  const rnd = rng(66);
  for (const sx of [-1, 1]){
    for (let k = 0; k < 6; k++){
      const z = -2.15 + k*.95, px = sx*(W/2 + .102);
      if (sx === 1 && k === 0) continue;
      add(g, new PlaneGeometry(.82, .78), warm, [px, 2.05, z], [0, sx*Math.PI/2, 0]);
      add(g, box(.04, .32, .5), seat, [sx*(W/2 - .2), 1.82, z + .05]);
      if (rnd() > .35){ add(g, new SphereGeometry(.13, 12, 10), skin, [sx*(W/2 - .25), 2.12, z]); add(g, cyl(.16, .2, .3, 10), M(["#3E6FA8", "#4F8A54", "#B0473A", "#5F7A8C"][k % 4], .9), [sx*(W/2 - .25), 1.88, z]); if (rnd() > .5) add(g, cyl(.18, .18, .03, 14), M("#8C6E4A", .85), [sx*(W/2 - .25), 2.24, z]); }
      add(g, new PlaneGeometry(.84, .8), glassM, [sx*(W/2 + .11), 2.05, z], [0, sx*Math.PI/2, 0]).castShadow = false;
      add(g, box(.03, .9, .05), trim, [sx*(W/2 + .11), 2.05, z + .47]);
    }
    add(g, box(.03, .06, 5.9), trim, [sx*(W/2 + .11), 2.48, .25]);
    add(g, box(.03, .06, 5.9), trim, [sx*(W/2 + .11), 1.63, .25]);
  }
  // folding door (right front)
  for (const dz of [-.2, .2]){ add(g, box(.03, 1.6, .38), yellow, [W/2 + .11, 1.45, -2.65 + dz]); add(g, new PlaneGeometry(.3, .9), glassM, [W/2 + .13, 1.75, -2.65 + dz], [0, Math.PI/2, 0]); }
  add(g, box(.5, .1, .9), M("#8E908C", .4, .6), [W/2 + .22, .5, -2.65]);
  // windscreen (split), destination board glowing, wipers
  for (const sx of [-1, 1]){
    const ws = new Group(); ws.position.set(sx*.56, 2.08, F - .06); ws.rotation.x = .08; g.add(ws);
    add(ws, new PlaneGeometry(1.0, .82), M("#1E2A2C", .9), null, [0, Math.PI, 0]);
    add(ws, new PlaneGeometry(1.0, .82), glassM, [0, 0, -.01], [0, Math.PI, 0]).castShadow = false;
    add(ws, box(.6, .015, .015), trim, [sx*.05, -.33, -.03], [0, 0, sx*.5]);
  }
  add(g, box(.06, .9, .05), trim, [0, 2.08, F - .07]);
  add(g, box(1.5, .26, .06), trim, [0, 2.68, F + .05]);
  add(g, new PlaneGeometry(1.4, .2), glow("#FFE6A8", 1.0), [0, 2.68, F + .015], [0, Math.PI, 0]);
  halo(g, [0, 2.68, F - .1], "#FFE6A8", 1.4);
  // front: round headlights, chrome grille, bumper, fog lamps, indicators, badge
  for (const sx of [-1, 1]){
    add(g, cyl(.19, .19, .12, 22), cream, [sx*.82, 1.08, F - .02], [Math.PI/2, 0, 0]);
    add(g, new TorusGeometry(.18, .025, 8, 22), chrome, [sx*.82, 1.08, F - .085]);
    add(g, new CircleGeometry(.15, 22), glow("#FFF1CF", 1.1), [sx*.82, 1.08, F - .088], [0, Math.PI, 0]);
    halo(g, [sx*.82, 1.08, F - .2], "#FFE6B0", 1.2, .7);
    add(g, cyl(.08, .08, .08, 14), glow("#FFE7B0", .6), [sx*.55, .78, F - .1], [Math.PI/2, 0, 0]);
    add(g, box(.14, .07, .04), glow("#F2A03A", .45), [sx*.98, .82, F - .04]);
  }
  for (let k = 0; k < 9; k++) add(g, box(.035, .5, .03), chrome, [-.32 + k*.08, 1.05, F - .06]);
  add(g, box(.75, .06, .05), chrome, [0, 1.32, F - .06]);
  add(g, box(W + .2, .16, .16), chrome, [0, .66, F - .12]);
  add(g, box(.36, .1, .02), M("#E8C547", .6), [0, .52, F - .2]);
  // three-tone alpine horn on the roof
  for (let k = 0; k < 3; k++) add(g, new ConeGeometry(.07 + k*.015, .5 + k*.12, 14, 1, true), chrome, [-.15 + k*.15, 2.98, F + .7], [-Math.PI/2, 0, 0]);
  // roof: rack with suitcases, a bicycle, a goat crate
  for (const sx of [-1, 1]) add(g, box(.05, .08, 3.6), chrome, [sx*.95, 3.12, .9]);
  for (let k = 0; k < 6; k++) add(g, box(1.9, .04, .05), chrome, [0, 3.08, -.8 + k*.68]);
  const cases = [["#7A4A36", .7, .32, .5], ["#3E6FA8", .6, .28, .45], ["#C9A04A", .55, .4, .4], ["#4F6B46", .8, .3, .55], ["#B0473A", .5, .25, .38]];
  cases.forEach(([c, w, h, d]: (string | number)[], i: number) => { const x = -.55 + (i % 3)*.55, z = -.3 + Math.floor(i/3)*.8 + (i % 2)*.1; add(g, box(w as number, h as number, d as number), M(c as string, .8), [x, 3.1 + (h as number)/2, z], [0, (i - 2)*.12, 0]); add(g, box((w as number) + .01, .03, .06), M("#3A2E25", .8), [x, 3.1 + (h as number), z], [0, (i - 2)*.12, 0]); });
  const crate = buildCrate(.7, .5, .6, 9); crate.position.set(.45, 3.37, 1.75); g.add(crate);
  add(g, new SphereGeometry(.12, 10, 8), M("#E9E2D3", .95), [.45, 3.5, 1.75], null, [1, .8, 1.3]);
  for (const z of [2.35, 3.25]){ add(g, new TorusGeometry(.32, .025, 6, 20), M("#2B2925", .8), [-.45, 3.45, z], [0, Math.PI/2, 0]); }
  add(g, tube(new CatmullRomCurve3([new Vector3(-.45, 3.45, 2.35), new Vector3(-.45, 3.75, 2.8), new Vector3(-.45, 3.45, 3.25)]), .02, 10, 5), M("#3E6FA8", .5, .4));
  // rear: ladder, tail lights, bumper, rear window glow
  for (const sx of [-1, 1]) add(g, box(.035, 2.4, .035), chrome, [.6 + sx*.2, 1.95, B + .1]);
  for (let k = 0; k < 8; k++) add(g, box(.42, .025, .03), chrome, [.6, .9 + k*.3, B + .1]);
  add(g, new PlaneGeometry(1.0, .55), warm, [-.3, 2.15, B + .1]);
  for (const sx of [-1, 1]){ add(g, cyl(.09, .09, .05, 16), glow("#C2321F", .7), [sx*.95, 1.0, B + .06], [Math.PI/2, 0, 0]); halo(g, [sx*.95, 1.0, B + .14], "#FF6A50", .45); }
  add(g, box(W + .2, .16, .16), chrome, [0, .66, B + .12]);
  // mirrors on long arms
  for (const sx of [-1, 1]){ add(g, tube(new QuadraticBezierCurve3(new Vector3(sx*1.15, 2.0, F + .3), new Vector3(sx*1.45, 2.1, F + .1), new Vector3(sx*1.4, 2.3, F - .05)), .02, 10, 6), chrome); add(g, box(.06, .34, .2), trim, [sx*1.4, 2.35, F - .05]); }
  // wheels, arches, mud flaps
  for (const sx of [-1, 1]) for (const z of [F + 1.35, B - 1.45]){
    const w = buildWheel(.5, .34, { rim: "#F1E9D6", hub: "#B0473A" }); w.position.set(sx*1.0, .5, z); g.add(w); wheels.push(w);
    const arch = new CylinderGeometry(.66, .66, .3, 18, 1, true, -Math.PI*.1, Math.PI*.8); arch.rotateZ(Math.PI/2);
    add(g, arch, trim, [sx*(W/2 + .02), .52, z]).material.side = DoubleSide;
  }
  for (const sx of [-1, 1]) add(g, box(.32, .3, .02), trim, [sx*1.0, .35, B - .8], [-.1, 0, 0]);
  g.userData.wheels = wheels;
  return g;
}
