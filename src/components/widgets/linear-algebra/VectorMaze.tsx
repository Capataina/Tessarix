/**
 * VectorMaze — path-navigation game where moves ARE vectors.
 *
 * Used by:
 *   - linear-algebra (the foundations primer, vector-addition section)
 *
 * THIS IS A MINIGAME. The reader controls a position on a grid. Each
 * move is a vector chosen from a fixed action set (ê₁ = (1,0),
 * ê₂ = (0,1), ê₁+ê₂ = (1,1), -ê₁ = (-1,0), etc.). The goal: reach the
 * exit cell. Walls block specific moves; some boards have a move
 * budget so a wasteful path runs out of moves.
 *
 * Pedagogy: vector addition AS TRANSLATION. The player's position
 * after n moves is literally the sum of the first n chosen action
 * vectors. The destination depends only on the *multiset* of moves
 * chosen, not the order — but the *path* depends on the order, and
 * the walls make some orders impossible. The widget makes the
 * "destination doesn't care about order; path does" insight
 * directly playable, not merely told.
 *
 * Mechanics:
 *   - Click an action tile in the action palette to apply that move.
 *   - If the move would cross a wall or leave the bounds, it's
 *     refused and a brief flash indicates rejection.
 *   - Running sum is shown as a chip-strip; clicking a chip undoes
 *     all moves up to and including that one.
 *   - Each puzzle has a move budget; running out fails the puzzle.
 *   - Reset button restores the starting position.
 *
 * Implements metaphor library §1 (iterated operation) and §10
 * (constructive build-up) — the player builds the total translation
 * vector ONE move at a time and watches the running sum accumulate.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./VectorMaze.css";

const CANVAS_SIZE = 360;

interface Vec2 {
  x: number;
  y: number;
}

interface Action {
  id: string;
  label: string;
  v: Vec2;
}

/** A wall segment between two adjacent cells, expressed as the cell on the
 * "negative" side and the direction normal. We use an undirected
 * representation: a wall between (1,2) and (2,2) is stored once. */
interface Wall {
  /** The cell whose right/top edge the wall is. */
  cell: Vec2;
  /** "right" wall (between cell.x and cell.x+1 at row cell.y), or
   *  "top" wall (between cell.y and cell.y+1 at col cell.x). */
  side: "right" | "top";
}

interface Puzzle {
  label: string;
  /** Grid extent: 0..width-1, 0..height-1. */
  width: number;
  height: number;
  start: Vec2;
  goal: Vec2;
  actions: Action[];
  walls: Wall[];
  moveBudget: number;
  hint?: string;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Straight shot — only ê₁ and ê₂",
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    goal: { x: 3, y: 2 },
    actions: [
      { id: "e1", label: "ê₁", v: { x: 1, y: 0 } },
      { id: "e2", label: "ê₂", v: { x: 0, y: 1 } },
    ],
    walls: [],
    moveBudget: 6,
    hint:
      "Three ê₁ and two ê₂ reach (3, 2) — in any order. Pick the order the walls allow.",
  },
  {
    label: "Diagonal moves — ê₁+ê₂ available",
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    goal: { x: 3, y: 3 },
    actions: [
      { id: "e1", label: "ê₁", v: { x: 1, y: 0 } },
      { id: "e2", label: "ê₂", v: { x: 0, y: 1 } },
      { id: "diag", label: "ê₁+ê₂", v: { x: 1, y: 1 } },
    ],
    walls: [],
    moveBudget: 4,
    hint:
      "Three diagonal moves land at (3, 3). With a budget of 4 you have slack to undo one mistake.",
  },
  {
    label: "Walls — backtracking with -ê₁",
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    goal: { x: 4, y: 2 },
    actions: [
      { id: "e1", label: "ê₁", v: { x: 1, y: 0 } },
      { id: "e2", label: "ê₂", v: { x: 0, y: 1 } },
      { id: "ne1", label: "-ê₁", v: { x: -1, y: 0 } },
    ],
    // A vertical wall splits the row y=1 between x=2 and x=3.
    walls: [
      { cell: { x: 2, y: 0 }, side: "right" },
      { cell: { x: 2, y: 1 }, side: "right" },
    ],
    moveBudget: 9,
    hint:
      "The wall blocks moving straight right at y∈{0,1}. Go UP first, then right past the wall, then down.",
  },
  {
    label: "Negative directions — reach (-1, 2)",
    width: 5,
    height: 5,
    start: { x: 2, y: 0 },
    goal: { x: 1, y: 2 },
    actions: [
      { id: "e1", label: "ê₁", v: { x: 1, y: 0 } },
      { id: "e2", label: "ê₂", v: { x: 0, y: 1 } },
      { id: "ne1", label: "-ê₁", v: { x: -1, y: 0 } },
      { id: "diag", label: "ê₁+ê₂", v: { x: 1, y: 1 } },
    ],
    walls: [],
    moveBudget: 6,
    hint:
      "Net displacement is (-1, +2). One -ê₁ plus two ê₂ (in any order) does it in three moves.",
  },
];

function addV(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function inBounds(p: Vec2, w: number, h: number): boolean {
  return p.x >= 0 && p.x < w && p.y >= 0 && p.y < h;
}

/** True if any step from `from` to `to` (which differ by a single ±1 in one
 *  axis at a time across a multi-axis move) would cross a wall. We
 *  decompose the move into axis-aligned single-cell steps and check each. */
function blockedByWalls(from: Vec2, to: Vec2, walls: Wall[]): boolean {
  // Decompose: do all x-steps first, then all y-steps. Then also try y-first.
  // If EITHER path is clear, the move is OK — gives the reader the benefit
  // of any clear route. (Walls usually force a choice anyway.)
  function pathClear(order: "xy" | "yx"): boolean {
    let cur = { ...from };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const stepsX = Math.abs(dx);
    const stepsY = Math.abs(dy);
    const queue: ("x" | "y")[] =
      order === "xy"
        ? [...Array(stepsX).fill("x"), ...Array(stepsY).fill("y")]
        : [...Array(stepsY).fill("y"), ...Array(stepsX).fill("x")];
    for (const axis of queue) {
      if (axis === "x") {
        const fromCellX = cur.x;
        const toCellX = cur.x + stepX;
        // Wall between fromCellX and toCellX at row cur.y:
        // a "right" wall on cell (min, cur.y).
        const minX = Math.min(fromCellX, toCellX);
        const hit = walls.some(
          (w) =>
            w.side === "right" && w.cell.x === minX && w.cell.y === cur.y,
        );
        if (hit) return false;
        cur = { x: toCellX, y: cur.y };
      } else {
        const fromCellY = cur.y;
        const toCellY = cur.y + stepY;
        const minY = Math.min(fromCellY, toCellY);
        const hit = walls.some(
          (w) =>
            w.side === "top" && w.cell.y === minY && w.cell.x === cur.x,
        );
        if (hit) return false;
        cur = { x: cur.x, y: toCellY };
      }
    }
    return true;
  }
  return !(pathClear("xy") || pathClear("yx"));
}

interface VectorMazeProps {
  initialPuzzle?: number;
  onStateChange?: (state: Record<string, number>) => void;
}

export function VectorMaze({
  initialPuzzle = 0,
  onStateChange,
}: VectorMazeProps) {
  const { recordInteraction } = useWidgetTelemetry("VectorMaze");
  const [puzzleIdx, setPuzzleIdx] = useState(initialPuzzle);
  const [moves, setMoves] = useState<string[]>([]);
  const [rejectionFlash, setRejectionFlash] = useState<number>(0);

  const puzzle = PUZZLES[puzzleIdx];
  const actionMap = useMemo(() => {
    const m = new Map<string, Action>();
    for (const a of puzzle.actions) m.set(a.id, a);
    return m;
  }, [puzzle]);

  // Sequence of positions, starting at start. positions[i] = position AFTER
  // applying the first i moves. positions[0] is the start.
  const positions = useMemo(() => {
    const seq: Vec2[] = [puzzle.start];
    let cur = puzzle.start;
    for (const id of moves) {
      const a = actionMap.get(id);
      if (!a) continue;
      cur = addV(cur, a.v);
      seq.push(cur);
    }
    return seq;
  }, [moves, puzzle.start, actionMap]);

  const currentPos = positions[positions.length - 1];
  const runningSum: Vec2 = {
    x: currentPos.x - puzzle.start.x,
    y: currentPos.y - puzzle.start.y,
  };
  const targetSum: Vec2 = {
    x: puzzle.goal.x - puzzle.start.x,
    y: puzzle.goal.y - puzzle.start.y,
  };

  const reachedGoal = currentPos.x === puzzle.goal.x && currentPos.y === puzzle.goal.y;
  const outOfMoves = !reachedGoal && moves.length >= puzzle.moveBudget;
  const movesLeft = puzzle.moveBudget - moves.length;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      moves_used: moves.length,
      moves_left: movesLeft,
      pos_x: currentPos.x,
      pos_y: currentPos.y,
      goal_x: puzzle.goal.x,
      goal_y: puzzle.goal.y,
      sum_x: runningSum.x,
      sum_y: runningSum.y,
      reached: reachedGoal ? 1 : 0,
      out_of_moves: outOfMoves ? 1 : 0,
    });
  }, [
    puzzleIdx,
    moves.length,
    movesLeft,
    currentPos.x,
    currentPos.y,
    puzzle.goal.x,
    puzzle.goal.y,
    runningSum.x,
    runningSum.y,
    reachedGoal,
    outOfMoves,
    onStateChange,
  ]);

  const stateSummary = useMemo(() => {
    const moveChain =
      moves.length === 0
        ? "no moves yet"
        : moves
            .map((id) => actionMap.get(id)?.label ?? id)
            .join(" + ");
    const status = reachedGoal
      ? `REACHED the goal in ${moves.length} moves (budget ${puzzle.moveBudget}).`
      : outOfMoves
      ? `OUT OF MOVES — at (${currentPos.x}, ${currentPos.y}), goal is (${puzzle.goal.x}, ${puzzle.goal.y}). Reset and replan.`
      : `Position (${currentPos.x}, ${currentPos.y}); goal (${puzzle.goal.x}, ${puzzle.goal.y}); ${movesLeft} moves left.`;
    return `Vector maze "${puzzle.label}" — running sum from start = (${runningSum.x}, ${runningSum.y}); target displacement = (${targetSum.x}, ${targetSum.y}). Chain: ${moveChain}. ${status}`;
  }, [
    puzzle.label,
    puzzle.moveBudget,
    puzzle.goal.x,
    puzzle.goal.y,
    moves,
    actionMap,
    reachedGoal,
    outOfMoves,
    currentPos.x,
    currentPos.y,
    movesLeft,
    runningSum.x,
    runningSum.y,
    targetSum.x,
    targetSum.y,
  ]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        moves,
        reached: reachedGoal,
        out: outOfMoves,
      }),
    [puzzleIdx, moves, reachedGoal, outOfMoves],
  );

  const handleApply = useCallback(
    (a: Action) => {
      if (reachedGoal || outOfMoves) return;
      const next = addV(currentPos, a.v);
      if (!inBounds(next, puzzle.width, puzzle.height)) {
        setRejectionFlash((n) => n + 1);
        recordInteraction("reject_bounds", { action: a.id });
        return;
      }
      if (blockedByWalls(currentPos, next, puzzle.walls)) {
        setRejectionFlash((n) => n + 1);
        recordInteraction("reject_wall", { action: a.id });
        return;
      }
      setMoves((prev) => [...prev, a.id]);
      recordInteraction("apply", {
        action: a.id,
        chain: moves.length + 1,
      });
    },
    [
      reachedGoal,
      outOfMoves,
      currentPos,
      puzzle.width,
      puzzle.height,
      puzzle.walls,
      moves.length,
      recordInteraction,
    ],
  );

  const handleUndoTo = useCallback(
    (idx: number) => {
      // Remove all moves AT and after idx (so clicking the most-recent chip
      // removes just it, clicking the second chip rolls back to two-removed).
      setMoves((prev) => prev.slice(0, idx));
      recordInteraction("undo", { back_to: idx });
    },
    [recordInteraction],
  );

  const handleReset = useCallback(() => {
    setMoves([]);
    recordInteraction("reset");
  }, [recordInteraction]);

  const handlePuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      setMoves([]);
      recordInteraction("puzzle", { puzzle: PUZZLES[idx].label });
    },
    [recordInteraction],
  );

  const verdictClass = reachedGoal
    ? "vm__verdict vm__verdict--won"
    : outOfMoves
    ? "vm__verdict vm__verdict--lost"
    : "vm__verdict vm__verdict--working";

  return (
    <div className={`vm${reachedGoal ? " vm--won" : ""}${outOfMoves ? " vm--lost" : ""}`}>
      <header className="vm__head">
        <div className="vm__heading">
          <span className="vm__heading-label">PUZZLE</span>
          <span className="vm__heading-value">{puzzle.label}</span>
        </div>
        <div className="vm__heading">
          <span className="vm__heading-label">POSITION</span>
          <span className="vm__heading-value">
            ({currentPos.x}, {currentPos.y}) → goal ({puzzle.goal.x},{" "}
            {puzzle.goal.y})
          </span>
        </div>
        <div className="vm__heading">
          <span className="vm__heading-label">MOVES</span>
          <span
            className={`vm__heading-value${
              outOfMoves ? " vm__heading-value--bad" : ""
            }`}
          >
            {moves.length} / {puzzle.moveBudget}
          </span>
        </div>
      </header>

      <MazeCanvas
        puzzle={puzzle}
        positions={positions}
        rejectionFlash={rejectionFlash}
        reachedGoal={reachedGoal}
      />

      <div className="vm__action-palette">
        <span className="vm__palette-label">ACTION VECTORS — click to apply</span>
        <div className="vm__action-row">
          {puzzle.actions.map((a) => (
            <button
              key={a.id}
              type="button"
              className="vm__action"
              onClick={() => handleApply(a)}
              disabled={reachedGoal || outOfMoves}
            >
              <span className="vm__action-label">{a.label}</span>
              <span className="vm__action-value">
                ({a.v.x}, {a.v.y})
              </span>
            </button>
          ))}
        </div>
      </div>

      {moves.length > 0 && (
        <div className="vm__chain">
          <span className="vm__chain-label">CHAIN — click any chip to undo back to that point</span>
          <div className="vm__chain-row">
            {moves.map((id, i) => {
              const a = actionMap.get(id);
              if (!a) return null;
              return (
                <button
                  key={`${id}-${i}`}
                  type="button"
                  className="vm__chip"
                  onClick={() => handleUndoTo(i)}
                  title="Undo back to this point"
                >
                  {a.label}
                </button>
              );
            })}
            <button
              type="button"
              className="vm__reset"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div className={verdictClass}>
        <span className="vm__verdict-label">Status</span>
        <span className="vm__verdict-value">
          {reachedGoal
            ? `✓ Reached the goal in ${moves.length} move${moves.length === 1 ? "" : "s"}. Running sum = (${runningSum.x}, ${runningSum.y}) = target displacement.`
            : outOfMoves
            ? `✗ Out of moves at (${currentPos.x}, ${currentPos.y}). Hit Reset to retry. ${puzzle.hint ?? ""}`
            : puzzle.hint
            ? `Working — target displacement (${targetSum.x}, ${targetSum.y}); ${movesLeft} move${movesLeft === 1 ? "" : "s"} left. Hint: ${puzzle.hint}`
            : `Working — target displacement (${targetSum.x}, ${targetSum.y}); ${movesLeft} moves left.`}
        </span>
      </div>

      <div className="vm__puzzle-row">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`vm__puzzle-pick${i === puzzleIdx ? " vm__puzzle-pick--active" : ""}`}
            onClick={() => handlePuzzle(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <WidgetExplainer
        widgetName="Vector maze"
        widgetDescription="A grid-maze navigation game where each move is a vector. The reader's position is shown as a coloured dot on a small grid; clicking an action tile (ê₁, ê₂, ê₁+ê₂, -ê₁, etc.) adds that vector to the running position. Walls block specific moves; out-of-bounds moves are rejected. The reader's job is to chain moves from the action palette so the running sum reaches the goal cell within a fixed move budget. The widget shows the chain as a sequence of chips — clicking any chip undoes back to that point. Four puzzles cover (a) integer reachability with only positive axis-aligned moves, (b) diagonal moves to demonstrate ê₁+ê₂ = ê₁ then ê₂, (c) walls forcing detour and the use of negative moves, (d) negative direction reachability. The pedagogical point is that vector addition is a TRANSLATION — the position after n moves is literally the sum of the n action vectors, and the destination depends only on the multiset of moves, not the order (though the *path* through walls does depend on order)."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────

interface MazeCanvasProps {
  puzzle: Puzzle;
  positions: Vec2[];
  rejectionFlash: number;
  reachedGoal: boolean;
}

function MazeCanvas({
  puzzle,
  positions,
  rejectionFlash,
  reachedGoal,
}: MazeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flashAtRef = useRef<number>(0);
  const lastFlashIdRef = useRef<number>(0);

  // Trigger flash on rejection.
  useEffect(() => {
    if (rejectionFlash !== lastFlashIdRef.current) {
      flashAtRef.current = performance.now();
      lastFlashIdRef.current = rejectionFlash;
    }
  }, [rejectionFlash]);

  // Pixel mapping: grid cell (cx, cy) where cy increases UP (visual) but
  // we draw rows with y=0 at bottom for the math-up convention.
  const margin = 24;
  const cellPx = (CANVAS_SIZE - 2 * margin) / Math.max(puzzle.width, puzzle.height);
  const cellToPx = useCallback(
    (cx: number, cy: number) => ({
      x: margin + (cx + 0.5) * cellPx,
      y: CANVAS_SIZE - margin - (cy + 0.5) * cellPx,
    }),
    [cellPx, margin, puzzle.width, puzzle.height],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_PLAYER = reachedGoal
      ? resolveColor("var(--widget-success)")
      : resolveColor("var(--widget-chart-1)");
    const C_GOAL = resolveColor("var(--widget-chart-3)");
    const C_GOAL_FILL = resolveColorAlpha("var(--widget-chart-3)", 0.18);
    const C_TRAIL = resolveColor("var(--widget-chart-2)");
    const C_WALL = resolveColor("var(--widget-danger)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_TEXT_DIM = resolveColor("var(--widget-text-dim)");

    // Grid background.
    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    ctx.fillRect(margin, margin, cellPx * puzzle.width, cellPx * puzzle.height);

    // Grid lines.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let cx = 0; cx <= puzzle.width; cx++) {
      const xPx = margin + cx * cellPx;
      ctx.beginPath();
      ctx.moveTo(xPx, margin);
      ctx.lineTo(xPx, margin + puzzle.height * cellPx);
      ctx.stroke();
    }
    for (let cy = 0; cy <= puzzle.height; cy++) {
      const yPx = CANVAS_SIZE - margin - cy * cellPx;
      ctx.beginPath();
      ctx.moveTo(margin, yPx);
      ctx.lineTo(margin + puzzle.width * cellPx, yPx);
      ctx.stroke();
    }

    // Cell coordinate labels (small, dim).
    ctx.font = "500 9px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = C_TEXT_DIM;
    ctx.textBaseline = "middle";
    for (let cx = 0; cx < puzzle.width; cx++) {
      for (let cy = 0; cy < puzzle.height; cy++) {
        const c = cellToPx(cx, cy);
        ctx.fillText(`${cx},${cy}`, c.x - 9, c.y + cellPx * 0.36);
      }
    }

    // Walls.
    ctx.strokeStyle = C_WALL;
    ctx.lineWidth = 4;
    for (const wall of puzzle.walls) {
      if (wall.side === "right") {
        const xPx = margin + (wall.cell.x + 1) * cellPx;
        const yTop = CANVAS_SIZE - margin - (wall.cell.y + 1) * cellPx;
        const yBot = CANVAS_SIZE - margin - wall.cell.y * cellPx;
        ctx.beginPath();
        ctx.moveTo(xPx, yTop);
        ctx.lineTo(xPx, yBot);
        ctx.stroke();
      } else {
        // top — between wall.cell.y and wall.cell.y+1 at column wall.cell.x.
        const yPx = CANVAS_SIZE - margin - (wall.cell.y + 1) * cellPx;
        const xL = margin + wall.cell.x * cellPx;
        const xR = margin + (wall.cell.x + 1) * cellPx;
        ctx.beginPath();
        ctx.moveTo(xL, yPx);
        ctx.lineTo(xR, yPx);
        ctx.stroke();
      }
    }

    // Goal cell.
    const goalPx = cellToPx(puzzle.goal.x, puzzle.goal.y);
    ctx.fillStyle = C_GOAL_FILL;
    ctx.fillRect(
      goalPx.x - cellPx / 2 + 2,
      goalPx.y - cellPx / 2 + 2,
      cellPx - 4,
      cellPx - 4,
    );
    ctx.strokeStyle = C_GOAL;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      goalPx.x - cellPx / 2 + 2,
      goalPx.y - cellPx / 2 + 2,
      cellPx - 4,
      cellPx - 4,
    );
    ctx.fillStyle = C_GOAL;
    ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillText("goal", goalPx.x - 12, goalPx.y - cellPx / 2 + 6);

    // Trail: a faint line connecting the player's path.
    if (positions.length > 1) {
      ctx.strokeStyle = C_TRAIL;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      const p0 = cellToPx(positions[0].x, positions[0].y);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < positions.length; i++) {
        const p = cellToPx(positions[i].x, positions[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Tiny dots at intermediate positions.
      for (let i = 1; i < positions.length - 1; i++) {
        const p = cellToPx(positions[i].x, positions[i].y);
        ctx.fillStyle = C_TRAIL;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Start marker (small ring).
    const startPx = cellToPx(puzzle.start.x, puzzle.start.y);
    ctx.strokeStyle = C_TEXT_DIM;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(startPx.x, startPx.y, cellPx * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = C_TEXT_DIM;
    ctx.font = "600 10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText("start", startPx.x - 14, startPx.y - cellPx / 2 + 6);

    // Player (current position).
    const current = positions[positions.length - 1];
    const playerPx = cellToPx(current.x, current.y);
    ctx.fillStyle = C_PLAYER;
    ctx.beginPath();
    ctx.arc(playerPx.x, playerPx.y, cellPx * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rejection flash — a red border pulse that fades.
    const sinceFlash = performance.now() - flashAtRef.current;
    if (flashAtRef.current > 0 && sinceFlash < 400) {
      const alpha = 1 - sinceFlash / 400;
      ctx.strokeStyle = `rgba(255, 90, 90, ${alpha * 0.7})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(margin, margin, cellPx * puzzle.width, cellPx * puzzle.height);
    }

    // Origin marker (corner).
    ctx.fillStyle = C_TEXT;
    ctx.font = "500 10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillText("0", margin - 14, CANVAS_SIZE - margin + 2);
  }, [puzzle, positions, reachedGoal, cellPx, cellToPx]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Re-draw periodically while a flash is animating.
  useEffect(() => {
    if (flashAtRef.current === 0) return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - flashAtRef.current;
      if (elapsed > 400) return;
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rejectionFlash, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="vm__canvas"
      role="img"
      aria-label={`Vector maze grid. Player at (${positions[positions.length - 1].x}, ${positions[positions.length - 1].y}); goal at (${puzzle.goal.x}, ${puzzle.goal.y}).`}
    />
  );
}
