// Esc (pause / back), H (hints), arrow keys through menus, and pause when the tab loses focus.
import { useEffect } from "react";
import { useStore } from "../state/store";
import { live } from "../state/live";
import { HORNS, modsOf } from "../game/vehicle/mods";
import { audio } from "../game/audio/audio";

export function useUiKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (e.code === "Escape") {
        e.preventDefault();
        if (s.settingsOpen) s.closeSettings();
        else if (s.sitting) useStore.setState({ sitting: false, waitRequested: false });
        else if (s.atlasOpen) s.closeAtlas();
        else if (s.phase === "play") s.pause();
        else if (s.phase === "paused") s.resume();
        return;
      }
      if (e.code === "KeyH" && s.phase === "play") {
        // the Mule, Loaf, Tortoise and Snowcat have a horn (goats move for it, valleys echo it); the Rover's H keeps the hints toggle
        if (["mule", "bus", "tortoise", "snowcat", "boat"].includes(s.vehicle)) { if (!e.repeat) { audio.horn(live.car.air ? 0 : s.region === "valley" ? 1 : 0.6, HORNS[modsOf(s.vehicle === "boat" ? "rover" : s.vehicle).horn]?.pitch ?? 1); live.honk = live.clock; } }
        else s.toggleHints();
        return;
      }
      if (e.code === "KeyV" && !e.repeat && s.phase === "play" && !s.photo) {
        live.camMode = (live.camMode + 1) % 6;
        live.note.text = ["Behind the vehicle", "In the cab", "On the hood", "Rear view", "From above", "Far behind"][live.camMode]; live.note.t = 2; return;
      }
      if (e.code === "KeyL" && !e.repeat && s.phase === "play") {
        live.lights = live.lights === "auto" ? "on" : live.lights === "on" ? "off" : "auto";
        live.note.text = { auto: "Headlights: automatic", on: "Headlights on", off: "Headlights off" }[live.lights]; live.note.t = 2; return;
      }
      if (e.code === "KeyM" && !e.repeat) { const on = audio.toggleMusic(); live.note.text = on ? "Music on" : "Music off"; live.note.t = 2; return; }
      if (e.code === "F9" && import.meta.env.DEV) { e.preventDefault(); s.devSwapVehicle(); return; }
      if ((e.code === "ArrowUp" || e.code === "ArrowDown") && s.phase !== "play") {
        const panel = ["settings", "pause", "menu", "ending", "campfire", "exit"].map((id) => document.getElementById(id)).find((p) => p?.classList.contains("on"));
        if (!panel) return;
        const active = document.activeElement as HTMLInputElement | null;
        if (active?.type === "range") return; // arrows adjust the slider
        const list = [...panel.querySelectorAll<HTMLElement>(".nav button, .seg button, input, .back")].filter((b) => !b.hidden);
        const i = list.indexOf(active as HTMLElement);
        const next = list[(i + (e.code === "ArrowDown" ? 1 : -1) + list.length) % list.length];
        if (next) { next.focus(); e.preventDefault(); }
      }
    };
    const onBlur = () => useStore.getState().pause();
    const onVis = () => { if (document.hidden) useStore.getState().pause(); };
    addEventListener("keydown", onKey);
    addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}
