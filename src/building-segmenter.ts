import type { Raster } from './processing';
export interface BuildingModelConfig {inputWidth:number;inputHeight:number;layout:'NCHW'|'NHWC';mean:[number,number,number];std:[number,number,number];outputType:'binary'|'multiclass'|'labels';buildingClass:number;threshold:number}
export interface BuildingSegmenter {readonly ready:boolean;load(model:ArrayBuffer,config:Partial<BuildingModelConfig>):Promise<void>;segment(image:Raster):Promise<Uint8Array>;release():Promise<void>}
export const DEFAULT_BUILDING_CONFIG:BuildingModelConfig={inputWidth:256,inputHeight:256,layout:'NCHW',mean:[.485,.456,.406],std:[.229,.224,.225],outputType:'binary',buildingClass:1,threshold:.5};
function checkedConfig(input:Partial<BuildingModelConfig>):BuildingModelConfig{
 const c={...DEFAULT_BUILDING_CONFIG,...input};
 if(!Number.isInteger(c.inputWidth)||!Number.isInteger(c.inputHeight)||c.inputWidth<16||c.inputHeight<16||c.inputWidth*c.inputHeight>1048576)throw new Error('Model input dimensions must be integers from 16px up to one megapixel.');
 if(!['NCHW','NHWC'].includes(c.layout)||!['binary','multiclass','labels'].includes(c.outputType))throw new Error('Unsupported ONNX adapter configuration.');
 if(c.mean.length!==3||c.std.length!==3||c.std.some(v=>!Number.isFinite(v)||v===0)||c.mean.some(v=>!Number.isFinite(v))||!Number.isInteger(c.buildingClass)||c.buildingClass<0||!Number.isFinite(c.threshold))throw new Error('Invalid ONNX normalization or output configuration.');return c;
}
function resizeRGB(image:Raster,w:number,h:number,c:BuildingModelConfig):Float32Array{
 const out=new Float32Array(w*h*3);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.min(image.width-1,Math.floor((x+.5)*image.width/w)),sy=Math.min(image.height-1,Math.floor((y+.5)*image.height/h)),src=(sy*image.width+sx)*4,p=y*w+x;for(let ch=0;ch<3;ch++){const v=(image.data[src+ch]/255-c.mean[ch])/c.std[ch];out[c.layout==='NCHW'?ch*w*h+p:p*3+ch]=v;}}return out;
}
function resizeMask(mask:Uint8Array,sw:number,sh:number,dw:number,dh:number):Uint8Array{const out=new Uint8Array(dw*dh);for(let y=0;y<dh;y++)for(let x=0;x<dw;x++)out[y*dw+x]=mask[Math.min(sh-1,Math.floor((y+.5)*sh/dh))*sw+Math.min(sw-1,Math.floor((x+.5)*sw/dw))];return out;}
export function decodeSegmentation(data:ArrayLike<number>,dims:readonly number[],c:BuildingModelConfig):{mask:Uint8Array;width:number;height:number}{
 let height=c.inputHeight,width=c.inputWidth,classes=1,plane=width*height;
 if(c.outputType==='multiclass'){if(dims.length!==4||dims[0]!==1)throw new Error('Multiclass output must be [1,C,H,W].');classes=dims[1];height=dims[2];width=dims[3];plane=width*height;if(data.length!==classes*plane||c.buildingClass>=classes)throw new Error('Unexpected multiclass tensor shape.');const mask=new Uint8Array(plane);for(let p=0;p<plane;p++){let best=0,bestValue=-Infinity;for(let k=0;k<classes;k++){const v=Number(data[k*plane+p]);if(v>bestValue){bestValue=v;best=k;}}mask[p]=best===c.buildingClass?1:0;}return{mask,width,height};}
 if(dims.length===4){if(dims[0]!==1||dims[1]!==1)throw new Error('Binary output must have one channel.');height=dims[2];width=dims[3];}else if(dims.length===3){if(dims[0]!==1)throw new Error('Unexpected batch size.');height=dims[1];width=dims[2];}else if(dims.length===2){height=dims[0];width=dims[1];}else throw new Error('Unsupported model output rank.');
 plane=width*height;if(data.length!==plane)throw new Error('Unexpected model output size.');return{mask:Uint8Array.from(data,v=>c.outputType==='labels'?Number(v)===c.buildingClass?1:0:Number(v)>c.threshold?1:0),width,height};
}
export class OnnxBuildingSegmenter implements BuildingSegmenter{
 ready=false;private session:any;private ort:any;private config=DEFAULT_BUILDING_CONFIG;
 async load(model:ArrayBuffer,config:Partial<BuildingModelConfig>={}){if(model.byteLength<16||model.byteLength>200*1024*1024)throw new Error('Choose an ONNX model between 16 bytes and 200 MB.');this.config=checkedConfig(config);this.ort=await import('onnxruntime-web/wasm');this.ort.env.wasm.numThreads=1;this.ort.env.wasm.wasmPaths=new URL('/ort/',self.location.origin).href;await this.release();this.session=await this.ort.InferenceSession.create(new Uint8Array(model),{executionProviders:['wasm']});this.ready=true;}
 async segment(image:Raster){if(!this.ready||!this.session)throw new Error('Load a compatible ONNX segmentation model first.');const c=this.config,input=resizeRGB(image,c.inputWidth,c.inputHeight,c),dims=c.layout==='NCHW'?[1,3,c.inputHeight,c.inputWidth]:[1,c.inputHeight,c.inputWidth,3],name=this.session.inputNames[0],outputs=await this.session.run({[name]:new this.ort.Tensor('float32',input,dims)}),tensor=outputs[this.session.outputNames[0]];if(!tensor?.data||!tensor?.dims)throw new Error('The ONNX model returned no tensor output.');const decoded=decodeSegmentation(tensor.data,tensor.dims,c);return resizeMask(decoded.mask,decoded.width,decoded.height,image.width,image.height);}
 async release(){if(this.session?.release)await this.session.release();this.session=null;this.ready=false;}
}
