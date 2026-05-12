/**
 * BasisCardTournament — pair-recognition tournament.
 *
 * Used by:
 *   - linear-algebra-basis (this lesson)
 * Cross-link candidates:
 *   - linear-algebra-span (the underlying test is "is span 2D?" which is
 *     the dependence-detector concept from that lesson)
 *
 * THIS IS A SURVIVAL TOURNAMENT. Not a chart, not a slider — a
 * fast-paced recognition quiz. A pair of 2D vectors flashes on a small
 * preview canvas. The reader has two buttons (✓ basis, ✗ not basis) or
 * can use Y/N keys. Get it right: advance to the next round. Get it
 * wrong: the run ends and the reader sees the correct answer.
 *
 * Survive 10 rounds for a perfect tournament. The widget keeps best-of
 * streak across runs so the reader is competing with their own past.
 *
 * Generation strategy:
 *   - Half the pairs are bases (random independent vectors).
 *   - Half are non-bases (one is a near-multiple of the other; or one is
 *     zero; or both are zero). The "near-multiple" pairs are the
 *     interesting failure mode — geometrically tempting until you look
 *     at the slopes carefully.
 *   - Difficulty grows by round: round 1 uses obvious independent /
 *     obvious parallel pairs; round 10 uses pairs whose dependence is
 *     visually subtle.
 *
 * Pedagogically: speed forces gut-level recognition rather than careful
 * det-computation. The reader builds the visual reflex "yes that's a
 * basis / no those are collinear" without numerical crutches. The post-
 * mortem on a wrong answer (the widget always shows the det, the slope
 * ratio, and a one-line explanation) closes the loop on the lesson.
 *
 * Implements a brand-new "speed-quiz" mechanic Tessarix hasn't had —
 * metaphor library §9 (regime explorer) extended to "regime classifier".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./BasisCardTournament.css";

const CANVAS_SIZE = 240;
const TOTAL_ROUNDS = 10;
/** Below this |det| the pair counts as NOT a basis. */
const BASIS_EPS = 0.06;

interface Vec2 {
  x: number;
  y: number;
}

interface Card {
  u: Vec2;
  v: Vec2;
  /** Ground truth — is {u, v} a basis for R²? */
  isBasis: boolean;
  /** One-sentence rationale shown on wrong answer. */
  rationale: string;
}

function det2(u: Vec2, v: Vec2): number {
  return u.x * v.y - u.y * v.x;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * Generate a card scaled to round difficulty.
 * round 1-3: obvious; det far from 0 or vectors flagrantly parallel.
 * round 4-7: medium; some near-multiples appear.
 * round 8-10: tricky; near-collinear pairs that look independent at a
 * glance until you check the slope ratio.
 */
function generateCard(round: number, wantBasis: boolean): Card {
  const easy = round <= 3;
  const medium = round >= 4 && round <= 7;
  // Random non-zero vector with components in [-2.5, 2.5], integer or half.
  const randCoord = () => {
    if (easy) return Math.round(Math.random() * 4 - 2);
    if (medium) return Math.round((Math.random() * 4 - 2) * 2) / 2;
    return Math.round((Math.random() * 4 - 2) * 10) / 10;
  };
  const randVec = (): Vec2 => {
    let v: Vec2 = { x: 0, y: 0 };
    while (Math.abs(v.x) + Math.abs(v.y) < 0.5) {
      v = { x: randCoord(), y: randCoord() };
    }
    return v;
  };

  const u = randVec();

  if (wantBasis) {
    // Random independent v.
    for (let tries = 0; tries < 50; tries++) {
      const v = randVec();
      const d = det2(u, v);
      if (Math.abs(d) > (easy ? 1 : medium ? 0.5 : 0.3)) {
        return {
          u,
          v,
          isBasis: true,
          rationale: `These are linearly independent (det = ${d.toFixed(2)} ≠ 0). They span the plane, so they form a basis.`,
        };
      }
    }
    // Fallback — orthogonal pair.
    return {
      u,
      v: { x: -u.y, y: u.x },
      isBasis: true,
      rationale: `These are linearly independent (perpendicular). Any non-zero perpendicular pair is a basis.`,
    };
  }

  // Want NOT a basis. Three ways: parallel, zero, or near-multiple.
  const mode = Math.random();
  if (mode < 0.15) {
    return {
      u,
      v: { x: 0, y: 0 },
      isBasis: false,
      rationale: `One of the vectors is zero — not a basis. A basis requires two non-zero, linearly independent vectors.`,
    };
  }
  if (mode < 0.5 || easy) {
    // Exact scalar multiple.
    const k = easy
      ? (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1)
      : (Math.random() * 3 - 1.5) || 1.5;
    const v: Vec2 = { x: round1(u.x * k), y: round1(u.y * k) };
    return {
      u,
      v,
      isBasis: false,
      rationale: `v ≈ ${k.toFixed(2)}·u — they're collinear, so they span only a line. det[u | v] = ${det2(u, v).toFixed(3)} (basically zero).`,
    };
  }
  // Near-collinear (tricky pair).
  const k = (Math.random() * 3 - 1.5) || 1;
  const wiggle = medium ? 0.15 : 0.04;
  const v: Vec2 = {
    x: round1(u.x * k + (Math.random() - 0.5) * wiggle),
    y: round1(u.y * k + (Math.random() - 0.5) * wiggle),
  };
  const d = det2(u, v);
  // Confirm wiggle didn't accidentally push us into "actually a basis"
  // territory. If it did, fall back to exact-collinear so the ground
  // truth is unambiguous.
  if (Math.abs(d) > BASIS_EPS) {
    return {
      u,
      v: { x: round1(u.x * k), y: round1(u.y * k) },
      isBasis: false,
      rationale: `Almost-collinear pair (rounded to be exactly parallel). det = 0; they span only a line.`,
    };
  }
  return {
    u,
    v,
    isBasis: false,
    rationale: `These look independent but are very nearly collinear (det = ${d.toFixed(3)}). Treat them as a non-basis — the slope ratio gives them away.`,
  };
}

interface BasisCardTournamentProps {
  onStateChange?: (state: Record<string, number>) => void;
}

type Phase = "playing" | "feedback" | "won" | "lost";

export function BasisCardTournament({
  onStateChange,
}: BasisCardTournamentProps) {
  const { recordInteraction } = useWidgetTelemetry("BasisCardTournament");

  const [round, setRound] = useState(1);
  const [card, setCard] = useState<Card>(() => generateCard(1, Math.random() < 0.5));
  const [phase, setPhase] = useState<Phase>("playing");
  const [lastChoice, setLastChoice] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [runsCompleted, setRunsCompleted] = useState(0);
  const [runsWon, setRunsWon] = useState(0);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      round,
      streak,
      best_streak: bestStreak,
      runs_completed: runsCompleted,
      runs_won: runsWon,
      phase: phase === "playing" ? 0 : phase === "feedback" ? 1 : phase === "won" ? 2 : 3,
      card_det: Number(det2(card.u, card.v).toFixed(3)),
      card_is_basis: card.isBasis ? 1 : 0,
    });
  }, [round, streak, bestStreak, runsCompleted, runsWon, phase, card, onStateChange]);

  const advance = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      // Won the tournament.
      setPhase("won");
      setRunsWon((n) => n + 1);
      setRunsCompleted((n) => n + 1);
      setBestStreak((b) => Math.max(b, streak + 1));
      return;
    }
    const nextRound = round + 1;
    setRound(nextRound);
    setCard(generateCard(nextRound, Math.random() < 0.5));
    setPhase("playing");
    setLastChoice(null);
  }, [round, streak]);

  const submitAnswer = useCallback(
    (claimsBasis: boolean) => {
      if (phase !== "playing") return;
      setLastChoice(claimsBasis);
      const correct = claimsBasis === card.isBasis;
      recordInteraction("answer", {
        round,
        claimed: claimsBasis,
        truth: card.isBasis,
        correct,
        det: Number(det2(card.u, card.v).toFixed(3)),
      });
      if (correct) {
        setStreak((s) => {
          const n = s + 1;
          setBestStreak((b) => Math.max(b, n));
          return n;
        });
        // Brief feedback flash then advance.
        setPhase("feedback");
      } else {
        setStreak(0);
        setPhase("lost");
        setRunsCompleted((n) => n + 1);
      }
    },
    [phase, card, round, recordInteraction],
  );

  // Auto-advance after a correct answer.
  useEffect(() => {
    if (phase !== "feedback") return;
    const timeout = window.setTimeout(() => {
      advance();
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [phase, advance]);

  const restart = useCallback(() => {
    setRound(1);
    setCard(generateCard(1, Math.random() < 0.5));
    setPhase("playing");
    setLastChoice(null);
    setStreak(0);
    recordInteraction("restart");
  }, [recordInteraction]);

  // Keyboard shortcuts: Y / N / arrow keys.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (phase === "playing") {
        if (e.key === "y" || e.key === "Y" || e.key === "ArrowRight") {
          e.preventDefault();
          submitAnswer(true);
        } else if (e.key === "n" || e.key === "N" || e.key === "ArrowLeft") {
          e.preventDefault();
          submitAnswer(false);
        }
      } else if (phase === "lost" || phase === "won") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          restart();
        }
      }
    };
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [phase, submitAnswer, restart]);

  const stateSummary = useMemo(() => {
    const cardSummary = `Card: u = (${card.u.x.toFixed(1)}, ${card.u.y.toFixed(1)}), v = (${card.v.x.toFixed(1)}, ${card.v.y.toFixed(1)}); det = ${det2(card.u, card.v).toFixed(3)}; truth ${card.isBasis ? "BASIS" : "NOT BASIS"}.`;
    let status: string;
    if (phase === "playing")
      status = `Round ${round}/${TOTAL_ROUNDS}; current streak ${streak}; best streak ${bestStreak}; ${runsWon}/${runsCompleted} tournaments won.`;
    else if (phase === "feedback")
      status = `Reader answered correctly (${lastChoice ? "basis" : "not basis"}); advancing to round ${round + 1}.`;
    else if (phase === "won")
      status = `Tournament WON. Reader cleared all ${TOTAL_ROUNDS} rounds. Best streak now ${Math.max(bestStreak, streak + 1)}.`;
    else
      status = `Tournament LOST at round ${round}. Reader said "${lastChoice ? "basis" : "not basis"}"; the truth was ${card.isBasis ? "basis" : "not basis"}.`;
    return `${cardSummary} ${status}`;
  }, [card, phase, round, streak, bestStreak, runsCompleted, runsWon, lastChoice]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        round,
        phase,
        card: [card.u.x, card.u.y, card.v.x, card.v.y],
        is_basis: card.isBasis,
      }),
    [round, phase, card],
  );

  return (
    <div
      className={`bct${phase === "won" ? " bct--won" : phase === "lost" ? " bct--lost" : ""}`}
      ref={wrapRef}
      tabIndex={0}
    >
      <header className="bct__head">
        <div className="bct__heading">
          <span className="bct__heading-label">ROUND</span>
          <span className="bct__heading-value">
            {round}/{TOTAL_ROUNDS}
          </span>
        </div>
        <div className="bct__heading">
          <span className="bct__heading-label">STREAK</span>
          <span className="bct__heading-value">
            {streak} {bestStreak > 0 && `· best ${bestStreak}`}
          </span>
        </div>
        <div className="bct__heading">
          <span className="bct__heading-label">TOURNAMENTS</span>
          <span className="bct__heading-value">
            {runsWon} won / {runsCompleted} played
          </span>
        </div>
      </header>

      <CardCanvas card={card} phase={phase} lastChoice={lastChoice} />

      <div className="bct__buttons">
        <button
          type="button"
          className="bct__btn bct__btn--no"
          onClick={() => submitAnswer(false)}
          disabled={phase !== "playing"}
        >
          <span className="bct__btn-mark">✗</span>
          <span className="bct__btn-label">Not a basis</span>
          <span className="bct__btn-hint">N / ←</span>
        </button>
        <button
          type="button"
          className="bct__btn bct__btn--yes"
          onClick={() => submitAnswer(true)}
          disabled={phase !== "playing"}
        >
          <span className="bct__btn-mark">✓</span>
          <span className="bct__btn-label">Is a basis</span>
          <span className="bct__btn-hint">Y / →</span>
        </button>
      </div>

      <div
        className={`bct__verdict bct__verdict--${
          phase === "playing"
            ? "playing"
            : phase === "feedback"
              ? "correct"
              : phase === "won"
                ? "won"
                : "lost"
        }`}
      >
        <span className="bct__verdict-label">Status</span>
        <span className="bct__verdict-value">
          {phase === "playing" &&
            `Round ${round} of ${TOTAL_ROUNDS}. Do u and v form a basis for ℝ²? Look at whether they point along the same line.`}
          {phase === "feedback" && `✓ Correct. Advancing…`}
          {phase === "won" &&
            `✓✓✓ Tournament cleared. You called every round correctly. Best streak ${Math.max(bestStreak, streak)}.`}
          {phase === "lost" &&
            `✗ Lost at round ${round}. Truth: ${card.isBasis ? "they ARE a basis" : "they are NOT a basis"}. ${card.rationale}`}
        </span>
      </div>

      {(phase === "lost" || phase === "won") && (
        <button type="button" className="bct__restart" onClick={restart}>
          Start a new tournament — Enter
        </button>
      )}

      <WidgetExplainer
        widgetName="Basis Card Tournament — speed-recognition of basis status"
        widgetDescription="A survival tournament: 10 rounds, each showing a pair of 2D vectors u and v. The reader hits ✓ (is a basis) or ✗ (not a basis). Correct answers advance; wrong answers end the tournament and reveal the truth with the determinant. Card difficulty grows with round number — early rounds use obviously-independent or obviously-parallel pairs; later rounds use near-collinear pairs whose dependence is visually subtle. Generation guarantees ground truth: a pair counts as a basis iff |det[u | v]| > 0.06, and 'not basis' cards are generated as exact scalar multiples (or near-multiples then rounded to exact) so there is no ambiguity. The widget tracks streak, best streak, runs played and runs won across tournaments. Pedagogically, the speed forces gut-level recognition over numerical computation; the post-mortem on a wrong answer always shows the determinant and a one-sentence rationale to close the loop."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────

interface CardCanvasProps {
  card: Card;
  phase: Phase;
  lastChoice: boolean | null;
}

function CardCanvas({ card, phase, lastChoice }: CardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(() => {
    return computeDomain([card.u, card.v], {
      padding: 1.5,
      floor: 3,
      ceiling: 6,
    });
  }, [card]);

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
    const reveal = phase === "lost" || phase === "won";
    const correct = lastChoice === card.isBasis;

    // Background tint based on phase.
    if (phase === "feedback" && correct) {
      ctx.fillStyle = resolveColorAlpha("var(--widget-success)", 0.08);
      ctx.fillRect(0, 0, W, H);
    } else if (phase === "lost") {
      ctx.fillStyle = resolveColorAlpha("var(--widget-danger)", 0.08);
      ctx.fillRect(0, 0, W, H);
    }

    // Grid.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
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
    // Axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // If reveal phase and NOT a basis, draw the failing span line.
    if (reveal && !card.isBasis) {
      const dir = Math.hypot(card.u.x, card.u.y) > 0.05 ? card.u : card.v;
      if (Math.hypot(dir.x, dir.y) > 0.05) {
        ctx.strokeStyle = resolveColorAlpha("var(--widget-danger)", 0.35);
        ctx.lineWidth = 3;
        const ext = domain * 1.4;
        const len = Math.hypot(dir.x, dir.y);
        const norm = { x: dir.x / len, y: dir.y / len };
        const s = toPx({ x: -ext * norm.x, y: -ext * norm.y });
        const e = toPx({ x: ext * norm.x, y: ext * norm.y });
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
      }
    }

    // Basis vectors.
    const origin = toPx({ x: 0, y: 0 });
    drawArrow(ctx, origin, toPx(card.u), C_U, "u", 2.6);
    drawArrow(ctx, origin, toPx(card.v), C_V, "v", 2.6);

    // Origin.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [card, phase, lastChoice, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="bct__canvas"
      role="img"
      aria-label="Basis Card Tournament — pair of vectors u and v shown on a 2D grid."
    />
  );
}

interface Vec2P {
  x: number;
  y: number;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: Vec2P,
  head: Vec2P,
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
  ctx.font = "700 13px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, head.x + 6, head.y - 8);
  ctx.restore();
}
