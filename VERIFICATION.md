# Verification — 20 September 2026

This report distinguishes local deterministic checks from external model availability.

## Automated checks

- 19 TypeScript tests pass: formulas, masks, temporal counts, nodata, GeoTIFF decode, input validation, RGB rendering and question routing.
- 8 Python tests pass: missing configuration, forbidden evidence, matching read-only tools, provider adapter dispatch, rejection of paid/nonzero-price models, timeout reporting, and a mocked HTTP tool-call round trip with zero-price routing.
- TypeScript compilation and Vite production build pass.

## Browser checks

Verified with a real local browser:

- RGB flood sample has coloured pixels; alignment confirmation enables change analysis.
- Synthetic GeoTIFF upload exposes metadata; known mean is 25 and known paired change is 50%.
- Corrupt TIFF errors preserve the page; real Sentinel NDVI still works afterward.
- Gateway offline state is visible. Retry reconnects without reloading the workspace.
- Alignment errors block chat before an API call and explain the required action.
- Run analysis sends no AI request. Explicit local-summary mode sends no AI request.
- External-model Ask sends `/api/chat` with computed evidence and without credentials/raw rasters.
- A simulated HTTP 429 is shown clearly while computed analysis remains visible.

## External-service limitation

A real browser-to-Nemotron request was observed, but one live run returned HTTP 502 from the gateway and the final live run timed out. Prior runs have returned real answers. Mobile instructions and page-exception checks passed after the timeout. A connected/configured gateway does not establish free-model capacity or guarantee an answer. Do not describe all live AI flows as passing merely because local or mocked tests passed.

The UI now displays gateway state and request progress separately, reports provider timeouts/HTTP errors/empty answers, and provides explicit local-summary mode. No paid fallback is allowed.
