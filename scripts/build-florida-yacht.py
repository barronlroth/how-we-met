"""Original low-cost, continuously faired motor yacht, authored in metres.

All modeling coordinates are game X/right, Y/up, bow/-Z. The exported root fits
the existing superyacht's exact local collision envelope. Native parts are merged
by six shared materials before export; authoring proofs are not game assets.
"""
import bpy
import bmesh
import json
import math
import sys
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'artifacts/florida-yacht-v1'
OUT = ROOT / 'florida/assets/models/superyacht-v1.glb'
WORK.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def xyz(p): return Vector((p[0], -p[2], p[1]))
def linear(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

M = {}
for name, color, rough, metal in [
    ('Fiberglass', 'f4f1e6', .3, .02),
    ('Glazing', '315460', .18, .3),
    ('Stainless', 'a9b8b9', .28, .85),
    ('Teak', 'ffffff', .65, 0),
    ('Upholstery', 'e8dfcd', .84, 0),
    ('Recess', '273d44', .65, .1),
]:
    mat = bpy.data.materials.new('Yacht' + name)
    mat.use_nodes = True
    rgba = tuple(linear(int(color[i:i+2], 16)/255) for i in (0,2,4)) + (1,)
    mat.diffuse_color = rgba
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = rgba
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metal
    M[name] = mat

# Reuse the original generated material sources; these two small JPEGs are
# embedded in the GLB. UV repetition preserves visible grain without large maps.
teak = bpy.data.images.load(str(ROOT / 'florida/assets/teak-v2.png'))
teak.scale(512, 512)
teak.file_format = 'JPEG'; teak.filepath_raw = str(WORK / 'teak.jpg'); teak.save()
atlas = bpy.data.images.load(str(ROOT / 'florida/assets/textures/coastal-materials-v1.png'))
aw, ah = atlas.size
pixels = np.array(atlas.pixels[:], dtype=np.float32).reshape(ah, aw, 4)
tile = pixels[:ah//2, :aw//2].copy()
cloth = bpy.data.images.new('Yacht woven linen', width=aw//2, height=ah//2)
cloth.pixels.foreach_set(tile.flatten()); cloth.scale(128, 128)
cloth.file_format = 'JPEG'; cloth.filepath_raw = str(WORK / 'linen.jpg'); cloth.save()
for name, path in [('Teak', WORK / 'teak.jpg'), ('Upholstery', WORK / 'linen.jpg')]:
    image = bpy.data.images.load(str(path))
    tex = M[name].node_tree.nodes.new('ShaderNodeTexImage'); tex.image = image
    M[name].node_tree.links.new(tex.outputs['Color'], M[name].node_tree.nodes['Principled BSDF'].inputs['Base Color'])


class Yacht:
    def __init__(self):
        self.parts = {}
        self.features = {}

    def mesh(self, name, material, verts, faces, smooth=False):
        bucket = self.parts.setdefault(material, [[], [], []])
        start = len(bucket[0]); bucket[0].extend(verts)
        bucket[1].extend(tuple(start+i for i in face) for face in faces)
        bucket[2].extend([smooth] * len(faces))
        self.features[name] = self.features.get(name, 0) + sum(len(f)-2 for f in faces)

    def loft(self, name, material, rings, smooth=False, caps=True):
        n = len(rings[0]); verts = [p for ring in rings for p in ring]
        faces = [(r*n+i, r*n+(i+1)%n, (r+1)*n+(i+1)%n, (r+1)*n+i)
                 for r in range(len(rings)-1) for i in range(n)]
        if caps: faces.extend([tuple(reversed(range(n))), tuple(range((len(rings)-1)*n,len(rings)*n))])
        self.mesh(name, material, verts, faces, smooth)

    def tube(self, name, points, radius, material='Stainless', sides=4, closed=False):
        rings = []
        for i,p in enumerate(points):
            p = Vector(p)
            a = Vector(points[(i-1)%len(points)] if closed else points[max(0,i-1)])
            b = Vector(points[(i+1)%len(points)] if closed else points[min(len(points)-1,i+1)])
            direction = (b-a).normalized()
            axis = direction.cross(Vector((0,1,0)))
            if axis.length < .01: axis = direction.cross(Vector((1,0,0)))
            axis.normalize(); second = direction.cross(axis).normalized()
            rings.append([tuple(p + axis*math.cos(j*math.tau/sides)*radius + second*math.sin(j*math.tau/sides)*radius) for j in range(sides)])
        if closed: rings.append(rings[0])
        self.loft(name, material, rings, True, not closed)

    def box(self, name, center, size, material, radius=.08):
        x,y,z = center; w,h,d = size
        radius = min(radius, w*.22, d*.22)
        profile = [(-w/2+radius,-d/2),(w/2-radius,-d/2),(w/2,-d/2+radius),(w/2,d/2-radius),
                   (w/2-radius,d/2),(-w/2+radius,d/2),(-w/2,d/2-radius),(-w/2,-d/2+radius)]
        rings = [[(x+xx,y+dy,z+zz) for xx,zz in profile] for dy in (-h/2,h/2)]
        self.loft(name, material, rings)

    def cushion(self, center, size):
        # Three rounded octagonal stations form softly loaded upholstery at low
        # cost; they are not the hard rectangular slab used by the old boat.
        x,y,z = center; w,h,d = size; rings=[]
        for dy,s in [(-h/2,.89),(0,1),(h/2,.92)]:
            ring=[]
            for i in range(8):
                a=math.tau*(i+.5)/8
                xx=math.copysign(abs(math.cos(a))**.45,math.cos(a))*w/2*s
                zz=math.copysign(abs(math.sin(a))**.45,math.sin(a))*d/2*s
                ring.append((x+xx,y+dy,z+zz))
            rings.append(ring)
        self.loft('Sculpted upholstery', 'Upholstery', rings, True)

    def finish(self):
        root = bpy.data.objects.new('Superyacht', None); bpy.context.collection.objects.link(root)
        for name,(verts,faces,smooth) in self.parts.items():
            mesh=bpy.data.meshes.new('Superyacht_'+name)
            mesh.from_pydata([xyz(p) for p in verts], [], faces); mesh.update()
            bm=bmesh.new(); bm.from_mesh(mesh)
            bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
            for face,s in zip(mesh.polygons,smooth): face.use_smooth=s
            uv=mesh.uv_layers.new(name='SurfaceMetres')
            for face in mesh.polygons:
                axis=max(range(3), key=lambda k: abs(face.normal[k]))
                axes=[k for k in range(3) if k != axis]
                for loop in face.loop_indices:
                    p=mesh.vertices[mesh.loops[loop].vertex_index].co
                    uv.data[loop].uv = ((p.x+3)/1.7,(-p.y+15)/2.8) if name=='Teak' else (p[axes[0]]*5,p[axes[1]]*5)
            obj=bpy.data.objects.new('Superyacht_'+name,mesh); bpy.context.collection.objects.link(obj)
            obj.parent=root; mesh.materials.append(M[name])
        return root


y = Yacht()
# Bow entry, flared topsides, rounded bilge, deep aft beam and continuous sheer.
# Longitudinal stations describe the actual shell, not an extruded flat plan.
stations = [
    (-15.24,.055,.66,2.72),(-14.7,.73,.27,2.70),(-13.55,1.61,-.09,2.64),
    (-11.95,2.38,-.23,2.58),(-9.8,3.01,-.29,2.49),(-7.1,3.44,-.29,2.42),
    (-4.1,3.60,-.29,2.38),(-.3,3.61,-.29,2.35),(3.8,3.59,-.29,2.32),
    (7.6,3.54,-.29,2.29),(9.75,3.43,-.22,2.25),(10.15,3.20,-.08,2.20),
]
# Extra bow stations follow a Catmull-Rom beam curve, while lower hull heights
# interpolate monotonically to preserve the exact minimum collision elevation.
controls=stations; stations=[]
for i,s in enumerate(controls):
    stations.append(s)
    if i>=5: continue
    a,b=controls[i],controls[i+1]
    w0=controls[max(0,i-1)][1];w1=a[1];w2=b[1];w3=controls[min(len(controls)-1,i+2)][1];t=.5
    width=.5*((2*w1)+(-w0+w2)*t+(2*w0-5*w1+4*w2-w3)*t*t+(-w0+3*w1-3*w2+w3)*t*t*t)
    stations.append(((a[0]+b[0])/2,width,(a[2]+b[2])/2,(a[3]+b[3])/2))
def section(z,w,bottom,sheer):
    half=[(0,bottom),(.52*w,bottom+.05),(.83*w,bottom+.26),(.945*w,.60),
          (w,1.48),(.994*w,sheer-.16),(.97*w,sheer)]
    return [(x,yy,z) for x,yy in half] + [(-x,yy,z) for x,yy in half[:0:-1]]
y.loft('Continuously faired hull', 'Fiberglass', [section(*s) for s in stations], True)
# Flat deck normals meet smoothed topsides at a crisp sheer, with no duplicate
# overlapping deck polygon. Each shell station has 13 perimeter vertices.
for row in range(len(stations)-1):
    y.parts['Fiberglass'][2][row*13+6] = False

# Deck crown and rolled bulwark trace the same changing plan as the hull.
outline=[(.97*w,s,z) for z,w,b,s in stations]+[(-.97*w,s,z) for z,w,b,s in reversed(stations)]
y.tube('Rolled continuous gunwale',[(x,yy+.04,z) for x,yy,z in outline],.065,'Fiberglass',5,True)

def sample(z):
    for a,b in zip(stations,stations[1:]):
        if a[0] <= z <= b[0]:
            t=(z-a[0])/(b[0]-a[0]); return tuple(a[i]+(b[i]-a[i])*t for i in (1,2,3))
    raise ValueError(z)

# Dark boot stripe is thin and follows the hull's round bilge; it never changes
# the collision width and remains mostly below the game's surface reflections.
for side in (-1,1):
    stripe=[p for z,w,b,s in stations[2:] for p in [(side*w*.909,.28,z),(side*w*.923,.43,z)]]
    y.mesh('Fine waterline inlay','Recess',stripe,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(stations)-3)])
    # Flush hull glazing. Each opening follows local beam/taper and is chamfered.
    for z,d in [(-8.25,.82),(-5.8,1.16),(-3.15,1.35),(-.40,1.35),(2.5,1.20),(5.15,.98),(7.65,.70)]:
        pts=[]
        for dz,dy in [(-d/2+.10,-.18),(d/2-.10,-.18),(d/2,-.10),(d/2,.10),
                      (d/2-.10,.18),(-d/2+.10,.18),(-d/2,.10),(-d/2,-.10)]:
            w,_,_=sample(z+dz); yy=1.42+dy
            factor=.945+(min(yy,1.48)-.60)/(.88)*.055 if yy<=1.48 else 1-(yy-1.48)*.006
            pts.append((side*(w*factor+.013),yy,z+dz))
        y.mesh('Inset hull portlights','Glazing',pts,[tuple(range(8))])

# A raked coachroof loft is narrower and farther aft at each increasing height.
# The full perimeter remains continuous through rounded front shoulders.
def cabin_ring(height,width,front,rear):
    plan=[(0,front),(.35*width,front+.04),(.67*width,front+.15),(.84*width,front+.35),
          (.94*width,front+.64),(.985*width,front+.98),(width,front+1.38),
          (width,rear-.60),(.82*width,rear),(-.82*width,rear),(-width,rear-.60),
          (-width,front+1.38),(-.985*width,front+.98),(-.94*width,front+.64),
          (-.84*width,front+.35),(-.67*width,front+.15),(-.35*width,front+.04)]
    return [(x,height,z) for x,z in plan]
y.loft('Swept coachroof base','Fiberglass',[
    cabin_ring(2.39,2.90,-8.02,7.25),cabin_ring(2.81,2.79,-7.31,7.20)])
y.loft('Wrapped raked salon glazing','Glazing',[
    cabin_ring(2.81,2.77,-7.28,7.18),cabin_ring(3.94,2.43,-5.29,6.92)],True)
y.loft('Swept main roof','Fiberglass',[
    cabin_ring(3.94,2.63,-5.52,8.25),cabin_ring(4.10,2.71,-5.66,8.30),
    cabin_ring(4.30,2.56,-5.37,8.13)])
# Thin aft-raked mullions divide side glass; front glass keeps its sloping plane.
for side in (-1,1):
    for z in (-2.6,.65,4.15):
        y.tube('Salon window mullion',[(side*2.783,2.84,z-.45),(side*2.443,3.96,z)],.037,'Fiberglass',4)
    y.tube('Raked rear salon pillar',[(side*2.78,2.76,6.30),(side*2.48,4.02,5.15)],.145,'Fiberglass',4)
    y.tube('Windshield narrow frame',[(side*1.856,2.84,-7.12),(side*1.63,3.96,-5.14)],.033,'Fiberglass',4)
y.tube('Windshield central seam',[(0,2.81,-7.303),(0,3.94,-5.313)],.026,'Recess',4)

# Foredeck sun pads and two flush hatches provide a functional bow silhouette.
for x in (-1.03,1.03):
    y.cushion((x,2.65,-10.0),(1.82,.22,2.88))
    y.box('Forward inset deck hatch',(x,sample(-7.97)[2]+.020,-7.97),(.93,.032,.74),'Glazing',.13)
    y.tube('Sun pad dividing welt',[(x,2.77,-11.18),(x,2.77,-8.82)],.010,'Fiberglass',4)
y.box('Bow anchor well',(0,2.697,-13.2),(.50,.027,.68),'Recess',.12)
y.tube('Anchor roller',[(0,2.74,-14.02),(0,2.70,-14.89)],.09,'Stainless',6)

# The main aft terrace is open beneath the projecting roof.
y.box('Teak aft cockpit',(0,2.275,8.72),(5.89,.045,2.46),'Teak',.30)
y.box('Teak flybridge inset',(0,4.323,2.04),(4.61,.04,9.08),'Teak',.28)
for x in (-2.10,2.10):
    y.cushion((x,2.62,8.62),(1.10,.28,1.54))
    y.cushion((x,2.96,9.15),(1.10,.62,.25))
y.box('Aft teak dining table',(0,2.98,8.65),(1.95,.09,1.23),'Teak',.18)
y.tube('Aft table pedestal',[(0,2.30,8.65),(0,2.94,8.65)],.07,'Stainless',6)
y.box('Molded swim platform',(0,.68,10.34),(5.40,.22,.84),'Fiberglass',.23)
y.box('Swim platform teak',(0,.795,10.30),(4.82,.026,.68),'Teak',.16)
for x in (1.98,2.50):
    y.tube('Transom swim ladder',[(x,.83,10.25),(x,2.46,10.25),(x,2.46,9.80),(x,2.25,9.80)],.032,'Stainless',4)
for yy in (.99,1.34,1.69,2.04):
    y.tube('Transom ladder rung',[(1.98,yy,10.25),(2.50,yy,10.25)],.027,'Stainless',4)

# Open flybridge: inclined front windscreen, low sculpted coaming and a slender
# floating hardtop. Its roof, supports and mast reach the old yacht's height.
glass_bottom=cabin_ring(4.42,2.19,-3.99,-1.07)
glass_top=cabin_ring(5.12,1.94,-3.12,-.90)
edges=[i for i in range(17) if i not in (7,8,9)]
y.mesh('Open flybridge windscreen','Glazing',glass_bottom+glass_top,
       [(i,(i+1)%17,(i+1)%17+17,i+17) for i in edges],True)
windshield_path=[7,6,5,4,3,2,1,0,16,15,14,13,12,11,10]
y.tube('Flybridge windshield top rail',[glass_top[i] for i in windshield_path],.025,'Stainless',4)
# An open helm leaves visible depth behind the thin windscreen.
y.box('Flybridge helm',(0,4.88,-1.95),(2.5,.46,.57),'Fiberglass',.15)
for x in (-.65,.65):
    y.cushion((x,4.86,-.37),(.81,.22,.77))
    y.cushion((x,5.14,-.04),(.81,.53,.18))
for x in (-1.71,1.71):
    y.cushion((x,4.71,4.35),(1.01,.24,2.27))
    y.cushion((x,5.05,5.28),(1.01,.59,.27))
y.box('Flybridge teak table',(0,5.05,4.0),(1.55,.10,1.50),'Teak',.18)
y.tube('Flybridge table pedestal',[(0,4.35,4.0),(0,5.0,4.0)],.06,'Stainless',6)

def hardtop(height,w,front,rear):
    return cabin_ring(height,w,front,rear)
y.loft('Floating sculpted hardtop','Fiberglass',[
    hardtop(6.09,2.10,-1.54,4.58),hardtop(6.22,2.20,-1.66,4.65),
    hardtop(6.36,2.05,-1.39,4.45)])
for side in (-1,1):
    # Broad shaped rear arch swept forward into the canopy.
    a=[(side*1.98,4.34,5.39),(side*2.03,4.34,4.82),(side*1.96,6.19,2.67),(side*1.96,6.19,3.0)]
    y.loft('Swept flybridge arch','Fiberglass',[a,[(x-side*.17,yy,z) for x,yy,z in a]])
    y.tube('Hardtop front support',[(side*1.83,4.47,-1.93),(side*1.91,6.13,-.60)],.055,'Stainless',5)
y.tube('Tapering radar mast',[(0,6.33,1.20),(0,7.78,1.58)],.065,'Fiberglass',6)
y.box('Radar scanner',(0,7.43,1.50),(2.04,.16,.35),'Fiberglass',.12)
y.tube('Radio aerial',[(.43,6.31,2.6),(.43,7.96,2.6)],.018,'Stainless',4)
for x in (-.76,.76):
    # Faceted satellite domes are small fittings, with smooth hemispherical caps.
    rings=[]
    for yy,r in [(6.27,.20),(6.37,.29),(6.59,.27),(6.76,.16),(6.82,.018)]:
        rings.append([(x+r*math.cos(i*math.tau/8),yy,2.37+r*math.sin(i*math.tau/8)) for i in range(8)])
    y.loft('Satellite dome','Fiberglass',rings,True)

# Thin stainless rails follow the actual bowed foredeck and leave readable air
# between the cabin and gunwale. Four-sided tubes are sufficient at game scale.
for side in (-1,1):
    rail=[]
    for z in (-14.50,-13.25,-11.55,-9.45,-7.05,-4.1,-.3,3.8,7.6,9.6):
        w,_,s=sample(z); x=side*w*.949
        rail.append((x,s+.81,z))
        y.tube('Foredeck stanchion',[(x,s+.06,z),(x,s+.81,z)],.025,'Stainless',4)
    y.tube('Continuous bow and side handrail',rail,.028,'Stainless',4)
    y.tube('Lower bow lifeline',[(x,yy-.35,z) for x,yy,z in rail[:5]],.012,'Stainless',3)
    for z in (-11.9,-6.8,2.2,9.2):
        w,_,s=sample(z);x=side*w*.935
        y.tube('Deck mooring cleat',[(x,s+.12,z-.20),(x,s+.12,z+.20)],.042,'Stainless',4)
    # Flybridge aft safety rail; the front coaming is glazing.
    pts=[(side*2.35,5.17,z) for z in (1.0,3.4,5.8,7.25)]
    y.tube('Flybridge handrail',pts,.027,'Stainless',4)
    for x,yy,z in pts:y.tube('Flybridge stanchion',[(x,4.31,z),(x,yy,z)],.024,'Stainless',4)
y.tube('Bow rail crown',[(-.895,3.52,-14.5),(0,3.55,-15.04),(.895,3.52,-14.5)],.028,'Stainless',4)
y.tube('Flybridge aft handrail',[(-2.35,5.17,7.25),(0,5.17,7.48),(2.35,5.17,7.25)],.027,'Stainless',4)

root=y.finish()
bpy.context.view_layer.update()
meshes=list(root.children)
for obj in meshes: obj.data.calc_loop_triangles()
triangles=sum(len(obj.data.loop_triangles) for obj in meshes)
coords=[(p[0],p[2],-p[1]) for obj in meshes for p in (obj.matrix_world@v.co for v in obj.data.vertices)]
lo=[min(p[i] for p in coords) for i in range(3)];hi=[max(p[i] for p in coords) for i in range(3)]
assert triangles <= 4000, (triangles,y.features)
assert all(lo[i] >= [-3.6800001,-.3000001,-15.401354][i] for i in range(3)),lo
assert all(hi[i] <= [3.6800001,8,10.82][i] for i in range(3)),hi
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for obj in meshes: obj.select_set(True)
if '--render-only' not in sys.argv:
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,
        export_yup=True,export_normals=True,export_texcoords=True,export_animations=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'superyacht-v1.blend'))
report={'blender':bpy.app.version_string,'asset_bytes':OUT.stat().st_size,'triangles':triangles,
        'meshes':len(meshes),'materials':len(M),'bounds_min_xyz':lo,'bounds_max_xyz':hi,
        'features':y.features,'axes':'X right, Y up, bow -Z. Metres. Root at origin.',
        'source':'Original authored native geometry; existing image-generated teak and linen. No third-party assets.'}
assert OUT.stat().st_size <= 1000000,report
(WORK/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print('YACHT_ASSET '+json.dumps(report),flush=True)
if '--export-only' in sys.argv: sys.exit(0)

# Neutral sunny proof stage. These studio frames are visual geometry QA only;
# the game owns its lighting, water, batching and browser-performance checks.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Yacht review sky');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.38,.53,.66,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
bpy.ops.object.light_add(type='SUN',location=xyz((-30,60,-40)))
sun=bpy.context.object;sun.data.energy=2.6;sun.data.angle=.06
sun.rotation_euler=(xyz((0,0,0))-sun.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=300,location=xyz((0,.05,0)))
water=bpy.data.materials.new('Review water');water.use_nodes=True
shader=water.node_tree.nodes['Principled BSDF'];shader.inputs['Base Color'].default_value=(.015,.115,.135,1)
shader.inputs['Roughness'].default_value=.27;shader.inputs['Metallic'].default_value=.25
bpy.context.object.data.materials.append(water)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO'
def render(name,location,target,scale):
    camera.location=xyz(location);camera.rotation_euler=(xyz(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=scale;scene.render.filepath=str(WORK/name);bpy.ops.render.render(write_still=True)
render('yacht-three-quarter.png',(29,18,-37),(0,3,-1.6),31.7)
render('yacht-front.png',(0,11,-41),(0,3,-3.5),21.4)
render('yacht-aft-quarter.png',(27,16,34),(0,3,-1.4),31.7)
