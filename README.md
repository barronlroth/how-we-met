# Meeting Nina Prototype

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

To jump straight into the Florida canal prototype:

```
http://localhost:8000/?level=florida
```

## Controls
- Toronto: hold Right Arrow / D / pointer press to walk, Up / W to jump, Space to throw
- Florida: Up / Down changes canal lanes, Left / Right switches slow/cruise/fast, Space throws a beach ball

## Tuning
Edit `game.js`:
- `WALK_SPEED` - walking speed
- `MEET_DISTANCE` - distance before Nina appears
- Parallax multipliers in `update()`
