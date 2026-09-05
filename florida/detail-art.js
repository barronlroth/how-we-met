import * as T from 'three';
import {C,mat,box,ball,pipe,ring,bake,airboat,textSign} from './art.js';
const put=(g,geo,material,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,typeof material==='number'?mat(material):material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m};
const glass=mat(0x254b59,{roughness:.18,metalness:.32});
export async function prepareMaterials(){
 const deck=await new T.TextureLoader().loadAsync('./assets/teak-v2.png');deck.colorSpace=T.SRGBColorSpace;deck.wrapS=deck.wrapT=T.RepeatWrapping;deck.repeat.set(1,2);deck.anisotropy=8;
 for(const c of [C.wood,0xaa845d,0xc99e6b]){const m=mat(c);m.color.setHex(0xffffff);m.map=deck;m.roughness=.76;m.needsUpdate=true}
 for(const c of [C.cream,C.white,0xd4dfc5]){mat(c).roughness=.44}
 for(const c of [C.coral,C.teal]){mat(c).roughness=.35;mat(c).metalness=.06}
 for(const c of [C.skin,C.skinNina])mat(c).roughness=.76;
 for(const c of [0x396974,0x315c65,0x497783,0x366876]){mat(c).roughness=.2;mat(c).metalness=.32}
}
export function heroBoat(){
 const root=airboat(),g=new T.Group();
 // Rivets, fenders, reinforced cage, visible engine and rudder surfaces.
 for(const side of [-1,1]){
  for(let z=-2.55;z<2.7;z+=.3)ball(g,side*1.43,.87,z,.021,.021,.021,0xb0bdba,1);
  for(const z of [-1.3,1.15]){const f=put(g,new T.CapsuleGeometry(.12,.46,3,10),C.cream,side*1.49,.48,z);f.rotation.z=side*.12;pipe(g,[side*1.36,.92,z],[side*1.49,.65,z],.018,C.wood)}
  for(const z of [-2.4,1.2]){box(g,.25,.035,.07,0x95aaa7,side*1.12,.94,z);pipe(g,[side*1.12,.94,z-.1],[side*1.12,.94,z+.1],.03,0x899f9d)}
 }
 for(const z of [2.02,2.16])ring(g,1.44,.026,0xc5cdc4,0,2.22,z);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;pipe(g,[Math.cos(a)*1.42,2.22+Math.sin(a)*1.42,1.9],[Math.cos(a)*1.42,2.22+Math.sin(a)*1.42,2.37],.024,0xbfcac2)}
 box(g,.92,.18,.95,0x273b3c,0,1.5,1.6);
 for(let i=0;i<7;i++)box(g,.82,.025,.045,0x9eaaa2,0,1.63,1.25+i*.1);
 for(const x of [-.4,.4]){pipe(g,[x,1.38,1.56],[x*1.25,1.69,1.86],.052,0x4d6262);pipe(g,[x*1.25,1.69,1.86],[x*1.25,1.69,2.4],.055,0x606f68)}
 for(const x of [-.47,.47])box(g,.07,1.3,.65,C.teal,x,1.55,2.65);
 box(g,.22,.36,.14,C.coral,-.62,1.2,1.45);ring(g,.09,.018,0xc6d4cc,-.62,1.42,1.45);
 box(g,.86,.08,.65,0xe2e2c9,0,1.71,.13);box(g,.78,.58,.08,0xe2e2c9,0,1.98,.47);
 for(const x of [-.21,.21]){const dial=put(g,new T.CircleGeometry(.072,16),mat(0x193a3f),x,2.14,-1.015);dial.rotation.x=-.4;pipe(g,[x,2.14,-1.027],[x+.024,2.17,-1.027],.006,C.cream)}
 root.add(bake(g));return root;
}
export function raceBoat(color=C.coral){
 const g=new T.Group(),s=new T.Shape();s.moveTo(-1.18,2.7);s.lineTo(1.18,2.7);s.lineTo(1.05,-1.8);s.quadraticCurveTo(.9,-3.9,0,-4.2);s.quadraticCurveTo(-.9,-3.9,-1.05,-1.8);s.closePath();
 const geo=new T.ExtrudeGeometry(s,{depth:.48,bevelEnabled:true,bevelSize:.14,bevelThickness:.12,bevelSegments:3});geo.rotateX(Math.PI/2);put(g,geo,C.white,0,.6,0);
 box(g,1.7,.22,5.6,color,0,.85,-.2);box(g,1.5,.55,1.8,glass,0,1.15,-.25);box(g,.95,.14,1.2,C.cream,0,1.1,1.3);ball(g,0,1.57,.9,.29,.38,.28,C.skin,2);ball(g,0,1.79,.93,.31,.2,.29,C.navy,1);
 for(const x of [-.45,.45])box(g,.35,.85,.35,0x344d54,x,.33,2.7);
 return bake(g);
}
export function superyacht(size=1){
 const g=new T.Group(),s=new T.Shape();s.moveTo(-3.3,10.5);s.lineTo(3.3,10.5);s.lineTo(3.35,-6.5);s.quadraticCurveTo(3,-13,0,-15);s.quadraticCurveTo(-3,-13,-3.35,-6.5);s.closePath();
 const geo=new T.ExtrudeGeometry(s,{depth:2.1,bevelEnabled:true,bevelSize:.32,bevelThickness:.3,bevelSegments:3});geo.rotateX(Math.PI/2);put(g,geo,C.white,0,2.1,0);
 box(g,5.65,.12,18,C.wood,0,2.4,1);box(g,5.7,1.1,13,glass,0,3.08,1);box(g,6.1,.3,14.6,C.white,0,3.77,.7);box(g,4.6,1.1,8.4,glass,0,4.46,1);box(g,5.6,.35,10.8,C.white,0,5.15,1.1);box(g,3.8,.75,5.1,C.cream,0,5.7,1.7);box(g,4.2,.25,6.4,C.white,0,6.2,1.2);
 for(const side of [-1,1]){for(let z=-8;z<10;z+=1.5){pipe(g,[side*3.1,2.4,z],[side*3.1,3.1,z],.033,0xc3d0ca)}pipe(g,[side*3.1,3.1,-8],[side*3.1,3.1,10],.035,0xc3d0ca);for(let z=-7;z<8;z+=2.2)box(g,.06,.38,.92,glass,side*3.65,1.35,z)}
 for(const x of [-1.5,1.5])box(g,1.15,.24,2.7,C.cream,x,2.55,-9.2);
 pipe(g,[0,6.35,1],[0,8,1],.06,C.white);box(g,2.4,.15,.23,C.white,0,7.8,1);for(const x of [-.8,.8])ball(g,x,6.75,2.6,.34,.4,.34,C.white,2);
 const b=bake(g);b.scale.setScalar(size);return b;
}
export function waterTaxi(){
 const g=new T.Group();box(g,3.2,.7,9.5,C.gold,0,.25,0);box(g,2.95,.28,9.2,C.cream,0,.7,0);
 for(const side of [-1,1]){for(let z=-3.6;z<=3.6;z+=1.8)pipe(g,[side*1.3,.75,z],[side*1.3,2.85,z],.055,C.white);box(g,.15,.6,8.4,C.gold,side*1.5,1.15,0)}
 box(g,3.55,.22,9.5,C.gold,0,2.88,0);const sign=textSign('WATER TAXI',5.5,.75,{bg:'#ffd648',color:'#193d4c'});sign.position.set(-1.63,1.45,0);sign.rotation.y=-Math.PI/2;g.add(sign);
 for(let z=-3;z<3.5;z+=1.35){box(g,2.5,.25,.7,C.white,0,1,z);for(const x of [-.8,.8]){ball(g,x,1.6,z,.19,.36,.16,[C.coral,C.teal,C.cream][Math.floor(z+4)%3]);ball(g,x,2.03,z,.16,.2,.16,C.skin,1)}}
 return bake(g);
}
export function broadleaf(seed=0){
 const g=new T.Group();pipe(g,[0,0,0],[.4,7.5,0],.25,0x837150,8);
 for(let i=0;i<9;i++){const a=i*2.4+seed,r=1.3+(i%3)*1.1;ball(g,Math.sin(a)*r,7.7+(i%3)*1.3,Math.cos(a)*r,2.3,2.1,2.5,[0x3e7035,0x5b873e,0x779640][i%3],2)}return bake(g);
}
export function lushPalm(seed=0){
 const g=new T.Group(),lean=Math.sin(seed)*1.3;
 // Flat bark bands keep the same silhouette without ten 448-triangle tori.
 for(let i=0;i<10;i++){pipe(g,[lean*(i/10)**2,i*.85,0],[lean*((i+1)/10)**2,(i+1)*.85,0],.2-i*.009,0x9c8b63,9);put(g,new T.CylinderGeometry(.214-i*.009,.214-i*.009,.036,9,1,true),0x7e7258,lean*(i/10)**2,i*.85,0)}
 for(let f=0;f<11;f++){
  const angle=f*Math.PI*2/11+seed,verts=[],inds=[],len=4.3+(f%3)*.45;
  for(let j=0;j<=10;j++){const t=j/10,r=t*len,h=8.5+Math.sin(t*2.7)*1.9-t*t*2.3,w=Math.sin(t*Math.PI)*.43;
   for(const side of [-1,1])verts.push(lean+Math.cos(angle)*r+Math.sin(angle)*w*side,h,Math.sin(angle)*r-Math.cos(angle)*w*side);
   if(j<10){const k=j*2;inds.push(k,k+1,k+2,k+1,k+3,k+2)}
   if(j>1&&j<9)for(const side of [-1,1]){const a=angle+side*.08;pipe(g,[lean+Math.cos(angle)*r,h,Math.sin(angle)*r],[lean+Math.cos(a)*(r+.33)+Math.sin(angle)*w*side,h-.13,Math.sin(a)*(r+.33)-Math.cos(angle)*w*side],.014,0x729245,3)}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(inds);geo.computeVertexNormals();put(g,geo,mat([0x456c35,0x5d8237,0x809c44][f%3],{side:T.DoubleSide,roughness:.75}));
 }
 for(let i=0;i<4;i++)ball(g,lean+Math.sin(i*2)*.3,8.1,Math.cos(i*2)*.3,.16,.2,.16,0x817442,1);
 return bake(g);
}
export function shrub(seed=0){const g=new T.Group();for(let i=0;i<5;i++)ball(g,Math.sin(i*2+seed)*1.2,.65+(i%2)*.45,Math.cos(i*2)*.7,1,.8,1,[0x527a41,0x758b47,0x3e743b][i%3],1);if(seed%3===0)for(let i=0;i<8;i++)ball(g,Math.sin(i*2)*1.6,1.2,Math.cos(i*2)*.8,.16,.12,.16,0xdf7890,0);return bake(g)}
export function condo(seed=0){
 const g=new T.Group(),floors=5+(seed%7),w=16+(seed%3)*5,d=15,h=floors*3.15;
 box(g,w,h,d,[0xf0e5ca,0xd9e3d7,0xe7d4be][seed%3],0,h/2,0);
 for(let f=0;f<floors;f++){const y=1.7+f*3.15;for(const side of [-1,1]){box(g,w+.8,.22,2.25,C.white,0,y-1.15,side*(d/2+.5));box(g,w-1,1.65,.1,glass,0,y+.15,side*(d/2+.05));box(g,w,.6,.08,mat(0x88b7b8,{roughness:.25,metalness:.2}),0,y-.7,side*(d/2+1.5));for(let x=-w/2+1;x<w/2;x+=3.4)box(g,.22,2.2,.24,C.white,x,y,side*(d/2+.2))}}
 box(g,w+1,.45,d+1,C.white,0,h+.25,0);box(g,4,1.7,5,0xb7bbae,-w/4,h+1,1);return bake(g);
}
export function marinaPier(length=30){
 const g=new T.Group();box(g,3,.28,length,C.wood,0,.7,0);
 for(let z=-length/2;z<=length/2;z+=4){for(const x of [-1.6,1.6]){pipe(g,[x,-1,z],[x,1.4,z],.14,0x967d51,9);ball(g,x,1.46,z,.15,.08,.15,C.cream,1);if(Math.round(z)%8===0){box(g,.4,.9,.4,C.cream,x,1.25,z);box(g,.3,.22,.42,0x74aab1,x,1.58,z)}}}
 return bake(g);
}
export function pavilion(){const g=new T.Group();box(g,12,.35,16,C.wood,0,.9,0);for(const x of [-5,5])for(const z of [-7,7])pipe(g,[x,1,z],[x,5,z],.16,C.cream);const roof=put(g,new T.ConeGeometry(10,3,4),0xb76040,0,6.2,0);roof.rotation.y=Math.PI/4;return bake(g)}
export function parasol(){const g=new T.Group();pipe(g,[0,0,0],[0,3.3,0],.045,0xf4e6be);put(g,new T.ConeGeometry(2.2,.6,10),mat(0xffde83,{side:T.DoubleSide}),0,3.15,0);box(g,1.7,.12,1.7,C.white,0,1,0);for(const x of [-1.2,1.2]){box(g,.65,.14,.65,C.white,x,.65,0);box(g,.65,.65,.1,C.white,x,1,.35)}return bake(g)}
