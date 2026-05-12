/**
 * InverseRevealer — predict-then-verify quiz for the 2×2 inverse formula.
 *
 * Used by:
 *   - linear-algebra-matrix-inverse
 *
 * THIS IS A QUIZ. A 2×2 matrix A is shown. The reader must enter the
 * four entries of A⁻¹ in four boxes and submit. The widget grades each
 * entry within tolerance, flags wrong entries red, correct entries
 * green, and reports an overall verdict. Three optional wizards help
 * the reader: a det check (computes ad − bc and tells them if A is
 * singular), a formula reminder (shows the 2×2 inverse formula with
 * blanks they can fill from A), and a per-entry hint that reveals one
 * of the four answers.
 *
 * Three difficulty levels:
 *   - Easy: integer-entry A with det ∈ {±1, ±2} so A⁻¹ has clean
 *     fractions like 1/2.
 *   - Medium: any integer-entry A with |det| ≥ 1.
 *   - Hard: includes presets where A is singular — the reader must
 *     hit "DECLARE SINGULAR" instead of entering values.
 *
 * Pedagogy: the 2×2 inverse formula is mechanical, but the reader
 * has to *commit* to the four entries to internalise the pattern
 * (swap diagonals, negate off-diagonals, divide by det). Auto-grading
 * + per-entry feedback turns the formula from "something I read in
 * the lesson" into "something I can execute under quiz pressure".
 * The singular case in hard mode makes "A⁻¹ does not exist" a *legal
 * answer* the reader must actively recognise — not a footnote.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./InverseRevealer.css";

const CANVAS_SIZE = 280;
const SINGULAR_EPS = 1e-9;

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

type EntryKey = "a" | "b" | "c" | "d";

function det(M: Matrix2): number {
  return M.a * M.d - M.b * M.c;
}

function inverse(M: Matrix2): Matrix2 | null {
  const D = det(M);
  if (Math.abs(D) < SINGULAR_EPS) return null;
  return {
    a: M.d / D,
    b: -M.b / D,
    c: -M.c / D,
    d: M.a / D,
  };
}

function apply(M: Matrix2, p: Vec2): Vec2 {
  return { x: M.a * p.x + M.b * p.y, y: M.c * p.x + M.d * p.y };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMatrix(diff: Difficulty): Matrix2 {
  if (diff === "easy") {
    // Aim for det ∈ {±1, ±2} to make inverse entries clean fractions.
    for (let attempt = 0; attempt < 30; attempt++) {
      const a = randInt(-2, 2);
      const b = randInt(-2, 2);
      const c = randInt(-2, 2);
      const d = randInt(-2, 2);
      const D = a * d - b * c;
      if (Math.abs(D) >= 1 && Math.abs(D) <= 2) return { a, b, c, d };
    }
    return { a: 2, b: 1, c: 1, d: 1 };
  }
  if (diff === "medium") {
    for (let attempt = 0; attempt < 30; attempt++) {
      const m: Matrix2 = {
        a: randInt(-3, 3),
        b: randInt(-3, 3),
        c: randInt(-3, 3),
        d: randInt(-3, 3),
      };
      if (Math.abs(det(m)) >= 1) return m;
    }
    return { a: 3, b: 1, c: 1, d: 2 };
  }
  // Hard: 1 in 3 chance of singular.
  if (Math.random() < 0.34) {
    // Construct a singular matrix: second row = scalar * first row.
    const k = randInt(-2, 2) || 1;
    const a = randInt(-3, 3) || 1;
    const b = randInt(-3, 3) || 1;
    return { a, b, c: k * a, d: k * b };
  }
  for (let attempt = 0; attempt < 30; attempt++) {
    const m: Matrix2 = {
      a: randInt(-4, 4),
      b: randInt(-4, 4),
      c: randInt(-4, 4),
      d: randInt(-4, 4),
    };
    const D = det(m);
    if (Math.abs(D) >= 2 && Math.abs(D) <= 12) return m;
  }
  return { a: 4, b: 1, c: 1, d: 3 };
}

function gradeEntry(
  guess: string,
  truth: number,
  diff: Difficulty,
): "correct" | "wrong" | "empty" {
  const trimmed = guess.trim();
  if (trimmed.length === 0) return "empty";
  // Allow simple fractions like "1/2", "-3/4".
  let n: number;
  const frac = trimmed.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (Number.isNaN(num) || Number.isNaN(den) || den === 0) return "wrong";
    n = num / den;
  } else {
    n = Number(trimmed);
    if (Number.isNaN(n)) return "wrong";
  }
  const tol = diff === "easy" ? 0.04 : diff === "medium" ? 0.04 : 0.03;
  return Math.abs(n - truth) < tol ? "correct" : "wrong";
}

function formatTruth(x: number): string {
  if (!Number.isFinite(x)) return "—";
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  // Render simple fractions for halves / quarters / thirds.
  for (const den of [2, 3, 4, 5, 6]) {
    const num = x * den;
    if (Math.abs(num - Math.round(num)) < 1e-9) {
      const n = Math.round(num);
      return `${n}/${den}`;
    }
  }
  return x.toFixed(3);
}

interface InverseRevealerProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function InverseRevealer({ onStateChange }: InverseRevealerProps) {
  const { recordInteraction } = useWidgetTelemetry("InverseRevealer");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [A, setA] = useState<Matrix2>(() => generateMatrix("easy"));
  const [guess, setGuess] = useState({ a: "", b: "", c: "", d: "" });
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [declaredSingular, setDeclaredSingular] = useState(false);
  const [score, setScore] = useState({ wins: 0, attempts: 0 });
  const [showDetCheck, setShowDetCheck] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  const D = det(A);
  const isSingular = Math.abs(D) < SINGULAR_EPS;
  const Ainv = useMemo(() => inverse(A), [A]);

  const grades = useMemo(() => {
    if (!submitted || isSingular)
      return { a: "empty", b: "empty", c: "empty", d: "empty" } as const;
    return {
      a: gradeEntry(guess.a, Ainv!.a, difficulty),
      b: gradeEntry(guess.b, Ainv!.b, difficulty),
      c: gradeEntry(guess.c, Ainv!.c, difficulty),
      d: gradeEntry(guess.d, Ainv!.d, difficulty),
    };
  }, [submitted, isSingular, guess, Ainv, difficulty]);

  const allCorrect =
    !isSingular &&
    grades.a === "correct" &&
    grades.b === "correct" &&
    grades.c === "correct" &&
    grades.d === "correct";

  const singularWin = isSingular && declaredSingular;
  const singularWrong = isSingular && submitted && !declaredSingular;
  const solved = allCorrect || singularWin;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      difficulty: difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3,
      submitted: submitted || declaredSingular ? 1 : 0,
      solved: solved ? 1 : 0,
      is_singular: isSingular ? 1 : 0,
      wins: score.wins,
      attempts: score.attempts,
      revealed: revealed ? 1 : 0,
      det: Number(D.toFixed(3)),
    });
  }, [
    difficulty,
    submitted,
    declaredSingular,
    solved,
    isSingular,
    score,
    revealed,
    D,
    onStateChange,
  ]);

  const handleSubmit = () => {
    setSubmitted(true);
    setRevealed(false);
    let won = false;
    if (isSingular) {
      // Wrong submission path — entering values for a singular matrix.
      won = false;
    } else {
      won =
        gradeEntry(guess.a, Ainv!.a, difficulty) === "correct" &&
        gradeEntry(guess.b, Ainv!.b, difficulty) === "correct" &&
        gradeEntry(guess.c, Ainv!.c, difficulty) === "correct" &&
        gradeEntry(guess.d, Ainv!.d, difficulty) === "correct";
    }
    setScore((prev) => ({
      wins: prev.wins + (won ? 1 : 0),
      attempts: prev.attempts + 1,
    }));
    recordInteraction("submit", {
      difficulty,
      correct: won,
      is_singular: isSingular,
    });
  };

  const handleDeclareSingular = () => {
    setSubmitted(true);
    setDeclaredSingular(true);
    const won = isSingular;
    setScore((prev) => ({
      wins: prev.wins + (won ? 1 : 0),
      attempts: prev.attempts + 1,
    }));
    recordInteraction("declare_singular", {
      difficulty,
      correct: won,
      det: Number(D.toFixed(3)),
    });
  };

  const handleNewRound = (diff: Difficulty = difficulty) => {
    setDifficulty(diff);
    setA(generateMatrix(diff));
    setGuess({ a: "", b: "", c: "", d: "" });
    setSubmitted(false);
    setRevealed(false);
    setDeclaredSingular(false);
    setShowDetCheck(false);
    setShowFormula(false);
    recordInteraction("new_round", { difficulty: diff });
  };

  const handleReveal = () => {
    setRevealed(true);
    recordInteraction("reveal");
  };

  const handleHint = () => {
    if (isSingular || !Ainv) return;
    const order: EntryKey[] = ["a", "b", "c", "d"];
    const candidates = order.filter((k) => {
      const g = guess[k];
      if (g.trim().length === 0) return true;
      if (submitted && gradeEntry(g, Ainv[k], difficulty) === "wrong")
        return true;
      return false;
    });
    if (candidates.length === 0) return;
    const k = candidates[Math.floor(Math.random() * candidates.length)];
    const val = formatTruth(Ainv[k]);
    setGuess((prev) => ({ ...prev, [k]: val }));
    setSubmitted(false);
    recordInteraction("hint", { revealed_entry: k });
  };

  const stateSummary = useMemo(() => {
    const aStr = `A = [[${A.a}, ${A.b}], [${A.c}, ${A.d}]], det = ${D}`;
    let status: string;
    if (revealed) {
      status = isSingular
        ? "Reader gave up; A is singular and has no inverse."
        : `Reader gave up; A⁻¹ = [[${formatTruth(Ainv!.a)}, ${formatTruth(Ainv!.b)}], [${formatTruth(Ainv!.c)}, ${formatTruth(Ainv!.d)}]].`;
    } else if (singularWin) {
      status = `Reader correctly identified A as singular (det = ${D}).`;
    } else if (singularWrong) {
      status =
        "Reader tried to invert a singular matrix — should have declared singular instead.";
    } else if (!submitted) {
      status = "Reader has not submitted yet.";
    } else if (allCorrect) {
      status = `Reader correctly inverted A. A⁻¹ = [[${formatTruth(Ainv!.a)}, ${formatTruth(Ainv!.b)}], [${formatTruth(Ainv!.c)}, ${formatTruth(Ainv!.d)}]].`;
    } else {
      status = `Reader submitted incorrectly. Correct A⁻¹ = [[${formatTruth(Ainv!.a)}, ${formatTruth(Ainv!.b)}], [${formatTruth(Ainv!.c)}, ${formatTruth(Ainv!.d)}]]; their guess was [[${guess.a}, ${guess.b}], [${guess.c}, ${guess.d}]].`;
    }
    return `Inverse Revealer — difficulty ${difficulty}, score ${score.wins}/${score.attempts}. ${aStr}. ${status}`;
  }, [
    A,
    D,
    Ainv,
    isSingular,
    revealed,
    singularWin,
    singularWrong,
    submitted,
    allCorrect,
    guess,
    difficulty,
    score,
  ]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        difficulty,
        A: [A.a, A.b, A.c, A.d],
        submitted,
        revealed,
        declaredSingular,
      }),
    [difficulty, A, submitted, revealed, declaredSingular],
  );

  const showAnswer = revealed || allCorrect || singularWin;

  return (
    <div className={`ir${solved ? " ir--solved" : ""}`}>
      <header className="ir__head">
        <div className="ir__heading">
          <span className="ir__heading-label">DIFFICULTY</span>
          <div className="ir__diff">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`ir__diff-btn${d === difficulty ? " ir__diff-btn--active" : ""}`}
                onClick={() => handleNewRound(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="ir__heading">
          <span className="ir__heading-label">SCORE</span>
          <span className="ir__heading-value">
            {score.wins} / {score.attempts}
            {score.attempts > 0 &&
              ` · ${Math.round((score.wins / score.attempts) * 100)}%`}
          </span>
        </div>
      </header>

      <div className="ir__work">
        <RevealerCanvas A={A} />

        <div className="ir__quiz">
          <div className="ir__matrix-block">
            <div className="ir__matrix-label">
              Given A =
            </div>
            <div className="ir__matrix-grid">
              <div className="ir__bracket ir__bracket--left" />
              <div className="ir__entries">
                <span className="ir__entry-fixed">{A.a}</span>
                <span className="ir__entry-fixed">{A.b}</span>
                <span className="ir__entry-fixed">{A.c}</span>
                <span className="ir__entry-fixed">{A.d}</span>
              </div>
              <div className="ir__bracket ir__bracket--right" />
            </div>
          </div>

          <div className="ir__matrix-block">
            <div className="ir__matrix-label">
              Enter A⁻¹ =
            </div>
            <div className="ir__matrix-grid">
              <div className="ir__bracket ir__bracket--left" />
              <div className="ir__entries">
                <EntryInput
                  label="a"
                  value={guess.a}
                  grade={grades.a}
                  onChange={(v) => setGuess((g) => ({ ...g, a: v }))}
                  disabled={showAnswer || singularWin || isSingular && submitted}
                  showAnswer={showAnswer && !isSingular}
                  truth={Ainv?.a ?? 0}
                />
                <EntryInput
                  label="b"
                  value={guess.b}
                  grade={grades.b}
                  onChange={(v) => setGuess((g) => ({ ...g, b: v }))}
                  disabled={showAnswer || singularWin || isSingular && submitted}
                  showAnswer={showAnswer && !isSingular}
                  truth={Ainv?.b ?? 0}
                />
                <EntryInput
                  label="c"
                  value={guess.c}
                  grade={grades.c}
                  onChange={(v) => setGuess((g) => ({ ...g, c: v }))}
                  disabled={showAnswer || singularWin || isSingular && submitted}
                  showAnswer={showAnswer && !isSingular}
                  truth={Ainv?.c ?? 0}
                />
                <EntryInput
                  label="d"
                  value={guess.d}
                  grade={grades.d}
                  onChange={(v) => setGuess((g) => ({ ...g, d: v }))}
                  disabled={showAnswer || singularWin || isSingular && submitted}
                  showAnswer={showAnswer && !isSingular}
                  truth={Ainv?.d ?? 0}
                />
              </div>
              <div className="ir__bracket ir__bracket--right" />
            </div>
            <div className="ir__entry-hint">
              Decimals or simple fractions accepted (e.g. <code>0.5</code> or <code>1/2</code>).
            </div>
          </div>
        </div>
      </div>

      <div className="ir__actions">
        <button
          type="button"
          className="ir__submit"
          onClick={handleSubmit}
          disabled={showAnswer}
        >
          Submit A⁻¹
        </button>
        {difficulty === "hard" && (
          <button
            type="button"
            className="ir__action ir__action--singular"
            onClick={handleDeclareSingular}
            disabled={showAnswer}
          >
            Declare singular (no inverse)
          </button>
        )}
        <button
          type="button"
          className="ir__action"
          onClick={() => setShowDetCheck((v) => !v)}
        >
          {showDetCheck ? "Hide det check" : "Det check"}
        </button>
        <button
          type="button"
          className="ir__action"
          onClick={() => setShowFormula((v) => !v)}
        >
          {showFormula ? "Hide formula" : "Show formula"}
        </button>
        <button
          type="button"
          className="ir__action"
          onClick={handleHint}
          disabled={showAnswer || isSingular}
        >
          Reveal one entry
        </button>
        <button
          type="button"
          className="ir__action"
          onClick={handleReveal}
          disabled={showAnswer}
        >
          Give up
        </button>
        <button
          type="button"
          className="ir__action ir__action--primary"
          onClick={() => handleNewRound()}
        >
          New round
        </button>
      </div>

      {showDetCheck && (
        <div className="ir__wizard">
          <span className="ir__wizard-label">DET CHECK</span>
          <div className="ir__wizard-body">
            det(A) = ad − bc = ({A.a})({A.d}) − ({A.b})({A.c}) = {A.a * A.d} − {A.b * A.c} = <strong>{D}</strong>.
            {isSingular ? (
              <span className="ir__det ir__det--singular"> Det is zero → A is SINGULAR. No inverse exists.</span>
            ) : (
              <span className="ir__det ir__det--nonzero"> Det ≠ 0 → A is invertible.</span>
            )}
          </div>
        </div>
      )}

      {showFormula && (
        <div className="ir__wizard">
          <span className="ir__wizard-label">2×2 INVERSE FORMULA</span>
          <div className="ir__wizard-body">
            A⁻¹ = (1 / det A) · [[<strong>d</strong>, −<strong>b</strong>], [−<strong>c</strong>, <strong>a</strong>]] —
            swap the diagonal entries, negate the off-diagonals, divide everything by det A.
            For this A: A⁻¹ = (1 / {D}) · [[{A.d}, −({A.b})], [−({A.c}), {A.a}]].
          </div>
        </div>
      )}

      <div
        className={`ir__verdict ir__verdict--${
          !submitted && !revealed
            ? "idle"
            : solved
              ? "win"
              : revealed
                ? "revealed"
                : "wrong"
        }`}
      >
        <span className="ir__verdict-label">Result</span>
        <span className="ir__verdict-value">
          {!submitted && !revealed && (
            <>
              Compute A⁻¹ by hand and enter the four entries. Try{" "}
              <button
                type="button"
                className="ir__inline-link"
                onClick={() => setShowDetCheck(true)}
              >
                det check
              </button>{" "}
              first to make sure A is invertible.
            </>
          )}
          {submitted && allCorrect && (
            <>
              ✓ Correct. A⁻¹ = [[{formatTruth(Ainv!.a)}, {formatTruth(Ainv!.b)}], [{formatTruth(Ainv!.c)}, {formatTruth(Ainv!.d)}]].
              You inverted A by hand.
            </>
          )}
          {singularWin && (
            <>
              ✓ Correct. det(A) = {D} = 0, so A has no inverse. The 2×2 formula
              would divide by zero. Inversion fails exactly here.
            </>
          )}
          {submitted && !solved && !revealed && !singularWrong && (
            <>
              Not quite. Wrong entries are flagged red. Try the formula
              wizard or the det check, then try again.
            </>
          )}
          {singularWrong && (
            <>
              A is singular (det = 0). There's no inverse to enter — you
              should hit "Declare singular" instead.
            </>
          )}
          {revealed && !allCorrect && !singularWin && (
            <>
              {isSingular ? (
                <>Answer: A is singular (det = 0). No inverse exists.</>
              ) : (
                <>
                  Answer: A⁻¹ = [[{formatTruth(Ainv!.a)}, {formatTruth(Ainv!.b)}], [{formatTruth(Ainv!.c)}, {formatTruth(Ainv!.d)}]]. Hit 'New round' to try another.
                </>
              )}
            </>
          )}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Inverse Revealer — predict-then-verify 2×2 inverses"
        widgetDescription="A quiz widget. A random 2×2 matrix A is generated; the reader must compute A⁻¹ by hand and enter its four entries in input fields. The widget grades each entry within tolerance (0.04 for easy/medium, 0.03 for hard) and flags correct entries green, wrong entries red. Three difficulty levels: easy (integer A with det ∈ {±1, ±2} for clean fractional inverses), medium (any integer A with non-zero det), hard (mixes invertible and SINGULAR matrices — when A is singular, the reader must declare 'no inverse' instead of entering values). Three wizards: det check (computes ad − bc and reports invertibility), formula reminder (the 2×2 inverse formula with the reader's A substituted in), per-entry hint (reveals one correct entry). Score is tracked across rounds. The canvas at the top draws the unit square's image under A and the parallelogram's image under the inverse — so the reader can visually verify their answer round-trips. The pedagogical point is committing to the four entries: the 2×2 inverse formula is mechanical, but executing it under quiz pressure cements the swap-diagonals/negate-off-diagonals/divide-by-det pattern. The singular case in hard mode makes 'A⁻¹ does not exist' a first-class answer the reader must actively recognise."
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
      ? "ir__input ir__input--correct"
      : grade === "wrong"
        ? "ir__input ir__input--wrong"
        : "ir__input";
  return (
    <div className="ir__cell">
      <span className="ir__cell-label">{label}</span>
      <input
        className={cls}
        type="text"
        inputMode="decimal"
        value={showAnswer ? formatTruth(truth) : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="?"
      />
    </div>
  );
}

interface RevealerCanvasProps {
  A: Matrix2;
}

function RevealerCanvas({ A }: RevealerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const D = det(A);
  const isSingular = Math.abs(D) < SINGULAR_EPS;

  const domain = useMemo(() => {
    const corners = [
      { x: 0, y: 0 },
      apply(A, { x: 1, y: 0 }),
      apply(A, { x: 0, y: 1 }),
      apply(A, { x: 1, y: 1 }),
    ];
    return computeDomain(corners, { padding: 1.5, floor: 2.5, ceiling: 8 });
  }, [A]);

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_PARALLELO = isSingular
      ? resolveColor("var(--widget-danger)")
      : resolveColor("var(--widget-chart-1)");
    const C_FILL = isSingular
      ? resolveColorAlpha("var(--widget-danger)", 0.12)
      : resolveColorAlpha("var(--widget-chart-1)", 0.14);
    const C_TEXT = resolveColor("var(--widget-text)");

    // Grid.
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
    const ti = toPx(apply(A, { x: 1, y: 0 }));
    const tij = toPx(apply(A, { x: 1, y: 1 }));
    const tj = toPx(apply(A, { x: 0, y: 1 }));
    ctx.fillStyle = C_FILL;
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(ti.x, ti.y);
    ctx.lineTo(tij.x, tij.y);
    ctx.lineTo(tj.x, tj.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C_PARALLELO;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Singular overlay.
    if (isSingular) {
      ctx.fillStyle = resolveColorAlpha("var(--widget-danger)", 0.12);
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = resolveColor("var(--widget-danger)");
      ctx.font = "700 14px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("det = 0 — A is SINGULAR", W / 2, H / 2);
      ctx.textAlign = "start";
    }

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Caption.
    ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = resolveColor("var(--widget-text-dim)");
    ctx.fillText("dashed: unit square · solid: A(unit square)", 10, 10);
  }, [A, isSingular, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="ir__canvas"
      role="img"
      aria-label="Inverse Revealer canvas — image of the unit square under A."
    />
  );
}
