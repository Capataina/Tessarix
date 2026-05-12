/**
 * SpanColouringGame — click-to-mark interactive for the span lesson.
 *
 * Used by:
 *   - linear-algebra-span
 *
 * THIS IS A CLICK-TO-TEST WIDGET. The reader clicks points anywhere on
 * the plane; each click is evaluated against the current span of two
 * basis vectors {u, v} and marked GREEN (in span) or RED (out of span).
 * The marks persist; dragging u or v re-evaluates every existing mark
 * in real time. This makes the abstract "span" tangible — when u and
 * v are independent, every clicked point goes green; when they're
 * parallel (1D span), only points on the line are green.
 *
 * Two modes:
 *   - Continuous: any α, β ∈ ℝ count; the span fills a line or plane.
 *   - Lattice: only integer α, β count; the span is a discrete lattice.
 *     Forces the reader to land on lattice intersection points.
 *
 * Pedagogically: the click is an ACTIVE TEST, not a passive observation.
 * The reader is asking "is THIS point in span?" repeatedly, which is
 * exactly the question span answers. Watching marks flip red→green
 * (and back) as u and v are dragged turns "span is a region" from a
 * verbal claim into a directly-felt fact.
 *
 * Implements §5 dual-state (one widget showing continuous AND lattice
 * span on toggle) plus a new click-to-mark mechanic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./SpanColouringGame.css";

const CANVAS_SIZE = 360;
const LATTICE_TOL = 0.18;
const COLLINEAR_EPS = 0.04;

interface Vec2 {
  x: number;
  y: number;
}

interface Mark {
  id: number;
  pos: Vec2;
}

function det2(u: Vec2, v: Vec2): number {
  return u.x * v.y - u.y * v.x;
}

interface Evaluation {
  inSpan: boolean;
  alpha?: number;
  beta?: number;
}

function evaluate(
  u: Vec2,
  v: Vec2,
  p: Vec2,
  lattice: boolean,
): Evaluation {
  const D = det2(u, v);
  if (Math.abs(D) < COLLINEAR_EPS) {
    // 1D span — check if p is on the line through u (or v if u is zero).
    const dir = Math.hypot(u.x, u.y) > 0.05 ? u : v;
    if (Math.hypot(dir.x, dir.y) < 0.05) {
      return { inSpan: p.x === 0 && p.y === 0 };
    }
    // Project p onto dir; check perpendicular distance.
    const dirLen = Math.hypot(dir.x, dir.y);
    const projScalar = (p.x * dir.x + p.y * dir.y) / (dirLen * dirLen);
    const foot = { x: projScalar * dir.x, y: projScalar * dir.y };
    const perp = Math.hypot(p.x - foot.x, p.y - foot.y);
    if (perp > LATTICE_TOL) return { inSpan: false };
    if (lattice) {
      // Must be an integer multiple of dir.
      return {
        inSpan: Math.abs(projScalar - Math.round(projScalar)) < LATTICE_TOL,
      };
    }
    return { inSpan: true };
  }
  // 2D span — every point is reachable in continuous mode.
  const alpha = (v.y * p.x - v.x * p.y) / D;
  const beta = (-u.y * p.x + u.x * p.y) / D;
  if (lattice) {
    const aClose = Math.abs(alpha - Math.round(alpha)) < LATTICE_TOL;
    const bClose = Math.abs(beta - Math.round(beta)) < LATTICE_TOL;
    return { inSpan: aClose && bClose, alpha, beta };
  }
  return { inSpan: true, alpha, beta };
}

interface SpanColouringGameProps {
  initialU?: Vec2;
  initialV?: Vec2;
  onStateChange?: (state: Record<string, number>) => void;
}

export function SpanColouringGame({
  initialU = { x: 1.5, y: 0.5 },
  initialV = { x: -0.5, y: 1.4 },
  onStateChange,
}: SpanColouringGameProps) {
  const { recordInteraction } = useWidgetTelemetry("SpanColouringGame");
  const [u, setU] = useState<Vec2>(initialU);
  const [v, setV] = useState<Vec2>(initialV);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [lattice, setLattice] = useState(false);
  const [nextId, setNextId] = useState(0);

  const D = det2(u, v);
  const is1D = Math.abs(D) < COLLINEAR_EPS;

  const evaluations = useMemo(
    () => marks.map((m) => ({ mark: m, eval: evaluate(u, v, m.pos, lattice) })),
    [marks, u, v, lattice],
  );

  const hits = evaluations.filter((e) => e.eval.inSpan).length;
  const misses = evaluations.length - hits;
  const hitRate = evaluations.length === 0 ? 0 : hits / evaluations.length;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      u_x: u.x, u_y: u.y,
      v_x: v.x, v_y: v.y,
      mark_count: marks.length,
      hits,
      misses,
      hit_rate: Number(hitRate.toFixed(3)),
      span_dim: is1D ? 1 : 2,
      lattice_mode: lattice ? 1 : 0,
    });
  }, [u, v, marks.length, hits, misses, hitRate, is1D, lattice, onStateChange]);

  const stateSummary = useMemo(() => {
    const dim = is1D ? "1D (u and v are parallel)" : "2D (the whole plane)";
    const mode = lattice ? "lattice mode (integer α, β only)" : "continuous mode (any α, β)";
    return `Span is ${dim}; ${mode}. ${marks.length} test points clicked — ${hits} in span, ${misses} not. u = (${u.x.toFixed(2)}, ${u.y.toFixed(2)}); v = (${v.x.toFixed(2)}, ${v.y.toFixed(2)}); det[u | v] = ${D.toFixed(3)}.`;
  }, [is1D, lattice, marks.length, hits, misses, u, v, D]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        u: [u.x, u.y].map((x) => Number(x.toFixed(2))),
        v: [v.x, v.y].map((x) => Number(x.toFixed(2))),
        lattice,
        marks: marks.length,
      }),
    [u, v, lattice, marks.length],
  );

  const handleAddMark = useCallback(
    (pos: Vec2) => {
      setMarks((prev) => [...prev, { id: nextId, pos }]);
      setNextId((n) => n + 1);
      recordInteraction("click_test", {
        x: Number(pos.x.toFixed(2)),
        y: Number(pos.y.toFixed(2)),
      });
    },
    [nextId, recordInteraction],
  );

  const handleClearMarks = useCallback(() => {
    setMarks([]);
    recordInteraction("clear_marks");
  }, [recordInteraction]);

  const handleToggleLattice = useCallback(() => {
    setLattice((prev) => {
      recordInteraction("toggle_lattice", { lattice: !prev });
      return !prev;
    });
  }, [recordInteraction]);

  const presets = [
    { label: "Independent (2D span)", u: { x: 1.5, y: 0.5 }, v: { x: -0.5, y: 1.4 } },
    { label: "Parallel (1D span)", u: { x: 1, y: 1 }, v: { x: -2, y: -2 } },
    { label: "Standard basis", u: { x: 1, y: 0 }, v: { x: 0, y: 1 } },
    { label: "Rotated 45°", u: { x: 1, y: 1 }, v: { x: -1, y: 1 } },
  ];

  return (
    <div className="scg">
      <header className="scg__head">
        <div className="scg__heading">
          <span className="scg__heading-label">SPAN</span>
          <span className={`scg__heading-value scg__heading-value--${is1D ? "danger" : "ok"}`}>
            {is1D ? "1D (collapsed to a line)" : "2D (full plane)"}
          </span>
        </div>
        <div className="scg__heading">
          <span className="scg__heading-label">MODE</span>
          <button
            type="button"
            className={`scg__toggle${lattice ? " scg__toggle--on" : ""}`}
            onClick={handleToggleLattice}
          >
            {lattice ? "Lattice (integers only)" : "Continuous (any α, β)"}
          </button>
        </div>
        <div className="scg__heading">
          <span className="scg__heading-label">SCORE</span>
          <span className="scg__heading-value">
            {hits} hit{hits === 1 ? "" : "s"} / {marks.length} click{marks.length === 1 ? "" : "s"}
            {marks.length > 0 && ` · ${Math.round(hitRate * 100)}%`}
          </span>
        </div>
      </header>

      <SpanCanvas
        u={u}
        v={v}
        setU={setU}
        setV={setV}
        evaluations={evaluations}
        lattice={lattice}
        onAddMark={handleAddMark}
      />

      <div className="scg__controls">
        <button type="button" className="scg__btn" onClick={handleClearMarks}>
          Clear marks
        </button>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className="scg__preset"
            onClick={() => {
              setU(p.u);
              setV(p.v);
              recordInteraction("preset", { label: p.label });
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="scg__instructions">
        <strong>How to play.</strong> Drag the <span className="scg__legend scg__legend--u">u</span> and <span className="scg__legend scg__legend--v">v</span> handles to set the basis. <strong>Click anywhere on the canvas</strong> to drop a test point. Green marks are in the span of <em>{lattice ? "integer combinations of " : ""}</em>u and v; red marks are out of reach. Try the parallel preset and click points off the line — every one should turn red. Switch to lattice mode and watch most of your green marks turn red.
      </div>

      <WidgetExplainer
        widgetName="Span colouring game — click to test reachability"
        widgetDescription="A click-to-test widget for the span of two 2D vectors u and v. The reader drags u and v to define the basis, then clicks anywhere on the canvas to drop test points. Each test point is evaluated against the current span: green if reachable as some linear combination α·u + β·v, red if not. In continuous mode, every point is reachable when u and v are linearly independent (det non-zero); the whole canvas turns green. In lattice mode, only integer combinations count, so the reader sees a discrete lattice of green points. When u and v are made parallel (det ≈ 0), the span collapses to a 1D line and only points on that line are green — most clicks elsewhere turn red. The widget reports hit count, miss count, hit rate, and the current span dimension."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface SpanCanvasProps {
  u: Vec2;
  v: Vec2;
  setU: (u: Vec2) => void;
  setV: (v: Vec2) => void;
  evaluations: { mark: Mark; eval: Evaluation }[];
  lattice: boolean;
  onAddMark: (pos: Vec2) => void;
}

type DragHandle = "u" | "v" | null;

function SpanCanvas({
  u,
  v,
  setU,
  setV,
  evaluations,
  lattice,
  onAddMark,
}: SpanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState<DragHandle>(null);

  const domain = useMemo(() => {
    const pts: Vec2[] = [u, v, { x: 3, y: 3 }, { x: -3, y: -3 }];
    for (const e of evaluations) pts.push(e.mark.pos);
    return computeDomain(pts, { padding: 1.4, floor: 4, ceiling: 8 });
  }, [u, v, evaluations]);

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
    const C_OK = resolveColor("var(--widget-success)");
    const C_BAD = resolveColor("var(--widget-danger)");
    const C_TEXT = resolveColor("var(--widget-text)");

    // Background grid.
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Lattice mode: draw the integer lattice spanned by u and v.
    if (lattice && Math.abs(det2(u, v)) > COLLINEAR_EPS) {
      ctx.fillStyle = resolveColorAlpha("var(--widget-success)", 0.25);
      const N = 5;
      for (let a = -N; a <= N; a++) {
        for (let b = -N; b <= N; b++) {
          const p = toPx({ x: a * u.x + b * v.x, y: a * u.y + b * v.y });
          if (p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (Math.abs(det2(u, v)) <= COLLINEAR_EPS) {
      // 1D span — shade the line.
      const dir = Math.hypot(u.x, u.y) > 0.05 ? u : v;
      if (Math.hypot(dir.x, dir.y) > 0.05) {
        ctx.strokeStyle = resolveColorAlpha("var(--widget-success)", 0.35);
        ctx.lineWidth = 3;
        const ext = domain * 1.4;
        const len = Math.hypot(dir.x, dir.y);
        const norm = { x: dir.x / len, y: dir.y / len };
        const start = toPx({ x: -ext * norm.x, y: -ext * norm.y });
        const end = toPx({ x: ext * norm.x, y: ext * norm.y });
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    }

    // Marks.
    for (const e of evaluations) {
      const p = toPx(e.mark.pos);
      const color = e.eval.inSpan ? C_OK : C_BAD;
      ctx.fillStyle = resolveColorAlpha(
        e.eval.inSpan ? "var(--widget-success)" : "var(--widget-danger)",
        0.32,
      );
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Basis vectors.
    const origin = toPx({ x: 0, y: 0 });
    drawArrow(ctx, origin, toPx(u), C_U, "u", 2.4);
    drawArrow(ctx, origin, toPx(v), C_V, "v", 2.4);

    // Handles.
    drawHandle(ctx, toPx(u), C_U);
    drawHandle(ctx, toPx(v), C_V);

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [u, v, evaluations, lattice, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer handling: dragging basis handles vs clicking to mark.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let downPos: { x: number; y: number } | null = null;
    let downMath: Vec2 | null = null;

    const pointerMath = (e: PointerEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      return fromPx({ x: px, y: py });
    };

    const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

    const onDown = (e: PointerEvent) => {
      const m = pointerMath(e);
      downPos = { x: e.clientX, y: e.clientY };
      downMath = m;
      const hitRadius = 0.32;
      if (distance(m, u) < hitRadius) {
        setDragging("u");
        canvas.setPointerCapture(e.pointerId);
      } else if (distance(m, v) < hitRadius) {
        setDragging("v");
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const m = pointerMath(e);
      const clamp = (n: number) =>
        Math.max(-domain + 0.1, Math.min(domain - 0.1, n));
      const vec = { x: clamp(m.x), y: clamp(m.y) };
      if (dragging === "u") setU(vec);
      else if (dragging === "v") setV(vec);
    };
    const onUp = (e: PointerEvent) => {
      const wasDragging = dragging !== null;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      setDragging(null);

      // If we didn't drag a handle, treat as a click to drop a mark.
      if (!wasDragging && downPos && downMath) {
        const dx = e.clientX - downPos.x;
        const dy = e.clientY - downPos.y;
        const movedPx = Math.hypot(dx, dy);
        if (movedPx < 4) {
          // Snap to integer if pretty close (in lattice mode the reader
          // probably means the lattice point).
          onAddMark(downMath);
        }
      }
      downPos = null;
      downMath = null;
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
  }, [dragging, u, v, setU, setV, fromPx, domain, onAddMark]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="scg__canvas"
      role="img"
      aria-label="Span colouring game canvas."
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
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
