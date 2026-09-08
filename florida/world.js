import * as T from 'three';
import {makeDreamWater} from './water.js';
export {makeSky} from './sky.js';
import {vegetationAsset} from './vegetation-art.js';
import {landmarkAsset} from './landmark-art.js';
import {batchScenery} from './scenery-batches.js';
import {waterfrontAsset} from './waterfront-art.js';
import {waterfrontVilla,sportYacht,canopyTree} from './premium-art.js';
import {C,mat,box,ball,pipe,bake,buoy,fisheries,bridge,textSign} from './art.js';
import {superyacht,lushPalm,shrub,marinaPier,pavilion,parasol} from './detail-art.js';
import {waterfrontCrowd,promenadeFurniture,riverfrontBlock,riverBridge,sailboat,boatyard,marinaClub,mangrove,boardwalk,pelican,partyBar,partyPontoon,finishTerrace,beachSlipway} from './district-art.js';
import {pointAt,halfWidth,curvature,districtAt,DISTRICTS,MOORINGS,COURSE_LENGTH,CHECKPOINTS,ISLANDS} from './course.js';
export const SUN=new T.Vector3(.38,.84,.12).normalize();
const place=(g,template,s,x,y=0,rot=0,scale=1)=>{
 const p=pointAt(s,x),m=template.clone(true);m.position.set(p.x,y,p.z);m.rotation.y=-p.heading+rot;m.scale.multiplyScalar(scale);
 if(template.name==='PalmRoyal'||template.name==='PalmCoconut'){
  const variation=Math.sin(s*.139+x*.041),width=1.14+variation*.15;
  m.scale.x*=width;m.scale.z*=width;m.scale.y*=1+variation*.07;m.rotation.y+=Math.sin(s*.073-x*.025)*.65;
 }
 g.add(m);return m;
};
const fronts=new WeakMap();
function frontage(g,template,s,side,scale=1,setback=.8){
 let front=fronts.get(template);if(front===undefined){front=new T.Box3().setFromObject(template).max.z;fronts.set(template,front)}
 return place(g,template,s,side*(halfWidth(s)+front*scale+setback),.45,-side*Math.PI/2,scale);
}
function instance(group){
 group.updateMatrixWorld(true);const buckets=new Map();
 group.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;let b=buckets.get(key);if(!b){b={geo:o.geometry,mat:o.material,matrices:[],targetIds:[]};buckets.set(key,b)}let parent=o;while(parent&&!parent.userData.targetId)parent=parent.parent;b.matrices.push(o.matrixWorld.clone());b.targetIds.push(parent?.userData.targetId||null)});
 const result=new T.Group();for(const b of buckets.values()){const m=new T.InstancedMesh(b.geo,b.mat,b.matrices.length);b.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.userData.targetIds=b.targetIds;m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();result.add(m)}return result;
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
 terrain(scene);const chunks=[],distantChunks=[],landmarks=[];
 const palms=['PalmRoyal','PalmCoconut','PalmRoyal'].map(vegetationAsset),trees=['HammockTree','SeaGrapeTree'].map(vegetationAsset),bushes=[0,1,2].map(()=>vegetationAsset('HedgeCluster')),homes=[0,1,2,3].map(waterfrontVilla);
 for(const palm of palms)palm.scale.setScalar(.82);for(const bush of bushes)bush.scale.setScalar(.68);
 const boats={sport:sportYacht(1),super:superyacht(1),sail:sailboat(0)},pier=marinaPier(17),umbrella=parasol(),walkFurniture=promenadeFurniture(),cafes=[0,1,2].map(riverfrontBlock),yards=[0,1].map(boatyard),club=marinaClub(),roots=[0,1,2].map(mangrove),walk=boardwalk(),birds=[0,1].map(pelican),crowds=[0,1,2].map(waterfrontCrowd),bar=partyBar(),pontoons=[0,1,2].map(partyPontoon),terrace=finishTerrace(),slipway=beachSlipway();
 const residence=waterfrontAsset('WaterfrontResidence'),hotel=waterfrontAsset('MarinaHotel'),skyline=waterfrontAsset('SkylineTower'),restaurant=waterfrontAsset('WaterfrontClub'),farTower=waterfrontAsset('SkylineFar'),forest=vegetationAsset('TreeBand');
 skyline.scale.set(1.55,.86,1.5);
 const decorative=new T.Group();decorative.name='landmarks';
 // Each 100m region has a district composition. Reusable geometry is instanced,
 // then the existing scenery backend culls regions for both camera and reflection.
 for(let i=-2;i<Math.ceil(COURSE_LENGTH/100)+6;i++){
  const s=i*100,g=new T.Group(),fixed=new T.Group(),backdrop=new T.Group(),district=districtAt(s).id;
  for(const side of [-1,1]){
   const bank=at=>side*halfWidth(at),face=-side*Math.PI/2,arrival=side===1&&s>COURSE_LENGTH-175&&s<COURSE_LENGTH+80;
   if(district!=='mangrove')for(let k=-50;k<50;k+=10){const a=pointAt(s+k,bank(s+k)+side*.35),b=pointAt(s+k+10,bank(s+k+10)+side*.35);pipe(fixed,[a.x,.38,a.z],[b.x,.38,b.z],.42,0xcacbb3,6)}
   if(district==='downtown'){
    for(const off of [-27,25]){
     const at=s+off,w=halfWidth(at);
     frontage(g,(i+Number(side>0))%3===0&&off>0?restaurant:cafes[(Math.abs(i)+Number(side>0)+Number(off>0))%3],at,side,(i+Number(side>0))%3===0&&off>0?.86:1);
     place(g,walkFurniture,at,side*(w+4),.42,side===1?0:Math.PI);
     place(g,palms[Math.abs(i)%3],at-18,side*(w+3.5),.4,0,.83);
     place(g,trees[Math.abs(i)%2],at+18,side*(w+37),.4,0,.85);
    }
    if(i%2===0)place(g,(i+Number(side>0))%4===0?hotel:skyline,s,side*(halfWidth(s)+77),.4,face,.7+(Math.abs(i)%3)*.15);
    for(let k=-50;k<50;k+=20){const at=s+k,p=pointAt(at,side*(halfWidth(at)+43));const road=box(fixed,7,.035,20.4,0x8e9386,p.x,.46,p.z);road.rotation.y=-p.heading;const line=box(fixed,.12,.02,3,0xe4dcb4,p.x,.49,p.z);line.rotation.y=-p.heading}
   }else if(district==='marina'){
    const w=halfWidth(s);
    // Working boatyard on one bank, sailing club and cafe on the other.
    if((i+Number(side>0))%2===0){frontage(g,side<0?yards[Math.abs(i)%2]:restaurant,s-21,side,.86);frontage(g,residence,s+27,side,.83)}
    else for(const off of [-30,23])frontage(g,off<0?residence:club,s+off,side,.91);
    for(const off of [-42,-11,36]){place(g,palms[Math.abs(i+off)%3],s+off,side*(halfWidth(s+off)+3.4),.45,0,.95);place(g,bushes[Math.abs(i+off)%3],s+off-5,side*(halfWidth(s+off)+2.5),.45,0,1.4)}
    if(i%3===0)place(g,hotel,s+9,side*(w+84),.4,face,.88);
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
    frontage(g,(i+Number(side>0))%2===0?bar:restaurant,s-25,side,.9);
    frontage(g,residence,s+28,side,.92,8);
    for(const off of [-44,4,42]){place(g,umbrella,s+off,side*(halfWidth(s+off)+4),.55,0,1.25);place(g,crowds[(Math.abs(i)+Math.abs(off))%3],s+off,side*(halfWidth(s+off)+2),.55,face)}
    if(i%2===0){place(g,slipway,s+3,side*(w+4),.1,side*Math.PI/2,.9);const beached=place(g,pontoons[Math.abs(i)%3],s+3,side*(w+4),1.04,side*Math.PI/2,.9);beached.rotateX(-.06)}
    for(const off of [-43,-11,33]){place(g,palms[Math.abs(i+off)%3],s+off,side*(halfWidth(s+off)+16),.4,Math.sin(i),1.3);place(g,bushes[Math.abs(i+off)%3],s+off,side*(halfWidth(s+off)+21),.5,0,1.8)}
    if((i+Number(side>0))%3===0)place(g,hotel,s+10,side*(w+86),.4,face,.76);
   }else{
    for(const off of [-29,22]){
     const at=s+off,w=halfWidth(at);
     if(!arrival)frontage(g,off<0?residence:homes[(Math.abs(i)+Number(off>0))%4],at,side,off<0?.91:1.08);
     place(g,walkFurniture,at,side*(w+3.8),.4,side===1?0:Math.PI);
     for(let j=0;j<3;j++)place(g,palms[(Math.abs(i)+j)%3],at-15+j*14,side*(w+4+j%2*5),.42,0,1.15);
    }
    if(i%3===0)place(g,skyline,s,side*(halfWidth(s)+88),.4,face,.9);
   }
   // Close palms, hedges and occupied gardens restore the fast-moving bank.
   // Overlapping neighborhoods replace the exposed plane behind the frontage.
   if(district!=='mangrove'){
    for(let off=-46,j=0;off<50;off+=14,j++){
     const at=s+off,w=halfWidth(at),variation=Math.abs(i*7+j*3+side);
     place(g,bushes[variation%3],at,side*(w+1.8),.5,j*.9,.8+(j%2)*.25);
     if(j%2===0)place(g,palms[variation%3],at,side*(w+5+(j%3)*2.5),.4,j,.85+(variation%4)*.13);
    }
    if(!arrival)for(const off of [-28,28])place(g,homes[(Math.abs(i)+Number(off>0)+Number(side>0))%4],s+off,side*(halfWidth(s+off)+62),.4,face,.92);
   }
   for(const off of [-38,-7,25]){
    const at=s+off,w=halfWidth(at),seed=Math.abs(i*7+off+side),natural=district==='mangrove';
    place(backdrop,forest,at,side*(w+(natural?23:42)),.4,seed*.71,.95+(seed%4)*.16);
    place(backdrop,forest,at+12,side*(w+(natural?54:98)),.4,seed*.93,1.3+(seed%3)*.18);
    place(backdrop,forest,at-9,side*(w+(natural?100:145)),.4,seed*.46,1.65+(seed%3)*.22);
   }
   if(district!=='mangrove'){
    for(const off of [-29,27]){
     const seed=Math.abs(i*7+off+side),tower=place(backdrop,farTower,s+off,side*(halfWidth(s+off)+155+(seed%3)*23),.4,face,.68+(seed%5)*.14);
     tower.scale.y*=.52+(seed%4)*.14;
    }
    const distant=place(backdrop,farTower,s+19,side*(halfWidth(s)+320+Math.abs(i%3)*32),.4,face,1.1+(Math.abs(i)%4)*.21);distant.scale.y*=.65+(Math.abs(i)%3)*.17;
   }else for(const off of [-34,18])place(backdrop,forest,s+off,side*(halfWidth(s)+165),.4,i+off,2.8);
  }
  // Hull visuals and physics share the exact same mooring transforms.
  for(const m of MOORINGS)if(m.s>=s-50&&m.s<s+50){
   place(g,boats[m.model],m.s,m.x,0,m.yaw,m.scale).userData.targetId=m.id;
   const side=Math.sign(m.x);place(g,pier,m.s+(m.halfLength||12)*.65,side*(halfWidth(m.s)+1.5),0,Math.PI/2,.85);
  }
  g.add(bake(fixed));const chunk=instance(g);chunk.userData.s=s;chunk.userData.district=district;chunks.push(chunk);
  const farChunk=instance(backdrop);farChunk.userData.s=s;distantChunks.push(farChunk);
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
 const batches=batchScenery(chunks,{multiDraw}),horizonBatches=batchScenery(distantChunks,{multiDraw,viewDistance:1700,aoDistance:0,shadows:false});batches.root.name='shoreline';horizonBatches.root.name='waterfront-horizon';scene.add(batches.root,horizonBatches.root);
 for(let s=20,i=0;s<COURSE_LENGTH;s+=42,i++)for(const side of [-1,1]){const b=buoy(side<0?0xe96e40:0x58ac69,i%4===0);place(decorative,b,s,side*(halfWidth(s)-3),.05)}
 for(const [i,s]of CHECKPOINTS.entries()){
  const g=new T.Group(),w=Math.min(20,halfWidth(s)-7);for(const side of [-1,1]){pipe(g,[side*w,0,0],[side*w,7,0],.08,C.cream);const marker=buoy(side<0?C.coral:0x59a975,true);marker.position.set(side*w,0,0);g.add(marker)}
  pipe(g,[-w,7,0],[w,7,0],.025,C.cream);const sign=textSign(`CHECKPOINT ${i+1}`,13,1.5,{bg:'#153e49',color:'#fff9de',font:'900 80px Nunito'});sign.position.set(0,6.7,0);g.add(sign);place(decorative,bake(g),s,0);
 }
 for(let s=120;s<COURSE_LENGTH-150;s+=180){const bend=curvature(s+40);if(Math.abs(bend)<.0025)continue;const sign=textSign(bend>0?'› › ›':'‹ ‹ ‹',7,2,{bg:'#163e43',color:'#ffd75d',font:'900 155px Nunito',border:null});place(decorative,sign,s,Math.sign(bend)*(halfWidth(s)-2),3.3)}
 for(const d of DISTRICTS.slice(1)){const at=d.start*COURSE_LENGTH+18,sign=textSign(d.name,16,2,{bg:'#17464a',color:'#ffe9a6',font:'900 85px Nunito'});place(decorative,sign,at,-halfWidth(at)-2,5.3,-Math.PI/10)}
 const f=place(decorative,landmarkAsset('FisheriesRestaurant'),COURSE_LENGTH-24,halfWidth(COURSE_LENGTH-24)+6,.45,-.35,1.45);landmarks.push(f);
 const b=place(decorative,landmarkAsset('BridgeCauseway'),COURSE_LENGTH,0);landmarks.push(b);
 // The opening uses three individually composed berths. Racing always restores
 // the canonical collision-backed moorings without altering their transforms.
 const openingBerths=new T.Group(),openingS=COURSE_LENGTH-165;
 place(openingBerths,boats.super,openingS+14.4,-34,0,.4,.80);
 place(openingBerths,boats.super,openingS+48.7,-34.5,0,Math.PI+.25,.80);
 place(openingBerths,boats.super,openingS+72.1,-34.5,0,Math.PI+.25,1.30);
 scene.add(openingBerths);
 // A distant harbor continues through the bridge opening beyond the race route.
 for(let i=0;i<16;i++){
  const city=place(decorative,farTower,COURSE_LENGTH+650+(i%3)*22,-180+i*18,0,i*.31,.4+(i%4)*.07);
  city.scale.y*=.45+(i%3)*.09;
 }
 scene.add(decorative);let showingOpening=false;
 return{update(s,camera,staged=false){if(staged!==showingOpening){showingOpening=staged;batches.setTargetsVisible(!staged)}openingBerths.visible=staged;batches.update(s,camera);horizonBatches.update(s,camera);for(const l of landmarks)l.visible=s>COURSE_LENGTH-850},setAO(enabled){batches.setAO(enabled);horizonBatches.setAO(enabled);decorative.visible=!enabled},destroyTarget(id){batches.setDestroyed(id)},resetDestruction(){batches.resetDestruction()},landmarks};
}
export function makeWater(scene){return makeDreamWater(scene,SUN)}
