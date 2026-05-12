/**
 * ComponentReverseEngineer — build-the-vector quiz.
 *
 * Used by:
 *   - linear-algebra (the foundations primer, vectors-as-arrows section)
 *
 * THIS IS AN AUTO-GRADED QUIZ. A target vector is drawn on the
 * canvas WITHOUT its component labels. The reader sets v_x and v_y
 * via two number inputs (with click-arrow nudges); their current
 * guess is drawn as a GHOST arrow overlaid on the canvas in a
 * different colour. When the guess matches the target within
 * tolerance, the round flashes green and auto-advances. Otherwise
 * the reader keeps adjusting.
 *
 * Three difficulty tiers:
 *   - easy:   integer components from -4..4 (no zero in either axis)
 *   - medium: half-integer components from -4..4 (tolerance 0.05)
 *   - hard:   tenth-grid components (tolerance 0.05)
 *
 * Score: each correctly-solved round contributes 1 point + a bonus
 * inversely proportional to the number of nudges used (fewer
 * adjustments = higher score). The reader can give up to reveal the
 * answer (which counts as zero for that round).
 *
 * This is the INVERSE of the usual exercise. The usual is
 * "components → draw the arrow"; here the reader sees the arrow and
 * has to write down its components. The point: reading components
 * off the geometry is the directional skill the rest of linear
 * algebra rests on.
 *
 * Implements metaphor library §4 (direct manipulation of position)
 * inverted — the reader sees a position and writes its coordinates.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./ComponentReverseEngineer.css";

const CANVAS_SIZE = 320;

type Difficulty = "easy" | "medium" | "hard";

interface Vec2 {
  x: number;
  y: number;
}

interface DifficultyConfig {
  step: number;
  range: [number, number];
  tolerance: number;
}

const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { step: 1, range: [-4, 4], tolerance: 0.001 },
  medium: { step: 0.5, range: [-4, 4], tolerance: 0.05 },
  hard: { step: 0.1, range: [-3, 3], tolerance: 0.07 },
};

function randTarget(diff: Difficulty): Vec2 {
  const { step, range } = DIFFICULTY[diff];
  const [lo, hi] = range;
  const span = (hi - lo) / step;
  const pick = () => {
    let v: number;
    do {
      const n = Math.floor(Math.random() * (span + 1));
      v = Number((lo + n * step).toFixed(2));
    } while (Math.abs(v) < step * 0.5);
    return v;
  };
  return { x: pick(), y: pick() };
}

function withinTolerance(guess: Vec2, truth: Vec2, tol: number): boolean {
  return Math.abs(guess.x - truth.x) < tol && Math.abs(guess.y - truth.y) < tol;
}

interface RoundRecord {
  truth: Vec2;
  guesses: number;
  givenUp: boolean;
  solved: boolean;
}

interface ComponentReverseEngineerProps {
  initialDifficulty?: Difficulty;
  onStateChange?: (state: Record<string, number>) => void;
}

export function ComponentReverseEngineer({
  initialDifficulty = "easy",
  onStateChange,
}: ComponentReverseEngineerProps) {
  const { recordInteraction } = useWidgetTelemetry("ComponentReverseEngineer");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [truth, setTruth] = useState<Vec2>(() => randTarget(initialDifficulty));
  const [guess, setGuess] = useState<Vec2>({ x: 0, y: 0 });
  const [nudges, setNudges] = useState(0);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [flashSolved, setFlashSolved] = useState(false);

  const config = DIFFICULTY[difficulty];
  const solved = !revealed && withinTolerance(guess, truth, config.tolerance);
  // Don't double-count rounds; auto-advance handles it via the flash effect.

  // On solve: flash, record, schedule a new round.
  useEffect(() => {
    if (!solved || flashSolved) return;
    setFlashSolved(true);
    setRounds((prev) => [
      ...prev,
      { truth, guesses: nudges, givenUp: false, solved: true },
    ]);
    recordInteraction("solved", {
      difficulty,
      truth_x: truth.x,
      truth_y: truth.y,
      nudges,
    });
    const t = setTimeout(() => {
      setTruth(randTarget(difficulty));
      setGuess({ x: 0, y: 0 });
      setNudges(0);
      setRevealed(false);
      setFlashSolved(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [solved, flashSolved, truth, nudges, difficulty, recordInteraction]);

  const handleSet = useCallback(
    (axis: "x" | "y", value: number) => {
      if (revealed || flashSolved) return;
      // Snap to the current difficulty's step.
      const snapped = Number((Math.round(value / config.step) * config.step).toFixed(2));
      setGuess((prev) => ({ ...prev, [axis]: snapped }));
      setNudges((n) => n + 1);
    },
    [revealed, flashSolved, config.step],
  );

  const handleNudge = useCallback(
    (axis: "x" | "y", delta: number) => {
      if (revealed || flashSolved) return;
      const cur = guess[axis];
      const next = Number((cur + delta).toFixed(2));
      const clamped = Math.max(config.range[0] - 0.5, Math.min(config.range[1] + 0.5, next));
      setGuess((prev) => ({ ...prev, [axis]: clamped }));
      setNudges((n) => n + 1);
      recordInteraction("nudge", { axis, delta });
    },
    [revealed, flashSolved, guess, config.range, recordInteraction],
  );

  const handleReveal = useCallback(() => {
    if (revealed || flashSolved) return;
    setRevealed(true);
    setRounds((prev) => [
      ...prev,
      { truth, guesses: nudges, givenUp: true, solved: false },
    ]);
    recordInteraction("reveal", { difficulty, truth_x: truth.x, truth_y: truth.y, nudges });
  }, [revealed, flashSolved, truth, nudges, difficulty, recordInteraction]);

  const handleNext = useCallback(() => {
    setTruth(randTarget(difficulty));
    setGuess({ x: 0, y: 0 });
    setNudges(0);
    setRevealed(false);
    setFlashSolved(false);
    recordInteraction("next");
  }, [difficulty, recordInteraction]);

  const handleDifficulty = useCallback(
    (d: Difficulty) => {
      setDifficulty(d);
      setTruth(randTarget(d));
      setGuess({ x: 0, y: 0 });
      setNudges(0);
      setRevealed(false);
      setFlashSolved(false);
      setRounds([]);
      recordInteraction("difficulty", { difficulty: d });
    },
    [recordInteraction],
  );

  const solvedCount = rounds.filter((r) => r.solved).length;
  // Score: each solved round scores 1.0 + (1 / max(1, nudges - 4)) * 0.5,
  // i.e. perfect-on-first-try gives 1.5, taking many nudges gives near 1.0.
  const score = useMemo(() => {
    let s = 0;
    for (const r of rounds) {
      if (r.solved) {
        const bonus = 0.5 / Math.max(1, r.guesses - 4);
        s += 1 + bonus;
      }
    }
    return Number(s.toFixed(2));
  }, [rounds]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      difficulty: difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3,
      guess_x: guess.x,
      guess_y: guess.y,
      truth_x: revealed ? truth.x : -999,
      truth_y: revealed ? truth.y : -999,
      nudges,
      solved_now: solved ? 1 : 0,
      rounds_solved: solvedCount,
      rounds_total: rounds.length,
      score,
    });
  }, [
    difficulty,
    guess.x,
    guess.y,
    revealed,
    truth.x,
    truth.y,
    nudges,
    solved,
    solvedCount,
    rounds.length,
    score,
    onStateChange,
  ]);

  const stateSummary = useMemo(() => {
    if (revealed) {
      return `ComponentReverseEngineer (${difficulty}) — reader gave up. Truth was v = (${truth.x}, ${truth.y}); their final guess was (${guess.x}, ${guess.y}). Score ${score}, ${solvedCount}/${rounds.length} solved.`;
    }
    if (flashSolved) {
      return `ComponentReverseEngineer (${difficulty}) — round JUST SOLVED. Truth was (${truth.x}, ${truth.y}), reader's guess matched within tolerance ${config.tolerance}, took ${nudges} nudges. Total solved ${solvedCount}, score ${score}.`;
    }
    return `ComponentReverseEngineer (${difficulty}) — target vector drawn on canvas, components hidden. Reader's current guess = (${guess.x}, ${guess.y}); ghost arrow shown alongside the target. ${nudges} nudges so far. Tolerance ${config.tolerance}.`;
  }, [
    revealed,
    flashSolved,
    difficulty,
    truth,
    guess,
    config.tolerance,
    nudges,
    solvedCount,
    rounds.length,
    score,
  ]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        diff: difficulty,
        truth: [truth.x, truth.y],
        guess: [guess.x, guess.y],
        revealed,
        flashSolved,
      }),
    [difficulty, truth, guess, revealed, flashSolved],
  );

  return (
    <div className={`cre${flashSolved ? " cre--solved" : ""}${revealed ? " cre--revealed" : ""}`}>
      <header className="cre__head">
        <div className="cre__heading">
          <span className="cre__heading-label">DIFFICULTY</span>
          <div className="cre__diff">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`cre__diff-btn${d === difficulty ? " cre__diff-btn--active" : ""}`}
                onClick={() => handleDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="cre__heading">
          <span className="cre__heading-label">ROUNDS</span>
          <span className="cre__heading-value">
            {solvedCount} solved / {rounds.length} attempts
          </span>
        </div>
        <div className="cre__heading">
          <span className="cre__heading-label">SCORE</span>
          <span className="cre__heading-value">{score}</span>
        </div>
      </header>

      <TargetCanvas
        target={truth}
        guess={guess}
        showAnswer={revealed || flashSolved}
        solved={flashSolved}
      />

      <div className="cre__entry">
        <div className="cre__entry-row">
          <span className="cre__entry-label">v_x</span>
          <button
            type="button"
            className="cre__step"
            onClick={() => handleNudge("x", -config.step)}
            disabled={revealed || flashSolved}
            aria-label="Decrease v_x"
          >
            −
          </button>
          <input
            type="text"
            inputMode="decimal"
            className="cre__input"
            value={guess.x}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) handleSet("x", n);
            }}
            disabled={revealed || flashSolved}
            aria-label="v_x"
          />
          <button
            type="button"
            className="cre__step"
            onClick={() => handleNudge("x", config.step)}
            disabled={revealed || flashSolved}
            aria-label="Increase v_x"
          >
            +
          </button>
        </div>
        <div className="cre__entry-row">
          <span className="cre__entry-label">v_y</span>
          <button
            type="button"
            className="cre__step"
            onClick={() => handleNudge("y", -config.step)}
            disabled={revealed || flashSolved}
            aria-label="Decrease v_y"
          >
            −
          </button>
          <input
            type="text"
            inputMode="decimal"
            className="cre__input"
            value={guess.y}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) handleSet("y", n);
            }}
            disabled={revealed || flashSolved}
            aria-label="v_y"
          />
          <button
            type="button"
            className="cre__step"
            onClick={() => handleNudge("y", config.step)}
            disabled={revealed || flashSolved}
            aria-label="Increase v_y"
          >
            +
          </button>
        </div>
      </div>

      <div className="cre__actions">
        <button
          type="button"
          className="cre__action"
          onClick={handleReveal}
          disabled={revealed || flashSolved}
        >
          Give up — reveal v
        </button>
        <button
          type="button"
          className="cre__action cre__action--primary"
          onClick={handleNext}
        >
          {revealed ? "Try next vector" : "Skip to next"}
        </button>
      </div>

      <div
        className={`cre__verdict cre__verdict--${
          flashSolved ? "solved" : revealed ? "revealed" : "working"
        }`}
      >
        <span className="cre__verdict-label">Status</span>
        <span className="cre__verdict-value">
          {flashSolved &&
            `✓ Match. v = (${truth.x}, ${truth.y}). Next round in a moment…`}
          {revealed && !flashSolved &&
            `Answer: v = (${truth.x}, ${truth.y}). Your guess was (${guess.x}, ${guess.y}). Hit Try next vector for another.`}
          {!flashSolved && !revealed && (
            <>
              Read the components off the arrow on the canvas. The arrow's tip
              is at the point (v_x, v_y); v_x is its horizontal displacement
              from the origin, v_y its vertical. Tolerance ±{config.tolerance.toFixed(2)};
              step size {config.step}.
            </>
          )}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Component reverse-engineer"
        widgetDescription="A reverse-direction quiz for component reading. The canvas shows a target vector drawn from the origin without any component labels — only the grid and the arrow are visible. Two number inputs (v_x and v_y) plus click-arrow nudges let the reader set their guess for the target's components; the guess is drawn as a GHOST arrow overlaid on the canvas in a contrasting colour, so the reader gets live visual feedback as they adjust. When the guess matches the target within the difficulty's tolerance, the round flashes green and auto-advances. Three tiers: easy (integer components, exact match), medium (half-integer, 0.05 tolerance), hard (tenth-grid components, 0.07 tolerance). Reader can give up to reveal the answer or skip without revealing. Score = sum of (1 + 0.5/nudges-after-4) over solved rounds; perfect-first-try scores 1.5 per round, slow solves score near 1.0. The pedagogical point is to invert the usual exercise: instead of being given components and drawing an arrow, the reader sees an arrow and writes its components — the directional skill the rest of linear algebra rests on."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────

interface TargetCanvasProps {
  target: Vec2;
  guess: Vec2;
  showAnswer: boolean;
  solved: boolean;
}

function TargetCanvas({ target, guess, showAnswer, solved }: TargetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(
    () => computeDomain([target, guess], { padding: 1.4, floor: 4.5, ceiling: 6 }),
    [target, guess],
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

    const C_TARGET = solved
      ? resolveColor("var(--widget-success)")
      : resolveColor("var(--widget-chart-1)");
    const C_GUESS = resolveColor("var(--widget-chart-2)");
    const C_GUESS_DOT = resolveColorAlpha("var(--widget-chart-2)", 0.55);
    const C_TARGET_FILL = solved
      ? resolveColorAlpha("var(--widget-success)", 0.16)
      : resolveColorAlpha("var(--widget-chart-1)", 0.14);
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_TEXT_DIM = resolveColor("var(--widget-text-dim)");

    // Grid with labelled integer ticks (helps reading components).
    const pxPerUnit = W / (2 * domain);
    const unitsPerHalf = Math.ceil(domain);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Integer tick labels on the axes (helps the reader read positions).
    ctx.fillStyle = C_TEXT_DIM;
    ctx.font = "500 10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    for (let u = -unitsPerHalf; u <= unitsPerHalf; u++) {
      if (u === 0) continue;
      const xPx = W / 2 + u * pxPerUnit;
      ctx.fillText(`${u}`, xPx + 2, H / 2 + 2);
      const yPx = H / 2 - u * pxPerUnit;
      ctx.fillText(`${u}`, W / 2 + 3, yPx - 6);
    }

    // Halo at target tip.
    const targetPx = toPx(target);
    ctx.fillStyle = C_TARGET_FILL;
    ctx.beginPath();
    ctx.arc(targetPx.x, targetPx.y, 14, 0, Math.PI * 2);
    ctx.fill();

    // Target arrow (the thing to be reverse-engineered).
    drawArrow(
      ctx,
      toPx({ x: 0, y: 0 }),
      targetPx,
      C_TARGET,
      "v?",
      2.8,
      false,
    );

    // Guess arrow — drawn only if non-zero, semi-transparent, dashed.
    if (Math.abs(guess.x) > 1e-6 || Math.abs(guess.y) > 1e-6) {
      const guessPx = toPx(guess);
      ctx.globalAlpha = solved ? 1 : 0.7;
      drawArrow(ctx, toPx({ x: 0, y: 0 }), guessPx, C_GUESS, "guess", 2, true);
      ctx.globalAlpha = 1;
      // A small dot at the guess tip to make the gap with the target visible.
      ctx.fillStyle = C_GUESS_DOT;
      ctx.beginPath();
      ctx.arc(guessPx.x, guessPx.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // When answer revealed, draw labelled component decomposition lines.
    if (showAnswer) {
      ctx.strokeStyle = resolveColorAlpha("var(--widget-text-dim)", 0.5);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      // From origin to (target.x, 0).
      const xAxisPx = toPx({ x: target.x, y: 0 });
      const yAxisPx = toPx({ x: 0, y: target.y });
      ctx.beginPath();
      ctx.moveTo(W / 2, H / 2);
      ctx.lineTo(xAxisPx.x, xAxisPx.y);
      ctx.lineTo(targetPx.x, targetPx.y);
      ctx.moveTo(W / 2, H / 2);
      ctx.lineTo(yAxisPx.x, yAxisPx.y);
      ctx.lineTo(targetPx.x, targetPx.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Labels.
      ctx.fillStyle = C_TEXT;
      ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textBaseline = "middle";
      ctx.fillText(`v_x = ${target.x}`, xAxisPx.x + 4, H / 2 + 14);
      ctx.fillText(`v_y = ${target.y}`, W / 2 + 6, yAxisPx.y);
    }

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [target, guess, showAnswer, solved, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="cre__canvas"
      role="img"
      aria-label="Target vector with components hidden; reader's guess overlaid as a ghost arrow."
    />
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: Vec2,
  head: Vec2,
  color: string,
  label: string,
  width: number,
  dashed: boolean,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([6, 4]);
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
    const aLen = Math.min(10, len * 0.3);
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
  ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, head.x + 8, head.y - 8);
  ctx.restore();
}
