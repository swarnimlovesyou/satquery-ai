# SatQuery AI — SIH 26167 MVP

A static React + Vite satellite-imagery workspace for Smart India Hackathon. It uses deterministic TypeScript query routing and runs image analysis locally in a Web Worker. It needs no backend, database, account, API key, or paid service.

## Run

Requires Node.js 18+ (Node.js 22 recommended).

```sh
npm ci
npm run dev
```

## Build and deploy

```sh
npm run typecheck
npm test
npm run build
npx vercel --prod
```

Vite writes the static app to `dist/`. `vercel.json` configures the build and output folder. No environment variables are required.

## Working analysis flows

- **Query routing:** a deterministic TypeScript router detects water/flood, vegetation, temporal-change, and buildings/urban intent. Unsupported, ambiguous, and missing-pair queries return clear errors.
- **Temporal change:** both observations are resized to a shared comparison grid; the worker calculates absolute luminance or RGB difference, thresholds it, optionally applies 3×3 opening and closing, and measures the resulting mask.
- **Vegetation:** the bundled Delhi–Haryana sample applies the STAC reflectance scale and offset to co-registered Sentinel-2A B04 Red and B08 NIR values, excludes invalid Scene Classification Layer pixels, and calculates `NDVI = (NIR − Red) / (NIR + Red)` in the worker. A live threshold controls the dense-vegetation mask. Ordinary RGB uploads use an explicitly labelled Excess Green fallback.
- **Water:** configurable blue/red, blue/green, and minimum-blue relationships produce the water mask. This is identified as RGB estimation rather than NDWI.
- **Flood:** computes water masks for both dates and selects `after water AND NOT before water`.
- **Buildings:** an RGB built-up proxy is available immediately. A typed ONNX Runtime Web adapter accepts a user-selected semantic-segmentation model and runs it in the same worker.
- **Measurements:** every mask returns detected pixels, valid pixels, and coverage percentage. The Sentinel-2 sample uses its 10 m metadata for physical area; uploads can supply their own ground resolution.
- **Multispectral processing:** NDVI is active for the vegetation sample. A tested `computeNDWI(green, nir)` function provides the next calibrated-band entry point.

Every sample and uploaded image is processed when the user runs or adjusts an analysis. There are no stored result masks or hardcoded coverage statistics. The mask, colored overlay, before/after comparison, selected task, method, execution trace, and report are generated from that run.

## Inputs and limitations

The browser accepts rendered PNG, JPG, and WebP files up to 15 MB and 30 million decoded pixels. Paired inputs can have different pixel dimensions because both are resized to the second image’s grid, but the user must ensure that they show approximately the same registered area.

NDVI measures spectral greenness; it does not identify crop species or diagnose why vegetation is stressed. The bundled Sentinel-2 bands are resampled to a 900×527 analysis grid for a small static download, while area is scaled from the original 10 m crop dimensions. RGB water and built-up methods remain visual screening estimates. Weather, season, illumination, color rendering, and registration can affect results. Direct user-side GeoTIFF decoding, SAR fusion, and model validation remain future work.

## ONNX model contract

The optional adapter supports NCHW or NHWC RGB input, configurable input dimensions, ImageNet normalization defaults, and binary-score, class-label, or `[1,C,H,W]` multiclass outputs. The default building class is 1 and the default binary threshold is 0.5. ONNX Runtime Web and its WASM runtime are bundled with the static deployment; image and model bytes remain in the browser.

## Imagery provenance

- **Indus floodplain, Sindh, Pakistan:** Landsat 8/9 false-color imagery from 4 and 28 August 2022. NASA Earth Observatory / Joshua Stevens using Landsat / USGS data. Source: https://science.nasa.gov/earth/earth-observatory/devastating-floods-in-pakistan-150279/
- **Delhi NCR and Haryana vegetation:** Sentinel-2A Collection 1 Level-2A observation `S2A_T43RFM_20251126T053911_L2A`, acquired 26 November 2025. The sample bundles B04 Red, B08 NIR, SCL and true-color data from the public Earth Search catalog. Source: https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2A_T43RFM_20251126T053911_L2A
- **Delhi region, India:** Landsat 5/8 false-color imagery from 5 December 1989 and 5 June 2018. NASA Earth Observatory / Lauren Dauphin using Landsat / USGS data. Source: https://science.nasa.gov/earth/earth-observatory/urban-growth-of-new-delhi-92813/

The bundled images are compressed WebP presentation crops. Published labels remain in some source images and can influence RGB masks.

## Architecture

`Query → TypeScriptRouter → Raster/Band Validator → SCL quality mask → Web Worker → NDVI or specialist processor → CoverageCalculator → mask + overlay + report`

The same worker contract accepts calibrated spectral arrays, so direct Red/NIR uploads or browser-side GeoTIFF decoding can be added without changing the router or result UI.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

The test suite covers routing, rejected requests, paired change/flood calculations, RGB water and ExG masks, morphology, physical-area scaling, NDVI/NDWI math, and ONNX binary, label, and multiclass output decoding.
