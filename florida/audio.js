// Original synthesized sound effects and a light tropical marimba loop.
export class GameAudio {
  constructor(){this.enabled=false;this.ctx=null;this.nextNote=0;this.beat=0}
  async enable(enabled){
    this.enabled=enabled;
    if(enabled&&!this.ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC){this.enabled=false;return}
      this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.42;this.master.connect(this.ctx.destination);
      this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=55;
      const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=210;this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;
      this.engine.connect(filter);filter.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();
      this.nextNote=this.ctx.currentTime;
    }
    if(this.ctx){await this.ctx.resume();this.master.gain.setTargetAtTime(enabled?.42:0,this.ctx.currentTime,.08)}
  }
  tone(freq,duration=.2,type='sine',gain=.2,delay=0,endFreq){
    if(!this.ctx||!this.enabled)return;
    const t=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),env=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);
    if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,t+duration);
    env.gain.setValueAtTime(.001,t);env.gain.exponentialRampToValueAtTime(gain,t+.012);env.gain.exponentialRampToValueAtTime(.001,t+duration);
    osc.connect(env);env.connect(this.master);osc.start(t);osc.stop(t+duration+.05);
  }
  effect(type){
    if(type==='horn'){this.tone(220,.48,'sawtooth',.1);this.tone(277,.5,'triangle',.1)}
    if(type==='coffee'||type==='checkpoint'){[523,659,784].forEach((f,i)=>this.tone(f,.17,'sine',.25,i*.065))}
    if(type==='flamingo'){this.tone(380,.25,'sine',.18,0,640);this.tone(780,.2,'sine',.12,.14,980)}
    if(type==='sunscreen'){this.tone(880,.4,'triangle',.13,0,1320)}
    if(type==='bounce'){this.tone(190,.42,'sine',.35,0,70);this.tone(620,.35,'triangle',.1,.15,140)}
    if(type==='hit'||type==='land')this.tone(80,.23,'triangle',.3,0,30);
    if(type==='jump')this.tone(180,.4,'sine',.15,0,600);
    if(type==='finish')[523,659,784,1046].forEach((f,i)=>this.tone(f,.55,'triangle',.17,i*.12));
  }
  update(speed,racing){
    if(!this.ctx)return;const now=this.ctx.currentTime;
    this.engine.frequency.setTargetAtTime(38+speed*2.4,now,.15);this.engineGain.gain.setTargetAtTime(racing?.03:0,now,.12);
    if(!this.enabled||!racing){this.nextNote=now;return}
    if(now>=this.nextNote){
      const melody=[76,0,79,83,81,0,79,76,74,0,76,79,76,0,72,0,72,0,76,79,81,79,76,0,74,0,79,81,79,0,74,0];
      const n=melody[this.beat%melody.length];if(n)this.tone(440*2**((n-69)/12),.21,'sine',.08);
      if(this.beat%4===0){const bass=[48,45,41,43][Math.floor(this.beat/8)%4];this.tone(440*2**((bass-69)/12),.32,'triangle',.05)}
      this.beat++;this.nextNote=now+.225;
    }
  }
}
