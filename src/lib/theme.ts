/**
 * Theme-token helpers for canvas drawing.
 *
 * Canvas 2D context's `strokeStyle` and `fillStyle` accept literal color
 * strings (named colors, hex, rgb(), rgba(), hsl()), but **do NOT** expand
 * `var(--...)` CSS custom properties. Passing `"var(--widget-chart-1)"`
 * directly to the canvas silently falls back to the default color (black)
 * — invisible on a dark background. This is the bug that made basis
 * vectors disappear in MatrixTransform.
 *
 * Use `resolveColor` to translate a CSS-var reference into a usable color
 * string before assigning to canvas drawing properties.
 */

const cache = new Map<string, string>();

/**
 * If `value` looks like `var(--name)` (or `var(--name, fallback)`), resolve
 * the variable against `document.documentElement` and return the value.
 * Otherwise return `value` unchanged.
 *
 * Results are cached per page load. The theme isn't expected to change
 * dynamically (settings only change a small set of variables, none of
 * which the canvas resolver consumes), so the cache stays valid.
 */
export function resolveColor(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("var(")) return trimmed;
  const cached = cache.get(trimmed);
  if (cached) return cached;

  // Parse `var(--name)` or `var(--name, fallback)`.
  const inner = trimmed.slice(4, -1); // strip `var(` and `)`
  const commaIdx = inner.indexOf(",");
  const name = (commaIdx >= 0 ? inner.slice(0, commaIdx) : inner).trim();
  const fallback = commaIdx >= 0 ? inner.slice(commaIdx + 1).trim() : "";

  if (typeof window === "undefined") return fallback || trimmed;
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  const resolved =
    computed || (fallback ? resolveColor(fallback) : trimmed);
  cache.set(trimmed, resolved);
  return resolved;
}

/**
 * Resolve a token AND apply an alpha override. Useful for fills derived from
 * a base accent at variable transparency.
 *
 *   resolveColorAlpha("var(--widget-chart-1)", 0.18)
 *   → "rgba(0, 212, 255, 0.18)" (assuming chart-1 maps to #00d4ff)
 */
export function resolveColorAlpha(value: string, alpha: number): string {
  const c = resolveColor(value);
  // Hex (#rgb / #rrggbb)
  if (c.startsWith("#")) {
    let h = c.slice(1);
    if (h.length === 3) {
      h = h
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  // rgb(r g b) or rgb(r,g,b)
  const m = c.match(/rgb\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1]
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  // Already rgba — drop existing alpha, replace.
  const ma = c.match(/rgba\(([^)]+)\)/);
  if (ma) {
    const parts = ma[1].split(/[,\s]+/).filter(Boolean);
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    }
  }
  return c;
}
