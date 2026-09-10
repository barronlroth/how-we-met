import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../florida/audio.js';

function musicHarness(){
 const music={paused:true,currentTime:42,plays:0,pauses:0,play(){this.plays++;this.paused=false;return Promise.resolve()},pause(){this.pauses++;this.paused=true}};
 const audio=new GameAudio(music),levels=[];
 audio.enabled=false;
 audio.ctx={currentTime:1,resume:()=>Promise.resolve()};
 audio.master={gain:{setTargetAtTime:value=>levels.push(value)}};
 return {audio,music,levels};
}

test('mute/pause preserve the track position without duplicating playback',async()=>{
 const {audio,music}=musicHarness();
 audio.setMusicPaused(true);audio.setMusicPaused(false);
 assert.equal(music.plays,0);
 await audio.enable(true);
 assert.equal(music.paused,false);assert.equal(music.plays,1);
 for(let i=0;i<120;i++)audio.setMusicPaused(false);
 assert.equal(music.plays,1);
 audio.setMusicPaused(true);assert.equal(music.paused,true);
 await audio.enable(false);await audio.enable(true);
 assert.equal(music.paused,true,'unmuting a paused game must stay silent');
 audio.setMusicPaused(false);assert.equal(music.paused,false);assert.equal(music.plays,2);
 assert.equal(music.currentTime,42,'resume continues the track instead of restarting the intro');
 await audio.enable(false);assert.equal(music.paused,true);
 audio.setMusicPaused(true);audio.setMusicPaused(false);
 assert.equal(music.plays,2,'visibility changes cannot unmute music');
});

test('sound defaults on without starting media before the audio graph is activated',async()=>{
 const {music}=musicHarness(),audio=new GameAudio(music);
 assert.equal(audio.enabled,true);assert.equal(audio.ctx,null);
 audio.setMusicPaused(true);audio.setMusicPaused(false);
 assert.equal(music.plays,0,'visibility changes must not bypass the audio graph');
 audio.ctx={state:'running'};
 await audio.activate();
 assert.equal(music.paused,false);assert.equal(music.plays,1);
 await audio.activate();assert.equal(music.plays,1);
});

test('muting before the first gesture prevents subsequent activation from enabling sound',async()=>{
 const {music}=musicHarness(),audio=new GameAudio(music);
 await audio.enable(false);
 await audio.activate();audio.setMusicPaused(true);audio.setMusicPaused(false);
 assert.equal(audio.enabled,false);assert.equal(audio.ctx,null);assert.equal(music.plays,0);
});

test('a delayed AudioContext resume cannot undo a newer mute',async()=>{
 const {audio,music,levels}=musicHarness();
 let resumed;audio.ctx.resume=()=>new Promise(resolve=>{resumed=resolve});
 const enabling=audio.enable(true);
 await audio.enable(false);
 resumed();await enabling;
 assert.equal(audio.enabled,false);assert.equal(music.paused,true);assert.equal(levels.at(-1),0);
});

test('interrupted media playback keeps effects enabled and retries on the next resume gesture',async()=>{
 const {audio,music}=musicHarness();
 music.play=function(){this.plays++;return Promise.reject(new Error('Playback interrupted'))};
 await audio.enable(true);
 assert.equal(audio.enabled,true);assert.equal(music.plays,1);
 for(let i=0;i<120;i++)audio.setMusicPaused(false);
 assert.equal(music.plays,1,'a rejected play must not be retried every frame');
 audio.setMusicPaused(true);
 music.play=function(){this.plays++;this.paused=false;return Promise.resolve()};
 audio.setMusicPaused(false);
 assert.equal(music.paused,false);assert.equal(music.plays,2);
});

// An ended one-shot must release its whole graph, not leave silent gains and
// filters connected to the long-lived master bus after every water burst.
test('repeated shot audio disconnects stopped sources, filters and gain nodes',()=>{
 const nodes=[],sources=[];
 function node(source=false){const param={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}};
  const n={frequency:{...param},gain:{...param},Q:{...param},connect(){},disconnect(){this.disconnected=true},start(){},stop(){}};
  nodes.push(n);if(source)sources.push(n);return n;
 }
 const audio=new GameAudio();audio.ctx={currentTime:1,createOscillator:()=>node(true),createGain:()=>node(),createBufferSource:()=>node(true),createBiquadFilter:()=>node()};audio.enabled=true;audio.master={};audio.noiseBuffer={};
 for(let i=0;i<30;i++){audio.effect('shot');audio.effect('splash')}
 assert.equal(sources.length,120);
 for(const source of sources){assert.equal(typeof source.onended,'function');source.onended();assert.equal(source.onended,null)}
 assert.ok(nodes.every(n=>n.disconnected));
 const count=nodes.length;audio.enabled=false;audio.effect('shot');assert.equal(nodes.length,count);
});
