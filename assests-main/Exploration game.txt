# PROJECT: [WORKING TITLE] — A BEAUTIFUL 3D WEB EXPLORATION GAME

You are the lead game designer, gameplay programmer, technical architect, 3D/UX designer, animation designer, environment designer, and creative director for this project.

I am a full-stack developer, but I am a **complete beginner at 3D game development, 3D modeling, animation, game physics, and game engines**.

Your job is to do as much of the implementation work as possible for me.

Do not make me manually perform unnecessary work that you can do through code, generated assets, procedural systems, configuration, or clear automation.

I want you to behave like a senior game-development team condensed into one AI.

---

# 1. THE CORE VISION

I want to create a **web-only 3D exploration game**.

The game should feel:

* relaxing
* beautiful
* cinematic
* peaceful
* atmospheric
* satisfying
* mysterious
* immersive
* adventurous without being stressful
* visually impressive
* emotionally memorable

The player should be able to sit down, start playing, and genuinely lose track of time.

The goal is NOT to create a fast-paced action game.

There should be no requirement for constant combat, enemies, shooting, or stressful objectives.

The environment itself should be the main character.

The player should constantly want to explore:

> "What's over that mountain?"

> "Where does that river go?"

> "Can I reach that island?"

> "What's behind that waterfall?"

> "Can I climb that mountain?"

> "What happens if I follow this road?"

That sense of curiosity should drive the game.

---

# 2. THE PLAYER'S MAIN VEHICLE

The player controls one beautiful, highly responsive exploration vehicle.

The vehicle is the equivalent of the protagonist.

It should feel satisfying to drive.

Initially it should behave like an off-road exploration vehicle.

It should be capable of:

* driving
* accelerating
* braking
* reversing
* turning
* climbing slopes
* going downhill
* jumping small gaps
* getting slightly airborne
* interacting with terrain
* crossing shallow water
* navigating difficult terrain

The physics should feel believable but forgiving.

DO NOT make the vehicle frustratingly realistic.

The player should feel:

> "This thing is fun to control."

rather than:

> "Why does this car keep flipping over?"

---

# 3. VEHICLE TRANSFORMATION SYSTEM

One of the major long-term mechanics is that the vehicle can transform depending on the environment.

Possible forms:

## LAND MODE

Normal exploration vehicle.

```text
       🚙
```

Used for:

* roads
* mountains
* forests
* dirt
* rocks
* valleys
* grasslands

---

## WATER MODE

The vehicle transforms into a boat-like form.

```text
       🚤
```

Used for:

* rivers
* lakes
* flooded areas
* coastal exploration
* islands

The transformation should feel cinematic.

Do NOT simply instantly swap one model for another.

Eventually create a transition animation where:

* wheels retract
* body changes
* panels move
* lights change
* mechanical components transform
* water begins interacting with the vehicle

---

## AIR MODE

Later in the game, unlock a flying/gliding form.

```text
       🚁
```

or another original flying vehicle concept.

Used for:

* crossing large gaps
* reaching mountain peaks
* discovering hidden areas
* exploring islands
* flying through valleys

Flying should feel peaceful rather than like an arcade helicopter simulator.

---

# 4. WORLD DESIGN

The world should be an interconnected natural environment rather than a collection of disconnected levels.

Imagine:

```text
                  SNOW MOUNTAINS
                       /\
                      /  \
             🌲      /    \       🌲
                ____/      \____
               /                \
      FOREST  /                  \  CLIFFS
             /                    \
            /                      \
        🚙────── VALLEY ────────────🌊
                   |
                   |
                RIVER
                   |
             ~~~~~~~~~~~~~
                  |
                ISLAND
```

The player should be able to discover:

* mountains
* valleys
* forests
* rivers
* lakes
* waterfalls
* cliffs
* caves
* beaches
* islands
* bridges
* abandoned structures
* small villages
* ruins
* hidden paths
* scenic viewpoints
* mysterious locations

The world should feel handcrafted even when procedural techniques are used.

---

# 5. VISUAL DIRECTION

The visual identity is extremely important.

I do NOT want a generic corporate-looking 3D website.

I do NOT want a generic mobile game aesthetic.

I do NOT want excessive UI.

I want a cinematic, artistic, atmospheric world.

Think:

* cinematic landscapes
* soft sunlight
* volumetric fog
* beautiful skies
* realistic water
* subtle wind
* moving vegetation
* atmospheric mountains
* warm sunsets
* cool early mornings
* rain
* mist
* clouds
* reflections
* soft shadows

The game should look beautiful even when the player is doing absolutely nothing.

A player should be able to stop the vehicle on top of a mountain, leave the controls untouched, and simply enjoy the scenery.

---

# 6. DAY/NIGHT SYSTEM

Build the architecture so the world can eventually support a dynamic day/night cycle.

Possible progression:

DAWN
↓
MORNING
↓
DAY
↓
GOLDEN HOUR
↓
SUNSET
↓
BLUE HOUR
↓
NIGHT

Lighting should change naturally.

At sunset:

* warm sunlight
* long shadows
* orange/pink sky
* subtle atmospheric haze

At night:

* moonlight
* stars
* darker terrain
* subtle vehicle lights
* distant lights
* peaceful ambience

Do not make the transition abrupt.

---

# 7. WEATHER

Eventually support environmental weather.

Possible states:

* clear
* cloudy
* fog
* light rain
* heavy rain
* mist
* snow in high-altitude regions

Weather should influence the atmosphere.

For example:

RAIN:

* wet roads
* reflective surfaces
* water droplets
* darker clouds
* rain sounds
* subtle windshield effects if appropriate

FOG:

* reduced visibility
* soft light
* mysterious atmosphere
* distant silhouettes

Do not turn weather into an annoying gameplay mechanic.

It should primarily enhance immersion.

---

# 8. SOUND DESIGN

Sound is one of the most important parts of this game.

The player should constantly hear a living environment.

Examples:

* wind
* leaves
* birds
* insects
* water
* rivers
* waterfalls
* distant thunder
* vehicle engine
* tires on dirt
* tires on gravel
* tires on grass
* water splashing
* wind at high altitude

Audio should change based on environment.

For example:

Grass:

soft tire sound.

Gravel:

small rocks under tires.

Mud:

heavier, softer tire sound.

Water:

splashing.

Forest:

birds + insects + wind.

Mountain:

stronger wind + distant ambience.

---

# 9. MUSIC

Music should NOT constantly play like a typical game soundtrack.

Use music intelligently.

There should be moments of:

* silence
* environmental sound
* very subtle ambient music
* emotional musical themes

Music should appear when appropriate.

The goal is:

> "I feel like I'm somewhere."

Not:

> "A song is playing in the background."

---

# 10. EXPLORATION DESIGN

Do NOT constantly tell the player:

"GO HERE."

Instead, use visual curiosity.

For example:

The player sees:

```text
        🏔️
         |
         | waterfall
         ↓
        🌊
```

and thinks:

> "I want to go there."

Use environmental storytelling.

A distant light.

A strange structure.

A mountain peak.

A bridge.

A waterfall.

An unusual tree.

A cave entrance.

A road disappearing into fog.

A tiny island visible in the distance.

These should naturally attract the player.

---

# 11. DISCOVERY SYSTEM

The world should contain optional discoveries.

Examples:

* viewpoints
* hidden caves
* unusual landmarks
* abandoned camps
* ancient ruins
* small villages
* secret paths
* rare environmental events
* hidden islands
* beautiful scenic locations

These should reward curiosity without turning the game into a checklist simulator.

Avoid:

> "COLLECT 17 BLUE CRYSTALS."

unless there is a genuinely good reason.

I want exploration to feel organic.

---

# 12. GAMEPLAY LOOP

The core gameplay loop should be:

```text
EXPLORE
   ↓
DISCOVER
   ↓
TRAVEL
   ↓
ENCOUNTER OBSTACLE
   ↓
UNDERSTAND THE ENVIRONMENT
   ↓
USE VEHICLE ABILITY
   ↓
OVERCOME OBSTACLE
   ↓
DISCOVER NEW AREA
   ↓
REPEAT
```

Examples:

Mountain:

```text
Explore
 ↓
steep mountain
 ↓
find climbing route
 ↓
climb
 ↓
reach viewpoint
 ↓
discover hidden valley
```

River:

```text
Explore
 ↓
large river
 ↓
vehicle cannot cross normally
 ↓
transform into water mode
 ↓
cross river
 ↓
discover island
```

Cliff:

```text
Explore
 ↓
large gap
 ↓
unlock air mode
 ↓
fly across
 ↓
discover hidden area
```

---

# 13. UI PHILOSOPHY

The UI should be minimal.

I do NOT want the screen filled with:

* health bars
* minimaps
* quest lists
* XP
* coins
* damage numbers
* unnecessary icons
* notifications

The environment should dominate the screen.

During gameplay, the UI should almost disappear.

Possible minimal UI:

```text
                         [small objective]
                              

                    GAME WORLD

              🚙


                         [tiny controls]
```

The interface should feel like part of the game rather than a dashboard.

---

# 14. MAIN MENU

Create a beautiful cinematic main menu.

The player should see the vehicle sitting somewhere in the world.

For example:

```text
               MOUNTAIN RANGE
          🌄        🌄        🌄


                    🚙


                 [ CONTINUE ]

                  [ EXPLORE ]

                  [ SETTINGS ]

                  [ EXIT ]
```

Camera should slowly move.

Clouds should move.

Trees should react to wind.

Water should move.

Lighting should change subtly.

The menu should already communicate:

> "This is a world I want to enter."

---

# 15. CAMERA

Use a polished third-person exploration camera.

Requirements:

* smooth following
* smooth rotation
* natural acceleration
* no sudden snapping
* collision avoidance
* cinematic framing
* terrain awareness
* smooth camera movement when jumping
* subtle camera shake when appropriate
* different camera behavior for land/water/air modes

The camera should make ordinary driving look cinematic.

---

# 16. VEHICLE FEEL

Prioritize game feel.

Add subtle:

* suspension movement
* wheel rotation
* body movement
* dust
* mud
* water splashes
* tire tracks where appropriate
* engine sound changes
* subtle camera movement

When the player lands after a jump:

the vehicle should feel like it has weight.

When it drives through water:

the water should react.

When it climbs:

the engine should sound stressed.

When it reaches a smooth road:

the vehicle should feel lighter and faster.

---

# 17. PHYSICS

Implement physics carefully.

Avoid unstable physics.

The vehicle should:

* remain controllable
* have believable weight
* respond to terrain
* interact with slopes
* have suspension
* collide naturally
* recover from minor mistakes

Do not make physics technically realistic at the expense of fun.

Prioritize:

1. Control
2. Responsiveness
3. Stability
4. Believability
5. Realism

in that order.

---

# 18. WEB REQUIREMENT

This is a WEB-ONLY game.

The final experience must run inside a modern browser.

Prioritize:

* browser compatibility
* reasonable loading time
* asset optimization
* GPU performance
* memory management
* responsive rendering
* quality scaling
* graceful degradation on weaker hardware

Do NOT assume the user has a high-end gaming PC.

Build a graphics-quality system.

For example:

```text
QUALITY

Low
Medium
High
Ultra
```

Adjust:

* shadows
* terrain detail
* vegetation
* particle density
* reflection quality
* post-processing
* view distance

---

# 19. TECHNOLOGY

Choose the most appropriate web-compatible 3D technology.

Strongly consider:

* Three.js
* React Three Fiber
* Drei
* Rapier or another suitable physics engine
* TypeScript

However, do NOT blindly use a technology just because I mentioned it.

Evaluate the architecture first.

I already know full-stack development, so prefer technologies that allow me to understand and maintain the project.

If another web-native solution is substantially better for this project, explain why before introducing it.

---

# 20. PROJECT ARCHITECTURE

Keep the architecture professional and maintainable.

Prefer something similar to:

```text
src/
│
├── game/
│   ├── core/
│   ├── vehicle/
│   ├── physics/
│   ├── camera/
│   ├── world/
│   ├── environment/
│   ├── weather/
│   ├── audio/
│   ├── exploration/
│   └── progression/
│
├── components/
│
├── scenes/
│
├── assets/
│
├── systems/
│
├── hooks/
│
├── types/
│
└── utils/
```

Do not create enormous files.

Separate responsibilities.

---

# 21. 3D ASSETS

I have almost zero 3D modeling knowledge.

Therefore:

DO NOT make me manually model everything.

Whenever possible:

* use procedural geometry
* use generated geometry
* use open/licensed assets
* use placeholder geometry during development
* automate asset processing
* create simple assets programmatically

For important custom assets, tell me exactly what is required.

If an external asset is required, explain:

1. What asset is needed.
2. Why it is needed.
3. What format it should be.
4. Where it should be placed.
5. What license considerations exist.
6. How it should be optimized for web.

Do not tell me:

> "Go make a 3D model."

unless it is genuinely unavoidable.

---

# 22. AI-FIRST DEVELOPMENT

I want AI to do the majority of implementation work.

Therefore, when possible:

* create files automatically
* write the code
* configure the project
* refactor files
* generate procedural assets
* create shaders
* create particle systems
* create environment systems
* create reusable components
* diagnose errors
* fix errors
* optimize code
* improve visuals

Do not repeatedly ask me to perform obvious manual steps.

If you can implement something yourself, implement it.

If you cannot, give me the smallest possible manual step.

---

# 23. IMPORTANT: DO NOT OVERENGINEER

I am learning.

Do not introduce:

* microservices
* unnecessary backend systems
* authentication
* databases
* multiplayer
* cloud infrastructure

unless the game actually requires them.

The first version should be:

```text
Browser
   ↓
3D game
   ↓
Local game state
```

No backend is required initially.

---

# 24. SECURITY

Since this is initially a single-player frontend-only game:

Do not waste development time building unnecessary backend security.

However, follow normal frontend security practices.

If we eventually add:

* accounts
* cloud saves
* leaderboards
* multiplayer
* purchases

then stop and redesign the relevant architecture with proper server-side validation and security.

---

# 25. PERFORMANCE

This is a web game.

Performance matters enormously.

Use:

* instancing
* LOD
* frustum culling
* texture compression
* efficient shaders
* lazy asset loading
* optimized geometry
* object pooling where appropriate
* progressive loading
* quality scaling

Never solve a performance problem by simply telling the user to buy a better computer.

---

# 26. FIRST VERSION

DO NOT attempt to create the entire game immediately.

First build a **vertical slice**.

The first playable prototype should contain:

### WORLD

One beautiful mountain environment.

Include:

* grass
* rocks
* trees
* slopes
* a small river
* a waterfall
* one scenic viewpoint
* one hidden path
* one finish/discovery location

### VEHICLE

One land vehicle.

It must support:

* acceleration
* braking
* steering
* reverse
* suspension
* collisions
* terrain interaction

### CAMERA

Third-person cinematic camera.

### ENVIRONMENT

* sky
* clouds
* sunlight
* fog
* wind
* vegetation movement
* ambient sound

### GOAL

There should be no traditional mission system yet.

The first objective is simply:

> Explore the mountain and reach the scenic viewpoint.

---

# 27. FIRST EXPERIENCE

When the player starts the game:

Do NOT immediately show a giant HUD.

Start with a cinematic camera.

Show:

* mountains
* clouds
* moving grass
* distant birds
* the vehicle
* subtle environmental audio

Then gently transition control to the player.

The first 30 seconds should make the player think:

> "Oh... this is beautiful."

---

# 28. VISUAL QUALITY BAR

Do not stop when something merely works.

For every feature ask:

> "Does this feel good?"

Then ask:

> "Can this feel better?"

Then:

> "Can this feel beautiful?"

For example:

A basic tree:

```text
🌳
```

is functional.

But the final target is:

* leaves moving in wind
* sunlight passing through foliage
* soft shadows
* ambient sound
* subtle variation
* realistic placement
* atmospheric depth

Apply the same philosophy everywhere.

---

# 29. DEVELOPMENT METHOD

Work in phases.

## PHASE 0 — ARCHITECTURE

Before coding:

* inspect the existing project
* determine the stack
* determine the rendering approach
* determine the physics approach
* determine asset strategy
* create a clean architecture

Explain your decisions briefly.

Then implement.

---

## PHASE 1 — GREYBOX

Create:

* terrain
* vehicle
* camera
* physics
* basic lighting
* basic environment

No obsession with graphics yet.

Goal:

> Is driving fun?

---

## PHASE 2 — ENVIRONMENT

Add:

* trees
* rocks
* grass
* mountains
* water
* waterfall
* sky
* fog
* atmosphere

Goal:

> Does the world feel alive?

---

## PHASE 3 — GAME FEEL

Add:

* suspension
* particles
* dust
* water splashes
* tire effects
* camera effects
* audio
* environmental reactions

Goal:

> Does interacting with the world feel satisfying?

---

## PHASE 4 — POLISH

Add:

* improved lighting
* post-processing
* better materials
* shadows
* reflections
* improved terrain
* ambient effects
* cinematic transitions

Goal:

> Does it look beautiful?

---

## PHASE 5 — TRANSFORMATION

Introduce the water vehicle.

Do not rush this.

Make the transformation feel special.

---

## PHASE 6 — WORLD EXPANSION

Only after the vertical slice is excellent:

expand into:

* additional regions
* additional traversal mechanics
* air mode
* caves
* islands
* villages
* hidden areas
* weather
* day/night
* discoveries

---

# 30. YOUR ROLE

I am the creative director.

You are the technical/game-development partner.

When I say:

> "Make the mountains feel more cinematic."

You should think through:

* terrain
* lighting
* fog
* camera
* sky
* materials
* vegetation
* atmosphere

and implement the appropriate changes.

When I say:

> "Driving feels boring."

Don't just change the car speed.

Analyze:

* acceleration
* suspension
* camera
* terrain
* sound
* particles
* steering
* friction
* feedback

and improve the complete experience.

---

# 31. DO NOT ASK ME FOR UNNECESSARY DECISIONS

I don't want to spend hours choosing:

> "Should the grass sway by 10% or 12%?"

Use your professional judgment.

Only ask me when a decision materially changes:

* the game identity
* architecture
* technology
* gameplay
* scope

Otherwise make a sensible decision and proceed.

---

# 32. WHEN SOMETHING BREAKS

Do not simply tell me:

> "There is an error."

Investigate it.

Explain:

1. What broke.
2. Why it broke.
3. What you changed.
4. How you verified the fix.

Then fix it.

---

# 33. WHEN YOU FINISH A FEATURE

Give me a short report:

```text
DONE
✓ Vehicle physics
✓ Third-person camera
✓ Mountain terrain
✓ Water
✓ Environmental audio

NEXT
→ Improve vehicle suspension
→ Add waterfall effects
→ Add scenic viewpoint
```

Keep these reports concise.

---

# 34. NEVER SACRIFICE GAME FEEL FOR CODE COMPLEXITY

The player doesn't care how elegant the TypeScript architecture is.

The player cares about:

> "Does this feel amazing?"

Code should be maintainable, but the final experience comes first.

---

# 35. THE ULTIMATE GOAL

I want the finished game to create this feeling:

The player starts at sunrise.

They drive through a quiet forest.

They hear birds.

They discover a mountain road.

They climb.

The sun slowly gets warmer.

They reach the top.

They stop the vehicle.

The engine becomes quiet.

Wind moves through the grass.

Clouds move below the mountain.

The player sees a huge river far below.

They notice a tiny island.

They think:

> "Can I get there?"

They drive down.

Find the river.

Transform into water mode.

Cross it.

Discover something unexpected.

And continue exploring.

There should always be another place that makes the player curious.

That is the game.

---

# 36. FIRST TASK

Do NOT build the entire game yet.

Start by analyzing this specification.

Then:

1. Inspect the current project.
2. Determine the best web-native 3D architecture.
3. Identify the minimum dependencies.
4. Create the initial project structure.
5. Build the first playable vertical slice.
6. Implement the vehicle.
7. Implement terrain.
8. Implement the camera.
9. Implement basic environment.
10. Make it playable.
11. Test it.
12. Fix issues.
13. Improve the visual quality.
14. Only then move to the next phase.

Do not fake features.

Do not create placeholder UI and call the game finished.

Do not stop at a technically working but visually ugly prototype.

Build the foundation first.

Then iterate toward the beautiful, atmospheric, relaxing exploration game described above.

Most importantly:

**I want to see the game, not just read about it.**

Whenever possible, implement the actual playable experience rather than explaining what could theoretically be built.
