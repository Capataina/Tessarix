/**
 * MatrixGuessr — reverse-engineer the matrix from its action.
 *
 * Used by:
 *   - linear-algebra-matrices
 *
 * THIS IS A QUIZ. Not a slider, not a visualisation — a quiz with
 * input fields, an explicit submit, automatic grading, scoring across
 * rounds, and a reveal mechanism for stuck players.
 *
 * The widget shows the unit square transformed by a hidden 2×2 matrix
 * A. The reader has to enter A's four entries (a, b, c, d) and hit
 * submit. The widget grades within tolerance and reports correct /
 * partial / wrong with per-entry feedback.
 *
 * Three difficulty levels:
 *   - Easy: integer entries from {-2, -1, 0, 1, 2}, axis-aligned
 *     transformations (no rotation).
 *   - Medium: integer entries including small rotations / reflections.
 *   - Hard: decimal entries from rotations (sin/cos values like 0.866).
 *
 * Pedagogy: reading a matrix off the geometry. The reader's job is
 * to look at where the basis vectors î and ĵ landed and read off the
 * columns of A directly — because "A's columns are A's basis-vector
 * images" is the most useful single fact about matrices, and rote
 * application of it through a quiz cements the reflex.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./MatrixGuessr.css";

const CANVAS_SIZE = 320;

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

type Difficulty = "easy" | "medium" | "hard";

function apply(M: Matrix2, p: Vec2): Vec2 {
  return { x: M.a * p.x + M.b * p.y, y: M.c * p.x + M.d * p.y };
}

function generateMatrix(diff: Difficulty): Matrix2 {
  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  if (diff === "easy") {
    // Axis-aligned: shear, scale, identity, reflection.
    const a = rand(-2, 2);
    const d = rand(-2, 2);
    if (a === 0 && d === 0) return generateMatrix(diff);
    return { a: a || 1, b: rand(-1, 1), c: 0, d: d || 1 };
  }
  if (diff === "medium") {
    let m: Matrix2;
    do {
      m = {
        a: rand(-2, 2),
        b: rand(-2, 2),
        c: rand(-2, 2),
        d: rand(-2, 2),
      };
    } while (Math.abs(m.a * m.d - m.b * m.c) < 0.5);
    return m;
  }
  // Hard: rotations by 15° / 30° / 45° / 60° / -30° etc.
  const angles = [Math.PI / 12, Math.PI / 6, Math.PI / 4, Math.PI / 3, -Math.PI / 6, -Math.PI / 4];
  const theta = angles[Math.floor(Math.random() * angles.length)];
  return {
    a: Number(Math.cos(theta).toFixed(3)),
    b: Number((-Math.sin(theta)).toFixed(3)),
    c: Number(Math.sin(theta).toFixed(3)),
    d: Number(Math.cos(theta).toFixed(3)),
  };
}

function gradeEntry(
  guess: string,
  truth: number,
  diff: Difficulty,
): "correct" | "wrong" | "empty" {
  const trimmed = guess.trim();
  if (trimmed.length === 0) return "empty";
  const n = Number(trimmed);
  if (Number.isNaN(n)) return "wrong";
  const tol = diff === "hard" ? 0.01 : 0.05;
  return Math.abs(n - truth) < tol ? "correct" : "wrong";
}

interface MatrixGuessrProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function MatrixGuessr({ onStateChange }: MatrixGuessrProps) {
  const { recordInteraction } = useWidgetTelemetry("MatrixGuessr");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [hidden, setHidden] = useState<Matrix2>(() => generateMatrix("easy"));
  const [guess, setGuess] = useState({ a: "", b: "", c: "", d: "" });
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ wins: 0, attempts: 0 });

  const grades = useMemo(() => {
    if (!submitted)
      return { a: "empty", b: "empty", c: "empty", d: "empty" } as const;
    return {
      a: gradeEntry(guess.a, hidden.a, difficulty),
      b: gradeEntry(guess.b, hidden.b, difficulty),
      c: gradeEntry(guess.c, hidden.c, difficulty),
      d: gradeEntry(guess.d, hidden.d, difficulty),
    };
  }, [submitted, guess, hidden, difficulty]);

  const allCorrect =
    grades.a === "correct" &&
    grades.b === "correct" &&
    grades.c === "correct" &&
    grades.d === "correct";

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      difficulty: difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3,
      submitted: submitted ? 1 : 0,
      all_correct: allCorrect ? 1 : 0,
      wins: score.wins,
      attempts: score.attempts,
      revealed: revealed ? 1 : 0,
    });
  }, [difficulty, submitted, allCorrect, score, revealed, onStateChange]);

  const handleSubmit = () => {
    setSubmitted(true);
    setRevealed(false);
    const correct =
      gradeEntry(guess.a, hidden.a, difficulty) === "correct" &&
      gradeEntry(guess.b, hidden.b, difficulty) === "correct" &&
      gradeEntry(guess.c, hidden.c, difficulty) === "correct" &&
      gradeEntry(guess.d, hidden.d, difficulty) === "correct";
    setScore((prev) => ({
      wins: prev.wins + (correct ? 1 : 0),
      attempts: prev.attempts + 1,
    }));
    recordInteraction("submit", {
      difficulty,
      correct,
      guess_a: Number(guess.a) || 0,
      guess_b: Number(guess.b) || 0,
      guess_c: Number(guess.c) || 0,
      guess_d: Number(guess.d) || 0,
    });
  };

  const handleNewRound = (diff: Difficulty = difficulty) => {
    setDifficulty(diff);
    setHidden(generateMatrix(diff));
    setGuess({ a: "", b: "", c: "", d: "" });
    setSubmitted(false);
    setRevealed(false);
    recordInteraction("new_round", { difficulty: diff });
  };

  const handleReveal = () => {
    setRevealed(true);
    recordInteraction("reveal");
  };

  const handleHint = () => {
    // Fill in one random unfilled / wrong entry.
    const order: (keyof Matrix2)[] = ["a", "b", "c", "d"];
    const candidates = order.filter((k) => {
      const g = guess[k as keyof typeof guess];
      if (g.trim().length === 0) return true;
      if (submitted && gradeEntry(g, hidden[k], difficulty) === "wrong")
        return true;
      return false;
    });
    if (candidates.length === 0) return;
    const k = candidates[Math.floor(Math.random() * candidates.length)];
    const val = hidden[k];
    setGuess((prev) => ({ ...prev, [k]: String(val) }));
    setSubmitted(false);
    recordInteraction("hint", { revealed_entry: k });
  };

  const stateSummary = useMemo(() => {
    const status = revealed
      ? `Reader gave up; matrix revealed.`
      : !submitted
      ? `Reader has not submitted yet.`
      : allCorrect
      ? `Reader submitted correctly: A = [[${hidden.a}, ${hidden.b}], [${hidden.c}, ${hidden.d}]].`
      : `Reader submitted incorrectly. Correct A = [[${hidden.a}, ${hidden.b}], [${hidden.c}, ${hidden.d}]]; their guess was [[${guess.a}, ${guess.b}], [${guess.c}, ${guess.d}]].`;
    return `Matrix Guessr — difficulty ${difficulty}, score ${score.wins}/${score.attempts}. ${status}`;
  }, [revealed, submitted, allCorrect, hidden, guess, difficulty, score]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        difficulty,
        hidden: [hidden.a, hidden.b, hidden.c, hidden.d],
        submitted,
        revealed,
      }),
    [difficulty, hidden, submitted, revealed],
  );

  const showAnswer = revealed || allCorrect;

  return (
    <div className={`mg${allCorrect ? " mg--solved" : ""}`}>
      <header className="mg__head">
        <div className="mg__heading">
          <span className="mg__heading-label">DIFFICULTY</span>
          <div className="mg__diff">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`mg__diff-btn${d === difficulty ? " mg__diff-btn--active" : ""}`}
                onClick={() => handleNewRound(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="mg__heading">
          <span className="mg__heading-label">SCORE</span>
          <span className="mg__heading-value">
            {score.wins} / {score.attempts}
            {score.attempts > 0 &&
              ` · ${Math.round((score.wins / score.attempts) * 100)}%`}
          </span>
        </div>
      </header>

      <GuessCanvas hidden={hidden} />

      <div className="mg__quiz">
        <div className="mg__quiz-label">
          Enter the matrix A that produced this transformation.
        </div>
        <div className="mg__entry-grid">
          <div className="mg__bracket mg__bracket--left" />
          <div className="mg__entries">
            <EntryInput
              label="a"
              value={guess.a}
              grade={grades.a}
              onChange={(v) => setGuess((g) => ({ ...g, a: v }))}
              disabled={showAnswer}
              showAnswer={showAnswer}
              truth={hidden.a}
            />
            <EntryInput
              label="b"
              value={guess.b}
              grade={grades.b}
              onChange={(v) => setGuess((g) => ({ ...g, b: v }))}
              disabled={showAnswer}
              showAnswer={showAnswer}
              truth={hidden.b}
            />
            <EntryInput
              label="c"
              value={guess.c}
              grade={grades.c}
              onChange={(v) => setGuess((g) => ({ ...g, c: v }))}
              disabled={showAnswer}
              showAnswer={showAnswer}
              truth={hidden.c}
            />
            <EntryInput
              label="d"
              value={guess.d}
              grade={grades.d}
              onChange={(v) => setGuess((g) => ({ ...g, d: v }))}
              disabled={showAnswer}
              showAnswer={showAnswer}
              truth={hidden.d}
            />
          </div>
          <div className="mg__bracket mg__bracket--right" />
        </div>

        <div className="mg__actions">
          <button
            type="button"
            className="mg__submit"
            onClick={handleSubmit}
            disabled={showAnswer}
          >
            Submit guess
          </button>
          <button
            type="button"
            className="mg__action"
            onClick={handleHint}
            disabled={showAnswer}
          >
            Reveal one entry (hint)
          </button>
          <button
            type="button"
            className="mg__action"
            onClick={handleReveal}
            disabled={showAnswer}
          >
            Give up — reveal A
          </button>
          <button
            type="button"
            className="mg__action mg__action--primary"
            onClick={() => handleNewRound()}
          >
            New round
          </button>
        </div>

        <div
          className={`mg__verdict mg__verdict--${
            !submitted && !revealed
              ? "idle"
              : allCorrect
              ? "win"
              : revealed
              ? "revealed"
              : "wrong"
          }`}
        >
          <span className="mg__verdict-label">Result</span>
          <span className="mg__verdict-value">
            {!submitted && !revealed &&
              "Look at where the basis vectors î = (1, 0) and ĵ = (0, 1) end up. Their images ARE the columns of A."}
            {submitted && allCorrect &&
              `✓ Correct. A = [[${hidden.a}, ${hidden.b}], [${hidden.c}, ${hidden.d}]].`}
            {submitted && !allCorrect && !revealed &&
              "Not quite. Wrong entries are marked red; try again or use a hint."}
            {revealed && !allCorrect &&
              `Answer: A = [[${hidden.a}, ${hidden.b}], [${hidden.c}, ${hidden.d}]]. Hit 'New round' to try another.`}
          </span>
        </div>
      </div>

      <WidgetExplainer
        widgetName="Matrix Guessr — reverse-engineer the matrix"
        widgetDescription="A quiz widget. The widget draws the image of the unit square under a hidden 2×2 matrix A. The reader has four input fields (a, b, c, d) and must enter A. On submit, each entry is graded against the hidden matrix with a tolerance based on difficulty (5% for easy/medium, 1% for hard). Correct entries flash green, wrong entries flash red. Three difficulty levels: easy (integer entries, no rotations), medium (any integer matrix with det != 0), hard (rotation matrices with decimal entries like 0.866). The reader can hint (fill in one correct entry), give up (reveal A), or start a new round. Score across rounds is tracked. The pedagogical point is to internalise that A's columns are the images of the basis vectors — the reader's job is to read those images off the parallelogram and write them as columns."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface EntryInputProps {
  label: string;
  value: string;
  grade: "correct" | "wrong" | "empty";
  onChange: (v: string) => void;
  disabled: boolean;
  showAnswer: boolean;
  truth: number;
}

function EntryInput({
  label,
  value,
  grade,
  onChange,
  disabled,
  showAnswer,
  truth,
}: EntryInputProps) {
  const cls =
    grade === "correct"
      ? "mg__input mg__input--correct"
      : grade === "wrong"
      ? "mg__input mg__input--wrong"
      : "mg__input";
  return (
    <div className="mg__cell">
      <span className="mg__cell-label">{label}</span>
      <input
        className={cls}
        type="text"
        inputMode="decimal"
        value={showAnswer ? String(truth) : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="?"
      />
    </div>
  );
}

interface GuessCanvasProps {
  hidden: Matrix2;
}

function GuessCanvas({ hidden }: GuessCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(() => {
    const corners = [
      { x: 0, y: 0 },
      apply(hidden, { x: 1, y: 0 }),
      apply(hidden, { x: 0, y: 1 }),
      apply(hidden, { x: 1, y: 1 }),
    ];
    return computeDomain(corners, { padding: 1.5, floor: 2.5, ceiling: 7 });
  }, [hidden]);

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_BASIS_X = resolveColor("var(--widget-chart-1)");
    const C_BASIS_Y = resolveColor("var(--widget-chart-2)");
    const C_FILL = resolveColorAlpha("var(--widget-chart-1)", 0.14);
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Original unit square (dashed faint).
    const o = toPx({ x: 0, y: 0 });
    const u1 = toPx({ x: 1, y: 0 });
    const u2 = toPx({ x: 1, y: 1 });
    const u3 = toPx({ x: 0, y: 1 });
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1.3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(u1.x, u1.y);
    ctx.lineTo(u2.x, u2.y);
    ctx.lineTo(u3.x, u3.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Transformed parallelogram.
    const t0 = toPx({ x: 0, y: 0 });
    const ti = toPx(apply(hidden, { x: 1, y: 0 }));
    const tij = toPx(apply(hidden, { x: 1, y: 1 }));
    const tj = toPx(apply(hidden, { x: 0, y: 1 }));
    ctx.fillStyle = C_FILL;
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(ti.x, ti.y);
    ctx.lineTo(tij.x, tij.y);
    ctx.lineTo(tj.x, tj.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = resolveColor("var(--widget-chart-1)");
    ctx.lineWidth = 2;
    ctx.stroke();

    // Basis vector images.
    drawArrow(ctx, t0, ti, C_BASIS_X, "î'", 2.4);
    drawArrow(ctx, t0, tj, C_BASIS_Y, "ĵ'", 2.4);

    // Faint original basis arrows for orientation.
    ctx.globalAlpha = 0.45;
    drawArrow(ctx, t0, u1, "rgba(255,255,255,0.6)", "î", 1.6);
    drawArrow(ctx, t0, u3, "rgba(255,255,255,0.6)", "ĵ", 1.6);
    ctx.globalAlpha = 1;

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [hidden, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="mg__canvas"
      role="img"
      aria-label="Matrix Guessr canvas — image of the unit square under hidden matrix A."
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
  ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, head.x + 6, head.y - 8);
  ctx.restore();
}
