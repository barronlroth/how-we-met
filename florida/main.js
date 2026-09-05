import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {floater,gator,pickup,ramp,boatWake,C} from './art.js';
import {prepareMaterials,raceBoat,waterTaxi} from './detail-art.js';
import {loadArtMaterials,craftedAirboat} from './premium-art.js';
import {makeWorld,makeWater,makeSky,SUN} from './world.js';
import {makeEffects} from './effects.js';
import {createRace,stepRace,pilotInput,horn,objectX,pointAt,frameAt,angleDelta,sector,COURSE_LENGTH,MEDAL_TIMES,formatTime,loadBest,saveBest,ISLANDS} from './core.js';
import {TRACK,routeBounds} from './course.js';
import {GameAudio} from './audio.js';
const $=id=>document.getElementById(id),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let storage;try{storage=localStorage}catch{storage={getItem:()=>null,setItem:()=>{}}}
let race=createRace(),best=loadBest(storage),renderer,composer,scene,camera,boat,scenery,water,effects,sunshine;
let countIn=0,pausedFrom='racing',lastTime=0,time=0,captionUntil=0,deflate=0,shake=0,cameraSnap=true,lastFocus=null,currentSpf=false;
const audio=new GameAudio(),pressed=new Set(),entities=new Map(),rivalModels=[],hornRings=[],hullMaterials=[];
const desiredCamera=new T.Vector3(),lookAt=new T.Vector3(),smoothLook=new T.Vector3();
let smoothedHeading=0,fps=60,perfFrames=0,perfTime=0;
const mapPoint=p=>({x:10+(p.x-routeBounds.minX)/(routeBounds.maxX-routeBounds.minX)*80,y:170-(routeBounds.maxZ-p.z)/(routeBounds.maxZ-routeBounds.minZ)*160});
function setCaption(text,duration=3.5){if(!text)return;$('nina-line').textContent=text;$('nina').style.opacity='1';captionUntil=time+duration}
function pulse(color){if(reducedMotion)return;$('flash').style.borderColor=color;$('flash').style.opacity='.42';setTimeout(()=>$('flash').style.opacity='0',130)}
function showError(error){console.error(error);$('start').hidden=true;$('hud').hidden=true;$('error').hidden=false;document.body.classList.remove('racing')}
$('sound').addEventListener('click',async()=>{try{await audio.enable(!audio.enabled);$('sound').querySelector('span').textContent=audio.enabled?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(audio.enabled));$('sound').setAttribute('aria-label',audio.enabled?'Mute sound':'Turn sound on')}catch{$('sound').querySelector('span').textContent='Unavailable'}});
function resetRace(demo=false){
 if(!renderer)return;race=createRace();race.demo=demo;race.status='countdown';pressed.clear();deflate=0;shake=0;countIn=3;cameraSnap=true;effects.reset();
 for(const id of ['start','paused','finish'])$(id).hidden=true;for(const id of ['hud','pause','countdown'])$(id).hidden=false;
 $('demo-note').hidden=!demo;$('countdown').textContent='3';document.body.classList.add('racing');setCaption('A little racing before dinner. What could go wrong?',5);$('world').focus({preventScroll:true});
}
$('start-race').addEventListener('click',()=>resetRace());$('replay').addEventListener('click',()=>resetRace());$('restart-pause').addEventListener('click',()=>resetRace());$('demo').addEventListener('click',()=>resetRace(true));$('take-wheel').addEventListener('click',()=>resetRace());
function pauseRace(){
 if(!['racing','countdown','paused'].includes(race.status))return;pressed.clear();
 if(race.status==='paused'){race.status=pausedFrom;$('paused').hidden=true;document.body.classList.add('racing');$('countdown').hidden=race.status!=='countdown';(lastFocus?.isConnected?lastFocus:$('world')).focus({preventScroll:true})}
 else{pausedFrom=race.status;race.status='paused';$('paused').hidden=false;$('countdown').hidden=true;document.body.classList.remove('racing');lastFocus=document.activeElement;$('resume').focus({preventScroll:true})}
}
$('pause').addEventListener('click',pauseRace);$('resume').addEventListener('click',pauseRace);
window.addEventListener('keydown',event=>{
 if(event.code==='F2'){event.preventDefault();$('performance').hidden=!$('performance').hidden;return}
 if(event.code==='Enter'&&(race.demo||race.status==='ready')){event.preventDefault();resetRace();return}
 if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();if(!event.repeat)pauseRace();return}
 if(event.code==='Tab'&&['paused','finished'].includes(race.status)){const dialog=$(race.status==='paused'?'paused':'finish'),items=[...dialog.querySelectorAll('button,a')],first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
 if(race.status!=='racing')return;
 if(['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight','Space'].includes(event.code)){event.preventDefault();pressed.add(event.code)}
 if(event.code==='Space'&&!event.repeat)horn(race);
});
window.addEventListener('keyup',e=>pressed.delete(e.code));
window.addEventListener('blur',()=>{pressed.clear();if(['racing','countdown'].includes(race.status))pauseRace()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&['racing','countdown'].includes(race.status))pauseRace()});
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer?.setSize(innerWidth,innerHeight)}window.addEventListener('resize',resize);
function events(){
 for(const e of race.events){
  audio.effect(e.type);
  if(e.type==='checkpoint'){setCaption(['Now for the marina. Pick your line.','The water taxi does not have right of way. In this game.','One more big turn. Then dinner.','There’s the bridge. Fisheries on the right!'][race.checkpoint-1],4);pulse('#8ef0d3')}
  else if(e.type==='finish'){
   cameraSnap=true;effects.reset();$('hud').hidden=true;$('pause').hidden=true;$('finish').hidden=false;$('countdown').hidden=true;document.body.classList.remove('racing');
   const isBest=!race.demo&&(best===null||race.elapsed<best);if(!race.demo)best=saveBest(storage,race.elapsed);
   $('medal').textContent=race.demo?'DEMO COMPLETE':`${race.rank===1?'1ST PLACE · ':''}${race.endMedal}`;$('medal').dataset.medal=race.endMedal;
   $('final-time').textContent=formatTime(race.elapsed);$('finish-best').textContent=race.demo?'Your turn. Take the wheel.':isBest?'A new personal best.':`Your best: ${formatTime(best)}`;
   $('finish-copy').textContent=race.demo?'That’s the route. Now let’s see your racing line.':`Finished ${['','1st','2nd','3rd','4th'][race.rank]}. Nina’s already picking the appetizers.`;
   $('race-stats').replaceChildren(...[[race.jumps,'jumps'],[race.nearMisses,'close calls'],[race.hits,'bumps']].map(([n,label])=>{const el=document.createElement('span'),b=document.createElement('strong');b.textContent=n;el.append(b,label);return el}));$('replay').focus({preventScroll:true});pressed.clear();
  }else{if(e.text)setCaption(e.text);if(e.type==='bounce'){deflate=1;pulse('#ff9ab2')}if(e.type==='hit'){shake=.2;pulse('#ffae87')}if(e.type==='land')shake=.13}
 }race.events.length=0;
}
function updateHud(){
 $('sector').textContent=sector(race.s);$('checkpoint').textContent=`${race.checkpoint} / 4 checkpoints`;$('timer').textContent=formatTime(race.elapsed);$('speed').textContent=Math.round(race.speed*2.237);
 $('position').innerHTML=`${race.rank}<span>/4</span>`;$('boost-fill').style.strokeDashoffset=100-race.boost*100;$('boost-fill').style.stroke=race.boosting?'#fff9de':'#59f1e3';
 $('floatie-status').hidden=!race.flamingo;$('spf-status').hidden=race.sunscreen<=0;$('spf-status').textContent=`SPF 1000 · ${Math.ceil(race.sunscreen)}s`;$('horn-status').firstChild.textContent=race.hornCooldown?`HORN · ${race.hornCooldown.toFixed(1)}s `:'HORN ';
 $('distance').textContent=`${((COURSE_LENGTH-race.s)/1000).toFixed(1)} km`;const p=mapPoint(pointAt(race.s,race.x));$('map-dot').setAttribute('cx',p.x);$('map-dot').setAttribute('cy',p.y);
 const special=race.drifting?'DRIFT +':race.drafting?'SLIPSTREAM':race.combo>1?`${race.combo}× CLOSE CALLS`:race.boosting?'CAFECITO!':'';$('combo').hidden=!special;$('combo').textContent=special;
 $('speed-lines').style.opacity=!reducedMotion&&race.status==='racing'?(race.boosting?.34:Math.max(0,(race.speed-30)/100)):0;
 if(time>captionUntil)$('nina').style.opacity='0';
}
function renderEntities(s){
 for(const o of race.objects){const mesh=entities.get(o.id);if(!mesh)continue;mesh.visible=o.s>s-80&&o.s<s+650&&!o.consumed;if(!mesh.visible)continue;const p=pointAt(o.s,objectX(o,race.elapsed));mesh.position.set(p.x,0,p.z);mesh.rotation.set(0,-p.heading,0);
  if(o.type==='floater'){mesh.position.y=.08+Math.sin(time*1.8+o.drift)*.11;mesh.rotation.z=Math.sin(time*1.6+o.drift)*.065;mesh.rotation.y+=.25*Math.sin(time*.3+o.drift)}
  else if(o.type==='gator'){mesh.position.y=o.scared?-Math.min(1.5,o.scared):.035;mesh.rotation.y+=Math.PI/2+Math.sin(time*.7+o.drift)*.22}
  else if(o.type==='taxi'){mesh.rotation.y+=Math.cos(race.elapsed*.16+o.drift)>0?-Math.PI/2:Math.PI/2;mesh.position.y=Math.sin(time*1.2)*.04}
  else if(!['ramp','wake'].includes(o.type)){mesh.position.y=1.4+Math.sin(time*2+o.s)*.22;mesh.rotation.y=time*.7}
 }
 race.rivals.forEach((v,i)=>{const m=rivalModels[i],p=pointAt(v.s,v.x);m.visible=race.status!=='ready'&&race.status!=='finished'&&Math.abs(v.s-s)<650;m.position.set(p.x,Math.sin(time*3+i)*.04,p.z);m.rotation.set(0,-v.heading,Math.sin(time*3+i)*.015)});
}
function frame(now){
 requestAnimationFrame(frame);const realDt=Math.max(.0001,(now-lastTime)/1000),dt=Math.min(.065,realDt);lastTime=now;time+=dt;fps+=(1/realDt-fps)*.035;
 if(race.status==='countdown'){countIn-=dt;$('countdown').textContent=Math.ceil(countIn)>0?Math.ceil(countIn):'GO!';if(countIn<=0){race.status='racing';audio.tone(784,.2,'sine',.15);setCaption('Find your line. Let’s catch them.',3)}}
 else if(race.status==='racing'){
  if(countIn>-.6){countIn-=dt;if(countIn<=-.6)$('countdown').hidden=true}
  const manual={steer:(pressed.has('KeyD')||pressed.has('ArrowRight')?1:0)-(pressed.has('KeyA')||pressed.has('ArrowLeft')?1:0),brake:pressed.has('KeyS')||pressed.has('ArrowDown'),boost:pressed.has('ShiftLeft')||pressed.has('ShiftRight')};
  let left=dt;while(left>0){const step=Math.min(left,1/120);stepRace(race,race.demo?pilotInput(race):manual,step);left-=step}events();
 }
 updateHud();const ready=race.status==='ready',finished=race.status==='finished',staged=ready||finished,s=staged?COURSE_LENGTH-200:race.s,x=staged?4:race.x,p=pointAt(s,x),heading=staged?p.heading:race.heading;
 const bob=reducedMotion?0:Math.sin(time*3)*.025+Math.sin(time*7)*race.speed*.00065;
 boat.position.set(p.x,(staged?0:race.y)+bob,p.z);boat.rotation.y=-heading;boat.rotation.z=reducedMotion||staged?0:T.MathUtils.lerp(boat.rotation.z,-race.turn*.19,1-Math.exp(-dt*8));boat.rotation.x=reducedMotion||staged?0:T.MathUtils.lerp(boat.rotation.x,race.y>0?-race.vy*.018:-Math.min(.065,race.speed*.001)+Math.sin(time*8)*.004,1-Math.exp(-dt*8));
 boat.userData.fan.rotation.z+=dt*(staged?5:14+race.speed*1.9);boat.userData.nina.rotation.z=reducedMotion?0:-race.turn*.13+Math.sin(time*1.7)*.012;boat.userData.nina.userData.arm.rotation.x=race.y>1?-.65:Math.sin(time*1.5)*.045;
 deflate=Math.max(0,deflate-dt*.9);const f=boat.userData.floatie;f.visible=!staged&&(race.flamingo||deflate>0);f.scale.set(1,race.flamingo?1:deflate*.9+.04,1);f.position.y=.6;
 const spf=race.sunscreen>0;if(spf!==currentSpf){currentSpf=spf;for(const e of hullMaterials){e.material.roughness=spf?.13:e.roughness;e.material.metalness=spf?.22:e.metalness;e.material.emissive?.setHex(spf?0x14281e:0)}}
 if(cameraSnap)smoothedHeading=heading;else smoothedHeading+=angleDelta(heading,smoothedHeading)*(1-Math.exp(-dt*5.4));
 const compact=innerWidth<1100,phone=innerWidth<600;
 const fx=Math.sin(smoothedHeading),fz=-Math.cos(smoothedHeading),nx=Math.cos(smoothedHeading),nz=Math.sin(smoothedHeading),back=staged?(phone?14:compact?12.5:8.5):race.boosting?8.2:9.4,height=staged?(phone?11:compact?9:7.2):race.boosting?5.4:6.4,side=staged?(phone?3:compact?.6:3.8):3.8;
 desiredCamera.set(p.x-fx*back+nx*side,height+(staged?0:race.y*.58),p.z-fz*back+nz*side);lookAt.set(p.x+fx*(staged?(phone?7:12):16)+nx*(staged?(phone?-.8:compact?3.5:0):1.6),(staged?(phone?-2:compact?-1:-1.6):.4)+race.y*.35,p.z+fz*(staged?(phone?7:12):16)+nz*(staged?(phone?-.8:compact?3.5:0):1.6));
 if(staged){camera.setViewOffset(innerWidth,innerHeight,-innerWidth*(phone?.03:compact?.18:finished?.15:.14),innerHeight*(phone?.16:0),innerWidth,innerHeight)}else camera.clearViewOffset();
 const follow=1-Math.exp(-dt*8);if(cameraSnap){camera.position.copy(desiredCamera);smoothLook.copy(lookAt);cameraSnap=false}else{camera.position.lerp(desiredCamera,follow);smoothLook.lerp(lookAt,follow)}
 if(!reducedMotion&&race.status==='racing'){const vibrate=race.boosting?.022:.009;camera.position.y+=Math.sin(time*52)*vibrate;if(shake>0){camera.position.x+=Math.sin(time*61)*shake;camera.position.y+=Math.cos(time*43)*shake;shake=Math.max(0,shake-dt)}}camera.lookAt(smoothLook);
 const fov=staged?63:race.boosting&&!reducedMotion?84:68;camera.fov=T.MathUtils.lerp(camera.fov,fov,1-Math.exp(-dt*5));camera.updateProjectionMatrix();
 scenery.update(s);water.update(s,time);renderEntities(s);effects.update(race,dt,time);
 sunshine.position.set(p.x+SUN.x*130,130*SUN.y,p.z+SUN.z*130);sunshine.target.position.set(p.x,0,p.z);sunshine.target.updateMatrixWorld();
 for(let i=0;i<hornRings.length;i++){const r=hornRings[i],progress=1-race.hornFlash+i*.18;r.visible=!staged&&race.hornFlash>0&&progress<1;r.position.set(p.x+fx*12,.28,p.z+fz*12);r.scale.setScalar(3+progress*38);r.material.opacity=Math.max(0,(1-progress)*.32)}
 audio.update(race.speed,race.status==='racing',race.boosting);renderer.info.reset();renderer.shadowMap.needsUpdate=true;composer.render();
 perfTime+=realDt;perfFrames++;if(perfTime>.5){$('performance').textContent=`${Math.round(perfFrames/perfTime)} fps · ${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles/1000)}k triangles`;perfTime=0;perfFrames=0}
}
async function boot(){
 await document.fonts.ready;await prepareMaterials();await loadArtMaterials();renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.PCFShadowMap;renderer.info.autoReset=false;
 scene=new T.Scene();scene.fog=new T.Fog(0xb6d5dc,520,1700);camera=new T.PerspectiveCamera(63,innerWidth/innerHeight,.15,6000);resize();scene.add(new T.HemisphereLight(0xd8edfa,0x647653,.55));
 sunshine=new T.DirectionalLight(0xfff0d3,4.3);sunshine.castShadow=true;sunshine.shadow.mapSize.set(2048,2048);Object.assign(sunshine.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:280});sunshine.shadow.normalBias=.045;sunshine.shadow.bias=-.00008;sunshine.shadow.radius=2;scene.add(sunshine,sunshine.target);
 makeSky(scene,renderer);water=makeWater(scene);scenery=makeWorld(scene);boat=craftedAirboat();scene.add(boat);effects=makeEffects(scene);
 (boat.userData.hull||boat.children[0]).traverse(o=>{if(o.isMesh){o.material=o.material.clone();hullMaterials.push({material:o.material,roughness:o.material.roughness,metalness:o.material.metalness})}});
 const models={floater:[floater(0),floater(1),floater(2)],gator:gator(),ramp:ramp(),wake:boatWake(),coffee:pickup('coffee'),flamingo:pickup('flamingo'),sunscreen:pickup('sunscreen'),taxi:waterTaxi()};
 for(const [i,o]of race.objects.entries()){const m=(o.type==='floater'?models.floater[i%3]:models[o.type])?.clone(true);if(m){scene.add(m);entities.set(o.id,m)}}
 for(const color of [0xf27e54,0x539cb0,0xe1ba49]){const m=raceBoat(color);scene.add(m);rivalModels.push(m)}
 for(let i=0;i<3;i++){const r=new T.Mesh(new T.TorusGeometry(1,.006,4,70),new T.MeshBasicMaterial({color:0xfff3b5,transparent:true,opacity:.4,depthWrite:false}));r.rotation.x=-Math.PI/2;r.visible=false;scene.add(r);hornRings.push(r)}
 composer=new EffectComposer(renderer);composer.renderTarget1.samples=4;composer.renderTarget2.samples=4;composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,12);ao.kernelRadius=2.6;ao.minDistance=.000025;ao.maxDistance=.002;const setAOSize=ao.setSize.bind(ao);ao.setSize=(w,h)=>setAOSize(Math.round(w*.5),Math.round(h*.5));const drawAO=ao.render.bind(ao);ao.render=(...args)=>{scenery.setAO(true);try{drawAO(...args)}finally{scenery.setAO(false)}};composer.addPass(ao);composer.addPass(new OutputPass());resize();
 const gold=formatTime(MEDAL_TIMES.gold).slice(0,-3);$('gold-target').textContent=`GOLD · ${gold}`;$('personal-best').textContent=best===null?`Gold: ${gold}. Find the faster line.`:`Your best: ${formatTime(best)}`;
 $('map-route').setAttribute('d',TRACK.filter((_,i)=>i%12===0).map((p,i)=>{const q=mapPoint(p);return`${i?'L':'M'}${q.x.toFixed(2)} ${q.y.toFixed(2)}`}).join(' '));
 $('map-branches').setAttribute('d',ISLANDS.flatMap(island=>[-1,1].map(side=>Array.from({length:20},(_,i)=>{const a=i/19*Math.PI,p=mapPoint(pointAt(island.s-Math.cos(a)*island.length*.55,island.x+Math.sin(a)*(island.width+12)*side));return`${i?'L':'M'}${p.x} ${p.y}`}).join(' '))).join(' '));
 const finish=mapPoint(pointAt(COURSE_LENGTH));$('map-flag').setAttribute('d',`M${finish.x} ${finish.y+3}v-8h7l-2 3 2 3h-7`);
 for(const id of ['start-race','demo'])$(id).disabled=false;$('start-race').textContent='Start race';lastTime=performance.now();requestAnimationFrame(frame);
 $('world').addEventListener('webglcontextlost',event=>{event.preventDefault();if(race.status==='racing')pauseRace();$('error-message').textContent='The graphics connection was interrupted. Reload to relaunch the boat.';$('error').hidden=false});
}
boot().catch(showError);
