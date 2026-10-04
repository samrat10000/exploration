# JOURNEYS — the level bible
_Read only the section a TASK cites. Numbers here are targets; tune by feel, log changes in STATUS._

## 0. The shape of the game

A **Journey** = one level. Each one has its own region, a vehicle, a light goal, a time-of-day arc and an ending moment.
Journeys are picked on the **Atlas** (a hand-drawn map). Finishing one draws the dotted route onward and reveals the next place.
After you finish a journey, its region stays open as **Wander** (no goal, postcards, travelers, campfires).

**Never:** timers, fail screens, game over, scores, stars, combat.
**Instead:** gentle challenge (balance, care, reading terrain) and consequences that only change the *story* ("Five of six crates made it.").

### Why people stay 3–4 hours
1. **14 journeys × 25–45 min (~7 h).** Each one adds a new vehicle feel, a new weather or time, and a new kind of place.
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

### 1.9 Grapple winch (Rover mod, from J3)
Iron anchor rings set into boulders are the only targets (they glint softly). Hold RMB/L2 to aim (snaps within 18 m) and release to throw (the hook flies in an arc). Then W reels in, S lets out and Q lets go. Rapier rope joint + motor; the winch slips at max tension and never snaps. The hook auto-releases when all four wheels are on top. Screens: "Grapple winch: aim / haul".

### 1.10 Flight (Sky Mule, Rover glider). The only flying vehicles for now
- Transformation only at launch ridges (windsock + stone ramp): hold T, then a 3 s cinematic.
- Glide model: lift ∝ speed², gentle sink, no stall-death (slow = nose drops by itself).
- Thermals (shimmer, seeds and birds circling) give lift.
- "Puff" = 3 charges of 4 s prop climb that refill slowly, fast in thermals.
- Hazards are bumps, never crashes: bird flocks (scatter + cargo jostle), storm turbulence, downdrafts near cliffs. Touching terrain = a soft bounce + auto-level; a hard hit = no-fail recovery (§1.3) to the last thermal.
- Landing: glide-path lights + landing ring = smooth auto-flare.
- Screens: Transformation, Flight HUD, Birds ahead, Thunderstorm, Landing approach.

### 1.11 Hut Rounds (delivery network, from J5)
- A depot loading pad plus 5 huts with different needs:
  - Tea house: orders flour and sugar, gives a thermos (warmth = longer night drives).
  - Weather station: orders batteries and paper, unlocks the Forecast.
  - Bakery: orders firewood and flour, gives bread.
  - Beekeeper: orders jars, gives honey.
  - Star-watcher: orders lens cloth and tea, unlocks meteor nights.
- Gifts become cargo for other huts, so the rounds chain together.
- Order slips (paper, top-left) instead of a quest log. Each visit = keeper line + Given → Received + a stamp.
- After J5, rounds regenerate every in-game day as optional play.

### 1.12 Make camp (Tortoise)
Hold E on flat ground: tent, awning, chairs and lantern appear (2.5 s). Radial: Light the lantern / Cook something / Sleep until morning / Take a photo. Counts as a campfire (save + time skip).

### 1.13 Stamps + Forecast
- **Stamps:** one per hut per season, collected in a passport (Journal tab).
- **Forecast:** after helping the weather station, choose tomorrow's weather (Clear / Mist / Rain / First snow).

### 1.14 Bus route (the Loaf, J10)
- **Stops:** a route of village stops. Pull into the stop's lay-by and hold E: the doors fold open, passengers board with their things (suitcases, a goat, a bicycle), and the doors close.
- **Bell:** a passenger rings the bell to ask for their stop. Missing a stop is fine: they laugh and walk back.
- **Comfort:** no score, only reactions. Smooth driving brings humming and chatter lines; big bumps bring "Steady!" and a chicken flapping. The ending line reflects it.
- **HUD:** seat dots (filled = passenger aboard) bottom-left and a paper ticket with the next stop's name top-left (screens: "Bus stops + passengers").

---

## 2. Vehicles

| id | name | used in | feel |
|---|---|---|---|
| rover | the Rover | 1, 3 (winch), 4 + 7 (boat), 6, 11, 14 (glider) | Balanced and forgiving |
| mule | the Mule | 2, 5, 13 | Slow, torquey, tippy, carries cargo |
| skymule | the Mule + Sky Kit | 9, 14 | Canvas wings + pusher prop; glide-first |
| snowcat | the Snowcat | 8 | Heavy, never slides, tows a sled |
| bus | the Loaf (village bus) | 10 | Long, slow, wide turns, very stable; passengers |
| tortoise | the Tortoise | 12 | Tiny round camper; slow; makes camp anywhere |

All models: `reference/assets.html` (Vehicles group). Each has its own feel; tune via `tuning.ts` per vehicle.

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

### J2 — The Long Way Up ✅ (built)
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

### J3 — Boulder Garden
A gorge of giant mossy boulders · Rover + grapple winch (earned at the start) · late morning.
**Goal:** reach the old stone bridge on the far side and drive across it.
- Anchor rings show the route: read the rocks, hook, haul up a face, roll across the top, lower down the other side.
- Three set pieces:
  1. a single tall boulder (learn it);
  2. a chain of three boulders with a gap between them (hook mid-air to the next one);
  3. a waterfall boulder, where you reel up through the spray.
- Optional: a hidden ring leads to a cave with a postcard spot.
**Ending:** at noon you cross the restored bridge with the gorge below. "The gorge is easier the second time." **Reward:** the winch stays on the Rover.

### J4 — Lantern River
River gorge → lake village · Rover boat mode · dusk → blue hour. Set lanterns at 5 shrines; rapids, a stone arch, fish jumping. **Ending:** the village sets hundreds of lanterns on the lake. **Reward:** boat horn, paint "Ember".

### J5 — Hut Rounds
High meadow ridge · Mule · morning → dusk. **Goal:** fill every hut's order (§1.11).
- The first round is scripted: depot → bakery → beekeeper → tea house → weather station → star-watcher, with gifts chaining between them.
- Each hut has its own keeper, two lines and a stamp.
- Light weather changes across the day.
**Ending:** at dusk all five huts light up along the ridge. "The ridge knows your engine now." **Reward:** stamp passport, rack lights; rounds become replayable.

### J6 — Firefly Road
Old forest · Rover with headlights · night. Follow the fireflies; meet an owl and a deer; find the ruined observatory glade. **Ending:** a meteor shower. **Reward:** fog lamps, star charm.

### J7 — Lake of Islands
A lake with 9 islands, jetties and a ferry · Rover in boat mode (from J4) · morning.
**Goal:** deliver the island post.
- Drive off beaches into the water and land at jetties.
- Each island has one resident and a flag.
- Gentle currents between islands, and a sandbar shortcut at low water.
**Ending:** every island's flag goes up as you pass. "The post is early for once." **Reward:** a mail-bag rack for the Rover.

### J8 — First Snow
High pass · Snowcat + firewood sled · winter afternoon → snowy night. Thin ice (never breaks), drifts, a blizzard then calm. **Ending:** cabin windows glow in the blue night. **Reward:** snow tyres, scarf.

### J9 — Sky Road ★ the flying journey
Valley → past Kettle Peak → the sky hut on the highest summit · Sky Mule with 3 parcels · morning → storm → clear evening.
1. **Launch:** the transformation on the first launch ridge. Learn to glide over the valley and find the first thermal above a sunlit cliff.
2. **The climb:** chain three thermals up to the cloud base, through a gap in the clouds and out above them (camera moment).
3. **Birds:** two murmuration zones above the cloud sea. Steer through the gaps; a hit is a bump, and a parcel can slip only if you bank hard.
4. **Thunderstorm:** the sky darkens and the objective shows "Weather coming in". Fly under the cell (turbulence, rain, lightning) or around it (longer, calmer). The sky hut's beacon stays visible through the rain.
5. **Landing:** glide-path lights to the hut's timber sky platform. The storm clears behind you into a rainbow.
**Ending:** the keeper (from J2) is amazed; the parcels hold a telescope for the star-watcher. "The keeper didn't think it could be done." **Reward:** Sky Kit for the Mule in free roam.

### J10 — Market Day
Hill villages strung along a valley road → the autumn market fair · the Loaf · morning → dusk.
**Goal:** run the market bus, 7 stops, and get everyone to the fair (§1.14).
- Each stop is a different village (bakery, goat farm, a vineyard, a lake jetty, a school, an old couple with a cake).
- Passengers chat to each other and to you, and their stories connect (two of them are going to the same wedding).
- Narrow stone bridges and a hairpin to take slowly. A level crossing where a little train goes by.
**Ending:** the fair at dusk (lanterns, music, a carousel) and everyone waves as they get off. The line depends on comfort: "Not a single egg broken." / "A bumpy one. They're still smiling." **Reward:** the Loaf for free roam, roof rack items.

### J11 — The Salt Mirror
Wet salt flat + dunes · Rover · sunrise. Mirages fade as you approach; one of them is the real oasis. **Ending:** driving across a reflected sunrise. **Reward:** sand tyres, roof kite.

### J12 — Slow Coast
Coast road with three coves · Tortoise · afternoon → night.
**Goal:** make camp at each cove (§1.12).
- Tide pools, a fisherman traveler, a sunset you can wait for.
- At the last cove: stars, waves, the lantern on.
- The coziest level, with no pressure at all.
**Ending:** "Nowhere to be. Nowhere you'd rather." **Reward:** the Tortoise for free roam.

### J13 — The Lighthouse
Coastal cliffs · Mule with one heavy generator · storm → clear sunset. Slick roads, wipers, waves below, lightning. **Ending:** the beam comes on and sweeps the sea under a rainbow. **Reward:** paint "Harbour", Rover wipers.

### J14 — Above the Clouds (finale)
The whole world · Sky Mule (or the Rover glider) · golden hour. Glide over every region you've visited; landmarks light up as you pass and the credits drift as place names. **Ending:** land at the first Overlook at sunset. Then every vehicle is open in every region.

---

## 4. Atlas UI (see reference/atlas.html)
- The Atlas shows 14 places (reference/atlas.html). The title menu becomes: **Continue · Journeys · Settings · Exit**. Continue resumes the last journey or the last Wander session.
- The Atlas is a hand-inked map on warm paper, with a dotted route between places.
  - Finished places are solid ink with a small sun mark.
  - The next place has a slow pulse.
  - Unrevealed places are faint pencil reading "Beyond the ridge".
- Selecting a place shows a detail panel (lower-left, same text-only style as the menu): title, line, vehicle, rough length ("about half an hour"), postcards found (dots, not numbers), and Begin / Wander.
- Tabs along the top edge: **Map · Garage · Journal**.
- Opening from the title: the scene blurs and the paper slides up 24 px while fading in over 0.9 s, smooth ease.
