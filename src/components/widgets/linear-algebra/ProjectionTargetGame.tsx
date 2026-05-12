/**
 * ProjectionTargetGame — predict-then-verify by clicking the foot.
 *
 * Used by:
 *   - linear-algebra-dot-product
 *
 * THIS IS A SPATIAL-PREDICTION QUIZ. Two vectors a and b are drawn on
 * the plane sharing an origin. The reader is asked: where will the foot
 * of the perpendicular from a's tip onto b's line land? They click a
 * single position ON b's infinite line; the widget snaps the click to
 * the line, then reveals the actual foot and scores by distance.
 *
 * The whole point is that projection is a GEOMETRIC operation the reader
 * should be able to see, not just compute. The widget makes "drop a
 * perpendicular from a's tip onto b's line" something the reader has to
 * DO — eyeballing where the foot lands trains the same intuition that
 * makes Gram-Schmidt, least squares, and SVD legible later.
 *
 * Scoring (per round):
 *   - "exact" if click is within 0.2 units of the true foot
 *   - "close" if within 0.6 units
 *   - "off" otherwise
 * Exact awards 3 pts, close 1, off 0. Track total across rounds.
 *
 * Mechanic detail:
 *   - The reader's click is snapped to b's infinite line so they can
 *     never be "off the line." Their job is to place the foot
 *     correctly along the line, not to find the line.
 *   - When b is near zero, the round is degenerate; the widget locks and
 *     prompts "Next round" — projection onto a zero vector is undefined.
 *   - On reveal, the widget draws the true foot (green dot), the reader's
 *     prediction (yellow dot), and the perpendicular drop (dashed).
 *
 * Implements metaphor library §2 (projection / shadow) as a quiz rather
 * than a passive visualisation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./ProjectionTargetGame.css";

const CANVAS_SIZE = 360;
const EXACT_TOL = 0.2;
const CLOSE_TOL = 0.6;

interface Vec2 {
  x: number;
  y: number;
}

interface Round {
  a: Vec2;
  b: Vec2;
  label: string;
}

const ROUNDS: Round[] = [
  // Carefully picked so the foot is at varied positions: inside b, beyond b's
  // tip, behind the origin (negative scalar), etc.
  { label: "Round 1 — foot lies inside b", a: { x: 1.6, y: 2.3 }, b: { x: 3, y: 0.5 } },
  { label: "Round 2 — foot lies beyond b's tip", a: { x: 3.5, y: 2.1 }, b: { x: 2, y: 0 } },
  { label: "Round 3 — foot is behind the origin (negative scalar)", a: { x: -2, y: 1.3 }, b: { x: 3, y: 1 } },
  { label: "Round 4 — a is almost perpendicular to b", a: { x: -0.5, y: 2.4 }, b: { x: 2.5, y: 0.3 } },
  { label: "Round 5 — a and b nearly aligned", a: { x: 2.2, y: 0.6 }, b: { x: 3, y: 1 } },
  { label: "Round 6 — diagonal b", a: { x: 0.5, y: 3.0 }, b: { x: 2.4, y: 2.4 } },
];

interface RoundResult {
  /** Distance from clicked-on-line to true foot, in math units. */
  err: number;
  /** Bucketed verdict. */
  verdict: "exact" | "close" | "off";
  /** Reader's clicked-and-snapped point. */
  clickFoot: Vec2;
  /** Scalar coefficient the reader's click corresponds to. */
  predScalar: number;
  /** True foot's scalar coefficient (proj_b(a)). */
  trueScalar: number;
}

function projFoot(a: Vec2, b: Vec2): { foot: Vec2; scalar: number } {
  const bb = b.x * b.x + b.y * b.y;
  if (bb < 1e-9) return { foot: { x: 0, y: 0 }, scalar: 0 };
  const s = (a.x * b.x + a.y * b.y) / bb;
  return { foot: { x: s * b.x, y: s * b.y }, scalar: s };
}

function snapToLine(p: Vec2, b: Vec2): { snapped: Vec2; scalar: number } {
  // Project p onto the line through the origin in direction b.
  const { foot, scalar } = projFoot(p, b);
  return { snapped: foot, scalar };
}

function classify(err: number): "exact" | "close" | "off" {
  if (err <= EXACT_TOL) return "exact";
  if (err <= CLOSE_TOL) return "close";
  return "off";
}

interface ProjectionTargetGameProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function ProjectionTargetGame({
  onStateChange,
}: ProjectionTargetGameProps) {
  const { recordInteraction } = useWidgetTelemetry("ProjectionTargetGame");
  const [roundIdx, setRoundIdx] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ exact: 0, close: 0, off: 0, total: 0 });

  const round = ROUNDS[roundIdx];
  const { foot: trueFoot, scalar: trueScalar } = useMemo(
    () => projFoot(round.a, round.b),
    [round.a, round.b],
  );

  const handleClickOnLine = useCallback(
    (math: Vec2) => {
      if (revealed) return;
      const { snapped, scalar } = snapToLine(math, round.b);
      const err = Math.hypot(snapped.x - trueFoot.x, snapped.y - trueFoot.y);
      const verdict = classify(err);
      const newResult: RoundResult = {
        err,
        verdict,
        clickFoot: snapped,
        predScalar: scalar,
        trueScalar,
      };
      setResult(newResult);
      setRevealed(true);
      setScore((prev) => {
        const points = verdict === "exact" ? 3 : verdict === "close" ? 1 : 0;
        return {
          exact: prev.exact + (verdict === "exact" ? 1 : 0),
          close: prev.close + (verdict === "close" ? 1 : 0),
          off: prev.off + (verdict === "off" ? 1 : 0),
          total: prev.total + points,
        };
      });
      recordInteraction("click_predict", {
        round: roundIdx + 1,
        err: Number(err.toFixed(3)),
        verdict,
        pred_scalar: Number(scalar.toFixed(3)),
        true_scalar: Number(trueScalar.toFixed(3)),
      });
    },
    [revealed, round.b, trueFoot, trueScalar, roundIdx, recordInteraction],
  );

  const handleNextRound = useCallback(() => {
    const next = (roundIdx + 1) % ROUNDS.length;
    setRoundIdx(next);
    setResult(null);
    setRevealed(false);
    recordInteraction("next_round", { next_round: next + 1 });
  }, [roundIdx, recordInteraction]);

  const handleResetGame = useCallback(() => {
    setRoundIdx(0);
    setResult(null);
    setRevealed(false);
    setScore({ exact: 0, close: 0, off: 0, total: 0 });
    recordInteraction("reset_game");
  }, [recordInteraction]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      round: roundIdx + 1,
      score: score.total,
      exact: score.exact,
      close: score.close,
      off: score.off,
      revealed: revealed ? 1 : 0,
      err: result ? Number(result.err.toFixed(3)) : -1,
      true_scalar: Number(trueScalar.toFixed(3)),
      pred_scalar: result ? Number(result.predScalar.toFixed(3)) : 0,
    });
  }, [roundIdx, score, revealed, result, trueScalar, onStateChange]);

  const stateSummary = useMemo(() => {
    const aStr = `a = (${round.a.x.toFixed(1)}, ${round.a.y.toFixed(1)})`;
    const bStr = `b = (${round.b.x.toFixed(1)}, ${round.b.y.toFixed(1)})`;
    const status = revealed
      ? result
        ? `Reader clicked at scalar t=${result.predScalar.toFixed(2)} (giving foot (${result.clickFoot.x.toFixed(2)}, ${result.clickFoot.y.toFixed(2)})). True foot is at scalar t=${trueScalar.toFixed(2)}, giving (${trueFoot.x.toFixed(2)}, ${trueFoot.y.toFixed(2)}). Error: ${result.err.toFixed(2)} units → verdict "${result.verdict}".`
        : "Round revealed but no click recorded."
      : "Reader has not clicked yet — round is open.";
    return `Projection target game, round ${roundIdx + 1}/${ROUNDS.length}, score ${score.total} (${score.exact} exact, ${score.close} close, ${score.off} off). ${aStr}; ${bStr}. ${status}`;
  }, [round, revealed, result, trueScalar, trueFoot, roundIdx, score]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        round: roundIdx,
        revealed,
        verdict: result?.verdict,
      }),
    [roundIdx, revealed, result?.verdict],
  );

  return (
    <div
      className={`ptg${revealed && result ? ` ptg--${result.verdict}` : ""}`}
    >
      <header className="ptg__head">
        <div className="ptg__heading">
          <span className="ptg__heading-label">ROUND</span>
          <span className="ptg__heading-value">
            {roundIdx + 1} / {ROUNDS.length}
          </span>
        </div>
        <div className="ptg__heading">
          <span className="ptg__heading-label">SCORE</span>
          <span className="ptg__heading-value">
            {score.total} pts
            <span className="ptg__heading-dim">
              {" "}
              · {score.exact} exact · {score.close} close
            </span>
          </span>
        </div>
        <div className="ptg__heading">
          <span className="ptg__heading-label">PROMPT</span>
          <span className="ptg__heading-value">{round.label}</span>
        </div>
      </header>

      <ProjectionCanvas
        a={round.a}
        b={round.b}
        trueFoot={trueFoot}
        revealed={revealed}
        clickFoot={result?.clickFoot ?? null}
        verdict={result?.verdict ?? null}
        onClickOnLine={handleClickOnLine}
      />

      <div className="ptg__instructions">
        <strong>How to play.</strong> Two vectors are drawn from the origin —{" "}
        <span className="ptg__legend ptg__legend--a">a</span> and{" "}
        <span className="ptg__legend ptg__legend--b">b</span>. Picture
        dropping a perpendicular from <em>a's tip</em> straight down onto
        the line through <em>b</em>. Where do you think the foot lands?
        Click on that position on b's line. Your click snaps to the line,
        then the widget reveals where the foot actually is.
      </div>

      {revealed && result && (
        <div className={`ptg__verdict ptg__verdict--${result.verdict}`}>
          <span className="ptg__verdict-label">
            {result.verdict === "exact"
              ? "Exact ✓ +3 pts"
              : result.verdict === "close"
                ? "Close +1 pt"
                : "Off"}
          </span>
          <span className="ptg__verdict-value">
            Error: <strong>{result.err.toFixed(2)}</strong> units.
            You predicted scalar t = <strong>{result.predScalar.toFixed(2)}</strong>;
            the true projection scalar is{" "}
            <strong>{trueScalar.toFixed(2)}</strong>. The foot is at{" "}
            <strong>
              ({trueFoot.x.toFixed(2)}, {trueFoot.y.toFixed(2)})
            </strong>
            .
            {trueScalar < 0 &&
              " Note: the scalar is NEGATIVE — the foot landed on the OPPOSITE side of the origin from b. Acute angle between a and b > 90°."}
            {trueScalar > 1 &&
              " Note: the scalar is GREATER than 1 — the foot extends BEYOND b's tip along the same line."}
          </span>
        </div>
      )}

      <div className="ptg__controls">
        <button
          type="button"
          className="ptg__btn ptg__btn--primary"
          onClick={handleNextRound}
          disabled={!revealed}
        >
          {roundIdx === ROUNDS.length - 1 ? "Loop back to round 1 →" : "Next round →"}
        </button>
        <button type="button" className="ptg__btn" onClick={handleResetGame}>
          Reset game
        </button>
      </div>

      <WidgetExplainer
        widgetName="Projection target game — click the foot"
        widgetDescription="A predict-then-verify spatial quiz for vector projection. Two vectors a and b are drawn from a shared origin on a grid. The reader is asked to predict — by clicking a position — where the foot of the perpendicular from a's tip onto b's line will land. The reader's click is automatically snapped to b's infinite line (so they cannot be 'off the line' — their job is only to place the foot along the line). On click, the widget reveals the true foot (green dot), the reader's prediction (yellow), the perpendicular drop from a's tip to the foot (dashed), and scores by distance: exact (≤0.2u, 3 pts), close (≤0.6u, 1 pt), off (otherwise, 0 pts). Six varied built-in rounds exercise the failure modes: the foot can land INSIDE b (scalar in (0,1)), BEYOND b's tip (scalar > 1), or BEHIND the origin (scalar < 0 when angle is obtuse). The pedagogical goal is to make projection a geometric operation the reader can SEE — eyeballing where the foot lands trains the same intuition that underlies Gram-Schmidt, least squares, and SVD downstream."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ─────────────────────────────────────────────────────────────

interface ProjectionCanvasProps {
  a: Vec2;
  b: Vec2;
  trueFoot: Vec2;
  revealed: boolean;
  clickFoot: Vec2 | null;
  verdict: "exact" | "close" | "off" | null;
  onClickOnLine: (math: Vec2) => void;
}

function ProjectionCanvas({
  a,
  b,
  trueFoot,
  revealed,
  clickFoot,
  verdict,
  onClickOnLine,
}: ProjectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverMath, setHoverMath] = useState<Vec2 | null>(null);

  const domain = useMemo(
    () =>
      computeDomain([a, b, trueFoot, { x: 0, y: 0 }], {
        padding: 1.5,
        floor: 3.5,
        ceiling: 6,
      }),
    [a, b, trueFoot],
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

    const C_A = resolveColor("var(--widget-chart-1)");
    const C_B = resolveColor("var(--widget-chart-2)");
    const C_TRUE = resolveColor("var(--widget-success)");
    const C_PRED = resolveColor("var(--widget-warn)");
    const C_LINE = resolveColorAlpha("var(--widget-chart-2)", 0.45);
    const C_HOVER = resolveColorAlpha("var(--widget-warn)", 0.55);
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

    // b's infinite line — extended generously in both directions.
    const bMag = Math.hypot(b.x, b.y);
    if (bMag > 1e-6) {
      const ext = domain * 1.5;
      const bUnit = { x: b.x / bMag, y: b.y / bMag };
      const startMath = { x: -ext * bUnit.x, y: -ext * bUnit.y };
      const endMath = { x: ext * bUnit.x, y: ext * bUnit.y };
      const startPx = toPx(startMath);
      const endPx = toPx(endMath);
      ctx.save();
      ctx.strokeStyle = C_LINE;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(startPx.x, startPx.y);
      ctx.lineTo(endPx.x, endPx.y);
      ctx.stroke();
      ctx.restore();
    }

    // Vectors a and b.
    drawArrow(ctx, origin, toPx(a), C_A, "a", 2.6);
    drawArrow(ctx, origin, toPx(b), C_B, "b", 2.6);

    // Hover preview — snap hover to b's line and show a faint dot + drop.
    if (!revealed && hoverMath && bMag > 1e-6) {
      const { snapped: hoverFoot } = snapToLine(hoverMath, b);
      const hPx = toPx(hoverFoot);
      ctx.save();
      ctx.fillStyle = C_HOVER;
      ctx.beginPath();
      ctx.arc(hPx.x, hPx.y, 5, 0, Math.PI * 2);
      ctx.fill();
      // Dashed perpendicular drop from a to the hover foot.
      ctx.strokeStyle = C_HOVER;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(toPx(a).x, toPx(a).y);
      ctx.lineTo(hPx.x, hPx.y);
      ctx.stroke();
      ctx.restore();
    }

    if (revealed) {
      // True foot — big green dot + perpendicular drop from a.
      const tfPx = toPx(trueFoot);
      ctx.save();
      ctx.strokeStyle = C_TRUE;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(toPx(a).x, toPx(a).y);
      ctx.lineTo(tfPx.x, tfPx.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C_TRUE;
      ctx.beginPath();
      ctx.arc(tfPx.x, tfPx.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Right-angle indicator at the foot.
      drawRightAngle(ctx, tfPx, toPx(a), origin, C_TRUE);

      // Reader's prediction dot.
      if (clickFoot) {
        const cfPx = toPx(clickFoot);
        ctx.save();
        ctx.fillStyle = C_PRED;
        ctx.beginPath();
        ctx.arc(cfPx.x, cfPx.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Error segment between predicted and true.
        ctx.strokeStyle =
          verdict === "exact"
            ? C_TRUE
            : verdict === "close"
              ? C_PRED
              : resolveColor("var(--widget-danger)");
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cfPx.x, cfPx.y);
        ctx.lineTo(tfPx.x, tfPx.y);
        ctx.stroke();
        ctx.restore();
      }
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
    ctx.fillText(
      revealed
        ? "Reveal — green = true foot · yellow = your click"
        : "Click anywhere — your click snaps to b's line",
      10,
      10,
    );
  }, [a, b, trueFoot, revealed, clickFoot, verdict, hoverMath, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer handling — click-to-predict and hover preview.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointerMath = (e: PointerEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      return fromPx({ x: px, y: py });
    };

    const onMove = (e: PointerEvent) => {
      if (revealed) {
        setHoverMath(null);
        return;
      }
      setHoverMath(pointerMath(e));
    };
    const onLeave = () => setHoverMath(null);
    const onClick = (e: PointerEvent) => {
      if (revealed) return;
      const m = pointerMath(e);
      onClickOnLine(m);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onClick);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onClick);
    };
  }, [revealed, fromPx, onClickOnLine]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="ptg__canvas"
      role="img"
      aria-label="Projection target canvas — click to predict where the foot lands."
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

function drawRightAngle(
  ctx: CanvasRenderingContext2D,
  foot: Vec2,
  aTip: Vec2,
  origin: Vec2,
  color: string,
) {
  // Build two unit vectors at the foot: one along the b-line (back toward
  // origin), one toward a's tip. Use a small square to indicate right angle.
  const len = 10;
  // Toward origin (along b's line).
  const v1x = origin.x - foot.x;
  const v1y = origin.y - foot.y;
  const v1Len = Math.hypot(v1x, v1y);
  if (v1Len < 1e-3) return;
  const u1 = { x: (v1x / v1Len) * len, y: (v1y / v1Len) * len };
  // Toward a's tip (perpendicular direction).
  const v2x = aTip.x - foot.x;
  const v2y = aTip.y - foot.y;
  const v2Len = Math.hypot(v2x, v2y);
  if (v2Len < 1e-3) return;
  const u2 = { x: (v2x / v2Len) * len, y: (v2y / v2Len) * len };

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(foot.x + u1.x, foot.y + u1.y);
  ctx.lineTo(foot.x + u1.x + u2.x, foot.y + u1.y + u2.y);
  ctx.lineTo(foot.x + u2.x, foot.y + u2.y);
  ctx.stroke();
  ctx.restore();
}
