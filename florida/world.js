import * as T from 'three';
import { C, mat, bake, box, ball, pipe, palm, mansion, yacht, dock, buoy, fisheries, bridge, textSign } from './art.js';
import { center, halfWidth, CHECKPOINTS, COURSE_LENGTH } from './core.js';

function terrain(s, side) {
  const group = new T.Group(), vertices = [], indices = [];
  for(let i=0;i<=5;i++){
    const at=s-52+i*21, c=center(at), w=halfWidth(at);
    vertices.push(c+side*w,.48,-at,c+side*(w+130),.48,-at);
    if(i<5){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}
    if(i<5)pipe(group,[c+side*w,.38,-at],[center(at+21)+side*halfWidth(at+21),.38,-at-21],.34,0xc9ccb1,6);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,mat(0x8bb879,{side:T.DoubleSide}));mesh.receiveShadow=true;group.add(mesh);
  return group;
}

export function makeWorld(scene) {
  const chunks=[];
  for(let i=-1;i<39;i++){
    const s=i*100, chunk=new T.Group();
    for(const side of [-1,1]) {
      chunk.add(terrain(s,side));
      // Keep the landmark's own marina clear of generic houses.
      const isMarina=side===1&&s>3350;
      if(!isMarina&&s<3570){
        const h=mansion(Math.abs(i*3+(side+1)));h.position.set(center(s)+side*(halfWidth(s)+14),.35,-s);h.rotation.y=-side*Math.PI/2;chunk.add(h);
        for (const offset of [-33,33]) {const h2=mansion(Math.abs(i*7+offset));h2.position.set(center(s+offset)+side*(halfWidth(s+offset)+14),.35,-s-offset);h2.rotation.y=-side*Math.PI/2;chunk.add(h2)}
        const d=dock(13);d.rotation.y=Math.PI/2;d.position.set(center(s+27)+side*(halfWidth(s+27)-4),0,-s-27);chunk.add(d);
        if(i%2===0){const y=yacht(.78+(Math.abs(i)%3)*.14);y.position.set(center(s+32)+side*(halfWidth(s+32)-9),0,-s-33);y.rotation.y=.06*Math.sin(i);chunk.add(y)}
      }
      for(let p=0;p<5;p++){
        const ps=s-35+p*20,pal=palm(i*3+p, .72+((p+Math.abs(i))%4)*.13);
        pal.position.set(center(ps)+side*(halfWidth(ps)+(p%2===0?3.7:31)),.5,-ps);pal.rotation.y=i+p;chunk.add(pal);
      }
      for(let p=0;p<4;p++){const ps=s-35+p*27;ball(chunk,center(ps)+side*(halfWidth(ps)+2),.94,-ps,1.2,.8,2.1,0x6fa35e,1)}
      if(i%3===0&&i>0){
        for(let j=0;j<3;j++){
          const tall=12+(j*7+Math.abs(i)*3)%28, xx=center(s)+side*(halfWidth(s)+71+j*18);
          box(chunk,12,tall,15,j%2?0xd4e1d5:0xe7dfca,xx,tall/2+.5,-s);
          for(let yy=3;yy<tall;yy+=3.5)box(chunk,12.2,.8,15.2,0x9bb9b2,xx,yy,-s);
        }
      }
    }
    const baked=bake(chunk);baked.userData.s=s;scene.add(baked);chunks.push(baked);
  }
  const gates=[];
  for(const [i,s] of CHECKPOINTS.entries()) {
    for(const side of [-1,1]){const b=buoy(side<0?C.coral:0x6bab64,true);b.position.set(center(s)+side*15,.05,-s);scene.add(b);gates.push({mesh:b,s})}
    const sign=textSign(`CHECKPOINT ${i+1}`,14,1.6,{bg:'#fff4d8',color:'#143f4c',border:null,font:'900 84px Nunito'});sign.position.set(center(s),5,-s);scene.add(sign);gates.push({mesh:sign,s});
    // Gate ropes/flags are deliberately high enough to pass beneath.
    const g=new T.Group();for(const side of [-1,1])pipe(g,[center(s)+side*15,0,-s],[center(s)+side*15,7,-s],.075,C.cream);pipe(g,[center(s)-15,7,-s],[center(s)+15,7,-s],.025,C.cream);const b=bake(g);scene.add(b);gates.push({mesh:b,s});
  }
  for(let s=80,i=0;s<COURSE_LENGTH;s+=72,i++)for(const side of [-1,1]){
    const b=buoy(side<0?C.coral:0x79b264);b.position.set(center(s)+side*(halfWidth(s)-4),0,-s);scene.add(b);gates.push({mesh:b,s});
  }
  const restaurant=fisheries();restaurant.position.set(center(3470)+halfWidth(3470)+6,0,-3470);restaurant.rotation.y=-.55;scene.add(restaurant);
  const mainBridge=bridge(155);mainBridge.position.set(center(COURSE_LENGTH),0,-COURSE_LENGTH);scene.add(mainBridge);
  const marinaYacht=bake(yacht(1.25));marinaYacht.position.set(center(3500)+halfWidth(3500)-12,0,-3508);marinaYacht.rotation.y=.3;scene.add(marinaYacht);

  // Low sculpted clouds, spaced along the race rather than a flat image sky.
  const clouds=[];
  for(let i=0;i<18;i++){
    const s=i*250, g=new T.Group();
    for(let j=0;j<4;j++)ball(g,(j-1.5)*13,Math.sin(j*2)*3,Math.cos(j)*3,13+j%2*4,5+j%2*3,7,0xf8f6e5,1);
    const b=bake(g);b.position.set(Math.sin(i*6)*230,68+(i%3)*13,-s-180);scene.add(b);clouds.push({mesh:b,s});
  }
  return {update(s){
    for(const c of chunks)c.visible=c.userData.s>s-150&&c.userData.s<s+560;
    for(const g of gates)g.mesh.visible=g.s>s-65&&g.s<s+430;
    for(const c of clouds)c.mesh.visible=c.s>s-300&&c.s<s+650;
    restaurant.visible=s>2950;mainBridge.visible=s>3000;marinaYacht.visible=s>3020;
  }};
}

export function makeWater(scene) {
  const uniforms={uTime:{value:0},uSpf:{value:0}};
  const water=new T.Mesh(new T.PlaneGeometry(1800,1400,170,145).rotateX(-Math.PI/2),new T.ShaderMaterial({
    uniforms,transparent:false,vertexShader:`
      uniform float uTime; varying vec3 vWorld; varying vec3 vNormal;
      void main(){
        vec3 p=position; vec3 world=(modelMatrix*vec4(p,1.0)).xyz;
        float a=world.x*.23+world.z*.19+uTime*1.3;
        float b=world.x*.53-world.z*.26+uTime*1.9;
        p.y+=sin(a)*.19+sin(b)*.075;
        vNormal=normalize(vec3(-cos(a)*.0437-cos(b)*.03975,1.,-cos(a)*.0361+cos(b)*.0195));
        vWorld=(modelMatrix*vec4(p,1.)).xyz;
        gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
      }`,fragmentShader:`
      uniform float uTime; varying vec3 vWorld; varying vec3 vNormal;
      void main(){
        vec3 viewDir=normalize(cameraPosition-vWorld);
        float fresnel=pow(1.-max(dot(viewDir,vNormal),0.),3.);
        float ripple=sin(vWorld.x*1.83+sin(vWorld.z*.88+uTime*.7))*sin(vWorld.z*1.62-vWorld.x*.22+uTime*1.1);
        float cross=sin(vWorld.z*.83+vWorld.x*.57+uTime)*sin(vWorld.x*.65-vWorld.z*.61-uTime*.6);
        vec3 deep=vec3(.001,.105,.14), shallow=vec3(.005,.27,.255);
        vec3 c=mix(deep,shallow,.52+ripple*.12+cross*.14);
        c=mix(c,vec3(.25,.58,.65),fresnel*.52);
        float spark=pow(max(dot(reflect(-normalize(vec3(-.4,1.,.25)),vNormal),viewDir),0.),95.);
        float threads=smoothstep(.9,.99,ripple)*.085+smoothstep(.94,1.,cross)*.06;
        c+=vec3(.55,.73,.64)*threads+vec3(1.,.88,.64)*spark*.7;
        float fog=smoothstep(210.,650.,distance(cameraPosition,vWorld));
        gl_FragColor=vec4(mix(c,vec3(.45,.69,.72),fog),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  water.frustumCulled=false;water.position.y=.035;scene.add(water);
  return {mesh:water,update(s,t){uniforms.uTime.value=t;water.position.z=-s;water.position.x=center(s)}};
}

export function makeSky(scene){
  const sky=new T.Mesh(new T.SphereGeometry(1000,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:`varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vPos;void main(){float h=normalize(vPos).y;vec3 color=mix(vec3(.49,.73,.77),vec3(.02,.3,.53),smoothstep(-.01,.65,h));gl_FragColor=vec4(color,1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include')}));
  scene.add(sky);return sky;
}

export function makeWake(scene){
  const geo=new T.CircleGeometry(1,7).rotateX(-Math.PI/2), material=new T.MeshBasicMaterial({color:0xe2f6e9,transparent:true,opacity:.5,depthWrite:false});
  const count=150, mesh=new T.InstancedMesh(geo,material,count);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh);
  const dummy=new T.Object3D(), history=[];
  return {reset(){history.length=0},update(race,t){
    if(race.speed>2&&race.y<1.2&&race.status==='racing')history.unshift({x:center(race.s)+race.x,z:-race.s+2,t});
    while(history.length>75)history.pop();
    for(let i=0;i<count;i++){
      const h=history[Math.floor(i/2)],age=h?t-h.t:100,side=i%2?1:-1;
      if(!h||age>3.5){dummy.scale.setScalar(0)}else{
        dummy.position.set(h.x+side*(1.12+age*2.25),.16,-0.2+h.z+age*.5);dummy.rotation.y=Math.sin(i*2)*.9;
        const size=(.3+age*.95)*(1-age/3.5);dummy.scale.set(size,.95,size*.6);
      }dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }mesh.instanceMatrix.needsUpdate=true;
  }};
}
