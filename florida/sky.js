import * as T from 'three';
import {stormUniform,stormSkyGLSL} from './storm.js';

// The visible dome frames separate cloud groups at this camera's low elevation
// without filtering them through a small cube. Reflections use the original
// spherical panorama through waterSkySamplingGLSL below.
export const skySamplingGLSL=`
${stormSkyGLSL}
vec3 sampleFloridaSky(sampler2D panorama,vec3 direction,float rotation,float intensity,float mipBias){
  vec3 ray=normalize(direction);float c=cos(rotation),s=sin(rotation);
  ray=vec3(c*ray.x+s*ray.z,ray.y,-s*ray.x+c*ray.z);
  vec2 uv=vec2(atan(ray.z,ray.x)*.159154943+.5,clamp(asin(clamp(ray.y,-1.0,1.0))*.954929658+.5,.01,.99));
  // RepeatWrapping handles horizontal wrap. Explicit angular derivatives also
  // avoid the atan seam selecting the coarsest mip and drawing a pale meridian.
  uv.x=uv.x*4.0+.05;
  vec3 dx=dFdx(ray),dy=dFdy(ray);
  float angularScale=.636619772/max(.0001,dot(ray.xz,ray.xz));
  vec2 gradX=vec2((ray.x*dx.z-ray.z*dx.x)*angularScale,dFdx(uv.y));
  vec2 gradY=vec2((ray.x*dy.z-ray.z*dy.x)*angularScale,dFdy(uv.y));
  vec3 color=textureGrad(panorama,uv,gradX*exp2(mipBias),gradY*exp2(mipBias)).rgb;
  float luma=dot(color,vec3(.2126,.7152,.0722));
  return stormSkyColor(max(vec3(0.0),mix(vec3(luma),color,.95))*intensity);
}`;

// Water and the PMREM environment use the original spherical panorama. The
// visible dome's low-elevation cloud framing would clamp most reflected rays
// onto one latitude and repeat cloud boundaries across every wave shoulder.
export const waterSkySamplingGLSL=`
${stormSkyGLSL}
vec3 sampleWaterSky(sampler2D panorama,vec3 direction,float rotation,float intensity,float mipBias){
  vec3 ray=normalize(direction);float c=cos(rotation),s=sin(rotation);
  ray=vec3(c*ray.x+s*ray.z,ray.y,-s*ray.x+c*ray.z);
  vec2 uv=vec2(atan(ray.z,ray.x)*.159154943+.5,clamp(asin(clamp(ray.y,-1.0,1.0))*.318309886+.5,.0001,.9999));
  vec3 dx=dFdx(ray),dy=dFdy(ray);
  float angularScale=.159154943/max(.0001,dot(ray.xz,ray.xz));
  vec2 gradX=vec2((ray.x*dx.z-ray.z*dx.x)*angularScale,dFdx(uv.y));
  vec2 gradY=vec2((ray.x*dy.z-ray.z*dy.x)*angularScale,dFdy(uv.y));
  vec3 color=textureGrad(panorama,uv,gradX*exp2(mipBias),gradY*exp2(mipBias)).rgb;
  float luma=dot(color,vec3(.2126,.7152,.0722));
  return stormSkyColor(max(vec3(0.0),mix(vec3(luma),color,.95))*intensity);
}`;

let sky, visibleSky;
// The existing planar pass records opaque geometry in alpha. Its sky color is
// sampled separately along each water normal's reflected ray.
export const skyReflectionOpacity={value:1};
export async function loadSkyArt() {
  sky = await new T.TextureLoader().loadAsync(new URL('./assets/textures/florida-sky-v2.png',import.meta.url).href);
  sky.colorSpace = T.SRGBColorSpace;
  sky.mapping = T.EquirectangularReflectionMapping;
  sky.wrapS=T.RepeatWrapping;
  visibleSky=sky.clone();visibleSky.needsUpdate=true;
  visibleSky.colorSpace=T.SRGBColorSpace;visibleSky.wrapS=T.RepeatWrapping;
}

export function makeSky(scene,renderer) {
  scene.background = sky;
  scene.backgroundIntensity = 1.03;
  scene.backgroundRotation.y = 1.2;
  const pmrem = new T.PMREMGenerator(renderer), environment = pmrem.fromEquirectangular(sky);
  scene.environment = environment.texture;
  scene.environmentRotation.y = 1.2;
  scene.environmentIntensity = .30;
  pmrem.dispose();

  // Sample the source panorama directly for the visible sky. The environment's
  // small filtered cubemap is appropriate for rough reflections, but softens
  // cumulus edges when used as the full-screen background.
  const material=new T.ShaderMaterial({
    uniforms:{panorama:{value:visibleSky},rotation:{value:-1.2},intensity:{value:1.03},skyOpacity:skyReflectionOpacity,stormStrength:stormUniform},
    vertexShader:`varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D panorama;uniform float rotation;uniform float intensity;uniform float skyOpacity;varying vec3 skyDirection;
      ${skySamplingGLSL}
      void main(){gl_FragColor=vec4(sampleFloridaSky(panorama,skyDirection,rotation,intensity,0.0)*skyOpacity,skyOpacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    side:T.BackSide,depthWrite:false,
  });
  const dome=new T.Mesh(new T.SphereGeometry(2900,32,16),material);
  dome.name='Detailed panorama sky';dome.frustumCulled=false;dome.renderOrder=-100;
  dome.onBeforeRender=(_renderer,_scene,camera)=>{dome.position.setFromMatrixPosition(camera.matrixWorld);dome.updateMatrixWorld()};
  scene.add(dome);
}
