import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../lib/theme";
import { WidgetExplainer } from "./WidgetExplainer";
import "./MatrixTransform.css";

/**
 * Interactive 2×2 matrix transformation widget. The reader sets the four
 * entries via sliders; the widget visualises:
 *   - the original unit square (dashed),
 *   - the transformed parallelogram (filled),
 *   - the transformed basis vectors î = (a, c) and ĵ = (b, d),
 *   - optionally a draggable test vector v and its image A·v.
 *
 * Determinant is shown numerically and reflected in the parallelogram's
 * shaded area / orientation (negative determinants flip orientation).
 */

const CANVAS_SIZE = 360;
// Half-extent of the visible plot in math units. 2.5 keeps the unit square
// at ~40% of the half-canvas so it's clearly the focal subject; we still
// have room to see scale-2× and rotate-45° matrices without clipping.
const DOMAIN = 2.5;

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface MatrixTransformProps {
  initial?: Matrix2;
  initialVector?: { x: number; y: number };
  /** Show the draggable test vector v and its image A·v. */
  showTestVector?: boolean;
  onStateChange?: (state: Record<string, number>) => void;
  widgetName?: string;
  widgetDescription?: string;
}

export function MatrixTransform({
  initial = { a: 1, b: 0, c: 0, d: 1 },
  initialVector = { x: 1.2, y: 0.6 },
  showTestVector,
  onStateChange,
  widgetName = "2×2 matrix transformation",
  widgetDescription = "Visualise how a 2×2 matrix transforms the plane. The reader sets the four matrix entries; the widget shows the unit square mapping to a parallelogram, the transformed basis vectors, and the determinant. Optionally a draggable test vector and its image under A.",
}: MatrixTransformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [m, setM] = useState<Matrix2>(initial);
  const [v, setV] = useState(initialVector);
  const draggingRef = useRef<"v" | null>(null);

  const toPx = useCallback((p: { x: number; y: number }) => ({
    x: (CANVAS_SIZE / 2) + (p.x / DOMAIN) * (CANVAS_SIZE / 2),
    y: (CANVAS_SIZE / 2) - (p.y / DOMAIN) * (CANVAS_SIZE / 2),
  }), []);

  const fromPx = useCallback((px: { x: number; y: number }) => ({
    x: ((px.x - CANVAS_SIZE / 2) / (CANVAS_SIZE / 2)) * DOMAIN,
    y: -((px.y - CANVAS_SIZE / 2) / (CANVAS_SIZE / 2)) * DOMAIN,
  }), []);

  const applyM = useCallback(
    (p: { x: number; y: number }) => ({
      x: m.a * p.x + m.b * p.y,
      y: m.c * p.x + m.d * p.y,
    }),
    [m],
  );

  const det = useMemo(() => m.a * m.d - m.b * m.c, [m]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    // Resolve theme tokens once per draw — canvas APIs can't parse `var(...)`.
    const C_CHART_1 = resolveColor("var(--widget-chart-1)");
    const C_CHART_3 = resolveColor("var(--widget-chart-3)");
    const C_SUCCESS = resolveColor("var(--widget-success)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_TEXT_DIM = resolveColor("var(--widget-text-dim)");
    const fillPositive = resolveColorAlpha("var(--widget-chart-1)", 0.18);
    const fillNegative = resolveColorAlpha("var(--widget-chart-2)", 0.18);
    const strokePositive = resolveColor("var(--widget-chart-1)");
    const strokeNegative = resolveColor("var(--widget-chart-2)");

    // Grid lines — one line per math unit. Bumped opacity so the grid is
    // legibly present without dominating.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    const pxPerUnit = W / (2 * DOMAIN);
    const unitsPerHalf = Math.ceil(DOMAIN);
    for (let u = -unitsPerHalf; u <= unitsPerHalf; u++) {
      const xPx = W / 2 + u * pxPerUnit;
      const yPx = H / 2 - u * pxPerUnit;
      if (xPx >= 0 && xPx <= W) {
        ctx.beginPath();
        ctx.moveTo(xPx, 0);
        ctx.lineTo(xPx, H);
        ctx.stroke();
      }
      if (yPx >= 0 && yPx <= H) {
        ctx.beginPath();
        ctx.moveTo(0, yPx);
        ctx.lineTo(W, yPx);
        ctx.stroke();
      }
    }

    // Axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Original unit square (dashed outline).
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    const o = toPx({ x: 0, y: 0 });
    const e1 = toPx({ x: 1, y: 0 });
    const e2 = toPx({ x: 0, y: 1 });
    const e12 = toPx({ x: 1, y: 1 });
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(e1.x, e1.y);
    ctx.lineTo(e12.x, e12.y);
    ctx.lineTo(e2.x, e2.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Transformed parallelogram (filled). Color encodes the sign of the
    // determinant — a flipped determinant tints the fill differently to
    // signal orientation reversal.
    const iHat = applyM({ x: 1, y: 0 });
    const jHat = applyM({ x: 0, y: 1 });
    const iPlusJ = { x: iHat.x + jHat.x, y: iHat.y + jHat.y };
    const oPx = toPx({ x: 0, y: 0 });
    const iPx = toPx(iHat);
    const jPx = toPx(jHat);
    const ijPx = toPx(iPlusJ);

    ctx.fillStyle = det >= 0 ? fillPositive : fillNegative;
    ctx.beginPath();
    ctx.moveTo(oPx.x, oPx.y);
    ctx.lineTo(iPx.x, iPx.y);
    ctx.lineTo(ijPx.x, ijPx.y);
    ctx.lineTo(jPx.x, jPx.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = det >= 0 ? strokePositive : strokeNegative;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Transformed basis vectors (drawn after the parallelogram so they sit
    // on top of the fill).
    drawArrow(ctx, oPx, iPx, C_CHART_1, 2.6, "î");
    drawArrow(ctx, oPx, jPx, C_CHART_3, 2.6, "ĵ");

    // Test vector v and its image A·v (if enabled).
    if (showTestVector) {
      const vPx = toPx(v);
      const av = applyM(v);
      const avPx = toPx(av);
      drawArrow(ctx, oPx, vPx, C_TEXT_DIM, 2, "v");
      drawArrow(ctx, oPx, avPx, C_SUCCESS, 2.4, "Av");
      // Draggable handle on v.
      ctx.fillStyle = C_TEXT_DIM;
      ctx.strokeStyle = C_TEXT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(vPx.x, vPx.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [m, v, applyM, det, showTestVector, toPx]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      a: m.a,
      b: m.b,
      c: m.c,
      d: m.d,
      det,
      ihat_x: m.a,
      ihat_y: m.c,
      jhat_x: m.b,
      jhat_y: m.d,
      ...(showTestVector
        ? { v_x: v.x, v_y: v.y, av_x: m.a * v.x + m.b * v.y, av_y: m.c * v.x + m.d * v.y }
        : {}),
    });
  }, [m, v, det, showTestVector, onStateChange]);

  // Pointer drag for the test vector.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!showTestVector) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      const vPx = toPx(v);
      const d = Math.hypot(vPx.x - px.x, vPx.y - px.y);
      if (d < 14) {
        draggingRef.current = "v";
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [showTestVector, v, toPx],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (draggingRef.current !== "v") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      setV(fromPx(px));
    },
    [fromPx],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [],
  );

  const stateSummary = useMemo(() => {
    const parts = [
      `A = [[${m.a.toFixed(2)}, ${m.b.toFixed(2)}], [${m.c.toFixed(2)}, ${m.d.toFixed(2)}]]`,
      `det(A) = ${det.toFixed(3)}`,
      `î = (${m.a.toFixed(2)}, ${m.c.toFixed(2)})`,
      `ĵ = (${m.b.toFixed(2)}, ${m.d.toFixed(2)})`,
    ];
    if (showTestVector) {
      const av = applyM(v);
      parts.push(
        `v = (${v.x.toFixed(2)}, ${v.y.toFixed(2)}), A·v = (${av.x.toFixed(2)}, ${av.y.toFixed(2)})`,
      );
    }
    return parts.join("; ");
  }, [m, v, det, showTestVector, applyM]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        m: [m.a, m.b, m.c, m.d].map((x) => Number(x.toFixed(2))),
        v: showTestVector
          ? [Number(v.x.toFixed(2)), Number(v.y.toFixed(2))]
          : null,
      }),
    [m, v, showTestVector],
  );

  const presets: { label: string; m: Matrix2 }[] = [
    { label: "Identity", m: { a: 1, b: 0, c: 0, d: 1 } },
    { label: "Scale 2×", m: { a: 2, b: 0, c: 0, d: 2 } },
    { label: "Rotate 45°", m: { a: 0.707, b: -0.707, c: 0.707, d: 0.707 } },
    { label: "Shear x", m: { a: 1, b: 1, c: 0, d: 1 } },
    { label: "Reflect x", m: { a: 1, b: 0, c: 0, d: -1 } },
    { label: "Singular", m: { a: 1, b: 2, c: 2, d: 4 } },
  ];

  return (
    <div className="mat-trans">
      <div className="mat-trans__layout">
        <div className="mat-trans__chart-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="mat-trans__canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="application"
            aria-label="2x2 matrix transformation. Dashed outline is the original unit square; filled parallelogram is its image under A."
          />
        </div>

        <div className="mat-trans__panel">
          <div className="mat-trans__matrix">
            <div className="mat-trans__bracket mat-trans__bracket--left" />
            <div className="mat-trans__entries">
              <MatrixEntry label="a" value={m.a} onChange={(a) => setM((p) => ({ ...p, a }))} />
              <MatrixEntry label="b" value={m.b} onChange={(b) => setM((p) => ({ ...p, b }))} />
              <MatrixEntry label="c" value={m.c} onChange={(c) => setM((p) => ({ ...p, c }))} />
              <MatrixEntry label="d" value={m.d} onChange={(d) => setM((p) => ({ ...p, d }))} />
            </div>
            <div className="mat-trans__bracket mat-trans__bracket--right" />
          </div>

          <div
            className={`mat-trans__det mat-trans__det--${det >= 0 ? "pos" : "neg"}`}
          >
            <span className="mat-trans__det-label">det(A)</span>
            <span className="mat-trans__det-value">{det.toFixed(3)}</span>
            <span className="mat-trans__det-note">
              {Math.abs(det) < 0.001
                ? "singular — area collapses"
                : det >= 0
                  ? "orientation preserved"
                  : "orientation flipped"}
            </span>
          </div>

          <div className="mat-trans__presets">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className="mat-trans__preset"
                onClick={() => setM(p.m)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <WidgetExplainer
        widgetName={widgetName}
        widgetDescription={widgetDescription}
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface MatrixEntryProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function MatrixEntry({ label, value, onChange }: MatrixEntryProps) {
  return (
    <div className="mat-trans__entry">
      <span className="mat-trans__entry-label">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value.toFixed(2)}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        className="mat-trans__entry-input"
      />
      <input
        type="range"
        min={-3}
        max={3}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mat-trans__entry-slider"
      />
    </div>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: { x: number; y: number },
  head: { x: number; y: number },
  color: string,
  width: number,
  label?: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  const ang = Math.atan2(head.y - tail.y, head.x - tail.x);
  const len = 9;
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(
    head.x - len * Math.cos(ang - Math.PI / 6),
    head.y - len * Math.sin(ang - Math.PI / 6),
  );
  ctx.lineTo(
    head.x - len * Math.cos(ang + Math.PI / 6),
    head.y - len * Math.sin(ang + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.font = "600 12px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(
      label,
      head.x + 6 * Math.cos(ang),
      head.y + 6 * Math.sin(ang) - 8,
    );
  }
  ctx.restore();
}
