# Architecture

## Scope / Purpose

This document is the top-down structural map of the Tessarix repository. It describes what the project currently is, how the codebase is shaped, which subsystems exist today, how they depend on each other, and the major execution flow that runs when the app starts. It is the entry point for anyone (engineer or agent) trying to orient before opening source files.

Tessarix has a **substantial working frontend** (83 commits as of 2026-06-21): a Tauri 2 desktop shell wrapping a React 19 + TypeScript app with 8 MDX lessons, ~50 interactive widgets, a local-LLM integration layer, a telemetry layer, a complexity-tier + three-pillar reading shell, a catalog with an AI recommender, and a single-source styling system. The Rust host side remains thin. The product vision in `README.md` (adaptive scheduler, SQLite spaced-repetition, sync-learning agent, Claude-API grader, the Quiz/Interview pillars) describes *intent* not yet built. This file follows the code; `README.md` is the directional truth.

> [!note] Documentation drift (2026-06-21 upkeep)
> The 2026-06-21 upkeep pass focused on the new **styling system** and the **chrome redesign**, and corrected the most-misleading scaffold-era framing below. Several frontend-internals sections (telemetry, LLM, content/registry, the IPC/host claims) still carry accumulated drift from the M1→present period and were only partially re-verified. See `_staleness-report.md` for per-file verdicts and the deferred deep-verification.

## Repository Overview

Tessarix is a desktop application built on Tauri 2. A native Rust host process wraps a WebView; the WebView loads a Vite-built React 19 + TypeScript frontend. Nearly all the implemented behaviour lives in the frontend: an MDX content layer (8 lessons under `src/lessons/`, indexed by `registry.ts`), a component library of ~50 interactive widgets (`src/components/widgets/`, split afine / linear-algebra / shared), assessment components, a local-LLM layer (`src/lib/llm/`, Ollama-backed — powers the right-pane chatbot, the catalog recommender, state-aware widget explanations, and tiered hints), a telemetry layer (`src/lib/telemetry/`), the reading shell (`src/components/Layout.tsx` plus the catalog, TOC, tier control, settings, chatbot), client state contexts (`src/state/`), and the single-source styling system (`src/styles/`).

The Rust host is thin but not empty: `src-tauri/src/` has an `llm/` module (a reqwest-backed streaming client + Tauri commands, talking to **local Ollama**) and a `telemetry/` module (commands + a JSONL writer), both registered via `invoke_handler` in `lib.rs`. There is still no SQLite, no spaced-repetition store, and no Claude-API client (the README still names the Claude API; the shipped LLM features use Ollama). The planned host-side substrate (SQLite spaced-repetition, the adaptive scheduler, the Claude-API grader, the sync-learning agent) is not yet built.

## Repository Structure

```text
Tessarix/
├── README.md                          # Project intent, vision, three-pillar model, milestones
├── CLAUDE.md                          # Project-local Claude Code personality
├── index.html                         # Vite entrypoint; mounts <App /> at #root
├── package.json                       # pnpm scripts: dev / build / preview / tauri
├── pnpm-lock.yaml                     # Frontend dependency lockfile
├── pnpm-workspace.yaml                # pnpm workspace declaration (single-package)
├── tsconfig.json                      # Strict TS; ES2020 + DOM lib; jsx: react-jsx
├── tsconfig.node.json                 # TS config for vite.config.ts
├── vite.config.ts                     # Vite + @vitejs/plugin-react; Tauri-tailored
├── .gitignore                         # node_modules, dist, logs, editor cruft
├── .vscode/                           # Recommended extensions for contributors
│   └── extensions.json
├── public/                            # Static assets served at "/" (empty)
├── src/                               # React frontend source (the bulk of the app)
│   ├── main.tsx                       # Mount; calls injectDesignTokens() before render
│   ├── App.tsx                        # Root: hash routing (catalog ↔ lesson), telemetry, providers
│   ├── App.css                        # Shell + lesson typography (consumes injected tokens)
│   ├── theme.css                      # Structural CSS only (design tokens moved to src/styles/)
│   ├── glossary.mdx                   # Glossary content
│   ├── styles/                        # Single-source design system → systems/styling-system.md
│   │   └── …                          #   tokens.ts (source) · derived.ts · inject.ts · motion.css · index.ts
│   ├── components/                    # Layout, Catalog, TierControl, TesseractMark, SettingsPanel, LessonTOC …
│   │   ├── assessments/               #   MultipleChoice, KnowledgeCheck, GoalChain, PredictThenVerify, …
│   │   ├── chatbot/                   #   AskAboutLesson (right-pane LLM chat)
│   │   └── widgets/                   #   afine/ (~9 widgets) + linear-algebra/ (~44) + shared/
│   ├── lessons/                       # 8 MDX lessons + registry.ts (slug → lazy component map)
│   ├── lib/                           # imaging/ (canvas render + metrics) · llm/ (Ollama client) · telemetry/
│   └── state/                         # TierContext, SettingsContext (React context providers)
├── context/                           # This memory layer
└── src-tauri/                         # Rust host crate (Tauri 2)
    ├── Cargo.toml                     # crate "tessarix"; lib "tessarix_lib"
    ├── Cargo.lock
    ├── build.rs                       # invokes tauri_build::build()
    ├── tauri.conf.json                # productName, identifier, window, bundle, build hooks
    ├── .gitignore
    ├── capabilities/
    │   └── default.json               # core:default + opener:default permissions for main window
    ├── gen/schemas/                   # tauri-build–generated capability schemas (auto)
    ├── icons/                         # Bundle icons across platforms (PNG/icns/ico)
    └── src/
        ├── main.rs                    # Binary entry; suppresses Windows console; calls tessarix_lib::run()
        └── lib.rs                     # tauri::Builder + opener plugin; no IPC commands registered
```

## Subsystem Responsibilities

| Subsystem | Canonical file | Responsibility | Maturity | Stability |
|---|---|---|---|---|
| **frontend-shell** | [`systems/frontend-shell.md`](systems/frontend-shell.md) | The React/TS WebView app: reading shell (Layout, catalog, TOC, tier control, chatbot), MDX content layer, the ~50-widget component library, assessments, LLM features, telemetry, client state. The bulk of the app. | working (doc carries M1→present drift) | unstable |
| **styling-system** | [`systems/styling-system.md`](systems/styling-system.md) | Single source of truth for all design values (`src/styles/`): tokens → injected CSS custom properties + a typed API consumed by canvas widgets. Introduced 2026-06-21. | comprehensive | unstable |
| **tauri-host** | [`systems/tauri-host.md`](systems/tauri-host.md) | Rust process: hosts the WebView; `llm/` (reqwest→Ollama streaming client + commands) and `telemetry/` (commands + JSONL writer) modules registered via `invoke_handler`. No SQLite / spaced-rep / Claude-API yet. | working (doc may carry drift) | unstable |
| **build-pipeline** | [`systems/build-pipeline.md`](systems/build-pipeline.md) | Layered build chain: pnpm → Vite → Cargo → tauri-build → tauri-cli. The two halves are coupled through `tauri.conf.json` build hooks and a fixed dev-server port. | working | stable |

Architecturally there are two runtime processes — the Rust host and the WebView — plus the build pipeline. The frontend (`frontend-shell` + `styling-system`) is where almost all the behaviour lives; it has grown internal areas (content/registry, the widget library, `lib/llm`, `lib/telemetry`) substantial enough that some may warrant their own system docs in a future pass (flagged as a coverage gap in `_staleness-report.md`). The host-side substrate (SQLite, Claude-API client, sync-learning) is still planned and will land in `tauri-host` and new `src/lib/` modules.

## Dependency Direction

```
                ┌───────────────────────────────────────┐
                │           build-pipeline              │
                │  (pnpm + Vite + Cargo + tauri-cli)    │
                └─────────────┬──────────────┬──────────┘
                              │              │
                produces      │              │ produces
                              ▼              ▼
                      ┌─────────────┐  ┌─────────────┐
                      │  frontend-  │  │   tauri-    │
                      │   shell     │  │    host     │
                      │ (Vite/React │◄─┤  (Rust +    │
                      │  + TS)      │  │  Tauri 2)   │
                      └──────┬──────┘  └──────┬──────┘
                             │                │
                             │  Tauri IPC     │
                             └────────────────┘
                              (bidirectional;
                               no commands
                               registered yet)
```

- `build-pipeline` is upstream of both runtime subsystems. Neither runtime depends on it at runtime; both depend on it at dev/build time.
- `frontend-shell` and `tauri-host` are peers connected by the Tauri IPC bridge. Today the bridge is *infrastructural only*: `tauri::Builder::default()` is called but no `invoke_handler` registers any commands, and `App.tsx` does not call `invoke(...)`. The IPC seam exists; nothing flows across it.
- The `opener` plugin (`tauri-plugin-opener` on Rust, `@tauri-apps/plugin-opener` on JS) is installed on both sides; this is the only Tauri command surface presently wired.

## Core Execution / Data Flow

The only operation the repository currently performs is *application startup*. There is no domain logic, no user interaction beyond rendering a heading, no persistence. Tracing startup end-to-end is the only meaningful execution flow today and is documented in detail in [`systems/build-pipeline.md`](systems/build-pipeline.md#startup-chain-end-to-end). Summary:

```
pnpm tauri dev
  │
  ├── tauri-cli reads src-tauri/tauri.conf.json
  │     ├── runs beforeDevCommand: "pnpm dev"
  │     │     └── Vite dev server starts on http://localhost:1420 (strictPort)
  │     │           └── Vite serves index.html → /src/main.tsx → <App />
  │     └── cargo builds the src-tauri crate
  │           ├── build.rs invokes tauri_build::build()
  │           │     └── reads tauri.conf.json + capabilities/default.json
  │           │     └── generates gen/schemas/{capabilities,acl-manifests,*-schema}.json
  │           └── compiles src-tauri/src/{main.rs, lib.rs}
  │
  └── launches the compiled binary
        └── main.rs::main() → tessarix_lib::run()
              └── tauri::Builder::default()
                    .plugin(tauri_plugin_opener::init())
                    .run(tauri::generate_context!())
                    └── opens native window per tauri.conf.json (title: Tessarix, 800×600)
                          └── webview navigates to http://localhost:1420
                                └── <App /> renders "Tessarix" heading
```

In release builds the chain differs at one point: `beforeBuildCommand: "pnpm build"` produces a static `dist/` and `frontendDist: "../dist"` tells the Tauri host to serve from that directory rather than from a dev server. Everything else is the same.

## Inter-System Relationships

| Relationship | Mechanism | What flows | Failure behaviour | Documented in |
|---|---|---|---|---|
| frontend-shell ↔ tauri-host | Tauri IPC bridge (infrastructural) + the `opener` plugin command surface (both sides installed) | Today: nothing app-specific. The `opener` plugin commands are reachable from JS via `@tauri-apps/plugin-opener` but `App.tsx` does not call them. | Bridge is set up; absence of commands is the current state, not a fault. | [`systems/tauri-host.md`](systems/tauri-host.md), [`systems/frontend-shell.md`](systems/frontend-shell.md) |
| frontend-shell ← build-pipeline | Vite dev server (port 1420, `strictPort: true`); `pnpm dev` script; `pnpm build` produces `dist/` | TypeScript + TSX source → bundled WebView assets | Vite fails the port if 1420 is taken (no fallback); strictly required by tauri-cli expectation. | [`systems/build-pipeline.md`](systems/build-pipeline.md) |
| tauri-host ← build-pipeline | `tauri.conf.json` declares `beforeDevCommand`/`beforeBuildCommand`/`devUrl`/`frontendDist`; `build.rs` invokes `tauri_build::build()`; `capabilities/default.json` is read at build time to generate schemas | Configuration → compiled host binary; capabilities → schema JSON under `gen/` | Mismatch between `devUrl` port and Vite's actual port hangs startup. Missing icons listed in `bundle.icon` fails the bundle step. | [`systems/build-pipeline.md`](systems/build-pipeline.md), [`systems/tauri-host.md`](systems/tauri-host.md) |

### Surprising / load-bearing connections

- **Shared port number `1420`.** The Vite dev server (`vite.config.ts`) and the Tauri host (`tauri.conf.json`'s `devUrl: http://localhost:1420`) are coupled through this literal value. Changing it in one place without the other silently breaks `pnpm tauri dev`. Owned by [`systems/build-pipeline.md`](systems/build-pipeline.md).
- **`strictPort: true` in Vite is deliberate.** A free-port fallback would let Vite start on (say) 1421, after which Tauri would still try to load 1420 and the WebView would render a connection error rather than the app. Documented in [`notes/stack-rationale.md`](notes/stack-rationale.md).
- **Both runtime halves depend on Tauri 2 simultaneously.** A Tauri major-version bump touches `@tauri-apps/api` + `@tauri-apps/plugin-opener` on the JS side AND `tauri` + `tauri-plugin-opener` on the Rust side. The dependency is mirrored on both sides — there is no single canonical version pin.

## Critical Paths and Blast Radius

There is one critical path today (app startup, traced above). Blast radius if it breaks: total — the app does not launch.

Specific change-impact notes:

| Change to ... | Affects |
|---|---|
| `tauri.conf.json` `devUrl` or `vite.config.ts` `server.port` | Startup fails unless both move together. |
| `tauri.conf.json` `productName` / `app.windows[0].title` | Window title + bundle name; macOS bundle path. |
| `package.json` script names (`dev` / `build`) | Must match `beforeDevCommand` / `beforeBuildCommand` in `tauri.conf.json`. |
| `Cargo.toml` `[lib].name` (`tessarix_lib`) | Must match `main.rs::tessarix_lib::run()` call. |
| `capabilities/default.json` permissions | Determines which Tauri commands the WebView is allowed to invoke; restricting too far blocks legitimate IPC. |

## Structural Notes / Current Reality

- **The Tauri IPC seam is live.** `lib.rs` registers an `invoke_handler` exposing the `llm/` and `telemetry/` commands; the JS side calls them via `@tauri-apps/api/core::invoke` (the hooks in `src/lib/llm/` and the telemetry layer in `src/lib/telemetry/`). This bullet read "empty" in the scaffold era; that is no longer true.
- **`@tauri-apps/plugin-opener` is installed.** Added by `create-tauri-app`; low cost, potentially useful when lessons link to external references.
- **Content-layer and HTTP dependencies are installed; persistence is not.** MDX (`@mdx-js/*`) + KaTeX drive the lesson pipeline; `reqwest` + `tokio` + `futures-util` back the Ollama client. Still absent: Monaco / playground libraries (playgrounds unbuilt), and any SQLite / persistence crate (spaced-repetition unbuilt).
- **`src-tauri/gen/` is generated, not source.** Committed (typical for Tauri 2) but never hand-edited; `tauri_build::build()` rewrites it from `tauri.conf.json` + `capabilities/`.
- **The repository has 83 commits on `main`** (as of 2026-06-21). Arc: scaffold (2026-05-11) → M1 substrate + A-FINE lesson + Ollama-backed LLM features → a 44-widget linear-algebra push (2026-05-11/12) → the chocolate-luxe redesign + single-source styling system (2026-06-21). The bulk of the code is the linear-algebra widget library plus the afine lesson.

## Reading Guide

- Trying to understand "what does the app do today?" → start here, then [`systems/build-pipeline.md`](systems/build-pipeline.md) (the startup flow is the only behaviour).
- Trying to understand "where do I add a new IPC command?" → [`systems/tauri-host.md`](systems/tauri-host.md) and [`systems/frontend-shell.md`](systems/frontend-shell.md).
- Trying to understand "why was X chosen?" → [`notes.md`](notes.md) is the index; rationale lives in [`notes/`](notes/).
- Trying to understand "what is this project ultimately supposed to be?" → [`README.md`](../README.md) is the directional document.
- Looking for inspiration when designing a new lesson, widget, or interactive pattern → [`references/inspirations/`](references/inspirations/) catalogues ~73 tools across STEM / technical-specialised / wildcards domains, with [`references/inspirations/recurring-patterns.md`](references/inspirations/recurring-patterns.md) as the extracted-pattern centerpiece.

## Coverage

This section makes explicit what the `upkeep-context` Initialise pass actually inspected versus what it described from inference, so future sessions can tell verified facts from gaps. The repository is small enough that direct inspection covered almost everything; the gaps are concentrated in three categories that are either generated, binary, or trivial.

The fully inspected set comprises every TypeScript/TSX file in `src/` (App.tsx, App.css, main.tsx, vite-env.d.ts), all three Rust files in the host crate (`src-tauri/src/main.rs`, `src-tauri/src/lib.rs`, `src-tauri/build.rs`), and the load-bearing configuration files (`package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `Cargo.toml`, `tauri.conf.json`, `capabilities/default.json`, `.gitignore`). The full git history was read via `git log --format=fuller` — the repository is two commits old, so the commit-body rationale capture was exhaustive rather than sampled. The full `README.md` was read for project intent and cross-checked against the implementation reality this document describes.

The set that was deliberately not inspected, and which this document therefore does not make confident claims about, is small and well-bounded:

- `pnpm-lock.yaml` and `Cargo.lock` — dependency lockfiles. Their size precludes meaningful inspection and they carry no design rationale a future session would benefit from.
- `src-tauri/gen/schemas/*.json` — auto-generated by `tauri_build::build()` from `tauri.conf.json` and `capabilities/default.json`. Treated as a build output rather than source.
- `src-tauri/icons/*` — binary brand assets (PNG, icns, ico).
- `.vscode/extensions.json` — editor recommendation metadata, not part of the project's runtime or build behaviour.
- `pnpm-workspace.yaml` — declares a single-package workspace; trivial and adds no architectural surface.

No inferred-from-structure-only claims appear in this document. Every statement was verified from the file cited.
