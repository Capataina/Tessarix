# Stack Rationale

## 1. Current Understanding

Tessarix is built on Tauri 2 + Vite + React 19 + TypeScript, with MDX + KaTeX + Shiki + Monaco for content, SVG / Canvas (Konva) / react-flow for visualisations, SQLite (WAL mode) for persistence, and the Claude API for the sync-learning agent and the interview-view grader. This combination is not the result of independent best-of-breed choices for each layer — it is a coherent set of decisions, each of which is shaped by the constraints the others impose.

## 2. Rationale

### Why Tauri 2 specifically

Three alternatives were rejected explicitly:

| Alternative | Why rejected |
|---|---|
| **Pure web app** | Cannot reliably tap CPU/GPU for the heavier visualisations (large neural-net renders, real-time function-grapher with many concurrent sliders, sandboxed code execution with tracing). Browser limits on workers, memory, and OffscreenCanvas would constrain the substrate the product is meant to be. |
| **TUI (Ratatui-style)** | The product is fundamentally visual + interactive. Step-throughable visualisations, slider-bound function graphers, neural-net node-graph renders, KaTeX math — none of these translate into a terminal. The author has shipped TUI projects (Cernio) and explicitly rejected that mode here. |
| **Electron** | Heavier binaries, slower startup, larger memory footprint, Node-process baggage. Tauri's Rust host is the better fit for the workloads the host will eventually own (SQLite, Claude API client, eventual ML-grader-side work). |

Tauri 2 sits in the middle: a native-binary Rust host plus a WebView frontend. The MDX + TSX stack runs natively in the WebView; CPU/GPU access lives in the Rust host; durable state goes in SQLite owned by the host; the build pipeline is a real desktop-app build, not a web deploy. The author also has prior Tauri 2 experience from the Image Browser project, which transfers directly.

### Why MDX as the content layer

MDX (markdown with embedded React components) is the natural fit for "narrative prose + interactive widgets". The alternatives:

- **Plain markdown.** Loses the embedded-widget capability that is the whole point.
- **HTML.** Loses the prose-authoring ergonomics. Every lesson would become a TSX file with prose inside JSX.
- **A custom DSL.** The author would be inventing a worse MDX. MDX is well-maintained and has a Vite plugin (`@mdx-js/rollup`).

MDX also keeps lessons editable in a normal editor with markdown highlighting; the `<Widget />` calls are React components that resolve normally during build.

### Why KaTeX (not MathJax)

KaTeX is fast, dependency-free, server-side renderable, and ships its own CSS + fonts. MathJax is more flexible but slower and larger. The lessons want low-latency math rendering across many embedded equations per page; KaTeX is the right pick.

### Why Monaco (the VSCode editor)

Two roles: code-question widgets ("write a function that does X") and playground code editing ("edit this algorithm and see the visualisation re-run"). Both need real syntax highlighting, error squiggles, IntelliSense-grade autocomplete, multi-cursor, find-in-file. Monaco is the same engine that powers VSCode, and `@monaco-editor/react` exposes it cleanly. CodeMirror 6 is the credible alternative; Monaco was preferred because the author already knows it from prior projects and the IDE-grade features are worth the bundle-size cost in this product.

### Why react-flow / xyflow for node-graph viz

Neural-network visualisations, dependency graphs, computation graphs all want node-graph rendering with smooth interaction. react-flow / xyflow handles layout, panning, zoom, edge routing without reinventing them. Plain SVG would work for static diagrams but breaks down on interactive node graphs.

### Why SQLite (WAL mode)

The local-first persistence story needs a single-file durable database with concurrent reader/writer support. SQLite in WAL mode is the obvious pick: zero ops, atomic writes, embedded, well-understood, transfers directly from the Image Browser project's pattern.

### Why the Claude API

Two LLM roles need first-class quality: (a) the sync-learning agent that turns vault `Learning/` notes into MDX lesson drafts + question-bank entries, and (b) the free-response grader in the interview view. Claude is the author's chosen model family for both, with consistency to the LifeOS skill ecosystem (`extract-project`, `upkeep-learning`, etc.) which also runs against Claude.

## 3. What Was Tried

Nothing has been tried-and-abandoned for this project — it is in scaffold state. The "alternatives rejected" list above is upfront design discussion, not failed-and-replaced approaches. If anything in the stack gets swapped later (e.g. CodeMirror replacing Monaco, or FSRS replacing SM-2), this section will record the diagnostic reasoning.

## 4. Guiding Principles

- **Coherence beats best-of-breed.** Each layer is chosen knowing the others' constraints. Local optimisation per layer would produce a worse whole.
- **Heavy on the host, light on the WebView.** Anything that touches durable state, the file system, the network, or the OS lives in the Rust host. The WebView renders, interacts, and asks the host for things via IPC.
- **Strict-port + strict-frontendDist.** `vite.config.ts::server.strictPort = true` is deliberate. A free-port fallback would let Vite start on a port the Tauri WebView is not pointed at, which fails silently with a connection error rather than loudly with a port-conflict error. Hard failure is the better default. See [`../systems/build-pipeline.md`](../systems/build-pipeline.md) for the load-bearing constants this principle protects.
- **No CSS-in-JS for now.** Plain CSS keeps the build pipeline simple and avoids decisions about which CSS-in-JS library to pick. Revisit when component-library scoping becomes a real problem, not before.

## 5. Trade-offs and Constraints

| Trade-off | Decision | Cost accepted |
|---|---|---|
| Bundle size vs editor quality | Monaco | ~3 MB+ added to the WebView bundle. Acceptable because the editor is core to the product, not incidental. |
| Web reach vs desktop power | Desktop-only initially | No web build today. `README.md` notes a web build is a config flip later if portfolio framing demands it. |
| Static decks vs generated questions | Generated from notes | Per-session LLM cost is real. The mitigation is a pre-generation pass that builds a question bank per topic, with live-generation reserved for "real-time guiding question" moments. |
| SM-2 simplicity vs FSRS accuracy | SM-2 first, FSRS later | Slightly worse retention curve initially; swap behind a stable scheduler interface. |

## 6. Related Systems and Notes

- [`../systems/build-pipeline.md`](../systems/build-pipeline.md) — where most of the build-side stack choices physically live (vite.config.ts, Cargo.toml).
- [`../systems/frontend-shell.md`](../systems/frontend-shell.md) — where the content-layer libraries (MDX, KaTeX, Monaco) will land.
- [`../systems/tauri-host.md`](../systems/tauri-host.md) — where SQLite and the Claude API client will land.
- [`playground-engine-scope.md`](playground-engine-scope.md) — the playground-engine decision sits inside the broader stack story.
- [`three-pillar-model.md`](three-pillar-model.md) — the routing convention this stack supports.
