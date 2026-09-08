import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3, Vector3, Texture, Color} from 'three';
const bytes=await readFile(new URL('../florida/assets/models/airboat-couple-v6.glb',import.meta.url));
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
 assert.ok(size.x<3.5 && size.y<3.8 && size.z<7.4,`collision/camera envelope: ${size.toArray()}`);
});
test('hero remains within its mesh, triangle and asset-size budgets without external textures',()=>{
 let count=0,triangles=0;const materials=new Set();
 scene.traverse(o=>{if(o.isMesh){count++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;materials.add(o.material);if(o.material.map)assert.ok(o.geometry.attributes.uv);}});
 assert.ok(document.images.length>=2 && document.images.length<=9);
 for(const image of document.images){assert.ok(['image/jpeg','image/png'].includes(image.mimeType));assert.equal(image.uri,undefined);assert.ok(document.bufferViews[image.bufferView].byteLength<500000);}
 assert.ok(document.images.some(image=>image.name==='couple-face-atlas-v4'),'approved facial albedo remains embedded');
 assert.ok(document.images.some(image=>image.name==='teak-albedo'),'deck grain is embedded');
 // The round-five sculpting budget allows 140k triangles for the single hero;
 // draw-call/material limits and the approved geometry contracts stay unchanged.
 assert.ok(count<=42,`draw primitives: ${count}`);assert.ok(triangles<=140000,`triangles: ${triangles}`);assert.ok(materials.size<=28);assert.ok(bytes.length<5500000);
 scene.traverse(o=>{if(!o.isMesh)return;for(const name of ['position','normal'])for(const value of o.geometry.attributes[name].array)assert.ok(Number.isFinite(value),`${o.name} has finite ${name}`);});
});

test('golden strand finish follows continuous UVs without adding hair draw materials',()=>{
 for(const name of ['hairN','hairGold']){
  const material=document.materials.find(m=>m.name===name);
  assert.ok(material.pbrMetallicRoughness.baseColorTexture,`${name} has generated strand color`);
  assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture,`${name} has strand roughness`);
  assert.ok(material.normalTexture,`${name} has subtle strand relief`);
 }
 scene.traverse(o=>{if(!o.isMesh||!['hairN','hairGold'].includes(o.material.name))return;
  const uv=o.geometry.attributes.uv;assert.ok(uv,`${o.name} has root-to-tip UVs`);
  for(const value of uv.array)assert.ok(Number.isFinite(value),`${o.name} finite strand UV`);
 });
});

test('Nina is seated with her sandals meeting the deck',()=>{
 const feet=new Box3().setFromObject(scene.getObjectByName('Nina_seam'));
 assert.ok(Math.abs(feet.min.y-.725)<.015,`sole contact at ${feet.min.y}`);
 const seats=new Box3().setFromObject(scene.getObjectByName('Hull_canvas'));
 assert.ok(seats.max.y>2.30,'driver backrest supports the seated body');
});

test('v6 keeps the approved facial meshes and atlas UV coordinates',async()=>{
 const oldBytes=await readFile(new URL('../florida/assets/models/airboat-couple-v5.glb',import.meta.url));
 const {scene:previous}=await loader.parseAsync(oldBytes.buffer.slice(oldBytes.byteOffset,oldBytes.byteOffset+oldBytes.byteLength),'');
 const points=(root,material)=>{
  const values=[];
  root.traverse(o=>{if(!o.isMesh||o.material.name!==material)return;const p=o.geometry.attributes.position,uv=o.geometry.attributes.uv;
   for(let i=0;i<p.count;i++)values.push([p.getX(i),p.getY(i),p.getZ(i),uv.getX(i),uv.getY(i)].map(v=>v.toFixed(6)).join(','));});
  return [...new Set(values)].sort();
 };
 for(const material of ['faceB','faceN','eyeB','eyeN'])assert.deepEqual(points(scene,material),points(previous,material),material);
 for(const name of ['Barron','Nina','BarronHead','NinaHead','Fan','PointingArm','DrivingArm']){
  const next=scene.getObjectByName(name),before=previous.getObjectByName(name);
  assert.deepEqual(next.position.toArray(),before.position.toArray(),`${name} pivot`);
  assert.deepEqual(next.scale.toArray(),before.scale.toArray(),`${name} scale`);
 }
});

test('linen preserves the approved outfit dyes through the glTF export',()=>{
 for(const [name,hex] of Object.entries({shirt:0x7c8b69,shorts:0x427e83,ninaShirt:0xdf795c,linen:0xe8dcc1,canvas:0xded5be})){
  const material=document.materials.find(m=>m.name===name),pbr=material.pbrMetallicRoughness;
  assert.ok(pbr.baseColorTexture,`${name} has linen texture`);
  assert.ok(pbr.baseColorFactor,`${name} must export its dye instead of defaulting to white`);
  const expected=new Color(hex).toArray();
  for(let i=0;i<3;i++)assert.ok(Math.abs(pbr.baseColorFactor[i]-expected[i])<1e-6,`${name} dye channel ${i}`);
  const sheen=material.extensions?.KHR_materials_sheen?.sheenColorFactor??[0,0,0];
  assert.ok(Math.max(...sheen)<=.1,`${name} sheen must not wash out its dye`);
 }
});

test('fan assembly has the enlarged cage and matching rotor at its original hub',()=>{
 const fan=scene.getObjectByName('Fan'),center=fan.getWorldPosition(new Vector3());let radius=0;
 fan.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).sub(center);radius=Math.max(radius,Math.hypot(v.x,v.y));}});
 assert.ok(radius>1.33&&radius<1.40,`rotor radius ${radius}`);
 const cage=new Box3().setFromObject(scene.getObjectByName('Hull_chrome'));
 assert.ok(cage.max.y>3.66&&cage.max.y<3.72,`cage top ${cage.max.y}`);
 for(const mat of document.materials.filter(m=>['hairN','hairGold'].includes(m.name)))assert.ok(mat.pbrMetallicRoughness.baseColorFactor,'golden hair dye remains explicit');
});

test('facial contour normals add relief without changing eye surfaces or atlas placement',()=>{
 assert.ok(document.images.some(image=>image.name==='face-relief-normal'));
 for(const name of ['faceB','faceN']){
  const material=document.materials.find(m=>m.name===name);
  assert.ok(material.normalTexture,`${name} has anatomical normal detail`);
  assert.ok(material.normalTexture.scale>0&&material.normalTexture.scale<=.65);
 }
 for(const name of ['eyeB','eyeN'])assert.equal(document.materials.find(m=>m.name===name).normalTexture,undefined);
});
