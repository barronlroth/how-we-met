# How We Met

Two chapters of Barron and Nina's wedding game: the original pixel-art Toronto platformer and **Florida: Intracoastal Run**, a desktop 3D airboat race.

## Florida

Run `npm ci`, `npm test`, and `npm run build`, then `npm run preview`. Open `http://127.0.0.1:4179/florida/`.

- A/D or left/right arrows steer; S or down arrow brakes. The boat accelerates automatically.
- Hold Shift to spend Cafecito Boost. Space sounds the horn. Escape or P pauses.
- Flamingo Floatie absorbs one hit. SPF 1000 prevents slowdown from collisions for eight seconds.
- Complete the 3.6 km course through all four checkpoints to the 17th Street Causeway Bridge. Fisheries sits on the right on the southbound approach.
- Gold: 2:25 or faster. Silver: 2:55 or faster. Bronze: finish the course.
- Best times stay in this browser; there is no shared Florida leaderboard or account service.
- Phone controls are not included in this version. A current desktop browser with WebGL 2 is required. Sound is opt-in.

`florida/core.js` owns the independently tested race rules. `art.js` contains the original low-poly models, `world.js` places the course and shaders, `audio.js` synthesizes sound, and `main.js` runs the rendered game and UI. `scripts/build.mjs` preserves the Toronto files and bundles Three.js plus Florida into `dist/`. Vercel serves that output on the existing project, `how-we-met-six.vercel.app`.

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
