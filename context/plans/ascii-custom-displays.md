# ASCII custom displays — coherence pass

**Goal.** Every "custom display" in the app (anything that isn't a standard chart/graph
served by the existing chart widgets) renders as ASCII art, for maximum visual coherence
with the terminal identity. First targets: the two photo-like rasters in the A-FINE lesson.

**Origin.** User flagged that `MetricComparison` (a photo-like band scene with a circle +
square) and `EmbeddingHeatmap` (three blurry pixel panels) are the only non-terminal,
photo-like rasters left in the app. Palette-matched but not coherent. Resolution: render
custom displays as ASCII art (classic `donut.c` luminance→glyph approach).

## Key correctness finding (diagnostic, not assumption)

PSNR/SSIM in `MetricComparison` are computed on the image pixels, and the A-FINE lesson's
`<GoalChain>` (afine.mdx:133–144) requires three predicates reachable *through the widget*:

| Goal | Predicate |
|---|---|
| Translation | `psnr < 25 && ssim > 0.85` |
| Blur | `ssim < 0.85 && psnr > 30` |
| Noise | `psnr < 22 && ssim < 0.75` |

A **bare donut breaks two of three** — it's almost all high-contrast edge, so PSNR and SSIM
collapse together instead of diverging. The existing band scene makes them diverge because
flat horizontal bands keep SSIM high under translation while small shapes collapse PSNR.

The metric is also **resolution-sensitive**: at 96² the shapes occupy too many SSIM windows
and the translation goal is unreachable; at 256² (today's resolution) the flat bands dominate
and all goals are reachable. Verified in `/tmp/tessarix-ascii/` Python prototypes.

**Locked design (after 6 diagnostic iterations — see `/tmp/tessarix-ascii/`):**
- A bare donut breaks blur (smooth surface blurs to itself → SSIM never drops) and a
  bands+donut composite is visually busy. The resolved scene is a **full-frame smooth
  rotating donut + faint horizontal CRT scanlines** (amplitude ≈9/255, period 3–4 rows,
  low ambient bg ≈24). Horizontal scanlines are invariant under horizontal translation
  (SSIM survives → translation goal) but smear under blur (SSIM drops while their low
  energy keeps PSNR>30 → blur goal). Noise hits both. **All three goals reachable at 256:**
  T@6px P21.9/S0.90, B@1.5σ P30.5/S0.79, N@35 P18.7/S0.15.
- The blur goal window is narrow (~1.5σ); set the blur preset to land in it and verify the
  exact window against the real JS metric in-browser.
- Metric grid: 256² luminance (square px). Display grid: ~72×34 ASCII, aspect-corrected,
  rendered from a 2× supersample box-downsampled for smooth glyphs.
- Rotation: donut spins (rAF, ~24fps CRT cadence, display-only); metric recomputed on
  slider change → number is stable while spinning. Reduced-motion freezes the pose.
- Colour: donut = mono warm `<pre>` + vertical camel→cream sheen (no per-cell spans on the
  animated path); heatmap = per-cell `divergingColor`.

## Tasks

- [ ] 1. `src/lib/ascii/` — Grid + ramp, grid distortions, grid psnr/ssim, donut scene, AsciiField component
- [ ] 2. `MetricComparison` → rotating ASCII donut (preserve sliders/presets/explainer/onStateChange keys)
- [ ] 3. `EmbeddingHeatmap` → ASCII character heatmaps (keep cosine/fidelity/morph)
- [ ] 4. `TranslationVsBlurPlot` → same scene generator; then delete `lib/imaging/` + `refImage`
- [ ] 5. Codify the ASCII-custom-display principle in `context/notes/`; commit + version bump

## Blast radius
- `lib/imaging/{render,distortions,metrics}.ts` consumed by `MetricComparison` +
  `TranslationVsBlurPlot`. Both migrate → imaging deletes.
- `refImage` in `styles/derived.ts` used only by `imaging/render.ts` → removes with it.
- `divergingColor` (EmbeddingHeatmap) + `sequentialWarm` (AdapterHeatmap) stay.
- `afine.mdx` GoalChain predicates must stay satisfiable — verify in-browser, tune donut
  fit / preset values against the real JS metric if needed.
