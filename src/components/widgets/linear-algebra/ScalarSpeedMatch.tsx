/**
 * ScalarSpeedMatch — timed multiple-choice for scalar multiplication intuition.
 *
 * Used by:
 *   - linear-algebra (the foundations primer, scalar multiplication section)
 *
 * THIS IS A TIMED QUIZ. Not a slider. Not a free-pace puzzle. Each round
 * a vector v is drawn alongside a target k·v (also drawn). Four scalar
 * candidates appear; the reader has SECONDS_PER_ROUND seconds to tap one.
 * Letting the timer expire counts as a wrong answer.
 *
 * The mechanic the catalogue calls out: time pressure forces gut-level
 * intuition rather than careful calculation. The reader has to *feel*
 * "this target looks about 2.5× longer than v" — they cannot stop and
 * compute the ratio.
 *
 * Three difficulty modes:
 *   - Easy: integer scalars from {-3, -2, -1, 2, 3}, distinguishable lengths.
 *     Candidate distractors are also integers but differ by ≥ 1.
 *   - Medium: half-integer scalars (e.g. 0.5, 1.5, -0.5, 2.5), candidates
 *     differ by 0.5.
 *   - Hard: arbitrary decimals from a small grid (e.g. 0.4, 0.7, 1.3, 1.8,
 *     -0.6, -1.4), candidates differ by 0.2-0.3. Forces fine visual
 *     discrimination.
 *
 * Score: each round contributes 0 (wrong / timeout) or a time-weighted
 * positive amount (correct, weighted by how much of the timer was still
 * remaining). 10 rounds per session; final score reported. The reader
 * can restart at any time.
 *
 * State machine per round:
 *   - prep:   vector v and target k·v drawn; 4 candidates shown; timer running
 *   - locked: reader has picked an answer (or timer expired); correct one
 *             flashes green, wrong choice flashes red; brief pause
 *   - advance: state collapses into the next round's prep
 *
 * Implements a brand new pattern beyond the metaphor library: the
 * "timed-flash" quiz mode. Adds it to the library as pattern §13 once
 * shipped. This is unrelated to the chart-default failure — there's
 * no chart, no slider, no continuous control. The reader's interaction
 * is discrete (tap one of four buttons) under a real-time constraint.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./ScalarSpeedMatch.css";

const CANVAS_SIZE = 300;
const ROUNDS_PER_SESSION = 10;
const SECONDS_PER_ROUND = 3.0;
/** Pause after locking a round before auto-advancing, so the reader can
 *  read the verdict before the next round flashes in. */
const FEEDBACK_HOLD_MS = 1100;

type Difficulty = "easy" | "medium" | "hard";

interface Vec2 {
  x: number;
  y: number;
}

interface Round {
  v: Vec2;
  k: number;
  candidates: number[];
}

interface RoundResult {
  k: number;
  pick: number | null;
  correct: boolean;
  remainingSec: number;
}

interface Session {
  difficulty: Difficulty;
  rounds: Round[];
  results: RoundResult[];
  active: number;
}

function randIn<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeVector(): Vec2 {
  // Pick a vector with magnitude ~1.2 to ~2.0 to keep the visualisation tidy.
  // Avoid degenerate axis-aligned vectors so the angle is informative too.
  const angles = [
    Math.PI / 8,
    Math.PI / 6,
    Math.PI / 4,
    Math.PI / 3,
    (5 * Math.PI) / 12,
    (-Math.PI) / 6,
    (-Math.PI) / 4,
    (2 * Math.PI) / 3,
    (3 * Math.PI) / 4,
    Math.PI - Math.PI / 8,
  ];
  const theta = randIn(angles);
  const r = 1.2 + Math.random() * 0.8;
  return {
    x: Number((r * Math.cos(theta)).toFixed(2)),
    y: Number((r * Math.sin(theta)).toFixed(2)),
  };
}

function scalarPool(diff: Difficulty): number[] {
  if (diff === "easy") return [-3, -2, -1, 2, 3];
  if (diff === "medium") return [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
  return [-1.6, -1.2, -0.6, -0.4, 0.4, 0.6, 0.9, 1.3, 1.5, 1.8];
}

function candidateStep(diff: Difficulty): number {
  if (diff === "easy") return 1;
  if (diff === "medium") return 0.5;
  return 0.3;
}

function buildRound(diff: Difficulty): Round {
  const v = makeVector();
  const pool = scalarPool(diff);
  const k = randIn(pool);
  const step = candidateStep(diff);
  // Build three distractors clustered around k.
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    // Offset from k by ±1, ±2, ±3 steps (±0.3, ±0.6 for hard).
    const offsetMult = randIn([-3, -2, -1, 1, 2, 3]);
    const distractor = Number((k + offsetMult * step).toFixed(2));
    if (distractor !== k && Number.isFinite(distractor)) {
      distractors.add(distractor);
    }
  }
  const candidates = [...distractors, k];
  // Shuffle.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return { v, k, candidates };
}

function buildSession(diff: Difficulty): Session {
  return {
    difficulty: diff,
    rounds: Array.from({ length: ROUNDS_PER_SESSION }, () => buildRound(diff)),
    results: [],
    active: 0,
  };
}

interface ScalarSpeedMatchProps {
  initialDifficulty?: Difficulty;
  onStateChange?: (state: Record<string, number>) => void;
}

export function ScalarSpeedMatch({
  initialDifficulty = "easy",
  onStateChange,
}: ScalarSpeedMatchProps) {
  const { recordInteraction } = useWidgetTelemetry("ScalarSpeedMatch");
  const [session, setSession] = useState<Session>(() =>
    buildSession(initialDifficulty),
  );
  const [phase, setPhase] = useState<"prep" | "locked">("prep");
  const [lockedPick, setLockedPick] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(SECONDS_PER_ROUND * 1000);
  const roundStartedAtRef = useRef<number>(performance.now());
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentRound: Round | null =
    session.active < session.rounds.length
      ? session.rounds[session.active]
      : null;
  const sessionDone = session.results.length === ROUNDS_PER_SESSION;

  // Final score: each correct round contributes (1 + 0.5 * timeWeight). Wrong
  // / timeout contributes 0. Time weight = remainingSec / SECONDS_PER_ROUND.
  const finalScore = useMemo(() => {
    let s = 0;
    for (const r of session.results) {
      if (r.correct) {
        s += 1 + 0.5 * (r.remainingSec / SECONDS_PER_ROUND);
      }
    }
    return Number(s.toFixed(2));
  }, [session.results]);

  const correctCount = session.results.filter((r) => r.correct).length;

  // Lock the round (either by clicking a candidate or by timer expiring).
  const lockRound = useCallback(
    (pick: number | null, remaining: number) => {
      if (phase === "locked" || !currentRound) return;
      const correct = pick !== null && Math.abs(pick - currentRound.k) < 1e-6;
      setPhase("locked");
      setLockedPick(pick);
      setSession((prev) => {
        const result: RoundResult = {
          k: currentRound.k,
          pick,
          correct,
          remainingSec: Math.max(0, remaining / 1000),
        };
        return { ...prev, results: [...prev.results, result] };
      });
      recordInteraction(pick === null ? "timeout" : "pick", {
        round: session.active,
        pick: pick ?? -999,
        truth: currentRound.k,
        correct,
        remaining_ms: Math.max(0, remaining),
      });
    },
    [phase, currentRound, recordInteraction, session.active],
  );

  // Advance to next round (auto after FEEDBACK_HOLD_MS).
  const advance = useCallback(() => {
    setSession((prev) => {
      if (prev.results.length >= ROUNDS_PER_SESSION) return prev;
      return { ...prev, active: prev.active + 1 };
    });
    setPhase("prep");
    setLockedPick(null);
    setRemainingMs(SECONDS_PER_ROUND * 1000);
    roundStartedAtRef.current = performance.now();
  }, []);

  // After locking, schedule advance.
  useEffect(() => {
    if (phase !== "locked") return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      // Only advance if there are more rounds.
      if (session.results.length < ROUNDS_PER_SESSION) {
        advance();
      }
    }, FEEDBACK_HOLD_MS);
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [phase, session.results.length, advance]);

  // Timer tick during prep phase.
  useEffect(() => {
    if (phase !== "prep" || !currentRound || sessionDone) return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - roundStartedAtRef.current;
      const remaining = SECONDS_PER_ROUND * 1000 - elapsed;
      if (remaining <= 0) {
        setRemainingMs(0);
        lockRound(null, 0);
        return;
      }
      setRemainingMs(remaining);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, currentRound, sessionDone, lockRound]);

  // Reset round-start timestamp whenever we enter prep on a new round.
  useEffect(() => {
    if (phase === "prep") {
      roundStartedAtRef.current = performance.now();
      setRemainingMs(SECONDS_PER_ROUND * 1000);
    }
  }, [phase, session.active]);

  const handlePick = useCallback(
    (cand: number) => {
      if (phase !== "prep") return;
      lockRound(cand, remainingMs);
    },
    [phase, remainingMs, lockRound],
  );

  const handleRestart = useCallback(
    (diff: Difficulty = session.difficulty) => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      setSession(buildSession(diff));
      setPhase("prep");
      setLockedPick(null);
      setRemainingMs(SECONDS_PER_ROUND * 1000);
      roundStartedAtRef.current = performance.now();
      recordInteraction("restart", { difficulty: diff });
    },
    [session.difficulty, recordInteraction],
  );

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      difficulty:
        session.difficulty === "easy" ? 1 : session.difficulty === "medium" ? 2 : 3,
      round: session.active,
      rounds_done: session.results.length,
      correct: correctCount,
      score: finalScore,
      session_done: sessionDone ? 1 : 0,
      perfect: sessionDone && correctCount === ROUNDS_PER_SESSION ? 1 : 0,
    });
  }, [
    session.difficulty,
    session.active,
    session.results.length,
    correctCount,
    finalScore,
    sessionDone,
    onStateChange,
  ]);

  const stateSummary = useMemo(() => {
    if (sessionDone) {
      return `ScalarSpeedMatch — session complete on ${session.difficulty} difficulty. ${correctCount}/${ROUNDS_PER_SESSION} correct, weighted score ${finalScore}. Last round was k=${session.results[session.results.length - 1]?.k}.`;
    }
    if (!currentRound) return "ScalarSpeedMatch idle.";
    if (phase === "locked") {
      const lastResult = session.results[session.results.length - 1];
      const verdict = lastResult?.correct
        ? `correct (k=${currentRound.k})`
        : lastResult?.pick === null
        ? `timed out (k was ${currentRound.k})`
        : `wrong (picked ${lastResult?.pick}, k was ${currentRound.k})`;
      return `Round ${session.active + 1}/${ROUNDS_PER_SESSION} on ${session.difficulty} — just locked: ${verdict}. Running tally ${correctCount} correct, score ${finalScore}.`;
    }
    return `Round ${session.active + 1}/${ROUNDS_PER_SESSION} on ${session.difficulty}. v = (${currentRound.v.x}, ${currentRound.v.y}); target k·v on canvas; candidates [${currentRound.candidates.join(", ")}]; ${(remainingMs / 1000).toFixed(1)}s remaining.`;
  }, [
    sessionDone,
    currentRound,
    phase,
    session,
    correctCount,
    finalScore,
    remainingMs,
  ]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        diff: session.difficulty,
        round: session.active,
        phase,
        done: sessionDone,
      }),
    [session.difficulty, session.active, phase, sessionDone],
  );

  const timerPct = Math.max(0, Math.min(100, (remainingMs / (SECONDS_PER_ROUND * 1000)) * 100));
  const isPerfect = sessionDone && correctCount === ROUNDS_PER_SESSION;

  return (
    <div className={`ssm${sessionDone ? " ssm--done" : ""}${isPerfect ? " ssm--perfect" : ""}`}>
      <header className="ssm__head">
        <div className="ssm__heading">
          <span className="ssm__heading-label">DIFFICULTY</span>
          <div className="ssm__diff">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`ssm__diff-btn${d === session.difficulty ? " ssm__diff-btn--active" : ""}`}
                onClick={() => handleRestart(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="ssm__heading">
          <span className="ssm__heading-label">ROUND</span>
          <span className="ssm__heading-value">
            {sessionDone
              ? `${ROUNDS_PER_SESSION} / ${ROUNDS_PER_SESSION}`
              : `${session.active + 1} / ${ROUNDS_PER_SESSION}`}
          </span>
        </div>
        <div className="ssm__heading">
          <span className="ssm__heading-label">SCORE</span>
          <span className="ssm__heading-value">
            {correctCount} ✓ · {finalScore} pts
          </span>
        </div>
      </header>

      {!sessionDone && currentRound && (
        <>
          <RoundCanvas
            v={currentRound.v}
            k={currentRound.k}
            phase={phase}
            lockedPick={lockedPick}
          />

          <div className={`ssm__timer ssm__timer--${phase}`}>
            <div
              className="ssm__timer-fill"
              style={{ width: `${timerPct}%` }}
              aria-hidden
            />
            <span className="ssm__timer-label">
              {phase === "locked"
                ? "Locked — next round in a moment…"
                : `${(remainingMs / 1000).toFixed(1)}s — pick the scalar that takes v to the dashed target`}
            </span>
          </div>

          <div className="ssm__candidates">
            {currentRound.candidates.map((c) => {
              const isCorrect = Math.abs(c - currentRound.k) < 1e-6;
              const isPicked = lockedPick !== null && Math.abs(c - lockedPick) < 1e-6;
              let cls = "ssm__cand";
              if (phase === "locked") {
                if (isCorrect) cls += " ssm__cand--correct";
                else if (isPicked) cls += " ssm__cand--wrong";
                else cls += " ssm__cand--dim";
              }
              return (
                <button
                  key={c}
                  type="button"
                  className={cls}
                  onClick={() => handlePick(c)}
                  disabled={phase !== "prep"}
                >
                  k = {c}
                </button>
              );
            })}
          </div>
        </>
      )}

      {sessionDone && (
        <div className="ssm__summary">
          <div className="ssm__summary-headline">
            {isPerfect
              ? `Perfect run — ${correctCount}/${ROUNDS_PER_SESSION} correct.`
              : `Session complete — ${correctCount}/${ROUNDS_PER_SESSION} correct.`}
          </div>
          <div className="ssm__summary-score">
            Weighted score: <strong>{finalScore}</strong>
            <span className="ssm__summary-hint">
              (faster correct answers earn more than slow ones)
            </span>
          </div>
          <div className="ssm__summary-table">
            {session.results.map((r, i) => (
              <div
                key={i}
                className={`ssm__summary-row${r.correct ? " ssm__summary-row--ok" : ""}`}
              >
                <span className="ssm__summary-rd">#{i + 1}</span>
                <span className="ssm__summary-truth">k = {r.k}</span>
                <span className="ssm__summary-pick">
                  {r.pick === null ? "timeout" : `you = ${r.pick}`}
                </span>
                <span className="ssm__summary-result">
                  {r.correct
                    ? `✓ ${(r.remainingSec).toFixed(1)}s left`
                    : "✗"}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="ssm__restart"
            onClick={() => handleRestart()}
          >
            New session (same difficulty)
          </button>
        </div>
      )}

      <WidgetExplainer
        widgetName="Scalar speed match"
        widgetDescription="A timed-flash quiz for scalar multiplication. Each of 10 rounds shows a vector v (solid arrow) and a target k·v (dashed arrow) on the same canvas. Four scalar candidates appear as buttons. The reader has 3 seconds to tap the candidate that scales v to the target — letting the timer expire counts as wrong. Three difficulty modes: easy (integer scalars from {-3,-2,-1,2,3} with integer-step distractors), medium (half-integer scalars), hard (decimal scalars with 0.3-step distractors). Each correct answer scores 1 point plus a fractional bonus weighted by how much time remained; wrong / timeout scores 0. Pedagogical point: forces reflexive intuition for k·v as length-scaling — three seconds isn't enough time to compute the ratio explicitly, so the reader has to learn to *see* it. Negative k flips direction; |k|<1 shrinks v; |k|>1 stretches it."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────

interface RoundCanvasProps {
  v: Vec2;
  k: number;
  phase: "prep" | "locked";
  lockedPick: number | null;
}

function RoundCanvas({ v, k, phase, lockedPick }: RoundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const target: Vec2 = { x: k * v.x, y: k * v.y };
  const domain = useMemo(
    () => computeDomain([v, target, { x: 0, y: 0 }], { padding: 1.5, floor: 2.2, ceiling: 8 }),
    [v, target],
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

    const C_V = resolveColor("var(--widget-chart-1)");
    const C_TARGET = resolveColor("var(--widget-chart-3)");
    const C_HALO = resolveColorAlpha("var(--widget-chart-3)", 0.16);
    const C_LOCKED = resolveColor("var(--widget-success)");
    const C_TEXT = resolveColor("var(--widget-text)");

    // Grid + axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const pxPerUnit = W / (2 * domain);
    const unitsPerHalf = Math.ceil(domain);
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

    // Target halo.
    const targetPx = toPx(target);
    ctx.fillStyle = C_HALO;
    ctx.beginPath();
    ctx.arc(targetPx.x, targetPx.y, 14, 0, Math.PI * 2);
    ctx.fill();

    // v (solid, primary).
    drawArrow(ctx, toPx({ x: 0, y: 0 }), toPx(v), C_V, "v", 2.6, false);
    // target = k·v (dashed).
    drawArrow(
      ctx,
      toPx({ x: 0, y: 0 }),
      targetPx,
      C_TARGET,
      "k·v",
      2.4,
      true,
    );

    // If locked AND correct, draw a green ring around target.
    if (phase === "locked" && lockedPick !== null && Math.abs(lockedPick - k) < 1e-6) {
      ctx.strokeStyle = C_LOCKED;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetPx.x, targetPx.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [v, target, k, phase, lockedPick, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="ssm__canvas"
      role="img"
      aria-label={`Vector v and target k·v drawn for current round.`}
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
  if (dashed) ctx.setLineDash([6, 5]);
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
  ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, head.x + 8, head.y - 8);
  ctx.restore();
}
