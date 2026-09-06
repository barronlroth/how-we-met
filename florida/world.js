import * as T from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {batchScenery} from './scenery-batches.js';
import {waterfrontVilla,sportYacht,canopyTree} from './premium-art.js';
import {C,mat,box,ball,pipe,bake,buoy,fisheries,bridge,textSign} from './art.js';
import {superyacht,lushPalm,shrub,condo,marinaPier,pavilion,parasol} from './detail-art.js';
import {waterfrontCrowd,promenadeFurniture,riverfrontBlock,riverBridge,sailboat,boatyard,marinaClub,mangrove,boardwalk,pelican,partyBar,partyPontoon,finishTerrace,beachSlipway} from './district-art.js';
import {pointAt,halfWidth,curvature,districtAt,DISTRICTS,MOORINGS,COURSE_LENGTH,CHECKPOINTS,ISLANDS} from './course.js';
export const SUN=new T.Vector3(.55,.79,-.33).normalize();
const place=(g,template,s,x,y=0,rot=0,scale=1)=>{const p=pointAt(s,x),m=template.clone(true);m.position.set(p.x,y,p.z);m.rotation.y=-p.heading+rot;m.scale.multiplyScalar(scale);g.add(m);return m};
function instance(group){
 group.updateMatrixWorld(true);const buckets=new Map();
 group.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;let b=buckets.get(key);if(!b){b={geo:o.geometry,mat:o.material,matrices:[]};buckets.set(key,b)}b.matrices.push(o.matrixWorld.clone())});
 const result=new T.Group();for(const b of buckets.values()){const m=new T.InstancedMesh(b.geo,b.mat,b.matrices.length);b.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();result.add(m)}return result;
}
function terrain(scene){
 const shape=new T.Shape();shape.moveTo(-1800,-1300);shape.lineTo(-1800,4500);shape.lineTo(1800,4500);shape.lineTo(1800,-1300);shape.closePath();
 const hole=new T.Path();let first=true;
 for(let s=-600;s<=COURSE_LENGTH+750;s+=8){const p=pointAt(s,-halfWidth(s));if(first){hole.moveTo(p.x,-p.z);first=false}else hole.lineTo(p.x,-p.z)}
 for(let s=COURSE_LENGTH+750;s>=-600;s-=8){const p=pointAt(s,halfWidth(s));hole.lineTo(p.x,-p.z)}hole.closePath();shape.holes.push(hole);
 // Shape uses x/-z so the winding remains correct after rotation.
 const ground=new T.Mesh(new T.ShapeGeometry(shape),mat(0x73935b,{roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=.4;ground.receiveShadow=true;scene.add(ground);
}
export function makeWorld(scene,{multiDraw=false}={}){
 terrain(scene);const chunks=[],landmarks=[];
 const palms=[0,1,2].map(lushPalm),trees=[0,1].map(canopyTree),bushes=[0,1,2].map(shrub),homes=[0,1,2,3].map(waterfrontVilla),towers=[0,1,2,3].map(condo);
 const boats={sport:sportYacht(1),super:superyacht(1),sail:sailboat(0)},pier=marinaPier(17),umbrella=parasol(),walkFurniture=promenadeFurniture(),cafes=[0,1,2].map(riverfrontBlock),yards=[0,1].map(boatyard),club=marinaClub(),roots=[0,1,2].map(mangrove),walk=boardwalk(),birds=[0,1].map(pelican),crowds=[0,1,2].map(waterfrontCrowd),bar=partyBar(),pontoons=[0,1,2].map(partyPontoon),terrace=finishTerrace(),slipway=beachSlipway();
 const decorative=new T.Group();decorative.name='landmarks';
 // Each 100m region has a district composition. Reusable geometry is instanced,
 // then the existing scenery backend culls regions for both camera and reflection.
 for(let i=-2;i<Math.ceil(COURSE_LENGTH/100)+6;i++){
  const s=i*100,g=new T.Group(),fixed=new T.Group(),district=districtAt(s).id;
  for(const side of [-1,1]){
   const bank=at=>side*halfWidth(at),face=-side*Math.PI/2,arrival=side===1&&s>COURSE_LENGTH-175&&s<COURSE_LENGTH+80;
   if(district!=='mangrove')for(let k=-50;k<50;k+=10){const a=pointAt(s+k,bank(s+k)+side*.35),b=pointAt(s+k+10,bank(s+k+10)+side*.35);pipe(fixed,[a.x,.38,a.z],[b.x,.38,b.z],.42,0xcacbb3,6)}
   if(district==='downtown'){
    for(const off of [-27,25]){
     const at=s+off,w=halfWidth(at);
     place(g,cafes[(Math.abs(i)+Number(side>0)+Number(off>0))%3],at,side*(w+17.5),.45,face);
     place(g,walkFurniture,at,side*(w+4),.42,side===1?0:Math.PI);
     place(g,palms[Math.abs(i)%3],at-18,side*(w+3.5),.4,0,.83);
     place(g,trees[Math.abs(i)%2],at+18,side*(w+37),.4,0,.85);
    }
    for(const off of [-29,24])place(g,towers[(Math.abs(i)+Number(off>0)+Number(side>0))%4],s+off,side*(halfWidth(s+off)+64),.4,face,1.15+(Math.abs(i+off)%3)*.28);
    for(let k=-50;k<50;k+=20){const at=s+k,p=pointAt(at,side*(halfWidth(at)+43));const road=box(fixed,7,.035,20.4,0x8e9386,p.x,.46,p.z);road.rotation.y=-p.heading;const line=box(fixed,.12,.02,3,0xe4dcb4,p.x,.49,p.z);line.rotation.y=-p.heading}
   }else if(district==='marina'){
    const w=halfWidth(s);
    // Working boatyard on one bank, sailing club and cafe on the other.
    if((i+Number(side>0))%2===0)place(g,side<0?yards[Math.abs(i)%2]:club,s,side*(w+16),.45,face);
    else{place(g,homes[Math.abs(i)%4],s-15,side*(w+18),.45,face,.93);place(g,terrace,s+21,side*(w+9),.4,face,.75)}
    for(const off of [-42,-11,36]){place(g,palms[Math.abs(i+off)%3],s+off,side*(halfWidth(s+off)+3.4),.45,0,.95);place(g,bushes[Math.abs(i+off)%3],s+off-5,side*(halfWidth(s+off)+2.5),.45,0,1.4)}
    for(const off of [-30,16]){place(g,trees[Math.abs(i)%2],s+off,side*(w+47),.4,0,1.15);place(g,boats.sail,s+off,side*(w+65),1.6,0,.65)}
    if(i%3===0)place(g,towers[Math.abs(i)%4],s,side*(w+101),.4,face,.9);
   }else if(district==='mangrove'){
    // Irregular rooted banks and layered hammock forest replace the seawall.
    for(let k=-48,j=0;k<50;k+=13,j++){
     const at=s+k,w=halfWidth(at),scale=.92+((Math.abs(i)+j)%3)*.17;
     place(g,roots[(Math.abs(i)+j)%3],at,side*(w+3+(j%2)*1.5),.25,Math.sin(i+j),scale);
     place(g,trees[(Math.abs(i)+j)%2],at+4,side*(w+17+(j%3)*8),.4,j,1.1+(j%2)*.3);
     place(g,bushes[(Math.abs(i)+j)%3],at,side*(w+.8),.3,j,1.45);
     const p=pointAt(at,side*(w+.2));ball(fixed,p.x,.15,p.z,2.1,.4,3.8,0xa5a076,1);
    }
    if(side===1&&i%2===0)place(g,walk,s,side*(halfWidth(s)+10),0,0,1);
    if(i%2===0)for(let j=0;j<3;j++)place(g,birds[j%2],s-25+j*12,side*(halfWidth(s)-7-j*2),8+j*.6,-.3,1.4);
   }else if(district==='cove'){
    const w=halfWidth(s);
    // Open sandy banks, bright cabanas and social clusters leave the wide water
    // clear enough to exploit boosts between the raft-ups in MOORINGS.
    for(let k=-50;k<50;k+=20){const at=s+k,p=pointAt(at,side*(halfWidth(at)+10));const sand=box(fixed,20,.12,21,0xe1cf9b,p.x,.48,p.z);sand.rotation.y=-p.heading}
    if((i+Number(side>0))%3===0)place(g,bar,s,side*(w+8.2),.1,face,.94);
    else for(const off of [-25,18]){place(g,umbrella,s+off,side*(halfWidth(s+off)+5),.55,0,1.4);place(g,crowds[(Math.abs(i)+Number(off>0))%3],s+off,side*(halfWidth(s+off)+2),.55,face);place(g,slipway,s+off+8,side*(halfWidth(s+off)+4),.1,side*Math.PI/2,.9);const beached=place(g,pontoons[Math.abs(i+off)%3],s+off+8,side*(halfWidth(s+off)+4),1.04,side*Math.PI/2,.9);beached.rotateX(-.06)}
    for(const off of [-43,-11,33]){place(g,palms[Math.abs(i+off)%3],s+off,side*(halfWidth(s+off)+16),.4,Math.sin(i),1.3);place(g,bushes[Math.abs(i+off)%3],s+off,side*(halfWidth(s+off)+21),.5,0,1.8)}
    if(i%2===0){place(g,homes[Math.abs(i)%4],s,side*(w+43),.4,face,1.45);place(g,trees[Math.abs(i)%2],s-32,side*(w+43),.4,0,1.5)}
   }else{
    for(const off of [-29,22]){
     const at=s+off,w=halfWidth(at);
     if(!arrival){place(g,homes[(Math.abs(i)+Number(off>0))%4],at,side*(w+19),.4,face,1.15);place(g,terrace,at+17,side*(w+9.8),.45,face,.6)}
     place(g,walkFurniture,at,side*(w+3.8),.4,side===1?0:Math.PI);
     for(let j=0;j<3;j++)place(g,palms[(Math.abs(i)+j)%3],at-15+j*14,side*(w+4+j%2*5),.42,0,1.15);
    }
    if(i%2===0)place(g,towers[(Math.abs(i)+Number(side>0))%4],s,side*(halfWidth(s)+75),.4,face,1.7);
   }
  }
  // Hull visuals and physics share the exact same mooring transforms.
  for(const m of MOORINGS)if(m.s>=s-50&&m.s<s+50){
   place(g,boats[m.model],m.s,m.x,0,m.yaw,m.scale);
   const side=Math.sign(m.x);place(g,pier,m.s+(m.halfLength||12)*.65,side*(halfWidth(m.s)+1.5),0,Math.PI/2,.85);
  }
  g.add(bake(fixed));const chunk=instance(g);chunk.userData.s=s;chunk.userData.district=district;chunks.push(chunk);
 }
 // A small local bridge creates a shaded urban squeeze; the large finish
 // crossing remains unique and much taller on the horizon.
 const urbanS=COURSE_LENGTH*.112,urban=new T.Group();place(urban,riverBridge(halfWidth(urbanS)*2+26),urbanS,0);const urbanChunk=instance(urban);urbanChunk.userData.s=urbanS;chunks.push(urbanChunk);
 for(const island of ISLANDS){
  const vertices=[];for(let j=0;j<40;j++){const a=j*Math.PI/20,p=pointAt(island.s+Math.cos(a)*island.length/2,island.x+Math.sin(a)*island.width);vertices.push(new T.Vector2(p.x,-p.z))}
  const g=new T.Group(),mesh=new T.Mesh(new T.ShapeGeometry(new T.Shape(vertices)),mat(island.district==='mangrove'?0x557140:0x89a366));mesh.rotation.x=-Math.PI/2;mesh.position.y=.55;mesh.receiveShadow=true;g.add(mesh);
  if(island.district==='mangrove'){
   for(let offset=-island.length*.4,j=0;offset<=island.length*.4;offset+=18,j++){
    const r=island.width*Math.sqrt(1-(offset/(island.length/2))**2);
    for(const side of [-1,1])place(g,roots[j%3],island.s+offset,island.x+side*Math.max(0,r-5),.45,j*.7,1.18);
    place(g,trees[j%2],island.s+offset,island.x,.5,0,1.5);
   }
   const yellowMarker=buoy(C.gold,true);
   for(let j=-4;j<=4;j++){
    const offset=j*island.length/7.2,t=Math.min(1,Math.abs(offset)/(island.length/2)),radius=island.width*Math.sqrt(1-t*t),at=island.s+offset;
    place(g,yellowMarker,at,Math.min(halfWidth(at)-4,island.x+radius+10),.1,0,.82);
   }
  }else{place(g,pavilion(),island.s,island.x,.5);for(let j=-3;j<=3;j++){place(g,palms[Math.abs(j)%3],island.s+j*18,island.x+(j%2?6:-5),.5,0,1.1);place(g,bushes[Math.abs(j)%3],island.s+j*20,island.x+3,.5,0,2)}}
  for(const side of [-1,1]){const text=side<0?'‹ MAIN CHANNEL':island.district==='mangrove'?'MANGROVE CUT ›':'MARINA CUT ›';const sign=textSign(text,12,1.7,{bg:'#194946',color:'#fff2ba',font:'900 85px Nunito'});place(g,sign,island.s-island.length/2-20,island.x+side*19,4.2)}
  const chunk=instance(g);chunk.userData.s=island.s;chunks.push(chunk);
 }
 const batches=batchScenery(chunks,{multiDraw});batches.root.name='shoreline';scene.add(batches.root);
 for(let s=20,i=0;s<COURSE_LENGTH;s+=42,i++)for(const side of [-1,1]){const b=buoy(side<0?0xe96e40:0x58ac69,i%4===0);place(decorative,b,s,side*(halfWidth(s)-3),.05)}
 for(const [i,s]of CHECKPOINTS.entries()){
  const g=new T.Group(),w=Math.min(20,halfWidth(s)-7);for(const side of [-1,1]){pipe(g,[side*w,0,0],[side*w,7,0],.08,C.cream);const marker=buoy(side<0?C.coral:0x59a975,true);marker.position.set(side*w,0,0);g.add(marker)}
  pipe(g,[-w,7,0],[w,7,0],.025,C.cream);const sign=textSign(`CHECKPOINT ${i+1}`,13,1.5,{bg:'#153e49',color:'#fff9de',font:'900 80px Nunito'});sign.position.set(0,6.7,0);g.add(sign);place(decorative,bake(g),s,0);
 }
 for(let s=120;s<COURSE_LENGTH-150;s+=180){const bend=curvature(s+40);if(Math.abs(bend)<.0025)continue;const sign=textSign(bend>0?'› › ›':'‹ ‹ ‹',7,2,{bg:'#163e43',color:'#ffd75d',font:'900 155px Nunito',border:null});place(decorative,sign,s,Math.sign(bend)*(halfWidth(s)-2),3.3)}
 for(const d of DISTRICTS.slice(1)){const at=d.start*COURSE_LENGTH+18,sign=textSign(d.name,16,2,{bg:'#17464a',color:'#ffe9a6',font:'900 85px Nunito'});place(decorative,sign,at,-halfWidth(at)-2,5.3,-Math.PI/10)}
 const fish=new T.Group();fish.add(fisheries());const deck=terrace.clone();deck.position.set(0,.6,17);deck.scale.setScalar(.8);fish.add(deck);
 for(const x of [-10,-5,0,5,10]){const u=umbrella.clone();u.position.set(x,1.15,14);u.scale.setScalar(.7);fish.add(u)}
 const f=place(decorative,bake(fish),COURSE_LENGTH-55,halfWidth(COURSE_LENGTH-55)+1,0,-.3,1.25);landmarks.push(f);
 const bridgeGroup=new T.Group();bridgeGroup.add(bridge(190));
 for(const side of [-1,1]){const sh=new T.Shape();sh.moveTo(0,16);sh.lineTo(64,16);sh.lineTo(64,1);sh.quadraticCurveTo(32,22,0,1);sh.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:12,bevelEnabled:false}),mat(0xd5ddc6,{side:T.DoubleSide}));m.position.set(side*31,0,-6);m.scale.x=side;m.castShadow=true;m.receiveShadow=true;bridgeGroup.add(m)}
 const b=place(decorative,bridgeGroup,COURSE_LENGTH,0);landmarks.push(b);
 // District-specific horizon: skyline at the city and finish, tree line at the cut.
 for(let i=0;i<28;i++){const s=COURSE_LENGTH*(i/27),d=districtAt(s).id;if(d==='mangrove')continue;const side=i%2?1:-1;place(decorative,towers[i%4],s,side*(205+(i%4)*32),.4,0,d==='downtown'?1.6:1.0+(i%4)*.28)}
 scene.add(decorative);
 return{update(s,camera){batches.update(s,camera);for(const l of landmarks)l.visible=s>COURSE_LENGTH-850},setAO(enabled){batches.setAO(enabled);decorative.visible=!enabled},landmarks};
}
export function makeSky(scene,renderer){
 const sky=new T.Mesh(new T.SphereGeometry(5200,24,14),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color(0x007fc4)},horizon:{value:new T.Color(0x6bc5de)}},vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform vec3 top;uniform vec3 horizon;varying vec3 direction;void main(){float h=pow(max(0.0,normalize(direction).y),0.16);gl_FragColor=vec4(mix(horizon,top,h),1.0);\n#include <tonemapping_fragment>
#include <colorspace_fragment>
}`}));scene.add(sky);
 const envScene=new T.Scene();envScene.add(sky.clone());const pmrem=new T.PMREMGenerator(renderer);const target=pmrem.fromScene(envScene,.035,.1,10000);scene.environment=target.texture;scene.environmentIntensity=.25;pmrem.dispose();
 const clouds=new T.Group();for(let i=0;i<28;i++){const g=new T.Group();for(let j=0;j<5;j++)ball(g,j*16,Math.sin(j*2)*5,Math.cos(j)*6,17,6+(j%3)*3,11,mat(0xffffff,{roughness:1}),2);g.position.set(Math.sin(i*7)*1150,140+(i%4)*35,300-i*145);g.scale.setScalar(1.3);clouds.add(bake(g))}scene.add(clouds);
 return sky;
}
export function makeWater(scene){
 const size=256,data=new Uint8Array(size*size*4),heights=new Float32Array(size*size);let seed=4491;
 const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),smooth=t=>t*t*(3-2*t);
 for(const [cells,amplitude]of [[7,.45],[17,.55],[37,.28],[73,.16]]){const grid=Float32Array.from({length:cells*cells},random);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size*cells,v=y/size*cells,ix=Math.floor(u),iy=Math.floor(v),a=smooth(u-ix),b=smooth(v-iy),sample=(xx,yy)=>grid[(yy%cells)*cells+xx%cells],top=T.MathUtils.lerp(sample(ix,iy),sample(ix+1,iy),a),bottom=T.MathUtils.lerp(sample(ix,iy+1),sample(ix+1,iy+1),a);heights[y*size+x]+=T.MathUtils.lerp(top,bottom,b)*amplitude}}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const h=(xx,yy)=>heights[((yy+size)%size)*size+(xx+size)%size],dx=(h(x+1,y)-h(x-1,y))*5,dy=(h(x,y+1)-h(x,y-1))*5,n=new T.Vector3(dx,dy,1).normalize(),k=(y*size+x)*4;data[k]=(n.x*.5+.5)*255;data[k+1]=(n.y*.5+.5)*255;data[k+2]=(n.z*.5+.5)*255;data[k+3]=Math.min(255,heights[y*size+x]/1.44*255)}
 const normal=new T.DataTexture(data,size,size);normal.wrapS=normal.wrapT=T.RepeatWrapping;normal.magFilter=T.LinearFilter;normal.minFilter=T.LinearMipmapLinearFilter;normal.generateMipmaps=true;normal.needsUpdate=true;
 const water=new Water(new T.PlaneGeometry(14000,14000),{textureWidth:512,textureHeight:512,waterNormals:normal,sunDirection:SUN,sunColor:0xfff1d4,waterColor:0x008c94,distortionScale:.72,fog:true});water.material.fragmentShader=water.material.fragmentShader.replace('sunColor * diffuseLight * 0.3','waterColor * diffuseLight * 0.12').replace('max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor','(0.55 + 0.45 * max( 0.0, dot( surfaceNormal, eyeDirection ) )) * waterColor').replace('reflectionSample + specularLight, reflectance','reflectionSample * 0.82 + specularLight, reflectance * 0.72');const reflect=water.onBeforeRender;water.onBeforeRender=function(...args){if(!args[1].overrideMaterial)reflect.apply(this,args)};water.material.fragmentShader=water.material.fragmentShader.replace('vec3 outgoingLight = albedo;',`
  vec2 waveUV=worldPosition.xz*.052+vec2(time*.018,time*.007);
  vec4 waveDetail=texture2D(normalSampler,waveUV);
  float body=texture2D(normalSampler,worldPosition.xz*.009+vec2(time*.004,-time*.003)).a;
  float crest=smoothstep(.52,.66,waveDetail.a)*smoothstep(.49,.64,waveDetail.g);
  float distanceFade=1.0-smoothstep(90.0,320.0,distance);
  vec3 outgoingLight=albedo*mix(.94,1.06,smoothstep(.28,.70,body));
  outgoingLight+=vec3(.20,.57,.58)*crest*distanceFade*.10;
 `);water.rotation.x=-Math.PI/2;water.position.y=.025;water.material.uniforms.size.value=7.6;scene.add(water);
 const districtWater={downtown:new T.Color(0x087f8c),marina:new T.Color(0x078f99),mangrove:new T.Color(0x277e6c),cove:new T.Color(0x0eafb2),bridge:new T.Color(0x078f9f)};
 return{mesh:water,update(s,t){water.material.uniforms.time.value=t*.65;water.material.uniforms.waterColor.value.lerp(districtWater[districtAt(s).id],.025)}};
}
