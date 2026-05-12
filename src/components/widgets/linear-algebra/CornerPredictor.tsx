/**
 * CornerPredictor — click-the-image assessment for predicted corner
 * positions.
 *
 * Used by:
 *   - linear-algebra-matrices
 *
 * THIS IS A SPATIAL-PREDICTION ASSESSMENT. The reader is shown a 2×2
 * matrix A and the unit square. Their job: click four positions on the
 * canvas where they predict the corners of the unit square will land
 * after A is applied. After placing four clicks they hit "Reveal" and
 * the widget overlays the true transformed parallelogram, highlighting
 * each predicted corner with its distance to the true corner. Score is
 * the average per-corner distance in math units; thresholds determine
 * perfect / good / try-again verdicts.
 *
 * (This is the simpler-but-honest substitute for ShapeTransformPainter
 * — free-form paint requires canvas paint mechanics with no clear
 * grading signal beyond pixel overlap; click-to-place corners gives a
 * crisp per-click correctness measure and uses the same pedagogical
 * payload.)
 *
 * Pedagogically: predicting where points land under a known matrix.
 * The reader can't get the corners right unless they've internalised
 * "Av = (a·v.x + b·v.y, c·v.x + d·v.y)" — and crucially, they have to
 * commit to the prediction BEFORE the true answer is revealed.
 * Click-to-place forces a spatial commitment in a way that typing
 * coordinates never could.
 *
 * The four corners are placed in a *fixed reader-friendly order* —
 * (0,0), (1,0), (1,1), (0,1) — and the reader is shown which corner
 * they're predicting next, so the assessment is unambiguous about
 * which click corresponds to which true corner.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./CornerPredictor.css";

const CANVAS_SIZE = 360;

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface Vec2 {
  x: number;
  y: number;
}

function apply(M: Matrix2, p: Vec2): Vec2 {
  return { x: M.a * p.x + M.b * p.y, y: M.c * p.x + M.d * p.y };
}

/** The four corners of the unit square, in the order the reader places
 *  predictions for them. */
const CORNERS: Vec2[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

interface Puzzle {
  label: string;
  matrix: Matrix2;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Scale x ×2",
    matrix: { a: 2, b: 0, c: 0, d: 1 },
  },
  {
    label: "Shear-x by 1",
    matrix: { a: 1, b: 1, c: 0, d: 1 },
  },
  {
    label: "Rotate 90° anticlockwise",
    matrix: { a: 0, b: -1, c: 0, d: 1 },
  },
  {
    label: "Reflect across y-axis",
    matrix: { a: -1, b: 0, c: 0, d: 1 },
  },
  {
    label: "Stretch + shear",
    matrix: { a: 1.5, b: 0.5, c: -0.5, d: 1.2 },
  },
  {
    label: "Diagonal stretch",
    matrix: { a: 2, b: 0, c: 0, d: 0.5 },
  },
];

interface CornerPredictorProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function CornerPredictor({ onStateChange }: CornerPredictorProps) {
  const { recordInteraction } = useWidgetTelemetry("CornerPredictor");
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [predictions, setPredictions] = useState<Vec2[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [bestErrors, setBestErrors] = useState<Map<number, number>>(new Map());

  const puzzle = PUZZLES[puzzleIdx];

  // The true positions of the four transformed corners.
  const truth = useMemo(() => CORNERS.map((c) => apply(puzzle.matrix, c)), [puzzle]);

  // Per-corner errors, in math units. Only meaningful once revealed.
  const errors = useMemo(() => {
    return predictions.map((p, i) => {
      const t = truth[i];
      return Math.hypot(p.x - t.x, p.y - t.y);
    });
  }, [predictions, truth]);

  const avgError =
    errors.length > 0 ? errors.reduce((s, e) => s + e, 0) / errors.length : 0;
  const maxError = errors.length > 0 ? Math.max(...errors) : 0;

  const verdict = useMemo<"perfect" | "good" | "rough" | null>(() => {
    if (!revealed || predictions.length < 4) return null;
    if (maxError < 0.18 && avgError < 0.12) return "perfect";
    if (maxError < 0.5 && avgError < 0.3) return "good";
    return "rough";
  }, [revealed, predictions.length, avgError, maxError]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      predictions_placed: predictions.length,
      revealed: revealed ? 1 : 0,
      avg_error: Number(avgError.toFixed(3)),
      max_error: Number(maxError.toFixed(3)),
      perfect: verdict === "perfect" ? 1 : 0,
      good: verdict === "good" ? 1 : 0,
    });
  }, [puzzleIdx, predictions.length, revealed, avgError, maxError, verdict, onStateChange]);

  // Update best-error memory whenever a fresh reveal beats the prior best.
  useEffect(() => {
    if (!revealed || predictions.length < 4) return;
    setBestErrors((prev) => {
      const prior = prev.get(puzzleIdx) ?? Infinity;
      if (avgError < prior) {
        const next = new Map(prev);
        next.set(puzzleIdx, avgError);
        return next;
      }
      return prev;
    });
  }, [revealed, predictions.length, avgError, puzzleIdx]);

  const stateSummary = useMemo(() => {
    if (predictions.length === 0)
      return `Corner predictor puzzle "${puzzle.label}": matrix = [[${puzzle.matrix.a}, ${puzzle.matrix.b}], [${puzzle.matrix.c}, ${puzzle.matrix.d}]]. Reader has not placed any predictions yet. Goal: click 4 positions for the predicted corners of the transformed unit square.`;
    if (!revealed)
      return `Corner predictor puzzle "${puzzle.label}": reader has placed ${predictions.length}/4 corner predictions. Awaiting reveal.`;
    const each = errors
      .map((e, i) => `corner ${i + 1} err ${e.toFixed(2)}`)
      .join(", ");
    return `Corner predictor puzzle "${puzzle.label}": revealed. Errors per corner: ${each}. Average error ${avgError.toFixed(3)}; max error ${maxError.toFixed(3)}. Verdict ${verdict}.`;
  }, [puzzle, predictions.length, revealed, errors, avgError, maxError, verdict]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        placed: predictions.length,
        revealed,
        verdict,
      }),
    [puzzleIdx, predictions.length, revealed, verdict],
  );

  const handlePlace = useCallback(
    (pos: Vec2) => {
      if (revealed || predictions.length >= 4) return;
      setPredictions((prev) => [...prev, pos]);
      recordInteraction("place", {
        corner_index: predictions.length,
        x: Number(pos.x.toFixed(2)),
        y: Number(pos.y.toFixed(2)),
      });
    },
    [revealed, predictions.length, recordInteraction],
  );

  const handleUndo = useCallback(() => {
    if (revealed) return;
    setPredictions((prev) => prev.slice(0, -1));
    recordInteraction("undo");
  }, [revealed, recordInteraction]);

  const handleReveal = useCallback(() => {
    if (predictions.length < 4) return;
    setRevealed(true);
    recordInteraction("reveal", {
      avg_error: Number(avgError.toFixed(3)),
      max_error: Number(maxError.toFixed(3)),
    });
  }, [predictions.length, avgError, maxError, recordInteraction]);

  const handleNewPuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      setPredictions([]);
      setRevealed(false);
      recordInteraction("puzzle", { puzzle: PUZZLES[idx].label });
    },
    [recordInteraction],
  );

  const handleReset = useCallback(() => {
    setPredictions([]);
    setRevealed(false);
    recordInteraction("reset");
  }, [recordInteraction]);

  const nextCornerIdx = predictions.length;
  const bestForPuzzle = bestErrors.get(puzzleIdx);

  return (
    <div
      className={`cp${
        verdict === "perfect"
          ? " cp--perfect"
          : verdict === "good"
          ? " cp--good"
          : verdict === "rough"
          ? " cp--rough"
          : ""
      }`}
    >
      <header className="cp__head">
        <div className="cp__heading">
          <span className="cp__heading-label">MATRIX</span>
          <span className="cp__heading-value cp__heading-value--mono">
            [[{puzzle.matrix.a}, {puzzle.matrix.b}], [{puzzle.matrix.c}, {puzzle.matrix.d}]]
          </span>
        </div>
        <div className="cp__heading">
          <span className="cp__heading-label">PROGRESS</span>
          <span className="cp__heading-value">
            {predictions.length} / 4 corners placed
          </span>
        </div>
        <div className="cp__heading">
          <span className="cp__heading-label">BEST</span>
          <span className="cp__heading-value">
            {bestForPuzzle === undefined ? "—" : `avg err ${bestForPuzzle.toFixed(3)}`}
          </span>
        </div>
      </header>

      <PredictCanvas
        matrix={puzzle.matrix}
        predictions={predictions}
        truth={truth}
        revealed={revealed}
        nextCornerIdx={nextCornerIdx}
        onPlace={handlePlace}
      />

      <div className="cp__instructions">
        {!revealed && predictions.length < 4 && (
          <>
            <strong>Click to predict.</strong> Place where you think corner{" "}
            <span className="cp__corner-tag">
              {CORNERS[nextCornerIdx].x === 0 && CORNERS[nextCornerIdx].y === 0 && "(0, 0)"}
              {CORNERS[nextCornerIdx].x === 1 && CORNERS[nextCornerIdx].y === 0 && "(1, 0) — î"}
              {CORNERS[nextCornerIdx].x === 1 && CORNERS[nextCornerIdx].y === 1 && "(1, 1) — î+ĵ"}
              {CORNERS[nextCornerIdx].x === 0 && CORNERS[nextCornerIdx].y === 1 && "(0, 1) — ĵ"}
            </span>{" "}
            of the unit square will land. The dashed grey outline is the
            original square.
          </>
        )}
        {!revealed && predictions.length === 4 && (
          <>
            <strong>All four placed.</strong> Hit "Reveal" to see how close
            you are, or undo your last placement.
          </>
        )}
        {revealed && (
          <>
            <strong>Revealed.</strong> The true transformed parallelogram is
            drawn in green. Each predicted corner is connected to its true
            counterpart by a red error line.
          </>
        )}
      </div>

      <div className="cp__actions">
        <button
          type="button"
          className="cp__action"
          onClick={handleUndo}
          disabled={revealed || predictions.length === 0}
        >
          Undo last
        </button>
        <button
          type="button"
          className="cp__action cp__action--reset"
          onClick={handleReset}
          disabled={predictions.length === 0 && !revealed}
        >
          Clear all
        </button>
        <button
          type="button"
          className="cp__action cp__action--primary"
          onClick={handleReveal}
          disabled={revealed || predictions.length < 4}
        >
          Reveal & grade
        </button>
      </div>

      <div
        className={`cp__verdict cp__verdict--${
          verdict ?? (revealed ? "revealed" : "working")
        }`}
      >
        <span className="cp__verdict-label">
          {verdict ? "Verdict" : "Status"}
        </span>
        <span className="cp__verdict-value">
          {!revealed &&
            `Place all four predicted corner positions, then click "Reveal & grade". Each prediction is graded on its distance to the true transformed corner; lower is better.`}
          {revealed && verdict === "perfect" &&
            `Perfect. Average error ${avgError.toFixed(3)}, max ${maxError.toFixed(3)}. You've internalised matrix-vector multiplication as a spatial operation.`}
          {revealed && verdict === "good" &&
            `Good. Average error ${avgError.toFixed(3)}, max ${maxError.toFixed(3)}. Close — but the worst-placed corner is still off by ${maxError.toFixed(2)}. Try the same puzzle again and improve your aim.`}
          {revealed && verdict === "rough" &&
            `Rough. Average error ${avgError.toFixed(3)}, max ${maxError.toFixed(3)}. Remember: A·v = (a·v.x + b·v.y, c·v.x + d·v.y). Apply it to each corner mentally and aim again.`}
        </span>
      </div>

      <div className="cp__puzzle-row">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`cp__puzzle-pick${i === puzzleIdx ? " cp__puzzle-pick--active" : ""}`}
            onClick={() => handleNewPuzzle(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <WidgetExplainer
        widgetName="Corner predictor — click-to-place spatial-prediction assessment"
        widgetDescription="A spatial-prediction assessment widget. The reader is shown a 2×2 matrix A and the original unit square. The reader's job is to click four positions on the canvas, in order, where they predict each corner of the unit square will land after A is applied: corner 1 = (0,0)'s image, corner 2 = (1,0)'s image (the new î), corner 3 = (1,1)'s image, corner 4 = (0,1)'s image (the new ĵ). After placing all four the reader clicks 'Reveal & grade'; the widget overlays the true transformed parallelogram, draws red error lines from each prediction to its true target, and reports per-corner errors plus average and max in math units. Verdict thresholds: perfect (max < 0.18 and avg < 0.12), good (max < 0.5 and avg < 0.3), rough otherwise. Best-average-error per puzzle persists in memory across attempts. Six puzzles ranging from canonical named transformations (scale-x, shear, rotation, reflection) to compound stretch+shear. The pedagogical payload is the spatial commitment: the reader cannot wait to see the answer before placing a prediction."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas with click-to-place ──────────────────────────────────────────

interface PredictCanvasProps {
  matrix: Matrix2;
  predictions: Vec2[];
  truth: Vec2[];
  revealed: boolean;
  nextCornerIdx: number;
  onPlace: (pos: Vec2) => void;
}

function PredictCanvas({
  matrix,
  predictions,
  truth,
  revealed,
  nextCornerIdx,
  onPlace,
}: PredictCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(() => {
    const pts: Vec2[] = [...truth, ...predictions, { x: 1, y: 1 }];
    return computeDomain(pts, { padding: 1.6, floor: 2.5, ceiling: 6 });
  }, [truth, predictions]);

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

    const C_TRUTH = resolveColor("var(--widget-success)");
    const C_TRUTH_FILL = resolveColorAlpha("var(--widget-success)", 0.14);
    const C_PRED = resolveColor("var(--widget-chart-1)");
    const C_PRED_FILL = resolveColorAlpha("var(--widget-chart-1)", 0.12);
    const C_ERROR = resolveColor("var(--widget-danger)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_HINT = resolveColor("var(--widget-warn)");

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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Original unit square (dashed grey).
    const u0 = toPx({ x: 0, y: 0 });
    const u1 = toPx({ x: 1, y: 0 });
    const u2 = toPx({ x: 1, y: 1 });
    const u3 = toPx({ x: 0, y: 1 });
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(u0.x, u0.y);
    ctx.lineTo(u1.x, u1.y);
    ctx.lineTo(u2.x, u2.y);
    ctx.lineTo(u3.x, u3.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Truth parallelogram (only after reveal).
    if (revealed) {
      const t = truth.map((p) => toPx(p));
      ctx.fillStyle = C_TRUTH_FILL;
      ctx.strokeStyle = C_TRUTH;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(t[0].x, t[0].y);
      ctx.lineTo(t[1].x, t[1].y);
      ctx.lineTo(t[2].x, t[2].y);
      ctx.lineTo(t[3].x, t[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Truth corner markers.
      for (let i = 0; i < t.length; i++) {
        ctx.fillStyle = C_TRUTH;
        ctx.beginPath();
        ctx.arc(t[i].x, t[i].y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
        ctx.fillText(`T${i + 1}`, t[i].x + 8, t[i].y - 8);
      }
    }

    // Predicted parallelogram (if all four placed). Drawn first so the
    // truth shape sits on top when revealed.
    if (predictions.length === 4) {
      const p = predictions.map((pp) => toPx(pp));
      ctx.fillStyle = C_PRED_FILL;
      ctx.strokeStyle = C_PRED;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      ctx.lineTo(p[1].x, p[1].y);
      ctx.lineTo(p[2].x, p[2].y);
      ctx.lineTo(p[3].x, p[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Predicted corner markers.
    for (let i = 0; i < predictions.length; i++) {
      const p = toPx(predictions[i]);
      ctx.fillStyle = C_PRED;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_TEXT;
      ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillText(`P${i + 1}`, p.x + 8, p.y - 8);

      // Error line (only after reveal).
      if (revealed) {
        const t = toPx(truth[i]);
        ctx.strokeStyle = C_ERROR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Next-corner hint: ghosted dot at the original-corner position so
    // the reader knows which corner they're predicting next.
    if (!revealed && nextCornerIdx < CORNERS.length) {
      const origC = toPx(CORNERS[nextCornerIdx]);
      ctx.fillStyle = resolveColorAlpha("var(--widget-warn)", 0.65);
      ctx.beginPath();
      ctx.arc(origC.x, origC.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C_HINT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(origC.x, origC.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = C_HINT;
      ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillText("predict this →", origC.x + 14, origC.y - 10);
    }

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Legend.
    ctx.font = "600 10.5px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText("─ ─ original unit square", 12, 10);
    if (predictions.length > 0) {
      ctx.fillStyle = C_PRED;
      ctx.fillText("● your prediction", 12, 26);
    }
    if (revealed) {
      ctx.fillStyle = C_TRUTH;
      ctx.fillText("■ true image", 12, 42);
    }
  }, [matrix, truth, predictions, revealed, nextCornerIdx, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Click handler: convert pixel click to math coordinate; ignore if
  // revealed or already four predictions placed.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onClick = (e: PointerEvent) => {
      if (revealed || predictions.length >= 4) return;
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      const m = fromPx({ x: px, y: py });
      onPlace({ x: Number(m.x.toFixed(3)), y: Number(m.y.toFixed(3)) });
    };

    canvas.addEventListener("pointerdown", onClick);
    return () => {
      canvas.removeEventListener("pointerdown", onClick);
    };
  }, [fromPx, onPlace, revealed, predictions.length]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="cp__canvas"
      role="img"
      aria-label="Corner predictor canvas — click to place predicted corners of the transformed unit square."
    />
  );
}
