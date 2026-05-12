/**
 * BasisOrNot — rapid-fire basis judgement quiz.
 *
 * Used by:
 *   - linear-algebra-span
 * Cross-link candidates:
 *   - linear-algebra-basis (the basis lesson uses the same gate; the
 *     widget can be re-used there with a slightly different intro)
 *
 * THIS IS A SPEED QUIZ. Ten pairs of 2D vectors flash one at a time.
 * For each pair, the reader chooses BASIS (two independent vectors —
 * they span ℝ²) or NOT BASIS (dependent — they collapse to a line, or
 * one is zero). Each judgement is immediately graded; correct answers
 * are streak-counted. At round 10, a final scorecard is shown.
 *
 * Keyboard-first: B = basis, N = not basis, ←/→ = back/forward. Mouse
 * fallback via two big buttons.
 *
 * Pedagogy: develops a *reflex* for spotting degenerate cases. The
 * algebraic test (det[u | v] != 0) takes a few seconds; the visual
 * recognition ("those two vectors are obviously colinear") can become
 * sub-second with practice. The widget grinds that reflex.
 *
 * The pair generator deliberately mixes:
 *   - clear bases (orthogonal, well-separated)
 *   - clear non-bases (one is k·other; one is zero)
 *   - near-misses (vectors at very small angle — independent, but
 *     they LOOK dependent; the visual reflex must be calibrated to
 *     "different direction" not "different position")
 *
 * Implements a genuinely-new mechanic for this codebase: timed
 * judgement under cognitive load.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./BasisOrNot.css";

const CANVAS_SIZE = 280;
const TOTAL_ROUNDS = 10;
const COLLINEAR_EPS = 0.04;

interface Vec2 {
  x: number;
  y: number;
}

interface Pair {
  u: Vec2;
  v: Vec2;
  /** True iff (u, v) form a basis of ℝ² — i.e. det[u | v] != 0. */
  isBasis: boolean;
  /** "easy" | "near-miss" | "zero" — used for telemetry and explanation. */
  category: "easy-basis" | "easy-non-basis" | "near-miss-basis" | "near-miss-non-basis" | "zero";
}

interface RoundAnswer {
  pair: Pair;
  answeredBasis: boolean;
  correct: boolean;
  elapsedMs: number;
}

function det(u: Vec2, v: Vec2): number {
  return u.x * v.y - u.y * v.x;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

/** Generate a single pair from a target category. */
function generatePair(target?: Pair["category"]): Pair {
  const which = target ?? (["easy-basis", "easy-non-basis", "near-miss-basis", "near-miss-non-basis", "zero"] as const)[
    randInt(0, 4)
  ];
  if (which === "zero") {
    // One vector is zero — degenerate, not a basis.
    const u = { x: randInt(-3, 3) || 1, y: randInt(-3, 3) || 1 };
    const zero = { x: 0, y: 0 };
    return Math.random() < 0.5
      ? { u, v: zero, isBasis: false, category: "zero" }
      : { u: zero, v: u, isBasis: false, category: "zero" };
  }
  if (which === "easy-non-basis") {
    // Make them obviously parallel: v = k·u for integer k ∈ [-3, -1, 1, 2, 3].
    const u = { x: randInt(-3, 3) || 1, y: randInt(-3, 3) || 1 };
    const ks = [-3, -2, -1, 2, 3];
    const k = ks[randInt(0, ks.length - 1)];
    const v = { x: k * u.x, y: k * u.y };
    return { u, v, isBasis: false, category: "easy-non-basis" };
  }
  if (which === "near-miss-non-basis") {
    // Subtle dependent: non-integer multiple.
    const u = { x: randInt(-2, 2) || 1, y: randInt(-2, 2) || 1 };
    const k = (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 1.5);
    return {
      u,
      v: { x: Number((k * u.x).toFixed(2)), y: Number((k * u.y).toFixed(2)) },
      isBasis: false,
      category: "near-miss-non-basis",
    };
  }
  if (which === "near-miss-basis") {
    // Independent but very close in direction — small angle.
    const u = { x: randInt(-3, 3) || 2, y: randInt(-3, 3) || 1 };
    // Rotate u by 8-18° and rescale slightly so v looks parallel-ish.
    const angle = (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 180) * (8 + Math.random() * 10);
    const scale = 0.7 + Math.random() * 0.6;
    const v = {
      x: Number(((Math.cos(angle) * u.x - Math.sin(angle) * u.y) * scale).toFixed(2)),
      y: Number(((Math.sin(angle) * u.x + Math.cos(angle) * u.y) * scale).toFixed(2)),
    };
    if (Math.abs(det(u, v)) < COLLINEAR_EPS) return generatePair("near-miss-basis");
    return { u, v, isBasis: true, category: "near-miss-basis" };
  }
  // easy-basis: clearly different directions.
  const u = { x: randInt(-3, 3) || 1, y: randInt(-3, 3) || 1 };
  let v = { x: 0, y: 0 };
  for (let i = 0; i < 12; i++) {
    v = { x: randInt(-3, 3) || 1, y: randInt(-3, 3) || 1 };
    if (Math.abs(det(u, v)) > 1.5) return { u, v, isBasis: true, category: "easy-basis" };
  }
  return { u, v, isBasis: true, category: "easy-basis" };
}

function generateRound(): Pair[] {
  // Balanced mix: 4 easy-basis, 3 easy-non-basis, 1 zero, 1 near-miss-basis,
  // 1 near-miss-non-basis. Total 10.
  const planned: Pair["category"][] = [
    "easy-basis", "easy-basis", "easy-basis", "easy-basis",
    "easy-non-basis", "easy-non-basis", "easy-non-basis",
    "zero",
    "near-miss-basis",
    "near-miss-non-basis",
  ];
  // Fisher-Yates shuffle to randomise order.
  for (let i = planned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [planned[i], planned[j]] = [planned[j], planned[i]];
  }
  return planned.map((c) => generatePair(c));
}

interface BasisOrNotProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function BasisOrNot({ onStateChange }: BasisOrNotProps) {
  const { recordInteraction } = useWidgetTelemetry("BasisOrNot");
  const [pairs, setPairs] = useState<Pair[]>(() => generateRound());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<RoundAnswer[]>([]);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(() =>
    performance.now(),
  );
  const [feedback, setFeedback] = useState<{ correct: boolean; truthIsBasis: boolean } | null>(
    null,
  );

  const isDone = answers.length >= TOTAL_ROUNDS;
  const correctCount = answers.filter((a) => a.correct).length;
  const avgMs =
    answers.length === 0 ? 0 : answers.reduce((s, a) => s + a.elapsedMs, 0) / answers.length;

  const currentPair: Pair | undefined = isDone ? undefined : pairs[currentIdx];

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      current_round: currentIdx,
      total_rounds: TOTAL_ROUNDS,
      answered: answers.length,
      correct: correctCount,
      accuracy: answers.length === 0 ? 0 : Number((correctCount / answers.length).toFixed(3)),
      avg_ms: Math.round(avgMs),
      finished: isDone ? 1 : 0,
    });
  }, [currentIdx, answers, correctCount, avgMs, isDone, onStateChange]);

  const handleAnswer = useCallback(
    (answeredBasis: boolean) => {
      if (isDone || !currentPair) return;
      const elapsedMs = performance.now() - questionStartedAt;
      const correct = answeredBasis === currentPair.isBasis;
      setFeedback({ correct, truthIsBasis: currentPair.isBasis });
      setAnswers((prev) => [
        ...prev,
        { pair: currentPair, answeredBasis, correct, elapsedMs },
      ]);
      recordInteraction("answer", {
        round: currentIdx,
        answered_basis: answeredBasis,
        correct,
        elapsed_ms: Math.round(elapsedMs),
        category: currentPair.category,
      });
      // Advance after a short flash.
      setTimeout(() => {
        setFeedback(null);
        setCurrentIdx((i) => i + 1);
        setQuestionStartedAt(performance.now());
      }, 650);
    },
    [isDone, currentPair, questionStartedAt, currentIdx, recordInteraction],
  );

  // Keyboard handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (feedback) return;
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        handleAnswer(true);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleAnswer(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAnswer, feedback]);

  const handleRestart = useCallback(() => {
    setPairs(generateRound());
    setCurrentIdx(0);
    setAnswers([]);
    setFeedback(null);
    setQuestionStartedAt(performance.now());
    recordInteraction("restart");
  }, [recordInteraction]);

  // Per-category accuracy for the post-round breakdown.
  const breakdown = useMemo(() => {
    const buckets: Record<Pair["category"], { total: number; correct: number }> = {
      "easy-basis": { total: 0, correct: 0 },
      "easy-non-basis": { total: 0, correct: 0 },
      "near-miss-basis": { total: 0, correct: 0 },
      "near-miss-non-basis": { total: 0, correct: 0 },
      "zero": { total: 0, correct: 0 },
    };
    for (const a of answers) {
      buckets[a.pair.category].total += 1;
      if (a.correct) buckets[a.pair.category].correct += 1;
    }
    return buckets;
  }, [answers]);

  const stateSummary = useMemo(() => {
    if (isDone) {
      const parts: string[] = [];
      for (const cat of Object.keys(breakdown) as Pair["category"][]) {
        const b = breakdown[cat];
        if (b.total > 0) parts.push(`${cat}: ${b.correct}/${b.total}`);
      }
      return `BasisOrNot finished. Score ${correctCount}/${TOTAL_ROUNDS} (${Math.round(
        (correctCount / TOTAL_ROUNDS) * 100,
      )}%), avg response ${Math.round(avgMs)} ms. Breakdown — ${parts.join("; ")}.`;
    }
    const pair = currentPair;
    if (!pair) return "Round not started.";
    const detVal = det(pair.u, pair.v).toFixed(3);
    return `Round ${currentIdx + 1}/${TOTAL_ROUNDS}. Showing u=(${pair.u.x}, ${pair.u.y}), v=(${pair.v.x}, ${pair.v.y}). det[u|v] = ${detVal}. Truth: ${pair.isBasis ? "BASIS" : "NOT BASIS"}, category ${pair.category}. Reader has answered ${answers.length}/${TOTAL_ROUNDS} with ${correctCount} correct.`;
  }, [isDone, currentPair, currentIdx, answers.length, correctCount, avgMs, breakdown]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        current: currentIdx,
        answered: answers.length,
        correct: correctCount,
        finished: isDone,
      }),
    [currentIdx, answers.length, correctCount, isDone],
  );

  return (
    <div className={`bon${isDone ? " bon--done" : ""}`}>
      <header className="bon__head">
        <div className="bon__heading">
          <span className="bon__heading-label">ROUND</span>
          <span className="bon__heading-value">
            {isDone ? `${TOTAL_ROUNDS}/${TOTAL_ROUNDS}` : `${currentIdx + 1}/${TOTAL_ROUNDS}`}
          </span>
        </div>
        <div className="bon__heading">
          <span className="bon__heading-label">SCORE</span>
          <span className="bon__heading-value">
            {correctCount}/{answers.length || (isDone ? TOTAL_ROUNDS : currentIdx)}
            {answers.length > 0 &&
              ` · ${Math.round((correctCount / Math.max(answers.length, 1)) * 100)}%`}
          </span>
        </div>
        <div className="bon__heading">
          <span className="bon__heading-label">AVG RESPONSE</span>
          <span className="bon__heading-value">
            {answers.length === 0 ? "—" : `${Math.round(avgMs)} ms`}
          </span>
        </div>
      </header>

      {!isDone && currentPair && (
        <>
          <PairCanvas pair={currentPair} feedback={feedback} />
          <div className="bon__pair-values">
            <span>
              <span className="bon__legend bon__legend--u">u</span> = ({currentPair.u.x},{" "}
              {currentPair.u.y})
            </span>
            <span>
              <span className="bon__legend bon__legend--v">v</span> = ({currentPair.v.x},{" "}
              {currentPair.v.y})
            </span>
          </div>
          <div className="bon__answer-row">
            <button
              type="button"
              className={`bon__answer bon__answer--basis${
                feedback?.correct && feedback.truthIsBasis ? " bon__answer--flash-correct" : ""
              }${feedback && !feedback.correct && feedback.truthIsBasis ? " bon__answer--flash-truth" : ""}`}
              onClick={() => handleAnswer(true)}
              disabled={feedback !== null}
            >
              <span className="bon__answer-key">B</span>
              <span className="bon__answer-label">BASIS</span>
              <span className="bon__answer-hint">spans ℝ²</span>
            </button>
            <button
              type="button"
              className={`bon__answer bon__answer--not${
                feedback?.correct && !feedback.truthIsBasis ? " bon__answer--flash-correct" : ""
              }${feedback && !feedback.correct && !feedback.truthIsBasis ? " bon__answer--flash-truth" : ""}`}
              onClick={() => handleAnswer(false)}
              disabled={feedback !== null}
            >
              <span className="bon__answer-key">N</span>
              <span className="bon__answer-label">NOT BASIS</span>
              <span className="bon__answer-hint">collapsed to a line</span>
            </button>
          </div>
          {feedback && (
            <div className={`bon__feedback bon__feedback--${feedback.correct ? "ok" : "bad"}`}>
              {feedback.correct
                ? "✓ Right."
                : `✗ Wrong. Truth: ${feedback.truthIsBasis ? "BASIS" : "NOT BASIS"}.`}
            </div>
          )}
        </>
      )}

      {isDone && (
        <div className="bon__scorecard">
          <div className="bon__scorecard-headline">
            {correctCount === TOTAL_ROUNDS
              ? `Perfect run — ${TOTAL_ROUNDS}/${TOTAL_ROUNDS}.`
              : correctCount >= 8
              ? `Solid: ${correctCount}/${TOTAL_ROUNDS}.`
              : correctCount >= 6
              ? `Mid: ${correctCount}/${TOTAL_ROUNDS}. The near-misses are where to focus.`
              : `Off the pace at ${correctCount}/${TOTAL_ROUNDS}. The visual reflex isn't there yet — look for vectors sharing a line through the origin.`}
          </div>
          <div className="bon__scorecard-stats">
            <span>
              Accuracy {Math.round((correctCount / TOTAL_ROUNDS) * 100)}%
            </span>
            <span>Average response {Math.round(avgMs)} ms</span>
          </div>
          <div className="bon__breakdown">
            {(Object.keys(breakdown) as Pair["category"][]).map((cat) => {
              const b = breakdown[cat];
              if (b.total === 0) return null;
              return (
                <div key={cat} className="bon__breakdown-row">
                  <span className="bon__breakdown-cat">{cat.replace(/-/g, " ")}</span>
                  <span className="bon__breakdown-stat">
                    {b.correct}/{b.total}
                  </span>
                  <div className="bon__breakdown-bar">
                    <div
                      className="bon__breakdown-bar-fill"
                      style={{ width: `${(b.correct / b.total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="bon__restart" onClick={handleRestart}>
            New round of 10
          </button>
        </div>
      )}

      <div className="bon__instructions">
        <strong>How to play.</strong> A pair of vectors appears. Hit <kbd>B</kbd> (or click <em>BASIS</em>) if they're independent and span ℝ². Hit <kbd>N</kbd> (or click <em>NOT BASIS</em>) if they're parallel, opposite, or one is zero. Speed counts — the average response time is part of the scorecard.
      </div>

      <WidgetExplainer
        widgetName="Basis or Not — rapid-fire judgement quiz"
        widgetDescription="A speed quiz for basis recognition in ℝ². Ten pairs of 2D vectors are shown one at a time. For each pair, the reader hits B (basis — independent, spans the plane) or N (not basis — dependent or degenerate). Each answer is immediately graded; a final scorecard shows accuracy, average response time, and a per-category breakdown. Categories: easy-basis (clearly independent), easy-non-basis (integer-multiple parallel pairs), near-miss-basis (independent but small angle — visually deceptive), near-miss-non-basis (decimal-multiple parallel — algebraically subtle), zero (one vector is the zero vector, trivially non-basis). The pedagogical goal is to build a sub-second visual reflex for spotting degenerate cases, rather than relying on the slower algebraic det != 0 calculation."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface PairCanvasProps {
  pair: Pair;
  feedback: { correct: boolean; truthIsBasis: boolean } | null;
}

function PairCanvas({ pair, feedback }: PairCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(
    () => computeDomain([pair.u, pair.v], { padding: 1.45, floor: 3, ceiling: 6 }),
    [pair],
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

    const C_U = resolveColor("var(--widget-chart-1)");
    const C_V = resolveColor("var(--widget-chart-2)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_OK = resolveColorAlpha("var(--widget-success)", 0.18);
    const C_BAD = resolveColorAlpha("var(--widget-danger)", 0.18);

    // Optional flash background.
    if (feedback) {
      ctx.fillStyle = feedback.correct ? C_OK : C_BAD;
      ctx.fillRect(0, 0, W, H);
    }

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

    const origin = toPx({ x: 0, y: 0 });
    drawArrow(ctx, origin, toPx(pair.u), C_U, "u", 2.6);
    drawArrow(ctx, origin, toPx(pair.v), C_V, "v", 2.6);

    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [pair, feedback, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="bon__canvas"
      role="img"
      aria-label="Vector pair display."
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
    const aLen = Math.min(10, len * 0.32);
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
  ctx.font = "600 13px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, head.x + 6, head.y - 8);
  ctx.restore();
}
