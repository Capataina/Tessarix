---
name: Widget creativity discipline — never default to a chart
description: The mechanism that keeps widget design from defaulting to "slider + line chart" for every concept. Pedagogical-metaphor-first authoring, mandatory two-draft enumeration before building, and the library of creative widget patterns Tessarix's previous widgets have proven out. Applies to every widget on every lesson going forward.
type: feedback
---

# Widget creativity discipline

## The failure mode this exists to prevent

The first pass at the linear algebra lesson hit the same creativity ceiling on widget after widget: slider-on-the-left, chart-or-plot-on-the-right. Caner caught it after the fact ("scalar multiplication should have something interactive, not prose; you always gravitate toward charts and graphs when data can be represented in so many creative ways"). The fix on that specific widget (stacking-based scalar multiplier) was easy once flagged. But the failure mode is structural: **without a discipline, every new widget reverts to slider + chart because that's the path of least resistance**.

The diagnosis:

- Charts are the safest visualisation shape — they're well-understood, the rendering primitives exist, and they always communicate *something*.
- Charts often communicate the *output* of an operation without embodying the operation's *meaning*. Scalar multiplication as a slider that scales an arrow shows the output; scalar multiplication as a chain of stacked copies shows what the operation *is*.
- "Slider on the parameter, chart shows the response curve" works for a small set of concepts (the AdapterHeatmap's blend function, the GeluComparison's activation curves). It is wrong for most concepts.

Tessarix's whole reason for existing is interactive, visual, manipulable representations of concepts that prose can't deliver. Every chart-defaulted widget is a place where the product's whole differentiator was left on the floor.

**Why:** Caner's framing — "we have an entire app we are building, you can be so much more creative" — applies to every widget in every lesson, not just the one being audited at the moment. Brilliant / 3Blue1Brown / Distill set the floor in this space; charts alone don't clear it.

**How to apply:** Read this note before designing any widget. The two-draft rule below is the operational check that keeps the discipline from being aspirational.

## The two-draft rule

Before building any non-trivial widget, the author writes **two alternative widget designs in prose** — one paragraph each, describing the interaction and the visual. The two drafts MUST be qualitatively different (not "slider with range 0-1" vs "slider with range -1-1"). Then the author picks one explicitly, with a one-sentence rationale.

Format:

```
## Widget design — <concept name>

### Draft A: <pattern label>
<One paragraph: what does the reader see, what do they do, what does
the operation look like as it happens, what's the embodied metaphor?>

### Draft B: <different pattern label>
<Same structure, qualitatively different approach.>

### Picked
<Which one and why. One sentence.>
```

The two drafts can live in the lesson's authoring notes (or the commit message of the widget-creation commit; they don't need to ship in the lesson body). The point is the *forcing function* — you cannot pick from a menu of one. If both drafts are charts, that's a signal to think harder before continuing.

If a widget genuinely has no good alternative to a chart (e.g. visualising a continuous response curve where the curve IS the concept), state that explicitly in the picked rationale and proceed. Honest exemption is fine; default exemption is the failure mode.

## The widget metaphor library

These are the pedagogical-metaphor patterns Tessarix has shipped or planned. New widgets should ask "which of these fits my concept?" *before* "what controls do I need?" Adding a new pattern to this library is normal as authoring progresses.

### 1. Iterated operation
**The widget shows the operation being *performed*, step by step.** Examples shipped: ScalarMultiplier's stacking mode (k·v as k copies head-to-tail), the AnswerThread's turn-by-turn reveal, GaussianElimination's full-history step-through (each elementary row operation applied as a discrete move with undo support — the elimination IS the iteration). Examples to come: matrix power Aⁿ visualised as n applications, Gram-Schmidt as the literal sequence of orthogonalisation steps.

When to use: when the operation is defined inductively or as an iteration. Make the iterations visible.

### 2. Projection / shadow
**One object casts a "shadow" onto another, and the shadow's magnitude is the operation's output.** Shipped: DotProductGeometry — vector **a** projected onto **b**'s direction, the shadow's signed length times $|\mathbf{b}|$ being $\mathbf{a} \cdot \mathbf{b}$. Sign-coded green/red for positive/negative dot products. Generalises to projection onto a subspace.

When to use: dot product, projection operators, oblique vs orthogonal projection, least-squares as projection onto column space.

### 3. Deformation / morph
**The widget shows a recognisable shape being transformed.** Shipped: MatrixTransform's unit-square → parallelogram. The unit square is the textbook starting shape because it's symmetric on the basis vectors; non-symmetric shapes (a stylised "F", a stick figure, a letter "R") give the reader an even stronger orientation cue for matrices that reflect.

When to use: any linear transformation, change of basis, deformation under stress.

### 4. Direct manipulation of position
**The reader grabs the thing being learned and drags it.** Shipped: AdapterHeatmap cursor, VectorPlot tips, MatrixTransform test vector. The principle is `interface-affordances.md` §9 — when a widget visualises a position, the reader should be able to grab it directly.

When to use: any time the concept involves a point or vector that can move. Almost always pair with sliders for precision.

### 5. Dual-state simultaneous display
**Both the current state AND its comparison shown at once, no mode-flipping.** Shipped: AdapterHeatmap's primary + ghost cursor (the swap-twin), CalibratorComparison's trained + reader curve, MetricComparison's reference + distorted panels, MatrixComposition's side-by-side AB and BA panels (the canonical example — making the non-commutativity of matrix multiplication visible requires showing both orderings simultaneously, never one at a time), MatrixInverse's A-panel + A⁻¹-panel pair (the inverse undoes the forward map by construction; the dual display makes "undo" the *visible* relationship, with a draggable test vector tracked across both panels and a singular-matrix overlay that breaks the symmetry exactly when det = 0). The principle is in `interface-affordances.md` §9: mode-flipping is friction.

When to use: any time there's a "natural pair" — original vs transformed, before vs after, your-answer vs trained-answer, current vs swapped, ordering-A vs ordering-B, forward vs undo.

### 6. Particle field
**Many particles simultaneously transformed under one operation.** Not yet shipped. Useful for showing the *global* effect of a transformation: rotate a cloud of dots and watch them swirl; apply a singular matrix and watch them collapse onto a line. The strength is showing the operation's effect on *all of space*, not just one chosen vector.

When to use: linear transformations where the global effect matters more than any single point. Eigenvector visualisation (the particles that don't rotate). Stable manifolds. Phase portraits.

### 7. Composition timeline
**Apply A, see the intermediate state, then apply B.** Shipped: MatrixComposition (combines this pattern with §5 — the two orderings AB and BA both shown as fully-composed transformations side-by-side, with a numeric ||AB - BA|| verdict), GaussianElimination (the timeline here is the *history of row operations* — each operation a discrete step recorded in an undo-able list, the matrix's evolution visible as each step is applied). The pattern is most powerful when paired with §5 — showing one composition in isolation gives you the *result* but loses the "different orderings produce different results" insight.

When to use: any composition of operations. Function composition. Sequential transformations. Algorithms with a discrete operation set (row reduction, Gram-Schmidt, the simplex method). Pipeline stages (the existing AFinePipeline is a less interactive version of this — each stage of the pipeline is a separate transformation, but the pipeline shows them in a fixed order rather than letting the reader explore alternative orderings).

### 8. Physical metaphor
**The visualisation uses a recognisable physical system.** Examples elsewhere in the wild: rubber band stretch (Hooke's law), spring system (linear systems), light cone (special relativity), gravity well (potential energy). Tessarix hasn't shipped one yet. The strength: the reader brings real-world physical intuition that no abstract chart can.

When to use: when the concept has a clear physical analogue, especially for foundational intuition.

### 9. Counter-example / regime explorer
**Preset buttons that snap to canonical edge cases, plus free exploration.** Shipped: MetricComparison's "Translate 6px / Heavy blur / Heavy noise / Brightness +40 / Reset" presets, MatrixTransform's "Identity / Scale / Rotate / Shear / Reflect / Singular" presets. The reader learns by visiting the regimes the author has surfaced as important, then explores beyond them.

When to use: any concept with named canonical regimes. Distributions, distortions, matrix types, signal-noise regimes.

### 10. Constructive build-up
**Start with one piece, add pieces, watch the whole emerge.** Shipped: LinearCombination — two basis vectors **u** and **v** plus coefficient sliders for $\alpha, \beta$; the green output vector $\alpha\mathbf{u} + \beta\mathbf{v}$ traces a point in the plane, and a faint dot-cloud of all $(\alpha, \beta)$ values *over a grid* makes the **span** itself a visible object (filling the plane when the vectors are linearly independent, collapsing to a line when dependent). Combines with pattern §6 (particle field, in light form). Generalises to building up SVD as rotation-scaling-rotation, building a matrix from outer products of vectors, etc.

When to use: when a structure has natural component pieces that compose to the whole. Most decompositions. Any "set of reachable points" or "span of generators" concept.

### 11. Convergence animation
**A sequence that converges to a fixed point or limit, visible as the iterations accumulate.** Not yet shipped. Power iteration converging to the dominant eigenvector; Gram-Schmidt building an orthonormal basis; SGD trajectory in a loss landscape.

When to use: any iterative method. Make the iterations visible, not just the final answer.

### 12. Side-by-side regime comparison
**Two or more independent simulations running with different parameters, side-by-side, the reader controls them independently.** Generalisation of "dual-state simultaneous display" to N ≥ 3. Useful for "how does method A compare to method B compare to method C on the same input?"

When to use: comparing approaches that aren't just "A vs swapped A" — different algorithms, different hyperparameters, different model families.

## When charts ARE the right answer

This note is not "never use charts." It's "default to a metaphor, not a chart." Cases where a chart genuinely is the right tool:

- **The concept literally IS a curve or function**: the GELU comparison, the calibrator shape, an activation function's response to its input. The curve is the concept; a chart shows the concept.
- **Distributional or statistical concepts**: histograms, density plots, scatter plots of paired samples.
- **Time-series**: anything indexed by an explicit time axis.
- **High-dimensional projections where the geometry is meaningful**: PCA scatter, t-SNE embedding, etc.

The acid test: *would the reader feel the meaning of this concept more strongly from a metaphor-based widget, or is the chart the most direct representation?* If you can't honestly say "the chart is the most direct representation," the chart is the default-laziness shape and you owe yourself another draft.

## Lesson-authoring checklist addition

Every lesson's polish pass gains one more mandatory check:

> **Creativity audit.** For every widget in this lesson, the two-draft rationale is recorded (in commit message or authoring notes). At least one widget per lesson uses a pattern from §3 of the metaphor library that isn't a chart. Lessons that ship with chart-only widgets must justify each chart against the "When charts ARE the right answer" criteria above.

This goes into the future `enrich-lesson` skill as another audit dimension alongside visualisation-gap, state-aware-explanation-gap, and assessment-gap detection.

## When to revisit

- Authoring any new widget — read the metaphor library first, write the two drafts.
- Reviewing someone else's lesson — apply the acid test.
- A new pedagogical pattern crystallises during authoring — add it to §library above as a numbered entry.
- A lesson ships with widgets that violate the discipline — note the violation in the commit message as a "creativity-audit miss" tag so it's findable for a later pass.
