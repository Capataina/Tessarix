# UI Redesign — Chocolate-Luxe / ANSI-Terminal

Full visual redesign driven by four user complaints (2026-06-21): neon reads as
"edgy teenager"; the UI feels stiff and 2D; widgets stand out as bright foreign
cards instead of blending into the prose; some widgets are oversized and you
can't see the slider's effect procedurally.

## Direction

**Thesis:** a tailored leather notebook that happens to run in a terminal. Warm
chocolate/camel/cream surfaces (COS / Ralph Lauren) carrying terminal-grade
structure (monospace labels, hairline frames, content in muted "dried-pigment"
colours). Reference: the ANSI-terminal A-FINE article on `capataina-website`
(`AnsiBox.tsx` — single subtle border, glass bg matching the prose, small
uppercase tracked mono header, mono body, muted text, NO nested cards, no loud
colours). The site's open-source articles are themed warm amber
(`oklch(0.7 0.1 65)`), which validates the camel accent.

## Palette (chocolate-luxe)

| Role | Value |
|---|---|
| bg base / surface / elevated / overlay | `#15110D` / `#1C1611` / `#241C16` / `#2E251D` |
| text primary / secondary / muted | `#EFE7DA` / `#BBAD9A` / `#897B69` |
| accent camel (primary) / tobacco (dim) | `#C9A26B` / `#9E7C4E` |
| pigment box (chart-1..5) | camel `#C9A26B` · rust `#B56A47` · eucalyptus `#6E8C84` · sage `#87976A` · mauve `#A6788C` |
| success / warn / danger | sage `#87976A` / ochre `#C99A4E` / brick `#B5544A` |

Neon token names (`--accent-cyan` etc.) are RETAINED as legacy aliases pointing
at the warm semantic tokens, so the 14 files + 52 widgets referencing them need
no edits. New code uses the semantic names.

## Checklist

- [x] `src/theme.css` — palette values, warm depth (shadows, vignette, grain),
      token shifts for blend (widget-bg near page, small radius, hairline
      border, near-flat elevation), `--widget-canvas-max-h` sizing token.
- [x] `src/App.css` — fixed hardcoded `rgba(0,212,255)` neon + cold topbar,
      blockquote, link underline, pillar/tag tints → warm.
- [x] Fix 4 hardcoded-hex stragglers: `shared/FunctionGrapher.tsx` (#00d4ff…),
      `shared/LineChart.tsx` (#0c0c18) → consume tokens via `resolveColor`.
- [ ] `shared/WidgetExplainer.css` — restyle (sits under every widget; blends globally).
- [ ] afine widgets (flagship + the two screenshotted offenders): full AnsiBox
      terminal-pane treatment + sizing fix. `MetricComparison`, `EmbeddingHeatmap`
      (oversized), `AdapterHeatmap`, `GeluComparison`, `CalibratorComparison`,
      `AFinePipeline`, `FidelityHeadCalculator`, `RatioCollapseDemo`,
      `TranslationVsBlurPlot`.
- [ ] Verify build: `pnpm tsc --noEmit`, `pnpm build` (vite). Commit checkpoint.
- [ ] Sweep 44 LA widgets to the terminal-pane chrome (token shift gives them
      colour/depth/blend free; this pass aligns chrome + caps canvas height).
      Parallelisable via subagents in batches.
- [ ] frontend-design skill log at first build checkpoint.

## Notes

- Keep Satoshi (body) + JetBrains Mono (terminal chrome) for v1 — zero font risk.
  A display-serif swap (Fraunces, titles only) is a deferred phase-2 option.
- Blend recipe per widget: drop the outer card → single hairline border + glass
  bg matching prose; inner panels lose their own bg-elevated/border/radius;
  small uppercase tracked mono label header; mono readouts; canvas capped to
  `--widget-canvas-max-h`.
