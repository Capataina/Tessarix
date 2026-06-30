# Component system — globalised primitives, the WidgetFrame, per-category theming

**Status: BUILT (2026-06-30).** Radix + `vaul` primitives (`src/components/ui/`), the universal
`<WidgetFrame>`, and full per-category theming (`injectDesignTokens` palette override +
`src/lib/graph/themes.ts`) shipped; all 53 widgets wrapped. The decision below is LOCKED: Radix +
`vaul` on the tokens, fully animated.

## Goal

A single, globalised component vocabulary so the app is coherent by construction — every
button, dialog, drawer, popover, tooltip, tab, and slider looks and behaves the same — and so
the whole app can be **recoloured in one move** (the prerequisite for per-category palettes,
[visual-identity.md](../notes/visual-identity.md)). This is the **skin** to the concept graph's
**brain** ([curriculum-graph.md](curriculum-graph.md)).

It also kills a concrete bug class the user flagged: widgets whose content "escapes" their box
(overflow, not fitting the container). Containment becomes one reviewed component, not a
per-widget re-solve.

## Decision (locked, 2026-06-30): Radix + `vaul` on the existing tokens, fully animated

shadcn-style generic components aren't enough for the bespoke, animated surfaces this app needs, and shadcn's Tailwind requirement would fork the styling system. Locked on **Radix primitives + `vaul`, styled and animated with the existing tokens**. The reasoning that led here:

**shadcn requires Tailwind.** Tessarix already has a strong, hand-built token system
(`src/styles/tokens.ts` → `injectDesignTokens()` → CSS custom properties) that is *purpose-built*
for the per-category theming we want. Adopting shadcn means running two styling paradigms.

| Option | Get | Cost |
|---|---|---|
| **shadcn + Tailwind** (full) | Huge ecosystem, copy-paste components, well-trodden | A second styling system alongside the token system; the token system gets sidelined or duplicated — risks the very coherence we're chasing |
| **Radix primitives + `vaul`, styled by the existing tokens** (recommended) | The *same* accessible behaviour shadcn wraps (shadcn *is* Radix underneath) — Dialog, Drawer (`vaul`), Popover, Tooltip, Tabs, Slider, DropdownMenu — themed by `var(--token)` | More manual styling per primitive; one styling system; full control; per-category theming stays a one-line re-inject |

**Why Radix + `vaul` on the tokens.** The token system is the asset that makes per-category colour
nearly free; introducing Tailwind risks fragmenting it. Radix gives the hard part (accessible
behaviour, focus management, the drawer/dialog mechanics) without the styling opinion. shadcn's real
value is the *chrome and affordances* (the bottom drawer, the explain-here popover, consistent
buttons) — never the bespoke learning widgets — and we get all of that from Radix directly, themed
by our own tokens.

### Animation is a hard requirement, not a polish pass

Because we build the chrome ourselves on *headless* Radix primitives, **we own the motion** — and a
headless primitive wired with no transitions reads as stiff and cheap. Every self-built component
ships with motion from day one, driven by the motion tokens (`--dur-*`, `--ease-*`) and gated by
`prefers-reduced-motion` (consistent with [visual-identity.md](../notes/visual-identity.md)):

- **Enter / exit** — dialogs, drawers, popovers, tooltips, dropdowns animate in and out (fade +
  slide/scale), never hard-cut. `vaul` carries the drawer's drag-physics; Radix exposes
  `data-state` (open/closed) for CSS transitions on the rest.
- **Hover / press** — buttons, cards, controls respond to the pointer (lift, tint, scale) within
  `--dur-fast`.
- **Layout / state changes** — tab/pillar switches slide, tier changes cascade, values tween rather
  than jump.

The acid test: **nothing in the app appears or disappears instantly.** A Radix primitive with no
transition is an unfinished component. This is also why a globalised layer matters — motion lives in
the shared primitives once, not re-invented (or forgotten) per widget.

## `<WidgetFrame>` — the canonical widget container

Independent of the shadcn/Radix call, build one frame every widget sits in (see
[interface-affordances.md](../notes/interface-affordances.md) §10). It owns:

- the hairline terminal-pane border + mono uppercase label header (the house style, today
  re-implemented per widget);
- `overflow` / `max-height` discipline → fixes the "escaping box" bug in one place;
- corner controls: the `<WidgetExplainer>` trigger and the **fullscreen-expand** button that
  opens the bottom-drawer mini-lesson;
- it reads tokens, so per-category recolour and consistent chrome are automatic;
- it is the **test harness's probe boundary** — overflow / leak checks run against the frame's
  bounding box — and exposes the widget descriptor for generic interaction discovery
  ([testing-framework.md](testing-framework.md)).

Migration: wrap existing widgets incrementally; the frame is additive, no widget rewrite needed.

## Per-category theming wiring

The machine already exists. `injectDesignTokens()` writes the palette to `:root` as CSS vars at
runtime; every component and canvas/ASCII widget reads those vars. Per-category theming =

1. define a palette per category (accent + chart/pigment set; structure tokens unchanged);
2. re-inject (or scope to a container) the active category's palette when the reader enters its
   subtree in the [graph nav](curriculum-graph.md);
3. everything recolours — chrome, charts, the rotating ASCII donut — with zero per-widget work.

Keep **structure constant, palette variable** ([visual-identity.md](../notes/visual-identity.md)).
The open sub-decision (accent-only vs full surface-temperature shift) lives in that note.

## What to build

1. Pick the primitive layer (Radix+`vaul` recommended) — wire its theming to the tokens.
2. `<WidgetFrame>` + migrate the flagship widgets into it.
3. Drawer (`vaul`) + the fullscreen mini-lesson surface (content generated per
   [llm-integrations.md](../notes/llm-integrations.md) §10).
4. Per-category palette definitions + the re-inject-on-category-enter hook.
5. Replace ad-hoc buttons/inputs across the app with the primitives, incrementally.

## Blast radius / related

- Touches every widget's outer chrome (via `<WidgetFrame>`, incrementally) and the shell chrome.
- New dependencies (Radix packages, `vaul`, or Tailwind+shadcn) — **needs user confirmation** per
  the autonomy contract (new deps always confirmed).
- [curriculum-graph.md](curriculum-graph.md) (the nav renders through these components),
  [visual-identity.md](../notes/visual-identity.md) (the identity these enforce),
  [testing-framework.md](testing-framework.md) (the `<WidgetFrame>` is its probe boundary + descriptor host),
  [../systems/styling-system.md](../systems/styling-system.md) (the token system they read).
