import {BufferGeometry,Float32BufferAttribute,Group,Mesh} from 'three';
import {pointAt} from './course.js';

const SEGMENTS=40;

// Follow the existing course-space island outline exactly. All bank rings sit
// inside that footprint and descend below water, retaining the collision shape.
function ringSurface(island,rings){
  const positions=[],uvs=[],colors=[],indices=[],offsets=[];
  for(const [radius,height] of rings){
    offsets.push(positions.length/3);
    for(let j=0;j<(radius===0?1:SEGMENTS);j++){
      const angle=j*Math.PI*2/SEGMENTS;
      const p=pointAt(island.s+Math.cos(angle)*island.length*.5*radius,island.x+Math.sin(angle)*island.width*radius);
      positions.push(p.x,height,p.z);uvs.push(p.x/2,p.z/2);
      const damp=radius<=.88?1:1-.30*(radius-.88)/.12;
      colors.push(damp,damp,damp);
    }
  }
  if(rings[0][0]===0){
    for(let j=0;j<SEGMENTS;j++)indices.push(0,offsets[1]+(j+1)%SEGMENTS,offsets[1]+j);
  }
  for(let ring=rings[0][0]===0?1:0;ring<rings.length-1;ring++)for(let j=0;j<SEGMENTS;j++){
    const next=(j+1)%SEGMENTS,a=offsets[ring]+j,b=offsets[ring]+next,c=offsets[ring+1]+j,d=offsets[ring+1]+next;
    indices.push(a,b,c,b,d,c);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new Float32BufferAttribute(uvs,2));
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}

export function makeIslandSurface(island,topMaterial,shoreMaterial){
  const root=new Group();root.name=`${island.district} island ground`;
  const top=new Mesh(ringSurface(island,[[0,.55],[.5,.55],[.75,.54],[.88,.46]]),topMaterial);
  const shore=new Mesh(ringSurface(island,[[.88,.46],[.95,.18],[1,-.22]]),shoreMaterial);
  top.name='Island ground';shore.name='Sloped island shoreline';
  top.receiveShadow=shore.receiveShadow=true;root.add(top,shore);return root;
}
