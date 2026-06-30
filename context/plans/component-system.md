# Component system — globalised primitives, the WidgetFrame, per-category theming

**Status: planned (not started). One open decision for the user to land (below).**

## Goal

A single, globalised component vocabulary so the app is coherent by construction — every
button, dialog, drawer, popover, tooltip, tab, and slider looks and behaves the same — and so
the whole app can be **recoloured in one move** (the prerequisite for per-category palettes,
[visual-identity.md](../notes/visual-identity.md)). This is the **skin** to the concept graph's
**brain** ([curriculum-graph.md](curriculum-graph.md)).

It also kills a concrete bug class the user flagged: widgets whose content "escapes" their box
(overflow, not fitting the container). Containment becomes one reviewed component, not a
per-widget re-solve.

## The open decision — shadcn vs Radix-on-tokens

The user proposed shadcn. The catch worth a deliberate call:

**shadcn requires Tailwind.** Tessarix already has a strong, hand-built token system
(`src/styles/tokens.ts` → `injectDesignTokens()` → CSS custom properties) that is *purpose-built*
for the per-category theming we want. Adopting shadcn means running two styling paradigms.

| Option | Get | Cost |
|---|---|---|
| **shadcn + Tailwind** (full) | Huge ecosystem, copy-paste components, well-trodden | A second styling system alongside the token system; the token system gets sidelined or duplicated — risks the very coherence we're chasing |
| **Radix primitives + `vaul`, styled by the existing tokens** (recommended) | The *same* accessible behaviour shadcn wraps (shadcn *is* Radix underneath) — Dialog, Drawer (`vaul`), Popover, Tooltip, Tabs, Slider, DropdownMenu — themed by `var(--token)` | More manual styling per primitive; one styling system; full control; per-category theming stays a one-line re-inject |

**Recommendation: Radix + `vaul` on the existing tokens.** Rationale: the token system is the
asset that makes idea-4 (per-category colour) nearly free; introducing Tailwind risks fragmenting
it. Radix gives the hard part (accessible behaviour, focus management, the drawer/dialog
mechanics) without the styling opinion. shadcn's real value is the *chrome and affordances* (the
bottom drawer, the explain-here popover, consistent buttons) — never the bespoke learning widgets
— and we can get all of that from Radix directly.

This is a judgment call the user owns. If shadcn+Tailwind is chosen anyway, the mitigation is to
drive shadcn's CSS-var theming from the existing tokens so there is still one source of colour.

## `<WidgetFrame>` — the canonical widget container

Independent of the shadcn/Radix call, build one frame every widget sits in (see
[interface-affordances.md](../notes/interface-affordances.md) §10). It owns:

- the hairline terminal-pane border + mono uppercase label header (the house style, today
  re-implemented per widget);
- `overflow` / `max-height` discipline → fixes the "escaping box" bug in one place;
- corner controls: the `<WidgetExplainer>` trigger and the **fullscreen-expand** button that
  opens the bottom-drawer mini-lesson;
- it reads tokens, so per-category recolour and consistent chrome are automatic.

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
  [../systems/styling-system.md](../systems/styling-system.md) (the token system they read).
