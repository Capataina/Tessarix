/**
 * Geometry helpers for the canvas-based widgets.
 *
 * Every plot-style widget (VectorPlot, MatrixTransform, ScalarMultiplier, etc.)
 * draws math-coordinate content onto a fixed-pixel canvas. The mapping is
 * controlled by a "domain" — the half-extent of the visible plot in math
 * units. A fixed DOMAIN is brittle: too small and content clips, too large
 * and content gets lost in empty space.
 *
 * `computeDomain` makes the viewport responsive: scan the points the widget
 * cares about, return the smallest symmetric domain that fits them all
 * (plus a padding margin) and isn't smaller than a floor. The widget rebuilds
 * its toPx/fromPx with the new domain on every render — the plot zooms in
 * and out as the content changes.
 */

export interface Point2 {
  x: number;
  y: number;
}

interface ComputeDomainOpts {
  /** Visual breathing room around the outermost point. Default 1.25. */
  padding?: number;
  /** Minimum half-extent. The viewport never zooms in tighter than this.
      Default 1.0 — guarantees the unit square is always fully visible. */
  floor?: number;
  /** Optional ceiling. Default unbounded. Use when really extreme states
      (k = ±20 on a scalar widget) would otherwise zoom the unit content
      into pixel dust. */
  ceiling?: number;
}

/**
 * Symmetric half-extent that fits every input point with padding. Returns
 * the larger of x-max and y-max so the plot stays square.
 *
 *   computeDomain([{x: 1, y: 0}, {x: 0, y: 1}])  // → ~1.25
 *   computeDomain([{x: 2, y: 1}, {x: 0.5, y: 3}]) // → ~3.75
 *   computeDomain([])                              // → floor (1)
 */
export function computeDomain(
  points: Point2[],
  opts: ComputeDomainOpts = {},
): number {
  const { padding = 1.25, floor = 1, ceiling } = opts;
  let maxAbs = 0;
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (Math.abs(p.x) > maxAbs) maxAbs = Math.abs(p.x);
    if (Math.abs(p.y) > maxAbs) maxAbs = Math.abs(p.y);
  }
  let d = Math.max(maxAbs * padding, floor);
  if (ceiling !== undefined) d = Math.min(d, ceiling);
  return d;
}

/** Math-coordinate point → canvas pixel coordinate. */
export function makeToPx(canvasSize: number, domain: number) {
  return (p: Point2) => ({
    x: canvasSize / 2 + (p.x / domain) * (canvasSize / 2),
    y: canvasSize / 2 - (p.y / domain) * (canvasSize / 2),
  });
}

/** Canvas pixel coordinate → math-coordinate point. */
export function makeFromPx(canvasSize: number, domain: number) {
  return (px: { x: number; y: number }): Point2 => ({
    x: ((px.x - canvasSize / 2) / (canvasSize / 2)) * domain,
    y: -((px.y - canvasSize / 2) / (canvasSize / 2)) * domain,
  });
}
