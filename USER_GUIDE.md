# SatQuery: quick start

1. Open http://127.0.0.1:5173/workspace.
2. Click **Indus floodplain**, **Delhi–Haryana cropland**, or **Delhi urban expansion**.
3. Read **Analysis ready**. The images, mode, method and default threshold are selected and calculated automatically. No alignment checkbox or band setup is needed for these demos.
4. Click **Explain with free AI** if you want a model explanation. Analysis is already complete, even if the free model is unavailable. Choose **Local summary** at the top to use the deterministic explanation instead.

## Which demo?

- **Indus floodplain / Delhi urban expansion:** visual before/after change in published false-colour pictures. This measures changed pixels, not verified flood area or building growth. The visible warning identifies unverified geographic alignment.
- **Delhi–Haryana cropland:** actual Sentinel-2 Red/NIR NDVI. The two analytical bands produce a grayscale preview with an overlay; they are not three visible RGB bands.

## Your own files

Upload one image for automatic statistics (or NDVI when Red/NIR are identified). For two dates, select **Bitemporal** and upload both. Comparison runs when both files are present. Unreferenced pairs are compared under an explicitly labelled same-extent assumption; they are not automatically registered. Known incompatible CRS/extents are rejected.

**Explore another analysis** only offers methods supported by the current inputs. Changing the task automatically runs it. Unlabelled GeoTIFFs show statistics immediately. To unlock spectral indices, expand metadata → advanced band mapping and assign bands from the supplier documentation: Red/NIR for NDVI, Green/NIR for NDWI, SWIR/NIR for NDBI. Missing wavelengths are never guessed. Select SAR for an unlabelled radar image and choose its intensity band. Scale/offset must match the data calibration.

## Optional controls

| Control | What it changes |
| --- | --- |
| Visible layer | Original, mask, overlay, before/after, loss/gain, or signed difference |
| RGB / grayscale | Display only; RGB is disabled without three mapped display bands |
| Comparison slider / opacity | Display only, not the calculated result |
| Zoom / pan | View only; it does not select a new analysis region |
| Sensitivity / noise cleanup | Selected pixels and coverage; click **Recompute** after adjusting |
| All measurements | Coverage, counts, means, before/after, percentage-point change, spatial loss/gain |
| Export evidence | Download measurements and metadata as JSON |

Masks and statistics use a reduced grid of up to 900 pixels on the longest side. Coverage is a pixel percentage, not water depth. Model explanations may contain mistakes; computed evidence stays visible.

## AI status

**Explain with free AI** and **Ask** send structured measurements and metadata, not raster pixels. **Local summary** sends no AI request. Gateway status and request progress are separate. Free quota, timeout or provider errors preserve analysis; no paid fallback is enabled.

Local startup: `npm run dev` plus `python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000` in a Python environment with `backend/requirements.txt` installed. API credentials remain in ignored `backend/.env`.
