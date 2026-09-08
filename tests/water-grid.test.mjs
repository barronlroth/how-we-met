import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWaterGrid,WATER_GRID_STEP,WATER_DISPLACEMENT_END} from '../florida/water-grid.js';

test('near-water mesh covers its full horizon with finite upward-facing triangles',()=>{
  const geometry=makeWaterGrid(),position=geometry.attributes.position,index=geometry.index;
  assert.ok(position.array.every(Number.isFinite));
  assert.deepEqual(geometry.boundingBox.min.toArray(),[-7000,-7000,0]);
  assert.deepEqual(geometry.boundingBox.max.toArray(),[7000,7000,0]);
  let smallest=Infinity;
  for(let i=0;i<index.count;i+=3){
    const [a,b,c]=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    const area=(position.getX(b)-position.getX(a))*(position.getY(c)-position.getY(a))-(position.getY(b)-position.getY(a))*(position.getX(c)-position.getX(a));
    assert.ok(area>0,'no inverted or degenerate surface triangles');smallest=Math.min(smallest,area);
  }
  assert.ok(Math.abs(Math.sqrt(smallest)-WATER_GRID_STEP)<.00001);
  for(let i=0;i<position.count;i++){
    const x=Math.abs(position.getX(i)),y=Math.abs(position.getY(i));
    if(Math.max(x,y)>WATER_DISPLACEMENT_END)continue;
    if(i%257<256){
      assert.ok(Math.abs(position.getX(i+1)-position.getX(i))<.451,'displaced area does not enter the stretched horizon apron');
    }
  }
  geometry.dispose();
});
