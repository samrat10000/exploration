# HINTERLAND — Claude Code instructions

Web-only 3D exploration game. Chill, cinematic, no combat, no stress. The world is the main character.
Target feeling: the player loses track of time and plays for 3–4 hours because it is calm and beautiful.
Working title: "Hinterland" (lives only in `index.html <title>` and the title screen; easy to rename).

---

## 0. HOW THIS PROJECT IS RUN (two accounts)

There are two Claude accounts. They never see each other. The user carries context between them.

| Who | Role |
|---|---|
| **Design desk** (claude.ai chat, other account) | Creative/technical direction. Gets screenshots + `docs/STATUS.md` from the user. Returns TASK blocks. Built the original prototype. |
| **You** (Claude Code) | Implementation. Reads TASK blocks, builds, verifies, updates `docs/STATUS.md`. |

### Token rules (both sides save tokens)
- `CLAUDE.md` = stable rules. Do not rewrite it unless a TASK says `UPDATE CLAUDE.md`.
- `docs/TASKS.md` = the task queue. When the user says "next", do the first unchecked task, tick it, update STATUS. TASK blocks pasted by the user override the queue.
- `docs/STATUS.md` = the only handoff file. After EVERY task, update it. Keep it **under 80 lines**. Overwrite stale info; don't append history forever.
- **`docs/MAP.md` = start here for any task.** It lists exactly which small files each task needs. Read only those.
- `reference/src/kit/*.js` = the source of truth for every system, split by topic (models, time of day, clouds, fireworks, sound…). Each file starts with a header describing its API. Port these into the TS project.
- `reference/src/levels/*.js` = level logic for Sky Road and the Valley of Flowers. Each section is marked with a `/* === NAME === */` banner, so read only the section you need.
- `reference/ui/screens.html` = every in-game UI screen with numbered specs (read only the board a task names). `reference/ui/atlas.html` = Map / Garage / Journal.
- **`reference/demos/` = built, playable bundles of src/ for the user to look at. Never read them** (they're 200–250 KB each and duplicate src/).

### TASK block format (what the user pastes to you)
```
TASK 2.3 — <title>
GOAL: <one line, player-facing outcome>
READ: <files / prototype sections, nothing else>
DO: <numbered steps>
KEEP: <values/behaviour that must not change>
DONE WHEN: <checks you can verify>
OUT OF SCOPE: <don't touch>
```
If a TASK conflicts with a Locked decision (§4), stop and say so in one line. Don't guess.

### When you finish a TASK
1. Run `npm run build` (must pass, zero TS errors) and `npm run dev` sanity check.
2. Update `docs/STATUS.md`.
3. Report in this exact shape:
```
DONE
✓ ...
CHANGED FILES
- path — why
NEEDS EYES (user should screenshot this)
- ...
NEXT
→ ...
```

### When something breaks
State: what broke → why → what changed → how verified. Then fix it.

---

## 1. HARD RULES

1. **Never touch git.** No commits, branches, stash, reset, nothing. The user does git.
2. **Restraint rule.** Every new file must earn its place. No empty folders, no "manager" classes, no abstraction for one caller.
3. Numbering is `1, 1.1, 1.2`. Never `P1/P2`.
4. Animation: **smooth, never springy.** Ease-in-out, exponential damping. No overshoot bounces on UI or camera.
5. Correctness before polish. Each phase independently verifiable.
6. Don't fake features. Don't call a placeholder done. If something is a stand-in, label it in STATUS under "Not real yet".
7. Don't ask the user micro-decisions (grass sway %, etc.). Decide. Ask only if it changes identity, architecture, tech, gameplay or scope.
8. No backend, auth, DB, or multiplayer. Browser → game → localStorage.
9. Performance is a feature. Never answer "buy a better GPU". Use instancing, LOD, culling, quality scaling.
10. Never "COLLECT 17 CRYSTALS". Discovery is organic. No minimap, no XP, no health bars, no notification spam.
11. Assets: procedural first. If an external asset is truly needed, state what it is, why, format (glTF/GLB, KTX2 textures, OGG/MP3 audio), path (`public/assets/...`), license (CC0 preferred), and web optimization. Never tell the user "go make a 3D model".

---

## 2. STACK (decided)

- Vite + React 18 + TypeScript (strict)
- three + @react-three/fiber + @react-three/drei
- @react-three/rapier (physics)
- zustand (game/UI state shared between DOM HUD and canvas)
- @react-three/postprocessing — only from Phase 3
- Audio: Web Audio API, synthesized first (port from prototype). Real samples later only if a TASK adds them.
- UI = plain DOM/React over the canvas + CSS. No UI kit.

### Structure (create folders only when a file needs them)
```
src/
  main.tsx, App.tsx
  state/        game store (zustand): phase (loading|menu|intro|play|paused|outro|exit), settings, save
  ui/           Title, Settings, Pause, Hud, DiscoveryCard, ExitScreen, Letterbox, TouchStick, ui.css
  game/
    world/      height.ts (SINGLE source of truth), Terrain, Water, Waterfall, Vegetation, Rocks, Overlook
    environment/ Sky, timeOfDay.ts (palettes), Clouds, Birds, Mist
    vehicle/    Rover (mesh), useVehicle (Rapier controller), tuning.ts
    camera/     CameraRig (menu orbit, intro/outro glide, chase)
    audio/      audio.ts
    exploration/ discoveries.ts
  utils/        noise.ts
```

---

## 3. WHAT EXISTS (prototype = `reference/demos/prototype.html`, view only)

Single-file three.js r128 prototype. All of this works and is the **parity target** for Phase 1:

- Loader fade → title over a living scene (golden hour, drifting clouds incl. some below peaks, wind on grass+trees, water, waterfall + mist, birds, lantern glowing on the ridge).
- Title (lower-left): Continue (only if save exists, shows "N places found"), Explore, Settings, Exit.
- Settings: quality Low/Medium/High/Ultra, master/nature/engine volume, camera motion Full/Calm. Saved.
- Explore: letterbox stays; camera glides menu→chase over 4.6s; time of day eases golden→morning; bars retract; control handed over.
- HUD: one objective line (fades out when driving fast, returns when stopped); key hints auto-hide after ~12s of driving; H toggles.
- Pause (Esc, blur), Settings from pause, Return to title (camera glides back).
- Discoveries: "Highfall" (waterfall), "The Overlook" (ridge, lantern) → letterbox + title card, objective changes to free roam.
- Exit: saves, calm end screen.
- Synth audio: wind (stronger with altitude), birds, water by proximity, engine (strains uphill, silent ~4s after stopping).
- Touch: left-half drag stick.
- Driving: ARCADE controller (not physics) + circle collisions vs trees/rocks. **Replace with Rapier in 1.4.**

---

## 4. LOCKED DECISIONS (change only via TASK that says UNLOCK)

### Journeys (levels) — UNLOCKED and replaced 2026-10-04
The game is a set of **Journeys** (levels), each in its own region, picked on the **Atlas** map. Full design: `docs/JOURNEYS.md`. Atlas UI reference: `reference/ui/atlas.html`.
- No timers, fail screens, scores or stars. Challenge = balance, care, reading terrain. Consequences only change the ending text.
- Weather and time of day inside a journey are driven by route progress, not by the clock.
- A finished journey's region stays open as Wander mode.
- Title menu becomes: Continue · Journeys · Settings · Exit.

### World constants (port verbatim from prototype TERRAIN FUNCTION)
- `height(x,z)` is the single source of truth for mesh, props and physics heightfield.
- `WATER = 0.6`. River centerline `riverX(z)`. Falls at `x = riverX(-76)`, z −97 → −75. Pool at `(FALLS.x, -72)`.
- Overlook `VP = (95, -122)`, plateau flattened to its own height. Start `(riverX(140)+28, 140)`, facing VP.
- Map radius ~252 drivable, rim mountains beyond 230.

### Vehicle feel targets (keep when moving to Rapier)
Priority: Control > Responsiveness > Stability > Believability > Realism.
- Accel 10.5 m/s² tapering to max 21 m/s (9 in water); reverse max 7; brake 26 m/s².
- Uphill drag = slope × 9.8 × 0.45 (forgiving). Static hold on slopes < 0.4 with no input.
- Steer rate 1.55 rad/s, grip ramps in by 5 m/s, −40% at top speed; input smoothing k=7.
- Gravity 24 (snappier than real). Small hops off crests above 7 m/s.
- Body suspension: k=90, c=17 (near critical, no wobble). Accel squat/dive ±0.05 rad. Body lean into turns.
- Must self-right / never feel stuck. Flipping = bug.
- Rover: sand paint `#C7AB78`, charcoal trim `#2A2E31`, roof rack, spare wheel, warm headlights. Wheelbase 2.7, track 1.9, wheel r 0.46.

### Camera
- Chase: dist 8.6 + 0.11·speed, height 3.1 + 0.025·speed, looks 3m ahead at +1.4.
- Damping: position k=5, look k=7, yaw follow k=2.6 (exp damping `1-exp(-k·dt)`).
- Never below terrain + 1.7. FOV 55 → 62 with speed (off when motion = Calm).
- Drag to look (0.006 rad/px), returns to behind after 1.6s idle.
- Shake only on landings/hits, off when Calm.
- Menu shot: slow orbit right-rear of rover, rover sits right of frame, mountain + lantern behind.
- Intro/outro: easeInOutCubic, 4.6s.

### Time of day (palettes in prototype SKY section)
Keyframes dawn / morning / day / golden: sun elevation+azimuth, sun color, zenith, horizon, hemi colors. Fog colour = horizon × 0.94. Never abrupt: everything interpolates. Menu sits at golden hour (2.85). Play starts at morning (1.0) and warms over ~18 min.

### Quality presets
| | pixelRatio max | shadow map | grass blades | fog density |
|---|---|---|---|---|
| Low | 0.75 | off | 7k | .0042 |
| Medium | 1.25 | 1024 | 20k | .0034 |
| High | 1.75 | 2048 | 38k | .0028 |
| Ultra | 2 | 4096 | 60k | .0024 |
Default: High on desktop, Medium on touch. Respect `prefers-reduced-motion` → Calm.

### UI language
- Fonts: **Marcellus** (titles, place names) + **Jost** 300/400 (everything else). Google Fonts, real fallbacks.
- Colors: ink `#F4EFE5`, dim ink 66%, faint ink 32%, sun accent `#E9C47E`, veil `rgba(16,22,28,.52)`.
- No boxes/cards for menus. Plain text items; hover/focus = text brightens, slides right 40px, thin sun-colored line draws in.
- Letterbox bars (9vh) = cinematic moments only (title, intro, discovery).
- Sentence case. No ALL-CAPS labels. Copy is calm and plain.
- Copy (keep): tagline "A slow drive into the high country." · objective "Find a way up to the light on the ridge" → after Overlook "The valley is yours to wander" · Highfall: "The river begins here, all at once." · The Overlook: "Everything you crossed, and everything you haven't." · Exit: "Your journey is saved." / "You can close this tab whenever you like."
- Keyboard nav (arrows + Enter), visible focus, responsive to mobile, safe-area insets.

### Save
localStorage keys `hinterland.save.v1` {x,z,yaw,tod,found[],t} (autosave every 5s + on pause/title/exit) and `hinterland.settings.v1`. Always try/catch.

---

## 5. ROADMAP

**1 — Port to the real stack** ✅ (see STATUS)

**2 — Journeys foundation + J2** ✅
2.1 Visual pass on the valley (art bar for everything after).
2.2 Journey framework (JOURNEYS §1.1) + Atlas (Map/Garage/Journal) + title menu change. J1 = the existing valley.
2.3 The Mule + cargo system + no-fail recovery (JOURNEYS §1.2, §1.3, §2.1). Test in the valley first.
2.4 Kettle Peak region: spiral trail spline, carved terrain, walls/posts, four turn biomes.
2.5 J2 beats, obstacles, campfires, ending (JOURNEYS §3 J2).
2.6 Game feel: dust, mud spray, splash, landing thud, surface-aware tyre audio.

**3 — Art + screens + world (the wallpaper pass)** — see docs/MAP.md
3.0 Dev panel (F3) first, so every later task can be checked with it.
3.1 Art kit + port every model from the Asset Lab; swap them in-game.
3.2 Placement: house pads + plinths, trail edges (walls/posts/stones), orchard, groves, rock groups, flower drifts.
3.3 Grass + flora shader upgrade.
3.4 Lighting + post-processing (ART §3).
3.5 In-game screens: intro, HUD, cargo prompt, traveler lines, campfire, camera moment, ending, loading, touch.
3.6 Photo mode + postcards + Journal storage.

**4 — Shared systems:** travelers' memory and line unlocks, Garage mods applied to handling, music cues (SPEC §9: silence by default, cues only at moments).

**5 — Vehicles + mechanics kit:** Sky Kit flight (+ Rover glider), the Loaf (bus), Rover boat mode, Tortoise, Snowcat, grapple winch (JOURNEYS §1.9–1.13, assets.html Vehicles + Props, screens.html "New mechanics").
**6 — Journeys 3–15**, in Atlas order, one phase each, every one playable start to ending: J3 Boulder Garden · J4 Lantern River · J5 Hut Rounds · J6 Firefly Road · J7 Lake of Islands · J8 First Snow · J9 Sky Road · J10 Market Day · J11 The Salt Mirror · J12 Slow Coast · J13 The Lighthouse · J14 Above the Clouds · J15 Valley of Flowers.
Each journey's screens + copy: screens.html → "All 14 journeys".

## 6. VIBE CHECK (ask before calling anything done)
Does it feel good → can it feel better → can it feel beautiful?
Would someone park on the ridge, take their hands off the keys, and just watch?

---

## 7. CURRENT RUN (read first in a fresh chat)
- The game lives in `assests-main/hinterland-handoff/` (run npm commands there). Read `docs/STATUS.md` first, then `docs/MAP.md` for each task. Specs and reference sources are in that folder's `docs/` and `reference/`.
- The user wants the queue worked automatically, one task after another, with terse replies, in this order: finish **5.8** (birds + storms: thunder sound and sky data exist; flocks, storm cell, rain, lightning, "Weather coming in" still to build; read `reference/src/levels/skyroad.js` ~124 and ~135), then **5.1b**, **5.9**, then Phase 3.3 to 3.15, Phase 4, Phase 6.
- Never compromise results: build, run it in the headless browser (`assests-main/hinterland-handoff/tools/play.mjs`: run `npm install` once inside `tools/`, start `npm run dev` (port 5179), then e.g. `node tools/play.mjs out "wait:6000" "eval:..." "shot:name"`; commands are described at the top of the file and use window.__hl in dev), look at screenshots, test the real behaviour. Record anything not working honestly in STATUS under "Not real yet".
- Bash, file edits and reads are pre-approved in the user's settings. Never touch git.
