import test from 'node:test';
import assert from 'node:assert/strict';
import { writeArrayBuffer } from 'geotiff';
import { analyze, defaultMapping, statistics, compatibility } from '../src/constrained/engine.ts';
import type { Dataset, Mapping, Options } from '../src/constrained/engine.ts';
import { decodeTiff, renderRaster } from '../src/constrained/raster.ts';
function data(bands:number[][]):Dataset{return {width:bands[0].length,height:1,bands:bands.map(b=>Float32Array.from(b)),valid:Uint8Array.from(bands[0],()=>1),metadata:{filename:'fixture',width:bands[0].length,height:1,bands:bands.length,dataType:'float32',crs:'EPSG:32643',bounds:[0,0,bands[0].length*10,10],resolution:[10,-10],transform:[10,0,0,0,-10,10],nodata:null,bandInfo:[],category:'multispectral',units:'metres'}};}
const mapping:Mapping={...defaultMapping,category:'multispectral',red:0,nir:1,green:2,swir:3};
const options:Options={task:'vegetation',threshold:.5,morphology:false,acceptUnreferenced:false,mappingA:mapping,mappingB:mapping};
test('RGB display preserves composite colours independently of analysis category',()=>{
 const d=data([[200],[80],[20]]);d.metadata.category='unknown';d.metadata.dataType='uint8';
 const m={...defaultMapping,category:'unknown' as const};
 assert.deepEqual([...renderRaster(d,m,'rgb')],[200,80,20,255]);
 assert.deepEqual([...renderRaster(d,m,'band',1)],[80,80,80,255]);
});
test('rejects optical inputs for SAR and negative absolute-difference thresholds',()=>{
 const d=data([[1,2],[3,4]]);
 assert.throws(()=>analyze(d,null,{...options,task:'sar'}),/requires SAR inputs/);
 assert.throws(()=>analyze(d,d,{...options,task:'change',threshold:-1}),/cannot be negative/);
});
test('vegetation transitions distinguish spatial loss, gain, net pp and relative percent',()=>{
 const a=data([[1,1,1,1],[4,4,4,1]]),b=data([[1,1,1,1],[4,1,1,4]]),r=analyze(a,b,options);
 assert.equal(r.summary.beforeCoverage,75);assert.equal(r.summary.afterCoverage,50);assert.equal(r.summary.netPercentagePoints,-25);
 assert.equal(r.summary.lostCoverage,50);assert.equal(r.summary.gainedCoverage,25);assert.equal(r.summary.detectedPixels,3);assert.equal(r.summary.areaM2,300);
 assert.deepEqual([...r.lost],[0,1,1,0]);assert.ok(Math.abs(r.summary.relativePercent!+100/3)<1e-10);
});
test('nodata and invalid normalized differences are excluded from common denominator',()=>{
 const a=data([[1,0,1],[4,0,4]]),b=data([[1,0,1],[1,0,1]]);b.valid[2]=0;
 const r=analyze(a,b,options);assert.equal(r.summary.totalPixels,1);assert.equal(r.summary.lostCoverage,100);assert.ok(Number.isNaN(r.difference[2]));
});
test('NDWI and NDBI use the assigned bands and fail cleanly on missing bands',()=>{
 const d=data([[1,1],[1,4],[4,1],[4,1]]);
 for(const task of ['water','builtup'] as const){const r=analyze(d,null,{...options,task,threshold:0});assert.equal(r.summary.coverage,50);}
 assert.throws(()=>analyze(d,null,{...options,mappingA:{...mapping,nir:-1}}),/band is missing/);
});
test('rejects mismatched CRS/extents and requires explicit unreferenced alignment confirmation',()=>{
 const a=data([[1]]),b=data([[2]]);b.metadata.crs='EPSG:4326';assert.throws(()=>compatibility(a,b),/CRS/);
 b.metadata.crs=a.metadata.crs;b.metadata.bounds=[100,0,110,10];assert.throws(()=>compatibility(a,b),/bounds/);
 b.metadata.bounds=null;assert.throws(()=>compatibility(a,b),/confirm/i);assert.ok(compatibility(a,b,true).length);
});
test('SAR statistics preserve raw intensities and reject semantic vegetation estimates',()=>{
 const d=data([[0,2,4,6]]),sar={...mapping,category:'sar' as const,intensity:0};
 const r=analyze(d,null,{...options,task:'sar',threshold:3,mappingA:sar});assert.equal(r.summary.coverage,50);assert.equal(r.summary.statisticsAfter.mean,3);
 assert.throws(()=>analyze(d,null,{...options,mappingA:sar}),/SAR supports/);
 const st=statistics(d.bands[0],d.valid);assert.equal(st.histogram.reduce((a,b)=>a+b,0),4);assert.equal(st.std,Math.sqrt(5));
});
test('GeoTIFF decoder reads real binary TIFF dimensions, CRS, transform, nodata and values',async()=>{
 const buffer=writeArrayBuffer([1,2,3,0],{width:2,height:2,ModelPixelScale:[10,10,0],ModelTiepoint:[0,0,0,500000,3200000,0],ProjectedCSTypeGeoKey:32643,GTModelTypeGeoKey:1,GDAL_NODATA:'0'});
 const result=await decodeTiff(new Blob([buffer as ArrayBuffer]));assert.equal(result.metadata.crs,'EPSG:32643');assert.deepEqual(result.metadata.resolution,[10,-10]);assert.deepEqual([...result.bands[0]],[1,2,3,0]);assert.deepEqual([...result.valid],[1,1,1,0]);assert.equal(result.metadata.units,'metres');
});

