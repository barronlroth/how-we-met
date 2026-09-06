import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../florida/audio.js';

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
