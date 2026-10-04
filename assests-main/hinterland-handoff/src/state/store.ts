// Game + UI state shared between the DOM HUD and the canvas.
import { create } from "zustand";
import { live } from "./live";
import { SET_KEY, emptySave, loadSave, storage, writeSaveV2, type Postcard, type SaveV2 } from "./save";
import { PLACES, type PlaceId } from "../game/exploration/discoveries";
import { journey, type JourneyId, type RegionId, type VehicleId } from "../game/journeys/journeys";
import { audio } from "../game/audio/audio";
import { clamp } from "../utils/noise";
import { setGround, valleyGround } from "../game/world/height";
import { kettleGround, safePointNear } from "../game/world/kettle/kettle";

const REGION_NAME: Record<RegionId, string> = { valley: "The valley", kettle: "Kettle Peak" };

export type Phase = "loading" | "menu" | "intro" | "play" | "paused" | "ending" | "outro" | "exit";
export type Quality = "low" | "medium" | "high" | "ultra";
export type ObjMode = "fresh" | "quiet" | "idle";
export type Mode = "journey" | "wander";

export interface Settings {
  quality: Quality;
  master: number;
  amb: number;
  eng: number;
  motion: "full" | "calm";
}

export const QUALITY: Record<Quality, { pr: number; shadow: number; grass: number; fog: number; terrainSeg: number }> = {
  low:    { pr: 0.75, shadow: 0,    grass: 26000,  fog: 0.0042, terrainSeg: 220 },
  medium: { pr: 1.25, shadow: 1024, grass: 60000,  fog: 0.0034, terrainSeg: 300 },
  high:   { pr: 1.75, shadow: 2048, grass: 110000, fog: 0.0028, terrainSeg: 400 },
  ultra:  { pr: 2,    shadow: 4096, grass: 170000, fog: 0.0024, terrainSeg: 480 },
};

export const isTouch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
const prefersCalm = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Store {
  phase: Phase;
  settings: Settings;
  /** last written save (null until there is one) */
  save: SaveV2 | null;
  // progress across the whole game
  found: PlaceId[];
  postcards: Postcard[];
  done: JourneyId[];
  rewards: string[];
  paint: { rover: number; mule: number };
  extra: Record<string, unknown>;
  // the current session
  journey: JourneyId;
  mode: Mode;
  region: RegionId;
  vehicle: VehicleId;
  /** 0..1 along the journey's route; only ever moves forward */
  progress: number;
  // ui
  veil: boolean;
  /** no-fail recovery: the screen dips to 40% black while the vehicle is set back */
  fade: boolean;
  /** Begin/Continue was pressed: menus fade while the cut or glide starts */
  starting: boolean;
  veilText: string;
  cinema: boolean;
  settingsOpen: boolean;
  settingsFrom: "menu" | "pause";
  atlasOpen: boolean;
  /** open the Atlas once the outro glide reaches the title */
  atlasAfterOutro: boolean;
  /** journey whose route should draw itself on next time the Atlas opens */
  justFinished: JourneyId | null;
  card: { name: string; line: string } | null;
  /** a journey ended: show the end screen once the discovery card has gone */
  pendingEnd: boolean;
  objMode: ObjMode;
  /** a scripted moment (unloading at the hut): the vehicle is parked, input ignored */
  cutscene: boolean;
  /** sitting at a campfire */
  sitting: boolean;
  /** sitting at your own camp (Tortoise), not a campfire */
  camping: boolean;
  /** a line spoken by someone in the world (shown above them) */
  label: { text: string; x: number; y: number; z: number } | null;
  /** "Wait until golden hour" was chosen at a campfire */
  waitRequested: boolean;
  /** campfire waits can push the day forward; a journey's light never drops below this */
  todFloor: number;
  /** crates on the rack (null when the vehicle carries none), and when that last changed */
  crates: ("on" | "off" | "lost")[] | null;
  cratesChanged: number;
  hints: boolean;
  hintsHidden: boolean;

  setSettings(p: Partial<Settings>): void;
  writeSave(): void;
  toMenu(): void;
  startJourney(id: JourneyId, mode: Mode, resume?: boolean): void;
  continueGame(): void;
  handoff(): void;
  pause(): void;
  resume(): void;
  toTitle(): void;
  openSettings(from: "menu" | "pause"): void;
  closeSettings(): void;
  openAtlas(): void;
  closeAtlas(): void;
  discover(id: PlaceId): void;
  closeCard(): void;
  setProgress(p: number): void;
  finishJourney(): void;
  endChoice(c: "atlas" | "stay"): void;
  setPaint(v: "rover" | "mule", i: number): void;
  setExtra(key: string, value: unknown): void;
  exit(): void;
  setObjMode(m: ObjMode): void;
  /** dev only: swap Rover <-> Mule where you stand */
  devSwapVehicle(): void;
  toggleHints(): void;
}

const initial = loadSave();
const s0 = initial ?? emptySave();
if (s0.session?.region === "kettle") { setGround(kettleGround); live.safePoint = safePointNear; }

export const useStore = create<Store>((set, get) => ({
  phase: "loading",
  settings: {
    quality: isTouch ? "medium" : "high", master: 80, amb: 80, eng: 60, motion: prefersCalm ? "calm" : "full",
    ...(storage.get<Partial<Settings>>(SET_KEY) ?? {}),
  },
  save: initial,
  found: s0.found.filter((id): id is PlaceId => id in PLACES),
  postcards: s0.postcards,
  done: s0.done,
  rewards: s0.rewards,
  paint: s0.paint,
  extra: s0.extra,
  journey: s0.session?.journey ?? "overlook",
  mode: s0.session?.mode ?? "journey",
  region: s0.session?.region ?? "valley",
  vehicle: journey(s0.session?.journey ?? "overlook").vehicle,
  progress: s0.session?.progress ?? 0,
  veil: true,
  fade: false,
  starting: false,
  veilText: "Raising the mountains",
  cinema: true,
  settingsOpen: false,
  settingsFrom: "menu",
  atlasOpen: false,
  atlasAfterOutro: false,
  justFinished: null,
  card: null,
  pendingEnd: false,
  objMode: "fresh",
  cutscene: false,
  sitting: false,
  camping: false,
  waitRequested: false,
  label: null,
  todFloor: 0,
  crates: null,
  cratesChanged: 0,
  hints: false,
  hintsHidden: false,

  setSettings(p) {
    const settings = { ...get().settings, ...p };
    set({ settings });
    storage.set(SET_KEY, settings);
    audio.applyVolumes(settings);
  },

  writeSave() {
    const s = get(), c = live.car;
    const save: SaveV2 = {
      v: 2,
      session: { journey: s.journey, mode: s.mode, region: s.region, x: c.x, z: c.z, yaw: c.yaw, tod: live.env.todTarget, progress: s.progress },
      found: [...s.found], postcards: [...s.postcards], done: [...s.done], rewards: [...s.rewards],
      paint: { ...s.paint }, extra: { ...s.extra }, t: Date.now(),
    };
    writeSaveV2(save);
    set({ save });
  },

  toMenu() {
    const atlas = get().atlasAfterOutro;
    set({ phase: "menu", cinema: true, settingsOpen: false, card: null, hints: false, starting: false, atlasOpen: atlas, atlasAfterOutro: false, pendingEnd: false });
  },

  startJourney(id, mode, resume = false) {
    audio.init(get().settings);
    const j = journey(id), sess = get().save?.session, region = j.region ?? "valley";
    const useSave = resume && sess && sess.journey === id;
    const start = j.start ?? { x: 0, z: 0, yaw: 0 };
    const target = useSave ? { x: sess.x, z: sess.z, yaw: sess.yaw } : start;
    const progress = useSave ? sess.progress : mode === "journey" ? 0 : 1;
    // a journey starts at its own morning; wander keeps whatever light you left
    live.env.todTarget = useSave ? clamp(sess.tod ?? j.tod.from, 0, 4) : mode === "journey" ? j.tod.from : j.tod.to;
    const s = get(), swap = region !== s.region || j.vehicle !== s.vehicle;
    // a fresh run up the mountain starts with no lanterns lit and no crates left behind
    if (id === "longway" && mode === "journey" && !useSave) set({ extra: { ...get().extra, kettleLanterns: 0, kettleLoose: [] } });
    set({ journey: id, mode, progress, settingsOpen: false, atlasOpen: false, starting: true, pendingEnd: false, cutscene: false, sitting: false, label: null, todFloor: 0 });
    const go = () => {
      live.trans.t = 0;
      set({ phase: "intro", veil: false, starting: false });
    };
    const c = live.car;
    if (!swap && Math.hypot(c.x - target.x, c.z - target.z) <= 3 && !resume) {
      live.teleport?.(target.x, target.z, target.yaw);
      go();
      return;
    }
    // cut through black: the world (and vehicle) can change while nobody is looking
    set({ veil: true, veilText: swap && region !== s.region ? REGION_NAME[region] : "" });
    setTimeout(() => {
      if (swap) {
        setGround(region === "kettle" ? kettleGround : valleyGround);
        live.safePoint = region === "kettle" ? safePointNear : null;
        live.spawnAt = target;
        live.teleport = null;
        set({ region, vehicle: j.vehicle });
      }
      // wait until the (new) vehicle has mounted and registered itself
      const ready = () => {
        if (!live.teleport) { setTimeout(ready, 60); return; }
        live.teleport(target.x, target.z, target.yaw);
        setTimeout(go, swap ? 250 : 0);
      };
      ready();
    }, 1150);
  },

  continueGame() {
    const sess = get().save?.session;
    if (sess) get().startJourney(sess.journey, sess.mode, true);
  },

  handoff() {
    set({ phase: "play", cinema: false, objMode: "fresh", hints: !get().hintsHidden && !isTouch });
  },

  pause() {
    if (get().phase !== "play") return;
    get().writeSave();
    set({ phase: "paused", hints: false });
  },

  resume() {
    set({ phase: "play", settingsOpen: false });
  },

  toTitle() {
    get().writeSave();
    live.trans.t = 0;
    set({ phase: "outro", cinema: true, settingsOpen: false, card: null, hints: false });
  },

  openSettings(from) { set({ settingsOpen: true, settingsFrom: from }); },
  closeSettings() { set({ settingsOpen: false }); },
  openAtlas() { set({ atlasOpen: true }); },
  closeAtlas() { set({ atlasOpen: false, justFinished: null }); },

  discover(id) {
    if (get().found.includes(id)) return;
    set({ found: [...get().found, id], postcards: [...get().postcards, { id, tod: live.env.tod }], card: PLACES[id], cinema: true });
    get().writeSave();
  },

  closeCard() {
    const p = get().phase;
    set({ card: null, cinema: p !== "play" && p !== "paused" });
  },

  setProgress(p) {
    if (p > get().progress + 1e-4) set({ progress: Math.min(1, p) });
  },

  finishJourney() {
    const s = get();
    if (s.mode !== "journey" || s.pendingEnd || s.phase === "ending") return;
    // driving a finished journey again still ends it; rewards and the route draw-on only happen once
    const j = journey(s.journey), first = !s.done.includes(s.journey);
    set({
      done: first ? [...s.done, s.journey] : s.done,
      rewards: [...s.rewards, ...j.reward.filter((r) => !s.rewards.includes(r))],
      progress: 1, justFinished: first ? s.journey : s.justFinished, pendingEnd: true,
    });
    get().writeSave();
  },

  endChoice(c) {
    if (c === "stay") {
      set({ mode: "wander", phase: "play", cinema: false, objMode: "fresh" });
      get().writeSave();
    } else {
      set({ mode: "wander", atlasAfterOutro: true });
      get().toTitle();
    }
  },

  setPaint(v, i) {
    set({ paint: { ...get().paint, [v]: i } });
    if (get().save) get().writeSave();
  },

  setExtra(key, value) { set({ extra: { ...get().extra, [key]: value } }); },

  exit() {
    if (get().save || get().phase !== "menu") get().writeSave();
    set({ phase: "exit", atlasOpen: false });
  },

  setObjMode(m) { if (get().objMode !== m) set({ objMode: m }); },

  devSwapVehicle() {
    if (!import.meta.env.DEV || get().phase !== "play") return;
    const c = live.car;
    live.spawnAt = { x: c.x, z: c.z, yaw: c.yaw };
    set({ vehicle: get().vehicle === "mule" ? "rover" : "mule" });
  },

  toggleHints() {
    const hintsHidden = !get().hintsHidden;
    set({ hintsHidden, hints: !hintsHidden && !isTouch });
  },
}));
