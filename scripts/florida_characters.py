"""Sculpted, articulated characters following the approved animated-feature concept.

Geometry is authored here; no photograph or concept image is projected onto a model.
Coordinates use the game's X-right, Y-up, -Z-forward convention.
"""
import math
import random
import bpy
from mathutils import Vector


def interpolate(rows, y, column):
    i = next((i for i in range(len(rows)-1) if y <= rows[i+1][0]), len(rows)-2)
    a, b = rows[i], rows[i+1]
    before, after = rows[max(0,i-1)], rows[min(len(rows)-1,i+2)]
    h = b[0]-a[0]
    t = max(0,min(1,(y-a[0])/h))
    da = (b[column]-before[column])/(b[0]-before[0])
    db = (after[column]-a[column])/(after[0]-a[0])
    return (2*t**3-3*t*t+1)*a[column]+(t**3-2*t*t+t)*h*da+(-2*t**3+3*t*t)*b[column]+(t**3-t*t)*h*db


def curve_points(points, count=22):
    out=[]
    for j in range(count):
        t=j/(count-1)*(len(points)-1);i=min(len(points)-2,int(t));u=t-i
        p0,p1,p2,p3=[Vector(points[max(0,min(len(points)-1,k))]) for k in (i-1,i,i+1,i+2)]
        out.append(tuple(.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)))
    return out


def sweep(a,name,points,width,mat,parent,depth=.6,sides=8,taper=True):
    """An oval sculpted lock or limb with a stable frame and rounded tapered ends."""
    verts=[];faces=[]
    for i,p in enumerate(points):
        tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
        right=tangent.cross(Vector((0,0,-1)))
        if right.length<.01:right=tangent.cross(Vector((0,1,0)))
        right.normalize();normal=right.cross(tangent).normalized()
        u=i/(len(points)-1)
        r=width*(.32+.68*math.sin(math.pi*u)**.45)*(1-u*.65) if taper else width
        for k in range(sides):
            theta=k/sides*math.tau
            verts.append(tuple(Vector(p)+right*(math.cos(theta)*r)+normal*(math.sin(theta)*r*depth)))
        if i:
            for k in range(sides):faces.append(((i-1)*sides+k,(i-1)*sides+(k+1)%sides,i*sides+(k+1)%sides,i*sides+k))
    faces.extend([tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))])
    return a.mesh(name,verts,faces,mat,parent)


def loft(a,name,rows,mat,parent,segments=32,rings=24):
    verts=[];faces=[]
    for row in range(rings):
        y=rows[0][0]+(rows[-1][0]-rows[0][0])*row/(rings-1)
        w,d,z=[interpolate(rows,y,c) for c in (1,2,3)]
        for i in range(segments):
            angle=i/segments*math.tau
            verts.append((math.sin(angle)*w,y,z-math.cos(angle)*d))
            if row:faces.append(((row-1)*segments+i,(row-1)*segments+(i+1)%segments,row*segments+(i+1)%segments,row*segments+i))
    faces.extend([tuple(reversed(range(segments))),tuple(range((rings-1)*segments,rings*segments))])
    return a.mesh(name,verts,faces,mat,parent)


def weld_cloth(a,name,objects,parent,voxel=.017):
    """Unify shoulder/sleeve and hip/thigh volumes into a continuous cloth surface."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join();obj=bpy.context.object;obj.name=name
    mod=obj.modifiers.new('Continuous garment topology','REMESH');mod.mode='VOXEL';mod.voxel_size=voxel;mod.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=obj.modifiers.new('Soft cloth transitions','SMOOTH');mod.factor=.65;mod.iterations=4
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # Broad authored compression folds at the waist and knees survive at game scale.
    # They are deformations of the cloth surface, not overlaid string geometry.
    is_shirt='shirt' in name.lower()
    obj.data.update()
    for v in obj.data.vertices:
        x,y,z=v.co.x,v.co.z,-v.co.y
        if is_shirt:
            front=max(0,min(1,(-z-.025)/.105))
            waist=math.exp(-((y-.665)/.145)**2)
            fold=.019*math.sin((y-.535)*38+x*10)*waist
            # Cloth draws diagonally from the tucked waist towards each shoulder.
            fold+=.012*math.sin((y-.80)*27-abs(x)*14)*math.exp(-((y-.91)/.22)**2)*min(1,abs(x)/.23)
            fold+=.014*math.sin((y-1.02)*54+x*14)*math.exp(-((y-1.064)/.075)**2)*min(1,abs(x)/.30)
            v.co.y+=fold*front
            back=max(0,min(1,(z-.07)/.09))
            v.co.y-=.010*math.sin(y*32+x*8)*waist*back
        else:
            # Seated thighs compress into folds at the groin, hips and rolled hems.
            thigh=max(0,min(1,(-z-.07)/.22))
            fold=.014*math.sin((z+.20)*41+abs(x)*11)*math.exp(-((y-.46)/.12)**2)
            fold+=.009*math.sin((z+.36)*58-x*6)*math.exp(-((z+.37)/.11)**2)
            v.co.z+=fold*thigh
    mod=obj.modifiers.new('Relax sculpted cloth folds','SMOOTH');mod.factor=.22;mod.iterations=1
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=obj.modifiers.new('Game garment topology','DECIMATE');mod.ratio=.20;mod.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for face in obj.data.polygons:face.use_smooth=True
    obj.select_set(False)
    return obj


def limb(a,name,points,radii,mat,parent,depth=1,segments=12):
    pts=curve_points(points,8 if name in ('Finger','Thumb') else 14);verts=[];faces=[]
    for j,p in enumerate(pts):
        u=j/(len(pts)-1);v=u*(len(radii)-1);i=min(len(radii)-2,int(v));t=v-i
        radius=radii[i]*(1-t)+radii[i+1]*t
        tangent=(Vector(pts[min(j+1,len(pts)-1)])-Vector(pts[max(0,j-1)])).normalized()
        right=tangent.cross(Vector((0,0,-1)))
        if right.length<.01:right=tangent.cross(Vector((0,1,0)))
        right.normalize();normal=right.cross(tangent).normalized()
        for k in range(segments):
            theta=k/segments*math.tau
            verts.append(tuple(Vector(p)+right*(math.cos(theta)*radius)+normal*(math.sin(theta)*radius*depth)))
            if j:faces.append(((j-1)*segments+k,(j-1)*segments+(k+1)%segments,j*segments+(k+1)%segments,j*segments+k))
    faces.extend([tuple(reversed(range(segments))),tuple(range((len(pts)-1)*segments,len(pts)*segments))])
    return a.mesh(name,verts,faces,mat,parent)


def make_hand(a,parent,wrist,direction,skin,pointing=False):
    hand=a.group('Pointing hand' if pointing else 'Sculpted relaxed hand',parent,wrist)
    hand.rotation_mode='QUATERNION'
    hand.rotation_quaternion=Vector((0,1,0)).rotation_difference(Vector((direction[0],-direction[2],direction[1])).normalized())
    a.ell('Palm',(0,0,-.05),(.047,.027,.069),skin,hand,12,8)
    # A visible thumb web and four tapered fingers replace the wrist stubs.
    limb(a,'Thumb',[(.035,0,-.025),(.060,-.005,-.049),(.064,-.017,-.079)],[.023,.019,.012],skin,hand,segments=8)
    for i,x in enumerate([-.031,-.011,.011,.031]):
        length=[.045,.060,.068,.052][i]
        if pointing and i==2:
            pts=[(x,0,-.094),(x,.002,-.170),(x+.005,.003,-.221)];r=[.014,.012,.008]
        else:
            curl=.040 if pointing else .017
            pts=[(x,0,-.096),(x,-.007,-.112-length*.5),(x,-curl,-.106-length)];r=[.014,.013,.009]
        limb(a,'Finger',pts,r,skin,hand,segments=8)
    return hand


def make_head(a,parent,nina):
    skin='skinN' if nina else 'skinB'
    head=a.group('NinaHead' if nina else 'BarronHead',parent)
    # Shorter lower face, distinct jaw turn, fuller smiling cheeks and a round cranium.
    rows=([(1.380,.045,.065,-.022),(1.415,.137,.151,-.014),(1.480,.226,.200,-.003),
           (1.585,.284,.230,.008),(1.700,.291,.242,.020),(1.810,.281,.245,.026),
           (1.935,.254,.237,.035),(2.035,.174,.171,.04),(2.075,.008,.012,.04)] if nina else
          [(1.360,.057,.090,-.024),(1.395,.156,.165,-.014),(1.465,.243,.197,-.005),
           (1.575,.286,.226,.009),(1.710,.290,.244,.017),(1.825,.277,.250,.023),
           (1.950,.260,.239,.035),(2.037,.164,.16,.04),(2.075,.01,.012,.04)])
    # Atlas landmarks stay at a nearly uniform scale. The former 1.52→1.65 span
    # stretched V .315→.400, lengthening the philtrum about 2.5 times.
    def face_uv(x,y):
        return ((.5 if nina else 0)+(.5+x/.66)*.5,(y-1.340)/.735)
    eye_y=1.340+.735*(.601 if nina else .619)
    eye_x=.123 if nina else .124
    nose_y=1.340+.735*.405
    mouth_y=1.340+.735*(.284 if nina else .308)
    def displace(x,y):
        g=lambda cx,cy,wx,wy:math.exp(-((x-cx)/wx)**2-((y-cy)/wy)**2)
        bridge=-.030*g(0,nose_y+.062,.035,.092)
        tip=-(.049 if nina else .055)*g(0,nose_y,.047,.037)
        nostril=-.017*(g(-.041,nose_y-.008,.021,.020)+g(.041,nose_y-.008,.021,.020))
        cheeks=-.035*(g(-.169,mouth_y+.045,.077,.068)+g(.169,mouth_y+.05,.077,.068))
        muzzle=-.014*g(0,mouth_y,.12,.046)
        # Almond-shaped sockets, lids and convex eye surfaces agree with the atlas.
        sockets=.018*(g(-eye_x,eye_y,.092,.054)+g(eye_x,eye_y,.092,.054))
        brows=-.012*(g(-eye_x,eye_y+.072,.10,.032)+g(eye_x,eye_y+.072,.10,.032))
        lip=-.010*g(0,mouth_y-.008,.114,.023)
        chin=-.020*g(0,1.417,.102,.047)
        return bridge+tip+nostril+cheeks+muzzle+sockets+brows+lip+chin
    def front(x,y):
        w,d,z=[interpolate(rows,y,c) for c in (1,2,3)]
        cosine=math.sqrt(max(0,1-(x/max(w,.01))**2))
        # Broad frontal planes avoid wrapping a good smile around an egg.
        flat=cosine*(1+.46*(1-cosine))
        return z-flat*d+displace(x,y)*cosine**3
    verts=[];faces=[];segments=52;rings=37
    for row in range(rings):
        y=rows[0][0]+(rows[-1][0]-rows[0][0])*row/(rings-1)
        w,d,z=[interpolate(rows,y,c) for c in (1,2,3)]
        for i in range(segments):
            angle=i/segments*math.tau;c=math.cos(angle);x=math.sin(angle)*w
            flat=c*(1+.46*(1-c)) if c>=0 else c
            verts.append((x,y,z-flat*d+displace(x,y)*max(0,c)**3))
            if row:faces.append(((row-1)*segments+i,(row-1)*segments+(i+1)%segments,row*segments+(i+1)%segments,row*segments+i))
    faces.extend([tuple(reversed(range(segments))),tuple(range((rings-1)*segments,rings*segments))])
    surface=a.mesh('Landmark-aligned sculpted face',verts,faces,'faceN' if nina else 'faceB',head)
    surface.data.materials.append(a.M[skin]);uv=surface.data.uv_layers.new(name='FaceUV')
    for poly in surface.data.polygons:
        if sum(verts[v][2] for v in poly.vertices)/len(poly.vertices)>.055:poly.material_index=1
        for li in poly.loop_indices:
            x,y,z=verts[surface.data.loops[li].vertex_index];uv.data[li].uv=face_uv(x,y)
    loft(a,'Shaped neck and throat',[(1.17,.143,.104,.035),(1.26,.133,.112,.025),(1.36,.112,.107,.022),(1.48,.110,.106,.018)],skin,parent,20,12)
    for side in (-1,1):
        a.ell('Ear',(side*.292,1.685,.035),(.043,.080,.040),skin,head,16,10)
        a.path('Ear fold',[(side*.304,1.72,.001),(side*.317,1.685,-.010),(side*.30,1.655,-.003)],.007,'lipsN' if nina else 'lipsB',head)
        if nina:a.ring('Gold hoop',(side*.317,1.610,.007),.040,.006,'gold',head,n=20)
        else:a.ell('Ear stud',(side*.322,1.639,-.007),(.010,.011,.007),'chrome',head,10,6)
    for side in (-1,1):
        x=side*eye_x;y=eye_y;ev=[(x,y,front(x,y)-.016)];ef=[];steps=24
        for k in range(1,5):
            r=k/4
            for j in range(steps):
                t=j/steps*math.tau;dx=.077*math.cos(t)*r
                # Taper towards the canthi instead of outlining two round lenses.
                dy=.039*math.sin(t)*r*(.84+.16*abs(math.sin(t)))
                xx=x+dx;yy=y+dy
                ev.append((xx,yy,front(xx,yy)-.001-.015*(1-r*r)))
                if k==1:ef.append((0,1+(j+1)%steps,1+j))
                else:
                    lo=1+(k-2)*steps;hi=1+(k-1)*steps
                    ef.append((lo+j,lo+(j+1)%steps,hi+(j+1)%steps,hi+j))
        eye=a.mesh('Convex almond eye',ev,ef,'eyeN' if nina else 'eyeB',head)
        uv=eye.data.uv_layers.new(name='FaceUV')
        for poly in eye.data.polygons:
            for li in poly.loop_indices:
                xx,yy,zz=ev[eye.data.loops[li].vertex_index];uv.data[li].uv=face_uv(xx,yy)
    make_hair(a,head,nina)
    for child in head.children:child.location.z-=1.67
    head.location.z=1.580
    head.rotation_euler.z=.055 if nina else -.04
    head.rotation_euler.y=-.055 if nina else .055
    scale=.81 if nina else .82;head.scale=(scale,scale,scale)
    return head


def hair_lock(a,head,name,controls,width,depth,mat):
    """A layered hair ribbon with shallow recessed fibers, not an oval tube."""
    blonde=mat in ('hairN','hairGold')
    points=curve_points(controls,40 if blonde else 36);verts=[];faces=[];colors=[];sides=28 if blonde else 20
    for i,p in enumerate(points):
        u=i/(len(points)-1)
        tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
        right=tangent.cross(Vector((0,0,-1)))
        if right.length<.01:right=tangent.cross(Vector((0,1,0)))
        right.normalize();normal=right.cross(tangent).normalized()
        r=width*(.28+.72*math.sin(math.pi*min(.985,u+.03))**.4)*(1-.90*u**3)
        for k in range(sides):
            angle=k/sides*math.tau;q=math.cos(angle);sn=math.sin(angle)
            if blonde:
                # Broad, almost flat sheets overlap into a continuous silhouette.
                # Five millimetre-scale channels live inside the surface itself.
                profile=max(0,1-q**4)**.5
                groove=sum(math.exp(-((q-c-.025*math.sin(u*5))/.07)**2) for c in (-.74,-.37,0,.37,.74))
                thickness=r*depth*.46
                relief=math.copysign(profile*max(.002,thickness-.0028*groove),sn)
                shade=1-.13*groove*abs(sn)
            else:
                relief=sn*r*depth*(1+.12*math.cos(angle*5+u*1.6));shade=1
            verts.append(tuple(Vector(p)+right*(q*r)+normal*relief))
            colors.append((shade,shade,shade,1))
            if i:faces.append(((i-1)*sides+k,(i-1)*sides+(k+1)%sides,i*sides+(k+1)%sides,i*sides+k))
    faces.extend([tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))])
    obj=a.mesh(name,verts,faces,mat,head)
    if blonde:
        attr=obj.data.color_attributes.new(name='HairFibers',type='FLOAT_COLOR',domain='POINT')
        for v,color in zip(attr.data,colors):v.color=color
    return obj


def make_hair(a,head,nina):
    if not nina:
        # Hair follows a real hairline; shallow directional curls replace spherical lobes.
        verts=[];faces=[];segments=32;rings=12
        for j in range(rings):
            u=j/(rings-1);r=math.sin(u*math.pi/2)
            for i in range(segments):
                angle=i/segments*math.tau;c=math.cos(angle)
                edge=1.81+.245*max(0,c)**3+.010*math.sin(angle*7)
                x=math.sin(angle)*.300*r-.014*(1-r)
                z=.044-c*.267*r
                y=2.195-(2.195-edge)*(1-math.cos(u*math.pi/2))
                verts.append((x,y,z))
                if j:faces.append(((j-1)*segments+i,(j-1)*segments+(i+1)%segments,j*segments+(i+1)%segments,j*segments+i))
        a.mesh('Shaped curly hair crown',verts,faces,'hairB',head)
        rng=random.Random(571)
        for i in range(34):
            angle=i*2.39996;r=math.sqrt((i+.4)/35)
            cx=math.cos(angle)*.262*r;cz=.04+math.sin(angle)*.227*r
            cy=2.002+.177*math.sqrt(max(0,1-r*r));phase=rng.uniform(-.8,.8)
            pts=[];size=rng.uniform(.8,1.18)
            for j in range(12):
                u=j/11;t=phase+u*math.pi*1.75;radius=.061*size*(1-u*.76)
                pts.append((cx+math.cos(t)*radius,cy+.018+math.sin(t)*radius*.62,cz-.022+u*.025))
            sweep(a,'Directional sculpted curl',pts,.044*size,'curlLight' if i%6==0 else 'hairB',head,depth=.72,sides=10)
        for x,y,z,r in [(-.228,2.042,-.142,.67),(-.136,2.090,-.180,.91),(-.045,2.039,-.224,1.10),(.061,2.105,-.181,.82),(.187,2.049,-.151,.71)]:
            pts=curve_points([(x-.040*r,y+.018*r,z+.070),(x-.060*r,y+.071*r,z+.012),(x+.025*r,y+.074*r,z-.012),(x+.054*r,y+.023*r,z-.005),(x+.028*r,y-.008*r,z+.015),(x+.003*r,y+.014*r,z+.035)],18)
            sweep(a,'Swept fringe curl',pts,.037*r,'hairB',head,depth=.96,sides=8)
        for x,y,z in [(-.205,2.11,-.129),(-.103,2.15,-.186),(.005,2.16,-.19),(.122,2.13,-.17),(.219,2.087,-.10)]:
            pts=curve_points([(x-.051,y,z+.020),(x-.025,y+.018,z-.037),(x+.035,y-.012,z-.068),(x+.040,y-.073,z-.063),(x+.005,y-.083,z-.046)],17)
            sweep(a,'Front crown curl',pts,.039,'hairB',head,depth=.91,sides=8)
        for side in (-1,1):
            hair_lock(a,head,'Tapered sideburn',[(side*.261,1.98,.012),(side*.29,1.84,.008),(side*.279,1.76,.003)],.030,.5,'hairB')
        return
    # A close-fitting crown supports eight curved layers. The visible silhouette
    # stays about 12 percent narrower than the former curtain-like sheets.
    verts=[];faces=[];columns=40;rings=22
    for row in range(rings):
        u=row/(rings-1);y=2.12-u*1.11
        for col in range(columns):
            q=col/(columns-1);angle=.96+q*(math.tau-1.92)
            cap=math.sin(min(1,u/.17)*math.pi/2)
            wave=.014*math.sin(u*math.pi*4+q*3.5)+.012*math.cos(q*math.tau*6+u*3)
            width=.292+.016*math.sin(u*math.pi)+wave
            depth=.265+.045*u+.016*math.cos(q*math.tau*6+u*2)
            x=math.sin(angle)*width*cap
            z=.042-math.cos(angle)*(depth+wave*.55)*cap+.045*u*u
            yy=y+.032*math.sin(q*19)*u**6
            verts.append((x,yy,z))
            if row and col:faces.append(((row-1)*columns+col-1,(row-1)*columns+col,row*columns+col,row*columns+col-1))
    mantle=a.mesh('Contoured blonde hair foundation',verts,faces,'hairN',head)
    mod=mantle.modifiers.new('Hair mass thickness','SOLIDIFY');mod.thickness=.020
    bpy.context.view_layer.objects.active=mantle;bpy.ops.object.modifier_apply(modifier=mod.name)
    # A continuous scalp-following crown closes the gaps between swept roots.
    # It sits beneath the outer locks and keeps three-quarter views solid.
    crown=[];cf=[];cols=40;rings=12
    scalp=[(1.87,.285,.255,.035),(1.94,.265,.250,.035),(2.01,.202,.200,.036),
           (2.07,.105,.120,.036),(2.115,.035,.040,.035),(2.137,.002,.003,.035)]
    for j in range(rings):
        u=j/(rings-1)
        for i in range(cols):
            angle=i/cols*math.tau;c=math.cos(angle);edge=1.87+.205*max(0,c)**3
            y=2.137-u*(2.137-edge)
            width,depth,center=[interpolate(scalp,y,k) for k in (1,2,3)]
            crown.append((math.sin(angle)*width,y,center-c*depth))
            if j:cf.append(((j-1)*cols+i,(j-1)*cols+(i+1)%cols,j*cols+(i+1)%cols,j*cols+i))
    a.mesh('Continuous swept-root crown',crown,cf,'hairN',head)
    locks=[
        ('Left swept fringe',[(-.015,2.118,-.09),(-.11,2.10,-.23),(-.235,2.005,-.269),(-.272,1.84,-.279),(-.302,1.69,-.281),(-.264,1.59,-.259)],.056,.68,'hairGold'),
        ('Left outer S wave',[(-.05,2.105,-.025),(-.233,1.99,-.13),(-.299,1.79,-.11),(-.272,1.61,-.12),(-.324,1.42,-.09),(-.278,1.23,-.07),(-.321,1.08,-.035)],.057,.60,'hairN'),
        ('Left layered shoulder curl',[(-.23,1.97,-.18),(-.284,1.78,-.222),(-.256,1.58,-.23),(-.313,1.43,-.24),(-.278,1.25,-.20),(-.320,1.08,-.16),(-.287,.96,-.075)],.047,.63,'hairGold'),
        ('Right swept fringe',[(.020,2.105,-.065),(.14,2.075,-.22),(.25,1.94,-.25),(.284,1.77,-.277),(.245,1.62,-.260)],.055,.65,'hairGold'),
        ('Right outer S wave',[(.07,2.10,0),(.235,1.99,-.08),(.300,1.81,-.06),(.273,1.60,-.09),(.320,1.40,-.05),(.286,1.21,0),(.328,1.04,.06)],.058,.60,'hairN'),
        ('Right layered shoulder curl',[(.225,1.98,-.15),(.272,1.83,-.215),(.258,1.63,-.223),(.313,1.47,-.235),(.282,1.30,-.213),(.319,1.12,-.193),(.274,1.00,-.155)],.048,.62,'hairGold'),
        ('Left back cascade',[(.01,2.10,.09),(-.09,1.99,.28),(-.135,1.79,.32),(-.085,1.57,.35),(-.15,1.34,.36),(-.09,1.12,.35),(-.13,1.01,.32)],.083,.55,'hairN'),
        ('Right back cascade',[(.06,2.10,.09),(.16,1.96,.23),(.21,1.76,.30),(.145,1.53,.34),(.205,1.30,.36),(.17,1.08,.35)],.082,.56,'hairGold'),
    ]
    for name,controls,width,depth,mat in locks:hair_lock(a,head,name,controls,width,depth,mat)
    # Match the measured requested 10-15 percent silhouette reduction in world space.
    for obj in head.children:
        if obj.type=='MESH' and any(m and m.name in ('hairN','hairGold') for m in obj.data.materials):obj.scale.x*=1.11


def make_person(nina,parent,p,a):
    root=a.group('Nina' if nina else 'Barron',parent,p);skin='skinN' if nina else 'skinB';shirt='ninaShirt' if nina else 'shirt'
    rows=[(.535,.246 if nina else .269,.168,.018),(.66,.247 if nina else .28,.171,.016),
          (.87,.266 if nina else .316,.183,.012),(1.045,.301 if nina else .355,.182,.012),
          (1.17,.276 if nina else .326,.154,.025),(1.245,.169 if nina else .19,.117,.026),(1.27,.118,.092,.025)]
    torso=loft(a,'Tailored shirt body',rows,shirt,root,32,24);garment=[torso]
    for side in (-1,1):
        start=(side*(.195 if nina else .227),1.078,.018)
        middle=(side*(.282 if nina else .315),1.047,-.007)
        end=(side*(.338 if nina else .388),.975,-.031)
        garment.append(limb(a,'Integrated short sleeve',[start,middle,end],[.102 if nina else .113,.112 if nina else .122,.103 if nina else .114],shirt,root,depth=1.04,segments=16))
    weld_cloth(a,'Continuous coral T shirt' if nina else 'Continuous linen camp shirt',garment,root)
    if nina:
        a.ring('Soft crew neckline',(0,1.266,.025),.116,.008,shirt,root,'xz',28)
    else:
        a.mesh('Open neckline',[(-.100,1.283,-.091),(.100,1.283,-.091),(.061,1.165,-.180),(0,1.083,-.199),(-.061,1.165,-.180)],[(0,1,2,3,4)],skin,root,False)
        for side in (-1,1):
            collar=a.mesh('Soft camp collar',[(side*.089,1.273,-.099),(side*.163,1.208,-.151),(side*.128,1.121,-.200),(side*.040,1.154,-.192)],[(0,1,2,3)],shirt,root)
            mod=collar.modifiers.new('Rolled collar thickness','SOLIDIFY');mod.thickness=.009
            bpy.context.view_layer.objects.active=collar;bpy.ops.object.modifier_apply(modifier=mod.name)
            mod=collar.modifiers.new('Soft collar edge','BEVEL');mod.width=.005;mod.segments=2
            bpy.ops.object.modifier_apply(modifier=mod.name)
        a.path('Gold chain',[(-.086,1.225,-.137),(0,1.145,-.187),(.086,1.225,-.137)],.004,'gold',root)
        a.path('Button placket',[(.009,.57,-.154),(.009,.83,-.182),(.009,1.075,-.185)],.0045,shirt,root)
        for y in (.67,.81,.95):a.ell('Linen button',(.012,y,-.186),(.009,.009,.005),'cream',root,10,6)
    shorts='linen' if nina else 'shorts'
    pelvis=loft(a,'Soft shorts hips',[(.32,.207,.135,-.033),(.40,.272,.193,-.047),(.51,.264,.173,.0),(.568,.246,.165,.013)],shorts,root,28,14)
    pants=[pelvis]
    for side in (-1,1):
        pants.append(limb(a,'Seated cloth thigh',[(side*.144,.449,-.07),(side*.165,.412,-.247),(side*.176,.382,-.402)],[.158,.147,.132],shorts,root,depth=1.05,segments=16))
        limb(a,'Shaped thigh and calf',[(side*.177,.379,-.37),(side*.178,.315,-.59),(side*.182,.221,-.650),(side*.182,-.29 if nina else -.109,-.70)],[.106 if nina else .116,.105 if nina else .113,.084,.057],skin,root,depth=.93,segments=14)
        a.box('Sandal sole',(side*.182,-.363 if nina else -.184,-.764),(.195,.043,.34),'seam',root,.022)
        a.ell('Foot',(side*.182,-.318 if nina else -.139,-.759),(.083,.047,.146),skin,root,16,10)
        a.path('Sandal strap',[(side*.182-.079,-.306 if nina else -.127,-.822),(side*.182,-.269 if nina else -.090,-.817),(side*.182+.079,-.306 if nina else -.127,-.822)],.014,'cream' if nina else 'rubber',root)
    weld_cloth(a,'Continuous seated shorts',pants,root,.016)
    a.path('Cloth waistband',[(-.238,.551,-.037),(0,.567,-.160),(.238,.551,-.037)],.009,shorts,root)
    if nina:a.ell('Shorts button',(0,.53,-.178),(.012,.012,.005),'cream',root,10,6)
    make_head(a,root,nina)
    # Shoulder pivots remain compatible with the existing runtime animation.
    arm=a.group('PointingArm' if nina else 'DrivingArm',root,(.315 if nina else .350,1.046,-.026))
    if nina:
        limb(a,'Pointing arm',[(.019,-.075,.0),(.158,-.078,-.118),(.278,.077,-.297)],[.080,.077,.046],skin,arm,depth=.93,segments=14)
        make_hand(a,arm,(.278,.077,-.297),(.52,.43,-1),skin,True)
    else:
        limb(a,'Driving arm',[(.042,-.08,-.006),(.091,-.252,-.216),(-.181,-.283,-.510)],[.088,.083,.047],skin,arm,depth=.94,segments=14)
        make_hand(a,arm,(-.181,-.283,-.510),(-.3,-.35,-1),skin)
    wrist=(-.32,.64,-.373 if nina else -.626)
    limb(a,'Relaxed left arm',[(-.332 if nina else -.378,1.001,-.034),(-.390 if nina else -.424,.803,-.115),wrist],[.080 if nina else .09,.077 if nina else .083,.044 if nina else .048],skin,root,depth=.94,segments=14)
    make_hand(a,root,wrist,(.1,-.50,-1),skin)
    return root
