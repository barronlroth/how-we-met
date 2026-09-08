// Original implementation of Tessendorf's Fourier height-field formulation.
// Equations 23–26 and the choppy displacement in Simulating Ocean Water (2001):
// https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2002.pdf
// Ocean authoring runs offline. The FFT helper is also used once during image
// relief loading; gameplay only samples prepared textures and periodic caches.
export function makeFFT(size) {
  if (size < 2 || (size & (size - 1))) throw new Error('FFT size must be a power of two.');
  const reverse = new Uint16Array(size), bits = Math.log2(size);
  for (let i=0;i<size;i++) { let value=i, result=0;for(let b=0;b<bits;b++){result=(result<<1)|(value&1);value>>=1}reverse[i]=result; }
  const cosine=new Float64Array(size/2),sine=new Float64Array(size/2);
  for(let i=0;i<size/2;i++){cosine[i]=Math.cos(2*Math.PI*i/size);sine[i]=Math.sin(2*Math.PI*i/size)}
  function line(real,imaginary,start,stride) {
    for(let i=0;i<size;i++){const j=reverse[i];if(j>i){const a=start+i*stride,b=start+j*stride;[real[a],real[b]]=[real[b],real[a]];[imaginary[a],imaginary[b]]=[imaginary[b],imaginary[a]]}}
    for(let width=2;width<=size;width*=2){const half=width/2,step=size/width;
      for(let base=0;base<size;base+=width)for(let j=0;j<half;j++){
        const a=start+(base+j)*stride,b=start+(base+j+half)*stride,c=cosine[j*step],s=sine[j*step];
        const tr=c*real[b]-s*imaginary[b],ti=c*imaginary[b]+s*real[b],ar=real[a],ai=imaginary[a];
        real[a]=ar+tr;imaginary[a]=ai+ti;real[b]=ar-tr;imaginary[b]=ai-ti;
      }
    }
  }
  return (real,imaginary)=>{
    if(real.length!==size*size||imaginary.length!==real.length)throw new Error('FFT field dimensions do not match.');
    for(let z=0;z<size;z++)line(real,imaginary,z*size,1);
    for(let x=0;x<size;x++)line(real,imaginary,x,size);
    const scale=1/(size*size);for(let i=0;i<real.length;i++){real[i]*=scale;imaginary[i]*=scale}
    return real;
  };
}

function gaussianSource(seed) {
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return(state+.5)/4294967296};
  return()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
}

export function makeOceanSpectrum({size=128,length=64,windSpeed=1.8,wind=[.42,.91],slopeRms=.21,chop=.9,period=4,seed=9137,directionalPower=2,isotropicFraction=.18,packets=null}) {
  if(packets)return makePacketSpectrum({size,length,windSpeed,wind,slopeRms,chop,period,seed,directionalPower,isotropicFraction},packets);
  const count=size*size,fft=makeFFT(size),gaussian=gaussianSource(seed),h0r=new Float64Array(count),h0i=new Float64Array(count);
  const frequencies=new Float64Array(count),kx=new Float64Array(count),kz=new Float64Array(count),inverseK=new Float64Array(count),opposite=new Uint32Array(count);
  const windLength=Math.hypot(...wind),windX=wind[0]/windLength,windZ=wind[1]/windLength,L=windSpeed*windSpeed/9.81,smallWave=length/size*.42;
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const i=z*size+x,ax=(x<=size/2?x:x-size)*2*Math.PI/length,az=(z<=size/2?z:z-size)*2*Math.PI/length,k=Math.hypot(ax,az);
    kx[i]=ax;kz[i]=az;opposite[i]=((size-z)%size)*size+(size-x)%size;
    if(k===0)continue;
    inverseK[i]=1/k;
    const alignment=(ax*windX+az*windZ)/k;
    const direction=directionalPower===2?alignment*alignment:Math.abs(alignment)**directionalPower;
    const directionalWeight=directionalPower===2&&isotropicFraction===.18?.18+.82*alignment*alignment:isotropicFraction+(1-isotropicFraction)*direction;
    const spectrum=Math.exp(-1/(k*L)**2)/(k**4)*directionalWeight*Math.exp(-k*k*smallWave*smallWave);
    const amplitude=Math.sqrt(spectrum/2);h0r[i]=gaussian()*amplitude;h0i[i]=gaussian()*amplitude;
    // Quantized dispersion makes the cache seam exactly periodic in time.
    frequencies[i]=Math.max(1,Math.round(Math.sqrt(9.81*k*Math.tanh(k*8))*period/(2*Math.PI)))*2*Math.PI/period;
  }
  function field(time,withDisplacement=true){
    const hr=new Float64Array(count),hi=new Float64Array(count),xr=new Float64Array(count),xi=new Float64Array(count),zr=new Float64Array(count),zi=new Float64Array(count);
    for(let i=0;i<count;i++){
      const n=opposite[i],angle=frequencies[i]*time,c=Math.cos(angle),s=Math.sin(angle);
      hr[i]=(h0r[i]+h0r[n])*c-(h0i[i]+h0i[n])*s;
      hi[i]=(h0r[i]-h0r[n])*s+(h0i[i]-h0i[n])*c;
      // -i k/|k| h(k), followed by a negative chop scale, narrows crests.
      xr[i]=hi[i]*kx[i]*inverseK[i];xi[i]=-hr[i]*kx[i]*inverseK[i];
      zr[i]=hi[i]*kz[i]*inverseK[i];zi[i]=-hr[i]*kz[i]*inverseK[i];
    }
    fft(hr,hi);if(withDisplacement){fft(xr,xi);fft(zr,zi)}
    return{height:hr,imaginary:hi,displacementX:xr,displacementZ:zr};
  }
  const initial=field(0,false),derivativeScale=size/(2*length);let slopeEnergy=0,heightEnergy=0;
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const i=z*size+x,dx=(initial.height[z*size+(x+1)%size]-initial.height[z*size+(x-1+size)%size])*derivativeScale;
    const dz=(initial.height[((z+1)%size)*size+x]-initial.height[((z-1+size)%size)*size+x])*derivativeScale;
    slopeEnergy+=dx*dx+dz*dz;heightEnergy+=initial.height[i]**2;
  }
  const gain=slopeRms/Math.sqrt(slopeEnergy/count),heightRms=Math.sqrt(heightEnergy/count)*gain;
  for(let i=0;i<count;i++){h0r[i]*=gain;h0i[i]*=gain}
  function encode(time){
    const {height,displacementX:dx,displacementZ:dz}=field(time),data=new Uint8Array(count*4);
    for(let z=0;z<size;z++)for(let x=0;x<size;x++){
      const i=z*size+x,left=z*size+(x-1+size)%size,right=z*size+(x+1)%size,up=((z-1+size)%size)*size+x,down=((z+1)%size)*size+x;
      const hx=(height[right]-height[left])*derivativeScale,hz=(height[down]-height[up])*derivativeScale;
      const xx=1-chop*(dx[right]-dx[left])*derivativeScale,xz=-chop*(dx[down]-dx[up])*derivativeScale;
      const zx=-chop*(dz[right]-dz[left])*derivativeScale,zz=1-chop*(dz[down]-dz[up])*derivativeScale;
      let nx=hz*zx-zz*hx,ny=Math.max(.20,zz*xx-xz*zx),nz=xz*hx-hz*xx;
      const inverseLength=1/Math.hypot(nx,ny,nz);nx*=inverseLength;ny*=inverseLength;nz*=inverseLength;
      // R/G store world-X/Z normal components, B its upward component.
      data[i*4]=Math.round((nx*.5+.5)*255);data[i*4+1]=Math.round((nz*.5+.5)*255);data[i*4+2]=Math.round((ny*.5+.5)*255);
      data[i*4+3]=Math.round(Math.max(0,Math.min(1,.5+height[i]/(heightRms*7)))*255);
    }
    return data;
  }
  return{field,encode,heightRms,size,length,period};
}

/**
 * Offline wave packets share the existing cache layout. Two travelling Fourier
 * carriers pass through smooth periodic spatial weights; their complete height
 * AND horizontal-displacement products are differentiated before encoding.
 * Quiet cores are non-overlapping periodic disks, with soft shells. They bound
 * the empty patches instead of introducing a low-frequency, multi-metre swell.
 */
function makePacketSpectrum(configuration,{
  seed=configuration.seed+17011,frames=64,calmCoverage=.40,minDiameter=.60,maxDiameter=1.80,
  transition=.30,crossingAngle=30,secondaryWindScale=.78,minStretch=.30,horizontalScale=1,
}={}) {
  const {size,length,windSpeed,wind,slopeRms,chop,period}=configuration,count=size*size;
  if(!Number.isInteger(frames)||frames<4||!Number.isFinite(calmCoverage)||calmCoverage<=0||calmCoverage>=.6)throw new RangeError('Packet frames and calm coverage are invalid.');
  if(!(minDiameter>0&&maxDiameter>=minDiameter&&maxDiameter<length&&transition>0&&secondaryWindScale>0&&minStretch>0&&minStretch<=1&&horizontalScale>0&&horizontalScale<=1))throw new RangeError('Packet dimensions and stretch must be positive and bounded.');
  let randomState=seed>>>0;
  const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return(randomState+.5)/4294967296;};
  const wrappedDistance=value=>value-length*Math.round(value/length);
  const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
  let lo=0,hi=1;for(let i=0;i<32;i++){const mid=(lo+hi)*.5;if(.25+.75*smooth(mid)<.5)lo=mid;else hi=mid;}
  const calmRadiusOffset=(lo+hi)*.5*transition;
  if(minDiameter<=2*calmRadiusOffset)throw new RangeError('Packet transition consumes the smallest quiet patch.');
  const cores=[];let coreArea=0,calmArea=0;
  // The exclusion gap keeps neighbouring quiet cores distinct. After large
  // disks have been placed, smaller disks fill irregular spaces between them.
  for(let attempt=0;attempt<50000&&calmArea<calmCoverage*length*length;attempt++){
    const quietRadius=(minDiameter+(maxDiameter-minDiameter)*random())*.5,radius=quietRadius-calmRadiusOffset,x=random()*length,z=random()*length;
    if(cores.some(core=>Math.hypot(wrappedDistance(x-core.x),wrappedDistance(z-core.z))<quietRadius+core.quietRadius+.12))continue;
    cores.push({x,z,radius,quietRadius});coreArea+=Math.PI*radius*radius;calmArea+=Math.PI*quietRadius*quietRadius;
  }
  if(calmArea<calmCoverage*length*length*.95)throw new Error('Could not place the requested quiet packet coverage.');
  const phase=[random(),random(),random()].map(value=>value*2*Math.PI);
  const envelope=new Float64Array(count),weightA=new Float64Array(count),weightB=new Float64Array(count),insideCore=new Uint8Array(count);
  let envelopeEnergy=0,quietSamples=0;
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const i=z*size+x,px=x*length/size,pz=z*length/size;
    let amplitude=1;
    for(const core of cores){
      const distance=Math.hypot(wrappedDistance(px-core.x),wrappedDistance(pz-core.z));
      if(distance>=core.radius+transition)continue;
      if(distance<=core.radius)insideCore[i]=1;
      amplitude*=.25+.75*smooth((distance-core.radius)/transition);
    }
    envelope[i]=amplitude;envelopeEnergy+=amplitude*amplitude;if(amplitude<.5)quietSamples++;
    // A broad, periodic orientation mixture makes one train locally dominant.
    // Its squared weights sum to one before the shared packet envelope.
    const mixture=.5+.24*Math.sin(2*Math.PI*(3*px+2*pz)/length+phase[0])+.16*Math.sin(2*Math.PI*(-2*px+4*pz)/length+phase[1])+.10*Math.cos(2*Math.PI*(px-3*pz)/length+phase[2]);
    const angle=.12+.66*mixture;
    weightA[i]=amplitude*Math.cos(angle);weightB[i]=amplitude*Math.sin(angle);
  }
  const radians=crossingAngle*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
  const carrierOptions={...configuration,slopeRms:1,chop:0,directionalPower:8,isotropicFraction:.02};
  const a=makeOceanSpectrum(carrierOptions),b=makeOceanSpectrum({...carrierOptions,windSpeed:windSpeed*secondaryWindScale,wind:[wind[0]*c-wind[1]*s,wind[0]*s+wind[1]*c],seed:configuration.seed+7919});
  const derivativeScale=size/(2*length);
  function difference(values,index,axis){
    const x=index%size,z=Math.floor(index/size);
    return axis===0?(values[z*size+(x+1)%size]-values[z*size+(x-1+size)%size])*derivativeScale:(values[((z+1)%size)*size+x]-values[((z-1+size)%size)*size+x])*derivativeScale;
  }
  function combined(time){
    const first=a.field(time),second=b.field(time),height=new Float64Array(count),displacementX=new Float64Array(count),displacementZ=new Float64Array(count);
    let heightMean=0,xMean=0,zMean=0;
    for(let i=0;i<count;i++){
      height[i]=weightA[i]*first.height[i]+weightB[i]*second.height[i];
      displacementX[i]=weightA[i]*first.displacementX[i]+weightB[i]*second.displacementX[i];
      displacementZ[i]=weightA[i]*first.displacementZ[i]+weightB[i]*second.displacementZ[i];
      heightMean+=height[i]/count;xMean+=displacementX[i]/count;zMean+=displacementZ[i]/count;
    }
    for(let i=0;i<count;i++){height[i]-=heightMean;displacementX[i]-=xMean;displacementZ[i]-=zMean;}
    return{height,displacementX,displacementZ};
  }
  const cache=Array.from({length:frames},(_,frame)=>combined(frame*period/frames));
  let slopeEnergy=0;
  for(const field of cache)for(let i=0;i<count;i++)slopeEnergy+=difference(field.height,i,0)**2+difference(field.height,i,1)**2;
  const heightGain=slopeRms/Math.sqrt(slopeEnergy/(count*frames));
  let maxDeformationNorm=0;
  for(const field of cache){
    for(const values of Object.values(field))for(let i=0;i<count;i++)values[i]*=heightGain;
    for(let i=0;i<count;i++){
      const xx=difference(field.displacementX,i,0),xz=difference(field.displacementX,i,1),zx=difference(field.displacementZ,i,0),zz=difference(field.displacementZ,i,1);
      // Product envelopes need not have a symmetric displacement derivative.
      // Bound its largest singular value, not an eigenvalue of a guessed Hessian.
      const trace=xx*xx+xz*xz+zx*zx+zz*zz,determinant=xx*zz-xz*zx;
      const norm=Math.sqrt((trace+Math.sqrt(Math.max(0,trace*trace-4*determinant*determinant)))*.5);
      maxDeformationNorm=Math.max(maxDeformationNorm,norm);
    }
  }
  const horizontalGain=(chop>0?Math.min(1,(1-minStretch)/(chop*maxDeformationNorm)):1)*horizontalScale;
  let heightEnergy=0,actualSlopeEnergy=0,surfaceSlopeEnergy=0,minimumStretch=1,minimumJacobian=1,maxOffset=0;
  let quietSlopeEnergy=0,activeSlopeEnergy=0,quietCount=0,activeCount=0;
  function tangents(field,i){
    return{
      hx:difference(field.height,i,0),hz:difference(field.height,i,1),
      xx:1-chop*difference(field.displacementX,i,0),xz:-chop*difference(field.displacementX,i,1),
      zx:-chop*difference(field.displacementZ,i,0),zz:1-chop*difference(field.displacementZ,i,1),
    };
  }
  for(const field of cache){
    for(let i=0;i<count;i++){field.displacementX[i]*=horizontalGain;field.displacementZ[i]*=horizontalGain;}
    for(let i=0;i<count;i++){
      const {hx,hz,xx,xz,zx,zz}=tangents(field,i),jacobian=xx*zz-xz*zx;
      const trace=xx*xx+xz*xz+zx*zx+zz*zz;
      const stretch=Math.sqrt(Math.max(0,(trace-Math.sqrt(Math.max(0,trace*trace-4*jacobian*jacobian)))*.5));
      minimumStretch=Math.min(minimumStretch,stretch);minimumJacobian=Math.min(minimumJacobian,jacobian);
      const nx=hz*zx-zz*hx,nz=xz*hx-hz*xx,slope=hx*hx+hz*hz;
      actualSlopeEnergy+=slope;surfaceSlopeEnergy+=(nx*nx+nz*nz)/(jacobian*jacobian);heightEnergy+=field.height[i]**2;
      if(insideCore[i]){quietSlopeEnergy+=slope;quietCount++;}else if(envelope[i]>.85){activeSlopeEnergy+=slope;activeCount++;}
      maxOffset=Math.max(maxOffset,Math.abs(field.height[i]),Math.abs(chop*field.displacementX[i]),Math.abs(chop*field.displacementZ[i]));
    }
  }
  if(minimumStretch<minStretch-1e-10||minimumJacobian<=0)throw new Error('Packet deformation violated its non-folding bound.');
  const heightRms=Math.sqrt(heightEnergy/(count*frames)),displacementScale=2*maxOffset*1.005;
  function field(time){
    const phase=((time%period)+period)%period,frame=phase/period*frames,nearest=Math.round(frame);
    if(Math.abs(frame-nearest)<1e-9){
      const stored=cache[nearest%frames];return{height:stored.height.slice(),imaginary:new Float64Array(count),displacementX:stored.displacementX.slice(),displacementZ:stored.displacementZ.slice()};
    }
    const result=combined(phase);
    for(let i=0;i<count;i++){result.height[i]*=heightGain;result.displacementX[i]*=heightGain*horizontalGain;result.displacementZ[i]*=heightGain*horizontalGain;}
    return{...result,imaginary:new Float64Array(count)};
  }
  function encode(time){
    const sample=field(time),data=new Uint8Array(count*4);
    for(let i=0;i<count;i++){
      const {hx,hz,xx,xz,zx,zz}=tangents(sample,i),nx=hz*zx-zz*hx,ny=zz*xx-xz*zx,nz=xz*hx-hz*xx,length=Math.hypot(nx,ny,nz);
      if(ny<=0)throw new Error('Packet normal encountered a folded surface.');
      data[i*4]=Math.round((nx/length*.5+.5)*255);data[i*4+1]=Math.round((nz/length*.5+.5)*255);data[i*4+2]=Math.round((ny/length*.5+.5)*255);
      data[i*4+3]=Math.round(Math.max(0,Math.min(1,.5+sample.height[i]/(heightRms*7)))*255);
    }
    return data;
  }
  const sortedEnvelope=Array.from(envelope).sort((a,b)=>a-b),sortedDiameter=cores.map(core=>core.quietRadius*2).sort((a,b)=>a-b);
  const quantiles=values=>[.1,.5,.9].map(fraction=>values[Math.floor(fraction*(values.length-1))]);
  const packetDiagnostics={
    frames,coreCount:cores.length,coreAreaFraction:coreArea/(length*length),sampledCoreFraction:insideCore.reduce((sum,value)=>sum+value,0)/count,
    requestedCalmFraction:calmCoverage,quietDiskAreaFraction:calmArea/(length*length),
    calmEnvelopeFraction:quietSamples/count,envelopeQuantiles:quantiles(sortedEnvelope),envelopeRms:Math.sqrt(envelopeEnergy/count),
    quietDiameterQuantiles:quantiles(sortedDiameter),heightGain,horizontalGain,heightRms,
    heightSlopeRms:Math.sqrt(actualSlopeEnergy/(count*frames)),surfaceSlopeRms:Math.sqrt(surfaceSlopeEnergy/(count*frames)),
    quietCoreSlopeRms:Math.sqrt(quietSlopeEnergy/quietCount),activeSlopeRms:Math.sqrt(activeSlopeEnergy/activeCount),
    minimumHorizontalStretch:minimumStretch,minimumJacobian,displacementScale,
  };
  return{field,encode,heightRms,size,length,period,displacementScale,packetDiagnostics,packetLayout:{envelope,weightA,weightB,cores}};
}

/**
 * Bake finer normals from exactly the existing physical Fourier modes.
 * No random spectrum is regenerated and no higher-frequency height modes are
 * introduced. Coarse Nyquist modes are split between their positive/negative
 * counterparts, preserving real, periodic interpolation at the original nodes.
 *
 * Work arrays are reused per frame. A first pass bounds the analytic horizontal
 * deformation at the requested resolution. Apply `horizontalScale` to the
 * source displacement too; encodeFrame already includes it in its Jacobian.
 */
export function makeHighResolutionNormals(spectrum,{size=512,frames=64,chop=1.3,minStretch=.30}={}) {
  const sourceSize=spectrum.size,sourceCount=sourceSize*sourceSize,count=size*size,length=spectrum.length,period=spectrum.period;
  if(!Number.isInteger(size)||size<sourceSize||(size&(size-1)))throw new RangeError('Normal resolution must be a power of two at least as large as the source.');
  if(!Number.isInteger(frames)||frames<1||!Number.isFinite(chop)||chop<0||!(minStretch>0&&minStretch<=1))throw new RangeError('Normal bake frames, chop or stretch are invalid.');
  const sourceFFT=makeFFT(sourceSize),normalFFT=makeFFT(size),real=new Float64Array(count),imaginary=new Float64Array(count);
  const dxx=new Float64Array(count),dxz=new Float64Array(count),dzx=new Float64Array(count),dzz=new Float64Array(count);
  const hx=new Float64Array(count),hz=new Float64Array(count),height=new Float64Array(count);
  const frequencyScale=2*Math.PI/length;
  function coefficients(values){
    const r=values.slice(),im=new Float64Array(sourceCount);sourceFFT(r,im);
    // The inverse's real coefficients are already normalized. Conjugate to
    // obtain normalized forward coefficients; destination FFT scaling follows.
    for(let i=0;i<sourceCount;i++)im[i]*=-1;
    return{real:r,imaginary:im};
  }
  function reconstruct(spectrum,axis,output){
    real.fill(0);imaginary.fill(0);
    const half=sourceSize/2;
    for(let z=0;z<sourceSize;z++)for(let x=0;x<sourceSize;x++){
      const source=z*sourceSize+x,splitX=x===half,splitZ=z===half;
      const weight=count*(splitX?.5:1)*(splitZ?.5:1);
      for(let zi=0;zi<(splitZ?2:1);zi++)for(let xi=0;xi<(splitX?2:1);xi++){
        const kx=splitX?(xi?half:-half):(x<half?x:x-sourceSize),kz=splitZ?(zi?half:-half):(z<half?z:z-sourceSize);
        const target=((kz+size)%size)*size+(kx+size)%size;
        if(axis===null){real[target]+=spectrum.real[source]*weight;imaginary[target]+=spectrum.imaginary[source]*weight;}
        else{
          const k=(axis===0?kx:kz)*frequencyScale*weight;
          real[target]-=spectrum.imaginary[source]*k;imaginary[target]+=spectrum.real[source]*k;
        }
      }
    }
    normalFFT(real,imaginary);output.set(real);
  }
  function horizontalDerivatives(sample){
    const x=coefficients(sample.displacementX),z=coefficients(sample.displacementZ);
    reconstruct(x,0,dxx);reconstruct(x,1,dxz);reconstruct(z,0,dzx);reconstruct(z,1,dzz);
  }
  let maxDeformationNorm=0;
  for(let frame=0;frame<frames;frame++){
    horizontalDerivatives(spectrum.field(frame*period/frames));
    for(let i=0;i<count;i++){
      const xx=dxx[i]*chop,xz=dxz[i]*chop,zx=dzx[i]*chop,zz=dzz[i]*chop;
      const trace=xx*xx+xz*xz+zx*zx+zz*zz,determinant=xx*zz-xz*zx;
      maxDeformationNorm=Math.max(maxDeformationNorm,Math.sqrt((trace+Math.sqrt(Math.max(0,trace*trace-4*determinant*determinant)))*.5));
    }
  }
  const horizontalScale=maxDeformationNorm>0?Math.min(1,(1-minStretch)/maxDeformationNorm):1;
  const measurements=new Map();
  function encodeFrame(frame,output=new Uint8Array(count*4)){
    if(!Number.isInteger(frame)||frame<0||frame>=frames||output.length!==count*4)throw new RangeError('Normal frame or output dimensions are invalid.');
    const sample=spectrum.field(frame*period/frames),h=coefficients(sample.height);
    horizontalDerivatives(sample);reconstruct(h,0,hx);reconstruct(h,1,hz);reconstruct(h,null,height);
    const effectiveChop=chop*horizontalScale;
    let minimumStretch=1,minimumJacobian=1,slopeEnergy=0,normalSlopeEnergy=0,heightEnergy=0;
    for(let i=0;i<count;i++){
      const xx=1-effectiveChop*dxx[i],xz=-effectiveChop*dxz[i],zx=-effectiveChop*dzx[i],zz=1-effectiveChop*dzz[i];
      const nx=hz[i]*zx-zz*hx[i],ny=xx*zz-xz*zx,nz=xz*hx[i]-hz[i]*xx,normalLength=Math.hypot(nx,ny,nz);
      const trace=xx*xx+xz*xz+zx*zx+zz*zz,stretch=Math.sqrt(Math.max(0,(trace-Math.sqrt(Math.max(0,trace*trace-4*ny*ny)))*.5));
      if(ny<=0||stretch<minStretch-1e-9)throw new Error('Analytic normal bake violated its non-folding bound.');
      minimumStretch=Math.min(minimumStretch,stretch);minimumJacobian=Math.min(minimumJacobian,ny);
      slopeEnergy+=hx[i]*hx[i]+hz[i]*hz[i];normalSlopeEnergy+=(nx*nx+nz*nz)/(ny*ny);heightEnergy+=height[i]*height[i];
      const j=i*4;
      output[j]=Math.round((nx/normalLength*.5+.5)*255);output[j+1]=Math.round((nz/normalLength*.5+.5)*255);output[j+2]=Math.round((ny/normalLength*.5+.5)*255);
      output[j+3]=Math.round(Math.max(0,Math.min(1,spectrum.heightRms?.5+height[i]/(spectrum.heightRms*7):.5))*255);
    }
    measurements.set(frame,{minimumStretch,minimumJacobian,slopeEnergy,normalSlopeEnergy,heightEnergy});
    return output;
  }
  function diagnostics(){
    let minimumStretch=1,minimumJacobian=1,slopeEnergy=0,normalSlopeEnergy=0,heightEnergy=0;
    for(const measurement of measurements.values()){
      minimumStretch=Math.min(minimumStretch,measurement.minimumStretch);minimumJacobian=Math.min(minimumJacobian,measurement.minimumJacobian);
      slopeEnergy+=measurement.slopeEnergy;normalSlopeEnergy+=measurement.normalSlopeEnergy;heightEnergy+=measurement.heightEnergy;
    }
    const measuredSamples=count*measurements.size;
    return{sourceSize,size,frames,measuredFrames:measurements.size,horizontalScale,maximumOriginalDeformationNorm:maxDeformationNorm,minimumHorizontalStretch:minimumStretch,minimumJacobian,
      heightRms:measuredSamples?Math.sqrt(heightEnergy/measuredSamples):0,heightSlopeRms:measuredSamples?Math.sqrt(slopeEnergy/measuredSamples):0,surfaceSlopeRms:measuredSamples?Math.sqrt(normalSlopeEnergy/measuredSamples):0};
  }
  return{size,frames,horizontalScale,encodeFrame,diagnostics};
}
