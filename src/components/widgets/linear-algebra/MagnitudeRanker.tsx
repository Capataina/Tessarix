/**
 * MagnitudeRanker — drag-to-order ranking game for vector magnitudes.
 *
 * Used by:
 *   - linear-algebra (the foundations primer, vectors-as-arrows section)
 *
 * THIS IS A RANKING QUIZ. The widget draws 6 vectors of distinct
 * magnitudes on a shared canvas and lists them as draggable cards in
 * a vertical column on the right. The reader drags cards to reorder
 * by magnitude (longest at the top). On submit, each row's true rank
 * is compared with its placed rank; correct positions flash green,
 * wrong ones red. The widget grades, then can be reshuffled for a
 * new round.
 *
 * Pedagogy:
 *   - Magnitude is a SCALAR derived from a 2-component vector — the
 *     vector has both length and direction, but magnitude only
 *     captures length. Long, slanted vectors can deceive the eye into
 *     thinking they're short.
 *   - The (3, 4) trap: a vector pointing slightly off-axis can have
 *     magnitude 5 even though neither component alone feels "big".
 *     The Pythagorean sum is what counts.
 *   - The widget shows vectors at varying angles AND magnitudes, so
 *     the reader cannot just sort by "highest dot on the canvas" or
 *     "rightmost tip" — they have to reason about $\sqrt{x^2 + y^2}$.
 *
 * Drag mechanics:
 *   - Each card has a draggable surface (data-rank attribute).
 *   - Native HTML5 drag-and-drop with insertion preview.
 *   - Reorder happens on drop; the displayed array order BECOMES the
 *     reader's submitted ranking.
 *
 * Implements a new ordering mechanic in the codebase (the existing
 * TransformationOrdering uses click-to-append rather than HTML5 drag).
 * Adds drag-to-reorder as a new pattern.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./MagnitudeRanker.css";

const CANVAS_SIZE = 320;
const VECTORS_PER_ROUND = 6;

interface Vec2 {
  x: number;
  y: number;
}

interface VectorCard {
  id: string;
  label: string;
  v: Vec2;
  /** Pre-computed magnitude for display + grading. */
  mag: number;
}

const PALETTE_LABELS = ["v₁", "v₂", "v₃", "v₄", "v₅", "v₆", "v₇"];

function makeCards(seed: number): VectorCard[] {
  // Generate 6 vectors with distinguishable magnitudes (gaps ≥ 0.6) and a
  // mix of angles. We pick magnitudes from a target spread and rotate each.
  // Determinism is keyed off the seed so a reshuffle produces a new round.
  function rng(s: number) {
    let x = s | 0;
    return () => {
      x = (x * 1664525 + 1013904223) | 0;
      return ((x >>> 0) % 10000) / 10000;
    };
  }
  const rnd = rng(seed);
  const magnitudes: number[] = [];
  const baseMags = [1.2, 1.8, 2.4, 3.0, 3.6, 4.2];
  // Jitter each base magnitude by ±0.15 to avoid the reader memorising
  // exact lengths; never collapse the ordering.
  for (const base of baseMags) {
    magnitudes.push(Number((base + (rnd() - 0.5) * 0.3).toFixed(2)));
  }
  // Shuffle which magnitude goes to which slot so the displayed ID order
  // doesn't correlate with the rank.
  for (let i = magnitudes.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [magnitudes[i], magnitudes[j]] = [magnitudes[j], magnitudes[i]];
  }
  // Pick angles from a wide range with a minimum separation.
  const angleSet = [
    Math.PI / 8,
    Math.PI / 4,
    (3 * Math.PI) / 8,
    Math.PI / 2 + Math.PI / 16,
    (3 * Math.PI) / 4,
    (5 * Math.PI) / 6,
    -Math.PI / 6,
    -Math.PI / 3,
    -(2 * Math.PI) / 3,
    -(3 * Math.PI) / 4,
  ];
  // Shuffle angles and take the first 6.
  const angles = [...angleSet];
  for (let i = angles.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [angles[i], angles[j]] = [angles[j], angles[i]];
  }
  const picked = angles.slice(0, VECTORS_PER_ROUND);
  const cards: VectorCard[] = magnitudes.map((m, i) => {
    const theta = picked[i];
    const x = Number((m * Math.cos(theta)).toFixed(2));
    const y = Number((m * Math.sin(theta)).toFixed(2));
    return {
      id: `c${i}`,
      label: PALETTE_LABELS[i],
      v: { x, y },
      mag: Math.hypot(x, y),
    };
  });
  return cards;
}

/** Compute the truth ordering: array of card ids from largest magnitude to
 *  smallest. */
function truthOrder(cards: VectorCard[]): string[] {
  return [...cards]
    .sort((a, b) => b.mag - a.mag)
    .map((c) => c.id);
}

interface MagnitudeRankerProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function MagnitudeRanker({ onStateChange }: MagnitudeRankerProps) {
  const { recordInteraction } = useWidgetTelemetry("MagnitudeRanker");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const cards = useMemo(() => makeCards(seed), [seed]);
  const truth = useMemo(() => truthOrder(cards), [cards]);

  // The reader's current ordering, stored as an array of card ids. Initially
  // equal to the card IDs (the displayed order on the canvas), but the reader
  // drags rows to reorder.
  const [order, setOrder] = useState<string[]>(() => cards.map((c) => c.id));
  const [submitted, setSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  // Reset reader's ordering whenever the seed changes (new round).
  useEffect(() => {
    setOrder(cards.map((c) => c.id));
    setSubmitted(false);
  }, [cards]);

  // Per-row correctness when submitted: row at position i is correct iff
  // order[i] === truth[i].
  const grades = useMemo(() => {
    if (!submitted) return order.map(() => "pending" as const);
    return order.map((id, i) =>
      id === truth[i] ? ("correct" as const) : ("wrong" as const),
    );
  }, [submitted, order, truth]);

  const correctCount = grades.filter((g) => g === "correct").length;
  const allCorrect = correctCount === order.length;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      round,
      submitted: submitted ? 1 : 0,
      correct: correctCount,
      total: order.length,
      all_correct: allCorrect ? 1 : 0,
    });
  }, [round, submitted, correctCount, order.length, allCorrect, onStateChange]);

  const stateSummary = useMemo(() => {
    const readerOrderStr = order
      .map((id) => {
        const c = cards.find((x) => x.id === id);
        return c ? `${c.label}(|${c.mag.toFixed(2)}|)` : id;
      })
      .join(" > ");
    if (!submitted) {
      return `MagnitudeRanker round ${round + 1} — reader's current ordering (top→bottom = largest→smallest): ${readerOrderStr}. Truth not yet revealed; awaiting submit.`;
    }
    const truthStr = truth
      .map((id) => {
        const c = cards.find((x) => x.id === id);
        return c ? `${c.label}(|${c.mag.toFixed(2)}|)` : id;
      })
      .join(" > ");
    return `MagnitudeRanker round ${round + 1} — reader submitted ordering: ${readerOrderStr}. Truth: ${truthStr}. ${correctCount}/${order.length} correct.`;
  }, [order, cards, submitted, truth, round, correctCount]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        seed,
        order,
        submitted,
      }),
    [seed, order, submitted],
  );

  // ─── Drag-and-drop handlers ──────────────────────────────────────────

  const handleDragStart = useCallback(
    (idx: number) => (e: DragEvent<HTMLDivElement>) => {
      if (submitted) {
        e.preventDefault();
        return;
      }
      setDragIdx(idx);
      e.dataTransfer.effectAllowed = "move";
      // Setting some data is required for the drag image to appear in some
      // browsers; the actual content doesn't matter — we read from state.
      e.dataTransfer.setData("text/plain", order[idx]);
    },
    [submitted, order],
  );

  const handleDragOver = useCallback(
    (idx: number) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (submitted || dragIdx === null) return;
      e.dataTransfer.dropEffect = "move";
      if (hoverIdx !== idx) setHoverIdx(idx);
    },
    [submitted, dragIdx, hoverIdx],
  );

  const handleDragLeave = useCallback(() => {
    setHoverIdx(null);
  }, []);

  const handleDrop = useCallback(
    (idx: number) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (submitted || dragIdx === null) {
        setDragIdx(null);
        setHoverIdx(null);
        return;
      }
      const from = dragIdx;
      const to = idx;
      setDragIdx(null);
      setHoverIdx(null);
      if (from === to) return;
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      recordInteraction("reorder", { from, to });
    },
    [submitted, dragIdx, recordInteraction],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setHoverIdx(null);
  }, []);

  // ─── Buttons ─────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    const correct = order.filter((id, i) => id === truth[i]).length;
    recordInteraction("submit", { correct, total: order.length });
  }, [order, truth, recordInteraction]);

  const handleNewRound = useCallback(() => {
    setSeed(Math.floor(Math.random() * 1e6));
    setRound((r) => r + 1);
    recordInteraction("new_round");
  }, [recordInteraction]);

  const handleShuffle = useCallback(() => {
    // Shuffle the reader's order (resets any partial sorting).
    setOrder((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setSubmitted(false);
    recordInteraction("shuffle");
  }, [recordInteraction]);

  // Move-up / move-down keyboard fallback for accessibility.
  const handleMoveUp = useCallback(
    (idx: number) => {
      if (submitted || idx <= 0) return;
      setOrder((prev) => {
        const next = [...prev];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        return next;
      });
      recordInteraction("button_up", { from: idx });
    },
    [submitted, recordInteraction],
  );

  const handleMoveDown = useCallback(
    (idx: number) => {
      if (submitted || idx >= order.length - 1) return;
      setOrder((prev) => {
        const next = [...prev];
        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
        return next;
      });
      recordInteraction("button_down", { from: idx });
    },
    [submitted, order.length, recordInteraction],
  );

  return (
    <div className={`mr${submitted ? (allCorrect ? " mr--perfect" : " mr--graded") : ""}`}>
      <header className="mr__head">
        <div className="mr__heading">
          <span className="mr__heading-label">ROUND</span>
          <span className="mr__heading-value">{round + 1}</span>
        </div>
        <div className="mr__heading">
          <span className="mr__heading-label">VECTORS</span>
          <span className="mr__heading-value">{cards.length}</span>
        </div>
        <div className="mr__heading">
          <span className="mr__heading-label">SCORE</span>
          <span className="mr__heading-value">
            {submitted ? `${correctCount} / ${order.length}` : "—"}
          </span>
        </div>
      </header>

      <div className="mr__layout">
        <VectorsCanvas cards={cards} hoverId={hoverIdx !== null ? order[hoverIdx] : null} />
        <div className="mr__list">
          <div className="mr__list-head">
            <span className="mr__list-pos">Rank</span>
            <span className="mr__list-label">Vector</span>
            <span className="mr__list-truth">|v|</span>
          </div>
          {order.map((id, i) => {
            const card = cards.find((c) => c.id === id);
            if (!card) return null;
            const grade = grades[i];
            const isHover = hoverIdx === i;
            const isDrag = dragIdx === i;
            let rowCls = "mr__row";
            if (grade === "correct") rowCls += " mr__row--correct";
            else if (grade === "wrong") rowCls += " mr__row--wrong";
            if (isHover && dragIdx !== null) rowCls += " mr__row--drop";
            if (isDrag) rowCls += " mr__row--dragging";
            return (
              <div
                key={id}
                className={rowCls}
                draggable={!submitted}
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver(i)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(i)}
                onDragEnd={handleDragEnd}
              >
                <span className="mr__pos">#{i + 1}</span>
                <span className="mr__label">{card.label}</span>
                <span className="mr__components">
                  ({card.v.x.toFixed(1)}, {card.v.y.toFixed(1)})
                </span>
                {submitted && (
                  <span className="mr__mag">
                    {card.mag.toFixed(2)}
                  </span>
                )}
                <div className="mr__controls">
                  <button
                    type="button"
                    className="mr__nudge"
                    onClick={() => handleMoveUp(i)}
                    disabled={submitted || i === 0}
                    aria-label="Move up"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="mr__nudge"
                    onClick={() => handleMoveDown(i)}
                    disabled={submitted || i === order.length - 1}
                    aria-label="Move down"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
                <span className="mr__handle" aria-hidden>⋮⋮</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mr__actions">
        <button
          type="button"
          className="mr__submit"
          onClick={handleSubmit}
          disabled={submitted}
        >
          Submit ranking
        </button>
        <button
          type="button"
          className="mr__action"
          onClick={handleShuffle}
          disabled={submitted}
        >
          Shuffle (clear ordering)
        </button>
        <button
          type="button"
          className="mr__action mr__action--primary"
          onClick={handleNewRound}
        >
          New round
        </button>
      </div>

      <div className={`mr__verdict mr__verdict--${submitted ? (allCorrect ? "perfect" : "graded") : "idle"}`}>
        <span className="mr__verdict-label">Status</span>
        <span className="mr__verdict-value">
          {!submitted &&
            "Drag rows to reorder, largest magnitude at the top. The list runs top→bottom = longest→shortest. Hit submit when you're ready — each correct position flashes green, wrong ones red."}
          {submitted && allCorrect &&
            `✓ Perfect — all ${order.length} ranked correctly. The Pythagorean magnitudes were ${[...cards].sort((a, b) => b.mag - a.mag).map((c) => `${c.label}=${c.mag.toFixed(2)}`).join(", ")}.`}
          {submitted && !allCorrect &&
            `${correctCount}/${order.length} correct. Wrong rows show the true magnitude; the most common trap is reading angle as length — a slanted long vector looks short if you only watch its horizontal extent.`}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Magnitude ranker — drag rows to order by length"
        widgetDescription="A ranking-quiz widget. The canvas on the left draws 6 vectors of distinct magnitudes from the origin, each labelled v₁..v₆. The right column lists the same 6 vectors as draggable rows, currently in the canvas's display order. The reader drags rows up or down to reorder them so that the top of the list has the largest magnitude and the bottom has the smallest. Submit grades each row by comparing the reader's placed position to the true rank; correct positions flash green, wrong red, and the true |v| is revealed on each wrong row. The pedagogical point is that magnitude is a SCALAR derived from a 2-component vector and depends on both components in the Pythagorean way — a slanted long vector can look short to an eye that's only tracking horizontal extent. The (3, 4) trap: integer components don't tell you the magnitude; you have to square-and-add. Six vectors with magnitudes evenly spread from ~1.2 to ~4.2 and angles spread across the full 360°. The reader can also nudge rows up/down with arrow buttons, shuffle to restart, or hit New round for a fresh set of vectors."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────

interface VectorsCanvasProps {
  cards: VectorCard[];
  hoverId: string | null;
}

function VectorsCanvas({ cards, hoverId }: VectorsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(
    () => computeDomain(cards.map((c) => c.v), { padding: 1.35, floor: 4, ceiling: 6 }),
    [cards],
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

    const palette = [
      resolveColor("var(--widget-chart-1)"),
      resolveColor("var(--widget-chart-2)"),
      resolveColor("var(--widget-chart-3)"),
      resolveColor("var(--widget-chart-4)"),
      resolveColor("var(--widget-chart-5)"),
      resolveColor("var(--widget-accent)"),
    ];
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_HOVER = resolveColor("var(--widget-warn)");

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

    // Each vector.
    cards.forEach((c, i) => {
      const isHover = c.id === hoverId;
      const color = isHover ? C_HOVER : palette[i % palette.length];
      const width = isHover ? 3.2 : 2.2;
      const tail = toPx({ x: 0, y: 0 });
      const head = toPx(c.v);
      drawArrow(ctx, tail, head, color, c.label, width);
      // Optional hover halo.
      if (isHover) {
        ctx.strokeStyle = resolveColorAlpha("var(--widget-warn)", 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [cards, hoverId, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="mr__canvas"
      role="img"
      aria-label="Six vectors of different magnitudes drawn from the origin."
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
  ctx.fillText(label, head.x + 7, head.y - 9);
  ctx.restore();
}
