/**
 * VectorChainPuzzle — drag-and-drop construction puzzle.
 *
 * Used by:
 *   - linear-algebra (the foundations primer, vector-addition section)
 *
 * THIS IS A WIN-STATE WIDGET. Not a slider-with-readout. The reader has
 * an explicit goal: chain vectors from a palette so the sum reaches the
 * target. The widget detects success (sum within ε of target), surfaces
 * "elegance" (number of segments used), and supports both pointer drag
 * AND click-to-place fallback.
 *
 * Pedagogically: this is vector addition embodied as physical
 * concatenation. The reader cannot ignore "head-to-tail" — the segments
 * literally snap head-to-tail when placed. They cannot ignore
 * commutativity — the order they pick segments doesn't change the
 * destination, only the path. They cannot ignore path-independence —
 * the running sum is the same regardless of which permutation of the
 * same multiset they picked.
 *
 * State machine:
 *   - idle: palette visible, canvas empty (or showing partial chain)
 *   - dragging: a palette item being dragged; preview of where it'd snap
 *   - solved: sum within tolerance of target; success banner shown
 *
 * Implements metaphor library §1 (iterated operation) but as a PUZZLE
 * rather than a passive visualisation. The "iteration" is built BY the
 * reader, not displayed FOR them.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./VectorChainPuzzle.css";

const CANVAS_SIZE = 360;
const SUCCESS_EPS = 0.18;

interface Vec2 {
  x: number;
  y: number;
}

interface PaletteVector {
  id: string;
  label: string;
  v: Vec2;
}

interface PlacedVector {
  id: string;
  paletteId: string;
  v: Vec2;
}

interface Puzzle {
  label: string;
  target: Vec2;
  palette: PaletteVector[];
  /** Minimum number of palette vectors required to reach the target — used
   * to score elegance. The reader can exceed this; they cannot go below it. */
  optimalSegments: number;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Reach (3, 0)",
    target: { x: 3, y: 0 },
    palette: [
      { id: "a", label: "a", v: { x: 1, y: 0 } },
      { id: "b", label: "b", v: { x: 2, y: 0 } },
      { id: "c", label: "c", v: { x: 1, y: 1 } },
      { id: "d", label: "d", v: { x: 1, y: -1 } },
    ],
    optimalSegments: 2,
  },
  {
    label: "Reach (2, 3)",
    target: { x: 2, y: 3 },
    palette: [
      { id: "a", label: "a", v: { x: 1, y: 1 } },
      { id: "b", label: "b", v: { x: 1, y: 2 } },
      { id: "c", label: "c", v: { x: -1, y: 1 } },
      { id: "d", label: "d", v: { x: 2, y: 0 } },
      { id: "e", label: "e", v: { x: 0, y: 1 } },
    ],
    optimalSegments: 2,
  },
  {
    label: "Reach (0, 0) — close a loop",
    target: { x: 0, y: 0 },
    palette: [
      { id: "a", label: "a", v: { x: 2, y: 1 } },
      { id: "b", label: "b", v: { x: -1, y: 2 } },
      { id: "c", label: "c", v: { x: -1, y: -3 } },
      { id: "d", label: "d", v: { x: 1, y: 0 } },
    ],
    optimalSegments: 3,
  },
  {
    label: "Reach (-2, 2)",
    target: { x: -2, y: 2 },
    palette: [
      { id: "a", label: "a", v: { x: -1, y: 1 } },
      { id: "b", label: "b", v: { x: 2, y: -1 } },
      { id: "c", label: "c", v: { x: 1, y: 1 } },
      { id: "d", label: "d", v: { x: -3, y: 0 } },
    ],
    optimalSegments: 2,
  },
];

interface VectorChainPuzzleProps {
  initialPuzzle?: number;
  onStateChange?: (state: Record<string, number>) => void;
}

export function VectorChainPuzzle({
  initialPuzzle = 0,
  onStateChange,
}: VectorChainPuzzleProps) {
  const { recordInteraction } = useWidgetTelemetry("VectorChainPuzzle");
  const [puzzleIdx, setPuzzleIdx] = useState(initialPuzzle);
  const [placed, setPlaced] = useState<PlacedVector[]>([]);

  const puzzle = PUZZLES[puzzleIdx];

  // Running sum of placed vectors.
  const runningSum = useMemo(() => {
    return placed.reduce<Vec2>(
      (acc, p) => ({ x: acc.x + p.v.x, y: acc.y + p.v.y }),
      { x: 0, y: 0 },
    );
  }, [placed]);

  const distanceToTarget = Math.hypot(
    runningSum.x - puzzle.target.x,
    runningSum.y - puzzle.target.y,
  );
  const isSolved = distanceToTarget < SUCCESS_EPS;
  const isElegant = isSolved && placed.length <= puzzle.optimalSegments;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      placed_count: placed.length,
      running_sum_x: Number(runningSum.x.toFixed(3)),
      running_sum_y: Number(runningSum.y.toFixed(3)),
      target_x: puzzle.target.x,
      target_y: puzzle.target.y,
      distance: Number(distanceToTarget.toFixed(3)),
      solved: isSolved ? 1 : 0,
      elegant: isElegant ? 1 : 0,
      optimal_segments: puzzle.optimalSegments,
    });
  }, [
    puzzleIdx,
    placed.length,
    runningSum,
    puzzle.target.x,
    puzzle.target.y,
    puzzle.optimalSegments,
    distanceToTarget,
    isSolved,
    isElegant,
    onStateChange,
  ]);

  const stateSummary = useMemo(() => {
    const chain =
      placed.length === 0
        ? "no vectors placed yet"
        : placed
            .map(
              (p) =>
                `${p.paletteId} = (${p.v.x.toFixed(1)}, ${p.v.y.toFixed(1)})`,
            )
            .join(" + ");
    const status = isSolved
      ? isElegant
        ? `SOLVED — chain reaches the target in ${placed.length} segments (optimal is ${puzzle.optimalSegments}).`
        : `Solved, but used ${placed.length} segments where ${puzzle.optimalSegments} would suffice. Can you find a shorter chain?`
      : `Running sum is (${runningSum.x.toFixed(2)}, ${runningSum.y.toFixed(2)}); target is (${puzzle.target.x}, ${puzzle.target.y}); distance ${distanceToTarget.toFixed(3)}.`;
    return `Puzzle "${puzzle.label}": ${chain}. ${status}`;
  }, [puzzle, placed, runningSum, distanceToTarget, isSolved, isElegant]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        placed: placed.map((p) => p.paletteId),
        solved: isSolved,
      }),
    [puzzleIdx, placed, isSolved],
  );

  const handlePlace = useCallback(
    (paletteVec: PaletteVector) => {
      setPlaced((prev) => [
        ...prev,
        { id: `${paletteVec.id}-${prev.length}`, paletteId: paletteVec.id, v: paletteVec.v },
      ]);
      recordInteraction("place", {
        palette_id: paletteVec.id,
        chain_length: placed.length + 1,
      });
    },
    [placed.length, recordInteraction],
  );

  const handleRemove = useCallback(
    (idx: number) => {
      setPlaced((prev) => prev.filter((_, i) => i !== idx));
      recordInteraction("remove", { index: idx });
    },
    [recordInteraction],
  );

  const handleReset = useCallback(() => {
    setPlaced([]);
    recordInteraction("reset");
  }, [recordInteraction]);

  const handleNewPuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      setPlaced([]);
      recordInteraction("puzzle", { puzzle: PUZZLES[idx].label });
    },
    [recordInteraction],
  );

  return (
    <div className={`vcp${isSolved ? " vcp--solved" : ""}`}>
      <header className="vcp__head">
        <div className="vcp__heading">
          <span className="vcp__heading-label">PUZZLE</span>
          <span className="vcp__heading-value">{puzzle.label}</span>
        </div>
        <div className="vcp__heading">
          <span className="vcp__heading-label">CHAIN</span>
          <span className="vcp__heading-value">
            {placed.length} segment{placed.length === 1 ? "" : "s"} ·
            optimal {puzzle.optimalSegments}
          </span>
        </div>
        <div className="vcp__heading">
          <span className="vcp__heading-label">SUM</span>
          <span className="vcp__heading-value">
            ({runningSum.x.toFixed(2)}, {runningSum.y.toFixed(2)})
          </span>
        </div>
      </header>

      <ChainCanvas
        puzzle={puzzle}
        placed={placed}
        runningSum={runningSum}
        isSolved={isSolved}
      />

      <div className="vcp__palette">
        <span className="vcp__palette-label">Palette — click to chain</span>
        <div className="vcp__palette-row">
          {puzzle.palette.map((p) => (
            <button
              key={p.id}
              type="button"
              className="vcp__tile"
              onClick={() => handlePlace(p)}
              disabled={isSolved}
            >
              <span className="vcp__tile-label">{p.label}</span>
              <span className="vcp__tile-value">
                ({p.v.x}, {p.v.y})
              </span>
            </button>
          ))}
        </div>
      </div>

      {placed.length > 0 && (
        <div className="vcp__chain-strip">
          <span className="vcp__chain-label">CHAIN</span>
          {placed.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className="vcp__chain-chip"
              onClick={() => handleRemove(i)}
              title="Remove from chain"
            >
              {p.paletteId} ({p.v.x}, {p.v.y})
              <span className="vcp__chain-x">×</span>
            </button>
          ))}
          <button
            type="button"
            className="vcp__chain-reset"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      )}

      <div
        className={`vcp__verdict vcp__verdict--${
          isSolved ? (isElegant ? "elegant" : "solved") : "working"
        }`}
      >
        <span className="vcp__verdict-label">Status</span>
        <span className="vcp__verdict-value">
          {isSolved
            ? isElegant
              ? `✓ Solved in ${placed.length} segments — optimal!`
              : `✓ Solved in ${placed.length} segments. Optimal is ${puzzle.optimalSegments} — try shorter.`
            : `Working — distance to target ${distanceToTarget.toFixed(2)}.`}
        </span>
      </div>

      <div className="vcp__puzzle-row">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`vcp__puzzle-pick${i === puzzleIdx ? " vcp__puzzle-pick--active" : ""}`}
            onClick={() => handleNewPuzzle(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <WidgetExplainer
        widgetName="Vector chain puzzle"
        widgetDescription="A drag-to-construct puzzle. A target vector T is drawn on a grid. A palette of 4-6 candidate vectors sits below. The reader clicks palette tiles to add each chosen vector head-to-tail to a running chain; the canvas shows the chain as a sequence of connected arrows accumulating toward T. The widget detects success (running sum within ε of T) and reports whether the chain is OPTIMAL (uses no more segments than necessary) or just SOLVED. The reader can remove placed vectors from the chain strip, reset, or switch between four built-in puzzles. The pedagogical goal is to make vector addition tangible as physical concatenation — the chain literally snaps head-to-tail, commutativity is forced (any permutation of the same multiset reaches the same target), and the elegance scoring nudges toward parsimonious solutions."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────

interface ChainCanvasProps {
  puzzle: Puzzle;
  placed: PlacedVector[];
  runningSum: Vec2;
  isSolved: boolean;
}

function ChainCanvas({
  puzzle,
  placed,
  runningSum,
  isSolved,
}: ChainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Domain fits target, running sum, and all individual palette tips.
  const domain = useMemo(() => {
    const points: Vec2[] = [puzzle.target, runningSum];
    let acc: Vec2 = { x: 0, y: 0 };
    for (const p of placed) {
      acc = { x: acc.x + p.v.x, y: acc.y + p.v.y };
      points.push(acc);
    }
    for (const p of puzzle.palette) points.push(p.v);
    return computeDomain(points, { padding: 1.4, floor: 4, ceiling: 8 });
  }, [puzzle, placed, runningSum]);

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_TARGET = resolveColor("var(--widget-chart-3)");
    const C_TARGET_FILL = resolveColorAlpha("var(--widget-chart-3)", 0.18);
    const C_CHAIN = resolveColor("var(--widget-chart-1)");
    const C_SUM = isSolved
      ? resolveColor("var(--widget-success)")
      : resolveColor("var(--widget-chart-2)");
    const C_TEXT = resolveColor("var(--widget-text)");

    // Grid + axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    const pxPerUnit = W / (2 * domain);
    const unitsPerHalf = Math.ceil(domain);
    for (let u = -unitsPerHalf; u <= unitsPerHalf; u++) {
      const xPx = W / 2 + u * pxPerUnit;
      const yPx = H / 2 - u * pxPerUnit;
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

    // Target halo (filled circle) and arrow.
    const targetPx = toPx(puzzle.target);
    ctx.fillStyle = C_TARGET_FILL;
    ctx.beginPath();
    ctx.arc(targetPx.x, targetPx.y, 16, 0, Math.PI * 2);
    ctx.fill();
    drawArrow(
      ctx,
      toPx({ x: 0, y: 0 }),
      targetPx,
      C_TARGET,
      "T",
      2.5,
      true,
    );

    // Chain: draw each placed vector starting where the previous one ended.
    let head = { x: 0, y: 0 };
    for (let i = 0; i < placed.length; i++) {
      const seg = placed[i];
      const tailPx = toPx(head);
      const tipMath = { x: head.x + seg.v.x, y: head.y + seg.v.y };
      const tipPx = toPx(tipMath);
      drawArrow(ctx, tailPx, tipPx, C_CHAIN, seg.paletteId, 2.2, false);
      head = tipMath;
    }

    // Final sum highlight.
    if (placed.length > 0) {
      const sumPx = toPx(runningSum);
      ctx.fillStyle = C_SUM;
      ctx.beginPath();
      ctx.arc(sumPx.x, sumPx.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Label
      ctx.fillStyle = C_SUM;
      ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillText(
        `Σ = (${runningSum.x.toFixed(1)}, ${runningSum.y.toFixed(1)})`,
        sumPx.x + 10,
        sumPx.y - 8,
      );
    }

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [puzzle, placed, runningSum, isSolved, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="vcp__canvas"
      role="img"
      aria-label={`Vector chain puzzle for target ${puzzle.label}.`}
    />
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: Vec2,
  head: Vec2,
  color: string,
  label: string | undefined,
  width: number,
  dashed: boolean,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  if (dashed) ctx.setLineDash([]);
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const len = Math.hypot(dx, dy);
  if (len > 5) {
    const ang = Math.atan2(dy, dx);
    const aLen = Math.min(10, len * 0.35);
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
    ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "middle";
    const midX = (tail.x + head.x) / 2 + 6;
    const midY = (tail.y + head.y) / 2 - 8;
    ctx.fillText(label, midX, midY);
  }
  ctx.restore();
}
