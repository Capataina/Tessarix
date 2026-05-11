# A-FINE lesson — further improvements

Brainstorm pass after the five-widget enrichment landed. Captured as a plan
file so each item is actionable (and can be ticked off) rather than just a
chat exchange.

Status: open ideas. None of these have started.

## Composition + flow improvements

- [ ] **Multi-step `<GoalChain>` on `<MetricComparison>`.** The widget already
      exposes PSNR and SSIM values; the chain lets the reader walk through
      goals like "make PSNR drop sharply while SSIM stays high" → "make them
      agree" → "make SSIM drop sharply while PSNR stays high" → with a final
      reflection step asking which distortions land in each regime. This is
      the canonical demonstration of the principle the section is about, and
      depends on the new `<GoalChain>` widget primitive (see
      `notes/enrich-lesson-skill.md`).

- [ ] **Multi-step `<GoalChain>` on `<RatioCollapseDemo>`.** Step 1: "find a
      feature scale where the two constants give essentially the same curve
      (CLIP's natural scale, 1.0)." Step 2: "find a feature scale where the
      DISTS constant collapses the ratio (below ~0.3)." Step 3: "find the
      custom c that matches the DISTS curve at scale 0.2." Teaches the reader
      *how* scale and c interact, not just that they do.

- [ ] **Multi-step `<GoalChain>` on `<AdapterHeatmap>`.** Step 1: "make the
      asymmetry exactly zero." (Three valid solutions: k=0, s_fid=1,
      s_nat_d=s_nat_r — the reader discovers all three.) Step 2: "given
      s_nat_d=0.3 and s_nat_r=0.9, find the k that maximises asymmetry."
      Step 3: "explain why the maximum sits where it does." Makes the closed-
      form formula tangible.

- [ ] **Replace the PSNR-vs-LPIPS PredictThenVerify (Q2) with a goal-driven
      version on `<MetricComparison>`.** Currently the question asks "which
      drops more under a 2-pixel shift, PSNR or LPIPS" — the widget now
      supports the underlying calibration, so the question can become a goal
      ("translate until PSNR drops by N dB; report what SSIM does"). Less
      trivia, more direct experiment.

- [ ] **Composition section.** Add a short "putting it together" passage
      after the adapter section that walks one concrete (s_nat_d, s_nat_r,
      s_fid, k) tuple through the entire pipeline from raw embeddings to
      final score, with each intermediate value annotated. The reader has
      now seen each part in isolation; one end-to-end walkthrough cements
      that the parts compose mechanically.

- [ ] **Failure-mode side panel.** Each named implementation trap (QuickGELU
      mix-up, fused-QKV, c1/c2, 0-D scalars, HashMap collision) currently
      sits in a flat list. They deserve their own short subsection each,
      each ending with a "how would you catch this" prompt. The
      `<GeluComparison>` widget already anchors trap #1; the others want
      similarly concrete artefacts.

## New widgets that would pay off

- [ ] **`<TranslationVsBlurPlot>`.** Single scalar plot: SSIM and PSNR
      response as a function of translation magnitude, on one axis, and as a
      function of blur sigma on a second axis. Side-by-side panels. Lets
      the reader compare the *shape* of the metric responses, not just the
      magnitudes at one operating point. Cheap to build given the metrics
      library already exists.

- [ ] **`<MetricLandscape>`.** 2D heatmap of (PSNR drop, SSIM drop) coloured
      by distortion type. Reveals the disagreement *zones* — the regions
      where the two metrics tell different stories. Brilliant has similar
      visualisations on its statistics lessons. Requires running the full
      metric pair across a parameter sweep at widget-load time (precomputed
      offline → JSON would be cheaper than live computation).

- [ ] **`<FidelityHeadCalculator>`.** Two 8-cell sliders (simplified from
      512 to make the math feel grounded), live computation of μ_d, μ_r,
      σ_d, σ_r, σ_dr, and the resulting fidelity ratio with each term
      highlighted. Teaches the SSIM-in-feature-space formula by letting the
      reader build it. Lower dimensionality breaks the realism but makes
      the structure feel concrete.

- [ ] **`<CalibratorComparison>`.** The current FunctionGrapher on the
      calibrator shows one curve. Adding the *trained* calibrator as a
      second fixed curve, alongside the reader's free-parameter curve,
      makes the trained parameters' role tangible. Reader can try to *fit*
      the trained calibrator with their parameters, which teaches "what the
      training optimised" without any code.

- [ ] **`<NaturalnessVsFidelityScatter>`.** Real or synthetic scatter
      showing (s_nat,d, s_fid, final score) tuples from a dataset
      simulation. Reveals the regions of the input space where naturalness
      dominates vs where fidelity dominates. Probably needs precomputed
      data — too much to compute live.

## Pedagogy and grounding

- [ ] **A "before vs after CLIP" section.** A brief callback to the
      classical-baselines section that revisits the PSNR/SSIM widget on a
      *re-stylised* version of the reference image (where pixel-domain
      metrics break completely). Then notes that this is exactly the case
      that motivated feature-domain metrics. Closes the narrative arc.

- [ ] **A "what A-FINE doesn't do" section.** Negative space matters. The
      lesson sells what A-FINE adds; it doesn't name what it leaves out
      (perception-of-saliency, geometric distortion, motion artefacts in
      video, etc.). One short paragraph at the end calibrates the reader's
      mental model about the metric's scope.

- [ ] **Cross-page hyperlinks to:** SSIM, CLIP, ViT, LPIPS, DISTS, FID,
      NIQE, BRISQUE, GELU. None of these have lessons yet, but as the
      project grows, each becomes a candidate destination. For now: add
      glossary entries (per the four-tier content architecture), then
      back-fill cross-page links when the lessons exist.

- [ ] **Implementation-trap mini-exercises.** Each trap currently asserts.
      A short "find the trap" exercise — show a diff or a code snippet,
      ask the reader to spot the bug — would convert assertion into
      assessment. Especially powerful for traps #4 (0-D scalar) and #5
      (HashMap collision) where the widget can't dramatise them.

- [ ] **Failed-experiment sidebars.** The lesson notes implementation
      decisions A-FINE *made*, but not decisions it considered and
      rejected. A sidebar noting "the authors tried cosine-similarity
      fidelity heads first and found them insufficient — that's why we got
      the SSIM-style ratio" would deepen the reader's grasp of why the
      design landed where it did.

- [ ] **Quiz-mode rendering.** Per `notes/three-pillar-model.md`, the same
      lesson should be re-renderable as a quiz where every assessment
      widget runs in `mode="quiz"` (gated reveal, score tracking). The
      A-FINE lesson is the natural first lesson to validate this against —
      it already has the assessment density to make a quiz-mode rendering
      meaningful.

## Tooling and infrastructure

- [ ] **Frontmatter consistency check.** The `widgets_used` array in the
      lesson frontmatter is now manually curated. A simple script that
      compares declared widgets against actual JSX usage would catch drift
      automatically. Goes well with the future `enrich-lesson` skill but
      is cheap enough to ship as a standalone script first.

- [ ] **Telemetry-driven evidence.** Once the lesson has been read by
      several users, the telemetry log can tell us *which sections cause
      reading sessions to end prematurely* and *which widgets the readers
      engage with vs skip past*. Use that signal to prioritise this list,
      not pure author intuition.

- [ ] **A-FINE lesson screenshot regression test.** When the widget kit
      changes, lessons can drift visually. A simple
      Playwright-or-equivalent test that screenshots each section and
      diffs against a baseline would catch unintended visual regressions
      in lessons that the author isn't actively editing.

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
