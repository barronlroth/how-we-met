import * as T from 'three';
import {COURSE_LENGTH} from './course.js';

// A passing summer squall covers the mangrove cut, with sunshine returning
// before the party cove. Distance-based easing works at every racing speed.
export const STORM_SECTION=Object.freeze({start:.435,full:.48,clearing:.585,end:.64});
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export function stormStrength(distance){
  const p=distance/COURSE_LENGTH,s=STORM_SECTION;
  return smooth((p-s.start)/(s.full-s.start))*(1-smooth((p-s.clearing)/(s.end-s.clearing)));
}
export const stormUniform={value:0};
export const stormSkyGLSL=`
uniform float stormStrength;
vec3 stormSkyColor(vec3 color){
  float luminance=dot(color,vec3(.2126,.7152,.0722));
  return mix(color,vec3(.065,.085,.11)+luminance*vec3(.24,.28,.34),stormStrength);
}`;

export function makeStorm(scene,{sunshine,ambient,reducedMotion=false}){
  const sunnyFog=scene.fog.color.clone(),rainFog=new T.Color(0x788e9c);
  const sunnyNear=scene.fog.near,sunnyFar=scene.fog.far;
  const sunnySun=sunshine.intensity,sunnyAmbient=ambient.intensity,sunnyEnvironment=scene.environmentIntensity;
  const count=1200,positions=new Float32Array(count*6),ends=new Float32Array(count*2);
  let seed=92317;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<count;i++){
    const x=random()*110,y=random()*38,z=random()*110;
    positions.set([x,y,z,x,y,z],i*6);ends[i*2+1]=1;
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  geometry.setAttribute('end',new T.BufferAttribute(ends,1));
  const uniforms={time:{value:0},strength:stormUniform,anchor:{value:new T.Vector3()}};
  const material=new T.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,toneMapped:false,
    vertexShader:`attribute float end;uniform float time;uniform vec3 anchor;varying float visibility;
      void main(){
        vec3 p=position;
        p.x=mod(p.x+time*7.0-anchor.x+55.0,110.0)-55.0+anchor.x;
        p.z=mod(p.z+time*2.5-anchor.z+55.0,110.0)-55.0+anchor.z;
        p.y=mod(p.y-time*24.0,38.0)+.3;
        p+=vec3(-.45,1.55,-.16)*end;
        vec4 view=modelViewMatrix*vec4(p,1.0);
        float distance=length(view.xyz);
        visibility=smoothstep(2.5,7.0,distance)*(1.0-smoothstep(42.0,68.0,distance));
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader:`uniform float strength;varying float visibility;
      void main(){gl_FragColor=vec4(.72,.84,.89,visibility*strength*.42);}`,
  });
  const rain=new T.LineSegments(geometry,material);rain.name='Mangrove squall rain';
  rain.frustumCulled=false;rain.visible=false;rain.renderOrder=5;
  // The main camera enables layer 1. Water's reflection camera stays on layer
  // 0, so these translucent streaks incur no second draw in the mirror pass.
  rain.layers.set(1);scene.add(rain);
  let clock=0,inAO=false,announced=false;
  function apply(strength){
    stormUniform.value=strength;
    scene.fog.color.copy(sunnyFog).lerp(rainFog,strength);
    scene.fog.near=T.MathUtils.lerp(sunnyNear,150,strength);
    scene.fog.far=T.MathUtils.lerp(sunnyFar,1050,strength);
    sunshine.intensity=sunnySun*T.MathUtils.lerp(1,.27,strength);
    ambient.intensity=T.MathUtils.lerp(sunnyAmbient,.62,strength);
    scene.environmentIntensity=sunnyEnvironment*T.MathUtils.lerp(1,.65,strength);
    rain.visible=strength>.001&&!inAO;
  }
  return {
    setQuality(mode){geometry.setDrawRange(0,(reducedMotion?360:mode==='smooth'?600:1200)*2)},
    setAO(active){inAO=active;rain.visible=!active&&stormUniform.value>.001},
    reset(){clock=0;announced=false;uniforms.time.value=0;apply(0)},
    update(distance,dt,camera,active=true,paused=false){
      if(!paused){clock+=dt*(reducedMotion?.35:1);uniforms.anchor.value.copy(camera.position)}
      uniforms.time.value=clock;
      apply(active?stormStrength(distance):0);
      if(active&&!paused&&!announced&&stormUniform.value>.3){announced=true;return 'Classic Florida. Five minutes of rain, then back to our regularly scheduled sunshine.'}
    },
    get strength(){return stormUniform.value},
  };
}
