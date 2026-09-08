import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {makeFFT,makeOceanSpectrum,makeHighResolutionNormals} from '../scripts/lib/ocean-spectrum.mjs';
import {decodeSubRows} from '../florida/wave-codec.js';

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

const packetConfiguration={size:128,length:22,windSpeed:1.35,wind:[.42,.91],slopeRms:.27,chop:1.3,period:4,seed:9137,packets:{seed:26148}};
let packets;
const packetFixture=()=>packets??=makeOceanSpectrum(packetConfiguration);
const centralDerivative=(values,size,length,x,z,axis)=>{
  const sample=offset=>values[((z+(axis===1?offset:0)+size)%size)*size+(x+(axis===0?offset:0)+size)%size];
  return(sample(1)-sample(-1))*size/(2*length);
};

test('packet coverage redistributes the existing slope energy into bounded quiet islands and stronger active faces',()=>{
  const spectrum=packetFixture(),d=spectrum.packetDiagnostics;
  assert.ok(d.calmEnvelopeFraction>.37&&d.calmEnvelopeFraction<.43,'roughly40percent of the tile has less than half carrier amplitude');
  assert.ok(d.quietDiameterQuantiles[0]>=.60&&d.quietDiameterQuantiles[2]<=1.80);
  assert.ok(Math.abs(d.heightSlopeRms-.27)<1e-12,'global slope energy is preserved over the full loop');
  assert.ok(d.quietCoreSlopeRms<.14&&d.activeSlopeRms>.32,'calm regions lose relief while active faces gain it');
  const {cores}=spectrum.packetLayout;
  for(let a=0;a<cores.length;a++)for(let b=a+1;b<cores.length;b++){
    const wrap=value=>value-spectrum.length*Math.round(value/spectrum.length);
    const distance=Math.hypot(wrap(cores[a].x-cores[b].x),wrap(cores[a].z-cores[b].z));
    assert.ok(distance>=cores[a].quietRadius+cores[b].quietRadius+.12-1e-12,'quiet islands remain separate across tile boundaries');
  }
});

test('every cached packet frame has positive horizontal stretch and normals matching its complete displaced geometry',()=>{
  const spectrum=packetFixture(),{size,length,chop}=packetConfiguration;
  for(let frame=0;frame<64;frame++){
    const f=spectrum.field(frame/16),encoded=spectrum.encode(frame/16);
    for(let z=0;z<size;z++)for(let x=0;x<size;x++){
      const i=z*size+x,dx=(values,axis)=>centralDerivative(values,size,length,x,z,axis);
      const xu=1-chop*dx(f.displacementX,0),xv=-chop*dx(f.displacementX,1),zu=-chop*dx(f.displacementZ,0),zv=1-chop*dx(f.displacementZ,1);
      const hu=dx(f.height,0),hv=dx(f.height,1),ny=xu*zv-xv*zu,trace=xu*xu+xv*xv+zu*zu+zv*zv;
      const smallestStretch=Math.sqrt(Math.max(0,(trace-Math.sqrt(Math.max(0,trace*trace-4*ny*ny)))/2));
      assert.ok(smallestStretch>=.30-1e-10);assert.ok(ny>0);
      const nx=hv*zu-zv*hu,nz=xv*hu-hv*xu,normalLength=Math.hypot(nx,ny,nz);
      for(const [channel,value] of [[0,nx],[1,nz],[2,ny]])assert.ok(Math.abs((encoded[i*4+channel]/255*2-1)-value/normalLength)<=1/255+1e-12);
    }
  }
});

test('packet modulation includes envelope derivatives instead of merely scaling a carrier normal',()=>{
  const spectrum=packetFixture(),{size,length,windSpeed,wind,seed}=packetConfiguration;
  const carrier=makeOceanSpectrum({...packetConfiguration,packets:null,slopeRms:1,chop:0,directionalPower:8,isotropicFraction:.02});
  const angle=Math.PI/6,c=Math.cos(angle),s=Math.sin(angle);
  const crossing=makeOceanSpectrum({...packetConfiguration,packets:null,slopeRms:1,chop:0,directionalPower:8,isotropicFraction:.02,windSpeed:windSpeed*.78,wind:[wind[0]*c-wind[1]*s,wind[0]*s+wind[1]*c],seed:seed+7919});
  const time=.4375,a=carrier.field(time),b=crossing.field(time),actual=spectrum.field(time),{weightA,weightB}=spectrum.packetLayout;
  let differenceEnergy=0,actualEnergy=0;
  for(let z=0;z<size;z++)for(let x=0;x<size;x++)for(const axis of [0,1]){
    const i=z*size+x,derivative=centralDerivative(actual.height,size,length,x,z,axis);
    const faded=(weightA[i]*centralDerivative(a.height,size,length,x,z,axis)+weightB[i]*centralDerivative(b.height,size,length,x,z,axis))*spectrum.packetDiagnostics.heightGain;
    actualEnergy+=derivative*derivative;differenceEnergy+=(derivative-faded)**2;
  }
  assert.ok(differenceEnergy/actualEnergy>.02,'varying packet amplitude contributes real surface slopes at packet boundaries');
});

test('packet fields are deterministic, finite, zero-mean and exactly periodic, including between cached frames',()=>{
  const spectrum=packetFixture(),again=makeOceanSpectrum(packetConfiguration);
  for(const time of [0,.371,1.8125,3.999]){
    const sample=spectrum.field(time);
    for(const [name,values] of Object.entries(sample)){
      assert.ok(values.every(Number.isFinite),`${name} is finite`);
      assert.ok(Math.abs(values.reduce((sum,value)=>sum+value,0)/values.length)<1e-12,`${name} preserves its zero mean`);
    }
    assert.deepEqual(spectrum.encode(time),spectrum.encode(time+4));assert.deepEqual(spectrum.encode(time),again.encode(time));
  }
  const sample=spectrum.field(0);sample.height.fill(1e6);
  assert.deepEqual(spectrum.encode(0),again.encode(0),'callers cannot mutate the cached surface');
});

test('analytic normal reconstruction preserves original modes and recovers a Nyquist cosine between coarse samples',()=>{
  const sourceSize=32,length=16,size=128,amplitude=.025,k=Math.PI*sourceSize/length;
  const fixture={size:sourceSize,length,period:4,heightRms:amplitude,
    field:()=>({height:Float64Array.from({length:sourceSize**2},(_,i)=>amplitude*(i%sourceSize%2?-1:1)),displacementX:new Float64Array(sourceSize**2),displacementZ:new Float64Array(sourceSize**2)})};
  const bake=makeHighResolutionNormals(fixture,{size,frames:1,chop:0}),encoded=bake.encodeFrame(0);
  for(let x=0;x<size;x++){
    const angle=Math.PI*sourceSize*x/size,nx=amplitude*k*Math.sin(angle),normalLength=Math.hypot(nx,1);
    assert.ok(Math.abs(encoded[x*4]/255*2-1-nx/normalLength)<=1/255+1e-12);
    assert.ok(Math.abs((encoded[x*4+3]/255-.5)*amplitude*7-amplitude*Math.cos(angle))<=amplitude*7/510+1e-12);
  }
  assert.ok(Math.abs(bake.diagnostics().heightSlopeRms-amplitude*k/Math.sqrt(2))<1e-12);
});

test('fine analytic Jacobian analysis bounds horizontal compression and encodes matching exact normals',()=>{
  const sourceSize=32,size=128,length=8,period=4,cycles=2,k=cycles*2*Math.PI/length,heightAmplitude=.10,horizontalAmplitude=.80;
  const fixture={size:sourceSize,length,period,heightRms:heightAmplitude/Math.sqrt(2),field:time=>{
    const height=new Float64Array(sourceSize**2),displacementX=new Float64Array(sourceSize**2);
    for(let i=0;i<height.length;i++){const angle=cycles*2*Math.PI*(i%sourceSize)/sourceSize-time*2*Math.PI/period;height[i]=heightAmplitude*Math.cos(angle);displacementX[i]=horizontalAmplitude*Math.sin(angle);}
    return{height,displacementX,displacementZ:new Float64Array(sourceSize**2)};
  }};
  const bake=makeHighResolutionNormals(fixture,{size,frames:4,chop:1,minStretch:.30});
  assert.ok(Math.abs(bake.horizontalScale-.70/(horizontalAmplitude*k))<1e-12);
  for(let frame=0;frame<4;frame++){
    const output=new Uint8Array(size*size*4),encoded=bake.encodeFrame(frame,output);assert.equal(encoded,output,'one frame buffer can be reused');
    for(let x=0;x<size;x++){
      const angle=cycles*2*Math.PI*x/size-frame*Math.PI/2,nx=heightAmplitude*k*Math.sin(angle),ny=1-.70*Math.cos(angle),norm=Math.hypot(nx,ny);
      assert.ok(Math.abs(encoded[x*4]/255*2-1-nx/norm)<=1/255+1e-12);
      assert.ok(Math.abs(encoded[x*4+2]/255*2-1-ny/norm)<=1/255+1e-12);
    }
  }
  assert.equal(bake.diagnostics().measuredFrames,4);assert.ok(Math.abs(bake.diagnostics().minimumHorizontalStretch-.30)<1e-12);
});

test('advertised primary normal asset is zlib-wrapped RGBA8 with verified dimensions, hashes and upward normals',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../florida/assets/textures/wind-waves-v1.json',import.meta.url),'utf8'));
  assert.ok(manifest.primaryNormals,'the production manifest advertises its fine primary normals');
  const primary=manifest.primaryNormals,compressed=await readFile(new URL(`../florida/assets/textures/${primary.file}`,import.meta.url));
  assert.equal(primary.compression,'deflate');assert.equal(primary.size,512);assert.equal(primary.frames,64);
  assert.equal(compressed.length,primary.compressedBytes);assert.equal(createHash('sha256').update(compressed).digest('hex'),primary.sha256);
  const data=inflateSync(compressed);
  assert.equal(data.length,primary.uncompressedBytes);assert.equal(data.length,primary.size**2*primary.frames*4);
  assert.equal(createHash('sha256').update(data).digest('hex'),primary.uncompressedSha256);
  assert.equal(primary.predictor,'sub');decodeSubRows(data,primary.size*4);
  assert.equal(createHash('sha256').update(data).digest('hex'),primary.decodedSha256);
  assert.equal(primary.decodedSha256,'7e0878d723423abc2a83d5749aecf12e1c68ef58dabc142ba961a160e2b2917e','packaging preserves the approved physical normal field');
  for(let i=0;i<data.length;i+=4){const nx=data[i]/255*2-1,nz=data[i+1]/255*2-1,ny=data[i+2]/255*2-1;assert.ok(ny>0);assert.ok(Math.abs(Math.hypot(nx,ny,nz)-1)<.007);}
  assert.equal(primary.diagnostics.measuredFrames,64);assert.ok(primary.diagnostics.minimumHorizontalStretch>=.30-1e-9);assert.ok(primary.diagnostics.minimumJacobian>0);
});
