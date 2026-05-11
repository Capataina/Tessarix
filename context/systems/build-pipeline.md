# Build Pipeline

*Maturity: working · Stability: stable — the pipeline shape rarely changes; only its inputs do.*

## Scope / Purpose

The build pipeline is the chain of tools that turns source files in this repository into either a running development application or a distributable bundle. It is the only place the Vite frontend and the Tauri Rust host are bound together. Understanding it is what lets a future engineer answer "why does `pnpm tauri dev` need port 1420 free?" or "what does `tauri.conf.json::beforeDevCommand` actually run?".

This subsystem has no application source code of its own. Its substance lives in configuration files: `package.json` scripts, `vite.config.ts`, `tauri.conf.json`'s `build` block, `src-tauri/Cargo.toml`'s `[build-dependencies]`, and `src-tauri/build.rs`.

## Boundaries / Ownership

The build pipeline owns:

- `package.json` — `scripts` (`dev`, `build`, `preview`, `tauri`), `dependencies`, `devDependencies`,
- `pnpm-lock.yaml`, `pnpm-workspace.yaml` (single-package workspace declaration),
- `vite.config.ts` (Vite + plugin-react + Tauri-tailored server config),
- `tsconfig.node.json` (TS config for `vite.config.ts` itself),
- `tauri.conf.json::build` (`beforeDevCommand`, `devUrl`, `beforeBuildCommand`, `frontendDist`),
- `src-tauri/Cargo.toml::[build-dependencies]` (`tauri-build`),
- `src-tauri/build.rs` (invokes `tauri_build::build()`),
- the Tauri CLI flow itself (provided by `@tauri-apps/cli` v2 as a devDependency).

It does NOT own:

- application source — see [`frontend-shell.md`](frontend-shell.md) and [`tauri-host.md`](tauri-host.md),
- the runtime IPC bridge — that is Tauri-framework infrastructure invoked by both runtime halves, not the build pipeline.

## Current Implemented Reality

### Tool chain

The Vite plugin chain (configured in `vite.config.ts`) is `mdx → react`. The MDX plugin runs with `enforce: "pre"` so `.mdx` files are transformed to JSX before `@vitejs/plugin-react` picks them up. The MDX plugin is configured with `remark-math` + `rehype-katex` (so `$..$` and `$$..$$` math syntax in MDX renders through KaTeX at build time) and `providerImportSource: "@mdx-js/react"` (so `<MDXProvider>` in `App.tsx` injects custom component overrides into MDX rendering).

```
   pnpm (package manager)
     ├── installs JS dependencies into node_modules/
     ├── runs scripts declared in package.json
     │
     ├── pnpm dev    → vite                     # frontend-only dev server
     ├── pnpm build  → tsc && vite build        # type-check then bundle to dist/
     ├── pnpm preview → vite preview            # serve the prod bundle locally
     └── pnpm tauri  → tauri                    # delegate to @tauri-apps/cli
                         │
                         ├── tauri dev   → reads tauri.conf.json
                         │                  ├── runs beforeDevCommand: "pnpm dev"
                         │                  ├── cargo builds src-tauri/
                         │                  │   └── build.rs → tauri_build::build()
                         │                  │       └── reads tauri.conf.json + capabilities/
                         │                  │       └── (re)generates src-tauri/gen/schemas/
                         │                  ├── compiles main.rs + lib.rs
                         │                  └── launches the binary
                         │                       └── webview navigates to devUrl
                         │
                         └── tauri build → reads tauri.conf.json
                                            ├── runs beforeBuildCommand: "pnpm build"
                                            │   └── tsc (type-check) && vite build → dist/
                                            ├── cargo builds src-tauri/ in release mode
                                            ├── webview is configured to serve from
                                            │   frontendDist: "../dist"
                                            └── tauri bundler produces platform installers
                                                per bundle.targets ("all")
```

### Startup chain (end-to-end)

The single execution flow Tessarix performs today is application startup. Traced step-by-step:

| # | Step | File / Tool | Note |
|---|---|---|---|
| 1 | User runs `pnpm tauri dev` | `package.json::scripts.tauri` → `tauri` | `tauri` resolves to the Tauri CLI v2 binary installed via `@tauri-apps/cli`. |
| 2 | Tauri CLI reads config | `src-tauri/tauri.conf.json` | Picks up `beforeDevCommand`, `devUrl`, window declaration. |
| 3 | Tauri CLI spawns `pnpm dev` | `package.json::scripts.dev` → `vite` | Runs in parallel with the cargo build. |
| 4 | Vite starts dev server | `vite.config.ts` | Strict-port on 1420; React plugin enabled; `host` set from `TAURI_DEV_HOST` env if present; HMR over `ws://` if a Tauri mobile host is specified. |
| 5 | Vite watches `src/` | `vite.config.ts::server.watch.ignored = ["**/src-tauri/**"]` | Cargo handles src-tauri; Vite ignores it to avoid double-rebuild noise. |
| 6 | Cargo builds src-tauri | `src-tauri/Cargo.toml`, `src-tauri/build.rs` | `tauri-build` runs first, then the crate compiles. |
| 7 | `tauri_build::build()` runs | `build.rs` | Reads `tauri.conf.json` + `capabilities/default.json`; writes `gen/schemas/*.json` (capability + ACL manifests + platform-specific schema). |
| 8 | Binary compiles | `main.rs` + `lib.rs` | `main.rs::main()` → `tessarix_lib::run()` → `tauri::Builder::default().plugin(opener::init()).run(generate_context!())`. |
| 9 | Tauri CLI launches binary | The Tauri runtime opens the native window per `tauri.conf.json::app.windows[0]`. | Title "Tessarix", 800×600. |
| 10 | WebView navigates to `devUrl` | `http://localhost:1420` | Loads `index.html` → `/src/main.tsx` → `<App />`. |

Failure points along the chain:

- Step 4 fails hard if port 1420 is occupied (`strictPort: true`). No fallback by design.
- Step 7 fails if `tauri.conf.json` or `capabilities/default.json` is malformed; the rust compile aborts.
- Step 9 fails if the bundle icons listed in `tauri.conf.json::bundle.icon` are missing (release bundling only).
- Step 10 fails if the cargo build finishes before Vite is listening — Tauri CLI handles this with a wait/retry loop on `devUrl`, but unusually slow Vite startups can still surface a connection error in the WebView.

## Key Interfaces / Data Flow

### Coupling points between the two halves

This is the load-bearing surface area of the pipeline; every coupling here must move in lockstep.

| Coupling | Frontend side | Host side | What breaks if they drift |
|---|---|---|---|
| Dev-server port | `vite.config.ts::server.port = 1420` (`strictPort: true`) | `tauri.conf.json::build.devUrl = "http://localhost:1420"` | Drift means the WebView opens to a port no one is listening on; the app renders a connection error rather than the UI. |
| Frontend script names | `package.json::scripts.dev`, `package.json::scripts.build` | `tauri.conf.json::build.beforeDevCommand = "pnpm dev"`, `build.beforeBuildCommand = "pnpm build"` | Renaming a script here without updating the conf hangs `pnpm tauri dev` waiting for a command that does not exist. |
| Production asset path | `vite build` outputs to `dist/` (Vite default) | `tauri.conf.json::build.frontendDist = "../dist"` | Drift means release bundles ship an empty webview. |
| Watch-exclude path | `vite.config.ts::server.watch.ignored = ["**/src-tauri/**"]` | Cargo + tauri-build watch `src-tauri/` themselves | Without the exclusion, Vite triggers spurious frontend reloads every time Cargo writes a build artefact under `src-tauri/target/`. |
| TypeScript output discipline | `tsconfig.json::compilerOptions.noEmit = true` | `pnpm build` runs `tsc && vite build` (sequential, `&&`) | `tsc` is used as a strict-mode pre-flight that fails the entire build on type errors. `vite build` does the actual bundling. Removing the `tsc &&` half loses pre-bundle type checking. |
| Tauri framework version | `package.json::dependencies::@tauri-apps/api ^2`, `@tauri-apps/plugin-opener ^2` | `Cargo.toml::dependencies::tauri = "2"`, `tauri-plugin-opener = "2"` | A major-version bump must touch both sides; mismatched majors yield runtime IPC failures or build failures. |

### Vite ↔ Tauri-mobile hook

`vite.config.ts` reads `TAURI_DEV_HOST` from the environment and, when set, configures `server.host` and switches HMR to `ws://` on port 1421. This is the documented Tauri mobile-development convention. Today the app is desktop-only, so the env var is normally unset and the branch is inactive.

## Implemented Outputs / Artifacts

| Artefact | Producer | Consumer |
|---|---|---|
| `dist/` (production frontend bundle) | `vite build` (invoked by `pnpm build`) | Tauri release builds via `frontendDist: "../dist"`. |
| `src-tauri/target/` (Cargo build directory) | `cargo build` (invoked by tauri-cli) | Tauri CLI for launching dev binary or packaging release bundle. |
| `src-tauri/gen/schemas/{acl-manifests,capabilities,desktop-schema,macOS-schema}.json` | `tauri_build::build()` at compile time | Tauri runtime ACL enforcement + IDE tooling. Committed to repo. |
| Platform bundle (`.app`/`.dmg`/`.exe`/`.msi`/`.deb`/`.AppImage`) | Tauri bundler via `pnpm tauri build` | End users; release distribution. |

## Known Issues / Active Risks

- **Strict-port coupling means port 1420 must be free.** If a stray Vite instance or some other process holds 1420, `pnpm tauri dev` aborts. The default is intentional (see [`../notes/stack-rationale.md`](../notes/stack-rationale.md)) — a free-port fallback would cause silent Tauri-WebView blank-page failures. The cost is occasional friction during development.
- **pnpm 11+ build-script approval policy.** pnpm 11 refuses to run install scripts (e.g. `esbuild` postinstall) until they are explicitly approved via `pnpm approve-builds`. This surfaced during this session: `pnpm build` failed with `ERR_PNPM_IGNORED_BUILDS: esbuild@0.27.7` before the approval was granted. Type-checking + Cargo builds still work (`./node_modules/.bin/tsc --noEmit` and `cd src-tauri && cargo check` both succeed). Resolution: run `pnpm approve-builds` once, accept esbuild.
- **`src-tauri/gen/` is checked in and auto-regenerated.** Hand-edits will be silently overwritten by `tauri_build::build()` on the next compile. If a future session sees a diff in `gen/schemas/`, regenerate rather than reverting.
- **CI is not configured.** No `.github/workflows/`, no test runners. Both `tsc --noEmit` and `cargo check` succeed today; nothing automates them.

## Partial / In Progress

None. The pipeline is in its `create-tauri-app`-default shape (with one config change: `productName`/`identifier` were customised at scaffold time).

## Planned / Missing / Likely Changes

- **MDX + KaTeX + Monaco wiring (M1).** The MDX pipeline needs both a Vite plugin (`@mdx-js/rollup`) and React runtime (`@mdx-js/react`). Adding these will touch `vite.config.ts` (`plugins: [react(), mdx()]`) and `package.json`. KaTeX needs CSS imports; Monaco needs language-worker configuration (lazy-load workers; Vite has a known-good pattern for this).
- **SQLite (M1 or M2).** Adding `rusqlite` or `sqlx` to `Cargo.toml` is straightforward; the database path needs to come from `tauri::api::path::app_data_dir` or similar so the file lands in the OS-conventional per-app data directory.
- **Claude API client (M4).** Adding `reqwest` (or an Anthropic SDK crate) plus `tokio` async runtime. Decide whether the host blocks on Claude calls or uses Tauri's `async_runtime`.
- **CI (post-M1).** Once there is real code, a GitHub Actions workflow running `pnpm install`, `pnpm build`, and `cargo check` on every PR is the obvious baseline.

## Durable Notes / Discarded Approaches

- **`strictPort: true` is deliberate.** Documented in [`../notes/stack-rationale.md`](../notes/stack-rationale.md). A free-port fallback would let Vite start on (say) 1421 while Tauri's webview still hits 1420 — the failure is silent and confusing. Hard failure on port conflict is the better trade-off.
- **The `clearScreen: false` line in `vite.config.ts` exists to keep Rust compile errors visible.** Without it, Vite clears the terminal on every reload, hiding cargo errors that scrolled past. Keep it.
- **Excluding `**/src-tauri/**` from Vite's watcher is non-optional.** Without the exclusion, the entire frontend module graph reloads every time cargo writes a build artefact, which thrashes the dev server.

## Obsolete / No Longer Relevant

None — the pipeline has only ever been in its current shape.
