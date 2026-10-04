// Vehicle feel targets (CLAUDE.md §4). Priority: control > responsiveness > stability > believability > realism.
export const T = {
  gravity: 24, // snappier than real

  // longitudinal (m/s, m/s²)
  accel: 10.5,
  maxForward: 21,
  maxWater: 9,
  maxReverse: 7,
  reverseAccel: 6,
  brake: 26,
  /** pressing forward while rolling backwards (and vice versa) */
  turnaround: 22,
  turnaroundBack: 20,
  coast: 0.85,
  waterDrag: 1.1,
  overspeedDrag: 1.2,
  /** uphill drag = slope × 9.8 × 0.45 (forgiving) */
  slopeDrag: 9.8 * 0.45,
  holdSlope: 0.4,
  holdSpeed: 0.6,

  // steering
  steerRate: 1.55,
  gripSpeed: 5,
  /** steering grip available from throttle alone (pivoting off obstacles at a standstill) */
  pushGrip: 0.3,
  topSpeedSteerCut: 0.4,
  inputK: 7,
  airSteer: 0.25,
  /** how fast sideways slip is killed (higher = more grip) */
  lateralGrip: 14,
  yawFollow: 12,

  // suspension, per unit mass (near critical: settles without wobble)
  springK: 90,
  springC: 17,
  restLength: 0.65,
  minLength: 0.08,

  // geometry
  wheelRadius: 0.46,
  wheelbase: 2.7,
  track: 1.9,
  mass: 1200,
  /** low centre of mass keeps it planted; it should never feel tippy */
  comY: 0.55,
};

/** Wheel suspension top, so the wheel centre rests at its radius when the springs carry the weight. */
export const ANCHOR_Y = T.wheelRadius + T.restLength - T.gravity / T.springK;
export const WHEELS: [number, number][] = [
  [-T.track / 2, -T.wheelbase / 2], [T.track / 2, -T.wheelbase / 2],
  [-T.track / 2, T.wheelbase / 2], [T.track / 2, T.wheelbase / 2],
];

/* ---------- vehicle specs: one controller, different machines ---------- */
export type Tuning = typeof T;
export interface VehicleSpec {
  id: "rover" | "mule" | "bus" | "tortoise" | "snowcat";
  T: Tuning;
  wheels: [number, number][];
  anchorY: number;
  /** front wheel steer angle at full lock (visual) */
  steerVisual: number;
  /** chase camera */
  cam: { dist: number; height: number; posK: number; yawK: number };
  /** tippiness (Mule): lateral accel (m/s²) that lifts the inside wheel / rolls it; a full rack lowers both */
  tip?: { lean: number; roll: number; leanLoaded: number; rollLoaded: number };
  /** speed cap that drops when loaded and climbing (Mule: 13 → 8) */
  loadedUphillMax?: number;
  /** tracks: full grip on snow and mud, and heavy enough to ignore crosswind */
  tracked?: boolean;
  /** no-fail recovery (JOURNEYS §1.3) instead of the Rover's quiet self-righting */
  recover?: boolean;
}

export const ROVER: VehicleSpec = {
  id: "rover", T, wheels: WHEELS, anchorY: ANCHOR_Y, steerVisual: 0.42,
  cam: { dist: 8.6, height: 3.1, posK: 5, yawK: 2.6 },
};

/** The Mule (JOURNEYS §2.1): slow, torquey, tippy, carries cargo. */
export const MT: Tuning = {
  ...T,
  accel: 6, maxForward: 13, maxWater: 6, maxReverse: 5, reverseAccel: 4, brake: 18,
  turnaround: 14, turnaroundBack: 13, coast: 1.1,
  steerRate: 1.9, gripSpeed: 4, topSpeedSteerCut: 0.55, inputK: 6, lateralGrip: 12,
  restLength: 0.45, wheelRadius: 0.32, wheelbase: 2.2, track: 1.25, mass: 600, comY: 0.62,
};
const MULE_ANCHOR = MT.wheelRadius + MT.restLength - MT.gravity / MT.springK;
export const MULE: VehicleSpec = {
  id: "mule", T: MT, anchorY: MULE_ANCHOR, steerVisual: 0.55,
  wheels: [[0, -MT.wheelbase / 2], [-MT.track / 2, MT.wheelbase / 2], [MT.track / 2, MT.wheelbase / 2]],
  cam: { dist: 7.2, height: 2.8, posK: 4, yawK: 2.0 },
  tip: { lean: 5.5, roll: 7.5, leanLoaded: 4.4, rollLoaded: 6.2 },
  loadedUphillMax: 8,
  recover: true,
};

/** The Loaf (JOURNEYS §2, §1.14): long and slow, wide turns, very stable; passengers notice bumps. */
export const BT: Tuning = {
  ...T,
  accel: 4.2, maxForward: 12, maxWater: 4, maxReverse: 4, reverseAccel: 3, brake: 14,
  turnaround: 10, turnaroundBack: 9, coast: 0.7,
  steerRate: 1.0, gripSpeed: 4, topSpeedSteerCut: 0.5, inputK: 5, lateralGrip: 16,
  restLength: 0.55, wheelRadius: 0.5, wheelbase: 4.6, track: 2.0, mass: 3600, comY: 0.7,
};
const BUS_ANCHOR = BT.wheelRadius + BT.restLength - BT.gravity / BT.springK;
export const BUS: VehicleSpec = {
  id: "bus", T: BT, anchorY: BUS_ANCHOR, steerVisual: 0.5,
  wheels: [[-BT.track / 2, -BT.wheelbase / 2 + 0.05], [BT.track / 2, -BT.wheelbase / 2 + 0.05], [-BT.track / 2, BT.wheelbase / 2 - 0.05], [BT.track / 2, BT.wheelbase / 2 - 0.05]],
  cam: { dist: 12.5, height: 4.2, posK: 3.5, yawK: 1.8 },
};

/** The Tortoise (JOURNEYS §2): a tiny round camper; slow, comfy, no hurry. */
export const TT: Tuning = {
  ...T,
  accel: 4.5, maxForward: 10, maxWater: 4, maxReverse: 4, reverseAccel: 3, brake: 16,
  turnaround: 11, turnaroundBack: 10, coast: 0.8,
  steerRate: 1.5, gripSpeed: 4, topSpeedSteerCut: 0.45, inputK: 6, lateralGrip: 15,
  restLength: 0.5, wheelRadius: 0.36, wheelbase: 2.2, track: 1.64, mass: 1300, comY: 0.6,
};
const TORT_ANCHOR = TT.wheelRadius + TT.restLength - TT.gravity / TT.springK;
export const TORTOISE: VehicleSpec = {
  id: "tortoise", T: TT, anchorY: TORT_ANCHOR, steerVisual: 0.45,
  wheels: [[-TT.track / 2, -1.15], [TT.track / 2, -1.15], [-TT.track / 2, 1.05], [TT.track / 2, 1.05]],
  cam: { dist: 8, height: 3, posK: 4, yawK: 2.2 },
};

/** The Snowcat (JOURNEYS §2.2): heavy, never slides, turns wide, max 9 m/s; tows a sled. */
export const ST: Tuning = {
  ...T,
  accel: 4, maxForward: 9, maxWater: 3, maxReverse: 4, reverseAccel: 3, brake: 20,
  turnaround: 9, turnaroundBack: 8, coast: 1.6,
  steerRate: 0.9, gripSpeed: 2, pushGrip: 0.6, topSpeedSteerCut: 0.3, inputK: 5, lateralGrip: 30,
  restLength: 0.4, wheelRadius: 0.45, wheelbase: 2.4, track: 2.1, mass: 4200, comY: 0.7,
};
const CAT_ANCHOR = ST.wheelRadius + ST.restLength - ST.gravity / ST.springK;
export const SNOWCAT: VehicleSpec = {
  id: "snowcat", T: ST, anchorY: CAT_ANCHOR, steerVisual: 0, tracked: true,
  wheels: [[-ST.track / 2, -ST.wheelbase / 2], [ST.track / 2, -ST.wheelbase / 2], [-ST.track / 2, ST.wheelbase / 2], [ST.track / 2, ST.wheelbase / 2]],
  cam: { dist: 11, height: 4, posK: 3.5, yawK: 1.8 },
};
