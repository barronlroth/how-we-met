# Blender for the Florida game

This Mac has Blender 5.2.1 LTS (Apple Silicon) installed in `/Applications/Blender.app`, with the `blender` command on PATH. Project-owned Python scripts run it in background mode. MCP is optional. Blender is an asset-authoring tool; Three.js still renders the exported game assets in the browser. Blender itself is not a guest dependency.

## Local headless workflow

1. Download the Mac build from https://www.blender.org/download/ and install it as `/Applications/Blender.app`.
2. Verify that its Python runtime is callable:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-expr 'import bpy; print(bpy.app.version_string)'
```

3. Author and retain `.blend` source files outside the public asset directory. Use Blender Python to build/refine models, bake surface detail, export GLB, and produce review renders. Only browser assets belong in `florida/assets/`.
4. Compare the exported model in the actual Three.js lighting and run the same F2 demo benchmark before accepting it. A Blender render is not evidence of browser fidelity or performance.

## Verified local setup

Installed with `brew install --cask blender` from Homebrew's checksum-verified official Blender download. The app measured 907 MiB on disk; the 330 MiB installer cache was removed after successful verification. No MCP server, GUI session, or persistent Blender service is needed for this headless workflow.

From the project root:

```sh
npm run blender:smoke
./scripts/blender-headless.sh --python /absolute/path/to/asset-script.py
```

The wrapper uses isolated factory settings and exits with code 1 on Python failure; set `BLENDER_BIN` for another Blender executable. A script should explicitly choose its renderer/device and output paths. The smoke check uses Cycles on CPU for reliable background execution.

Verification completed: a 256×256 PNG render, saved `.blend`, 14,624-byte GLB export, clean-scene reimport, and import with the project's Three.js GLTFLoader (one mesh, 188 triangles). The wrapper's nonzero Python-error exit was also exercised. Outputs and a JSON report live in ignored `artifacts/blender-smoke/`, outside the published game assets. These tests validate the toolchain; game-asset visuals and FPS still need a separate in-game check after replacement.


## Optional interactive MCP workflow

The common connector is https://github.com/ahujasid/blender-mcp . It consists of a Blender add-on and a stdio MCP server. Its documented setup uses `uvx blender-mcp install-addon`, enables Interface: Blender MCP in Blender preferences, and starts the connection from the BlenderMCP sidebar. The MCP client launches `uvx` with the argument `blender-mcp`; use the absolute executable path in GUI clients when needed.

On this Mac, `uvx` is already available at `/opt/homebrew/bin/uvx`. After installing/enabling the Blender add-on and starting its server, the locally verified Codex CLI registration syntax is:

```sh
codex mcp add blender -- /opt/homebrew/bin/uvx blender-mcp
```

This command is documented here, not executed.

This connector currently expects Blender to run with its GUI event loop. Plain `blender -b` is not the connector's supported headless route; a remote Linux host can use a virtual display (Xvfb). Our recommended background Python workflow above does not depend on that connector or its event loop. Keep asset-service credentials optional; local modeling and exporting do not require paid model-generation accounts.

## Browser performance contract

Spend detail on the close airboat and couple. Use simpler versions for distant scenery, shared materials/textures, repeated model instances, and baked normal/occlusion maps where appropriate. Avoid exporting every fitting as an independent draw or keeping subdivision-render geometry as the playable mesh. Texture sizes, geometry, material count, skinning, transparency, shadows, and reflections all contribute to runtime cost. Baked detail can raise apparent fidelity without adding runtime geometry; heavy exports can also regress performance.

Sources: [Blender macOS command line](https://docs.blender.org/manual/en/5.0/advanced/command_line/launch/macos.html), [background/Python arguments](https://docs.blender.org/manual/id/3.6/advanced/command_line/arguments.html), [glTF and baked occlusion](https://docs.blender.org/manual/id/5.0/addons/import_export/scene_gltf2.html), [connector setup](https://github.com/ahujasid/blender-mcp/blob/main/README.md), [connector background-mode limitation](https://github.com/ahujasid/blender-mcp/blob/main/src/blender_mcp/server.py).

## Current player asset: Dream Loop candidate

`npm run blender:hero` builds `florida/assets/models/airboat-couple-v6.glb` from `scripts/build-florida-hero.py` and `scripts/florida_characters.py`. Editable source, reports, and review renders go to ignored `artifacts/florida-characters-v6/`. The current export is 4,820,744 bytes, 125,366 triangles, 42 glTF primitives, 27 materials, and nine embedded images. This is the round-eight visual candidate; review and benchmark evidence is recorded in the Dream Loop validation report.

V6 retains the approved facial albedo, face/eye positions and UVs, articulation pivots, outfits, and blonde Nina. Eight rounded scalp-tangent hair locks with recessed support geometry, sculpted sleeve and shorts folds, dyed linen with weave normals, anatomical face normals, teak grain, upholstered seats, and the larger fan assembly add surface detail. The facial normal map changes light response without resculpting the approved face vertices or eye surfaces. Original likeness photographs remain outside the export.

`tests/hero-art.test.mjs` checks articulation, coordinate convention, the collision/camera envelope, facial geometry/UV preservation, outfit colors, fan dimensions, finite geometry, and budgets of 42 primitives, fewer than 140,000 triangles, at most 28 materials, and fewer than 5.5 MB. Embedded images are checked individually; passing budgets does not establish visual quality or browser speed. The earlier v5 export and [shape/shooting report](florida-shape-shooting-validation.md) remain historical references.

The builder renders `characters-front.png`, `characters-three-quarter.png`, `couple-close.png`, `hero-front.png`, and `hero-rear.png` from actual geometry. Treat these as authoring views, separate from live game evidence.


## Authored waterfront kit

`npm run blender:waterfront` runs `scripts/build-florida-waterfront.py` through the same isolated headless wrapper. It exports `florida/assets/models/waterfront-v1.glb`, saves editable source to ignored `artifacts/florida-waterfront-v1/waterfront-v1.blend`, writes `report.json`, and renders four buildings plus `waterfront-kit.png` using Cycles on CPU. To regenerate only the authoring images while retaining the checked-in export, run:

```sh
npm run blender:waterfront -- -- --render-only
```

The six roots are a waterfront residence, marina hotel, skyline tower, waterfront club, inexpensive distant tower, and canopy cluster. The close buildings model balconies, stepped volumes, pools, pergolas, window frames, planters, furniture, and planted decks. The source GLB contains geometry and twelve shared opaque PBR materials without embedded textures. In the Dream Loop candidate, the exported towers include recessed glazing, separate balcony plates, thin apartment fins and baked local occlusion. `waterfront-art.js` projects surface UVs and applies shared generated material maps after loading. The export totals 2,520,260 bytes and 45,656 triangles. `waterfront-art.js` loads it once, and scene copies share geometry and materials before the existing scenery batching. Low-cost horizon templates use 3,644 triangles for `SkylineFar` and 548 for `CanopyCluster`.

`tests/waterfront-art.test.mjs` imports the actual GLB with Three.js and checks named roots, metre-scale dimensions, Y-up placement, finite positions/normals, shared clone resources, opaque materials, no embedded images, and the export budget. The [density correction report](florida-density-rescue-validation.md) describes the earlier untextured runtime. Current refinements and pending checks are recorded in [Dream Loop validation](florida-dream-loop-validation.md). Blender itself does not run in the browser.


## Vegetation and landmark packs

Run `npm run blender:vegetation` or `npm run blender:landmarks` through the existing isolated wrapper. Their sources are `scripts/build-florida-vegetation.py` and `scripts/build-florida-landmarks.py`; their exported GLBs go to `florida/assets/models/`. Editable `.blend` files, JSON reports, and authoring renders remain in ignored `artifacts/florida-vegetation-v1/` and `artifacts/florida-landmarks-v1/`.

| Pack | Reusable roots | Current export |
| --- | --- | --- |
| Vegetation | Royal/coconut palms, hammock/sea-grape trees, hedge, tree band | 3,017,140 bytes; 16,706 triangles; three materials; one embedded atlas |
| Landmarks | BridgeCauseway and FisheriesRestaurant | 4,959,464 bytes; 71,402 triangles; twelve materials; eight embedded textures |

The foliage pack uses a shared generated leaf atlas with alpha testing and alpha-to-coverage in the game. The landmark pack adds modeled roof, structural, railing, and waterfront detail with generated coastal materials. The imported templates retain shared resources when cloned. Their tests check named roots, dimensions, finite geometry, and export contracts; final live appearance remains a separate check.

Generated source images live in `florida/assets/textures/`, with exact `.prompt.md` sidecars for the coastal materials, tropical foliage, sky versions, and Intracoastal height field. Existing generated teak and facial-atlas sources retain their own provenance. `sky.js` currently loads `florida-sky-v2.png`; `water.js` converts `intracoastal-height-v1.png` into a seamless, filtered normal/height texture at startup. The game applies these generated textures to its three-dimensional surfaces.


## Villas, yacht and reflection framing

`npm run blender:villas` exports four shared-material villa variants from `scripts/build-florida-villas.py`. The current pack has 1,756,808 bytes, 19,876 triangles, 23 primitives and six materials; generated coastal maps are applied by the loader. Villa0's visible side openings have shaded 0.40 m returns, glazing at 0.42 m, separate inner frames and curtains. Other variants and all four placement bounds are preserved. `npm run blender:yacht` exports the 242,520-byte, 3,602-triangle yacht with six materials and two embedded images.

`planar-reflection.js` corrects the reflected camera's horizontal lens shift for the entry view's off-axis framing. Tests project actual water-plane points through the real and reflected cameras and check that the visible views match. The correction uses the existing Water render pass; it adds neither a depth texture nor a second reflection render. Renderer state and the real camera projection are restored even if reflection rendering fails.


## Round-eight material diagnostics

The hero's seat sides now keep independent normals instead of smoothing through the soft top; a direct Three.js-loader comparison confirms the boundary survives export. Cloth uses asymmetric folded profiles and the console has a modeled rolled edge. Face geometry/UVs, embedded images, pivots and world bounds remain unchanged.

The nearest staged towers are two `SkylineFar` instances and one `SkylineTower`. Their old rail cross-sections projected to 0.13–0.20 pixels and nearly disappeared under antialiasing. Revised independent rails project to 0.62–0.95 pixels; slab fronts, downstands, and recessed mullions provide distinct planes. Villa panes explicitly reuse the scene's PMREM with their intended local intensity of 0.9. Without that binding, Three.js used the dimmer global scene intensity.

Palm silhouettes are verified from the actual low camera. Their source winding now points upper leaf faces upward, avoiding shadow-bias self-occlusion. Palm transmission uses shadowed directional light, while the existing non-palm foliage term is preserved. Nineteen fronds form the interior, hanging fans and sparse mature skirt; the number and placement of trees are unchanged.

`intracoastal-height-v2.png` is a new original generated relief source, retained unchanged beside v1 with an exact prompt sidecar. Its filtered luminance drives near-water displacement as well as normals and hull-foam height. The near grid uses 0.18 m spacing, a 0.45 m middle region and a flat outer apron, with the same 131,072 triangles as before. Displacement ends before the stretched apron; the horizon stays continuous.
