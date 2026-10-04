# TASKS — the queue
_When the user says "next" (or "do the next task"), take the first unchecked task, do it, tick it here, update STATUS.md, and report in the CLAUDE.md format. One task per run. If a task is too big for one run, split it into .a / .b here first and tell the user._

## Phase 3 — Art + screens (the wallpaper pass)
- [ ] **3.0 Dev panel (F3).** READ screens.html → "Dev panel (F3)". Build every item; only in import.meta.env.DEV. DONE WHEN you can teleport to any beat, set the time, hide the UI and free-cam in under 10 s.
- [ ] **3.1 Port every model.** READ ART.md §1–2, §4; assets.html → CORE HELPERS + the ASSET sections you port. Make `src/game/art/kit.ts`, port each builder to its "Port to" path unchanged, swap them in-game, merge static parts, instance repeats. Visual swap only (colliders/tuning unchanged). DONE WHEN the user's screenshot angles look like the Asset Lab at ≥ 60 fps on High.
- [ ] **3.2 Placement.** READ ART.md §2, §5. Add `flattenPad()`; houses on pads (slope ≤ 12°); trail edges (walls / posts + rope / trail stones); groves with saplings; rock groups; flower drifts; orchard on contours. DONE WHEN a free-cam flight finds nothing floating, in a row, or flat-coloured.
- [ ] **3.3 Grass + flora shader.** READ assets.html → GRASS + WILDFLOWERS. Curved 6-segment blades, clumps, root colour = terrain, 3% flowers, oats, clover, gust wind, density rings per ART §4.
- [ ] **3.4 Lighting + post.** READ ART.md §3. Apply every value; expose them in the dev panel. DONE WHEN golden-hour Kettle Peak, the morning orchard and the hut at dusk pass ART §1 on every preset's fps budget.
- [ ] **3.5 In-game screens.** READ screens.html boards 1–7, 10, 11. Intro, HUD, cargo prompt, traveler lines, campfire, camera moment, ending, loading, touch.
- [ ] **3.6 Photo mode + postcards + Journal.** READ screens.html boards 8–9. Photos in IndexedDB.

## Phase 4 — Shared systems
- [ ] **4.1 Travelers' memory + line unlocks.** JOURNEYS §1.7.
- [ ] **4.2 Garage mods applied to handling** (±5–10% max) + vehicle roster screen. screens.html → "Choose a vehicle".
- [ ] **4.3 Settings (complete).** screens.html → "Settings (complete)".
- [ ] **4.4 Music cues.** SPEC §9: silence by default; cues only at camera moments, endings and the first view above the clouds.

## Phase 5 — Vehicles + mechanics kit
- [ ] **5.1 Flight core + Sky Kit.** JOURNEYS §1.10; assets.html → SKY MULE; screens.html → Transformation, Flight HUD, Landing approach. Glide model, thermals, puff, no-fail bounce, landing ring auto-flare. Test in a flight sandbox from the dev panel.
- [ ] **5.2 Rover glider mode.** Same flight core, Rover wing panels.
- [ ] **5.3 The Loaf (bus) + bus route.** JOURNEYS §1.14; assets.html → THE LOAF, BUS STOP; screens.html → "Bus stops + passengers". Long-wheelbase handling, doors, boarding, bell, comfort reactions.
- [ ] **5.4 Rover boat mode + water driving.** Transformation at slipways; float, prop, wake, splash, bob. Used by J4 and J7.
- [ ] **5.5 Tortoise + make camp.** assets.html → TORTOISE; screens.html → "Make camp".
- [ ] **5.6 Snowcat + snow.** assets.html → SNOWCAT; screens.html → "Thin ice". Tracks, deep track marks, drifts, sled tow.
- [ ] **5.7 Grapple winch.** JOURNEYS §1.9; assets.html → GRAPPLE WINCH; screens.html → winch aim + haul. Rope joint + motor, anchor rings, auto-release.
- [ ] **5.8 Birds + storms (sky hazards).** screens.html → Birds ahead, Thunderstorm.
- [ ] **5.9 Hut Rounds system.** JOURNEYS §1.11; assets.html → Huts group; screens.html → Order slips, Hut visit, Stamp passport, Forecast.

## Phase 6 — Journeys 3–14 (one task each; each must be playable start → ending)
For each: READ JOURNEYS §3 (that journey only) + screens.html → its sheet under "All 14 journeys". Build region, route spline, beats, campfires, postcard spots, ending, reward, Atlas unlock.
- [ ] 6.3 Boulder Garden
- [ ] 6.4 Lantern River
- [ ] 6.5 Hut Rounds
- [ ] 6.6 Firefly Road
- [ ] 6.7 Lake of Islands
- [ ] 6.8 First Snow
- [ ] 6.9 Sky Road
- [ ] 6.10 Market Day
- [ ] 6.11 The Salt Mirror
- [ ] 6.12 Slow Coast
- [ ] 6.13 The Lighthouse
- [ ] 6.14 Above the Clouds (finale + credits)
