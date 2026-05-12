/**
 * DeterminantSlider — race-to-zero game for singularity.
 *
 * Used by:
 *   - linear-algebra-matrices
 *
 * THIS IS A TARGET-VALUE GAME. The reader drags two basis vectors u
 * (the first column of A) and v (the second column). The widget
 * computes det A = u.x · v.y − u.y · v.x in real time. A "danger meter"
 * shows |det A|: green when the matrix is comfortably invertible, yellow
 * as it approaches the singular threshold, red as it crosses past
 * extreme values. The reader's goal is to drive det A to exactly zero
 * (within ε = 0.005) by adjusting either vector.
 *
 * The pedagogical move: singularity is a knife edge. Most random
 * configurations of u and v have det far from zero; finding zero
 * requires u and v to be PARALLEL — one a scalar multiple of the other.
 * The reader physically experiences how narrow the singular set is by
 * trying to land on it.
 *
 * Game state:
 *   - "armed": time accumulates while the puzzle is open and not solved.
 *   - "near miss": |det| < 0.05 — the singular set is approaching, the
 *     meter flashes amber.
 *   - "solved": |det| < 0.005 — the puzzle is solved, the timer freezes,
 *     a "best time" leaderboard updates.
 *   - "reset": new round; timer resets, vectors randomise to a non-
 *     parallel configuration.
 *
 * Implements metaphor library §4 (direct manipulation of position) +
 * §8 (physical metaphor — the determinant meter behaves like a needle
 * on a continuous gauge) inside a target-value game shell.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./DeterminantSlider.css";

const CANVAS_SIZE = 360;
const SOLVED_EPS = 0.005;
const NEAR_MISS_EPS = 0.05;
const HANDLE_HIT_RADIUS = 0.32;

interface Vec2 {
  x: number;
  y: number;
}

function det2(u: Vec2, v: Vec2): number {
  return u.x * v.y - u.y * v.x;
}

function randomNonParallelPair(): { u: Vec2; v: Vec2 } {
  // Pick u uniformly in a square; pick v rotated 30°-150° off so the
  // starting config has det clearly non-zero. The reader's whole task
  // is to bring it back to zero.
  const ux = (Math.random() - 0.5) * 3 + (Math.random() < 0.5 ? 1 : -1);
  const uy = (Math.random() - 0.5) * 3 + (Math.random() < 0.5 ? 1 : -1);
  const u = { x: Number(ux.toFixed(2)), y: Number(uy.toFixed(2)) };
  // Angle for v: rotate u by 60°–120° and tweak length.
  const ang = Math.atan2(u.y, u.x) + (Math.PI / 3) * (Math.random() < 0.5 ? 1 : -1);
  const len = 1 + Math.random() * 1.5;
  const v = {
    x: Number((Math.cos(ang) * len).toFixed(2)),
    y: Number((Math.sin(ang) * len).toFixed(2)),
  };
  return { u, v };
}

interface DeterminantSliderProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function DeterminantSlider({ onStateChange }: DeterminantSliderProps) {
  const { recordInteraction } = useWidgetTelemetry("DeterminantSlider");
  const [start, setStart] = useState(() => randomNonParallelPair());
  const [u, setU] = useState<Vec2>(start.u);
  const [v, setV] = useState<Vec2>(start.v);
  const [solved, setSolved] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [solvedAt, setSolvedAt] = useState<number | null>(null);
  const [rounds, setRounds] = useState(0);

  // Wall-clock anchor for elapsed-time timer. We tick a state variable on
  // an interval rather than using requestAnimationFrame so the timer
  // refreshes at a steady 100ms cadence regardless of whether the canvas
  // is being repainted.
  useEffect(() => {
    if (solved) return;
    const t0 = performance.now() - elapsedMs;
    const id = setInterval(() => {
      setElapsedMs(performance.now() - t0);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, start]);

  const det = det2(u, v);
  const absDet = Math.abs(det);
  const isNearMiss = absDet < NEAR_MISS_EPS && absDet >= SOLVED_EPS;
  const isSolved = absDet < SOLVED_EPS;

  // Latch the solved state — once solved, it stays solved until reset.
  useEffect(() => {
    if (isSolved && !solved) {
      setSolved(true);
      setSolvedAt(elapsedMs);
      setBestMs((prev) => (prev === null ? elapsedMs : Math.min(prev, elapsedMs)));
      recordInteraction("solved", {
        elapsed_ms: Math.round(elapsedMs),
        det: Number(det.toFixed(6)),
      });
    }
  }, [isSolved, solved, elapsedMs, det, recordInteraction]);

  // Compute a 0..1 "heat" value for the danger meter — 0 = comfortable,
  // 1 = peak danger (very near singular). We invert: smaller |det| means
  // higher heat (closer to the win condition AND the singular knife
  // edge). Cap at |det| = 1 for the meter normalisation.
  const meterHeat = useMemo(() => {
    if (isSolved) return 1;
    const clamped = Math.min(absDet, 1);
    return 1 - clamped; // 1 when det near 0, 0 when |det| ≥ 1
  }, [absDet, isSolved]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      u_x: u.x,
      u_y: u.y,
      v_x: v.x,
      v_y: v.y,
      det: Number(det.toFixed(4)),
      abs_det: Number(absDet.toFixed(4)),
      near_miss: isNearMiss ? 1 : 0,
      solved: solved ? 1 : 0,
      elapsed_ms: Math.round(elapsedMs),
      best_ms: bestMs ?? -1,
      rounds,
    });
  }, [u, v, det, absDet, isNearMiss, solved, elapsedMs, bestMs, rounds, onStateChange]);

  const stateSummary = useMemo(() => {
    const parallel = absDet < SOLVED_EPS;
    const statusLine = solved
      ? `Solved in ${(solvedAt! / 1000).toFixed(1)}s${
          bestMs !== null ? ` (best ${(bestMs / 1000).toFixed(1)}s)` : ""
        }.`
      : isNearMiss
      ? `NEAR MISS: |det| = ${absDet.toFixed(3)}, very close to the singular line.`
      : `Working: |det| = ${absDet.toFixed(3)}; need < ${SOLVED_EPS}.`;
    return `Determinant target-zero game. u = (${u.x.toFixed(2)}, ${u.y.toFixed(2)}); v = (${v.x.toFixed(2)}, ${v.y.toFixed(2)}); det[u | v] = ${det.toFixed(4)}. u and v are ${parallel ? "linearly dependent (parallel)" : "linearly independent"}. ${statusLine}`;
  }, [u, v, det, absDet, isNearMiss, solved, solvedAt, bestMs]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        u: [Number(u.x.toFixed(2)), Number(u.y.toFixed(2))],
        v: [Number(v.x.toFixed(2)), Number(v.y.toFixed(2))],
        solved,
        rounds,
      }),
    [u, v, solved, rounds],
  );

  const handleReset = useCallback(() => {
    const next = randomNonParallelPair();
    setStart(next);
    setU(next.u);
    setV(next.v);
    setSolved(false);
    setSolvedAt(null);
    setElapsedMs(0);
    setRounds((r) => r + 1);
    recordInteraction("new_round");
  }, [recordInteraction]);

  const handleClearBest = useCallback(() => {
    setBestMs(null);
    recordInteraction("clear_best");
  }, [recordInteraction]);

  return (
    <div className={`ds${solved ? " ds--solved" : ""}${isNearMiss ? " ds--near" : ""}`}>
      <header className="ds__head">
        <div className="ds__heading">
          <span className="ds__heading-label">DET A</span>
          <span
            className={`ds__heading-value${
              isSolved
                ? " ds__heading-value--ok"
                : isNearMiss
                ? " ds__heading-value--warn"
                : ""
            }`}
          >
            {det.toFixed(4)}
          </span>
        </div>
        <div className="ds__heading">
          <span className="ds__heading-label">TIME</span>
          <span className="ds__heading-value">
            {(elapsedMs / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="ds__heading">
          <span className="ds__heading-label">BEST</span>
          <span className="ds__heading-value">
            {bestMs === null ? "—" : `${(bestMs / 1000).toFixed(1)}s`}
            {bestMs !== null && (
              <button
                type="button"
                className="ds__inline-action"
                onClick={handleClearBest}
                title="Clear best time"
              >
                clear
              </button>
            )}
          </span>
        </div>
        <div className="ds__heading">
          <span className="ds__heading-label">CONTROLS</span>
          <button
            type="button"
            className="ds__action ds__action--primary"
            onClick={handleReset}
          >
            New round
          </button>
        </div>
      </header>

      <DangerMeter
        absDet={absDet}
        heat={meterHeat}
        isSolved={isSolved}
        isNearMiss={isNearMiss}
      />

      <DetCanvas
        u={u}
        v={v}
        setU={setU}
        setV={setV}
        isSolved={isSolved}
        isNearMiss={isNearMiss}
      />

      <div
        className={`ds__verdict ds__verdict--${
          isSolved ? "solved" : isNearMiss ? "near" : "working"
        }`}
      >
        <span className="ds__verdict-label">Status</span>
        <span className="ds__verdict-value">
          {isSolved &&
            `✓ Singular. u and v are linearly dependent — one is a scalar multiple of the other, and the unit square has collapsed to a line segment. Hit "New round" to try again under time.`}
          {!isSolved &&
            isNearMiss &&
            `Near miss. |det| = ${absDet.toFixed(3)} — you're brushing the singular line. Notice how narrow that "line" actually is in the space of all matrices.`}
          {!isSolved &&
            !isNearMiss &&
            `Drag u (cyan) and v (magenta) until they line up — one a scalar multiple of the other. The det meter on the right grows as you approach singularity.`}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Determinant target-zero game — drive |det A| to zero"
        widgetDescription="A target-value game widget. The reader sees two draggable basis vectors u (first column of a 2×2 matrix A) and v (second column) on a math-coordinate plane. The widget computes det A = u.x · v.y − u.y · v.x in real time and shows it as both a numeric readout and a 'danger meter' bar that fills as |det| shrinks (heat = 1 when det ≈ 0, heat = 0 when |det| ≥ 1). A 'near miss' visual cue fires when 0.005 ≤ |det| < 0.05 — the reader is brushing the singular line. The goal is to drive |det A| below 0.005 (the singular set, where u and v are parallel — one a scalar multiple of the other, the unit square collapsed to a segment). The widget tracks elapsed time per round and a best-time leaderboard across rounds. The pedagogical claim is that singularity is a 'knife edge' in matrix space: most random configurations have det far from zero, and finding zero requires the columns to align — a measure-zero subset of the space of 2×2 matrices."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Danger meter ────────────────────────────────────────────────────────

interface DangerMeterProps {
  absDet: number;
  heat: number;
  isSolved: boolean;
  isNearMiss: boolean;
}

function DangerMeter({ absDet, heat, isSolved, isNearMiss }: DangerMeterProps) {
  // Three-zone meter: comfortable (heat < 0.7), near miss (0.7..0.99),
  // singular (heat ≥ 0.99). The bar is laid out horizontally; the fill
  // grows from left (low heat) toward right (singular).
  const pct = Math.round(heat * 100);
  const zone = isSolved
    ? "singular"
    : isNearMiss
    ? "near"
    : heat > 0.65
    ? "warm"
    : "safe";
  return (
    <div className="ds__meter">
      <div className="ds__meter-label">|det A| → singular knife edge</div>
      <div className={`ds__meter-track ds__meter-track--${zone}`}>
        <div
          className="ds__meter-fill"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
        <div
          className="ds__meter-tick ds__meter-tick--near"
          style={{ left: `${(1 - NEAR_MISS_EPS / 1) * 100}%` }}
          title="Near-miss threshold"
        />
      </div>
      <div className="ds__meter-readout">
        |det A| = {absDet.toFixed(4)} · target {SOLVED_EPS}
      </div>
    </div>
  );
}

// ─── Canvas + drag handles ───────────────────────────────────────────────

interface DetCanvasProps {
  u: Vec2;
  v: Vec2;
  setU: (u: Vec2) => void;
  setV: (v: Vec2) => void;
  isSolved: boolean;
  isNearMiss: boolean;
}

type DragHandle = "u" | "v" | null;

function DetCanvas({
  u,
  v,
  setU,
  setV,
  isSolved,
  isNearMiss,
}: DetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState<DragHandle>(null);

  const domain = useMemo(
    () =>
      computeDomain([u, v, { x: u.x + v.x, y: u.y + v.y }], {
        padding: 1.5,
        floor: 3,
        ceiling: 6,
      }),
    [u, v],
  );

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);
  const fromPx = useMemo(() => makeFromPx(CANVAS_SIZE, domain), [domain]);

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
    const fill = isSolved
      ? resolveColorAlpha("var(--widget-success)", 0.22)
      : isNearMiss
      ? resolveColorAlpha("var(--widget-warn)", 0.16)
      : resolveColorAlpha("var(--widget-chart-1)", 0.12);
    const stroke = isSolved
      ? resolveColor("var(--widget-success)")
      : isNearMiss
      ? resolveColor("var(--widget-warn)")
      : resolveColor("var(--widget-chart-1)");

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
    // Axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Parallelogram (u, u+v, v).
    const origin = toPx({ x: 0, y: 0 });
    const uPx = toPx(u);
    const vPx = toPx(v);
    const sumPx = toPx({ x: u.x + v.x, y: u.y + v.y });
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(uPx.x, uPx.y);
    ctx.lineTo(sumPx.x, sumPx.y);
    ctx.lineTo(vPx.x, vPx.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Near-miss / singular halo around the parallelogram edge.
    if (isNearMiss || isSolved) {
      ctx.save();
      ctx.shadowColor = isSolved
        ? resolveColor("var(--widget-success)")
        : resolveColor("var(--widget-warn)");
      ctx.shadowBlur = isSolved ? 22 : 14;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(uPx.x, uPx.y);
      ctx.lineTo(sumPx.x, sumPx.y);
      ctx.lineTo(vPx.x, vPx.y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // Basis vector arrows.
    drawArrow(ctx, origin, uPx, C_U, "u", 2.6);
    drawArrow(ctx, origin, vPx, C_V, "v", 2.6);

    // Handles.
    drawHandle(ctx, uPx, C_U);
    drawHandle(ctx, vPx, C_V);

    // Origin dot.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [u, v, toPx, domain, isSolved, isNearMiss]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointerMath = (e: PointerEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      return fromPx({ x: px, y: py });
    };
    const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

    const onDown = (e: PointerEvent) => {
      const m = pointerMath(e);
      if (distance(m, u) < HANDLE_HIT_RADIUS) {
        setDragging("u");
        canvas.setPointerCapture(e.pointerId);
      } else if (distance(m, v) < HANDLE_HIT_RADIUS) {
        setDragging("v");
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const m = pointerMath(e);
      const clamp = (n: number) =>
        Math.max(-domain + 0.1, Math.min(domain - 0.1, n));
      const vec = { x: Number(clamp(m.x).toFixed(3)), y: Number(clamp(m.y).toFixed(3)) };
      if (dragging === "u") setU(vec);
      else if (dragging === "v") setV(vec);
    };
    const onUp = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      setDragging(null);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, u, v, setU, setV, fromPx, domain]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="ds__canvas"
      role="img"
      aria-label="Determinant target-zero game canvas — drag u and v to drive det to zero."
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
  ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, head.x + 6, head.y - 8);
  ctx.restore();
}

function drawHandle(
  ctx: CanvasRenderingContext2D,
  p: Vec2,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
