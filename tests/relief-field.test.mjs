import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareReliefField} from '../florida/relief-field.js';

const tau=2*Math.PI;
const grid=(size,fn)=>Float64Array.from({length:size*size},(_,i)=>fn(i%size,Math.floor(i/size)));
const close=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);
function cosineAmplitude(values,size,modeU,modeV){
  let sum=0;for(let v=0;v<size;v++)for(let u=0;u<size;u++)sum+=values[v*size+u]*Math.cos(tau*(modeU*u+modeV*v)/size);
  return sum*2/(size*size);
}

test('spectral filter preserves low modes and phases, halves the transition midpoint, and rejects fine modes',()=>{
  const size=64,source=grid(size,(u,v)=>5+Math.cos(tau*4*u/size)+.6*Math.cos(tau*10*v/size)+.3*Math.cos(tau*14*u/size));
  const result=prepareReliefField(source,{size,minStretch:1,includeFields:true}),height=result.fields.height;
  close(cosineAmplitude(height,size,0,10)/cosineAmplitude(height,size,4,0),.3);
  close(cosineAmplitude(height,size,14,0),0);
  close(height.reduce((sum,value)=>sum+value,0)/height.length,0);
  close(result.diagnostics.heightSlopeRms,.30);
  assert.equal(result.diagnostics.stopBandSlopeFraction,0);
  close(result.diagnostics.targetBandSlopeFraction,1);
});

test('a single travelling-axis mode has the analytical choppy positions and normals, including crest compression',()=>{
  const size=64,cycles=4,uvScale=.28,slopeRms=.30,minStretch=.35,k=tau*cycles*uvScale;
  const result=prepareReliefField(grid(size,u=>Math.cos(tau*cycles*u/size)),{size,uvScale,slopeRms,minStretch,includeFields:true});
  const amplitude=slopeRms*Math.sqrt(2)/k,compression=1-minStretch;
  for(let u=0;u<size;u++){
    const angle=tau*cycles*u/size,h=amplitude*Math.cos(angle),offset=-compression/k*Math.sin(angle);
    close(result.fields.height[u],h);close(result.fields.displacementU[u],offset);close(result.fields.displacementV[u],0);
    const nx=amplitude*k*Math.sin(angle),up=1-compression*Math.cos(angle),length=Math.hypot(nx,up);
    close(result.fields.normalU[u],nx/length);close(result.fields.normalUp[u],up/length);close(result.fields.normalV[u],0);
  }
  close(result.diagnostics.minStretch,minStretch);close(result.diagnostics.minJacobian,minStretch);
  assert.ok(result.diagnostics.surfaceSlopeRms>slopeRms,'crest compression steepens actual world-space faces');
});

test('crossing-wave normals agree with independent position derivatives and the surface never folds',()=>{
  const size=256,uvScale=.28,minStretch=.35;
  const source=grid(size,(u,v)=>Math.cos(tau*(3*u+v)/size)+.45*Math.sin(tau*(-2*u+5*v)/size)+.1*Math.cos(tau*7*v/size));
  const {fields:f,diagnostics}=prepareReliefField(source,{size,uvScale,minStretch,includeFields:true});
  const derivative=(values,u,v,axis)=>{
    const sample=offset=>values[((v+(axis===1?offset:0)+size)%size)*size+(u+(axis===0?offset:0)+size)%size];
    return(-sample(2)+8*sample(1)-8*sample(-1)+sample(-2))*size*uvScale/12;
  };
  let minimum=1;
  for(let v=0;v<size;v+=3)for(let u=0;u<size;u+=3){
    const i=v*size+u,a=1+derivative(f.displacementU,u,v,0),b=derivative(f.displacementU,u,v,1);
    const c=derivative(f.displacementV,u,v,0),d=1+derivative(f.displacementV,u,v,1);
    const hu=derivative(f.height,u,v,0),hv=derivative(f.height,u,v,1);
    const nx=hv*c-d*hu,ny=d*a-b*c,nz=b*hu-hv*a,length=Math.hypot(nx,ny,nz);
    assert.ok(ny>minStretch*minStretch-1e-5,'horizontal map keeps positive oriented area');
    minimum=Math.min(minimum,(a+d-Math.sqrt((a-d)**2+4*b*c))*.5);
    close(f.normalU[i],nx/length,2e-5);close(f.normalUp[i],ny/length,2e-5);close(f.normalV[i],nz/length,2e-5);
  }
  assert.ok(minimum>=minStretch-2e-5);close(diagnostics.minStretch,minStretch);
});

test('periodic translations commute with reconstruction and do not mutate the input',()=>{
  const size=64,du=9,dv=7;
  const source=grid(size,(u,v)=>.2*Math.cos(tau*(5*u+v)/size)+.3*Math.sin(tau*(u-6*v)/size)),before=source.slice();
  const shifted=grid(size,(u,v)=>source[((v+dv)%size)*size+(u+du)%size]);
  const a=prepareReliefField(source,{size,includeFields:true}),b=prepareReliefField(shifted,{size,includeFields:true});
  assert.deepEqual(source,before);close(a.diagnostics.chop,b.diagnostics.chop);
  for(const key of Object.keys(a.fields))for(let v=0;v<size;v++)for(let u=0;u<size;u++){
    close(b.fields[key][v*size+u],a.fields[key][((v+dv)%size)*size+(u+du)%size]);
  }
});

test('RGBA8 data reconstructs physical offsets within a quantization half-step and retains upward unit normals',()=>{
  const size=64,result=prepareReliefField(grid(size,(u,v)=>Math.sin(tau*(4*u+3*v)/size)+.4*Math.cos(tau*(2*u-5*v)/size)),{size,includeFields:true});
  const {fields:f,normalHeightData:n,displacementData:d,displacementScale:scale,heightScale}=result;
  assert.equal(n.length,size*size*4);assert.equal(d.length,n.length);
  for(let i=0;i<size*size;i++){
    const offset=[f.displacementU[i],f.height[i],f.displacementV[i]];
    for(let channel=0;channel<3;channel++)close((d[i*4+channel]/255-.5)*scale[channel],offset[channel],scale[channel]/510+1e-12);
    close((n[i*4+3]/255-.5)*heightScale,f.height[i],heightScale/510+1e-12);
    const normal=[n[i*4]/255*2-1,n[i*4+1]/255*2-1,n[i*4+2]/255*2-1];
    assert.ok(normal[2]>0);close(Math.hypot(...normal),1,.007);assert.equal(d[i*4+3],255);
  }
});

test('constant and fully rejected sources remain finite and flat instead of amplifying numerical residue',()=>{
  const size=64;
  for(const source of [new Float64Array(size*size).fill(.7),grid(size,u=>Math.cos(tau*18*u/size))]){
    const result=prepareReliefField(source,{size,includeFields:true});
    close(result.diagnostics.heightRms,0);close(result.diagnostics.surfaceSlopeRms,0);close(result.diagnostics.minStretch,1);
    assert.deepEqual(result.displacementScale,[0,0,0]);
    for(const values of Object.values(result.fields))assert.ok(values.every(Number.isFinite));
    assert.ok(result.fields.normalUp.every(value=>value===1));
  }
});

test('invalid dimensions and nonfinite material inputs fail before generating textures',()=>{
  const source=new Float64Array(32*32);
  for(const options of [{size:31},{size:64},{size:32,uvScale:0},{size:32,slopeRms:-1},{size:32,minStretch:0},{size:32,minStretch:1.1}])assert.throws(()=>prepareReliefField(source,options));
  source[17]=NaN;assert.throws(()=>prepareReliefField(source,{size:32}),/finite/);
});
