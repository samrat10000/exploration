# WEATHER, DIRT, SEEDS — and the small touches backlog
_Working reference: the WEATHER / DIRT / SEEDS / HORN sections of `reference/src/levels/valley.js` (play it in reference/demos/valley.html). Keys 5–8 switch weather, G plants a seed, Q is the horn, F shows the live readout._

## 1. Weather you can watch arrive
States: **Clear · Mist · Rain · Snow**. They're picked by the journey script, the Forecast (JOURNEYS §1.13), the dev panel, or the player in free roam.
- **Arrival is slow.** Rain builds at k = 0.09/s and stops at 0.14/s; mist at 0.12/s, snow at 0.1/s. You get about 15 s of watching it come.
- **Rain curtain:** while rain is building, 7 tall streaked planes advance down the valley toward you (330 m → 0 as rain goes 0 → 0.55), then you're inside it.
- **Inside the rain:**
  - 2,600 streaks around the camera at 26 m/s, opacity 0.32 × rain.
  - Drop splashes on the ground and ripples on puddles and the lake.
  - The sky darkens (`TOD.dark = rain × 0.55`), the fog goes grey and thicker (+0.006).
  - Sound: a rain hiss (high-pass noise) and rare distant thunder.
- **Wet world:** `wet` rises while it rains (0.06/s) and dries slowly afterwards (0.012/s).
  - Wet ground is 28% darker and shiny on upward faces (roughness → 0.32).
  - Puddles appear and grow along paths and mirror the sky (water shader with flow 0). Pothole puddles grow too.
- **Rainbow:** after any real shower (peak rain > 0.45), when the rain fades, a rainbow rises opposite the sun for about 70 s. Daylight only. It's announced with one quiet line.
- **Mist:** 34 low banks roll across the valley floor 2–8 m up; fog +0.013.
- **Snow:**
  - 2,200 drifting flakes.
  - Snow settles on upward faces over time (`snowCover`, 0.02/s); patchy noise keeps it natural. It melts afterwards, faster in rain.
  - Roofs collect snow too (see §2).
- **Cloud shadows:** on clear days, large soft shadows slide across the land (noise in the ground shader, 30% strength × daylight). Off in rain, mist and snow.
- **Port:** one `patchGround(material)` shader patch (wet, cloud shadows, settled snow) applied to the terrain, paths and rocks; a `Weather` store; and the particle and line systems above.

## 2. The vehicle gets dirty (and clean)
One shader patch on every body material. Dirt is computed in the vehicle's own space, so it moves with it.
- **Where dirt sits:** low panels first (below 0.35–1.7 m), more toward the rear, broken up by splatter noise. It never covers the glass or the lights.
- **Dust vs mud:** dry driving builds beige dust slowly; wet ground builds dark brown mud about 4× faster, with flying mud flecks off the tyres. Off-path meadow is dirtier than the stone path.
- **Cleaning:** driving through a stream or ford cleans fast (0.22/s). Standing in heavy rain cleans slowly.
- **Snow on the roof:** it builds while snowing (0.03/s) and a little from spray on the snow pass, then melts slowly below the pass.
- **Persist** dirt and roof snow in the save. Later, a Garage "wash" option and a "keep it muddy" toggle.

## 3. Seeds → plant anywhere → they grow
- **Seed pods:** about 26 glowing puffballs (one per flower species) beside the path. They glow brighter at night.
- **Collecting:** drive within 3.2 m to collect. The seed goes in a small pouch shown bottom-left as coloured dots, with a soft chime and white fluff drifting away.
- **Planting:** stop anywhere off the path (not in water or snow) and the prompt "G · Plant a seed here" appears (tap it on touch). The seed is planted 3 m to your right, with a little wooden stake and a ribbon in the flower's colour.
- **Growing:** 34 flowers of that species grow in with a staggered smoothstep, with sparkles while growing. The demo takes 24 s; **in game, a full in-game day** (they're half-grown the next time you pass).
- **Remembered:** the garden is saved as {x, z, species}. It's there on every return, and planted flowers **spread a little each in-game week** (a new small patch nearby).
- **Later:** plant seeds from one region in another (poppies in the first valley). The Journal shows a "garden" page with a map pin and the date for each planting.
- **Each species has its own planting line:** "Blue poppies, here, forever now", "Lupins. Give them a minute", and so on.

## 4. Horn that echoes
Two-tone horn (370/466 Hz square through a 1.9 kHz low-pass) into a 0.62 s echo with 38% feedback, but only in valleys and canyons. 40% of the time a shepherd's whistle answers 1.7 s later.

## 5. Small-touches backlog (in priority order)
| # | Touch | Notes |
|---|---|---|
| 1 | Seasons per region | Spring / summer / autumn / winter palettes + foliage, plus flowers in the right season |
| 2 | Animals | Yaks near the stupa, deer at dusk, an eagle on thermals, jumping fish. They react softly |
| 3 | Shooting stars | Rare on clear nights; spotting 3 in a night earns a dashboard star charm |
| 4 | Your own camp spot | Leave tent, chairs and lantern anywhere; they persist |
| 5 | Cab camera | First-person dashboard with a swinging charm, a chai cup, rain on the windscreen and wipers |
| 6 | Regional radio | Soft local music per region, fades with distance; off by default |
| 7 | Scrapbook Journal | Postcards + route lines + pressed flowers + stamps + tickets |
| 8 | Traveler errands | "Take this letter to my sister in the tea hills" — described, never marked |
| 9 | Quiet spots | ~20 benches; sitting plays a camera moment + a line of poetry |
| 10 | Photo requests | NPCs ask for a specific shot at a specific time |
| 11 | Postcard maker | Frame, caption, date, download as an image |
| 12 | Ghost trails | Faint trails of other drives (local first) |
| 13 | Breath and exhaust steam | Cold nights and snow |
