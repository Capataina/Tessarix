/**
 * Values computed FROM the base tokens — gradients, the heatmap colormap, alpha
 * tints, colour mixes. Nothing here is a hardcoded literal; change a token and
 * every derived value moves with it. Imported by both inject.ts (to build CSS
 * custom properties) and canvas-drawing widgets (render.ts, EmbeddingHeatmap).
 */

import { color } from "./tokens";

export type RGB = [number, number, number];

/** Parse `#rrggbb` (or `#rgb`) into an [r, g, b] triple. */
export function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Serialise [r, g, b] back to `#rrggbb`. */
export function rgbToHex([r, g, b]: RGB): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** A token colour at a given alpha, as an `rgba()` string. */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Linear blend of two hex colours; t in [0, 1] (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * t) as unknown as RGB);
}

/**
 * Reference test-image palette (MetricComparison). Flat horizontal palette
 * BANDS (not a smooth gradient) plus on-palette flat shapes, all derived from
 * tokens, so the procedural image reads as a flat terminal-style diagram rather
 * than a photograph dropped into the UI. Hard band edges also make blur and
 * translation more legible than a smooth gradient would. Reusable as the
 * "sample raster" style for any widget that needs flat structured pixels.
 */
export const refImage = {
  // Each entry is [top y-fraction, fill]; each band runs down to the next
  // band's top (the last runs to the bottom).
  bands: [
    [0, mix(color.bgBase, color.tobacco, 0.5)],
    [0.32, color.tobacco],
    [0.58, color.camel],
    [0.8, mix(color.camel, color.textPrimary, 0.45)],
  ] as Array<[number, string]>,
  hatch: alpha(color.textPrimary, 0.3),
  bar: color.ochre,
  circle: color.rust,
  square: color.eucalyptus,
  topStripe: alpha(color.bgBase, 0.55),
};

/**
 * Diverging heatmap colour, all shades of brown: espresso at zero, warming to
 * tan for positive values and to rust for negative. Two distinguishable warm
 * hues so embedding structure stays readable while sitting in the palette.
 */
const ESPRESSO: RGB = [26, 20, 15];
const TAN = hexToRgb(color.camel);
const RUST = hexToRgb(color.rust);

export function divergingColor(v: number, vmax: number): RGB {
  const t = Math.max(-1, Math.min(1, v / (vmax || 1e-9)));
  const pole = t >= 0 ? TAN : RUST;
  const u = Math.abs(t);
  return [0, 1, 2].map((i) => ESPRESSO[i] + (pole[i] - ESPRESSO[i]) * u) as unknown as RGB;
}
