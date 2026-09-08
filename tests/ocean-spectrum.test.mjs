import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeFFT,makeOceanSpectrum} from '../scripts/lib/ocean-spectrum.mjs';

test('2D inverse FFT agrees with an independent direct Fourier sum',()=>{
  const size=8,count=size*size,real=Float64Array.from({length:count},(_,i)=>Math.sin(i*.73)),imaginary=Float64Array.from({length:count},(_,i)=>Math.cos(i*.41));
  const originalReal=real.slice(),originalImaginary=imaginary.slice();makeFFT(size)(real,imaginary);
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    let expectedReal=0,expectedImaginary=0;
    for(let kz=0;kz<size;kz++)for(let kx=0;kx<size;kx++){
      const i=kz*size+kx,a=2*Math.PI*(kx*x+kz*z)/size,c=Math.cos(a),s=Math.sin(a);
      expectedReal+=originalReal[i]*c-originalImaginary[i]*s;expectedImaginary+=originalReal[i]*s+originalImaginary[i]*c;
    }
    assert.ok(Math.abs(real[z*size+x]-expectedReal/count)<1e-12);
    assert.ok(Math.abs(imaginary[z*size+x]-expectedImaginary/count)<1e-12);
  }
});

test('wind spectrum has a real zero-mean height field and an exact temporal loop',()=>{
  const spectrum=makeOceanSpectrum({size:32,length:16,period:4,seed:291});
  for(const time of [0,.37,1.8,3.999]){
    const {height,imaginary}=spectrum.field(time);
    assert.ok(Math.max(...imaginary.map(Math.abs))<1e-12,'Hermitian spectrum yields a real field');
    assert.ok(Math.abs(height.reduce((a,b)=>a+b,0)/height.length)<1e-12,'sea level remains fixed');
    assert.ok(height.some(h=>Math.abs(h)>.01),'surface has actual wave relief');
  }
  assert.deepEqual(spectrum.encode(0),spectrum.encode(4));
  assert.deepEqual(spectrum.encode(.5),makeOceanSpectrum({size:32,length:16,period:4,seed:291}).encode(.5));
  assert.throws(()=>makeFFT(31),/power of two/);
});

test('shipped normal cache matches its manifest and contains valid upward-facing unit normals',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../florida/assets/textures/wind-waves-v1.json',import.meta.url),'utf8'));
  const data=await readFile(new URL('../florida/assets/textures/wind-waves-v1.bin',import.meta.url));
  assert.equal(data.length,manifest.size**2*manifest.frames*manifest.bands.length*4);
  assert.equal(createHash('sha256').update(data).digest('hex'),manifest.sha256);
  let heightMin=255,heightMax=0;
  for(let i=0;i<data.length;i+=4){
    const x=data[i]/255*2-1,z=data[i+1]/255*2-1,y=data[i+2]/255*2-1;
    assert.ok(y>0);assert.ok(Math.abs(Math.hypot(x,y,z)-1)<.007);
    heightMin=Math.min(heightMin,data[i+3]);heightMax=Math.max(heightMax,data[i+3]);
  }
  assert.ok(heightMax-heightMin>150);
});

test('shipped displacement cache reconstructs the same Fourier surface in world metres',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../florida/assets/textures/wind-waves-v1.json',import.meta.url),'utf8'));
  const data=await readFile(new URL('../florida/assets/textures/wind-displacement-v1.bin',import.meta.url));
  assert.equal(data.length,manifest.size**2*manifest.frames*4);
  assert.equal(createHash('sha256').update(data).digest('hex'),manifest.displacement.sha256);
  const config=manifest.bands[0],spectrum=makeOceanSpectrum({size:manifest.size,period:manifest.period,...config});
  for(const frame of [0,19,63]){
    const field=spectrum.field(frame*manifest.period/manifest.frames);
    for(let i=0;i<manifest.size**2;i+=97){
      const values=[-config.chop*field.displacementX[i],field.height[i],-config.chop*field.displacementZ[i]];
      for(let channel=0;channel<3;channel++){
        const decoded=(data[(frame*manifest.size**2+i)*4+channel]/255-.5)*manifest.displacement.scale;
        assert.ok(Math.abs(decoded-values[channel])<=manifest.displacement.scale/510+1e-8,'cache preserves position within one quantization half-step');
      }
    }
  }
});
