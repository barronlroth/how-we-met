# How We Met

Two chapters of Barron and Nina's wedding game: the original pixel-art Toronto platformer and **Florida: Intracoastal Run**, a 3D airboat race for desktop and touch screens.

## Florida

Run `npm ci`, `npm test`, and `npm run build`, then `npm run preview`. Open `http://127.0.0.1:4179/florida/`.

- A/D or left/right arrows steer; S or down arrow brakes; hold it while steering to drift and earn boost. The boat accelerates automatically.
- Hold Shift to spend Cafecito Boost. Hold Space to fire the deck-mounted water blaster; steer the boat to aim. Escape or P pauses.
- Water shots travel forward and splash on impact. A direct hit briefly sends a tube rider aside, makes a gator duck, or slows a rival racer for 1.8 seconds so you can pass. Rivals get a short recovery window against repeated hits; missed shots do not clear nearby targets.
- Flamingo Floatie absorbs one hit. SPF 1000 prevents slowdown from collisions for eight seconds.
- Complete the 4 km course through all four checkpoints to the 17th Street Causeway Bridge. Fisheries sits on the right on the southbound approach. The route is a compressed Fort Lauderdale highlight reel, with places rearranged for racing.
- Gold: 1:35 or faster. Silver: 2:00 or faster. Bronze: finish the course.
- Race through New River restaurants and towers, a superyacht marina, a rooted mangrove cut, an open party cove, and the bridge approach. Each district changes the shoreline, water color, and channel width. Close planting and homes fill the banks, while layered forest and a longer skyline keep the horizon occupied.
- Three rival boats race the route. Slipstream behind them to refill cafecito; close-call chains and ramps also reward boost. Marina and mangrove island splits offer routes on either side, with extra coffee on the marked mangrove shortcut.
- A departing yacht crosses the marina, and a water taxi and staggered tube riders cross the party cove. The 167 moored sport boats, superyachts, and sailboats share their visible positions with their collision shapes. Shots splash against these larger hulls.
- Nina has 25 fictional friend roasts: five each for Miles, Brauser, Josh, Clark, and Dewey. Up to one line per friend plays during a run, with different jokes on replays. Checkpoint and collision calls take priority.
- “Watch a run” demonstrates the real driving physics without writing a best time.
- Best times stay in this browser; there is no shared Florida leaderboard or account service.
- On a phone, steer with the left thumb pad and pull down to brake/drift. Hold Cafecito to boost and SOAK to shoot water. Separate Drift and SOAK buttons sit on the right. Portrait and landscape are supported.
- Entry and pause settings let you choose Keyboard/Touch controls and Smooth/Detailed graphics. Coarse input defaults to Touch and Smooth; explicit choices persist in this browser. Rotation or switching away pauses the race.
- A current browser with WebGL 2 is required. Sound is opt-in. Physical-phone performance has not yet been measured.

`florida/controls.js` owns independent touch-pointer state and keyboard merging, `graphics.js` defines rendering profiles, and `florida/core.js` owns the tested race rules, while `course.js` owns the curved route and physical mooring layout. `art.js` and `detail-art.js` provide model helpers, `premium-art.js` builds waterfront assets, `district-art.js` supplies the district-specific restaurants, sailboats, boatyards, mangroves, and party scenery, `hero-art.js` loads the Blender-authored airboat and couple, `waterfront-art.js` loads the six-part Blender kit for homes, hotels, clubs, skyline, and forest, `materials.js` authors procedural surface textures, `world.js` places the waterfront and reflected water, `scenery-batches.js` combines shoreline draws and culls objects per rendering pass, `effects.js` draws foam and spray, `audio.js` synthesizes sound, `nina-lines.js` schedules fictional banter, and `main.js` runs the rendered game and UI. F2 toggles local frame-rate, frame-pacing, draw-count, and per-sector diagnostics; it records only while visible. For reproducible comparisons, use the same viewport and append `?benchmarkDpr=1.25` (or `1`) to fix render pixel density. Detailed graphics caps device density at 1.25; Smooth caps it at 1, halves anti-aliasing samples and shadow-map resolution, and skips ambient occlusion. `scripts/build.mjs` preserves the Toronto files and bundles Three.js plus Florida into `dist/`. Vercel serves that output on the existing project, `how-we-met-six.vercel.app`.

To publish an update, run the tests and build, commit the source, and run `vercel --prod` from this repository linked to the existing `how-we-met` project. The live Florida chapter is at `https://how-we-met-six.vercel.app/florida/`.

The current Blender waterfront kit, restored shoreline density, and latest Safari comparison are recorded in [density correction validation](docs/florida-density-rescue-validation.md). The initial five-environment release, course traffic, and Nina banter are recorded in [district validation](docs/florida-districts-validation.md). The water blaster and rebuilt character shapes are recorded in [shape and shooting validation](docs/florida-shape-shooting-validation.md). Earlier mobile input behavior, viewport checks and hardware limits are recorded in [mobile validation](docs/florida-mobile-validation.md); previous art and rendering work is recorded in [Florida validation](docs/florida-v2-validation.md). For future model work, see [the Blender setup and export workflow](docs/blender-workflow.md). Blender is optional and is not a browser dependency. `npm run blender:hero` regenerates the player GLB; `npm run blender:waterfront` regenerates the waterfront kit and its review renders. Normal web builds consume the checked-in GLBs and do not need Blender.

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
