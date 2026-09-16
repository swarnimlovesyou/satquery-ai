import { decodeTiff } from './raster';
import { analyze } from './engine';
self.onmessage=async ({data})=>{try{const result=data.action==='decode'?await decodeTiff(data.file):analyze(data.a,data.b,data.options);self.postMessage({id:data.id,result});}catch(error){self.postMessage({id:data.id,error:error instanceof Error?error.message:'Analysis failed'});}};
