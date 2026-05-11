# Frontend Shell

*Maturity: working · Stability: volatile — M1 substrate + A-FINE lesson + complexity tier system + LLM-integrated features (wrong-answer thread, tiered hints, right-pane chatbot) all shipped 2026-05-11. Ongoing expansion through M2+.*

## Scope / Purpose

The frontend shell is the React/TypeScript half of the Tauri 2 application. It is the code that runs inside the WebView and will eventually render all three pillars of the product (Teach / Quiz / Interview), the lesson narrative, the embedded interactive widgets, the spaced-repetition UI, and the routing surface.

Today it is a placeholder: a single `<App />` component that renders the word "Tessarix" in a centered heading. The substrate (MDX content loader, component library, routing, widget primitives, scheduler UI, IPC calls to the host) is not yet implemented.

## Boundaries / Ownership

The frontend shell owns:

- everything under `src/` (TypeScript / TSX source),
- `index.html` (Vite entrypoint, mount node),
- the TypeScript configuration that targets the frontend (`tsconfig.json` — `include: ["src"]`),
- the React + Vite plugin set declared in `package.json` `dependencies` + `devDependencies`,
- the WebView contract on the JS side: how the app calls `invoke(...)` and what shapes it expects back.

It does NOT own:

- `vite.config.ts` or `tsconfig.node.json` — those belong to the build pipeline ([`build-pipeline.md`](build-pipeline.md)). They configure how the frontend is built and served, but they are not application source.
- The IPC commands themselves — those are defined in the Tauri host ([`tauri-host.md`](tauri-host.md)). The frontend is a consumer.
- The window chrome (title, size, identifier) — declared in `src-tauri/tauri.conf.json`.

## Current Implemented Reality

### File inventory

| File | Lines | Role |
|---|---|---|
| `src/main.tsx` | 9 | ReactDOM root mount; wraps `<App />` in `React.StrictMode`; targets `#root`. |
| `src/App.tsx` | 21 | Function component; wraps the A-FINE lesson in `MDXProvider` (with `mdxComponents`) and `<Layout>`. |
| `src/theme.css` | 159 | Design tokens — dark-luxe palette (cyan / magenta / yellow / green neon accents on near-black background); Inter body font + JetBrains Mono for code; spacing/radii/transition scales; custom scrollbar. |
| `src/App.css` | 397 | Layout primitives (topbar, lesson column), lesson typography hierarchy (h1 with cyan→magenta gradient, h2 with accent bar), KaTeX dark-theme overrides, table styles, lead-paragraph treatment. Imports `theme.css` + `katex/dist/katex.min.css`. |
| `src/vite-env.d.ts` | 2 | Vite client types + MDX module type declarations. |
| `src/components/Layout.tsx` | 53 | App shell: branded topbar (logo mark, "Tessarix" gradient text, lesson title chip, three-pillar pill nav — Teach active, Quiz/Interview disabled), centred main column. |
| `src/components/MDXComponents.tsx` | 31 | The `mdxComponents` map handed to `MDXProvider`. Currently just `LessonMeta` (the chip strip under the lesson title). |
| `src/components/widgets/AFinePipeline.tsx` + `.css` | 127 + 225 | The 7-stage interactive A-FINE forward-pass diagram. Click any stage to see its detail; prev/next nav; per-stage accent colour with glow on active. |
| `src/components/widgets/FunctionGrapher.tsx` + `.css` | 213 + 133 | Generic SVG plotter: pass `xDomain`, `yDomain`, an array of `sliders`, and an `fn(x, params) ↦ y`. Renders curve + filled area + grid + axis labels with a neon glow filter. Used twice in the A-FINE lesson (logistic calibrator + adapter blend). |
| `src/components/assessments/MultipleChoice.tsx` + `.css` | 113 + 195 | Single-question MC with select → reveal → explanation flow. States: idle / selected / revealed-correct / revealed-wrong with colour-coded markers (cyan / green / red). Reset button after reveal. |
| `src/components/assessments/KnowledgeCheck.tsx` + `.css` | 22 + 71 | Container for end-of-lesson question batteries; renders a section with a gradient-edged border and a diamond marker, plus an uppercase "Knowledge check" header. |
| `src/lessons/afine.mdx` | 334 | The A-FINE lesson — 9 sections covering IQA prerequisites → CNN-feature family → A-FINE architecture → fidelity formula → logistic calibrator → adapter asymmetry → implementation traps → 5-question knowledge check. Embeds `<AFinePipeline>`, two `<FunctionGrapher>` instances, two inline `<MultipleChoice>` questions, and a final `<KnowledgeCheck>` battery. Uses KaTeX for inline + display math. |

### Entry sequence

1. `index.html` loads Inter + JetBrains Mono via Google Fonts preconnect+link, declares `<div id="root">` and `<script type="module" src="/src/main.tsx">`.
2. Vite resolves `/src/main.tsx`. The MDX plugin (`@mdx-js/rollup`, configured `enforce: "pre"` in `vite.config.ts`) transforms `.mdx` files to React JSX with `remark-math` + `rehype-katex` already applied; `@vitejs/plugin-react` then handles JSX transform + Fast Refresh across `.ts`, `.tsx`, `.mdx` files.
3. `main.tsx` renders `<React.StrictMode><App /></React.StrictMode>`.
4. `App.tsx` wraps the imported `AfineLesson` MDX component in `<MDXProvider components={mdxComponents}>` + `<Layout>`.
5. `Layout` renders the topbar and the lesson column; the MDX module evaluates and renders the full A-FINE lesson tree.

### TypeScript posture

`tsconfig.json` is strict by Vite-React conventions:

- `strict: true`,
- `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`,
- `moduleResolution: bundler`, `allowImportingTsExtensions: true`, `isolatedModules: true`, `noEmit: true`,
- `jsx: react-jsx` (no manual `React` import needed for JSX),
- `target: ES2020`, `lib: ["ES2020", "DOM", "DOM.Iterable"]`.

The strict + `noUnused*` combination will fail the build on dead imports/variables, which is the intended discipline.

## Key Interfaces / Data Flow

### Today

The only outward interfaces in scope:

- **DOM →** the WebView renders the React tree into `<div id="root">`. No portals, no custom mount points.
- **Tauri IPC →** infrastructurally available via `@tauri-apps/api/core::invoke` (declared in `package.json` `dependencies`), but no call sites exist. `App.tsx` does not import from `@tauri-apps/api`.
- **Opener plugin →** available via `@tauri-apps/plugin-opener` (declared in `package.json`), but no call sites exist.

### When M1 lands (anticipated, not yet implemented)

| Direction | Mechanism | Payload (planned) |
|---|---|---|
| Frontend → host | `invoke("load_lesson", { slug })` | Returns parsed lesson MDX + question-bank rows. |
| Frontend → host | `invoke("record_attempt", { questionId, correct, durationMs })` | Persists to SQLite for SR scheduling. |
| Frontend → host | `invoke("next_due", { topic })` | Returns the next due card per SM-2/FSRS. |
| Frontend → host (M4) | `invoke("grade_free_response", { rubric, answer })` | Round-trips to Claude API. |

These shapes are described in `README.md` and will become real when M1 starts; they are listed here so the seam is visible from this side of the IPC bridge before the commands exist.

## Implemented Outputs / Artifacts

The build pipeline turns this subsystem into:

- a `dist/` folder (production build, `pnpm build`) containing `index.html` + a hashed JS/CSS bundle, consumed by the Tauri host via `tauri.conf.json::build.frontendDist`,
- a live module-graph served by Vite on `http://localhost:1420` during development.

There are no other artefacts (no static lessons, no question banks, no service workers, no PWA manifest).

## Known Issues / Active Risks

- **The IPC seam is unverified end-to-end.** The infrastructural pieces are installed (`@tauri-apps/api` on JS, `tauri` 2 on Rust) but no command has been registered and called yet. The first M1 task should include a trivial round-trip (e.g. an `app_version` command) to confirm the bridge is wired correctly before more elaborate commands rely on it.
- **No error boundary.** `<App />` is wrapped in `StrictMode` only. A render-time exception in any future widget will blank the WebView. M1 should add a top-level `<ErrorBoundary>` before lessons start embedding non-trivial widgets.
- **No CSP.** `tauri.conf.json::app.security.csp` is `null`. This is the `create-tauri-app` default and is fine for development, but lessons that load remote resources (CDN-hosted KaTeX fonts, remote diagram assets) will need a CSP defined before release.

## Partial / In Progress

None. The frontend is in scaffold state — every M1 feature is "missing" rather than "partial".

## Planned / Missing / Likely Changes

Per `README.md` Milestone 1, the next changes here are:

- routing layer (likely `react-router` v6+ or equivalent) with the `/<topic>` / `/<topic>/quiz` / `/<topic>/interview` convention,
- MDX runtime (`@mdx-js/react` + `@mdx-js/rollup`) to load `lessons/*.mdx`,
- KaTeX for math (`katex` + `react-katex` or equivalent),
- Monaco editor for code-question + playground widgets (`@monaco-editor/react`),
- the initial component library: `<StepController>`, `<ArrayVisualiser>`, `<FunctionGrapher>`, `<CodeQuestion>`, `<MultipleChoice>`,
- the first hand-authored lesson (A-FINE) wiring all the above together.

Later milestones (M2+) will add `<NeuralNetVisualiser>` (likely via `react-flow` / `xyflow`), `<TreeVisualiser>`, `<VariableFinder>`, `<FillInTheBlank>`, and the within-session adaptive-difficulty UI on top of the SR engine.

## Durable Notes / Discarded Approaches

- **CSS-in-JS was not chosen.** The scaffold uses plain CSS files (`App.css`). No styled-components, emotion, or CSS modules have been installed. Keeping this for now; revisit when the component library grows enough that scoping matters. See [`../notes/stack-rationale.md`](../notes/stack-rationale.md) for the stack-decision context this fits inside.
- **Component library is opportunistic, not pre-built.** The design rule (from `README.md` and reinforced in [`../notes/authoring-discipline.md`](../notes/authoring-discipline.md)) is that components accrete from real lessons, never speculatively. The first widgets should appear because A-FINE needs them, not because they were planned in the abstract.

## Obsolete / No Longer Relevant

The `create-tauri-app` demo (greet button + Tauri/Vite/React logos + `invoke("greet", { name })` round-trip) existed in the initial scaffold and was removed during this session's cleanup. The corresponding `greet` Rust command was also removed from `lib.rs`. Future sessions should not look for these.
