# SatQuery: image analysis workflow

1. Select a sample or upload PNG, JPEG, WebP or GeoTIFF imagery.
2. For a before/after pair, drag the divider directly over the image. Loading images only prepares the preview; it does not create a result.
3. Choose the supported analysis you want and click **Start analysis**.
4. Read the plain-language result computed from the pixels. Expand measurements for counts, thresholds, before/after coverage, loss/gain and physical area when known.
5. Click **Explain with free AI**, or type a follow-up and click **Ask**. Automatic mode uses Ling Flash with a free-only fallback. The response shows the actual model. Local summary is explicitly non-LLM.

## Samples and measurements

- Indus floodplain and Delhi urban expansion are real published Landsat false-colour composite pairs. They support visual change analysis. A changed-pixel percentage is not automatically a flooded-area or building-growth percentage.
- Delhi–Haryana uses real Sentinel-2 Red/NIR bands for NDVI. The default 0.2 cutoff estimates vegetation coverage. The preview is grayscale because these two analytical bands do not form a visible RGB image.
- Sample source links and acquisition dates are shown in the viewer. No generated image or hardcoded measurement is used as an application result.

## Uploads

Single images default to statistics, or vegetation when identified spectral bands support it. Pairs default to visual/intensity change. Only supported methods are offered. Unknown band names do not block basic statistics: expand metadata and assign documented band roles only when you want a spectral index. NDVI needs Red/NIR; NDWI Green/NIR; NDBI SWIR/NIR. For unlabelled radar data select SAR and its intensity band. Calibration must come from the data supplier.

Pairs without geographic metadata are provisional comparisons assuming the same area, orientation and crop; they are not automatically registered. Known incompatible CRS/extents are rejected. Large images are analysed on a reduced grid up to 900 pixels on the longest side.

## Controls

- **Before/after divider, opacity, zoom and display bands:** viewing only.
- **Task, threshold and noise cleanup:** affect the analysis. Changing these clears the previous result; click Start analysis again.
- **Masks/overlays:** actual selected pixels. Class loss/gain and generic visual change are different measurements.
- **Export evidence:** JSON with the computed results and metadata.
- **AI:** receives structured evidence, not the raster. It can explain and answer follow-ups but cannot infer unsupported land-cover facts. The deterministic result remains visible if the service fails.

## Local startup and verification

Run `npm run dev` and, in the configured Python environment, `python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000`. The ignored `backend/.env` holds the OpenRouter key. Free-only model IDs, catalog checks and zero-price caps prevent paid fallback.

`npm test`, `npm run typecheck`, `npm run build`, `python -m unittest backend.test_app`, and `npm run test:e2e` cover local functionality. `npm run test:live` additionally makes real free-model calls with the sample's actual measured evidence.
