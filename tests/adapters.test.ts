import {test} from 'node:test';
import assert from 'node:assert/strict';
import {computeNDVI,computeNDWI,thresholdIndex} from '../src/spectral.ts';
import {decodeSegmentation,DEFAULT_BUILDING_CONFIG} from '../src/building-segmenter.ts';

test('future multispectral adapters compute normalized differences',()=>{
 const red=new Float32Array([.2,.4,0]),nir=new Float32Array([.6,.4,0]),green=new Float32Array([.5,.2,0]);
 const ndvi=computeNDVI(red,nir),ndwi=computeNDWI(green,nir);
 assert.ok(Math.abs(ndvi[0]-.5)<1e-6);assert.equal(ndvi[1],0);assert.ok(Number.isNaN(ndvi[2]));
 assert.ok(Math.abs(ndwi[0]-(-1/11))<1e-6);assert.deepEqual([...thresholdIndex(ndvi,.2)],[1,0,0]);
});

test('ONNX adapter decodes binary, labels and multiclass output shapes',()=>{
 const binary=decodeSegmentation([.1,.9,.8,.2],[1,1,2,2],{...DEFAULT_BUILDING_CONFIG,threshold:.5});
 assert.deepEqual([...binary.mask],[0,1,1,0]);
 const labels=decodeSegmentation([0,1,1,0],[2,2],{...DEFAULT_BUILDING_CONFIG,outputType:'labels'});
 assert.deepEqual([...labels.mask],[0,1,1,0]);assert.deepEqual([labels.width,labels.height],[2,2]);
 const multi=decodeSegmentation([5,1,1,5,1,5,5,1],[1,2,2,2],{...DEFAULT_BUILDING_CONFIG,outputType:'multiclass',buildingClass:1});
 assert.deepEqual([...multi.mask],[0,1,1,0]);
});
