import {PlaneGeometry} from 'three';

export const WATER_GRID_STEP=.18;
export const WATER_GRID_INNER_EXTENT=72*WATER_GRID_STEP,WATER_GRID_MIDDLE_STEP=.45;
export const WATER_DISPLACEMENT_START=24,WATER_DISPLACEMENT_END=30;
// Keep the dense surface around the camera; stretch only the flat outer apron.
// This retains an unbroken horizon without tessellating kilometres of water.
export function makeWaterGrid(){
  const segments=256,half=segments/2,inner=72,middle=112,extent=7000;
  const innerExtent=WATER_GRID_INNER_EXTENT,middleStep=WATER_GRID_MIDDLE_STEP,middleExtent=innerExtent+(middle-inner)*middleStep;
  const geometry=new PlaneGeometry(2,2,segments,segments),positions=geometry.attributes.position;
  const coordinate=i=>{
    const distance=Math.abs(i-half),sign=Math.sign(i-half);
    return sign*(distance<=inner?distance*WATER_GRID_STEP:distance<=middle?innerExtent+(distance-inner)*middleStep:middleExtent*Math.pow(extent/middleExtent,(distance-middle)/(half-middle)));
  };
  for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++)positions.setXYZ(y*(segments+1)+x,coordinate(x),-coordinate(y),0);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
