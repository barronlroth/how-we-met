"""Original Blender-authored game art, using the supplied portraits as visual reference.

All helpers accept the game's coordinates: X right, Y up, forward -Z.
Portrait files are never embedded in the exported asset.
"""
import bpy
import json
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'florida/assets/models'
WORK = ROOT / 'artifacts/florida-hero'
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
    'teakLight':('d4a66d',.6), 'seam':('71543b',.8), 'canvas':('d4ddcc',.9),
    'skinB':('e5b18c',.78), 'skinN':('e7b68f',.78), 'lipsB':('bf796b',.72),
    'lipsN':('bf735e',.62), 'hairB':('35281f',.7), 'curlLight':('59402d',.7),
    'hairN':('77502f',.68), 'hairGold':('a38255',.65), 'eyes':('688578',.4),
    'ink':('263632',.65), 'white':('fff7e4',.5), 'shirt':('7c8b69',.92),
    'shirtLight':('a9b28c',.9), 'shorts':('427e83',.8), 'gold':('d9ae61',.35,.65),
}.items()}

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
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=2
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

def face(parent,nina):
    skin='skinN' if nina else 'skinB';hair='hairN' if nina else 'hairB';lip='lipsN' if nina else 'lipsB'
    head=group('NinaHead' if nina else 'BarronHead',parent)
    ell('Soft jaw and cheeks',(0,1.52,0),(.265,.34,.235),skin,head,32,20)
    ell('Neck',(0,1.205,.025),(.12,.18,.12),skin,parent)
    for side in (-1,1):
        ell('Ear',(side*.262,1.51,.018),(.035,.068,.037),skin,head)
        x=side*.111
        ell('Almond eye',(x,1.575,-.211),(.069,.028,.009),'white',head)
        ell('Green iris',(x+side*.004,1.575,-.221),(.022,.024,.004),'eyes',head)
        ell('Pupil',(x+side*.004,1.575,-.226),(.009,.015,.003),'ink',head,16,8)
        ell('Eye catchlight',(x-.008,1.585,-.23),(.004,.005,.002),'white',head,12,8)
        path('Upper eyelid',[(x-.063,1.576,-.211),(x,1.602,-.223),(x+.063,1.578,-.211)],.007,hair,head)
        path('Expressive brow',[(x-.074,1.663,-.209),(x,1.681,-.224),(x+.069,1.658,-.209)],.011 if nina else .014,hair,head,radii=[.55,1,.4])
        if nina:
            ring('Gold hoop',(side*.289,1.465,.016),.054,.008,'gold',head)
        else:ell('Silver stud',(side*.299,1.48,.013),(.013,.014,.012),'chrome',head,12,8)
    ell('Nose bridge',(0,1.535,-.22),(.027,.057,.025),skin,head)
    ell('Nose tip',(0,1.491,-.248),(.033,.026,.025),skin,head)
    smile=.125 if nina else .101
    path('Upper smile',[(-smile,1.411,-.213),(0,1.393,-.215),(smile,1.419,-.214)],.016,lip,head,radii=[.5,1,.45])
    path('Lower smile',[(-smile,1.411,-.213),(0,1.348 if nina else 1.372,-.215),(smile,1.419,-.214)],.014,lip,head,radii=[.4,1,.4])
    if nina:
        verts=[]
        for i in range(17):
            u=i/16*2-1;x=u*smile
            verts.extend([(x,1.398+.016*u*u,-.218+.015*u*u),(x,1.368+.045*u*u,-.219+.015*u*u)])
        mesh('Bright natural smile',verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(16)],'white',head)
    else:
        path('Jaw stubble',[(-.182,1.425,-.14),(-.115,1.293,-.144),(0,1.25,-.154),(.115,1.293,-.144),(.182,1.425,-.14)],.011,'curlLight',head,radii=[.2,.6,1,.6,.2])
    if nina:
        vertices=[]
        for row in range(11):
            for col in range(32):
                a=col/32*math.tau;theta=row/10*(1.0 if math.sin(a)<-.25 else 1.83)
                vertices.append((math.cos(a)*math.sin(theta)*.274,1.54+math.cos(theta)*.346,.015+math.sin(a)*math.sin(theta)*.252))
        mesh('Fitted parted scalp',vertices,[(r*32+c,r*32+(c+1)%32,(r+1)*32+(c+1)%32,(r+1)*32+c) for r in range(10) for c in range(32)],'hairN',head)

        for i in range(19):
            a=(i/18)*math.pi*1.78+.11;x=math.cos(a)*.25;z=math.sin(a)*.215+.035
            # Open face at the front; long ribbons follow the back and shoulders.
            if z<-.125:continue
            points=[(x*.6,1.83,z*.65),(x,1.66,z),(x*1.05+math.sin(i)*.04,1.44,z+.06),(x*1.15-math.sin(i)*.035,1.18,z+.13),(x*1.06+math.sin(i)*.05,.88+(i%3)*.05,z+.2)]
            path('Flowing hair lock',points,.052,'hairGold' if i%4==0 else 'hairN',head,radii=[.7,1,1,.85,.15])
            if i%2==0:path('Sunlit hair ribbon',[(p[0]+.008,p[1],p[2]-.019) for p in points],.009,'hairGold',head,radii=[.3,.8,1,.7,.05])
        for side in (-1,1):
            path('Face framing wave',[(side*.025,1.823,-.123),(side*.17,1.76,-.184),(side*.26,1.54,-.153),(side*.3,1.28,-.07),(side*.24,1.09,.025)],.036,'hairGold',head,radii=[.6,1,1,.85,.2])
    else:
        ell('Short hair base',(0,1.718,.052),(.266,.185,.218),'hairB',head,24,14)
        for i in range(32):
            a=i*2.399;r=.23*math.sqrt((i+.5)/32);x=math.cos(a)*r;z=math.sin(a)*r
            y=1.82+.057*(1-r/.24)+random.uniform(-.015,.016)
            lock=ell('Sculpted curl',(x,y,z),(.072,.044,.061),'curlLight' if i%7==0 else 'hairB',head,12,8)
            lock.rotation_euler.y=random.uniform(-.6,.6)
        for side in (-1,1):path('Tapered temple',[(side*.234,1.75,-.025),(side*.259,1.64,-.034),(side*.249,1.535,-.013)],.033,'hairB',head,radii=[1,.8,.15])
    # Turn faces slightly toward each other while seated in the forward-facing boat.
    head.rotation_euler.z=.15 if nina else -.12
    return head

def person(nina,parent,p):
    root=group('Nina' if nina else 'Barron',parent,p);skin='skinN' if nina else 'skinB'
    if nina:
        ell('Torso',(0,.85,.005),(.245,.36,.15),skin,root,24,16)
        ell('Waist',(0,.55,.02),(.205,.18,.16),skin,root)
        ell('Bikini bottoms',(0,.43,0),(.28,.15,.215),'coral',root)
        for side in (-1,1):
            ell('Bikini top',(side*.12,1.02,-.128),(.135,.105,.07),'coral',root)
            path('Bikini strap',[(side*.17,1.06,-.16),(side*.22,1.23,-.01),(side*.17,1.03,.14)],.018,'coral',root)
        path('Back bikini tie',[(-.23,1.0,.12),(0,.97,.16),(.23,1.0,.12)],.023,'coral',root)
    else:
        box('Linen shirt',(0,.89,.01),(.64,.66,.36),'shirt',root,.105)
        mesh('Open shirt neckline',[(-.085,1.23,-.186),(.085,1.23,-.186),(0,1.035,-.195)],[(0,1,2)],skin,root,False)
        for side in (-1,1):
            box('Short linen sleeve',(side*.318,1.077,-.027),(.22,.245,.31),'shirt',root,.06)
            collar=mesh('Camp collar',[(side*.07,1.25,-.194),(side*.21,1.19,-.21),(side*.18,.99,-.219),(side*.035,1.04,-.218)],[(0,1,2,3)],'shirtLight',root,False)
            path('Shirt folded seam',[(side*.15,.65,-.179),(side*.19,.85,-.189),(side*.22,1.06,-.181)],.006,'shirtLight',root)
            box('Tailored shorts',(side*.18,.43,-.09),(.33,.29,.44),'shorts',root,.09)
        path('Gold chain',[(-.092,1.205,-.208),(0,1.142,-.216),(.092,1.205,-.208)],.006,'gold',root)
        for y in (.72,.83,.94):ell('Shirt button',(.024,y,-.181),(.013,.013,.006),'cream',root,12,8)
    for side in (-1,1):
        x=side*.175
        path('Seated leg',[(x,.43,-.08),(x,.36,-.47),(x,.3,-.61),(x,-.12,-.68)],.115 if nina else .135,skin,root,radii=[1.12,1,.86,.65])
        box('Sandal sole',(x,-.19,-.75),(.22,.065,.38),'seam',root,.035)
        ell('Foot',(x,-.135,-.75),(.094,.06,.16),skin,root)
        path('Sandal strap',[(x-.09,-.13,-.82),(x,-.073,-.81),(x+.09,-.13,-.82)],.022,'cream' if nina else 'rubber',root)
    face(root,nina)
    # The pointing arm is an independent rigid node, preserving the race reactions.
    arm=group('PointingArm' if nina else 'DrivingArm',root,(.285,1.095,0))
    if nina:
        path('Pointing arm',[(0,0,0),(.22,.04,-.17),(.37,.24,-.39)],.08,skin,arm,radii=[1,.9,.62])
        ell('Pointing hand',(.385,.253,-.42),(.07,.053,.095),skin,arm)
        path('Index finger',[(.392,.268,-.45),(.46,.321,-.58),(.49,.335,-.62)],.022,skin,arm,radii=[1,.8,.4])
    else:
        path('Steering arm',[(0,0,0),(.16,-.16,-.2),(.12,-.25,-.56)],.087,skin,arm,radii=[1.1,.95,.65])
        ell('Hand at wheel',(.12,-.25,-.59),(.066,.06,.09),skin,arm)
    path('Left arm',[(-.28,1.09,0),(-.39,.81,-.13),(-.31,.6,-.37 if nina else -.64)],.09,skin,root,radii=[1.1,.9,.67])
    ell('Left hand',(-.31,.61,-.4 if nina else -.66),(.062,.054,.09),skin,root)
    return root

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
# Merge fixed geometry by shared material within each articulation node.
# This keeps the authored details cheap to submit in Three.js.
for parent in [o for o in list(bpy.data.objects) if o.type=='EMPTY']:
    buckets={}
    for o in list(parent.children):
        if o.type=='MESH':buckets.setdefault(o.data.materials[0].name,[]).append(o)
    for key,objects in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        bpy.context.object.name=f'{parent.name}_{key}'

bpy.ops.object.select_all(action='SELECT')
asset=OUT/'airboat-couple-v3.glb'
bpy.ops.export_scene.gltf(filepath=str(asset),export_format='GLB',use_selection=True,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'airboat-couple-v3.blend'))
meshes=[o for o in bpy.data.objects if o.type=='MESH']
for o in meshes:o.data.calc_loop_triangles()
report={'version':bpy.app.version_string,'asset_bytes':asset.stat().st_size,'mesh_objects':len(meshes),
        'triangles':sum(len(o.data.loop_triangles) for o in meshes),'materials':len(M),
        'source':'Original authored geometry; user-supplied likeness references; no embedded portraits'}
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
