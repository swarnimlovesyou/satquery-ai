/// <reference lib="webworker" />
import { analyzePixels,colorizeMask,binaryRGBA,type Raster,type AnalysisSettings,type SpatialMetadata,type SpectralBands } from './processing';
import type { AnalysisKind } from './router';
import {OnnxBuildingSegmenter,type BuildingModelConfig} from './building-segmenter';
const segmenter=new OnnxBuildingSegmenter();
type Request={id:number,type:'analyze',a:Raster,b:Raster|null,kind:AnalysisKind,settings:AnalysisSettings,spatial?:SpatialMetadata,spectral?:SpectralBands}|{id:number,type:'load-model',model:ArrayBuffer,config:Partial<BuildingModelConfig>}|{id:number,type:'release-model'};
self.onmessage=async({data}:MessageEvent<Request>)=>{const respond=(payload:any,transfer:Transferable[]=[])=>self.postMessage({id:data.id,...payload},transfer);try{
 if(data.type==='load-model'){await segmenter.load(data.model,data.config);respond({ok:true,result:{ready:true}});return;}
 if(data.type==='release-model'){await segmenter.release();respond({ok:true,result:{ready:false}});return;}
 respond({progress:'Computing pixel scores'});let buildingMask:Uint8Array|undefined;if(data.kind==='urban'&&segmenter.ready){respond({progress:'Running ONNX building segmentation'});buildingMask=await segmenter.segment(data.b||data.a);}
 const result=analyzePixels(data.a,data.b,data.kind,data.settings,data.spatial,buildingMask,data.spectral),{binaryMask,...metrics}=result;const overlay=colorizeMask(binaryMask,data.kind),binary=binaryRGBA(binaryMask);respond({ok:true,result:{...metrics,overlay:overlay.buffer,binary:binary.buffer,modelUsed:!!buildingMask}},[overlay.buffer,binary.buffer]);
 }catch(error){respond({ok:false,error:error instanceof Error?error.message:String(error)});}};
