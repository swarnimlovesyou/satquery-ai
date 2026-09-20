# Using SatQuery

## First successful run

1. Open http://127.0.0.1:5173/workspace.
2. At the top, select **Nemotron · free**, not **Local summary**. Check that the chat panel says **Gateway connected · free models configured**. If it says offline, click **Retry connection** after starting the backend.
3. In **Or explore real data**, select **Delhi–Haryana cropland**. This loads real Red and NIR bands and selects Vegetation for you. Its grayscale preview is expected: this sample contains two analytical bands, not three visible-colour bands.
4. Click **Run analysis**. This calculates NDVI locally; it does not call AI.
5. Type **Explain this result** in the chat and click **Ask**. Watch the status move from checking evidence to sending evidence to AI response received. The response identifies the actual model; a local summary explicitly says no AI request.
6. Read the computed evidence alongside the model's explanation. Model wording can be wrong; the measured values are the reference.

## Comparing two images

Choose **Bitemporal**, upload **T1 — Before** and **T2 — After** covering the same aligned area, and confirm alignment if geographic metadata is missing. Loading both files does not prove they line up.

Choose **Visual / intensity change** for general pixel differences. For vegetation loss/gain, choose **Vegetation** instead: it measures coverage at both dates and compares the masks. Select the same category and corresponding bands for both dates. Run analysis, then ask for an explanation.

The **Indus floodplain** sample is a published false-colour composite pair. Use it for visual change demonstration. Its visible colours are not true Red/Green/Blue reflectance, so RGB vegetation/water estimates and NDVI are not appropriate. General pixel change does not measure flooded area or water elevation.

## What each control does

| Control | Effect |
| --- | --- |
| Single image / Bitemporal | One-date measurements / two-date comparison |
| Task | Chooses the calculation |
| Threshold | Cutoff deciding which pixels count; rerun after changing it |
| Noise cleanup | Removes small mask regions; changes the measured coverage |
| RGB / Grayscale | Changes the displayed picture, not the analytical bands |
| Visible layer | Shows original, mask, overlay, comparison, or change layers |
| Before/after slider | Reveals the pictures; does not calculate change |
| Opacity | Changes mask visibility only |
| Zoom / pan | Inspects the picture; does not change the analysis region |
| Export evidence | Downloads measured results and metadata as JSON |
| Model selector | Selects an external free model or a local non-AI summary |

## Uploaded GeoTIFFs

Metadata is read automatically. If the bands are unnamed, confirm their roles using the supplier's documentation. NDVI requires Red + NIR; NDWI requires Green + NIR; NDBI requires SWIR + NIR. Scale/offset must match the data calibration. For SAR, select SAR and the appropriate intensity band. A PNG/JPEG has display RGB values and cannot supply true NIR.

The browser reduces large images to a maximum side of 900 pixels. Statistics describe that grid. It does not automatically align, reproject or atmospherically correct scenes.

## Understanding results

Coverage is the percentage of valid pixels passing the chosen rule. Before and After are coverage at each date. Net change is **percentage points**, while relative change compares the difference to the starting coverage. Spatial loss/gain show where the class disappeared/appeared. For class comparisons, selected coverage represents loss plus gain. Physical area is estimated only with known metre-based resolution.

## If no AI response appears

- **Local summary selected:** no API request is expected. Choose a free model.
- **Gateway offline:** start the Python backend, then click Retry connection. The frontend alone can still analyse images.
- **Alignment/missing-band error:** resolve the input issue; the app intentionally stops before calling AI with missing evidence.
- **Sending evidence:** the request is underway. Free models can be slow.
- **Quota/capacity error:** choose another free model or retry later. There is no paid fallback.
- **Run analysis clicked:** this only calculates. Click Ask to request an explanation.

Local startup from the repository: run `npm run dev` in one terminal; in a Python environment with `backend/requirements.txt` installed, run `python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000` in another. The server reads the ignored `backend/.env`; never put its key in frontend code.
