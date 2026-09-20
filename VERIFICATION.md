# Verification: simplified workspace

## Scope and reproducibility

Run `npm test`, `npm run typecheck`, `npm run build`, and `python -m unittest backend.test_app`.
With frontend on port 5173 and backend on 8000, run `npm run test:e2e`. The browser suite uses installed Edge on Windows, or Playwright Chromium elsewhere (`npx playwright install chromium`). It saves screenshots and results under ignored `test-results/`. It mocks external model responses for repeatable transport/error tests; those are not evidence of live provider availability.

20 TypeScript tests and 8 Python tests pass. Browser cases cover the exposed functional areas below. This is a feature coverage matrix, not a claim of exhaustive testing on all satellite formats or combinations.

| Area | Checked |
| --- | --- |
| Demo entry | All three samples produce automatic results in one click; no alignment/category gates |
| Capabilities | Unknown imagery gives immediate statistics; unavailable tasks hidden; raw band roles not guessed |
| Uploads | PNG, JPEG, WebP, single/multiband TIFF; corrupt and unsupported file recovery |
| RGB analysis | Statistics, Excess Green, water heuristic and built-up proxy |
| Spectral analysis | Known 50% NDVI/NDWI/NDBI fixtures; mapped bands |
| Temporal analysis | Known 50% generic change; spectral loss/gain with zero net coverage change |
| SAR | Selected-band intensity, scale/offset calibration, negative-value threshold |
| Validation | CRS/extent mismatches, nodata/zero denominator, missing bands, unreferenced assumption warnings |
| Viewer | T1/T2, side-by-side, slider, binary mask, overlay, before/after class masks, loss/gain, signed difference |
| Controls | Opacity, zoom, pan, reset, sensitivity, noise cleanup and stale-result invalidation |
| Evidence | Metadata, transform, band statistics/histograms and JSON export |
| Modes | Single/bitemporal changes recalculate using the correct images |
| Chat | Local mode; actual request payload; mock external answer; one-click explanation; quota failure preserving results |
| Connection | Offline status and retry recovery; provider settings |
| Layout | Desktop and 390px mobile; no horizontal overflow or uncaught browser exceptions; landing navigation |
| Backend | Free-price guards, bounded timeout, constrained evidence tools, mocked HTTP tool round trip |

## Real free-model checks

Each configured model was called once through the local gateway with synthetic measurements:

- Nemotron: HTTP 504, timed out.
- GLM: HTTP 429, free quota/capacity.
- Gemma: HTTP 429, free quota/capacity.

Live AI availability **did not pass**. Deterministic analysis and repeatable integration checks passed independently. No paid fallback was used.

## First-time-user walkthrough

Reviewed desktop and mobile screenshots and exercised fresh sessions. Results appear after one demo click, ahead of technical controls. A concise result and an explanation button form the primary path; metadata, statistics and tuning are expandable. Sample presets reset tuning, and unsuitable question suggestions/tasks are filtered. This was an agent walkthrough, not a study with human participants.

Remaining limits: unnamed spectral/SAR bands need real metadata or manual mapping; geographic registration is not automatic; free providers can be slow/unavailable. Those limits are displayed rather than bypassed or presented as validated science.
