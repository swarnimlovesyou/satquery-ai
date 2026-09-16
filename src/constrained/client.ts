import type { Dataset } from './engine';
export class Client{
 worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});id=0;
 pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 constructor(){this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(data.id);data.error?p.reject(new Error(data.error)):p.resolve(data.result);};this.worker.onerror=()=>this.cancel('Raster worker failed. Reload the workspace.');}
 cancel(message='Operation cancelled'){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(message));}this.pending.clear();this.worker.terminate();}
 request(payload:Record<string,unknown>):Promise<any>{return new Promise((resolve,reject)=>{const id=++this.id,timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Processing timed out. Try a smaller crop.'));},90000);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({...payload,id});});}
}
export async function decodeRgb(file:File):Promise<Dataset>{
 if(file.size>20*1024*1024)throw new Error('RGB uploads must be smaller than 20 MB.');
 const bitmap=await createImageBitmap(file);try{
 if(bitmap.width*bitmap.height>30000000)throw new Error('RGB image exceeds 30 million pixels.');
 const ratio=Math.min(1,900/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*ratio)),height=Math.max(1,Math.round(bitmap.height*ratio));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d')!;ctx.drawImage(bitmap,0,0,width,height);const pixels=ctx.getImageData(0,0,width,height).data;
 return {width,height,bands:[0,1,2].map(c=>Float32Array.from({length:width*height},(_,i)=>pixels[i*4+c])),valid:Uint8Array.from({length:width*height},(_,i)=>pixels[i*4+3]>0?1:0),metadata:{filename:file.name,width:bitmap.width,height:bitmap.height,bands:3,dataType:'uint8',crs:null,bounds:null,resolution:null,transform:null,nodata:null,bandInfo:[{DESCRIPTION:'red'},{DESCRIPTION:'green'},{DESCRIPTION:'blue'}],category:'rgb',units:'unknown'}};
 }finally{bitmap.close();}
}
