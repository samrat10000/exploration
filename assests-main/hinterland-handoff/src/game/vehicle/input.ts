// Driving input: keyboard (WASD / arrows / Space) + the touch stick. Read once per physics step.
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp } from "../../utils/noise";

const keys = new Set<string>();
export const touch = { steer: 0, throttle: 0 };
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
  touch.steer = touch.throttle = 0;
}

/** Updates `input`; returns true when the player is touching any control. */
export function readInput() {
  // the dev free camera borrows WASD; the vehicle sits still meanwhile
  const k = (c: string) => keys.has(c) && !live.dev.freeCam;
  const up = k("KeyW") || k("ArrowUp"), dn = k("KeyS") || k("ArrowDown"), lf = k("KeyA") || k("ArrowLeft"), rt = k("KeyD") || k("ArrowRight");
  input.throttle = clamp((up ? 1 : 0) - (dn ? 1 : 0) + touch.throttle, -1, 1);
  input.steer = clamp((lf ? 1 : 0) - (rt ? 1 : 0) + touch.steer, -1, 1);
  input.brake = k("Space");
  input.action = k("KeyE");
  input.wings = k("KeyT");
  return input.throttle !== 0 || input.steer !== 0 || input.brake;
}
