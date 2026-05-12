/**
 * SystemTriage — rapid-classify quiz for 2×2 / 3×3 systems.
 *
 * Used by:
 *   - linear-algebra-matrix-inverse
 *
 * THIS IS A SPEED-CLASSIFY MINIGAME. Eight random 2×2 or 3×3 systems
 * are presented one at a time. The reader has 5 seconds per system
 * to classify it as one of three outcomes:
 *   - UNIQUE solution (the system has exactly one solution).
 *   - INFINITE solutions (under-determined; one or more free vars).
 *   - NO solution (inconsistent; rows reduce to 0 = c with c ≠ 0).
 *
 * Wrong answers and timeouts both count as misses. Hitting the right
 * button advances immediately; missing surfaces the actual outcome
 * for half a second before advancing. Score is correct hits out of 8.
 *
 * Pedagogy: classifying a system without actually solving it is the
 * skill of reading the *signature* of the augmented matrix. Two rows
 * proportional in the coefficient block but different in the RHS →
 * inconsistent. Coefficient block has rank < unknowns and RHS is
 * consistent → free variable. Coefficient block full rank → unique.
 * Drilling on this under time pressure makes the recognition reflexive
 * rather than calculation-driven.
 *
 * Each system is pre-baked rather than randomly generated, so the
 * widget can guarantee a balanced mix across the three outcomes and
 * a known classification for each (no parser ambiguity, no edge
 * cases on auto-classification).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./SystemTriage.css";

const TIME_PER = 5; // seconds per system
const TOTAL = 8;

type Outcome = "unique" | "infinite" | "none";

interface Question {
  /** Pretty-printed row-by-row representation of the augmented matrix. */
  rows: number[][]; // each row is coefficients ... | RHS
  outcome: Outcome;
  unknowns: string; // e.g. "x, y" or "x, y, z"
  why: string;
}

const QUESTIONS: Question[] = [
  // ── 2×2 systems ────────────────────────────────────────────────
  {
    rows: [
      [1, 1, 5],
      [1, -1, 1],
    ],
    outcome: "unique",
    unknowns: "x, y",
    why: "Rows are independent. det of coefficient block = 1·(-1) − 1·1 = -2 ≠ 0.",
  },
  {
    rows: [
      [2, 4, 6],
      [1, 2, 3],
    ],
    outcome: "infinite",
    unknowns: "x, y",
    why: "Second row is half of the first. Same equation twice → one free variable.",
  },
  {
    rows: [
      [1, 1, 2],
      [2, 2, 5],
    ],
    outcome: "none",
    unknowns: "x, y",
    why: "Coefficients proportional (R2 = 2·R1) but RHS isn't (4 ≠ 5). Inconsistent.",
  },
  {
    rows: [
      [3, 1, 7],
      [1, 2, 8],
    ],
    outcome: "unique",
    unknowns: "x, y",
    why: "det = 3·2 − 1·1 = 5 ≠ 0. Unique solution.",
  },
  // ── 3×3 systems ────────────────────────────────────────────────
  {
    rows: [
      [1, 0, 0, 4],
      [0, 1, 0, -1],
      [0, 0, 1, 2],
    ],
    outcome: "unique",
    unknowns: "x, y, z",
    why: "Already RREF — three independent equations, three unknowns. (x, y, z) = (4, -1, 2).",
  },
  {
    rows: [
      [1, 1, 1, 3],
      [2, 2, 2, 6],
      [1, 2, 3, 6],
    ],
    outcome: "infinite",
    unknowns: "x, y, z",
    why: "R2 = 2·R1 — only two independent equations for three unknowns → free variable.",
  },
  {
    rows: [
      [1, 1, 0, 1],
      [0, 1, 1, 2],
      [1, 1, 0, 5],
    ],
    outcome: "none",
    unknowns: "x, y, z",
    why: "R1 and R3 have identical coefficients but different RHS (1 vs 5). Inconsistent.",
  },
  {
    rows: [
      [1, 0, 1, 2],
      [0, 1, 0, 3],
      [0, 0, 0, 0],
    ],
    outcome: "infinite",
    unknowns: "x, y, z",
    why: "Last row is identically zero — one free variable (z). System is consistent but under-determined.",
  },
  // ── extras (used when reshuffling) ─────────────────────────────
  {
    rows: [
      [1, 2, 4],
      [3, 6, 12],
    ],
    outcome: "infinite",
    unknowns: "x, y",
    why: "R2 = 3·R1 in coefficients AND in RHS — same equation, infinitely many solutions.",
  },
  {
    rows: [
      [1, 2, 3],
      [3, 6, 8],
    ],
    outcome: "none",
    unknowns: "x, y",
    why: "Coefficients of R2 are 3× R1 but RHS isn't (9 ≠ 8). Inconsistent.",
  },
  {
    rows: [
      [2, 1, 3, 11],
      [0, 1, 1, 5],
      [0, 0, 2, 4],
    ],
    outcome: "unique",
    unknowns: "x, y, z",
    why: "Upper triangular with non-zero pivots — back-substitution gives a unique (x, y, z).",
  },
  {
    rows: [
      [1, 1, 1, 1],
      [1, 1, 1, 2],
      [1, 1, 1, 3],
    ],
    outcome: "none",
    unknowns: "x, y, z",
    why: "All three rows have identical coefficients but different RHS — contradictory equations.",
  },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickQuestions(): Question[] {
  // Try to get a balanced mix.
  const u = shuffle(QUESTIONS.filter((q) => q.outcome === "unique"));
  const i = shuffle(QUESTIONS.filter((q) => q.outcome === "infinite"));
  const n = shuffle(QUESTIONS.filter((q) => q.outcome === "none"));
  // Pick ~3 unique, ~3 infinite, ~2 none (or similar) up to TOTAL.
  const sel: Question[] = [];
  for (let k = 0; k < 3 && k < u.length; k++) sel.push(u[k]);
  for (let k = 0; k < 3 && k < i.length; k++) sel.push(i[k]);
  for (let k = 0; k < 2 && k < n.length; k++) sel.push(n[k]);
  return shuffle(sel).slice(0, TOTAL);
}

function formatNum(x: number): string {
  if (Math.abs(x - Math.round(x)) < 1e-9) return Math.round(x).toString();
  return x.toFixed(2);
}

interface SystemTriageProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function SystemTriage({ onStateChange }: SystemTriageProps) {
  const { recordInteraction } = useWidgetTelemetry("SystemTriage");
  const [questions, setQuestions] = useState<Question[]>(() => pickQuestions());
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState<"none" | "right" | "wrong" | "timeout">("none");
  const [bestScore, setBestScore] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const advanceRef = useRef<number | null>(null);

  const current = questions[idx];
  const remaining = Math.max(0, TIME_PER - elapsed);

  // Timer.
  useEffect(() => {
    if (!running || feedback !== "none") {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = window.setInterval(() => {
      const since = startRef.current
        ? (performance.now() - startRef.current) / 1000
        : 0;
      setElapsed(since);
      if (since >= TIME_PER) {
        // Timeout.
        setFeedback("timeout");
        recordInteraction("timeout", {
          question_index: idx,
          truth: current.outcome,
        });
      }
    }, 50);
    return () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [running, feedback, idx, current, recordInteraction]);

  // Auto-advance after feedback.
  useEffect(() => {
    if (feedback === "none") return;
    advanceRef.current = window.setTimeout(() => {
      if (idx + 1 >= questions.length) {
        // Finish run.
        setRunning(false);
        setFinished(true);
        setBestScore((prev) =>
          prev === null ? score + (feedback === "right" ? 1 : 0) : Math.max(prev, score + (feedback === "right" ? 1 : 0)),
        );
      } else {
        setIdx((i) => i + 1);
        setFeedback("none");
        setElapsed(0);
        startRef.current = performance.now();
      }
    }, feedback === "right" ? 400 : 1200);
    return () => {
      if (advanceRef.current !== null) {
        window.clearTimeout(advanceRef.current);
        advanceRef.current = null;
      }
    };
  }, [feedback, idx, questions.length, score]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      question_index: idx,
      score,
      finished: finished ? 1 : 0,
      running: running ? 1 : 0,
      time_remaining: Number(remaining.toFixed(2)),
      best: bestScore ?? 0,
    });
  }, [idx, score, finished, running, remaining, bestScore, onStateChange]);

  const handleStart = useCallback(() => {
    setQuestions(pickQuestions());
    setIdx(0);
    setScore(0);
    setRunning(true);
    setFinished(false);
    setFeedback("none");
    setElapsed(0);
    startRef.current = performance.now();
    recordInteraction("start");
  }, [recordInteraction]);

  const handleAnswer = useCallback(
    (answer: Outcome) => {
      if (feedback !== "none" || !running) return;
      const correct = answer === current.outcome;
      if (correct) {
        setScore((s) => s + 1);
        setFeedback("right");
      } else {
        setFeedback("wrong");
      }
      recordInteraction("answer", {
        question_index: idx,
        chose: answer,
        truth: current.outcome,
        correct,
        elapsed: Number(elapsed.toFixed(2)),
      });
    },
    [feedback, running, current, idx, elapsed, recordInteraction],
  );

  const stateSummary = useMemo(() => {
    if (!running && !finished) {
      return `System Triage — ready to start. Score will be over ${TOTAL} questions; ${TIME_PER}s each.`;
    }
    if (finished) {
      return `System Triage — finished. Final score: ${score}/${TOTAL}. Best so far: ${bestScore ?? score}.`;
    }
    const rowsStr = current.rows.map((r) => `[${r.map(formatNum).join(", ")}]`).join("; ");
    return `System Triage — question ${idx + 1}/${TOTAL}, ${remaining.toFixed(1)}s left. Current system: ${rowsStr} (unknowns: ${current.unknowns}). Reader's score so far: ${score}. Feedback state: ${feedback}.`;
  }, [running, finished, score, bestScore, current, idx, remaining, feedback]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        idx,
        score,
        finished,
        running,
        feedback,
      }),
    [idx, score, finished, running, feedback],
  );

  const correctAnsweredEntirely = finished && score === TOTAL;

  return (
    <div
      className={`st${correctAnsweredEntirely ? " st--perfect" : ""}${
        finished && score < TOTAL ? " st--finished" : ""
      }`}
    >
      <header className="st__head">
        <div className="st__heading">
          <span className="st__heading-label">QUESTION</span>
          <span className="st__heading-value">
            {running || finished ? `${Math.min(idx + 1, TOTAL)} / ${TOTAL}` : `– / ${TOTAL}`}
          </span>
        </div>
        <div className="st__heading">
          <span className="st__heading-label">TIME</span>
          <span
            className={`st__heading-value st__heading-value--large${
              remaining < 1.5 && running && feedback === "none"
                ? " st__heading-value--warn"
                : ""
            }`}
          >
            {running && feedback === "none" ? remaining.toFixed(1) : "—"}s
          </span>
        </div>
        <div className="st__heading">
          <span className="st__heading-label">SCORE</span>
          <span className="st__heading-value st__heading-value--large">
            {score}
          </span>
        </div>
        <div className="st__heading">
          <span className="st__heading-label">BEST</span>
          <span className="st__heading-value">{bestScore ?? "—"}</span>
        </div>
      </header>

      {!running && !finished && (
        <div className="st__intro">
          <p>
            Eight systems. {TIME_PER} seconds each. Hit{" "}
            <strong>unique</strong>, <strong>infinite</strong>, or{" "}
            <strong>no solution</strong> based on the system's signature — no
            time to actually solve, just classify.
          </p>
          <button type="button" className="st__start" onClick={handleStart}>
            Start run
          </button>
        </div>
      )}

      {running && current && (
        <div className="st__game">
          <span className="st__panel-label">
            Classify the system in unknowns: {current.unknowns}
          </span>
          <div className="st__matrix">
            <div className="st__matrix-bracket st__matrix-bracket--left" />
            <div
              className="st__matrix-grid"
              style={{
                gridTemplateColumns: `repeat(${current.rows[0].length}, 1fr)`,
              }}
            >
              {current.rows.map((row, ri) =>
                row.map((x, ci) => (
                  <span
                    key={`${ri}-${ci}`}
                    className={`st__cell${ci === row.length - 2 ? " st__cell--last-coef" : ""}${ci === row.length - 1 ? " st__cell--rhs" : ""}`}
                  >
                    {formatNum(x)}
                  </span>
                )),
              )}
            </div>
            <div className="st__matrix-bracket st__matrix-bracket--right" />
          </div>

          <div className="st__choices">
            <button
              type="button"
              className="st__choice st__choice--unique"
              onClick={() => handleAnswer("unique")}
              disabled={feedback !== "none"}
            >
              Unique solution
            </button>
            <button
              type="button"
              className="st__choice st__choice--infinite"
              onClick={() => handleAnswer("infinite")}
              disabled={feedback !== "none"}
            >
              Infinite solutions
            </button>
            <button
              type="button"
              className="st__choice st__choice--none"
              onClick={() => handleAnswer("none")}
              disabled={feedback !== "none"}
            >
              No solution
            </button>
          </div>

          {feedback !== "none" && (
            <div
              className={`st__feedback st__feedback--${feedback}`}
            >
              <span className="st__feedback-headline">
                {feedback === "right" && "✓ Correct"}
                {feedback === "wrong" && `Wrong — actually ${current.outcome === "unique" ? "UNIQUE" : current.outcome === "infinite" ? "INFINITE" : "NO SOLUTION"}`}
                {feedback === "timeout" && `Timed out — was ${current.outcome === "unique" ? "UNIQUE" : current.outcome === "infinite" ? "INFINITE" : "NO SOLUTION"}`}
              </span>
              <span className="st__feedback-body">{current.why}</span>
            </div>
          )}
        </div>
      )}

      {finished && (
        <div
          className={`st__verdict st__verdict--${
            score === TOTAL
              ? "perfect"
              : score >= TOTAL * 0.7
                ? "good"
                : "needs-work"
          }`}
        >
          <span className="st__verdict-label">Run complete</span>
          <span className="st__verdict-value">
            {score === TOTAL && (
              <>
                ✓ Perfect — {score} / {TOTAL}. You can read system signatures at speed.
              </>
            )}
            {score < TOTAL && score >= TOTAL * 0.7 && (
              <>
                Good — {score} / {TOTAL}. Reliable on most signatures; the ones you missed are usually the proportional-rows-different-RHS pattern.
              </>
            )}
            {score < TOTAL * 0.7 && (
              <>
                {score} / {TOTAL}. The signatures still take you a beat too long.
                Re-read the row-echelon section and try again — practice helps.
              </>
            )}
          </span>
          <button type="button" className="st__start" onClick={handleStart}>
            Start another run
          </button>
        </div>
      )}

      <WidgetExplainer
        widgetName="System Triage — rapid classification of linear systems"
        widgetDescription="A speed-classify minigame. Eight 2×2 or 3×3 augmented matrices flash one at a time; the reader has 5 seconds each to classify the system as UNIQUE solution, INFINITE solutions, or NO solution. Wrong answers and timeouts both count as misses; correct answers advance immediately. Final score out of 8 with a personal-best tracker across runs. Questions are drawn from a curated bank with three outcome classes, balanced ~3:3:2. The pedagogical point is reading the SIGNATURE of an augmented matrix without solving it: two rows with proportional coefficients but different RHS → inconsistent (no solution); rank-deficient coefficient block with consistent RHS → free variable (infinite solutions); full-rank coefficient block → unique solution. Drilling this under a 5-second clock makes the recognition reflexive rather than calculation-driven, which is the right disposition for inspecting systems in the wild (least-squares fits, regression, eigenvalue problems) where the consistency question is the first thing you ask. After every answer the widget surfaces the WHY for that question — proportional rows, free variable, contradictory RHS — so missed questions become a teaching moment, not just a tally."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}
