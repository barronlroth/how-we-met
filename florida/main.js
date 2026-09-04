import * as T from 'three';
import { airboat, floater, gator, pickup, ramp, boatWake, C } from './art.js';
import { makeWorld, makeWater, makeSky, makeWake } from './world.js';
import { createRace, stepRace, horn, objectX, center, tangent, sector, COURSE_LENGTH, MEDAL_TIMES, formatTime, loadBest, saveBest } from './core.js';
import { GameAudio } from './audio.js';

const $ = id => document.getElementById(id);
let storage;
try { storage = window.localStorage; } catch { storage = { getItem:()=>null, setItem:()=>{} }; }
let race = createRace(), best = loadBest(storage), renderer, scene, camera, boat, scenery, water, sky, wake;
let countIn = 0, pausedFrom = 'racing', lastTime = 0, time = 0, captionUntil = 0, deflate = 0, shake = 0, currentSpf = false;
const audio = new GameAudio(), pressed = new Set(), entities = new Map();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const desiredCamera = new T.Vector3(), lookAt = new T.Vector3(), smoothLook = new T.Vector3();
let cameraSnap = true, sunshine, hornRings = [], hullMaterials = [];
let lastFocus = null;

function showError(error) {
  console.error(error);
  $('start').hidden = true; $('hud').hidden = true; $('error').hidden = false;
  document.body.classList.remove('racing');
  if(!renderer)$('error-message').textContent='This chapter needs WebGL 2. Try a current desktop browser with graphics acceleration enabled.';
}
function setCaption(text, duration = 4.2) {
  if (!text) return;
  $('nina-line').textContent = text; $('nina').style.opacity = '1'; captionUntil = time + duration;
}
function pulse(color) {
  if(reducedMotion)return;
  $('flash').style.borderColor=color;$('flash').style.opacity='.48';
  window.setTimeout(()=>$('flash').style.opacity='0',160);
}

async function toggleSound() {
  try {
    await audio.enable(!audio.enabled);
    $('sound').querySelector('span').textContent=audio.enabled?'Sound on':'Sound off';
    $('sound').setAttribute('aria-pressed',String(audio.enabled));$('sound').setAttribute('aria-label',audio.enabled?'Mute sound':'Turn sound on');
  } catch { audio.enabled=false;$('sound').querySelector('span').textContent='Sound unavailable'; }
}
$('sound').addEventListener('click',toggleSound);
function resetRace() {
  race=createRace();pressed.clear();deflate=0;shake=0;countIn=3;race.status='countdown';cameraSnap=true;
  wake.reset();$('start').hidden=true;$('paused').hidden=true;$('finish').hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('countdown').hidden=false;
  $('countdown').textContent='3';document.body.classList.add('racing');setCaption("Let's take the scenic route. Fast.",6);
  $('world').focus({preventScroll:true});
}
function startRace(){if(renderer&&race.status!=='countdown')resetRace()}
$('start-race').addEventListener('click',startRace);
$('replay').addEventListener('click',resetRace);
$('restart-pause').addEventListener('click',resetRace);
function pauseRace(){
  if(!['racing','countdown','paused'].includes(race.status))return;
  pressed.clear();
  if(race.status==='paused'){
    race.status=pausedFrom;$('paused').hidden=true;document.body.classList.add('racing');
    $('countdown').hidden=race.status!=='countdown';(lastFocus?.isConnected?lastFocus:$('pause')).focus({preventScroll:true});
  }else{
    pausedFrom=race.status;race.status='paused';$('paused').hidden=false;$('countdown').hidden=true;document.body.classList.remove('racing');
    lastFocus=document.activeElement;$('resume').focus({preventScroll:true});
  }
}
$('pause').addEventListener('click',pauseRace);$('resume').addEventListener('click',pauseRace);
window.addEventListener('keydown',event=>{
  const gameKeys=['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight','Space'];
  if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();if(!event.repeat)pauseRace();return}
  // Keep dialogs keyboard-contained while their backdrop prevents play.
  if(event.code==='Tab'&&(race.status==='paused'||race.status==='finished')){
    const dialog=$(race.status==='paused'?'paused':'finish'),items=[...dialog.querySelectorAll('button,a')];
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
  if(race.status!=='racing')return;
  if(gameKeys.includes(event.code)){event.preventDefault();pressed.add(event.code)}
  if(event.code==='Space'&&!event.repeat)horn(race);
});
window.addEventListener('keyup',event=>pressed.delete(event.code));
window.addEventListener('blur',()=>{pressed.clear();if(['racing','countdown'].includes(race.status))pauseRace()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&['racing','countdown'].includes(race.status))pauseRace()});

function resize(){
  if(!renderer)return;
  camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
}
window.addEventListener('resize',resize);

function events(){
  for(const event of race.events){
    audio.effect(event.type);
    if(event.type==='checkpoint'){
      setCaption(['That is how you make an entrance.','Halfway. The cafecito is working.','Almost there. Keep it smooth.','There’s the bridge. Fisheries on the right!'][race.checkpoint-1],4.5);pulse('#8ff0d7');
    }else if(event.type==='finish'){
      cameraSnap=true;wake.reset();
      $('hud').hidden=true;$('pause').hidden=true;$('finish').hidden=false;$('countdown').hidden=true;document.body.classList.remove('racing');
      const isBest=best===null||race.elapsed<best;best=saveBest(storage,race.elapsed);
      $('medal').textContent=`${race.endMedal} MEDAL`;$('medal').dataset.medal=race.endMedal;
      $('final-time').textContent=formatTime(race.elapsed);$('finish-best').textContent=isBest?'A new personal best.':`Your best on this browser: ${formatTime(best)}`;
      $('race-stats').replaceChildren(...[[race.jumps,'jumps'],[race.nearMisses,'near misses'],[race.hits,'bumps']].map(([n,label])=>{const el=document.createElement('span'),number=document.createElement('strong');number.textContent=n;el.append(number,label);return el}));
      $('replay').focus({preventScroll:true});pressed.clear();
    }else{
      if(event.text)setCaption(event.text);
      if(event.type==='bounce'){deflate=1;pulse('#ff91b5')}
      if(event.type==='hit'){shake=.28;pulse('#ffad80')}
      if(event.type==='land')shake=.16;
    }
  }
  race.events.length=0;
}

function updateHud(){
  $('sector').textContent=sector(race.s);$('checkpoint').textContent=`${race.checkpoint} / 4 checkpoints`;
  $('timer').textContent=formatTime(race.elapsed);$('speed').textContent=Math.round(race.speed*2.237);
  $('boost-fill').style.width=`${race.boost*100}%`;$('boost-fill').style.background=race.boosting?'#fff9e9':'#ffdf64';
  $('floatie-status').hidden=!race.flamingo;$('spf-status').hidden=race.sunscreen<=0;$('spf-status').textContent=`SPF 1000 · ${Math.ceil(race.sunscreen)}s`;
  $('horn-status').firstChild.textContent=race.hornCooldown>0?`HORN · ${race.hornCooldown.toFixed(1)}s `:'HORN ';
  $('distance').textContent=`${((COURSE_LENGTH-race.s)/1000).toFixed(1)} km`;
  const route=$('map-route'),p=route.getPointAtLength(route.getTotalLength()*Math.min(1,race.s/COURSE_LENGTH));$('map-dot').setAttribute('cx',p.x);$('map-dot').setAttribute('cy',p.y);
  if(time>captionUntil)$('nina').style.opacity='0';
}

function renderEntities(displayS,dt){
  for(const o of race.objects){
    const mesh=entities.get(o.id),near=o.s>displayS-35&&o.s<displayS+390;
    mesh.visible=near&&!o.consumed;if(!mesh.visible)continue;
    let ox=objectX(o,race.elapsed);
    if(o.scared&&o.type==='floater')ox+=(Math.sign(o.x-race.x)||1)*(1-o.scared/4)*16;
    mesh.position.set(center(o.s)+ox,0,-o.s);
    if(o.type==='floater'){
      mesh.position.y=.03+Math.sin(time*1.5+o.drift)*.12;mesh.rotation.z=Math.sin(time*1.4+o.drift)*.045;
      mesh.rotation.y=.2*Math.sin(time*.3+o.drift)+(o.scared?Math.sin(time*8)*.2:0);
    }else if(o.type==='gator'){
      mesh.position.y=o.scared?-Math.min(1.7,o.scared):.035+Math.sin(time*1.1+o.drift)*.05;
      mesh.rotation.y=Math.sin(time*.7+o.drift)*.25+Math.PI/2;
    }else if(o.type!=='ramp'&&o.type!=='wake'){
      mesh.position.y=1.6+Math.sin(time*2+o.s)*.2;mesh.rotation.y=time*.65;
    }
  }
}

function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;time+=dt;
  if(race.status==='countdown'){
    countIn-=dt;$('countdown').textContent=Math.ceil(countIn)>0?Math.ceil(countIn):'GO!';
    if(countIn<=0){race.status='racing';audio.tone(784,.2,'sine',.15);setCaption('Your first cafecito is straight ahead.',4.5)}
  }else if(race.status==='racing'){
    if(countIn>-0.65){countIn-=dt;if(countIn<=-.65)$('countdown').hidden=true}
    const steer=(pressed.has('KeyD')||pressed.has('ArrowRight')?1:0)-(pressed.has('KeyA')||pressed.has('ArrowLeft')?1:0);
    const input={steer,brake:pressed.has('KeyS')||pressed.has('ArrowDown'),boost:pressed.has('ShiftLeft')||pressed.has('ShiftRight')};
    let left=dt;while(left>0){const step=Math.min(left,1/120);stepRace(race,input,step);left-=step}
    events();
    if(time>captionUntil+3&&race.elapsed-race.lastCallout>8){
      const next=race.objects.find(o=>!o.passed&&!o.consumed&&['gator','floater','ramp'].includes(o.type)&&o.s>race.s+15&&o.s<race.s+63&&Math.abs(o.x-race.x)<12);
      if(next){setCaption(next.type==='gator'?'Gator ahead. Give him some room.':next.type==='ramp'?'That ramp looks like our kind of bad idea.':'Tube traffic. Of course.',3.8);race.lastCallout=race.elapsed}
    }
  }
  updateHud();
  const ready=race.status==='ready',finished=race.status==='finished';
  // The finish cuts to a postcard of the couple with both arrival landmarks.
  const displayS=ready?3385:finished?3405:race.s;
  const lateral=ready?-9:finished?10:race.x,wx=center(displayS)+lateral;
  const bob=reducedMotion?0:Math.sin(time*2.3)*.045+Math.sin(time*4.3)*race.speed*.0018;
  boat.position.set(wx,race.y+bob,-displayS);
  const yaw=ready?-.18:finished?-.45:-Math.atan2(race.vx+tangent(displayS)*race.speed,Math.max(8,race.speed));
  boat.rotation.y=T.MathUtils.lerp(boat.rotation.y,yaw,1-Math.exp(-dt*6));
  boat.rotation.z=reducedMotion?0:T.MathUtils.lerp(boat.rotation.z,-race.vx*.011,1-Math.exp(-dt*6));
  boat.rotation.x=reducedMotion?0:T.MathUtils.lerp(boat.rotation.x,race.y>0?-race.vy*.022:Math.sin(time*3)*.012,1-Math.exp(-dt*7));
  boat.userData.fan.rotation.z+=dt*(ready||finished?3:8+race.speed*1.4);
  boat.userData.nina.rotation.z=reducedMotion?0:-race.vx*.012+Math.sin(time*1.7)*.025;
  boat.userData.nina.userData.arm.rotation.x=race.y>1?-.7:Math.sin(time*1.8)*.09;
  boat.userData.nina.rotation.y=-.12+Math.sin(time*.45)*.11;
  deflate=Math.max(0,deflate-dt*.85);
  const f=boat.userData.floatie;f.visible=race.flamingo||deflate>0;
  f.scale.set(race.flamingo?1:1+(1-deflate)*.13,race.flamingo?1:deflate*.8+.04,race.flamingo?1:1+(1-deflate)*.13);
  f.position.y=race.flamingo?.68:.38+deflate*.3;
  const spf=race.sunscreen>0;
  if(spf!==currentSpf){currentSpf=spf;for(const entry of hullMaterials){entry.material.roughness=spf?.16:entry.roughness;entry.material.metalness=spf?.27:entry.metalness;entry.material.emissive?.setHex(spf?0x292514:0)}}
  const cameraOffset=ready?{x:7,y:9.2,z:16}:{x:5.6,y:9.8,z:14.5};
  desiredCamera.set(center(displayS-cameraOffset.z)+lateral+cameraOffset.x,cameraOffset.y+race.y*.35,-displayS+cameraOffset.z);
  lookAt.set(center(displayS+12)+lateral+(ready?-4:0),1.8+race.y*.2,-displayS-(ready?12:13));
  if(finished){desiredCamera.set(center(3378)+8,12,-3378);lookAt.set(center(3480)+6,2,-3480)}
  const follow=1-Math.exp(-dt*5);
  if(cameraSnap){camera.position.copy(desiredCamera);smoothLook.copy(lookAt);cameraSnap=false}else{camera.position.lerp(desiredCamera,follow);smoothLook.lerp(lookAt,follow)}
  if(shake>0&&!reducedMotion){camera.position.x+=Math.sin(time*55)*shake;camera.position.y+=Math.cos(time*43)*shake*.7;shake=Math.max(0,shake-dt)}
  camera.lookAt(smoothLook);
  const targetFov=finished?T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(58)/2)*Math.max(1,1.6/camera.aspect))):race.boosting&&!reducedMotion?65:58;
  camera.fov=finished?targetFov:T.MathUtils.lerp(camera.fov,targetFov,follow);camera.updateProjectionMatrix();
  scenery.update(displayS);water.update(displayS,time);sky.position.copy(camera.position);if(!finished)wake.update(race,time);renderEntities(displayS,dt);
  sunshine.position.set(wx-55,90,-displayS+50);sunshine.target.position.set(wx,0,-displayS-20);sunshine.target.updateMatrixWorld();
  for(let i=0;i<hornRings.length;i++){
    const r=hornRings[i],p=1-race.hornFlash/1.1+i*.18;r.visible=race.hornFlash>0&&p<1;
    r.position.set(wx,.35,-displayS-12);r.scale.setScalar(2+p*36);r.material.opacity=Math.max(0,(1-p)*.42);
  }
  audio.update(race.speed,race.status==='racing');
  renderer.render(scene,camera);
}

async function boot(){
  await document.fonts.ready;
  renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  scene=new T.Scene();scene.fog=new T.Fog(0xb3dce1,210,640);
  camera=new T.PerspectiveCamera(58,1,.1,1300);resize();
  scene.add(new T.HemisphereLight(0xc4e9f4,0x7e9571,1.15));
  sunshine=new T.DirectionalLight(0xffe7bc,2.7);sunshine.castShadow=true;sunshine.shadow.mapSize.set(2048,2048);
  Object.assign(sunshine.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:220});sunshine.shadow.normalBias=.035;sunshine.shadow.bias=-.00015;
  scene.add(sunshine,sunshine.target);
  sky=makeSky(scene);water=makeWater(scene);scenery=makeWorld(scene);boat=airboat();scene.add(boat);wake=makeWake(scene);
  boat.children[0].traverse(o=>{if(o.isMesh){o.material=o.material.clone();hullMaterials.push({material:o.material,roughness:o.material.roughness,metalness:o.material.metalness})}});
  const models={floater:[floater(0),floater(1),floater(2)],gator:gator(),ramp:ramp(),wake:boatWake(),coffee:pickup('coffee'),flamingo:pickup('flamingo'),sunscreen:pickup('sunscreen')};
  for(const [i,o] of race.objects.entries()){
    const model=(o.type==='floater'?models.floater[i%3]:models[o.type]).clone(true);scene.add(model);entities.set(o.id,model);
  }
  for(let i=0;i<3;i++){const r=new T.Mesh(new T.TorusGeometry(1,.006,4,70),new T.MeshBasicMaterial({color:0xfff7be,transparent:true,opacity:.5,depthWrite:false}));r.rotation.x=-Math.PI/2;r.visible=false;scene.add(r);hornRings.push(r)}
  $('start-race').disabled=false;$('start-race').textContent='Start race';
  const goldTarget=formatTime(MEDAL_TIMES.gold).slice(0,-3);
  $('gold-target').textContent=`GOLD PACE · ${goldTarget}`;
  $('personal-best').textContent=best===null?`Gold medal: finish in ${goldTarget}.`:`Your best on this browser: ${formatTime(best)}`;
  lastTime=performance.now();requestAnimationFrame(frame);
  $('world').addEventListener('webglcontextlost',event=>{event.preventDefault();if(race.status==='racing')pauseRace();$('error-message').textContent='The graphics connection was interrupted. Reload to relaunch the boat.';$('error').hidden=false});
}
boot().catch(showError);
