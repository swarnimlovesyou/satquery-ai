# Constrained analysis implementation

This implementation is isolated on `feature/constrained-analysis`. The existing landing page stays on `main`; this branch has not been promoted to production.

## Local preview

Run `npm ci` then `npm run dev`. Open `/workspace`. Deterministic analysis and local evidence summaries work without a backend.

For external explanations, install `backend/requirements.txt` in a Python virtual environment, copy `backend/config.example` to `backend/.env`, and set `OPENROUTER_API_KEY`. Run `python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000`. Vite proxies `/api` locally. Automatic mode uses Ling Flash with a bounded free-only Laguna XS fallback; individual free model choices remain available. API keys stay server-side; only metadata, computed statistics and chat text are sent to OpenRouter.

Free-only protection: fixed `:free` model IDs, current catalog pricing validation, zero prompt/completion price caps, and no paid fallback. Quota/capacity errors remain visible and preserve computed results. Free endpoints can be unavailable; switching models does not guarantee capacity.

## Implemented

- Single-image and bitemporal workspaces, raster upload, zoom/pan, band composition, grayscale, masks, overlays, comparison slider, side-by-side, loss/gain and signed differences.
- GeoTIFF decoding with dimensions, bands, CRS, bounds, resolution, transform and nodata. Explicit spectral/SAR category and band mapping; scale/offset calibration.
- Per-band min/max/mean/standard deviation and 32-bin histograms.
- NDVI, NDWI, NDBI; explicitly labelled RGB screening proxies. SAR intensity statistics and thresholding, without semantic classification claims.
- Shared-grid comparison, CRS/extent checks, nearest-neighbour resampling, common valid-pixel denominator, optional morphological cleanup, before/after coverage, spatial loss/gain, percentage-point and relative changes. Area only when metre resolution is known.
- Deterministic task routing, local evidence explanations, optional FastAPI compatible-chat provider interface and bounded read-only evidence tools. JSON evidence export.

## Practical limits

The browser runs deterministic TypeScript in a worker, using geotiff.js for decoding; this implementation does not use OpenCV or Rasterio. Analysis grids are capped at 900 pixels on the longest side, so counts and fine features reflect that reduced grid. TIFF upload is capped at 150 MB, 16 bands and 60 million source band samples. Statistics are not full-resolution statistics.

No reprojection, automatic registration, atmospheric correction, cloud classification, per-band calibration coefficients, advanced SAR processing, learned building segmentation or scene captioning is added here. Unreferenced pairs produce a provisional same-extent visual comparison with an explicit unverified-alignment warning; no checkbox gate is used. False-colour sample composites are marked unknown, preventing automatic RGB land-cover estimates. Index thresholds and RGB proxies are screening methods, not validated classifications or confidence probabilities.

External provider transport is implemented. Ling returned live grounded explanations and follow-up answers through the browser with the updated key. See VERIFICATION.md for the latest test outcomes. Gateway guards are also tested with mocks. Static hosting alone supports the browser analysis and local explanations; external chat additionally needs the optional Python service routed at `/api`. No new deployment configuration has been applied to production.

## Verification

`npm test`, `npm run typecheck`, `npm run build`, and `python -m unittest backend.test_app`.

Tests cover index formulas, transitions, nodata, incompatible inputs, SAR, real binary TIFF decoding, missing provider configuration, evidence validation and read-only tool restrictions. Run `npm run test:e2e` with frontend/backend running for the complete repeatable browser matrix. See VERIFICATION.md for coverage and live-model failures.
