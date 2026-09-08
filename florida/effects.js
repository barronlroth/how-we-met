import * as T from 'three';
import {pointAt} from './course.js';
import {WATER_SHOT} from './core.js';
import {makeDestructionEffects} from './destruction-effects.js';
import {makeHullContactFoam} from './hull-foam.js';
let foamTexture;
export async function loadEffectArt(){foamTexture=await new T.TextureLoader().loadAsync(new URL('./assets/textures/boat-foam-v1.png',import.meta.url).href);foamTexture.colorSpace=T.SRGBColorSpace;foamTexture.anisotropy=8}
export function makeEffects(scene,{reducedMotion=false,water,boat}={}){
 const destruction=makeDestructionEffects(scene,{reducedMotion});let visualTime=0;
 const contactFoam=boat&&water?makeHullContactFoam(boat,foamTexture,water):null;
 const count=700,positions=new Float32Array(count*3),alpha=new Float32Array(count),sizes=new Float32Array(count),velocities=new Float32Array(count*3),ages=new Float32Array(count).fill(9),life=new Float32Array(count);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('aAlpha',new T.BufferAttribute(alpha,1));geo.setAttribute('aSize',new T.BufferAttribute(sizes,1));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:600}},vertexShader:'attribute float aAlpha;attribute float aSize;varying float vAlpha;uniform float uScale;void main(){vAlpha=aAlpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=min(32.,aSize*uScale/max(1.,-p.z));}',fragmentShader:'varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=smoothstep(1.,.05,d)*vAlpha;gl_FragColor=vec4(.9,1.,.98,a);}' });
 const spray=new T.Points(geo,material);spray.frustumCulled=false;scene.add(spray);let cursor=0,carry=0,wakeTime=0;
 const wakeCount=300,wake=new T.InstancedMesh(new T.PlaneGeometry(1,1,2,8).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xfffcf0,transparent:true,opacity:1,depthWrite:false,side:T.DoubleSide}),wakeCount),dummy=new T.Object3D(),history=[];wake.frustumCulled=false;scene.add(wake);
 wake.material.map=foamTexture;
 const opacity=new Float32Array(wakeCount);wake.geometry.setAttribute('instanceOpacity',new T.InstancedBufferAttribute(opacity,1));
 wake.material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float instanceOpacity;varying float vInstanceOpacity;').replace('#include <begin_vertex>','#include <begin_vertex>\nvInstanceOpacity=instanceOpacity;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vInstanceOpacity;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vInstanceOpacity;')};wake.material.customProgramCacheKey=()=>"broken-wake-v3";
 water?.bindFoam(wake.material);
 function emit(x,y,z,vx,vy,vz,scale,duration){const k=cursor++%count;positions[k*3]=x;positions[k*3+1]=y;positions[k*3+2]=z;velocities[k*3]=vx;velocities[k*3+1]=vy;velocities[k*3+2]=vz;ages[k]=0;life[k]=duration;sizes[k]=scale}
 const shotLimit=Math.ceil(WATER_SHOT.lifetime/WATER_SHOT.cooldown)+1,shotGeometry=new T.SphereGeometry(1,12,8);
 const droplets=new T.InstancedMesh(shotGeometry,new T.MeshBasicMaterial({color:0x3aebff,toneMapped:false}),shotLimit*3),cores=new T.InstancedMesh(shotGeometry,new T.MeshBasicMaterial({color:0xedffff,toneMapped:false}),shotLimit);
 droplets.frustumCulled=cores.frustumCulled=false;droplets.count=cores.count=0;scene.add(droplets,cores);
 const splashes=Array.from({length:8},()=>{const mesh=new T.Mesh(new T.RingGeometry(.73,1,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xc5ffff,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));mesh.visible=false;scene.add(mesh);return{mesh,age:1,duration:.6,radius:1.1}});let splashCursor=0;
 return{reset(){destruction.reset();visualTime=0;history.length=0;ages.fill(9);alpha.fill(0);geo.attributes.aAlpha.needsUpdate=true;opacity.fill(0);wake.geometry.attributes.instanceOpacity.needsUpdate=true;carry=wakeTime=0;droplets.count=cores.count=0;for(const splash of splashes){splash.age=1;splash.mesh.visible=false}},event(event){
  destruction.event(event);
  if(event.type==='shot')for(let i=0;i<9;i++){const side=(Math.random()-.5)*2;emit(event.x,event.y,event.z,event.vx*(7+Math.random()*8)+side,1+Math.random()*2,event.vz*(7+Math.random()*8)+side,.1+Math.random()*.14,.16+Math.random()*.16)}
  if(event.type==='splash'||event.type==='destroy'){
   const destroyed=event.type==='destroy',radius=destroyed?Math.min(6,Math.max(1.8,event.radius||2)):1.1,amount=destroyed?(reducedMotion?28:100):(event.hit?38:22);
   for(let i=0;i<amount;i++){const angle=i*2.4,spread=(2+Math.random()*5)*(destroyed?1.45:1)*(reducedMotion?.5:1);emit(event.x+Math.sin(angle)*radius*(destroyed?.6:0),Math.max(.2,event.y||.5),event.z+Math.cos(angle)*radius*(destroyed?.6:0),Math.sin(angle)*spread,(2+Math.random()*6)*(reducedMotion?.5:1),Math.cos(angle)*spread,.2+Math.random()*(destroyed?.6:.35),.35+Math.random()*(destroyed?.85:.55))}
   const splash=splashes[splashCursor++%splashes.length];splash.age=0;splash.duration=destroyed?.95:.6;splash.radius=radius;splash.mesh.position.set(event.x,.15,event.z);splash.mesh.visible=true;
  }
 },update(r,dt,t,openingBoat=null){
  if(r.status==='paused')return;
  const visualDt=r.status==='paused'?0:dt;
  visualTime+=visualDt;destruction.update(visualDt);
  contactFoam?.update(r,visualTime,Boolean(openingBoat));
  droplets.count=Math.min(r.shots.length,shotLimit)*3;cores.count=Math.min(r.shots.length,shotLimit);
  for(let i=0;i<cores.count;i++){
   const shot=r.shots[i],speed=Math.hypot(shot.vx,shot.vz),fx=shot.vx/speed,fz=shot.vz/speed;
   dummy.rotation.set(0,-Math.atan2(fx,-fz),0);
   for(let j=0;j<3;j++){const tail=j*1.6;dummy.position.set(shot.x-fx*tail,shot.y,shot.z-fz*tail);dummy.scale.set(.45-j*.1,.35-j*.075,1.2-j*.16);dummy.updateMatrix();droplets.setMatrixAt(i*3+j,dummy.matrix)}
   dummy.position.set(shot.x+fx*.32,shot.y+.17,shot.z+fz*.32);dummy.scale.set(.23,.16,.7);dummy.updateMatrix();cores.setMatrixAt(i,dummy.matrix);
  }
  droplets.instanceMatrix.needsUpdate=cores.instanceMatrix.needsUpdate=true;
  for(const splash of splashes){splash.age+=visualDt;const life=1-splash.age/splash.duration;splash.mesh.visible=life>0;if(life>0){splash.mesh.scale.setScalar(splash.radius+splash.age*(reducedMotion?5:10));splash.mesh.material.opacity=life*.65}}

  const p=pointAt(r.s,r.x),nx=Math.cos(r.heading),nz=Math.sin(r.heading),fx=Math.sin(r.heading),fz=-Math.cos(r.heading),active=r.status==='racing';
  if(active&&r.speed>3&&r.y<1.5){carry+=dt*(r.boosting?220:r.drifting?260:130);for(let j=0;j<Math.floor(carry);j++){const side=j%2?1:-1,spread=(r.drifting?7:3)+Math.random()*4;emit(p.x+nx*side*1.2-fx,p.y||.45,p.z+nz*side*1.2-fz,nx*side*spread-fx*r.speed*.25,1.3+Math.random()*3,nz*side*spread-fz*r.speed*.25,.12+Math.random()*.28,.5+Math.random()*.7)}carry%=1;
   wakeTime+=visualDt;if(wakeTime>.045){wakeTime%=.045;history.unshift({x:p.x-fx*2.7,z:p.z-fz*2.7,nx,nz,fx,fz,t:visualTime,speed:r.speed});while(history.length>wakeCount/3)history.pop()}
  }
  for(let i=0;i<count;i++){ages[i]+=visualDt;const k=i*3;if(ages[i]<life[i]){positions[k]+=velocities[k]*visualDt;positions[k+1]+=velocities[k+1]*visualDt;positions[k+2]+=velocities[k+2]*visualDt;velocities[k+1]-=9*visualDt;alpha[i]=Math.max(0,1-ages[i]/life[i])*.65;if(positions[k+1]<.08)alpha[i]=0}else alpha[i]=0}
  for(let i=0;i<wakeCount;i++){
   const h=history[Math.floor(i/3)],age=h?visualTime-h.t:99,side=(i%3)-1;
   if(!h||age>3.5){dummy.scale.setScalar(0);opacity[i]=0}
   else{
    const phase=h.t*91+side*7,jitter=Math.sin(phase)*.45,spread=1.2+age*(h.speed>45?5.2:4.0);
    dummy.position.set(h.x+h.nx*(side*spread+jitter)+h.fx*Math.cos(phase)*.7,.095,h.z+h.nz*(side*spread+jitter)+h.fz*Math.cos(phase)*.7);
    dummy.rotation.y=-Math.atan2(h.fx,-h.fz)+Math.sin(phase*1.3)*.65;
    dummy.scale.set((1.8+age*3.6)*(1-age/3.5)*(1+Math.sin(phase)*.2),1,4.2+age*4.6);
    opacity[i]=Math.pow(1-age/3.5,1.15)*(side===0?.5:1)*(h.speed>45?1:.8)*.5;
   }
   dummy.updateMatrix();wake.setMatrixAt(i,dummy.matrix);
  }
  wake.geometry.attributes.instanceOpacity.needsUpdate=true;
  wake.instanceMatrix.needsUpdate=true;geo.attributes.position.needsUpdate=true;geo.attributes.aAlpha.needsUpdate=true;geo.attributes.aSize.needsUpdate=true;
 }};
}

// A compact painted-metal deck cannon, separate from the exported couple model.
// The barrel and recessed bore share the boat transform and existing lights.
export function makeWaterCannon(boat){
 const cannon=new T.Group();cannon.position.set(WATER_SHOT.muzzleSide,WATER_SHOT.muzzleHeight-.42,-WATER_SHOT.muzzleForward+.74);boat.add(cannon);
 const base=new T.Mesh(new T.CylinderGeometry(.32,.43,.22,16),new T.MeshStandardMaterial({color:0xfff0cb,roughness:.70}));cannon.add(base);
 const barrel=new T.Group();barrel.position.y=.42;cannon.add(barrel);
 const body=new T.Mesh(new T.LatheGeometry([[0,-.46],[.195,-.46],[.216,-.435],[.223,-.38],[.223,-.26],[.238,-.24],[.238,-.16],[.214,-.14],[.214,.14],[.233,.16],[.233,.24],[.21,.26],[.21,.43],[.185,.46],[0,.46]].map(([r,y])=>new T.Vector2(r,y)),24),new T.MeshStandardMaterial({color:0x288f95,roughness:.57,metalness:.16}));body.rotation.x=Math.PI/2;body.position.z=-.24;barrel.add(body);
 const collarMaterial=new T.MeshStandardMaterial({color:0x23636a,roughness:.47,metalness:.20});
 for(const z of [-.47,-.06]){const collar=new T.Mesh(new T.TorusGeometry(.236,.028,6,24),collarMaterial);collar.position.z=z;barrel.add(collar)}
 const axle=new T.Mesh(new T.CylinderGeometry(.095,.095,.54,16),collarMaterial);axle.rotation.z=Math.PI/2;axle.position.set(0,-.05,-.03);barrel.add(axle);
 const nozzle=new T.Mesh(new T.TorusGeometry(.185,.063,8,20),new T.MeshStandardMaterial({color:0xe8be53,roughness:.55,metalness:.25}));nozzle.position.z=-.74;barrel.add(nozzle);
 const bore=new T.Mesh(new T.CircleGeometry(.147,24),new T.MeshStandardMaterial({color:0x183d42,roughness:.83}));bore.rotation.y=Math.PI;bore.position.z=-.715;barrel.add(bore);
 cannon.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=mesh.receiveShadow=true});
 return{muzzle:nozzle,update(flash){barrel.position.z=flash>0?Math.sin(flash/.14*Math.PI)*.12:0}};
}
