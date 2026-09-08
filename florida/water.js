import * as T from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {districtAt} from './course.js';
import {skySamplingGLSL} from './sky.js';
import {makeWaterGrid,WATER_GRID_STEP} from './water-grid.js';
import {fixWaterReflectionFraming} from './planar-reflection.js';

let waterNormals, waterArtLoading, spectralWaves, waveDisplacement, waveManifest;

async function loadWaveCache(){
  const [metadataResponse,dataResponse]=await Promise.all([fetch(new URL('./assets/textures/wind-waves-v1.json',import.meta.url)),fetch(new URL('./assets/textures/wind-waves-v1.bin',import.meta.url))]);
  if(!metadataResponse.ok||!dataResponse.ok)throw new Error('The wind-wave surface could not load.');
  waveManifest=await metadataResponse.json();const data=new Uint8Array(await dataResponse.arrayBuffer());
  const {version,size,frames,period,bands}=waveManifest;
  if(version!==1||size!==128||frames!==64||period!==4||bands.length!==2||data.length!==size*size*frames*bands.length*4)throw new Error('The wind-wave surface data is invalid.');
  spectralWaves=new T.DataArrayTexture(data,size,size,frames*bands.length);
  spectralWaves.name='Wind-driven long waves and short ripples';spectralWaves.colorSpace=T.NoColorSpace;
  spectralWaves.wrapS=spectralWaves.wrapT=T.RepeatWrapping;spectralWaves.minFilter=T.LinearMipmapLinearFilter;spectralWaves.magFilter=T.LinearFilter;
  spectralWaves.generateMipmaps=true;spectralWaves.anisotropy=8;spectralWaves.needsUpdate=true;
  const displacementResponse=await fetch(new URL('./assets/textures/wind-displacement-v1.bin',import.meta.url));
  if(!displacementResponse.ok)throw new Error('The wind-wave displacement could not load.');
  const displacementData=new Uint8Array(await displacementResponse.arrayBuffer());
  if(displacementData.length!==size*size*frames*4)throw new Error('The wind-wave displacement data is invalid.');
  waveDisplacement=new T.DataArrayTexture(displacementData,size,size,frames);
  waveDisplacement.name='Choppy near-water surface displacement';
  waveDisplacement.wrapS=waveDisplacement.wrapT=T.RepeatWrapping;
  waveDisplacement.minFilter=waveDisplacement.magFilter=T.LinearFilter;waveDisplacement.needsUpdate=true;
}


/** Original height art becomes linear, seamless, mipmapped normal/height data. */
export function loadWaterArt() {
  return waterArtLoading ??= new T.ImageLoader()
    .loadAsync(new URL('./assets/textures/intracoastal-height-v1.png',import.meta.url).href)
    .then(image => {
      const size=512, canvas=document.createElement('canvas');
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
      const scratch=new Float32Array(height.length),weights=[1,4,6,4,1];
      // A separable periodic low-pass removes source grain; all visible fine
      // detail then comes from coherent wave relief rather than pixel noise.
      for(let blurPass=0;blurPass<1;blurPass++){
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        let value=0;for(let k=-2;k<=2;k++)value+=height[y*size+(x+k+size)%size]*weights[k+2];
        scratch[y*size+x]=value/16;
      }
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        let value=0;for(let k=-2;k<=2;k++)value+=scratch[((y+k+size)%size)*size+x]*weights[k+2];
        height[y*size+x]=value/16;
      }
      }
      const slopeX=new Float32Array(height.length),slopeY=new Float32Array(height.length);
      let sum=0,sumSquared=0,slopeSquared=0;
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const i=y*size+x,h=height[i];
        slopeX[i]=(height[y*size+(x+1)%size]-height[y*size+(x-1+size)%size])*.5;
        slopeY[i]=(height[((y+1)%size)*size+x]-height[((y-1+size)%size)*size+x])*.5;
        sum+=h;sumSquared+=h*h;slopeSquared+=slopeX[i]**2+slopeY[i]**2;
      }
      const mean=sum/height.length,deviation=Math.sqrt(Math.max(1e-8,sumSquared/height.length-mean*mean));
      const gain=.30/Math.sqrt(Math.max(1e-10,slopeSquared/height.length));
      const data=new Uint8Array(height.length*4);
      for(let i=0;i<height.length;i++){
        let x=-slopeX[i]*gain,y=-slopeY[i]*gain;
        const limit=Math.min(1,.85/Math.max(1e-6,Math.hypot(x,y)));x*=limit;y*=limit;
        const length=Math.hypot(x,y,1),k=i*4;
        data[k]=Math.round((x/length*.5+.5)*255);
        data[k+1]=Math.round((y/length*.5+.5)*255);
        data[k+2]=Math.round((1/length*.5+.5)*255);
        data[k+3]=Math.round(T.MathUtils.clamp(.5+(height[i]-mean)/(deviation*5),.06,.94)*255);
      }
      waterNormals=new T.DataTexture(data,size,size);
      waterNormals.name='Intracoastal normal and height field';
      waterNormals.colorSpace=T.NoColorSpace;
      waterNormals.wrapS=waterNormals.wrapT=T.RepeatWrapping;
      waterNormals.minFilter=T.LinearMipmapLinearFilter;
      waterNormals.magFilter=T.LinearFilter;
      waterNormals.generateMipmaps=true;waterNormals.anisotropy=8;waterNormals.needsUpdate=true;
      return loadWaveCache().then(()=>waterNormals);
    });
}

const displacementGLSL=`
uniform highp sampler2DArray displacementSampler;
uniform float waveFrame;
uniform float displacementScale;
uniform float displacementLength;
uniform vec2 surfaceCenter;
vec3 surfaceOffset(vec2 p){
  float frame=floor(waveFrame),blend=fract(waveFrame);
  vec3 a=textureLod(displacementSampler,vec3(p/displacementLength,frame),0.0).rgb;
  vec3 b=textureLod(displacementSampler,vec3(p/displacementLength,mod(frame+1.0,64.0)),0.0).rgb;
  return (mix(a,b,blend)-.5)*displacementScale*(1.0-smoothstep(24.0,32.0,length(p-surfaceCenter)));
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
uniform sampler2D normalSampler;
uniform highp sampler2DArray waveSampler;
uniform float waveFrame;
uniform vec2 waveLengths;
uniform sampler2D skySampler;
uniform float skyRotation;
uniform float skyIntensity;
uniform float time;
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
${skySamplingGLSL}

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
vec4 spectralField(vec2 uv,float baseLayer){
  float frame=floor(waveFrame),blend=fract(waveFrame);
  vec4 a=texture(waveSampler,vec3(uv,baseLayer+frame));
  vec4 b=texture(waveSampler,vec3(uv,baseLayer+mod(frame+1.0,64.0)));
  vec4 field=mix(a,b,blend);vec3 na=a.rgb*2.0-1.0,nb=b.rgb*2.0-1.0,n=mix(na,nb,blend);
  // Only spatial mip filtering represents unresolved waves. Interpolating
  // two times must not broaden highlights halfway between cached frames.
  float variance=mix(max(0.0,1.0-dot(na,na)),max(0.0,1.0-dot(nb,nb)),blend);
  return vec4(n.xy/max(n.z,.3),field.a,variance);
}

vec4 waveSurface(vec2 p) {
  vec4 broad=spectralField(p/waveLengths.x,0.0);
  vec4 ripples=spectralField(p/waveLengths.y,64.0);
  vec2 rotation=vec2(-.358,.934);
  vec4 detail=rippleField(rotateField(p*.15,rotation)+vec2(time*.021,-time*.015),rotation);
  vec2 slope=broad.xy+ripples.xy*1.25+detail.xy*.18;
  float height=broad.z*.85+ripples.z*.15;
  float variance=clamp(broad.w*.55+ripples.w*.35+detail.w*.02,0.0,.35);
  return vec4(slope,height,variance);
}

vec3 roughSky(vec3 ray,float variance) {
  float visibleSky=smoothstep(-.12,.22,ray.y);
  ray=normalize(vec3(ray.x,max(.04,ray.y),ray.z));
  vec3 sky=sampleFloridaSky(skySampler,ray,skyRotation,skyIntensity,2.4+variance*5.0);
  // A broad rough lobe integrates the sky and surrounding lagoon/shore light.
  // Keep white clouds warm while preventing a saturated blue strip at right.
  float blueExcess=max(0.0,sky.b-sky.g*1.18);
  sky+=vec3(.025,.10,-.70)*blueExcess;
  vec3 lagoon=waterColor*1.10+sunColor*.028;
  return mix(lagoon,mix(sky,lagoon,.27),visibleSky);
}

vec3 planarReflection(vec2 uv) {
  uv=clamp(uv,vec2(.002),vec2(.998));
  return texture2D(mirrorSampler,uv).rgb;
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
  float fresnel=.12+.88*pow(1.0-ndv,2.4);
  vec3 reflectedRay=reflect(-viewDirection,normal);

  vec2 projectedSlope=(mat3(viewMatrix)*(normal-vec3(0.0,1.0,0.0))).xy;
  vec2 reflectionUV=mirrorCoord.xy/mirrorCoord.w+projectedSlope*vec2(.32,.55)*(.008+.35/max(14.0,distanceToEye));
  vec3 planar=planarReflection(reflectionUV);
  float blueExcess=max(0.0,planar.b-planar.g*1.18);
  planar+=vec3(.025,.10,-.70)*blueExcess;
  float distanceRoughness=smoothstep(38.0,170.0,distanceToEye);
  // Preserve recognizable nearby hulls and docks, then replace two thirds of
  // the distant coherent mirror with rough reflected sky and lagoon light.
  float coherentReflection=mix(.94,.35,distanceRoughness);
  coherentReflection*=1.0-waves.w*.9;
  vec3 reflection=mix(roughSky(reflectedRay,waves.w),planar,coherentReflection);

  float shadow=getShadowMask();
  float ndl=max(dot(normal,sunDirection),0.0);
  // Water slopes change reflected light; they should not paint bright and dark
  // stripes into the transmitted body color independently of the reflection.
  vec3 body=waterColor*.64*(.86+.20*ndl)*(.92+.16*waves.z);
  body*=clamp(1.0+waves.y*.60-waves.x*.18,.68,1.30);
  body*=mix(.56,1.0,shadow);

  // GGX sun reflection with pixel/mipmap variance: interrupted warm highlights
  // retain their energy as finer ripples become unresolved, without glitter.
  vec3 halfDirection=normalize(sunDirection+viewDirection);
  float ndh=max(dot(normal,halfDirection),0.0);
  float vdh=max(dot(viewDirection,halfDirection),0.0);
  vec3 normalDx=dFdx(normal),normalDy=dFdy(normal);
  float pixelVariance=dot(normalDx,normalDx)+dot(normalDy,normalDy);
  float roughnessSquared=.00015+min(.003,pixelVariance*.012+waves.w*.035);
  float denominator=ndh*ndh*(roughnessSquared-1.0)+1.0;
  float distribution=roughnessSquared/(3.14159265*denominator*denominator);
  float geometry=smithVisibility(ndv,roughnessSquared)*smithVisibility(max(ndl,.001),roughnessSquared);
  float sunFresnel=.020+.98*pow(1.0-vdh,5.0);
  vec3 sunReflection=sunColor*(distribution*geometry*sunFresnel/(4.0*ndv))*22.0*shadow;
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
  water.material.uniforms.waveFrame={value:0};
  const surfaceUniforms={
    waveFrame:water.material.uniforms.waveFrame,
    displacementSampler:{value:waveDisplacement},
    displacementScale:{value:waveManifest.displacement.scale},
    displacementLength:{value:waveManifest.bands[0].length},
    surfaceCenter:{value:new T.Vector2()},
  };
  Object.assign(water.material.uniforms,surfaceUniforms);
  water.material.uniforms.waveLengths={value:new T.Vector2(...waveManifest.bands.map(b=>b.length))};
  water.material.uniforms.skySampler={value:scene.background};
  water.material.uniforms.skyRotation={value:-scene.backgroundRotation.y};
  water.material.uniforms.skyIntensity={value:scene.backgroundIntensity};
  fixWaterReflectionFraming(water);
  water.rotation.x=-Math.PI/2;water.position.y=.025;scene.add(water);
  const colors={downtown:new T.Color(0x166d74),marina:new T.Color(0x117c82),mangrove:new T.Color(0x2c6e59),cove:new T.Color(0x118e91),bridge:new T.Color(0x14797d)};
  return{mesh:water,bindFoam(material){
    const compile=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
      compile(shader);Object.assign(shader.uniforms,surfaceUniforms);
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+displacementGLSL).replace('#include <project_vertex>',`
        vec4 foamLocal=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          foamLocal=instanceMatrix*foamLocal;
        #endif
        vec4 foamWorld=modelMatrix*foamLocal;
        // Invert the horizontal chop twice so the foam sits on this exact wave.
        vec2 parameter=foamWorld.xz;
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
