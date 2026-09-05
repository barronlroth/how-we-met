import {clamp,angleDelta,frameAt,pointAt,curvature,halfWidth,islandAt,racingLine,COURSE_LENGTH,CHECKPOINTS,ISLANDS,MOORINGS,sector} from './course.js';
export {clamp,angleDelta,frameAt,pointAt,curvature,halfWidth,islandAt,racingLine,COURSE_LENGTH,CHECKPOINTS,ISLANDS,MOORINGS,sector};
export const MEDAL_TIMES=Object.freeze({gold:95,silver:120});
export const medal=t=>t<=MEDAL_TIMES.gold?'GOLD':t<=MEDAL_TIMES.silver?'SILVER':'BRONZE';
export const formatTime=s=>`${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`;
const pickupTypes=['coffee','flamingo','sunscreen'];
export function courseObjects(){
 const objects=MOORINGS.map(m=>({...m,type:'mooring',radius:3.65*m.scale}));let seed=920441;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let s=170,i=0;s<COURSE_LENGTH-170;s+=95+rand()*70,i++){
  const lane=racingLine(s),w=halfWidth(s)-6;
  for(let j=0;j<(i%3===0?3:1);j++){
   let x=clamp(lane+(rand()-.5)*w*1.45+j*7,-w,w),island=islandAt(s+j*8);
   if(island&&Math.abs(x-island.x)<island.radius+6)x=island.x+(j%2?1:-1)*(island.radius+9);
   objects.push({id:`hazard-${i}-${j}`,type:i%4===0?'gator':'floater',s:s+j*8,x,drift:rand()*6.28,radius:i%4===0?2.8:2.3});
  }
 }
 for(let s=70,i=0;s<COURSE_LENGTH-50;s+=100,i++){
  const type=i%7===3?'flamingo':i%7===5?'sunscreen':'coffee',x=racingLine(s,i%3===0?1:-1)+Math.sin(i*3)*5;
  objects.push({id:`pickup-${i}`,type,s,x,radius:4});
 }
 for(let s=270,i=0;s<COURSE_LENGTH-180;s+=365,i++)objects.push({id:`ramp-${i}`,type:'ramp',s,x:racingLine(s)+((i%2)*2-1)*6,radius:5.2});
 for(const [i,f]of [.32,.48,.58,.79,.92].entries())objects.push({id:`taxi-${i}`,type:'taxi',s:f*COURSE_LENGTH,x:0,drift:i*2.6,radius:5});
 for(let s=520,i=0;s<COURSE_LENGTH-150;s+=310,i++)objects.push({id:`wake-${i}`,type:'wake',s,x:racingLine(s),radius:17});
 return objects.sort((a,b)=>a.s-b.s);
}
export function createRace(){return{status:'ready',demo:false,s:0,x:0,heading:frameAt(0).heading,turn:0,vx:0,speed:0,elapsed:0,y:0,vy:0,boost:.55,boosting:false,drifting:false,driftCharge:0,driftTotal:0,drafting:false,combo:0,comboTime:0,flamingo:false,sunscreen:0,immunity:0,hornCooldown:0,hornFlash:0,checkpoint:0,hits:0,jumps:0,nearMisses:0,pickups:0,rank:4,events:[],objects:courseObjects().map(o=>({...o,consumed:false,passed:false,scared:0})),rivals:[{s:20,x:-7,heading:frameAt(20).heading,speed:0,pace:39.8,lane:-1},{s:35,x:6,heading:frameAt(35).heading,speed:0,pace:42.5,lane:1},{s:52,x:-2,heading:frameAt(52).heading,speed:0,pace:44.7,lane:-1}],lastCallout:-10,endMedal:null}};
export function objectX(o,t){
 if(o.type==='taxi')return Math.sin(t*.16+o.drift)*(halfWidth(o.s)-11);
 if(!['gator','floater'].includes(o.type))return o.x;
 return o.x+Math.sin(t*(o.type==='gator'?.8:.45)+o.drift)*(o.type==='gator'?4:2)+(o.scared?(Math.sign(o.x)||1)*(1-o.scared/4)*12:0);
}
export function hit(r,side=1){
 if(r.immunity>0||r.y>1.5)return;r.immunity=1.15;
 if(r.sunscreen>0){r.events.push({type:'glance',text:'SPF 1000. Slip right through.'});r.heading+=side*.08}
 else if(r.flamingo){r.flamingo=false;r.events.push({type:'bounce',text:'Flamingo down. Dignity intact.'});r.vy=3.5;r.y=.1}
 else{r.hits++;r.speed*=.55;r.combo=0;r.events.push({type:'hit',text:['Eyes on the water, babe.','We meant to do that.','That was a very expensive-looking boat.'][r.hits%3]})}
}
export function horn(r){
 if(r.status!=='racing'||r.hornCooldown>0)return false;r.hornCooldown=4;r.hornFlash=1;let count=0;
 for(const o of r.objects)if(['gator','floater'].includes(o.type)&&o.s>r.s-4&&o.s<r.s+85&&Math.abs(objectX(o,r.elapsed)-r.x)<23){o.scared=4;count++}
 r.events.push({type:'horn',text:count?'Coming through, gentlemen!':'Subtle. Very subtle.'});return true;
}
// Demonstration input uses the real vehicle physics; demo runs cannot save records.
export function pilotInput(r){
 const look=clamp(22+r.speed*.62,25,52),future=racingLine(r.s+look),p=pointAt(r.s,r.x),q=pointAt(r.s+look,future);
 const desired=Math.atan2(q.x-p.x,-(q.z-p.z)),error=angleDelta(desired,r.heading),bend=Math.abs(curvature(r.s+28));
 return{steer:clamp(error*3.7-r.turn*.44,-1,1),brake:bend>.009&&r.speed>27,boost:bend<.005&&Math.abs(error)<.22};
}
function advanceRivals(r,dt){
 for(const v of r.rivals){
  const target=v.pace*(1-Math.min(.22,Math.abs(curvature(v.s+28))*12));v.speed+=(target-v.speed)*(1-Math.exp(-dt*1.4));v.s=Math.min(COURSE_LENGTH+40,v.s+v.speed*dt);
  const oldX=v.x;v.x+=(racingLine(v.s+24,v.lane)+Math.sin(v.s*.012+v.pace)*2-v.x)*(1-Math.exp(-dt*2.2));v.heading=frameAt(v.s).heading+Math.atan2((v.x-oldX)/dt,v.speed);
  if(Math.abs(v.s-r.s)<5&&Math.abs(v.x-r.x)<3.8&&r.y<1.5)hit(r,Math.sign(r.x-v.x)||1);
 }
 const rank=1+r.rivals.filter(v=>v.s>r.s).length;if(rank<r.rank&&r.elapsed>3)r.events.push({type:'overtake',text:rank===1?'There we go. Lead the way!':'See you at Fisheries!'});r.rank=rank;
}
export function stepRace(r,input,dt){
 if(r.status!=='racing')return;dt=clamp(dt,0,1/30);r.elapsed+=dt;
 for(const f of ['sunscreen','immunity','hornCooldown','hornFlash','comboTime'])r[f]=Math.max(0,r[f]-dt);if(!r.comboTime)r.combo=0;
 r.boosting=!!input.boost&&r.boost>.005&&!input.brake;if(r.boosting){r.boost=Math.max(0,r.boost-dt*.145);if(r.boost<.005)r.boost=0}
 const steer=clamp(input.steer||0,-1,1),wasDrifting=r.drifting;r.drifting=!!input.brake&&Math.abs(steer)>.25&&r.speed>17&&r.y<.3;
 if(r.drifting){r.driftCharge=Math.min(1,r.driftCharge+dt*.36);r.driftTotal+=dt}
 if(wasDrifting&&!r.drifting){if(r.driftCharge>.17){r.boost=Math.min(1,r.boost+r.driftCharge*.42);r.events.push({type:'drift',text:'Beautiful turn. Free cafecito!'})}r.driftCharge=0}
 r.drafting=r.rivals.some(v=>v.s>r.s+6&&v.s<r.s+40&&Math.abs(v.x-r.x)<5.5);if(r.drafting)r.boost=Math.min(1,r.boost+dt*.09);
 const target=input.brake?(r.drifting?27:15):r.boosting?54:37.5+(r.drafting?3:0);r.speed+=(target-r.speed)*(1-Math.exp(-dt*(input.brake?2.6:1.65)));
 const turnTarget=steer*(r.drifting?1.15:r.boosting?.64:.84)*(r.y>1?.5:1);r.turn+=(turnTarget-r.turn)*(1-Math.exp(-dt*(r.drifting?4.8:7)));r.heading+=r.turn*dt;
 const frame=frameAt(r.s),error=angleDelta(r.heading,frame.heading),metric=clamp(1-curvature(r.s)*r.x,.5,1.7),previousS=r.s;
 r.vx=Math.sin(error)*r.speed;r.x+=r.vx*dt;r.s=clamp(r.s+Math.cos(error)*r.speed/metric*dt,0,COURSE_LENGTH);
 if(r.y>0||r.vy>0){r.vy-=18*dt;r.y+=r.vy*dt;if(r.y<=0){r.y=0;r.vy=0;r.events.push({type:'land'})}}
 const edge=halfWidth(r.s)-3.3;if(Math.abs(r.x)>edge){const side=-Math.sign(r.x);r.x=clamp(r.x,-edge,edge);hit(r,side);r.heading=frameAt(r.s).heading+side*.18;r.turn*=.2;r.speed=Math.min(r.speed,18)}
 const island=islandAt(r.s);if(island&&Math.abs(r.x-island.x)<island.radius+2.8){const side=Math.sign(r.x-island.x)||-1;r.x=island.x+side*(island.radius+3);hit(r,side);r.heading=frameAt(r.s).heading+side*.23;r.speed=Math.min(r.speed,19)}
 for(const o of r.objects){
  o.scared=Math.max(0,o.scared-dt);if(o.consumed||o.passed||o.s>r.s+110||o.s<Math.min(previousS,r.s)-18)continue;
  const dx=Math.abs(objectX(o,r.elapsed)-r.x),dz=o.s-r.s,inRange=dz<4.8&&dz>-5.5;
  if(o.type==='mooring'){if(Math.abs(dz)<13.5*o.scale+2&&dx<o.radius+1.45&&r.y<2){const side=Math.sign(r.x-o.x)||-Math.sign(o.x);r.x=o.x+side*(o.radius+1.5);hit(r,side);r.heading=frameAt(r.s).heading+side*.2;r.speed=Math.min(r.speed,19)}continue}
  if(pickupTypes.includes(o.type)&&inRange&&dx<o.radius+1.3&&r.y<5){
   o.consumed=true;r.pickups++;
   if(o.type==='coffee'){r.boost=Math.min(1,r.boost+.42);r.events.push({type:'coffee',text:'Cafecito. Send it!'})}
   if(o.type==='flamingo'){r.flamingo=true;r.events.push({type:'flamingo',text:'Emotional support flamingo. Secured.'})}
   if(o.type==='sunscreen'){r.sunscreen=8;r.events.push({type:'sunscreen',text:'SPF one thousand. Very Miami of us.'})}
  }else if(['ramp','wake'].includes(o.type)&&inRange&&dx<o.radius&&r.y<.2&&r.speed>18){o.passed=true;r.vy=o.type==='wake'?4.5:r.boosting?12.6:10;r.y=.1;r.jumps++;r.boost=Math.min(1,r.boost+(o.type==='ramp'?.12:0));r.events.push({type:'jump',text:o.type==='ramp'?'We are absolutely flying!':null})}
  else if(['gator','floater','taxi'].includes(o.type)&&!o.scared){
   if(inRange&&dx<o.radius+1.3&&r.y<1.6){hit(r,Math.sign(r.x-objectX(o,r.elapsed))||1);o.passed=true}
   else if(dz<-5.5){o.passed=true;if(dx<o.radius+5&&r.y<1.5){r.nearMisses++;r.combo=Math.min(5,r.combo+1);r.comboTime=5;r.boost=Math.min(1,r.boost+.08+r.combo*.025);r.events.push({type:'near',text:r.combo>1?`${r.combo}× close calls. Keep it going!`:'Close call. More cafecito.'})}}
  }
 }
 advanceRivals(r,dt);
 if(r.checkpoint<CHECKPOINTS.length&&r.s>=CHECKPOINTS[r.checkpoint]){r.checkpoint++;r.events.push({type:'checkpoint'})}
 if(r.s>=COURSE_LENGTH){r.status='finished';r.endMedal=medal(r.elapsed);r.events.push({type:'finish'})}
}
const STORAGE_KEY='howwemet_florida_best_v2';
export function loadBest(storage){try{const n=Number(storage.getItem(STORAGE_KEY));return Number.isFinite(n)&&n>0?n:null}catch{return null}}
export function saveBest(storage,seconds){const best=loadBest(storage);if(!Number.isFinite(seconds)||seconds<=0)return best;const next=best===null?seconds:Math.min(best,seconds);try{storage.setItem(STORAGE_KEY,String(next))}catch{}return next}
