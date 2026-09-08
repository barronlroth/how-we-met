import test from 'node:test';
import assert from 'node:assert/strict';
import {Color,PerspectiveCamera,PlaneGeometry,Scene,Texture,Vector3,Vector4} from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {fixWaterReflectionFraming} from '../florida/planar-reflection.js';

function fixture(fail=false,maskSky=false){
  const scene=new Scene(),camera=new PerspectiveCamera(63,1.5,.1,5000),water=new Water(new PlaneGeometry(100,100),{textureWidth:128,textureHeight:64,waterNormals:new Texture()});
  water.rotation.x=-Math.PI/2;scene.add(water);camera.position.set(0,5,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
  let target=null,capturedCamera,capturedSky,clearAlpha=.6;
  const clearColor=new Color(0x415283),skyOpacity=maskSky?{value:.8}:undefined;
  scene.background=new Texture();
  const renderer={
    xr:{enabled:true},shadowMap:{autoUpdate:true},autoClear:true,
    state:{buffers:{depth:{setMask(){}}}},
    getRenderTarget(){return target},setRenderTarget(value){target=value},
    getClearAlpha(){return clearAlpha},getClearColor(color){return color.copy(clearColor)},
    setClearColor(value,alpha){clearColor.set(value);clearAlpha=alpha},
    render(s,c){capturedCamera=c.clone();capturedSky={background:s.background,clearColor:clearColor.clone(),clearAlpha,opacity:skyOpacity?.value};if(fail)throw new Error('render failed')},
  };
  fixWaterReflectionFraming(water,skyOpacity);
  return{scene,camera,water,renderer,skyOpacity,reflectedCamera:()=>capturedCamera,reflectedSky:()=>capturedSky};
}

test('sky coverage uses transparent black during reflection and restores scene and renderer after success or failure',()=>{
  for(const fail of [false,true]){
    const f=fixture(fail,true),background=f.scene.background,color=f.renderer.getClearColor(new Color()).clone();
    if(fail)assert.throws(()=>f.water.onBeforeRender(f.renderer,f.scene,f.camera),/render failed/);
    else f.water.onBeforeRender(f.renderer,f.scene,f.camera);
    const captured=f.reflectedSky();
    assert.equal(captured.background,null);assert.equal(captured.clearColor.getHex(),0);
    assert.equal(captured.clearAlpha,0);assert.equal(captured.opacity,0);
    assert.equal(f.scene.background,background);assert.equal(f.skyOpacity.value,.8);
    assert.ok(f.renderer.getClearColor(new Color()).equals(color));assert.equal(f.renderer.getClearAlpha(),.6);
    assert.equal(f.water.visible,true);assert.equal(f.renderer.getRenderTarget(),null);
  }
  const f=fixture(false,true),background=f.scene.background;
  f.scene.overrideMaterial={};f.water.onBeforeRender(f.renderer,f.scene,f.camera);
  assert.equal(f.reflectedSky(),undefined);assert.equal(f.scene.background,background);
  assert.equal(f.skyOpacity.value,.8);assert.equal(f.renderer.getClearAlpha(),.6);
  assert.equal(f.renderer.getClearColor(new Color()).getHex(),0x415283);
});

test('reflection framing restores the camera and render state after failure and skips the AO override',()=>{
  const f=fixture(true),render=f.renderer.render,setTarget=f.renderer.setRenderTarget;
  f.camera.setViewOffset(1536,1024,-215,0,1536,1024);
  const projection=f.camera.projectionMatrix.clone();
  assert.throws(()=>f.water.onBeforeRender(f.renderer,f.scene,f.camera),/render failed/);
  assert.equal(f.renderer.render,render);assert.equal(f.renderer.setRenderTarget,setTarget);assert.equal(f.renderer.getRenderTarget(),null);
  assert.deepEqual(f.camera.projectionMatrix.elements,projection.elements);
  assert.equal(f.water.visible,true);assert.equal(f.renderer.xr.enabled,true);assert.equal(f.renderer.shadowMap.autoUpdate,true);
  const skipped=fixture();skipped.scene.overrideMaterial={};skipped.water.onBeforeRender(skipped.renderer,skipped.scene,skipped.camera);
  assert.equal(skipped.reflectedCamera(),undefined);
});


test('off-axis framing keeps every visible water point inside the reflected view',()=>{
  const f=fixture();
  f.camera.setViewOffset(1536,1024,-1536*.14,0,1536,1024);
  const projection=f.camera.projectionMatrix.clone();
  f.water.onBeforeRender(f.renderer,f.scene,f.camera);
  const mirror=f.reflectedCamera();
  assert.equal(f.renderer.getRenderTarget(),null);
  assert.equal(f.water.visible,true);
  assert.equal(f.renderer.xr.enabled,true);
  assert.equal(f.renderer.shadowMap.autoUpdate,true);
  assert.deepEqual(f.camera.projectionMatrix.elements,projection.elements,'real camera lens shift is restored');
  for(const x of [-15,0,15]){
    const point=new Vector3(x,0,-20),view=point.clone().project(f.camera),reflected=point.clone().project(mirror);
    assert.ok(Math.abs(view.x+reflected.x)<1e-9,'horizontal basis is mirrored around the same visible frame');
    assert.ok(Math.abs(view.y-reflected.y)<1e-9,'vertical framing is unchanged');
  }
});
