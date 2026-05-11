# Authoring Discipline

## 1. Current Understanding

Tessarix has three hard rules about how content is authored. These rules govern the boundary between what the LLM agents are allowed to produce automatically and what stays in human hands.

| Rule | What it means |
|---|---|
| **Drafts are never auto-applied.** | The sync-learning agent emits MDX drafts to `lessons/_drafts/` and question-bank suggestions to a staging area. Nothing reaches `lessons/` (the published location) without an editorial pass. |
| **Widgets stay manual.** | The LLM authors the narrative prose and basic assessment questions; it does not author the interactive widget code (`<FunctionGrapher>`, `<StepController>`, etc.) inside lessons. Where a widget is needed, the agent emits a `<TODO />` placeholder for the human author to fill. |
| **The component library accretes from real lessons.** | Visualisation and assessment primitives are added when an actual lesson needs them, not pre-built in the abstract. The library grows opportunistically. |

## 2. Rationale

### Why drafts are never auto-applied

The whole point of the project is that interactive + visual + step-throughable representations restore the dimension that prose loses. The LLM can write prose; it cannot reliably author the interactive widgets that carry that dimension. A draft that ships straight to `lessons/` would, at best, be a prose lesson with `<TODO />` widget placeholders — exactly the "prose-only mode" the product is designed to replace. Worse, a draft that hallucinates plausible-looking widget code could ship visualisations that misrepresent the underlying concept. Either failure mode is product-killing.

Drafts therefore stop at `lessons/_drafts/` and require a human editorial pass. The agent's job is to compress hours of prose-authoring; the editorial step is non-negotiable.

### Why widgets stay manual

A `<FunctionGrapher eq="sin(a*x + b)" sliders={...} />` looks superficially like JSX an LLM could write. The trap is that the visualisation has to be *correct* with respect to the concept being taught — wrong axes, wrong domain, wrong slider ranges actively miseducate. Until the component library is rich enough and the lesson-authoring patterns are stable enough that an LLM can be reliably few-shot-prompted to compose existing primitives correctly, widgets are written by hand.

This rule has an explicit relaxation path: when the component library is mature (M2+) and the patterns for composing it are well-documented, the agent may be allowed to compose existing primitives. New primitive *implementation* always stays manual.

### Why the library accretes opportunistically

Pre-built component libraries are usually wrong libraries. Without a real lesson driving each primitive's API, the design space is too wide and the chosen shape rarely fits the first real use. The discipline:

- A lesson needs a step-throughable array view → `<ArrayVisualiser>` is born with the API that lesson needs.
- The next lesson reuses `<ArrayVisualiser>` and finds a missing prop → the prop is added with a real use case behind it.
- The lesson after that wants a tree view → `<TreeVisualiser>` is born with a known-good shape because `<ArrayVisualiser>` already taught the team what API patterns work.

The library grows from real needs, not from speculation about future needs.

## 3. What Was Tried

Nothing tried-and-abandoned yet. These rules are upfront design decisions, not corrections.

The original 2026-05-07 vault sketch implied a more aggressive "agent generates everything, including widgets" framing. The 2026-05-11 design discussion explicitly retreated from that to the discipline documented above.

## 4. Guiding Principles

- **The LLM compresses authoring, it does not replace authoring.** Hours of prose work → minutes of editing. Hours of widget work → unchanged. Hours of designing the component library → unchanged.
- **The human always has the final pass.** This is a feature-completeness rule, not a quality-control rule. Even if the LLM produced perfect drafts, the editorial pass is what makes the project's lessons feel like *the author's lessons* rather than generic LLM output.
- **No speculative primitives.** A primitive that does not have a lesson behind it does not enter the component library.

## 5. Trade-offs and Constraints

| Trade-off | Cost accepted |
|---|---|
| Drafts are never auto-applied. | The editorial step is a real ongoing cost. Mitigated by the agent doing the heavy prose work upfront. |
| Widgets stay manual. | New widgets cost human time. Mitigated by the library accreting steadily — each new lesson costs less than the previous one as the library grows. |
| Library accretes opportunistically. | The library will be slightly incoherent in early stages because each primitive is shaped by its first use case. Mitigated by allowing API revisions when reuse exposes mismatches, with the understanding that this is part of the normal evolution. |

## 6. Open Questions

- **What is the editorial pass workflow exactly?** Likely a simple "review drafts in `_drafts/`, move to `lessons/` when ready, fill in `<TODO />` widgets along the way". Could be more structured (review checklist, rubric) but starting simple.
- **At what point does the agent earn the right to compose existing primitives?** Likely when the library has ≥10 stable primitives and the composition patterns are documented well enough that few-shot prompting works reliably. No earlier than M2.

## 7. Related Systems and Notes

- [`three-pillar-model.md`](three-pillar-model.md) — the content shape these rules govern (`lessons/<topic>.mdx` + `lessons/<topic>.questions.ts`).
- [`playground-engine-scope.md`](playground-engine-scope.md) — the "library accretes from real lessons" rule explicitly applies to playground visualisers.
- [`../systems/frontend-shell.md`](../systems/frontend-shell.md) — where the component library physically lives.
- [`../systems/tauri-host.md`](../systems/tauri-host.md) — where the sync-learning Claude client (the agent that produces the drafts) will live.
