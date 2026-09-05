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
export const CHECKPOINTS=[.22,.46,.7,.89].map(f=>f*total);
export const ISLANDS=[{s:total*.41,x:9,width:19,length:165,name:'MARINA CUT'},{s:total*.68,x:-5,width:22,length:200,name:'SYLVIA SHORTCUT'}];
export function frameAt(s){
 let lo=0,hi=TRACK.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(TRACK[m].s<s)lo=m;else hi=m}
 const a=TRACK[lo],b=TRACK[hi],u=(s-a.s)/(b.s-a.s),dx=b.x-a.x,dz=b.z-a.z,h=Math.atan2(dx,-dz);
 return{x:a.x+dx*u,z:a.z+dz*u,heading:h,nx:Math.cos(h),nz:Math.sin(h),fx:Math.sin(h),fz:-Math.cos(h)};
}
export function pointAt(s,x=0){const p=frameAt(s);return{...p,x:p.x+p.nx*x,z:p.z+p.nz*x}}
export const curvature=s=>angleDelta(frameAt(s+7).heading,frameAt(s-7).heading)/14;
export function halfWidth(s){const u=s/total;return 24+48*Math.exp(-(((u-.41)/.065)**2))+51*Math.exp(-(((u-.68)/.075)**2))+30/(1+Math.exp(-(u-.79)*40))}
export function islandAt(s){for(const i of ISLANDS){const t=(s-i.s)/(i.length/2);if(Math.abs(t)<1)return{...i,radius:i.width*Math.sqrt(1-t*t)}}return null}
export function racingLine(s,side=-1){const island=islandAt(s);return island?island.x+side*(island.radius+10):clamp(-curvature(s)*1800,-9,9)}
export const sector=s=>s<total*.27?'LAS OLAS ISLES':s<total*.52?'BAHIA MAR':s<total*.77?'LAKE SYLVIA':'THE BRIDGE RUN';
export const routeBounds={minX:Math.min(...TRACK.map(p=>p.x))-80,maxX:Math.max(...TRACK.map(p=>p.x))+80,minZ:Math.min(...TRACK.map(p=>p.z)),maxZ:Math.max(...TRACK.map(p=>p.z))};

// Rendered moorings and physical hulls share the same layout.
export const MOORINGS=Object.freeze(Array.from({length:Math.ceil(COURSE_LENGTH/100)+8},(_,n)=>n-2).flatMap(i=>[-1,1].flatMap(side=>[-34,0,34].flatMap(off=>{
 const s=i*100,at=s+off;if(side===1&&s>COURSE_LENGTH-175&&s<COURSE_LENGTH+80)return[];
 return[{id:`mooring-${i}-${side}-${off}`,s:at+14,x:side*(halfWidth(at)-7.5),scale:[.55,.74,1][Math.abs(i)%3]}];
}))));
