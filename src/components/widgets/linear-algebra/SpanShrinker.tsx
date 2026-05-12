/**
 * SpanShrinker — constraint-satisfaction puzzle for spanning sets.
 *
 * Used by:
 *   - linear-algebra-span
 *
 * THIS IS A PREDICTION GAME. The reader starts with three vectors. Their
 * span (in ℝ²) is either 2D (the whole plane) or 1D (a line through the
 * origin). At each turn, the reader picks a vector to remove and predicts
 * whether the span will SHRINK (dimension drops) or STAY THE SAME (the
 * removed vector was redundant). The widget reveals what actually
 * happened. The reader survives the round only if every prediction was
 * right.
 *
 * Pedagogy:
 *   - A spanning set has redundancy whenever it has more vectors than
 *     necessary. In ℝ² with three vectors, at least one is redundant
 *     (since the dimension is at most 2). Removing a redundant vector
 *     preserves the span; removing a *non*-redundant vector shrinks it.
 *   - The reader has to look at the three vectors and judge: which of
 *     these would the others still span without? The judgement is the
 *     real test of "do they understand span as a SET of reachable
 *     points, not a list of generators?"
 *
 * Three states per round:
 *   - initial: 3 vectors, span = 2D iff at least two are independent
 *   - 2-vec: after first removal, 2 vectors, span might be 2D or 1D
 *   - 1-vec: after second removal, 1 vector, span is always 1D (or 0
 *     if it's the zero vector)
 *
 * The reader's prediction at each removal is graded; cumulative "lives"
 * decrement on wrong predictions. Three lives per puzzle.
 *
 * Implements metaphor library §1 (iterated operation) and §10
 * (constructive build-up, in reverse — *de*-constructive). The
 * predict-then-reveal cadence is new for this codebase.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./SpanShrinker.css";

const CANVAS_SIZE = 360;
const COLLINEAR_EPS = 0.04;

interface Vec2 {
  x: number;
  y: number;
}

interface VectorLabel {
  id: string;
  v: Vec2;
}

interface Puzzle {
  label: string;
  vectors: [VectorLabel, VectorLabel, VectorLabel];
  /** Short note on the puzzle's structure, surfaced after the puzzle ends. */
  insight: string;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Two parallel, one off-line",
    vectors: [
      { id: "a", v: { x: 2, y: 1 } },
      { id: "b", v: { x: 4, y: 2 } }, // 2·a
      { id: "c", v: { x: -1, y: 2 } }, // off the (a,b) line
    ],
    insight:
      "a and b are parallel (b = 2a), so removing either of them doesn't shrink the span. Only c contributes the second dimension — remove c and the span collapses to a's line.",
  },
  {
    label: "Three independent-ish",
    vectors: [
      { id: "a", v: { x: 1, y: 0 } },
      { id: "b", v: { x: 0, y: 1 } },
      { id: "c", v: { x: 1, y: 1 } }, // a + b — redundant in 2D
    ],
    insight:
      "All three vectors are pairwise independent, but together they're dependent: c = a + b. In ℝ² you can never have three INDEPENDENT vectors. Whichever one you remove first, the remaining two are still a basis — the span stays 2D throughout the first removal.",
  },
  {
    label: "Three on a line",
    vectors: [
      { id: "a", v: { x: 1, y: 1 } },
      { id: "b", v: { x: 2, y: 2 } },
      { id: "c", v: { x: -1, y: -1 } },
    ],
    insight:
      "All three vectors are scalar multiples of (1, 1) — they ALL live on one line through the origin. The span is already 1D before any removal. Removing any of them keeps the span 1D as long as one non-zero vector remains.",
  },
  {
    label: "Three with one linear-combination — pick the redundant pair",
    vectors: [
      { id: "a", v: { x: 1, y: 2 } },
      { id: "b", v: { x: 3, y: 1 } },
      { id: "c", v: { x: 5, y: 5 } }, // = 2a + b
    ],
    insight:
      "c = 2a + b — c sits in the span of a and b. The three are pairwise independent (no two are parallel), so removing ANY single vector keeps the remaining two independent and the span 2D. The first removal never shrinks the span here; the second removal always does. The lesson: 'dependent' is a property of the SET, not of any single vector.",
  },
];

type Prediction = "shrink" | "same" | null;

interface RemovalRecord {
  removedId: string;
  prediction: Prediction;
  /** Span dimension AFTER removal. */
  newDim: number;
  /** Span dimension BEFORE removal. */
  oldDim: number;
  correct: boolean;
}

function spanDim(vecs: Vec2[]): number {
  // Filter zero vectors.
  const nonZero = vecs.filter((v) => Math.hypot(v.x, v.y) >= 0.05);
  if (nonZero.length === 0) return 0;
  if (nonZero.length === 1) return 1;
  // Check whether any pair is independent.
  for (let i = 0; i < nonZero.length; i++) {
    for (let j = i + 1; j < nonZero.length; j++) {
      const cross = nonZero[i].x * nonZero[j].y - nonZero[i].y * nonZero[j].x;
      if (Math.abs(cross) > COLLINEAR_EPS) return 2;
    }
  }
  return 1;
}

interface SpanShrinkerProps {
  initialPuzzle?: number;
  onStateChange?: (state: Record<string, number>) => void;
}

export function SpanShrinker({
  initialPuzzle = 0,
  onStateChange,
}: SpanShrinkerProps) {
  const { recordInteraction } = useWidgetTelemetry("SpanShrinker");
  const [puzzleIdx, setPuzzleIdx] = useState(initialPuzzle);
  const [remaining, setRemaining] = useState<VectorLabel[]>(
    () => [...PUZZLES[initialPuzzle].vectors],
  );
  const [history, setHistory] = useState<RemovalRecord[]>([]);
  const [armed, setArmed] = useState<string | null>(null);
  const [lives, setLives] = useState(3);

  const puzzle = PUZZLES[puzzleIdx];
  const currentDim = useMemo(() => spanDim(remaining.map((vl) => vl.v)), [remaining]);
  const initialDim = useMemo(() => spanDim(puzzle.vectors.map((vl) => vl.v)), [puzzle]);
  const isFinished = remaining.length === 0 || lives <= 0;
  const survived = lives > 0 && remaining.length === 0;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      remaining_count: remaining.length,
      current_dim: currentDim,
      initial_dim: initialDim,
      lives,
      history_count: history.length,
      survived: survived ? 1 : 0,
      finished: isFinished ? 1 : 0,
    });
  }, [puzzleIdx, remaining, currentDim, initialDim, lives, history, survived, isFinished, onStateChange]);

  const stateSummary = useMemo(() => {
    const remainingDesc = remaining.length === 0
      ? "all removed"
      : remaining.map((r) => `${r.id}=(${r.v.x}, ${r.v.y})`).join(", ");
    const hist = history
      .map(
        (h) =>
          `${h.removedId} (predicted ${h.prediction}, was ${h.oldDim}D→${h.newDim}D, ${h.correct ? "correct" : "WRONG"})`,
      )
      .join("; ");
    const status = isFinished
      ? survived
        ? `Survived the round with ${lives}/3 lives.`
        : `Out of lives at removal ${history.length}.`
      : armed
      ? `Armed: ${armed}. Awaiting prediction (shrink / same) before removal is committed.`
      : `Picking which vector to remove next. Current span dim = ${currentDim}.`;
    return `SpanShrinker, puzzle "${puzzle.label}". Initial span dim ${initialDim}, current dim ${currentDim}. Remaining: ${remainingDesc}. History: ${hist || "none"}. ${status}`;
  }, [puzzle, initialDim, currentDim, remaining, history, isFinished, survived, lives, armed]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        remaining: remaining.map((r) => r.id).sort(),
        history: history.map((h) => `${h.removedId}:${h.prediction}:${h.correct}`),
        lives,
      }),
    [puzzleIdx, remaining, history, lives],
  );

  const handleArm = useCallback(
    (id: string) => {
      if (isFinished) return;
      if (armed === id) {
        setArmed(null);
          return;
      }
      setArmed(id);
      recordInteraction("arm", { vector: id });
    },
    [isFinished, armed, recordInteraction],
  );

  const handlePredictAndRemove = useCallback(
    (pred: Exclude<Prediction, null>) => {
      if (!armed || isFinished) return;
      const idx = remaining.findIndex((r) => r.id === armed);
      if (idx < 0) return;
      const removed = remaining[idx];
      const after = remaining.filter((_, i) => i !== idx);
      const oldDim = currentDim;
      const newDim = spanDim(after.map((r) => r.v));
      const shrank = newDim < oldDim;
      const predictionMatches = (pred === "shrink") === shrank;
      const correct = predictionMatches;
      setRemaining(after);
      setHistory((prev) => [
        ...prev,
        { removedId: removed.id, prediction: pred, newDim, oldDim, correct },
      ]);
      setLives((prev) => (correct ? prev : prev - 1));
      setArmed(null);
      recordInteraction("predict_and_remove", {
        vector: removed.id,
        prediction: pred,
        actual_shrink: shrank,
        correct,
        new_dim: newDim,
      });
    },
    [armed, isFinished, remaining, currentDim, recordInteraction],
  );

  const handleReset = useCallback(() => {
    setRemaining([...puzzle.vectors]);
    setHistory([]);
    setLives(3);
    setArmed(null);
    recordInteraction("reset");
  }, [puzzle, recordInteraction]);

  const handleNewPuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      setRemaining([...PUZZLES[idx].vectors]);
      setHistory([]);
      setLives(3);
      setArmed(null);
      recordInteraction("puzzle", { puzzle: PUZZLES[idx].label });
    },
    [recordInteraction],
  );

  return (
    <div className={`ssk${survived ? " ssk--survived" : ""}${lives <= 0 ? " ssk--failed" : ""}`}>
      <header className="ssk__head">
        <div className="ssk__heading">
          <span className="ssk__heading-label">PUZZLE</span>
          <span className="ssk__heading-value">{puzzle.label}</span>
        </div>
        <div className="ssk__heading">
          <span className="ssk__heading-label">SPAN DIM</span>
          <span className={`ssk__heading-value ssk__heading-value--${currentDim === 2 ? "ok" : "warn"}`}>
            {currentDim}D{currentDim < initialDim && ` (shrunk from ${initialDim}D)`}
          </span>
        </div>
        <div className="ssk__heading">
          <span className="ssk__heading-label">LIVES</span>
          <span className="ssk__heading-value">
            {"♥".repeat(Math.max(lives, 0))}
            <span className="ssk__lives-spent">{"♡".repeat(3 - Math.max(lives, 0))}</span>
          </span>
        </div>
      </header>

      <ShrinkerCanvas
        allVectors={puzzle.vectors}
        remaining={remaining}
        armed={armed}
        currentDim={currentDim}
      />

      <div className="ssk__remaining-strip">
        <span className="ssk__strip-label">REMAINING</span>
        {remaining.length === 0 ? (
          <span className="ssk__strip-empty">All vectors removed.</span>
        ) : (
          remaining.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`ssk__remain-chip${armed === r.id ? " ssk__remain-chip--armed" : ""}`}
              onClick={() => handleArm(r.id)}
              disabled={isFinished}
            >
              {r.id} ({r.v.x}, {r.v.y})
            </button>
          ))
        )}
      </div>

      {armed && !isFinished && (
        <div className="ssk__prediction">
          <div className="ssk__prediction-label">
            About to remove <strong>{armed}</strong>. Will the span shrink?
          </div>
          <div className="ssk__prediction-row">
            <button
              type="button"
              className="ssk__predict-btn ssk__predict-btn--shrink"
              onClick={() => handlePredictAndRemove("shrink")}
            >
              SHRINK — dim drops
            </button>
            <button
              type="button"
              className="ssk__predict-btn ssk__predict-btn--same"
              onClick={() => handlePredictAndRemove("same")}
            >
              SAME — {armed} was redundant
            </button>
          </div>
          <span className="ssk__prediction-hint">
            Hint — look at the remaining vectors. If the others still cover the same set of directions, span stays the same.
          </span>
        </div>
      )}

      {history.length > 0 && (
        <div className="ssk__history">
          <span className="ssk__history-label">HISTORY</span>
          {history.map((h, i) => (
            <div
              key={`${h.removedId}-${i}`}
              className={`ssk__history-row ssk__history-row--${h.correct ? "ok" : "bad"}`}
            >
              <span className="ssk__history-step">{i + 1}.</span>
              <span className="ssk__history-action">remove {h.removedId}</span>
              <span className="ssk__history-pred">
                predicted <strong>{h.prediction}</strong>
              </span>
              <span className="ssk__history-actual">
                actual: {h.oldDim}D → {h.newDim}D
              </span>
              <span className="ssk__history-verdict">
                {h.correct ? "✓" : "✗"}
              </span>
            </div>
          ))}
        </div>
      )}

      {isFinished && (
        <div className={`ssk__verdict ssk__verdict--${survived ? "win" : "loss"}`}>
          <span className="ssk__verdict-label">Round result</span>
          <span className="ssk__verdict-value">
            {survived
              ? `✓ Survived with ${lives}/3 lives. Insight: ${puzzle.insight}`
              : `✗ Out of lives. ${puzzle.insight}`}
          </span>
        </div>
      )}

      <div className="ssk__actions">
        <button type="button" className="ssk__btn" onClick={handleReset}>
          Reset puzzle
        </button>
        <div className="ssk__puzzle-row">
          {PUZZLES.map((p, i) => (
            <button
              key={p.label}
              type="button"
              className={`ssk__puzzle-pick${i === puzzleIdx ? " ssk__puzzle-pick--active" : ""}`}
              onClick={() => handleNewPuzzle(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ssk__instructions">
        <strong>How to play.</strong> Three vectors define a spanning set. Click a vector to <em>arm</em> it, then predict whether removing it will <em>shrink</em> the span (drop a dimension) or leave it the <em>same</em> (the removed vector was redundant). Wrong predictions cost a life — you have three. Survive both removals to win the round.
      </div>

      <WidgetExplainer
        widgetName="Span Shrinker — predict-the-shrink puzzle"
        widgetDescription="A constraint-satisfaction puzzle. Three vectors in ℝ² form a spanning set whose dimension (1 or 2) is computed on the fly. The reader picks a vector to remove and must predict whether the span will SHRINK (dimension drops) or STAY THE SAME (the removed vector was redundant). The widget reveals the actual result; wrong predictions cost a life from three available. The reader survives the round only if every prediction was correct. Four puzzles cover the key shapes: (1) two parallel + one off-line — removing the off-line vector is the only shrinker; (2) three pairwise-independent but jointly-dependent vectors — first removal preserves span; (3) three vectors on a single line — span starts at 1D, removing any one keeps it 1D unless it's the last non-zero; (4) sneaky linear combination — c = 2a + b makes c the redundant one. The pedagogical goal is to make the reader internalise that span depends on the SET of reachable points, not the count of generators."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface ShrinkerCanvasProps {
  allVectors: VectorLabel[];
  remaining: VectorLabel[];
  armed: string | null;
  currentDim: number;
}

function ShrinkerCanvas({
  allVectors,
  remaining,
  armed,
  currentDim,
}: ShrinkerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(
    () =>
      computeDomain(allVectors.map((vl) => vl.v), {
        padding: 1.4,
        floor: 3,
        ceiling: 7,
      }),
    [allVectors],
  );

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_TEXT = resolveColor("var(--widget-text)");
    const C_LIVE = resolveColor("var(--widget-chart-1)");
    const C_GHOST = resolveColorAlpha("var(--widget-text-dim)", 0.25);
    const C_ARMED = resolveColor("var(--widget-warn)");
    const C_LINE = resolveColorAlpha("var(--widget-success)", 0.32);

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

    // If span is 1D, shade the line.
    if (currentDim === 1 && remaining.length > 0) {
      const dir = remaining.find((r) => Math.hypot(r.v.x, r.v.y) > 0.05)?.v;
      if (dir) {
        ctx.strokeStyle = C_LINE;
        ctx.lineWidth = 3;
        const ext = domain * 1.4;
        const len = Math.hypot(dir.x, dir.y);
        const norm = { x: dir.x / len, y: dir.y / len };
        const start = toPx({ x: -ext * norm.x, y: -ext * norm.y });
        const end = toPx({ x: ext * norm.x, y: ext * norm.y });
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    }

    const origin = toPx({ x: 0, y: 0 });
    const remainingIds = new Set(remaining.map((r) => r.id));

    // Draw ghost vectors for removed ones.
    for (const vl of allVectors) {
      if (remainingIds.has(vl.id)) continue;
      const tipPx = toPx(vl.v);
      ctx.save();
      ctx.strokeStyle = C_GHOST;
      ctx.fillStyle = C_GHOST;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(tipPx.x, tipPx.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "500 11px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillText(`${vl.id} (removed)`, tipPx.x + 6, tipPx.y - 8);
      ctx.restore();
    }

    // Draw remaining vectors.
    for (const vl of remaining) {
      const isArmed = vl.id === armed;
      const color = isArmed ? C_ARMED : C_LIVE;
      const tipPx = toPx(vl.v);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = isArmed ? 3 : 2.3;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(tipPx.x, tipPx.y);
      ctx.stroke();
      const dx = tipPx.x - origin.x;
      const dy = tipPx.y - origin.y;
      const len = Math.hypot(dx, dy);
      if (len > 5) {
        const ang = Math.atan2(dy, dx);
        const aLen = Math.min(10, len * 0.3);
        ctx.beginPath();
        ctx.moveTo(tipPx.x, tipPx.y);
        ctx.lineTo(
          tipPx.x - aLen * Math.cos(ang - Math.PI / 6),
          tipPx.y - aLen * Math.sin(ang - Math.PI / 6),
        );
        ctx.lineTo(
          tipPx.x - aLen * Math.cos(ang + Math.PI / 6),
          tipPx.y - aLen * Math.sin(ang + Math.PI / 6),
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(tipPx.x, tipPx.y, isArmed ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = "600 13px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillStyle = color;
      ctx.fillText(vl.id, tipPx.x + 7, tipPx.y - 10);
      ctx.restore();
    }

    // Origin.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [allVectors, remaining, armed, currentDim, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="ssk__canvas"
      role="img"
      aria-label="Span Shrinker canvas — current remaining vectors and span line."
    />
  );
}
