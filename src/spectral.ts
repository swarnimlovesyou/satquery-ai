/** Future calibrated-band entry point. Bands must share a grid and units. */
export function normalizedDifference(positive:Float32Array,negative:Float32Array):Float32Array{
 if(positive.length!==negative.length)throw new Error('Spectral bands must have matching dimensions.');
 const out=new Float32Array(positive.length);
 for(let i=0;i<out.length;i++){const sum=positive[i]+negative[i];out[i]=!Number.isFinite(sum)||Math.abs(sum)<1e-8||!Number.isFinite(positive[i])||!Number.isFinite(negative[i])?NaN:(positive[i]-negative[i])/sum;}
 return out;
}
export const computeNDVI=(red:Float32Array,nir:Float32Array)=>normalizedDifference(nir,red);
export const computeNDWI=(green:Float32Array,nir:Float32Array)=>normalizedDifference(green,nir);
export function thresholdIndex(values:Float32Array,threshold:number):Uint8Array{return Uint8Array.from(values,v=>Number.isFinite(v)&&v>threshold?1:0);}
