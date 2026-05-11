/**
 * DotProductGeometry — projection-shadow visualisation of a·b.
 *
 * Used by:
 *   - linear-algebra-dot-product (planned)
 * Cross-link candidates:
 *   - afine (the fidelity head is structurally a dot-product-style ratio
 *     in feature space — a future cross-reference from there to here)
 *   - linear-algebra-matrices (matrix-vector multiplication is row-wise
 *     dot products)
 *
 * Implements the metaphor library pattern §2 (projection / shadow): one
 * object casts a shadow onto another, and the shadow's signed magnitude
 * is the operation's output. The reader drags two vectors a and b; the
 * widget draws the shadow of a's tip onto b's direction line, the
 * perpendicular drop from a's tip to that shadow, the angle arc at the
 * origin, and a sign-coded dot-product bar.
 *
 * Pedagogy: the dot product is "two vectors multiplied into a scalar."
 * The geometric meaning — projection — is what makes it more than a
 * number. This widget makes |a| · |b| · cos(θ) visible by spatial
 * decomposition: |b| is the length of b's arrow, the shadow segment's
 * length is |a| · cos(θ), and their product is a·b.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../lib/geometry";
import { WidgetExplainer } from "./WidgetExplainer";
import "./DotProductGeometry.css";

const CANVAS_SIZE = 360;

interface Vector2 {
  x: number;
  y: number;
}

interface DotProductGeometryProps {
  initialA?: Vector2;
  initialB?: Vector2;
  onStateChange?: (state: Record<string, number>) => void;
}

export function DotProductGeometry({
  initialA = { x: 2.2, y: 1.4 },
  initialB = { x: 2.0, y: -0.6 },
  onStateChange,
}: DotProductGeometryProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef<"a" | "b" | null>(null);
  const [a, setA] = useState<Vector2>(initialA);
  const [b, setB] = useState<Vector2>(initialB);

  // Derived quantities. Computed up front because they feed the
  // viewport and several drawing decisions.
  const magA = Math.hypot(a.x, a.y);
  const magB = Math.hypot(b.x, b.y);
  const dot = a.x * b.x + a.y * b.y;
  const bMagSq = b.x * b.x + b.y * b.y;
  // Foot of the perpendicular from a's tip onto b's line (the "shadow"
  // endpoint). Undefined if b is the zero vector — degenerate case.
  const projScalar = bMagSq > 1e-9 ? dot / bMagSq : 0;
  const projFoot: Vector2 = {
    x: projScalar * b.x,
    y: projScalar * b.y,
  };
  const cosTheta =
    magA > 1e-9 && magB > 1e-9 ? dot / (magA * magB) : 1;
  const clampedCos = Math.max(-1, Math.min(1, cosTheta));
  const thetaRad = Math.acos(clampedCos);
  const thetaDeg = (thetaRad * 180) / Math.PI;

  const domain = useMemo(
    () =>
      computeDomain([a, b, projFoot, { x: 0, y: 0 }], {
        padding: 1.35,
        floor: 1.8,
        ceiling: 8,
      }),
    [a, b, projFoot],
  );
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

    const C_A = resolveColor("var(--widget-chart-1)");
    const C_B = resolveColor("var(--widget-chart-3)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_TEXT_DIM = resolveColor("var(--widget-text-dim)");
    const C_SUCCESS = resolveColor("var(--widget-success)");
    const C_DANGER = resolveColor("var(--widget-danger)");
    // Shadow colour is sign-coded: green when dot product is positive
    // (vectors "agree"), red when negative (vectors "disagree").
    const C_SHADOW = dot >= 0 ? C_SUCCESS : C_DANGER;
    const C_SHADOW_FILL =
      dot >= 0
        ? resolveColorAlpha("var(--widget-success)", 0.22)
        : resolveColorAlpha("var(--widget-danger)", 0.22);

    // Grid lines (one per math unit).
    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = 1;
    const pxPerUnit = W / (2 * domain);
    const unitsPerHalf = Math.ceil(domain);
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    const oPx = toPx({ x: 0, y: 0 });
    const aPx = toPx(a);
    const bPx = toPx(b);
    const projPx = toPx(projFoot);

    // b's direction line — extended through the plot so the reader sees
    // the *line* a is being projected onto, not just the b vector itself.
    if (magB > 1e-9) {
      const ext = domain * 1.5;
      const lineStart = toPx({
        x: -(b.x / magB) * ext,
        y: -(b.y / magB) * ext,
      });
      const lineEnd = toPx({
        x: (b.x / magB) * ext,
        y: (b.y / magB) * ext,
      });
      ctx.strokeStyle = resolveColorAlpha("var(--widget-chart-3)", 0.28);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(lineEnd.x, lineEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // The shadow region: a triangular fill from origin, along b's
    // direction up to the projection foot, then perpendicular up to
    // a's tip, then back along a to the origin. This visually marks
    // the |a| · cos θ × |b| product as an area-like shape.
    if (magB > 1e-9 && magA > 1e-9) {
      ctx.fillStyle = C_SHADOW_FILL;
      ctx.beginPath();
      ctx.moveTo(oPx.x, oPx.y);
      ctx.lineTo(projPx.x, projPx.y);
      ctx.lineTo(aPx.x, aPx.y);
      ctx.closePath();
      ctx.fill();
    }

    // Angle arc at the origin between a and b.
    if (magA > 1e-9 && magB > 1e-9) {
      const angA = Math.atan2(a.y, a.x);
      const angB = Math.atan2(b.y, b.x);
      const arcRadius = Math.min(38, pxPerUnit * 0.55);
      // Canvas's y is flipped; arc takes angles in canvas space.
      const cAngA = -angA;
      const cAngB = -angB;
      const start = Math.min(cAngA, cAngB);
      const end = Math.max(cAngA, cAngB);
      // Take the smaller of the two arcs.
      let s = start;
      let e = end;
      if (e - s > Math.PI) {
        s = end;
        e = start + 2 * Math.PI;
      }
      ctx.strokeStyle = resolveColorAlpha("var(--widget-text)", 0.5);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(oPx.x, oPx.y, arcRadius, s, e);
      ctx.stroke();
      // θ label at the arc's midpoint.
      const midAngle = (s + e) / 2;
      ctx.fillStyle = C_TEXT_DIM;
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${thetaDeg.toFixed(0)}°`,
        oPx.x + (arcRadius + 12) * Math.cos(midAngle),
        oPx.y + (arcRadius + 12) * Math.sin(midAngle),
      );
    }

    // Perpendicular dropdown from a's tip to its projection foot.
    if (magB > 1e-9) {
      ctx.strokeStyle = resolveColorAlpha("var(--widget-text)", 0.55);
      ctx.lineWidth = 1.3;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(aPx.x, aPx.y);
      ctx.lineTo(projPx.x, projPx.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // The shadow segment (origin → projection foot) — drawn thick + sign-
    // coloured. This IS the geometric dot product up to a factor of |b|.
    if (magB > 1e-9) {
      ctx.strokeStyle = C_SHADOW;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(oPx.x, oPx.y);
      ctx.lineTo(projPx.x, projPx.y);
      ctx.stroke();
      // Foot marker.
      ctx.fillStyle = C_SHADOW;
      ctx.beginPath();
      ctx.arc(projPx.x, projPx.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // The two main vectors.
    drawArrow(ctx, oPx, aPx, C_A, 2.6, "a");
    drawArrow(ctx, oPx, bPx, C_B, 2.6, "b");

    // Draggable tip handles.
    for (const [pt, color] of [
      [aPx, C_A] as const,
      [bPx, C_B] as const,
    ]) {
      ctx.fillStyle = color;
      ctx.strokeStyle = C_TEXT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [
    a,
    b,
    projFoot,
    dot,
    magA,
    magB,
    thetaDeg,
    domain,
    toPx,
  ]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      a_x: a.x,
      a_y: a.y,
      b_x: b.x,
      b_y: b.y,
      mag_a: magA,
      mag_b: magB,
      dot: dot,
      cos_theta: clampedCos,
      theta_deg: thetaDeg,
      proj_scalar: projScalar,
      perpendicular: Math.abs(clampedCos) < 0.05 ? 1 : 0,
      parallel: Math.abs(clampedCos - 1) < 0.05 ? 1 : 0,
      antiparallel: Math.abs(clampedCos + 1) < 0.05 ? 1 : 0,
    });
  }, [
    a,
    b,
    magA,
    magB,
    dot,
    clampedCos,
    thetaDeg,
    projScalar,
    onStateChange,
  ]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      const aPx = toPx(a);
      const bPx = toPx(b);
      const dA = Math.hypot(aPx.x - px.x, aPx.y - px.y);
      const dB = Math.hypot(bPx.x - px.x, bPx.y - px.y);
      if (dA < 16 && dA <= dB) {
        draggingRef.current = "a";
        e.currentTarget.setPointerCapture(e.pointerId);
      } else if (dB < 16) {
        draggingRef.current = "b";
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [a, b, toPx],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      const v = fromPx(px);
      if (draggingRef.current === "a") setA(v);
      else if (draggingRef.current === "b") setB(v);
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
    const sign =
      dot > 0.1 ? "aligned" : dot < -0.1 ? "opposing" : "near-perpendicular";
    return `a = (${a.x.toFixed(2)}, ${a.y.toFixed(2)}), |a| = ${magA.toFixed(2)}. b = (${b.x.toFixed(2)}, ${b.y.toFixed(2)}), |b| = ${magB.toFixed(2)}. Angle θ = ${thetaDeg.toFixed(1)}°, cos θ = ${clampedCos.toFixed(3)}. Dot product a·b = ${dot.toFixed(3)} (${sign}). The shadow of a onto b has signed length |a|·cos θ = ${(magA * clampedCos).toFixed(3)}.`;
  }, [a, b, magA, magB, thetaDeg, clampedCos, dot]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        a: [Number(a.x.toFixed(2)), Number(a.y.toFixed(2))],
        b: [Number(b.x.toFixed(2)), Number(b.y.toFixed(2))],
      }),
    [a, b],
  );

  // Sign-coded compatibility readout.
  const compatibilityClass =
    dot > 0.1
      ? "dotprod__compat--positive"
      : dot < -0.1
        ? "dotprod__compat--negative"
        : "dotprod__compat--neutral";
  const compatibilityLabel =
    dot > 0.1
      ? "aligned (a · b > 0)"
      : dot < -0.1
        ? "opposing (a · b < 0)"
        : Math.abs(clampedCos) < 0.05
          ? "perpendicular (a · b = 0)"
          : "near-perpendicular";

  return (
    <div className="dotprod">
      <div className="dotprod__layout">
        <div className="dotprod__chart-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="dotprod__canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="application"
            aria-label="Dot product geometry. Drag the tips of a and b to manipulate the vectors; the projection of a onto b's direction line is the shadow, and its signed length times |b| equals the dot product."
          />
          <div className="dotprod__hint" aria-hidden>
            Drag either tip · solid bar = projection shadow
          </div>
        </div>

        <div className="dotprod__panel">
          <div className={`dotprod__compat ${compatibilityClass}`}>
            <span className="dotprod__compat-label">Compatibility</span>
            <span className="dotprod__compat-value">{compatibilityLabel}</span>
          </div>

          <div className="dotprod__readouts">
            <ReadoutRow
              label="a · b"
              value={dot.toFixed(3)}
              accent="primary"
            />
            <ReadoutRow
              label="|a|"
              value={magA.toFixed(3)}
            />
            <ReadoutRow
              label="|b|"
              value={magB.toFixed(3)}
            />
            <ReadoutRow
              label="cos θ"
              value={clampedCos.toFixed(3)}
            />
            <ReadoutRow
              label="θ"
              value={`${thetaDeg.toFixed(1)}°`}
            />
            <ReadoutRow
              label="|a| · |b| · cos θ"
              value={(magA * magB * clampedCos).toFixed(3)}
              hint="= a · b"
            />
          </div>

          <div className="dotprod__presets">
            <button
              type="button"
              className="dotprod__preset"
              onClick={() => setB({ x: a.x, y: a.y })}
            >
              b ← a (parallel)
            </button>
            <button
              type="button"
              className="dotprod__preset"
              onClick={() => setB({ x: -a.y, y: a.x })}
            >
              b ⊥ a (90°)
            </button>
            <button
              type="button"
              className="dotprod__preset"
              onClick={() => setB({ x: -a.x, y: -a.y })}
            >
              b = −a (anti)
            </button>
            <button
              type="button"
              className="dotprod__preset"
              onClick={() => {
                setA({ x: 2.2, y: 1.4 });
                setB({ x: 2.0, y: -0.6 });
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <WidgetExplainer
        widgetName="Dot product — projection geometry"
        widgetDescription="Two vectors a and b, both draggable. The widget visualises the projection of a's tip onto b's direction line — the 'shadow' segment from the origin to the perpendicular drop-point. The shadow's signed length times |b| equals a·b, and is colour-coded green when positive (vectors aligned), red when negative (vectors opposing). The angle θ between a and b is shown as an arc at the origin."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface ReadoutRowProps {
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "default";
}

function ReadoutRow({ label, value, hint, accent = "default" }: ReadoutRowProps) {
  return (
    <div
      className={`dotprod__readout-row ${accent === "primary" ? "dotprod__readout-row--primary" : ""}`}
    >
      <span className="dotprod__readout-label">{label}</span>
      <span className="dotprod__readout-value">{value}</span>
      {hint && <span className="dotprod__readout-hint">{hint}</span>}
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
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const len = Math.hypot(dx, dy);
  if (len > 6) {
    const ang = Math.atan2(dy, dx);
    const aLen = Math.min(11, len * 0.4);
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
