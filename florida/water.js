import * as T from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {districtAt} from './course.js';

let waterNormals, waterArtLoading;

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
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        let value=0;for(let k=-2;k<=2;k++)value+=height[y*size+(x+k+size)%size]*weights[k+2];
        scratch[y*size+x]=value/16;
      }
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        let value=0;for(let k=-2;k<=2;k++)value+=scratch[((y+k+size)%size)*size+x]*weights[k+2];
        height[y*size+x]=value/16;
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
      return waterNormals;
    });
}

const fragmentShader = `
uniform sampler2D mirrorSampler;
uniform sampler2D normalSampler;
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
#include <common>
#include <packing>
#include <bsdfs>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

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

vec4 waveSurface(vec2 p) {
  vec2 rotationA=vec2(.940,.342),rotationB=vec2(.559,-.829),rotationC=vec2(-.358,.934);
  vec4 broad=rippleField(rotateField(p*.020,rotationA)+vec2(time*.0012,time*.0008),rotationA);
  vec4 middle=rippleField(rotateField(p*.065,rotationB)+vec2(-time*.010,time*.007)+broad.xy*.045,rotationB);
  vec4 fine=rippleField(rotateField(p*.180,rotationC)+vec2(time*.021,-time*.015)+middle.xy*.018,rotationC);
  vec2 slope=broad.xy*.38+middle.xy*.88+fine.xy*.28;
  // Weak, long swell changes the local wave inclination without creating
  // another visible set of stripes. The texture field carries the detail.
  slope+=vec2(.018*cos(dot(p,vec2(.19,.08))-time*.43),.016*sin(dot(p,vec2(-.11,.16))-time*.36));
  float height=broad.z*.32+middle.z*.68;
  float variance=clamp(broad.w*.14+middle.w*.77+fine.w*.08,0.0,.35);
  return vec4(slope,height,variance);
}

vec3 roughSky(vec3 ray,float variance) {
  float visibleSky=smoothstep(-.12,.22,ray.y);
  ray=normalize(vec3(ray.x,max(.04,ray.y),ray.z));
  float c=cos(skyRotation),s=sin(skyRotation);
  ray=vec3(c*ray.x+s*ray.z,ray.y,-s*ray.x+c*ray.z);
  vec2 uv=vec2(atan(ray.z,ray.x)*.159154943+.5,asin(clamp(ray.y,-1.0,1.0))*.318309886+.5);
  vec3 sky=texture2D(skySampler,uv,2.4+variance*5.0).rgb*skyIntensity;
  // A broad rough lobe integrates the sky and surrounding lagoon/shore light.
  // Keep white clouds warm while preventing a saturated blue strip at right.
  float blueExcess=max(0.0,sky.b-sky.g*1.18);
  sky+=vec3(.025,.10,-.70)*blueExcess;
  vec3 lagoon=waterColor*1.10+sunColor*.028;
  return mix(lagoon,mix(sky,lagoon,.27),visibleSky);
}

vec3 planarReflection(vec2 uv) {
  float radius=.00025+min(max(length(dFdx(uv)),length(dFdy(uv)))*.035,.00055);
  uv=clamp(uv,vec2(.002),vec2(.998));
  return texture2D(mirrorSampler,uv).rgb*.70
    +texture2D(mirrorSampler,uv+vec2(radius*.6,radius)).rgb*.15
    +texture2D(mirrorSampler,uv-vec2(radius*.6,radius)).rgb*.15;
}

float smithVisibility(float cosine,float roughnessSquared) {
  return 2.0*cosine/(cosine+sqrt(roughnessSquared+(1.0-roughnessSquared)*cosine*cosine));
}

void main() {
  #include <logdepthbuf_fragment>
  vec3 toEye=eye-worldPosition.xyz;
  float distanceToEye=length(toEye);
  vec3 viewDirection=normalize(toEye);
  vec4 waves=waveSurface(worldPosition.xz);
  vec3 normal=normalize(vec3(waves.x,1.0,waves.y));
  float ndv=clamp(dot(normal,viewDirection),.055,1.0);
  float fresnel=.020+.98*pow(1.0-ndv,5.0);
  vec3 reflectedRay=reflect(-viewDirection,normal);

  vec2 projectedSlope=(mat3(viewMatrix)*(normal-vec3(0.0,1.0,0.0))).xy;
  vec2 reflectionUV=mirrorCoord.xy/mirrorCoord.w;
  reflectionUV+=projectedSlope*vec2(.85,1.0)*(.022+1.25/max(14.0,distanceToEye));
  vec3 planar=planarReflection(reflectionUV);
  float blueExcess=max(0.0,planar.b-planar.g*1.18);
  planar+=vec3(.025,.10,-.70)*blueExcess;
  float distanceRoughness=smoothstep(38.0,170.0,distanceToEye);
  // Preserve recognizable nearby hulls and docks, then replace two thirds of
  // the distant coherent mirror with rough reflected sky and lagoon light.
  float coherentReflection=mix(.86,.27,distanceRoughness);
  coherentReflection*=1.0-waves.w*.9;
  vec3 reflection=mix(roughSky(reflectedRay,waves.w),planar,coherentReflection);

  float shadow=getShadowMask();
  float ndl=max(dot(normal,sunDirection),0.0);
  vec3 body=waterColor*(.39+.52*ndl)*(.82+.35*waves.z);
  body*=mix(.56,1.0,shadow);
  body*=.91+.16*max(dot(normal,viewDirection),0.0);

  // GGX sun reflection with pixel/mipmap variance: interrupted warm highlights
  // retain their energy as finer ripples become unresolved, without glitter.
  vec3 halfDirection=normalize(sunDirection+viewDirection);
  float ndh=max(dot(normal,halfDirection),0.0);
  float vdh=max(dot(viewDirection,halfDirection),0.0);
  vec3 normalDx=dFdx(normal),normalDy=dFdy(normal);
  float pixelVariance=dot(normalDx,normalDx)+dot(normalDy,normalDy);
  float roughnessSquared=.010+min(.15,pixelVariance*.65+waves.w*.7);
  float denominator=ndh*ndh*(roughnessSquared-1.0)+1.0;
  float distribution=roughnessSquared/(3.14159265*denominator*denominator);
  float geometry=smithVisibility(ndv,roughnessSquared)*smithVisibility(max(ndl,.001),roughnessSquared);
  float sunFresnel=.020+.98*pow(1.0-vdh,5.0);
  vec3 sunReflection=sunColor*(distribution*geometry*sunFresnel/(4.0*ndv))*3.2*shadow;
  vec3 outgoingLight=mix(body,reflection,fresnel)+sunReflection;
  gl_FragColor=vec4(outgoingLight,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function makeDreamWater(scene,sunDirection) {
  if(!waterNormals)throw new Error('Water art must be loaded before making the water.');
  const water=new Water(new T.PlaneGeometry(14000,14000),{
    textureWidth:768,textureHeight:768,waterNormals,sunDirection,sunColor:0xffe8c4,
    waterColor:0x127378,fog:true,
  });
  water.material.fragmentShader=fragmentShader;
  water.material.uniforms.skySampler={value:scene.background};
  water.material.uniforms.skyRotation={value:-scene.backgroundRotation.y};
  water.material.uniforms.skyIntensity={value:scene.backgroundIntensity};
  const reflection=water.onBeforeRender;
  water.onBeforeRender=function(...args){if(!args[1].overrideMaterial)reflection.apply(this,args)};
  water.rotation.x=-Math.PI/2;water.position.y=.025;scene.add(water);
  const colors={downtown:new T.Color(0x166d74),marina:new T.Color(0x117c82),mangrove:new T.Color(0x2c6e59),cove:new T.Color(0x118e91),bridge:new T.Color(0x14797d)};
  return{mesh:water,update(s,t){water.material.uniforms.time.value=t;water.material.uniforms.waterColor.value.lerp(colors[districtAt(s).id],.025)}};
}
