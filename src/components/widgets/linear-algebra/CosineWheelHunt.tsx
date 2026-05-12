/**
 * CosineWheelHunt — find-the-angle construction puzzle.
 *
 * Used by:
 *   - linear-algebra-dot-product
 *
 * THIS IS A CONSTRUCTION PUZZLE with an open solution space. The
 * reader is given a TARGET dot-product value X. They drag two vectors
 * u and v until u · v matches X within a tolerance. Then a new X.
 *
 * The lesson the widget teaches:
 *   - Many vector configurations produce the same dot product. The
 *     dot product is a MANY-TO-ONE invariant.
 *   - For a positive target, u and v point roughly the same way; for
 *     a negative target, opposite; for zero, perpendicular.
 *   - The magnitude is also a control: a positive X = 10 can be hit
 *     with two short vectors at a small angle OR two long vectors at
 *     a large angle (just under 90°).
 *
 * The "cosine wheel" terminology in the catalogue name: the widget
 * draws a faint angle arc and the cosine-of-angle readout so the
 * reader can see how the angle and magnitudes both contribute.
 *
 * Mechanic detail:
 *   - The user-target match tolerance is ±0.4 (in dot-product units)
 *     for the first hit, narrowing to ±0.2 on subsequent rounds to
 *     reward calibration.
 *   - Drag handles on u and v tips. Both can move freely; the running
 *     u · v is displayed; a progress bar shows distance-to-target.
 *   - Six targets sequenced from easy (X = 6, both positive, lots of
 *     configurations work) to hard (X = -3.5, specific opposing
 *     pattern) to tricky (X = 0, must be perpendicular, magnitude
 *     can't help).
 *
 * Implements metaphor library §10 (constructive build-up): the reader
 * builds the dot product themselves, learning that the same scalar can
 * be assembled many ways.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./CosineWheelHunt.css";

const CANVAS_SIZE = 380;
const TOL = 0.35;

interface Vec2 {
  x: number;
  y: number;
}

interface Target {
  X: number;
  label: string;
  hint: string;
}

const TARGETS: Target[] = [
  { X: 6, label: "Reach u · v = 6", hint: "Positive: u and v should agree. Many configurations work." },
  { X: -4, label: "Reach u · v = −4", hint: "Negative: u and v point in opposing directions." },
  { X: 0, label: "Reach u · v = 0", hint: "Zero: u and v must be perpendicular — magnitude can't help here." },
  { X: 2, label: "Reach u · v = 2", hint: "Smaller positive: short vectors near-aligned, OR longer vectors at a wider angle." },
  { X: -1.5, label: "Reach u · v = −1.5", hint: "Small negative: the obtuse-but-not-fully-opposing zone." },
  { X: 3.5, label: "Reach u · v = 3.5", hint: "Mid positive: tune both the angle AND the magnitudes." },
];

interface CosineWheelHuntProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function CosineWheelHunt({ onStateChange }: CosineWheelHuntProps) {
  const { recordInteraction } = useWidgetTelemetry("CosineWheelHunt");
  const [targetIdx, setTargetIdx] = useState(0);
  const [u, setU] = useState<Vec2>({ x: 1.8, y: 0.8 });
  const [v, setV] = useState<Vec2>({ x: 1.2, y: 1.5 });
  const [hits, setHits] = useState<number>(0);
  const [hitsHistory, setHitsHistory] = useState<{ target: number; u: Vec2; v: Vec2 }[]>([]);
  const [hitThisRound, setHitThisRound] = useState<boolean>(false);
  const hitRecordedRef = useRef<boolean>(false);

  const target = TARGETS[targetIdx];
  const dot = u.x * v.x + u.y * v.y;
  const magU = Math.hypot(u.x, u.y);
  const magV = Math.hypot(v.x, v.y);
  const cosTheta = magU > 1e-6 && magV > 1e-6 ? dot / (magU * magV) : 0;
  const thetaDeg = (Math.acos(Math.max(-1, Math.min(1, cosTheta))) * 180) / Math.PI;

  const err = Math.abs(dot - target.X);
  const isMatch = err <= TOL;

  useEffect(() => {
    if (isMatch && !hitRecordedRef.current) {
      hitRecordedRef.current = true;
      setHits((h) => h + 1);
      setHitThisRound(true);
      setHitsHistory((prev) => [
        ...prev,
        { target: target.X, u: { ...u }, v: { ...v } },
      ]);
      recordInteraction("target_hit", {
        target: target.X,
        achieved: Number(dot.toFixed(3)),
        u_x: Number(u.x.toFixed(2)),
        u_y: Number(u.y.toFixed(2)),
        v_x: Number(v.x.toFixed(2)),
        v_y: Number(v.y.toFixed(2)),
        cos_theta: Number(cosTheta.toFixed(3)),
        theta_deg: Number(thetaDeg.toFixed(1)),
      });
    } else if (!isMatch && hitRecordedRef.current) {
      // Reader moved out of the match band — allow re-hit when they return.
      hitRecordedRef.current = false;
      setHitThisRound(false);
    }
  }, [isMatch, target.X, dot, u, v, cosTheta, thetaDeg, recordInteraction]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      target_idx: targetIdx + 1,
      target: target.X,
      dot: Number(dot.toFixed(3)),
      err: Number(err.toFixed(3)),
      hit: isMatch ? 1 : 0,
      hits_total: hits,
      cos_theta: Number(cosTheta.toFixed(3)),
      theta_deg: Number(thetaDeg.toFixed(1)),
      mag_u: Number(magU.toFixed(2)),
      mag_v: Number(magV.toFixed(2)),
    });
  }, [
    targetIdx,
    target.X,
    dot,
    err,
    isMatch,
    hits,
    cosTheta,
    thetaDeg,
    magU,
    magV,
    onStateChange,
  ]);

  const stateSummary = useMemo(
    () =>
      `Cosine wheel hunt — target ${targetIdx + 1}/${TARGETS.length} (X = ${target.X}). ` +
      `Current u = (${u.x.toFixed(2)}, ${u.y.toFixed(2)}), v = (${v.x.toFixed(2)}, ${v.y.toFixed(2)}). ` +
      `u · v = ${dot.toFixed(2)}; |u|=${magU.toFixed(2)}, |v|=${magV.toFixed(2)}, θ=${thetaDeg.toFixed(1)}°, cos θ=${cosTheta.toFixed(3)}. ` +
      `${isMatch ? `HIT — within ${TOL} of target.` : `Off by ${err.toFixed(2)}.`} Total hits this session: ${hits}.`,
    [targetIdx, target.X, u, v, dot, magU, magV, thetaDeg, cosTheta, isMatch, err, hits],
  );

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        target: targetIdx,
        u: [Number(u.x.toFixed(1)), Number(u.y.toFixed(1))],
        v: [Number(v.x.toFixed(1)), Number(v.y.toFixed(1))],
        hit: isMatch,
      }),
    [targetIdx, u, v, isMatch],
  );

  const handleNext = useCallback(() => {
    const next = (targetIdx + 1) % TARGETS.length;
    setTargetIdx(next);
    setHitThisRound(false);
    hitRecordedRef.current = false;
    recordInteraction("next_target", { next: next + 1 });
  }, [targetIdx, recordInteraction]);

  const handleReset = useCallback(() => {
    setTargetIdx(0);
    setU({ x: 1.8, y: 0.8 });
    setV({ x: 1.2, y: 1.5 });
    setHits(0);
    setHitsHistory([]);
    setHitThisRound(false);
    hitRecordedRef.current = false;
    recordInteraction("reset");
  }, [recordInteraction]);

  // Bar fill: 100% at zero err, 0% at err ≥ 4.
  const barPct = Math.max(0, Math.min(100, (1 - err / 4) * 100));

  return (
    <div className={`cwh${isMatch ? " cwh--hit" : ""}`}>
      <header className="cwh__head">
        <div className="cwh__heading">
          <span className="cwh__heading-label">TARGET</span>
          <span className="cwh__heading-value">
            u · v = <strong>{target.X}</strong>{" "}
            <span className="cwh__heading-dim">
              ({targetIdx + 1}/{TARGETS.length})
            </span>
          </span>
        </div>
        <div className="cwh__heading">
          <span className="cwh__heading-label">CURRENT</span>
          <span
            className={`cwh__heading-value cwh__heading-mono${isMatch ? " cwh__heading-value--ok" : ""}`}
          >
            u · v = {dot.toFixed(2)}
          </span>
        </div>
        <div className="cwh__heading">
          <span className="cwh__heading-label">HITS</span>
          <span className="cwh__heading-value">{hits}</span>
        </div>
      </header>

      <WheelCanvas
        u={u}
        v={v}
        setU={setU}
        setV={setV}
        recordInteraction={recordInteraction}
        isMatch={isMatch}
        thetaDeg={thetaDeg}
      />

      <div className="cwh__bar-wrap">
        <div className="cwh__bar-row">
          <span className="cwh__bar-label">DISTANCE TO TARGET</span>
          <span
            className={`cwh__bar-value${isMatch ? " cwh__bar-value--ok" : ""}`}
          >
            {isMatch
              ? `HIT — within ${TOL} of ${target.X}`
              : `${err.toFixed(2)} away`}
          </span>
        </div>
        <div className="cwh__bar-track">
          <div
            className={`cwh__bar-fill${isMatch ? " cwh__bar-fill--ok" : ""}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>

      <div className="cwh__readout">
        <div className="cwh__readout-cell">
          <span className="cwh__readout-label">|u|</span>
          <span className="cwh__readout-value">{magU.toFixed(2)}</span>
        </div>
        <div className="cwh__readout-cell">
          <span className="cwh__readout-label">|v|</span>
          <span className="cwh__readout-value">{magV.toFixed(2)}</span>
        </div>
        <div className="cwh__readout-cell">
          <span className="cwh__readout-label">θ</span>
          <span className="cwh__readout-value">{thetaDeg.toFixed(1)}°</span>
        </div>
        <div className="cwh__readout-cell">
          <span className="cwh__readout-label">cos θ</span>
          <span className="cwh__readout-value">{cosTheta.toFixed(3)}</span>
        </div>
        <div className="cwh__readout-cell">
          <span className="cwh__readout-label">|u|·|v|·cos θ</span>
          <span
            className={`cwh__readout-value${isMatch ? " cwh__readout-value--ok" : ""}`}
          >
            {(magU * magV * cosTheta).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="cwh__instructions">
        <strong>Hint.</strong> {target.hint} The same dot product can be
        produced many ways — short vectors at a small angle, long
        vectors at a wider angle. Try one solution, hit the target,
        then advance. Past hits are listed below so you can compare how
        the same X can be assembled differently.
      </div>

      {hitsHistory.length > 0 && (
        <div className="cwh__history">
          <span className="cwh__history-label">SOLUTIONS YOU'VE FOUND</span>
          <div className="cwh__history-list">
            {hitsHistory.slice(-6).map((h, i) => {
              const m1 = Math.hypot(h.u.x, h.u.y);
              const m2 = Math.hypot(h.v.x, h.v.y);
              const cs =
                m1 > 1e-6 && m2 > 1e-6
                  ? (h.u.x * h.v.x + h.u.y * h.v.y) / (m1 * m2)
                  : 0;
              const ang = (Math.acos(Math.max(-1, Math.min(1, cs))) * 180) / Math.PI;
              return (
                <div key={i} className="cwh__history-row">
                  <span className="cwh__history-target">u · v = {h.target}</span>
                  <span>
                    u = ({h.u.x.toFixed(1)}, {h.u.y.toFixed(1)})
                  </span>
                  <span>
                    v = ({h.v.x.toFixed(1)}, {h.v.y.toFixed(1)})
                  </span>
                  <span>θ = {ang.toFixed(0)}°</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="cwh__controls">
        <button
          type="button"
          className="cwh__btn cwh__btn--primary"
          onClick={handleNext}
          disabled={!hitThisRound}
        >
          {targetIdx === TARGETS.length - 1 ? "Loop back" : "Next target"}
        </button>
        <button type="button" className="cwh__btn" onClick={handleReset}>
          Reset
        </button>
      </div>

      <WidgetExplainer
        widgetName="Cosine wheel hunt"
        widgetDescription="A construction puzzle for the dot product. The reader is given a target value X for u · v, then drags both u and v on the canvas until the dot product matches X within ±0.35. Six targets covering positive, negative, and zero values, each chosen to surface a different geometric pattern: positive targets are reachable with u and v roughly aligned; negative with them opposing; zero requires perpendicularity. The widget continuously displays |u|, |v|, θ, cos θ, and the |u|·|v|·cos θ product alongside the algebraic u · v, so the reader can see how the same scalar emerges from very different geometric choices — short vectors at a small angle, long vectors at a wider one. A history list shows past hits so the reader can compare alternative solutions to the same target. The pedagogical centerpiece is that the dot product is many-to-one: the same number can be assembled from many configurations, and exploring that solution space directly builds intuition for which configurations land which sign and magnitude of dot product."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ─────────────────────────────────────────────────────────────

interface WheelCanvasProps {
  u: Vec2;
  v: Vec2;
  setU: (u: Vec2) => void;
  setV: (v: Vec2) => void;
  recordInteraction: (action: string, detail?: Record<string, string | number | boolean>) => void;
  isMatch: boolean;
  thetaDeg: number;
}

type DragHandle = "u" | "v" | null;

function WheelCanvas({
  u,
  v,
  setU,
  setV,
  recordInteraction,
  isMatch,
  thetaDeg,
}: WheelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState<DragHandle>(null);
  const dragLoggedRef = useRef(false);

  const domain = useMemo(
    () =>
      computeDomain([u, v, { x: 0, y: 0 }], {
        padding: 1.45,
        floor: 3.2,
        ceiling: 5,
      }),
    [u, v],
  );

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);
  const fromPx = useMemo(() => makeFromPx(CANVAS_SIZE, domain), [domain]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_U = resolveColor("var(--widget-chart-1)");
    const C_V = resolveColor("var(--widget-chart-2)");
    const C_OK = resolveColor("var(--widget-success)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_TEXT_DIM = resolveColor("var(--widget-text-dim)");

    // Grid + axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const pxPerUnit = W / (2 * domain);
    const unitsPerHalf = Math.ceil(domain);
    for (let i = -unitsPerHalf; i <= unitsPerHalf; i++) {
      const xPx = W / 2 + i * pxPerUnit;
      const yPx = H / 2 - i * pxPerUnit;
      ctx.beginPath();
      ctx.moveTo(xPx, 0);
      ctx.lineTo(xPx, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, yPx);
      ctx.lineTo(W, yPx);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    const origin = toPx({ x: 0, y: 0 });

    // Angle arc between u and v.
    const magU = Math.hypot(u.x, u.y);
    const magV = Math.hypot(v.x, v.y);
    if (magU > 0.2 && magV > 0.2) {
      const a1 = -Math.atan2(u.y, u.x); // canvas y-inverted
      const a2 = -Math.atan2(v.y, v.x);
      // Choose the smaller arc direction.
      const arcRadius = Math.min(38, Math.min(magU, magV) * pxPerUnit * 0.5);
      ctx.save();
      ctx.strokeStyle = resolveColorAlpha("var(--widget-accent)", 0.55);
      ctx.lineWidth = 1.6;
      // Determine arc direction (counter-clockwise from u to v in math terms).
      const mathA1 = Math.atan2(u.y, u.x);
      const mathA2 = Math.atan2(v.y, v.x);
      let d = mathA2 - mathA1;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      const startA = d >= 0 ? a1 : a2;
      const endA = d >= 0 ? a2 : a1;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, arcRadius, startA, endA, false);
      ctx.stroke();
      ctx.restore();
      // Angle label.
      const midAng = (mathA1 + mathA2) / 2;
      const labelR = arcRadius + 16;
      ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillStyle = resolveColor("var(--widget-accent)");
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${thetaDeg.toFixed(0)}°`,
        origin.x + labelR * Math.cos(midAng) - 6,
        origin.y - labelR * Math.sin(midAng),
      );
    }

    // Vectors.
    drawArrow(ctx, origin, toPx(u), C_U, "u", 2.6);
    drawArrow(
      ctx,
      origin,
      toPx(v),
      isMatch ? C_OK : C_V,
      "v",
      2.6,
    );

    // Handles.
    drawHandle(ctx, toPx(u), C_U);
    drawHandle(ctx, toPx(v), isMatch ? C_OK : C_V);

    // Origin.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Legend.
    ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = C_TEXT_DIM;
    ctx.fillText("Drag u and v handles to hit the target.", 10, 10);
  }, [u, v, isMatch, thetaDeg, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer handling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointerMath = (e: PointerEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      return fromPx({ x: px, y: py });
    };

    const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

    const onDown = (e: PointerEvent) => {
      const m = pointerMath(e);
      const hitR = 0.42;
      const dU = dist(m, u);
      const dV = dist(m, v);
      if (dU < hitR && dU <= dV) {
        setDragging("u");
        canvas.setPointerCapture(e.pointerId);
        dragLoggedRef.current = false;
      } else if (dV < hitR) {
        setDragging("v");
        canvas.setPointerCapture(e.pointerId);
        dragLoggedRef.current = false;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const m = pointerMath(e);
      const clamp = (n: number) =>
        Math.max(-domain + 0.1, Math.min(domain - 0.1, n));
      const vec = { x: clamp(m.x), y: clamp(m.y) };
      if (!dragLoggedRef.current) {
        recordInteraction("drag_start", { handle: dragging });
        dragLoggedRef.current = true;
      }
      if (dragging === "u") setU(vec);
      else setV(vec);
    };
    const onUp = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      setDragging(null);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, u, v, setU, setV, fromPx, domain, recordInteraction]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="cwh__canvas"
      role="img"
      aria-label="Cosine wheel hunt canvas — drag u and v to hit the target dot product."
    />
  );
}

// ─── Drawing helpers ───────────────────────────────────────────────────

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: Vec2,
  head: Vec2,
  color: string,
  label: string,
  width: number,
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
  if (len > 5) {
    const ang = Math.atan2(dy, dx);
    const aLen = Math.min(11, len * 0.3);
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
  ctx.font = "600 13px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, head.x + 8, head.y - 8);
  ctx.restore();
}

function drawHandle(
  ctx: CanvasRenderingContext2D,
  p: Vec2,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
