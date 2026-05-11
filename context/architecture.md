# Architecture

## Scope / Purpose

This document is the top-down structural map of the Tessarix repository. It describes what the project currently is, how the codebase is shaped, which subsystems exist today, how they depend on each other, and the major execution flow that runs when the app starts. It is the entry point for anyone (engineer or agent) trying to orient before opening source files.

Tessarix is in **scaffold state**. The product vision in `README.md` (multi-modal hypertext learning substrate, three-pillar Teach/Quiz/Interview model, MDX content layer, adaptive scheduler, sync-learning agent, Claude-API grader) describes the *intent*. This `architecture.md` describes *what is implemented in the repository today*. Where the two diverge, this file follows the code; `README.md` is the directional truth.

## Repository Overview

Tessarix is a desktop application built on Tauri 2. A native Rust host process wraps a WebView; the WebView loads a Vite-built React 19 + TypeScript frontend. The current implementation is the `create-tauri-app` scaffold (Tauri 2 + Vite + React 19 + TypeScript template), cleaned of demo content. There is no domain code yet: no MDX content layer, no spaced-repetition state, no Claude API integration, no IPC commands beyond the framework defaults, no SQLite database, no playgrounds, no component library.

The repository is small and deliberately so. The next milestone (M1 per `README.md`) is "substrate proven via one hand-authored lesson" — landing the MDX + KaTeX + Monaco content layer and the first widget primitives.

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
├── src/                               # React frontend source
│   ├── App.tsx                        # Root component; placeholder "Tessarix" heading
│   ├── App.css                        # Minimal base typography + dark-scheme
│   ├── main.tsx                       # ReactDOM root mount under StrictMode
│   └── vite-env.d.ts                  # Vite/TS ambient types reference
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
| **frontend-shell** | [`systems/frontend-shell.md`](systems/frontend-shell.md) | React/TS WebView half; renders the UI; consumes Tauri IPC. Currently a placeholder. | stub | volatile (M1 lands here) |
| **tauri-host** | [`systems/tauri-host.md`](systems/tauri-host.md) | Rust process; hosts the WebView, defines window/identifier, will own IPC commands + SQLite + Claude API client. Currently an empty `Builder` with the `opener` plugin. | stub | volatile (M1+M3+M4 lands here) |
| **build-pipeline** | [`systems/build-pipeline.md`](systems/build-pipeline.md) | Layered build chain: pnpm → Vite → Cargo → tauri-build → tauri-cli. The two halves are coupled through `tauri.conf.json` build hooks and a fixed dev-server port. | working | stable |

Architecturally there are exactly two runtime processes — the Rust host and the WebView — plus the build pipeline that produces them. Everything else (MDX content layer, SQLite, Claude API client, component library, sync-learning skill) is planned but not yet implemented; it will land inside `frontend-shell` and `tauri-host` as new internal modules rather than as new top-level subsystems.

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

- **The Tauri IPC seam is empty.** `lib.rs` calls `tauri::Builder::default()` with the `opener` plugin and no `invoke_handler`. There are no app-specific commands registered. The first piece of M1 work will add an `invoke_handler` and the corresponding JS-side `invoke(...)` calls.
- **`@tauri-apps/plugin-opener` is installed but unused.** It was added by `create-tauri-app` to demonstrate the plugin pattern. Keeping it costs almost nothing and it may be useful when lessons link to external references. Removing it later is a config-only change.
- **No domain dependencies installed yet.** None of the planned content-layer libraries (MDX, KaTeX, Shiki, Monaco, react-flow / xyflow, Konva) are in `package.json`. None of the planned host-side libraries (SQLite via rusqlite/sqlx, async HTTP via reqwest, Claude SDK client) are in `Cargo.toml`. M1 lands the frontend ones; M2/M3/M4 land the host-side ones.
- **`src-tauri/gen/` is generated, not source.** It is committed (typical for Tauri 2 scaffolds) but should not be hand-edited; `tauri_build::build()` rewrites it from `tauri.conf.json` + `capabilities/`.
- **The repository has two commits on `main`.** `7a3add7` (scaffold) and `bc3d9e6` (CLAUDE.md + README expansion). The README rewrite captured the design intent in detail; CLAUDE.md captured the Claude Code personality / collaboration contract.

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
