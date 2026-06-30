# Testing framework — self-auditing frontend + backend

**Status: planned (not started). Adds new dev dependencies → needs user confirmation.**

## Goal

The author cannot eyeball every lesson, pane, and widget for visual and behavioural bugs —
the donut-leaking-its-container bug is the canonical example: a real overflow the agent
should have caught itself. The app needs a testing framework that lets **the agent verify the
frontend and backend autonomously**: render everything, probe it for structural defects, drive
every interaction, and judge the design — without a human in the loop for each lesson.

The model is the proven one from the **Performance Profiler** (LifeOS:
`Projects/Performance Profiler/Systems/Test Harness.md`): a layered, **generic-by-construction**
off-game harness that exercises a browser SPA without a build and without the game. Tessarix
adapts it with one advantage — **there is no loader-lock.** PP's in-game layer (L7) is blocked;
Tessarix is a Tauri webview over a Vite build, so the frontend is directly drivable. The visual +
interactive layers are the *primary* gate here, not a substitute for a blocked one.

## The lesson that refines the brief

The brief was "take screenshots of everything for the agent to analyse." PP's hard-won finding
sharpens that:

> **Probes beat screenshots for structure; vision is for design judgement.** In PP's first audit,
> ~4 vision false-positives were overturned by direct DOM / computed-style probes. Asserting "this
> column is aligned / this element overflows / this text is unreadable" is a *deterministic probe*
> (read the DOM + computed styles + bounding boxes). Judging "does this look stiff / inconsistent /
> off-identity" is *vision*.

So the donut-leak is **not** a screenshot-review task — it's a deterministic overflow probe
(`scrollWidth > clientWidth`, or child `getBoundingClientRect()` exceeding the frame). Vision is
reserved for holistic design quality. This split makes the bulk of the harness fast,
deterministic, and false-positive-free, and reserves the expensive agent-vision pass for what only
judgement can catch.

## The layers (adapted from PP's L1/L4/L6/L8)

| Layer | What it checks | Mechanism | Catches |
|---|---|---|---|
| **Unit / logic** | Pure-logic invariants | `vitest` (TS) + `cargo test` (Rust); pure functions take inputs, return outputs | metric/grid maths (`src/lib/ascii`), geometry, theme resolver, the concept-linker, the graph builder, distortion correctness |
| **Structural probes** | Layout + containment invariants, deterministically | Playwright DOM + computed-style + bounding-box probes | **overflow / leaks** (the donut), unreadable text (transparent/low-contrast colour, missing font, zero-size), broken layout, off-screen elements, mis-alignment, dead-space |
| **Render coverage** | Every unit renders at default *and* edge-case states without crashing | generative fixtures driven from the registry + widget descriptors | error-boundary trips, empty/NaN/extreme-value renders, missing-data states, console errors on mount |
| **Interactive / adaptive** | Every interaction behaves; no anomaly mid-interaction | discover controls (DOM scan + widget descriptor) → drive them → re-probe | dead controls, NaN/∞ in readouts, state-not-updating, overflow that only appears mid-drag, console errors on interaction |
| **Vision / design audit** | Holistic design quality against a rubric | agent-driven vision per page/widget; writes durable dossiers | stiffness, inconsistency, off-identity colour/spacing, ugliness — what probes can't judge |
| *Visual regression (later)* | Pixel diffs over time | screenshot baselines + diff | unintended visual change between commits |

## Generic by construction (the core requirement)

The user's constraint — "we can't hardcode controls for every widget; discover every interaction
dynamically" — is exactly PP's "tabs from the DOM, endpoints from the JS, panes from the markup, so
a new tab is audited with zero harness change." Tessarix discovers its surface from three sources,
in order of preference:

1. **The registry** (`src/lessons/registry.ts`) → every lesson, every slug, every tier. The harness
   walks all of them with no per-lesson code.
2. **The DOM** → standard interactive elements auto-discovered: `input[type=range]` (sweep
   min→max→step), `button` (click), `[role]`, `<select>`, text inputs. Most assessment widgets and
   controls need *zero* test authoring.
3. **The widget descriptor** → for what the DOM can't express (canvas drag-regions, invariants).

A new lesson or a new standard-control widget is tested with **zero harness change**. Only bespoke
canvas widgets add a few lines of descriptor.

## The widget descriptor — one manifest, three consumers

This is the connective tissue. Each widget carries a descriptor that already exists in embryo as
the `widgetDescription` prop on `<WidgetExplainer>`. Extend it into a single manifest consumed by
three systems:

```ts
interface WidgetDescriptor {
  name: string;
  description: string;          // <WidgetExplainer> state caption (exists today)
  teaches?: string[];           // → concept index + the mini-lesson  (curriculum-graph.md)
  howToRead?: string;           // → the fullscreen mini-lesson        (llm-integrations.md §10)
  controls?: ControlSpec[];     // → TEST HARNESS: drag-regions, named sliders/buttons the DOM can't infer
  invariants?: string[];        // → TEST HARNESS: "psnr finite", "nothing overflows the frame", "spins"
}
```

- **`<WidgetExplainer>`** reads `description` (already).
- **The mini-lesson / concept index** read `teaches` + `howToRead`.
- **The test harness** reads `controls` (what to drive) + `invariants` (what to assert).

One descriptor; no separate test-spec file to drift. The **`<WidgetFrame>`**
([component-system.md](component-system.md)) is the enforcement seam: every widget sits in a frame,
so the frame's bounding box is the canonical overflow boundary, and the frame can expose the
descriptor for discovery.

## Anomaly taxonomy (what counts as a finding)

- **Containment:** any descendant's bounding box exceeds its `<WidgetFrame>` / pane / viewport
  (the donut-leak class).
- **Readability:** computed `color` ≈ `background-color` (low contrast), `color: transparent` with
  no painted background (the donut-invisible bug, caught structurally), missing font fallback,
  `font-size` below a floor, zero-height text nodes.
- **Render health:** React error-boundary tripped, thrown error on mount/interaction, console
  `error`/`warn`, unhandled rejection.
- **Numeric:** `NaN` / `Infinity` / `undefined` surfaced in any readout or label.
- **Liveness:** a control whose actuation produces no state change (dead control); a slider that
  doesn't move its bound value.
- **Design (vision only):** stiffness (no transitions), inconsistency with the identity, spacing /
  colour that violates the rubric.

## How the agent runs it

- **Unit:** `pnpm test` (vitest) + `cargo test`. `scripts/verify-donut.ts` is the seed of the unit
  layer — promote its pattern.
- **Structural / render / interactive:** an in-repo Playwright harness (`e2e/` or `scripts/testing/`,
  mirroring PP's `tools/testing/`) that boots the Vite build, walks the registry, and emits a
  machine-readable findings report + a screenshot gallery. The agent reads the report (probes) and
  the gallery (vision). This is the durable, CI-able "built into the app" layer the user wants.
- **Playwright MCP:** the user recalls setting up a Playwright MCP; it is **not surfaced in the
  current session's tools** (ToolSearch found none). The MCP is a *convenience* for the agent to
  drive the browser interactively; the in-repo Playwright harness above is the *durable* core and
  does not depend on the MCP. Flag the MCP for re-enabling if interactive driving is wanted.
- **Vision audit:** the agent reviews the gallery against a design rubric (`e2e/rubric.md`,
  PP-style) and writes durable per-surface dossiers (e.g. `context/audits/<lesson>.md`).

## Sequence

1. **Unit layer** — add `vitest`; cover `src/lib/ascii` (metrics/distortions/donut), geometry, theme;
   `cargo test` for the Rust host. Cheapest, immediate, no browser.
2. **Structural probe harness** — Playwright walks the registry, probes containment + readability +
   render health on every lesson/widget. This catches the donut-leak class *deterministically*.
3. **Render-coverage + interactive harness** — generative fixtures (default + edge states) +
   DOM/descriptor-driven interaction sweeps + the anomaly taxonomy.
4. **Vision design audit** — the rubric + per-surface dossiers; reserved for design judgement.
5. *(later)* visual-regression baselines.

## Blast radius / dependencies

- **New dev dependencies** (needs confirmation per the autonomy contract): `vitest` + `@vitest/*`,
  `@playwright/test`. No production-bundle impact (dev-only).
- Touches every widget incrementally via the descriptor extension + `<WidgetFrame>`
  ([component-system.md](component-system.md)).
- `package.json` gains `test` / `test:e2e` scripts (none exist today — the project currently has no
  test runner at all).
- Related: [component-system.md](component-system.md) (`<WidgetFrame>` is the probe boundary +
  descriptor host), [curriculum-graph.md](curriculum-graph.md) (the registry the harness walks; the
  linker the unit layer tests), [../notes/visual-identity.md](../notes/visual-identity.md) (the design
  rubric the vision audit scores against), [../notes/explanations-must-adapt-to-state.md](../notes/explanations-must-adapt-to-state.md)
  (the `widgetDescription` the descriptor extends).
