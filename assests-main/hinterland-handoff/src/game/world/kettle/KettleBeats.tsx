// What happens on the way up (JOURNEYS §1.4, §1.5, §3 J2): bells in the fog, the eagle, breaking
// through the clouds to the first music, crosswind gusts, the traveller, campfires, and the hut.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { easeInOutCubic, hash, smooth } from "../../../utils/noise";
import { input } from "../../vehicle/input";
import { audio } from "../../audio/audio";
import { weather } from "../../environment/Sky";
import { crateMesh } from "../../vehicle/cargo";
import { CLOUD_TOP } from "./CloudSea";
import { FEATURES, HUT, kettleGround, pointAt } from "./kettle";
import { BELLS, CAMPS, CRATE_STACK, TRAVELER } from "./layout";

export const ENDING_LINES = {
  all: "Every crate. The keeper says he'll owe you one.",
  some: (n: number) => `${["None", "One", "Two", "Three", "Four", "Five"][n]} of six made it. The rest are somewhere on the mountain.`,
  few: "The keeper laughs. The view was the point anyway.",
};
const KEEPER_LATER = (n: number) => (n >= 6 ? "All six, in the end. The keeper lights his pipe and says nothing, which says a lot." : `Another one came up. That's ${n} lanterns now.`);

/** A big bird gliding along the cliff edge. */
function eagleMesh() {
  const g = new Group(), m = new MeshStandardMaterial({ color: "#3A3128", roughness: 0.9, side: DoubleSide, flatShading: true });
  const wing = new BufferGeometry();
  wing.setAttribute("position", new Float32BufferAttribute([0, 0, -0.35, 0, 0, 0.45, 2.1, 0.15, 0.1, 0, 0, -0.35, 2.1, 0.15, 0.1, 1.2, 0.05, -0.5], 3));
  wing.computeVertexNormals();
  const l = new Mesh(wing, m), r = new Mesh(wing, m), body = new Mesh(new BufferGeometry().copy(wing), m);
  r.scale.x = -1;
  body.scale.set(0.12, 0.6, 1.4);
  g.add(l, r, body);
  g.userData = { l, r };
  g.visible = false;
  return g;
}

export function KettleBeats() {
  const st = useRef({
    fired: new Set<string>(), eagleT: -1, gustT: 0, gustNext: 4, gustDir: new Vector3(), bellNext: BELLS.map((_, k) => 1 + hash(k, 1) * 4),
    camped: new Set<string>(), sitHold: 0, wait: -1, waitFrom: 0, end: -1, delivered: 0, flying: [] as { m: Group; from: Vector3; to: Vector3; t: number }[],
    stack: 0, empty: false, keeperSaid: -100, keeperLabel: null as null | { text: string; x: number; y: number; z: number },
  }).current;
  const eagle = useMemo(eagleMesh, []);
  const stackGroup = useMemo(() => new Group(), []);
  const fwd = useMemo(() => new Vector3(), []);

  useFrame(({ camera }, dt) => {
    const s = useStore.getState(), car = live.car, prog = s.progress, t = live.clock, journey = s.mode === "journey" && s.journey === "longway";
    const playing = s.phase === "play";
    // don't replay beats a saved run has already passed
    if (!st.fired.size) for (const [k, at] of [["eagle", FEATURES.eagle], ["clouds", FEATURES.cloudTop]] as const) if (prog > at + 0.01 || !journey) st.fired.add(k);
    st.fired.add("_init");

    /* sound of the place */
    camera.getWorldDirection(fwd);
    audio.listener(camera.position.x, camera.position.y, camera.position.z, fwd.x, fwd.y, fwd.z);
    live.muffle = smooth(2.5, 12, weather.fog);
    BELLS.forEach((b, k) => {
      if (t < st.bellNext[k]) return;
      st.bellNext[k] = t + 2.4 + hash(k, t) * 2.8;
      if (Math.hypot(b.x - car.x, b.z - car.z) < 120) audio.bell(b.x, b.y + 2.6, b.z);
    });

    /* crosswind gusts on the last turn: lean into them, or just ease off */
    if (prog > FEATURES.gustsFrom && playing) {
      st.gustNext -= dt;
      if (st.gustNext <= 0 && st.gustT <= 0) {
        st.gustT = 2.2;
        st.gustNext = 7 + hash(t, 3) * 6;
        const p = pointAt(prog), side = hash(t, 4) < 0.6 ? 1 : -1;
        st.gustDir.set(p.dz * side, 0, -p.dx * side).normalize();
      }
    }
    if (st.gustT > 0) {
      st.gustT -= dt;
      const e = Math.sin((1 - st.gustT / 2.2) * Math.PI) * 3.2;
      live.wind.x = st.gustDir.x * e; live.wind.z = st.gustDir.z * e;
    } else { live.wind.x = 0; live.wind.z = 0; }

    /* the eagle: it sails past the cliff edge at eye level */
    if (journey && playing && prog >= FEATURES.eagle && !st.fired.has("eagle")) {
      st.fired.add("eagle");
      st.eagleT = 0;
      eagle.visible = true;
    }
    if (st.eagleT >= 0) {
      st.eagleT += dt;
      const p = pointAt(Math.min(1, prog + 0.004)), ox = -p.dz, oz = p.dx, side = Math.sign(p.x * ox + p.z * oz) || 1;
      const u = st.eagleT / 7, along = 40 - u * 80;
      eagle.position.set(p.x + p.dx * along + ox * side * 9, p.h + 3.5 + Math.sin(u * 3) * 1.2, p.z + p.dz * along + oz * side * 9);
      eagle.rotation.set(Math.sin(u * 5) * 0.1, Math.atan2(p.dx, p.dz), Math.sin(st.eagleT * 1.3) * 0.15);
      const flap = u < 0.15 || u > 0.85 ? Math.sin(st.eagleT * 8) * 0.4 : Math.sin(st.eagleT * 1.4) * 0.06;
      eagle.userData.l.rotation.z = flap; eagle.userData.r.rotation.z = -flap;
      if (st.eagleT > 1.6 && !live.moment && st.eagleT < 2) { live.moment = { x: eagle.position.x, y: eagle.position.y, z: eagle.position.z, t: 0, dur: 2.6 }; useStore.setState({ cinema: true }); }
      if (live.moment && st.eagleT < 4.6) { live.moment.x = eagle.position.x; live.moment.y = eagle.position.y; live.moment.z = eagle.position.z; }
      if (st.eagleT > 7) { st.eagleT = -1; eagle.visible = false; }
    }

    /* breaking through the cloud tops: a slow look across the sea of cloud, and the first music */
    if (journey && playing && prog >= FEATURES.cloudTop && !st.fired.has("clouds")) {
      st.fired.add("clouds");
      const p = pointAt(prog), ox = p.dz, oz = -p.dx, side = Math.sign(p.x * ox + p.z * oz) || 1;
      live.moment = { x: car.x + ox * side * 240, y: CLOUD_TOP + 10, z: car.z + oz * side * 240, t: 0, dur: 4.5 };
      useStore.setState({ cinema: true });
      audio.music();
    }
    if (live.moment && live.moment.t >= live.moment.dur) { live.moment = null; if (useStore.getState().phase === "play" && !s.card) useStore.setState({ cinema: false }); }

    /* the traveller at the farm */
    const nearTraveler = Math.hypot(car.x - TRAVELER.x, car.z - TRAVELER.z) < 7 && Math.abs(car.speed) < 0.8;
    /* campfires: arriving saves; hold E to sit */
    let fire = 0, campNear: (typeof CAMPS)[number] | null = null;
    for (const c of CAMPS) {
      const d = Math.hypot(car.x - c.x, car.z - c.z);
      fire = Math.max(fire, 1 - smooth(3, 16, d));
      if (d < 9) {
        campNear = c;
        if (!st.camped.has(c.name) && playing) { st.camped.add(c.name); Object.assign(live.safe, { x: car.x, z: car.z, yaw: car.yaw }); s.writeSave(); }
      }
    }
    live.fireNear = s.sitting ? 1 : fire * 0.6;
    if (campNear && playing && Math.abs(car.speed) < 0.5) {
      st.sitHold = input.action ? st.sitHold + dt : 0;
      if (st.sitHold > 0.6) {
        st.sitHold = 0;
        live.sit = { x: campNear.x, y: campNear.y, z: campNear.z };
        useStore.setState({ sitting: true, hints: false, label: null });
      }
    }
    if (s.sitting && !live.sit) live.sit = campNear ? { x: campNear.x, y: campNear.y, z: campNear.z } : null;
    if (!s.sitting) live.sit = null;
    // waiting at the fire: the day sweeps on toward golden hour over six seconds
    if (s.waitRequested) {
      if (st.wait < 0) { st.wait = 0; st.waitFrom = live.env.tod; }
      st.wait += dt / 6;
      const v = st.waitFrom + (2.85 - st.waitFrom) * easeInOutCubic(Math.min(1, st.wait));
      live.env.todTarget = Math.max(live.env.todTarget, v);
      live.env.tod = Math.max(live.env.tod, v);
      useStore.setState({ todFloor: v });
      if (st.wait >= 1) { st.wait = -1; useStore.setState({ waitRequested: false }); }
    }

    /* the hut: the keeper unloads, a lantern for each crate */
    const atHut = Math.hypot(car.x - HUT.x, car.z - HUT.z) < 16 && Math.abs(car.speed) < 1.5 && playing;
    if (atHut && st.end < 0 && (journey || (live.cargo.aboard > 0 && s.region === "kettle"))) {
      st.end = 0; st.delivered = 0; st.empty = false;
      useStore.setState({ cutscene: true, cinema: true, label: null });
      live.moment = { x: HUT.x, y: HUT.h + 2.5, z: HUT.z, t: 0, dur: 2 + live.cargo.aboard * 0.9 + 2 };
    }
    if (st.end >= 0) {
      const before = st.end;
      st.end += dt;
      // one crate every 0.9 s glides from the rack to the stack by the door
      if (Math.floor(st.end / 0.9) > Math.floor(before / 0.9) && st.end > 1) {
        const from = live.cargoApi?.deliverOne();
        if (!from) st.empty = true;
        if (from) {
          const m = crateMesh() as unknown as Group, k = st.stack++;
          const to = new Vector3(CRATE_STACK.x + (k % 2) * 0.6 - 0.3, kettleGround.height(CRATE_STACK.x, CRATE_STACK.z) + 0.28 + Math.floor(k / 2) * 0.56, CRATE_STACK.z + (Math.floor(k / 2) % 2) * 0.1);
          m.position.set(from.x, from.y, from.z);
          stackGroup.add(m);
          st.flying.push({ m, from: new Vector3(from.x, from.y, from.z), to, t: 0 });
          st.delivered++;
          const lit = Math.min(6, ((useStore.getState().extra.kettleLanterns as number) ?? 0) + 1);
          s.setExtra("kettleLanterns", lit);
        }
      }
      const done = !live.cargoApi || live.cargo.aboard === 0 || st.empty;
      if (done && st.end > 1.5 + st.delivered * 0.9 + 2.5) {
        const lit = (useStore.getState().extra.kettleLanterns as number) ?? 0;
        st.end = -1;
        live.moment = null;
        // the crates still on the mountain wait there for another day
        s.setExtra("kettleLoose", live.cargoApi?.loose() ?? []);
        useStore.setState({ cutscene: false });
        if (journey) {
          const n = st.delivered;
          s.setExtra("endingLine", n >= 6 ? ENDING_LINES.all : n >= 3 ? ENDING_LINES.some(n) : ENDING_LINES.few);
          s.finishJourney();
        } else {
          useStore.setState({ cinema: false });
          st.keeperLabel = { text: KEEPER_LATER(lit), x: HUT.x, y: HUT.h + 2.6, z: HUT.z };
          st.keeperSaid = t;
          s.writeSave();
        }
      }
    }
    st.flying = st.flying.filter((f) => {
      f.t = Math.min(1, f.t + dt / 0.9);
      const e = easeInOutCubic(f.t);
      f.m.position.lerpVectors(f.from, f.to, e);
      f.m.position.y += Math.sin(e * Math.PI) * 1.2;
      return f.t < 1;
    });

    /* who's talking: one short line above them, while you're stopped nearby */
    let label: typeof s.label = null;
    if (nearTraveler && !s.sitting) label = { text: "Mind the corners with a full rack.", x: TRAVELER.x, y: TRAVELER.y + 2.3, z: TRAVELER.z };
    else if (campNear && playing && !s.sitting && Math.abs(car.speed) < 0.5) label = { text: "Hold E to sit a while", x: campNear.x, y: campNear.y + 1.6, z: campNear.z };
    else if (t - st.keeperSaid < 7) label = st.keeperLabel;
    if (label?.text !== s.label?.text) useStore.setState({ label });
  });

  return (
    <>
      <primitive object={eagle} />
      <primitive object={stackGroup} />
    </>
  );
}

