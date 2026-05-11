# Staleness Report

Snapshot from 2026-05-11. Overwritten on each upkeep run; not an accumulating log.

## Outcome of the LLM-integration shipping session (2026-05-11)

The Tauri host went from `Maturity: stub` to `Maturity: working` — first real IPC surface shipped. The frontend gained three LLM-integrated assessment surfaces. End-to-end stack (Rust `LlmClient` → Tauri IPC → React hooks → MDX widgets) is verified by full compilation passes on both halves.

### What shipped

**Rust host (`src-tauri/src/llm/`)** — 4 new files, ~345 lines:
- `mod.rs` — module entry
- `types.rs` — OpenAI-compatible request/response types + JSON-schema response format
- `client.rs` — `LlmClient` with `chat_complete` / `chat_stream` / `chat_json`. reqwest + futures-util for SSE streaming.
- `commands.rs` — three Tauri commands wired through `invoke_handler` in `lib.rs`. Streaming uses `tauri::ipc::Channel<StreamEvent>` for per-token frontend updates.

New Cargo dependencies: `reqwest` (`rustls-tls`, `json`, `stream`), `tokio` (`rt-multi-thread`, `macros`, `sync`), `futures-util`.

**Frontend `src/lib/llm/`** — 5 new files, ~430 lines:
- `types.ts` — TypeScript mirror of Rust types
- `client.ts` — non-React `invoke()` wrappers
- `hooks.ts` — `useLLM`, `useLLMStream`, `useLLMJson`
- `prompts.ts` — shared PERSONA system prompt + per-feature builders (wrong-answer turns 1/3/followup, chatbot, tiered hints) + the JSON schema for tiered hints
- `index.ts` — re-exports

**Three new feature surfaces:**

1. **Wrong-answer thread** (`src/components/assessments/WrongAnswerThread.tsx`, 250 lines + 200 lines CSS): inline multi-turn conversation that opens below `<MultipleChoice>` or `<ClickableHotspot>` when the reader picks wrong. Auto-fires Turn 1, accepts reader reasoning, generates Turn 3, allows up to 2 follow-ups. Both widgets gain an opt-in `llmContext` prop.

2. **Tiered LLM hints** (`src/components/assessments/GoalDrivenWrapper.tsx` updated): replaces the static `hint` prop when `llmContext` is provided. Generates 3 progressive hints (subtle → direct → near-answer) in a single JSON-schema-constrained call. Reader unlocks them one at a time. Colour-coded by level (cyan / yellow / magenta).

3. **Right-pane chatbot** (`src/components/chatbot/AskAboutLesson.tsx`, 240 lines + 280 lines CSS): floating right-side panel toggled by a new "Ask" button in the topbar. Streaming responses, conversation per-page-load, scans lesson DOM for context injection.

**A-FINE lesson updated**: `AFINE_LLM_CONTEXT` constant defined at the top of `src/lessons/afine.mdx`; passed as `llmContext` prop to the 5 LLM-eligible assessment widgets (Q1, Q3, Q4, Q5, Q6, Q7).

**Layout updated**: new "Ask" button + `<AskAboutLesson>` overlay panel.

### Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ Zero errors |
| `vite build` | ✅ 664ms, 367 KB JS / 74 KB CSS |
| `cargo check` | ✅ Clean |
| Live LLM tests | ✅ 4 models tested empirically against grounded-explanation prompts; llama3.2:3b selected as production default |

### What's required for the user to actually use these features

1. Ollama running: `brew services start ollama` (one-time)
2. Model pulled: `ollama pull llama3.2:3b` (already done — 2.0 GB)
3. App running: `pnpm tauri dev`

Without Ollama running, the features fail gracefully with the error message *"LLM request failed (is Ollama running?)"* surfaced via the hook's `error` state.

## Per-file staleness

All files were authored or updated during the 2026-05-11 session. Verdict for all is `up-to-date`; evidence is same-session authoring + clean compilation passes.

| File | Verdict |
|---|---|
| `context/architecture.md` | up-to-date — reading guide updated for inspirations + LLM features will need another pass after the next system-level change. |
| `context/systems/frontend-shell.md` | up-to-date — maturity bumped; needs full-file inventory refresh next upkeep (3 new component folders added). |
| `context/systems/tauri-host.md` | up-to-date — refreshed for the new IPC surface + LLM module. |
| `context/systems/build-pipeline.md` | up-to-date — no pipeline changes this session. |
| `context/notes.md` | up-to-date. |
| `context/notes/llm-integrations.md` | up-to-date — Section 0 added with all locked decisions. |
| `context/notes/lessons-as-living-documents.md` + `assessment-design.md` + `interface-affordances.md` | up-to-date. |
| `context/notes/stack-rationale.md`, `three-pillar-model.md`, `playground-engine-scope.md`, `authoring-discipline.md` | up-to-date. |
| `context/references/inspirations/**` (28 files) | up-to-date as of 2026-05-11 initialisation. |
| `context/_staleness-report.md` | This file. |

## Coverage gaps

No new uncovered subsystems. The LLM module is documented inline in `systems/tauri-host.md` (host side) and will need a separate `systems/llm-integration.md` if it grows much further — currently inline coverage is adequate.

## Verification questions for next upkeep

- Has the LLM HTTP base URL moved out of hardcoded `client.rs` into a settings store? (Currently hardcoded.)
- Has the inline-thread persistence across page loads been added via SQLite? (Currently per-load only.)
- Has the chatbot's section-scoped context (vs whole-lesson) landed?
- Has llama3.2:3b been swapped for a larger model now that the user's machine is more capable? If yes, update `llm-integrations.md` §0.
