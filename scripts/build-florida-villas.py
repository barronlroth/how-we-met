"""Blender waterfront villas with actual wall openings and overlapping clay tiles.

Four reusable roots follow the former waterfrontVilla(0..3) envelopes, metres,
Y-up and +Z waterfront. Materials and geometry are shared by browser clones.
"""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'artifacts/florida-villas-v1'
OUT=ROOT/'florida/assets/models/villas-v1.glb'
WORK.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def xyz(p): return (p[0],-p[2],p[1])
def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
M={}
for name,color,rough,metal in [
    ('stucco','f1e7d3',.85,0),('trim','faf2df',.7,0),
    ('terracotta','b76545',.84,0),('glass','314b56',.25,.08),
    ('teak','94704e',.76,0),('pool','4d9da8',.22,.04),
]:
    m=bpy.data.materials.new('Villa'+name.title());m.use_nodes=True
    rgba=tuple(linear(int(color[i:i+2],16)/255) for i in (0,2,4))+(1,)
    m.diffuse_color=rgba
    shader=m.node_tree.nodes['Principled BSDF'];shader.inputs['Base Color'].default_value=rgba
    shader.inputs['Roughness'].default_value=rough;shader.inputs['Metallic'].default_value=metal
    M[name]=m

class Villa:
    def __init__(self,name): self.name=name;self.parts={};self.refined=name=='WaterfrontVilla0'
    def mesh(self,mat,vertices,faces,smooth=False,uv=None,shades=None):
        bucket=self.parts.setdefault(mat,[[],[],[],[],[]]);offset=len(bucket[0])
        bucket[0].extend(vertices);bucket[1].extend(tuple(offset+i for i in face) for face in faces)
        bucket[2].extend([smooth]*len(faces))
        bucket[3].extend(uv if uv is not None else [None]*len(vertices))
        bucket[4].extend(shades if self.refined and shades is not None else [1.0]*len(vertices))
    def quad(self,mat,points,normal=None,smooth=False,uv=None,shades=None):
        face=list(range(len(points)))
        if normal is not None:
            direction=(Vector(points[1])-Vector(points[0])).cross(Vector(points[2])-Vector(points[0]))
            if direction.dot(Vector(normal))<0: face.reverse()
        self.mesh(mat,points,[face],smooth,uv,shades)
    def box(self,p,size,mat,open_ends=False,faces=None,shade=1.0):
        x,y,z=p;w,h,d=size
        v=[(x+a*w/2,y+b*h/2,z+c*d/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
        shell=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        # Front-face culling needs outward winding. Facade returns deliberately
        # omit their rear faces, so an inward box can make its trim disappear.
        selected=[shell[i] for i in faces] if faces is not None else shell[2:] if open_ends else shell
        self.mesh(mat,v,[tuple(reversed(face)) for face in selected] if self.refined else selected,shades=[shade]*len(v))
    def tube(self,a,b,r,mat,sides=6):
        a,b=Vector(a),Vector(b);direction=(b-a).normalized()
        axis=direction.cross(Vector((0,0,1)))
        if axis.length<.001:axis=direction.cross(Vector((1,0,0)))
        axis.normalize();second=direction.cross(axis).normalized()
        v=[tuple(p+axis*math.cos(i*math.tau/sides)*r+second*math.sin(i*math.tau/sides)*r) for p in (a,b) for i in range(sides)]
        faces=[tuple(reversed(range(sides))),tuple(range(sides,2*sides))]
        faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
        self.mesh(mat,v,faces,True)
    def facade(self,axis,side,plane,span,height,openings,center=0,trim=True):
        """Tessellated wall skin with absent window cells and deep jamb returns.

        No solid block occupies the room behind the windows. Opaque glazing is
        at the back of every reveal, with slender inset sash and stone sills.
        """
        def p(u,y,n=0):
            # At the actual intro angle, the old .8m reveal covered 10 pixels.
            # Villa0's .4m wall and inset frame expose a shaded 2–4px return.
            if self.refined and n<0:n*=.5
            return (center+u,y,plane+side*n) if axis=='z' else (plane+side*n,y,center+u)
        outward=(0,0,side) if axis=='z' else (side,0,0)
        across=(1,0,0) if axis=='z' else (0,0,1)
        def part(u,y,n,w,h,d,mat,section=None,shade=1.0):
            back=(2 if side>0 else 4) if axis=='z' else (5 if side>0 else 3)
            hidden={back}
            if section=='vertical':hidden.update((0,1))
            if section=='horizontal':hidden.update((3,5) if axis=='z' else (2,4))
            self.box(p(u,y,n),(w,h,d) if axis=='z' else (d,h,w),mat,faces=[i for i in range(6) if i not in hidden],shade=shade)
        us=sorted(set([-span/2,span/2]+[edge for u,bottom,w,h in openings for edge in (u-w/2,u+w/2)]))
        ys=sorted(set([0,height]+[edge for u,bottom,w,h in openings for edge in (bottom,bottom+h)]))
        for y0,y1 in zip(ys,ys[1:]):
            for u0,u1 in zip(us,us[1:]):
                uc,yc=(u0+u1)/2,(y0+y1)/2
                if any(abs(uc-u)<w/2 and bottom<yc<bottom+h for u,bottom,w,h in openings):continue
                self.quad('stucco',[p(u0,y0),p(u1,y0),p(u1,y1),p(u0,y1)],outward)
        for u,bottom,w,h in openings:
            left,right,top=u-w/2,u+w/2,bottom+h
            self.quad('stucco',[p(left,bottom),p(left,top),p(left,top,-.8),p(left,bottom,-.8)],across,shades=[.88,.68,.28,.46])
            self.quad('stucco',[p(right,bottom),p(right,bottom,-.8),p(right,top,-.8),p(right,top)],tuple(-v for v in across),shades=[1,.59,.36,.82])
            self.quad('trim',[p(left,bottom),p(left,bottom,-.8),p(right,bottom,-.8),p(right,bottom)],(0,1,0),shades=[1,.66,.76,1])
            self.quad('stucco',[p(left,top),p(right,top),p(right,top,-.8),p(left,top,-.8)],(0,-1,0),shades=[.58,.69,.26,.22])
            # A bright inner pane and a dark upper band preserve room depth
            # without depending on the runtime's limited-distance AO pass.
            if self.refined:
                ys=[bottom,bottom+h*.73,top];vertical=[.70,.96,.30]
                xs=[left,u,right];horizontal=[.73,1,.82]
                for iy in range(2):
                    for ix in range(2):
                        corners=[(ix,iy),(ix+1,iy),(ix+1,iy+1),(ix,iy+1)]
                        points=[p(xs[xx],ys[yy],-.84) for xx,yy in corners]
                        colors=[tuple(v*vertical[yy]*horizontal[xx] for v in (.84,.94,1)) for xx,yy in corners]
                        self.quad('glass',points,outward,shades=colors)
            else:self.quad('glass',[p(left,bottom,-.84),p(right,bottom,-.84),p(right,top,-.84),p(left,top,-.84)],outward)
            part(u,bottom-.025,.08,w+.28,.11,.34,'trim')
            # Every facade, including the side facing the intro camera, has a
            # separate inner sash. Outer decorative trim remains optional.
            if self.refined:
                for edge in (left+.065,right-.065):part(edge,bottom+h/2,-.695,.13,h,.19,'trim','vertical',.78)
                for level in (bottom+.06,top-.06):part(u,level,-.695,w,.12,.19,'trim','horizontal',.78 if level<top-.1 else .59)
                part(u,bottom+h/2,-.70,.11,h,.16,'trim','vertical',.81)
            if trim:
                if not self.refined:part(u,bottom+h/2,-.795,.055,h,.09,'trim','vertical')
                for edge in (left-.045,right+.045):part(edge,bottom+h/2,.045,.09,h+.18,.15,'trim','vertical')
                part(u,top+.045,.04,w+.26,.09,.14,'trim','horizontal')
            else:part(u,top+.07,.07,w+.25,.14,.24,'trim')
            # Small folded curtains sit behind the frame in selected Villa0
            # rooms. Open central glazing and uneven panel widths avoid an
            # identical dark cutout on every occupied waterfront window.
            if self.refined and round(u*7+bottom*5)%3!=0:
                for edge,direction,width in [(left+.12,1,w*.19),(right-.12,-1,w*.13)]:
                    for strip in range(4):
                        a=edge+direction*width*strip/4;b=edge+direction*width*(strip+1)/4
                        depth=-.765+(.027 if strip%2 else 0)
                        tint=(.54,.51,.44) if strip%2 else (.77,.73,.64)
                        self.quad('trim',[p(a,bottom+.10,depth),p(b,bottom+.10,depth),p(b,top-.13,depth),p(a,top-.13,depth)],outward,shades=[tint]*4)
    def rail(self,x,y,z,width,depth=0):
        self.box((x,y,z),(width,.065,.075),'trim')
        self.box((x,y-.8,z),(width,.045,.055),'trim')
        count=math.ceil(width/1.18)
        for i in range(count+1):self.box((x-width/2+width*i/count,y-.4,z),(.035,.82,.045),'trim',True)
        if depth:
            for side in (-1,1):
                xx=x+side*width/2
                self.box((xx,y,z-depth/2),(.07,.065,depth),'trim')
                for dz in (.8,1.6,2.4):
                    if dz<depth:self.box((xx,y-.4,z-dz),(.045,.82,.035),'trim',True)
    def terrace(self,w,level,supports=True):
        self.box((0,level,8.2),(w+1,.32,3.8),'trim')
        self.box((0,level-.12,8.25),(w+.6,.07,3.45),'stucco')
        self.rail(0,level+1.25,9.92,w,3.22)
        if supports:
            for x in (-w/2+.3,w/2-.3):
                self.box((x,level+1.95,9.6),(.43,3.7,.43),'trim',True)
                self.box((x,level+.22,9.6),(.68,.15,.65),'trim')
                self.box((x,level+3.66,9.6),(.7,.16,.67),'trim')
    def barrel(self,a,b,across,normal,r=.18,end_cap=False):
        a,b,across,normal=map(Vector,(a,b,across,normal))
        vertices=[]
        for row,p in enumerate((a,b)):
            for i in range(4):
                angle=i*math.pi/3
                vertices.append(tuple(p+across*math.cos(angle)*r+normal*(math.sin(angle)*r+(.04 if row==0 else .006))))
        side_roof=abs(normal.x)>abs(normal.z)
        for i in range(3):
            points=[vertices[i],vertices[i+4],vertices[i+5],vertices[i+1]]
            uv=[(p[2]/2.6,p[0]/2.7) if side_roof else (p[0]/2.6,p[2]/2.7) for p in points]
            self.quad('terracotta',points,normal,True,uv)
        if end_cap:
            if not self.refined:
                center=tuple(a+normal*.006)
                for i in range(3):self.quad('terracotta',[center,vertices[i],vertices[i+1]],tuple(a-b))
                return
            # Hollow leading lips give each curved tile a dark inner edge. The
            # cap remains inside the old radius and eave envelope.
            inner=[]
            for i in range(4):
                angle=i*math.pi/3
                inner.append(tuple(a+across*math.cos(angle)*(r-.05)+normal*(math.sin(angle)*(r-.05)+.04)))
            inward=(b-a).normalized()*.075
            shade=.74+.12*(.5+.5*math.sin(a.x*6.1+a.z*3.7))
            for i in range(3):
                self.quad('terracotta',[vertices[i],inner[i],inner[i+1],vertices[i+1]],tuple(a-b),shades=[shade]*4)
                self.quad('terracotta',[inner[i],tuple(Vector(inner[i])+inward),tuple(Vector(inner[i+1])+inward),inner[i+1]],normal,shades=[.31,.22,.22,.31])
    def hip_roof(self,x,y,z,w,d,rise=2.35):
        ridge=w*.3
        vertices=[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x+w/2,y,z+d/2),(x-w/2,y,z+d/2),(x-ridge,y+rise,z),(x+ridge,y+rise,z)]
        for side_roof,indices in enumerate([(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)]):
            points=[vertices[i] for i in indices]
            uv=[(p[2]/2.6,p[0]/2.7) if side_roof%2 else (p[0]/2.6,p[2]/2.7) for p in points]
            self.quad('terracotta',points,(0,1,0),uv=uv)
        self.box((x,y-.13,z),(w,.18,d),'trim')
        self.box((x,y-.235,z),(w-.26,.08,d-.24),'teak')
        # Separate lapped tile courses retain the tile-end silhouette at the
        # eaves. Hidden tile backs stay open; the continuous roof seals below.
        pitch=.66
        for side in (-1,1):
            count=max(1,math.floor(w/pitch))
            for i in range(count):
                xx=-w/2+(i+.5)*w/count
                reach=min(1,(w/2-abs(xx))/(w*.2))
                a=Vector((x+xx,y,z+side*d/2));b=Vector((x+xx,y+rise*reach,z+side*d/2*(1-reach)))
                length=(b-a).length
                if length<.25:continue
                direction=(b-a).normalized();normal=Vector((0,abs(direction.z),-side*direction.y))
                # The outward/up roof normal has the same Z sign as its eave.
                normal.z=side*direction.y;normal.normalize()
                for j in range(math.ceil(length/1.6)):
                    lo=max(0,j*1.6-.13);hi=min(length,(j+1)*1.6+.08)
                    self.barrel(a+direction*lo,b if hi==length else a+direction*hi,(1,0,0),normal,end_cap=j==0)
            count=max(1,math.floor(d/pitch))
            for i in range(count):
                zz=-d/2+(i+.5)*d/count;reach=1-abs(zz)/(d/2)
                a=Vector((x+side*w/2,y,z+zz));b=Vector((x+side*(w/2-w*.2*reach),y+rise*reach,z+zz))
                length=(b-a).length
                if length<.25:continue
                direction=(b-a).normalized();normal=Vector((side*direction.y,abs(direction.x),0)).normalized()
                for j in range(math.ceil(length/1.6)):
                    lo=max(0,j*1.6-.13);hi=min(length,(j+1)*1.6+.08)
                    self.barrel(a+direction*lo,a+direction*hi,(0,0,1),normal,end_cap=j==0)
        for first,last in [(0,4),(3,4),(1,5),(2,5),(4,5)]:self.tube(vertices[first],vertices[last],.095,'terracotta',6)
    def garden(self,w,variant):
        x=-w/2-4
        for dx in (-2.6,2.6):
            for dz in (-2,2):
                self.box((x+dx,.12,4+dz),(.4,.24,.4),'trim')
                self.box((x+dx,1.75,4+dz),(.18,3.25,.18),'teak',True)
        for dx in (-2.7,2.7):self.box((x+dx,3.3,4),(.21,.24,5.05),'teak')
        for i in range(11):self.box((x,3.48,1.6+i*.48),(6,.16,.13),'teak')
        self.box((x,.48,5.2),(3.2,.18,1.45),'teak')
        self.box((x,.69,5.2),(3,.25,1.3),'trim')
        self.box((x,.99,5.77),(3,.52,.18),'trim')
        pool_z=5.1 if variant==3 else 3
        pool_d=4.2 if variant==3 else 5
        self.box((w/2+4,.1,pool_z),(6.5,.13,pool_d),'trim')
        self.box((w/2+4,.18,pool_z),(5.8,.03,pool_d-.7),'pool')
        for i in range(2):
            xx=w/2+2+i*3;zz=8.15 if variant==3 else 7
            self.box((xx,.34,zz),(1,.1,2.4),'teak')
            self.box((xx,.48,zz),(.9,.18,2.3),'trim')
            self.box((xx,.84,zz+.95),(.9,.7,.15),'trim')
    def finish(self):
        root=bpy.data.objects.new(self.name,None);bpy.context.collection.objects.link(root)
        for mat,(verts,faces,smooth,authored_uv,shades) in self.parts.items():
            mesh=bpy.data.meshes.new(self.name+'_'+mat);mesh.from_pydata([xyz(p) for p in verts],[],faces);mesh.update()
            for polygon,flag in zip(mesh.polygons,smooth):polygon.use_smooth=flag
            obj=bpy.data.objects.new(self.name+'_'+mat,mesh);bpy.context.collection.objects.link(obj);obj.parent=root;mesh.materials.append(M[mat])
            colors=mesh.color_attributes.new(name='ArchitecturalAO',type='FLOAT_COLOR',domain='POINT')
            for value,shade in zip(colors.data,shades):
                rgb=(shade,shade,shade) if isinstance(shade,(float,int)) else shade
                value.color=(*rgb,1)
            uv=mesh.uv_layers.new(name='SurfaceUV')
            scale={'stucco':(3.5,3.5),'trim':(4,4),'terracotta':(2.6,2.7),'teak':(1.8,3.6)}.get(mat,(1,1))
            for polygon in mesh.polygons:
                nx,ny,nz=map(abs,polygon.normal)
                for loop in polygon.loop_indices:
                    authored=authored_uv[mesh.loops[loop].vertex_index]
                    if authored is not None:
                        uv.data[loop].uv=authored
                        continue
                    px,pz,py=mesh.vertices[mesh.loops[loop].vertex_index].co;gz=-pz
                    u= gz if nx>ny and nx>nz else px
                    v= gz if nz>=nx and nz>=ny else py
                    uv.data[loop].uv=(u/scale[0],v/scale[1])
        return root

def make_villa(variant):
    b=Villa('WaterfrontVilla'+str(variant));w=16+(variant%3)*2;d=13;h=12 if variant==2 else 8.5
    floors=3 if variant==2 else 2
    if variant==1:
        front=[]
        for width,cy,hh in [(w*.7,1.65,2.7),(w*.82,5.8,2.8)]:
            count=round(width/3.45);step=width/count
            front.extend((-width/2+step*(i+.5),cy-hh/2,step-.38,hh) for i in range(count))
    else:
        count=round((w-.7)/3.45);step=(w-.7)/count
        front=[(-(w-.7)/2+step*(i+.5),.55+f*3.7,step-.48,2.5) for f in range(floors) for i in range(count)]
        # A taller central ground-floor entrance anchors the waterfront facade.
        index=count//2;u,bottom,ww,hh=front[index];front[index]=(u,.3,ww,3.05)
    b.facade('z',1,6.5,w,h,front)
    side_openings=[(zz,yy-1,1.9,2) for zz in (-4,-.5,3) for yy in (2,5.8)]
    if floors==3:side_openings.extend((zz,8.6,1.9,2) for zz in (-4,-.5,3))
    for side in (-1,1):b.facade('x',side,side*w/2,d,h,side_openings,trim=False)
    rear=[(xx,yy-1,1.8,2) for xx in (-w*.3,0,w*.3) for yy in (2,5.8)]
    b.facade('z',-1,-6.5,w,h,rear,trim=False)
    # Physical floor/ceiling slabs close the rooms without filling window bays.
    b.box((0,.11,0),(w-.05,.22,d-.05),'trim')
    for level in [3.95,7.65] if floors==3 else [3.95]:b.box((0,level,0),(w-.05,.24,d-.05),'stucco')
    b.box((0,h-.13,0),(w,.26,d),'stucco')
    if variant==1:
        b.box((1,h+.2,0),(w+3,.4,d+1.5),'trim')
        b.box((1,4,7.5),(w*.8,.35,5),'trim')
        b.rail(1,5.24,9.92,w*.8,3.42)
        for x in (-w/2,w/2):b.box((x,h/2,7.6),(.5,h,4),'trim')
        b.box((w*.3,h+.6,-3),(w*.35,1.2,3),'stucco')
        b.box((w*.3,h+1.18,-3),(w*.35+.25,.08,3.25),'trim')
    else:
        for f in range(floors):b.terrace(w,.3+f*3.7,supports=f<floors-1)
        b.hip_roof(0,h,0,w+2,d+2)
        for x in (-w*.34,0,w*.34):b.box((x,h-.38,6.5),(.18,.4,1.1),'trim')
        if variant==3:
            x=w*.65;ww=w*.55
            b.facade('z',1,2.5,ww,3.8,[(0,.5,2.6,2.6)],center=x)
            b.facade('z',-1,-4.5,ww,3.8,[],center=x)
            for side in (-1,1):b.facade('x',side,x+side*ww/2,7,3.8,[(0,.8,1.9,2)],center=-1,trim=False)
            b.box((x,.12,-1),(ww,.24,7),'trim');b.box((x,3.7,-1),(ww,.2,7),'stucco')
            b.hip_roof(x,3.9,0,w*.65,8)
    b.garden(w,variant)
    return b.finish()

roots=[make_villa(i) for i in range(4)]
bpy.ops.object.select_all(action='DESELECT')
for root in roots:
    root.select_set(True)
    for obj in root.children:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,export_normals=True,export_texcoords=True,export_animations=False,
                          export_vertex_color='NAME',export_vertex_color_name='ArchitecturalAO',export_all_vertex_colors=False)
# Save/export the plain material factors; authoring previews then multiply the
# same COLOR_0 tint/AO that GLTFLoader enables in the browser.
for material in M.values():
    nodes=material.node_tree.nodes;links=material.node_tree.links;shader=nodes['Principled BSDF']
    color=nodes.new('ShaderNodeVertexColor');color.layer_name='ArchitecturalAO'
    multiply=nodes.new('ShaderNodeMixRGB');multiply.name='Architectural occlusion';multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
    multiply.inputs[1].default_value=shader.inputs['Base Color'].default_value
    links.new(color.outputs['Color'],multiply.inputs[2]);links.new(multiply.outputs['Color'],shader.inputs['Base Color'])
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'villas-v1.blend'))
report={'blender':bpy.app.version_string,'bytes':OUT.stat().st_size,'materials':len(M),'templates':{},'window_recess_m':{'WaterfrontVilla0':.42,'other_variants':.84},
        'inner_frame_width_m':.13,'inner_frame_front_depth_m':.2525,'architectural_ao':'Villa0 COLOR_0 on reveals, glazing and hollow tile lips'}
for root in roots:
    points=[];triangles=0
    for obj in root.children:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles);points.extend(obj.matrix_world@Vector(p) for p in obj.bound_box)
    low=[min(p[i] for p in points) for i in range(3)];high=[max(p[i] for p in points) for i in range(3)]
    report['templates'][root.name]={'triangles':triangles,'meshes':len(root.children),'min_xyz':[low[0],low[2],-high[1]],'max_xyz':[high[0],high[2],-low[1]]}
report['triangles']=sum(t['triangles'] for t in report['templates'].values());(WORK/'report.json').write_text(json.dumps(report,indent=2)+'\n');print('VILLA_ASSET '+json.dumps(report),flush=True)
if '--no-render' in sys.argv:sys.exit(0)
if '--game-scale-proof' in sys.argv:
    # Exact inverse of Villa0@3922's placement at the desktop intro camera:
    # local camera/target plus the game's 63-degree vertical FOV and leftward
    # film offset. This keeps facade details at their real supplied pixel size.
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8;scene.cycles.use_denoising=True
    scene.render.resolution_x=1536;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard'
    scene.world=bpy.data.worlds.new('Intro proof');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.33,.49,.62,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=1
    bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera
    camera.data.type='PERSP';camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=32
    camera.data.lens=32/(2*math.tan(math.radians(63)/2));camera.data.shift_x=-.3
    camera.location=xyz((-62.10801488367133,5.1388888888888875,53.763856560395794))
    target=xyz((-42.61259427002369,-1.1574074074074072,50.53973382464292))
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    for root in roots:
        for obj in root.children:obj.hide_render=root!=roots[0]
    before=[];materials=list(M.values())
    if '--compare-glb' in sys.argv:
        existing=set(bpy.data.objects);old_materials=set(bpy.data.materials)
        bpy.ops.import_scene.gltf(filepath=sys.argv[sys.argv.index('--compare-glb')+1])
        imported=[obj for obj in bpy.data.objects if obj not in existing]
        before=[obj for obj in imported if obj.type=='EMPTY' and obj.name.startswith('WaterfrontVilla0')]
        materials.extend(mat for mat in bpy.data.materials if mat not in old_materials)
        for obj in imported:
            if obj.type=='MESH':obj.hide_render=True
    # Emission isolates the authored AO and geometric frame/tile faces. It
    # deliberately excludes shadow maps and path-traced ambient contact shade.
    for material in materials:
        nodes=material.node_tree.nodes;links=material.node_tree.links
        shader=next(node for node in nodes if node.type=='BSDF_PRINCIPLED')
        output=next(node for node in nodes if node.type=='OUTPUT_MATERIAL')
        emission=nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1
        if shader.inputs['Base Color'].is_linked:links.new(shader.inputs['Base Color'].links[0].from_socket,emission.inputs['Color'])
        else:emission.inputs['Color'].default_value=shader.inputs['Base Color'].default_value
        links.new(emission.outputs[0],output.inputs['Surface'])
    scene.render.filepath=str(WORK/'Villa0-intro-ambient.png');bpy.ops.render.render(write_still=True)
    if before:
        for obj in roots[0].children:obj.hide_render=True
        for obj in before[0].children:obj.hide_render=False
        scene.render.filepath=str(WORK/'Villa0-intro-before.png');bpy.ops.render.render(write_still=True)
    sys.exit(0)
# Proofs use the same supplied generated atlas as the browser's shared maps.
import numpy as np
atlas=bpy.data.images.load(str(ROOT/'florida/assets/textures/coastal-materials-v1.png'));aw,ah=atlas.size
pixels=np.array(atlas.pixels[:],dtype=np.float32).reshape(ah,aw,4)
for mat,row,col in [('stucco',1,0),('terracotta',1,1),('trim',0,1)]:
    image=bpy.data.images.new('Villa proof '+mat,width=aw//2,height=ah//2)
    image.pixels.foreach_set(pixels[row*(ah//2):(row+1)*(ah//2),col*(aw//2):(col+1)*(aw//2)].copy().flatten());image.scale(512,512)
    nodes=M[mat].node_tree.nodes;links=M[mat].node_tree.links;texture=nodes.new('ShaderNodeTexImage');texture.image=image
    links.new(texture.outputs['Color'],nodes['Architectural occlusion'].inputs[1])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.17;bump.inputs['Distance'].default_value=.025
    links.new(texture.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],nodes['Principled BSDF'].inputs['Normal'])
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Florida afternoon');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.38,.52,.67,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.data.energy=3.1;sun.data.angle=.08;sun.data.color=(1,.89,.72);sun.rotation_euler=Vector((.65,.45,-1)).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=600,location=xyz((0,-.025,0)));ground=bpy.context.object;ground.data.materials.append(M['pool'])
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO'
for root in roots:
    for other in roots:
        for obj in other.children:obj.hide_render=other!=root
    camera.location=xyz((31,21,42));target=(0,4.5,1.5);camera.data.ortho_scale=39
    camera.rotation_euler=(Vector(xyz(target))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(WORK/(root.name+'.png'));bpy.ops.render.render(write_still=True)
for other in roots:
    for obj in other.children:obj.hide_render=other!=roots[0]
camera.location=xyz((15,9,28));target=(0,5,5);camera.data.ortho_scale=22
camera.rotation_euler=(Vector(xyz(target))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(WORK/'villa-facade.png');bpy.ops.render.render(write_still=True)
