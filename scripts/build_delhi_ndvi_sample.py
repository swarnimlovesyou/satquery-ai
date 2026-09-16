import sys, json
from pathlib import Path
sys.path.insert(0,r'C:\Users\SWARNIM\Documents\Codex\2026-09-15\fo\work\pydeps')
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds
from rasterio.enums import Resampling
root='https://e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com/sentinel-2-c1-l2a/43/R/FM/2025/11/S2A_T43RFM_20251126T053911_L2A/'
urls={'red':root+'B04.tif','nir':root+'B08.tif','scl':root+'SCL.tif','visual':root+'TCI.tif'}
ll=[76.30,28.35,77.145,28.78]
width=900
opts={'GDAL_DISABLE_READDIR_ON_OPEN':'EMPTY_DIR','CPL_VSIL_CURL_ALLOWED_EXTENSIONS':'.tif','GDAL_HTTP_MULTIRANGE':'YES','GDAL_HTTP_MERGE_CONSECUTIVE_RANGES':'YES'}
def read(url,resampling):
 with rasterio.Env(**opts):
  with rasterio.open(url) as src:
   bounds=transform_bounds('EPSG:4326',src.crs,*ll,densify_pts=21)
   window=from_bounds(*bounds,transform=src.transform).round_offsets().round_lengths()
   h=max(1,round(width*window.height/window.width))
   data=src.read(window=window,out_shape=(src.count,h,width),resampling=resampling)
   return data,window,bounds,src.crs.to_string()
red,window,bounds,crs=read(urls['red'],Resampling.bilinear);print('red ready',red.shape,flush=True)
nir,_,_,_=read(urls['nir'],Resampling.bilinear);print('nir ready',flush=True)
scl,_,_,_=read(urls['scl'],Resampling.nearest);print('scl ready',flush=True)
visual,_,_,_=read(urls['visual'],Resampling.bilinear);print('visual ready',visual.shape,flush=True)
red=red[0].astype(np.uint16);nir=nir[0].astype(np.uint16);scl=scl[0].astype(np.uint8);height=red.shape[0]
out=Path('public/scenes');out.mkdir(parents=True,exist_ok=True)
(out/'delhi-s2-red.u16').write_bytes(red.astype('<u2',copy=False).tobytes())
(out/'delhi-s2-nir.u16').write_bytes(nir.astype('<u2',copy=False).tobytes())
(out/'delhi-s2-scl.u8').write_bytes(scl.tobytes())
rgb=np.transpose(visual[:3],(1,2,0)).astype(np.uint8);(out/'delhi-s2-visual.ppm').write_bytes(f'P6\n{width} {height}\n255\n'.encode()+rgb.tobytes())
invalid=np.isin(scl,[0,1,3,7,8,9,10,11]);r=red*.0001-.1;n=nir*.0001-.1;den=n+r;valid=(~invalid)&(den>0);ndvi=np.divide(n-r,den,out=np.full_like(den,np.nan),where=valid)
for t in [.2,.25,.3,.35,.4,.45,.5]:
 selected=valid&(ndvi>t);ref=valid&(scl==4);inter=np.count_nonzero(selected&ref);union=np.count_nonzero(selected|ref)
 print({'threshold':t,'valid':int(valid.sum()),'coverage':round(selected.sum()/valid.sum()*100,2),'sclVegetation':round(ref.sum()/valid.sum()*100,2),'meanNDVI':round(float(np.nanmean(ndvi)),3),'iou':round(inter/union,3)},flush=True)
metadata={'id':'S2A_T43RFM_20251126T053911_L2A','datetime':'2025-11-26T05:41:23.947Z','cloudCover':0.00006,'bboxWgs84':ll,'bboxProjected':bounds,'crs':crs,'width':width,'height':height,'sourceWidth':int(window.width),'sourceHeight':int(window.height),'metersPerSourcePixel':10,'scale':.0001,'offset':-.1,'invalidScl':[0,1,3,7,8,9,10,11],'assets':{'red':'/scenes/delhi-s2-red.u16','nir':'/scenes/delhi-s2-nir.u16','validity':'/scenes/delhi-s2-scl.u8'},'source':'https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2A_T43RFM_20251126T053911_L2A'}
(out/'delhi-s2-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
