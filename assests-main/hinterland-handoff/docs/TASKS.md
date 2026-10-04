# TASKS — the queue
_When the user says "next" (or "do the next task"), take the first unchecked task, do it, tick it here, update STATUS.md, and report in the CLAUDE.md format. One task per run. If a task is too big for one run, split it into .a / .b here first and tell the user._

## Phase 3 — Art + screens (the wallpaper pass)
- [x] **3.0 Dev panel (F3).** READ screens.html → "Dev panel (F3)". Build every item; only in import.meta.env.DEV. DONE WHEN you can teleport to any beat, set the time, hide the UI and free-cam in under 10 s.
- [x] **3.1 Port every model.** READ ART.md §1–2, §4; reference/src/kit/core.js + the builder you port from vehicles/nature/buildings/life.js. Make `src/game/art/kit.ts`, port each builder to its "Port to" path unchanged, swap them in-game, merge static parts, instance repeats. Visual swap only (colliders/tuning unchanged). DONE WHEN the user's screenshot angles look like the Asset Lab at ≥ 60 fps on High. _(done from the earlier Asset Lab; the kit lives in src/game/art/kit.ts)_
- [x] **3.2 Placement.** READ ART.md §2, §5. Add `flattenPad()`; houses on pads (slope ≤ 12°); trail edges (walls / posts + rope / trail stones); groves with saplings; rock groups; flower drifts; orchard on contours. DONE WHEN a free-cam flight finds nothing floating, in a row, or flat-coloured.
- [x] **3.3 Grass + flora shader.** READ reference/src/kit/nature.js → GRASS section; reference/src/levels/valley.js → meadow + SPECIES sections. Curved 6-segment blades, clumps, root colour = terrain, 3% flowers, oats, clover, gust wind, density rings per ART §4.
- [ ] **3.4 Lighting + post.** READ ART.md §3. Apply every value; expose them in the dev panel. DONE WHEN golden-hour Kettle Peak, the morning orchard and the hut at dusk pass ART §1 on every preset's fps budget.
- [ ] **3.5 In-game screens.** READ screens.html boards 1–7, 10, 11. Intro, HUD, cargo prompt, traveler lines, campfire, camera moment, ending, loading, touch.
- [ ] **3.6 Photo mode + postcards + Journal.** READ screens.html boards 8–9. Photos in IndexedDB.

- [ ] **3.7 World kit.** READ TIME.md + FEEL.md. Port reference/src/kit/time.js, particles.js, flags.js, balloon.js, dragon.js: `makeTOD` (4 presets + stars/moon/Milky Way + lamp registry), particles pool, fireflies, fireworks, sky lanterns, detailed prayer flags (`flagTex` + instanced wave shader), balloon, dragon. Add the time picker (1–4) to the dev panel and photo mode. DONE WHEN every existing region looks right in all four presets.
- [ ] **3.8 Ground feel.** READ FEEL.md §1–6. Per-wheel spring-damper suspension on Rapier, surface table, splash + ripples + puddles, snow ruts (heightmap RT), dust, petals, plants parting (`meadowMat`), thuds + camera bump. Tune the Rover, then give each vehicle its row from the FEEL §1 table.

- [ ] **3.9 Weather.** READ WEATHER.md §1; port the WEATHER section of reference/src/levels/valley.js: four states with slow arrival, rain curtain, wet ground + puddles that mirror the sky, rain ripples, rainbow after showers, mist banks, settled snow, cloud shadows (`patchGround`). Weather picker in the dev panel; the Forecast drives it in free roam.
- [ ] **3.10 Dirt, mud and roof snow.** READ WEATHER.md §2; port the DIRT section of reference/src/levels/valley.js (one shader patch on all body materials, dust vs mud, cleaned by fords and rain, roof snow). Save it.
- [ ] **3.11 Seeds + garden.** READ WEATHER.md §3; port the SEEDS section of reference/src/levels/valley.js: pods, pouch HUD, plant prompt (G / tap), growth over an in-game day, saved garden, weekly spread.
- [ ] **3.12 Echoing horn.** WEATHER.md §4.

- [ ] **3.13 Cozy clouds + sky.** READ SKY_SOUND.md §1–2; port kit/clouds.js (instanced lit cumulus, cloud sea, cumulonimbus, back-to-front sort) and kit/skyextras.js (sun rays, aurora, shooting stars, geese). The cirrus is in kit/time.js. Replace every sprite cloud in the game.
- [ ] **3.14 Fireworks.** READ SKY_SOUND.md §3; port kit/fireworks.js (8 shell types, trails, smoke, flash light, delayed sound). Festival shows at night in villages; C launches a small volley anywhere.
- [ ] **3.15 Music + sound kit.** READ SKY_SOUND.md §4; port kit/sound.js (compressor, reverb, echo, generative soundtrack with moods, shared effects). Music toggle (M) + volume in Settings.

## Phase 4 — Shared systems
- [ ] **4.1 Travelers' memory + line unlocks.** JOURNEYS §1.7.
- [ ] **4.2 Garage mods applied to handling** (±5–10% max) + vehicle roster screen. screens.html → "Choose a vehicle".
- [ ] **4.3 Settings (complete).** screens.html → "Settings (complete)".
- [ ] **4.4 Music cues.** SPEC §9: silence by default; cues only at camera moments, endings and the first view above the clouds.

## Phase 5 — Vehicles + mechanics kit
- [x] **5.1 Flight core + Sky Kit.** JOURNEYS §1.10; **reference/src/levels/skyroad.js is a working prototype of all of it: port its flight model, unfold sequence, HUD, thermals, birds, storm, landing and ending; keep its numbers as the starting tuning.** kit/vehicles.js → SKY MULE; screens.html → Transformation, Flight HUD, Landing approach. Glide model, thermals, puff, no-fail bounce, landing ring auto-flare. Test in a flight sandbox from the dev panel. _(built before skyroad.js arrived: finish with 5.1b)_
- [x] **5.1b Reconcile flight with skyroad.js.** READ skyroad.js → Sky Mule unfold ~236, flight model ~351, camera ~418, thermals ~109, glide lights ~101. Compare with src/game/vehicle/{flight.ts,SkyMule.tsx} and world/SkyPlaces.tsx; adopt its numbers, unfold sequence, camera and HUD wherever mine differs, keeping what is verified (launch ridge, landing ring, recovery, fold). DONE WHEN a side-by-side feels the same as the prototype.
- [x] **5.2 Rover glider mode.** Same flight core, Rover wing panels.
- [x] **5.3 The Loaf (bus) + bus route.** JOURNEYS §1.14; kit/vehicles.js → THE LOAF, BUS STOP; screens.html → "Bus stops + passengers". Long-wheelbase handling, doors, boarding, bell, comfort reactions.
- [x] **5.4 Rover boat mode + water driving.** Transformation at slipways; float, prop, wake, splash, bob. Used by J4 and J7.
- [x] **5.5 Tortoise + make camp.** kit/vehicles.js → TORTOISE; screens.html → "Make camp".
- [x] **5.6 Snowcat + snow.** kit/vehicles.js → SNOWCAT; screens.html → "Thin ice". Tracks, deep track marks, drifts, sled tow.
- [~] **5.7 Grapple winch.** JOURNEYS §1.9; kit/vehicles.js → GRAPPLE WINCH; screens.html → winch aim + haul. Rope joint + motor, anchor rings, auto-release. _(aim/throw/latch/cable/HUD done; haul-over-boulder not tuned: finish in 6.3)_
- [x] **5.8 Birds + storms (sky hazards).** READ skyroad.js → birds ~124, storm ~135; screens.html → Birds ahead, Thunderstorm. (Sky data + thunder sound already added; build the flocks and the cell.)
- [x] **5.9 Hut Rounds system.** JOURNEYS §1.11; kit/buildings.js → HUT VARIANTS; screens.html → Order slips, Hut visit, Stamp passport, Forecast.

## Phase 6 — Journeys 3–14 (one task each; each must be playable start → ending)
For each: READ JOURNEYS §3 (that journey only) + screens.html → its sheet under "All 14 journeys". Build region, route spline, beats, campfires, postcard spots, ending, reward, Atlas unlock.
- [ ] 6.3 Boulder Garden
- [ ] 6.4 Lantern River
- [ ] 6.5 Hut Rounds
- [ ] 6.6 Firefly Road
- [ ] 6.7 Lake of Islands
- [ ] 6.8 First Snow
- [ ] 6.9 Sky Road (prototyped in reference/src/levels/skyroad.js incl. v2: dragons, balloons, valley below, festival village + fireworks; build the full region around it)
- [ ] 6.10 Market Day
- [ ] 6.11 The Salt Mirror
- [ ] 6.12 Slow Coast
- [ ] 6.13 The Lighthouse
- [ ] 6.14 Above the Clouds (finale + credits)
- [ ] 6.15 Valley of Flowers (port reference/src/levels/valley.js: terrain, path, flowers, stream, bridge, mani wall, stupa, camp, snow pass)

## Phase 7 — Later
- [ ] 7.0 Small-touches backlog, in order (WEATHER.md §5): seasons, animals, shooting stars, own camp spot, cab camera, radio, scrapbook, errands, quiet spots, photo requests, postcard maker, ghost trails, breath steam
- [ ] 7.1 Journeys 16–19 + the Dragon Festival event (JOURNEYS → "More journeys to plan next"; design desk will send the docs first)
- [ ] 7.2 Build-your-own-vehicle Garage (JOURNEYS → "Later: build your own vehicle")
