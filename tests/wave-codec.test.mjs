import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeSubRows,encodeSubRows} from '../florida/wave-codec.js';

test('Sub prediction keeps channels independent and resets at each row',()=>{
  const original=new Uint8Array([250,100,2,255,5,110,0,1,9,90,7,0,20,30,40,50,19,32,44,48,255,0,128,64]);
  const data=original.slice();assert.equal(encodeSubRows(data,12),data);
  assert.deepEqual(data,new Uint8Array([250,100,2,255,11,10,254,2,4,236,7,255,20,30,40,50,255,2,4,254,236,224,84,16]));
  assert.equal(decodeSubRows(data,12),data);assert.deepEqual(data,original);
});

test('single-pixel rows and empty buffers round-trip unchanged',()=>{
  for(const data of [new Uint8Array(),new Uint8Array([255,0,127,128,8,9,10,11])]){
    const original=data.slice();encodeSubRows(data,4);assert.deepEqual(data,original);decodeSubRows(data,4);assert.deepEqual(data,original);
  }
});

test('invalid RGBA row layouts fail before mutation',()=>{
  for(const codec of [encodeSubRows,decodeSubRows]){
    const data=new Uint8Array([1,2,3,4,5,6,7,8]),original=data.slice();
    for(const rowBytes of [0,-4,3,5,12,4.5])assert.throws(()=>codec(data,rowBytes),/RGBA/);
    assert.throws(()=>codec([1,2,3,4],4),/Uint8Array/);assert.deepEqual(data,original);
  }
});
