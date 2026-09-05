"""Original Blender-authored game art, using the supplied portraits as visual reference.

All helpers accept the game's coordinates: X right, Y up, forward -Z.
Portrait files are never embedded in the exported asset.
"""
import bpy
import json
import math
import random
import sys
from types import SimpleNamespace
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'florida/assets/models'
WORK = ROOT / 'artifacts/florida-characters-v4'
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(2718)

def xyz(p): return Vector((p[0], -p[2], p[1]))
def srgb(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
def material(name, color, rough=.5, metal=0):
    m = bpy.data.materials.new(name)
    c = tuple(srgb(int(color[i:i+2], 16)/255) for i in (0,2,4)) + (1,)
    m.diffuse_color = c
    if not m.use_nodes: m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = c
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metal
    return m

M = {k:material(k,*v) for k,v in {
    'cream':('f5edd6',.38), 'coral':('e67c62',.34,.12), 'teal':('397f7e',.35,.25),
    'chrome':('c2ccbf',.28,.75), 'rubber':('273b3b',.8), 'teak':('bf8b52',.6),
    'linen':('e8dcc1',.9), 'seam':('71543b',.8), 'canvas':('d4ddcc',.9),
    'skinB':('e4a16e',.64), 'skinN':('de9d6c',.64), 'lipsB':('bf796b',.72),
    'lipsN':('bf735e',.62), 'hairB':('24170e',.48), 'curlLight':('452818',.52),
    'hairN':('b58a48',.48), 'hairGold':('e6c582',.48), 'eyes':('718e4c',.3),
    'ink':('263632',.65), 'white':('fff7e4',.5), 'shirt':('7c8b69',.92),
    'ninaShirt':('df795c',.9), 'shorts':('427e83',.8), 'gold':('d9ae61',.35,.65),
}.items()}

# Generated, purpose-painted facial albedo. One compact shared atlas is embedded in the GLB.
face_image=bpy.data.images.load(str(ROOT/'art/characters/couple-face-atlas-v4.png'))
face_image.scale(1024,512)
face_image.file_format='JPEG';face_image.filepath_raw=str(WORK/'couple-face-atlas-v4.jpg');face_image.save()
face_image=bpy.data.images.load(str(WORK/'couple-face-atlas-v4.jpg'))
for name,rough in [('faceB',.78),('faceN',.78),('eyeB',.28),('eyeN',.28)]:
    m=material(name,'ffffff',rough);M[name]=m
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=face_image
    m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
# Per-character exposed skin is sampled from non-blushed facial paint regions.
skin_palette=json.loads((ROOT/'art/characters/skin-palette-v4.json').read_text())
for key in ('skinB','skinN'):
    rgba=tuple(srgb(c/255) for c in skin_palette[key]['srgb'])+(1,)
    M[key].diffuse_color=rgba
    shader=M[key].node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value=rgba
    shader.inputs['Roughness'].default_value=.78

def group(name,parent=None,p=(0,0,0)):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o)
    o.parent=parent;o.location=xyz(p);return o
def finish(o, name, mat, parent, smooth=True):
    o.name=name;o.data.materials.append(M[mat] if isinstance(mat,str) else mat)
    o.parent=parent
    if smooth:
        for p in o.data.polygons:p.use_smooth=True
    return o
def ell(name,p,scale,mat,parent,segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=xyz(p))
    o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1])
    return finish(o,name,mat,parent)
def box(name,p,size,mat,parent,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object
    o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat,parent)
def path(name,points,radius,mat,parent,closed=False,radii=None):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=3 if mat in ('skinB','skinN') else 1
    curve.bevel_depth=radius;curve.bevel_resolution=1;curve.use_fill_caps=True
    s=curve.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for i,(b,p) in enumerate(zip(s.bezier_points,points)):
        b.co=xyz(p);b.handle_left_type=b.handle_right_type='AUTO'
        if radii:b.radius=radii[i]
    s.use_cyclic_u=closed
    o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');o.select_set(False)
    return finish(o,name,mat,parent)
def ring(name,center,r,thick,mat,parent,plane='xy',n=40):
    pts=[]
    for i in range(n):
        a=i*math.tau/n
        d=(r*math.cos(a),r*math.sin(a),0) if plane=='xy' else (r*math.cos(a),0,r*math.sin(a))
        pts.append(tuple(center[j]+d[j] for j in range(3)))
    return path(name,pts,thick,mat,parent,True)
def mesh(name,verts,faces,mat,parent,smooth=True):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
    return finish(o,name,mat,parent,smooth)

sys.path.insert(0, str(ROOT / 'scripts'))
from florida_characters import make_person
character_art=SimpleNamespace(M=M,group=group,mesh=mesh,ell=ell,box=box,path=path,ring=ring)
def person(nina,parent,p):
    return make_person(nina,parent,p,character_art)

def hull_shape(parent):
    outline=[(-1.13,2.98),(-1.43,2.73),(-1.49,1.6),(-1.51,0),(-1.44,-2.25),(-1.21,-3.08),(-.65,-3.61),(0,-3.77),(.65,-3.61),(1.21,-3.08),(1.44,-2.25),(1.51,0),(1.49,1.6),(1.43,2.73),(1.13,2.98)]
    n=len(outline);verts=[]
    for y,scale in [(0,.81),(.25,.97),(.68,1)]:verts.extend([(x*scale,y,z*scale) for x,z in outline])
    faces=[tuple(range(n-1,-1,-1))]
    for row in range(2):
        for i in range(n):j=(i+1)%n;faces.append((row*n+i,row*n+j,(row+1)*n+j,(row+1)*n+i))
    faces.append(tuple(range(n*2,n*3)))
    o=mesh('Sculpted fiberglass hull',verts,faces,'cream',parent)
    import bmesh
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    bpy.context.view_layer.objects.active=o
    bevel=o.modifiers.new('Rounded chines','BEVEL');bevel.width=.1;bevel.segments=3;bpy.ops.object.modifier_apply(modifier=bevel.name)
    rim=[(x,.765,z) for x,z in outline]
    path('Upholstered gunwale',rim,.078,'cream',parent,True)
    path('Coral accent stripe',[(x*1.012,.55,z*1.003) for x,z in outline],.034,'coral',parent,True)
    path('Rubber rub rail',[(x*1.004,.44,z*.999) for x,z in outline],.04,'rubber',parent,True)
    mesh('Inset teak deck',[(x*.91,.705,z*.945) for x,z in outline],[tuple(reversed(range(n)))],'teak',parent,False)
    for i in range(-4,5):
        x=i*.278;front=-3.52+(abs(x)/1.25)**2*.72
        path('Teak caulking',[(x,.715,2.67),(x,.715,front)],.008,'seam',parent)
        for j in range(3):
            z=-2.4+j*1.85+(.45 if i%2 else 0)
            path('Staggered plank joint',[(x+.018,.716,z),(x+.25,.716,z)],.006,'seam',parent)
            for dx in (.04,.21):ell('Teak fastener',(x+dx,.718,z+.045),(.008,.002,.008),'seam',parent,8,6)
    return outline

def seat(parent,x,y,z,w):
    box('Seat cushion',(x,y,z),(w,.19,.79),'canvas',parent,.08)
    box('Sculpted backrest',(x,y+.35,z+.36),(w,.65,.18),'canvas',parent,.085)
    path('Seat piping',[(x-w*.44,y+.06,z-.32),(x+w*.44,y+.06,z-.32),(x+w*.44,y+.06,z+.31),(x-w*.44,y+.06,z+.31)],.012,'cream',parent,True)
    for i in (-1,0,1):path('Upholstery seam',[(x+i*w*.23,y+.15,z+.258),(x+i*w*.23,y+.56,z+.258)],.006,'cream',parent)
    for dx in (-w*.33,w*.33):path('Seat frame',[(x+dx,.72,z-.24),(x+dx,y-.13,z-.24),(x+dx,y-.13,z+.26),(x+dx,.72,z+.26)],.031,'chrome',parent)

def boat():
    root=group('Airboat');fixed=group('Hull',root);hull_shape(fixed)
    seat(fixed,-.46,1.31,-.47,.89);seat(fixed,.6,1.04,-2.12,1.02)
    box('Dash pedestal',(-.46,1.41,-1.35),(.6,1.35,.32),'teal',fixed,.09)
    box('Dashboard',(-.46,1.88,-1.37),(.99,.14,.59),'cream',fixed,.08)
    for x in (-.75,-.46,-.18):
        ell('Gauge face',(x,1.962,-1.37),(.078,.008,.078),'rubber',fixed)
        ring('Gauge bezel',(x,1.965,-1.37),.079,.009,'chrome',fixed,'xz',24)
        path('Instrument needle',[(x,1.976,-1.37),(x+.033,1.976,-1.403)],.004,'coral',fixed)
    ring('Leather steering wheel',(-.46,1.97,-1.09),.25,.024,'rubber',fixed)
    for i in range(3):
        a=i*math.tau/3;path('Wheel spoke',[(-.46,1.97,-1.09),(-.46+math.cos(a)*.24,1.97+math.sin(a)*.24,-1.09)],.016,'chrome',fixed)
    path('Throttle',[(.08,1.9,-1.15),(.11,2.11,-1.23)],.018,'chrome',fixed);ell('Throttle grip',(.11,2.11,-1.23),(.033,.06,.03),'rubber',fixed)
    # V-engine, cast casing, cooling fins and a readable bronze exhaust.
    box('Engine cradle',(0,.88,1.51),(1.23,.18,1.61),'coral',fixed,.055)
    box('Engine block',(0,1.25,1.55),(.72,.64,1.03),'rubber',fixed,.11)
    for side in (-1,1):
        for z in (1.12,1.48,1.84):
            ell('Cylinder bank',(side*.36,1.53,z),(.23,.25,.155),'chrome',fixed)
            for y in (1.38,1.45,1.52,1.59):path('Cooling fin',[(side*.2,y,z-.16),(side*.5,y,z-.16),(side*.57,y,z+.12)],.016,'rubber',fixed)
        path('Exhaust manifold',[(side*.49,1.5,1.1),(side*.72,1.25,1.58),(side*.72,1.14,2.47)],.056,'chrome',fixed)
        path('Fan support',[(side*.69,.84,1.06),(side*.82,2.3,2.14),(side*.65,.84,2.68)],.041,'coral',fixed)
    box('Engine cover',(0,1.84,1.46),(.8,.18,.67),'teal',fixed,.07)
    box('Battery',(-.91,1.0,1.53),(.4,.33,.49),'rubber',fixed,.025)
    box('Cooler',(.96,1.03,.37),(.6,.59,.71),'teal',fixed,.065)
    box('Cooler lid',(.96,1.35,.37),(.63,.09,.73),'cream',fixed,.04)
    path('Cooler handle',[(.67,1.08,.3),(.67,1.17,.3),(.67,1.17,.46),(.67,1.08,.46)],.017,'chrome',fixed)
    fan=group('Fan',root,(0,2.15,2.28))
    for i in range(3):
        a=i*math.tau/3
        verts=[]
        for r,w,z in [(.14,.09,0),(.42,.14,-.025),(.91,.15,.03),(1.06,.07,.05)]:
            for side in (-1,1):
                x=side*w;verts.append((x*math.cos(a)-r*math.sin(a),x*math.sin(a)+r*math.cos(a),z+side*.025))
        mesh('Twisted fan blade',verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(3)],'teal',fan)
    ell('Fan hub',(0,0,0),(.14,.14,.08),'chrome',fan)
    for z in (2.1,2.48):ring('Coral safety cage',(0,2.15,z),1.19,.028,'coral',fixed,n=48)
    for r in (.43,.79,1.17):ring('Cage ring',(0,2.15,2.49),r,.012,'chrome',fixed,n=36)
    for i in range(20):
        a=i*math.tau/20;x=math.cos(a)*1.18;y=2.15+math.sin(a)*1.18
        path('Cage radial',[(0,2.15,2.5),(x,y,2.5)],.009,'chrome',fixed)
        path('Cage spacer',[(x,y,2.1),(x,y,2.48)],.012,'chrome',fixed)
    for x in (-.44,.44):
        box('Rudder',(x,1.75,2.85),(.055,1.25,.55),'teal',fixed,.024)
        path('Rudder shaft',[(x,1.05,2.67),(x,2.5,2.67)],.021,'chrome',fixed)
    for side in (-1,1):
        path('Grab rail',[(side*1.4,.76,1.1),(side*1.4,1.11,.83),(side*1.4,1.11,-.85),(side*1.4,.76,-1.08)],.023,'chrome',fixed)
        for z in (-1.8,.2):
            ell('Dock fender',(side*1.57,.47,z),(.11,.3,.11),'cream',fixed)
            path('Fender line',[(side*1.42,.82,z),(side*1.57,.65,z)],.012,'seam',fixed)
    person(False,root,(-.46,1.37,-.5));person(True,root,(.59,1.1,-2.15))
    return root

hero=boat()
# Recalculate closed-surface normals before export. Skin now uses a regular material;
# facial identity is supplied by the purpose-painted UV atlas on the sculpted heads.
for o in list(bpy.data.objects):
    if o.type!='MESH':continue
    import bmesh
    bm=bmesh.new();bm.from_mesh(o.data)
    if all(e.is_manifold for e in bm.edges):bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(o.data);bm.free()
# Merge fixed geometry by shared material within each articulation node.
# This keeps the authored details cheap to submit in Three.js.
for parent in [o for o in list(bpy.data.objects) if o.type=='EMPTY']:
    buckets={}
    for o in list(parent.children):
        if o.type=='MESH':buckets.setdefault(tuple(m.name for m in o.data.materials),[]).append(o)
    for key,objects in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        bpy.context.object.name=f'{parent.name}_{key[0]}'

bpy.ops.object.select_all(action='SELECT')
asset=OUT/'airboat-couple-v4.glb'
bpy.ops.export_scene.gltf(filepath=str(asset),export_format='GLB',use_selection=True,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'airboat-couple-v4.blend'))
meshes=[o for o in bpy.data.objects if o.type=='MESH']
for o in meshes:o.data.calc_loop_triangles()
report={'version':bpy.app.version_string,'asset_bytes':asset.stat().st_size,'mesh_objects':len(meshes),
        'triangles':sum(len(o.data.loop_triangles) for o in meshes),'materials':len(M),
        'source':'Original authored geometry and generated facial albedo atlas; no embedded reference portraits'}
(WORK/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print('HERO_ASSET '+json.dumps(report))

# Authoring proof, separate from browser-performance evidence.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
scene.render.resolution_x=1100;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Warm studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.22,.3,.38,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
for p,energy,size in [((1,9,-3),1500,7),((-5,5,1),1000,6),((3,5,5),1100,4)]:
    bpy.ops.object.light_add(type='AREA',location=xyz(p));o=bpy.context.object;o.data.energy=energy;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(xyz((0,1.7,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=xyz((6,6,-9)));camera=bpy.context.object;scene.camera=camera
camera.rotation_euler=(xyz((0,1.5,-.3))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=9.1
scene.render.filepath=str(WORK/'hero-front.png');bpy.ops.render.render(write_still=True)
camera.location=xyz((4,4,8));camera.rotation_euler=(xyz((0,1.5,0))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(WORK/'hero-rear.png');bpy.ops.render.render(write_still=True)

# Front portrait of the actual seated mesh, in the same authoring scene.
camera.location=xyz((.45,3.4,-9))
camera.rotation_euler=(xyz((.05,2.65,-1.6))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=3.25
scene.render.resolution_x=1200;scene.render.resolution_y=1000
scene.render.filepath=str(WORK/'couple-close.png');bpy.ops.render.render(write_still=True)
