import * as T from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {batchScenery} from './scenery-batches.js';
import {waterfrontVilla,sportYacht,canopyTree} from './premium-art.js';
import {C,mat,box,ball,pipe,bake,mansion,buoy,fisheries,bridge,textSign} from './art.js';
import {superyacht,lushPalm,broadleaf,shrub,condo,marinaPier,pavilion,parasol} from './detail-art.js';
import {pointAt,frameAt,halfWidth,curvature,COURSE_LENGTH,CHECKPOINTS,ISLANDS} from './course.js';
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
 const palms=[0,1,2].map(lushPalm),trees=[0,1].map(canopyTree),bushes=[0,1,2].map(shrub),homes=[0,1,2,3,4,5].map(waterfrontVilla),towers=[0,1,2,3].map(condo),boats=[sportYacht(0),sportYacht(1),superyacht(.82)],pier=marinaPier(23),umbrella=parasol();
 const decorative=new T.Group();decorative.name='landmarks';
 for(let i=-2;i<Math.ceil(COURSE_LENGTH/100)+6;i++){
  const s=i*100,g=new T.Group(),fixed=new T.Group();
  for(const side of [-1,1]){
   const marina=s/COURSE_LENGTH>.31&&s/COURSE_LENGTH<.5,arrival=side===1&&s>COURSE_LENGTH-175&&s<COURSE_LENGTH+80;
   for(let k=-50;k<50;k+=10){const a=pointAt(s+k,side*(halfWidth(s+k)+.35)),b=pointAt(s+k+10,side*(halfWidth(s+k+10)+.35));pipe(fixed,[a.x,.38,a.z],[b.x,.38,b.z],.42,0xcacbb3,6)}
   for(const off of [-34,0,34]){
    const at=s+off,w=halfWidth(at);
    if(!arrival)place(g,homes[(Math.abs(i*3+off))%homes.length],at,side*(w+15+(Math.abs(i+off)%3)*3),.45,-side*Math.PI/2+Math.sin(i+off)*.06,marina?.85:1);
    if(!arrival){place(g,pier,at+17,side*(w-1),0,Math.PI/2);place(g,boats[Math.abs(i)%3],at+14,side*(w-7.5),0,Math.sin(i+off)*.19+(Math.abs(i+off)%4===0?Math.PI:0))}
    // Continuous planted yards and a second layer of neighborhood behind them.
    for(let j=0;j<4;j++){
     place(g,palms[(j+Math.abs(i))%3],at-12+j*8,side*(w+2.5+(j%3)*6),.42,Math.sin(i+j),.7+((j+Math.abs(i))%4)*.23);
     place(g,bushes[(j+Math.abs(i))%3],at-13+j*8,side*(w+1.8),.5,0,.65);
     place(g,trees[(j+Math.abs(i))%2],at-10+j*9,side*(w+28+j%2*17),.45,0,.62+(j%3)*.24);
    }
    if(!arrival&&off!==0)place(g,homes[Math.abs(i+off)%6],at-5,side*(w+77),.4,side*Math.PI/2,.88);
    for(let j=0;j<3;j++)place(g,trees[(Math.abs(i)+j)%2],at+j*9,side*(w+98+(j%2)*14),.4,0,1.05);
   }
   if(i%2===0)place(g,towers[Math.abs(i+side)%4],s+8,side*(halfWidth(s)+145),.4,-side*Math.PI/2,.9+(Math.abs(i)%3)*.13);
   // A road, sidewalks, parked cars and planted setbacks make the banks a city.
   for(let k=-50;k<50;k+=20){
    const at=s+k,p=pointAt(at,side*(halfWidth(at)+55));const road=box(fixed,9,.03,20.4,0x8e9386,p.x,.45,p.z);road.rotation.y=-p.heading;
    const line=box(fixed,.12,.02,3,0xdad6b4,p.x,.48,p.z);line.rotation.y=-p.heading;
    if(k%40===-10){const car=new T.Group();box(car,1.75,.6,3.8,[0xd9dcca,0x467b80,0xc97d65][Math.abs(i)%3],0,.72,0);box(car,1.5,.55,2,0x3d5656,0,1.2,.05);place(g,bake(car),at,side*(halfWidth(at)+58),.1)}
   }
   if(marina&&!arrival){for(const off of [-20,25])place(g,umbrella,s+off,side*(halfWidth(s+off)+4),.5,0,.8)}
  }
  g.add(bake(fixed));const chunk=instance(g);chunk.userData.s=s;chunks.push(chunk);
 }
 const batches=batchScenery(chunks,{multiDraw});batches.root.name='shoreline';scene.add(batches.root);
 for(let s=20,i=0;s<COURSE_LENGTH;s+=42,i++)for(const side of [-1,1]){const b=buoy(side<0?0xe96e40:0x58ac69,i%4===0);place(decorative,b,s,side*(halfWidth(s)-3),.05)}
 for(const [i,s]of CHECKPOINTS.entries()){
  const g=new T.Group(),w=Math.min(20,halfWidth(s)-7);for(const side of [-1,1]){pipe(g,[side*w,0,0],[side*w,7,0],.08,C.cream);const marker=buoy(side<0?C.coral:0x59a975,true);marker.position.set(side*w,0,0);g.add(marker)}
  pipe(g,[-w,7,0],[w,7,0],.025,C.cream);const sign=textSign(`CHECKPOINT ${i+1}`,13,1.5,{bg:'#153e49',color:'#fff9de',font:'900 80px Nunito'});sign.position.set(0,6.7,0);g.add(sign);place(decorative,bake(g),s,0);
 }
 for(let s=120;s<COURSE_LENGTH-150;s+=180){const bend=curvature(s+40);if(Math.abs(bend)<.0025)continue;const sign=textSign(bend>0?'› › ›':'‹ ‹ ‹',7,2,{bg:'#163e43',color:'#ffd75d',font:'900 155px Nunito',border:null});place(decorative,sign,s,Math.sign(bend)*(halfWidth(s)-2),3.3)}
 for(const island of ISLANDS){
  const vertices=[];for(let j=0;j<40;j++){const a=j*Math.PI/20,p=pointAt(island.s+Math.cos(a)*island.length/2,island.x+Math.sin(a)*island.width);vertices.push(new T.Vector2(p.x,-p.z))}
  const mesh=new T.Mesh(new T.ShapeGeometry(new T.Shape(vertices)),mat(0x698747));mesh.rotation.x=-Math.PI/2;mesh.position.y=.55;mesh.receiveShadow=true;scene.add(mesh);
  const g=new T.Group();place(g,pavilion(),island.s,island.x,.1);for(let j=-3;j<=3;j++){place(g,palms[Math.abs(j)%3],island.s+j*17,island.x+(j%2?7:-6),.5,0,1);place(g,bushes[Math.abs(j)%3],island.s+j*20,island.x+4,.5,0,2)}
  for(const side of [-1,1]){const sign=textSign(side<0?'‹ MAIN CHANNEL':'MARINA CUT ›',12,1.7,{bg:'#194946',color:'#fff2ba',font:'900 85px Nunito'});place(g,sign,island.s-island.length/2-16,island.x+side*19,4.2)}scene.add(instance(g));
 }
 const fish=new T.Group();fish.add(fisheries());for(const x of [-10,-5,0,5,10]){const u=umbrella.clone();u.position.set(x,1.15,14);u.scale.setScalar(.7);fish.add(u)}
 for(let i=0;i<16;i++){const x=(i%8)*2.8-10,z=12+Math.floor(i/8)*3;ball(fish,x,2.2,z,.2,.42,.16,[C.coral,C.teal,C.cream][i%3]);ball(fish,x,2.78,z,.17,.21,.17,C.skin,1)}
 const f=place(decorative,bake(fish),COURSE_LENGTH-55,halfWidth(COURSE_LENGTH-55)+1,0,-.3,1.25);landmarks.push(f);
 const bridgeGroup=new T.Group();bridgeGroup.add(bridge(190));
 for(const side of [-1,1]){const sh=new T.Shape();sh.moveTo(0,16);sh.lineTo(64,16);sh.lineTo(64,1);sh.quadraticCurveTo(32,22,0,1);sh.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:12,bevelEnabled:false}),mat(0xd5ddc6,{side:T.DoubleSide}));m.position.set(side*31,0,-6);m.scale.x=side;m.castShadow=true;m.receiveShadow=true;bridgeGroup.add(m)}
 const b=place(decorative,bridgeGroup,COURSE_LENGTH,0);landmarks.push(b);
 // A layered skyline closes the horizon beyond the route.
 for(let i=0;i<35;i++){const s=COURSE_LENGTH*(i/34),side=i%2?1:-1;place(decorative,towers[i%4],s,side*(220+(i%5)*32),.4,0,1.1+(i%4)*.28)}
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
 return{mesh:water,update(s,t){water.material.uniforms.time.value=t*.65}};
}
