# JOURNEYS — the level bible
_Read only the section a TASK cites. Numbers here are targets; tune by feel, log changes in STATUS._

## 0. The shape of the game

A **Journey** = one level. Each one has its own region, a vehicle, a light goal, a time-of-day arc and an ending moment.
Journeys are picked on the **Atlas** (a hand-drawn map). Finishing one draws the dotted route onward and reveals the next place.
After you finish a journey, its region stays open as **Wander** (no goal, postcards, travelers, campfires).

**Never:** timers, fail screens, game over, scores, stars, combat.
**Instead:** gentle challenge (balance, care, reading terrain) and consequences that only change the *story* ("Five of six crates made it.").

### Why people stay 3–4 hours
1. **8 journeys × 25–40 min.** Each one adds a new vehicle feel, a new weather or time, and a new kind of place.
2. **Every ending is a reward to look at.** You climb for 30 minutes and then the clouds are below you at sunset.
3. **Wander mode** afterwards, with 5 postcard spots per region found by exploring.
4. **The Garage** fills up. Every journey earns a cosmetic or small handling mod.
5. **Travelers.** One friendly line each, and they remember you ("You made it up with the crates!").
6. **Campfires** save the game, let you skip time to golden hour or night, and the camera settles into a slow orbit. People will idle here.

---

## 1. Shared systems (build once, used by every journey)

### 1.1 Journey config
```ts
type Journey = {
  id: string; title: string; line: string;          // atlas copy
  region: RegionId; vehicle: VehicleId;
  start: { pos: [number,number,number]; yaw: number };
  tod: { from: number; to: number };                // 0 dawn … 3 golden, 4 night
  weather: WeatherScript;                           // keyframes by progress 0..1
  beats: Beat[];                                    // ordered trigger volumes → events
  ending: EndingId;
  reward: ModId[];
};
```
Progress 0..1 comes from distance along the journey's route spline. Weather and time are driven by **progress, not clock**, so dawdling never "misses" the sunset.

### 1.2 Cargo
- Rack slots hold dynamic Rapier bodies (crates, firewood bundles, a generator). Each one is held by a soft "strap" joint that breaks above a force threshold.
- Strap break cues: a rack creak sound rises with load, the crate wobbles visibly, then it falls.
- **Fallen cargo stays in the world.** Drive alongside it slowly (< 2 m/s, within 3 m) and hold **E**: it gets lifted back with a 0.8 s smooth lerp (no physics).
- Cargo that goes off a cliff is gone. The ending text counts what arrived.
- HUD: a row of small glyphs, bottom-left, 32% ink. It brightens for 3 s when a crate shifts or falls, then fades again.

### 1.3 No-fail recovery
- Wheels over a cliff edge, or the vehicle on its side for more than 1.5 s: fade to 40% black over 0.6 s, place the vehicle back on the last safe spline point, fade back in. No text, no penalty.
- The vehicle never respawns into the cargo it lost; lost cargo stays where it fell.

### 1.4 Beats
Trigger volumes along the route → `fog`, `wind gust`, `animal crossing`, `traveler line`, `camera moment` (a 2 s slow pan to a view, letterbox, input stays live), `music cue`, `discovery`.

### 1.5 Campfires
2–3 per journey. Arriving saves the game. Hold **E** to sit: the UI fades, the camera does a slow orbit, ambient sound swells. Offer "Wait until golden hour" / "Wait until night" (smooth 6 s time sweep). These double as checkpoints.

### 1.6 Postcards (photo mode)
**P** = photo mode: UI off, free orbit around the vehicle, small FOV and time-of-day nudge. 5 postcard spots per region are marked by something physical (a bench, a tripod, a carved stone). A photo taken there is saved to the Journal with a place name. Photos taken anywhere else still save, just without a name.

### 1.7 Travelers (NPCs)
Low-poly people and animals with simple idle loops (sit by a fire, walk a short loop, wave). When you stop within 6 m, one line of text appears above them in Jost 300, fading in. 2–4 lines each; later lines unlock after journeys. They never give quests and never block the trail.

### 1.8 Garage (in the Atlas)
Turntable view of each vehicle. Mods: paint (6 earned palettes), roof/rack items, tyres (grip +/−, look), lights (warm/cool, fog lamps), horn sound, flag/charm on the antenna. Each mod changes handling by ±5–10% at most. Everything is cosmetic-first.

---

## 2. Vehicles

| id | name | used in | feel |
|---|---|---|---|
| rover | the Rover | 1, 3 (boat mode), 4, 6, 8 (glider mode) | Balanced and forgiving (existing tuning) |
| mule | the Mule (3-wheel cargo auto) | 2, 7 | Slow, torquey, tippy, carries cargo |
| snowcat | the Snowcat (tracked) | 5 | Heavy, unstoppable, wide turns, tows a sled |

### 2.1 The Mule
A three-wheeled cargo auto-rickshaw (Ape-style): one front wheel, two rear, a small cab and a flat wooden rack behind.
- **Look:** faded teal cab `#4F8C88`, cream roof `#E6DCC4`, wooden bed `#8A6A45` with slatted sides, one round headlight, mudflaps, a little bell charm, rope ties on the cargo.
- **Size:** wheelbase 2.2, rear track 1.25, wheel r 0.32, cab 1.3 w × 1.6 h. Bed 1.5 × 1.6.
- **Handling targets:** max 13 m/s (8 loaded uphill), accel 6, brake 18, steer rate 1.9 rad/s (tight), gravity 24.
- **Tippiness is the core feel:** lateral accel above 5.5 m/s² lifts the inside rear wheel and the body leans visibly; above 7.5 it rolls (→ §1.3 recovery, cargo spills). Loaded cargo raises the center of mass, so a full rack tips earlier. The player learns to go slow on corners.
- **Sound:** a two-stroke putt: square wave 28–70 Hz plus short noise bursts per "cylinder fire", rattles from the rack scaled by bumpiness, a creak under load.
- **Camera:** dist 7.2, height 2.8 (it's smaller), slightly more lag so the lean reads.

### 2.2 The Snowcat
Twin tracks and a boxy orange cab `#D9773A`; tows a wooden sled. Max 9 m/s, never slides, turns wide, crushes small snow drifts. Lays deep track marks.

### 2.3 Rover modes (later phases)
- **Boat:** wheels fold up, a small prop drops down, the side panels lift into floats. The transformation is a 3 s cinematic in shallow water.
- **Glider:** panels unfold into wings, launched from a ramp-like ridge. Glides with slow altitude loss and catches thermals over sunlit rock.

---

## 3. The journeys

### J1 — The Overlook ✅ (built)
Valley · Rover · morning → late morning. Learn to drive, find the light on the ridge. Hidden: the old track to **The Tarn**.
Reward: Rover paint "Dawn". Unlocks J2 on the Atlas.

### J2 — The Long Way Up ★ next to build
**Kettle Peak** · Mule · morning → sunset.
**Goal:** carry 6 crates up the spiral trail to the hut at the summit. The keeper is waiting for supplies before the snow.
**Atlas line:** "Six crates. One road. It goes round and round, and up."

**Mountain:** a conical peak ~240 m high, base radius ~260 m. The trail spirals 3.5 turns counter-clockwise (~2.8 km) at a steady 7–9% grade with short 12% ramps. Width 5 m, narrowing to 3.6 m on ledges. It's banked 3° inward, with cliffs on the outer side guarded by sparse stone walls and wooden posts. The trail surface is packed dirt with wheel ruts (vertex color + small normal dips), and grass grows along the middle strip. Build the trail as a spline: the terrain is carved to it, the spline drives `progress`, and posts and walls are placed along it.

**Turn 1 — Orchard foothills** (progress 0–.25, morning)
- Apple trees and stone terraces, a farmhouse where a traveler waves ("Mind the corners with a full rack.").
- **Obstacles:** a goat herd crossing (stop or honk with H; they amble off in 6–10 s), a mud patch (grip drops 40%; slow and steady gets through, spinning sprays mud).
- Campfire 1 at a terrace bench.

**Turn 2 — Pine shoulder** (.25–.5, late morning)
- Dense pines, needles on the trail, dappled light.
- **Obstacles:**
  - A fallen log across the trail. Nudge it at low speed and it rolls off the cliff edge, which is satisfying. Hitting it fast bounces the cargo.
  - A rockslide spill: 20–30 small dynamic rocks. Crawl through or the crates jostle.
  - A plank bridge over a washed-out gap. It sways and creaks; above 5 m/s the boards bounce the cargo.
- Beat: an eagle flies past the cliff edge at eye level (camera moment).

**Turn 3 — The cloud band** (.5–.75, afternoon)
- The trail enters cloud. Fog density ramps ×6, sound gets muffled (lowpass on ambience), visibility drops to ~25 m.
- **Wayfinding:** prayer-flag-style poles with small bells. You hear the next bell before you see it (positional audio). No HUD marker.
- **Obstacles:** two tight hairpin switchbacks on a cliff ledge (3.6 m wide). The real challenge is a full rack plus the tip threshold, so go slow.
- Campfire 2 at a stone shelter inside the cloud. Gentle wind sound, totally calm.

**Turn 4 — Above the clouds** (.75–1.0, golden hour → sunset)
- Break through the cloud tops. **Camera moment:** letterbox, slow 4 s pan across the cloud sea, music cue (first music in the game).
- Light snow on the trail (grip −25%) and crosswind gusts that push the rack sideways. Leaning into the turn helps; just ease off.
- A final 12% ramp to the hut. Prayer flags, stacked stones.

**Ending**
- Park by the hut. The keeper unloads the crates one by one (each glides to a stack).
- Lanterns light up one per delivered crate, with a slow pan, sunset, and the cloud sea below.
- Text (Marcellus title + Jost line):
  - 6/6: "Every crate. The keeper says he'll owe you one."
  - 3–5: "{n} of six made it. The rest are somewhere on the mountain."
  - 0–2: "The keeper laughs. The view was the point anyway."
- Lost crates stay on the mountain in Wander mode. Bringing one up later adds a lantern and a new keeper line.

**Reward:** Mule paint "Monsoon", Rover roof lantern. Unlocks J3.
**Postcards:** orchard terrace, the bridge, the bell poles in fog, the first view above the clouds, the hut at dusk.

### J3 — Lantern River
River gorge → lake village · Rover **boat mode** · dusk → blue hour.
Float downriver and place 5 paper lanterns at shrines along the banks (stop beside a shrine, hold E). Includes rapids (gentle current push), a slow stretch under a stone arch, and fish jumping. Ending: the village sets hundreds of lanterns on the lake, reflected in the water. Reward: boat horn, Rover paint "Ember".

### J4 — Firefly Road
Old forest · Rover with headlights · night.
Fireflies drift in a loose trail, so follow them. The headlights make the main light pools, and moonlight falls through gaps in the canopy. Includes an owl, a deer in the headlights (stop and it walks off), and a ruined observatory in a glade. Ending: meteor shower, the camera tilts up slowly, stars wheel. Reward: fog lamps, a star charm.

### J5 — First Snow
High pass · Snowcat towing a sled of firewood · winter afternoon → snowy night.
Bring firewood to a cabin before the snow gets heavy. Snowfall starts light. On a frozen lake the ice creaks above 6 m/s and visible cracks spread, but it never breaks; the player just learns to slow down. Expect drifts to plow, a blizzard section followed by sudden calm, and the cabin's chimney smoke. Ending: the fire lights up, warm windows glow in the blue night. Reward: snow tyres for the Rover, a wool scarf on the mirror.

### J6 — The Salt Mirror
Salt flat + dunes · Rover · sunrise.
After 30 minutes of mountains, this is the speed one. The flat is wet, so the sky reflects perfectly. Mirages: shapes on the horizon that fade as you approach. One of them is real: the oasis. Kites fly over a dune camp. Ending: the sunrise reflected on the wet salt, and you are driving across the sky. Reward: wide sand tyres, a kite on the roof rack.

### J7 — The Lighthouse
Coastal cliffs · Mule carrying a generator · storm → clear sunset.
Rain makes the roads slick and the wipers go. Waves hit the rocks below, and lightning lights the cliffs. The generator is a single heavy cargo item that tips the Mule easily. Ending: the lighthouse beam comes on, the storm breaks into a rainbow sunset, and the beam sweeps across the sea. Reward: Mule paint "Harbour", wipers on the Rover.

### J8 — Above the Clouds (finale)
The whole world · Rover **glider mode** · golden hour.
Launch from Kettle Peak. You can glide over every region you have visited, and its landmarks light up as you pass. No goal; the credits appear as place names drifting across the sky. Ending: you land in the first valley at the Overlook as the sun sets. Afterwards the whole world is in Wander mode with free vehicle choice.

---

## 4. Atlas UI (see reference/atlas.html)
- The title menu becomes: **Continue · Journeys · Settings · Exit**. Continue resumes the last journey or the last Wander session.
- The Atlas is a hand-inked map on warm paper, with a dotted route between places.
  - Finished places are solid ink with a small sun mark.
  - The next place has a slow pulse.
  - Unrevealed places are faint pencil reading "Beyond the ridge".
- Selecting a place shows a detail panel (lower-left, same text-only style as the menu): title, line, vehicle, rough length ("about half an hour"), postcards found (dots, not numbers), and Begin / Wander.
- Tabs along the top edge: **Map · Garage · Journal**.
- Opening from the title: the scene blurs and the paper slides up 24 px while fading in over 0.9 s, smooth ease.
