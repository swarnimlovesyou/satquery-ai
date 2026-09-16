import {fromUrl} from 'geotiff';
const url='https://e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com/sentinel-2-c1-l2a/43/R/FM/2025/11/S2A_T43RFM_20251126T053911_L2A/TCI.tif';
const t=await fromUrl(url);const i=await t.getImage();console.log({w:i.getWidth(),h:i.getHeight(),bbox:i.getBoundingBox(),origin:i.getOrigin(),resolution:i.getResolution(),samples:i.getSamplesPerPixel(),geo:i.getGeoKeys()});
