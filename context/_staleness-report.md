# Staleness Report

Snapshot from the 2026-06-21 upkeep-context pass. Overwritten each run; not an accumulating log.

This pass focused on the **single-source styling system** (`src/styles/`) and the **chocolate-luxe chrome redesign** shipped this session, and on correcting the most-misleading scaffold-era framing in `architecture.md`. It did **not** fully re-verify the frontend internals (telemetry, LLM, content/registry, the IPC-flow sections) that accumulated drift across the entire M1→present period — that is the largest remaining gap, flagged below and in the run's WIDND.

## Per-file staleness

| File | Verdict | Evidence |
|------|---------|----------|
| `architecture.md` | needs-updating | Corrected this run: killed the "scaffold state / 2 commits / no domain code / empty IPC" framing (verified against `src-tauri/src/{llm,telemetry}/` + `lib.rs` invoke_handler + `Cargo.toml` reqwest/tokio + 83-commit count); added the styling-system subsystem; refreshed the src/ tree. STILL stale: the Dependency-Direction diagram, the Inter-System Relationships table, and Critical-Paths still describe the empty-IPC scaffold (the live LLM/telemetry IPC flows are not yet traced). Deferred. |
| `notes.md` | up-to-date | Index refreshed this run: added `visual-identity` and (earlier this session) `lineage-over-snapshot`. Every `notes/` file is indexed. |
| `systems/styling-system.md` | up-to-date | New this run; authored from the code I wrote + verified by headless render (tokens injected on `<html>`). |
| `systems/frontend-shell.md` | needs-updating | Fixed the internal contradiction (header said shipped, body said "placeholder") and added a drift note + styling-system pointer. The file inventory + entry sequence still describe early-M1 (a few widgets, neon theme) and predate the 44-widget LA push + the redesign. Full re-inventory deferred. |
| `systems/tauri-host.md` | needs-verification | Not read this run. Code shows `src-tauri/src/{llm,telemetry}/` modules + `invoke_handler`; the old report says this doc was refreshed 2026-05-11 for the LLM module, but it was not re-verified against current code this pass. |
| `systems/build-pipeline.md` | up-to-date | The pnpm→Vite→Cargo→tauri build chain is unchanged; the styling system adds no build step (runtime token injection). Not re-read in full but no change pressure. |
| `notes/visual-identity.md` | up-to-date | New this run; documents the chocolate-luxe / terminal identity. |
| `notes/lineage-over-snapshot.md` | up-to-date | New this session (the genealogy authoring principle). |
| `notes/interface-affordances.md` | up-to-date | The tier control is now rendered as a depth gauge and the chrome was redesigned, but the affordance *model* (TOC, three tiers, chatbot) is unchanged. The depth-gauge reframing is visual, captured in `visual-identity.md` + `styling-system.md`. |
| `notes/visualisation-over-prose.md` | up-to-date | Authoring philosophy; unaffected by the redesign. |
| `notes/explanations-must-adapt-to-state.md` | up-to-date | Authoring philosophy; unaffected. |
| `notes/widget-creativity-discipline.md` | up-to-date | Authoring philosophy; unaffected. |
| `notes/assessment-design.md` | up-to-date | Authoring philosophy; unaffected. |
| `notes/lesson-voice.md` | up-to-date | Authoring philosophy; unaffected. |
| `notes/content-architecture.md` | up-to-date | Content model; unaffected. |
| `notes/lessons-as-living-documents.md` | up-to-date | Authoring philosophy; unaffected. |
| `notes/three-pillar-model.md` | up-to-date | Product model; unaffected. |
| `notes/authoring-discipline.md` | up-to-date | Authoring philosophy; unaffected. |
| `notes/playground-engine-scope.md` | up-to-date | Playgrounds still unbuilt; unaffected. |
| `notes/stack-rationale.md` | up-to-date | Stack rationale; unaffected (styling stays plain CSS + a TS token layer, consistent with the no-CSS-in-JS decision). |
| `notes/enrich-lesson-skill.md` | up-to-date | Future-skill design note; unaffected. |
| `notes/llm-integrations.md` | needs-verification | LLM features expanded since; not re-read this run. The shipped LLM layer is Ollama-backed (not Claude API). Re-verify next pass. |
| `plans/ui-redesign-chocolate-luxe.md` | up-to-date | Ticked this run (palette/depth/neon-sweep/refinement + styling system + chrome/motion all done; catalog ledger + per-widget flatten remain). |
| `plans/afine-further-improvements.md` | preserved | Not touched this run; out of scope. Not re-verified. |
| `plans/creative-widgets-catalogue.md` | preserved | Not touched this run; out of scope. |
| `plans/linear-algebra-curriculum.md` | preserved | Not touched this run; out of scope. |
| `references/inspirations/**` | preserved | Research catalogue, unaffected by the redesign; not re-verified this run. All 28 files enumerated below. |

### Inspirations files (all `preserved`, unaffected by the redesign, not re-verified this run)

- `references/inspirations/_overview.md`
- `references/inspirations/recurring-patterns.md`
- `references/inspirations/stem-core/_overview.md`
- `references/inspirations/stem-core/chemistry-biology.md`
- `references/inspirations/stem-core/computer-science.md`
- `references/inspirations/stem-core/general-platforms.md`
- `references/inspirations/stem-core/machine-learning.md`
- `references/inspirations/stem-core/mathematics.md`
- `references/inspirations/stem-core/neuroscience.md`
- `references/inspirations/stem-core/physics.md`
- `references/inspirations/technical-specialised/_overview.md`
- `references/inspirations/technical-specialised/blockchain.md`
- `references/inspirations/technical-specialised/compilers-languages.md`
- `references/inspirations/technical-specialised/cryptography.md`
- `references/inspirations/technical-specialised/databases.md`
- `references/inspirations/technical-specialised/electronics-hardware.md`
- `references/inspirations/technical-specialised/networking.md`
- `references/inspirations/technical-specialised/os-systems.md`
- `references/inspirations/technical-specialised/quant-finance.md`
- `references/inspirations/technical-specialised/quantum-computing.md`
- `references/inspirations/wildcards/_overview.md`
- `references/inspirations/wildcards/anatomy.md`
- `references/inspirations/wildcards/climate.md`
- `references/inspirations/wildcards/history-geography-art.md`
- `references/inspirations/wildcards/interactive-journalism.md`
- `references/inspirations/wildcards/linguistics-phonetics.md`
- `references/inspirations/wildcards/music-theory.md`
- `references/inspirations/wildcards/philosophy-systems.md`

## Coverage-gap report

Subsystems with real code surface but no dedicated `context/` file:

| Repository area | Inferred system name | Proposed filename | Why it deserves a file |
|-----------------|----------------------|-------------------|------------------------|
| `src/lib/llm/` (7 files) + `src-tauri/src/llm/` | llm-integration | `systems/llm-integration.md` | Ollama client (Rust reqwest streaming + JS hooks), chatbot, recommender, state-aware widget explanations, tiered hints. Currently only partially covered inline in `frontend-shell.md` / `tauri-host.md`. |
| `src/lib/telemetry/` (4 files) + `src-tauri/src/telemetry/` | telemetry | `systems/telemetry.md` | Event schema + JSONL flight recorder spanning JS + Rust; no dedicated doc. |
| `src/components/widgets/` (~50 widgets) + `src/lessons/` + `registry.ts` | content-and-widgets | `systems/content-and-widgets.md` | The bulk of the codebase (88 LA-widget files); the lesson/registry/MDX pipeline and the widget kit have no canonical system doc. |

These gaps predate this run and are deferred; this pass added `styling-system.md` and corrected the architecture framing rather than initialising three new system docs.
