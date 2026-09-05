import test from 'node:test';
import assert from 'node:assert/strict';
import {createRace,stepRace,pilotInput,hit,horn,frameAt,pointAt,halfWidth,ISLANDS,COURSE_LENGTH,CHECKPOINTS,loadBest,saveBest,medal} from '../florida/core.js';
function playing(){const r=createRace();r.status='racing';return r}
function advance(r,seconds,input={}){for(let i=0;i<seconds*120;i++)stepRace(r,typeof input==='function'?input(r):input,1/120)}
function isolated(s=0){const r=playing();r.objects=[];r.rivals=[];r.s=s;r.heading=frameAt(s).heading;return r}
test('the four kilometre course changes heading and offers navigable routes on both sides of islands',()=>{
 assert.ok(COURSE_LENGTH>3900&&COURSE_LENGTH<4200);
 assert.ok(Math.abs(frameAt(500).heading-frameAt(1500).heading)>.7);
 for(const island of ISLANDS){assert.ok(halfWidth(island.s)>Math.abs(island.x)+island.width+12);const a=pointAt(island.s,-25),b=pointAt(island.s,25);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>49.9)}
});
test('active driving completes every checkpoint, beats the rivals and earns gold; passive driving does not',()=>{
 const active=playing();advance(active,160,pilotInput);assert.equal(active.status,'finished');assert.equal(active.s,COURSE_LENGTH);assert.equal(active.checkpoint,CHECKPOINTS.length);assert.equal(active.endMedal,'GOLD');assert.equal(active.rank,1);assert.ok(active.pickups>10);assert.ok(active.jumps>5);
 const passive=playing();advance(passive,180);assert.equal(passive.endMedal,'BRONZE');assert.equal(passive.rank,4);assert.ok(passive.hits>active.hits);
 const time=active.elapsed;advance(active,10);assert.equal(active.elapsed,time);
});
test('steering changes boat heading and lateral motion, brakes slow it, and banks contain it',()=>{
 const r=isolated(),heading=r.heading;advance(r,.7,{steer:1});assert.ok(r.heading>heading+.2);assert.ok(r.x>0);advance(r,2,{brake:true});assert.ok(r.speed<16);advance(r,15,{steer:1});assert.ok(Math.abs(r.x)<=halfWidth(r.s)-3.29);
});
test('a held drift charges a boost reward released when the turn ends',()=>{
 const r=isolated(3700);r.speed=30;r.boost=0;advance(r,.65,{steer:.6,brake:true});assert.ok(r.driftCharge>.17);advance(r,.01);assert.ok(r.boost>0);assert.ok(r.events.some(e=>e.type==='drift'));
});
test('Cafecito is collected once and boost accelerates the boat',()=>{
 const r=isolated(3700);r.speed=30;r.boost=0;r.objects=[{id:'coffee',type:'coffee',x:0,s:3701,radius:4,scared:0}];advance(r,.03);assert.equal(r.pickups,1);assert.equal(r.boost,.42);assert.equal(r.objects[0].consumed,true);advance(r,1,{boost:true});assert.ok(r.speed>45);advance(r,5,{boost:true});assert.equal(r.boost,0);assert.equal(r.pickups,1);
});
test('Flamingo absorbs one collision; SPF protects without consuming it',()=>{
 const r=isolated();r.speed=30;r.flamingo=true;hit(r);assert.equal(r.flamingo,false);assert.equal(r.speed,30);assert.equal(r.hits,0);r.immunity=0;hit(r);assert.equal(r.hits,1);assert.equal(r.speed,16.5);
 r.immunity=0;r.sunscreen=8;r.flamingo=true;hit(r);assert.equal(r.hits,1);assert.equal(r.flamingo,true);advance(r,9);assert.equal(r.sunscreen,0);
});
test('horn scatters nearby hazards and respects cooldown',()=>{
 const r=isolated();r.objects=[{id:'gator',type:'gator',s:30,x:0,drift:0,scared:0}];assert.equal(horn(r),true);assert.equal(r.objects[0].scared,4);assert.equal(horn(r),false);advance(r,5);assert.equal(horn(r),true);
});
test('ramps launch the boat, clear low hazards and land once',()=>{
 const r=isolated(3700);r.speed=35;r.objects=[{id:'ramp',type:'ramp',s:3701,x:0,radius:5.2,scared:0}];advance(r,.05);assert.equal(r.jumps,1);assert.ok(r.y>0);r.y=2;r.vy=1;hit(r);assert.equal(r.hits,0);advance(r,2);assert.equal(r.y,0);assert.equal(r.jumps,1);assert.ok(r.events.some(e=>e.type==='land'));
});
test('moored yachts have physical hulls and push the boat clear',()=>{
 const r=isolated(3700);r.speed=30;r.x=15;r.objects=[{id:'yacht',type:'mooring',s:3701,x:15,scale:1,radius:3.65,scared:0}];advance(r,.01);assert.equal(r.hits,1);assert.ok(Math.abs(r.x-15)>=5.1);assert.ok(r.speed<=19);
});
test('pause freezes every gameplay timer and restart clears progress',()=>{
 const r=playing();advance(r,4,pilotInput);r.status='paused';const snapshot=JSON.stringify(r);advance(r,4,{steer:1,boost:true});assert.equal(JSON.stringify(r),snapshot);const fresh=createRace();assert.equal(fresh.s,0);assert.equal(fresh.elapsed,0);assert.equal(fresh.hits,0);assert.equal(fresh.flamingo,false);
});
test('V2 records remain separate, reject corruption and tolerate blocked storage',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};storage.setItem('howwemet_florida_best_v1','40');assert.equal(loadBest(storage),null);saveBest(storage,100);saveBest(storage,110);assert.equal(loadBest(storage),100);saveBest(storage,90);assert.equal(loadBest(storage),90);storage.setItem('howwemet_florida_best_v2','garbage');assert.equal(loadBest(storage),null);
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};assert.equal(loadBest(blocked),null);assert.equal(saveBest(blocked,90),90);assert.equal(medal(95),'GOLD');assert.equal(medal(120),'SILVER');assert.equal(medal(121),'BRONZE');
});
