// The Snowcat (assets.html → SNOWCAT): twin tracks, two-tone cab, plow blade, roof kit, and a towed
// sled of firewood. Ported unchanged from buildSnowcat(); the sled is handed back in userData.sled
// (it is towed on its own hitch in the game).
import { CatmullRomCurve3, CircleGeometry, ExtrudeGeometry, Group, LineCurve3, PlaneGeometry, QuadraticBezierCurve3, Shape, Vector3 } from "three";
import { M, add, box, cyl, glow, halo, tube } from "../../art/kit";

export function buildSnowcat() {
  const g = new Group(), W = 1.9, orange = M("#D9773A", .5, .1), orangeD = M("#B85F2C", .55, .1), trim = M("#2A2E31", .8), track = M("#232220", .95);
  const chrome = M("#D2D4D0", .25, .9), steel = M("#7A7D80", .4, .6), snow = M("#F4F6F8", .9);
  const s = new Shape(); s.moveTo(1.4, .9); s.lineTo(-1.5, .9); s.lineTo(-1.6, 1.4); s.lineTo(-1.1, 2.4); s.lineTo(1.3, 2.4); s.quadraticCurveTo(1.45, 2.4, 1.45, 2.25); s.lineTo(1.4, .9);
  const cg = new ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: .07, bevelSize: .07, bevelSegments: 3 }); cg.rotateY(-Math.PI/2); cg.translate(W/2, 0, 0); add(g, cg, orange);
  add(g, box(W + .16, .14, 2.95), orangeD, [0, 1.0, -.08]);
  add(g, box(W + .17, .04, 2.96), M("#F2EFE6", .6), [0, 1.42, -.08]);
  const gl = M("#24343A", .1, .3), warm = glow("#FFDCA8", .35);
  const wsg = new Group(); wsg.position.set(0, 1.92, -1.42); wsg.rotation.x = -.46; g.add(wsg);
  add(wsg, new PlaneGeometry(W - .3, .8), gl, null, [0, Math.PI, 0]);
  for (const sx of [-1, 1]) add(wsg, box(.6, .015, .015), trim, [sx*.35, -.33, -.02], [0, 0, sx*.5]);
  add(wsg, box(.05, .82, .03), trim, [0, 0, -.02]);
  for (const sx of [-1, 1]){
    add(g, new PlaneGeometry(1.9, .62), gl, [sx*(W/2 + .075), 1.95, .1], [0, sx*Math.PI/2, 0]);
    add(g, box(.025, .66, .04), trim, [sx*(W/2 + .08), 1.95, .2]);
    add(g, box(.04, .03, .14), chrome, [sx*(W/2 + .09), 1.6, -.4]);
    for (let k = 0; k < 2; k++) add(g, box(.3, .04, .18), steel, [sx*(W/2 + .22), .95 + k*.32, -.3]);
    add(g, tube(new QuadraticBezierCurve3(new Vector3(sx*.95, 1.9, -1.2), new Vector3(sx*1.2, 1.9, -1.25), new Vector3(sx*1.25, 2.05, -1.2)), .014, 8, 5), trim);
    add(g, box(.06, .26, .16), trim, [sx*1.26, 2.12, -1.2]);
  }
  add(g, new PlaneGeometry(1.4, .5), warm, [0, 1.95, 1.53]);
  // tracks with drive sprocket, idler, road wheels, cleats, fenders
  for (const sx of [-1, 1]){
    const tr = new Shape(), L = 3.4, Hh = .9, r = .45; tr.moveTo(-L/2 + r, 0); tr.lineTo(L/2 - r, 0); tr.absarc(L/2 - r, r, r, -Math.PI/2, Math.PI/2); tr.lineTo(-L/2 + r, Hh); tr.absarc(-L/2 + r, r, r, Math.PI/2, Math.PI*1.5);
    const tg = new ExtrudeGeometry(tr, { depth: .55, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); tg.rotateY(-Math.PI/2); tg.translate(.275, 0, 0);
    add(g, tg, track, [sx*1.05, 0, 0]);
    for (let k = 0; k < 5; k++){ add(g, cyl(.28, .28, .58, 16), steel, [sx*1.05, .45, -1.2 + k*.6], [0, 0, Math.PI/2]); add(g, cyl(.1, .1, .6, 10), trim, [sx*1.05, .45, -1.2 + k*.6], [0, 0, Math.PI/2]); }
    for (let k = 0; k < 10; k++){ const a = k/10*Math.PI*2; add(g, box(.6, .07, .08), steel, [sx*1.05, .45 + Math.cos(a)*.4, 1.25 + Math.sin(a)*.4], [a, 0, 0]); }
    for (let k = 0; k < 18; k++){ add(g, box(.6, .05, .07), M("#3A3836", .9), [sx*1.05, .0, -1.55 + k*.18]); add(g, box(.6, .05, .07), M("#3A3836", .9), [sx*1.05, .9, -1.55 + k*.18]); }
    add(g, box(.64, .04, 3.3), orangeD, [sx*1.05, 1.0, 0]);
    add(g, box(.66, .06, .4), snow, [sx*1.05, 1.04, .6]);
  }
  // plow blade with hydraulic arms
  const blade = new Group(); blade.position.set(0, .55, -2.15); blade.rotation.x = .2; g.add(blade);
  add(blade, box(2.9, .8, .1), M("#E8E2D4", .5, .3));
  for (let k = 0; k < 4; k++) add(blade, box(2.9, .03, .04), M("#C9C2B4", .6), [0, -.3 + k*.2, -.06]);
  add(blade, box(2.95, .1, .14), trim, [0, -.42, 0]);
  for (const sx of [-1, 1]){ add(g, cyl(.05, .05, .9, 8), chrome, [sx*.6, .75, -1.75], [1.3, 0, 0]); add(g, cyl(.08, .08, .5, 8), steel, [sx*.6, .9, -1.55], [1.3, 0, 0]); }
  add(blade, box(1.2, .25, .2), snow, [.4, .42, -.08]);
  // headlights, roof light bar, amber beacon, antenna, exhaust stack
  for (const sx of [-1, 1]){ add(g, cyl(.11, .11, .08, 18), trim, [sx*.65, 1.25, -1.62], [Math.PI/2, 0, 0]); add(g, new CircleGeometry(.09, 18), glow("#FFF1CF", 1.1), [sx*.65, 1.25, -1.665], [0, Math.PI, 0]); halo(g, [sx*.65, 1.25, -1.75], "#FFE6B0", 1.0, .6); }
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
  const sled = new Group(); sled.position.set(0, 0, 3.6); g.add(sled);
  for (const sx of [-1, 1]) add(sled, tube(new CatmullRomCurve3([new Vector3(sx*.7, .05, 1.3), new Vector3(sx*.7, .05, -1.2), new Vector3(sx*.7, .35, -1.45)]), .04, 12, 6), steel);
  for (const z of [-.9, 0, .9]) for (const sx of [-1, 1]) add(sled, box(.05, .25, .05), steel, [sx*.7, .17, z]);
  add(sled, box(1.6, .08, 2.4), M("#8A6A45", .85), [0, .3, 0]);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6 - r; k++){ add(sled, cyl(.11, .11, 1.8, 8), M(k % 2 ? "#8C6B4A" : "#7A5C3F", .9), [-.55 + k*.22 + r*.11, .45 + r*.19, 0], [Math.PI/2, 0, 0]); add(sled, new CircleGeometry(.1, 8), M("#C9A87A", .9), [-.55 + k*.22 + r*.11, .45 + r*.19, -.905], [0, Math.PI, 0]); }
  for (const z of [-.5, .5]) add(sled, tube(new CatmullRomCurve3([new Vector3(-.75, .35, z), new Vector3(-.4, 1.05, z), new Vector3(.4, 1.05, z), new Vector3(.75, .35, z)]), .015, 16, 5), M("#D9C9A0", .95));
  add(sled, box(1.3, .08, 1.9), snow, [0, 1.06, 0]);
  add(sled, box(.14, .2, .14), glow("#FFC874", 1.3), [.7, .55, -1.1]); halo(sled, [.7, .55, -1.1], "#FFC874", .7, .4);
  add(g, tube(new LineCurve3(new Vector3(0, .6, 1.5), new Vector3(0, .4, 2.15)), .03, 2, 6), trim);
  g.userData = { sled };
  return g;
}
