# Playground Engine Scope

## 1. Current Understanding

The playground engine is the part of Tessarix that lets a lesson author embed a step-throughable visualisation of an algorithm or a manipulable simulation of a concept, alongside the narrative. The design call is to start **semi-generic**: a single `<StepController>` component + a small library of typed data-visualiser primitives (`<ArrayVisualiser>`, `<TreeVisualiser>`, `<GraphVisualiser>`, `<MatrixVisualiser>`, `<NeuralNetVisualiser>`) + per-algorithm code that generates `steps[]` and feeds the visualisers.

The **fully-generic** version — parse arbitrary algorithm code, infer data structures from runtime values, polymorphically visualise across all types — is deferred. It is closer to building a small visualisation IDE than building a learning app.

## 2. Rationale

The full-generic version is the architecturally cleaner endpoint but a substantially worse first-version target. The estimated cost-benefit:

| Dimension | Semi-generic (chosen) | Fully-generic (deferred) |
|---|---|---|
| Initial engine build cost | Substantial but bounded — `<StepController>` + 4–5 typed visualisers. | Months — runtime type inference, AST instrumentation, polymorphic rendering, sandbox execution model. |
| Per-algorithm authoring cost after engine ships | Short — write the step generator + pick the visualiser. | Effectively zero — the engine renders whatever you write. |
| Quality at the self-audience bar | Excellent — typed visualisers render their specific shape well. | Variable — generic rendering is rarely as good as purpose-built. |
| Path to graduation | Always available — semi-generic patterns can be lifted into fully-generic later if repetition obviously pays. | One-way — would not back off to semi-generic later. |

The semi-generic version delivers M1 in tractable time. If by M4 the per-algorithm code shows obvious repetition that an abstraction would collapse, lift the abstraction. Otherwise stay semi-generic.

## 3. What Was Tried

Nothing — this is the design from day one. The decision was made at the 2026-05-11 design discussion explicitly to avoid front-loading the fully-generic engine into M1.

## 4. Guiding Principles

- **Defer the abstraction until the pattern repeats.** Three concrete reasons to lift the engine to fully-generic is a stronger justification than imagining the fourth. The semi-generic shape is good enough today; lift it later when the evidence is in.
- **Lesson author writes step generators, not visualiser code.** The pattern is:

  ```tsx
  const steps = bubbleSort(input);
  return (
    <StepController steps={steps}>
      <ArrayVisualiser data={state.array} highlights={state.compared} />
    </StepController>
  );
  ```

  Authors implement the algorithm; the visualiser handles the rendering. This keeps the visualiser library narrow (typed primitives only) and avoids per-lesson custom rendering code.
- **`<CodeEditor>` re-runs the visualiser on every edit.** The "edit code and see it break" workflow that visualgo.net pioneered is achievable in semi-generic mode by re-invoking the lesson's step generator whenever the editor's code changes, and re-rendering the visualiser with the new step list. No runtime AST inference required.

## 5. Trade-offs and Constraints

- **Per-algorithm code lives in `playgrounds/<slug>/`.** Each algorithm or concept gets its own folder. This is more files than a fully-generic engine would need, but each file is short and obvious.
- **Adding a new data structure to visualise requires adding a new visualiser primitive.** This is the explicit cost of the semi-generic decision. If a lesson needs a Bloom filter visualisation, `<BloomFilterVisualiser>` has to be written. Building a fully-generic engine that handles arbitrary types would have absorbed that cost into the engine, but at a far higher up-front price.

## 6. Open Questions

- **What is the line between "lift to fully-generic" and "stay semi-generic"?** Likely: when three algorithms across two visualiser types share enough code that the duplication is annoying. Until then, the semi-generic version wins.
- **Where do per-algorithm playground tests live?** Likely alongside the algorithm in `playgrounds/<slug>/<slug>.test.ts`. Not yet committed.

## 7. Related Systems and Notes

- [`../systems/frontend-shell.md`](../systems/frontend-shell.md) — where the component library lives.
- [`authoring-discipline.md`](authoring-discipline.md) — the "library accretes from real lessons, never speculatively" rule explicitly applies to the playground engine: do not pre-build `<BloomFilterVisualiser>` because it might be useful; build it when a Bloom filter lesson needs it.
- [`stack-rationale.md`](stack-rationale.md) — the broader stack choice (Monaco, react-flow, Konva) that makes the engine implementable.
