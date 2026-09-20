import { cleanMask } from '../processing';

export type Category = 'rgb' | 'multispectral' | 'sar' | 'unknown';
export type Task = 'statistics' | 'vegetation' | 'water' | 'builtup' | 'change' | 'sar';
export interface Metadata {
 filename:string; width:number; height:number; bands:number; dataType:string; crs:string|null;
 bounds:number[]|null; resolution:number[]|null; transform:number[]|null; nodata:number|null;
 bandInfo:Record<string,unknown>[]; category:Category; units:string; source?:string;
}
export interface Dataset { metadata:Metadata; width:number; height:number; bands:Float32Array[]; valid:Uint8Array }
export interface Mapping { red:number; green:number; blue:number; nir:number; swir:number; intensity:number; scale:number; offset:number; category:Category }
export const defaultMapping:Mapping={red:0,green:1,blue:2,nir:-1,swir:-1,intensity:0,scale:1,offset:0,category:'rgb'};
export interface Options { task:Task; threshold:number; morphology:boolean; acceptUnreferenced:boolean; mappingA:Mapping; mappingB:Mapping }
export function statistics(values:Float32Array,valid:Uint8Array){
 let n=0,mean=0,m2=0,min=Infinity,max=-Infinity;
 for(let i=0;i<values.length;i++){const v=values[i];if(!valid[i]||!Number.isFinite(v))continue;n++;const d=v-mean;mean+=d/n;m2+=d*(v-mean);min=Math.min(min,v);max=Math.max(max,v);}
 const histogram=Array<number>(32).fill(0);
 if(n)for(let i=0;i<values.length;i++)if(valid[i]&&Number.isFinite(values[i]))histogram[max===min?0:Math.min(31,Math.floor((values[i]-min)/(max-min)*32))]++;
 return {count:n,min:n?min:null,max:n?max:null,mean:n?mean:null,std:n?Math.sqrt(m2/n):null,histogram};
}
export function resample(data:Dataset,width:number,height:number):Dataset{
 if(data.width===width&&data.height===height)return data;
 const sample=(array:ArrayLike<number>)=>Float32Array.from({length:width*height},(_,p)=>array[Math.min(data.height-1,Math.floor(Math.floor(p/width)*data.height/height))*data.width+Math.min(data.width-1,Math.floor((p%width)*data.width/width))]);
 return {...data,width,height,bands:data.bands.map(sample),valid:Uint8Array.from(sample(data.valid))};
}
export function compatibility(a:Dataset,b:Dataset,accepted=false){
 const x=a.metadata,y=b.metadata,warnings:string[]=[];
 if(x.crs&&y.crs&&x.crs!==y.crs)throw new Error('Incompatible CRS. Reproject and co-register the images before comparison.');
 if(x.bounds&&y.bounds&&x.crs&&y.crs){const tolerance=Math.max(...(x.resolution||[0]).map(Math.abs),...(y.resolution||[0]).map(Math.abs),1e-8);if(x.bounds.some((v,i)=>Math.abs(v-y.bounds![i])>tolerance))throw new Error('Geographic bounds differ. Crop both images to the same extent first.');}
 else {if(!accepted)throw new Error('Both images are loaded, but their geographic alignment cannot be verified. Tick the alignment confirmation beside the uploads, then run again.');warnings.push('Alignment was confirmed by the user; geographic correspondence cannot be verified.');}
 if(x.width!==y.width||x.height!==y.height)warnings.push('Dimensions differ: T1 is resampled to the T2 analysis grid using nearest-neighbour sampling.');
 if(x.bands!==y.bands)warnings.push('Band counts differ. Check that the selected band roles and units match.');
 if(x.resolution&&y.resolution&&x.resolution.some((v,i)=>Math.abs(v-y.resolution![i])>1e-8))warnings.push('Pixel resolutions differ; statistics use a shared reduced analysis grid.');
 return warnings;
}
function band(d:Dataset,index:number){if(!Number.isInteger(index)||index<0||index>=d.bands.length)throw new Error('Required band is missing. Set the band roles before running this analysis.');return d.bands[index];}
export function score(d:Dataset,m:Mapping,task:Task){
 if(!Number.isFinite(m.scale)||m.scale<=0||!Number.isFinite(m.offset))throw new Error('Band scale must be positive and offset must be finite.');
 let values:Float32Array,method:string;
 if(task==='sar'||(task==='statistics'&&m.category!=='rgb')){values=Float32Array.from(band(d,m.intensity),v=>v*m.scale+m.offset);method='Selected band intensity';}
 else if(m.category==='sar')throw new Error('SAR supports intensity statistics, intensity thresholding, and temporal intensity comparison only.');
 else if(['vegetation','water','builtup'].includes(task)&&m.category==='multispectral'){
  const positive=task==='vegetation'?m.nir:task==='water'?m.green:m.swir,negative=task==='vegetation'?m.red:m.nir;
  if(positive===negative)throw new Error('A spectral index requires two different bands.');
  const p=band(d,positive),n=band(d,negative);
  values=Float32Array.from(p,(v,i)=>{const a=v*m.scale+m.offset,b=n[i]*m.scale+m.offset,s=a+b;return !Number.isFinite(s)||Math.abs(s)<1e-8?NaN:(a-b)/s;});
  method=task==='vegetation'?'NDVI — (NIR − Red) / (NIR + Red)':task==='water'?'NDWI — (Green − NIR) / (Green + NIR)':'NDBI — (SWIR − NIR) / (SWIR + NIR)';
 }else {
  if(m.category!=='rgb')throw new Error('Select an input category and map its bands first.');
  const r=band(d,m.red),g=band(d,m.green),b=band(d,m.blue);
  if(task!=='statistics'&&[r,g,b].some(values=>values.some((v,i)=>d.valid[i]&&(v<0||v>255))))throw new Error('RGB screening requires 0–255 RGB values. Use multispectral mode for raw spectral data, or run raw-band statistics.');
  if(task==='vegetation'){values=Float32Array.from(g,(v,i)=>2*v-r[i]-b[i]);method='RGB Excess Green — 2G − R − B (not NDVI)';}
  else if(task==='water'){values=Float32Array.from(b,(v,i)=>Math.min(v/(Math.max(1,r[i])*1.18),v/(Math.max(1,g[i])*1.05),v/32));method='RGB blue-channel water score (not NDWI)';}
  else if(task==='builtup'){values=Float32Array.from(r,(v,i)=>{const hi=Math.max(v,g[i],b[i]),lo=Math.min(v,g[i],b[i]);return hi>75&&hi<230?1-(hi-lo)/hi:0;});method='RGB low-saturation built-up proxy (not building segmentation)';}
  else {values=Float32Array.from(r,(v,i)=>.299*v+.587*g[i]+.114*b[i]);method='RGB luminance — 0.299R + 0.587G + 0.114B';}
 }
 return {values,method};
}
export function analyze(a:Dataset,b:Dataset|null,o:Options){
 if(!Number.isFinite(o.threshold))throw new Error('Threshold must be a finite number.');
 if(o.task==='change'&&o.threshold<0)throw new Error('Change threshold cannot be negative.');
 if(o.task==='sar'&&(o.mappingA.category!=='sar'||(b&&o.mappingB.category!=='sar')))throw new Error('SAR intensity analysis requires SAR inputs. Set the input category first.');
 if(o.task==='change'&&!b)throw new Error('Change detection requires T1 and T2.');
 const warnings=b?compatibility(a,b,o.acceptUnreferenced):[];
 if(b&&o.mappingA.category!==o.mappingB.category)throw new Error('Temporal analysis requires matching input categories; optical/SAR fusion is outside this MVP.');
 const current=b||a,first=resample(a,current.width,current.height),n=current.width*current.height;
 const task=o.task==='change'?'statistics':o.task;
 const s1=score(first,o.mappingA,task),s2=b?score(current,o.mappingB,task):s1;
 if(s1.method!==s2.method)throw new Error('Use the same analysis method at both dates.');
 const valid=Uint8Array.from(current.valid,(v,i)=>v&&first.valid[i]&&Number.isFinite(s1.values[i])&&Number.isFinite(s2.values[i])?1:0);
 const total=valid.reduce((s,v)=>s+v,0);if(!total)throw new Error('No common valid pixels are available. Check nodata and selected bands.');
 const difference=Float32Array.from(s2.values,(v,i)=>valid[i]?v-s1.values[i]:NaN);
 const filtered=(mask:Uint8Array)=>{const out=o.morphology?cleanMask(mask,current.width,current.height):mask;for(let i=0;i<n;i++)if(!valid[i])out[i]=0;return out;};
 const t1=filtered(Uint8Array.from(s1.values,(v,i)=>valid[i]&&v>o.threshold?1:0)),t2=filtered(Uint8Array.from(s2.values,(v,i)=>valid[i]&&v>o.threshold?1:0));
 const lost=Uint8Array.from(t1,(v,i)=>v&&!t2[i]?1:0),gained=Uint8Array.from(t2,(v,i)=>v&&!t1[i]?1:0);
 const change=filtered(Uint8Array.from(difference,(v,i)=>valid[i]&&Math.abs(v)>o.threshold?1:0));
 const mask=o.task==='statistics'?null:o.task==='change'?change:b?Uint8Array.from(lost,(v,i)=>v||gained[i]?1:0):t2;
 const count=(mask:Uint8Array)=>mask.reduce((s,v)=>s+v,0),pct=(v:number)=>Math.round(v/total*10000)/100;
 const before=count(t1),after=count(t2),detected=mask?count(mask):0;
 const quadrants=[0,0,0,0];if(mask)for(let i=0;i<n;i++)if(mask[i])quadrants[(Math.floor(i/current.width)>=current.height/2?2:0)+(i%current.width>=current.width/2?1:0)]++;
 const meta=current.metadata;const areaPerPixel=meta.units==='metres'&&meta.resolution?Math.abs(meta.resolution[0]*meta.resolution[1])*meta.width*meta.height/n:null;
 const stats1=statistics(s1.values,valid),stats2=statistics(s2.values,valid);
 if(o.mappingA.category==='rgb')warnings.push('RGB masks are visual screening estimates; colour rendering, shadows, soil and season can affect them.');
 if(b)warnings.push('Measured change alone does not establish cause. No automatic registration or atmospheric correction is applied.');
 const veg=(values:Float32Array)=>({lowCoverage:pct(values.reduce((s,v,i)=>s+(valid[i]&&v>.2&&v<=.55?1:0),0)),highCoverage:pct(values.reduce((s,v,i)=>s+(valid[i]&&v>.55?1:0),0))});
 const summary={mode:b?'bitemporal':'single',task:o.task,method:o.task==='change'?`Absolute difference of ${s2.method}`:s2.method,threshold:o.threshold,morphology:o.morphology,grid:{width:current.width,height:current.height},totalPixels:total,detectedPixels:mask?detected:null,unchangedPixels:mask?total-detected:null,coverage:mask?pct(detected):null,beforeCoverage:b&&o.task!=='statistics'&&o.task!=='change'?pct(before):null,afterCoverage:b&&o.task!=='statistics'&&o.task!=='change'?pct(after):null,netPercentagePoints:b&&o.task!=='change'&&o.task!=='statistics'?pct(after)-pct(before):null,relativePercent:b&&before&&o.task!=='change'&&o.task!=='statistics'?(after-before)/before*100:null,lostCoverage:b&&o.task!=='change'&&o.task!=='statistics'?pct(count(lost)):null,gainedCoverage:b&&o.task!=='change'&&o.task!=='statistics'?pct(count(gained)):null,meanDifference:b&&stats1.mean!==null&&stats2.mean!==null?stats2.mean-stats1.mean:null,areaM2:mask&&areaPerPixel?detected*areaPerPixel:null,largestQuadrant:detected?['upper-left','upper-right','lower-left','lower-right'][quadrants.indexOf(Math.max(...quadrants))]:null,statisticsBefore:stats1,statisticsAfter:stats2,ndviClasses:o.task==='vegetation'&&o.mappingA.category==='multispectral'?{before:veg(s1.values),after:veg(s2.values)}:null,confidence:'Not calibrated; thresholds are deterministic, not model probabilities.',warnings};
 return {summary,mask,before:t1,after:t2,lost,gained,difference};
}

