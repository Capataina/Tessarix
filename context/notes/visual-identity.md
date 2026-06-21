# Visual Identity

## Current Understanding

Tessarix's visual identity is **"a tailored leather notebook that happens to run in a terminal"**: warm analog-luxe surfaces (deep espresso / chocolate / camel / cream, in the COS / Ralph Lauren register) carrying terminal-grade structure (monospace labels, hairline frames, content drawn in a muted "dried-pigment" palette). It replaced a neon cyan/magenta/green-on-near-black "data dashboard" look that read as an edgy-teenager project rather than premium (user's words, 2026-06-21).

Signature elements:

- **The tesseract mark** (`src/components/TesseractMark.tsx`): a hairline cube-in-cube (the 2D shadow of a 4-cube). Ties the name (Tessarix ~ tesseract), the subject (geometry / linear algebra, which the lessons teach), and the warm-technical identity into one glyph. Rotates on hover.
- **Terminal-pane widgets** — the AnsiBox house style borrowed from Caner's `capataina-website` A-FINE article: a single hairline frame on a prose-blended surface, a small uppercase tracked mono label header, no nested cards, no loud colours, so widgets read as inline figures rather than embedded apps.
- **Boot-cascade motion**: on load the topbar settles and the content prints in top-to-bottom, like a terminal coming up. Everywhere else, motion is quiet micro-interactions only.

## Rationale

- **Warm, not neon.** Neon accents are the opposite of premium; the muted tan accent (`#c2a878`) plus warm earth pigments read as sophisticated and let widgets blend into the prose instead of floating as bright foreign cards.
- **Mono for structure, sans for prose.** JetBrains Mono carries all chrome / labels / readouts (the terminal feel); Satoshi carries lesson prose (reading comfort).
- **Darker is more premium.** An early lighter "milk chocolate" palette read muddy; deepening the surfaces toward near-black-with-a-brown-undertone (`#0f0c09`) fixed it.

## What Was Tried

- A first chocolate palette (base `#15110d`, accent `#c9a26b`) was shipped, then refined darker and more muted after the user found it "odd rather than premium". The path to a clean result also required catching that the settings menu / GoalChain used an undefined `--surface-1/2` token namespace falling back to cold navy, and that the procedurally-drawn test image + heatmap colormap were neon hardcoded in JS (CSS could not reach them) — both fixed by routing through the token system.

## Guiding Principles

- One bold idea (the tesseract + the terminal language); everything around it quiet and disciplined.
- Every design value flows from the token source of truth; never hardcode a colour in a widget. See [`../systems/styling-system.md`](../systems/styling-system.md).
- Motion is one orchestrated moment (the boot cascade) plus restraint; always gated by the reduced-motion setting.

## Related Systems and Notes

- [`../systems/styling-system.md`](../systems/styling-system.md) — the token system that implements this identity.
- [`interface-affordances.md`](interface-affordances.md) — the lesson-reading affordances (TOC, tiers, chatbot) the chrome wraps.
- [`../plans/ui-redesign-chocolate-luxe.md`](../plans/ui-redesign-chocolate-luxe.md) — the redesign plan + remaining follow-ons (catalog ledger, per-widget chrome flatten).
- Reference: Caner's `capataina-website` `AnsiBox.tsx` for the terminal-pane house style.
