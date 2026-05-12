/**
 * OrthogonalityDartboard — aim-and-verify mini-game for orthogonality.
 *
 * Used by:
 *   - linear-algebra-dot-product
 *
 * THIS IS A WIN-STATE WIDGET, NOT A VISUALISATION. A reference vector r
 * is drawn at a random angle. The reader drags a "dart" vector d from
 * the origin; the widget colour-codes the angle in real time —
 *   - red when |angle − 90°| > 30°  (far from perpendicular)
 *   - yellow when 5° < |angle − 90°| ≤ 30°  (warmer)
 *   - green when |angle − 90°| ≤ 2°  (success — within 2° of perpendicular)
 *
 * On hitting green, the round is scored (1 pt) and a NEW r is spawned at
 * a fresh random angle. The reader plays through a number of rounds; the
 * score is "rounds hit / drag count", surfacing efficient aiming.
 *
 * Pedagogically: orthogonality has a geometric "feel" that algebra can't
 * deliver. Watching the dot product collapse to zero exactly when the
 * vectors form a right angle — and watching the bar swing wildly to ±
 * as you drift off — turns "perpendicular ⇔ dot product = 0" from a
 * memorised equivalence into a direct visceral fact.
 *
 * Mechanic detail:
 *   - The "dart" magnitude is held fixed (we only care about angle).
 *     This avoids the failure mode where readers shrink d to 0 to get
 *     a·b ≈ 0 trivially. Magnitude is locked at the round's start.
 *   - "Perpendicular" is detected by |cos θ| < cos(88°) ≈ 0.035, which
 *     is ~2° tolerance from 90° in either direction.
 *
 * Implements metaphor library §9 (counter-example / regime explorer)
 * fused with a fresh aim-and-verify game loop.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./OrthogonalityDartboard.css";

const CANVAS_SIZE = 360;
const GREEN_TOL_DEG = 2;
const YELLOW_TOL_DEG = 30;
const DART_MAG = 2.4;
const REF_MAG = 2.4;

interface Vec2 {
  x: number;
  y: number;
}

function rotateUnit(theta: number, mag: number): Vec2 {
  return { x: mag * Math.cos(theta), y: mag * Math.sin(theta) };
}

function angleBetween(u: Vec2, v: Vec2): number {
  // Returns radian angle in [0, π].
  const mu = Math.hypot(u.x, u.y);
  const mv = Math.hypot(v.x, v.y);
  if (mu < 1e-9 || mv < 1e-9) return 0;
  const c = Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y) / (mu * mv)));
  return Math.acos(c);
}

type Verdict = "red" | "yellow" | "green";

function classify(deltaDeg: number): Verdict {
  const a = Math.abs(deltaDeg);
  if (a <= GREEN_TOL_DEG) return "green";
  if (a <= YELLOW_TOL_DEG) return "yellow";
  return "red";
}

interface OrthogonalityDartboardProps {
  /** Override the RNG seed for deterministic testing. */
  seed?: number;
  onStateChange?: (state: Record<string, number>) => void;
}

export function OrthogonalityDartboard({
  seed,
  onStateChange,
}: OrthogonalityDartboardProps) {
  const { recordInteraction } = useWidgetTelemetry("OrthogonalityDartboard");

  // Reference vector — fixed per round. Start with a non-axis-aligned r so
  // the reader can't reach perpendicular by hugging the x-axis.
  const initialRefTheta = useMemo(() => {
    if (seed !== undefined) return (seed % 360) * (Math.PI / 180);
    return Math.PI / 4; // 45° on first load — deterministic for SSR.
  }, [seed]);

  const [refTheta, setRefTheta] = useState<number>(initialRefTheta);
  // Dart starts off the reference by ~50° so it's visibly NOT perpendicular.
  const [dartTheta, setDartTheta] = useState<number>(
    initialRefTheta + (50 * Math.PI) / 180,
  );

  // Game state.
  const [round, setRound] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [dragCount, setDragCount] = useState<number>(0);
  const [roundHit, setRoundHit] = useState<boolean>(false);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  const r: Vec2 = useMemo(() => rotateUnit(refTheta, REF_MAG), [refTheta]);
  const d: Vec2 = useMemo(() => rotateUnit(dartTheta, DART_MAG), [dartTheta]);

  // Angle BETWEEN r and d, mapped to "delta from 90°". delta in (-90, 90].
  const thetaRad = angleBetween(r, d);
  const thetaDeg = (thetaRad * 180) / Math.PI;
  const deltaDeg = thetaDeg - 90; // signed: > 0 means past perpendicular.
  const verdict: Verdict = classify(deltaDeg);
  const dotProduct = r.x * d.x + r.y * d.y;

  // When green is reached, the round scores. Use a ref to avoid the score
  // jumping multiple times if the reader hovers in the green band.
  const scoredThisRoundRef = useRef<boolean>(false);

  useEffect(() => {
    if (verdict === "green" && !scoredThisRoundRef.current) {
      scoredThisRoundRef.current = true;
      setScore((s) => s + 1);
      setRoundHit(true);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      recordInteraction("round_hit", {
        round,
        drag_count: dragCount,
        ref_theta_deg: Number(((refTheta * 180) / Math.PI).toFixed(1)),
      });
    }
  }, [verdict, round, dragCount, refTheta, recordInteraction]);

  // ── State surfaced to a GoalChain or explainer ──────────────────────
  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      round,
      score,
      drag_count: dragCount,
      dot_product: Number(dotProduct.toFixed(3)),
      angle_deg: Number(thetaDeg.toFixed(2)),
      delta_deg: Number(deltaDeg.toFixed(2)),
      verdict: verdict === "green" ? 2 : verdict === "yellow" ? 1 : 0,
      streak,
      best_streak: bestStreak,
      hit: roundHit ? 1 : 0,
    });
  }, [
    round,
    score,
    dragCount,
    dotProduct,
    thetaDeg,
    deltaDeg,
    verdict,
    streak,
    bestStreak,
    roundHit,
    onStateChange,
  ]);

  const stateSummary = useMemo(() => {
    const refDeg = ((refTheta * 180) / Math.PI).toFixed(1);
    const dartDeg = ((dartTheta * 180) / Math.PI).toFixed(1);
    return (
      `Round ${round}, score ${score}, drag-count ${dragCount}, current streak ${streak}. ` +
      `Reference r is at ${refDeg}° (in math convention, measured from +x). ` +
      `Dart d is at ${dartDeg}°. ` +
      `Angle between r and d = ${thetaDeg.toFixed(1)}° (delta from 90° = ${deltaDeg.toFixed(1)}°). ` +
      `Dot product r·d = ${dotProduct.toFixed(3)}. ` +
      `Verdict: ${verdict === "green" ? "PERPENDICULAR ✓ (within 2°)" : verdict === "yellow" ? "warmer (within 30° of perpendicular)" : "cold (more than 30° off perpendicular)"}.`
    );
  }, [
    refTheta,
    dartTheta,
    round,
    score,
    dragCount,
    streak,
    thetaDeg,
    deltaDeg,
    dotProduct,
    verdict,
  ]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        round,
        verdict,
        delta_bucket: Math.round(deltaDeg / 5),
      }),
    [round, verdict, deltaDeg],
  );

  // ── Drag handling ────────────────────────────────────────────────────
  const handleDartDrag = useCallback(
    (math: Vec2) => {
      const mag = Math.hypot(math.x, math.y);
      if (mag < 0.3) return; // ignore near-origin drags (we lock magnitude)
      setDartTheta(Math.atan2(math.y, math.x));
    },
    [],
  );

  const recordDragOnce = useCallback(() => {
    setDragCount((c) => c + 1);
    recordInteraction("drag");
  }, [recordInteraction]);

  // ── Next round / reset ───────────────────────────────────────────────
  const handleNextRound = useCallback(() => {
    // Pick a new reference angle that differs from current by > 30° so the
    // reader doesn't immediately solve it from the previous dart position.
    let next: number;
    let safety = 0;
    do {
      next = Math.random() * 2 * Math.PI;
      safety++;
    } while (
      Math.abs(((next - refTheta + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) <
        (30 * Math.PI) / 180 &&
      safety < 20
    );
    setRefTheta(next);
    // Place dart deliberately NOT perpendicular so the reader has to work.
    setDartTheta(next + (40 * Math.PI) / 180);
    setRound((rd) => rd + 1);
    setDragCount(0);
    setRoundHit(false);
    scoredThisRoundRef.current = false;
    recordInteraction("next_round");
  }, [refTheta, recordInteraction]);

  const handleResetGame = useCallback(() => {
    setRound(1);
    setScore(0);
    setDragCount(0);
    setRoundHit(false);
    setStreak(0);
    setBestStreak(0);
    setRefTheta(initialRefTheta);
    setDartTheta(initialRefTheta + (50 * Math.PI) / 180);
    scoredThisRoundRef.current = false;
    recordInteraction("reset_game");
  }, [initialRefTheta, recordInteraction]);

  return (
    <div className={`odb odb--${verdict}${roundHit ? " odb--hit" : ""}`}>
      <header className="odb__head">
        <div className="odb__heading">
          <span className="odb__heading-label">ROUND</span>
          <span className="odb__heading-value">{round}</span>
        </div>
        <div className="odb__heading">
          <span className="odb__heading-label">SCORE</span>
          <span className="odb__heading-value">
            {score}
            <span className="odb__heading-dim"> hit{score === 1 ? "" : "s"}</span>
          </span>
        </div>
        <div className="odb__heading">
          <span className="odb__heading-label">DRAGS</span>
          <span className="odb__heading-value">{dragCount}</span>
        </div>
        <div className="odb__heading">
          <span className="odb__heading-label">STREAK</span>
          <span className="odb__heading-value">
            {streak}
            <span className="odb__heading-dim"> · best {bestStreak}</span>
          </span>
        </div>
      </header>

      <DartCanvas
        r={r}
        d={d}
        verdict={verdict}
        onDartDrag={handleDartDrag}
        recordDragOnce={recordDragOnce}
      />

      <div className="odb__readout">
        <div className="odb__readout-cell">
          <span className="odb__readout-label">ANGLE r↔d</span>
          <span className="odb__readout-value">{thetaDeg.toFixed(1)}°</span>
        </div>
        <div className="odb__readout-cell">
          <span className="odb__readout-label">DELTA FROM 90°</span>
          <span className={`odb__readout-value odb__readout-value--${verdict}`}>
            {deltaDeg >= 0 ? "+" : ""}
            {deltaDeg.toFixed(1)}°
          </span>
        </div>
        <div className="odb__readout-cell">
          <span className="odb__readout-label">r · d</span>
          <span className={`odb__readout-value odb__readout-value--${verdict}`}>
            {dotProduct.toFixed(3)}
          </span>
        </div>
      </div>

      <DotProductBar value={dotProduct} maxAbs={REF_MAG * DART_MAG} verdict={verdict} />

      <div
        className={`odb__verdict odb__verdict--${verdict}${
          roundHit ? " odb__verdict--hit" : ""
        }`}
      >
        <span className="odb__verdict-label">
          {verdict === "green"
            ? roundHit
              ? "Hit ✓"
              : "Perpendicular"
            : verdict === "yellow"
              ? "Warmer"
              : "Cold"}
        </span>
        <span className="odb__verdict-value">
          {verdict === "green"
            ? `r and d are within ${GREEN_TOL_DEG}° of perpendicular. r · d = ${dotProduct.toFixed(3)} (essentially zero).`
            : verdict === "yellow"
              ? `${Math.abs(deltaDeg).toFixed(1)}° off perpendicular. Drag the dart to swing the dot product closer to zero.`
              : `${Math.abs(deltaDeg).toFixed(1)}° off perpendicular. Aim the dart so it forms a right angle with r — watch r · d swing toward zero.`}
        </span>
      </div>

      <div className="odb__controls">
        <button
          type="button"
          className="odb__btn odb__btn--primary"
          onClick={handleNextRound}
          disabled={!roundHit}
        >
          Next round →
        </button>
        <button type="button" className="odb__btn" onClick={handleResetGame}>
          Reset game
        </button>
      </div>

      <WidgetExplainer
        widgetName="Orthogonality dartboard"
        widgetDescription="An aim-and-verify mini-game for orthogonality. A reference vector r is fixed at a random angle each round. The reader drags a 'dart' vector d (magnitude locked, only angle changes) until r and d are perpendicular. The widget colour-codes the angle in real time: red when more than 30° off perpendicular, yellow within 30°, green within 2°. The dot product r·d updates continuously and approaches zero as the dart approaches perpendicular — making 'perpendicular ⇔ dot product = 0' a directly-felt fact rather than a memorised equivalence. On a green hit, the round scores and the next round spawns a new reference angle. Score = rounds hit; drag count surfaces efficient aiming; streak tracks consecutive perpendicular finds. The pedagogical goal is to give the reader a visceral feel for orthogonality: watching the bar swing past zero, overshoot, and swing back trains the same eye-hand coordination engineers use when sketching projections by hand."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ─────────────────────────────────────────────────────────────

interface DartCanvasProps {
  r: Vec2;
  d: Vec2;
  verdict: Verdict;
  onDartDrag: (math: Vec2) => void;
  recordDragOnce: () => void;
}

function DartCanvas({
  r,
  d,
  verdict,
  onDartDrag,
  recordDragOnce,
}: DartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRecordedRef = useRef(false);

  const domain = useMemo(
    () => computeDomain([r, d], { padding: 1.45, floor: 3.2, ceiling: 5 }),
    [r, d],
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

    const verdictColor =
      verdict === "green"
        ? resolveColor("var(--widget-success)")
        : verdict === "yellow"
          ? resolveColor("var(--widget-warn)")
          : resolveColor("var(--widget-danger)");
    const C_REF = resolveColor("var(--widget-chart-3)");
    const C_DART = verdictColor;
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_TEXT_DIM = resolveColor("var(--widget-text-dim)");

    // Grid + axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
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

    // Draw the "perpendicular target zone" — a faint arc indicating where d
    // would need to be to count as a hit. Centred on the perpendicular
    // direction to r.
    const refAngle = Math.atan2(r.y, r.x);
    const perp1 = refAngle + Math.PI / 2;
    const perp2 = refAngle - Math.PI / 2;
    const ringRadius = pxPerUnit * DART_MAG;
    const greenHalfArc = (GREEN_TOL_DEG * Math.PI) / 180;
    const yellowHalfArc = (YELLOW_TOL_DEG * Math.PI) / 180;

    // Outer (yellow) ring band.
    ctx.fillStyle = resolveColorAlpha("var(--widget-warn)", 0.07);
    drawArcRing(
      ctx,
      origin,
      ringRadius - 3,
      ringRadius + 3,
      perp1 - yellowHalfArc,
      perp1 + yellowHalfArc,
    );
    drawArcRing(
      ctx,
      origin,
      ringRadius - 3,
      ringRadius + 3,
      perp2 - yellowHalfArc,
      perp2 + yellowHalfArc,
    );
    // Inner (green) target band.
    ctx.fillStyle = resolveColorAlpha("var(--widget-success)", 0.32);
    drawArcRing(
      ctx,
      origin,
      ringRadius - 3,
      ringRadius + 3,
      perp1 - greenHalfArc,
      perp1 + greenHalfArc,
    );
    drawArcRing(
      ctx,
      origin,
      ringRadius - 3,
      ringRadius + 3,
      perp2 - greenHalfArc,
      perp2 + greenHalfArc,
    );

    // Reference vector r and its perpendicular line (dashed, faint).
    drawArrow(ctx, origin, toPx(r), C_REF, "r", 2.6);
    const perpEndA = toPx({
      x: REF_MAG * 1.4 * Math.cos(perp1),
      y: REF_MAG * 1.4 * Math.sin(perp1),
    });
    const perpEndB = toPx({
      x: REF_MAG * 1.4 * Math.cos(perp2),
      y: REF_MAG * 1.4 * Math.sin(perp2),
    });
    ctx.save();
    ctx.strokeStyle = resolveColorAlpha("var(--widget-chart-3)", 0.32);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(perpEndA.x, perpEndA.y);
    ctx.lineTo(perpEndB.x, perpEndB.y);
    ctx.stroke();
    ctx.restore();

    // Dart vector d.
    drawArrow(ctx, origin, toPx(d), C_DART, "d", 2.8);
    // Dart handle for drag affordance.
    const dPx = toPx(d);
    ctx.fillStyle = C_DART;
    ctx.beginPath();
    ctx.arc(dPx.x, dPx.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Right-angle indicator if green.
    if (verdict === "green") {
      const sideLen = 18;
      const rUnit = { x: r.x / Math.hypot(r.x, r.y), y: r.y / Math.hypot(r.x, r.y) };
      const dUnit = { x: d.x / Math.hypot(d.x, d.y), y: d.y / Math.hypot(d.x, d.y) };
      const c1 = {
        x: origin.x + rUnit.x * sideLen,
        y: origin.y - rUnit.y * sideLen,
      };
      const c2 = {
        x: origin.x + dUnit.x * sideLen,
        y: origin.y - dUnit.y * sideLen,
      };
      const corner = {
        x: c1.x + (c2.x - origin.x),
        y: c1.y + (c2.y - origin.y),
      };
      ctx.save();
      ctx.strokeStyle = C_DART;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(corner.x, corner.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.stroke();
      ctx.restore();
    }

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Legend.
    ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = C_TEXT_DIM;
    ctx.fillText("Drag the green handle (d). Magnitude is locked.", 10, 10);
    ctx.fillStyle = C_REF;
    ctx.fillText("r — reference (fixed this round)", 10, 26);
  }, [r, d, verdict, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer interaction — only drags the dart vector. Magnitude locked.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointerMath = (e: PointerEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      return fromPx({ x: px, y: py });
    };

    const onDown = (e: PointerEvent) => {
      const m = pointerMath(e);
      // Hit-test against the dart handle (allow any click on the canvas to
      // start dragging — the reader's intent is unambiguous).
      const distToDart = Math.hypot(m.x - d.x, m.y - d.y);
      const closeToHandle = distToDart < 0.6;
      const insideCanvas =
        Math.abs(m.x) < domain && Math.abs(m.y) < domain;
      if (closeToHandle || insideCanvas) {
        setDragging(true);
        dragRecordedRef.current = false;
        canvas.setPointerCapture(e.pointerId);
        onDartDrag(m);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const m = pointerMath(e);
      if (!dragRecordedRef.current) {
        recordDragOnce();
        dragRecordedRef.current = true;
      }
      onDartDrag(m);
    };
    const onUp = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      setDragging(false);
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
  }, [dragging, d.x, d.y, fromPx, domain, onDartDrag, recordDragOnce]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="odb__canvas"
      role="img"
      aria-label="Orthogonality dartboard — drag the dart to make it perpendicular to r."
    />
  );
}

interface DotProductBarProps {
  value: number;
  maxAbs: number;
  verdict: Verdict;
}

function DotProductBar({ value, maxAbs, verdict }: DotProductBarProps) {
  const clamped = Math.max(-maxAbs, Math.min(maxAbs, value));
  const halfPct = 48; // each side fills up to ~48% of the bar.
  const fillPct = (Math.abs(clamped) / maxAbs) * halfPct;
  const positive = clamped >= 0;
  return (
    <div className={`odb__bar odb__bar--${verdict}`}>
      <span className="odb__bar-label">r · d</span>
      <div className="odb__bar-track">
        <div className="odb__bar-zero" />
        <div
          className={`odb__bar-fill odb__bar-fill--${positive ? "pos" : "neg"} odb__bar-fill--${verdict}`}
          style={{ width: `${fillPct}%` }}
        />
        <div className="odb__bar-value">{value.toFixed(2)}</div>
      </div>
    </div>
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

function drawArcRing(
  ctx: CanvasRenderingContext2D,
  centre: Vec2,
  innerR: number,
  outerR: number,
  startAng: number,
  endAng: number,
) {
  // Note: canvas y-axis is inverted vs math. We negate angles for drawing.
  const s = -endAng;
  const e = -startAng;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, outerR, s, e);
  ctx.arc(centre.x, centre.y, innerR, e, s, true);
  ctx.closePath();
  ctx.fill();
}
