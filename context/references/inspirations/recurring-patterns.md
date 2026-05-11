# Recurring Patterns

This file is the synthesis of ~73 interactive-learning tools surveyed during initial Tessarix research. Per-tool entries live in `stem-core/`, `technical-specialised/`, and `wildcards/`. This file extracts the recurring **shapes** — what the tools have in common, what makes those shapes work, and how to apply them in Tessarix.

The patterns are what scaled. The exemplars are evidence. The "Why it works" rationale is what to test new pattern proposals against. The "How to apply" guidance is the bridge from *observed elsewhere* to *implemented here*.

## Table of contents

- [The patterns](#the-patterns) — 15 primary interaction patterns
- [Cross-cutting properties](#cross-cutting-properties) — orthogonal attributes that compose with any pattern
- [Composability](#composability) — patterns that combine well
- [Selection guidance](#selection-guidance) — which pattern for which teaching task
- [What's missing](#whats-missing) — patterns expected but not found

---

## The patterns

### 1. Locked-prose gating

**Essence**: Each paragraph or section of prose is locked until the reader performs an interaction. Reading cannot proceed without doing.

**Exemplars**:
- Mathigon — drag a polygon to tile a plane before the next paragraph appears.
- Brilliant.org — soft version: in-line problems before continuing (technically skippable but flow-encouraging).

**Why it works**: Forces active engagement. Eliminates passive skimming. The act of doing creates encoding that prose alone wouldn't produce.

**How to apply in Tessarix**: Teach pillar. Implement as a `<Gate predicate={...}>...</Gate>` MDX component that hides downstream content until a condition is met (a question answered, a slider moved, a code question passing). Best used per-section, not per-paragraph — gating every paragraph crosses the line from engagement to friction.

**Variants and combinations**: Hard gate (literally blocks scroll) vs soft gate (warns but allows). Hard is more effective but more abrasive. Combines well with step-by-step state advance (Mathigon does this).

**When NOT to use**: References, side comments, anything the reader may legitimately want to skim. Don't gate everything — friction becomes barrier.

---

### 2. Scroll-driven animation (scrollytelling)

**Essence**: The visualisation state is driven by scroll position. Scrolling IS the interaction.

**Exemplars**:
- MLU-Explain — drag a model-complexity slider; scrolling advances the bias-variance animation.
- The Pudding — score-follower highlights as you scroll a musical motif analysis.
- TLS xargs — collapsible byte-level annotations unfold as you scroll the handshake.
- The Illustrated TLS — every record expands inline as the page progresses.

**Why it works**: Zero friction. The reader doesn't decide to interact; their existing scroll behaviour is the interaction. Sequential nature aligns with how prose is read.

**How to apply in Tessarix**: Teach pillar. Best for animated state transitions where order matters — algorithm steps, training epochs, protocol phases. Use a library like Scrollama or a custom `<ScrollDriven>` MDX component.

**Variants and combinations**: Continuous (visualisation responds to scroll Y-position pixel-by-pixel) vs trigger (jumps to discrete states at section boundaries). Continuous feels smoother; trigger is simpler to author. Combines well with bidirectional highlight (scroll a paragraph, the relevant figure element highlights).

**When NOT to use**: Reader-driven exploration. If the reader wants agency in *what* to inspect, scroll-as-interaction takes it away.

---

### 3. Bidirectional highlight between two representations

**Essence**: Same information shown in two views; clicking one highlights the corresponding element in the other.

**Exemplars**:
- AST Explorer — click source span ↔ AST node, bidirectionally.
- Compiler Explorer (Godbolt) — source line ↔ assembly instructions.
- Seeing Speech (Glasgow) — IPA symbol ↔ MRI video of the vocal tract.
- Pudding Music DNA — DAG node ↔ audio sample.

**Why it works**: Builds the mental model of correspondence between two formalisms concretely rather than verbally. The mapping becomes visible, not just described.

**How to apply in Tessarix**: Teach pillar. Excellent for any concept with two natural representations: equation ↔ graph, code ↔ AST, recursive call ↔ stack trace, regex ↔ NFA, type-derivation ↔ expression, prose explanation ↔ formal definition. Implement as a paired-component primitive — `<LinkedViews>` with a shared selection state.

**Variants and combinations**: Two-view (source ↔ derivative) vs N-view (one-to-many: click source span, all derivatives highlight). Pairs naturally with multi-view pivot (pattern 4) when N > 2.

**When NOT to use**: Single-representation concepts where forcing a second view would feel manufactured. Don't pair an equation with a redundant equivalent — pair it with a *different kind* of representation.

---

### 4. Multi-view pivot (N representations)

**Essence**: Same dataset rendered as N different geometric structures; reader switches between them on demand.

**Exemplars**:
- Diachronica — 5 visualisations of the same word-history data (tree, network, timeline, map, sunburst).
- Seeing Speech — same phoneme as MRI video, ultrasound, 2D sagittal cross-section.

**Why it works**: Different geometric framings make different properties visible. Reader builds intuition by seeing where the same fact appears differently — and where it doesn't.

**How to apply in Tessarix**: Teach pillar. Use for data structures (one dataset → tree / hash / sorted array / adjacency list views). Use for ML internals (one model → weights matrix / activation map / loss curve / saliency map). Implement as a tab/segmented-control primitive — `<PivotViews>` with a shared dataset prop and per-view render children.

**Variants and combinations**: Toggle-between-views (mutually exclusive, one visible at a time) vs juxtapose-all-views (side-by-side small multiples). Juxtapose is denser and lets the reader compare; toggle preserves screen real estate.

**When NOT to use**: When one view dominates so completely that alternatives feel academic. Don't manufacture five views just because the pattern is fashionable.

---

### 5. Multi-level zoom with causal propagation

**Essence**: Zoom in or out across levels of abstraction; a change at one level propagates causally to other levels.

**Exemplars**:
- Connected Biology — molecular mutation ↔ cellular ↔ organism phenotype ↔ population allele frequencies, all causally linked.
- Transformer Explainer — zoom from architecture view to individual operations; click an operation, see its inputs/outputs in context.

**Why it works**: Builds a genuine multi-level mental model. Reader sees that abstractions aren't independent — they're nested, and changes propagate.

**How to apply in Tessarix**: Teach pillar. Use for any layered concept: compiler passes (source → AST → IR → assembly), network stack (HTTP → TCP → IP → Ethernet), microservices → functions → instructions, neural network architecture → layer → neuron → weight. Implement as a zoom-state primitive that several connected widgets share.

**Variants and combinations**: Geometric zoom (camera moves through a scene continuously) vs abstraction-toggle (switch between fixed levels). Combines naturally with bidirectional highlight (pattern 3) for the cross-level correspondence.

**When NOT to use**: Flat domains without genuine hierarchical structure. Don't manufacture levels of abstraction where there aren't real ones.

---

### 6. Spatial proximity encodes relationship

**Essence**: A 2D (or N-D) layout where physical proximity equals semantic or mathematical proximity. Position carries meaning.

**Exemplars**:
- Circle of fifths (muted.io) — key adjacency on the circle = harmonic proximity.
- Tonnetz lattice (Chord Progressor) — chord distance on the lattice = harmonic distance.
- Interactive American IPA Chart — grid position (place × manner) = phonetic similarity.

**Why it works**: Off-loads relationship structure into spatial intuition. Reader navigates a map rather than memorising a table. Spatial reasoning is one of the most developed cognitive faculties; this pattern uses it.

**How to apply in Tessarix**: Teach pillar. Excellent for hyperparameter space (2D grid of learning rate × batch size with loss heatmap), truth tables, type matrices of generic systems, lattice-based type systems, modular arithmetic, vector-space embeddings.

**Variants and combinations**: Static layout (printed map; positions are fixed by design) vs animated layout (force-directed graph where positions emerge from constraints).

**When NOT to use**: Relationships that don't naturally embed in 2D. High-dimensional structures often look incoherent when projected — use a different pattern (or pair with multi-view pivot for several projections).

---

### 7. Parameter sliders driving a causal system

**Essence**: One or more sliders; every dependent variable redraws in real time. The system is causally connected — moving one input ripples through.

**Exemplars**:
- En-ROADS — 30 policy sliders → temperature trajectory, sea level, energy mix, GDP all redraw.
- Gradient Boosting Explainer — depth + ensemble size → target / approximation / residual curves.
- EveryCircuit — component value → oscilloscope trace.
- oPhysics — slider per parameter → physics animation + corresponding graphs.

**Why it works**: Reader builds *sensitivity* intuition by feel — "if I move this, what moves with it?" The number of dependent variables updating simultaneously is what produces causal understanding.

**How to apply in Tessarix**: Teach pillar. Excellent for hyperparameter sensitivity (move learning rate, watch loss curve evolve), Greeks in options pricing, control systems, RL reward shaping (move the reward function, watch the policy converge differently). `<FunctionGrapher>` is the simplest case of this pattern; richer versions wire N sliders to M dependent visualisations.

**Variants and combinations**: Few knobs (focused sensitivity exploration) vs many knobs (system-level exploration). Many-knobs is harder to author but more powerful for emergent behaviour. Combines with state-overlay (pattern 15) — compare your-scenario against baseline.

**When NOT to use**: Discrete-state systems where continuous sliding doesn't apply. Use step-by-step advance instead.

---

### 8. Time-scrubber over a state machine

**Essence**: A horizontal time axis; scrubbing replays state evolution at any point.

**Exemplars**:
- BGPlay — scrub through BGP routing events over time, watch ASes update.
- Chronas — slide the time bar, watch the world map of borders/empires reform.
- Histography — scrub a 14-billion-year timeline of all history.
- Running Reality — type a year, the full world rebuilds at that date.

**Why it works**: Reader can rewind, replay, freeze, compare. The temporal dimension becomes explorable, not just observed. Critical for trajectory-shaped concepts where the path matters as much as the endpoints.

**How to apply in Tessarix**: Teach pillar (history-like trajectories) and Quiz pillar (replay your own attempts). Apply to gradient descent checkpoints, distributed consensus log progression, compilation pass outputs over time, version-control branching, training-loop epoch-by-epoch.

**Variants and combinations**: Continuous scrub (smooth replay) vs discrete checkpoints (snap to specific moments). Combines well with step-by-step advance (pattern 9) — scrub coarsely, then step-advance for detail.

**When NOT to use**: State machines too short to scrub through. If there are 4 states, just show all 4.

---

### 9. Step-by-step state machine advance

**Essence**: A discrete "Next" button advances one symbol, opcode, packet, or step at a time. The reader controls the cadence.

**Exemplars**:
- Secret Lives of Data (Raft) — click Next to advance the protocol frame-by-frame.
- FSM Simulator — feed a string, step symbol-by-symbol.
- Python Tutor — instruction-by-instruction with call stack visible.
- Tenderly EVM Debugger — opcode-by-opcode with storage/stack/memory shown at each step.
- CipherFlow — cipher round-by-round.

**Why it works**: Freezes time. Lets the reader read annotations at each step, then advance when ready. Removes the cognitive load of trying to follow continuous animation while reading explanations.

**How to apply in Tessarix**: Teach pillar. The cleanest match for any algorithm explanation. For Tessarix specifically, this is the `<StepController>` primitive scoped in the README — it's pattern 9 implemented. Apply to: algorithm playgrounds (the M2 vision), backprop unroll, attention computation step-by-step, query execution plan walkthrough.

**Variants and combinations**: Forward-only vs forward+backward. **Backward is critical** for letting the reader undo without restart. Auto-play with adjustable speed is a useful third option for review passes.

**When NOT to use**: Continuous-time systems where steps are arbitrary. Don't fake discrete steps onto inherently continuous dynamics.

---

### 10. Draw-and-simulate (author mode)

**Essence**: Reader builds the model themselves, then runs it.

**Exemplars**:
- LOOPY — draw causal graph, hit play, watch the system evolve.
- CircuitVerse — build a digital circuit, toggle inputs, watch signal propagation.
- Quirk — drag quantum gates onto qubits, watch the state vector update.
- Argdown — write argument structure as text, see DAG render live.

**Why it works**: Author mode is structurally deeper than consume mode. Building the model surfaces what you don't understand; running it gives feedback on whether your construction matches intent. This is why visualgo's "edit input and re-run" is more pedagogical than passive animations.

**How to apply in Tessarix**: Teach pillar (advanced sections) and Interview pillar (rehearse by reconstructing). Apply to: build a neural network from primitives and watch it learn; build a parser from grammar rules and watch it parse; build a consensus protocol and inject node failures.

**Variants and combinations**: Free-form authoring (any structure allowed) vs constrained authoring (only these primitives). Constrained is better for teaching specific concepts; free-form is better for exploration. Combines with break-it-to-understand (pattern 11) — build it, then attack your own construction.

**When NOT to use**: Concepts where building the model from scratch is more work than learning it. Sometimes consume-mode is the right level — don't make the reader rebuild the wheel.

---

### 11. Break-it-to-understand-it

**Essence**: Reader attacks the system; understanding emerges from finding the vulnerability or unintended state.

**Exemplars**:
- CryptoHack — 260+ challenges where you exploit a cryptographic primitive to recover a flag.
- Quantum Game — achieve a specific output using only allowed quantum components.
- Evolution of Trust — play against opponents until you understand their strategy.

**Why it works**: Defensive understanding emerges from offensive practice. You don't truly understand a protection until you know how it fails. The adversarial frame is also strongly engaging — there's a goal, not just material.

**How to apply in Tessarix**: Quiz and Interview pillars. Apply to: MVCC anomalies (cause one), attention adversarial inputs (find one), race conditions (trigger one), distributed-systems partitions (split a cluster). The Quiz pillar's "guiding question on stumble" is a soft version; the harder version is "construct an input that breaks this assumption."

**Variants and combinations**: Forced break (the goal IS to find the bug) vs allowed break (you may break it but don't have to). Forced is more pedagogical; allowed is less coercive. Combines naturally with draw-and-simulate (pattern 10) when the user-built model is what gets attacked.

**When NOT to use**: Concepts without an adversarial dimension. Breaking a sorting algorithm is less illuminating than breaking a hash function — pick concepts where failure modes are themselves load-bearing knowledge.

---

### 12. Concept enacted by the medium (self-reference)

**Essence**: The teaching tool IS an instance of the thing being taught. Self-referential.

**Exemplars**:
- Nicky Case, "How to Remember Anything Forever-ish" — the comic uses spaced repetition to teach spaced repetition (flashcards appear at spaced intervals AS YOU READ).
- Evolution of Trust — the game teaches game theory by being a game.

**Why it works**: The reader experiences the concept directly rather than learning about it. The medium is the strongest possible demonstration; you cannot avoid the lesson because you are inside it.

**How to apply in Tessarix**: **Quiz pillar specifically.** The Quiz pillar already IS Tessarix enacting spaced repetition on the user — this is the cleanest possible alignment. For Teach pillar: when teaching attention mechanisms, build an interface that uses attention (highlights what you've been looking at, decays unviewed regions); when teaching caching, make the lesson UI itself cache content visibly.

**Variants and combinations**: Strong self-reference (the medium fully enacts the concept) vs weak (the medium uses the concept incidentally as flavour).

**When NOT to use**: Concepts that don't map onto a tool's own behaviour. Don't force self-reference where it would feel contrived.

---

### 13. Layer-peel via opacity

**Essence**: An opacity slider controls how much of each layer is visible. Peel from outer to inner.

**Exemplars**:
- Zygote Body — opacity slider peels skin → fat → muscle → nerve → bone.
- BioDigital Human — clinical version, with overlayable disease states on top of healthy anatomy.

**Why it works**: Smooth, continuous control over abstraction depth. Reader can pause at any intermediate point (half-skin-half-muscle) to study the boundary — something hard-toggle visibility cannot do.

**How to apply in Tessarix**: Teach pillar. Apply to network stack (toggle HTTP off, see TCP), compiler passes (toggle optimisations off, see un-optimised IR), abstraction layers in a microservice architecture diagram. Implement as a `<LayerPeel>` primitive — N stacked layers, each with an opacity slider.

**Variants and combinations**: Discrete layers (each layer is a toggle) vs continuous opacity (one slider per layer). Continuous reveals intermediate states; discrete is cleaner when there are no meaningful intermediate states.

**When NOT to use**: Abstractions that don't have a clear stacking order. Don't force layering on a flat domain.

---

### 14. Live model inference / training visible

**Essence**: A real model runs in-browser; the reader interacts with it while it's running.

**Exemplars**:
- Transformer Explainer — live GPT-2 Small via ONNX Runtime Web; type any prompt and every sub-computation updates.
- REINFORCEjs — live RL training in-browser, edit reward function mid-training.

**Why it works**: Reader sees actual behaviour, not pre-recorded animation. Edits have real consequences. The model's *alive* state makes it feel like a system, not a diagram.

**How to apply in Tessarix**: Teach pillar for ML concepts. Increasingly viable for small models (GPT-2 Small, small CNNs, simple RL agents) via ONNX Runtime Web, WebGPU, or ggml-wasm. The technical complexity is non-trivial but the pedagogical payoff is among the strongest patterns here. Likely a Milestone-2 or Milestone-3 target — not M1.

**Variants and combinations**: Pretrained inference (the model is fixed; you change inputs) vs live training (the model trains as you watch; you can intervene). Live training is more interactive but harder to set up.

**When NOT to use**: Models too large for in-browser inference. Don't try to ship GPT-4 in a webview — choose a small representative model that exhibits the same phenomenon.

---

### 15. State-overlay comparison

**Essence**: Two versions of the same state shown overlaid or side-by-side. One is baseline; one is modified.

**Exemplars**:
- BioDigital Human — diseased anatomy overlaid on healthy.
- Git diff visualisers — modified code overlaid on baseline.
- En-ROADS scenario shareables — your policy mix vs business-as-usual baseline.

**Why it works**: Comparison is more legible than parallel narration. The reader's eye finds differences automatically; the cognitive work is offloaded onto perception.

**How to apply in Tessarix**: Teach pillar. Apply to: a buggy execution trace overlaid on the correct one (debugging lessons), an adversarial vs clean input in an ML visualiser, before/after refactoring, normal vs corner-case algorithm behaviour, gradient descent path under different learning rates overlaid.

**Variants and combinations**: Overlay (transparent on top of baseline) vs side-by-side. Overlay emphasises differences; side-by-side preserves both representations independently. Combines with parameter sliders (pattern 7) — the slider drives the modified version, baseline stays fixed.

**When NOT to use**: When the difference is too small to see, or too large to align meaningfully. Use a difference-of-numbers display instead.

---

## Cross-cutting properties

These are orthogonal attributes; they apply across many of the 15 patterns rather than competing with them.

### In-prose widgets (vs separate-panel)

The widget lives inline with the paragraph that introduces it, not in a separate panel or sub-route. The reader doesn't context-switch.

**Exemplars**: Setosa.io, MLU-Explain, boringSQL all embed widgets directly in prose.

**For Tessarix**: Prefer inline `<Widget />` inside MDX over linking to a separate route. This is consistent with the MDX-first architecture in the project README. Exception: deeply exploratory tools (a full algorithm playground) belong in their own route under `/<topic>/playground/...` so they have screen space.

### Shareable scenario URLs

Widget state encoded in the URL so a reader can send a friend the exact configuration.

**Exemplars**: En-ROADS, Quirk both encode full scenario state in URL fragments.

**For Tessarix**: Every widget that takes parameters should be URL-encodable. This is also a soft form of saved progress and a sharing surface for lessons. Implement once at the framework level; every widget gets it for free.

### Reproducible from primary source

The interactive demonstration is backed by a real reproducible artefact — a shell command, a Python script, a transaction hash.

**Exemplars**: TLS xargs provides shell commands to regenerate every record; CryptoHack challenges connect to live servers.

**For Tessarix**: When teaching a concept implemented in this codebase or a referenced one, include the actual code or command so the reader can leave the widget and verify. The widget should never be the only source of truth — it should be a representation of code that exists.

### Game / puzzle constraint structure

A subset of tools wrap their interactivity in a goal: "achieve this output with these components." This adds engagement but constrains what can be taught.

**Exemplars**: Quantum Game, CryptoHack, Evolution of Trust.

**For Tessarix**: Optional for now — most lessons will use unconstrained widgets. A few advanced lessons could benefit from the puzzle frame: "build a transformer attention head from these primitives that achieves this attention pattern" or "construct a query plan with this cost using these operators." Reserve for M3+ unless an early lesson clearly fits the shape.

---

## Composability

Patterns are not exclusive. The strongest tools combine 2-3 patterns deliberately.

| Combined patterns | Tool that exemplifies |
|---|---|
| Locked-prose gating + step-by-step advance | Mathigon (complete each step to unlock next paragraph) |
| Multi-level zoom + bidirectional highlight | Transformer Explainer (zoom from architecture to op; click either view to highlight the other) |
| Parameter sliders + state-overlay | En-ROADS (your-scenario sliders, baseline stays as ghosted trajectory) |
| Time-scrubber + step-by-step advance | BGPlay (scrub coarsely OR step-advance frame-by-frame) |
| Draw-and-simulate + live model inference | Quirk for tiny circuits; future Tessarix "build an attention head" widget |
| Self-reference + spaced repetition | Nicky Case Remember (the Quiz pillar's exemplar) |
| Multi-view pivot + bidirectional highlight | Diachronica (switch view; selection persists across views) |
| Break-it + draw-and-simulate | CryptoHack (you build the exploit; the server tells you if you broke it) |

**Compositional principle**: pick a primary pattern that matches the topic's shape, then layer a secondary pattern that addresses what the primary pattern leaves underdetermined. A primary pattern of "step-by-step advance" tells you *how* the reader controls the cadence but says nothing about *what to show at each step*; layering "bidirectional highlight" answers that by linking the step's source to its effect.

---

## Selection guidance

When designing a new lesson or widget, work backward from the teaching task to the pattern. This table is the entry point.

| Teaching task | First-choice patterns | Secondary patterns to layer |
|---|---|---|
| A procedure (algorithm, protocol, training loop) | Step-by-step advance (9), Scroll-driven (2) | Bidirectional highlight (3) for source-to-effect |
| A relationship (graph, lattice, dependency) | Spatial proximity (6), Multi-view pivot (4) | Bidirectional highlight (3) |
| A causal system (physics, control, RL) | Parameter sliders (7), Draw-and-simulate (10) | State-overlay (15) for comparison |
| Abstraction layers (OS, compiler passes, network stack) | Multi-level zoom (5), Layer-peel (13) | Bidirectional highlight (3) |
| Invariants and contracts (what must hold) | Break-it (11) | Draw-and-simulate (10) for "build then break" |
| A historical or trajectory concept (gradient descent, branching) | Time-scrubber (8) | Step-by-step advance (9) for detail |
| A correspondence (source ↔ AST, equation ↔ graph) | Bidirectional highlight (3) | Multi-view pivot (4) if more than 2 reps |
| Sensitive dependence (chaos, gradient explosion) | Parameter sliders (7) + Draw-and-simulate (10) | State-overlay (15) for two trajectories |
| Construction (build the model from primitives) | Draw-and-simulate (10) | Live model inference (14) if the construct should run |
| A live system that responds | Live model inference (14) | Parameter sliders (7) for control |
| Meta/process concepts (spaced repetition, attention) | Self-reference (12) | Locked-prose gating (1) for forced demonstration |
| Comparison (good vs bad code, healthy vs buggy) | State-overlay (15) | Parameter sliders (7) to drive the modified version |

Reverse-direction lookup: if you find yourself reaching for a particular pattern, ask which row of this table the topic belongs to — make sure the pattern matches the task before you build.

---

## What's missing

Patterns expected but not surfaced in this survey. Worth flagging for future iteration as the catalog grows.

- **Collaborative interactive learning** — two people interacting with the same widget simultaneously, live. Surprisingly rare. CircuitVerse has multi-user workspaces but at the workspace level, not the widget level. Could be a Tessarix differentiator if the substrate supports it; could also be a dead-end if asynchronous-only is the right scope.
- **Adaptive content rewriting** — the prose itself adapts to what the reader has gotten wrong. The Tessarix sync-learning agent is designed to do this *offline* (regenerate lesson drafts based on `Learning/` deltas), but no surveyed tool does it *inline* (regenerate the next paragraph in real time based on the last response). Possibly an LLM-era opportunity; possibly more annoying than helpful.
- **Voice / audio as a primary mode** — music tools use audio as output; none of the surveyed tools use audio as input or as the primary interaction surface. May be a Tessarix opportunity for some topics (e.g. music theory or signal processing), may be a dead-end for everything else.
- **Haptic feedback** — entirely absent (and out of scope for a webview app), but worth noting as a dimension of interactivity that interactive learning hasn't yet broadly explored.

Adding to the patterns above is allowed and expected — the upkeep-context skill's open-list permission applies. When a new tool exhibits a pattern that doesn't fit any existing entry here, add a new numbered entry.
