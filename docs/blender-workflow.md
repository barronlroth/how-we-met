# Blender for the Florida game

Recommended setup: install the macOS Blender application, then run project-owned Python scripts with Blender in background mode. MCP is optional. Blender is an asset-authoring tool; Three.js still renders the exported game assets in the browser. Blender itself is not a guest dependency.

## Local headless workflow

1. Download the Mac build from https://www.blender.org/download/ and install it as `/Applications/Blender.app`.
2. Verify that its Python runtime is callable:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-expr 'import bpy; print(bpy.app.version_string)'
```

3. Author and retain `.blend` source files outside the public asset directory. Use Blender Python to build/refine models, bake surface detail, export GLB, and produce review renders. Only browser assets belong in `florida/assets/`.
4. Compare the exported model in the actual Three.js lighting and run the same F2 demo benchmark before accepting it. A Blender render is not evidence of browser fidelity or performance.

No Blender installation or MCP configuration was performed during the performance pass. The app/executable was absent on this Mac at the time of the check.

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
