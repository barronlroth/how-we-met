import * as T from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {districtAt} from './course.js';
import {waterSkySamplingGLSL,skyReflectionOpacity} from './sky.js';
import {stormUniform} from './storm.js';
import {makeWaterGrid,WATER_GRID_STEP,WATER_GRID_INNER_EXTENT,WATER_GRID_MIDDLE_STEP,WATER_DISPLACEMENT_START,WATER_DISPLACEMENT_END} from './water-grid.js';
import {fixWaterReflectionFraming} from './planar-reflection.js';
import {prepareReliefField} from './relief-field.js';
import {decodeSubRows} from './wave-codec.js';

const AUTHORED_WAVE_SCALE=.28;

let waterNormals, waterArtLoading, spectralWaves, primaryWaves, primaryNormalSize=128, waveDisplacement, waveManifest, authoredDisplacement, authoredDisplacementScale, authoredTexelLength;

function normalArrayTexture(data,size,layers,name){
  const texture=new T.DataArrayTexture(data,size,size,layers);
  texture.name=name;texture.colorSpace=T.NoColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;
  texture.generateMipmaps=true;texture.anisotropy=8;texture.needsUpdate=true;return texture;
}

async function loadPrimaryNormals(){
  primaryWaves=spectralWaves;primaryNormalSize=waveManifest.size;
  const metadata=waveManifest.primaryNormals;
  // The original cache remains usable on browsers without stream decompression.
  if(!metadata||typeof DecompressionStream==='undefined')return;
  const {file,size,frames,compression,predictor,uncompressedBytes}=metadata;
  if(size!==512||frames!==64||compression!=='deflate'||(predictor!==undefined&&predictor!=='sub')||uncompressedBytes!==size*size*frames*4||!/^[a-z0-9-]+\.deflate$/.test(file))throw new Error('The detailed wind-wave metadata is invalid.');
  const response=await fetch(new URL(`./assets/textures/${file}`,import.meta.url));
  if(!response.ok||!response.body)throw new Error('The detailed wind-wave surface could not load.');
  const stream=response.body.pipeThrough(new DecompressionStream('deflate'));
  const data=new Uint8Array(await new Response(stream).arrayBuffer());
  if(data.length!==uncompressedBytes)throw new Error('The detailed wind-wave surface data is invalid.');
  if(predictor==='sub')decodeSubRows(data,size*4);
  primaryWaves=normalArrayTexture(data,size,frames,'Analytic primary wind-wave normals');primaryNormalSize=size;
}

async function loadWaveCache(){
  const [metadataResponse,dataResponse]=await Promise.all([fetch(new URL('./assets/textures/wind-waves-v1.json',import.meta.url)),fetch(new URL('./assets/textures/wind-waves-v1.bin',import.meta.url))]);
  if(!metadataResponse.ok||!dataResponse.ok)throw new Error('The wind-wave surface could not load.');
  waveManifest=await metadataResponse.json();const data=new Uint8Array(await dataResponse.arrayBuffer());
  const {version,size,frames,period,bands}=waveManifest;
  if(version!==1||size!==128||frames!==64||period!==4||bands.length!==2||data.length!==size*size*frames*bands.length*4)throw new Error('The wind-wave surface data is invalid.');
  spectralWaves=normalArrayTexture(data,size,frames*bands.length,'Wind-driven long waves and short ripples');
  const [displacementResponse]=await Promise.all([fetch(new URL('./assets/textures/wind-displacement-v1.bin',import.meta.url)),loadPrimaryNormals()]);
  if(!displacementResponse.ok)throw new Error('The wind-wave displacement could not load.');
  const displacementData=new Uint8Array(await displacementResponse.arrayBuffer());
  if(displacementData.length!==size*size*frames*4)throw new Error('The wind-wave displacement data is invalid.');
  waveDisplacement=new T.DataArrayTexture(displacementData,size,size,frames);
  waveDisplacement.name='Choppy near-water surface displacement';
  waveDisplacement.wrapS=waveDisplacement.wrapT=T.RepeatWrapping;
  waveDisplacement.colorSpace=T.NoColorSpace;
  waveDisplacement.minFilter=T.LinearMipmapLinearFilter;waveDisplacement.magFilter=T.LinearFilter;
  waveDisplacement.generateMipmaps=true;waveDisplacement.needsUpdate=true;
}


/** Original height art becomes linear, seamless, mipmapped normal/height data. */
export function loadWaterArt() {
  return waterArtLoading ??= Promise.all([loadWaveCache(),new T.ImageLoader()
    .loadAsync(new URL('./assets/textures/intracoastal-height-v2.png',import.meta.url).href)
    .then(image => {
      const size=256, canvas=document.createElement('canvas');
      canvas.width=canvas.height=size;
      const context=canvas.getContext('2d',{willReadFrequently:true});
      context.drawImage(image,0,0,size,size);
      const pixels=context.getImageData(0,0,size,size).data;
      const height=new Float32Array(size*size);
      for(let i=0;i<height.length;i++)height[i]=(pixels[i*4]*.2126+pixels[i*4+1]*.7152+pixels[i*4+2]*.0722)/255;
      // Remove boundary mismatch from the generated tile before differentiating.
      // This retains its interior wave shapes without a visible repeating seam.
      for(let y=0;y<size;y++){
        const start=y*size, difference=height[start+size-1]-height[start];
        for(let x=0;x<size;x++)height[start+x]-=difference*x/(size-1);
      }
      for(let x=0;x<size;x++){
        const difference=height[(size-1)*size+x]-height[x];
        for(let y=0;y<size;y++)height[y*size+x]-=difference*y/(size-1);
      }
      // Limit the source to coherent wavelets, then compress their crests.
      // The full deformation Jacobian supplies matching surface normals.
      const field=prepareReliefField(height,{size,uvScale:AUTHORED_WAVE_SCALE,slopeRms:.10,minStretch:.78});
      waterNormals=new T.DataTexture(field.normalHeightData,size,size);
      waterNormals.name='Intracoastal choppy normal and height field';
      authoredDisplacement=new T.DataTexture(field.displacementData,size,size);
      authoredDisplacement.name='Intracoastal crest compression and height';
      authoredDisplacementScale=new T.Vector3(...field.displacementScale);
      authoredTexelLength=1/(size*AUTHORED_WAVE_SCALE);
      for(const texture of [waterNormals,authoredDisplacement]){
        texture.colorSpace=T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
        texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;
        texture.generateMipmaps=true;texture.anisotropy=8;texture.needsUpdate=true;
      }
      return waterNormals;
    })]).then(()=>waterNormals);
}

const authoredWaveGLSL=`
uniform sampler2D normalSampler;
uniform float time;
vec2 authoredWaveUV(vec2 p){
  return vec2(-.358*p.x-.934*p.y,.934*p.x-.358*p.y)*${AUTHORED_WAVE_SCALE}+vec2(time*.011,-time*.007);
}`;

const displacementGLSL=`
${authoredWaveGLSL}
uniform highp sampler2DArray displacementSampler;
uniform float waveFrame;
uniform float displacementScale;
uniform float displacementLength;
uniform float displacementTexelLength;
uniform sampler2D authoredDisplacementSampler;
uniform vec3 authoredDisplacementScale;
uniform float authoredTexelLength;
uniform vec2 surfaceCenter;
vec3 surfaceOffset(vec2 p){
  // Mip-filter height to the local mesh footprint before vertex sampling.
  // Blend ahead of the coarser ring so grid spacing cannot alias wave crests.
  vec2 local=abs(p-surfaceCenter);
  float radius=max(local.x,local.y);
  float footprint=mix(${WATER_GRID_STEP},${WATER_GRID_MIDDLE_STEP},smoothstep(${(WATER_GRID_INNER_EXTENT-2).toFixed(2)},${WATER_GRID_INNER_EXTENT.toFixed(2)},radius));
  float spectralLod=max(0.0,log2(footprint/displacementTexelLength)+.5);
  float authoredLod=max(0.0,log2(footprint/authoredTexelLength)+.5);
  float frame=floor(waveFrame),blend=fract(waveFrame);
  vec2 displacementUV=p/displacementLength+vec2(.5*displacementTexelLength/displacementLength);
  vec3 a=textureLod(displacementSampler,vec3(displacementUV,frame),spectralLod).rgb;
  vec3 b=textureLod(displacementSampler,vec3(displacementUV,mod(frame+1.0,64.0)),spectralLod).rgb;
  vec3 baseOffset=mix(a,b,blend)-.5;
  vec3 offset=baseOffset*displacementScale;
  vec3 art=(textureLod(authoredDisplacementSampler,authoredWaveUV(p),authoredLod).rgb-.5)*authoredDisplacementScale;
  offset+=vec3(-.358*art.x+.934*art.z,art.y,-.934*art.x-.358*art.z);
  return offset*(1.0-smoothstep(${WATER_DISPLACEMENT_START.toFixed(1)},${WATER_DISPLACEMENT_END.toFixed(1)},length(p-surfaceCenter)));
}`;

const vertexShader=`
uniform mat4 textureMatrix;
varying vec4 mirrorCoord;
varying vec4 worldPosition;
varying vec2 waveParameter;
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
${displacementGLSL}
void main(){
  worldPosition=modelMatrix*vec4(position,1.0);
  waveParameter=worldPosition.xz;
  worldPosition.xyz+=surfaceOffset(waveParameter);
  mirrorCoord=textureMatrix*worldPosition;
  vec4 mvPosition=viewMatrix*worldPosition;
  gl_Position=projectionMatrix*mvPosition;
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <logdepthbuf_vertex>
  #include <fog_vertex>
  #include <shadowmap_vertex>
}`;

const fragmentShader = `
uniform sampler2D mirrorSampler;
${authoredWaveGLSL}
uniform highp sampler2DArray waveSampler;
uniform highp sampler2DArray primaryWaveSampler;
uniform float waveFrame;
uniform vec2 waveLengths;
uniform vec2 waveTexelOffsets;
uniform sampler2D skySampler;
uniform float skyRotation;
uniform float skyIntensity;
uniform vec3 sunColor;
uniform vec3 sunDirection;
uniform vec3 eye;
uniform vec3 waterColor;
varying vec4 mirrorCoord;
varying vec4 worldPosition;
varying vec2 waveParameter;
#include <common>
#include <packing>
#include <bsdfs>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
${waterSkySamplingGLSL}

vec2 rotateField(vec2 p,vec2 rotation) {
  return vec2(rotation.x*p.x-rotation.y*p.y,rotation.y*p.x+rotation.x*p.y);
}

vec4 rippleField(vec2 uv,vec2 rotation) {
  vec4 field=texture2D(normalSampler,uv);
  vec3 n=field.rgb*2.0-1.0;
  // A mip level averages unit normals. Its lost length carries unresolved
  // surface variance instead of making the distant surface a polished mirror.
  float variance=max(0.0,1.0-dot(n,n));
  vec2 slope=rotateField(n.xy/max(n.z,.45),vec2(rotation.x,-rotation.y));
  return vec4(slope,field.a,variance);
}

// Two offline Fourier wave bands, with continuous frame interpolation. This
// avoids a runtime FFT and keeps the normal surface periodic at the cache seam.
vec4 spectralField(highp sampler2DArray fieldSampler,vec2 uv,float baseLayer,float texelOffset){
  // Cached values lie on integer physical grid nodes, while texture samples
  // lie at texel centres. Align both resolutions with the displacement field.
  uv+=vec2(texelOffset);
  float frame=floor(waveFrame),blend=fract(waveFrame);
  vec4 a=texture(fieldSampler,vec3(uv,baseLayer+frame));
  vec4 b=texture(fieldSampler,vec3(uv,baseLayer+mod(frame+1.0,64.0)));
  vec4 field=mix(a,b,blend);vec3 na=a.rgb*2.0-1.0,nb=b.rgb*2.0-1.0,n=mix(na,nb,blend);
  // Only spatial mip filtering represents unresolved waves. Interpolating
  // two times must not broaden highlights halfway between cached frames.
  float variance=mix(max(0.0,1.0-dot(na,na)),max(0.0,1.0-dot(nb,nb)),blend);
  return vec4(n.xy/max(n.z,.3),field.a,variance);
}

vec4 waveSurface(vec2 p) {
  vec4 broad=spectralField(primaryWaveSampler,p/waveLengths.x,0.0,waveTexelOffsets.x);
  vec4 ripples=spectralField(waveSampler,p/waveLengths.y,64.0,waveTexelOffsets.y);
  vec2 rotation=vec2(-.358,.934);
  vec4 detail=rippleField(authoredWaveUV(p),rotation);
  vec2 slope=broad.xy+ripples.xy*.40+detail.xy;
  float height=broad.z*.55+detail.z*.45;
  float variance=clamp(broad.w+ripples.w*.16+detail.w,0.0,.35);
  return vec4(slope,height,variance);
}

vec3 roughSky(vec3 ray,float variance) {
  float visibleSky=smoothstep(-.12,.22,ray.y);
  ray=normalize(vec3(ray.x,max(.04,ray.y),ray.z));
  vec3 sky=sampleWaterSky(skySampler,ray,skyRotation,skyIntensity,variance*5.0);
  // A broad rough lobe integrates the sky and surrounding lagoon/shore light.
  // Keep white clouds warm while preventing a saturated blue strip at right.
  float blueExcess=max(0.0,sky.b-sky.g*1.18);
  sky+=vec3(.025,.10,-.70)*blueExcess;
  vec3 lagoon=waterColor*1.10+sunColor*.028;
  return mix(lagoon,sky,visibleSky);
}

vec4 planarReflection(vec2 uv) {
  uv=clamp(uv,vec2(.002),vec2(.998));
  return texture2D(mirrorSampler,uv);
}

float smithVisibility(float cosine,float roughnessSquared) {
  return 2.0*cosine/(cosine+sqrt(roughnessSquared+(1.0-roughnessSquared)*cosine*cosine));
}

void main() {
  #include <logdepthbuf_fragment>
  vec3 toEye=eye-worldPosition.xyz;
  float distanceToEye=length(toEye);
  vec3 viewDirection=normalize(toEye);
  vec4 waves=waveSurface(waveParameter);
  vec3 normal=normalize(vec3(waves.x,1.0,waves.y));
  float ndv=clamp(dot(normal,viewDirection),.055,1.0);
  float fresnel=.020+.980*pow(1.0-ndv,5.0);
  vec3 reflectedRay=reflect(-viewDirection,normal);

  vec2 projectedSlope=(mat3(viewMatrix)*(normal-vec3(0.0,1.0,0.0))).xy;
  vec2 reflectionUV=mirrorCoord.xy/mirrorCoord.w+projectedSlope*vec2(.32,.55)*(.018+.70/max(14.0,distanceToEye));
  vec4 planarSample=planarReflection(reflectionUV);
  vec3 planar=planarSample.rgb;
  float blueExcess=max(0.0,planar.b-planar.g*1.18);
  planar+=vec3(.025,.10,-.70)*blueExcess;
  float distanceRoughness=smoothstep(38.0,170.0,distanceToEye);
  // Preserve recognizable nearby hulls and docks, then replace two thirds of
  // the distant coherent mirror with rough reflected sky and lagoon light.
  float coherentReflection=mix(.85,.35,distanceRoughness);
  coherentReflection*=1.0-waves.w*.9;
  // Opaque shoreline geometry retains the planar projection. Sky pixels use
  // the full reflected ray so wave shoulders can catch separate cloud edges.
  // Transparent black sky makes filtered edge texels premultiplied coverage.
  // Apply coverage once, including partially covered shore silhouettes.
  vec3 reflection=roughSky(reflectedRay,waves.w)*(1.0-coherentReflection*clamp(planarSample.a,0.0,1.0))+planar*coherentReflection;

  float shadow=getShadowMask();
  float ndl=max(dot(normal,sunDirection),0.0);
  // Keep the teal body while separating the turning wave faces. Reflected
  // sky and sun supply the pale crests instead of a separate foam overlay.
  vec3 body=waterColor*.64*(.86+.20*ndl)*(.92+.16*waves.z);
  body*=.70+.45*ndv;
  body*=mix(1.0,clamp(1.0+waves.y*1.65-waves.x*.50,.52,1.55),.30);
  body*=mix(.56,1.0,shadow)*mix(1.0,.72,stormStrength);

  // GGX sun reflection with pixel/mipmap variance: interrupted warm highlights
  // retain their energy as finer ripples become unresolved, without glitter.
  vec3 halfDirection=normalize(sunDirection+viewDirection);
  float ndh=max(dot(normal,halfDirection),0.0);
  float vdh=max(dot(viewDirection,halfDirection),0.0);
  vec3 normalDx=dFdx(normal),normalDy=dFdy(normal);
  float pixelVariance=dot(normalDx,normalDx)+dot(normalDy,normalDy);
  float roughnessSquared=.00010+min(.006,pixelVariance*.020+waves.w*.040);
  float denominator=ndh*ndh*(roughnessSquared-1.0)+1.0;
  float distribution=roughnessSquared/(3.14159265*denominator*denominator);
  float geometry=smithVisibility(ndv,roughnessSquared)*smithVisibility(max(ndl,.001),roughnessSquared);
  float sunFresnel=.020+.98*pow(1.0-vdh,5.0);
  vec3 sunReflection=sunColor*(distribution*geometry*sunFresnel/(4.0*ndv))*3.3*shadow*mix(1.0,.18,stormStrength);
  vec3 outgoingLight=mix(body,reflection,fresnel)+sunReflection;
  gl_FragColor=vec4(outgoingLight,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function makeDreamWater(scene,sunDirection) {
  if(!waterNormals)throw new Error('Water art must be loaded before making the water.');
  const water=new Water(makeWaterGrid(),{
    textureWidth:1024,textureHeight:768,waterNormals,sunDirection,sunColor:0xffe8c4,
    waterColor:0x127378,fog:true,
  });
  water.material.fragmentShader=fragmentShader;
  water.material.vertexShader=vertexShader;
  water.material.uniforms.waveSampler={value:spectralWaves};
  water.material.uniforms.primaryWaveSampler={value:primaryWaves};
  water.material.uniforms.waveFrame={value:0};
  const surfaceUniforms={
    waveFrame:water.material.uniforms.waveFrame,
    normalSampler:{value:waterNormals},
    time:water.material.uniforms.time,
    authoredDisplacementSampler:{value:authoredDisplacement},
    authoredDisplacementScale:{value:authoredDisplacementScale},
    authoredTexelLength:{value:authoredTexelLength},
    displacementSampler:{value:waveDisplacement},
    displacementScale:{value:waveManifest.displacement.scale},
    displacementLength:{value:waveManifest.bands[0].length},
    displacementTexelLength:{value:waveManifest.bands[0].length/waveManifest.size},
    surfaceCenter:{value:new T.Vector2()},
  };
  Object.assign(water.material.uniforms,surfaceUniforms);
  water.material.uniforms.waveLengths={value:new T.Vector2(...waveManifest.bands.map(b=>b.length))};
  water.material.uniforms.waveTexelOffsets={value:new T.Vector2(.5/primaryNormalSize,.5/waveManifest.size)};
  water.material.uniforms.skySampler={value:scene.background};
  water.material.uniforms.skyRotation={value:-scene.backgroundRotation.y};
  water.material.uniforms.skyIntensity={value:scene.backgroundIntensity};
  water.material.uniforms.stormStrength=stormUniform;
  fixWaterReflectionFraming(water,skyReflectionOpacity);
  water.rotation.x=-Math.PI/2;water.position.y=.025;scene.add(water);
  const colors={downtown:new T.Color(0x166d74),marina:new T.Color(0x117c82),mangrove:new T.Color(0x2c6e59),cove:new T.Color(0x118e91),bridge:new T.Color(0x14797d)};
  return{mesh:water,primaryNormalSize,bindFoam(material){
    const compile=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
      compile(shader);Object.assign(shader.uniforms,surfaceUniforms);
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+displacementGLSL).replace('#include <project_vertex>',`
        vec4 foamLocal=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          foamLocal=instanceMatrix*foamLocal;
        #endif
        vec4 foamWorld=modelMatrix*foamLocal;
        // Invert horizontal chop so contact foam follows the same surface.
        vec2 parameter=foamWorld.xz;
        parameter=foamWorld.xz-surfaceOffset(parameter).xz;
        parameter=foamWorld.xz-surfaceOffset(parameter).xz;
        parameter=foamWorld.xz-surfaceOffset(parameter).xz;
        foamWorld.y=.065+surfaceOffset(parameter).y;
        vec4 mvPosition=viewMatrix*foamWorld;
        gl_Position=projectionMatrix*mvPosition;
      `);
    };
    material.customProgramCacheKey=()=> 'surface-fitted-foam-v1';
  },update(s,t,camera){
    water.position.x=Math.round(camera.position.x/WATER_GRID_STEP)*WATER_GRID_STEP;
    water.position.z=Math.round(camera.position.z/WATER_GRID_STEP)*WATER_GRID_STEP;
    surfaceUniforms.surfaceCenter.value.set(water.position.x,water.position.z);
    water.material.uniforms.time.value=t;
    water.material.uniforms.waveFrame.value=(t%waveManifest.period)/waveManifest.period*waveManifest.frames;
    water.material.uniforms.waterColor.value.lerp(colors[districtAt(s).id],.025);
  }};
}
