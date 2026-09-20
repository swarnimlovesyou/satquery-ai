import { fromArrayBuffer } from 'geotiff';
import { defaultMapping, statistics } from './engine';
import type { Dataset, Mapping } from './engine';

export async function decodeTiff(file:Blob & {name?:string}):Promise<Dataset>{
 if(file.size>150*1024*1024)throw new Error('Use a GeoTIFF smaller than 150 MB. Crop large scenes first.');
 const tiff=await fromArrayBuffer(await file.arrayBuffer()),image=await tiff.getImage(),width=image.getWidth(),height=image.getHeight(),count=image.getSamplesPerPixel();
 if(count>16||width*height*count>60000000)throw new Error('This raster exceeds the local decoder limit (16 bands or 60 million band samples). Crop it first.');
 const directory=image.getFileDirectory(),geo=image.getGeoKeys()||{},nodata=image.getGDALNoData();
 const matrix=await directory.loadValue('ModelTransformation');
 if(matrix&&(matrix[1]!==0||matrix[4]!==0))throw new Error('Rotated GeoTIFFs require rectification before this north-up viewer can display them.');
 let bounds:number[]|null=null,resolution:number[]|null=null,transform:number[]|null=null;
 try{bounds=image.getBoundingBox();resolution=image.getResolution().slice(0,2);const origin=image.getOrigin();transform=[resolution[0],0,origin[0],0,resolution[1],origin[1]];}catch{/* A plain TIFF may have no georeferencing. */}
 const epsg=geo.ProjectedCSTypeGeoKey||geo.GeographicTypeGeoKey,crs=epsg&&epsg!==32767?`EPSG:${epsg}`:null;
 const unit=geo.ProjLinearUnitsGeoKey===9001||(epsg>=32601&&epsg<=32760)?'metres':geo.GTModelTypeGeoKey===2?'degrees':'unknown';
 const ratio=Math.min(1,900/Math.max(width,height)),w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
 const raw=await image.readRasters({width:w,height:h,resampleMethod:'nearest',interleave:false});
 const bands=Array.from({length:count},(_,i)=>Float32Array.from(raw[i] as ArrayLike<number>));
 const valid=Uint8Array.from({length:w*h},(_,i)=>bands.every(b=>Number.isFinite(b[i])&&(nodata===null||b[i]!==nodata))?1:0);
 const bandInfo=await Promise.all(bands.map(async(_,i)=>await image.getGDALMetadata(i)||{}));
 const bits=directory.getValue('BitsPerSample'),format=directory.getValue('SampleFormat');
 const isRGB=directory.getValue('PhotometricInterpretation')===2;
 return {width:w,height:h,bands,valid,metadata:{filename:file.name||'GeoTIFF',width,height,bands:count,dataType:`${Array.from(bits||[8]).join('/')} bit; sample format ${Array.from(format||[1]).join('/')}`,crs,bounds,resolution,transform,nodata,bandInfo,category:isRGB&&count===3?'rgb':count>3?'multispectral':'unknown',units:unit}};
}
export function inferMapping(d:Dataset):Mapping{
 const m={...defaultMapping,category:d.metadata.category,green:d.bands.length>1?1:0,blue:d.bands.length>2?2:0};
 const roles=['red','green','blue','nir','swir'] as const;
 d.metadata.bandInfo.forEach((info,i)=>{const text=String(info.DESCRIPTION||info.description||info.name||'').toLowerCase();for(const role of roles)if(new RegExp(`\\b${role}\\b`).test(text))m[role]=i;});
 const descriptions=d.metadata.bandInfo.map(info=>JSON.stringify(info)).join(' ').toLowerCase();
 if(/\b(vv|vh|hh|hv|sigma0|sigma nought|backscatter)\b/.test(descriptions))m.category='sar';
 else if(m.nir>=0||m.swir>=0)m.category='multispectral';
 return m;
}
export function renderRaster(d:Dataset,m:Mapping,display:'rgb'|'band'='rgb',selected=0):Uint8ClampedArray{
 const indices=display==='band'||m.category==='sar'||m.category==='unknown'?[selected,selected,selected]:[m.red,m.green,m.blue];
 if(indices.some(i=>i<0||i>=d.bands.length))throw new Error('Choose existing display bands.');
 const ranges=indices.map(i=>statistics(d.bands[i],d.valid));
 const nativeRgb=d.metadata.category==='rgb'&&d.metadata.dataType==='uint8';
 const out=new Uint8ClampedArray(d.width*d.height*4);
 for(let p=0;p<d.valid.length;p++){for(let c=0;c<3;c++){const v=d.bands[indices[c]][p],{min,max}=ranges[c];out[p*4+c]=nativeRgb?v:min===null||max===null||max===min?127:(v-min)/(max-min)*255;}out[p*4+3]=d.valid[p]?255:0;}
 return out;
}

