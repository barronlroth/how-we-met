"""Original Blender-authored causeway and waterfront restaurant, in metres.

Game coordinates are X/right, Y/up and +Z/waterfront. Native meshes are merged
per material, preserving small architectural details without per-object draws.
The two exported roots sit independently at the origin. Review renders and the
editable .blend are written outside the published assets directory.
"""
import bpy
import bmesh
import json
import math
import random
import sys
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'artifacts/florida-landmarks-v1'
OUT = ROOT / 'florida/assets/models/landmarks-v1.glb'
WORK.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(15017)

def xyz(p): return (p[0], -p[2], p[1])
def linear(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

M = {}
for name, color, rough, metal in [
    ('LandmarkStucco', 'dfdccb', .84, 0),
    ('LandmarkConcrete', 'b9bdaf', .9, 0),
    ('LandmarkTrim', 'f3ead4', .7, 0),
    ('LandmarkTerracotta', 'b56a44', .81, 0),
    ('LandmarkMetal', '536f74', .38, .58),
    ('LandmarkGlazing', '305761', .2, .37),
    ('LandmarkTeak', '8e6846', .84, 0),
    ('LandmarkCanvas', '3f6755', .91, 0),
    ('LandmarkLinen', 'e6daba', .96, 0),
    ('LandmarkSkin', 'bd8d67', .81, 0),
    ('LandmarkNavy', '344a51', .83, 0),
    ('LandmarkBrass', 'b1a171', .41, .64),
]:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    rgba = tuple(linear(int(color[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1,)
    mat.diffuse_color = rgba
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = rgba
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metal
    M[name.replace('Landmark', '').lower()] = mat

# Split the supplied original image-generated atlas into repeatable material
# tiles. Each is embedded in the GLB, so standard glTF samplers can repeat long
# walls and road beams without bleeding into a neighboring atlas quadrant.
atlas_path = ROOT / 'florida/assets/textures/coastal-materials-v1.png'
atlas = bpy.data.images.load(str(atlas_path))
aw, ah = atlas.size
pixels = np.array(atlas.pixels[:], dtype=np.float32).reshape(ah, aw, 4)
for material, row, column in [('stucco',1,0),('terracotta',1,1),('linen',0,0),('concrete',0,1)]:
    tile = pixels[row*(ah//2):(row+1)*(ah//2),column*(aw//2):(column+1)*(aw//2)].copy()
    img = bpy.data.images.new('Landmark '+material+' color', width=aw//2, height=ah//2)
    img.pixels.foreach_set(tile.flatten()); img.scale(512,512)
    img.file_format='JPEG';img.filepath_raw=str(WORK/(material+'-albedo.jpg'));img.save()
    img=bpy.data.images.load(str(WORK/(material+'-albedo.jpg')))
    nodes=M[material].node_tree.nodes;links=M[material].node_tree.links
    texture=nodes.new('ShaderNodeTexImage');texture.image=img
    links.new(texture.outputs['Color'],nodes['Principled BSDF'].inputs['Base Color'])
    # Export a shallow tangent normal, derived from the supplied material image.
    # It adds pores/weave to near surfaces without geometry or shader extensions.
    lum=tile[:,:,:3].mean(axis=2)
    nx=(np.roll(lum,1,axis=1)-np.roll(lum,-1,axis=1))*1.8
    ny=(np.roll(lum,1,axis=0)-np.roll(lum,-1,axis=0))*1.8
    normals=np.stack([nx,ny,np.ones_like(nx)],axis=2)
    normals/=np.linalg.norm(normals,axis=2,keepdims=True)
    rgba=np.concatenate([normals*.5+.5,np.ones((*lum.shape,1),dtype=np.float32)],axis=2)
    normal=bpy.data.images.new('Landmark '+material+' normal',width=aw//2,height=ah//2)
    normal.colorspace_settings.name='Non-Color';normal.pixels.foreach_set(rgba.flatten());normal.scale(256,256)
    normal.file_format='PNG';normal.filepath_raw=str(WORK/(material+'-normal.png'));normal.save()
    normal=bpy.data.images.load(str(WORK/(material+'-normal.png')))
    normal.colorspace_settings.name='Non-Color'
    normal_tex=nodes.new('ShaderNodeTexImage');normal_tex.image=normal
    normal_map=nodes.new('ShaderNodeNormalMap');normal_map.inputs['Strength'].default_value=.4
    links.new(normal_tex.outputs['Color'],normal_map.inputs['Color'])
    links.new(normal_map.outputs['Normal'],nodes['Principled BSDF'].inputs['Normal'])


class Asset:
    def __init__(self, name):
        self.name = name
        self.parts = {}

    def mesh(self, material, verts, faces, smooth=False):
        bucket = self.parts.setdefault(material, [[], [], []])
        n = len(bucket[0])
        bucket[0].extend(verts)
        bucket[1].extend(tuple(i + n for i in face) for face in faces)
        bucket[2].extend([smooth] * len(faces))

    def box(self, p, size, material, bevel=0):
        x, y, z = p
        w, h, d = size
        if not bevel:
            verts = [(x + a * w / 2, y + b * h / 2, z + c * d / 2)
                     for a, b, c in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),
                                     (-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
            self.mesh(material, verts, [(0,3,2,1),(4,5,6,7),(0,1,5,4),
                                        (1,2,6,5),(2,3,7,6),(3,0,4,7)])
            return
        b = min(bevel, w * .2, d * .2, h * .2)
        profile = [(-w/2+b,-d/2),(w/2-b,-d/2),(w/2,-d/2+b),(w/2,d/2-b),
                   (w/2-b,d/2),(-w/2+b,d/2),(-w/2,d/2-b),(-w/2,-d/2+b)]
        rows = [(y-h/2, .995), (y-h/2+b, 1), (y+h/2-b, 1), (y+h/2, .995)]
        verts = [(x + a * s, yy, z + c * s) for yy, s in rows for a, c in profile]
        faces = [tuple(reversed(range(8))), tuple(range(24,32))]
        faces.extend((r*8+i,r*8+(i+1)%8,(r+1)*8+(i+1)%8,(r+1)*8+i)
                     for r in range(3) for i in range(8))
        self.mesh(material, verts, faces)

    def tube(self, points, radius, material, sides=8):
        verts = []
        for i, p in enumerate(points):
            p = Vector(p)
            direction = (Vector(points[min(i+1,len(points)-1)]) - Vector(points[max(i-1,0)])).normalized()
            axis = direction.cross(Vector((0,0,1)))
            if axis.length < .001: axis = direction.cross(Vector((1,0,0)))
            axis.normalize()
            second = direction.cross(axis).normalized()
            r = radius[i] if isinstance(radius, list) else radius
            verts.extend(tuple(p + axis * math.cos(j*math.tau/sides)*r + second * math.sin(j*math.tau/sides)*r)
                         for j in range(sides))
        faces = [tuple(reversed(range(sides))), tuple(range((len(points)-1)*sides,len(points)*sides))]
        faces.extend((r*sides+i,r*sides+(i+1)%sides,(r+1)*sides+(i+1)%sides,(r+1)*sides+i)
                     for r in range(len(points)-1) for i in range(sides))
        self.mesh(material, verts, faces, True)

    def ellipsoid(self, p, size, material, sides=10, rings=6):
        verts = [(p[0]+math.sin(i*math.pi/rings)*math.cos(j*math.tau/sides)*size[0],
                  p[1]+math.cos(i*math.pi/rings)*size[1],
                  p[2]+math.sin(i*math.pi/rings)*math.sin(j*math.tau/sides)*size[2])
                 for i in range(rings+1) for j in range(sides)]
        faces = [(r*sides+j,r*sides+(j+1)%sides,(r+1)*sides+(j+1)%sides,(r+1)*sides+j)
                 for r in range(rings) for j in range(sides)]
        self.mesh(material, verts, faces, True)

    def beam(self, a, b, width, depth, material):
        # A rectangular girder along an arbitrary XY line, with a fixed Z depth.
        dx, dy = b[0]-a[0], b[1]-a[1]
        length = math.hypot(dx, dy)
        nx, ny = -dy/length*width/2, dx/length*width/2
        verts = [(p[0]+nx*s,p[1]+ny*s,p[2]+dz*depth/2)
                 for p in (a,b) for s,dz in [(-1,-1),(1,-1),(1,1),(-1,1)]]
        self.mesh(material, verts, [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

    def rib(self, points, width, depth, material):
        # Shared cross sections avoid gaps between adjacent concrete arch stones.
        verts=[]
        for i,p in enumerate(points):
            a=points[max(0,i-1)];c=points[min(len(points)-1,i+1)]
            length=math.hypot(c[0]-a[0],c[1]-a[1])
            nx=-(c[1]-a[1])/length*width/2;ny=(c[0]-a[0])/length*width/2
            verts.extend((p[0]+nx*s,p[1]+ny*s,p[2]+dz*depth/2) for s,dz in [(-1,-1),(1,-1),(1,1),(-1,1)])
        faces=[(3,2,1,0),tuple(range((len(points)-1)*4,len(points)*4))]
        faces.extend((r*4+i,r*4+(i+1)%4,(r+1)*4+(i+1)%4,(r+1)*4+i) for r in range(len(points)-1) for i in range(4))
        self.mesh(material,verts,faces)

    def hip_roof(self, x, y, z, w, d, rise, seam=.42):
        # Four continuous roof planes, raised hip caps, regular standing tile seams.
        ridge = max(0, (w-d) / 2)
        verts = [(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x+w/2,y,z+d/2),(x-w/2,y,z+d/2),
                 (x-ridge,y+rise,z),(x+ridge,y+rise,z)]
        self.mesh('terracotta', verts, [(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)])
        self.box((x,y-.1,z),(w,.2,d),'teak')
        for a,b in [(verts[0],verts[4]),(verts[3],verts[4]),(verts[1],verts[5]),(verts[2],verts[5]),(verts[4],verts[5])]:
            if Vector(b)-Vector(a) != Vector((0,0,0)): self.tube([a,b],.09,'terracotta',6)
        count=math.ceil(w/seam)
        for i in range(count+1):
            xx=-w/2+w*i/count
            reach=min(d/2,(w/2-abs(xx))*d/max(d,w-2*ridge))
            # The top endpoint lands on either ridge or diagonal hip.
            rise_at=rise*reach/(d/2)
            for side in (-1,1):
                self.tube([(x+xx,y+.028,z+side*d/2),
                           (x+xx,y+rise_at+.028,z+side*(d/2-reach))],.035,'terracotta',5)
        # Tile courses break up the large continuous roof without a texture atlas.
        courses=max(2,math.ceil(d/2/.72))
        for row in range(1,courses):
            t=row/courses; yy=y+rise*t+.035; zz=d/2*(1-t)
            half=w/2-(w/2-ridge)*t
            for side in (-1,1): self.tube([(x-half,yy,z+side*zz),(x+half,yy,z+side*zz)],.024,'terracotta',5)

    def text(self, text, center, width, material='navy'):
        font=bpy.data.curves.new(self.name+'Sign',type='FONT')
        font.body=text; font.align_x='CENTER';font.align_y='CENTER';font.size=1
        font.resolution_u=3; font.extrude=.006; font.bevel_depth=.001; font.bevel_resolution=0
        font_path=Path('/System/Library/Fonts/Supplemental/Georgia.ttf')
        if font_path.exists(): font.font=bpy.data.fonts.load(str(font_path))
        obj=bpy.data.objects.new(self.name+'Sign',font);bpy.context.collection.objects.link(obj)
        bpy.context.view_layer.objects.active=obj;obj.select_set(True)
        bpy.ops.object.convert(target='MESH');bpy.context.view_layer.update()
        scale=width/obj.dimensions.x
        ylo=min(v.co.y for v in obj.data.vertices);yhi=max(v.co.y for v in obj.data.vertices)
        yscale=min(scale,1.07/(yhi-ylo));ymid=(ylo+yhi)/2
        verts=[(center[0]+v.co.x*scale,center[1]+(v.co.y-ymid)*yscale,center[2]+v.co.z*scale) for v in obj.data.vertices]
        self.mesh(material, verts, [tuple(p.vertices) for p in obj.data.polygons])
        bpy.data.objects.remove(obj,do_unlink=True)

    def finish(self):
        root=bpy.data.objects.new(self.name,None);bpy.context.collection.objects.link(root)
        for material,(verts,faces,smoothing) in self.parts.items():
            mesh=bpy.data.meshes.new(self.name+'_'+material)
            mesh.from_pydata([xyz(p) for p in verts],[],faces);mesh.update()
            bm=bmesh.new();bm.from_mesh(mesh)
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
            for polygon,smooth in zip(mesh.polygons,smoothing): polygon.use_smooth=smooth
            # Metre-scale planar UVs remain available for shared runtime surfaces.
            uv=mesh.uv_layers.new(name='SurfaceMetres')
            for polygon in mesh.polygons:
                axis=max(range(3),key=lambda k:abs(polygon.normal[k]))
                axes=[k for k in range(3) if k!=axis]
                for loop in polygon.loop_indices:
                    v=mesh.vertices[mesh.loops[loop].vertex_index].co
                    density=8 if material=='linen' else .5
                    uv.data[loop].uv=(v[axes[0]]*density,v[axes[1]]*density)
            obj=bpy.data.objects.new(self.name+'_'+material,mesh);bpy.context.collection.objects.link(obj)
            obj.parent=root;mesh.materials.append(M[material])
        return root


def bridge():
    b=Asset('BridgeCauseway')
    # Segmented elevated deck; absolutely no mesh crosses the water below the girders.
    for x,w in [(-76.5,37),(-43,30),(0,56),(43,30),(76.5,37)]:
        b.box((x,17.95,0),(w-.07,.88,13.2),'concrete',.06)
        b.box((x,18.42,0),(w-.09,.07,10.8),'navy')
        for z in (-6.02,6.02): b.box((x,18.53,z),(w-.06,.24,1.1),'trim',.025)
        for z in (-5.55,5.55): b.box((x,17.23,z),(w-.15,.62,.55),'metal')
        for xx in range(math.ceil(x-w/2)+2,math.floor(x+w/2)-1,4):
            b.box((xx,18.47,0),(2.2,.018,.12),'trim')
        for z in (-6.57,6.57): b.box((x,18.07,z),(w-.05,.48,.12),'trim')
    # Raised road expansion joints and transverse structural diaphragms.
    for x in (-58,-28,0,28,58): b.box((x,18.47,0),(.085,.04,10.9),'navy')
    for x in range(-91,94,7): b.box((x,17.11,0),(.32,.52,12),'concrete')
    for side in (-1,1):
        for xx in (31,61,92):
            x=side*xx
            b.box((x,.43,0),(6.2,.86,14.4),'concrete',.12)
            for z in (-4.7,4.7):
                b.box((x,8.3,z),(2.6,15.2,2.3),'concrete',.1)
                b.box((x,1.25,z),(3.25,1.55,3.1),'stucco',.06)
                b.box((x,15.85,z),(4.7,1.05,3),'trim',.1)
            b.box((x,16.32,0),(5.35,.75,12.7),'concrete',.05)
        # Narrow concrete arch ribs under side approaches, with open spandrels.
        for start,end in ((32,60),(62,91)):
            for z in (-5.05,5.05):
                points=[]
                for i in range(17):
                    t=i/16;xx=start+(end-start)*t
                    points.append((side*xx,3.2+12.75*math.sin(math.pi*t)**.67,z))
                b.rib(points,.72,.9,'concrete')
                for i in range(1,8):
                    t=i/8;xx=start+(end-start)*t;lo=3.2+12.75*math.sin(math.pi*t)**.67
                    b.box((side*xx,(lo+17.15)/2,z),(.24,max(.1,17.15-lo),.65),'stucco')
        # Bascule-like haunches taper toward the central navigable opening.
        for z in (-5.7,5.7):
            for x0,x1 in ((0,14),(14,27)):
                a=(side*x0,16.92-x0*.036,z);c=(side*x1,16.92-x1*.036,z)
                b.beam(a,c,.5,.45,'metal')
        # The visible control tower stands forward of the traffic lanes.
        x=side*30.7;z=8.2
        b.box((x,.52,z),(8.6,1.04,8.8),'concrete',.13)
        b.box((x,1.37,z),(7.55,1.08,7.45),'stucco',.09)
        b.box((x,10.02,z),(6.5,16.6,6.5),'stucco',.075)
        # Recessed masonry panel bays leave broad vertical pilasters.
        for zz in (-1,1):
            face=z+zz*3.3
            b.box((x,9.88,face),(4.67,14.7,.085),'concrete')
            for dx in (-2.85,2.85): b.box((x+dx,10.05,face+zz*.15),(.51,16.25,.3),'trim',.025)
            for yy in (2.5,6.4,10.3,14.2): b.box((x,yy,face+zz*.067),(5.38,.085,.11),'stucco')
            for yy in (15.4,):
                b.box((x,yy,face+zz*.085),(.9,1.4,.1),'glazing')
                for dx in (-.55,.55): b.box((x+dx,yy,face+zz*.16),(.15,1.64,.2),'trim')
                b.box((x,yy-.79,face+zz*.19),(1.45,.17,.28),'trim')
        for xx in (-1,1):
            b.box((x+xx*3.3,9.85,z),(.1,14.6,4.7),'concrete')
            for dz in (-2.85,2.85): b.box((x+xx*3.38,10,z+dz),(.25,16,.5),'trim')
        for yy,w,h,d in [(18.25,7.3,.43,7.3),(18.62,7.7,.27,7.7),(19.05,6.9,.55,6.9)]:
            b.box((x,yy,z),(w,h,d),'trim',.035)
        b.box((x,20.58,z),(6.3,2.55,6.3),'glazing',.045)
        for dx in (-3.18,3.18):
            for dz in (-3.18,3.18): b.box((x+dx,20.5,z+dz),(.38,2.95,.38),'trim',.025)
        for offset in (-1.07,1.07):
            for sign in (-1,1):
                b.box((x+offset,20.52,z+sign*3.19),(.14,2.7,.16),'trim')
                b.box((x+sign*3.19,20.52,z+offset),(.16,2.7,.14),'trim')
        b.box((x,22.03,z),(7.15,.25,7.15),'trim',.025)
        b.hip_roof(x,22.22,z,8.5,8.3,1.95,.38)
        b.tube([(x,24.16,z),(x,24.88,z)],.055,'brass')
        # Tower access doors, equipment boxes and low fender piles.
        b.box((x,2.8,z+3.33),(1.2,2.35,.12),'metal')
        b.box((x+.38,2.7,z+3.43),(.035,.33,.05),'brass')
        for dx in (-4.1,4.1):
            for dz in (-3.8,0,3.8):
                b.tube([(x+dx,0,z+dz),(x+dx,1.65,z+dz)],.22,'teak',9)
                b.tube([(x+dx,1.36,z+dz),(x+dx,1.48,z+dz)],.23,'metal',9)
    # Fine two-height safety rails, not thick toy parapets.
    for z in (-6.42,6.42):
        for yy,r in ((18.88,.037),(19.32,.047),(19.75,.062)):
            b.tube([(-95,yy,z),(95,yy,z)],r,'metal',7)
        for x in range(-95,96,2): b.tube([(x,18.58,z),(x,19.75,z)],.05,'metal',6)
    # Slender road lights and navigation lamps.
    for x in (-83,-50,50,83):
        b.tube([(x,18.65,-6.05),(x,24.4,-6.05),(x,25.0,-5.8),(x,25.2,-4.8)],.085,'metal')
        b.box((x,25.1,-4.65),(.35,.13,.8),'linen',.025)
    return b.finish()


def restaurant():
    b=Asset('FisheriesRestaurant')
    # Separate bearer beams and timber boards make a deep occupied waterfront deck.
    for z in (-13,-7,-1,5,11,16.5): b.box((0,.78,z),(34.8,.5,.4),'teak')
    for i in range(125):
        x=-17.3+i*.278
        b.box((x,1.14,1.25),(.26,.22,31.2),'teak')
    b.box((0,1.06,16.93),(35,.5,.2),'teak')
    for x in (-17,-11,-5,1,7,13,17):
        for z in (-13,0,9,16.5):
            b.tube([(x,0,z),(x,1.25,z)],.2,'teak',10)
            b.tube([(x,.9,z),(x,1.03,z)],.212,'metal',9)
    # Warm low main volume, a broad terracotta roof, and a glazed central cupola.
    b.box((.5,4.34,-5.3),(27,6.12,16.9),'stucco',.075)
    for y,h,w,d in ((1.55,.48,27.3,17.2),(7.31,.28,27.7,17.55),(7.57,.26,28.1,17.8)):
        b.box((.5,y,-5.3),(w,h,d),'trim',.035)
    b.hip_roof(.5,7.72,-5.3,30,20.3,3.2,.37)
    b.box((.5,10.62,-5.3),(6.7,1.15,6.5),'stucco',.04)
    b.box((.5,11.8,-5.3),(6.2,1.72,6),'glazing',.025)
    for dx in (-3.14,3.14):
        for dz in (-3.05,3.05): b.box((.5+dx,11.88,-5.3+dz),(.34,1.92,.34),'trim')
    for dx in (-1.05,1.05):
        for dz in (-3.06,3.06): b.box((.5+dx,11.88,-5.3+dz),(.13,1.85,.14),'trim')
    for dz in (-1,1):
        for dx in (-3.15,3.15): b.box((.5+dx,11.88,-5.3+dz),(.14,1.85,.13),'trim')
    b.box((.5,12.84,-5.3),(7.05,.23,6.95),'trim')
    b.hip_roof(.5,13.0,-5.3,8.2,7.8,1.8,.32)
    b.tube([(.5,14.8,-5.3),(.5,15.35,-5.3)],.055,'brass')
    # Inset window glazing, slender divided lights, doors and wood shutters.
    for x in (-10.5,-6.4,-2.3,1.8,5.9,10.0):
        b.box((x,4.45,3.2),(3.15,4.42,.11),'glazing')
        for dx in (-1.65,0,1.65): b.box((x+dx,4.45,3.31),(.13,4.7,.16),'trim')
        b.box((x,3.1,3.31),(3.4,.13,.16),'trim')
        b.box((x,6.85,3.4),(3.6,.19,.35),'trim')
    for side in (-1,1):
        x=.5+side*13.57
        for z in (-11.6,-7.6,-3.6,.4):
            b.box((x,4.7,z),(.12,3.9,2.9),'glazing')
            for dz in (-1.56,0,1.56): b.box((x+side*.08,4.7,z+dz),(.18,4.14,.14),'trim')
            b.box((x+side*.12,2.55,z),(.34,.22,3.4),'trim')
        for z in (-13.55,3.0): b.box((x+side*.03,4.54,z),(.3,6.2,.35),'trim')
    # Two-level deep shaded dining canopy: main cover and green canvas valances.
    b.hip_roof(0,6.07,7.36,33.2,9.8,1.28,.39)
    b.box((0,6.12,12.22),(33.3,.44,.25),'trim')
    for x in (-16,-12,-8,-4,0,4,8,12,16):
        b.box((x,3.68,11.55),(.22,4.85,.22),'trim',.025)
        b.box((x,1.57,11.55),(.36,.6,.36),'stucco',.025)
        b.beam((x,5.55,11.55),(x+.7,6.0,11.55),.14,.18,'trim')
        b.beam((x,5.55,11.55),(x-.7,6.0,11.55),.14,.18,'trim')
    for x in (-13.8,-9.2,-4.6,0,4.6,9.2,13.8):
        verts=[(x-2.25,5.84,11.87),(x+2.25,5.84,11.87),(x+2.25,5.19,13.15),(x-2.25,5.19,13.15)]
        verts.extend((xx,yy-.025,zz) for xx,yy,zz in verts[:4])
        b.mesh('canvas',verts,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])
        b.box((x,5.03,13.15),(4.5,.32,.035),'canvas')
        for dx in (-2.22,2.22): b.tube([(x+dx,5.88,11.85),(x+dx,5.16,13.15)],.035,'metal',6)
    # Readable original lettering is mesh geometry rather than another texture.
    b.box((0,7.03,12.31),(28.8,1.38,.19),'trim',.03)
    for y in (6.34,7.72): b.box((0,y,12.44),(29.05,.11,.14),'teak')
    b.text('15th Street Fisheries',(0,7.03,12.438),26.4)
    # Railings, piling caps, subtle dock hardware and gaps for boat access.
    for x in range(-17,18,2):
        b.tube([(x,1.25,16.65),(x,2.5,16.65)],.073,'teak',7)
        b.box((x,2.53,16.65),(.21,.12,.21),'trim',.012)
    for yy in (1.79,2.44): b.tube([(-17.1,yy,16.65),(17.1,yy,16.65)],.065,'teak',7)
    for side in (-1,1):
        for z in range(-13,17,3): b.tube([(side*17.12,1.25,z),(side*17.12,2.5,z)],.075,'teak',7)
        b.tube([(side*17.12,2.44,-13.2),(side*17.12,2.44,16.65)],.072,'teak',7)
    for x in (-15,-8,8,15):
        b.tube([(x,0,17.0),(x,2.6,17.0)],.2,'teak',10)
        b.tube([(x,2.48,17),(x,2.62,17)],.24,'trim',10)
        b.tube([(x-.15,1.39,16),(x+.15,1.39,16)],.035,'metal',6)
    # Dining furniture modeled at human scale and merged with the building.
    def chair(x,z,facing):
        cx,sz=math.cos(facing),math.sin(facing)
        def p(dx,y,dz): return (x+cx*dx+sz*dz,y,z-sz*dx+cx*dz)
        for dx in (-.23,.23):
            for dz in (-.22,.22): b.tube([p(dx,1.25,dz),p(dx,.0+1.82,dz)],.028,'metal',5)
            b.tube([p(dx,1.75,-.23),p(dx,2.45,-.31)],.033,'metal',6)
        for i in range(4):
            b.tube([p(-.25,1.82,-.23+i*.14),p(.25,1.82,-.23+i*.14)],.059,'teak',5)
        for y in (2.08,2.23,2.39): b.tube([p(-.25,y,-.27),p(.25,y,-.27)],.055,'teak',5)
    def person(x,z,angle,shirt):
        c,s=math.cos(angle),math.sin(angle)
        def p(dx,y,dz): return (x+c*dx+s*dz,y,z-s*dx+c*dz)
        b.tube([p(0,1.92,-.04),p(0,2.37,-.07),p(0,2.48,-.06)],[.2,.24,.14],shirt,8)
        b.tube([p(0,2.45,-.05),p(0,2.59,-.05)],.083,'skin',8)
        b.ellipsoid(p(0,2.76,-.04),(.155,.207,.15),'skin')
        b.ellipsoid(p(0,2.9,-.075),(.161,.096,.147),'navy',9,4)
        for dx in (-.13,.13):
            b.tube([p(dx,1.96,0),p(dx,1.87,.38),p(dx,1.31,.43)],[.11,.09,.065],'navy',7)
            b.ellipsoid(p(dx,1.31,.52),(.09,.06,.17),'navy',8,4)
        for dx in (-.25,.25):
            b.tube([p(dx,2.36,-.05),p(dx*1.14,2.08,.12),p(dx*.8,2.09,.38)],[.078,.064,.047],'skin',7)
            b.ellipsoid(p(dx*.8,2.09,.41),(.052,.035,.077),'skin',7,4)
    for row,z in enumerate((7.2,14.1)):
        for i,x in enumerate((-12.2,-6.1,0,6.1,12.2)):
            b.tube([(x,1.25,z),(x,2.03,z)],.065,'metal',8)
            b.tube([(x,2.04,z),(x,2.13,z)],.78,'linen',16)
            for dx in (-.43,.43): b.tube([(x,1.44,z),(x+dx,1.27,z+.33)],.025,'metal',6)
            for side in (-1,1):
                chair(x+side*1.09,z,side*-math.pi/2)
                if (i+row+(side>0))%3!=0: person(x+side*1.09,z,side*-math.pi/2,'linen' if i%2 else 'canvas')
            # Plates, folded napkins and glasses give life to the occupied tables.
            for dx in (-.43,.43):
                b.tube([(x+dx,2.138,z),(x+dx,2.16,z)],.17,'trim',10)
                b.tube([(x+dx,2.14,z+.29),(x+dx,2.31,z+.29)],.045,'glazing',8)
            if row==1 and i in (0,2,4):
                b.tube([(x,1.25,z),(x,4.61,z)],.045,'teak',8)
                verts=[(x,4.76,z)]
                verts.extend((x+math.cos(j*math.tau/10)*2.12,4.26,z+math.sin(j*math.tau/10)*2.12) for j in range(10))
                b.mesh('linen',verts,[(0,j+1,(j+1)%10+1) for j in range(10)])
                for j in range(10):
                    a,c=verts[j+1],verts[(j+1)%10+1]
                    b.mesh('linen',[a,c,(c[0],c[1]-.14,c[2]),(a[0],a[1]-.14,a[2])],[(0,1,2,3)])
                    b.tube([(x,4.69,z),a],.022,'teak',5)
    # Warm lamps under the canopy and planted pots at each corner.
    for x in (-14,-7,0,7,14):
        b.tube([(x,5.87,9.2),(x,5.15,9.2)],.02,'metal',6)
        b.ellipsoid((x,5.08,9.2),(.14,.23,.14),'brass',8,4)
    for x in (-16.15,16.15):
        b.tube([(x,1.25,13.8),(x,1.84,13.8)],[.3,.42],'terracotta',10)
        for j in range(5):
            a=j*math.tau/5
            b.ellipsoid((x+math.cos(a)*.28,1.94+random.random()*.3,13.8+math.sin(a)*.28),(.29,.32,.26),'canvas',8,4)
    return b.finish()


templates=[bridge(),restaurant()]
bpy.ops.object.select_all(action='DESELECT')
for root in templates:
    root.select_set(True)
    for obj in root.children_recursive: obj.select_set(True)
if '--render-only' not in sys.argv:
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,
        export_yup=True,export_normals=True,export_texcoords=True,export_animations=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'landmarks-v1.blend'))
report={'blender':bpy.app.version_string,'asset_bytes':OUT.stat().st_size,'materials':len(M),'templates':{},
        'source':'Original Blender-authored native geometry and supplied image-generated coastal material atlas. No third-party models or images.',
        'axes':'X horizontal, Y up, +Z waterfront face. Both roots at origin; min Y = 0.'}
for root in templates:
    points=[];triangles=0
    for obj in root.children_recursive:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
        points.extend(obj.matrix_world@Vector(p) for p in obj.bound_box)
    lo=[min(p[i] for p in points) for i in range(3)]; hi=[max(p[i] for p in points) for i in range(3)]
    report['templates'][root.name]={'triangles':triangles,'meshes':len(root.children),
        'bounds_min_xyz':[round(lo[0],3),round(lo[2],3),round(-hi[1],3)],
        'bounds_max_xyz':[round(hi[0],3),round(hi[2],3),round(-lo[1],3)],
        'dimensions_xyz':[round(hi[0]-lo[0],3),round(hi[2]-lo[2],3),round(hi[1]-lo[1],3)]}
report['triangles']=sum(x['triangles'] for x in report['templates'].values())
assert report['triangles']<80000,report
assert len(M)<=12
(WORK/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print('LANDMARK_ASSET '+json.dumps(report),flush=True)

if '--export-only' in sys.argv: sys.exit(0)
# Deliberately neutral sunny review stage. Browser appearance needs its own QA.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Florida review sky');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.4,.57,.7,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
bpy.ops.object.light_add(type='SUN',location=xyz((-60,100,90)))
sun=bpy.context.object;sun.data.energy=3;sun.data.angle=.075
sun.rotation_euler=Vector((.55,.65,-1)).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=1200,location=xyz((0,-.08,0)))
ground=bpy.context.object;water=bpy.data.materials.new('Review water');water.diffuse_color=(.02,.21,.23,1)
water.use_nodes=True;water.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.012,.19,.21,1)
water.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.26
ground.data.materials.append(water)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO'
def render(name,location,target,scale):
    camera.location=xyz(location);camera.rotation_euler=(Vector(xyz(target))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=scale;scene.render.filepath=str(WORK/name);bpy.ops.render.render(write_still=True)
for root in templates:
    for other in templates:
        for obj in other.children_recursive: obj.hide_render=other!=root
    if root.name=='BridgeCauseway':
        render('bridge-front.png',(39,40,138),(0,9,0),201)
        render('bridge-tower-detail.png',(48,28,54),(30.7,12,6),34)
    else:
        render('fisheries-front.png',(35,24,58),(0,5,1),47)
        render('fisheries-deck-detail.png',(20,11,36),(0,4,10),36)
for root in templates:
    for obj in root.children_recursive: obj.hide_render=False
templates[1].location=xyz((63,0,25))
render('landmarks-contact.png',(110,62,190),(6,8,6),212)
