import {fromUrl} from 'geotiff';
import proj4 from 'proj4';
import {writeFile,mkdir} from 'node:fs/promises';
const root='https://e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com/sentinel-2-c1-l2a/43/R/FM/2025/11/S2A_T43RFM_20251126T053911_L2A/';
const urls={red:root+'B04.tif',nir:root+'B08.tif',scl:root+'SCL.tif',visual:root+'TCI.tif'};
const ll=[76.30,28.35,77.145,28.78];
const utm='+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs';
const corners=[[ll[0],ll[1]],[ll[0],ll[3]],[ll[2],ll[1]],[ll[2],ll[3]]].map(p=>proj4('EPSG:4326',utm,p));
const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),bbox=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
const sourceWidth=Math.round((bbox[2]-bbox[0])/10),sourceHeight=Math.round((bbox[3]-bbox[1])/10),width=900,height=Math.round(width*(bbox[3]-bbox[1])/(bbox[2]-bbox[0]));
async function read(url,method='bilinear',interleave=false){const t=await fromUrl(url,{blockSize:16*1024*1024,cacheSize:32});const image=await t.getImage();return image.readRasters({bbox,width,height,resampleMethod:method,interleave});}
console.log({ll,bbox,sourceWidth,sourceHeight,width,height});
const redBands=await read(urls.red);console.log('red ready');
const nirBands=await read(urls.nir);console.log('nir ready');
const sclBands=await read(urls.scl,'nearest');console.log('scl ready');
const visual=await read(urls.visual,'bilinear',true);console.log('visual ready');
const red=redBands[0],nir=nirBands[0],scl=sclBands[0];
await mkdir('public/scenes',{recursive:true});
await writeFile('public/scenes/delhi-s2-red.u16',Buffer.from(red.buffer,red.byteOffset,red.byteLength));
await writeFile('public/scenes/delhi-s2-nir.u16',Buffer.from(nir.buffer,nir.byteOffset,nir.byteLength));
await writeFile('public/scenes/delhi-s2-scl.u8',Buffer.from(scl.buffer,scl.byteOffset,scl.byteLength));
const header=Buffer.from(`P6\n${width} ${height}\n255\n`);await writeFile('public/scenes/delhi-s2-visual.ppm',Buffer.concat([header,Buffer.from(visual.buffer,visual.byteOffset,visual.byteLength)]));
const invalid=new Set([0,1,3,7,8,9,10,11]);
for(const threshold of [.2,.25,.3,.35,.4,.45,.5]){let valid=0,selected=0,ref=0,intersection=0,union=0,sum=0;for(let i=0;i<red.length;i++){if(invalid.has(scl[i]))continue;const r=red[i]*.0001-.1,n=nir[i]*.0001-.1,d=n+r;if(!(d>0))continue;const v=(n-r)/d,isV=scl[i]===4,isS=v>threshold;valid++;sum+=v;selected+=isS;ref+=isV;intersection+=isS&&isV;union+=isS||isV;}console.log({threshold,valid,coverage:+(selected/valid*100).toFixed(2),sclVegetation:+(ref/valid*100).toFixed(2),meanNDVI:+(sum/valid).toFixed(3),iou:+(intersection/union).toFixed(3)});}
const metadata={id:'S2A_T43RFM_20251126T053911_L2A',datetime:'2025-11-26T05:41:23.947Z',cloudCover:0.00006,bboxWgs84:ll,bboxUtm43N:bbox,width,height,sourceWidth,sourceHeight,metersPerSourcePixel:10,scale:.0001,offset:-.1,invalidScl:[0,1,3,7,8,9,10,11],assets:{red:'/scenes/delhi-s2-red.u16',nir:'/scenes/delhi-s2-nir.u16',validity:'/scenes/delhi-s2-scl.u8'},source:'https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2A_T43RFM_20251126T053911_L2A'};
await writeFile('public/scenes/delhi-s2-metadata.json',JSON.stringify(metadata,null,2)+'\n');
