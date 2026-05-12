/**
 * TransformationOrdering — drag-to-order card game for matrix multiplication.
 *
 * Used by:
 *   - linear-algebra-matrix-operations
 *
 * THIS IS AN ORDERING PUZZLE. The reader has a palette of transformation
 * cards (Rotate, Shear, Scale, Reflect, etc.) and a sequence slot. They
 * drag cards into the sequence; the composed transformation is applied
 * to the unit square; the resulting shape is compared to a target.
 *
 * The pedagogical centerpiece is order. The same set of cards in
 * different orders produces wildly different shapes. The reader is
 * forced to internalise that matrix multiplication is NON-COMMUTATIVE —
 * not by being told, but by trying orderings and watching what happens.
 *
 * UX:
 *   - Palette of 5 cards at the bottom (each is a labelled transformation).
 *   - Sequence row at the top — reader clicks cards from palette to
 *     append, or clicks cards in the sequence to remove.
 *   - Canvas shows the current composed transformation's action on the
 *     unit square, alongside the target's image (drawn dashed).
 *   - Score: distance between composed-image and target. Threshold-based
 *     "solved" state.
 *   - Multiple ordering solutions accepted; the widget grades on outcome,
 *     not on a fixed sequence.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./TransformationOrdering.css";

const CANVAS_SIZE = 320;
const SOLVED_EPS = 0.18;

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

const IDENTITY: Matrix2 = { a: 1, b: 0, c: 0, d: 1 };

function multiply(M: Matrix2, N: Matrix2): Matrix2 {
  return {
    a: M.a * N.a + M.b * N.c,
    b: M.a * N.b + M.b * N.d,
    c: M.c * N.a + M.d * N.c,
    d: M.c * N.b + M.d * N.d,
  };
}

function apply(M: Matrix2, p: Vec2): Vec2 {
  return { x: M.a * p.x + M.b * p.y, y: M.c * p.x + M.d * p.y };
}

interface TransformCard {
  id: string;
  label: string;
  matrix: Matrix2;
}

const CARDS: TransformCard[] = [
  { id: "rot90", label: "Rotate 90°", matrix: { a: 0, b: -1, c: 1, d: 0 } },
  { id: "shx", label: "Shear-x (+1)", matrix: { a: 1, b: 1, c: 0, d: 1 } },
  { id: "scx", label: "Scale x ×2", matrix: { a: 2, b: 0, c: 0, d: 1 } },
  { id: "scy", label: "Scale y ×2", matrix: { a: 1, b: 0, c: 0, d: 2 } },
  { id: "refy", label: "Reflect y-axis", matrix: { a: -1, b: 0, c: 0, d: 1 } },
];

interface Puzzle {
  label: string;
  target: Matrix2;
  hint?: string;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Stretched 90° rotation",
    target: multiply({ a: 2, b: 0, c: 0, d: 1 }, { a: 0, b: -1, c: 1, d: 0 }),
    hint: "Rotate first, then scale-x.",
  },
  {
    label: "Sheared then turned",
    target: multiply({ a: 0, b: -1, c: 1, d: 0 }, { a: 1, b: 1, c: 0, d: 1 }),
    hint: "Shear-x first, then rotate 90°. Note the result differs from the reversed order!",
  },
  {
    label: "Stretched reflection",
    target: multiply({ a: 1, b: 0, c: 0, d: 2 }, { a: -1, b: 0, c: 0, d: 1 }),
    hint: "Reflect across the y-axis, then scale y vertically.",
  },
  {
    label: "Double rotation",
    target: multiply({ a: 0, b: -1, c: 1, d: 0 }, { a: 0, b: -1, c: 1, d: 0 }),
    hint: "Apply the same rotation twice — equivalent to 180°.",
  },
];

function composeSequence(seq: string[]): Matrix2 {
  // Cards are applied in reading order: the leftmost card is applied FIRST
  // (innermost). So composed = last × ... × first.
  let result = IDENTITY;
  for (const id of seq) {
    const card = CARDS.find((c) => c.id === id);
    if (!card) continue;
    result = multiply(card.matrix, result);
  }
  return result;
}

function matrixDistance(A: Matrix2, B: Matrix2): number {
  return Math.sqrt(
    (A.a - B.a) ** 2 + (A.b - B.b) ** 2 + (A.c - B.c) ** 2 + (A.d - B.d) ** 2,
  );
}

interface TransformationOrderingProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function TransformationOrdering({
  onStateChange,
}: TransformationOrderingProps) {
  const { recordInteraction } = useWidgetTelemetry("TransformationOrdering");
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);

  const puzzle = PUZZLES[puzzleIdx];
  const composed = useMemo(() => composeSequence(sequence), [sequence]);
  const distance = matrixDistance(composed, puzzle.target);
  const isSolved = distance < SOLVED_EPS;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      sequence_length: sequence.length,
      distance: Number(distance.toFixed(3)),
      solved: isSolved ? 1 : 0,
    });
  }, [puzzleIdx, sequence.length, distance, isSolved, onStateChange]);

  const stateSummary = useMemo(() => {
    const seqStr =
      sequence.length === 0
        ? "no cards placed"
        : sequence
            .map((id) => CARDS.find((c) => c.id === id)?.label ?? id)
            .join(" → ");
    const status = isSolved
      ? `SOLVED in ${sequence.length} cards — composed matrix matches target.`
      : `Distance to target = ${distance.toFixed(2)} — keep trying.`;
    return `Puzzle: ${puzzle.label}. Sequence: ${seqStr}. Composed = [[${composed.a.toFixed(2)}, ${composed.b.toFixed(2)}], [${composed.c.toFixed(2)}, ${composed.d.toFixed(2)}]]. Target = [[${puzzle.target.a.toFixed(2)}, ${puzzle.target.b.toFixed(2)}], [${puzzle.target.c.toFixed(2)}, ${puzzle.target.d.toFixed(2)}]]. ${status}`;
  }, [sequence, isSolved, distance, puzzle, composed]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        seq: sequence,
        solved: isSolved,
      }),
    [puzzleIdx, sequence, isSolved],
  );

  const handleAppend = useCallback(
    (id: string) => {
      setSequence((prev) => [...prev, id]);
      recordInteraction("append", { card: id, length: sequence.length + 1 });
    },
    [recordInteraction, sequence.length],
  );

  const handleRemove = useCallback(
    (idx: number) => {
      setSequence((prev) => prev.filter((_, i) => i !== idx));
      recordInteraction("remove", { index: idx });
    },
    [recordInteraction],
  );

  const handleReset = useCallback(() => {
    setSequence([]);
    recordInteraction("reset");
  }, [recordInteraction]);

  const handleSwapAdjacent = useCallback(
    (idx: number) => {
      if (idx >= sequence.length - 1) return;
      setSequence((prev) => {
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      });
      recordInteraction("swap", { i: idx, j: idx + 1 });
    },
    [recordInteraction, sequence.length],
  );

  const handlePuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      setSequence([]);
      recordInteraction("puzzle", { puzzle: PUZZLES[idx].label });
    },
    [recordInteraction],
  );

  return (
    <div className={`to${isSolved ? " to--solved" : ""}`}>
      <header className="to__head">
        <div className="to__heading">
          <span className="to__heading-label">PUZZLE</span>
          <span className="to__heading-value">{puzzle.label}</span>
        </div>
        <div className="to__heading">
          <span className="to__heading-label">SEQUENCE</span>
          <span className="to__heading-value">
            {sequence.length === 0
              ? "(empty)"
              : `${sequence.length} card${sequence.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="to__heading">
          <span className="to__heading-label">DISTANCE</span>
          <span
            className={`to__heading-value${
              isSolved ? " to__heading-value--ok" : ""
            }`}
          >
            {distance.toFixed(3)}
          </span>
        </div>
      </header>

      <SequenceCanvas
        composed={composed}
        target={puzzle.target}
        isSolved={isSolved}
      />

      <div className="to__sequence">
        <span className="to__sequence-label">CURRENT SEQUENCE (applied left → right):</span>
        {sequence.length === 0 ? (
          <span className="to__sequence-empty">
            Click cards from the palette below to add them. They compose left-to-right (leftmost applies first).
          </span>
        ) : (
          <div className="to__sequence-row">
            {sequence.map((id, i) => {
              const card = CARDS.find((c) => c.id === id);
              if (!card) return null;
              return (
                <div key={`${id}-${i}`} className="to__seq-card-wrap">
                  <button
                    type="button"
                    className="to__seq-card"
                    onClick={() => handleRemove(i)}
                    title="Remove from sequence"
                  >
                    {card.label}
                    <span className="to__seq-card-x">×</span>
                  </button>
                  {i < sequence.length - 1 && (
                    <button
                      type="button"
                      className="to__swap-btn"
                      onClick={() => handleSwapAdjacent(i)}
                      title="Swap with next card"
                    >
                      ⇄
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="to__reset"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      <div className="to__palette">
        <span className="to__palette-label">PALETTE — click to append</span>
        <div className="to__palette-row">
          {CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="to__card"
              onClick={() => handleAppend(c.id)}
              disabled={isSolved}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`to__verdict to__verdict--${
          isSolved ? "solved" : "working"
        }`}
      >
        <span className="to__verdict-label">Status</span>
        <span className="to__verdict-value">
          {isSolved
            ? `✓ Solved — your sequence's composition matches the target. Try the swap (⇄) button to see what reversing two cards does to the result!`
            : puzzle.hint
            ? `Working — distance ${distance.toFixed(2)}. Hint: ${puzzle.hint}`
            : `Working — distance ${distance.toFixed(2)}.`}
        </span>
      </div>

      <div className="to__puzzle-row">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`to__puzzle-pick${i === puzzleIdx ? " to__puzzle-pick--active" : ""}`}
            onClick={() => handlePuzzle(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <WidgetExplainer
        widgetName="Transformation ordering — drag cards to compose"
        widgetDescription="An ordering-puzzle widget for matrix composition. The reader is given a target transformation (its image of the unit square is drawn dashed on the canvas) and a palette of 5 named transformation cards: Rotate 90°, Shear-x, Scale-x, Scale-y, Reflect-y. The reader clicks palette cards to append them to a sequence; the sequence composes left-to-right (leftmost applies first, like reading order). The widget computes the composed matrix and draws its action on the unit square in real time, comparing the result to the target. When the matrix-norm distance between composed and target drops below ε, the puzzle is solved. The reader can remove any card from the sequence by clicking it, swap adjacent cards with a ⇄ button (excellent for demonstrating non-commutativity — swap two cards, see the resulting shape change), or reset. Four built-in puzzles, each with a hint about the intended ordering. The pedagogical point is that ordering MATTERS — matrix multiplication is non-commutative, and two readers who choose the same cards in different orders will reach different final shapes."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface SequenceCanvasProps {
  composed: Matrix2;
  target: Matrix2;
  isSolved: boolean;
}

function SequenceCanvas({
  composed,
  target,
  isSolved,
}: SequenceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(() => {
    const corners: Vec2[] = [
      { x: 0, y: 0 },
      apply(composed, { x: 1, y: 0 }),
      apply(composed, { x: 0, y: 1 }),
      apply(composed, { x: 1, y: 1 }),
      apply(target, { x: 1, y: 0 }),
      apply(target, { x: 0, y: 1 }),
      apply(target, { x: 1, y: 1 }),
    ];
    return computeDomain(corners, { padding: 1.4, floor: 2.5, ceiling: 7 });
  }, [composed, target]);

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_COMPOSED = isSolved
      ? resolveColor("var(--widget-success)")
      : resolveColor("var(--widget-chart-1)");
    const C_TARGET = resolveColor("var(--widget-chart-3)");
    const C_COMPOSED_FILL = isSolved
      ? resolveColorAlpha("var(--widget-success)", 0.16)
      : resolveColorAlpha("var(--widget-chart-1)", 0.14);
    const C_TEXT = resolveColor("var(--widget-text)");

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

    // Original unit square (light dashed).
    drawShape(
      ctx,
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      toPx,
      "rgba(255, 255, 255, 0.32)",
      "transparent",
      1.2,
      true,
    );

    // Target shape (dashed yellow).
    drawTransformedSquare(
      ctx,
      target,
      toPx,
      C_TARGET,
      resolveColorAlpha("var(--widget-chart-3)", 0.08),
      2,
      true,
    );

    // Composed shape (solid).
    drawTransformedSquare(
      ctx,
      composed,
      toPx,
      C_COMPOSED,
      C_COMPOSED_FILL,
      2,
      false,
    );

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Legend.
    ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = C_TARGET;
    ctx.fillText("Target (dashed)", 12, 10);
    ctx.fillStyle = C_COMPOSED;
    ctx.fillText("Your composition", 12, 26);
  }, [composed, target, isSolved, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="to__canvas"
      role="img"
      aria-label="Transformation ordering canvas — composed action vs target."
    />
  );
}

function drawTransformedSquare(
  ctx: CanvasRenderingContext2D,
  M: Matrix2,
  toPx: (p: Vec2) => Vec2,
  stroke: string,
  fill: string,
  width: number,
  dashed: boolean,
) {
  drawShape(
    ctx,
    [
      apply(M, { x: 0, y: 0 }),
      apply(M, { x: 1, y: 0 }),
      apply(M, { x: 1, y: 1 }),
      apply(M, { x: 0, y: 1 }),
    ],
    toPx,
    stroke,
    fill,
    width,
    dashed,
  );
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Vec2[],
  toPx: (p: Vec2) => Vec2,
  stroke: string,
  fill: string,
  width: number,
  dashed: boolean,
) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath();
  shape.forEach((p, i) => {
    const px = toPx(p);
    if (i === 0) ctx.moveTo(px.x, px.y);
    else ctx.lineTo(px.x, px.y);
  });
  ctx.closePath();
  if (fill !== "transparent") ctx.fill();
  ctx.stroke();
  ctx.restore();
}
