/**
 * Tessarix design tokens — the single source of truth for every colour, font,
 * size, radius, shadow, and motion value in the app.
 *
 * Consumed two ways, so a value defined once here changes everywhere:
 *   - CSS, via custom properties written to :root by `injectDesignTokens()`
 *     (see ./inject.ts). Every `.css` file keeps using `var(--token)`.
 *   - Canvas-drawing widgets, by importing these values and the derived
 *     helpers in ./derived.ts (gradients, the heatmap colormap, alpha tints),
 *     so JS draw code never hardcodes a hex again.
 *
 * Chocolate-luxe identity: deep espresso surfaces, warm stone text, a single
 * restrained tan accent, a muted "dried-pigment" chart palette, and monospace
 * terminal structure on top.
 */

/** Raw palette — the only place a brand hex literal is allowed to live. */
export const color = {
  // Backgrounds, deepest to most-elevated
  bgBase: "#0f0c09",
  bgSurface: "#15110d",
  bgElevated: "#1b1611",
  bgOverlay: "#251e17",
  // Widget surfaces (blend with the page; near-flat elevation)
  widgetBg: "#14100c",
  widgetBgElevated: "#1a1510",
  // Borders
  borderSubtle: "#241c15",
  borderStrong: "#362a20",
  // Text, warm stone
  textPrimary: "#ece5d9",
  textSecondary: "#ab9e8c",
  textMuted: "#73685a",
  textDisabled: "#4f463a",
  // Accent + pigment box. Camel is the single brand accent; the rest are the
  // muted categorical set used by charts, heatmaps, and bars.
  camel: "#c2a878",
  tobacco: "#8e7550",
  rust: "#a8633f",
  ochre: "#bd8e48",
  sage: "#7e8a5c",
  eucalyptus: "#62807a",
  mauve: "#9a7384",
  brick: "#a85044",
} as const;

/** Type families. Satoshi carries prose; JetBrains Mono carries all structure. */
export const font = {
  body: `"Satoshi", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  mono: `"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace`,
} as const;

/** Type scale (px). */
export const fontSize = {
  xs: 12, sm: 13, base: 15, md: 16, lg: 18,
  xl: 22, "2xl": 28, "3xl": 36, "4xl": 44,
} as const;

/** Spacing scale (px, 4px base). */
export const space = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80,
} as const;

/** Corner radii (px). Small corners read as "terminal pane", not "app card". */
export const radius = { sm: 4, md: 8, lg: 10, xl: 14 } as const;

/** Warm-tinted shadows (deep umber, never pure black) for depth on chocolate. */
export const shadow = {
  card: "0 1px 0 rgba(255, 244, 228, 0.025) inset, 0 6px 16px rgba(8, 5, 2, 0.55)",
  elevated: "0 1px 0 rgba(255, 244, 228, 0.04) inset, 0 14px 34px rgba(6, 4, 2, 0.66)",
} as const;

/** Motion language. Durations in ms; easings as cubic-beziers. */
export const motion = {
  durFast: 120,
  durBase: 180,
  durSlow: 280,
  durBoot: 360,
  // Standard ease for UI state; easeOut for entrances (decelerating).
  easeStandard: "cubic-bezier(0.3, 0.7, 0.4, 1)",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export const tokens = { color, font, fontSize, space, radius, shadow, motion } as const;
export type Tokens = typeof tokens;
