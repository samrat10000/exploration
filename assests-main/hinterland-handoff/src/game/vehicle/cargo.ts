// Cargo on a rack (JOURNEYS §1.2). Each crate is held by a soft strap: it shrugs off gentle
// driving, wobbles and creaks under hard cornering or bumps, and breaks if the strain keeps
// building. A loose crate is a real Rapier body that stays where it lands; drive alongside it
// slowly and hold E to lift it back (a 0.8 s smooth lerp, no physics). Off a cliff, it's gone.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useRapier, type RapierRigidBody } from "@react-three/rapier";
import { Group, Object3D, Quaternion, Vector3 } from "three";
import { crateModel } from "./cargo/CrateModel";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { easeInOutCubic, hash } from "../../utils/noise";
import { input } from "./input";
import type { StepInfo } from "./useVehicle";

/** on the rack, fallen off, gone for good, never loaded, or handed over at the hut */
export type CrateStatus = "on" | "off" | "lost" | "empty" | "delivered";
export const CRATE = 0.55;

/** strap tuning: the felt acceleration (m/s²) a strap tolerates before it starts to give */
const STRAP = { cap: 14, hold: 6.0, build: 1.6, relax: 0.5, topLayer: 0.88, bumpOver: 9, liftDist: 3, liftSpeed: 2, liftTime: 0.8 };

interface Crate {
  status: CrateStatus;
  strain: number;
  strength: number;
  slot: Vector3;
  top: boolean;
  mesh: Object3D;
  body: RapierRigidBody | null;
  /** lifting back onto the rack: 0..1, or -1 */
  lift: number;
  from: { p: Vector3; q: Quaternion };
}

let crateSeed = 0;
/** a crate model; the collider stays a CRATE cube */
export const crateMesh = (): Object3D => crateModel(CRATE, ++crateSeed % 9 + 1);

/**
 * @param slots crate positions in the rack's local frame
 * @param rack  the group the strapped crates ride in (it leans with the body)
 * @param loose a world-space group for crates that have come off
 */
export interface CargoOpts { aboard?: number; looseAt?: { x: number; y: number; z: number }[] }

export function useCargo(slots: Vector3[], rack: Group, loose: Group, opts: CargoOpts = {}) {
  const { world, rapier } = useRapier();
  const crates = useMemo<Crate[]>(() => slots.map((slot, i) => {
    const mesh = crateMesh();
    mesh.position.copy(slot);
    mesh.rotation.y = (hash(i, 3) - 0.5) * 0.12;
    rack.add(mesh);
    const aboard = opts.aboard ?? slots.length, looseN = opts.looseAt?.length ?? 0;
    const status: CrateStatus = i < aboard ? "on" : i < aboard + looseN ? "off" : "empty";
    if (status === "empty") mesh.visible = false;
    return { status, strain: 0, strength: 0.86 + hash(i, 7) * 0.28, slot, top: slot.y > 1.3, mesh, body: null, lift: -1, from: { p: new Vector3(), q: new Quaternion() } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [slots, rack]);

  const publish = () => {
    const status = crates.filter((c) => c.status === "on" || c.status === "off" || c.status === "lost").map((c) => (c.lift >= 0 ? "on" : c.status)) as ("on" | "off" | "lost")[];
    const aboard = status.filter((s) => s === "on").length;
    live.cargo.load = aboard / slots.length;
    live.cargo.aboard = aboard;
    useStore.setState({ crates: status.length ? status : null, cratesChanged: performance.now() });
  };

  useEffect(() => {
    // crates already lying on the mountain (wander): real bodies where they were left
    const looseCrates = crates.filter((c) => c.status === "off");
    looseCrates.forEach((c, k) => {
      const p = opts.looseAt![k];
      loose.add(c.mesh);
      c.mesh.position.set(p.x, p.y, p.z);
      c.body = world.createRigidBody(rapier.RigidBodyDesc.dynamic().setTranslation(p.x, p.y + 0.1, p.z).setCcdEnabled(true)) as unknown as RapierRigidBody;
      world.createCollider(rapier.ColliderDesc.cuboid(CRATE / 2, CRATE / 2, CRATE / 2).setDensity(80).setFriction(0.8), c.body as never);
    });
    live.cargoApi = {
      deliverOne() {
        const c = [...crates].reverse().find((k) => k.status === "on" && k.lift < 0);
        if (!c) return null;
        c.mesh.getWorldPosition(wp);
        c.status = "delivered"; c.mesh.visible = false;
        publish();
        return { x: wp.x, y: wp.y, z: wp.z };
      },
      loose: () => crates.filter((k) => k.status === "off" && k.body).map((k) => { const p = k.body!.translation(); return { x: p.x, y: p.y, z: p.z }; }),
      dropAll() {
        crates.filter((k) => k.status === "on" && k.lift < 0).forEach(release);
        publish();
      },
      reloadAll() {
        for (const k of crates) {
          if (k.body) { world.removeRigidBody(k.body); k.body = null; }
          rack.add(k.mesh);
          k.mesh.position.copy(k.slot); k.mesh.quaternion.identity(); k.mesh.visible = true;
          k.status = "on"; k.lift = -1; k.strain = 0;
        }
        publish();
      },
    };
    publish();
    if (import.meta.env.DEV) Object.assign(window, { __cargo: crates }); // playtest hook
    return () => {
      for (const c of crates) if (c.body) world.removeRigidBody(c.body);
      live.cargo.load = 0; live.cargo.aboard = 0; live.cargo.strain = 0; live.cargoApi = null;
      useStore.setState({ crates: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crates, world]);

  const wp = new Vector3(), wq = new Quaternion();
  const release = (c: Crate) => {
    c.mesh.getWorldPosition(wp);
    c.mesh.getWorldQuaternion(wq);
    loose.add(c.mesh);
    c.mesh.position.copy(wp);
    c.mesh.quaternion.copy(wq);
    // it carries on at the speed the vehicle was going, and a little outward
    const sp = live.car.speed, yaw = live.car.yaw, push = live.latAccel * 0.12;
    const vx = -Math.sin(yaw) * sp + Math.cos(yaw) * push, vz = -Math.cos(yaw) * sp - Math.sin(yaw) * push;
    const body = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic().setTranslation(wp.x, wp.y, wp.z).setRotation(wq).setLinvel(vx, 1, vz)
        .setAngvel({ x: (hash(c.strength, 1) - 0.5) * 3, y: (hash(c.strength, 2) - 0.5) * 2, z: (hash(c.strength, 3) - 0.5) * 3 })
        .setLinearDamping(0.1).setAngularDamping(0.4).setCcdEnabled(true)
    );
    world.createCollider(rapier.ColliderDesc.cuboid(CRATE / 2, CRATE / 2, CRATE / 2).setDensity(80).setFriction(0.8).setRestitution(0.08), body);
    c.body = body as unknown as RapierRigidBody;
    c.status = "off";
    c.strain = 0;
  };

  /** physics step: straps feel what the cab feels */
  const onStep = (s: StepInfo) => {
    let worst = 0, changed = false;
    if (!s.live && !s.rolled) return;
    const bump = Math.max(0, Math.abs(s.vert - 24) - STRAP.bumpOver);
    // capped, so a single jolt can only add so much: straps give way to sustained force
    // the plank bridge bounces the rack above 5 m/s; crosswind gusts shove it
    const sp = Math.abs(live.car.speed), bridge = live.onBridge && sp > 5 ? (sp - 5) * 2.5 : 0;
    const eff = Math.min(STRAP.cap, Math.hypot(s.lat, s.long * 0.6) + bump * 0.45 + bridge + Math.hypot(live.wind.x, live.wind.z) * 0.8);
    if (import.meta.env.DEV) {
      const d = ((window as unknown as { __felt?: { lat: number; long: number; vert: number; eff: number } }).__felt ??= { lat: 0, long: 0, vert: 0, eff: 0 });
      d.lat = Math.max(d.lat, Math.abs(s.lat)); d.long = Math.max(d.long, Math.abs(s.long)); d.vert = Math.max(d.vert, Math.abs(s.vert - 24)); d.eff = Math.max(d.eff, eff);
    }
    for (const c of crates) {
      if (c.status !== "on" || c.lift >= 0) continue;
      const hold = STRAP.hold * c.strength * (c.top ? STRAP.topLayer : 1);
      c.strain = eff > hold ? c.strain + (eff - hold) * s.dt * STRAP.build : Math.max(0, c.strain - s.dt * STRAP.relax);
      if (c.strain > 1 || s.rolled) { release(c); changed = true; }
      else worst = Math.max(worst, c.strain);
    }
    live.cargo.strain = worst;
    if (changed) publish();
  };

  useFrame((_, dt) => {
    const t = live.clock;
    let changed = false;
    for (const c of crates) {
      if (c.status === "on" && c.lift < 0) {
        // strapped: a wobble that grows with strain
        const w = c.strain * 0.06;
        c.mesh.position.set(c.slot.x + Math.sin(t * 23 + c.strength * 9) * w, c.slot.y + Math.abs(Math.sin(t * 17 + c.strength * 5)) * w * 0.6, c.slot.z);
        c.mesh.rotation.z = Math.sin(t * 19 + c.strength * 3) * c.strain * 0.08;
      } else if (c.status === "off" && c.body) {
        const p = c.body.translation(), r = c.body.rotation();
        c.mesh.position.set(p.x, p.y, p.z);
        c.mesh.quaternion.set(r.x, r.y, r.z, r.w);
        // off a cliff: gone for good
        if (p.y < Math.min(-6, live.car.y - 30)) {
          world.removeRigidBody(c.body); c.body = null; c.status = "lost"; c.mesh.visible = false; changed = true;
        }
      } else if (c.lift >= 0) {
        // lifting back: world-space lerp onto the slot, then strap it down again
        c.lift = Math.min(1, c.lift + dt / STRAP.liftTime);
        rack.updateWorldMatrix(true, false);
        const to = wp.copy(c.slot).applyMatrix4(rack.matrixWorld), e = easeInOutCubic(c.lift);
        c.mesh.position.copy(c.from.p).lerp(to, e);
        c.mesh.position.y += Math.sin(e * Math.PI) * 0.9; // a gentle arc up and over the side
        rack.getWorldQuaternion(wq);
        c.mesh.quaternion.copy(c.from.q).slerp(wq, e);
        if (c.lift >= 1) {
          rack.add(c.mesh);
          c.mesh.position.copy(c.slot);
          c.mesh.quaternion.identity();
          c.lift = -1; c.status = "on"; c.strain = 0; changed = true;
        }
      }
    }
    // hold E beside a fallen crate, nearly stopped: lift the nearest one back
    if (input.action && Math.abs(live.car.speed) < STRAP.liftSpeed && !crates.some((c) => c.lift >= 0) && useStore.getState().phase === "play") {
      let best: Crate | null = null, bd = STRAP.liftDist;
      for (const c of crates) {
        if (c.status !== "off" || !c.body) continue;
        const p = c.body.translation(), d = Math.hypot(p.x - live.car.x, p.z - live.car.z) - 1.2; // measured from the rack's side
        if (d < bd) { bd = d; best = c; }
      }
      if (best && best.body) {
        best.from.p.copy(best.mesh.position);
        best.from.q.copy(best.mesh.quaternion);
        world.removeRigidBody(best.body);
        best.body = null;
        best.lift = 0;
      }
    }
    if (changed) publish();
  });

  return onStep;
}
