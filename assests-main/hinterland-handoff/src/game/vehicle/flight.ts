// Flight core (JOURNEYS §1.10): glide-first, never a stall-death. Shared by the Sky Mule and (5.2)
// the Rover glider. Pure state + step(); the vehicle component draws it and feeds input.
import { clamp, damp } from "../../utils/noise";
import { POOL, START, VP, groundHeight, height } from "../world/height";
import type { RegionId } from "../journeys/journeys";
import { SKY_MAP } from "../world/sky/sky";

// Numbers are skyroad.js's flight model (the prototype) unless noted.
export const FT = {
  g: 9.8,
  minSpeed: 7, maxSpeed: 42,
  drag: 0.0016,
  /** pitch limits (rad, + = nose up) and the glide attitude it relaxes to */
  pitchUp: 0.32, pitchDown: -0.42, glidePitch: -0.06, pitchK: 2.2,
  /** below this airspeed the nose drops by itself */
  slowSpeed: 12,
  bankMax: 0.62, bankK: 2.6,
  puffs: 3, puffTime: 4, puffThrust: 3.2, puffClimb: 3.5, refill: 10, refillThermal: 2.5,
  /** vertical speed (m/s, down) above which touching ground is a hard hit → recovery */
  hardHit: 9,
};

export interface Thermal { x: number; z: number; r: number; lift: number; top: number }
export interface Launch { x: number; z: number; yaw: number; r: number }
export interface Landing { x: number; z: number; r: number; yaw: number }
/** a flock circling a point at height y */
export interface Flock { x: number; z: number; y: number; r: number; n: number }
/** a storm cell between heights y0 and y1 */
export interface Storm { x: number; z: number; r: number; y0: number; y1: number }
export interface SkyMap { launches: Launch[]; thermals: Thermal[]; landings: Landing[]; flocks: Flock[]; storms: Storm[] }

/** Where you can take off, where the air rises, and where to come down, per region. */
export const SKY: Record<RegionId, SkyMap> = {
  valley: {
    // the Overlook ridge: you launch out over the valley toward the start meadow
    launches: [{ x: VP.x - 4, z: VP.z + 8, yaw: Math.atan2(-(START.x - VP.x), -(START.z - VP.z)), r: 9 }],
    thermals: [
      { x: 40, z: -30, r: 22, lift: 8, top: 170 },
      { x: -60, z: 40, r: 18, lift: 8, top: 150 },
      { x: POOL.x + 30, z: POOL.z - 40, r: 20, lift: 8, top: 190 },
    ],
    landings: [{ x: START.x - 10, z: START.z - 30, r: 8, yaw: Math.atan2(-(START.x - VP.x), -(START.z - VP.z)) }],
    flocks: [{ x: 20, z: 40, y: 58, r: 14, n: 70 }, { x: -50, z: -20, y: 66, r: 12, n: 60 }],
    storms: [{ x: -10, z: 120, r: 60, y0: 40, y1: 140 }],
  },
  kettle: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
  gorge: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
  river: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
  forest: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
  lake: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
  pass: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
  sky: SKY_MAP,
  salt: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
  coast: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
  light: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
  flowers: { launches: [], thermals: [], landings: [], flocks: [], storms: [] },
};

export interface FlightState {
  x: number; y: number; z: number;
  yaw: number; pitch: number; bank: number;
  /** airspeed along the path */
  v: number;
  /** vertical speed (m/s, + up), for contact and the HUD */
  vy: number;
  puffs: number; maxPuffs: number; puffT: number; refillT: number;
  inThermal: number;
  /** seconds spent slow (the one-time hint) */
  slowT: number;
  onGround: boolean;
  /** set for one step when a touchdown was hard (recovery) */
  hard: boolean;
  /** last thermal (or launch) to recover to */
  safe: { x: number; y: number; z: number; yaw: number };
}

export function newFlight(x: number, y: number, z: number, yaw: number, v = 16): FlightState {
  return { x, y, z, yaw, pitch: -0.05, bank: 0, v, vy: 0, puffs: FT.puffs, maxPuffs: FT.puffs, puffT: 0, refillT: 0, inThermal: 0, slowT: 0, onGround: false, hard: false, safe: { x, y, z, yaw } };
}

export function thermalLift(map: SkyMap, x: number, y: number, z: number) {
  let w = 0;
  for (const t of map.thermals) {
    const d = Math.hypot(x - t.x, z - t.z);
    if (d < t.r && y < t.top) w = Math.max(w, t.lift * (1 - (d / t.r) ** 2) * clamp((t.top - y) / 30, 0, 1));
  }
  return w;
}

/**
 * Advance one step. pitchIn: +1 nose down (W), −1 nose up (S); bankIn: +1 left (A); puff: Space pressed this step.
 * Returns "ok", "touch" (soft bounce), "land" (settled on the ground) or "hard" (recovery).
 */
export function stepFlight(s: FlightState, map: SkyMap, dt: number, pitchIn: number, bankIn: number, puff: boolean, flare = false, turb = 0) {
  s.hard = false;
  // controls: pitch and bank ease toward the stick, and back to a calm glide when let go
  let wantPitch = pitchIn ? (pitchIn > 0 ? FT.pitchDown : FT.pitchUp) : FT.glidePitch;
  // too slow: the nose drops by itself (no stall, no spin)
  const slow = s.v < FT.slowSpeed;
  if (slow) wantPitch = Math.min(wantPitch, (-0.18 * (FT.slowSpeed - s.v)) / 4);
  s.pitch += (wantPitch - s.pitch) * damp(FT.pitchK, dt);
  s.bank += (bankIn * FT.bankMax - s.bank) * damp(FT.bankK, dt);
  // speed: gravity along the path, drag, puff thrust
  if (puff && s.puffs > 0 && s.puffT <= 0) { s.puffs--; s.puffT = FT.puffTime; }
  const thrust = s.puffT > 0 ? FT.puffThrust : 0;
  s.puffT = Math.max(0, s.puffT - dt);
  s.v += (-FT.g * Math.sin(s.pitch) * 0.9 - FT.drag * s.v * s.v + thrust) * dt;
  // rolling on the ground: friction, and no minimum (so it can come to rest)
  if (s.onGround) s.v *= Math.exp(-0.9 * dt);
  s.v = clamp(s.v, s.onGround ? 0 : FT.minSpeed, FT.maxSpeed);
  // turning from bank
  s.yaw += s.bank * 0.8 * clamp(s.v / 20, 0.6, 1.2) * dt;
  // vertical: the path, a steady sink, banking costs height, rising air (and the puff lifts too), storm turbulence
  s.inThermal = thermalLift(map, s.x, s.y, s.z);
  s.vy = Math.min(9, s.v * Math.sin(s.pitch) * 0.75 - 0.9 - s.bank * s.bank * 2.2 + s.inThermal + (s.puffT > 0 ? FT.puffClimb : 0) + turb);
  // puffs refill slowly, quickly in rising air
  if (s.puffs < s.maxPuffs) {
    s.refillT += dt;
    if (s.refillT > (s.inThermal > 0.5 ? FT.refillThermal : FT.refill)) { s.refillT = 0; s.puffs++; }
  }
  if (s.inThermal > 1) s.safe = { x: s.x, y: s.y + 10, z: s.z, yaw: s.yaw };
  s.slowT = slow ? s.slowT + dt : 0;
  // move
  const h = s.v * Math.cos(s.pitch);
  s.x += -Math.sin(s.yaw) * h * dt;
  s.z += -Math.cos(s.yaw) * h * dt;
  s.y += s.vy * dt;
  // ground: a soft bounce and auto-level, a gentle settle, or (hard) a no-fail recovery
  const gy = groundHeight(s.x, s.z) + 0.05;
  s.onGround = false;
  if (s.y <= gy) {
    s.onGround = true;
    const down = -s.vy;
    s.y = gy;
    if (down > FT.hardHit && !flare) { s.hard = true; return "hard"; }
    s.pitch = Math.max(s.pitch, 0);
    s.bank *= 0.5;
    if (flare || s.v < 11) { s.v *= Math.exp(-(flare ? 1.6 : 2.4) * dt); s.vy = 0; return s.v < 3 ? "land" : "touch"; }
    s.vy = down * 0.25; // a little bounce
    s.v *= Math.exp(-5 * dt); // skimming the ground sheds speed by time, not by frame (was 0.92 per step)
    return "touch";
  }
  return "ok";
}

/** Height above the ground at the flight position (for the ribbon and approach lights). */
export const agl = (s: FlightState) => s.y - height(s.x, s.z);
