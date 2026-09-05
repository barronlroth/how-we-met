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


def make_head(a,parent,nina):
    skin='skinN' if nina else 'skinB';hair='hairN' if nina else 'hairB'
    head=a.group('NinaHead' if nina else 'BarronHead',parent)
    # A continuous chin/jaw/cheek/forehead surface, with the nose sculpted into it.
    rows=([(1.33,.045,.065,-.014),(1.37,.126,.134,-.007),(1.45,.209,.193,.0),
           (1.56,.270,.239,.008),(1.70,.278,.247,.016),(1.85,.277,.244,.027),
           (1.97,.240,.224,.037),(2.04,.125,.128,.04),(2.064,.008,.01,.04)] if nina else
          [(1.305,.06,.076,-.012),(1.35,.146,.153,-.012),(1.42,.215,.192,-.003),
           (1.56,.266,.229,.008),(1.70,.268,.241,.013),(1.84,.280,.250,.023),
           (1.965,.243,.222,.034),(2.035,.129,.13,.04),(2.06,.01,.012,.04)])
    def displace(x,y):
        g=lambda cx,cy,wx,wy:math.exp(-((x-cx)/wx)**2-((y-cy)/wy)**2)
        nose=-.021*g(0,1.725,.034,.105)-(.039 if nina else .047)*g(0,1.65,.056,.037)
        nose-=.017*(g(-.044,1.638,.021,.023)+g(.044,1.638,.021,.023))
        # Raised smile cheeks, a shaped muzzle and soft nasolabial folds.
        cheeks=-.018*(g(-.178,1.585,.075,.081)+g(.178,1.597,.075,.081))
        muzzle=-.003*g(0,1.518,.12,.064)
        dimples=.010*(g(-.165,1.547,.023,.04)+g(.167,1.56,.023,.04))
        sockets=.023*(g(-.126,1.768,.094,.062)+g(.126,1.778,.094,.062))
        brow=-.017*(g(-.123,1.842,.102,.034)+g(.123,1.850,.102,.034))
        chin=-.018*g(0,1.391,.082,.038)
        return nose+cheeks+muzzle+dimples+sockets+brow+chin
    def front(x,y):
        w,d,z=[interpolate(rows,y,c) for c in (1,2,3)]
        cosine=math.sqrt(max(0,1-(x/max(w,.01))**2))
        return z-cosine*d+displace(x,y)*cosine**5
    verts=[];faces=[];segments=52;rings=37
    for row in range(rings):
        y=rows[0][0]+(rows[-1][0]-rows[0][0])*row/(rings-1)
        w,d,z=[interpolate(rows,y,c) for c in (1,2,3)]
        for i in range(segments):
            angle=i/segments*math.tau;c=math.cos(angle);x=math.sin(angle)*w
            verts.append((x,y,z-c*d+displace(x,y)*max(0,c)**5))
            if row:faces.append(((row-1)*segments+i,(row-1)*segments+(i+1)%segments,row*segments+(i+1)%segments,row*segments+i))
    faces.extend([tuple(reversed(range(segments))),tuple(range((rings-1)*segments,rings*segments))])
    face_mat='faceN' if nina else 'faceB'
    surface=a.mesh('Sculpted textured face',verts,faces,face_mat,head)
    surface.data.materials.append(a.M[skin])
    # Planar facial UV coordinates become the front hemisphere of a full sculpted head.
    # Back hemisphere and ears remain matched skin; no reference photograph is projected.
    uv=surface.data.uv_layers.new(name='FaceUV')
    anchors=[(1.30,.015),(1.39,.08),(1.49,.275 if nina else .285),(1.52,.315),(1.65,.40),
             (1.774,.601 if nina else .619),(1.86,.746),(2.064,1.0)]
    def face_uv(x,y):
        return ((.5 if nina else 0)+(.5+x/.64)*.5,interpolate(anchors,y,1))
    for poly in surface.data.polygons:
        if sum(verts[v][2] for v in poly.vertices)/len(poly.vertices)>.035:poly.material_index=1
        for loop_i in poly.loop_indices:
            x,y,z=verts[surface.data.loops[loop_i].vertex_index]
            uv.data[loop_i].uv=face_uv(x,y)
    a.ell('Neck',(0,1.24,.027),(.113,.18,.105),skin,parent,16,10)
    for side in (-1,1):
        a.ell('Sculpted ear',(side*.286,1.669,.027),(.046,.089,.044),skin,head,16,10)
        a.path('Ear fold',[(side*.302,1.707,-.008),(side*.316,1.67,-.018),(side*.30,1.638,-.012)],.009,'lipsN' if nina else 'lipsB',head)
        if nina:a.ring('Gold hoop',(side*.318,1.585,.012),.05,.007,'gold',head,n=24)
        else:a.ell('Ear stud',(side*.324,1.614,-.012),(.012,.013,.009),'chrome',head,10,6)
    # Shallow glossy eye lenses share the atlas mapping; lids and expression belong to the
    # continuous sculpted skin, avoiding assembled white spheres and contour-ring geometry.
    for side in (-1,1):
        x=side*(.126 if nina else .123);y=1.774
        ev=[(x,y,front(x,y)-.006)];ef=[];steps=20
        for k in range(1,4):
            r=k/3
            for j in range(steps):
                t=j/steps*math.tau;dx=.080*math.cos(t)*r;dy=.039*math.sin(t)*r
                ev.append((x+dx,y+dy,front(x+dx,y+dy)-.002-.004*(1-r*r)))
                if k==1:ef.append((0,1+(j+1)%steps,1+j))
                else:
                    lo=1+(k-2)*steps;hi=1+(k-1)*steps
                    ef.append((lo+j,lo+(j+1)%steps,hi+(j+1)%steps,hi+j))
        eye=a.mesh('Glossy painted eye',ev,ef,'eyeN' if nina else 'eyeB',head)
        uv=eye.data.uv_layers.new(name='FaceUV')
        for poly in eye.data.polygons:
            for li in poly.loop_indices:
                xx,yy,zz=ev[eye.data.loops[li].vertex_index];uv.data[li].uv=face_uv(xx,yy)
    make_hair(a,head,nina)
    # Place the pivot inside the head instead of rotating the entire face around the seat.
    for child in head.children:child.location.z-=1.67
    head.location.z=1.67
    head.rotation_euler.z=.10 if nina else -.07
    head.rotation_euler.y=-.075 if nina else .085
    head.scale=(.90,.90,.90)
    return head


def make_hair(a,head,nina):
    if not nina:
        # A connected dome supplies the silhouette, with overlapping solid curl lobes.
        a.ell('Dense sculpted curl mass',(0,2.016,.062),(.303,.202,.261),'hairB',head,24,14)
        rng=random.Random(305)
        for i in range(24):
            angle=i*2.39996;r=math.sqrt((i+.45)/24)
            xx=math.cos(angle)*.283*r;zz=.058+math.sin(angle)*.241*r
            yy=2.03+.169*math.sqrt(max(0,1-r*r))
            scale=rng.uniform(.75,1.3);phase=rng.uniform(-.8,.8)
            # Sweep the curl across and over the scalp. Its filled lobe prevents loop-like holes.
            a.ell('Overlapping curl volume',(xx,yy,zz),(.079*scale,.065*scale,.071*scale),'hairB',head,12,8)
            pts=[]
            for j in range(15):
                u=j/14;t=phase+u*math.pi*1.67;radius=.059*scale*(1-u*.69)
                pts.append((xx+math.cos(t)*radius,yy+.029+math.sin(t)*radius*.63,zz-.041+u*.045))
            sweep(a,'Rolled curl ridge',pts,.024*scale,'curlLight' if i%5==0 else 'hairB',head,depth=.65,sides=7)
        for i,(x,y,z,scale) in enumerate([(-.22,2.025,-.119,.82),(-.13,2.096,-.176,1.1),(-.018,2.075,-.207,1.25),(.096,2.04,-.213,1.0),(.205,2.025,-.127,.78)]):
            a.ell('Forelock body',(x,y,z),(.075*scale,.075*scale,.061*scale),'hairB',head,12,8)
            pts=curve_points([(x-.034,y+.013,z),(x-.009,y+.064,z-.028),(x+.05,y+.043,z-.05),(x+.055,y-.024,z-.060),(x+.009,y-.056,z-.069),(x-.01,y-.021,z-.072)],20)
            sweep(a,'Swept forehead curl',pts,.026*scale,'hairB',head,depth=.75,sides=7)
        for side in (-1,1):
            sweep(a,'Shaped sideburn',curve_points([(side*.26,2.001,.001),(side*.286,1.858,.002),(side*.271,1.75,.001)],14),.040,'hairB',head,depth=.5)
        return
    # One broad continuous hair mantle; waves deform the mass instead of detached ropes.
    verts=[];faces=[];columns=56;rows=24
    for row in range(rows):
        u=row/(rows-1)
        y=2.11-u*1.20
        for col in range(columns):
            q=col/(columns-1);theta=.85+q*(math.tau-1.70)
            scalp=math.sin(min(1,u/.24)*math.pi/2)
            width=.326+.040*math.sin(u*math.pi)+.070*math.sin(u*math.pi*3-.6)
            depth=.288+.03*u
            # Large travelling waves, with a little finer relief flowing down the surface.
            wave=.031*math.sin(u*math.pi*3.1+q*2.2)+.007*math.cos(q*math.tau*16+u*3)
            x=math.sin(theta)*(width+wave)*scalp
            z=.045-math.cos(theta)*(depth+wave*.5)*scalp+.09*u*u
            yy=y+(.045*math.sin(q*math.pi*7)+.020*math.cos(q*29))*u**5
            verts.append((x,yy,z))
            if row and col:faces.append(((row-1)*columns+col-1,(row-1)*columns+col,row*columns+col,row*columns+col-1))
    mantle=a.mesh('Continuous wavy hair mantle',verts,faces,'hairN',head)
    # Wide rolling S-curves expand over the shoulders and turn back into curled tips.
    for side in (-1,1):
        for j in range(2):
            spread=j*.052;asym=.035 if side==1 else 0
            controls=[(side*(.014+j*.02),2.098,-.105+j*.025),(side*(.15+j*.03),2.068,-.228+j*.025),
                      (side*(.295+spread),1.866,-.197+j*.025),(side*(.33+spread),1.66,-.185+j*.045),
                      (side*(.46+spread+asym),1.405,-.118+j*.035),(side*(.36+spread),1.17,-.142+j*.04),
                      (side*(.465+spread-asym),.968,-.038+j*.04),(side*(.39+spread),.82+j*.06,.055),
                      (side*(.32+spread),.89+j*.065,.074)]
            pts=curve_points(controls,40)
            sweep(a,'Rolling blonde wave',pts,.084 if j==0 else .079,'hairN',head,depth=.72,sides=8)
            # Highlights broaden through the lower waves; roots retain the darker golden base.
            for offset,width in [(-.022,.008),(.024,.011)]:
                sweep(a,'Golden wave highlight',[(p[0]+offset,p[1]+.003,p[2]-.046) for p in pts[4:]],width,'hairGold',head,depth=.24,sides=5)
    for i in range(10):
        q=(i+.5)/10;theta=.70+q*(math.tau-1.40);pts=[]
        for j in range(24):
            u=.08+j/23*.90;scalp=math.sin(min(1,u/.24)*math.pi/2)
            width=.326+.040*math.sin(u*math.pi)+.070*math.sin(u*math.pi*3-.6)
            wave=.031*math.sin(u*math.pi*3.1+q*2.2)
            pts.append((math.sin(theta)*(width+wave+.005)*scalp,2.11-u*1.20,.045-math.cos(theta)*(.293+.03*u+wave*.5)*scalp+.09*u*u))
        sweep(a,'Mantle highlight',pts,.0035,'hairGold',head,depth=.25,sides=5)


def make_person(nina,parent,p,a):
    root=a.group('Nina' if nina else 'Barron',parent,p);skin='skinN' if nina else 'skinB'
    shirt='ninaShirt' if nina else 'shirt'
    rows=[(.52,.245,.158,.018),(.62,.235 if nina else .267,.163,.018),(.83,.247 if nina else .298,.177,.01),
          (1.02,.281 if nina else .329,.174,.006),(1.13,.284 if nina else .324,.153,.02),(1.19,.233 if nina else .270,.128,.025),(1.25,.115,.10,.025)]
    loft(a,'Tailored coral T shirt' if nina else 'Soft linen shirt',rows,shirt,root,28,18)
    if nina:
        a.ring('Crew neckline',(0,1.248,.025),.112,.012,shirt,root,'xz',28)
    else:
        a.mesh('Open neckline',[(-.081,1.246,-.088),(.081,1.246,-.088),(0,1.051,-.185)],[(0,1,2)],skin,root,False)
        for side in (-1,1):
            a.mesh('Camp collar',[(side*.071,1.25,-.085),(side*.154,1.195,-.155),(side*.117,1.103,-.190),(side*.028,1.139,-.168)],[(0,1,2,3)],shirt,root)
        a.path('Gold chain',[(-.08,1.208,-.138),(0,1.138,-.186),(.08,1.208,-.138)],.005,'gold',root)
        a.path('Button placket',[(.012,.57,-.145),(.012,.83,-.18),(.012,1.052,-.184)],.006,shirt,root)
        for y in (.67,.81,.95):a.ell('Linen button',(.014,y,-.182),(.011,.011,.005),'cream',root,10,6)
    for side in (-1,1):
        # A tapered sleeve grows out of the shoulder and follows the upper-arm axis.
        # Its crown is inside the torso; the outside contour slopes down to an open cuff.
        start=Vector((side*(.208 if nina else .247),1.081,.015))
        end=Vector((side*(.348 if nina else .38),.984,-.026))
        axis=(end-start).normalized();up=Vector((side*abs(axis.y),abs(axis.x),0)).normalized()
        front=axis.cross(up).normalized();sv=[];sf=[];n=20
        profiles=[(0,.125),(.35,.122),(.78,.106),(.94,.103),(1,.106)]
        for row,(t,r) in enumerate(profiles):
            center=start.lerp(end,t)
            for i in range(n):
                angle=i/n*math.tau
                sv.append(tuple(center+up*(math.cos(angle)*r)+front*(math.sin(angle)*r*1.08)))
                if row:sf.append(((row-1)*n+i,(row-1)*n+(i+1)%n,row*n+(i+1)%n,row*n+i))
        sf.append(tuple(reversed(range(n))))
        a.mesh('Sloping short sleeve with open cuff',sv,sf,shirt,root)
        a.path('Cloth fold',[(side*.17,.55,-.145),(side*.18,.62,-.156),(side*.20,.71,-.164)],.006,shirt,root)
        a.box('Linen shorts' if nina else 'Teal shorts',(side*.167,.44,-.096),(.30,.27,.43),'linen' if nina else 'shorts',root,.068)
        a.path('Seated calf',[(side*.167,.405,-.12),(side*.172,.35,-.49),(side*.178,.26,-.63),(side*.18,-.11,-.69)],.097 if nina else .112,skin,root,radii=[1.12,1,.82,.61])
        a.box('Sandal sole',(side*.18,-.184,-.76),(.21,.053,.37),'seam',root,.03)
        a.ell('Foot',(side*.18,-.133,-.756),(.089,.056,.16),skin,root,16,10)
        a.path('Sandal strap',[(side*.18-.088,-.13,-.82),(side*.18,-.079,-.81),(side*.18+.088,-.13,-.82)],.018,'cream' if nina else 'rubber',root)
    if nina:
        a.path('Shorts waistband',[(-.247,.548,-.06),(0,.56,-.205),(.247,.548,-.06)],.013,'linen',root)
        a.ell('Shorts button',(0,.53,-.222),(.014,.014,.006),'cream',root,10,6)
    make_head(a,root,nina)
    arm=a.group('PointingArm' if nina else 'DrivingArm',root,(.30,1.08,-.025))
    if nina:
        a.path('Pointing forearm',[(.03,-.05,0),(.20,.005,-.16),(.37,.22,-.38)],.069,skin,arm,radii=[1,.95,.68])
        a.ell('Hand',(.38,.235,-.42),(.054,.048,.079),skin,arm,16,10)
        a.path('Index finger',[(.39,.25,-.46),(.45,.296,-.56),(.472,.31,-.592)],.017,skin,arm,radii=[1,.86,.5])
        a.path('Curled fingers',[(.36,.226,-.454),(.367,.213,-.485),(.40,.22,-.48)],.018,skin,arm)
    else:
        a.path('Steering forearm',[(.04,-.09,-.01),(.08,-.26,-.24),(-.15,-.30,-.53)],.077,skin,arm,radii=[1,.91,.66])
        a.ell('Hand at wheel',(-.15,-.30,-.56),(.058,.055,.079),skin,arm,16,10)
    a.path('Relaxed left arm',[(-.31,1.014,-.03),(-.383,.80,-.12),(-.31,.62,-.38 if nina else -.63)],.075,skin,root,radii=[1.03,.92,.65])
    a.ell('Left hand',(-.31,.62,-.40 if nina else -.66),(.058,.047,.082),skin,root,16,10)
    return root
