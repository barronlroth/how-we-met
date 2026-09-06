import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3, Vector3, Texture} from 'three';
const bytes=await readFile(new URL('../florida/assets/models/airboat-couple-v5.glb',import.meta.url));
const document=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
const loader=new GLTFLoader();
loader.register(()=>({name:'NODE_BITMAP_PLACEHOLDER',loadTexture:()=>Promise.resolve(new Texture())}));
const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
test('Blender hero loads with the articulated nodes and game coordinate convention',()=>{
 for(const name of ['Hull','Fan','Barron','Nina','PointingArm'])assert.ok(scene.getObjectByName(name),name);
 const nina=scene.getObjectByName('Nina');assert.equal(scene.getObjectByName('PointingArm').parent,nina);
 assert.ok(nina.position.z<-2 && nina.position.y>1);
 assert.ok(scene.getObjectByName('Fan').position.z>2);
 const size=new Box3().setFromObject(scene).getSize(new Vector3());
 assert.ok(size.x<3.5 && size.y<3.65 && size.z<7.4,`collision/camera envelope: ${size.toArray()}`);
});
test('hero remains within its mesh, triangle and asset-size budgets without external textures',()=>{
 let count=0,triangles=0;const materials=new Set();
 scene.traverse(o=>{if(o.isMesh){count++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;materials.add(o.material);if(o.material.map)assert.ok(o.geometry.attributes.uv);}});
 assert.equal(document.images.length,1);
 assert.equal(document.images[0].mimeType,'image/jpeg');
 assert.equal(document.images[0].uri,undefined);
 const imageView=document.bufferViews[document.images[0].bufferView];
 assert.ok(imageView.byteLength<150000,'shared facial atlas remains compact and embedded');
 assert.ok(count<=42);assert.ok(triangles<65000);assert.ok(materials.size<=25);assert.ok(bytes.length<1800000);
});
