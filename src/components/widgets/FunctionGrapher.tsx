import { useState, useMemo, useId, useEffect } from "react";
import "./FunctionGrapher.css";

export interface SliderSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

interface FunctionGrapherProps {
  /** Title shown above the plot. */
  title?: string;
  /** Caption shown below the plot. */
  caption?: string;
  /** Domain on the x axis. */
  xDomain: [number, number];
  /** Range on the y axis (auto-clipped to this). */
  yDomain: [number, number];
  /** Parameter sliders. */
  sliders: SliderSpec[];
  /** Function `f(x, params)` returning y. */
  fn: (x: number, params: Record<string, number>) => number;
  /** Number of sample points. */
  samples?: number;
  /** Optional accent colour key. */
  accent?: "cyan" | "magenta" | "yellow" | "green";
  /** Called whenever a slider changes — lets a wrapper observe widget state. */
  onParamsChange?: (params: Record<string, number>) => void;
}

const ACCENT_COLOURS: Record<NonNullable<FunctionGrapherProps["accent"]>, string> = {
  cyan: "#00d4ff",
  magenta: "#ff44aa",
  yellow: "#ffd633",
  green: "#3eff8e",
};

export function FunctionGrapher({
  title,
  caption,
  xDomain,
  yDomain,
  sliders,
  fn,
  samples = 240,
  accent = "cyan",
  onParamsChange,
}: FunctionGrapherProps) {
  const uid = useId();
  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(sliders.map((s) => [s.key, s.default])),
  );

  // Notify wrappers (e.g. GoalDrivenWrapper) when params change
  useEffect(() => {
    onParamsChange?.(params);
  }, [params, onParamsChange]);

  const colour = ACCENT_COLOURS[accent];

  const path = useMemo(() => {
    const [x0, x1] = xDomain;
    const [y0, y1] = yDomain;
    const w = 640;
    const h = 280;
    const pad = 32;
    const plotW = w - 2 * pad;
    const plotH = h - 2 * pad;

    const points: Array<[number, number]> = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = x0 + (x1 - x0) * t;
      const y = fn(x, params);
      // clamp y for SVG purposes
      const yClipped = Math.max(y0, Math.min(y1, y));
      const px = pad + plotW * t;
      const py = pad + plotH * (1 - (yClipped - y0) / (y1 - y0));
      points.push([px, py]);
    }

    return points
      .map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`)
      .join(" ");
  }, [fn, params, xDomain, yDomain, samples]);

  // Axis ticks
  const xTicks = useMemo(() => {
    const [x0, x1] = xDomain;
    return [0, 0.25, 0.5, 0.75, 1].map((t) => x0 + (x1 - x0) * t);
  }, [xDomain]);

  const yTicks = useMemo(() => {
    const [y0, y1] = yDomain;
    return [0, 0.25, 0.5, 0.75, 1].map((t) => y0 + (y1 - y0) * t);
  }, [yDomain]);

  const formatTick = (v: number) =>
    Math.abs(v) < 1e-3 ? "0" : v.toFixed(Math.abs(v) < 10 ? 1 : 0);

  return (
    <figure className={`grapher grapher--${accent}`}>
      {title && <figcaption className="grapher__title">{title}</figcaption>}

      <div className="grapher__plot">
        <svg viewBox="0 0 640 280" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={`${uid}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity="0.25" />
              <stop offset="100%" stopColor={colour} stopOpacity="0" />
            </linearGradient>
            <filter id={`${uid}-glow`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* grid */}
          {xTicks.map((_, i) => (
            <line
              key={`xg-${i}`}
              x1={32 + (i / 4) * 576}
              y1={32}
              x2={32 + (i / 4) * 576}
              y2={248}
              stroke="#1c2434"
              strokeWidth="1"
            />
          ))}
          {yTicks.map((_, i) => (
            <line
              key={`yg-${i}`}
              x1={32}
              y1={32 + (i / 4) * 216}
              x2={608}
              y2={32 + (i / 4) * 216}
              stroke="#1c2434"
              strokeWidth="1"
            />
          ))}

          {/* axes labels */}
          {xTicks.map((tx, i) => (
            <text
              key={`xl-${i}`}
              x={32 + (i / 4) * 576}
              y={264}
              textAnchor="middle"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              fill="#6b7689"
            >
              {formatTick(tx)}
            </text>
          ))}
          {yTicks.map((ty, i) => (
            <text
              key={`yl-${i}`}
              x={24}
              y={248 - (i / 4) * 216 + 4}
              textAnchor="end"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              fill="#6b7689"
            >
              {formatTick(ty)}
            </text>
          ))}

          {/* curve fill */}
          <path
            d={`${path} L 608 248 L 32 248 Z`}
            fill={`url(#${uid}-fill)`}
          />
          {/* curve stroke */}
          <path
            d={path}
            fill="none"
            stroke={colour}
            strokeWidth="2"
            filter={`url(#${uid}-glow)`}
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {sliders.length > 0 && (
        <div className="grapher__controls">
          {sliders.map((s) => (
            <label key={s.key} className="grapher__slider">
              <span className="grapher__slider-label">
                <span className="grapher__slider-name">{s.label}</span>
                <span className="grapher__slider-value">
                  {params[s.key].toFixed(s.step < 0.1 ? 3 : 2)}
                </span>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={params[s.key]}
                onChange={(e) =>
                  setParams((p) => ({ ...p, [s.key]: parseFloat(e.target.value) }))
                }
              />
            </label>
          ))}
        </div>
      )}

      {caption && <p className="grapher__caption">{caption}</p>}
    </figure>
  );
}
