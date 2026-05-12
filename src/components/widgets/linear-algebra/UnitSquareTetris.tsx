/**
 * UnitSquareTetris — real-time matrix-selection game.
 *
 * Used by:
 *   - linear-algebra-matrices
 *
 * THIS IS A REAL-TIME MINI-GAME. A target shape drops from the top of
 * the canvas. The reader sees four candidate matrices A, B, C, D and
 * must pick the one whose image of the unit square equals the falling
 * target shape — *before* the shape lands at the bottom. Pick correctly
 * and the shape "docks" (score +1, next shape spawns). Pick wrongly
 * or let the shape land unmatched and the reader loses a life. Three
 * lives per game; final score reported at the end.
 *
 * This is the only widget in the codebase with a real-time deadline.
 * The drop is animated via requestAnimationFrame; candidate buttons
 * are always live; the round resolves on either the reader's click
 * OR the shape hitting the floor.
 *
 * Pedagogically: rapid mental application of matrices. Forces a "what
 * does this matrix DO to the unit square" reflex under pressure. The
 * reader can't sit back and reason through each entry — they have to
 * read the shape's tilt and stretch and recognise the matrix.
 *
 * Loop:
 *   - SPAWN: pick a random matrix as the truth; pick 3 distractor
 *     matrices from a curated palette so they're distinct enough to
 *     differentiate visually. Position shape at top, set fallY = 0.
 *   - FALL: increment fallY each frame; render shape at offset.
 *   - RESOLVE:
 *     - Reader clicks A/B/C/D: stop fall; if correct, +score; else -life.
 *     - fallY reaches floor: stop fall; -life (missed). Auto-advance.
 *   - GAME OVER when lives = 0. Score persists across rounds via
 *     "high score" memory.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./UnitSquareTetris.css";

const CANVAS_SIZE = 360;
const FALL_DURATION_MS = 6500; // time for the shape to traverse the canvas
const POST_RESOLVE_MS = 900; // pause after resolve before next shape spawns

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

interface NamedMatrix {
  id: string;
  label: string;
  matrix: Matrix2;
}

/** Palette: 8 visually-distinct transformations. Each "round" draws one
 *  truth + 3 distractors from this palette. */
const PALETTE: NamedMatrix[] = [
  { id: "id", label: "[[1, 0], [0, 1]]", matrix: { a: 1, b: 0, c: 0, d: 1 } },
  { id: "rot90", label: "[[0, -1], [1, 0]]", matrix: { a: 0, b: -1, c: 1, d: 0 } },
  { id: "rotn90", label: "[[0, 1], [-1, 0]]", matrix: { a: 0, b: 1, c: -1, d: 0 } },
  { id: "shx1", label: "[[1, 1], [0, 1]]", matrix: { a: 1, b: 1, c: 0, d: 1 } },
  { id: "shy1", label: "[[1, 0], [1, 1]]", matrix: { a: 1, b: 0, c: 1, d: 1 } },
  { id: "scx2", label: "[[2, 0], [0, 1]]", matrix: { a: 2, b: 0, c: 0, d: 1 } },
  { id: "scy2", label: "[[1, 0], [0, 2]]", matrix: { a: 1, b: 0, c: 0, d: 2 } },
  { id: "refx", label: "[[1, 0], [0, -1]]", matrix: { a: 1, b: 0, c: 0, d: -1 } },
  { id: "refy", label: "[[-1, 0], [0, 1]]", matrix: { a: -1, b: 0, c: 0, d: 1 } },
  { id: "diag", label: "[[2, 0], [0, 0.5]]", matrix: { a: 2, b: 0, c: 0, d: 0.5 } },
];

function matrixKey(m: Matrix2): string {
  return `${m.a}|${m.b}|${m.c}|${m.d}`;
}

function apply(M: Matrix2, p: Vec2): Vec2 {
  return { x: M.a * p.x + M.b * p.y, y: M.c * p.x + M.d * p.y };
}

interface Round {
  truth: NamedMatrix;
  /** 4 candidate matrices including the truth, in display order. */
  candidates: NamedMatrix[];
  /** Index of the truth in `candidates`. */
  truthIdx: number;
}

function pickRound(): Round {
  // De-duplicate by matrix value (rot90 and rot90c share a label but differ
  // in entries — that's intentional, but we should never include two
  // identical matrices in one round's choices).
  const dedupe = new Map<string, NamedMatrix>();
  for (const item of PALETTE) dedupe.set(matrixKey(item.matrix), item);
  const unique = Array.from(dedupe.values());
  const shuffled = [...unique].sort(() => Math.random() - 0.5);
  const truth = shuffled[0];
  const distractors = shuffled.slice(1, 4);
  const candidates = [truth, ...distractors].sort(() => Math.random() - 0.5);
  const truthIdx = candidates.findIndex((c) => c.id === truth.id);
  return { truth, candidates, truthIdx };
}

type Phase = "playing" | "resolved" | "game_over";

interface UnitSquareTetrisProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function UnitSquareTetris({ onStateChange }: UnitSquareTetrisProps) {
  const { recordInteraction } = useWidgetTelemetry("UnitSquareTetris");
  const [round, setRound] = useState<Round>(() => pickRound());
  const [phase, setPhase] = useState<Phase>("playing");
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [fallProgress, setFallProgress] = useState(0); // 0..1
  const [resolution, setResolution] = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [running, setRunning] = useState(false);

  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  // Animation loop — only runs while phase === "playing" and game is
  // running.
  useEffect(() => {
    if (!running || phase !== "playing") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    startedAtRef.current = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAtRef.current) / FALL_DURATION_MS);
      setFallProgress(t);
      if (t >= 1) {
        // Timeout: shape landed without a pick.
        setResolution("timeout");
        setLives((L) => L - 1);
        setPhase("resolved");
        recordInteraction("timeout", { truth_id: round.truth.id });
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, round.truth.id]);

  // Auto-advance after a resolution: short pause then spawn next round
  // OR end the game.
  useEffect(() => {
    if (phase !== "resolved") return;
    const id = setTimeout(() => {
      // lives is the live value at this point — note we set lives BEFORE
      // setting phase to "resolved", so the lives we read here is after
      // any decrement.
      if (lives <= 0) {
        setPhase("game_over");
        setHighScore((prev) => Math.max(prev, score));
        recordInteraction("game_over", { score, high_score: highScore });
        return;
      }
      // Next round.
      const next = pickRound();
      setRound(next);
      setFallProgress(0);
      setPickedIdx(null);
      setResolution(null);
      setPhase("playing");
    }, POST_RESOLVE_MS);
    return () => clearTimeout(id);
  }, [phase, lives, score, highScore, recordInteraction]);

  const handlePick = useCallback(
    (idx: number) => {
      if (phase !== "playing") return;
      const correct = idx === round.truthIdx;
      setPickedIdx(idx);
      setPhase("resolved");
      if (correct) {
        setScore((s) => s + 1);
        setResolution("correct");
        recordInteraction("pick_correct", {
          truth_id: round.truth.id,
          fall_progress: Number(fallProgress.toFixed(2)),
        });
      } else {
        setLives((L) => L - 1);
        setResolution("wrong");
        recordInteraction("pick_wrong", {
          truth_id: round.truth.id,
          picked_id: round.candidates[idx].id,
          fall_progress: Number(fallProgress.toFixed(2)),
        });
      }
    },
    [phase, round, fallProgress, recordInteraction],
  );

  const handleStart = useCallback(() => {
    setRound(pickRound());
    setPhase("playing");
    setPickedIdx(null);
    setLives(3);
    setScore(0);
    setFallProgress(0);
    setResolution(null);
    setRunning(true);
    recordInteraction("start");
  }, [recordInteraction]);

  const handleStop = useCallback(() => {
    setRunning(false);
    setPhase("game_over");
    setHighScore((prev) => Math.max(prev, score));
    recordInteraction("stop", { score });
  }, [score, recordInteraction]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      phase: phase === "playing" ? 0 : phase === "resolved" ? 1 : 2,
      lives,
      score,
      high_score: highScore,
      fall_progress: Number(fallProgress.toFixed(2)),
      truth_idx: round.truthIdx,
      picked_idx: pickedIdx ?? -1,
    });
  }, [phase, lives, score, highScore, fallProgress, round.truthIdx, pickedIdx, onStateChange]);

  const stateSummary = useMemo(() => {
    const truthLabel = round.truth.label;
    if (phase === "game_over") {
      return `UnitSquareTetris game over. Final score ${score}; high score ${highScore}. Last round's truth was ${truthLabel}.`;
    }
    if (phase === "resolved") {
      const verdict =
        resolution === "correct"
          ? "correct"
          : resolution === "wrong"
          ? `wrong — they picked ${round.candidates[pickedIdx ?? 0]?.label ?? "?"}`
          : "timeout — they ran out of time";
      return `UnitSquareTetris round resolved (${verdict}). Lives ${lives}, score ${score}. Truth was ${truthLabel}.`;
    }
    if (!running) {
      return `UnitSquareTetris not started yet. Reader has to click "Start" to begin a game of falling shapes.`;
    }
    return `UnitSquareTetris in progress. A shape transformed by ${truthLabel} is falling (progress ${Math.round(fallProgress * 100)}%). Reader must pick the matching matrix from 4 candidates before it lands. Lives ${lives}, score ${score}.`;
  }, [phase, round, score, highScore, lives, fallProgress, pickedIdx, resolution, running]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        phase,
        lives,
        score,
        truth: round.truth.id,
        picked: pickedIdx,
        resolution,
      }),
    [phase, lives, score, round, pickedIdx, resolution],
  );

  return (
    <div
      className={`ust${
        phase === "game_over"
          ? " ust--over"
          : resolution === "correct"
          ? " ust--correct"
          : resolution === "wrong" || resolution === "timeout"
          ? " ust--wrong"
          : ""
      }`}
    >
      <header className="ust__head">
        <div className="ust__heading">
          <span className="ust__heading-label">LIVES</span>
          <span className="ust__heading-value ust__lives">
            {Array.from({ length: 3 }, (_, i) => (
              <span
                key={i}
                className={`ust__life${i < lives ? " ust__life--on" : ""}`}
                aria-label={i < lives ? "life remaining" : "life lost"}
              >
                ●
              </span>
            ))}
          </span>
        </div>
        <div className="ust__heading">
          <span className="ust__heading-label">SCORE</span>
          <span className="ust__heading-value">{score}</span>
        </div>
        <div className="ust__heading">
          <span className="ust__heading-label">HIGH</span>
          <span className="ust__heading-value">{highScore}</span>
        </div>
        <div className="ust__heading">
          <span className="ust__heading-label">CONTROLS</span>
          <div className="ust__heading-actions">
            {!running || phase === "game_over" ? (
              <button
                type="button"
                className="ust__action ust__action--primary"
                onClick={handleStart}
              >
                {phase === "game_over" ? "Play again" : "Start"}
              </button>
            ) : (
              <button
                type="button"
                className="ust__action"
                onClick={handleStop}
              >
                Quit
              </button>
            )}
          </div>
        </div>
      </header>

      <FallCanvas
        truth={round.truth.matrix}
        fallProgress={fallProgress}
        phase={phase}
        resolution={resolution}
        running={running}
      />

      <div className="ust__choices">
        <div className="ust__choices-label">PICK THE MATRIX THAT MADE THIS SHAPE</div>
        <div className="ust__choices-grid">
          {round.candidates.map((c, i) => {
            const isTruth = i === round.truthIdx;
            const isPicked = i === pickedIdx;
            return (
              <button
                key={i}
                type="button"
                className={`ust__choice${
                  phase === "resolved"
                    ? isTruth
                      ? " ust__choice--right"
                      : isPicked
                      ? " ust__choice--picked-wrong"
                      : ""
                    : ""
                }`}
                onClick={() => handlePick(i)}
                disabled={phase !== "playing" || !running}
                aria-label={`Candidate ${String.fromCharCode(65 + i)}: ${c.label}`}
              >
                <span className="ust__choice-letter">{String.fromCharCode(65 + i)}</span>
                <ChoiceCard matrix={c.matrix} />
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`ust__verdict ust__verdict--${
          phase === "game_over"
            ? "over"
            : resolution ?? "working"
        }`}
      >
        <span className="ust__verdict-label">Status</span>
        <span className="ust__verdict-value">
          {phase === "game_over" &&
            `Game over. Final score ${score}${highScore > 0 && score >= highScore ? " — new high score!" : ""}. Click "Play again" to start a new game.`}
          {phase === "resolved" && resolution === "correct" &&
            `✓ Correct. Next shape incoming…`}
          {phase === "resolved" && resolution === "wrong" &&
            `✗ Wrong — the correct matrix is shown in green. Life lost.`}
          {phase === "resolved" && resolution === "timeout" &&
            `✗ Too slow — the shape landed unmatched. Life lost.`}
          {phase === "playing" && running &&
            `Watch where the basis vectors î and ĵ end up — those ARE the columns of A. Match the falling shape against the four candidate matrices.`}
          {!running && phase !== "game_over" &&
            `Three lives, one shape at a time. Pick the matrix that produced the shape — or let it land and lose a life. Click "Start" to begin.`}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Unit-square Tetris — pick the matching matrix before the shape lands"
        widgetDescription="A real-time mini-game widget. A target shape (the image of the unit square under a hidden 2×2 matrix) drops from the top of the canvas over a fixed duration (~6.5 seconds). Below the canvas, four candidate matrices A/B/C/D are shown — exactly one is the truth, the other three are distractors drawn from a curated palette of common transformations (identity, rotations, shears, reflections, anisotropic scales). The reader must click the correct matrix before the shape lands. Correct pick → score +1, next shape spawns. Wrong pick or timeout → lose a life. Three lives per game; high score persists across games. The pedagogical purpose is to force rapid mental application of 'the columns of A are the images of the basis vectors' — under time pressure, the reader cannot calculate entry-by-entry, they have to recognise the shape's tilt and stretch and match it to a matrix at a glance."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Falling-shape canvas ────────────────────────────────────────────────

interface FallCanvasProps {
  truth: Matrix2;
  fallProgress: number;
  phase: Phase;
  resolution: "correct" | "wrong" | "timeout" | null;
  running: boolean;
}

function FallCanvas({ truth, fallProgress, phase, resolution, running }: FallCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(() => {
    const corners = [
      { x: 0, y: 0 },
      apply(truth, { x: 1, y: 0 }),
      apply(truth, { x: 0, y: 1 }),
      apply(truth, { x: 1, y: 1 }),
    ];
    return computeDomain(corners, { padding: 1.7, floor: 3, ceiling: 6 });
  }, [truth]);

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_GRID = "rgba(255, 255, 255, 0.05)";
    const C_AXIS = "rgba(255, 255, 255, 0.32)";
    const C_FLOOR = resolveColor("var(--widget-text-dim)");
    const C_SHAPE =
      resolution === "correct"
        ? resolveColor("var(--widget-success)")
        : resolution === "wrong" || resolution === "timeout"
        ? resolveColor("var(--widget-danger)")
        : resolveColor("var(--widget-chart-1)");
    const C_FILL =
      resolution === "correct"
        ? resolveColorAlpha("var(--widget-success)", 0.18)
        : resolution === "wrong" || resolution === "timeout"
        ? resolveColorAlpha("var(--widget-danger)", 0.18)
        : resolveColorAlpha("var(--widget-chart-1)", 0.16);

    // Grid + axes (slightly muted; this is a game canvas, not a precise plot).
    ctx.strokeStyle = C_GRID;
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
    ctx.strokeStyle = C_AXIS;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Floor line near the bottom — the shape "lands" here when the
    // round times out.
    const floorPxY = H - 18;
    ctx.strokeStyle = C_FLOOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(0, floorPxY);
    ctx.lineTo(W, floorPxY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "600 10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = C_FLOOR;
    ctx.fillText("FLOOR", 6, floorPxY - 4);

    // Vertical fall offset in pixels. Progress 0 = shape at top; 1 = at
    // floor. Compute the topmost extent of the shape to know the start.
    const corners = [
      apply(truth, { x: 0, y: 0 }),
      apply(truth, { x: 1, y: 0 }),
      apply(truth, { x: 1, y: 1 }),
      apply(truth, { x: 0, y: 1 }),
    ];
    const transformedYExtent =
      Math.max(...corners.map((c) => Math.abs(c.y))) || 1;
    // Map progress to vertical px offset.
    const startY = -transformedYExtent * pxPerUnit - 20;
    const endY = floorPxY - H / 2;
    const offsetY = startY + (endY - startY) * fallProgress;

    // Draw shape, translated downward in pixel space (not in math
    // coordinates — the shape "falls through the plane" as a rigid
    // rendered object).
    ctx.save();
    ctx.translate(0, offsetY);
    drawTransformedSquare(ctx, truth, toPx, C_SHAPE, C_FILL, 2.4);
    // Draw the basis-vector arrows on the falling shape itself, so the
    // reader can read 'î goes here, ĵ goes there' off the shape.
    const o = toPx({ x: 0, y: 0 });
    const ti = toPx(apply(truth, { x: 1, y: 0 }));
    const tj = toPx(apply(truth, { x: 0, y: 1 }));
    drawArrow(ctx, o, ti, resolveColor("var(--widget-chart-1)"), "î'", 2.2);
    drawArrow(ctx, o, tj, resolveColor("var(--widget-chart-2)"), "ĵ'", 2.2);
    ctx.restore();

    // Subtle "drop direction" indicator at the top while running.
    if (running && phase === "playing") {
      ctx.fillStyle = resolveColorAlpha("var(--widget-warn)", 0.4);
      ctx.fillRect(0, 0, W, 2);
    }
  }, [truth, toPx, domain, fallProgress, resolution, phase, running]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="ust__canvas"
      role="img"
      aria-label="Falling shape — image of the unit square under a hidden 2×2 matrix."
    />
  );
}

// ─── Choice card (small thumbnail for each candidate matrix) ─────────────

function ChoiceCard({ matrix }: { matrix: Matrix2 }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const SIZE = 72;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const corners = [
      apply(matrix, { x: 0, y: 0 }),
      apply(matrix, { x: 1, y: 0 }),
      apply(matrix, { x: 1, y: 1 }),
      apply(matrix, { x: 0, y: 1 }),
    ];
    const dom = computeDomain(corners, { padding: 1.5, floor: 1.2, ceiling: 4 });
    const tp = makeToPx(SIZE, dom);

    // Faint axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, SIZE / 2);
    ctx.lineTo(SIZE, SIZE / 2);
    ctx.moveTo(SIZE / 2, 0);
    ctx.lineTo(SIZE / 2, SIZE);
    ctx.stroke();

    // Shape outline.
    ctx.fillStyle = resolveColorAlpha("var(--widget-chart-1)", 0.18);
    ctx.strokeStyle = resolveColor("var(--widget-chart-1)");
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    corners.forEach((c, i) => {
      const px = tp(c);
      if (i === 0) ctx.moveTo(px.x, px.y);
      else ctx.lineTo(px.x, px.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }, [matrix]);

  return <canvas ref={ref} width={SIZE} height={SIZE} className="ust__choice-canvas" />;
}

// ─── Drawing helpers ─────────────────────────────────────────────────────

function drawTransformedSquare(
  ctx: CanvasRenderingContext2D,
  M: Matrix2,
  toPx: (p: Vec2) => Vec2,
  stroke: string,
  fill: string,
  width: number,
) {
  const corners = [
    apply(M, { x: 0, y: 0 }),
    apply(M, { x: 1, y: 0 }),
    apply(M, { x: 1, y: 1 }),
    apply(M, { x: 0, y: 1 }),
  ];
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = width;
  ctx.beginPath();
  corners.forEach((c, i) => {
    const px = toPx(c);
    if (i === 0) ctx.moveTo(px.x, px.y);
    else ctx.lineTo(px.x, px.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

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
    const aLen = Math.min(9, len * 0.32);
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
  ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, head.x + 6, head.y - 7);
  ctx.restore();
}
