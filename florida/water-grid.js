import {PlaneGeometry} from 'three';

export const WATER_GRID_STEP=.35;
// Keep the dense surface around the camera; stretch only the flat outer apron.
// This retains an unbroken horizon without tessellating kilometres of water.
export function makeWaterGrid(){
  const segments=256,half=segments/2,inner=96,extent=7000;
  const geometry=new PlaneGeometry(2,2,segments,segments),positions=geometry.attributes.position;
  const coordinate=i=>{
    const distance=Math.abs(i-half),sign=Math.sign(i-half);
    return sign*(distance<=inner?distance*WATER_GRID_STEP:inner*WATER_GRID_STEP*Math.pow(extent/(inner*WATER_GRID_STEP),(distance-inner)/(half-inner)));
  };
  for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++)positions.setXYZ(y*(segments+1)+x,coordinate(x),-coordinate(y),0);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
