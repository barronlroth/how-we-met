import * as T from 'three';
import {pointAt} from './course.js';
export function makeEffects(scene){
 const count=700,positions=new Float32Array(count*3),alpha=new Float32Array(count),sizes=new Float32Array(count),velocities=new Float32Array(count*3),ages=new Float32Array(count).fill(9),life=new Float32Array(count);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('aAlpha',new T.BufferAttribute(alpha,1));geo.setAttribute('aSize',new T.BufferAttribute(sizes,1));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:600}},vertexShader:'attribute float aAlpha;attribute float aSize;varying float vAlpha;uniform float uScale;void main(){vAlpha=aAlpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=min(32.,aSize*uScale/max(1.,-p.z));}',fragmentShader:'varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=smoothstep(1.,.05,d)*vAlpha;gl_FragColor=vec4(.9,1.,.98,a);}' });
 const spray=new T.Points(geo,material);spray.frustumCulled=false;scene.add(spray);let cursor=0,carry=0,wakeTime=0;
 const wakeCount=312,wake=new T.InstancedMesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xe3ffff,transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide}),wakeCount),dummy=new T.Object3D(),history=[];wake.frustumCulled=false;scene.add(wake);
 const foamCanvas=document.createElement('canvas');foamCanvas.width=128;foamCanvas.height=128;const ctx=foamCanvas.getContext('2d');
 for(let i=0;i<110;i++){const x=Math.random()*128,y=Math.random()*128,r=2+Math.random()*11,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
 // Every edge reaches zero alpha before the quad boundary, even after rotation.
 ctx.globalCompositeOperation='destination-in';const edge=ctx.createRadialGradient(64,64,12,64,64,62);edge.addColorStop(0,'white');edge.addColorStop(.55,'rgba(255,255,255,.85)');edge.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=edge;ctx.fillRect(0,0,128,128);
 const tex=new T.CanvasTexture(foamCanvas);wake.material.map=tex;
 const opacity=new Float32Array(wakeCount);wake.geometry.setAttribute('instanceOpacity',new T.InstancedBufferAttribute(opacity,1));
 wake.material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float instanceOpacity;varying float vInstanceOpacity;').replace('#include <begin_vertex>','#include <begin_vertex>\nvInstanceOpacity=instanceOpacity;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vInstanceOpacity;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vInstanceOpacity;')};wake.material.customProgramCacheKey=()=>"broken-wake-v3";
 function emit(x,y,z,vx,vy,vz,scale,duration){const k=cursor++%count;positions[k*3]=x;positions[k*3+1]=y;positions[k*3+2]=z;velocities[k*3]=vx;velocities[k*3+1]=vy;velocities[k*3+2]=vz;ages[k]=0;life[k]=duration;sizes[k]=scale}
 return{reset(){history.length=0;ages.fill(9);alpha.fill(0)},update(r,dt,t){
  const p=pointAt(r.s,r.x),nx=Math.cos(r.heading),nz=Math.sin(r.heading),fx=Math.sin(r.heading),fz=-Math.cos(r.heading),active=r.status==='racing';
  if(active&&r.speed>3&&r.y<1.5){carry+=dt*(r.boosting?220:r.drifting?260:130);for(let j=0;j<Math.floor(carry);j++){const side=j%2?1:-1,spread=(r.drifting?7:3)+Math.random()*4;emit(p.x+nx*side*1.2-fx,p.y||.45,p.z+nz*side*1.2-fz,nx*side*spread-fx*r.speed*.25,1.3+Math.random()*3,nz*side*spread-fz*r.speed*.25,.12+Math.random()*.28,.5+Math.random()*.7)}carry%=1;
   wakeTime+=dt;if(wakeTime>.045){wakeTime%=.045;history.unshift({x:p.x-fx*2.7,z:p.z-fz*2.7,nx,nz,fx,fz,t,speed:r.speed});while(history.length>(wakeCount-12)/3)history.pop()}
  }
  for(let i=0;i<count;i++){ages[i]+=dt;const k=i*3;if(ages[i]<life[i]){positions[k]+=velocities[k]*dt;positions[k+1]+=velocities[k+1]*dt;positions[k+2]+=velocities[k+2]*dt;velocities[k+1]-=9*dt;alpha[i]=Math.max(0,1-ages[i]/life[i])*.65;if(positions[k+1]<.08)alpha[i]=0}else alpha[i]=0}
  for(let i=0;i<wakeCount;i++){
   if(i<12){const side=i%2?1:-1,z=-2.3+Math.floor(i/2)*.85;dummy.position.set(p.x+nx*side*(1.65+z*.035)+fx*z,.12,p.z+nz*side*(1.65+z*.035)+fz*z);dummy.rotation.y=-r.heading+side*.2;dummy.scale.set(.65+(z+2.3)*.11,1,1.05);opacity[i]=active&&r.y<.6?Math.min(.9,r.speed/35)*(r.boosting?1:.7):0}
   else{const j=i-12,h=history[Math.floor(j/3)],age=h?t-h.t:99,side=(j%3)-1;if(!h||age>3.5){dummy.scale.setScalar(0);opacity[i]=0}else{const phase=h.t*91+side*7,jitter=Math.sin(phase)*.45,spread=1.2+age*(h.speed>45?5.2:4.0);dummy.position.set(h.x+h.nx*(side*spread+jitter)+h.fx*Math.cos(phase)*.7,.095,h.z+h.nz*(side*spread+jitter)+h.fz*Math.cos(phase)*.7);dummy.rotation.y=-Math.atan2(h.fx,-h.fz)+Math.sin(phase*1.3)*.65;dummy.scale.set((1.8+age*3.6)*(1-age/3.5)*(1+Math.sin(phase)*.2),1,4.2+age*4.6);opacity[i]=Math.pow(1-age/3.5,1.15)*(side===0?.5:1)*(h.speed>45?1:.8)}}dummy.updateMatrix();wake.setMatrixAt(i,dummy.matrix);
  }
  wake.geometry.attributes.instanceOpacity.needsUpdate=true;
  wake.instanceMatrix.needsUpdate=true;geo.attributes.position.needsUpdate=true;geo.attributes.aAlpha.needsUpdate=true;geo.attributes.aSize.needsUpdate=true;
 }};
}
