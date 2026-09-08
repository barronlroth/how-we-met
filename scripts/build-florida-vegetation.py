"""Original Florida foliage kit: curved palms and layered leaf-card canopies.

Run scripts/blender-headless.sh --python scripts/build-florida-vegetation.py.
The shared authored RGBA atlas is florida/assets/textures/tropical-foliage-v1.png. Atlas
quadrants, viewed as an image: royal palm / broadleaf above hedge / coconut.
All sources use metres and game Y-up; glTF roots are grounded at y=0. Source
.blend, triangle report, and contact-sheet render remain outside public assets.
"""
import bpy
import json
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'artifacts/florida-vegetation-v1'
OUT = ROOT / 'florida/assets/models/vegetation-v1.glb'
ATLAS = ROOT / 'florida/assets/textures/tropical-foliage-v1.png'
WORK.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
R = random.Random(9172026)

def xyz(p): return (p[0], -p[2], p[1])
def linear(v): return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

def material(name, rgb, roughness=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    shader = m.node_tree.nodes['Principled BSDF']
    color = tuple(linear(c) for c in rgb) + (1,)
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Roughness'].default_value = roughness
    m.diffuse_color = color
    m.use_backface_culling = True
    return m

M = {
    'FloridaBark': material('FloridaBark', (.58, .51, .39)),
    'PalmCrownshaft': material('PalmCrownshaft', (.39, .43, .21)),
    'LeafAtlas': material('LeafAtlas', (1, 1, 1), .82),
}
# Vertex colours vary each branch/card, including warm mature fronds and shaded
# inner leaves, without multiplying material or texture count in the browser.
for key, m in M.items():
    nodes = m.node_tree.nodes; links = m.node_tree.links
    vertex = nodes.new('ShaderNodeVertexColor'); vertex.layer_name = 'Color'; vertex.name = 'FoliageVertexColor'
    shader = nodes['Principled BSDF']
    if key != 'LeafAtlas':
        links.new(vertex.outputs['Color'], shader.inputs['Base Color'])

leaf = M['LeafAtlas']
leaf.use_backface_culling = False
leaf.surface_render_method = 'DITHERED'
leaf.alpha_threshold = .45
leaf['gltf_alpha_mode'] = 'MASK'
leaf['gltf_alpha_cutoff'] = .45
if not ATLAS.exists():
    raise FileNotFoundError(f'Expected generated RGBA leaf atlas: {ATLAS}')
image = bpy.data.images.load(str(ATLAS), check_existing=True)
image.colorspace_settings.name = 'sRGB'
image.pack()
nodes = leaf.node_tree.nodes; links = leaf.node_tree.links
tex = nodes.new('ShaderNodeTexImage'); tex.image = image
tex.interpolation = 'Linear'; tex.extension = 'EXTEND'
shader = nodes['Principled BSDF']
multiply = nodes.new('ShaderNodeMix'); multiply.data_type = 'RGBA'; multiply.blend_type = 'MULTIPLY'; multiply.inputs[0].default_value = 1
links.new(tex.outputs['Color'], multiply.inputs[6])
links.new(nodes.get('FoliageVertexColor').outputs['Color'], multiply.inputs[7])
links.new(multiply.outputs[2], shader.inputs['Base Color'])
clip = nodes.new('ShaderNodeMath'); clip.operation = 'GREATER_THAN'; clip.inputs[1].default_value = .45
links.new(tex.outputs['Alpha'], clip.inputs[0]); links.new(clip.outputs[0], shader.inputs['Alpha'])

# Blender UVs have origin bottom-left. Keep a small border inside each quadrant
# so mipmapping never samples a neighbouring species.
QUADS = {'palm': (0, .5), 'broadleaf': (.5, .5), 'hedge': (0, 0), 'coconut': (.5, 0)}
def uv_at(kind, u, v):
    x, y = QUADS[kind]; pad = .004
    return (x + pad + u*(.5-2*pad), y + pad + v*(.5-2*pad))

def tone(rgb): return tuple(linear(c) for c in rgb) + (1,)

class Plant:
    def __init__(self, name):
        self.name = name; self.parts = {}

    def mesh(self, mat, vertices, faces, uv=None, colors=None, smooth=True):
        bucket = self.parts.setdefault(mat, [[], [], [], [], []])
        offset = len(bucket[0]); bucket[0].extend(vertices)
        bucket[1].extend(tuple(offset+i for i in f) for f in faces)
        bucket[2].extend(uv or [(0, 0)]*len(vertices))
        bucket[3].extend(colors or [tone((.58, .52, .43))]*len(vertices))
        bucket[4].extend([smooth]*len(faces))

    def tube(self, points, radii, mat='FloridaBark', sides=7, ribbed=False, color=(.58, .52, .43)):
        vertices=[]; colors=[]
        for i, p in enumerate(points):
            direction = (Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])).normalized()
            axis = direction.cross(Vector((0, 0, 1)))
            if axis.length < .001: axis = direction.cross(Vector((1, 0, 0)))
            axis.normalize(); second = direction.cross(axis).normalized()
            radius = radii[i] if isinstance(radii, list) else radii
            for j in range(sides):
                a = math.tau*j/sides
                amount = 1 + (.015*math.sin(j*2.7+i) if ribbed else 0)
                vertices.append(tuple(Vector(p)+radius*amount*(axis*math.cos(a)+second*math.sin(a))))
                shade = (.82 if i % 3 == 0 else 1) if ribbed else 1
                shade *= .92 + .08*math.cos(a-.6)
                colors.append(tone(tuple(c*shade for c in color)))
        faces=[tuple(reversed(range(sides))), tuple(range((len(points)-1)*sides,len(points)*sides))]
        for i in range(len(points)-1):
            for j in range(sides):
                k=(j+1)%sides
                faces.append((i*sides+j,i*sides+k,(i+1)*sides+k,(i+1)*sides+j))
        self.mesh(mat, vertices, faces, colors=colors)

    def leaf_card(self, center, width, length, normal, angle, kind='broadleaf', tint=(1,1,1), bend=.1):
        normal = Vector(normal).normalized()
        side = normal.cross(Vector((0,1,0)))
        if side.length < .01: side = normal.cross(Vector((0,0,1)))
        side.normalize(); up=side.cross(normal).normalized()
        side, up = side*math.cos(angle)+up*math.sin(angle), up*math.cos(angle)-side*math.sin(angle)
        vertices=[]; uv=[]; colors=[]
        for row in range(3):
            v = row/2
            for col in range(3):
                u=col/2
                p=Vector(center)+side*((u-.5)*width)+up*((v-.5)*length)+normal*((1-(u-.5)**2*4)*bend*math.sin(v*math.pi))
                vertices.append(tuple(p)); uv.append(uv_at(kind,u,v)); colors.append(tone(tint))
        faces=[]
        for row in range(2):
            for col in range(2):
                a=row*3+col; faces.append((a,a+1,a+4,a+3))
        self.mesh('LeafAtlas',vertices,faces,uv,colors)

    def finish(self):
        root=bpy.data.objects.new(self.name,None); bpy.context.collection.objects.link(root)
        for mat,(vertices,faces,uv,colors,smooth) in self.parts.items():
            mesh=bpy.data.meshes.new(self.name+'_'+mat)
            mesh.from_pydata([xyz((p[0], max(0, p[1]), p[2])) for p in vertices],[],faces); mesh.update()
            uv_layer=mesh.uv_layers.new(name='UVMap')
            color_layer=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
            for i,col in enumerate(colors): color_layer.data[i].color=col
            for poly,flag in zip(mesh.polygons,smooth):
                poly.use_smooth=flag
                for li in poly.loop_indices: uv_layer.data[li].uv=uv[mesh.loops[li].vertex_index]
            obj=bpy.data.objects.new(self.name+'_'+mat,mesh)
            bpy.context.collection.objects.link(obj); obj.parent=root; obj.data.materials.append(M[mat])
        return root


def palm(name, height, lean, coconut=False):
    plant=Plant(name)
    # Keep additional sculpting randomness independent of the legacy stream:
    # changing palms must not rearrange the four other vegetation templates.
    detail=random.Random(49217 if coconut else 73031)
    rows=65 if coconut else 72
    points=[]; radii=[]
    for i in range(rows):
        t=i/(rows-1)
        points.append((lean*t*t, height*t, .32*math.sin(t*2.6)))
        swelling=.095*math.exp(-((t-.3)/.2)**2) if not coconut else 0
        ridges=(.012 if i%3==0 else 0)
        radii.append(.30*(1-.48*t)+swelling+ridges+.12*math.exp(-t*22))
    plant.tube(points,radii,sides=10,ribbed=True,color=(.65,.61,.51) if not coconut else (.52,.47,.36))
    crown=Vector(points[-1]); crown.y+=.7
    plant.tube([points[-4],tuple(crown-Vector((0,.1,0))),tuple(crown+Vector((0,.55,0)))],[.2,.23,.13],mat='PalmCrownshaft',sides=10,color=(.45,.49,.25))
    # Keep exactly the six legacy RNG draws for each of the original 26
    # fronds. All crown design below uses its own stream, so other templates
    # remain byte-for-byte identical when palm leaf construction changes.
    for _ in range(26 * 6):
        R.random()

    # Four depth layers: hanging mature skirt, broad lateral fan, sunlit upper
    # arcs, and short asymmetrical emerging fronds. The upper interior is not
    # another scaled copy of the outer ring.
    layers=[(9,5.50,1.36,2.65),(8,5.02,2.35,1.52),
            (5,3.70,3.24,.68),(4,2.34,3.42,.24)]
    for ring,(count,reach,rise,drop) in enumerate(layers):
        phase=(.07,.49,.13,.80)[ring]
        for i in range(count):
            angle=i*math.tau/count+phase+detail.uniform(-.25,.25)
            direction=Vector((math.cos(angle),0,math.sin(angle)))
            side=Vector((-math.sin(angle),0,math.cos(angle)))
            # Alternating lengths break the level umbrella edge without
            # changing the grounded tree height or the established envelope.
            length=reach*detail.uniform(.77,1.14)*(1.1 if coconut else 1)
            start=crown+direction*detail.uniform(.02,.18)+Vector((0,ring*.13+detail.uniform(-.18,.18),0))
            span=(3.05 if coconut else 2.72)*detail.uniform(.87,1.15)
            if ring==3:
                span*=detail.uniform(.66,.84)
            arch=rise*detail.uniform(.89,1.11)
            fall=drop*detail.uniform(.90,1.19)
            sweep=detail.uniform(-.74,.74)*(1.15 if coconut else 1)
            roll=detail.uniform(-.30,.30)
            droop=detail.uniform(.24,.46) if ring>0 else detail.uniform(.40,.65)
            left_scale=detail.uniform(.76,1.16)
            right_scale=detail.uniform(.76,1.16)
            sunlit=(ring==2 or (ring==1 and i in (0,3,6)) or (ring==3 and i%2==0))
            tint=(1.0,.99,.49) if sunlit else (detail.uniform(.85,.98),detail.uniform(.88,1),detail.uniform(.63,.83))
            if ring==0:
                tint=(tint[0]*.94,tint[1]*.96,tint[2]*.87)

            def spine(t):
                return start+direction*(length*t)+side*(sweep*math.sin(t*math.pi)*t)+Vector((0,arch*math.sin(t*math.pi*.85)-fall*t*t,0))

            def midrib(t):
                return (.32+.35*t*t) if coconut else .50

            def surface(t,u):
                cross=(u-midrib(t))*span
                cross*=left_scale if cross<0 else right_scale
                sag=abs(cross)**1.38*droop*(.34+.66*math.sin(t*math.pi))
                return spine(t)+side*cross-direction*(abs(cross)*(.12+.18*t))+Vector((0,-sag+cross*roll*math.sin(t*math.pi),0))

            vertices=[];uv=[];colors=[];faces=[]
            kind='coconut' if coconut else 'palm'

            def vertex(t,u,pos,color):
                index=len(vertices)
                vertices.append(tuple(pos));uv.append(uv_at(kind,u,t));colors.append(tone(color))
                return index

            # The narrow unbroken atlas midrib holds the disconnected leaflet
            # groups together. Every UV retains its authored atlas registration.
            for k in range(14):
                t=k/13
                for offset in (-.014,.014):
                    u=midrib(t)+offset
                    vertex(t,u,surface(t,u),tint)
                if k:
                    a=(k-1)*2;faces.append((a,a+1,a+3,a+2))

            # Curved cuts follow leaflet direction in the authored atlas image.
            # Each side is split into 13 unequal groups, with cuts sweeping up
            # toward the tips rather than slicing rectangular cross-frond bars.
            # Groups keep their roots registered while independent tip length,
            # twist, and sag open irregular gaps and expose actual crown depth.
            for half in range(2):
                sign=1 if half else -1
                divisions=[0]+[k/13+detail.uniform(-.017,.017) for k in range(1,13)]+[1]
                for group,(t0,t1) in enumerate(zip(divisions,divisions[1:])):
                    tip_scale=detail.uniform(.90,1.10)
                    tip_lift=detail.uniform(-.17,.14)
                    tip_sweep=detail.uniform(-.10,.10)
                    opening=detail.uniform(.0005,.003) if 1<group<11 else 0
                    shade=detail.uniform(.91,1.0)
                    # A few short groups interrupt the perimeter of mature
                    # fronds; retain an intact central petiole, no missing cards.
                    if ring<2 and group in ((i*3+half+2)%10+1,(i*7+half+5)%11+1):
                        tip_scale*=.90
                        opening*=1.5
                    rows=[]
                    for row,base_t in enumerate((t0,t1)):
                        row_indices=[]
                        for outward in (0,.48,1):
                            edge_t=base_t+(opening if row==0 else -opening)*outward**4
                            # Leaflets in both palm quadrants climb diagonally
                            # from their stem. Their UV boundaries share this
                            # sweep so the cuts are visually hidden in the veins.
                            t=edge_t+.18*math.sin(edge_t*math.pi)*outward
                            u=midrib(t)+sign*(.5 if not coconut else (1-midrib(t) if half else midrib(t)))*outward
                            u=min(1,max(0,u))
                            center=surface(t,midrib(t))
                            pos=surface(t,u)
                            offset=pos-center
                            # Tip movement vanishes at the rachis and grows
                            # smoothly outwards, producing scalloped side depth.
                            free_tip=max(0,(outward-.45)/.55)
                            pos=center+offset*(1+(tip_scale-1)*free_tip)+Vector((0,tip_lift*free_tip*free_tip,0))+direction*(tip_sweep*free_tip*free_tip)
                            col=tuple(min(1,c*shade*(.98+.02*base_t)) for c in tint)
                            row_indices.append(vertex(t,u,pos,col))
                        rows.append(row_indices)
                    for j in range(2):
                        face=(rows[0][j],rows[1][j],rows[1][j+1],rows[0][j+1])
                        faces.append(face if half else tuple(reversed(face)))
            plant.mesh('LeafAtlas',vertices,faces,uv,colors)
            rachis=[tuple(spine(t)) for t in (0,.07,.14)]
            plant.tube(rachis,[.044,.029,.008],mat='PalmCrownshaft',sides=4,color=(.45,.47,.23))
    return plant.finish()


def branch_crown(plant, center, radii, count, kind, scale=1, shade=1):
    for i in range(count):
        azimuth=R.random()*math.tau
        y=R.uniform(-.8,1); radial=math.sqrt(1-y*y)
        normal=Vector((math.cos(azimuth)*radial,y,math.sin(azimuth)*radial))
        # Interior cards close gaps, perimeter cards provide a broken silhouette.
        fill=R.uniform(.6,1) if i%4 else R.uniform(.15,.7)
        position=Vector(center)+Vector((normal.x*radii[0],normal.y*radii[1],normal.z*radii[2]))*fill
        card_normal=(normal+Vector((0,.65,0))).normalized()
        tint=(R.uniform(.77,.97)*shade,R.uniform(.85,1)*shade,R.uniform(.70,.90)*shade)
        plant.leaf_card(position, R.uniform(1.1,1.8)*scale,R.uniform(1.4,2.2)*scale,card_normal,R.uniform(-math.pi,math.pi),kind,tint,bend=.12*scale)


def hammock():
    plant=Plant('HammockTree')
    plant.tube([(0,0,0),(.15,.5,.05),(-.15,2,.1),(.2,3.8,0),(.6,5.2,.2)],[.6,.49,.40,.33,.20],sides=9,color=(.44,.43,.34))
    # Flared root buttresses and visible crooked forks, rather than a canopy shell.
    for i in range(6):
        a=i*math.tau/6
        plant.tube([(math.cos(a)*1.08,0,math.sin(a)*1.08),(.13,.8,.03),(.03,1.4,0)],[.10,.16,.08],sides=5,color=(.43,.41,.32))
    for i in range(8):
        a=i*math.tau/8+R.uniform(-.2,.2)
        reach=R.uniform(3.1,4.7); y=R.uniform(6.6,8.4)
        end=Vector((math.cos(a)*reach,y,math.sin(a)*reach))
        start=Vector((.2,R.uniform(3.1,4.9),.1))
        bend=start.lerp(end,.48)+Vector((0,.3,0))
        plant.tube([tuple(start),tuple(bend),tuple(end)],[.20,.135,.055],sides=7,color=(.44,.43,.34))
        for j in range(3):
            angle=a+(j-1)*.8
            tip=end+Vector((math.cos(angle)*R.uniform(.6,1.5),R.uniform(.25,1.4),math.sin(angle)*R.uniform(.6,1.5)))
            plant.tube([tuple(end),tuple(tip)],[.05,.011],sides=4,color=(.45,.44,.31))
            branch_crown(plant,tip,(1.45,1.25,1.45),14,'broadleaf',shade=.91 if j==0 else 1)
    return plant.finish()


def sea_grape():
    plant=Plant('SeaGrapeTree')
    for i in range(4):
        a=i*2.15
        start=(math.cos(a)*.35,0,math.sin(a)*.35)
        end=Vector((math.cos(a)*2.3,4.1+R.uniform(-.4,.9),math.sin(a)*2.3))
        plant.tube([start,(start[0]*2,1.5,start[2]*2),tuple(end)],[.21,.16,.06],sides=7,color=(.47,.43,.33))
        for j in range(3):
            angle=a+(j-1)*.8
            tip=end+Vector((math.cos(angle)*1.25,R.uniform(.15,1.25),math.sin(angle)*1.25))
            plant.tube([tuple(end),tuple(tip)],[.052,.012],sides=4,color=(.47,.43,.33))
            branch_crown(plant,tip,(1.5,1.45,1.5),24,'broadleaf',scale=1.08)
    return plant.finish()


def hedge():
    plant=Plant('HedgeCluster')
    for i in range(5):
        x=(i-2)*1.0
        plant.tube([(x,0,0),(x+.15,1.05,.05)],[.065,.025],sides=5,color=(.40,.36,.26))
        branch_crown(plant,(x,1.18,0),(.73,.69,.80),32,'hedge',scale=.61)
    return plant.finish()


def tree_band():
    plant=Plant('TreeBand')
    for i in range(7):
        x=(i-3)*3.4; z=R.uniform(-1.5,1.5); height=R.uniform(5.8,8.8)
        plant.tube([(x,0,z),(x+.2,height*.7,z)],[.21,.07],sides=5,color=(.40,.40,.29))
        # Widely staggered cards retain separate leaves at the horizon. Their
        # geometry is intentionally cheap and not intended for the foreground.
        for j in range(14):
            a=j*2.3999
            t=R.uniform(.15,1)
            p=(x+math.cos(a)*2.05*t,height+R.uniform(-1.8,1.2),z+math.sin(a)*2.0*t)
            normal=(math.cos(a),R.uniform(.2,1),math.sin(a))
            plant.leaf_card(p,3.2,3.5,normal,R.uniform(-2,2),'broadleaf',(.82,.90,.72),bend=.15)
    return plant.finish()

roots=[palm('PalmRoyal',14.5,.85),palm('PalmCoconut',11.8,2.2,True),hammock(),sea_grape(),hedge(),tree_band()]
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for root in roots:
    root.select_set(True)
    for obj in root.children_recursive: obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,export_normals=True,export_texcoords=True,export_animations=False,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'vegetation-v1.blend'))
report={'blender':bpy.app.version_string,'asset_bytes':OUT.stat().st_size,'materials':len(M),'atlas':str(ATLAS.relative_to(ROOT)),'templates':{},'source':'Original Blender authored geometry and generated RGBA leaf atlas; shared alpha-tested materials.'}
for root in roots:
    points=[];triangles=0
    for obj in root.children_recursive:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
        points.extend(obj.matrix_world@Vector(p) for p in obj.bound_box)
    lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
    report['templates'][root.name]={'triangles':triangles,'meshes':len(root.children),'dimensions_xyz':[round(hi[0]-lo[0],3),round(hi[2]-lo[2],3),round(hi[1]-lo[1],3)]}
report['triangles']=sum(r['triangles'] for r in report['templates'].values())
(WORK/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print('VEGETATION_ASSET '+json.dumps(report),flush=True)
if '--no-render' in sys.argv: sys.exit(0)

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1800;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Florida warm sky');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.42,.58,.73,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.3
bpy.ops.object.light_add(type='SUN',location=xyz((.38*80,.84*80,.12*80)))
sun=bpy.context.object;sun.data.energy=5.2;sun.data.angle=.07;sun.data.color=(1,.95,.84)
sun.rotation_euler=(-sun.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=300,location=xyz((0,-.035,0)))
ground=bpy.context.object;ground.data.materials.append(material('ReviewSand',(.64,.67,.58)))
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO'
# One consistent comparative sheet: palm pair, natural canopy pair, low hedge,
# and low-cost distant band. Labels are review-only and excluded from the GLB.
positions=[(-23,0,0),(-9,0,0),(7,0,0),(22,0,0),(11,0,10),(3,0,-15)]
for root,p in zip(roots,positions): root.location=xyz(p)
camera.location=xyz((37,26,67));target=(0,7,0)
camera.rotation_euler=(Vector(xyz(target))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=63
if '--palm-proofs' not in sys.argv:
    scene.render.filepath=str(WORK/'vegetation-kit.png');bpy.ops.render.render(write_still=True)
# Close detail view makes atlas/card artefacts visible before runtime integration.
for palm_root in roots[:2]:
    for root in roots:
        root.location=(0,0,0)
        for obj in root.children_recursive: obj.hide_render=root!=palm_root
    crown_y=14.5 if palm_root.name=='PalmRoyal' else 11.8
    for view,eye,target,scale in [
        ('front',(1,10.7,29),(1,9.7,0),35),
        ('quarter',(18,13.7,24),(1,9.7,0),35),
        ('crown',(10,crown_y+4,18),(1,crown_y+.7,0),15),
        ('game-scale',(10,crown_y+3,24),(1,crown_y+.15,0),16),
    ]:
        # Render the crown at roughly 220 pixels across, comparable to the
        # nearest complete palm in the 1536px title frame. This is an authoring
        # proof, not browser lighting or performance evidence.
        scene.render.resolution_x=320 if view=='game-scale' else 1800
        scene.render.resolution_y=256 if view=='game-scale' else 1100
        camera.location=xyz(eye)
        camera.rotation_euler=(Vector(xyz(target))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
        scene.render.filepath=str(WORK/f'{palm_root.name}-{view}.png');bpy.ops.render.render(write_still=True)
