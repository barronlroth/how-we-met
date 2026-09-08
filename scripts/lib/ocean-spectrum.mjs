// Original implementation of Tessendorf's Fourier height-field formulation.
// Equations 23–26 and the choppy displacement in Simulating Ocean Water (2001):
// https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2002.pdf
// This authoring code runs offline. The browser only samples its periodic cache.
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

export function makeOceanSpectrum({size=128,length=64,windSpeed=1.8,wind=[.42,.91],slopeRms=.21,chop=.9,period=4,seed=9137}) {
  const count=size*size,fft=makeFFT(size),gaussian=gaussianSource(seed),h0r=new Float64Array(count),h0i=new Float64Array(count);
  const frequencies=new Float64Array(count),kx=new Float64Array(count),kz=new Float64Array(count),inverseK=new Float64Array(count),opposite=new Uint32Array(count);
  const windLength=Math.hypot(...wind),windX=wind[0]/windLength,windZ=wind[1]/windLength,L=windSpeed*windSpeed/9.81,smallWave=length/size*.42;
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const i=z*size+x,ax=(x<=size/2?x:x-size)*2*Math.PI/length,az=(z<=size/2?z:z-size)*2*Math.PI/length,k=Math.hypot(ax,az);
    kx[i]=ax;kz[i]=az;opposite[i]=((size-z)%size)*size+(size-x)%size;
    if(k===0)continue;
    inverseK[i]=1/k;
    const alignment=(ax*windX+az*windZ)/k;
    const spectrum=Math.exp(-1/(k*L)**2)/(k**4)*(.18+.82*alignment*alignment)*Math.exp(-k*k*smallWave*smallWave);
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
