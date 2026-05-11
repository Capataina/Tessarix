/**
 * LinearCombination — span explorer for two vectors in R².
 *
 * Used by:
 *   - linear-algebra-span (planned)
 * Cross-link candidates:
 *   - linear-algebra-foundations (extends the vector addition picture
 *     by letting the reader sweep both coefficients freely)
 *   - linear-algebra-matrices (the columns of a 2×2 matrix span its
 *     image; this is the same widget, applied to col-1 and col-2)
 *
 * Implements metaphor library §10 (constructive build-up): start with
 * the basis vectors u and v drawn at the origin; sliders for α and β
 * snap the green output vector α·u + β·v into place. The "span trail"
 * mode scatters faint dots at every reachable point for a 2D grid of
 * (α, β) coefficients, revealing the SPAN — when u and v are linearly
 * independent the trail fills the plane; when they're dependent (one
 * is a scalar multiple of the other) the trail collapses to a line.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../lib/geometry";
import { WidgetExplainer } from "./WidgetExplainer";
import "./LinearCombination.css";

const CANVAS_SIZE = 360;

interface Vector2 {
  x: number;
  y: number;
}

interface LinearCombinationProps {
  initialU?: Vector2;
  initialV?: Vector2;
  initialAlpha?: number;
  initialBeta?: number;
  onStateChange?: (state: Record<string, number>) => void;
}

export function LinearCombination({
  initialU = { x: 1.6, y: 0.5 },
  initialV = { x: 0.5, y: 1.4 },
  initialAlpha = 1,
  initialBeta = 1,
  onStateChange,
}: LinearCombinationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef<"u" | "v" | "out" | null>(null);

  const [u, setU] = useState<Vector2>(initialU);
  const [v, setV] = useState<Vector2>(initialV);
  const [alpha, setAlpha] = useState(initialAlpha);
  const [beta, setBeta] = useState(initialBeta);
  const [showSpanTrail, setShowSpanTrail] = useState(true);

  // The combined vector α·u + β·v.
  const out = useMemo(
    () => ({
      x: alpha * u.x + beta * v.x,
      y: alpha * u.y + beta * v.y,
    }),
    [alpha, beta, u, v],
  );

  // Linear dependence: when v is a scalar multiple of u, the span
  // collapses to a line. Detected via the 2D determinant of the
  // matrix [u | v] being near zero.
  const det = u.x * v.y - u.y * v.x;
  const dependent = Math.abs(det) < 0.04;

  const domain = useMemo(() => {
    const points: Vector2[] = [u, v, out, { x: 0, y: 0 }];
    if (showSpanTrail) {
      // Include the four extreme combinations so the trail fits.
      points.push({ x: 2 * u.x + 2 * v.x, y: 2 * u.y + 2 * v.y });
      points.push({ x: 2 * u.x - 2 * v.x, y: 2 * u.y - 2 * v.y });
      points.push({ x: -2 * u.x + 2 * v.x, y: -2 * u.y + 2 * v.y });
      points.push({ x: -2 * u.x - 2 * v.x, y: -2 * u.y - 2 * v.y });
    }
    return computeDomain(points, { padding: 1.2, floor: 2.5, ceiling: 9 });
  }, [u, v, out, showSpanTrail]);

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);
  const fromPx = useMemo(() => makeFromPx(CANVAS_SIZE, domain), [domain]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_U = resolveColor("var(--widget-chart-1)");
    const C_V = resolveColor("var(--widget-chart-3)");
    const C_OUT = resolveColor("var(--widget-success)");
    const C_DEP = resolveColor("var(--widget-danger)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_TEXT_DIM = resolveColor("var(--widget-text-dim)");
    const C_TRAIL = resolveColorAlpha("var(--widget-success)", 0.18);
    const C_TRAIL_DEP = resolveColorAlpha("var(--widget-danger)", 0.32);

    // Grid.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    const pxPerUnit = W / (2 * domain);
    const unitsPerHalf = Math.ceil(domain);
    for (let u2 = -unitsPerHalf; u2 <= unitsPerHalf; u2++) {
      const xPx = W / 2 + u2 * pxPerUnit;
      const yPx = H / 2 - u2 * pxPerUnit;
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Span trail: scatter dots at α·u + β·v for a grid of (α, β).
    if (showSpanTrail) {
      ctx.fillStyle = dependent ? C_TRAIL_DEP : C_TRAIL;
      const step = 0.25;
      for (let aa = -2; aa <= 2.001; aa += step) {
        for (let bb = -2; bb <= 2.001; bb += step) {
          const p = toPx({
            x: aa * u.x + bb * v.x,
            y: aa * u.y + bb * v.y,
          });
          if (p.x < -5 || p.x > W + 5 || p.y < -5 || p.y > H + 5) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dependent ? 2.2 : 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const oPx = toPx({ x: 0, y: 0 });
    const uPx = toPx(u);
    const vPx = toPx(v);
    const auPx = toPx({ x: alpha * u.x, y: alpha * u.y });
    const bvPx = toPx({ x: beta * v.x, y: beta * v.y });
    const outPx = toPx(out);

    // The construction parallelogram: α·u and β·v drawn from the origin,
    // then the parallelogram closes at α·u + β·v. Dashed because it's
    // a construction guide, not "the answer".
    ctx.strokeStyle = resolveColorAlpha("var(--widget-text)", 0.35);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(auPx.x, auPx.y);
    ctx.lineTo(outPx.x, outPx.y);
    ctx.lineTo(bvPx.x, bvPx.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // α·u drawn as a thinner version of u in u's colour.
    if (Math.abs(alpha) > 0.01) {
      drawArrow(ctx, oPx, auPx, resolveColorAlpha("var(--widget-chart-1)", 0.7), 1.8, null);
    }
    if (Math.abs(beta) > 0.01) {
      drawArrow(ctx, oPx, bvPx, resolveColorAlpha("var(--widget-chart-3)", 0.7), 1.8, null);
    }

    // The original u and v at full strength.
    drawArrow(ctx, oPx, uPx, C_U, 2.4, "u");
    drawArrow(ctx, oPx, vPx, C_V, 2.4, "v");

    // The combined output vector.
    drawArrow(ctx, oPx, outPx, dependent ? C_DEP : C_OUT, 3, "αu+βv");

    // Draggable handles on u, v, and the output point.
    for (const [pt, color] of [
      [uPx, C_U] as const,
      [vPx, C_V] as const,
      [outPx, dependent ? C_DEP : C_OUT] as const,
    ]) {
      ctx.fillStyle = color;
      ctx.strokeStyle = C_TEXT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Coefficient labels at midpoints.
    if (Math.abs(alpha) > 0.05) {
      const mid = { x: (oPx.x + auPx.x) / 2, y: (oPx.y + auPx.y) / 2 };
      ctx.fillStyle = C_TEXT_DIM;
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`α=${alpha.toFixed(2)}`, mid.x + 10, mid.y - 8);
    }
    if (Math.abs(beta) > 0.05) {
      const mid = { x: (oPx.x + bvPx.x) / 2, y: (oPx.y + bvPx.y) / 2 };
      ctx.fillStyle = C_TEXT_DIM;
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`β=${beta.toFixed(2)}`, mid.x + 10, mid.y - 8);
    }
  }, [u, v, alpha, beta, out, dependent, showSpanTrail, domain, toPx]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      u_x: u.x,
      u_y: u.y,
      v_x: v.x,
      v_y: v.y,
      alpha,
      beta,
      out_x: out.x,
      out_y: out.y,
      out_mag: Math.hypot(out.x, out.y),
      det,
      dependent: dependent ? 1 : 0,
    });
  }, [u, v, alpha, beta, out, det, dependent, onStateChange]);

  // Solve for (α, β) such that α·u + β·v = target. Inverts the 2×2
  // matrix [u | v] when it's non-singular; falls back to projection
  // onto whichever axis u/v lies on when dependent.
  const solveCoeffs = useCallback(
    (target: Vector2) => {
      if (Math.abs(det) > 0.02) {
        const a = (target.x * v.y - target.y * v.x) / det;
        const b = (target.y * u.x - target.x * u.y) / det;
        return { alpha: a, beta: b };
      }
      // Dependent case: project the target onto u's direction and put
      // everything in α. β stays at its current value.
      const uMagSq = u.x * u.x + u.y * u.y;
      if (uMagSq < 1e-9) return { alpha, beta };
      const a = (target.x * u.x + target.y * u.y) / uMagSq;
      return { alpha: a, beta };
    },
    [u, v, det, alpha, beta],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      const uPx = toPx(u);
      const vPx = toPx(v);
      const outPx = toPx(out);
      const dU = Math.hypot(uPx.x - px.x, uPx.y - px.y);
      const dV = Math.hypot(vPx.x - px.x, vPx.y - px.y);
      const dOut = Math.hypot(outPx.x - px.x, outPx.y - px.y);
      const best = Math.min(dU, dV, dOut);
      if (best > 16) return;
      if (best === dU) draggingRef.current = "u";
      else if (best === dV) draggingRef.current = "v";
      else draggingRef.current = "out";
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [u, v, out, toPx],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      const p = fromPx(px);
      if (draggingRef.current === "u") setU(p);
      else if (draggingRef.current === "v") setV(p);
      else if (draggingRef.current === "out") {
        const { alpha: na, beta: nb } = solveCoeffs(p);
        // Clamp the coefficients to slider range so the visual stays
        // consistent with the slider readouts.
        setAlpha(Math.max(-2, Math.min(2, na)));
        setBeta(Math.max(-2, Math.min(2, nb)));
      }
    },
    [fromPx, solveCoeffs],
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
    const dependenceNote = dependent
      ? "u and v are LINEARLY DEPENDENT (one is a scalar multiple of the other); the span collapses to a line."
      : "u and v are linearly INDEPENDENT; their span fills all of R².";
    return `u = (${u.x.toFixed(2)}, ${u.y.toFixed(2)}), v = (${v.x.toFixed(2)}, ${v.y.toFixed(2)}). Coefficients α = ${alpha.toFixed(2)}, β = ${beta.toFixed(2)}. Combined vector α·u + β·v = (${out.x.toFixed(2)}, ${out.y.toFixed(2)}). Determinant of [u | v] = ${det.toFixed(3)}. ${dependenceNote}`;
  }, [u, v, alpha, beta, out, det, dependent]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        u: [Number(u.x.toFixed(2)), Number(u.y.toFixed(2))],
        v: [Number(v.x.toFixed(2)), Number(v.y.toFixed(2))],
        a: Number(alpha.toFixed(2)),
        b: Number(beta.toFixed(2)),
      }),
    [u, v, alpha, beta],
  );

  return (
    <div className="lincomb">
      <div className="lincomb__layout">
        <div className="lincomb__chart-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="lincomb__canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="application"
            aria-label="Linear combination explorer. Drag u or v to change the basis; drag the green output point to set coefficients α and β automatically; the faint dots show the span (all reachable points)."
          />
          <div className="lincomb__hint" aria-hidden>
            Drag u or v · drag the green dot to set α, β · faint dots = span
          </div>
        </div>

        <div className="lincomb__panel">
          <div
            className={`lincomb__dependence ${dependent ? "lincomb__dependence--dep" : "lincomb__dependence--indep"}`}
          >
            <span className="lincomb__dependence-label">u, v relationship</span>
            <span className="lincomb__dependence-value">
              {dependent ? "linearly dependent" : "linearly independent"}
            </span>
            <span className="lincomb__dependence-note">
              {dependent
                ? "span collapses to a line · only points on u's line are reachable"
                : "span fills R² · every point in the plane is reachable"}
            </span>
          </div>

          <div className="lincomb__sliders">
            <SliderRow
              label="α"
              value={alpha}
              min={-2}
              max={2}
              step={0.05}
              accent="primary"
              onChange={setAlpha}
            />
            <SliderRow
              label="β"
              value={beta}
              min={-2}
              max={2}
              step={0.05}
              accent="secondary"
              onChange={setBeta}
            />
          </div>

          <div className="lincomb__readouts">
            <Row label="α · u" value={`(${(alpha * u.x).toFixed(2)}, ${(alpha * u.y).toFixed(2)})`} />
            <Row label="β · v" value={`(${(beta * v.x).toFixed(2)}, ${(beta * v.y).toFixed(2)})`} />
            <Row
              label="α·u + β·v"
              value={`(${out.x.toFixed(2)}, ${out.y.toFixed(2)})`}
              accent="primary"
            />
            <Row label="det[u|v]" value={det.toFixed(3)} />
          </div>

          <label className="lincomb__toggle">
            <input
              type="checkbox"
              checked={showSpanTrail}
              onChange={(e) => setShowSpanTrail(e.target.checked)}
            />
            <span>Show span trail (faint dots)</span>
          </label>
        </div>
      </div>

      <WidgetExplainer
        widgetName="Linear combinations and span"
        widgetDescription="Two vectors u and v at the origin (both draggable); sliders for coefficients α and β; the combined vector α·u + β·v drawn in green; a faint dot trail showing every point reachable by varying α and β over [-2, 2] — the SPAN of {u, v}. When u and v are linearly independent the trail fills the plane; when they're linearly dependent (parallel or anti-parallel) the trail collapses to a single line through the origin and the output vector turns red. Reader can also drag the green output point directly to set α and β automatically by inverting the 2×2 matrix [u | v]."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  accent?: "primary" | "secondary";
  onChange: (v: number) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  accent,
  onChange,
}: SliderRowProps) {
  return (
    <label className="lincomb__slider-row">
      <span className={`lincomb__slider-label lincomb__slider-label--${accent ?? "default"}`}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lincomb__slider"
      />
      <span className="lincomb__slider-value">{value.toFixed(2)}</span>
    </label>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary";
}) {
  return (
    <div
      className={`lincomb__readout-row ${accent === "primary" ? "lincomb__readout-row--primary" : ""}`}
    >
      <span className="lincomb__readout-label">{label}</span>
      <span className="lincomb__readout-value">{value}</span>
    </div>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: { x: number; y: number },
  head: { x: number; y: number },
  color: string,
  width: number,
  label: string | null,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const len = Math.hypot(dx, dy);
  if (len > 6) {
    const ang = Math.atan2(dy, dx);
    const aLen = Math.min(10, len * 0.4);
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(
      head.x - aLen * Math.cos(ang - Math.PI / 6),
      head.y - aLen * Math.sin(ang - Math.PI / 6),
    );
    ctx.lineTo(
      head.x - aLen * Math.cos(ang + Math.PI / 6),
      head.y - aLen * Math.sin(ang + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  }
  if (label) {
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(label, head.x + 8, head.y - 10);
  }
  ctx.restore();
}
