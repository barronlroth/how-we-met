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
WORK = ROOT / 'artifacts/florida-characters-v6'
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
    'cream':('eee3cb',.39), 'coral':('d97c5d',.39,.18), 'teal':('387f80',.36,.3),
    'chrome':('c4c9c0',.33,.82), 'rubber':('273b3b',.8), 'teak':('ffffff',.58),
    'linen':('e8dcc1',.87), 'seam':('71543b',.8), 'canvas':('ded5be',.73),
    'skinB':('e4a16e',.64), 'skinN':('de9d6c',.64), 'lipsB':('bf796b',.72),
    'lipsN':('bf735e',.62), 'hairB':('24170e',.67), 'curlLight':('39251a',.67),
    'hairN':('ba914e',.61), 'hairGold':('cba45f',.59), 'eyes':('718e4c',.3),
    'ink':('263632',.65), 'white':('fff7e4',.5), 'shirt':('7c8b69',.92),
    'ninaShirt':('df795c',.9), 'shorts':('427e83',.8), 'gold':('d9ae61',.35,.65),
}.items()}

# Generated, purpose-painted facial albedo. One compact shared atlas is embedded in the GLB.
face_image=bpy.data.images.load(str(ROOT/'art/characters/couple-face-atlas-v4.png'))
face_image.scale(1024,512)
face_image.file_format='JPEG';face_image.filepath_raw=str(WORK/'couple-face-atlas-v4.jpg');face_image.save()
face_image=bpy.data.images.load(str(WORK/'couple-face-atlas-v4.jpg'))
for name,rough in [('faceB',.66),('faceN',.66),('eyeB',.28),('eyeN',.28)]:
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
    shader.inputs['Roughness'].default_value=.70

# An original generated teak scan supplies grain at real plank scale. The same
# compact image is embedded in the GLB, so the asset remains self-contained.
def image_material(name,source,size=(1024,1024)):
    img=bpy.data.images.load(str(source));img.scale(*size)
    img.file_format='JPEG';img.filepath_raw=str(WORK/(name+'-albedo.jpg'));img.save()
    img=bpy.data.images.load(str(WORK/(name+'-albedo.jpg')))
    tex=M[name].node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
    M[name].node_tree.links.new(tex.outputs['Color'],M[name].node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    return img
image_material('teak',ROOT/'florida/assets/teak-v2.png')

# Reuse only the linen quadrant from the generated shared coastal atlas. Extracting
# the tile allows true repeat UVs without texture bleeding from adjacent materials.
import numpy as np
# A compact tangent-space detail atlas adds subtle anatomical light response while
# preserving every approved facial/eye vertex and UV. Heights are millimetre-scale
# lid folds, smiling cheek planes and lip rolls, evaluated in the existing atlas.
face_normals=np.ones((256,512,4),dtype=np.float32)
for is_nina in (False,True):
    xs=np.linspace(-.33,.33,256,dtype=np.float32);ys=np.linspace(1.34,2.075,256,dtype=np.float32)
    xx,yy=np.meshgrid(xs,ys);height=np.zeros_like(xx)
    eye_y=1.340+.735*(.601 if is_nina else .619);eye_x=.123 if is_nina else .124
    mouth_y=1.340+.735*(.284 if is_nina else .308)
    for side in (-1,1):
        q=(xx-side*eye_x)/.080
        arc=np.sqrt(np.clip(1-q*q,0,1))
        window=np.exp(-(np.abs(q)/1.05)**12)
        height+=.0020*np.exp(-((yy-eye_y-.044*arc)/.009)**2)*window
        height+=.0011*np.exp(-((yy-eye_y+.042*arc)/.012)**2)*window
        height+=.004*np.exp(-((xx-side*.164)/.074)**2-((yy-mouth_y-.055)/.073)**2)
        # Soft nasolabial turning plane; shallow enough to preserve smiling youth.
        fold_x=side*(.05+(1.64-yy)*.60)
        height-=.0008*np.exp(-((xx-fold_x)/.013)**2-((yy-1.59)/.075)**4)
    q=xx/.115;window=np.exp(-(np.abs(q)/1.05)**12)
    upper=(1.576 if is_nina else 1.562)+(.016 if is_nina else .020)*q*q
    lower=(1.506 if is_nina else 1.537)+(.080 if is_nina else .045)*q*q
    height+=.0018*np.exp(-((yy-upper)/.012)**2)*window
    height+=.0024*np.exp(-((yy-lower)/.015)**2)*window
    dy,dx=np.gradient(height,.735/255,.66/255)
    normal=np.stack((-dx,-dy,np.ones_like(dx)),axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    start=256 if is_nina else 0;face_normals[:,start:start+256,:3]=normal*.5+.5
face_detail=bpy.data.images.new('Facial contour normal',width=512,height=256);face_detail.colorspace_settings.name='Non-Color'
face_detail.pixels.foreach_set(face_normals.flatten());face_detail.file_format='PNG';face_detail.filepath_raw=str(WORK/'face-relief-normal.png');face_detail.save()
face_detail=bpy.data.images.load(str(WORK/'face-relief-normal.png'));face_detail.colorspace_settings.name='Non-Color'
for name in ('faceB','faceN'):
    nodes=M[name].node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=face_detail
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.60
    M[name].node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
    M[name].node_tree.links.new(normal.outputs['Normal'],nodes['Principled BSDF'].inputs['Normal'])

cloth_source=bpy.data.images.load(str(ROOT/'florida/assets/textures/coastal-materials-v1.png'))
w,h=cloth_source.size;pixels=np.array(cloth_source.pixels[:],dtype=np.float32).reshape((h,w,4))
cloth_image=bpy.data.images.new('Linen surface',width=w//2,height=h//2)
cloth_image.pixels.foreach_set(pixels[:h//2,:w//2,:].flatten());cloth_image.scale(512,512)
cloth_image.file_format='JPEG';cloth_image.filepath_raw=str(WORK/'linen-albedo.jpg');cloth_image.save()
cloth_image=bpy.data.images.load(str(WORK/'linen-albedo.jpg'))
# Subtle tangent-space weave relief is derived from the same generated tile.
# A 256px map keeps this submillimetre detail inexpensive in the browser.
cloth_height=bpy.data.images.load(str(WORK/'linen-albedo.jpg'));cloth_height.scale(256,256)
height=np.array(cloth_height.pixels[:],dtype=np.float32).reshape((256,256,4))[:,:,:3].mean(axis=2)
du=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*.40
dv=(np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*.40
normals=np.stack((-du,-dv,np.ones_like(height)),axis=-1);normals/=np.linalg.norm(normals,axis=-1,keepdims=True)
normal_pixels=np.ones((256,256,4),dtype=np.float32);normal_pixels[:,:,:3]=normals*.5+.5
cloth_normal=bpy.data.images.new('Linen weave normal',width=256,height=256);cloth_normal.colorspace_settings.name='Non-Color'
cloth_normal.pixels.foreach_set(normal_pixels.flatten());cloth_normal.file_format='PNG';cloth_normal.filepath_raw=str(WORK/'linen-normal.png');cloth_normal.save()
cloth_normal=bpy.data.images.load(str(WORK/'linen-normal.png'));cloth_normal.colorspace_settings.name='Non-Color'
CLOTH={'linen','shirt','ninaShirt','shorts','canvas'}
for name in CLOTH:
    mat=M[name];nodes=mat.node_tree.nodes;shader=nodes['Principled BSDF']
    tex=nodes.new('ShaderNodeTexImage');tex.image=cloth_image
    # Blender 5.2's glTF exporter recognizes RGBA Mix, not the legacy MixRGB.
    # Keep the dye as an explicit glTF baseColorFactor multiplied by shared linen.
    mix=nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
    mix.inputs[7].default_value=mat.diffuse_color
    mat.node_tree.links.new(tex.outputs['Color'],mix.inputs[6])
    mat.node_tree.links.new(mix.outputs[2],shader.inputs['Base Color'])
    # glTF exports Sheen Tint but ignores Blender's nonzero Sheen Weight amount.
    shader.inputs['Sheen Weight'].default_value=1
    shader.inputs['Sheen Tint'].default_value=(.08,.08,.08,1)
    normal_tex=nodes.new('ShaderNodeTexImage');normal_tex.image=cloth_normal
    normal_map=nodes.new('ShaderNodeNormalMap');normal_map.inputs['Strength'].default_value=.35
    mat.node_tree.links.new(normal_tex.outputs['Color'],normal_map.inputs['Color'])
    mat.node_tree.links.new(normal_map.outputs['Normal'],shader.inputs['Normal'])


# Vertex fiber shading reinforces the recessed sculpted channels without a new
# texture or draw call. The explicit RGBA multiply preserves the golden dye.
for name in ('hairN','hairGold'):
    mat=M[name];nodes=mat.node_tree.nodes
    fiber=nodes.new('ShaderNodeVertexColor');fiber.layer_name='HairFibers'
    mix=nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
    mix.inputs[7].default_value=mat.diffuse_color
    mat.node_tree.links.new(fiber.outputs['Color'],mix.inputs[6])
    mat.node_tree.links.new(mix.outputs[2],nodes['Principled BSDF'].inputs['Base Color'])

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
    # Catmull-Rom fairing through a deliberate marine hull plan, with a rounded
    # entry and long almost straight sides. Six chine stations form the shell.
    controls=[(-1.13,2.98),(-1.43,2.73),(-1.49,1.6),(-1.51,0),(-1.44,-2.25),(-1.21,-3.08),(-.65,-3.61),(0,-3.77),(.65,-3.61),(1.21,-3.08),(1.44,-2.25),(1.51,0),(1.49,1.6),(1.43,2.73),(1.13,2.98)]
    outline=[]
    for i in range(len(controls)):
        p0,p1,p2,p3=[Vector(controls[k%len(controls)]) for k in (i-1,i,i+1,i+2)]
        for j in range(5):
            u=j/5
            v=.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)
            outline.append(tuple(v))
    n=len(outline);verts=[]
    stations=[(.015,.82),(.085,.86),(.22,.955),(.41,.991),(.62,1),(.72,.992)]
    for y,scale in stations:
        verts.extend([(x*scale,y+.025*max(0,(-z-2)/1.77),z*scale) for x,z in outline])
    faces=[tuple(range(n-1,-1,-1))]
    for row in range(len(stations)-1):
        for i in range(n):
            j=(i+1)%n;faces.append((row*n+i,row*n+j,(row+1)*n+j,(row+1)*n+i))
    shell=mesh('Formed fiberglass shell with faired chines',verts,faces,'cream',parent)
    # A broad formed cap has a flat cushioned top and rolled outer/inner edges.
    section=[(1.011,.69),(1.016,.76),(1.003,.807),(.962,.82),(.925,.798),(.922,.754),(.946,.72)]
    vv=[(x*scale,y,z*scale) for scale,y in section for x,z in outline];ff=[]
    for row in range(len(section)):
        for i in range(n):
            j=(i+1)%n;nextrow=(row+1)%len(section)
            ff.append((row*n+i,row*n+j,nextrow*n+j,nextrow*n+i))
    mesh('Rolled continuous gunwale cap',vv,ff,'cream',parent)
    path('Coral hull inlay',[(x*1.003,.495,z*1.002) for x,z in outline],.032,'coral',parent,True)
    path('Recessed rub rail',[(x*1.006,.43,z*.999) for x,z in outline],.025,'rubber',parent,True)
    # Vertical generated grain and narrow dark caulking are mapped at .28m/plank.
    deck=mesh('Inset teak deck',[(x*.917,.725,z*.946) for x,z in outline],[tuple(reversed(range(n)))],'teak',parent,False)
    uv=deck.data.uv_layers.new(name='DeckUV')
    for loop in deck.data.loops:
        x,z,y=deck.data.vertices[loop.vertex_index].co
        uv.data[loop.index].uv=((x+1.26)/1.68,(-z+3.6)/2.8)
    path('Teak deck border seam',[(x*.918,.729,z*.947) for x,z in outline],.007,'seam',parent,True)
    # Sparse joinery is geometry, while grain and caulking stay in the texture.
    for i in range(-4,5):
        x=i*.28
        for j in range(3):
            z=-2.35+j*1.82+(.55 if i%2 else 0)
            if z>2.55:continue
            path('Staggered plank end',[(x-.123,.729,z),(x+.123,.729,z)],.004,'seam',parent)
    for i in range(0,n,5):
        x,z=outline[i]
        ell('Flush gunwale fastener',(x*.973,.82,z*.973),(.014,.004,.014),'chrome',parent,10,6)
    for x,z in [(-.92,-2.84),(.97,.72),(-.93,2.46)]:
        ell('Recessed deck fitting',(x,.731,z),(.069,.008,.069),'chrome',parent,20,8)
        path('Deck fitting slot',[(x-.034,.741,z),(x+.034,.741,z)],.006,'rubber',parent)
    return outline


def cushion(parent,name,center,size):
    # Superellipsoid upholstery: softly rounded corners and broad loaded surfaces.
    x,y,z=center;w,h,d=size;verts=[];faces=[];cols=32;rows=16
    power=lambda v,e:math.copysign(abs(v)**e,v)
    for j in range(rows+1):
        lat=-math.pi/2+math.pi*j/rows
        for i in range(cols):
            a=math.tau*i/cols
            xx=power(math.cos(lat),.53)*power(math.cos(a),.53)*w/2
            zz=power(math.cos(lat),.53)*power(math.sin(a),.53)*d/2
            yy=power(math.sin(lat),.53)*h/2
            # Seat surfaces compress subtly below the thighs instead of doming.
            if yy>0:yy-=.017*math.exp(-(xx/(w*.34))**4-(zz/(d*.33))**4)
            verts.append((x+xx,y+yy,z+zz))
            if j:faces.append(((j-1)*cols+i,j*cols+i,j*cols+(i+1)%cols,(j-1)*cols+(i+1)%cols))
    return mesh(name,verts,faces,'canvas',parent)


def seat(parent,x,y,z,w):
    cushion(parent,'Loaded upholstered seat',(x,y,z),(w,.245,.88))
    cushion(parent,'Soft curved backrest',(x,y+.365,z+.36),(w,.77,.235))
    # Separate side bolsters wrap naturally around the hips, with open front entry.
    for side in (-1,1):
        cushion(parent,'Contoured side bolster',(x+side*(w*.46),y+.22,z+.10),(.16,.35,.64))
        path('Seat tubular frame',[(x+side*w*.34,.75,z-.25),(x+side*w*.34,y-.12,z-.25),(x+side*w*.34,y-.12,z+.27),(x+side*w*.34,.75,z+.27)],.027,'chrome',parent)
        path('Backrest frame',[(x+side*w*.35,y-.1,z+.3),(x+side*w*.35,y+.61,z+.46)],.021,'chrome',parent)
    path('Seat cushion welting',[(x-w*.43,y+.065,z-.409),(x+w*.43,y+.065,z-.409),(x+w*.46,y+.065,z+.29),(x-w*.46,y+.065,z+.29)],.009,'cream',parent,True)
    for dx in (-.22,.22):
        path('Upholstery channel',[(x+dx*w,y+.18,z+.235),(x+dx*w,y+.37,z+.233),(x+dx*w,y+.67,z+.25)],.004,'cream',parent)
    box('Seat base shell',(x,y-.105,z+.06),(w*.92,.09,.73),'cream',parent,.042)

def console_shell(parent):
    verts=[];faces=[];segments=40
    stations=[(.746,.57,.39,-1.33),(.805,.63,.42,-1.33),(1.30,.62,.44,-1.35),(1.75,.68,.50,-1.37),(1.89,.73,.50,-1.37)]
    for y,w,d,z in stations:
        for i in range(segments):
            theta=math.tau*i/segments
            x=math.copysign(abs(math.cos(theta))**.38,math.cos(theta))*w/2
            zz=math.copysign(abs(math.sin(theta))**.42,math.sin(theta))*d/2
            verts.append((-.46+x,y,z+zz))
    for row in range(len(stations)-1):
        for i in range(segments):
            j=(i+1)%segments;faces.append((row*segments+i,row*segments+j,(row+1)*segments+j,(row+1)*segments+i))
    faces.extend([tuple(reversed(range(segments))),tuple(range((len(stations)-1)*segments,len(stations)*segments))])
    mesh('Molded tapered steering console',verts,faces,'teal',parent)
    front=lambda y:-1.54-(y-.8)*.092
    for side in (-1,1):
        x=-.46+side*.22
        path('Console service panel seam',[(x,.87,front(.87)-.003),(x,1.55,front(1.55)-.003)],.0045,'rubber',parent)
        for y in (.91,1.51):
            ell('Console flush screw',(x,y,front(y)-.008),(.013,.013,.004),'chrome',parent,10,6)
    for y in (.87,1.55):path('Console service panel seam',[(-.68,y,front(y)-.003),(-.24,y,front(y)-.003)],.0045,'rubber',parent)
    for x in (-.86,-.06):
        ell('Dashboard flush screw',(x,1.959,-1.20),(.012,.005,.012),'chrome',parent,10,6)

def boat():
    root=group('Airboat');fixed=group('Hull',root);hull_shape(fixed)
    seat(fixed,-.46,1.58,-.47,.89);seat(fixed,.6,1.315,-2.12,1.02)
    box('Driver footrest',(-.46,1.147,-1.24),(.66,.075,.45),'rubber',fixed,.035)
    for x in (-.74,-.18):path('Footrest support',[(x,.75,-1.22),(x,1.12,-1.22)],.023,'chrome',fixed)
    console_shell(fixed)
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
        path('Fan support',[(side*.88,.84,1.06),(side*1.04,2.49,2.1),(side*.85,.84,2.72)],.044,'coral',fixed)
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
            r*=1.27;w*=1.22
            for side in (-1,1):
                x=side*w;verts.append((x*math.cos(a)-r*math.sin(a),x*math.sin(a)+r*math.cos(a),z+side*.025))
        mesh('Twisted fan blade',verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(3)],'teal',fan)
    ell('Fan hub',(0,0,0),(.165,.165,.10),'chrome',fan)
    # The expanded cage has a short level foot at deck height. The round rotor
    # clears it while the safety frame seats on the deck instead of cutting through.
    def cage_ring(name,z,r,thick,n):
        pts=[(r*math.cos(i*math.tau/n),max(.765,2.15+r*math.sin(i*math.tau/n)),z) for i in range(n)]
        path(name,pts,thick,'chrome',fixed,True)
    for z in (2.1,2.48):cage_ring('Formed stainless safety cage',z,1.51,.032,64)
    for r in (.495,.826,1.168,1.486):cage_ring('Cage ring',2.49,r,.011,48)
    for i in range(20):
        a=i*math.tau/20;x=math.cos(a)*1.50;y=max(.765,2.15+math.sin(a)*1.50)
        path('Cage radial',[(0,2.15,2.5),(x,y,2.5)],.009,'chrome',fixed)
        path('Cage spacer',[(x,y,2.1),(x,y,2.48)],.012,'chrome',fixed)
    for x in (-.55,.55):
        box('Rudder',(x,1.80,2.85),(.055,1.45,.55),'teal',fixed,.024)
        path('Rudder shaft',[(x,1.05,2.67),(x,2.64,2.67)],.021,'chrome',fixed)
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
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(o.data);bm.free()
# Bake the static hand poses into their parent articulation before material merging.
for hand in [o for o in list(bpy.data.objects) if o.type=='EMPTY' and 'hand' in o.name.lower()]:
    bpy.context.view_layer.update()
    for child in list(hand.children):
        world=child.matrix_world.copy();child.parent=hand.parent;child.matrix_world=world
    bpy.data.objects.remove(hand,do_unlink=True)
# Hair caps share the same color attribute as the ribbon fibers; missing layers
# would otherwise become black when Blender joins these surfaces by material.
for obj in [o for o in bpy.data.objects if o.type=='MESH' and any(m and m.name in ('hairN','hairGold') for m in o.data.materials)]:
    if obj.data.color_attributes.get('HairFibers') is None:
        attr=obj.data.color_attributes.new(name='HairFibers',type='FLOAT_COLOR',domain='POINT')
        for datum in attr.data:datum.color=(1,1,1,1)
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

# Apply stable projection UVs after cloth remeshing and shared-material joins.
# Fabric grain repeats at a fine scale; atlas color is multiplied by outfit dye.
for obj in [o for o in bpy.data.objects if o.type=='MESH' and any(m and m.name in CLOTH for m in o.data.materials)]:
    for layer in list(obj.data.uv_layers):obj.data.uv_layers.remove(layer)
    uv=obj.data.uv_layers.new(name='FabricUV')
    uv.active_render=True;obj.data.uv_layers.active=uv
    name=obj.data.materials[0].name
    for loop in obj.data.loops:
        v=obj.data.vertices[loop.vertex_index].co
        if name in ('shirt','ninaShirt'):
            coords=(math.atan2(v.x,v.y)*.64,v.z*4)
        elif name in ('shorts','linen'):
            coords=(v.x*4,v.y*4)
        else:
            coords=(v.x*4,(v.z-v.y)*2.8)
        uv.data[loop.index].uv=coords

# Hair is a continuous silhouette at game scale; remove redundant curve tessellation.
for obj in [o for o in bpy.data.objects if o.type=='MESH' and any(m and m.name in ('hairB','curlLight','hairN','hairGold') for m in o.data.materials)]:
    bpy.context.view_layer.objects.active=obj
    mod=obj.modifiers.new('Compact sculpted hair','DECIMATE');mod.ratio=.68
    bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.select_all(action='SELECT')
asset=OUT/'airboat-couple-v6.glb'
bpy.ops.export_scene.gltf(filepath=str(asset),export_format='GLB',use_selection=True,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'airboat-couple-v6.blend'))
meshes=[o for o in bpy.data.objects if o.type=='MESH']
for o in meshes:o.data.calc_loop_triangles()
report={'version':bpy.app.version_string,'asset_bytes':asset.stat().st_size,'mesh_objects':len(meshes),
        'triangles':sum(len(o.data.loop_triangles) for o in meshes),'materials':len({m.name for o in meshes for m in o.data.materials if m}),
        'source':'Original authored geometry, unchanged generated facial albedo, generated teak and linen; no embedded reference portraits'}
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

# Neutral face and shoulder review uses the exact exported characters, including
# their transformations. It is deliberately rendered after saving/exporting art.
for obj in hero.children_recursive: obj.hide_render=True
hero.hide_render=True
review=group('Character shape review')
def review_copy(source,parent):
    copy=source.copy();bpy.context.collection.objects.link(copy);copy.parent=parent;copy.hide_render=False
    for child in source.children:review_copy(child,copy)
    return copy
for name,p in [('Barron',(-.48,.1,0)),('Nina',(.48,.1,0))]:
    copy=review_copy(bpy.data.objects[name],review);copy.location=xyz(p)
camera.location=xyz((0,1.84,-7))
camera.rotation_euler=(xyz((0,1.55,0))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=1.96
scene.render.resolution_x=1200;scene.render.resolution_y=1050
scene.render.filepath=str(WORK/'characters-front.png');bpy.ops.render.render(write_still=True)
camera.location=xyz((3.4,2.1,-7))
camera.rotation_euler=(xyz((0,1.55,0))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(WORK/'characters-three-quarter.png');bpy.ops.render.render(write_still=True)
