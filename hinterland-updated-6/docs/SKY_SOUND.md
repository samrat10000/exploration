# SKY + SOUND: cozy clouds, a sky worth looking at, fireworks, music
_Source: `reference/src/kit/clouds.js`, `skyextras.js`, `time.js` (cirrus), `fireworks.js`, `sound.js`. Each file's header lists its API. Play them in reference/demos/skyroad.html and valley.html._

## 1. Clouds (cozy cumulus, never flat layers)
- **Puffs:** every cloud is a cluster of soft instanced puffs. Each puff is shaded like a small sphere by the sun or moon:
  - warm, bright tops and cool lavender or blue undersides;
  - a silver lining when the sun is behind the cloud;
  - noisy, fluffy edges;
  - a slow billow (±5% size, 25 s period).
- **Shapes:**
  - `cumulus` = flat base + 2–4 rounded towers.
  - `cumulonimbus` = 2.6× taller, dark, with an anvil (storms).
  - `sea` = a lumpy carpet of cloud tops, with a darker floor plane underneath to fill the gaps.
- **Colour comes from the time of day:**
  - Golden hour: apricot tops, lavender shade.
  - Night: moon-silver tops, deep blue shade.
  - Rain or storm: darker (`dark`).
  - Lightning: lights the clouds from inside (`flash`).
- **Placement rules:**
  - A cumulus caps every thermal (pilots read it: "the cloud marks the lift").
  - The cloud sea ends in a wall of cumulus (a "reveal" edge).
  - Fair-weather cumulus float above, never on the flight line.
- **Performance:**
  - Budget about 8–9k puffs in the sky level and about 1.5k in ground levels.
  - Sort back-to-front every 0.35 s.
  - In game, add LOD (merge far puffs into impostor cards past 2.5 km) and cap puff count by quality preset (Low 3k, Medium 6k, High 9k, Ultra 12k).

## 2. The sky is never plain
- **Cirrus** (in the sky shader): high wisps that drift slowly. Warm near the sun, faint and moonlit at night.
- **Horizon glow:** a soft band of horizon colour just above the horizon line.
- **Sun rays:** a slowly turning star of soft beams around the sun. Strongest at dawn and golden hour, gone at night and under cloud.
- **Night:**
  - Stars that twinkle and a Milky Way band (time.js).
  - **Aurora** curtains (green to violet, rippling) on clear nights.
  - **Shooting stars** every 7–19 s.
- **Life:** geese in V formations cross by day. Balloons, dragons, birds and kites are per level.
- **Rule:** at least one moving thing in the sky in every shot.

## 3. Fireworks (realistic)
- **Rockets:** rise with a gold spark tail and a little smoke, and burst near the top of the arc. Some whistle.
- **8 shell types:**

| Type | What it looks like |
|---|---|
| peony | a sphere, sometimes colour-changing |
| chrysanthemum | glittering gold trails |
| willow | long drooping gold curtains |
| ring | a ring at a random tilt |
| palm | about 9 thick comets |
| crackle | gold stars that end in popping white flashes + crackle sound |
| strobe | white twinkling stars |
| crossette | stars that split into four |

- **Realism touches:**
  - A white core flash at each burst.
  - A coloured point light that briefly lights the land, water and smoke.
  - Smoke that lingers, lit by the next bursts.
  - Stars flicker as they burn out.
  - Air drag and gravity, so bursts slow and droop.
- **Colours:** real firework chemistry (strontium red, barium green, copper blue, sodium gold, titanium white, plus purple, pink and teal).
- **Sound:** a thump at launch (sometimes a whistle), a boom delayed by distance ÷ 343 m/s with a low rumble tail, and crackle bursts.
- **Where:**
  - Village festivals at night: a show every 1–3 s, with a finale of 12 shells every 45–65 s.
  - The lake in the Valley of Flowers at night.
  - **Anywhere: press C** to launch a small volley 40–60 m ahead.
- **Scale:** the `scale` option grows everything for far viewing (sky level 3.2, ground 1.25).

## 4. Music + sound
- **One mixer:** compressor → master, a 3.4 s hall reverb, and an echo (0.68 s) on the melody.
- **Generative soundtrack:** never the same twice, always gentle.
  - Slow pad chords (2.6 s swell) and a soft sine bass.
  - Sparse harp arpeggios.
  - A short melody every other bar, on the mood's own voice.

| Mood | Tempo | Key / chords | Voice |
|---|---|---|---|
| day | 64 bpm | D major (Dmaj9 – Bm7 – Gmaj7 – A6sus) | harp + flute |
| golden | 58 bpm | Gmaj9 – Em9 – D/F# – Asus | flute |
| night | 52 bpm | Fmaj7#11 – Cmaj9 – Am7 – Gsus2 | high bells |
| rain | 54 bpm | soft minor | harp |
| storm | 46 bpm | low drone only | – |

- **Breathing:** every 4th phrase rests (pad only), so it never nags.
- **Mood follows the world:** time of day, rain, storms. Changes land on the next 4-bar boundary, so they're never abrupt.
- **Music toggle:** M, on by default, at about −8 dB under the effects. Settings gets a separate music volume.
- **Shared effects:** `boom`, `launch`, `crackle`, `thunder` (crack + two-layer rumble), `chime` (discovery bell arpeggio). Wind, water, engine, birds and crickets stay per level.
- **Rule:** nature sounds always win. Music ducks by 30% during discovery cards and camera moments, then swells back.
