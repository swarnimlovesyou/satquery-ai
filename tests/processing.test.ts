import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzePixels,cleanMask,DEFAULT_SETTINGS,excessGreen,waterPixel} from '../src/processing.ts';
const rgba=(pixels:number[][])=>new Uint8ClampedArray(pixels.flatMap(p=>[...p,255]));
const raster=(pixels:number[][],width:number)=>({data:rgba(pixels),width,height:pixels.length/width});

test('RGB vegetation applies the exact Excess Green formula and returns measured counts',()=>{
 assert.equal(excessGreen(20,100,30),150);
 const out=analyzePixels(raster([[20,100,30],[100,80,90]],2),null,'vegetation',{...DEFAULT_SETTINGS,morphology:false,exgThreshold:20});
 assert.equal(out.stats.pixels,1);assert.equal(out.stats.total,2);assert.equal(out.stats.coverage,50);
 assert.match(out.method,/not NDVI/);
});

test('Sentinel-style Red/NIR reflectance uses NDVI and excludes invalid SCL pixels',()=>{
 const image=raster([[80,80,80],[80,80,80],[80,80,80]],3),settings={...DEFAULT_SETTINGS,morphology:false,ndviThreshold:.55};
 const spectral={red:new Uint16Array([2000,3000,2000]),nir:new Uint16Array([6000,4000,6000]),classification:new Uint8Array([4,5,9]),invalidClasses:[0,1,3,7,8,9,10,11],width:3,height:1,scale:.0001,offset:-.1,sensor:'Sentinel-2'};
 const out=analyzePixels(image,null,'vegetation',settings,undefined,undefined,spectral);
 assert.equal(out.spectralMode,'ndvi');assert.equal(out.toolName,'Sentinel2NDVI');
 assert.deepEqual([out.stats.pixels,out.stats.total,out.stats.coverage],[1,2,50]);
 assert.equal(out.stats.meanNdvi,.433);assert.match(out.method,/NDVI/);assert.match(out.method,/invalid SCL pixels excluded/);
});

test('RGB water thresholds are configurable and quantified from the pixels',()=>{
 const settings={...DEFAULT_SETTINGS,morphology:false,waterBlueRed:1.2,waterBlueGreen:1.1,waterMinBlue:40};
 assert.equal(waterPixel(20,30,100,settings),true);assert.equal(waterPixel(80,80,85,settings),false);
 const out=analyzePixels(raster([[20,30,100],[80,80,85]],2),null,'water',settings);
 assert.deepEqual([out.stats.pixels,out.stats.total,out.stats.coverage],[1,2,50]);
});

test('temporal change and new water use real paired-pixel calculations',()=>{
 const dry=[130,120,80],wet=[20,50,160],settings={...DEFAULT_SETTINGS,morphology:false,changeThreshold:10};
 const a=raster([wet,dry,dry,dry],2),b=raster([dry,wet,wet,dry],2);
 const flood=analyzePixels(a,b,'flood',settings);
 assert.deepEqual([flood.stats.before,flood.stats.after,flood.stats.coverage,flood.stats.lost],[25,50,50,25]);
 assert.equal(flood.stats.pixels,2);
 const identical=analyzePixels(a,a,'change',settings);assert.equal(identical.stats.coverage,0);
 assert.throws(()=>analyzePixels(a,null,'change',settings),/second image/);
});

test('morphological opening removes isolated noise and preserves solid regions',()=>{
 const impulse=new Uint8Array(25);impulse[12]=1;assert.equal(cleanMask(impulse,5,5).some(Boolean),false);
 const solid=new Uint8Array(25).fill(1);assert.equal(cleanMask(solid,5,5).every(Boolean),true);
});

test('physical area respects source resolution and processed-grid scale',()=>{
 const out=analyzePixels(raster([[20,100,20],[20,100,20]],2),null,'vegetation',{...DEFAULT_SETTINGS,morphology:false},{metersPerSourcePixel:10,sourceWidth:4,sourceHeight:2,provenance:'user-provided'});
 assert.equal(out.stats.areaM2,800);assert.equal(out.stats.areaKm2,0.0008);
});
