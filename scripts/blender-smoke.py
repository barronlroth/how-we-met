"""Exercise headless rendering and GLB export without touching game assets."""
import json
import struct
from pathlib import Path

import bpy
from mathutils import Vector

output = Path(__file__).resolve().parents[1] / "artifacts" / "blender-smoke"
output.mkdir(parents=True, exist_ok=True)
assert bpy.app.background, "Run this through blender-headless.sh"
bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
model = bpy.context.object
model.name = "HeadlessExportCheck"
model.scale = (1.5, 0.8, 0.35)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bevel = model.modifiers.new("Soft edges", "BEVEL")
bevel.width, bevel.segments = 0.12, 3
bpy.ops.object.modifier_apply(modifier=bevel.name)
material = bpy.data.materials.new("Florida teal")
material.diffuse_color = (0.025, 0.5, 0.42, 1)
material.use_nodes = True
shader = material.node_tree.nodes.get("Principled BSDF")
shader.inputs["Base Color"].default_value = material.diffuse_color
shader.inputs["Roughness"].default_value = 0.35
model.data.materials.append(material)

bpy.ops.object.camera_add(location=(3, -4, 3))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
scene = bpy.context.scene
scene.camera = camera
bpy.ops.object.light_add(type="AREA", location=(1, -2, 4))
lamp = bpy.context.object
lamp.data.energy, lamp.data.shape, lamp.data.size = 500, "DISK", 4
scene.world = bpy.data.worlds.new("Studio")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.12, 0.15, 0.18, 1)
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.render.resolution_x = scene.render.resolution_y = 256
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(output / "preview.png")
bpy.ops.wm.save_as_mainfile(filepath=str(output / "smoke.blend"))
bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action="DESELECT")
model.select_set(True)
bpy.context.view_layer.objects.active = model
glb = output / "smoke.glb"
bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True)
data = glb.read_bytes()
magic, version, size = struct.unpack_from("<4sII", data)
assert magic == b"glTF" and version == 2 and size == len(data)
chunk_size, chunk_type = struct.unpack_from("<II", data, 12)
assert chunk_type == 0x4E4F534A
document = json.loads(data[20:20 + chunk_size])
assert document.get("meshes") and not document.get("images"), "Expected a self-contained mesh"

# Check the produced asset can be read again from a clean scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
assert len(meshes) == 1
assert (output / "preview.png").read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
report = {"blender": bpy.app.version_string, "headless": bpy.app.background,
          "render_engine": "Cycles CPU", "glb_bytes": len(data),
          "meshes": len(meshes), "polygons_after_import": len(meshes[0].data.polygons),
          "render": str(output / "preview.png"), "asset": str(glb)}
(output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
print("HEADLESS_SMOKE_OK " + json.dumps(report))
