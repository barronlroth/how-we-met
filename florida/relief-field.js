import {makeFFT} from '../scripts/lib/ocean-spectrum.mjs';

const PASS_CYCLES=8,STOP_CYCLES=12;
const clamp01=value=>Math.max(0,Math.min(1,value));

/**
 * Reconstruct a periodic, choppy water surface from scalar artistic input.
 *
 * The caller owns image decoding and any boundary-ramp removal. This function
 * copies its input, removes DC, and preserves Fourier phases. `uvScale` is
 * texture repeats per metre, and `slopeRms` is the uncompressed height-gradient
 * RMS. Chopping increases the final surface slope; both values are reported.
 *
 * Coordinates are the texture's unrotated U/V metre frame. Normal RGB encodes
 * U/V/up as `rgb * 2 - 1`; alpha encodes height as `(a - .5) * heightScale`.
 * Displacement RGB encodes U/up/V in metres as
 * `(rgb - .5) * displacementScale`; its alpha is unused. Both textures contain
 * linear data. Rotate horizontal displacement and normal slopes with the
 * transpose of the caller's world-to-texture rotation before world-space use.
 *
 * Vertex sampling must use a mip level appropriate to the mesh footprint.
 * Returned full-resolution normals describe the full deformed surface; normal
 * detail may resolve more bandwidth than the geometry's filtered displacement.
 */
export function prepareReliefField(source,{
  size,uvScale=.28,slopeRms=.30,minStretch=.35,includeFields=false,
}={}) {
  if(!Number.isInteger(size)||size<32||(size&(size-1)))throw new RangeError('Relief size must be a power of two of at least 32.');
  if(source?.length!==size*size)throw new RangeError('Relief source dimensions do not match its size.');
  if(!Number.isFinite(uvScale)||uvScale<=0)throw new RangeError('Relief UV scale must be positive and finite.');
  if(!Number.isFinite(slopeRms)||slopeRms<0)throw new RangeError('Relief slope RMS must be nonnegative and finite.');
  if(!Number.isFinite(minStretch)||minStretch<=0||minStretch>1)throw new RangeError('Relief minimum stretch must be greater than zero and at most one.');
  const count=size*size,inverseFFT=makeFFT(size),real=new Float64Array(count),imaginary=new Float64Array(count);
  let mean=0;
  for(let i=0;i<count;i++){
    if(!Number.isFinite(source[i]))throw new TypeError('Relief source must contain only finite numbers.');
    mean+=source[i]/count;
  }
  for(let i=0;i<count;i++)real[i]=source[i]-mean;
  // A conjugated inverse transform supplies the forward transform without a
  // second FFT implementation. makeFFT applies the inverse's 1/N² factor.
  inverseFFT(real,imaginary);
  for(let i=0;i<count;i++){real[i]*=count;imaginary[i]*=-count;}
  real[0]=imaginary[0]=0;
  const frequencyU=new Float64Array(count),frequencyV=new Float64Array(count),radius=new Float64Array(count);
  let sourceEnergy=0,filteredEnergy=0,gradientEnergy=0;
  for(let v=0;v<size;v++)for(let u=0;u<size;u++){
    const i=v*size+u,ku=u<=size/2?u:u-size,kv=v<=size/2?v:v-size,k=Math.hypot(ku,kv);
    frequencyU[i]=ku*2*Math.PI*uvScale;frequencyV[i]=kv*2*Math.PI*uvScale;radius[i]=k;
    sourceEnergy+=real[i]**2+imaginary[i]**2;
    const t=clamp01((k-PASS_CYCLES)/(STOP_CYCLES-PASS_CYCLES)),filter=1-t*t*(3-2*t);
    real[i]*=filter;imaginary[i]*=filter;
    const energy=real[i]**2+imaginary[i]**2;
    filteredEnergy+=energy;gradientEnergy+=energy*(frequencyU[i]**2+frequencyV[i]**2);
  }
  // Do not amplify floating-point residue when all source modes were rejected.
  const hasRelief=filteredEnergy>sourceEnergy*1e-24&&gradientEnergy>0&&slopeRms>0;
  const heightGain=hasRelief?slopeRms/(Math.sqrt(gradientEnergy)/count):0;
  for(let i=0;i<count;i++){real[i]*=heightGain;imaginary[i]*=heightGain;}

  function field(multiplier) {
    const r=new Float64Array(count),im=new Float64Array(count);
    for(let i=0;i<count;i++){
      const [a,b]=multiplier(i);
      r[i]=real[i]*a-imaginary[i]*b;im[i]=real[i]*b+imaginary[i]*a;
    }
    inverseFFT(r,im);return r;
  }
  const height=field(()=>[1,0]);
  const heightU=field(i=>[0,frequencyU[i]]),heightV=field(i=>[0,frequencyV[i]]);
  // -i k/|k| H gives the Riesz displacement. The final surface subtracts it,
  // compressing crests and opening troughs. All derivatives use physical metres.
  const unitU=i=>radius[i]?frequencyU[i]/(radius[i]*2*Math.PI*uvScale):0;
  const unitV=i=>radius[i]?frequencyV[i]/(radius[i]*2*Math.PI*uvScale):0;
  const displacementU=field(i=>[0,-unitU(i)]),displacementV=field(i=>[0,-unitV(i)]);
  const duu=field(i=>[frequencyU[i]*unitU(i),0]);
  const duv=field(i=>[frequencyV[i]*unitU(i),0]);
  const dvv=field(i=>[frequencyV[i]*unitV(i),0]);
  let largestEigenvalue=0;
  for(let i=0;i<count;i++){
    const eigenvalue=(duu[i]+dvv[i]+Math.hypot(duu[i]-dvv[i],2*duv[i]))*.5;
    largestEigenvalue=Math.max(largestEigenvalue,eigenvalue);
  }
  const chop=largestEigenvalue>0?(1-minStretch)/largestEigenvalue:0;
  const normalU=new Float64Array(count),normalUp=new Float64Array(count),normalV=new Float64Array(count);
  const displacementScale=[0,0,0];
  let actualMinStretch=1,minJacobian=1,heightEnergy=0,heightSlopeEnergy=0,surfaceSlopeEnergy=0,maxSlope=0;
  for(let i=0;i<count;i++){
    displacementU[i]*=-chop;displacementV[i]*=-chop;
    const a=1-chop*duu[i],b=-chop*duv[i],c=1-chop*dvv[i],jacobian=a*c-b*b;
    actualMinStretch=Math.min(actualMinStretch,(a+c-Math.hypot(a-c,2*b))*.5);
    minJacobian=Math.min(minJacobian,jacobian);
    // Cross the two full deformed tangents, not just the height gradients.
    const nx=b*heightV[i]-c*heightU[i],ny=jacobian,nz=b*heightU[i]-a*heightV[i],length=Math.hypot(nx,ny,nz);
    normalU[i]=nx/length;normalUp[i]=ny/length;normalV[i]=nz/length;
    heightEnergy+=height[i]**2;heightSlopeEnergy+=heightU[i]**2+heightV[i]**2;
    const slope=(nx*nx+nz*nz)/(ny*ny);surfaceSlopeEnergy+=slope;maxSlope=Math.max(maxSlope,Math.sqrt(slope));
    displacementScale[0]=Math.max(displacementScale[0],2*Math.abs(displacementU[i]));
    displacementScale[1]=Math.max(displacementScale[1],2*Math.abs(height[i]));
    displacementScale[2]=Math.max(displacementScale[2],2*Math.abs(displacementV[i]));
  }
  const normalHeightData=new Uint8Array(count*4),displacementData=new Uint8Array(count*4),heightScale=displacementScale[1];
  const encodeSigned=(value,scale)=>Math.round(clamp01(scale?value/scale+.5:.5)*255);
  for(let i=0;i<count;i++){
    const j=i*4;
    normalHeightData[j]=Math.round((normalU[i]*.5+.5)*255);
    normalHeightData[j+1]=Math.round((normalV[i]*.5+.5)*255);
    normalHeightData[j+2]=Math.round((normalUp[i]*.5+.5)*255);
    normalHeightData[j+3]=encodeSigned(height[i],heightScale);
    displacementData[j]=encodeSigned(displacementU[i],displacementScale[0]);
    displacementData[j+1]=normalHeightData[j+3];
    displacementData[j+2]=encodeSigned(displacementV[i],displacementScale[2]);
    displacementData[j+3]=255;
  }
  let slopeEnergy=0,targetBandEnergy=0,stopBandEnergy=0;
  const modes=[];
  for(let i=1;i<count;i++){
    const energy=(real[i]**2+imaginary[i]**2)*(frequencyU[i]**2+frequencyV[i]**2);
    if(energy===0)continue;
    slopeEnergy+=energy;modes.push({frequency:radius[i],energy});
    if(radius[i]>=4&&radius[i]<=10)targetBandEnergy+=energy;
    if(radius[i]>=STOP_CYCLES)stopBandEnergy+=energy;
  }
  modes.sort((a,b)=>a.frequency-b.frequency);
  const quantile=fraction=>{
    if(!slopeEnergy)return 0;
    let accumulated=0;for(const mode of modes){accumulated+=mode.energy;if(accumulated>=slopeEnergy*fraction)return mode.frequency;}
    return modes.at(-1).frequency;
  };
  const diagnostics={
    passCycles:PASS_CYCLES,stopCycles:STOP_CYCLES,removedMean:mean,heightGain,chop,
    requestedMinStretch:minStretch,minStretch:actualMinStretch,minJacobian,
    heightRms:Math.sqrt(heightEnergy/count),heightSlopeRms:Math.sqrt(heightSlopeEnergy/count),
    surfaceSlopeRms:Math.sqrt(surfaceSlopeEnergy/count),maxSurfaceSlope:maxSlope,
    targetBandSlopeFraction:slopeEnergy?targetBandEnergy/slopeEnergy:0,
    stopBandSlopeFraction:slopeEnergy?stopBandEnergy/slopeEnergy:0,
    slopeFrequencyQuantiles:[quantile(.1),quantile(.5),quantile(.9)],
  };
  const result={size,normalHeightData,displacementData,displacementScale,heightScale,diagnostics};
  if(includeFields)result.fields={height,displacementU,displacementV,normalU,normalUp,normalV};
  return result;
}
