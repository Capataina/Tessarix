# A-FINE lesson — further improvements

Brainstorm pass after the five-widget enrichment landed. Captured as a plan
file so each item is actionable (and can be ticked off) rather than just a
chat exchange.

Status: open ideas. None of these have started.

## Composition + flow improvements

- [x] **Multi-step `<GoalChain>` on `<MetricComparison>`.** Shipped as Q2,
      four-step disagreement-space walk (PSNR-drops, SSIM-drops, both-agree,
      reset-and-reflect). `<GoalChain>` widget primitive built and lives at
      `src/components/assessments/GoalChain.tsx`.

- [x] **Multi-step `<GoalChain>` on `<RatioCollapseDemo>`.** Shipped as Q8,
      three steps (default-scale negligible loss, small-scale severe
      collapse, find the c-threshold at unit scale).

- [x] **Multi-step `<GoalChain>` on `<AdapterHeatmap>`.** Shipped as Q9, four
      steps (the three zeros: k=0, s_fid=1, s_nat,d=s_nat,r; plus the
      asymmetry-maximising configuration).

- [x] **Replace the PSNR-vs-LPIPS PredictThenVerify (Q2) with a goal-driven
      version on `<MetricComparison>`.** Done — the old Q2 PredictThenVerify
      was removed; the new Q2 GoalChain on `<MetricComparison>` covers the
      same conceptual territory experimentally.

- [x] **Composition section.** Shipped as the "Putting it together — one
      concrete walkthrough" subsection after the adapter, with a
      stage-by-stage table for one (distorted, reference) pair.

- [ ] **Failure-mode side panel.** Two of the five traps now have
      assessments (Q10 fused-QKV, Q11 0-D scalars). The other three already
      have widgets (`<GeluComparison>` for trap #1, `<RatioCollapseDemo>`
      for trap #3) or are textual-only (HashMap collision). Partial — could
      restructure each trap into its own subsection with consistent "how
      would you catch this" closing prompts.

## New widgets that would pay off

- [x] **`<TranslationVsBlurPlot>`.** Shipped — precomputed PSNR + SSIM
      response curves over translation magnitude (0–16 px) and blur sigma
      (0–4), side-by-side panels. Two LineChart pairs each. Deferred
      compute on a 100 ms setTimeout so the lesson paints first.

- [ ] **`<MetricLandscape>`.** 2D heatmap of (PSNR drop, SSIM drop) coloured
      by distortion type. Reveals the disagreement *zones*. **Still open.**
      Requires precomputed JSON of (distortion type × parameter × ΔPSNR ×
      ΔSSIM) tuples — defer until there's a clear authoring need.

- [x] **`<FidelityHeadCalculator>`.** Shipped — 8-dim simplification with
      a fixed f_r and 8 draggable bar-handles for f_d. Live readouts of
      μ_d, μ_r, σ_d², σ_r², σ_dr, and each of the four bracket terms of
      the SSIM-style ratio, then the assembled ratio. Includes Match /
      Anticorrelate / Zero / Randomise presets.

- [x] **`<CalibratorComparison>`.** Shipped — overlays a fixed "trained"
      calibrator against the reader's free-parameter version, with live
      RMSE between the two curves shown as the fitness indicator. Five
      sliders for β₁..β₅.

- [ ] **`<NaturalnessVsFidelityScatter>`.** **Still open.** Needs
      precomputed dataset of (s_nat,d, s_fid, score) tuples. Defer until
      there's a real dataset to render rather than synthetic noise.

## Pedagogy and grounding

- [ ] **A "before vs after CLIP" section.** **Still open.** Would close
      the narrative arc by revisiting the PSNR/SSIM widget on a re-stylised
      image. Requires a re-stylised reference image fixture; defer to a
      future authoring pass.

- [x] **A "what A-FINE doesn't do" section.** Shipped — covers geometric
      distortion, saliency, temporal consistency, adversarial robustness,
      OOD domains, and distributional comparison. Calibrates the reader's
      mental model of A-FINE's scope.

- [x] **Glossary scaffolding for the cross-page-hyperlink targets.**
      Shipped at `src/glossary.mdx` with stub entries for CLIP, ViT, SSIM,
      LPIPS, DISTS, FID, GELU, QuickGELU, PyIQA, burn, ImageNet. Inline
      cross-page links from `afine.mdx` to these entries are still **open**
      (depend on lesson-routing being wired up; deferred).

- [x] **Implementation-trap mini-exercises.** Shipped — Q10 (fused-QKV
      transposed split) and Q11 (0-D scalar drop). The two remaining traps
      already have widgets (`<GeluComparison>` for #1; `<RatioCollapseDemo>`
      for #3); the HashMap collision is textual-only and not amenable.

- [ ] **Failed-experiment sidebars.** **Still open.** Would deepen the
      reader's grasp of the design rationale by showing what A-FINE
      considered and rejected. Requires sourcing the failed-experiment
      content; defer to a future authoring pass.

- [ ] **Quiz-mode rendering.** **Still open.** Major infrastructure work
      that touches lesson routing, assessment-widget modes, and score
      tracking. Defer to its own session.

## Tooling and infrastructure

- [x] **Frontmatter consistency check.** Shipped at
      `scripts/lint-lesson-frontmatter.ts`. Compares the `widgets_used`
      array against actual imports and JSX usage; flags
      declared-not-imported, imported-not-declared, and
      imported-not-rendered. Currently runs clean across `afine.mdx`.

- [ ] **Telemetry-driven evidence.** **Still open.** Needs accumulated
      session data; defer until lessons have been read by real users.

- [ ] **A-FINE lesson screenshot regression test.** **Still open.**
      Requires Playwright (or similar) setup. Defer to a dedicated tooling
      session.

## Conversational integrations (longer-horizon — flagged for future work)

- [ ] **Chat agent that *uses* existing widgets intelligently.** User's own
      framing: in conversation the LLM should be able to reach for an
      existing widget rather than describing in prose. E.g., reader asks
      "but what happens at extreme translation?" and the bot embeds a
      `<MetricComparison translation=20 />` snippet in its response. This
      is **out of reach with llama3.2:3b** — the model can't reliably emit
      structured JSX with correct prop names and types, and the latency
      penalty of corrective re-prompting kills the UX. Possible paths:

  - **JSON tool-call shape.** Define a small set of "widget-invocation"
    tool calls the LLM can pick from (with strict prop schemas). The
    frontend then renders the matching widget. Doable with 3B if the
    schema is small (~5 widget choices), high-temperature behaviours like
    "invent a widget" are off the table.
  - **Larger local model.** llama3.1:8b or qwen2.5:7b can probably
    handle the schema reliably but stops being "local on this MacBook"
    for casual use. Worth re-evaluating when M4 Pro+ becomes the floor.
  - **Cloud quality-critical fallback.** Per
    `notes/llm-integrations.md`, the project already plans to use Claude
    API for quality-critical paths. Widget-emitting chat is exactly such
    a path. The local 3B model handles "explain X"; the cloud model
    handles "make me a widget for X."

  Not building this now. Captured here so the design conversation has a
  durable home when the question comes back.

- [ ] **Chat agent that *generates* widget variants.** Even more ambitious
      than the above — the bot generates a small parametric widget on the
      fly (e.g., reader asks "show me how PSNR responds to JPEG
      quantisation, not Gaussian noise" and the bot emits a new variant
      of `<MetricComparison>` with the requested distortion). Requires
      either:

  - a **widget composition DSL** the bot can target (much smaller than
    free TSX),
  - or a **constrained widget kit** where every distortion type, every
    metric, every domain is declarative,
  - or **server-side code generation** that compiles bot output to TSX
    and tree-shakes it at lesson-load time.

  None of these are cheap. Re-visit when the value of "bot-generated
  widgets" is clearer than the engineering cost. Probably a 2027+ item.
