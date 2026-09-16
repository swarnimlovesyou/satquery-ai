# MVP validation

- Production build: Vite build passes.
- Four pure-function tests pass: query routing, rejected queries/missing pairs, new versus net water change, identical-image temporal comparison.
- Browser walkthrough passes in Chromium/Edge: prepared flood, vegetation, urban and temporal workflows; processing state; original/mask/overlay; overlay toggle; comparison slider; architecture and technology dialogs; JSON report download; local upload analysis; absent input and mismatched-pair errors.
- Identical uploaded before/after images return 0% changed pixels.
- Responsive checks at 390, 768 and 1024 pixels: no horizontal page or dialog overflow.
- No broken visible image assets, JavaScript page errors or external runtime HTTP requests in the walkthrough. Fonts and sample imagery are bundled.
- Masks use selected pixels for measurements. New water is measured independently from net coverage change.

WebMCP's native browser implementation was not available for validation; the optional feature-detected action is not needed for the visible workflow.

These checks verify prototype behavior, not scientific model accuracy. The application has no remote-sensing fine-tuning, SAR fusion or final-judging benchmark results.
