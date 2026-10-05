# STATUS — Hinterland
_The one handoff file. A fresh Claude Code on any machine: read CLAUDE.md §0–§1, this file, then docs/MAP.md for the task. Keep under 80 lines; overwrite stale info._

## Start here on a new machine
1. `git clone` the repo, `cd assests-main/hinterland-handoff`, `npm install`, `npm run dev` (port 5179). `npm run build` must pass (zero TS errors).
2. Headless playtest: `cd tools && npm install` once (needs Chrome at the path in tools/play.mjs), then from the project root
   `node tools/play.mjs docs/screens/NN "wait:15000" "eval:JS" "shot:name" "hold:KeyW:3000" "state"`. `window.__hl` = {live, store}. Boot takes ~10–15 s.
   Recipes: `eval:__hl.store.setState({done:['overlook',…]})` then `eval:__hl.store.getState().startJourney('<id>','journey')`, wait 14 s,
   `eval:__hl.live.teleport(x,z,yaw)`, `eval:__hl.live.dev.tod=5` (time), `dev.weather='rain'`, `dev.freeCam=true` + `dev.look={from:[..],to:[..]}`.
3. Phone test: `TOUCH=1 node tools/play.mjs …` (landscape, coarse pointer) or `TOUCH=portrait`. Brake + E buttons and the portrait "Turn your device sideways" card are verified; the floating stick and drag-to-look by finger are not.
4. Windows shell: long Python/TS edits go in a scratch file (Write tool) and run with `python file.py` (heredocs break on quotes). Never touch git.

## How to work (cheap and good)
- Loop: run `/loop` (no args). Each tick = ONE task from "Left to do", top first: read only the files it names, build, run it in the headless browser, look at 1–2 screenshots, update this file + TASKS.md, then `ScheduleWakeup` ~60 s with `<<autonomous-loop-dynamic>>`. Stop the loop when the list is empty.
- Save tokens: MAP.md first; no reading reference/demos/; read each file once, patch many things in one script with `assert`ed replacements; one screenshot per feature; don't re-read after edits; keep replies terse.
- Report in the CLAUDE.md DONE shape. Record anything fake/thin under "Not real yet". Journey ids: overlook, longway, boulder, lantern, hutrounds, islands, snow, firefly, skyroad, market, salt, coast, light, above, flowers.

## Done (all ✅ in docs/TASKS.md)
Finale unlock: after J14 the Atlas offers any ground vehicle for "Wander here" (extra.allOpen → store.wanderVehicle; boat/flight vehicles still start from their slipways/ridges). Phases 1–2 (stack, Rapier vehicles, Journeys + Atlas, Mule, Kettle Peak) · 3.0 dev panel F3 · 3.1–3.4 models, placement, grass, lighting/post · 3.6 photo mode · 3.9–3.15 weather, dirt, seeds, horn, clouds/sky, fireworks, music · 4.1 travelers, 4.3 settings · 5.1–5.9 flight, glider, bus, boat, Tortoise, Snowcat, winch, birds/storms, Hut Rounds · 6.3–6.15 journeys 3–15 (each region in src/game/world/<name>/), all playable start → ending.

## Left to do — cheapest first
Small (≈ one tick each)
1. Sunset "wait" option at camp (J12) and a forced scripted J5 order (conflicts with the honey gift chain: decide first).
2. Remaining reward items: mail-bag rack, kite, wipers, fog lamps (no Garage item yet). Done: rack lights (Hut Rounds), prayer flags (Valley of Flowers), star charm (Firefly Road), scarf (First Snow): vehicle/decor.ts, shown from extra.mods.
Medium (a few ticks)
3. Ground feel leftovers: potholes + puddles on paths, snow-rut heightmap (the camera bump is covered by the existing landing/jolt shake). Surface sounds (splash, mud squelch, snow crunch, stone rumble) are in by code, never heard.
4. Weather leftovers: Kettle's own progress-driven snow merged with the weather system. Done: rain ripples on ground/water, wet + snow on grass tips, rocks and all baked props (houses, walls) via patchGround.
5. World kit leftovers: sky lanterns rising at night, a shared particle pool; Sky Road parcels + valley village with fireworks. Done: balloons (3 valley, 7 Sky Road) and dragons (jade circles the cloud sea, ember by the hut: props/dragon.ts + world/Dragons.tsx; no discovery card or fly-alongside yet).
6. Flight polish: ¾ front unfold camera, touch flight controls, bus door folding + rider animation. [5.x]
7. Lighting: god rays at golden hour, MSAA on real GPUs, review golden-hour Kettle / hut-at-dusk views against ART §1; pine LOD. [3.4]
8. Garage roster as 3D turntables with dolly; explicit music cue moments (4.4) if "silence by default" is wanted (see note below).
Large (many ticks)
9. Own regions for J5 Hut Rounds (high meadow ridge) and J10 Market Day (7 distinct villages, stone bridges, level-crossing train, fair scene).
10. J14 finale over the whole world (all regions) + credits with people/music.
11. Art pass on thin journeys (gorge walls, salt, coast surf, Firefly observatory, lake islands) to the ART §1 "wallpaper" bar.
12. Phase 7: 7.0 small-touches backlog (WEATHER.md §5), 7.1 journeys 16–19 + Dragon Festival (design desk sends docs), 7.2 build-your-own-vehicle Garage.
Open decision: music is ON by default (task 3.15) but CLAUDE.md 4.4 says silence by default. M toggles; ask the user before changing.

## Not real yet (honest list)
- Ambience added by code only, never heard (headless): night crickets, surf (coast / lake / lighthouse), wind rising with flight speed. Tune by ear.
- Hut Rounds: crates on the rack aren't tied to the carried items; meteor nights unlocked but not built; thermos does nothing. Forecast Rain/Snow work via Weather.
- Journeys 5, 10, 14 reuse the valley; J9 has no parcels/dragons/balloons; J13 generator = one ordinary crate; J11 mirror is the water shader (no true reflection).
- Photo mode: no DOF / vehicle hide / spot banner. Flight: chase cam on unfold. Bus doors don't visibly fold.
- Valley sandbox keeps thermals (cloud-capped) + a storm cell (tower and rain only while flying) + 2 slipways for testing flight/boat.
- Tuning vs CLAUDE.md: J2 trail 2.18 km (spec 2.8); cloud band fog ×16; Mule gripSpeed 4, strap hold 6.0, tip needs 0.6 s; suspension numbers stay on CLAUDE.md §4 (not FEEL.md's 28/1.9, gravity 24).
- AO intensity 0.8 / radius 1.2 (spec 1.4/1.6, spikes grass); MSAA off (black in headless GPU); SMAA only.

## Layout cheatsheet
src/game/{world/<region>/, vehicle/, environment/, audio/, life/, rounds/, journeys/journeys.ts (registry)} · src/state/{store.ts, live.ts (shared mutable state), save.ts} · src/ui/ (HUDs, Atlas, Settings) · docs/screens/ (numbered screenshots).
Adding a region: RegionId in journeys.ts + height.ts + live.ts, per-region maps (flight.ts SKY, BusRoute STOPS, Anchors, Slipways), store.ts setGround/safePoint, World.tsx switch, registry entry.
