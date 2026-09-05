# How We Met

Two chapters of Barron and Nina's wedding game: the original pixel-art Toronto platformer and **Florida: Intracoastal Run**, a desktop 3D airboat race.

## Florida

Run `npm ci`, `npm test`, and `npm run build`, then `npm run preview`. Open `http://127.0.0.1:4179/florida/`.

- A/D or left/right arrows steer; S or down arrow brakes; hold it while steering to drift and earn boost. The boat accelerates automatically.
- Hold Shift to spend Cafecito Boost. Space sounds the horn. Escape or P pauses.
- Flamingo Floatie absorbs one hit. SPF 1000 prevents slowdown from collisions for eight seconds.
- Complete the 4 km course through all four checkpoints to the 17th Street Causeway Bridge. Fisheries sits on the right on the southbound approach.
- Gold: 1:35 or faster. Silver: 2:00 or faster. Bronze: finish the course.
- Three rival boats race the route. Slipstream behind them to refill cafecito; close-call chains and ramps also reward boost. Two island splits offer routes on either side.
- “Watch a run” demonstrates the real driving physics without writing a best time.
- Best times stay in this browser; there is no shared Florida leaderboard or account service.
- Phone controls are not included in this version. A current desktop browser with WebGL 2 is required. Sound is opt-in.

`florida/core.js` owns the tested race rules, while `course.js` owns the curved route and physical mooring layout. `art.js` and `detail-art.js` provide model helpers, `premium-art.js` builds varied waterfront assets, `hero-art.js` loads the Blender-authored airboat and couple, `materials.js` authors their surface textures, `world.js` places the waterfront and reflected water, `scenery-batches.js` combines shoreline draws and culls objects per rendering pass, `effects.js` draws foam and spray, `audio.js` synthesizes sound, and `main.js` runs the rendered game and UI. F2 toggles local frame-rate, frame-pacing, draw-count, and per-sector diagnostics; it records only while visible. For reproducible comparisons, use the same viewport and append `?benchmarkDpr=1.25` (or `1`) to fix render pixel density. The normal game still uses device density capped at 1.25. `scripts/build.mjs` preserves the Toronto files and bundles Three.js plus Florida into `dist/`. Vercel serves that output on the existing project, `how-we-met-six.vercel.app`.

To publish an update, run the tests and build, commit the source, and run `vercel --prod` from this repository linked to the existing `how-we-met` project. The live Florida chapter is at `https://how-we-met-six.vercel.app/florida/`.

The measured rendering changes and hardware-specific limits are recorded in [Florida validation](docs/florida-v2-validation.md). For future model work, see [the Blender setup and export workflow](docs/blender-workflow.md). Blender is optional and is not a browser dependency. `npm run blender:hero` regenerates the player GLB from its authored Python source; normal web builds consume the checked-in GLB and do not need Blender.

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
