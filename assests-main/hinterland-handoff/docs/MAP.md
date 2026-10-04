# MAP — what to read for each task (and nothing else)
_Token rule: open only the files and sections listed for your task. Never open `reference/demos/` (built bundles for the user to look at). Line numbers are approximate; jump to the banner text._

## Files
| File | KB | What's in it |
|---|---|---|
| reference/src/kit/core.js | 7 | materials, rng, noise, paintFaces, catenary, tube, buildWheel, buildCrate, halo glow |
| reference/src/kit/vehicles.js | 41 | MULE, ROVER, SKY MULE, TORTOISE, THE LOAF (+ bus stop), SNOWCAT, GRAPPLE WINCH (one banner each) |
| reference/src/kit/nature.js | 15 | PINE, BLOSSOM/APPLE (flowers), ROCKS, DRY-STONE WALL, POSTS + ROPE, GRASS + WILDFLOWERS |
| reference/src/kit/buildings.js | 16 | HOUSE (pad + plinth), CAMPFIRE, BELL POLE, HUT VARIANTS (tea, weather, bakery, bees, stars) |
| reference/src/kit/life.js | 3 | GOAT, TRAVELER / KEEPER |
| reference/src/kit/time.js | 6 | makeTOD (4 presets, sky shader with cirrus, stars, Milky Way, moon), lamp registry, time picker |
| reference/src/kit/particles.js | 6 | particle pool (splash/spray/dust/petals), fireflies, sky lanterns |
| reference/src/kit/flags.js | 3 | prayer flag cloth texture + instanced wave shader |
| reference/src/kit/balloon.js | 3 | hot air balloon with passengers + burner |
| reference/src/kit/dragon.js | 7 | serpentine dragon (body rebuilt each frame from a path history) |
| reference/src/kit/clouds.js | 7 | lit cumulus puffs, cloud sea, cumulonimbus, sorting |
| reference/src/kit/skyextras.js | 6 | sun rays, aurora, shooting stars, geese |
| reference/src/kit/fireworks.js | 11 | rockets, 8 shell types, trails, smoke, flash light, sound hooks |
| reference/src/kit/sound.js | 9 | mixer + reverb + echo, generative music moods, shared effects |
| reference/src/levels/skyroad.js | 46 | Sky Road level (sections listed below) |
| reference/src/levels/valley.js | 79 | Valley of Flowers level + weather/dirt/seeds/horn (sections listed below) |
| reference/ui/screens.html | 63 | 30 UI boards + 15 level sheets (read one board by its id) |
| reference/ui/atlas.html | 25 | Map / Garage / Journal UI |

## Level sections
**skyroad.js:** clouds ~29 · peaks ~40 · launch ridge ~67 · sky hut deck ~85 · glide lights ~101 · thermals ~109 · birds ~124 · storm ~135 · BELOW THE CLOUDS (valley, village, fireworks) ~151 · balloons ~223 · dragons ~229 · Sky Mule unfold ~236 · audio ~282 · flight model ~351 · camera ~418 · loop ~426

**valley.js:** height function ~23 · terrain paint ~65 · merge helper ~101 · meadowMat ~120 · flower SPECIES ~143 · stone path ~187 · water shader ~213 · trees ~260 · landmarks (bridge, mani wall, stupa, camp) ~283 · clouds/butterflies/fireflies ~341 · WEATHER ~358 · snow ruts ~452 · ROVER suspension ~476 · AUDIO ~575 · DIRT ~611 · SEEDS ~649 · HORN ~695 · loop ~707

## Task → read
| Task | Read |
|---|---|
| 3.0 dev panel | ui/screens.html → board `dev` |
| 3.1 models | ART §1–2,4 · kit/core.js · the banner you need in vehicles/nature/buildings/life.js |
| 3.2 placement | ART §2,5 · buildings.js → HOUSE |
| 3.3 grass | nature.js → GRASS · valley.js → meadowMat + SPECIES |
| 3.4 lighting/post | ART §3 · TIME §1 |
| 3.5–3.6 screens, photo | ui/screens.html boards 1–11 |
| 3.7 world kit | TIME · kit/time.js, particles.js, flags.js, balloon.js, dragon.js |
| 3.8 ground feel | FEEL · valley.js → ROVER suspension, snow ruts, water shader |
| 3.9–3.12 weather, dirt, seeds, horn | WEATHER · valley.js → WEATHER, DIRT, SEEDS, HORN |
| 3.13 clouds + sky | SKY_SOUND §1–2 · kit/clouds.js, skyextras.js (+ cirrus in time.js) |
| 3.14 fireworks | SKY_SOUND §3 · kit/fireworks.js |
| 3.15 music + sound | SKY_SOUND §4 · kit/sound.js |
| 4.x systems | JOURNEYS §1.7–1.8 · screens boards `roster`, `settings2` |
| 5.1 flight | JOURNEYS §1.10 · skyroad.js → Sky Mule unfold, flight model, camera, thermals, birds, storm · vehicles.js → SKY MULE |
| 5.3 bus | JOURNEYS §1.14 · vehicles.js → THE LOAF · screens board `bus` |
| 5.5–5.7 Tortoise, Snowcat, winch | vehicles.js → that banner · screens boards `camp`, `ice`, `winch-aim`, `winch-haul` |
| 5.9 Hut Rounds | JOURNEYS §1.11 · buildings.js → HUT VARIANTS · screens boards `orders`, `hutvisit`, `passport`, `forecast` |
| 6.x a journey | JOURNEYS §3 (that journey only) · screens → its sheet under "All 15 journeys" |
| 6.9 Sky Road | skyroad.js (whole file, section by section) |
| 6.15 Valley of Flowers | valley.js (section by section) |
