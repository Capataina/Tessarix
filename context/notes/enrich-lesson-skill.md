---
name: enrich-lesson skill — design discussion (not yet built)
description: How Tessarix should mechanise the visualisation-over-prose audit, the assessment-coverage audit, the cross-page-hyperlink audit, and the multi-step goal-driven question expansion. Captures requirements, design options, and constraints. Implementation is deferred until the spec is complete.
type: project
---

# enrich-lesson skill — design discussion

## The problem

The visualisation-over-prose principle ([`visualisation-over-prose.md`](visualisation-over-prose.md)) is real but easy to violate quietly. Every new lesson is at risk of shipping with visualisable concepts described in prose, missing assessments in sections that should have them, missing cross-page hyperlinks to other lessons that already exist, and missing glossary links. Relying on the author (human or agent) to remember every dimension during every polish pass is the failure mode the principle was supposed to prevent.

The question is **how to enforce the discipline mechanically**, not just declaratively.

**Why:** The visualisation gap in the A-FINE lesson (PSNR/SSIM section shipped as prose only, despite the entire punchline being *the metrics disagree*) demonstrated the failure mode in practice. The principle was written; the principle was not enforced. The same will happen on every future lesson without a mechanism.

**How to apply:** Treat this note as the requirements document for the future `enrich-lesson` skill. Read it when designing the skill, when reviewing the skill's first run, and when adding new audit dimensions later.

## Enforcement options considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **CLAUDE.md addition** | Read by every session, principle propagates automatically | The principle is already in `context/notes/visualisation-over-prose.md`; CLAUDE.md gets bloated; doesn't enforce, only reminds | Complementary, not sufficient |
| **Lint script (static analysis on MDX)** | Mechanical, runs in CI | How do you *statically* detect "this paragraph should be a widget"? Heuristics ("two formulas in a row with no widget between them") are brittle and produce false positives on definitions and historical context | Hard to do well; useful as a *signal generator* but not a *failure gate* |
| **Agent skill (`enrich-lesson`)** | Agent can reason about content semantically; can suggest concrete widget types with concrete code; can chain into multiple audit dimensions | Needs careful design to avoid "suggest a widget for everything" failure mode; needs explicit guardrails | **Right shape** — but needs proper spec |
| **Mandatory authoring checklist** | Explicit, evidentiary, can be cited; cheap to add | Depends on the author to actually walk it; can be skipped silently | Complementary to skill; cheap addition |
| **CI failure gate** | Mechanical | False positives on legitimate prose; would block ships for the wrong reasons | Weak |

**The recommendation: build the agent skill, with a mandatory authoring checklist as a cheaper interim mechanism.**

## What the skill should do

`enrich-lesson` is an agent skill that takes a single MDX file path (and optionally a section anchor) and produces a structured **enrichment report** listing every place the lesson could be strengthened. It does **not** auto-edit the lesson — the author reads the report and decides.

### The audit dimensions

For each lesson the skill walks, it produces findings against the following dimensions (this is the catalogue; the skill enforces *all of them*, not a subset):

1. **Visualisation gaps.** For every concept the lesson names, classify *would the reader's understanding improve if they could manipulate a parameter and watch the output change?* When yes and no widget exists in that section, file a finding with a concrete proposed widget (component name, props, what the reader can manipulate, what changes in response). The principle is in [`visualisation-over-prose.md`](visualisation-over-prose.md).

   **1a. State-aware-explanation gaps.** For every interactive widget present in the lesson, check that its accompanying explanation comes through `<WidgetExplainer>` rather than a hardcoded caption, and that the widget exposes a state-summary callback. When a widget falls back to a static caption — especially generic ones of the "try isolating one at a time" form — file a finding with the prop wiring needed to make the explanation state-aware. The principle is in [`explanations-must-adapt-to-state.md`](explanations-must-adapt-to-state.md).

2. **Assessment gaps.** For every major section, check whether at least one assessment widget exists in or after it (MultipleChoice, PredictThenVerify, ClickableHotspot, GoalDrivenWrapper, Misconception, KnowledgeCheck). When missing, propose a concrete question with the right widget shape per [`assessment-design.md`](assessment-design.md).

3. **Cross-page hyperlink gaps.** For every concept the lesson mentions, check whether another lesson already exists for it (`src/lessons/<slug>.mdx`). When yes and no cross-page link exists, file a finding. The content architecture is in [`content-architecture.md`](content-architecture.md).

4. **Glossary gaps.** For every concept the lesson mentions that does not warrant its own lesson but appears in `src/glossary.mdx` (once it exists), check whether the mention is linked. When not, file a finding.

5. **Misconception coverage.** For every section that asserts something contestable ("This is *not* X, it *is* Y" / "The natural assumption is wrong because…"), check whether a Misconception widget surrounds the assertion. When missing, propose the misconception belief and the corrective.

6. **Tier coverage.** Check that the lesson has content at all three tier levels (`<Tier level="lite">`, `<Tier level="standard">`, `<Tier level="complete">`). When a tier is absent, file a finding (some lessons may legitimately have only standard + complete, but the skill should surface the absence).

7. **Frontmatter consistency.** Compare the `widgets_used` array in the lesson's frontmatter against the components actually imported and rendered in the body. File findings for both directions (declared but not used; used but not declared).

8. **Multi-step goal expansion opportunities.** For any widget that exposes multiple state predicates (e.g., the MetricComparison widget can satisfy "PSNR > SSIM", "PSNR = SSIM", "SSIM > PSNR"), check whether a multi-step goal chain has been authored. When not, propose the chain.

9. **AnswerThread coverage.** Every assessment widget should have AnswerThread integration. When `disableLlmThread` is set without a comment justifying it, file a finding.

10. **Cross-reference completeness.** Check that the "Where to read next" section at the end of the lesson includes the canonical paper / PR / reference implementation links per [`authoring-discipline.md`](authoring-discipline.md).

### Multi-step goal-driven questions — the new widget primitive

User-requested. A widget primitive (working name: `<GoalChain>`) that walks the reader through a *sequence* of state predicates, each unlocking the next:

```mdx
<GoalChain
  widget={<MetricComparison />}
  steps={[
    {
      goal: "Make PSNR > SSIM (relatively).",
      check: (s) => s.psnr > 30 && s.ssim < 0.9,
      explanation: "Translation drops PSNR sharply but SSIM is more robust...",
    },
    {
      goal: "Now make them roughly agree.",
      check: (s) => Math.abs(s.psnr / 50 - s.ssim) < 0.1,
      explanation: "Gaussian noise hits both metrics — they were designed to...",
    },
    {
      goal: "Now make SSIM drop while PSNR stays high.",
      check: (s) => s.psnr > 35 && s.ssim < 0.8,
      explanation: "Heavy blur preserves average pixel values...",
    },
  ]}
/>
```

This is a higher-order interaction than a single goal. It teaches the reader *the shape* of the disagreement space, not just one corner of it. The enrich-lesson skill should propose chains whenever a widget supports multiple predicates, because chains are typically a much stronger pedagogical surface than three separate single-goal questions.

`<GoalChain>` is its own widget to design carefully; the open questions are:
- Should completed steps stay visible, or collapse?
- Should the reader be able to skip ahead, or are steps strictly sequential?
- Does the chain telemetry emit per-step events, or one summary event?
- How does `<GoalChain>` compose with `<GoalDrivenWrapper>` — is it a strict superset, or a sibling?

These questions need answering before the widget is built. The skill design depends on the widget design.

### The report format

The skill produces a single `_enrichment-report.md` next to the audited lesson (or in `context/plans/lesson-enrichment-<slug>.md` if we want plans to track this). Format mirrors `upkeep-context`'s `_staleness-report.md`:

```markdown
# Enrichment report: afine.mdx

Audit date: <iso>
Audit duration: <ms>
Concepts inspected: <n>
Findings: <n total> (<n high>, <n medium>, <n low>)

## High-impact findings

### F1. Visualisation gap — "PSNR vs SSIM" section (lines 80–96)
Severity: high
Dimension: visualisation
Concept: comparison of two metrics that disagree
Current treatment: two formulas + paragraphs asserting the disagreement
Proposed remediation: <MetricComparison /> with translation/blur/noise/brightness sliders
Effort: medium (~400 LOC, but widget already exists; just slot it in)

### F2. ...
```

The format makes findings *triageable* — the author can scan severity and pick a subset, or run them all.

### Skill invocation rhythm

`enrich-lesson` runs:
- **Before declaring a lesson complete.** Mandatory before any new lesson ships.
- **On every existing lesson during quarterly review.** Catches drift as the widget kit grows and what *was* impossible to visualise becomes possible.
- **After any major widget kit expansion.** New primitives create new visualisation opportunities in existing lessons.

The skill is **autonomous start-to-finish** — it doesn't pause for user input mid-run. It produces the full report and then hands back. (Per the additive principle: do not introduce mid-run intervention points into autonomous skills.)

## Constraints on the skill design

1. **Read references first.** Before generating findings, the skill must load all of: `visualisation-over-prose.md`, `assessment-design.md`, `content-architecture.md`, `authoring-discipline.md`, `interface-affordances.md`, `lessons-as-living-documents.md`. These define the gold standards the skill enforces.

2. **Propose concrete code, not vague suggestions.** A finding that says "consider adding a widget here" is failure. The finding must include the actual JSX (component name, props, the lesson-context-relevant content). The author should be able to copy-paste the proposed widget in.

3. **Don't auto-edit.** The report is the output. The author decides what to act on. Auto-editing the lesson would be premature mutation.

4. **Cover every dimension on every run.** No skipping. If the skill decides a dimension doesn't apply to this lesson, it must state that explicitly with a reason. Silent skipping is the failure mode this whole skill is designed to prevent.

5. **Track its own coverage.** The report should declare: how many concepts the skill inspected, how it classified each, which dimensions produced findings vs which were clean. This makes the audit verifiable — the author can spot-check by re-classifying a few concepts and seeing whether the skill agreed.

6. **Be additive across runs.** Each invocation produces a fresh report; old reports are not edited but are referenced ("previous run on YYYY-MM-DD flagged 7 findings; 5 have been resolved, 2 remain"). This gives a paper trail of how the lesson improved.

## What needs to happen before the skill is built

1. **Design `<GoalChain>` first.** The skill's "multi-step goal expansion" dimension depends on this widget existing. Open questions listed above need answers.

2. **Enumerate the audit dimensions exhaustively.** This note lists 10; the real catalogue probably has more. Brainstorm pass with concrete examples from the A-FINE lesson and at least one other planned lesson.

3. **Decide where the report lives.** Beside the lesson? In `context/plans/`? Both?

4. **Decide on the skill's read scope.** Just the target MDX? Or also `src/components/widgets/` to know what widgets are available? Probably the latter — the skill's proposed remediations need to reference real components.

5. **Decide on the lint script complement.** What *can* a static script catch cheaply (e.g., frontmatter consistency, tier coverage) that doesn't need the agent? Move those to a script, leave the semantic dimensions for the skill.

6. **Write the skill SKILL.md and reference files.** Follow the established skill structure (Pass-0 evidence, Pass-2 review checks, hard rules, additive-only iteration). Each dimension above probably wants its own reference file.

## When to revisit

Re-read this note when:

- Designing the `<GoalChain>` widget — these design questions are the gate.
- Designing the `enrich-lesson` skill — this is the requirements doc.
- A new lesson ships with the visualisation discipline violated — that's evidence the skill is needed sooner rather than later.
- A new audit dimension is identified during normal authoring — add it to the catalogue above.

The interim mechanism: every new lesson polish pass walks the [visualisation-over-prose audit](visualisation-over-prose.md) by hand, and the author writes a short "visualisation audit notes" block at the bottom of the lesson's authoring notes (or in commit message) documenting the decisions. This is weaker than the skill but is what we have until the skill exists.
