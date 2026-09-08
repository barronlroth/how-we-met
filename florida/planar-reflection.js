import {Color,REVISION} from 'three';

/** Match Water's reflected horizontal camera basis to an off-axis real view. */
export function fixWaterReflectionFraming(water,skyOpacity){
  if(REVISION!=='185')throw new Error('Water reflection framing requires Three.js revision 185.');
  const reflection=water.onBeforeRender;
  const savedClearColor=skyOpacity?new Color():null;
  water.onBeforeRender=function(renderer,scene,camera,...args){
    if(scene.overrideMaterial)return;
    const horizontalShift=camera.projectionMatrix.elements[8];
    const target=renderer.getRenderTarget(),visible=water.visible;
    const xr=renderer.xr.enabled,shadowAuto=renderer.shadowMap.autoUpdate;
    const previousSkyOpacity=skyOpacity?.value;
    const background=scene.background,clearAlpha=skyOpacity?renderer.getClearAlpha():null;
    if(skyOpacity)renderer.getClearColor(savedClearColor);
    // Water reflects the horizontal view basis. Its lens shift must reflect
    // too; otherwise a missing view strip gets stretched by edge clamping.
    camera.projectionMatrix.elements[8]=-horizontalShift;
    if(skyOpacity){skyOpacity.value=0;scene.background=null;renderer.setClearColor(0,0)}
    try{return reflection.call(this,renderer,scene,camera,...args)}
    finally{
      camera.projectionMatrix.elements[8]=horizontalShift;
      if(skyOpacity){skyOpacity.value=previousSkyOpacity;scene.background=background;renderer.setClearColor(savedClearColor,clearAlpha)}
      water.visible=visible;renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=shadowAuto;
      if(renderer.getRenderTarget()!==target)renderer.setRenderTarget(target);
    }
  };
}
