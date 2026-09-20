# Verification: simplified workspace

## Scope and reproducibility

Run `npm test`, `npm run typecheck`, `npm run build`, and `python -m unittest backend.test_app`.
With frontend on port 5173 and backend on 8000, run `npm run test:e2e`. The browser suite uses installed Edge on Windows, or Playwright Chromium elsewhere (`npx playwright install chromium`). It saves screenshots and results under ignored `test-results/`. It mocks external model responses for repeatable transport/error tests; those are not evidence of live provider availability.

21 TypeScript tests and 9 Python tests pass. Browser cases cover the exposed functional areas below. This is a feature coverage matrix, not a claim of exhaustive testing on all satellite formats or combinations.

| Area | Checked |
| --- | --- |
| Demo entry | All three samples preview without a result; Start analysis computes the result; no alignment/category gates |
| Capabilities | Unknown imagery supports statistics after Start; unavailable tasks hidden; raw band roles not guessed |
| Uploads | PNG, JPEG, WebP, single/multiband TIFF; corrupt and unsupported file recovery |
| RGB analysis | Statistics, Excess Green, water heuristic and built-up proxy |
| Spectral analysis | Known 50% NDVI/NDWI/NDBI fixtures; mapped bands |
| Temporal analysis | Known 50% generic change; spectral loss/gain with zero net coverage change |
| SAR | Selected-band intensity, scale/offset calibration, negative-value threshold |
| Validation | CRS/extent mismatches, nodata/zero denominator, missing bands, unreferenced assumption warnings |
| Viewer | T1/T2, side-by-side, slider, binary mask, overlay, before/after class masks, loss/gain, signed difference |
| Controls | Opacity, zoom, pan, reset, sensitivity, noise cleanup and stale-result invalidation |
| Evidence | Metadata, transform, band statistics/histograms and JSON export |
| Modes | Single/bitemporal changes prepare the correct images for Start analysis |
| Chat | Local mode; actual request payload; mock external answer; direct explanation; quota failure preserving results |
| Connection | Offline status and retry recovery; provider settings |
| Layout | Desktop and 390px mobile; no horizontal overflow or uncaught browser exceptions; landing navigation |
| Backend | Free-price guards, bounded timeout, constrained evidence tools, mocked HTTP tool round trip |

## Real free-model checks with the updated key

Public catalog checks verified zero prompt/completion prices before testing alternatives. Ling Flash and Laguna XS returned HTTP 200 on short diagnostic requests. Qwen returned HTTP 429; Liquid rejected disabled reasoning, so reasoning settings are now capability-aware.

Two live browser walkthroughs exercised real sample selection → divider → Start analysis → computed summary → Automatic free-model explanation → follow-up. Both returned Ling responses successfully. This is live evidence, separate from the mock-provider regression cases. Availability can change, so Automatic mode has a bounded free-only fallback to Laguna. The actual responding model is shown.

## First-time-user walkthrough

The primary path is explicit: choose images, inspect before/after, Start analysis, read the plain-language measured result, ask follow-ups. Loading or switching imagery does not run analysis. Technical details remain expandable. Unreferenced comparisons remain explicitly provisional; generic change is never presented as verified flooding.

Reviewed desktop/mobile layouts and exercised fresh browser sessions. This was an agent walkthrough, not a human participant study. Test fixtures use controlled pixel values solely to verify formulas; they are not shown as production sample results.

LLM prose is not guaranteed correct: a live follow-up misstated the NDWI bands despite the supplied formula. Computed masks and statistics are independent of model prose; this is an observed limitation, not a passed scientific-accuracy check.
