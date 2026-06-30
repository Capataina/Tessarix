/**
 * Renders a 2D value grid as an ASCII character field — glyph density encodes
 * magnitude, optional per-cell colour encodes value. The reusable surface behind
 * the A-FINE "custom display" widgets that aren't standard charts (e.g. the
 * EmbeddingHeatmap's three feature panels). For the animated rotating donut,
 * MetricComparison drives a <pre> imperatively instead — per-cell React spans
 * would thrash at 24fps; this component is for displays that re-render only on
 * interaction.
 *
 * Used by: EmbeddingHeatmap.
 */
import { Fragment } from "react";
import { RAMP } from "./field";

export interface AsciiFieldProps {
  /** Row-major value grid. */
  rows: number[][];
  /** Map a value to glyph intensity in [0, 1]. */
  intensity: (v: number) => number;
  /** Map a value to a CSS colour. Omit for mono (inherits `currentColor`). */
  colorFor?: (v: number) => string;
  ramp?: string;
  className?: string;
  ariaLabel?: string;
}

export function AsciiField({
  rows,
  intensity,
  colorFor,
  ramp = RAMP,
  className,
  ariaLabel,
}: AsciiFieldProps) {
  const n = ramp.length - 1;
  const glyph = (v: number) => {
    const t = Math.max(0, Math.min(1, intensity(v)));
    return ramp[Math.round(t * n)];
  };

  // Mono fast path: one text node, no per-cell spans.
  if (!colorFor) {
    const text = rows.map((row) => row.map(glyph).join("")).join("\n");
    return (
      <pre className={className} aria-label={ariaLabel}>
        {text}
      </pre>
    );
  }

  return (
    <pre className={className} aria-label={ariaLabel}>
      {rows.map((row, y) => (
        <Fragment key={y}>
          {row.map((v, x) => (
            <span key={x} style={{ color: colorFor(v) }}>
              {glyph(v)}
            </span>
          ))}
          {y < rows.length - 1 ? "\n" : null}
        </Fragment>
      ))}
    </pre>
  );
}
