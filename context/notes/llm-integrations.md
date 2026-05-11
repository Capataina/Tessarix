# LLM Integrations

## 0. Locked decisions (2026-05-11)

After empirical model testing + parallel benchmark research, the following are committed for the first round of LLM features. The rest of this document remains the longer-term context but should be read with this section as the authoritative current state.

### Model choices

| Model | Status | Role |
|---|---|---|
| `llama3.2:3b` | ✅ Pulled, **production default** | Best in both empirical hallucination testing and benchmark research (IFEval 77.4 — 16-18 point lead over the alternatives). Used by all three features below. |
| `llama3.2:1b` | ✅ Pulled, dev fallback | When the system is RAM-pressured (Vite + Tauri + browser all running on 8 GB). Hallucinates on technical depth; acceptable for short-turn use cases only. |
| `qwen2.5:3b` | ✅ Pulled, A/B alternative | Strong raw capability but IFEval 58.2 (lowest of the candidates). Reserve for cases where llama3.2:3b drifts on a specific domain. Known issue: Chinese-token leakage in some Ollama configurations (Ollama issue #13968). |
| `gemma2:2b` | ❌ Removed | 5× slower per word than llama3.2:3b (137 s for the long-prompt test) AND inverted the dominance relationship on technical content. Architectural symbolic-hallucination issue documented in ceur-ws.org 2025 paper — not fixable via prompting. |

**Verbatim** when referenced in code or settings: `llama3.2:3b` (Ollama tag, not display name).

### Runner architecture

- **Phase 1 (current)**: Ollama at `http://localhost:11434/v1/chat/completions` (OpenAI-compatible endpoint). User runs `brew services start ollama`; the Tauri host talks to it over HTTP.
- **Phase 2 (later, for self-contained distribution)**: `llama-server` from llama.cpp bundled as a Tauri sidecar, exposing the same OpenAI-compatible API at port 8080. Same HTTP client code on the frontend — only the base URL changes. Zero re-architecting between phases.
- **Phase 3+ (Claude API for the conversational interview and graded free-response, if/when those ship)**: same `LlmClient` abstraction, different backend. Selected per-feature in settings.

### Empirical hallucination findings (2026-05-11 testing)

Tested all four candidates against a long-form technical prompt asking for ~40-50 lines explaining A-FINE's fidelity head with formula + failure-mode reasoning. Same system prompt, same temperature (0.2), same top_p (0.9). Results in order of quality:

1. **`llama3.2:3b`** — no fabricated numbers or formulas. Minor imprecision in some reasoning ("close to zero" where the precise statement was "equals c1") but no invented arithmetic. Took 31 s.
2. **`qwen2.5:3b`** — hallucinated a factor of 4 in `4 * sigma_dr / 1e-6` (no such factor in the source); claimed `1e-6 < 1e-10` (backwards); LaTeX rendering broke with literal tab characters. Took 52 s.
3. **`gemma2:2b`** — inverted the dominance relationship ("ratio dominated by means and variances" when the source said the opposite); section 4 vague and added nothing. Took 137 s. Disqualifying on speed alone.
4. **`llama3.2:1b`** — invented coefficients `4 * mu_d * mu_r + 2 * 1e-6` (no factor of 4 anywhere in the source); fabricated conclusion `q_fid → 0.5`; reverted to "division by zero" framing the prompt explicitly refuted. Took 20 s.

**Critical observation**: when the SAME models were tested with a SHORT prompt (2-3 sentence answer), ALL four stayed grounded. Hallucinations only emerged when forced into technical depth. This is the load-bearing prompt-discipline finding.

### Prompt discipline (load-bearing)

These are *not* style preferences — they are the levers that make `llama3.2:3b` reliable in production.

| Rule | Why |
|---|---|
| **System prompt + user prompt split** (not one concatenated blob) | Establishes persona + grounding rules separately from per-request content. Empirically reduces hallucination across all four tested models. |
| **Persona priming**: "You are an expert instructor in computer science and machine learning" | Small models benefit *more* than large ones from role priming. Concrete improvement seen across all tests. |
| **Bounded output length**: "answer in 2-3 sentences" or "exactly 3 hints, one sentence each" | The single biggest hallucination prevention. Short outputs rephrase context safely; long outputs force the model to fill gaps from weights. |
| **Explicit grounding rule**: "Use ONLY the lesson context. Never invent technical details, formulas, or facts not in the context. If the context lacks information, say 'the lesson does not cover this.'" | When tested, llama3.2:3b respected this rule for short responses. The rule must be in the SYSTEM prompt, not the user prompt. |
| **Temperature 0.2, top_p 0.9** | Production defaults for these features. Lower randomness = less drift. Bump to 0.3-0.4 for the chatbot specifically if responses feel too clipped. |
| **JSON schema mode for structured output** | Used for the tiered hints feature. Forces parseable output. Ollama supports `response_format: {type: "json_schema", json_schema: {...}}` natively. |
| **Token caps** (~250 for chatbot, ~150 per wrong-answer turn, ~80 per hint) | Hard ceiling on response length. Defence in depth against the "explain in detail" failure mode. |

### Scoped feature list — first round

Three features, all running on `llama3.2:3b` via Ollama.

#### Feature 1 — Wrong-answer thread

Inline LLM-driven micro-conversation that fires when a reader picks a wrong option on `<MultipleChoice>` or `<ClickableHotspot>`. Three turns minimum, five maximum:

- **Turn 1 (auto)**: LLM reads `{question, options, correct, picked, section_context}`, produces a 2-sentence explanation of why the pick is wrong + asks *"what were you thinking when you picked that?"*.
- **Turn 2 (reader textarea)**: free-text reasoning.
- **Turn 3 (LLM)**: 2-3 sentence tailored correction addressing the specific misconception in the reader's reasoning.
- **Optional follow-ups (≤2 more turns)**: reader can ask clarifying questions. "Got it" button always available to close.

Component: `src/components/assessments/WrongAnswerThread.tsx`. Opt-in prop on existing assessment widgets: `<MultipleChoice ... llmThread />`. Streaming output. Per-page-load conversation state.

#### Feature 2 — Right-pane chatbot

Right sidebar (parallel to the left TOC). Reader types free-form questions about the active lesson section; LLM answers grounded in that section. Refuses out-of-scope ("the lesson doesn't cover this").

Affordances: top-bar toggle to open/close; per-section "Ask about this" deep-links that pre-populate the chat with section context; streaming output; conversation persists per page-load.

Component: `src/components/chatbot/AskAboutLesson.tsx`. Layout breakpoint: visible at ≥1400 px viewports; collapsible overlay drawer below that.

#### Feature 3 — Tiered LLM hints in `<GoalDrivenWrapper>`

Replaces the existing static `hint` prop. The LLM generates three progressive hints from `{goal, section_context, current_widget_state}` in a single JSON-schema-constrained call. Hints cached in component state and served progressively as the reader clicks "Stuck? Show a hint" → "Next hint" → "Final hint".

- Level 1: subtle directional nudge ("look at the formula's first term").
- Level 2: specific parameter named ("it's β₁").
- Level 3: practically the answer ("set β₁ to zero").

Output format (JSON schema enforced):

```json
{"hints": [
  {"level": 1, "text": "..."},
  {"level": 2, "text": "..."},
  {"level": 3, "text": "..."}
]}
```

### Explicit deferrals

| Deferred feature | Why deferred (not why dropped) |
|---|---|
| Conversational interview (Interview pillar's primary mode) | Heavy infrastructure (rubric authoring, multi-turn structure, final feedback). Build after the three above are stable. |
| LLM-graded free-response | Static reveal works for now; needs Interview-pillar plumbing first. |
| LLM-generated questions (`<LLMQuestion>` component) | Higher-value to build the three above first; will use the same `LlmClient` foundation. |
| Sync-learning authoring agent | Far future. Needs SQLite + lesson queue. |
| Inline-thread persistence across page loads | SQLite isn't in the host yet. Per-load state for v1. |
| **Vector-search retrieval over the lesson (RAG)** | Currently each LLM call sends the whole lesson body, auto-extracted from the rendered DOM (~8 KB cap, includes hidden Tier sections). For Tessarix's typical lesson size this fits trivially in llama3.2:3b's 128K context window. Vector-search retrieval becomes valuable when (a) lessons grow past ~10-20 KB and prompt-prefill latency starts hurting interactive response time, or (b) the chatbot needs to answer cross-lesson questions ("what did the CNN lesson say about attention?"). Architecture stays sound — add an `EmbeddingClient` alongside `LlmClient`, vectorise lesson chunks at build time, retrieve top-K matching chunks instead of injecting the whole page. The hooks and prompts don't change; only the context-injection step does. |

None of these require re-architecting — they all sit on the same `LlmClient` + IPC + hooks foundation we're building now.

### Implementation order

1. **Shared foundation** (~1.5-2 hours): Rust `LlmClient` + Tauri IPC commands + frontend `useLLM` / `useLLMStream` / `useLLMJson` hooks + system prompt templates.
2. **Wrong-answer thread** (~1.5 hours): the smallest end-to-end vertical slice; exercises non-streaming + streaming paths.
3. **Tiered hints** (~1 hour): exercises the JSON-schema structured-output path.
4. **Right-pane chatbot** (~2 hours): the largest UI surface; benefits from patterns established by the first two.
5. **Verification + context updates** (~30 min): end-to-end test, update `systems/tauri-host.md`, `systems/frontend-shell.md`, `_staleness-report.md`.

Total: roughly a day of focused work for all three features end-to-end.

---

## 1. Current Understanding

Tessarix has four distinct LLM use cases, each with different requirements and deployment shapes. Bundling them under "the AI features" obscures real differences in what each one needs.

| Use case | Where it lives | What it does | Latency tolerance | Model size needed |
|---|---|---|---|---|
| **Ask-the-lesson chatbot** | Right sidebar in Teach pillar | Reader asks contextual Q&A; model answers grounded in the lesson | Low (interactive) | Small (local) |
| **LLM-conversational interview** | Interview pillar's primary mode | Model asks adaptive questions, judges answers, guides the session | Low (interactive) | Medium-large |
| **LLM-graded free-response** | Embedded in Teach + Interview | Reader writes a free-form answer; model scores it against a rubric | High (per-batch OK) | Medium-large |
| **Sync-learning authoring agent** | Vault-local skill / in-app command | Reads `Learning/` deltas, emits lesson + question-bank drafts | High (offline batch) | Large (best available) |

These are NOT one feature with four faces. The chatbot can run on a 3B local model; the sync-learning agent really wants Claude Opus. The interview mode needs streaming for conversational feel; grading does not.

## 2. Ask-the-lesson chatbot

### Design intent

A reader, stuck on a section of a Tessarix lesson, opens a sidebar and asks the model a question. The model answers grounded in the current lesson's MDX content, the reader's complexity tier, and the active section. It is NOT a generic chatbot — it should refuse or flag when the question is outside the lesson's scope.

### Why this matters for the product

The Tessarix lesson is necessarily a single fixed text. Some readers will hit gaps the lesson doesn't fill, or want a different framing, or want to push deeper than the chosen complexity tier allows. The chatbot turns "the lesson is the answer" into "the lesson is a starting point; the model fills gaps." This is what makes per-lesson density a deliberate choice, not a ceiling.

### Architecture (planned)

- **Local model via Ollama or LM Studio** by default. Llama 3.x 8B, Qwen 2.5 7B, Mistral 7B — all viable. The model runs on the user's machine; no API cost, no data leaves the device.
- **Tauri host owns the HTTP client.** The Rust process makes requests to `http://localhost:11434` (Ollama's default) or whatever local endpoint is configured.
- **Streaming via Tauri Channel.** The frontend opens a Channel; the host streams tokens as they arrive; the frontend renders incrementally.
- **Context injection at request time.** The system prompt includes:
  - The full current section's MDX (or a chunk centred on the active scroll position if the section is huge).
  - A summary of widgets visible (`<AFinePipeline>` is at stage 4`, etc.).
  - The reader's complexity tier.
  - A "stay grounded in the lesson; flag out-of-scope questions" instruction.
- **No persistent chat history across sessions** initially. Per-page-load conversation only. Later, persist via SQLite if useful.
- **No tool use, no agentic capabilities** at this layer. The chatbot is a Q&A assistant, not an autonomous agent.

### Affordances

- Sidebar opens on demand (button in topbar or per-section "ask about this" link).
- The reader can paste a quote from the lesson into the chat to anchor the question.
- The model's answers cite which section of the lesson the answer is grounded in (or admit when going beyond it).
- A "this answer was wrong" thumbs-down feeds back into lesson refinement signals — connects to [`lessons-as-living-documents.md`](lessons-as-living-documents.md): repeated "the lesson didn't cover X" feedback is a signal to revise the lesson.

### Trade-offs

| Trade-off | Decision | Cost accepted |
|---|---|---|
| Local model (Ollama) vs cloud API | Local first | Quality ceiling lower than Claude; offset by being free + private |
| Stream tokens vs wait for full response | Stream | More UI complexity; much better perceived latency |
| Per-page-load chat vs persistent history | Per-load initially | Loses cross-session context; simpler to ship |
| Strict grounding vs general Q&A | Strict | Some questions the model can't answer; preserves lesson-as-source-of-truth |

## 3. LLM-conversational interview

### Design intent (new direction)

The Interview pillar transforms from "write a free-form answer; LLM grades it" into "the LLM conducts an interview." The model:

1. Asks the opening question.
2. Reads the answer.
3. Decides whether to drill deeper, move on, or ask a follow-up.
4. At the end, summarises performance against a rubric.

This is qualitatively different from one-shot grading. The reader feels like they're being interviewed, not quizzed. The model adapts based on the answer's depth — strong answers get harder follow-ups; weak ones get scaffolded toward the answer.

### Why this is a real upgrade

One-shot LLM grading is a transactional assessment: you give input, get a score. Conversational interview is a *learning interaction* — the conversation itself surfaces gaps in understanding the reader didn't know they had. The "guiding question on stumble" pattern from the original Adaptive Learning Helper design (see `README.md`) is built into the LLM's behaviour rather than needing to be pre-authored as alternate question paths.

### Conversation shape

Per lesson, the author provides:

- A **topic** (free text — what the interview should cover).
- A **rubric** with target criteria (e.g., "Reader should explain WHY c1=1e-10 matters, not just that it's small; should connect to CLIP feature scale.").
- An **opening question** (or let the model generate one from the rubric).
- Optional **off-limit directions** (e.g., "don't drift into LPIPS comparison; stay on A-FINE's adapter").

The model handles everything else: question flow, follow-up depth, judging correctness inline, deciding when the interview is "done", and producing the final feedback.

### Architecture (planned)

- Probably needs a stronger model than the chatbot. Claude Sonnet or a strong local 14B+ model.
- Streaming + bidirectional flow.
- Conversation state lives in React state during the interview; persisted to SQLite at completion for the "review past interviews" view.
- The rubric is hidden from the reader during the interview; revealed in the final feedback alongside which criteria the reader hit/missed.

### Trade-offs

| Trade-off | Decision | Cost accepted |
|---|---|---|
| Local model vs Claude API | Likely Claude initially | Per-interview API cost; offset by quality bar this mode demands |
| Fixed question script vs LLM-driven | LLM-driven | Less predictable; the whole point |
| Time-limited vs open-ended | Open-ended initially; timed mode later | More variance in interview length |
| Hidden vs visible rubric during interview | Hidden | Reader can't game the rubric; reveal is part of feedback |

## 4. LLM-graded free-response

The existing Interview pillar scope per the README. The reader writes 2-3 sentences answering a static prompt; the LLM scores it against a static rubric. This is the simpler subset of §3's conversational interview — useful when:

- The author wants a specific articulation, not an open conversation.
- The cost / latency of a full conversational interview isn't justified for the question.
- The mode is embedded inline in a Teach lesson (the conversational mode is too heavy for that).

A `<FreeResponse rubric="..." />` component slot at the end of a Teach lesson is the canonical placement. Initial implementation: the reader writes; clicks "reveal rubric and model answer" — sees both side by side. Self-grades. Later: clicks "have the LLM grade this" — model produces a per-criterion score + explanation.

### Why both modes (graded + conversational)

They serve different intents:

- **Graded free-response** is a focused checkpoint: "in 2-3 sentences, explain X." Quick. Lives inside a lesson.
- **Conversational interview** is a session: "spend 15 minutes being interviewed on this topic." Heavy. Lives in the Interview pillar.

Both have a place. Don't collapse them.

## 5. Sync-learning authoring agent

Already scoped in `README.md` (Milestone 3) and [`authoring-discipline.md`](authoring-discipline.md). Brief recap here for completeness, since it's an LLM integration:

- Reads `Learning/` archive deltas.
- Cross-references existing Tessarix lessons.
- Emits draft MDX + question-bank entries to `lessons/_drafts/`.
- **Drafts are never auto-applied** — editorial review is mandatory.
- Likely Claude Opus or equivalent. Authoring requires the strongest available model; the cost is amortised over the lesson's lifetime.

### Extension: revision detection

Per [`lessons-as-living-documents.md`](lessons-as-living-documents.md), the agent's scope naturally extends from "emit drafts for new content" to "emit revision suggestions for stale lessons when source notes have changed." Same mechanism, different output target (`lessons/_revisions/` instead of `lessons/_drafts/`).

## 6. Local-first vs cloud trade-offs

When does Tessarix use a local model and when does it use a cloud API?

| Use case | Local-first? | Reasoning |
|---|---|---|
| Ask-the-lesson chatbot | **Yes** | High volume, low quality ceiling needed, privacy preference, no per-use cost. |
| LLM-conversational interview | **No (Claude API)** | Quality matters; per-session use is bounded. |
| LLM-graded free-response | **No initially** | Bounded use; precision matters. Local later if a strong-enough small model arrives. |
| Sync-learning authoring agent | **No (Claude Opus)** | Authoring is the highest-quality demand. Per-lesson cost is small amortised. |

The principle: **interactive, high-volume → local; deliberate, quality-critical → cloud.** Tessarix is local-first by default, but local-first does not mean local-only.

### User-facing implications

- The chatbot works fully offline once a local model is installed.
- The conversational interview and the sync-learning agent need an API key + network connectivity.
- The reader controls which Claude API key is used (project setting); Tessarix never hard-codes a key.
- Future possibility: a "lite mode" where everything is local, with reduced quality. Useful for portfolios / demos / offline use.

## 7. Implementation implications

### Tauri host responsibilities

Pre-LLM (M1, current state): minimal Rust. Builder + opener plugin. No IPC commands.

Post-LLM scoping (M2+):

| Capability | Crate | When |
|---|---|---|
| HTTP client | `reqwest` | M2 — for both local Ollama and cloud Claude calls |
| Async runtime | `tokio` | M2 — comes with `reqwest` |
| Streaming responses | Tauri `Channel` + serde | M2 |
| Anthropic SDK | `anthropic-sdk` crate or a thin custom wrapper | M2 |
| Ollama client | Custom thin wrapper around `reqwest` | M2 |
| Persistent chat history | `rusqlite` or `sqlx` | M3 — once SQLite lands |

### IPC command surface (planned)

```rust
// Local chatbot
invoke("chat_stream", { lesson_slug, section, user_message, history }) → Channel<Token>

// Conversational interview
invoke("interview_open", { lesson_slug, rubric, opening_question? }) → InterviewId
invoke("interview_respond", { interview_id, user_message }) → Channel<Token>
invoke("interview_finalize", { interview_id }) → InterviewSummary

// Graded free-response
invoke("grade_response", { rubric, prompt, answer }) → GradingFeedback

// Sync-learning (likely shelled out to a vault-local skill, not in-app)
invoke("sync_learning_run") → Vec<DraftPath>
```

Each command returns either a sync result or a `Channel<...>` for streaming. The frontend uses `Channel` for token-by-token rendering.

### Key storage

- Local model: no key needed.
- Claude API: key stored via Tauri's secure-storage plugin (keychain on macOS, equivalent elsewhere). Never in plain config files.
- Per-user, per-machine.

## 8. Guiding Principles

- **Local-first does not mean local-only.** Some use cases need cloud-quality models. Don't compromise the product to hit a "pure local" purity bar.
- **Tessarix is grounded in the lesson, not in the model's general knowledge.** The chatbot's job is to extend the lesson, not to be a free-floating Q&A assistant. Refusal to answer out-of-scope is a feature, not a limitation.
- **Streaming is required for all interactive LLM features.** Non-streaming feels broken at modern model latencies. Build the streaming path before the non-streaming one.
- **The reader's data stays on their machine.** Conversation transcripts persist locally to SQLite, not to a backend. Claude API calls send only what's needed for the immediate request.
- **API costs are visible.** A small indicator somewhere shows estimated cost per session / per month for cloud-API features. Surprise bills are a product failure.
- **No autonomous agents at the LLM layer.** Tessarix's LLM integrations are Q&A and assessment, not multi-step task execution. If multi-step autonomy is ever wanted, it's a separate product surface.

## 9. Open Questions

- **Which local model is the default recommendation?** Llama 3.x 8B vs Qwen 2.5 7B vs Mistral 7B. Depends on benchmarks for grounded-Q&A and on what the user community converges on. Probably Llama 3.x as the recommended default, with config switch to any Ollama-supported model.
- **What's the install story for Ollama?** Does Tessarix bundle it, link to install instructions, or detect-and-prompt? Probably detect-and-prompt with a one-click "install Ollama" link.
- **How does the conversational interview handle "I don't know"?** Drill down to easier questions? Reveal scaffolding hints? Quietly mark and continue? Tentatively: scaffold with hints first, then mark-and-continue if still stuck.
- **Cost calibration for cloud features.** Each conversational interview round-trips ~5-15 turns. At Sonnet pricing that's small but non-zero. Need a per-session estimated cost shown upfront and a session-level cap.
- **Does the chatbot have its own answer history?** I.e., if the reader asked the same question yesterday, does it remember? Probably yes when SQLite persistence lands, no until then.
- **Privacy when using cloud APIs.** Even when sending data to Claude, that data is part of an interview that's intrinsically about the user's understanding. The opt-in surface for cloud-vs-local needs to be clear. Per-feature toggle.

## 10. Related Systems and Notes

- [`assessment-design.md`](assessment-design.md) — defines the question shapes (free-response, conversational interview) that LLM integration delivers.
- [`three-pillar-model.md`](three-pillar-model.md) — the Interview pillar is the primary surface for LLM-conversational mode; Teach for the chatbot.
- [`interface-affordances.md`](interface-affordances.md) — the right sidebar layout where the chatbot lives.
- [`lessons-as-living-documents.md`](lessons-as-living-documents.md) — chatbot "this answer was wrong" feedback is a revision signal.
- [`authoring-discipline.md`](authoring-discipline.md) — the sync-learning agent's editorial-review rules.
- [`stack-rationale.md`](stack-rationale.md) — the broader reason why Tauri + local-first; this note is the LLM-specific elaboration of that posture.
- [`../systems/tauri-host.md`](../systems/tauri-host.md) — where all of the IPC commands above will land.
- [`../systems/build-pipeline.md`](../systems/build-pipeline.md) — when `reqwest` + `tokio` + Anthropic crates get added to `Cargo.toml`, this is updated.
