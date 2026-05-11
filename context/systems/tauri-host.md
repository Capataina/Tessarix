# Tauri Host

*Maturity: working · Stability: volatile — first IPC surface (LLM client) shipped 2026-05-11; M3 (sync-learning agent) and future features will expand this further.*

## Scope / Purpose

The Tauri host is the native Rust process that wraps the WebView. Its long-term responsibilities are:

- spawn and own the application window,
- expose IPC commands the frontend invokes,
- own all durable state (planned: SQLite spaced-repetition database, session history, per-topic mastery),
- own all outbound network calls (planned: Claude API client for the sync-learning agent and the interview grader),
- enforce capability boundaries (which Tauri APIs the WebView is permitted to call).

Today the host is a near-empty Tauri 2 `Builder` with the `opener` plugin and no application commands.

## Boundaries / Ownership

The Tauri host owns:

- everything under `src-tauri/src/` (Rust source),
- `src-tauri/Cargo.toml` and the crate's dependency set,
- `src-tauri/tauri.conf.json` — productName, identifier, window declaration, bundle configuration, build hooks,
- `src-tauri/capabilities/` — the capability declarations that gate IPC,
- `src-tauri/icons/` — the bundle's brand assets across platforms,
- `src-tauri/gen/` — auto-generated capability schemas (committed but not hand-edited).

It does NOT own:

- the WebView's rendered content — that belongs to [`frontend-shell.md`](frontend-shell.md),
- the build orchestration — see [`build-pipeline.md`](build-pipeline.md),
- the static assets in `public/` (currently empty) — those are served by Vite, not the host.

## Current Implemented Reality

### File inventory

| File | Lines | Role |
|---|---|---|
| `src-tauri/src/main.rs` | 6 | Binary entry. Sets `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` to suppress the Windows console window in release builds, then calls `tessarix_lib::run()`. |
| `src-tauri/src/lib.rs` | 16 | `pub fn run()` builds `tauri::Builder` with the `opener` plugin and registers the three LLM IPC commands via `invoke_handler`. |
| `src-tauri/build.rs` | 3 | `tauri_build::build()` — at compile time reads `tauri.conf.json` + `capabilities/default.json` and regenerates `gen/schemas/`. |
| `src-tauri/src/llm/mod.rs` | 5 | LLM module entry point. Exports `client`, `commands`, `types` submodules. |
| `src-tauri/src/llm/types.rs` | 60 | Request/response types matching the OpenAI-compatible chat-completions API: `ChatMessage`, `ChatRequest`, `ChatResponse`, `StreamChunk`, `ResponseFormat` (JSON-schema mode). |
| `src-tauri/src/llm/client.rs` | 195 | `LlmClient` — reqwest-based HTTP client hitting `http://localhost:11434/v1/chat/completions`. Three methods: `chat_complete` (sync), `chat_stream` (SSE streaming with per-token callback), `chat_json` (schema-constrained structured output). Defaults: 180s timeout, temperature 0.2, top_p 0.9. Model defaults to `llama3.2:3b`. |
| `src-tauri/src/llm/commands.rs` | 85 | Tauri command surface: `llm_chat_complete`, `llm_chat_stream` (uses `tauri::ipc::Channel<StreamEvent>` for token streaming), `llm_chat_json`. |

### `Cargo.toml` essentials

- `package.name = "tessarix"`, `version = "0.1.0"`, `edition = "2021"`.
- `[lib] name = "tessarix_lib"`, `crate-type = ["staticlib", "cdylib", "rlib"]` — the lib name is deliberately suffixed to avoid Windows lib/bin name collision (the rationale comment in `Cargo.toml` says so).
- Build dependency: `tauri-build = { version = "2", features = [] }`.
- Runtime dependencies:
  - `tauri = { version = "2", features = [] }` — framework
  - `tauri-plugin-opener = "2"` — external-URL opening (unused as of M1)
  - `serde = { version = "1", features = ["derive"] }`, `serde_json = "1"` — serialisation for IPC + LLM JSON
  - **`reqwest = { version = "0.12", default-features = false, features = ["json", "stream", "rustls-tls"] }`** — HTTP client for the LLM module. `rustls-tls` chosen over `native-tls` to avoid OpenSSL build dependencies.
  - **`tokio = { version = "1", features = ["rt-multi-thread", "macros", "sync"] }`** — async runtime
  - **`futures-util = "0.3"`** — `StreamExt` for SSE chunk iteration in the LLM client

### `tauri.conf.json` essentials

- `productName: "Tessarix"`, `identifier: "com.capataina.tessarix"`, `version: "0.1.0"`.
- `app.windows[0]`: `title: "Tessarix"`, `width: 800`, `height: 600`.
- `app.security.csp: null` (no Content Security Policy declared yet).
- `build.beforeDevCommand: "pnpm dev"`, `build.devUrl: "http://localhost:1420"`, `build.beforeBuildCommand: "pnpm build"`, `build.frontendDist: "../dist"`.
- `bundle.active: true`, `bundle.targets: "all"`, `bundle.icon` lists 32×32 / 128×128 / 128×128@2x PNG + icns + ico under `icons/`.

### `capabilities/default.json` essentials

- `identifier: "default"`, applies to `windows: ["main"]`.
- Permissions granted: `core:default`, `opener:default`.
- These permissions define what the WebView is allowed to invoke. `core:default` is Tauri 2's curated baseline (file picker, dialog, event, path, etc. — exact list is from the Tauri version). `opener:default` exposes the `opener` plugin's command surface.

### IPC surface today

Three application-specific commands, all in the LLM module:

| Command | Signature | Purpose |
|---|---|---|
| `llm_chat_complete` | `(messages, temperature?, topP?, maxTokens?) → String` | Single-shot non-streaming chat completion. Used for short, bounded responses. |
| `llm_chat_stream` | `(messages, onEvent: Channel<StreamEvent>, temperature?, topP?, maxTokens?) → ()` | Server-sent-events streaming. Emits `Token { content }` events per token, terminating with `Done` or `Error { message }`. |
| `llm_chat_json` | `(messages, schema, temperature?, topP?, maxTokens?) → Value` | JSON-schema-constrained structured output. Used by the tiered-hints feature. |

Plus the framework-provided `opener:default` commands (open URLs in OS browser) which the application doesn't yet call.

All three LLM commands hit `http://localhost:11434/v1/chat/completions` by default — Ollama's OpenAI-compatible endpoint. The base URL and model name are hardcoded in `client.rs` for v1; settings UI to override per-feature is a deferred enhancement.

## Key Interfaces / Data Flow

### Today

| Direction | Mechanism | Status |
|---|---|---|
| Host → WebView | Tauri loads `devUrl` (dev) or `frontendDist` (prod) into the window. | Wired. |
| WebView → Host | `invoke(commandName, args)` via `@tauri-apps/api/core`, dispatched to handlers registered on `Builder`. | Bridge exists; zero app commands. |
| Host → OS | `tauri_plugin_opener` (open external URLs / files via OS default handler). | Installed but not used. |

### When M1 / M3 / M4 land (anticipated)

Likely command surface to be added (shapes drafted in `README.md`; see [`frontend-shell.md`](frontend-shell.md#when-m1-lands-anticipated-not-yet-implemented) for the JS side):

- `load_lesson(slug)` → `LessonPayload` (MDX source + question bank).
- `record_attempt(question_id, correct, duration_ms)` → `()` — persists to SQLite.
- `next_due(topic)` → `Option<Question>` — SM-2 or FSRS scheduler output.
- `grade_free_response(rubric, answer)` → `GradingFeedback` — round-trips to Claude API (M4).
- `sync_learning_drafts()` → `Vec<DraftLessonPath>` — emits MDX drafts under `lessons/_drafts/` (M3).

State the host will own:

- a SQLite database (location to be decided; likely `$APPDATA/tessarix/tessarix.db` resolved via `tauri::api::path`),
- async runtime for HTTP (`tokio` is not yet a dep; would be added with the Claude client),
- per-process configuration (API keys, model selection — likely read from env or a config file managed via Tauri's `path` API).

## Implemented Outputs / Artifacts

- A compiled binary (debug or release) produced by `cargo build` (invoked through `tauri-cli`).
- A bundled distributable per `bundle.targets: "all"` — macOS `.app`/`.dmg`, Windows `.exe`/`.msi`, Linux `.AppImage`/`.deb`, etc., produced by `tauri build`.
- `src-tauri/gen/schemas/*.json` — regenerated each build by `tauri_build::build()` from `tauri.conf.json` + `capabilities/`.

## Known Issues / Active Risks

- **Capability surface is `core:default` + `opener:default`.** This is permissive enough for development. Before release, the capability set should be audited — anything the app does not actually need (e.g. arbitrary shell execution if `core:default` includes it on this Tauri version) should be removed.
- **No CSP.** `app.security.csp: null` means the WebView can load any origin. Acceptable for development; needs tightening before release, especially because lessons may embed remote KaTeX fonts, ByteByteGo-style diagram assets, or other external resources.
- **Hard-coded `devUrl` port (`1420`).** Coupled to the Vite `server.port` literal. Documented as a load-bearing constant in [`../architecture.md`](../architecture.md#surprising--load-bearing-connections) and [`build-pipeline.md`](build-pipeline.md).
- **`#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` in `main.rs` is annotated `DO NOT REMOVE`.** This attribute prevents an extra console window from appearing in release builds on Windows. Keep it. Removing it would not break compilation but would degrade the Windows release experience.

## Partial / In Progress

None. Every planned host capability (SQLite, Claude client, IPC command set) is unstarted.

## Planned / Missing / Likely Changes

Per `README.md` milestones:

- **M1:** add a small set of MDX-loading and SR-state IPC commands. Decide on the SQLite Rust binding (likely `rusqlite` with bundled SQLite, or `sqlx` with offline mode — open question). Define the IPC command response envelope (likely a `Result<T, IpcError>`-style discriminated union for predictable JS-side handling).
- **M3:** add the `sync_learning_drafts` command or a separate `.claude/skills/sync-learning-app/` skill that shells out to Claude. Decide which (in-app button vs. vault-local skill) — both are documented in `README.md` as plausible.
- **M4:** add the Claude API client (likely via `reqwest` + the `anthropic-sdk` crate or a thin custom wrapper) and the `grade_free_response` command. Decide on rate limiting + retry policy + key storage.

## Durable Notes / Discarded Approaches

- **The `tessarix_lib` lib name is deliberately suffixed.** `Cargo.toml` carries a comment explaining that the `_lib` suffix avoids a Windows lib-vs-bin name collision documented at rust-lang/cargo#8519. `main.rs` calls `tessarix_lib::run()` to match. Renaming the lib (e.g. dropping the suffix to `tessarix`) would break Windows builds; do not do it.
- **The opener plugin came with the scaffold and was kept.** It is unused today. The cost of keeping it is one dependency + one capability permission; the benefit is that lessons can open external reference URLs in the OS browser via a single `invoke("opener:open_url", { url })` call. If at the end of M1 the plugin is still unused it can be removed; the decision is deferred until then.
- **The original `greet` command (`fn greet(name: &str) -> String`) was removed during this session's cleanup.** Future sessions should not look for it. The scaffold's demo round-trip is no longer part of the surface.

## Obsolete / No Longer Relevant

- The `greet` IPC command and its registration in `Builder::invoke_handler(tauri::generate_handler![greet])` were removed; both `lib.rs` and the frontend `App.tsx` have been simplified to remove the demo. See git commit history for the original state if needed.
