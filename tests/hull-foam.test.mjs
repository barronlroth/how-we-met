import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Texture,Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeHullContactGeometry} from '../florida/hull-foam.js';

test('contact foam fits the exported lower hull and remains valid after boat transforms',async()=>{
  const bytes=await readFile(new URL('../florida/assets/models/airboat-couple-v6.glb',import.meta.url));
  const loader=new GLTFLoader();loader.register(()=>({name:'NODE_HULL_TEXTURES',loadTexture:()=>Promise.resolve(new Texture())}));
  const {scene:boat}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  boat.userData.hull=boat.getObjectByName('Hull');
  const a=makeHullContactGeometry(boat),positions=a.attributes.position,index=a.index;
  assert.ok(positions.array.every(Number.isFinite));
  const size=a.boundingBox.getSize(new Vector3());
  // The true immersed beam is narrower than the upper gunwale. The old decals
  // used a 3.28 m beam and visibly detached from this exported waterline.
  assert.ok(size.x>2.7&&size.x<3.3,`contact beam ${size.x}`);
  assert.ok(size.z>5.7&&size.z<6.6,`contact length ${size.z}`);
  assert.ok(a.boundingBox.min.z<-3.2,'contact follows the negative-Z bow');
  assert.ok(a.boundingBox.max.z<2.8,'contact stays at the immersed transom');
  for(let i=0;i<index.count;i+=3){
    const va=new Vector3().fromBufferAttribute(positions,index.getX(i));
    const vb=new Vector3().fromBufferAttribute(positions,index.getX(i+1));
    const vc=new Vector3().fromBufferAttribute(positions,index.getX(i+2));
    assert.ok(vb.sub(va).cross(vc.sub(va)).y>0,'ribbon has no folded triangles');
  }
  boat.position.set(23,.12,-71);boat.rotation.y=1.4;boat.scale.setScalar(1.18);
  const b=makeHullContactGeometry(boat),box=new Box3().setFromBufferAttribute(b.attributes.position);
  assert.ok(box.min.distanceTo(a.boundingBox.min)<1e-5&&box.max.distanceTo(a.boundingBox.max)<1e-5,'boat placement does not alter the local contact outline');
  a.dispose();b.dispose();
});
