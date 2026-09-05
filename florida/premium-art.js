import * as T from 'three';
import {box,ball,pipe,ring,bake,person,flamingo,textSign,C} from './art.js';
import {surfaceMaterials} from './materials.js';
let M;
export async function loadArtMaterials(){const deck=await new T.TextureLoader().loadAsync('./assets/teak-v2.png');deck.colorSpace=T.SRGBColorSpace;deck.wrapS=deck.wrapT=T.RepeatWrapping;deck.anisotropy=8;deck.repeat.set(1,1);M=surfaceMaterials(deck)}
function mesh(g,geo,material,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m}
function curvedPipe(g,points,r,material,closed=false){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed),Math.max(24,points.length*6),r,8,closed),material)}
function shell(g,shape,depth,material,y){const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:4,bevelSize:.13,bevelThickness:.09,curveSegments:16});geo.rotateX(Math.PI/2);return mesh(g,geo,material,0,y,0)}
function deckShape(w=1.55,front=-3.6,back=3){const s=new T.Shape();s.moveTo(-w+.25,back);s.quadraticCurveTo(-w,back,-w,back-.3);s.lineTo(-w,front+1.15);s.quadraticCurveTo(-w*.85,front,0,front-.3);s.quadraticCurveTo(w*.85,front,w,front+1.15);s.lineTo(w,back-.3);s.quadraticCurveTo(w,back,w-.25,back);s.closePath();return s}
export function craftedAirboat(){
 const root=new T.Group(),g=new T.Group();shell(g,deckShape(1.6,-3.7,3),.51,M.white,.56);shell(g,deckShape(1.46,-3.5,2.92),.11,M.aqua,.08);
 const floor=shell(g,deckShape(1.37,-3.4,2.73),.09,M.teak,.69);const uv=floor.geometry.attributes.uv,pos=floor.geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+1.6)/3.2,(pos.getZ(i)+3.7)/6.8);uv.needsUpdate=true;
 const rail=[[-1.49,.83,2.7],[-1.5,.83,.4],[-1.44,.83,-2.3],[-.95,.83,-3.25],[0,.83,-3.55],[.95,.83,-3.25],[1.44,.83,-2.3],[1.5,.83,.4],[1.49,.83,2.7],[0,.83,2.92]];
 curvedPipe(g,rail,.095,M.white,true);curvedPipe(g,rail.map(p=>[p[0]*1.035,.5,p[2]*1.02]),.055,M.rubber,true);curvedPipe(g,rail.map(p=>[p[0]*1.02,.7,p[2]*1.012]),.035,M.coral,true);
 // Two separate upholstered seats leave the teak and the engine readable.
 for(const [x,y,z,w]of [[-.46,1.38,-.45,.83],[.59,1.04,-2.14,1.08]]){box(g,w,.22,.82,M.cloth,x,y,z);box(g,w,.64,.16,M.cloth,x,y+.29,z+.36);for(const side of [-1,1])pipe(g,[x+side*w*.4,.72,z+.15],[x+side*w*.4,y-.12,z+.15],.042,M.metal);for(let j=0;j<5;j++)box(g,w*.83,.006,.012,0xb9b59f,x,y+.119,z-.3+j*.12)}
 box(g,.89,.13,.54,M.aqua,-.45,1.83,-1.29);for(const x of [-.7,-.4,-.12]){const d=mesh(g,new T.CylinderGeometry(.071,.071,.026,20),M.rubber,x,1.92,-1.29);ring(g,.073,.008,M.metal,x,1.942,-1.29,true);pipe(g,[x,1.95,-1.29],[x+.025,1.95,-1.33],.008,M.white)}
 const wheel=ring(g,.255,.022,M.rubber,-.45,1.96,-1.12);wheel.rotation.x=-.58;for(let a=0;a<3;a++)pipe(g,[-.45,1.96,-1.12],[-.45+Math.sin(a*2.094)*.24,1.96+Math.cos(a*2.094)*.2,-1.12+Math.cos(a*2.094)*.13],.015,M.metal);
 // Visible V engine, cylinder ribs, exhaust, cage and transmission.
 box(g,.85,.55,1.14,M.rubber,0,1.16,1.61);box(g,1.24,.09,1.5,M.coral,0,.85,1.58);
 for(const side of [-1,1]){for(let z=1.17;z<2.1;z+=.29){const c=mesh(g,new T.CylinderGeometry(.17,.21,.45,12),M.metal,side*.38,1.5,z);c.rotation.z=side*-.55;for(let y=1.38;y<1.7;y+=.065)ring(g,.18,.012,M.rubber,side*.45,y,z,true)}curvedPipe(g,[[side*.52,1.35,1.3],[side*.76,1.3,1.65],[side*.75,1.22,2.43]],.057,M.metal);pipe(g,[side*.72,.84,1],[side*.86,2.4,2.08],.04,M.coral)}
 box(g,.7,.22,.65,M.aqua,0,1.77,1.46);box(g,.52,.39,.45,M.coral,-.87,1.0,1.5);box(g,.51,.06,.44,M.white,-.87,1.22,1.5);
 const fan=new T.Group();fan.position.set(0,2.14,2.26);for(let a=0;a<3;a++){const pivot=new T.Group(),blade=ball(pivot,0,.5,0,.14,.54,.055,M.aqua,2);pivot.rotation.z=a*Math.PI*2/3;fan.add(pivot)}ball(fan,0,0,0,.14,.14,.14,M.metal,2);
 for(const z of [2.08,2.45])ring(g,1.17,.028,M.coral,0,2.14,z);for(const r of [.4,.77,1.15])ring(g,r,.012,M.metal,0,2.14,2.46);
 for(let a=0;a<24;a++){const x=Math.sin(a*Math.PI/12)*1.16,y=2.14+Math.cos(a*Math.PI/12)*1.16;pipe(g,[0,2.14,2.47],[x,y,2.47],.009,M.metal);pipe(g,[x,y,2.08],[x,y,2.45],.014,M.metal)}
 for(const x of [-.44,.44]){const rudder=box(g,.055,1.1,.56,M.aqua,x,1.69,2.75);rudder.rotation.y=.08;pipe(g,[x,.95,2.6],[x,2.35,2.6],.025,M.metal)}
 for(const side of [-1,1])for(const z of [-1.9,.35]){const f=mesh(g,new T.CapsuleGeometry(.09,.34,3,10),M.white,side*1.65,.5,z);pipe(g,[side*1.47,.85,z],[side*1.65,.68,z],.013,M.teak)}
 for(const side of [-1,1]){curvedPipe(g,[[side*1.42,.82,1.0],[side*1.42,1.15,.85],[side*1.42,1.15,-.8],[side*1.42,.82,-1]],.023,M.metal);for(let z=-2.5;z<2.7;z+=.4)ball(g,side*1.56,.72,z,.018,.018,.018,M.metal,1)}
 const label=textSign('BARRON + NINA',1.8,.23,{font:'900 80px Nunito',bg:'#f7eac9',color:'#1c6566',border:null});label.position.set(0,.39,3.12);root.add(label);
 const hull=bake(g);root.add(hull,fan);const barron=person(false);barron.position.set(-.46,1.4,-.58);barron.rotation.y=.06;root.add(barron);const nina=person(true);nina.position.set(.58,1.06,-2.27);nina.rotation.y=-.18;root.add(nina);const floatie=flamingo(true);floatie.visible=false;root.add(floatie);root.userData={fan,nina,barron,floatie,hull};return root;
}
function hipRoof(g,w,d,y,material){const points=[[-w/2,y,-d/2],[w/2,y,-d/2],[w/2,y,d/2],[-w/2,y,d/2],[-w*.3,y+2.35,0],[w*.3,y+2.35,0]],indices=[0,4,1,1,4,5,1,5,2,2,5,3,3,5,4,3,4,0];const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geo.setIndex(indices);geo.computeVertexNormals();geo.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap(p=>[(p[0]+w/2)/w,(p[2]+d/2)/d]),2));mesh(g,geo,material);pipe(g,[-w*.3,y+2.35,0],[w*.3,y+2.35,0],.13,material,10)}
function rail(g,w,y,z){pipe(g,[-w/2,y,z],[w/2,y,z],.045,M.white);for(let x=-w/2;x<=w/2;x+=.62)pipe(g,[x,y-.9,z],[x,y,z],.025,M.white)}
export function waterfrontVilla(seed=0){
 const g=new T.Group(),type=seed%4,w=16+(seed%3)*2,d=13,h=type===2?12:8.5,wall=M.wall[seed%4];
 if(type===1){
  box(g,w,h,d,wall,0,h/2,0);box(g,w+3,.4,d+1.5,M.white,1,h+.2,0);box(g,w*.65,3.5,4,M.glass,-w*.1,5.8,d/2+.12);box(g,w*.8,.35,5,M.white,1,4,d/2+1);box(g,w*.55,2.8,3,M.glass,-2,1.65,d/2+.15);for(const x of [-w/2,w/2])box(g,.5,h,4,M.white,x,h/2,d/2+1.1);
  box(g,w*.8,.75,.12,0x85b7ae,1,4.8,d/2+3.42);box(g,w*.35,1.2,3,wall,w*.3,h+.6,-3);
 }else{
  box(g,w,h,d,wall,0,h/2,0);hipRoof(g,w+2,d+2,h,M.roof);
  const floors=type===2?3:2;for(let f=0;f<floors;f++){const y=1.8+f*3.7;box(g,w-.7,2.5,.12,M.glass,0,y,d/2+.04);for(let x=-w/2+.6;x<w/2;x+=3.7)box(g,.55,3.7,.45,wall,x,y,d/2+.22);box(g,w+1,.32,3.8,M.white,0,y-1.5,d/2+1.7);rail(g,w,y-.25,d/2+3.42);for(const x of [-w/2+.3,w/2-.3]){box(g,.43,3.7,.43,M.white,x,y+.25,d/2+3.1);box(g,.68,.15,.65,M.white,x,y-1.35,d/2+3.1)}}
  if(type===3){box(g,w*.55,3.8,7,wall,w*.65,1.9,-1);const wing=new T.Group();hipRoof(wing,w*.65,8,3.9,M.roof);wing.position.x=w*.65;g.add(wing)}
 }
 for(const side of [-1,1])for(let z=-4;z<5;z+=3.5){box(g,.13,2,1.9,M.glass,side*(w/2+.06),2,z);box(g,.15,2,1.9,M.glass,side*(w/2+.06),5.8,z)}
 // Deep pergola, furniture and pool edge create overlapping near-bank silhouettes.
 const pergola=new T.Group();for(const x of [-2.6,2.6])for(const z of [-2,2])pipe(pergola,[x,0,z],[x,3.3,z],.09,M.teak);for(let z=-2.4;z<2.6;z+=.5)box(pergola,6,.16,.13,M.teak,0,3.3,z);box(pergola,3,.45,1.3,M.cloth,0,.7,1.2);pergola.position.set(-w/2-4,0,4);g.add(pergola);
 box(g,6.5,.13,5,M.white,w/2+4,.1,3);box(g,5.8,.03,4.3,0x399fa9,w/2+4,.18,3);for(let i=0;i<2;i++){const x=w/2+2+i*3;box(g,.9,.12,2.3,M.cloth,x,.5,7);const back=box(g,.9,.7,.15,M.cloth,x,.85,8);back.rotation.x=-.35}
 return bake(g);
}
export function sportYacht(seed=0){
 const g=new T.Group(),scale=seed%2?1:.78;const shape=new T.Shape();shape.moveTo(-2.45,7.5);shape.quadraticCurveTo(-2.85,7.5,-2.85,6.6);shape.lineTo(-2.75,-4.8);shape.quadraticCurveTo(-2,-10,0,-11.8);shape.quadraticCurveTo(2,-10,2.75,-4.8);shape.lineTo(2.85,6.6);shape.quadraticCurveTo(2.85,7.5,2.45,7.5);shape.closePath();shell(g,shape,1.8,M.white,1.8);shell(g,shape,.06,M.teak,2.04);
 box(g,5.5,.25,11.3,M.white,0,2.3,.8);const cabin=box(g,4.5,1.5,6.3,M.glass,0,3.2,1.3);cabin.rotation.x=-.14;box(g,5.3,.28,7.8,M.white,0,4.02,1.9);if(seed%2){box(g,3.5,1.1,4,M.glass,0,4.7,2);box(g,4.2,.22,5.2,M.white,0,5.4,2.4)}else{for(const x of [-1.2,1.2])box(g,1.05,.22,3,M.cloth,x,2.3,-4.7)}
 for(const side of [-1,1]){for(let z=-6;z<6.7;z+=1.6)pipe(g,[side*2.7,2.1,z],[side*2.7,2.75,z],.023,M.metal);pipe(g,[side*2.7,2.75,-6],[side*2.7,2.75,6.4],.026,M.metal);for(let z=-3;z<5;z+=1.7)box(g,.08,.27,.78,M.glass,side*2.96,1.05,z)}
 box(g,4,.2,1.4,M.teak,0,.6,8.15);pipe(g,[0,4.15,2.8],[0,6.3,3.1],.07,M.white);ball(g,0,5.9,3.1,.24,.28,.24,M.white,2);box(g,2.7,.13,.25,M.white,0,6.3,3.1);const out=bake(g);out.scale.setScalar(scale);return out;
}
export function canopyTree(seed=0){const g=new T.Group();pipe(g,[0,0,0],[.3,7,0],.33,M.teak,9);for(let i=0;i<14;i++){const a=i*2.399+seed,r=1.3+(i%5)*.64,y=6+(i%4)*1.15;pipe(g,[.2,4,0],[Math.sin(a)*r,y,Math.cos(a)*r],.08,M.teak,5);ball(g,Math.sin(a)*r,y,Math.cos(a)*r,1.75,1.45+(i%3)*.3,1.6,M.leaf[i%3],1)}return bake(g)}
