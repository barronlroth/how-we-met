import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3, Vector3} from 'three';
const bytes=await readFile(new URL('../florida/assets/models/airboat-couple-v3.glb',import.meta.url));
const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
test('Blender hero loads with the articulated nodes and game coordinate convention',()=>{
 for(const name of ['Hull','Fan','Barron','Nina','PointingArm'])assert.ok(scene.getObjectByName(name),name);
 const nina=scene.getObjectByName('Nina');assert.equal(scene.getObjectByName('PointingArm').parent,nina);
 assert.ok(nina.position.z<-2 && nina.position.y>1);
 assert.ok(scene.getObjectByName('Fan').position.z>2);
 const size=new Box3().setFromObject(scene).getSize(new Vector3());
 assert.ok(size.x<3.5 && size.y<3.6 && size.z<7.4,`collision/camera envelope: ${size.toArray()}`);
});
test('hero remains within its mesh, triangle and asset-size budgets without external textures',()=>{
 let count=0,triangles=0;const materials=new Set();
 scene.traverse(o=>{if(o.isMesh){count++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;materials.add(o.material);assert.equal(o.material.map,null);}});
 assert.ok(count<=42);assert.ok(triangles<65000);assert.ok(materials.size<=24);assert.ok(bytes.length<1800000);
});
