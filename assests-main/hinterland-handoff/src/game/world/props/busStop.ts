// Bus stop (assets.html → BUS STOP): wooden shelter, tiled roof, bench, timetable, round sign, lamp, a traveler.
import { Group } from "three";
import { M, add, box, cyl, glow, halo } from "../../art/kit";
import { buildPerson } from "../../life/person";
import { addTufts } from "../flora/grass";

export function buildBusStop() {
  const g = new Group(), wood = M("#7A5A3E", .85), roof = M("#B5583C", .8);
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

