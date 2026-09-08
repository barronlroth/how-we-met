import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeOceanSpectrum} from './lib/ocean-spectrum.mjs';
const size=128,frames=64,period=4;
const bands=[{length:22,windSpeed:1.35,wind:[.42,.91],slopeRms:.27,chop:1.3,seed:9137},{length:9.7,windSpeed:.85,wind:[-.89,.46],slopeRms:.22,chop:1.0,seed:42019}];
const data=new Uint8Array(size*size*4*frames*bands.length),displacement=new Uint8Array(size*size*4*frames);let offset=0;
for(const [bandIndex,configuration] of bands.entries()){const spectrum=makeOceanSpectrum({size,period,...configuration});configuration.heightRms=spectrum.heightRms;
 for(let frame=0;frame<frames;frame++){
  const time=frame*period/frames;data.set(spectrum.encode(time),offset);offset+=size*size*4;
  if(bandIndex===0){const field=spectrum.field(time),base=frame*size*size*4,scale=spectrum.heightRms*12;
   for(let i=0;i<size*size;i++){const j=base+i*4;
    for(const [component,value] of [[0,-configuration.chop*field.displacementX[i]],[1,field.height[i]],[2,-configuration.chop*field.displacementZ[i]]])displacement[j+component]=Math.round(Math.max(0,Math.min(1,.5+value/scale))*255);
    displacement[j+3]=255;
   }
  }
 }
}
const output=new URL('../florida/assets/textures/',import.meta.url);await mkdir(output,{recursive:true});
await writeFile(new URL('wind-waves-v1.bin',output),data);
await writeFile(new URL('wind-displacement-v1.bin',output),displacement);
const manifest={version:1,size,frames,period,format:'RGBA8: world normal X/Z/up and normalized height',bands,bytes:data.byteLength,sha256:createHash('sha256').update(data).digest('hex'),displacement:{file:'wind-displacement-v1.bin',format:'RGBA8: signed world X/Y/Z offset and unused alpha',scale:bands[0].heightRms*12,bytes:displacement.byteLength,sha256:createHash('sha256').update(displacement).digest('hex')},source:'Original implementation of Tessendorf, Simulating Ocean Water (2001), equations 23–26 and choppy displacement.'};
await writeFile(new URL('wind-waves-v1.json',output),JSON.stringify(manifest,null,2)+'\n');console.log(manifest);
