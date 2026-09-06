// Compressed, art-directed Las Olas canals, Bahia Mar, Lake Sylvia and the bridge approach.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const controls=[[-270,220],[-260,70],[-360,-60],[-410,-235],[-260,-350],[-80,-390],[90,-550],[140,-750],[30,-920],[-160,-1050],[-255,-1240],[-230,-1420],[-75,-1570],[105,-1710],[175,-1900],[70,-2110],[-50,-2280],[-75,-2530],[-35,-2780],[-25,-3040]];
const spline=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
export const TRACK=[];let total=0;
for(let k=0;k<controls.length-1;k++)for(let j=0;j<60;j++){
 const a=controls[Math.max(0,k-1)],b=controls[k],c=controls[k+1],d=controls[Math.min(controls.length-1,k+2)],t=j/60;
 const x=spline(a[0],b[0],c[0],d[0],t),z=spline(a[1],b[1],c[1],d[1],t),last=TRACK.at(-1);
 if(last)total+=Math.hypot(x-last.x,z-last.z);TRACK.push({x,z,s:total});
}
const end=controls.at(-1),last=TRACK.at(-1);total+=Math.hypot(end[0]-last.x,end[1]-last.z);TRACK.push({x:end[0],z:end[1],s:total});
export const COURSE_LENGTH=total;
export const DISTRICTS=Object.freeze([
 {id:'downtown',name:'NEW RIVER',start:0,end:.21},
 {id:'marina',name:'SUPERYACHT MARINA',start:.21,end:.44},
 {id:'mangrove',name:'MANGROVE CUT',start:.44,end:.63},
 {id:'cove',name:'PARTY COVE',start:.63,end:.80},
 {id:'bridge',name:'THE BRIDGE RUN',start:.80,end:1}
].map(Object.freeze));
export const districtAt=s=>DISTRICTS.find(d=>s/total<d.end)||DISTRICTS.at(-1);
export const CHECKPOINTS=[.20,.43,.63,.82].map(f=>f*total);
export const ISLANDS=[
 {s:total*.355,x:7,width:18,length:165,name:'MARINA CUT',district:'marina'},
 {s:total*.55,x:6,width:21,length:205,name:'MANGROVE SHORTCUT',district:'mangrove'}
];
export function frameAt(s){
 let lo=0,hi=TRACK.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(TRACK[m].s<s)lo=m;else hi=m}
 const a=TRACK[lo],b=TRACK[hi],u=(s-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,h=Math.atan2(dx,-dz);
 return{x:a.x+dx*u,z:a.z+dz*u,heading:h,nx:Math.cos(h),nz:Math.sin(h),fx:Math.sin(h),fz:-Math.cos(h)};
}
export function pointAt(s,x=0){const p=frameAt(s);return{...p,x:p.x+p.nx*x,z:p.z+p.nz*x}}
export const curvature=s=>angleDelta(frameAt(s+7).heading,frameAt(s-7).heading)/14;
// Keep the waterfront close to the racing boat. Extra room belongs to the
// departing yacht's basin and island splits, rather than the entire district.
const widths=[[0,27],[.13,25],[.205,30],[.245,43],[.282,62],[.313,44],[.338,57],[.365,59],[.40,42],[.44,40],[.485,35],[.55,50],[.59,42],[.645,53],[.70,58],[.76,55],[.80,50],[.835,40],[1,39]];
export function halfWidth(s){
 const u=clamp(s/total,0,1);for(let i=1;i<widths.length;i++)if(u<=widths[i][0]){const a=widths[i-1],b=widths[i],t=(u-a[0])/(b[0]-a[0]),ease=t*t*(3-2*t);return a[1]+(b[1]-a[1])*ease}return widths.at(-1)[1];
}
export function islandAt(s){for(const i of ISLANDS){const t=(s-i.s)/(i.length/2);if(Math.abs(t)<1)return{...i,radius:i.width*Math.sqrt(1-t*t)}}return null}
export function racingLine(s,side=-1){const island=islandAt(s);return island?island.x+side*(island.radius+10):clamp(-curvature(s)*1800,-9,9)}
export const sector=s=>districtAt(s).name;
export const routeBounds={minX:Math.min(...TRACK.map(p=>p.x))-80,maxX:Math.max(...TRACK.map(p=>p.x))+80,minZ:Math.min(...TRACK.map(p=>p.z)),maxZ:Math.max(...TRACK.map(p=>p.z))};

// Busy banks remain close throughout the city, marina, cove and final sprint.
// The mangrove bank is empty; cove raft-ups add a second row away from the line.
// These exact hull transforms are also used by the renderer and collision code.
const moorings=[];
function moor(id,s,side,model,scale=1,inset=7,yaw=0){
 const radius=({sport:3.1,super:3.75,sail:2.9}[model])*scale,halfLength=({sport:12.2,super:15.4,sail:12}[model])*scale;
 moorings.push(Object.freeze({id,s,x:side*(halfWidth(s)-inset),model,scale,radius,halfLength,yaw}));
}
for(let s=total*.012,i=0;s<total*.205;s+=35,i++)for(const side of [-1,1]){
 moor(`river-visitor-${i}-${side}`,s,side,i%6===4?'sail':'sport',.65+(i%4)*.065,5.5,side===1?Math.PI:0);
}
for(let s=total*.225,i=0;s<total*.425;s+=41,i++)for(const side of [-1,1]){
 // Leave the departing vessel's berth and passage visibly open.
 if(side===1&&Math.abs(s-total*.282)<43)continue;
 const model=i%5===0?'sail':i%3===0?'sport':'super',scale=model==='super'?1.05+(i%3)*.10:.80+(i%2)*.12;
 moor(`marina-slip-${i}-${side}`,s,side,model,scale,8.5,side===1?Math.PI:0);
}
for(const [cluster,f]of [.672,.727,.779].entries())for(const side of [-1,1])for(let j=0;j<3;j++){
 moor(`cove-raft-${cluster}-${side}-${j}`,f*total+j*27,side,j===1?'sail':'sport',.76+(j%2)*.1,17+(j%2)*11,side===1?Math.PI:0);
}
for(let s=total*.642,i=0;s<total*.794;s+=47,i++)for(const side of [-1,1]){
 moor(`cove-berth-${i}-${side}`,s,side,i%4===0?'super':'sport',i%4===0?.9:.78+(i%3)*.07,6,side===1?Math.PI:0);
}
for(let s=total*.812,i=0;s<total*.985;s+=36,i++)for(const side of [-1,1]){
 if(side===1&&s>total*.955)continue;
 moor(`bridge-visitor-${i}-${side}`,s,side,i%5===2?'super':i%5===4?'sail':'sport',i%5===2?.9:.76+(i%3)*.06,6,side===1?Math.PI:0);
}
export const MOORINGS=Object.freeze(moorings.sort((a,b)=>a.s-b.s));
