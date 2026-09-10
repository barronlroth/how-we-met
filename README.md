# How We Met

Two chapters of Barron and Nina's wedding game: the original pixel-art Toronto platformer and **Florida: Intracoastal Run**, a 3D airboat race for desktop and touch screens.

## Florida

Run `npm ci`, `npm test`, and `npm run build`, then `npm run preview`. Open `http://127.0.0.1:4179/florida/`.

The deployed game includes the Dream Loop artwork. Round eleven scored 6.9/10 and passed the lighting/color gate; the 8/10 visual target remains unmet. The best score held for three rounds despite structural changes, so further automatic iteration is paused for art-direction review. The artwork checkpoint's default-quality race averaged 58.5–60.0 FPS by district, and its 156 tests passed. Reconstructed water, corrected reflections, visible garment/fitting details and textured island ground are integrated. See [Dream Loop status and validation](docs/florida-dream-loop-validation.md).

- A/D or left/right arrows steer; S or down arrow brakes; hold it while steering to drift and earn boost. The boat accelerates automatically.
- Hold Shift to spend Cafecito Boost. Hold Space to fire the deck-mounted water blaster; steer the boat to aim. Escape or P pauses.
- Water shots damage targets: tubes pop, boats break apart in a cartoon splash, and gators disappear beneath the water. Damaged targets show health bars. Keep hitting rivals to eliminate them; their slowdown recovery window does not block damage. Missed shots do not clear nearby targets.
- Clearing a target removes its collision for this run and shows SPLASHDOWN! The finish panel counts targets cleared; replay restores all targets. Pickups, ramps, buildings, and landmarks remain intact.
- Flamingo Floatie absorbs one hit. SPF 1000 prevents slowdown from collisions for eight seconds.
- Complete the 4 km course through all four checkpoints to the 17th Street Causeway Bridge. Fisheries sits on the right on the southbound approach. The route is a compressed Fort Lauderdale highlight reel, with places rearranged for racing.
- Gold: 1:35 or faster. Silver: 2:00 or faster. Bronze: finish the course.
- Race through New River restaurants and towers, a superyacht marina, a rooted mangrove cut, an open party cove, and the bridge approach. Each district changes the shoreline, water color, and channel width. Close planting and homes fill the banks, while layered forest and a longer skyline keep the horizon occupied.
- Three rival boats race the route. Slipstream behind them to refill cafecito; close-call chains and ramps also reward boost. Marina and mangrove island splits offer routes on either side, with extra coffee on the marked mangrove shortcut.
- A departing yacht crosses the marina, and a water taxi and staggered tube riders cross the party cove. The 167 moored sport boats, superyachts, and sailboats share their visible positions with their collision shapes. Larger hulls block shots until repeated hits destroy them.
- Nina has 25 fictional friend roasts: five each for Miles, Brauser, Josh, Clark, and Dewey. Up to one line per friend plays during a run, with different jokes on replays. Checkpoint and collision calls take priority.
- “Watch a run” demonstrates the real driving physics without writing a best time.
- Best times stay in this browser; there is no shared Florida leaderboard or account service.
- On a phone, steer with the left thumb pad and pull down to brake/drift. Hold Cafecito to boost and SOAK to shoot water. Separate Drift and SOAK buttons sit on the right. Portrait and landscape are supported.
- Entry and pause settings let you choose Keyboard/Touch controls and Smooth/Detailed graphics. Coarse input defaults to Touch and Smooth; explicit choices persist in this browser. Rotation or switching away pauses the race.
- A current browser with WebGL 2 is required. Sound defaults on and starts at the first click, tap or keypress. Physical-phone performance has not yet been measured.
- Sound on plays the full 5:49 chiptune arrangement of Grind Mode's “I'm So High” alongside the game effects. Music loops across menus and races, pauses with the game or a hidden tab, and resumes from the same position. The first interaction starts playback automatically; the sound button still mutes both music and effects.

The runtime is split by responsibility:

- `core.js`, `course.js`, `controls.js`, and `graphics.js`: race rules, collision-backed route, independent touch/keyboard input, and quality settings.
- `hero-art.js`, `waterfront-art.js`, `vegetation-art.js`, and `landmark-art.js`: load the Blender exports; the waterfront loader adds shared facade and material refinements.
- `materials.js`, `art.js`, `detail-art.js`, `premium-art.js`, and `district-art.js`: surface maps and remaining native Three.js models.
- `world.js` and `scenery-batches.js`: district composition, independently staged opening yachts, indexed scenery batches, and visibility/destruction state.
- `sky.js`, `water.js`, `relief-field.js`, and `wave-codec.js`: generated sky/environment, reconstructed wind waves, original relief and reflected water. `loadWaterArt()` prepares the shared textures before world creation; gameplay samples the cached fields.
- `island-surface.js`: textured island tops and sloped shores inside the original course-space collision outlines.
- `postprocessing.js`: combines ambient occlusion with final color output. Geometry keeps four-sample Detailed or two-sample Smooth anti-aliasing; the final canvas has no redundant MSAA buffer.
- `effects.js`, `destruction-effects.js`, and `target-health.js`: wake/spray, pooled breakup pieces, and damage markers. `audio.js` mixes the streamed chiptune soundtrack with synthesized effects, `nina-lines.js` schedules banter, and `main.js` runs the game and UI.

F2 toggles local frame-rate, frame-pacing, draw-count, and per-sector diagnostics; it records only while visible. For repeatable comparisons, use the same viewport and `?benchmarkDpr=1.25` (or `1`). `benchmarkAA=2` or `4` permits controlled sample-count comparisons; F2 reports the actual value. Detailed caps device density at 1.25; Smooth caps it at 1, halves geometry samples and shadow-map resolution, and skips ambient occlusion. `scripts/build.mjs` preserves Toronto and bundles Three.js plus Florida into `dist/`.

To publish an update, run the tests and build, commit the source, and push the verified commit to `master`. The linked `how-we-met` Vercel project deploys automatically from GitHub. This uploads tracked source only; a separate CLI deployment is unnecessary. The live Florida chapter is at `https://how-we-met-six.vercel.app/florida/`.

The visual review history is recorded in [Dream Loop validation](docs/florida-dream-loop-validation.md). Earlier completed releases are historical evidence: [destruction validation](docs/florida-destruction-validation.md) records the shootable targets and their prior browser checks. The Blender waterfront kit, restored shoreline density, and earlier Safari comparison are recorded in [density correction validation](docs/florida-density-rescue-validation.md). The initial five-environment release, course traffic, and Nina banter are recorded in [district validation](docs/florida-districts-validation.md). The water blaster and rebuilt character shapes are recorded in [shape and shooting validation](docs/florida-shape-shooting-validation.md). Earlier mobile input behavior, viewport checks and hardware limits are recorded in [mobile validation](docs/florida-mobile-validation.md); previous art and rendering work is recorded in [Florida validation](docs/florida-v2-validation.md). For future model work, see [the Blender setup and export workflow](docs/blender-workflow.md). Blender is optional and is not a browser dependency. `npm run blender:hero` regenerates the player GLB; `npm run blender:waterfront` regenerates the waterfront kit, `npm run blender:vegetation` the foliage pack, and `npm run blender:landmarks` the bridge/Fisheries pack and review renders. Normal web builds consume the checked-in GLBs and do not need Blender.

## Original Toronto prototype

A small Phaser prototype for the "Meeting Nina" walking-simulator scene.

## What it is
- 640x360 pixel-art canvas scaled to fit the container
- Parallax background layers with infinite scrolling
- Hold-to-walk input (keyboard right arrow or pointer press)
- Distance-triggered meet event with a simple message overlay

## Project layout
- `index.html` / `styles.css` / `game.js` - The prototype page and Phaser scene
- `assets/` - Pixel art backgrounds and character images

## Run locally
From the repo root:

```sh
python3 -m http.server
```

Then open:

```
http://localhost:8000/
```

## Controls
- Hold Right Arrow to walk
- Press and hold (mouse/touch) to walk

## Tuning
Edit `game.js`:
- `WALK_SPEED` - walking speed
- `MEET_DISTANCE` - distance before Nina appears
- Parallax multipliers in `update()`
