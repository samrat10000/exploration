// Per-frame game rules that aren't physics or rendering: the clock, journey progress (which drives
// time of day), autosave, hint and objective pacing, discoveries, endings, and the soundscape.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { live } from "../state/live";
import { useStore } from "../state/store";
import { mix } from "../utils/noise";
import { audio } from "./audio/audio";
import { placeAt } from "./exploration/discoveries";
import { journey, routeProgress } from "./journeys/journeys";
import { input } from "./vehicle/input";

const CARD_SECONDS = 7, AUTOSAVE_SECONDS = 5, HINT_SECONDS = 12;

export function Director() {
  const t = useRef({ play: 0, save: 0, hint: 0, card: 0, leap: 0 }).current;

  // runs first every frame so everything else sees the same clock
  useFrame((_, dt) => { live.clock += dt; }, -60);

  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, j = journey(s.journey);
    if (s.phase === "intro") { t.play = 0; t.hint = 0; }

    // a journey's light follows how far along the route you are, never the clock
    if (s.mode === "journey" && (s.phase === "play" || s.phase === "intro")) {
      if (s.phase === "play") {
        const p = j.progressAt ? j.progressAt(car.x, car.z) : j.route ? routeProgress(j.route, car.x, car.z) : null;
        // small steps count at once; a big leap (a shortcut up the slope) only once it has held for
        // 2 s, so a one-frame glitch (teleport interpolation) can never push the day to sunset
        if (p !== null) {
          if (p <= s.progress + 0.02) { s.setProgress(p); t.leap = 0; }
          else if ((t.leap += dt) > 2) { s.setProgress(p); t.leap = 0; }
        }
      }
      live.env.todTarget = Math.max(mix(j.tod.from, j.tod.to, useStore.getState().progress), useStore.getState().todFloor);
    }

    live.region = s.region;
    if (s.phase === "play") {
      t.play += dt;
      t.save += dt;
      if (t.save > AUTOSAVE_SECONDS) { t.save = 0; s.writeSave(); }
      if (input.throttle || input.steer || input.brake) t.hint += dt;
      if (t.hint > HINT_SECONDS && s.hints) useStore.setState({ hints: false });
      // the objective breathes with motion: gone while you drive, back when you stop
      if (t.play < 8) s.setObjMode("fresh");
      else s.setObjMode(Math.abs(car.speed) > 4 ? "quiet" : car.still > 1.5 ? "idle" : s.objMode === "fresh" ? "idle" : s.objMode);
      if (s.region === "valley") {
        const place = placeAt(car.x, car.z, car.speed, car.y);
        if (place) s.discover(place);
        // J1 ends at the light on the ridge
        if (place === "overlook" && s.mode === "journey" && s.journey === "overlook") s.finishJourney();
      }
      // the end screen waits for the discovery card to finish
      if (s.pendingEnd && !useStore.getState().card) useStore.setState({ phase: "ending", pendingEnd: false, cinema: true, hints: false });
    }

    if (s.card) {
      t.card += dt;
      if (t.card > CARD_SECONDS) { t.card = 0; s.closeCard(); }
    } else t.card = 0;

    audio.update(s.phase === "play");
  }, -30);

  return null;
}
