import test from 'node:test';
import assert from 'node:assert/strict';
import {MeshStandardMaterial,Vector3} from 'three';
import {ISLANDS,pointAt} from '../florida/course.js';
import {makeIslandSurface} from '../florida/island-surface.js';

function withinOutline(x,z,outline){
  let inside=false;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const a=outline[j],b=outline[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    if(Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<.001)return true;
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}

test('sloped island surfaces retain the existing outline and stay inside the collision footprint',()=>{
  const material=new MeshStandardMaterial();
  for(const island of ISLANDS){
    const outline=Array.from({length:40},(_,j)=>{const angle=j*Math.PI/20;return pointAt(island.s+Math.cos(angle)*island.length/2,island.x+Math.sin(angle)*island.width)});
    const group=makeIslandSurface(island,material,material),outer=[];
    for(const mesh of group.children){
      const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        assert.ok(withinOutline(p.getX(i),p.getZ(i),outline),'all visible ground remains inside the established island outline');
        if(p.getY(i)<0)outer.push([p.getX(i),p.getZ(i)]);
      }
      mesh.geometry.dispose();
    }
    assert.equal(outer.length,40);
    for(const expected of outline)assert.ok(outer.some(([x,z])=>Math.hypot(x-expected.x,z-expected.z)<.001),'outer bank uses the original outline');
  }
  material.dispose();
});

test('island meshes have finite continuous material attributes and nondegenerate upward-facing surfaces',()=>{
  const material=new MeshStandardMaterial(),a=new Vector3(),b=new Vector3(),c=new Vector3();
  for(const island of ISLANDS)for(const mesh of makeIslandSurface(island,material,material).children){
    const geometry=mesh.geometry,p=geometry.attributes.position,index=geometry.index;
    for(const attribute of Object.values(geometry.attributes))assert.ok(attribute.array.every(Number.isFinite));
    assert.equal(new Set(index.array).size,p.count,'no unused centre-ring vertices');
    assert.equal(geometry.attributes.uv.count,p.count);assert.equal(geometry.attributes.color.count,p.count);
    for(let i=0;i<index.count;i+=3){
      a.fromBufferAttribute(p,index.getX(i));b.fromBufferAttribute(p,index.getX(i+1));c.fromBufferAttribute(p,index.getX(i+2));
      assert.ok(b.sub(a).cross(c.sub(a)).y>0,'no inverted shore or top faces');
    }
    assert.ok(geometry.boundingBox.min.y>=-.221);assert.ok(geometry.boundingBox.max.y<=.551);
    geometry.dispose();
  }
  material.dispose();
});
