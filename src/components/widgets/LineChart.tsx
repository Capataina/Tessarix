import { useId, useMemo, useState, type ReactNode } from "react";
import "./LineChart.css";

export interface Series {
  /** Unique id, used as React key and aria-label. */
  id: string;
  /** Human label in the legend. */
  label: string;
  /** Y values, parallel to `xs`. */
  ys: number[];
  /** Stroke colour. */
  color: string;
  /** Dash pattern, e.g. "4 3" for a dashed curve. Omit for solid. */
  dash?: string;
  /** Stroke width in SVG units. Default 2. */
  width?: number;
}

export interface LineChartProps {
  /** Common x-axis values shared by every series. */
  xs: number[];
  series: Series[];
  /** [min, max] for the x-axis. Defaults to xs min/max. */
  xDomain?: [number, number];
  /**
   * [min, max] for the y-axis. Defaults to auto-detect across all series with
   * a 5% padding above and below.
   */
  yDomain?: [number, number];
  /** Axis labels rendered outside the plot area. */
  xLabel?: string;
  yLabel?: string;
  /** Number of grid lines on each axis. */
  xTicks?: number;
  yTicks?: number;
  /** Formatter for axis tick labels. */
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  /** Rendered intrinsic height; width fills the container. */
  height?: number;
  /** Optional content rendered below the legend. */
  footer?: ReactNode;
}

const DEFAULT_MARGIN = { top: 12, right: 16, bottom: 36, left: 48 };

function defaultDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) {
    return [min - 0.5, max + 0.5];
  }
  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
}

function linspaceTicks(min: number, max: number, n: number): number[] {
  if (n < 2) return [min, max];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(min + ((max - min) * i) / (n - 1));
  }
  return out;
}

/**
 * Minimal-dependency SVG line chart. Supports multiple overlaid series, axis
 * labels, grid lines, and a hover crosshair with value readouts. Sized via
 * `width: 100%` on the wrapper and a fixed intrinsic height; the SVG uses a
 * fixed coordinate system and is scaled responsively.
 */
export function LineChart({
  xs,
  series,
  xDomain,
  yDomain,
  xLabel,
  yLabel,
  xTicks = 5,
  yTicks = 5,
  formatX = (v) => v.toFixed(2),
  formatY = (v) => v.toFixed(2),
  height = 240,
  footer,
}: LineChartProps) {
  const id = useId();
  const W = 720; // viewBox width, scaled by CSS
  const H = height;
  const m = DEFAULT_MARGIN;
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const xd = useMemo<[number, number]>(
    () => xDomain ?? defaultDomain(xs),
    [xDomain, xs],
  );
  const yd = useMemo<[number, number]>(() => {
    if (yDomain) return yDomain;
    const all: number[] = [];
    for (const s of series) for (const v of s.ys) all.push(v);
    return defaultDomain(all);
  }, [yDomain, series]);

  const sx = (v: number) =>
    m.left + ((v - xd[0]) / (xd[1] - xd[0] || 1)) * plotW;
  const sy = (v: number) =>
    m.top + plotH - ((v - yd[0]) / (yd[1] - yd[0] || 1)) * plotH;

  const xTickValues = useMemo(
    () => linspaceTicks(xd[0], xd[1], xTicks),
    [xd, xTicks],
  );
  const yTickValues = useMemo(
    () => linspaceTicks(yd[0], yd[1], yTicks),
    [yd, yTicks],
  );

  const paths = useMemo(() => {
    return series.map((s) => {
      let d = "";
      for (let i = 0; i < xs.length; i++) {
        const x = sx(xs[i]);
        const y = sy(s.ys[i]);
        d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return { ...s, d };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, xs, xd, yd, W, H]);

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const sx0 = xRatio * W;
    if (sx0 < m.left || sx0 > m.left + plotW) {
      setHoverIdx(null);
      return;
    }
    const xVal = xd[0] + ((sx0 - m.left) / plotW) * (xd[1] - xd[0]);
    // Find nearest index in xs.
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const dist = Math.abs(xs[i] - xVal);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setHoverIdx(best);
  }

  function onMouseLeave() {
    setHoverIdx(null);
  }

  return (
    <div className="lc">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="lc__svg"
        preserveAspectRatio="none"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        role="img"
        aria-labelledby={`${id}-title`}
      >
        <title id={`${id}-title`}>
          Line chart with {series.length} series
        </title>

        {/* Y grid + ticks */}
        {yTickValues.map((v, i) => {
          const y = sy(v);
          return (
            <g key={`yg-${i}`}>
              <line
                x1={m.left}
                y1={y}
                x2={m.left + plotW}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={m.left - 6}
                y={y}
                dy="0.32em"
                textAnchor="end"
                className="lc__tick-text"
              >
                {formatY(v)}
              </text>
            </g>
          );
        })}

        {/* X grid + ticks */}
        {xTickValues.map((v, i) => {
          const x = sx(v);
          return (
            <g key={`xg-${i}`}>
              <line
                x1={x}
                y1={m.top}
                x2={x}
                y2={m.top + plotH}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={x}
                y={m.top + plotH + 18}
                textAnchor="middle"
                className="lc__tick-text"
              >
                {formatX(v)}
              </text>
            </g>
          );
        })}

        {/* Axis borders */}
        <line
          x1={m.left}
          y1={m.top}
          x2={m.left}
          y2={m.top + plotH}
          stroke="rgba(255,255,255,0.2)"
        />
        <line
          x1={m.left}
          y1={m.top + plotH}
          x2={m.left + plotW}
          y2={m.top + plotH}
          stroke="rgba(255,255,255,0.2)"
        />

        {/* Series paths. Note: `stroke` and `fill` are passed via `style` so
            CSS custom properties (e.g. var(--widget-chart-1)) resolve;
            SVG attributes don't expand `var(...)` directly. */}
        {paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            fill="none"
            style={{ stroke: p.color }}
            strokeWidth={p.width ?? 2}
            strokeDasharray={p.dash}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Hover crosshair */}
        {hoverIdx != null && (
          <g>
            <line
              x1={sx(xs[hoverIdx])}
              y1={m.top}
              x2={sx(xs[hoverIdx])}
              y2={m.top + plotH}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="3 3"
            />
            {series.map((s) => (
              <circle
                key={`pt-${s.id}`}
                cx={sx(xs[hoverIdx])}
                cy={sy(s.ys[hoverIdx])}
                r={3.5}
                style={{ fill: s.color }}
                stroke="#0c0c18"
                strokeWidth={1.5}
              />
            ))}
          </g>
        )}

        {/* Axis labels */}
        {xLabel && (
          <text
            x={m.left + plotW / 2}
            y={H - 4}
            textAnchor="middle"
            className="lc__axis-label"
          >
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text
            x={-(m.top + plotH / 2)}
            y={14}
            textAnchor="middle"
            transform="rotate(-90)"
            className="lc__axis-label"
          >
            {yLabel}
          </text>
        )}
      </svg>

      <div className="lc__legend">
        {series.map((s) => (
          <div key={s.id} className="lc__legend-item">
            <span
              className="lc__legend-swatch"
              style={{
                background: s.color,
                opacity: s.dash ? 0.7 : 1,
              }}
            />
            <span className="lc__legend-label">{s.label}</span>
            {hoverIdx != null && (
              <span className="lc__legend-value">
                {formatY(s.ys[hoverIdx])}
              </span>
            )}
          </div>
        ))}
      </div>

      {footer ? <div className="lc__footer">{footer}</div> : null}
    </div>
  );
}
