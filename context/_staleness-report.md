# Staleness report — 2026-06-30 (post four-feature build)

Snapshot after the graph-nav / mini-lesson / component-layer+WidgetFrame / test-framework build.
Overwritten each upkeep run; not an accumulating log.

## Per-file staleness

| File | Verdict | Evidence |
|------|---------|----------|
| `architecture.md` | needs-updating (partial) | Intro, drift banner, Repository Overview, and the subsystem table updated this run for the four features. The deeper sections (IPC-flow diagram, Inter-System tables, Core Execution Flow, Coverage) still carry scaffold-era phrasing ("renders a heading", "two commits old") and are flagged below for a dedicated deep-verification. |
| `notes.md` | up-to-date | "Active focus" reflects the two-backbone direction; index lines reflect the extended notes. |
| `notes/visual-identity.md` | up-to-date | ASCII-custom-displays + per-category palettes (full-temperature, locked) match `src/lib/graph/themes.ts` + `src/lib/ascii`. |
| `notes/content-architecture.md` | up-to-date | concept-index + generation≠linking match `src/lib/graph/linker.ts`. |
| `notes/interface-affordances.md` | up-to-date | §10 WidgetFrame + fullscreen mini-lesson match `src/components/widgets/shared/WidgetFrame.tsx`. |
| `notes/llm-integrations.md` | up-to-date | §10 reader surfaces match `src/lib/llm/miniLesson.ts`; the browser fallback (client.ts/hooks.ts) is newer than the doc but consistent with its local-first posture. |
| `notes/*` (other 12) | preserved | Authoring-discipline + pedagogy notes unaffected by this build. |
| `plans/curriculum-graph.md` | needs-updating | Now BUILT (graph nav + linker shipped). Ticked this run. |
| `plans/component-system.md` | needs-updating | Now BUILT (Radix+vaul + WidgetFrame, full-temp theming). Ticked this run. |
| `plans/testing-framework.md` | needs-updating | Now BUILT (vitest + Playwright harness shipped + run). Ticked this run. |
| `plans/ascii-custom-displays.md` | up-to-date | Marked complete in a prior pass. |
| `plans/afine-further-improvements.md` | preserved | Not touched this build. |
| `systems/frontend-shell.md` | needs-updating | Predates the component layer, GraphNav, WidgetFrame, lib/graph, lib/ascii, the test framework. Architecture.md overview now carries the current map; a full frontend-shell refresh is deferred (flagged). |
| `systems/styling-system.md` | needs-updating (minor) | injectDesignTokens now takes a palette override for per-category theming — one new capability to fold in. |
| `systems/tauri-host.md` | up-to-date (re: this build) | Host side unchanged this session (still llm + telemetry). |
| `systems/build-pipeline.md` | needs-updating (minor) | New dev deps (@radix-ui/*, vaul, vitest, @playwright/test) + the `test`/`test:e2e` scripts + the e2e harness not yet reflected. |

## Coverage gaps (subsystems without a dedicated `systems/*.md`)

| Repository area | Inferred system | Proposed filename | Why it deserves a file |
|---|---|---|---|
| `src/lib/graph/` + `src/components/nav/` | concept-graph + navigation | `systems/concept-graph.md` | New load-bearing subsystem (typed graph + linker + nav); only design-doc coverage in `plans/curriculum-graph.md`. |
| `src/components/ui/` + `widgets/shared/WidgetFrame.tsx` | component-layer | `systems/component-layer.md` | The globalised primitives + WidgetFrame; design-doc coverage in `plans/component-system.md`. |
| `e2e/` + `vitest.config.ts` + `src/**/*.test.ts` | testing-framework | `systems/testing-framework.md` | New self-audit harness; design-doc coverage in `plans/testing-framework.md`. |

These three are inventoried in the architecture.md subsystem table (pointing at their plan docs) but lack dedicated `systems/` files. Recommended for the next upkeep pass; not created this run to keep the pass proportionate.

## Deferred this run (see WIDND in the skill log)

- The `architecture.html` migration the upkeep-context skill prescribes (arch_orchestrate + 5 workstreams + arch_verify) was **not** performed — a structural change with blast radius on every tool that reads `architecture.md` (CLAUDE.md startup, orient, wrap-up), beyond the user's "reconcile the docs" intent. `architecture.md` (markdown) updated in place instead.
- Deep re-verification of `architecture.md`'s scaffold-era inner sections + the three new `systems/*.md` files were deferred to a dedicated frontend pass.

## Remaining files — preserved (unaffected by the four-feature build)

All verdict `preserved`: pedagogy/authoring notes, prior-feature plans, and the inspirations
reference corpus — none describe code this build touched, so none needed re-verification.

- `notes/assessment-design.md`, `notes/authoring-discipline.md`, `notes/enrich-lesson-skill.md`, `notes/explanations-must-adapt-to-state.md`, `notes/lesson-voice.md`, `notes/lessons-as-living-documents.md`, `notes/lineage-over-snapshot.md`, `notes/playground-engine-scope.md`, `notes/stack-rationale.md`, `notes/three-pillar-model.md`, `notes/visualisation-over-prose.md`, `notes/widget-creativity-discipline.md`
- `plans/creative-widgets-catalogue.md`, `plans/linear-algebra-curriculum.md`, `plans/ui-redesign-chocolate-luxe.md`
- `references/inspirations/_overview.md`, `references/inspirations/recurring-patterns.md`
- `references/inspirations/stem-core/_overview.md`, `references/inspirations/stem-core/chemistry-biology.md`, `references/inspirations/stem-core/computer-science.md`, `references/inspirations/stem-core/general-platforms.md`, `references/inspirations/stem-core/machine-learning.md`, `references/inspirations/stem-core/mathematics.md`, `references/inspirations/stem-core/neuroscience.md`, `references/inspirations/stem-core/physics.md`
- `references/inspirations/technical-specialised/_overview.md`, `references/inspirations/technical-specialised/blockchain.md`, `references/inspirations/technical-specialised/compilers-languages.md`, `references/inspirations/technical-specialised/cryptography.md`, `references/inspirations/technical-specialised/databases.md`, `references/inspirations/technical-specialised/electronics-hardware.md`, `references/inspirations/technical-specialised/networking.md`, `references/inspirations/technical-specialised/os-systems.md`, `references/inspirations/technical-specialised/quant-finance.md`, `references/inspirations/technical-specialised/quantum-computing.md`
- `references/inspirations/wildcards/_overview.md`, `references/inspirations/wildcards/anatomy.md`, `references/inspirations/wildcards/climate.md`, `references/inspirations/wildcards/history-geography-art.md`, `references/inspirations/wildcards/interactive-journalism.md`, `references/inspirations/wildcards/linguistics-phonetics.md`, `references/inspirations/wildcards/music-theory.md`, `references/inspirations/wildcards/philosophy-systems.md`
