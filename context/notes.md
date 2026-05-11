# Notes

- [stack-rationale](notes/stack-rationale.md) — Why Tauri (not web, not TUI), why MDX + KaTeX + Monaco + react-flow, why SQLite WAL, why Claude API.
- [three-pillar-model](notes/three-pillar-model.md) — Teach / Quiz / Interview as branches not steps; `/<topic>` / `/<topic>/quiz` / `/<topic>/interview` routing convention; same content + question bank, three rendering modes.
- [playground-engine-scope](notes/playground-engine-scope.md) — Semi-generic now (`<StepController>` + typed visualisers + per-algorithm code); fully-generic deferred until repetition obviously pays.
- [authoring-discipline](notes/authoring-discipline.md) — Drafts from the sync-learning agent are never auto-applied; widgets stay manual; the component library accretes from real lessons, never speculatively.
- [lessons-as-living-documents](notes/lessons-as-living-documents.md) — Lessons evolve; widget library grows; old lessons get retrofitted with new primitives; backward-compatible widget APIs are required.
- [assessment-design](notes/assessment-design.md) — Memorisation vs understanding tests; 12-shape question taxonomy; `<QuestionGroup>` for progressive difficulty; A-FINE assessment rebuild plan.
- [interface-affordances](notes/interface-affordances.md) — Left-side TOC sidebar; three-tier complexity control (essential/standard/complete) via inline `<Tier>` wrappers; reading progress bar; right-side AI chatbot layout.
- [llm-integrations](notes/llm-integrations.md) — Four LLM use cases (ask-the-lesson chatbot, conversational interview, graded free-response, sync-learning agent); local-first by default with Claude API for quality-critical paths.
- [content-architecture](notes/content-architecture.md) — Three-tier content model: full lessons (warrant widgets) vs glossary entries (definitional) vs chat safety-net (everything else). Gating question: "does this warrant a widget?"

## Active focus

M1 substrate + A-FINE lesson shipped 2026-05-11. Next-up framework features captured in the four newest notes above:

1. **`<GoalDrivenWrapper>`, `<PredictThenVerify>`, `<ClickableHotspot>`** new widgets to replace the A-FINE lesson's MCQ-heavy assessment layer (see [`assessment-design.md`](notes/assessment-design.md) §6).
2. **Left TOC sidebar** + **complexity tier system** (see [`interface-affordances.md`](notes/interface-affordances.md)).
3. **Lesson frontmatter system** + **`<Tier>` wrapper component** to support the tier system.
4. **Tauri host gains `reqwest` + `tokio`** for the LLM integration runway (see [`llm-integrations.md`](notes/llm-integrations.md) §7).

All of [`systems/frontend-shell.md`](systems/frontend-shell.md), [`systems/tauri-host.md`](systems/tauri-host.md), and [`systems/build-pipeline.md`](systems/build-pipeline.md) will absorb the next round of changes.
