import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {makeOceanSpectrum,makeHighResolutionNormals} from './lib/ocean-spectrum.mjs';
import {encodeSubRows} from '../florida/wave-codec.js';
const output=new URL('../florida/assets/textures/',import.meta.url),diagnosticOutput=new URL('../.dream-loop/',import.meta.url);
async function packagePrimaryNormals(raw,metadata){
  const decodedSha256=createHash('sha256').update(raw).digest('hex');
  encodeSubRows(raw,metadata.size*4);
  const compressed=deflateSync(raw,{level:6}),file='wind-primary-normals-v2.deflate';
  await writeFile(new URL(file,output),compressed);
  return{...metadata,file,compression:'deflate',predictor:'sub',uncompressedBytes:raw.byteLength,compressedBytes:compressed.byteLength,sha256:createHash('sha256').update(compressed).digest('hex'),uncompressedSha256:createHash('sha256').update(raw).digest('hex'),decodedSha256};
}
if(process.argv.includes('--package-only')){
  const manifestUrl=new URL('wind-waves-v1.json',output),manifest=JSON.parse(await readFile(manifestUrl,'utf8'));
  const raw=await readFile(new URL('wind-primary-normals-v2.rgba',diagnosticOutput));
  if(raw.length!==manifest.primaryNormals.size**2*manifest.primaryNormals.frames*4)throw new Error('Saved primary normal dimensions do not match the manifest.');
  const expected=manifest.primaryNormals.decodedSha256??manifest.primaryNormals.uncompressedSha256;
  if(createHash('sha256').update(raw).digest('hex')!==expected)throw new Error('Saved primary normals do not match the current decoded checksum.');
  manifest.primaryNormals=await packagePrimaryNormals(raw,manifest.primaryNormals);
  await writeFile(manifestUrl,JSON.stringify(manifest,null,2)+'\n');console.log(manifest.primaryNormals);process.exit(0);
}
const size=128,frames=64,period=4;
const bands=[{length:22,windSpeed:1.35,wind:[.42,.91],slopeRms:.27,chop:1.3,seed:9137,packets:{seed:26148,frames,calmCoverage:.40,minDiameter:.60,maxDiameter:1.80,transition:.30,crossingAngle:30,secondaryWindScale:.78,minStretch:.30}},{length:9.7,windSpeed:.85,wind:[-.89,.46],slopeRms:.22,chop:1.0,seed:42019}];
console.log('Checking analytic primary normals at512px without changing physical height modes.');
const primarySource=makeOceanSpectrum({size,period,...bands[0]});
const primaryBake=makeHighResolutionNormals(primarySource,{size:512,frames,chop:bands[0].chop,minStretch:bands[0].packets.minStretch});
bands[0].packets.horizontalScale=primaryBake.horizontalScale;
const data=new Uint8Array(size*size*4*frames*bands.length),displacement=new Uint8Array(size*size*4*frames);let offset=0,displacementScale=0;
for(const [bandIndex,configuration] of bands.entries()){const spectrum=makeOceanSpectrum({size,period,...configuration});configuration.heightRms=spectrum.heightRms;
 if(spectrum.packetDiagnostics)configuration.packetDiagnostics=spectrum.packetDiagnostics;
 for(let frame=0;frame<frames;frame++){
  const time=frame*period/frames;data.set(spectrum.encode(time),offset);offset+=size*size*4;
  if(bandIndex===0){const field=spectrum.field(time),base=frame*size*size*4,scale=spectrum.displacementScale??spectrum.heightRms*12;displacementScale=scale;
   for(let i=0;i<size*size;i++){const j=base+i*4;
    for(const [component,value] of [[0,-configuration.chop*field.displacementX[i]],[1,field.height[i]],[2,-configuration.chop*field.displacementZ[i]]])displacement[j+component]=Math.round(Math.max(0,Math.min(1,.5+value/scale))*255);
    displacement[j+3]=255;
   }
  }
 }
}
await mkdir(output,{recursive:true});
const primaryFrameBytes=primaryBake.size*primaryBake.size*4,primaryData=new Uint8Array(primaryFrameBytes*frames);
for(let frame=0;frame<frames;frame++){
  primaryBake.encodeFrame(frame,primaryData.subarray(frame*primaryFrameBytes,(frame+1)*primaryFrameBytes));
  if((frame+1)%16===0)console.log(`Baked primary normal frames ${frame+1}/${frames}.`);
}
await writeFile(new URL('wind-waves-v1.bin',output),data);
await writeFile(new URL('wind-displacement-v1.bin',output),displacement);
await mkdir(diagnosticOutput,{recursive:true});
await writeFile(new URL('wind-primary-normals-v2.rgba',diagnosticOutput),primaryData);
const primaryNormals=await packagePrimaryNormals(primaryData,{size:primaryBake.size,frames,diagnostics:primaryBake.diagnostics()});
const manifest={version:1,size,frames,period,format:'RGBA8: world normal X/Z/up and normalized height',bands,bytes:data.byteLength,sha256:createHash('sha256').update(data).digest('hex'),displacement:{file:'wind-displacement-v1.bin',format:'RGBA8: signed world X/Y/Z offset and unused alpha',scale:displacementScale,bytes:displacement.byteLength,sha256:createHash('sha256').update(displacement).digest('hex')},primaryNormals,source:'Original implementation of Tessendorf, Simulating Ocean Water (2001), equations 23–26 and choppy displacement; principal band uses smooth periodic crossing-wave packets with full deformation derivatives. High-resolution primary normals analytically differentiate the existing physical Fourier modes.'};
await writeFile(new URL('wind-waves-v1.json',output),JSON.stringify(manifest,null,2)+'\n');console.log(manifest);
