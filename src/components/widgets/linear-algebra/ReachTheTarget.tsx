/**
 * ReachTheTarget — multi-coefficient puzzle for span.
 *
 * Used by:
 *   - linear-algebra-span
 *
 * THIS IS A PUZZLE. A target point T is fixed. Two basis vectors u, v are
 * draggable. The reader adjusts α, β (the coefficients in α·u + β·v) to
 * land the green output vector ON T. Two modes:
 *
 *   - Integer (lattice): α, β snap to integer multiples; the reachable
 *     set is a discrete LATTICE of points. Many T's are unreachable from
 *     the current u, v — the reader must drag u, v to reshape the lattice
 *     until T falls on a node.
 *   - Continuous: α, β are real numbers (slider precision 0.05). When u
 *     and v are linearly independent, every T is reachable in exactly one
 *     way. When they're parallel, only T's on their shared line work.
 *
 * Pedagogy: integer-coefficient combinations form a *lattice*, not the
 * whole plane. Decimal combinations reach every point in the span. This
 * widget is the bridge from "span is a continuous region" (a fact stated
 * in the previous widgets) to "lattices and continuous spans behave very
 * differently for the same generating set" — a distinction that surfaces
 * in lattice cryptography, error-correcting codes, and discrete-versus-
 * continuous integration domains.
 *
 * State machine:
 *   - hunting: distance > eps, output dot tracking α·u + β·v
 *   - solved: distance < eps, success banner shown
 *
 * Implements metaphor library §10 (constructive build-up) combined with
 * §4 (direct manipulation): the reader constructs the target FROM u, v
 * AND drags both u, v AND α, β directly. Every degree of freedom is
 * hands-on.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./ReachTheTarget.css";

const CANVAS_SIZE = 360;
const SUCCESS_EPS = 0.12;
const COLLINEAR_EPS = 0.04;

interface Vec2 {
  x: number;
  y: number;
}

type Mode = "integer" | "continuous";

interface Puzzle {
  label: string;
  target: Vec2;
  startU: Vec2;
  startV: Vec2;
  /** Solvable in integer mode without changing u, v? */
  integerSolvableAsGiven: boolean;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Reach (3, 2)",
    target: { x: 3, y: 2 },
    startU: { x: 1, y: 0 },
    startV: { x: 0, y: 1 },
    integerSolvableAsGiven: true,
  },
  {
    label: "Reach (2, 3) — integer hunt",
    target: { x: 2, y: 3 },
    startU: { x: 1.6, y: 0.4 },
    startV: { x: 0.4, y: 1.6 },
    integerSolvableAsGiven: false,
  },
  {
    label: "Reach (−1, 2) on a tilted lattice",
    target: { x: -1, y: 2 },
    startU: { x: 1, y: 1 },
    startV: { x: -1, y: 1 },
    integerSolvableAsGiven: true,
  },
  {
    label: "Reach (1.5, 1.5) — continuous only",
    target: { x: 1.5, y: 1.5 },
    startU: { x: 1, y: 0 },
    startV: { x: 0, y: 1 },
    integerSolvableAsGiven: false,
  },
];

function det2(u: Vec2, v: Vec2): number {
  return u.x * v.y - u.y * v.x;
}

/**
 * Closest-pair solver. Given target T and basis u, v, return the (α, β)
 * with the smallest distance from α·u + β·v to T.
 *
 * Continuous mode: when det != 0, the unique solution is found by
 * inverting the 2x2 matrix [u | v]. When det ≈ 0, fall back to the
 * 1D projection onto u's direction.
 *
 * Integer mode: round the continuous solution; the lattice's closest
 * node is within 1 step of each rounded coordinate so a 3x3 grid sweep
 * is enough.
 */
function solveTarget(
  u: Vec2,
  v: Vec2,
  target: Vec2,
  integer: boolean,
): { alpha: number; beta: number; distance: number } {
  const D = det2(u, v);
  if (Math.abs(D) < COLLINEAR_EPS) {
    // 1D fallback — project onto u (or v if u is zero).
    const dir = Math.hypot(u.x, u.y) > 0.05 ? u : v;
    const dirLen = Math.hypot(dir.x, dir.y);
    if (dirLen < 0.05) {
      return { alpha: 0, beta: 0, distance: Math.hypot(target.x, target.y) };
    }
    const k = (target.x * dir.x + target.y * dir.y) / (dirLen * dirLen);
    const kr = integer ? Math.round(k) : k;
    const fx = kr * dir.x;
    const fy = kr * dir.y;
    const usingU = Math.hypot(u.x, u.y) > 0.05;
    return {
      alpha: usingU ? kr : 0,
      beta: usingU ? 0 : kr,
      distance: Math.hypot(target.x - fx, target.y - fy),
    };
  }
  const alphaC = (v.y * target.x - v.x * target.y) / D;
  const betaC = (-u.y * target.x + u.x * target.y) / D;
  if (!integer) {
    return { alpha: alphaC, beta: betaC, distance: 0 };
  }
  let best = { alpha: 0, beta: 0, distance: Infinity };
  const aR = Math.round(alphaC);
  const bR = Math.round(betaC);
  for (let da = -1; da <= 1; da++) {
    for (let db = -1; db <= 1; db++) {
      const a = aR + da;
      const b = bR + db;
      const px = a * u.x + b * v.x;
      const py = a * u.y + b * v.y;
      const dist = Math.hypot(target.x - px, target.y - py);
      if (dist < best.distance) best = { alpha: a, beta: b, distance: dist };
    }
  }
  return best;
}

interface ReachTheTargetProps {
  initialPuzzle?: number;
  onStateChange?: (state: Record<string, number>) => void;
}

export function ReachTheTarget({
  initialPuzzle = 0,
  onStateChange,
}: ReachTheTargetProps) {
  const { recordInteraction } = useWidgetTelemetry("ReachTheTarget");
  const [puzzleIdx, setPuzzleIdx] = useState(initialPuzzle);
  const puzzle = PUZZLES[puzzleIdx];

  const [u, setU] = useState<Vec2>(puzzle.startU);
  const [v, setV] = useState<Vec2>(puzzle.startV);
  const [alpha, setAlpha] = useState(0);
  const [beta, setBeta] = useState(0);
  const [mode, setMode] = useState<Mode>("integer");

  // Output α·u + β·v.
  const out = useMemo(
    () => ({ x: alpha * u.x + beta * v.x, y: alpha * u.y + beta * v.y }),
    [alpha, beta, u, v],
  );

  const target = puzzle.target;
  const distance = Math.hypot(out.x - target.x, out.y - target.y);
  const isSolved = distance < SUCCESS_EPS;
  const isIntegerSolved = isSolved && Number.isInteger(alpha) && Number.isInteger(beta);

  const D = det2(u, v);
  const dependent = Math.abs(D) < COLLINEAR_EPS;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      alpha: Number(alpha.toFixed(3)),
      beta: Number(beta.toFixed(3)),
      u_x: Number(u.x.toFixed(2)),
      u_y: Number(u.y.toFixed(2)),
      v_x: Number(v.x.toFixed(2)),
      v_y: Number(v.y.toFixed(2)),
      out_x: Number(out.x.toFixed(3)),
      out_y: Number(out.y.toFixed(3)),
      target_x: target.x,
      target_y: target.y,
      distance: Number(distance.toFixed(3)),
      solved: isSolved ? 1 : 0,
      integer_solved: isIntegerSolved ? 1 : 0,
      mode_integer: mode === "integer" ? 1 : 0,
      dependent: dependent ? 1 : 0,
    });
  }, [
    puzzleIdx, alpha, beta, u, v, out, target, distance,
    isSolved, isIntegerSolved, mode, dependent, onStateChange,
  ]);

  const stateSummary = useMemo(() => {
    const status = isSolved
      ? isIntegerSolved
        ? `SOLVED with integer coefficients (α=${alpha}, β=${beta}). The lattice spanned by u, v contains T.`
        : `SOLVED with continuous coefficients (α=${alpha.toFixed(2)}, β=${beta.toFixed(2)}). T is in span(u,v) but not on the integer lattice.`
      : dependent
      ? `Not yet — and u, v are PARALLEL (det ≈ 0). The reachable set is just one line through the origin; if T isn't on that line, no choice of α, β reaches it. Drag v off u's line.`
      : `Not yet — distance ${distance.toFixed(2)}. Output α·u + β·v is at (${out.x.toFixed(2)}, ${out.y.toFixed(2)}); target is (${target.x}, ${target.y}).`;
    return `Puzzle "${puzzle.label}", ${mode} mode. u=(${u.x.toFixed(2)}, ${u.y.toFixed(2)}), v=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}), α=${alpha.toFixed(2)}, β=${beta.toFixed(2)}. ${status}`;
  }, [puzzle, mode, u, v, alpha, beta, out, target, distance, isSolved, isIntegerSolved, dependent]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        mode,
        u: [Number(u.x.toFixed(2)), Number(u.y.toFixed(2))],
        v: [Number(v.x.toFixed(2)), Number(v.y.toFixed(2))],
        alpha: Number(alpha.toFixed(2)),
        beta: Number(beta.toFixed(2)),
        solved: isSolved,
        integer_solved: isIntegerSolved,
      }),
    [puzzleIdx, mode, u, v, alpha, beta, isSolved, isIntegerSolved],
  );

  const handleAlpha = useCallback(
    (raw: number) => {
      const snapped = mode === "integer" ? Math.round(raw) : raw;
      setAlpha(snapped);
      recordInteraction("alpha", { mode, value: snapped });
    },
    [mode, recordInteraction],
  );
  const handleBeta = useCallback(
    (raw: number) => {
      const snapped = mode === "integer" ? Math.round(raw) : raw;
      setBeta(snapped);
      recordInteraction("beta", { mode, value: snapped });
    },
    [mode, recordInteraction],
  );

  const handleSolve = useCallback(() => {
    const s = solveTarget(u, v, target, mode === "integer");
    setAlpha(s.alpha);
    setBeta(s.beta);
    recordInteraction("auto_solve", {
      mode,
      alpha: s.alpha,
      beta: s.beta,
      distance: Number(s.distance.toFixed(3)),
    });
  }, [u, v, target, mode, recordInteraction]);

  const handleNewPuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      const p = PUZZLES[idx];
      setU(p.startU);
      setV(p.startV);
      setAlpha(0);
      setBeta(0);
      recordInteraction("puzzle", { puzzle: p.label });
    },
    [recordInteraction],
  );

  const handleMode = useCallback(
    (next: Mode) => {
      setMode(next);
      if (next === "integer") {
        setAlpha((a) => Math.round(a));
        setBeta((b) => Math.round(b));
      }
      recordInteraction("mode", { mode: next });
    },
    [recordInteraction],
  );

  const handleReset = useCallback(() => {
    setU(puzzle.startU);
    setV(puzzle.startV);
    setAlpha(0);
    setBeta(0);
    recordInteraction("reset");
  }, [puzzle, recordInteraction]);

  const verdict: "solved-integer" | "solved-continuous" | "dependent" | "hunting" =
    isIntegerSolved
      ? "solved-integer"
      : isSolved
      ? "solved-continuous"
      : dependent
      ? "dependent"
      : "hunting";

  return (
    <div className={`rtt${isSolved ? " rtt--solved" : ""}`}>
      <header className="rtt__head">
        <div className="rtt__heading">
          <span className="rtt__heading-label">PUZZLE</span>
          <span className="rtt__heading-value">{puzzle.label}</span>
        </div>
        <div className="rtt__heading">
          <span className="rtt__heading-label">TARGET</span>
          <span className="rtt__heading-value">
            T = ({target.x}, {target.y})
          </span>
        </div>
        <div className="rtt__heading">
          <span className="rtt__heading-label">MODE</span>
          <div className="rtt__mode">
            <button
              type="button"
              className={`rtt__mode-btn${mode === "integer" ? " rtt__mode-btn--active" : ""}`}
              onClick={() => handleMode("integer")}
            >
              Integer (lattice)
            </button>
            <button
              type="button"
              className={`rtt__mode-btn${mode === "continuous" ? " rtt__mode-btn--active" : ""}`}
              onClick={() => handleMode("continuous")}
            >
              Continuous
            </button>
          </div>
        </div>
      </header>

      <ReachCanvas
        u={u}
        v={v}
        setU={setU}
        setV={setV}
        target={target}
        out={out}
        alpha={alpha}
        beta={beta}
        mode={mode}
        dependent={dependent}
        isSolved={isSolved}
      />

      <div className="rtt__controls">
        <CoefficientSlider
          label="α"
          value={alpha}
          mode={mode}
          onChange={handleAlpha}
        />
        <CoefficientSlider
          label="β"
          value={beta}
          mode={mode}
          onChange={handleBeta}
        />
      </div>

      <div className="rtt__actions">
        <button type="button" className="rtt__btn" onClick={handleSolve}>
          Auto-solve (snap to closest)
        </button>
        <button type="button" className="rtt__btn" onClick={handleReset}>
          Reset u, v, α, β
        </button>
      </div>

      <div className={`rtt__verdict rtt__verdict--${verdict}`}>
        <span className="rtt__verdict-label">Status</span>
        <span className="rtt__verdict-value">
          {verdict === "solved-integer" &&
            `✓ Reached (${target.x}, ${target.y}) with INTEGER coefficients α=${alpha}, β=${beta}. T sits on the lattice {αu + βv : α, β ∈ ℤ}.`}
          {verdict === "solved-continuous" &&
            `✓ Reached (${target.x}, ${target.y}) with α=${alpha.toFixed(2)}, β=${beta.toFixed(2)}. T is in span(u, v), but not on the integer lattice — try dragging u, v to put T on a lattice node, or switch to integer mode and watch the constraint bite.`}
          {verdict === "dependent" &&
            `u and v are parallel (det ≈ 0). The reachable set is a single line through the origin. If T isn't on that line, you can't reach it no matter what α, β you pick. Drag v off u's line to expand the span to all of ℝ².`}
          {verdict === "hunting" &&
            `Distance to T: ${distance.toFixed(2)}. Adjust α, β (and drag u, v) to bring the green dot onto T.`}
        </span>
      </div>

      <div className="rtt__puzzle-row">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`rtt__puzzle-pick${i === puzzleIdx ? " rtt__puzzle-pick--active" : ""}`}
            onClick={() => handleNewPuzzle(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rtt__instructions">
        <strong>How to play.</strong> Drag <span className="rtt__legend rtt__legend--u">u</span> and <span className="rtt__legend rtt__legend--v">v</span> on the canvas to choose a basis. Slide <strong>α, β</strong> to combine them: the green dot is α·u + β·v. Land it on the red target T. In <em>integer mode</em>, α and β snap to whole numbers — only the lattice nodes are reachable, so most targets need you to reshape u, v first. In <em>continuous mode</em>, every point of span(u, v) is reachable.
      </div>

      <WidgetExplainer
        widgetName="Reach the target — multi-coefficient span puzzle"
        widgetDescription="A puzzle widget for span. A red target point T is fixed. Two basis vectors u, v are draggable on the canvas. The reader sliders α and β; the green output point α·u + β·v must land on T (within ε). Two modes: in INTEGER mode, α and β snap to whole numbers, so reachable points form a discrete LATTICE generated by u and v — most targets are unreachable unless the reader drags u, v to put T on a lattice node. In CONTINUOUS mode, α, β are real numbers (slider step 0.05), so when u, v are linearly independent every point in ℝ² is reachable in exactly one way; when u, v are parallel only points on their shared line are reachable. An auto-solve button snaps α, β to the closest reachable point for diagnostics. The pedagogical contrast is integer-lattice vs continuous-span: the same generators produce a discrete grid in one regime and a continuous plane in the other."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface CoefficientSliderProps {
  label: string;
  value: number;
  mode: Mode;
  onChange: (n: number) => void;
}

function CoefficientSlider({ label, value, mode, onChange }: CoefficientSliderProps) {
  const step = mode === "integer" ? 1 : 0.05;
  const min = -4;
  const max = 4;
  return (
    <div className="rtt__slider">
      <div className="rtt__slider-row">
        <span className="rtt__slider-label">{label}</span>
        <input
          className="rtt__slider-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="rtt__slider-value">
          {mode === "integer" ? String(value) : value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

interface ReachCanvasProps {
  u: Vec2;
  v: Vec2;
  setU: (u: Vec2) => void;
  setV: (v: Vec2) => void;
  target: Vec2;
  out: Vec2;
  alpha: number;
  beta: number;
  mode: Mode;
  dependent: boolean;
  isSolved: boolean;
}

type DragHandle = "u" | "v" | null;

function ReachCanvas({
  u,
  v,
  setU,
  setV,
  target,
  out,
  alpha,
  beta,
  mode,
  dependent,
  isSolved,
}: ReachCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState<DragHandle>(null);

  const domain = useMemo(() => {
    const pts: Vec2[] = [u, v, target, out, { x: 0, y: 0 }];
    pts.push({ x: 2 * u.x + 2 * v.x, y: 2 * u.y + 2 * v.y });
    pts.push({ x: -2 * u.x - 2 * v.x, y: -2 * u.y - 2 * v.y });
    return computeDomain(pts, { padding: 1.35, floor: 3.5, ceiling: 8 });
  }, [u, v, target, out]);

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
    const C_OUT = isSolved
      ? resolveColor("var(--widget-success)")
      : resolveColor("var(--widget-chart-4)");
    const C_TARGET = resolveColor("var(--widget-danger)");
    const C_TARGET_HALO = resolveColorAlpha("var(--widget-danger)", 0.18);
    const C_LATTICE = resolveColorAlpha("var(--widget-accent)", 0.28);
    const C_LINE = resolveColorAlpha("var(--widget-success)", 0.32);
    const C_TEXT = resolveColor("var(--widget-text)");

    // Background grid + axes.
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

    // Lattice / span line.
    if (!dependent && mode === "integer") {
      // Draw the integer lattice spanned by u and v.
      ctx.fillStyle = C_LATTICE;
      const N = 6;
      for (let a = -N; a <= N; a++) {
        for (let b = -N; b <= N; b++) {
          const p = toPx({ x: a * u.x + b * v.x, y: a * u.y + b * v.y });
          if (p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (dependent) {
      // 1D — shade the line.
      const dir = Math.hypot(u.x, u.y) > 0.05 ? u : v;
      if (Math.hypot(dir.x, dir.y) > 0.05) {
        ctx.strokeStyle = C_LINE;
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

    // Target halo + dot.
    const tPx = toPx(target);
    ctx.fillStyle = C_TARGET_HALO;
    ctx.beginPath();
    ctx.arc(tPx.x, tPx.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C_TARGET;
    ctx.beginPath();
    ctx.arc(tPx.x, tPx.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = C_TARGET;
    ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText(`T = (${target.x}, ${target.y})`, tPx.x + 10, tPx.y - 10);

    // Decomposition arrows: from origin → α·u, then → α·u + β·v.
    const aU = { x: alpha * u.x, y: alpha * u.y };
    const aUPx = toPx(aU);
    const outPx = toPx({ x: alpha * u.x + beta * v.x, y: alpha * u.y + beta * v.y });
    const originPx = toPx({ x: 0, y: 0 });
    ctx.strokeStyle = resolveColorAlpha("var(--widget-chart-1)", 0.85);
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(originPx.x, originPx.y);
    ctx.lineTo(aUPx.x, aUPx.y);
    ctx.stroke();
    ctx.strokeStyle = resolveColorAlpha("var(--widget-chart-2)", 0.85);
    ctx.beginPath();
    ctx.moveTo(aUPx.x, aUPx.y);
    ctx.lineTo(outPx.x, outPx.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Basis vectors u, v.
    drawArrow(ctx, originPx, toPx(u), C_U, "u", 2.4);
    drawArrow(ctx, originPx, toPx(v), C_V, "v", 2.4);

    // Output point α·u + β·v.
    ctx.fillStyle = resolveColorAlpha(
      isSolved ? "var(--widget-success)" : "var(--widget-chart-4)",
      0.28,
    );
    ctx.beginPath();
    ctx.arc(outPx.x, outPx.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C_OUT;
    ctx.beginPath();
    ctx.arc(outPx.x, outPx.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = C_OUT;
    ctx.fillText(
      `α·u + β·v = (${out.x.toFixed(2)}, ${out.y.toFixed(2)})`,
      outPx.x + 10,
      outPx.y + 16,
    );

    // Handles for u, v.
    drawHandle(ctx, toPx(u), C_U);
    drawHandle(ctx, toPx(v), C_V);

    // Origin.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(originPx.x, originPx.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [u, v, target, out, alpha, beta, mode, dependent, isSolved, toPx, domain]);

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
      const hit = 0.35;
      if (distance(m, u) < hit) {
        setDragging("u");
        canvas.setPointerCapture(e.pointerId);
      } else if (distance(m, v) < hit) {
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
      className="rtt__canvas"
      role="img"
      aria-label="Reach the target canvas."
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
