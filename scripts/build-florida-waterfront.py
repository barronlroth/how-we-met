"""Author a shared, opaque-material waterfront kit in Blender.

Dimensions use the game's X/right, Y/up, Z/front coordinates in metres. Each
named template stays at the origin in the exported GLB; the contact sheet is a
separate authoring render, never a substitute for a browser screenshot.
"""
import bpy
import bmesh
import json
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'artifacts/florida-waterfront-v1'
OUT = ROOT / 'florida/assets/models/waterfront-v1.glb'
WORK.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(9037)

def xyz(p): return (p[0], -p[2], p[1])
def linear(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

M = {}
for name, color, rough, metallic in [
    ('ivory', 'efe8d5', .68, 0), ('porcelain', 'fff8e5', .48, 0),
    ('sandstone', 'c8ae8c', .82, 0), ('lagoon_glass', '488e9c', .22, .38),
    ('deep_glass', '244959', .24, .32), ('coral_canvas', 'd7785b', .84, 0),
    ('teak', '9c6b45', .81, 0), ('palm_green', '3f6748', .86, 0),
    ('sunlit_leaf', '7d9954', .89, 0), ('bronze', '685548', .43, .55),
    ('pool_water', '63c6bd', .26, .16), ('linen', 'd8d7ba', .87, 0),
]:
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    rgba = tuple(linear(int(color[i:i+2], 16) / 255) for i in (0, 2, 4)) + (1,)
    m.diffuse_color = rgba
    shader = m.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = rgba
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metallic
    M[name] = m


class Building:
    """Accumulate native mesh surfaces, one exported mesh per opaque material."""
    def __init__(self, name):
        self.name = name
        self.parts = {}

    def mesh(self, mat, verts, faces, smooth=False):
        bucket = self.parts.setdefault(mat, [[], [], []])
        offset = len(bucket[0])
        bucket[0].extend(verts)
        bucket[1].extend(tuple(i + offset for i in f) for f in faces)
        bucket[2].extend([smooth] * len(faces))

    def box(self, p, size, mat, bevel=0):
        x, y, z = p; w, h, d = size
        if bevel:
            profile = rounded(w, d, min(bevel * 1.8, min(w, d) / 3), 2)
            self.solid(profile, y-h/2, y+h/2, mat, x, z, bevel)
            return
        verts = [(x+dx*w/2, y+dy*h/2, z+dz*d/2)
                 for dx, dy, dz in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),
                                   (-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
        self.mesh(mat, verts, [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

    def solid(self, profile, low, high, mat, x=0, z=0, bevel=0):
        n = len(profile)
        if bevel:
            b = min(bevel, (high-low)*.32)
            xmax = max(abs(p[0]) for p in profile); zmax = max(abs(p[1]) for p in profile)
            scale_x = max(.01, 1-b/max(xmax,.01)); scale_z = max(.01, 1-b/max(zmax,.01))
            rows = [(low,scale_x,scale_z),(low+b,1,1),(high-b,1,1),(high,scale_x,scale_z)]
        else:
            rows = [(low,1,1),(high,1,1)]
        verts = [(x+px*sx,y,z+pz*sz) for y,sx,sz in rows for px,pz in profile]
        faces = [tuple(reversed(range(n))), tuple(range((len(rows)-1)*n,len(rows)*n))]
        for r in range(len(rows)-1):
            faces.extend((r*n+i,r*n+(i+1)%n,(r+1)*n+(i+1)%n,(r+1)*n+i) for i in range(n))
        self.mesh(mat, verts, faces)

    def ring(self, outer, inner, low, high, mat, x=0, z=0):
        n = len(outer)
        verts = [(x+px,y,z+pz) for y in (low,high) for profile in (outer,inner) for px,pz in profile]
        faces = []
        for i in range(n):
            j = (i+1)%n
            faces.extend([(i,j,2*n+j,2*n+i),(n+j,n+i,3*n+i,3*n+j),
                          (2*n+i,2*n+j,3*n+j,3*n+i),(j,i,n+i,n+j)])
        self.mesh(mat, verts, faces)

    def tube(self, points, radius, mat, sides=6):
        verts = []
        for i, p in enumerate(points):
            p = Vector(p)
            direction = Vector(points[min(i+1,len(points)-1)]) - Vector(points[max(i-1,0)])
            direction.normalize()
            axis = direction.cross(Vector((0,0,1)))
            if axis.length < .001: axis = direction.cross(Vector((1,0,0)))
            axis.normalize(); second = direction.cross(axis).normalized()
            r = radius[i] if isinstance(radius, list) else radius
            for j in range(sides):
                a = j*math.tau/sides
                verts.append(tuple(p + axis*math.cos(a)*r + second*math.sin(a)*r))
        faces = [tuple(reversed(range(sides))), tuple(range((len(points)-1)*sides,len(points)*sides))]
        for row in range(len(points)-1):
            for j in range(sides):
                k = (j+1)%sides
                faces.append((row*sides+j,row*sides+k,(row+1)*sides+k,(row+1)*sides+j))
        self.mesh(mat, verts, faces, True)

    def shrub(self, p, size, mat='palm_green'):
        # A low-poly ellipsoid gives shrubbery actual rounded volume and shade.
        rings, sides = 4, 8
        verts = []
        for i in range(rings+1):
            phi = math.pi*i/rings
            for j in range(sides):
                theta = math.tau*j/sides
                verts.append((p[0]+math.sin(phi)*math.cos(theta)*size[0],
                              p[1]+math.cos(phi)*size[1],p[2]+math.sin(phi)*math.sin(theta)*size[2]))
        faces = []
        for i in range(rings):
            for j in range(sides):
                faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
        self.mesh(mat, verts, faces, True)

    def palm(self, x, z, y=0, height=8, lean=1):
        self.tube([(x,y,z),(x+.15*lean,y+height*.33,z),(x+.55*lean,y+height*.7,z+.25),
                   (x+lean,y+height,z+.55)], [.2,.18,.14,.105], 'teak', 7)
        cx,cy,cz = x+lean,y+height,z+.55
        for i in range(9):
            a = i*math.tau/9 + .12
            length = height*.48*(.9+random.random()*.23)
            dx,dz = math.cos(a),math.sin(a)
            verts = []
            for k in range(5):
                t = k/4
                width = max(.018,math.sin(math.pi*t)*length*.16)
                bend = math.sin(t*math.pi)*length*.21-t*t*length*.22
                px,pz = cx+dx*length*t,cz+dz*length*t
                row=[(px-dz*width,cy+bend,pz+dx*width),
                     (px,cy+bend+.08,pz),(px+dz*width,cy+bend,pz-dx*width)]
                verts.extend(row+[(vx,vy-.025,vz) for vx,vy,vz in row])
            faces=[]
            for k in range(4):
                for j in range(2):
                    faces.extend([(k*6+j,(k+1)*6+j,(k+1)*6+j+1,k*6+j+1),
                                  (k*6+j+4,(k+1)*6+j+4,(k+1)*6+j+3,k*6+j+3)])
                faces.extend([(k*6,k*6+3,(k+1)*6+3,(k+1)*6),
                              (k*6+2,(k+1)*6+2,(k+1)*6+5,k*6+5)])
            faces.extend([(0,1,2,5,4,3),(24,27,28,29,26,25)])
            self.mesh('palm_green' if i%3 else 'sunlit_leaf',verts,faces)

    def pergola(self, x, y, z, w, d):
        for dx in (-w/2,w/2):
            for dz in (-d/2,d/2): self.box((x+dx,y+1.5,z+dz),(.19,3,.19),'teak')
        for dz in (-d/2,d/2): self.box((x,y+3,z+dz),(w+.5,.22,.23),'teak')
        count = math.ceil(w/.65)
        for i in range(count+1): self.box((x-w/2+w*i/count,y+3.17,z),(.13,.17,d+.6),'linen')

    def chair(self, x, y, z, rotate=0):
        # Sunbed with a raised pillow and one readable reclined back.
        self.box((x,y+.25,z),(.82,.16,1.85),'teak')
        self.box((x,y+.39,z),(.76,.18,1.65),'linen',.05)
        self.box((x,y+.52,z-.58),(.69,.15,.45),'porcelain',.04)

    def parasol(self, x, y, z, r=1.5, mat='coral_canvas'):
        self.tube([(x,y,z),(x,y+2.8,z)],.045,'bronze')
        verts=[(x,y+3.05,z)]+[(x+math.cos(i*math.tau/8)*r,y+2.65,z+math.sin(i*math.tau/8)*r) for i in range(8)]
        self.mesh(mat,verts,[(0,i+1,(i+1)%8+1) for i in range(8)])
        for i in range(8):
            a,b=verts[i+1],verts[(i+1)%8+1]
            self.mesh(mat,[a,b,(b[0],b[1]-.19,b[2]),(a[0],a[1]-.19,a[2])],[(0,1,2,3)])

    def person(self, x, y, z, shirt):
        self.tube([(x,y+.35,z),(x,y+1.15,z)], [.22,.27], shirt, 6)
        self.shrub((x,y+1.42,z),(.2,.24,.2),'sandstone')
        self.tube([(x-.13,y,z),(x-.12,y+.45,z)],.075,'deep_glass',5)
        self.tube([(x+.13,y,z),(x+.12,y+.45,z)],.075,'deep_glass',5)

    def finish(self):
        root = bpy.data.objects.new(self.name,None)
        bpy.context.collection.objects.link(root)
        for mat,(verts,faces,smooth) in self.parts.items():
            mesh = bpy.data.meshes.new(self.name+'_'+mat)
            mesh.from_pydata([xyz(p) for p in verts],[],faces)
            mesh.update()
            bm = bmesh.new(); bm.from_mesh(mesh)
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
            # Polygon topology is preserved by recalc_face_normals.
            for face,flag in zip(mesh.polygons,smooth): face.use_smooth=flag
            obj=bpy.data.objects.new(self.name+'_'+mat,mesh)
            bpy.context.collection.objects.link(obj); obj.parent=root
            obj.data.materials.append(M[mat])
        return root


def rounded(w,d,r,segments=3):
    points=[]
    for cx,cz,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),
                        (-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for i in range(segments+1):
            angle=math.radians(start+i*90/segments)
            points.append((cx+r*math.cos(angle),cz+r*math.sin(angle)))
    return points


def residence():
    b=Building('WaterfrontResidence')
    b.box((0,.3,0),(36,.6,28),'sandstone',.15)
    b.box((0,.67,1),(34,.2,25),'ivory',.05)
    # Three staggered volumes leave legible deep shadows and exposed terraces.
    b.box((-6.2,4.3,-4),(18,7.3,13),'ivory',.18)
    b.box((8.5,3,-2),(11.5,4.8,15),'porcelain',.14)
    b.box((-3,9,-5),(13,3,10),'porcelain',.16)
    b.box((-6.1,3.5,2.62),(16.4,5, .18),'deep_glass')
    b.box((8.5,3.1,5.58),(10.2,3.9,.15),'lagoon_glass')
    b.box((-3,9,.09),(11.6,2.1,.15),'deep_glass')
    for x in (-13,-10.5,-8,-5.5,-3,-.5): b.box((x,3.5,2.78),(.12,5.2,.19),'bronze')
    for x in (4.3,6.4,8.5,10.6,12.7): b.box((x,3.1,5.72),(.09,4.0,.2),'porcelain')
    b.box((-6,6.18,3.7),(20,.42,5.5),'porcelain',.12)
    b.box((-6,6.85,6.33),(19,.74,.14),'lagoon_glass')
    b.box((-6,7.28,6.38),(19,.12,.18),'porcelain')
    for x in (-15.3,3.3): b.box((x,3.48,5.8),(.4,5.0,.45),'porcelain')
    # Open roof lounge, pool surround and a smaller upper terrace.
    b.box((8.5,5.49,-2),(12.5,.28,16),'porcelain',.07)
    b.pergola(8.2,5.7,-5,7.1,5.2)
    b.box((8.2,6.13,1.5),(7.4,.7,2.2),'linen',.12)
    b.box((-3,10.65,-5),(14,.32,11),'porcelain',.11)
    b.box((-3,11.17,-9.9),(13,1,.22),'ivory')
    # Cladding ribs on the solid side volumes break up otherwise blank walls.
    for z in range(-9,3): b.box((-15.27,3.25,z),(.19,4.4,.095),'sandstone')
    b.box((4.4,.83,9.1),(13.8,.18,6.4),'porcelain',.16)
    b.box((4.4,.96,9.1),(12.2,.12,4.9),'pool_water',.12)
    b.box((4.4,1.035,7.28),(11.6,.025,.055),'linen')
    for x in (-7,-9,-11): b.chair(x,.8,9.1)
    b.parasol(-9,.8,8.4,2)
    for x,z in [(-15,8),(-15,-9),(15,8),(15,-8)]:
        b.box((x,1,z),(2.2,.65,2.2),'porcelain',.09)
        b.palm(x,z,1.25,8 if z>0 else 10,.6 if x<0 else -.6)
    for side in (-1,1):
        b.box((side*17.4,1.08,0),(.5,1.05,27),'ivory')
        for z in (-10,-7,-4,0,4): b.shrub((side*16.2,1.5,z),(1,.85,1.25))
    for x in (-13,-10,10,13): b.shrub((x,1.15,12.6),(1.5,.6,.65),'sunlit_leaf')
    return b.finish()


def hotel():
    b=Building('MarinaHotel')
    b.box((0,.55,0),(42,1.1,34),'sandstone',.15)
    b.solid(rounded(39,29,5),1,6.5,'porcelain',0,-1,.16)
    b.solid(rounded(37.9,27.9,4.5),1.5,5.8,'deep_glass',0,-1)
    for x in (-16,-12,-8,-4,0,4,8,12,16): b.box((x,3.4,12.9),(.24,4.8,.35),'ivory')
    b.solid(rounded(40,31,5),6.15,6.75,'porcelain',0,-1,.13)
    b.solid(rounded(31,17,6),7,82.6,'lagoon_glass',0,-3)
    # The ribbons widen subtly toward the sun-facing front and step back at the crown.
    for i in range(24):
        y=7+i*3.1
        shrink=max(0,i-18)*.55
        w,d=35.2-shrink,22-shrink*.32
        outer=rounded(w,d,6); inner=rounded(w-.27,d-.27,5.85)
        b.solid(outer,y,y+.29,'porcelain',0,-2.5,.065)
        b.ring(outer,inner,y+.32,y+.96,'lagoon_glass',0,-2.5)
        b.ring(outer,inner,y+.95,y+1.08,'porcelain',0,-2.5)
        # Window piers are recessed behind the balconies, visible in oblique views.
        for x in (-10,-5,0,5,10): b.box((x,y+1.73,5.55),(.13,2.6,.17),'ivory')
        for x in (-15.48,15.48):
            for z in (-7,-3,1): b.box((x,y+1.73,z),(.16,2.6,.12),'ivory')
    for x in (-9,9): b.box((x,44,-11.63),(1.6,74,1.0),'ivory',.08)
    b.solid(rounded(24,15,5),81.6,84.4,'ivory',0,-3,.1)
    b.solid(rounded(22,13,4),84.4,86.6,'deep_glass',0,-3)
    b.solid(rounded(26,17,5),86.7,87.1,'porcelain',0,-3,.07)
    for x in (-9,-6,-3,0,3,6,9): b.box((x,88.2,-3),(.19,2.3,15),'ivory')
    # Podium amenities read from the water and from ramps.
    b.box((0,6.96,10),(16,.16,5.3),'porcelain',.12)
    b.box((0,7.07,10),(14.8,.1,4.1),'pool_water',.1)
    for x in (-12,-9,9,12): b.chair(x,6.8,10.2)
    for x in (-16.2,16.2): b.palm(x,9,6.75,6.8,-.6 if x>0 else .6)
    b.pergola(0,6.8,-13,11,3)
    for x in (-18.7,18.7):
        for z in (-11,-5,1):
            b.box((x,7,z),(1.1,.7,2.7),'ivory',.06)
            b.shrub((x,7.55,z),(.66,.6,1.2),'sunlit_leaf')
    return b.finish()


def skyline():
    b=Building('SkylineTower')
    b.box((0,.45,0),(29,.9,25),'sandstone',.12)
    b.solid(rounded(26,22,3),.9,6.2,'ivory',0,0,.12)
    b.solid(rounded(24,20,3),1.5,5.6,'deep_glass')
    for x in (-11,-6,0,6,11): b.box((x,3.1,10.1),(.22,4.7,.22),'porcelain')
    b.solid(rounded(27,23,3),6.0,6.4,'porcelain')
    for i in range(27):
        y=6.5+i*3.4
        stage=0 if i<18 else 1 if i<23 else 2
        width=24-stage*4; depth=18-stage*2.6
        b.solid(rounded(width-1,depth-1,3),y+.3,y+3.25,'deep_glass',0,-stage*.5)
        b.solid(rounded(width,depth,3),y,y+.3,'ivory',0,-stage*.5,.045)
        # Alternating inset blue panels and light balcony edges make a ribbed silhouette.
        b.box((0,y+1.25,depth/2-stage*.5-.18),(width-5,.7,.16),'lagoon_glass')
        for x in (-width*.31,0,width*.31): b.box((x,y+1.8,depth/2-stage*.5+.04),(.2,2.95,.22),'porcelain')
    for x in (-10.7,10.7): b.box((x,35,-8.1),(1.3,58,1.8),'porcelain',.075)
    b.solid(rounded(16,13,3),98.3,101,'ivory',0,-1,.1)
    b.solid(rounded(13,10,2),101,103.8,'lagoon_glass',0,-1)
    b.box((0,105,-1),(1.3,2.4,9),'porcelain',.05)
    for x in (-11,11):
        b.palm(x,9,.9,6.6,.3 if x<0 else-.3)
        b.shrub((x,1.5,-7),(1.3,.7,2),'sunlit_leaf')
    return b.finish()


def club():
    b=Building('WaterfrontClub')
    b.box((0,.55,0),(32,1.1,26),'sandstone',.13)
    b.box((0,1.18,2),(31,.16,21),'teak')
    # Teak board ends and low front steps survive oblique race-camera angles.
    for x in range(-15,16): b.box((x,1.285,2),(.035,.016,21),'sandstone')
    for i in range(3): b.box((0,.22+i*.24,13+i*.3),(9,.28,.58),'ivory',.055)
    b.box((0,3.73,-5),(26,5,11.5),'ivory',.15)
    b.box((0,4,.92),(24,3.6,.15),'deep_glass')
    for x in range(-11,12,3): b.box((x,3.9,1.15),(.2,4,.23),'bronze')
    b.box((0,6.5,-5),(28,.44,13.5),'porcelain',.13)
    # Flat roof terrace with a shade canopy and a genuine pergola over the dining deck.
    b.pergola(-6,1.3,6,12.8,6)
    for x in (-12.4,-9.2,-6,-2.8,.4): b.box((x,4.29,6),(2.5,.065,6),'coral_canvas')
    b.pergola(7,6.78,-5,9,8)
    for x in (-11,-8,-5,-2):
        b.box((x,7.17,-7),(2.3,.68,2),'linen',.09)
    b.box((0,7.18,1.57),(26,.76,.13),'lagoon_glass')
    b.box((0,7.61,1.6),(26,.12,.16),'porcelain')
    # Bar: terracotta slat front, cream counter and staggered bottles/glassware.
    b.box((7.4,2.12,1.4),(8.7,1.6,1.35),'coral_canvas',.06)
    for x in range(4,12): b.box((x,2.11,2.1),(.085,1.55,.07),'teak')
    b.box((7.4,3,1.55),(9.1,.17,1.65),'porcelain',.06)
    for i in range(10): b.tube([(3.6+i*.73,3.09,1.4),(3.6+i*.73,3.47+(i%3)*.13,1.4)],.075,'lagoon_glass',6)
    for x in (-10,-5,0,7,12):
        z=7.5 if x<2 else 8.5
        b.tube([(x,1.3,z),(x,2.18,z)],.08,'bronze')
        b.solid(rounded(1.9,1.9,.35,2),2.17,2.3,'linen',x,z)
        for dx,dz in [(-1.25,0),(1.25,0),(0,1.25)]:
            b.box((x+dx,1.8,z+dz),(.64,.14,.64),'teak')
            b.box((x+dx,2.05,z+dz-.28),(.64,.56,.1),'teak')
        if x>2: b.parasol(x,1.3,z,2.2,'linen')
    for i,(x,z) in enumerate([(-11,6),(-4,9),(1,7),(5,3),(10,7),(11,2),(-9,-5),(-6,-8),(2,-6)]):
        b.person(x,1.3 if z>0 else 6.75,z,'coral_canvas' if i%2 else 'linen')
    for x in (-14.5,14.5):
        for z in (-9,9):
            b.box((x,1.55,z),(2,.7,2),'porcelain',.1)
            b.palm(x,z,1.9,8.3,-.4 if x>0 else .4)
        for z in (-5,-2,2,5):
            b.box((x,1.55,z),(1.4,.7,2.4),'ivory',.06)
            b.shrub((x,2.1,z),(.7,.65,1.05),'sunlit_leaf')
    # A dimensional sunburst medallion acts as an architectural sign, without raster text.
    b.tube([(0,8.15,-.15),(0,8.15,.1)],1.2,'coral_canvas',20)
    b.tube([(0,8.15,.1),(0,8.15,.18)],.83,'linen',20)
    for i in range(12):
        a=i*math.tau/12
        b.tube([(math.cos(a)*1.3,8.15+math.sin(a)*1.3,.08),
                (math.cos(a)*1.65,8.15+math.sin(a)*1.65,.08)],.04,'bronze',5)
    return b.finish()


def skyline_far():
    b=Building('SkylineFar')
    b.box((0,2,0),(30,4,25),'ivory')
    b.box((0,38,-1),(21,68,17),'lagoon_glass')
    for i in range(17):
        b.box((0,5+i*4,-1),(23,.38,19),'porcelain')
    b.box((-6,37,-9.8),(1.8,65,.65),'porcelain')
    b.box((6,37,-9.8),(1.8,65,.65),'porcelain')
    b.box((0,74,-1),(17,4,13),'ivory')
    b.box((0,77,-1),(12,2,10),'lagoon_glass')
    b.box((0,78.5,-1),(14,1,12),'porcelain')
    return b.finish()


def canopy_cluster():
    b=Building('CanopyCluster')
    for i,(x,y,z,sx,sy,sz) in enumerate([(-9,8,-3,6,5.5,6),(0,9,-5,7,5,6),
                                       (9,7,-2,6,4.5,7),(-8,6.5,5,6,4,6),
                                       (1,8,5,7,5,7),(8,6,6,5.5,4,5.5),
                                       (-2,6,-8,5.5,3.6,4.5),(0,4.8,0,10,4.7,8)]):
        b.shrub((x,y,z),(sx,sy,sz),'sunlit_leaf' if i%3==0 else 'palm_green')
    for x,z in [(-8,0),(1,-3),(9,2)]: b.box((x,3.5,z),(.7,7,.7),'teak')
    return b.finish()


templates=[residence(),hotel(),skyline(),club(),skyline_far(),canopy_cluster()]
bpy.ops.object.select_all(action='DESELECT')
for root in templates:
    root.select_set(True)
    for obj in root.children_recursive: obj.select_set(True)
if '--render-only' not in sys.argv:
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,
                              export_normals=True,export_texcoords=False,export_animations=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'waterfront-v1.blend'))
report={'blender':bpy.app.version_string,'asset_bytes':OUT.stat().st_size,
        'materials':len(M),'templates':{},'source':'Original Blender-authored native geometry; opaque shared PBR materials; no textures.'}
for root in templates:
    points=[];triangles=0
    for obj in root.children_recursive:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
        points.extend(obj.matrix_world@Vector(p) for p in obj.bound_box)
    lo=[min(p[i] for p in points) for i in range(3)]
    hi=[max(p[i] for p in points) for i in range(3)]
    report['templates'][root.name]={'triangles':triangles,'meshes':len(root.children),
                                  'dimensions_xyz':[round(hi[0]-lo[0],3),round(hi[2]-lo[2],3),round(hi[1]-lo[1],3)]}
report['triangles']=sum(x['triangles'] for x in report['templates'].values())
(WORK/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print('WATERFRONT_ASSET '+json.dumps(report),flush=True)

# Shared sunny authoring scene. Exported building origins are unaffected.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Clear humid Florida sky');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.36,.54,.66,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55
bpy.ops.object.light_add(type='SUN',location=xyz((-60,100,50)))
sun=bpy.context.object;sun.data.energy=3;sun.data.angle=.12
sun.rotation_euler=Vector((.6,.45,-1)).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=xyz((-30,80,80)))
fill=bpy.context.object;fill.data.energy=45000;fill.data.size=80
fill.rotation_euler=(Vector(xyz((0,15,0)))-fill.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=2000,location=xyz((0,-.07,0)))
ground=bpy.context.object
ground.data.materials.append(M['pool_water'])
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera
camera.data.type='ORTHO'
for i,root in enumerate(templates[:4]):
    for other in templates:
        for obj in other.children_recursive: obj.hide_render=other!=root
    height=report['templates'][root.name]['dimensions_xyz'][1]
    if height>30:
        camera.location=xyz((95,height*.87,130));target=(0,height*.45,0)
        camera.data.ortho_scale=height*1.8
    else:
        camera.location=xyz((42,33,52));target=(0,4,0)
        camera.data.ortho_scale=46
    camera.rotation_euler=(Vector(xyz(target))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(WORK/(root.name+'.png'))
    bpy.ops.render.render(write_still=True)

for root in templates:
    for obj in root.children_recursive: obj.hide_render=root not in templates[:4]
templates[0].location=xyz((-24,0,20));templates[1].location=xyz((-28,0,-28))
templates[2].location=xyz((21,0,-28));templates[3].location=xyz((23,0,20))
camera.location=xyz((160,115,190));target=(0,44,-2)
camera.rotation_euler=(Vector(xyz(target))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=195
scene.render.filepath=str(WORK/'waterfront-kit.png')
bpy.ops.render.render(write_still=True)
