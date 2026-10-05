// Driving input: keyboard (WASD / arrows / Space) + the touch stick. Read once per physics step.
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp } from "../../utils/noise";

const keys = new Set<string>();
let prevE = false, prevT = false, latchE = 0, latchT = 0;
export const touch = { steer: 0, throttle: 0, brake: false, action: false };
export const input = { throttle: 0, steer: 0, brake: false, /** E held: lift a crate back */ action: false, /** T held: unfold / fold the Sky Kit */ wings: false };

const DRIVE = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyE", "KeyT"];

export function attachDriveInput() {
  const down = (e: KeyboardEvent) => {
    if (!DRIVE.includes(e.code)) return;
    if (useStore.getState().phase !== "play") return;
    keys.add(e.code);
    e.preventDefault();
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const clear = () => keys.clear();
  addEventListener("keydown", down);
  addEventListener("keyup", up);
  addEventListener("blur", clear);
  return () => {
    removeEventListener("keydown", down);
    removeEventListener("keyup", up);
    removeEventListener("blur", clear);
  };
}

export function clearDriveInput() {
  keys.clear();
  touch.steer = touch.throttle = 0; touch.brake = touch.action = false;
}

/** Updates `input`; returns true when the player is touching any control. */
export function readInput() {
  // the dev free camera borrows WASD; the vehicle sits still meanwhile
  const k = (c: string) => keys.has(c) && !live.dev.freeCam && !useStore.getState().photo;
  const up = k("KeyW") || k("ArrowUp"), dn = k("KeyS") || k("ArrowDown"), lf = k("KeyA") || k("ArrowLeft"), rt = k("KeyD") || k("ArrowRight");
  const still = useStore.getState().photo;
  input.throttle = still ? 0 : clamp((up ? 1 : 0) - (dn ? 1 : 0) + touch.throttle, -1, 1);
  input.steer = still ? 0 : clamp((lf ? 1 : 0) - (rt ? 1 : 0) + touch.steer, -1, 1);
  input.brake = k("Space") || touch.brake;
  // tap mode: one press of E / T carries the whole ring (2.2 s) instead of being held
  const tap = useStore.getState().settings.holdMode === "tap", now = performance.now();
  const e = k("KeyE") || touch.action, w = k("KeyT");
  if (tap) { if (e && !prevE) latchE = now + 2200; if (w && !prevT) latchT = now + 1500; }
  prevE = e; prevT = w;
  input.action = tap ? now < latchE : e;
  input.wings = tap ? now < latchT : w;
  return input.throttle !== 0 || input.steer !== 0 || input.brake;
}
