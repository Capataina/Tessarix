# Widget CSS vs the global `.lesson` rules — a specificity trap

A recurring, hard-to-spot bug: a global `.lesson <tag>` rule silently overrides a
widget-internal style because it is **more specific** than the widget's single-class
selector.

`src/App.css` styles the prose surface with element-scoped rules under `.lesson`
(`.lesson pre`, `.lesson a`, `.lesson table`, gradients on headings, etc.). Every
widget renders *inside* `.lesson`, so any element a widget uses (`<pre>`, `<a>`,
`<canvas>`, `<table>`) is also matched by these rules. `.lesson pre` has specificity
`(0,1,1)`; a widget's `.metric-comparison__ascii` has `(0,1,0)` — so the global rule
**wins**, even though the widget's rule looks like it should own the element.

This has bitten twice:

| When | Symptom | Cause | Fix |
|---|---|---|---|
| ASCII pass | The rotating donut was invisible | a `.lesson`-scoped `background-clip:text` gradient claimed the donut's colour | solid `color: var(--accent-camel)` on the donut |
| Mini-lesson pass | Donut/heatmap **scrolled instead of scaling** when the column narrowed (sidebars open, drawer) | `.lesson pre` (code-block style: `overflow-x:auto`, `font-size:13px`) overrode the widget's container-query font scaling | `.lesson pre` → `.lesson pre:not([class*="__ascii"])` |

**Rule of thumb when a widget-internal style "isn't applying":** before touching the
widget's own CSS, check for a `.lesson <tag>` rule on the same element. Confirm by
**measuring the computed style** (`getComputedStyle`) — the computed value pointing at
a shared token (e.g. `font-size: 13px` = `var(--text-sm)`) is the tell that a global
rule, not your rule, is in effect.

**Two ways out, in order of preference:**

1. **Scope the global rule** to exclude widget elements — `.lesson pre:not([class*="__ascii"])`.
   Best when the global rule was never meant to touch widgets (code-block styling vs a
   widget ASCII display). One change covers all current and future `*__ascii` pres.
2. **Raise the widget rule's specificity** to win — `.metric-comparison .metric-comparison__ascii`
   `(0,2,0)` beats `.lesson pre` `(0,1,1)`. Use when the global rule legitimately applies
   broadly and only a few widgets need to opt out.

**Verification discipline:** verify at the *failing* configuration, not a convenient one.
The scroll bug was "verified" at 1280px (sidebars collapsed) where the donut happened to
fit at the wrong 13px font, so the override went unseen; it only surfaced at 1512px with
both sidebars open. When a bug is layout-width-dependent, the probe must reproduce the
narrow-column state (open the sidebars / the drawer), or it proves nothing.

See also [visual-identity](visual-identity.md) (ASCII displays live in `src/lib/ascii`)
and the [styling system](systems/styling-system.md) (the token source the widgets read).
