import test from 'node:test';
import assert from 'node:assert/strict';
import {DISTRICTS,districtAt,sector,COURSE_LENGTH,CHECKPOINTS,ISLANDS,MOORINGS,halfWidth,islandAt,racingLine,frameAt,courseObjects,objectX,createRace,stepRace,pilotInput,fireWater} from '../florida/core.js';

const tick=1/120;
function playing(s=3700){const r=createRace();Object.assign(r,{status:'racing',s,heading:frameAt(s).heading,objects:[],rivals:[]});return r}
function advance(r,seconds,input={}){for(let i=0;i<Math.round(seconds/tick);i++)stepRace(r,input,tick)}
function yacht(s=3718){return{id:'departure-test',type:'yacht',s,x:0,scale:1.35,radius:5.1,halfLength:20.8,yaw:Math.PI/2,departureAt:-500000,departureDuration:1000000,scared:0}}

test('five districts cover the whole course with precise boundaries and visible labels',()=>{
 assert.deepEqual(DISTRICTS.map(d=>d.id),['downtown','marina','mangrove','cove','bridge']);
 assert.equal(DISTRICTS[0].start,0);assert.equal(DISTRICTS.at(-1).end,1);
 for(const [i,d]of DISTRICTS.entries()){
  assert.equal(districtAt((d.start+d.end)/2*COURSE_LENGTH),d);
  assert.equal(sector((d.start+d.end)/2*COURSE_LENGTH),d.name);
  if(i){assert.equal(d.start,DISTRICTS[i-1].end);assert.equal(districtAt(d.start*COURSE_LENGTH),d)}
 }
 assert.equal(districtAt(-100).id,'downtown');assert.equal(districtAt(COURSE_LENGTH+100).id,'bridge');
 assert.deepEqual(CHECKPOINTS.map(s=>Math.round(s/COURSE_LENGTH*100)),[20,43,63,82]);
});

test('district banks stay intimate outside the yacht basins while the cove still opens beyond the river',()=>{
 assert.ok(halfWidth(COURSE_LENGTH*.70)>halfWidth(COURSE_LENGTH*.13)*2);
 for(const f of [.02,.08,.13,.19])assert.ok(halfWidth(COURSE_LENGTH*f)<=30);
 for(const f of [.65,.70,.75,.79])assert.ok(halfWidth(COURSE_LENGTH*f)>=50&&halfWidth(COURSE_LENGTH*f)<=58);
 for(const f of [.84,.90,.96])assert.ok(halfWidth(COURSE_LENGTH*f)>=35&&halfWidth(COURSE_LENGTH*f)<=42);
 assert.ok(halfWidth(COURSE_LENGTH*.282)>=58&&halfWidth(COURSE_LENGTH*.282)<=64);
 for(let s=0;s<COURSE_LENGTH;s+=1){assert.ok(halfWidth(s)>=25);assert.ok(Math.abs(halfWidth(s+1)-halfWidth(s))<.27)}
});

test('both mangrove branches have a continuous boat-width passage and reward the tighter cut',()=>{
 const island=ISLANDS.find(i=>i.district==='mangrove');assert.ok(island.s/COURSE_LENGTH>=.54&&island.s/COURSE_LENGTH<=.56);
 for(let s=island.s-island.length/2+.1;s<island.s+island.length/2;s+=2){
  const land=islandAt(s);assert.ok(land);
  for(const side of [-1,1]){const lane=racingLine(s,side);assert.ok(Math.abs(lane-land.x)>land.radius+3);assert.ok(Math.abs(lane)+3.3<halfWidth(s))}
 }
 const rewards=courseObjects().filter(o=>o.id.startsWith('mangrove-cut-coffee'));
 assert.equal(rewards.length,2);assert.ok(rewards.every(o=>o.x>island.x));
 assert.ok(rewards.every(o=>Math.abs(o.x)+o.radius<halfWidth(o.s)));
});

test('marinas use real shared hull placement, mangroves have no moorings, and the middle remains navigable',()=>{
 const counts=Object.fromEntries(DISTRICTS.map(d=>[d.id,MOORINGS.filter(o=>districtAt(o.s)===d).length]));
 assert.ok(MOORINGS.length>=150&&MOORINGS.length<=180);
 assert.ok(counts.downtown>=40);assert.ok(counts.marina>30);assert.equal(counts.mangrove,0);assert.ok(counts.cove>=40);assert.ok(counts.bridge>=30);
 assert.equal(new Set(MOORINGS.map(o=>o.id)).size,MOORINGS.length);
 assert.deepEqual(new Set(MOORINGS.map(o=>o.model)),new Set(['sport','super','sail']));
 for(const o of MOORINGS){assert.ok(o.radius>0&&o.halfLength>o.radius&&Number.isFinite(o.yaw));assert.ok(Math.abs(o.x)-o.radius>10)}
 const physical=courseObjects().filter(o=>o.type==='mooring');
 assert.equal(physical.length,MOORINGS.length);
 for(const o of physical){const render=MOORINGS.find(m=>m.id===o.id);for(const key of ['s','x','scale','radius','halfLength','model','yaw'])assert.equal(o[key],render[key])}
});

test('departing yacht traverses the marina smoothly with an open escape gap at every instant',()=>{
 const boat=courseObjects().find(o=>o.type==='yacht'),startS=boat.s,w=halfWidth(boat.s);
 assert.equal(districtAt(boat.s).id,'marina');assert.equal(boat.yaw,Math.PI/2);
 const before=objectX(boat,0),after=objectX(boat,100);assert.ok(before>20&&after< -20);
 let previous=before;
 for(let t=0;t<=60;t+=.1){const x=objectX(boat,t);assert.ok(x<=previous+.0001);assert.ok(Math.abs(x-previous)<.6);assert.ok(w+Math.abs(x)-boat.halfLength>20);assert.equal(boat.s,startS);previous=x}
 assert.equal(objectX(boat,boat.departureAt),before);assert.equal(objectX(boat,boat.departureAt+boat.departureDuration),after);
});

test('shooting a departing yacht bow splashes and blocks the swimmer behind without a penalty',()=>{
 const r=playing(),boat=yacht(),swimmer={id:'behind',type:'floater',s:3732,x:18.2,drift:0,radius:2.3,scared:0};
 r.x=17;r.objects=[swimmer,boat];assert.ok(fireWater(r));advance(r,.25);
 assert.equal(r.shots.length,0);assert.equal(r.soaked,0);assert.equal(r.hits,0);assert.equal(boat.scared,0);assert.equal(swimmer.scared,0);
 assert.ok(r.events.some(e=>e.type==='splash'&&!e.hit));assert.equal(boat.consumed,undefined);
});

test('a long moored hull blocks shots at the bow before a closer centre-point target',()=>{
 const r=playing(),boat={...yacht(3740),type:'mooring',x:1.2,yaw:0},swimmer={id:'behind-bow',type:'floater',s:3734,x:1.2,drift:0,radius:2.3,scared:0};
 r.objects=[swimmer,boat];assert.ok(fireWater(r));advance(r,.25);
 assert.equal(r.shots.length,0);assert.equal(r.soaked,0);assert.equal(swimmer.scared,0);assert.ok(r.events.some(e=>e.type==='splash'&&!e.hit));
});

test('player contact uses the transverse yacht bow as well as its centre and gaps remain passable',()=>{
 for(const x of [0,17]){const r=playing(3712),boat=yacht();r.x=x;r.speed=30;r.objects=[boat];stepRace(r,{},tick);assert.equal(r.hits,1);assert.ok(r.speed<=19)}
 const clear=playing(3712);clear.x=27;clear.speed=30;clear.objects=[yacht()];advance(clear,.3);assert.equal(clear.hits,0);assert.ok(clear.s>3718);
});

test('a berth beside the bank resolves a collision toward open water instead of trapping the player',()=>{
 const boat=MOORINGS.find(o=>districtAt(o.s).id==='downtown'&&o.s>COURSE_LENGTH*.13&&o.x<0),r=playing(boat.s-boat.halfLength-1);
 r.x=boat.x-3;r.speed=30;r.objects=[{...boat,type:'mooring',scared:0}];advance(r,4);
 assert.ok(r.s>boat.s+boat.halfLength+10);assert.ok(r.hits>0);assert.ok(Math.abs(r.x)<=halfWidth(r.s)-3.29);
});

test('crowded crossing has staggered swimmers and traffic with clear gaps',()=>{
 const crossing=courseObjects().filter(o=>o.id.startsWith('party-crossing'));
 assert.equal(crossing.length,4);assert.equal(new Set(crossing.map(o=>o.s)).size,4);
 assert.ok(crossing.every(o=>districtAt(o.s).id==='cove'));
 assert.ok(courseObjects().some(o=>o.type==='taxi'&&Math.abs(o.s-COURSE_LENGTH*.741)<1));
 for(let t=0;t<100;t+=.5)for(const o of crossing)assert.ok(Math.abs(objectX(o,t))+o.radius<halfWidth(o.s)-15);
});

test('real steering completes all districts and checkpoints with gold at 30, 60, and 120 Hz, including held fire',()=>{
 for(const dt of [1/30,1/60,1/120])for(const fire of [false,true]){
  const r=createRace(),seen=new Set(),passedYacht=new Set(),boat=r.objects.find(o=>o.type==='yacht');r.status='racing';
  while(r.status==='racing'&&r.elapsed<140){
   seen.add(districtAt(r.s).id);stepRace(r,{...pilotInput(r),fire},dt);
   for(const [i,v]of r.rivals.entries())if(Math.abs(v.s-boat.s)<boat.radius+2.5){
    assert.ok(Math.abs(v.x-objectX(boat,r.elapsed))>boat.halfLength+2.5,'rivals steer around the visible yacht hull');passedYacht.add(i);
   }
  }
  assert.equal(r.status,'finished',`${dt}, firing ${fire}`);assert.equal(r.endMedal,'GOLD');assert.equal(r.rank,1);assert.equal(r.checkpoint,4);assert.equal(seen.size,5);
  assert.equal(passedYacht.size,3);
 }
});

test('a soaked rival adjusts its overtaking line when its yacht arrival time changes',()=>{
 const r=createRace(),boat=r.objects.find(o=>o.type==='yacht');r.status='racing';let soaked=false;const passed=new Set();
 while(r.status==='racing'&&r.elapsed<140){
  if(!soaked&&r.elapsed>=24){for(const v of r.rivals){v.soaked=1.8;v.soakImmunity=2.8;v.speed*=.62}soaked=true}
  stepRace(r,pilotInput(r),1/60);
  for(const [i,v]of r.rivals.entries())if(Math.abs(v.s-boat.s)<boat.radius+2.5){assert.ok(Math.abs(v.x-objectX(boat,r.elapsed))>boat.halfLength+2.5);passed.add(i)}
 }
 assert.equal(passed.size,3);assert.ok(r.rivals.every(v=>v.soaked===0&&v.soakImmunity===0));assert.equal(r.status,'finished');
});
