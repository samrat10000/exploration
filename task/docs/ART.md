# ART — the wallpaper standard
_Read §1–§3 before any visual task. Models live in `reference/assets.html`; screens live in `reference/screens.html`._

## 1. The test
Pause anywhere and take a screenshot. Would someone set it as their wallpaper?
If a frame contains any of the following, it fails:
- A plain box or cylinder read as a finished object
- A single flat colour across a large surface
- Something floating or hovering above the ground
- Objects in straight rows or a perfect grid
- Neon green
- Pure black shadows
- UI text you can't read against the scene

## 2. Ten rules
1. **No raw primitives.** Vehicles = profile shape extruded with a bevel. Nature = noise-displaced. Buildings = assembled from parts (frame, sill, shutter, tile rows).
2. **Every surface has variation**: vertex colour by height, normal and noise. Use three values per material (shade / mid / light).
3. **Everything touches the ground.** Rocks half-buried, grass tufts at every base, houses on a flattened pad with a plinth that sinks 1.2 m into the ground, AO contact darkening.
4. **Cluster, never scatter evenly.** Trees in groves with saplings at the edges, rocks in groups of 1 big + 2 medium + pebbles, flowers in drifts.
5. **Scale variety** of 0.6–1.8× on all repeated props, plus random yaw and slight lean.
6. **Colour comes from real things.** Flowers, fruit, painted wood, flags, lanterns. Never coloured triangles on a mesh.
7. **Soft palette.** Olive and sage greens, warm stone, faded paint. Saturation tops out at about 55%, with the strongest colours saved for small accents (flowers, flags, lanterns).
8. **Shadows are coloured.** Hemisphere ground colour and the grade push shadows toward blue-violet. Sunlit sides go warm.
9. **Air between you and the distance.** Height fog plus aerial perspective, so far mountains fade toward the sky colour.
10. **Movement everywhere**: grass, leaves, petals, flags, smoke, water, birds, clouds. Small and slow. Nothing in the frame is completely still.

## 3. Lighting + post (the "wallpaper pass")
| Setting | Value |
|---|---|
| Tone mapping | ACES Filmic, exposure 1.0 (golden 1.08) |
| Sun shadow | PCF soft, map by quality preset, normalBias 0.4, radius 3 |
| Hemisphere | sky = horizon tint, ground = `#5A4A3E` (golden `#6A4E3A`) — makes shadows coloured |
| AO | N8AO (or SSAO): radius 1.6, intensity 1.4, distanceFalloff 1. Off on Low |
| Bloom | intensity 0.35, threshold 0.85, smoothing 0.25 (lamps, sun glints, flames) |
| Grade | lift shadows toward `#2B3B4F`, highlights toward `#FFE8C8`, saturation 0.92, slight S-curve contrast |
| Vignette | darkness 0.28, offset 0.35 |
| Fog | exp2 by quality + height fog under 30 m in valleys; colour = horizon × 0.94 |
| God rays | golden hour only, through trees and over ridges (High/Ultra) |
| DOF | photo mode only |
| AA | SMAA on Medium+, plus MSAA on the post composer at High+ |

## 4. Budgets (High preset, mid laptop, ≥ 60 fps)
- Draw calls < 400. Instancing for every repeated prop; merge static vehicle parts per material.
- Visible triangles < 2.5 M. LOD: trees full < 60 m, simplified < 140 m, impostor card beyond. Rocks: 3 detail levels.
- Grass: dense ring within 40 m, nothing past 70 m (terrain colour carries the rest).
- Shadow casters: vehicles, trees, rocks > 0.8 m, buildings. Not grass or flowers.

## 5. Placement rules (fixes from the screenshots)
- **Houses:** call `flattenPad(x, z, r)` in height.ts before placing. Never put a house where the slope under the pad is over 12°.
- **Trail edge:** use the dry-stone wall on cliff sides and posts with rope where there's a drop but no wall. Elsewhere, trail stones. Never plain boxes.
- **Orchard:** apple trees along the terrace contours, 6–7 m apart, with fallen petals and tufts under each.
- **Forest edges:** saplings (0.4–0.6×) and blossom trees at the boundary between grass and pines.
- **Flowers:** drifts of a single species (5–15 flowers each), denser along trail edges and near water.

## 6. Reference files
- `reference/assets.html`: every model as a working builder (`buildMule`, `buildRover`, `buildCrate`, `buildWheel`, `buildPine`, `buildBlossom`, `rockGeo`, `buildWall`, `buildPosts`, `bladeGeo`, `buildGrassPatch`, `buildHouse`, `buildCampfire`, `buildBellPole`, `buildGoat`, `buildPerson`, `buildSkyMule`, `buildTortoise`, `buildBus`, `buildBusStop`, `buildSnowcat`, `buildWinch`, `buildHook`, `buildHut(kind)`). Port the builder; don't redesign it. Each asset's "Build rules" panel lists its constraints.
- `reference/screens.html`: 30 screen boards with numbered specs (core screens + flight, winch, Hut Rounds, camping, water, ice, night, mapping, forecast, settings) + one sheet per journey (all 14).
- `reference/atlas.html`: Map (14 journeys) / Garage / Journal.
