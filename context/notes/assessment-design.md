# Assessment Design

## 1. Current Understanding

Assessments in Tessarix exist to test **understanding**, not memorisation. The distinction matters because each shape of assessment maps to a different cognitive demand, and only some of those demands correspond to actually grasping the material.

| Memorisation test | Understanding test |
|---|---|
| "What is recall?" | "Adjust the threshold so recall > precision." |
| "What is the formula for the fidelity head?" | "Set the adapter so A-FINE behaves like LPIPS — symmetric, no naturalness adaptation." |
| Tests: can you retrieve a definition | Tests: can you reason about the mechanism |
| Authoring cost: trivial | Authoring cost: requires the assessment to be interactive |
| Grading cost: trivial | Grading cost: success-check function or LLM judge |

MCQ tends to test the left column. The Google ML Crash Course's "adjust this classification threshold until precision is higher than recall" exercise is the canonical exemplar of the right column. TensorFlow Playground is the next level deeper — you literally configure a neural network and watch it learn or fail.

Tessarix should bias heavily toward right-column assessments, with MCQ reserved for the small set of cases where multiple-choice genuinely fits the cognitive task.

## 2. Rationale

The lesson-vs-quiz distinction is not "the lesson teaches; the quiz tests retention." It's "the lesson presents the mechanism; the assessment forces the reader to use the mechanism." If the assessment can be answered by recalling what the lesson said, it's testing whether the reader was paying attention, not whether the reader understands.

Two consequences:

1. **Most assessments should be interactive widgets, not text-only questions.** The reader manipulates the system to achieve a state, predicts an outcome and verifies, identifies a bug in a configuration, or builds a partial solution. These shapes require the reader to have an internal model of how the mechanism works, not just a memory of what the prose said.
2. **MCQ should be the exception, not the default.** It belongs when the question genuinely has 3-4 substantive options and choosing between them requires reasoning (counterfactuals, "which of these scenarios fits this constraint", etc.). It does NOT belong when one option is obviously correct and the others are distractors.

A separate but related point: **a single lesson should mix assessment shapes.** Variety isn't decorative — each shape probes a different cognitive demand. Repeating one shape exclusively (the current A-FINE state: seven MCQs) gives a one-dimensional signal of understanding.

## 3. Question Shape Taxonomy

The shapes Tessarix should support, mapped against the recurring-patterns catalog and tagged with what they test:

| Shape | Cognitive demand | Recurring pattern it uses | Authoring cost | Widget needed |
|---|---|---|---|---|
| **MCQ — counterfactual** ("If X were 0, the metric reduces to what?") | Reasoning about mechanism via thought experiment | None directly | Low | `<MultipleChoice>` (built) |
| **MCQ — definitional** ("What is recall?") | Memorisation | None | Trivial | `<MultipleChoice>` (built) — but should be avoided |
| **Goal-driven manipulation** ("Set sliders so output < 30") | Applying the mechanism to reach a state | Parameter sliders (pattern 7) + success check | Medium | `<GoalDrivenWrapper>` |
| **Predict-then-verify** ("Guess the score; reveal") | Calibrated intuition | Reveal pattern | Low | `<PredictThenVerify>` |
| **Numeric input** ("Compute this; type the answer") | Computation | None | Low | `<NumericAnswer>` (covered by `<PredictThenVerify>`) |
| **Fill-in-the-formula** (KaTeX with blanks) | Knowing why each term is there | Bidirectional highlight (pattern 3) | Medium | `<FormulaFillIn>` |
| **Drag-to-annotate** ("Label each pipeline stage") | Spatial reasoning about structure | Spatial proximity (pattern 6) | Medium | `<DragAnnotate>` |
| **Click-the-hotspot** ("Click the stage that would silently fail if you swap QuickGELU") | Diagnostic spatial reasoning | Spatial proximity + reveal | Low | `<ClickableHotspot>` |
| **Identify-the-bug** ("This code has c1=1e-6 — predict the effect") | Diagnostic thinking | State-overlay (pattern 15) | Medium-high | Custom per-lesson or `<BugSpotter>` generalised |
| **Code question** ("Implement the fidelity head") | Constructive understanding | Live model inference (pattern 14) | High | `<CodeQuestion>` (Monaco + test harness) |
| **Free-response with rubric reveal** ("Explain why A-FINE is asymmetric in 2-3 sentences") | Articulation | None initially; LLM-grading later | Low (static reveal); medium (LLM-graded) | `<FreeResponse>` |
| **LLM-conversational** ("The LLM asks you follow-up questions until it's satisfied") | Articulation under adaptive pressure | None initially | Low to author, infrastructure-heavy | `<LLMInterview>` — see [`llm-integrations.md`](llm-integrations.md) |

This is an open list. New shapes get added when a genuinely-distinct cognitive demand surfaces that the existing shapes don't cover. Additions should specify (a) the cognitive demand, (b) the recurring pattern, (c) the widget needed.

## 4. Question Groups

A `<QuestionGroup>` wraps multiple `<MultipleChoice>` (or other shape) primitives with **progressive difficulty** and **gate-keeping**. Only one question visible at a time; answering correctly unlocks the next; wrong answer offers retry + explanation. A progress strip across the top: ●●○○○.

```tsx
<QuestionGroup topic="Adapter asymmetry intuition" requireCorrect>
  <MultipleChoice ... difficulty="easy" />     // gate-keeper
  <MultipleChoice ... difficulty="medium" />
  <MultipleChoice ... difficulty="hard" />     // edge case
</QuestionGroup>
```

**When to use a question group**:

- The concept has a natural depth-progression. "Did you get the basic idea? OK now what about this edge case? OK now this counterfactual?" — three questions on the same concept, gradually probing deeper.
- The concept benefits from immediate retry on a wrong answer (the easy question gets retry; the hard question gets explained).
- The reader's confidence on Q3 should be conditional on having succeeded at Q1 and Q2.

**When NOT to use a question group**:

- The concept has only one assessment moment that fits. Don't pad to fill a group.
- The questions are independent — a horizontal `<KnowledgeCheck>` battery serves that better.
- The concept is light/intro material.

The existing `<KnowledgeCheck>` battery at the end of the lesson stays as a horizontal sweep of independent questions. `<QuestionGroup>` is for *vertical depth on one concept*. Both can coexist in one lesson.

## 5. Assessment Placement

The lesson should mix shapes deliberately, not uniformly. A rough heuristic:

| Where in the lesson | What shape fits |
|---|---|
| After an orientation section | One MCQ — usually counterfactual or option-among-real-alternatives. Confirms the reader has the right mental frame before going deeper. |
| After a new mechanism is introduced | Goal-driven manipulation OR predict-then-verify on the just-introduced widget. The reader uses the mechanism immediately. |
| Mid-lesson, after a counterintuitive section | Identify-the-bug or click-the-hotspot. The reader has to spot something subtle. |
| Before a major new section | Optional question group on the previous section — depth probe before moving on. |
| End of lesson | `<KnowledgeCheck>` battery mixing shapes — one MCQ, one free-response (LLM-graded eventually), one code question (for advanced tier). |

The current A-FINE lesson uses MCQ everywhere. Per this heuristic it should be ~6 assessment moments with 2 MCQs and 4 understanding-testing shapes.

## 6. Worked Example — A-FINE Assessment Rebuild

Mapping the abstract principles back to concrete lesson edits. The proposed rebuild of `src/lessons/afine.mdx`:

| Section | Currently | Should become |
|---|---|---|
| After "the IQA problem" | MCQ on FR vs NR in super-resolution evaluation | **Keep MCQ** — legitimate option-among-substantive-alternatives. The four options correspond to four real evaluation framings. |
| After "CNN-feature family" | MCQ on feature-vs-pixel | **Replace with predict-then-verify**: show two images and their LPIPS scores; ask reader to guess which would have a higher pixel-space MSE. Reveal — the answers diverge, which IS the point of the section. |
| After the pipeline widget | (nothing) | **Click-the-hotspot**: "Click the stage that would silently fail if you swapped QuickGELU for standard GELU." Single-click answer; tests diagnostic spatial reasoning. |
| After the calibrator grapher | (nothing) | **Goal-driven manipulation**: "Set the β parameters so that `q = 0` maps to `s ≈ 0.5`. Then set them so that the calibrator is purely linear (no sigmoid)." Success check fires for each goal. |
| After the adapter grapher | (nothing) | **Goal-driven manipulation**: "Set k so that an unnatural reference cuts the fidelity weight in half." Tests whether the reader understands what k controls, not just what it is. |
| After implementation traps | (nothing) | **Identify-the-bug**: a small code block showing `c1 = 1e-6`. "Will this implementation pass the parity test? Predict yes/no; reveal." |
| End-of-lesson knowledge check | 5 MCQs | **One MCQ (the counterfactual)** + **one free-response slot** ("Explain in 2-3 sentences why A-FINE is asymmetric in (distorted, reference)") with a static rubric reveal for now, LLM-graded once that infrastructure lands. |
| Bottom of lesson (complete tier only) | (nothing) | **Code question**: "Implement the SSIM-in-feature-space fidelity ratio in TypeScript." Test cases run against captured outputs. Requires `<CodeQuestion>` with Monaco — deferred but slot explicit. |

Result: 8 assessment moments, of which only 2 are MCQs. The rest layer onto existing widgets (no new infrastructure for `<GoalDrivenWrapper>`/`<PredictThenVerify>`/`<ClickableHotspot>` beyond their own components).

This is also a concrete example of the [`lessons-as-living-documents.md`](lessons-as-living-documents.md) principle — the A-FINE lesson will be revisited and improved as the assessment widgets ship.

## 7. Guiding Principles

- **MCQ is the exception, not the default.** Use it only when the cognitive task is genuinely "choose among substantive options." If the question can be reworked as a manipulation task, predict-then-verify, or identify-the-bug, prefer that.
- **Variety per lesson.** Every lesson with more than ~2 assessment moments should use at least 2 shapes. Single-shape lessons fail to probe understanding from enough angles.
- **The widget IS the question, often.** Goal-driven manipulation has no separate "question text plus answer field" — the widget's state IS the answer. The success check fires when the state matches the goal.
- **Question groups beat single questions for concepts with depth-progression.** Don't try to cram easy/medium/hard probing into one question. Use the group structure.
- **LLM-gradable shapes are not optional eventually.** Free-response and LLM-conversational interview modes are how the Interview pillar genuinely tests articulation. See [`llm-integrations.md`](llm-integrations.md) for the integration story.
- **Authoring cost increases with cognitive demand.** Goal-driven manipulations need a `check(state) → bool` function. Code questions need test cases. LLM-graded shapes need rubrics. Budget for this; assessment authoring is real work, not a postscript.

## 8. Open Questions

- **What's the right success-check API for goal-driven manipulation?** Likely `check: (state: Record<string, any>) => boolean` with the widget exposing its state to the wrapper. But what if the goal is a range, not a point? (`"set k between 0.6 and 0.8"`) → probably a check function is the right abstraction; ranges express as `(state) => state.k > 0.6 && state.k < 0.8`.
- **How to handle "I'm stuck" on a question group?** Skip button? Hint reveal? Just stay on the question? Tentatively: a "show the answer" reveal after N wrong attempts that explains the answer but doesn't mark the question correct. Open.
- **Should assessment results persist across sessions?** Yes once SQLite lands on the Tauri host (Quiz pillar M2/M3). Until then, per-page-load state only.
- **What does "completed a lesson" mean?** All assessments answered correctly? At least one attempt per assessment? Top-of-lesson reading position reached? Probably mixed — different milestones for "read it" vs "passed it."
- **Cost calibration for LLM-graded assessments.** Free-response grading via Claude is real API cost per attempt. Probably a per-session limit or a "request grading" button rather than auto-grade on submit.

## 9. Authored vs LLM-generated assessment text

Tessarix already has substantial LLM integration in the assessment surface:

- **Per-pick explanations** (via `<AnswerThread>`) — adaptive, state-aware, fired on every correct AND wrong reveal.
- **Tiered hints** (via `<GoalDrivenWrapper>`) — adaptive, anchored by an authoritative `solutionHint` so the LLM can't drift from the right answer.
- **Widget commentary** (via `<WidgetExplainer>`) — adaptive, state-aware, cites the reader's current values.
- **Widget-scoped chat** — fully open-ended.

What stays **authored** today: question text, option labels, the correct answer, goal predicates.

This split is deliberate and the recommended discipline is:

> **Question text stays authored. The explanation layer adapts.**

### Why questions stay authored

- **Correctness liability.** A 3B local model can write a question whose stated correct answer is actually wrong, or whose options are all equally plausible. Static MC questions are correct-by-construction; LLM-generated ones are correct-only-if-grounded-and-the-LLM-doesn't-hallucinate. The lesson author cannot audit infinite question variants ahead of time.
- **The hard work is the trap options.** Crafting the *plausible-but-wrong* distractors is what makes a good MC question. The 3B local model tends to produce one obviously-correct and three obviously-wrong options; the question loses bite. A good distractor reflects a *real* misconception, which the author knows from the lesson's content; the LLM has to guess what misconceptions the reader has.
- **Latency.** Generating a fresh MC question with 4 plausible options takes 3–8 seconds on local Ollama. The reader waits. Static questions are instant.
- **Reproducibility.** Two readers asked the same conceptual question see different surface forms; harder to compare reader performance, harder to debug "this question feels unfair," impossible to write a parity test for the lesson.
- **The Teach pillar is a curated artefact.** The lesson is supposed to be the author's best teaching pass on a concept. Outsourcing the assessment text dilutes the curation. The lesson should be *good*, not procedurally generated.

### Where LLM-generation does belong

**The Quiz pillar** (see [`three-pillar-model.md`](three-pillar-model.md)) is the natural home for LLM-generated question variants. Spaced-repetition over a topic wants *variety* in surface form; the canonical authored question becomes the seed, and the LLM produces rephrasings probing the same concept from different angles. The seed stays the canonical version with parity-test-grade question quality; the variants are practice rounds.

**The "give me another question" affordance** within a single authored question — a button that asks the LLM for a variant probing the same concept, framed differently. The reader can opt into more practice; the canonical question still grades cleanly; telemetry distinguishes canonical-question performance from variant performance. This is the cheapest LLM-question feature we could ship and the one that adds value without compromising the authored bar.

**Free-response grading** (deferred to the Interview pillar) — the reader writes a paragraph or runs code; the LLM grades against a rubric. This is genuinely LLM-driven assessment but is a different shape from "the LLM writes the question itself."

### The middle ground worth building

`<MoreLikeThis>` — an affordance on every authored question that lets the reader click "another question on this concept" and get an LLM-generated variant. The variant uses the canonical question as a template ("rephrase to probe the same misconception in a different scenario; preserve the option count and difficulty"). Telemetry tags canonical vs variant. The LLM is anchored by the authored question's *intent* (correct answer + the misconception each wrong option represents), so it can't drift.

This is not yet built. It belongs alongside `<GoalChain>` as a future widget primitive; capture it as a candidate when the Quiz pillar is being designed.

### What this rejects

- **Replacing authored MC questions with LLM-generated ones on lesson load**. Even if the LLM is grounded and the questions look fine, the author has lost authorial control over the assessment surface — and so has the lesson reviewer.
- **"Generate the whole question bank at lesson author time and check it in"**. Tempting (correctness can be audited once) but quickly becomes maintenance debt — every lesson change desynchronises the generated bank. The seed-question + on-demand variants model has neither problem.
- **LLM-graded goal predicates**. The check function in `<GoalChain>` is a tight predicate over numerical state. There's no reason to make this LLM-graded — it's already exact.

## 10. Related Systems and Notes

- [`lessons-as-living-documents.md`](lessons-as-living-documents.md) — the principle that A-FINE's assessment layer WILL be rebuilt is what makes the worked example in §6 normal work rather than a heroic rewrite.
- [`llm-integrations.md`](llm-integrations.md) — LLM-graded free-response and LLM-conversational interview shapes live there.
- [`interface-affordances.md`](interface-affordances.md) — the complexity tier system controls *which* assessments show at which tier (the code question only at `complete`, the easy MCQ at `essential`, etc.).
- [`three-pillar-model.md`](three-pillar-model.md) — the Teach pillar embeds assessments inline; the Quiz pillar surfaces them with SR spacing; the Interview pillar uses the LLM-graded and LLM-conversational shapes specifically.
- [`../references/inspirations/recurring-patterns.md`](../references/inspirations/recurring-patterns.md) — each assessment shape uses one or more recurring patterns; the catalog is the source of truth for which patterns exist.
- [`../references/inspirations/stem-core/machine-learning.md`](../references/inspirations/stem-core/machine-learning.md) — Google ML Crash Course and TensorFlow Playground belong here as benchmark inspirations for understanding-testing assessment. Currently not in the file; should be added.

## 10. References worth pulling in

When this note next gets revisited, the following exemplars should be in the inspirations catalog and cross-referenced from here:

- **Google ML Crash Course** — the canonical example of "adjust the threshold to reach a stated condition" assessments. Their fairness-and-bias module, the precision/recall classification-threshold exercise, the embeddings projector — all in this lineage.
- **TensorFlow Playground** (`playground.tensorflow.org`) — configure a neural network; watch it learn or fail; the success is reaching a low loss, not picking an option.
- **The Distill.pub interactive papers** (already in `stem-core/machine-learning.md`) — the "explore the model state by clicking around" pattern overlaps with assessment when made goal-driven.
- **CodeSignal / LeetCode / Exercism / Codewars** — the lineage of `<CodeQuestion>`. Not currently in inspirations because they're exercise platforms rather than interactive learning, but worth a single entry as the floor expectation for code-question UX.
