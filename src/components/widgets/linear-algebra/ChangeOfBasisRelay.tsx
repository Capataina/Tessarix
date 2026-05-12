/**
 * ChangeOfBasisRelay — multi-step change-of-basis solver.
 *
 * Used by:
 *   - linear-algebra-basis (this lesson)
 * Cross-link candidates:
 *   - linear-algebra-matrix-inverse (the relay's middle step uses B₂⁻¹;
 *     the inverse comes pre-computed but the widget displays its
 *     derivation alongside)
 *   - linear-algebra-matrices (the matrix-vector products at each step)
 *
 * THIS IS A STAGED SOLVER. Not a slider, not a visualisation — a
 * structured walkthrough. The reader is given v's coordinates in
 * basis B₁ and asked to find v's coordinates in basis B₂. The widget
 * splits the calculation into the canonical TWO-STEP RELAY:
 *
 *   Step 1: convert B₁-coords to standard coords    [v]_std = B₁ · [v]_B1
 *   Step 2: convert standard to B₂-coords           [v]_B2 = B₂⁻¹ · [v]_std
 *
 * Each step has its own pair of input boxes plus a submit button.
 * Incorrect submissions surface the per-entry mismatch. Correct
 * submissions LOCK that step and advance. The reader can request a
 * one-entry hint per step, or reveal the answer and continue.
 *
 * Pedagogically the relay structure is the centrepiece: change-of-
 * basis is a COMPOSITION of two simpler operations (one matrix-vector
 * product per step), and the chain B₂⁻¹ · B₁ is what you'd compose
 * once and re-use if you change many vectors between the same two
 * bases. Doing it by hand once or twice with the relay scaffolding
 * makes the formula stick.
 *
 * Implements a new "checkpointed multi-step solver" mechanic the
 * codebase hasn't had. Distinct from the existing GoalChain in that
 * each step has its own arithmetic input and grading — not just a
 * predicate-on-widget-state.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./ChangeOfBasisRelay.css";

interface Vec2 {
  x: number;
  y: number;
}

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface Puzzle {
  label: string;
  B1: Matrix2;
  B2: Matrix2;
  vInB1: Vec2;
  notes: string;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Standard → rotated 90°",
    B1: { a: 1, b: 0, c: 0, d: 1 },
    B2: { a: 0, b: -1, c: 1, d: 0 },
    vInB1: { x: 2, y: 3 },
    notes:
      "B₁ is the identity (standard basis), so step 1 is trivial. B₂ is the 90° rotation matrix; its inverse rotates -90° back.",
  },
  {
    label: "Diagonal stretches",
    B1: { a: 2, b: 0, c: 0, d: 3 },
    B2: { a: 1, b: 0, c: 0, d: 2 },
    vInB1: { x: 1, y: 1 },
    notes:
      "Both bases are diagonal — step 1 stretches by 2 and 3; step 2 un-stretches by 1 and 2.",
  },
  {
    label: "Sheared → orthogonal",
    B1: { a: 1, b: 1, c: 0, d: 1 },
    B2: { a: 1, b: 0, c: 0, d: 1 },
    vInB1: { x: 2, y: -1 },
    notes:
      "B₁ is a horizontal shear by 1. B₂ is the standard basis, so step 2 is trivial.",
  },
  {
    label: "Two non-trivial bases",
    B1: { a: 1, b: 1, c: 0, d: 2 },
    B2: { a: 2, b: 0, c: 1, d: 1 },
    vInB1: { x: 1, y: 1 },
    notes:
      "Neither basis is the identity. Both matrix-vector products are non-trivial; the inverse of B₂ has fractional entries.",
  },
];

function multiplyMV(M: Matrix2, p: Vec2): Vec2 {
  return { x: M.a * p.x + M.b * p.y, y: M.c * p.x + M.d * p.y };
}

function invert(M: Matrix2): Matrix2 | null {
  const D = M.a * M.d - M.b * M.c;
  if (Math.abs(D) < 1e-9) return null;
  return {
    a: M.d / D,
    b: -M.b / D,
    c: -M.c / D,
    d: M.a / D,
  };
}

const STEP_TOL = 0.02;

function gradeEntry(guess: string, truth: number): "correct" | "wrong" | "empty" {
  const trimmed = guess.trim();
  if (trimmed.length === 0) return "empty";
  const n = Number(trimmed);
  if (Number.isNaN(n)) return "wrong";
  return Math.abs(n - truth) < STEP_TOL ? "correct" : "wrong";
}

function fmt(n: number): string {
  // Render with up to 3 decimals but trim trailing zeros for readability.
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  const s = n.toFixed(3);
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

interface ChangeOfBasisRelayProps {
  onStateChange?: (state: Record<string, number>) => void;
}

type StepStatus = "active" | "locked" | "pending";

export function ChangeOfBasisRelay({ onStateChange }: ChangeOfBasisRelayProps) {
  const { recordInteraction } = useWidgetTelemetry("ChangeOfBasisRelay");
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle = PUZZLES[puzzleIdx];

  const B2inv = useMemo(() => invert(puzzle.B2), [puzzle]);
  const vStdTruth = useMemo(
    () => multiplyMV(puzzle.B1, puzzle.vInB1),
    [puzzle],
  );
  const vB2Truth = useMemo(
    () => (B2inv ? multiplyMV(B2inv, vStdTruth) : { x: 0, y: 0 }),
    [B2inv, vStdTruth],
  );

  const [step1, setStep1] = useState({ x: "", y: "" });
  const [step2, setStep2] = useState({ x: "", y: "" });
  const [step1Locked, setStep1Locked] = useState(false);
  const [step2Locked, setStep2Locked] = useState(false);
  const [step1Submitted, setStep1Submitted] = useState(false);
  const [step2Submitted, setStep2Submitted] = useState(false);

  const step1Grades = useMemo(
    () => ({
      x: gradeEntry(step1.x, vStdTruth.x),
      y: gradeEntry(step1.y, vStdTruth.y),
    }),
    [step1, vStdTruth],
  );
  const step2Grades = useMemo(
    () => ({
      x: gradeEntry(step2.x, vB2Truth.x),
      y: gradeEntry(step2.y, vB2Truth.y),
    }),
    [step2, vB2Truth],
  );

  const step1Correct =
    step1Grades.x === "correct" && step1Grades.y === "correct";
  const step2Correct =
    step2Grades.x === "correct" && step2Grades.y === "correct";

  // Auto-lock when correct.
  useEffect(() => {
    if (step1Correct && !step1Locked) setStep1Locked(true);
  }, [step1Correct, step1Locked]);
  useEffect(() => {
    if (step2Correct && !step2Locked) setStep2Locked(true);
  }, [step2Correct, step2Locked]);

  const allDone = step1Locked && step2Locked;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      v_in_b1_x: puzzle.vInB1.x,
      v_in_b1_y: puzzle.vInB1.y,
      v_std_truth_x: Number(vStdTruth.x.toFixed(3)),
      v_std_truth_y: Number(vStdTruth.y.toFixed(3)),
      v_b2_truth_x: Number(vB2Truth.x.toFixed(3)),
      v_b2_truth_y: Number(vB2Truth.y.toFixed(3)),
      step1_locked: step1Locked ? 1 : 0,
      step2_locked: step2Locked ? 1 : 0,
      step1_submitted: step1Submitted ? 1 : 0,
      step2_submitted: step2Submitted ? 1 : 0,
      step1_correct: step1Correct ? 1 : 0,
      step2_correct: step2Correct ? 1 : 0,
      all_done: allDone ? 1 : 0,
    });
  }, [
    puzzleIdx,
    puzzle,
    vStdTruth,
    vB2Truth,
    step1Locked,
    step2Locked,
    step1Submitted,
    step2Submitted,
    step1Correct,
    step2Correct,
    allDone,
    onStateChange,
  ]);

  const submitStep1 = useCallback(() => {
    setStep1Submitted(true);
    recordInteraction("submit_step1", {
      guess_x: Number(step1.x) || 0,
      guess_y: Number(step1.y) || 0,
      correct: step1Correct,
    });
  }, [step1, step1Correct, recordInteraction]);

  const submitStep2 = useCallback(() => {
    setStep2Submitted(true);
    recordInteraction("submit_step2", {
      guess_x: Number(step2.x) || 0,
      guess_y: Number(step2.y) || 0,
      correct: step2Correct,
    });
  }, [step2, step2Correct, recordInteraction]);

  const revealStep1 = useCallback(() => {
    setStep1({ x: fmt(vStdTruth.x), y: fmt(vStdTruth.y) });
    setStep1Submitted(true);
    setStep1Locked(true);
    recordInteraction("reveal_step1");
  }, [vStdTruth, recordInteraction]);

  const revealStep2 = useCallback(() => {
    setStep2({ x: fmt(vB2Truth.x), y: fmt(vB2Truth.y) });
    setStep2Submitted(true);
    setStep2Locked(true);
    recordInteraction("reveal_step2");
  }, [vB2Truth, recordInteraction]);

  const choosePuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      setStep1({ x: "", y: "" });
      setStep2({ x: "", y: "" });
      setStep1Locked(false);
      setStep2Locked(false);
      setStep1Submitted(false);
      setStep2Submitted(false);
      recordInteraction("puzzle", { label: PUZZLES[idx].label });
    },
    [recordInteraction],
  );

  const step1Status: StepStatus = step1Locked ? "locked" : "active";
  const step2Status: StepStatus = step2Locked
    ? "locked"
    : step1Locked
      ? "active"
      : "pending";

  const stateSummary = useMemo(() => {
    const setup = `Puzzle "${puzzle.label}": [v]_B1 = (${puzzle.vInB1.x}, ${puzzle.vInB1.y}); B₁ = [[${puzzle.B1.a}, ${puzzle.B1.b}], [${puzzle.B1.c}, ${puzzle.B1.d}]]; B₂ = [[${puzzle.B2.a}, ${puzzle.B2.b}], [${puzzle.B2.c}, ${puzzle.B2.d}]].`;
    const truths = `Truth: [v]_std = (${fmt(vStdTruth.x)}, ${fmt(vStdTruth.y)}); [v]_B2 = (${fmt(vB2Truth.x)}, ${fmt(vB2Truth.y)}).`;
    const progress = allDone
      ? `Both steps solved.`
      : step1Locked
        ? `Step 1 locked. Reader is currently on step 2; their guess is (${step2.x}, ${step2.y}).`
        : `Reader is on step 1; their guess is (${step1.x}, ${step1.y}).`;
    return `${setup} ${truths} ${progress}`;
  }, [puzzle, vStdTruth, vB2Truth, step1, step2, step1Locked, allDone]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        s1_locked: step1Locked,
        s2_locked: step2Locked,
        s1_guess: [step1.x, step1.y],
        s2_guess: [step2.x, step2.y],
      }),
    [puzzleIdx, step1Locked, step2Locked, step1, step2],
  );

  return (
    <div className={`cbr${allDone ? " cbr--complete" : ""}`}>
      <header className="cbr__head">
        <div className="cbr__heading">
          <span className="cbr__heading-label">PUZZLE</span>
          <span className="cbr__heading-value">{puzzle.label}</span>
        </div>
        <div className="cbr__heading">
          <span className="cbr__heading-label">[v]_B₁ — GIVEN</span>
          <span className="cbr__heading-value">
            ({puzzle.vInB1.x}, {puzzle.vInB1.y})
          </span>
        </div>
        <div className="cbr__heading">
          <span className="cbr__heading-label">RELAY</span>
          <span className="cbr__heading-value">
            B₁ · [v]_B₁ → [v]_std,&nbsp;then B₂⁻¹ · [v]_std → [v]_B₂
          </span>
        </div>
      </header>

      <MatrixDisplay
        label="B₁ (B₁'s columns are basis 1's vectors)"
        matrix={puzzle.B1}
      />
      <MatrixDisplay
        label="B₂ (B₂'s columns are basis 2's vectors)"
        matrix={puzzle.B2}
      />
      {B2inv && (
        <MatrixDisplay
          label="B₂⁻¹ — precomputed for the relay's second hop"
          matrix={B2inv}
          tone="dim"
        />
      )}

      <StepCard
        index={1}
        title="Step 1 — convert B₁ coords to standard coords"
        formula={`[v]_std  =  B₁ · [v]_B₁  =  B₁ · (${puzzle.vInB1.x}, ${puzzle.vInB1.y})`}
        status={step1Status}
        guess={step1}
        grades={step1Grades}
        submitted={step1Submitted}
        truth={vStdTruth}
        onChange={(field, val) =>
          setStep1((g) => ({ ...g, [field]: val }))
        }
        onSubmit={submitStep1}
        onReveal={revealStep1}
        slot="std"
      />
      <StepCard
        index={2}
        title="Step 2 — convert standard coords to B₂ coords"
        formula={
          step1Locked
            ? `[v]_B₂  =  B₂⁻¹ · [v]_std  =  B₂⁻¹ · (${fmt(vStdTruth.x)}, ${fmt(vStdTruth.y)})`
            : `Solve step 1 first. Then [v]_B₂ = B₂⁻¹ · [v]_std with the value you found.`
        }
        status={step2Status}
        guess={step2}
        grades={step2Grades}
        submitted={step2Submitted}
        truth={vB2Truth}
        onChange={(field, val) =>
          setStep2((g) => ({ ...g, [field]: val }))
        }
        onSubmit={submitStep2}
        onReveal={revealStep2}
        slot="B2"
      />

      <div
        className={`cbr__verdict cbr__verdict--${
          allDone ? "done" : step1Locked ? "midway" : "start"
        }`}
      >
        <span className="cbr__verdict-label">Status</span>
        <span className="cbr__verdict-value">
          {allDone
            ? `✓ Relay complete. [v]_B₂ = (${fmt(vB2Truth.x)}, ${fmt(vB2Truth.y)}). The full chain you executed: [v]_B₂ = B₂⁻¹ · B₁ · [v]_B₁ = (B₂⁻¹ · B₁) · [v]_B₁. The matrix B₂⁻¹ · B₁ is the direct change-of-basis matrix from B₁ to B₂; computing it once saves repeating the relay for every new vector.`
            : step1Locked
              ? `Step 1 locked. ${puzzle.notes}`
              : `${puzzle.notes} Start with step 1.`}
        </span>
      </div>

      <div className="cbr__puzzle-row">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`cbr__puzzle-pick${i === puzzleIdx ? " cbr__puzzle-pick--active" : ""}`}
            onClick={() => choosePuzzle(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <WidgetExplainer
        widgetName="Change of basis relay — multi-step solver"
        widgetDescription="A two-step computational solver. The reader is given a vector v's coordinates in basis B₁, plus the two basis matrices B₁ and B₂; they have to find v's coordinates in basis B₂. The widget splits the computation into the canonical relay: step 1 converts [v]_B₁ to standard coordinates via B₁·[v]_B₁; step 2 converts standard coordinates to [v]_B₂ via B₂⁻¹·[v]_std. Each step has a pair of numeric inputs (x and y components), per-entry grading on submit (correct entries flash green, wrong red), an option to reveal that step's answer, and an automatic lock when correct. Step 2 is gated until step 1 is locked, so the reader cannot skip ahead and use the truth of step 2 to back-derive step 1. B₂⁻¹ is displayed pre-computed so the reader doesn't have to invert by hand. Four puzzles span the regime: identity-to-rotation, diagonal stretches, sheared-to-standard, and two non-trivial bases."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Components ────────────────────────────────────────────────────────

interface MatrixDisplayProps {
  label: string;
  matrix: Matrix2;
  tone?: "primary" | "dim";
}

function MatrixDisplay({ label, matrix, tone = "primary" }: MatrixDisplayProps) {
  return (
    <div className={`cbr__matrix cbr__matrix--${tone}`}>
      <span className="cbr__matrix-label">{label}</span>
      <div className="cbr__matrix-grid">
        <div className="cbr__bracket cbr__bracket--left" />
        <div className="cbr__matrix-cells">
          <span>{fmt(matrix.a)}</span>
          <span>{fmt(matrix.b)}</span>
          <span>{fmt(matrix.c)}</span>
          <span>{fmt(matrix.d)}</span>
        </div>
        <div className="cbr__bracket cbr__bracket--right" />
      </div>
    </div>
  );
}

interface StepCardProps {
  index: number;
  title: string;
  formula: string;
  status: StepStatus;
  guess: { x: string; y: string };
  grades: { x: "correct" | "wrong" | "empty"; y: "correct" | "wrong" | "empty" };
  submitted: boolean;
  truth: Vec2;
  onChange: (field: "x" | "y", value: string) => void;
  onSubmit: () => void;
  onReveal: () => void;
  slot: "std" | "B2";
}

function StepCard({
  index,
  title,
  formula,
  status,
  guess,
  grades,
  submitted,
  truth,
  onChange,
  onSubmit,
  onReveal,
  slot,
}: StepCardProps) {
  const disabled = status === "pending" || status === "locked";
  return (
    <section className={`cbr__step cbr__step--${status}`}>
      <header className="cbr__step-head">
        <span className="cbr__step-index">{index}</span>
        <span className="cbr__step-title">{title}</span>
        <span
          className={`cbr__step-pill cbr__step-pill--${status}`}
        >
          {status === "locked"
            ? "locked"
            : status === "active"
              ? "active"
              : "waiting"}
        </span>
      </header>
      <div className="cbr__step-formula">{formula}</div>
      <div className="cbr__step-inputs">
        <div className="cbr__step-label">
          {slot === "std" ? "[v]_std =" : "[v]_B₂ ="}
        </div>
        <div className="cbr__bracket cbr__bracket--left" />
        <div className="cbr__step-entries">
          <input
            type="text"
            inputMode="decimal"
            className={`cbr__step-input${
              submitted
                ? grades.x === "correct"
                  ? " cbr__step-input--correct"
                  : grades.x === "wrong"
                    ? " cbr__step-input--wrong"
                    : ""
                : ""
            }`}
            value={status === "locked" ? fmt(truth.x) : guess.x}
            onChange={(e) => onChange("x", e.target.value)}
            disabled={disabled}
            placeholder="?"
            aria-label={`Step ${index} x component`}
          />
          <input
            type="text"
            inputMode="decimal"
            className={`cbr__step-input${
              submitted
                ? grades.y === "correct"
                  ? " cbr__step-input--correct"
                  : grades.y === "wrong"
                    ? " cbr__step-input--wrong"
                    : ""
                : ""
            }`}
            value={status === "locked" ? fmt(truth.y) : guess.y}
            onChange={(e) => onChange("y", e.target.value)}
            disabled={disabled}
            placeholder="?"
            aria-label={`Step ${index} y component`}
          />
        </div>
        <div className="cbr__bracket cbr__bracket--right" />
      </div>
      {status === "active" && (
        <div className="cbr__step-actions">
          <button type="button" className="cbr__step-submit" onClick={onSubmit}>
            Submit step {index}
          </button>
          <button type="button" className="cbr__step-reveal" onClick={onReveal}>
            Reveal step {index}
          </button>
        </div>
      )}
      {submitted && status === "active" && (
        <div className="cbr__step-hint">
          {grades.x === "correct" && grades.y === "correct"
            ? "✓ Step solved."
            : "Not quite. Wrong entries are red; correct ones are green. Adjust and resubmit."}
        </div>
      )}
      {status === "pending" && (
        <div className="cbr__step-hint cbr__step-hint--pending">
          Locked until step {index - 1} is solved.
        </div>
      )}
    </section>
  );
}
