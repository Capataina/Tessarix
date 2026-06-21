# Styling System

*Maturity: comprehensive · Stability: unstable — introduced 2026-06-21; the chrome redesign on top of it is mid-iteration (catalog ledger + per-widget terminal-pane flatten still pending).*

## Scope / Purpose

The styling system is the single source of truth for every design value in the app: colours, fonts, type scale, spacing, radii, shadows, and motion. It exists because the failure mode before it was that colour decisions were hardcoded per widget in **both** CSS and canvas-drawing JavaScript, so a palette change meant a 50-file sweep and `theme.css` could never reach the JS half (canvas `fillStyle` does not expand `var(--token)`).

The fix: design tokens live once in TypeScript and are consumed two ways — CSS via custom properties written to `:root` at boot, and canvas widgets via a typed import. Change a token and the whole app moves, CSS and canvas alike.

## Boundaries / Ownership

The styling system owns:

- `src/styles/tokens.ts` — the raw token object (palette, fonts, scale, radii, shadows, motion). The only place a brand hex literal is allowed to live.
- `src/styles/derived.ts` — values computed *from* tokens: `alpha()`, `mix()`, `hexToRgb`/`rgbToHex`, the reference test-image palette (`refImage`), and the heatmap diverging colormap (`divergingColor`).
- `src/styles/inject.ts` — `injectDesignTokens()`, which writes every token to `:root` as a CSS custom property.
- `src/styles/motion.css` — the motion language (boot cascade + hover micro-interactions) expressed as keyframes consuming the motion tokens.
- `src/styles/index.ts` — the public API barrel.
- `src/theme.css` — now **structural CSS only** (reset, base typography, ambient background, film grain, scrollbar/selection/focus). It no longer defines any tokens; it consumes the injected `var(--token)` values.

It does NOT own:

- The per-component/per-widget `.css` files — they consume the tokens but live with their components.
- `src/lib/theme.ts` — `resolveColor()` / `resolveColorAlpha()`, the runtime CSS-var bridge for canvas widgets. It reads the injected vars via `getComputedStyle`; it predates this system and remains the path most widgets use.

## Current Implemented Reality

### The token flow

```
src/styles/tokens.ts  ── the source of truth (hex, fonts, scale, motion)
        │
        ├──► inject.ts ── injectDesignTokens() writes ~97 CSS custom
        │                  properties onto document.documentElement at boot
        │                  (called in main.tsx BEFORE ReactDOM.render, so
        │                  there is no flash). CSS files use var(--token).
        │
        └──► derived.ts ── alpha()/mix()/divergingColor()/refImage, all
                           computed from the palette. Imported directly by
                           the canvas widgets that used to hardcode hex.
```

### What consumes it

| Consumer | How | Notes |
|---|---|---|
| Every `.css` file (~64) | `var(--token)` | Names preserved exactly when the tokens moved out of `theme.css`, so no stylesheet needed editing. Includes the legacy neon-era aliases (`--accent-cyan` → camel) and the `--surface-1/2` / `--text-1/2` / `--accent` namespace used by `SettingsPanel` + `GoalChain`. |
| `lib/imaging/render.ts` | `import { refImage }` | The MetricComparison reference image draws its gradient + shapes from `refImage`; zero hex literals remain. |
| `widgets/afine/EmbeddingHeatmap.tsx` | `import { divergingColor }` | The heatmap colormap is the shared espresso→tan/rust diverging map. |
| ~30 simpler canvas widgets | `resolveColor("var(--widget-...)")` | Already single-source post-inject (they read the injected vars). Not yet migrated to the typed API; optional future polish. |

### The palette (chocolate-luxe)

Deep espresso surfaces, warm stone text, a single muted tan accent, a "dried-pigment" categorical set. Base `#0f0c09`; accent camel `#c2a878`; pigment box camel / rust `#a8633f` / eucalyptus `#62807a` / sage `#7e8a5c` / mauve `#9a7384`. Identity: "tailored leather notebook meets a configured terminal" — see [`../notes/visual-identity.md`](../notes/visual-identity.md).

## Key Interfaces / Data Flow

- **`injectDesignTokens()`** — called once, synchronously, at the top of `main.tsx` before render. Idempotent; safe to call again (it re-`setProperty`s). Returns void; no-ops if `document` is undefined.
- **Public API** (`src/styles`): `color`, `font`, `fontSize`, `space`, `radius`, `shadow`, `motion`, `tokens` (from tokens.ts); `alpha`, `mix`, `hexToRgb`, `rgbToHex`, `refImage`, `divergingColor` (from derived.ts); `injectDesignTokens`.
- **CSS contract**: stylesheets reference `var(--token)`. The full injected set (and the referenced-vs-injected audit) is enumerated in `inject.ts`. Referenced-but-not-injected vars are all settings-driven (`--app-font-size`) or layout-local (`--toc-*`, `--chat-*`, `--lesson-max-w*` in `.app-shell`).

## Implemented Outputs / Artifacts

No build artefact of its own — it is consumed at runtime. The injected CSS custom properties are visible on `<html style="...">` at runtime (verified by headless-Chrome render: `--bg-base` and `--accent-camel: #c2a878` present on `documentElement`).

## Known Issues / Active Risks

- **inject must run before render or the app is unstyled.** It is called synchronously at the top of `main.tsx`, which always runs in a Tauri webview, so the risk is theoretical. If a future entry point renders without calling `injectDesignTokens()`, every `var(--token)` resolves empty. Downstream impact: total loss of styling, not a partial degrade.
- **Two literal warm rgba values remain in `theme.css`** (the body ambient vignette) and a handful of `rgba(201,162,107,…)` literal tints remain scattered in component CSS from the colour sweeps. These are warm and on-palette but not token-derived; a palette change would leave them on the old camel. Low blast radius (they are tints, visually indistinct from the new camel).
- **`resolveColor` caches per page load.** It reads the injected vars once and memoises. Since inject runs before any widget renders and the theme is static per load, the cache is valid; a future runtime theme-switch feature would need to clear it.

## Partial / In Progress

- The chrome redesign built on this system (tesseract logo, command-bar topbar, depth-gauge tier control, pillar underline, boot-cascade motion) shipped 2026-06-21. The **catalog ledger restyle** and the **full per-widget terminal-pane chrome flatten** across the ~44 linear-algebra widgets remain — tracked in [`../plans/ui-redesign-chocolate-luxe.md`](../plans/ui-redesign-chocolate-luxe.md).

## Planned / Missing / Likely Changes

- Migrate the ~30 `resolveColor`-based canvas widgets to import the typed API directly (removes the `getComputedStyle` bridge; optional, not required for single-source).
- Token-ise the remaining literal rgba tints in `theme.css` and component CSS.
- A runtime theme-switch (e.g. a lighter tier) would build naturally on `injectDesignTokens()` by re-injecting a different token set and clearing the `resolveColor` cache.

## Durable Notes / Discarded Approaches

- **Runtime inject over build-time CSS generation.** A codegen step emitting `theme.css` from `tokens.ts` was rejected: it adds build tooling for a benefit a Tauri webview (JS always runs before paint) does not need. Runtime inject is true single-source with no drift and no build step.
- **Legacy token names kept as aliases over a rename.** The neon-era names (`--accent-cyan` etc.) and the `--surface-1/2` namespace are retained pointing at warm values rather than renamed across 14+ files, to keep blast radius at one file. New code uses the semantic names (`--accent-camel`, …).
- **Why the redesign needed this first.** Four prior commits (`1f387c9`…`d5c8d66`) recoloured by sweeping hardcoded hex/rgba across 64 files repeatedly. The recurring sweep was the signal that the architecture, not the values, was wrong. See the commit lineage `5d3469b`→`5eb1a3a`.

## Obsolete / No Longer Relevant

- `theme.css` previously held the entire `:root` token block (neon palette, then chocolate palette). That block moved wholesale into `tokens.ts` + `inject.ts`. Future sessions should edit tokens in `tokens.ts`, not look for them in `theme.css`.
