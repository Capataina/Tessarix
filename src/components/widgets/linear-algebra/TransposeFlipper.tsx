/**
 * TransposeFlipper — free-form swap puzzle for matrix transpose.
 *
 * Used by:
 *   - linear-algebra-matrix-operations
 *
 * THIS IS A SWAP PUZZLE. A 3×3 matrix is shown. To produce its
 * transpose, the reader clicks pairs of entries to SWAP them. Diagonal
 * entries are locked (they don't move under transposition). The goal is
 * to reach the transposed matrix in the minimum number of swaps.
 *
 * The minimum is exactly 3 — there are three off-diagonal pairs in a
 * 3×3 matrix that need to swap: (1,2) ↔ (2,1), (1,3) ↔ (3,1), (2,3) ↔
 * (3,2). Each pair is one swap; three pairs are three swaps. Anything
 * higher than 3 means the reader swapped the same pair twice (an
 * involution) or did something else inefficient.
 *
 * Pedagogy: transpose IS the reflection across the diagonal. The
 * widget makes this geometric fact tactile — every swap is a literal
 * mirror move, and the reader feels the symmetry rule from doing the
 * swaps rather than reading about it.
 *
 * UX:
 *   - 3×3 matrix shown in the centre. Each cell is a clickable button.
 *   - Diagonal cells styled differently (locked) — click does nothing.
 *   - Click an off-diagonal cell → it becomes "armed" (cyan ring).
 *   - Click another off-diagonal cell → if it's the mirror, the swap
 *     happens; if not, it becomes the new armed cell.
 *   - Move counter ticks each accepted swap.
 *   - "Target" panel on the right shows the transposed matrix.
 *   - When current matches target, win state — verdict shows reader's
 *     score (3 = perfect; >3 = redundant moves).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./TransposeFlipper.css";

type Cell = number;

/** A 3×3 matrix in row-major order. Indexed by (i, j) where i, j ∈ {0, 1, 2}. */
type Matrix3 = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

const SIZE = 3;
const MIN_SWAPS = 3;
const MAX_SWAPS_TRACKED = 30;

interface Puzzle {
  label: string;
  start: Matrix3;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Symmetric-ish",
    // Each off-diagonal pair has a clearly different value, so swaps are unambiguous.
    start: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const,
  },
  {
    label: "Mixed signs",
    start: [0, -1, 2, 4, 1, -3, -5, 6, 0] as const,
  },
  {
    label: "Already symmetric",
    // This matrix equals its own transpose — 0 swaps needed. Pedagogical
    // moment: symmetric matrices are exactly the matrices that are their
    // own transpose. The widget recognises this and explains it.
    start: [2, 5, 7, 5, 1, 8, 7, 8, 3] as const,
  },
  {
    label: "Decimals",
    // Off-diagonal pairs all distinct, each ≠ its mirror — three swaps
    // required, no ambiguity.
    start: [1, -2, 0.5, 4, 3, -1, -0.5, 2, 5] as const,
  },
];

function idx(i: number, j: number): number {
  return i * SIZE + j;
}

function ij(k: number): { i: number; j: number } {
  return { i: Math.floor(k / SIZE), j: k % SIZE };
}

function isDiagonal(k: number): boolean {
  const { i, j } = ij(k);
  return i === j;
}

function mirror(k: number): number {
  const { i, j } = ij(k);
  return idx(j, i);
}

function transpose(M: Matrix3): Matrix3 {
  return [
    M[0],
    M[3],
    M[6],
    M[1],
    M[4],
    M[7],
    M[2],
    M[5],
    M[8],
  ] as const;
}

function matrixEq(M: Matrix3, N: Matrix3): boolean {
  for (let k = 0; k < 9; k++) if (M[k] !== N[k]) return false;
  return true;
}

interface TransposeFlipperProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function TransposeFlipper({ onStateChange }: TransposeFlipperProps) {
  const { recordInteraction } = useWidgetTelemetry("TransposeFlipper");
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [current, setCurrent] = useState<Matrix3>(() => PUZZLES[0].start);
  const [armed, setArmed] = useState<number | null>(null);
  const [swaps, setSwaps] = useState(0);

  const puzzle = PUZZLES[puzzleIdx];
  const target = useMemo(() => transpose(puzzle.start), [puzzle]);
  const solved = matrixEq(current, target);

  const elegant = solved && swaps === MIN_SWAPS;
  // "Trivially solved" — when the starting matrix is already symmetric for some
  // pair OR all off-diagonals are zero, the target equals start and the puzzle
  // is solved at 0 swaps. Not the case for any of the curated puzzles but the
  // guard is cheap.
  const trivialSolved = solved && swaps === 0;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      swaps,
      solved: solved ? 1 : 0,
      elegant: elegant ? 1 : 0,
      min_swaps: MIN_SWAPS,
    });
  }, [puzzleIdx, swaps, solved, elegant, onStateChange]);

  const handleCellClick = useCallback(
    (k: number) => {
      if (solved) return;
      if (isDiagonal(k)) return; // locked
      if (armed === null) {
        setArmed(k);
        recordInteraction("arm", { cell: k });
        return;
      }
      if (armed === k) {
        // Clicking the same cell deselects.
        setArmed(null);
        recordInteraction("disarm", { cell: k });
        return;
      }
      // Only the mirror is a legal swap target.
      if (mirror(armed) !== k) {
        // Re-arm to the new cell — that's a friendlier failure than rejecting
        // outright, because the reader's most common second click is "the cell
        // I actually wanted to start with".
        setArmed(k);
        recordInteraction("rearm", { from: armed, to: k });
        return;
      }
      // Swap armed and k.
      setCurrent((prev) => {
        const next = [...prev] as Cell[];
        const tmp = next[armed];
        next[armed] = next[k];
        next[k] = tmp;
        return next as unknown as Matrix3;
      });
      setSwaps((n) => Math.min(n + 1, MAX_SWAPS_TRACKED));
      setArmed(null);
      recordInteraction("swap", { a: armed, b: k });
    },
    [armed, solved, recordInteraction],
  );

  const handlePuzzle = useCallback(
    (i: number) => {
      setPuzzleIdx(i);
      setCurrent(PUZZLES[i].start);
      setArmed(null);
      setSwaps(0);
      recordInteraction("new_puzzle", { puzzle: PUZZLES[i].label });
    },
    [recordInteraction],
  );

  const handleReset = useCallback(() => {
    setCurrent(puzzle.start);
    setArmed(null);
    setSwaps(0);
    recordInteraction("reset");
  }, [puzzle, recordInteraction]);

  const stateSummary = useMemo(() => {
    const status = solved
      ? elegant
        ? `Solved in ${swaps} swaps — the minimum.`
        : `Solved in ${swaps} swaps (minimum is ${MIN_SWAPS}; the reader used ${swaps - MIN_SWAPS} redundant swap${swaps - MIN_SWAPS === 1 ? "" : "s"}).`
      : `${swaps} swap${swaps === 1 ? "" : "s"} so far, not yet matching target.`;
    const cur = `[[${current[0]}, ${current[1]}, ${current[2]}], [${current[3]}, ${current[4]}, ${current[5]}], [${current[6]}, ${current[7]}, ${current[8]}]]`;
    const tgt = `[[${target[0]}, ${target[1]}, ${target[2]}], [${target[3]}, ${target[4]}, ${target[5]}], [${target[6]}, ${target[7]}, ${target[8]}]]`;
    return `Transpose Flipper — puzzle "${puzzle.label}". Current = ${cur}. Target (start^T) = ${tgt}. ${status}${armed !== null ? ` Armed cell: (${Math.floor(armed / 3) + 1}, ${(armed % 3) + 1}).` : ""}`;
  }, [current, target, puzzle, solved, elegant, swaps, armed]);

  const stateKey = useMemo(
    () => JSON.stringify({ puzzle: puzzleIdx, current, swaps, solved }),
    [puzzleIdx, current, swaps, solved],
  );

  return (
    <div
      className={`tf${solved ? (elegant ? " tf--elegant" : " tf--solved") : ""}`}
    >
      <header className="tf__head">
        <div className="tf__heading">
          <span className="tf__heading-label">PUZZLE</span>
          <span className="tf__heading-value">{puzzle.label}</span>
        </div>
        <div className="tf__heading">
          <span className="tf__heading-label">SWAPS</span>
          <span
            className={`tf__heading-value${
              solved
                ? elegant
                  ? " tf__heading-value--ok"
                  : " tf__heading-value--warn"
                : ""
            }`}
          >
            {swaps} (min {MIN_SWAPS})
          </span>
        </div>
        <div className="tf__heading">
          <span className="tf__heading-label">STATUS</span>
          <span
            className={`tf__heading-value${
              solved ? " tf__heading-value--ok" : ""
            }`}
          >
            {solved ? "✓ matches Aᵀ" : "in progress"}
          </span>
        </div>
      </header>

      <div className="tf__boards">
        <MatrixBoard
          label="Current"
          M={current}
          armed={armed}
          target={target}
          interactive
          onCellClick={handleCellClick}
        />
        <div className="tf__arrow">→</div>
        <MatrixBoard label="Target (Aᵀ)" M={target} armed={null} interactive={false} />
      </div>

      <div
        className={`tf__verdict tf__verdict--${
          !solved ? "idle" : elegant ? "elegant" : "ok"
        }`}
      >
        <span className="tf__verdict-label">{solved ? "Solved" : "Hint"}</span>
        <span className="tf__verdict-value">
          {!solved &&
            armed === null &&
            `Click an off-diagonal entry to "arm" it. Then click its mirror across the main diagonal (the cell at (j, i) if you armed (i, j)) to swap them. The diagonal entries (cyan) don't move — transposition leaves them where they are.`}
          {!solved &&
            armed !== null &&
            `Cell (${Math.floor(armed / 3) + 1}, ${(armed % 3) + 1}) is armed. Now click cell (${(armed % 3) + 1}, ${Math.floor(armed / 3) + 1}) — its mirror across the diagonal — to swap them.`}
          {solved && elegant &&
            `✓ Perfect — ${MIN_SWAPS} swaps, the minimum. There are exactly three off-diagonal pairs in a 3×3 ((1,2)↔(2,1), (1,3)↔(3,1), (2,3)↔(3,2)) and you swapped each one exactly once.`}
          {solved && !elegant && !trivialSolved &&
            `Solved in ${swaps} swaps — works, but the minimum is ${MIN_SWAPS}. Each extra swap is a redundant move (probably you swapped the same pair twice, returning to the original).`}
          {trivialSolved &&
            "This matrix is symmetric — it equals its own transpose, so no swaps are needed."}
        </span>
      </div>

      <div className="tf__actions">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`tf__puzzle-pick${i === puzzleIdx ? " tf__puzzle-pick--active" : ""}`}
            onClick={() => handlePuzzle(i)}
          >
            {p.label}
          </button>
        ))}
        <button type="button" className="tf__reset" onClick={handleReset}>
          Reset
        </button>
      </div>

      <WidgetExplainer
        widgetName="Transpose Flipper — swap pairs to reach Aᵀ"
        widgetDescription="A swap puzzle for matrix transposition. The reader sees a 3×3 matrix and must reach its transpose by swapping pairs of off-diagonal entries. Each swap is performed by clicking one entry to arm it (cyan ring), then clicking the entry at its mirror position across the main diagonal — i.e. if the reader armed entry (i, j), the legal partner is (j, i). Clicking the wrong partner re-arms; clicking the diagonal does nothing (diagonal entries don't move under transposition). The widget tracks a swap counter. The minimum is exactly 3 — there are three distinct off-diagonal pairs in a 3×3, and each one needs to swap exactly once. Solving in more than 3 swaps means the reader has accidentally swapped the same pair twice (returning to the prior state). The pedagogical point is that transpose IS the reflection across the diagonal — every swap is a literal mirror move, and 3-swap solutions show the reader has internalised exactly which entries move and which don't."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface MatrixBoardProps {
  label: string;
  M: Matrix3;
  armed: number | null;
  target?: Matrix3;
  interactive: boolean;
  onCellClick?: (k: number) => void;
}

function MatrixBoard({
  label,
  M,
  armed,
  target,
  interactive,
  onCellClick,
}: MatrixBoardProps) {
  return (
    <div className={`tf__board${interactive ? " tf__board--live" : ""}`}>
      <div className="tf__board-label">{label}</div>
      <div className="tf__matrix">
        <span className="tf__bracket tf__bracket--left" />
        <div className="tf__grid">
          {Array.from({ length: 9 }, (_, k) => {
            const onDiag = isDiagonal(k);
            const isArmed = armed === k;
            const isMirrorOfArmed = armed !== null && mirror(armed) === k;
            const matchesTarget = target !== undefined && M[k] === target[k];
            const cellClass = [
              "tf__cell",
              onDiag ? "tf__cell--diag" : "",
              isArmed ? "tf__cell--armed" : "",
              isMirrorOfArmed ? "tf__cell--mirror" : "",
              interactive && target && !onDiag && matchesTarget
                ? "tf__cell--good"
                : "",
              interactive && target && !onDiag && !matchesTarget
                ? "tf__cell--bad"
                : "",
              !interactive ? "tf__cell--readonly" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={k}
                type="button"
                className={cellClass}
                disabled={!interactive || onDiag}
                onClick={interactive ? () => onCellClick?.(k) : undefined}
                aria-label={`Entry (${Math.floor(k / 3) + 1}, ${(k % 3) + 1}) value ${M[k]}`}
              >
                {M[k]}
              </button>
            );
          })}
        </div>
        <span className="tf__bracket tf__bracket--right" />
      </div>
    </div>
  );
}
