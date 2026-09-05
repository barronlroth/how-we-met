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

## Authored player asset

`npm run blender:hero` creates the original airboat and seated couple in `florida/assets/models/airboat-couple-v3.glb`. The source is `scripts/build-florida-hero.py`; editable `.blend`, review renders, and geometry statistics go to ignored `artifacts/florida-hero/`. The two user-supplied portrait references informed the stylized faces and hair; their image data is not embedded or shipped. The script creates geometry and shared PBR materials, with independent Fan, Nina, Barron, and PointingArm nodes. Fixed geometry is merged per material within each articulation node.

`tests/hero-art.test.mjs` loads the exported GLB with Three.js and verifies the animation nodes, axis convention, collision/camera envelope, and budgets of 42 meshes, 65,000 triangles, 24 materials, and 1.8 MB. Runtime performance still uses the full-route browser benchmark.
