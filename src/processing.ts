import type { AnalysisKind } from './router';
export interface Raster { data: Uint8ClampedArray; width: number; height: number }
export interface SpatialMetadata { metersPerSourcePixel: number; sourceWidth: number; sourceHeight: number; provenance: 'user-provided' | 'metadata' }
export interface SpectralBands { red: Uint16Array; nir: Uint16Array; classification?: Uint8Array; invalidClasses?: number[]; width: number; height: number; scale: number; offset: number; sensor: string }
export interface AnalysisSettings { changeThreshold: number; representation: 'luminance' | 'rgb'; exgThreshold: number; ndviThreshold: number; waterBlueRed: number; waterBlueGreen: number; waterMinBlue: number; morphology: boolean; buildingThreshold: number }
export const DEFAULT_SETTINGS: AnalysisSettings = {changeThreshold:30,representation:'luminance',exgThreshold:20,ndviThreshold:.55,waterBlueRed:1.18,waterBlueGreen:1.05,waterMinBlue:32,morphology:true,buildingThreshold:.5};
export const TOOLS = {
 water:{title:'Water estimation',name:'RGBWater',color:'#4cc8ff',rgb:[76,200,255],method:'RGB water estimation · configurable blue-channel relationships',label:'Estimated water pixels',metric:'Estimated water coverage'},
 flood:{title:'Flood change detection',name:'FloodDelta',color:'#4cc8ff',rgb:[76,200,255],method:'RGB water masks + newly covered pixel comparison',label:'New water-like pixels',metric:'Newly water-covered'},
 vegetation:{title:'Vegetation analysis',name:'VegetationIndex',color:'#b7f568',rgb:[183,245,104],method:'NDVI for calibrated Red/NIR bands · RGB Excess Green fallback',label:'Vegetation pixels',metric:'Vegetation coverage'},
 change:{title:'Temporal change detection',name:'TemporalDifference',color:'#ffb55c',rgb:[255,181,92],method:'Absolute luminance difference + threshold + morphological filtering',label:'Changed pixels',metric:'Changed coverage'},
 urban:{title:'Built-up area estimation',name:'RGBUrbanProxy',color:'#c4a0ff',rgb:[196,160,255],method:'RGB built-up color proxy · no building model loaded',label:'Built-up-like pixels',metric:'Estimated built-up coverage'},
};
export function waterPixel(r:number,g:number,b:number,s:AnalysisSettings):boolean {return b>r*s.waterBlueRed && b>g*s.waterBlueGreen && b>s.waterMinBlue;}
export function excessGreen(r:number,g:number,b:number):number {return 2*g-r-b;}
function validateRaster(r:Raster){if(!Number.isInteger(r.width)||!Number.isInteger(r.height)||r.width<1||r.height<1||r.data.length!==r.width*r.height*4)throw new Error('Invalid RGBA raster dimensions.');}
function morph(mask:Uint8Array,width:number,height:number,erode:boolean):Uint8Array{
 const out=new Uint8Array(mask.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let selected=erode?1:0;
  outer:for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const p=mask[Math.min(height-1,Math.max(0,y+dy))*width+Math.min(width-1,Math.max(0,x+dx))];
   if(erode&&!p){selected=0;break outer;}if(!erode&&p){selected=1;break outer;}
  }out[y*width+x]=selected;
 }return out;
}
/** Replicated borders preserve coverage for objects touching image boundaries. */
export function cleanMask(mask:Uint8Array,width:number,height:number):Uint8Array {
 const opened=morph(morph(mask,width,height,true),width,height,false);
 return morph(morph(opened,width,height,false),width,height,true);
}
export function quantify(mask:Uint8Array,width:number,height:number,valid?:Uint8Array,spatial?:SpatialMetadata){
 if(mask.length!==width*height || valid && valid.length!==mask.length)throw new Error('Invalid mask dimensions.');
 let pixels=0,total=0;const quadrants=[0,0,0,0];
 for(let p=0;p<mask.length;p++){if(valid&&!valid[p])continue;total++;if(mask[p]){pixels++;quadrants[(Math.floor(p/width)>=height/2?2:0)+(p%width>=width/2?1:0)]++;}}
 if(!total)throw new Error('No valid image pixels are available.');
 const region=pixels?['north-western','north-eastern','south-western','south-eastern'][quadrants.indexOf(Math.max(...quadrants))]:null;
 let areaM2:number|null=null;
 if(spatial){if(!Number.isFinite(spatial.metersPerSourcePixel)||spatial.metersPerSourcePixel<=0||spatial.sourceWidth<=0||spatial.sourceHeight<=0)throw new Error('Ground resolution must be a positive number.');areaM2=pixels*spatial.metersPerSourcePixel**2*(spatial.sourceWidth*spatial.sourceHeight)/(width*height);}
 return {pixels,total,width,height,coverage:Math.round(pixels/total*10000)/100,region,areaM2,areaKm2:areaM2===null?null:areaM2/1e6};
}
export function analyzePixels(a:Raster,b:Raster|null,kind:AnalysisKind,s:AnalysisSettings,spatial?:SpatialMetadata,buildingMask?:Uint8Array,spectral?:SpectralBands){
 validateRaster(a);if(b){validateRaster(b);if(a.width!==b.width||a.height!==b.height)throw new Error('Resize both observations to matching dimensions before analysis.');}
 if(['change','flood'].includes(kind)&&!b)throw new Error('A second image is required for temporal analysis.');
 for(const [key,value]of Object.entries(s))if(typeof value==='number'&&!Number.isFinite(value))throw new Error(`Invalid setting: ${key}`);
 const width=a.width,height=a.height,n=width*height,current=b||a,valid=new Uint8Array(n),raw=new Uint8Array(n),beforeRaw=new Uint8Array(n),afterRaw=new Uint8Array(n),useNdvi=kind==='vegetation'&&!!spectral;
 if(buildingMask&&buildingMask.length!==n)throw new Error('Building model mask dimensions do not match imagery.');
 if(spectral&&(spectral.width!==width||spectral.height!==height||spectral.red.length!==n||spectral.nir.length!==n||spectral.classification&&spectral.classification.length!==n))throw new Error('Spectral bands must match the normalized image grid.');
 const invalidClasses=new Set(spectral?.invalidClasses||[]);let ndviSum=0,ndviCount=0;
 for(let p=0;p<n;p++){
  const i=p*4,r=current.data[i],g=current.data[i+1],bl=current.data[i+2];
  valid[p]=current.data[i+3]>0&&(!['change','flood'].includes(kind)||a.data[i+3]>0)?1:0;
  beforeRaw[p]=a.data[i+3]>0&&waterPixel(a.data[i],a.data[i+1],a.data[i+2],s)?1:0;
  afterRaw[p]=current.data[i+3]>0&&waterPixel(r,g,bl,s)?1:0;
  if(!valid[p])continue;
  if(kind==='change'){
   const score=s.representation==='luminance'?Math.abs((.299*a.data[i]+.587*a.data[i+1]+.114*a.data[i+2])-(.299*r+.587*g+.114*bl)):(Math.abs(a.data[i]-r)+Math.abs(a.data[i+1]-g)+Math.abs(a.data[i+2]-bl))/3;
   raw[p]=score>s.changeThreshold?1:0;
  }else if(kind==='vegetation'&&useNdvi){
   const red=spectral!.red[p]*spectral!.scale+spectral!.offset,nir=spectral!.nir[p]*spectral!.scale+spectral!.offset,denominator=nir+red;
   if(spectral!.red[p]===0||spectral!.nir[p]===0||spectral!.classification&&invalidClasses.has(spectral!.classification[p])||!Number.isFinite(denominator)||denominator<=0){valid[p]=0;continue;}
   const ndvi=(nir-red)/denominator;ndviSum+=ndvi;ndviCount++;raw[p]=ndvi>s.ndviThreshold?1:0;
  }else if(kind==='vegetation')raw[p]=excessGreen(r,g,bl)>s.exgThreshold?1:0;
  else if(kind==='water')raw[p]=afterRaw[p];
  else if(kind==='urban'){
   const max=Math.max(r,g,bl),min=Math.min(r,g,bl);
   raw[p]=buildingMask?buildingMask[p]:((max>75&&max<230&&(max-min)/max<.19)||(r>g*1.12&&bl>g*1.08&&r>70&&bl>60))?1:0;
  }
 }
 const filter=(m:Uint8Array)=>s.morphology&&!useNdvi?cleanMask(m,width,height):m;
 const before=filter(beforeRaw),after=filter(afterRaw);
 if(kind==='flood')for(let p=0;p<n;p++)raw[p]=valid[p]&&after[p]&&!before[p]?1:0;
 const mask=kind==='flood'?raw:filter(raw);for(let p=0;p<n;p++)if(!valid[p])mask[p]=0;
 const stats=quantify(mask,width,height,valid,spatial);let beforeCount=0,afterCount=0,lostCount=0;
 for(let p=0;p<n;p++)if(valid[p]){beforeCount+=before[p];afterCount+=after[p];if(before[p]&&!after[p])lostCount++;}
 const pct=(v:number)=>Math.round(v/stats.total*10000)/100;
 const filtered=useNdvi?'not applied to the aggregated reflectance grid':s.morphology?'3×3 opening + closing':'disabled';
 const method=kind==='change'?`${s.representation==='luminance'?'Luminance':'RGB mean'} absolute difference > ${s.changeThreshold}; morphology: ${filtered}`:kind==='vegetation'&&useNdvi?`${spectral!.sensor} NDVI = (NIR − Red) / (NIR + Red) > ${s.ndviThreshold}; invalid SCL pixels excluded; morphology: ${filtered}`:kind==='vegetation'?`RGB Excess Green: 2G − R − B > ${s.exgThreshold}; morphology: ${filtered} (not NDVI)`:kind==='water'||kind==='flood'?`RGB water: B > ${s.waterBlueRed}R, B > ${s.waterBlueGreen}G, B > ${s.waterMinBlue}; morphology: ${filtered}${kind==='flood'?'; after water AND NOT before water':''}`:buildingMask?`ONNX semantic building segmentation; morphology: ${filtered}`:`RGB built-up color proxy; morphology: ${filtered} · no semantic model loaded`;
 return {binaryMask:mask,stats:{...stats,before:pct(beforeCount),after:pct(afterCount),lost:pct(lostCount),meanNdvi:useNdvi&&ndviCount?Math.round(ndviSum/ndviCount*1000)/1000:null},method,toolName:kind==='vegetation'&&useNdvi?'Sentinel2NDVI':kind==='urban'&&buildingMask?'ONNXBuildingSegmenter':TOOLS[kind].name,parameters:s,spatial:spatial||null,spectralMode:useNdvi?'ndvi':null};
}
export function colorizeMask(mask:Uint8Array,kind:AnalysisKind):Uint8ClampedArray{const out=new Uint8ClampedArray(mask.length*4),rgb=TOOLS[kind].rgb;for(let p=0;p<mask.length;p++)if(mask[p]){out.set(rgb,p*4);out[p*4+3]=255;}return out;}
export function binaryRGBA(mask:Uint8Array):Uint8ClampedArray{const out=new Uint8ClampedArray(mask.length*4);for(let p=0;p<mask.length;p++){const v=mask[p]?255:0;out.set([v,v,v,255],p*4);}return out;}
