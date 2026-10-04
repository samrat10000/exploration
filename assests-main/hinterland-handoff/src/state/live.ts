// Per-frame mutable state shared between canvas systems (vehicle, camera, audio, director).
// Deliberately NOT reactive: it changes 60+ times a second and React must never re-render on it.
import { Color, Vector3 } from "three";

export const live = {
  clock: 0,
  car: {
    x: 0, y: 0, z: 0,
    yaw: 0,
    /** signed speed along the heading, m/s (negative = reversing) */
    speed: 0,
    air: false,
    /** seconds spent stopped with no throttle */
    still: 0,
    /** 0..1 engine strain (slope + throttle), drives the engine note */
    load: 0,
    steer: 0,
    yawRate: 0,
    /** forward acceleration, m/s², for body squat/dive */
    accel: 0,
  },
  env: {
    tod: 2.85,
    todTarget: 2.85,
    sunDir: new Vector3(0, 1, 0),
    sunC: new Color(),
    horC: new Color(),
    fogC: new Color(),
    sunI: 1.4,
    hemiSky: new Color(),
    hemiGround: new Color(),
    hemiI: 0.55,
  },
  /** menu <-> chase camera glide, 0..1 */
  trans: { t: 0, dur: 4.6 },
  shake: 0,
  /** which machine is being driven, and how the chase camera frames it */
  vehicle: "rover" as "rover" | "mule" | "skymule" | "glider" | "bus" | "boat" | "tortoise" | "snowcat",
  cam: { dist: 8.6, height: 3.1, posK: 5, yawK: 2.6 },
  /** wheel spin on a slippery surface (0..1), for mud spray */
  spin: 0,
  /** crosswind acceleration, m/s² (world xz) */
  wind: { x: 0, z: 0 },
  /** smoothed sideways acceleration felt in the cab, m/s² (signed: + = pushed right) */
  latAccel: 0,
  /** cargo: share of the rack still strapped down (0..1), worst strap strain, how many are aboard */
  cargo: { load: 0, strain: 0, aboard: 0 },
  /** last place the vehicle sat safely, for no-fail recovery */
  safe: { x: 0, z: 0, yaw: 0 },
  /** a region can offer a better safe point (e.g. the nearest point back along its trail) */
  safePoint: null as null | ((x: number, z: number) => { x: number; z: number; yaw: number }),
  /** which region is loaded (audio and other systems that care) */
  region: "valley" as "valley" | "kettle",
  /** 0..1 how muffled the world sounds (inside cloud) */
  muffle: 0,
  /** 0..1 closeness to a campfire */
  fireNear: 0,
  /** when the horn last sounded (live.clock) */
  honk: -10,
  /** the vehicle is on Kettle Peak's plank bridge */
  onBridge: false,
  /** cargo actions the region can call (unloading at the hut, saving where crates lie) */
  cargoApi: null as null | {
    deliverOne(): { x: number; y: number; z: number } | null;
    loose(): { x: number; y: number; z: number }[];
    /** dev panel: spill every strapped crate / strap a full rack back on */
    dropAll(): void;
    reloadAll(): void;
  },
  /** the region has loose obstacles (rocks, a log) that wheels should ride over */
  obstacles: false,
  /** a short look toward something worth seeing (eagle, the cloud sea); input stays live */
  moment: null as null | { x: number; y: number; z: number; t: number; dur: number },
  /** sitting at a campfire: the camera orbits this point */
  sit: null as null | { x: number; y: number; z: number },
  /** where the next vehicle to mount should appear (vehicle swaps, region changes) */
  spawnAt: null as null | { x: number; z: number; yaw: number },
  /** registered by the vehicle; moves the rover and zeroes its motion */
  teleport: null as null | ((x: number, z: number, yaw: number) => void),
  /** flight (§1.10): how the next Sky Mule starts, and what the flight HUD reads */
  flight: {
    start: "launch" as "launch" | "air" | "landed",
    on: false, storm: 0, turb: 0, slow: 0, hit: 0, flash: 0, warn: 0, band: null as null | [number, number], alt: 0, alt01: 0, goal01: -1, puffs: 3, puffing: false, rising: 0, slowT: 0,
    /** world prompt: hold T on a launch ridge / when landed (0..1 = how long held) */
    prompt: "" as "" | "unfold" | "fold" | "boat" | "ashore", hold: 0, nearLanding: false,
  },
  /** Hut Rounds (§1.11): what the Mule carries, which huts are done this round, the visit on screen */
  rounds: { on: false, carried: {} as Record<string, number>, delivered: [] as string[], doneAt: {} as Record<string, number>, prompt: "" as "" | "load" | "hand", hold: 0, note: "", noteT: 0,
    visit: null as null | { hut: string; name: string; keeper: string; line: string; given: string; received: string; stamp: string; emblem: string; colour: string; t: number } },
  /** the bus route (§1.14): what the bus HUD reads */
  bus: { on: false, seats: [] as number[], next: "", then: [] as string[], line: "", lineT: 0, prompt: false, hold: 0 },
  /** make camp (§1.12): prompt + what the camp is doing */
  camp: { forecast: false, prompt: false, hold: 0, lantern: false, cookT: 0, line: "", lineT: 0 },
  /** grapple winch (§1.9) */
  winch: { aiming: false, target: -1, state: "idle" as "idle" | "flying" | "latched", anchor: -1, t: 0, length: 0, tension: 0 },
  /** dev panel (F3) overrides and readouts; only dev builds ever change these */
  /** post-processing values (ART §3); the dev panel edits these */
  post: { on: true, exposure: 1, bloom: 0.35, ao: 1.4, aoRadius: 1.6, vignette: 0.28, sat: 0.92 },
  dev: {
    panel: false, freeCam: false, colliders: false, spline: false, triggers: false, slow: false, hideUi: false,
    /** fixed time of day, or null to follow the journey */
    tod: null as number | null,
    weather: null as null | "clear" | "fog" | "snow",
    stats: { fps: 0, ms: 0, calls: 0, tris: 0 },
    /** put the free camera at `from`, looking at `to` (consumed once) */
    look: null as null | { from: [number, number, number]; to: [number, number, number] },
  },
};
