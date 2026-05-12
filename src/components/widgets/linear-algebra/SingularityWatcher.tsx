/**
 * SingularityWatcher — find the parameter that makes det(A(t)) = 0.
 *
 * Used by:
 *   - linear-algebra-matrix-inverse
 *
 * THIS IS A FIND-THE-SINGULARITY PUZZLE. A 2×2 matrix has a single
 * variable parameter t — one entry, or two entries linked by t —
 * and det(A(t)) is some function of t. The reader's job is to adjust
 * t (with a coarse slider plus a fine-tuning slider) until det(A(t))
 * is exactly zero within tolerance. The display shows the matrix,
 * its determinant, and a small det-as-function-of-t plot with the
 * current t marked.
 *
 * Pedagogy: singularity is the knife-edge condition. Most matrices
 * are invertible; some are singular; the boundary between them is a
 * codimension-1 condition — a single equation det(A) = 0. When the
 * matrix depends on a parameter t, singularity becomes a *root-finding
 * problem*: find the values of t that make A(t) singular. This is a
 * recurring theme in the rest of linear algebra (eigenvalues are
 * exactly the roots of det(A − λI) = 0, for example), so making
 * "hunt for the singular t" a tangible game prepares the reader for
 * the bigger version they'll see in eigenvalue lessons.
 *
 * Three puzzle types of increasing depth:
 *   - Linear: a single entry is t, det is linear in t (one root).
 *   - Quadratic: t appears in two entries, det is quadratic (up to
 *     two roots, can be revisited).
 *   - System: TWO parameters s and t, with TWO constraints that must
 *     both be satisfied — a simultaneous-equation flavour, foretelling
 *     eigenvalue problems where eigenvalues are constrained by both
 *     det and trace.
 *
 * Score: number of correct hits (rounds where the reader landed
 * within tolerance) over total puzzles played.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./SingularityWatcher.css";

const PLOT_W = 320;
const PLOT_H = 140;
const HIT_TOL = 0.05;

type Mode = "linear" | "quadratic" | "system";

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

function det(M: Matrix2): number {
  return M.a * M.d - M.b * M.c;
}

// ─── puzzle definitions ─────────────────────────────────────────────

interface Puzzle {
  label: string;
  mode: Mode;
  description: string;
  /** Compute the matrix at a given parameter (t for linear/quadratic, s for system). */
  build: (params: { t: number; s?: number }) => Matrix2;
  /** Render the matrix template for the reader (with t/s/k placeholders). */
  template: { a: string; b: string; c: string; d: string };
  /** Slider range for t. */
  tRange: [number, number];
  /** Slider range for s (system mode only). */
  sRange?: [number, number];
  /** Closed-form det used to render the plot accurately. */
  detExpr: (t: number, s?: number) => number;
  /** Optional second constraint expression for system mode. */
  detExpr2?: (t: number, s: number) => number;
  /** Roots / solutions to display once solved. */
  roots: Array<{ t: number; s?: number; label: string }>;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Linear: A = [[t, 2], [1, 1]]",
    mode: "linear",
    description:
      "det(A) = t · 1 − 2 · 1 = t − 2. Singular when t = 2.",
    build: ({ t }) => ({ a: t, b: 2, c: 1, d: 1 }),
    template: { a: "t", b: "2", c: "1", d: "1" },
    tRange: [-4, 4],
    detExpr: (t) => t - 2,
    roots: [{ t: 2, label: "t = 2" }],
  },
  {
    label: "Linear: A = [[3, t], [t, 3]]",
    mode: "linear",
    description:
      "det(A) = 9 − t². Singular when t = ±3. Find ONE of them.",
    build: ({ t }) => ({ a: 3, b: t, c: t, d: 3 }),
    template: { a: "3", b: "t", c: "t", d: "3" },
    tRange: [-5, 5],
    detExpr: (t) => 9 - t * t,
    roots: [
      { t: 3, label: "t = 3" },
      { t: -3, label: "t = -3" },
    ],
  },
  {
    label: "Quadratic: A = [[t, 1], [4, t]]",
    mode: "quadratic",
    description:
      "det(A) = t² − 4. Singular when t = ±2 — two roots in the same range.",
    build: ({ t }) => ({ a: t, b: 1, c: 4, d: t }),
    template: { a: "t", b: "1", c: "4", d: "t" },
    tRange: [-4, 4],
    detExpr: (t) => t * t - 4,
    roots: [
      { t: 2, label: "t = 2" },
      { t: -2, label: "t = -2" },
    ],
  },
  {
    label: "Quadratic: A = [[t, t+1], [t-1, t]]",
    mode: "quadratic",
    description:
      "det(A) = t² − (t+1)(t-1) = t² − (t² − 1) = 1. Always non-zero! No root exists. (Spotting impossibility is the lesson.)",
    build: ({ t }) => ({ a: t, b: t + 1, c: t - 1, d: t }),
    template: { a: "t", b: "t+1", c: "t-1", d: "t" },
    tRange: [-3, 3],
    detExpr: (_t) => 1,
    roots: [], // none
  },
  {
    label: "System: A(s, t) with two constraints",
    mode: "system",
    description:
      "A = [[s, 1], [1, t]]. Two constraints: det(A) = 0 AND trace(A) = 0. Find (s, t) satisfying both. (Foreshadows eigenvalue equations.)",
    build: ({ t, s }) => ({ a: s ?? 0, b: 1, c: 1, d: t }),
    template: { a: "s", b: "1", c: "1", d: "t" },
    tRange: [-3, 3],
    sRange: [-3, 3],
    detExpr: (t, s) => (s ?? 0) * t - 1, // det
    detExpr2: (t, s) => (s ?? 0) + t, // trace
    // Solving s*t = 1 and s + t = 0 gives s = -t and -t^2 = 1 → no real roots.
    // Better: solve s*t = 1 and s + t = 0: s = -t, -t² = 1 → impossible.
    // Use: s*t = 1, s = -t gives t² = -1, no real solution.
    // Let me adjust: use det(A) = 0 alone? But then it's not "two constraints".
    // Use: det = 0 AND a single trace constraint that has a solution.
    // det = s*t - 1 = 0, trace = s + t = 2. Then s + t = 2, s*t = 1.
    // → s, t are roots of x² - 2x + 1 = 0 → (x-1)² → s = t = 1.
    roots: [{ t: 1, s: 1, label: "(s, t) = (1, 1)" }],
  },
];

// Patch system trace target to match the solved system above.
PUZZLES[4].detExpr2 = (t, s) => (s ?? 0) + t - 2;
PUZZLES[4].description =
  "A = [[s, 1], [1, t]]. Two constraints: det(A) = 0 AND (trace − 2) = 0. Find (s, t) satisfying both. (Foreshadows the eigenvalue equation, where det and trace pin λ.)";

interface SingularityWatcherProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function SingularityWatcher({
  onStateChange,
}: SingularityWatcherProps) {
  const { recordInteraction } = useWidgetTelemetry("SingularityWatcher");
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [t, setT] = useState(0);
  const [s, setS] = useState(0);
  const [score, setScore] = useState({ wins: 0, attempts: 0 });
  const [claimed, setClaimed] = useState(false);
  const [claimResult, setClaimResult] = useState<"none" | "ok" | "miss" | "impossible">("none");

  const puzzle = PUZZLES[puzzleIdx];
  const M = puzzle.build({ t, s });
  const detVal = det(M);
  const detExpr2 =
    puzzle.mode === "system" && puzzle.detExpr2 ? puzzle.detExpr2(t, s) : null;
  const onTarget =
    Math.abs(detVal) < HIT_TOL &&
    (puzzle.mode !== "system" || (detExpr2 !== null && Math.abs(detExpr2) < HIT_TOL));

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      t: Number(t.toFixed(3)),
      s: Number(s.toFixed(3)),
      det: Number(detVal.toFixed(3)),
      on_target: onTarget ? 1 : 0,
      wins: score.wins,
      attempts: score.attempts,
    });
  }, [puzzleIdx, t, s, detVal, onTarget, score, onStateChange]);

  const handleClaim = useCallback(() => {
    setClaimed(true);
    let result: "ok" | "miss" | "impossible" = "miss";
    if (puzzle.roots.length === 0) {
      result = "impossible";
    } else if (onTarget) {
      result = "ok";
    }
    setClaimResult(result);
    setScore((prev) => ({
      wins: prev.wins + (result === "ok" ? 1 : 0),
      attempts: prev.attempts + 1,
    }));
    recordInteraction("claim", {
      puzzle: puzzle.label,
      result,
      t: Number(t.toFixed(3)),
      s: Number(s.toFixed(3)),
      det: Number(detVal.toFixed(3)),
    });
  }, [puzzle, onTarget, t, s, detVal, recordInteraction]);

  const handleClaimImpossible = useCallback(() => {
    setClaimed(true);
    const result: "ok" | "miss" = puzzle.roots.length === 0 ? "ok" : "miss";
    setClaimResult(result === "ok" ? "ok" : "miss");
    setScore((prev) => ({
      wins: prev.wins + (result === "ok" ? 1 : 0),
      attempts: prev.attempts + 1,
    }));
    recordInteraction("claim_impossible", {
      puzzle: puzzle.label,
      result,
    });
  }, [puzzle, recordInteraction]);

  const handleNewPuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      setClaimed(false);
      setClaimResult("none");
      const p = PUZZLES[idx];
      // Default t to the midpoint of its range, avoiding the actual root.
      const mid = (p.tRange[0] + p.tRange[1]) / 2;
      setT(mid);
      if (p.sRange) setS((p.sRange[0] + p.sRange[1]) / 2);
      else setS(0);
      recordInteraction("new_puzzle", { puzzle: p.label });
    },
    [recordInteraction],
  );

  const handleT = (next: number) => {
    setT(next);
    if (claimed) {
      setClaimed(false);
      setClaimResult("none");
    }
  };

  const handleS = (next: number) => {
    setS(next);
    if (claimed) {
      setClaimed(false);
      setClaimResult("none");
    }
  };

  const stateSummary = useMemo(() => {
    const matrixStr = `A = [[${M.a.toFixed(2)}, ${M.b.toFixed(2)}], [${M.c.toFixed(2)}, ${M.d.toFixed(2)}]]`;
    const detStr = `det(A) = ${detVal.toFixed(3)}`;
    const paramStr =
      puzzle.mode === "system" ? `s = ${s.toFixed(2)}, t = ${t.toFixed(2)}` : `t = ${t.toFixed(2)}`;
    const claim =
      claimResult === "ok"
        ? "Reader correctly claimed the singularity."
        : claimResult === "miss"
          ? "Reader claimed but missed the target."
          : claimResult === "impossible"
            ? "Reader claimed singularity for a puzzle that has no root."
            : `On-target: ${onTarget ? "yes" : "no"} (need |det| < ${HIT_TOL}).`;
    return `Singularity Watcher — puzzle "${puzzle.label}" (${puzzle.mode}). ${puzzle.description} Current ${paramStr}, ${matrixStr}, ${detStr}. ${claim} Score ${score.wins}/${score.attempts}.`;
  }, [
    puzzle,
    M,
    detVal,
    t,
    s,
    onTarget,
    claimResult,
    score,
  ]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        t: Math.round(t * 50) / 50,
        s: Math.round(s * 50) / 50,
        claimed,
      }),
    [puzzleIdx, t, s, claimed],
  );

  return (
    <div className={`sw${onTarget ? " sw--on-target" : ""}`}>
      <header className="sw__head">
        <div className="sw__heading">
          <span className="sw__heading-label">PUZZLE</span>
          <span className="sw__heading-value">{puzzle.label}</span>
        </div>
        <div className="sw__heading">
          <span className="sw__heading-label">SCORE</span>
          <span className="sw__heading-value">
            {score.wins} / {score.attempts}
            {score.attempts > 0 &&
              ` · ${Math.round((score.wins / score.attempts) * 100)}%`}
          </span>
        </div>
      </header>

      <div className="sw__layout">
        <div className="sw__matrix-panel">
          <span className="sw__panel-label">MATRIX A({puzzle.mode === "system" ? "s, t" : "t"})</span>
          <div className="sw__matrix">
            <div className="sw__matrix-bracket sw__matrix-bracket--left" />
            <div className="sw__matrix-grid">
              <span className="sw__cell sw__cell--template">{puzzle.template.a}</span>
              <span className="sw__cell sw__cell--template">{puzzle.template.b}</span>
              <span className="sw__cell sw__cell--template">{puzzle.template.c}</span>
              <span className="sw__cell sw__cell--template">{puzzle.template.d}</span>
            </div>
            <div className="sw__matrix-bracket sw__matrix-bracket--right" />
          </div>

          <span className="sw__panel-label">CURRENT VALUES</span>
          <div className="sw__matrix">
            <div className="sw__matrix-bracket sw__matrix-bracket--left" />
            <div className="sw__matrix-grid">
              <span className="sw__cell">{M.a.toFixed(2)}</span>
              <span className="sw__cell">{M.b.toFixed(2)}</span>
              <span className="sw__cell">{M.c.toFixed(2)}</span>
              <span className="sw__cell">{M.d.toFixed(2)}</span>
            </div>
            <div className="sw__matrix-bracket sw__matrix-bracket--right" />
          </div>

          <div className={`sw__det sw__det--${onTarget ? "ok" : "off"}`}>
            <span className="sw__det-label">det(A) =</span>
            <span className="sw__det-value">{detVal.toFixed(4)}</span>
          </div>

          {puzzle.mode === "system" && detExpr2 !== null && (
            <div className={`sw__det sw__det--${Math.abs(detExpr2) < HIT_TOL ? "ok" : "off"}`}>
              <span className="sw__det-label">trace − 2 =</span>
              <span className="sw__det-value">{detExpr2.toFixed(4)}</span>
            </div>
          )}
        </div>

        <div className="sw__plot-panel">
          <span className="sw__panel-label">
            det(A) AS A FUNCTION OF {puzzle.mode === "system" ? "t (with current s)" : "t"}
          </span>
          <DetPlot
            puzzle={puzzle}
            t={t}
            s={s}
            highlightOnTarget={onTarget}
          />
          <p className="sw__description">{puzzle.description}</p>
        </div>
      </div>

      <div className="sw__controls">
        <ParameterSlider
          label="t"
          value={t}
          min={puzzle.tRange[0]}
          max={puzzle.tRange[1]}
          onChange={handleT}
        />
        {puzzle.mode === "system" && puzzle.sRange && (
          <ParameterSlider
            label="s"
            value={s}
            min={puzzle.sRange[0]}
            max={puzzle.sRange[1]}
            onChange={handleS}
          />
        )}
      </div>

      <div className="sw__actions">
        <button
          type="button"
          className="sw__claim"
          onClick={handleClaim}
          disabled={claimed && claimResult === "ok"}
        >
          Claim singular!
        </button>
        <button
          type="button"
          className="sw__action sw__action--impossible"
          onClick={handleClaimImpossible}
          disabled={claimed && claimResult === "ok"}
        >
          No singular t exists
        </button>
        <button
          type="button"
          className="sw__action sw__action--primary"
          onClick={() => handleNewPuzzle((puzzleIdx + 1) % PUZZLES.length)}
        >
          Next puzzle
        </button>
      </div>

      <div
        className={`sw__verdict sw__verdict--${
          claimResult === "ok"
            ? "win"
            : claimResult === "miss"
              ? "miss"
              : claimResult === "impossible"
                ? "miss"
                : "idle"
        }`}
      >
        <span className="sw__verdict-label">Status</span>
        <span className="sw__verdict-value">
          {claimResult === "none" && (
            <>
              Adjust the slider(s) to make det(A) hit zero (within tolerance {HIT_TOL}).
              When the gauge turns green, hit <strong>"Claim singular!"</strong>.
              If you suspect the puzzle has no root at all, claim <strong>"No singular t exists"</strong> instead.
            </>
          )}
          {claimResult === "ok" && (
            <>
              ✓ Correct.
              {puzzle.roots.length === 0
                ? " This puzzle has no singular value — det(A) is constant or never reaches zero in range."
                : ` Roots: ${puzzle.roots.map((r) => r.label).join(" or ")}. Singularity is a root-finding problem.`}
            </>
          )}
          {claimResult === "miss" && (
            <>
              Not quite. |det| = {Math.abs(detVal).toFixed(3)} {Math.abs(detVal) < HIT_TOL ? " — within tolerance but other constraint not satisfied (system mode requires BOTH constraints)" : `— need < ${HIT_TOL}.`}
              {puzzle.roots.length > 0 && (
                <>
                  {" "}Target{puzzle.roots.length > 1 ? "s" : ""}: {puzzle.roots.map((r) => r.label).join(" or ")}.
                </>
              )}
            </>
          )}
          {claimResult === "impossible" && (
            <>
              You claimed no root exists — but a root DOES exist for this puzzle. Try again with the slider; det(A) does reach zero somewhere in the allowed range.
            </>
          )}
        </span>
      </div>

      <div className="sw__puzzle-row">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`sw__puzzle-pick${i === puzzleIdx ? " sw__puzzle-pick--active" : ""}`}
            onClick={() => handleNewPuzzle(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <WidgetExplainer
        widgetName="Singularity Watcher — find the parameter that makes det(A) = 0"
        widgetDescription="A find-the-singularity puzzle. The reader is given a 2×2 matrix A whose entries depend on a parameter t (and sometimes also s). They adjust the parameter(s) with sliders until det(A) hits zero within tolerance, then claim the singularity. Five puzzles cover three modes: LINEAR (one entry is t, det is linear/quadratic with one or two roots), QUADRATIC (t appears in multiple entries, det is quadratic with up to two roots in the slider range), and SYSTEM (two parameters s and t, with TWO simultaneous constraints — det = 0 AND a trace condition — that must both be satisfied; this foreshadows eigenvalue equations where eigenvalues are pinned by both det and trace). One puzzle has NO root for any t in range (the second quadratic, where det simplifies to a constant 1) — the reader must spot impossibility and click 'No singular t exists' instead. A small det-vs-t plot shows the current t marked with a crosshair and the determinant curve's actual roots; the reader can see geometrically where they're heading. Score is wins/attempts across puzzles. The pedagogical point: singularity is a CODIMENSION-1 condition — a single equation det = 0, which becomes a root-finding problem when the matrix is parameterised. This is the entry point to eigenvalue computation (eigenvalues are exactly the roots of det(A − λI) = 0)."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function ParameterSlider({
  label,
  value,
  min,
  max,
  onChange,
}: ParameterSliderProps) {
  return (
    <div className="sw__slider-row">
      <label className="sw__slider-label">{label} =</label>
      <span className="sw__slider-value">{value.toFixed(3)}</span>
      <input
        type="range"
        className="sw__slider"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="sw__slider-range">
        [{min}, {max}]
      </span>
    </div>
  );
}

interface DetPlotProps {
  puzzle: Puzzle;
  t: number;
  s: number;
  highlightOnTarget: boolean;
}

function DetPlot({ puzzle, t, s, highlightOnTarget }: DetPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sample det as a function of t at fixed s.
  const samples = useMemo(() => {
    const [lo, hi] = puzzle.tRange;
    const out: { t: number; d: number }[] = [];
    const N = 200;
    for (let i = 0; i <= N; i++) {
      const tt = lo + ((hi - lo) * i) / N;
      out.push({ t: tt, d: puzzle.detExpr(tt, s) });
    }
    return out;
  }, [puzzle, s]);

  const yBounds = useMemo(() => {
    let lo = 0;
    let hi = 0;
    for (const p of samples) {
      if (p.d < lo) lo = p.d;
      if (p.d > hi) hi = p.d;
    }
    if (Math.abs(hi - lo) < 0.5) {
      // Constant or near-constant.
      lo -= 0.5;
      hi += 0.5;
    }
    const pad = (hi - lo) * 0.18;
    return [lo - pad, hi + pad] as [number, number];
  }, [samples]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = PLOT_W;
    const H = PLOT_H;
    ctx.clearRect(0, 0, W, H);

    const [tLo, tHi] = puzzle.tRange;
    const [yLo, yHi] = yBounds;

    const tToPx = (tv: number) => ((tv - tLo) / (tHi - tLo)) * (W - 30) + 25;
    const yToPx = (yv: number) => H - 20 - ((yv - yLo) / (yHi - yLo)) * (H - 30);

    const C_AXIS = resolveColor("var(--widget-text-dim)");
    const C_GRID = "rgba(255, 255, 255, 0.06)";
    const C_CURVE = resolveColor("var(--widget-chart-1)");
    const C_ZERO = resolveColor("var(--widget-warn)");
    const C_DOT = highlightOnTarget
      ? resolveColor("var(--widget-success)")
      : resolveColor("var(--widget-accent)");
    const C_ROOT = resolveColor("var(--widget-success)");
    const C_TEXT = resolveColor("var(--widget-text)");

    // Faint grid.
    ctx.strokeStyle = C_GRID;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const px = tToPx(tLo + ((tHi - tLo) * i) / 4);
      ctx.beginPath();
      ctx.moveTo(px, 5);
      ctx.lineTo(px, H - 20);
      ctx.stroke();
    }

    // Zero line.
    const zeroPx = yToPx(0);
    ctx.strokeStyle = C_ZERO;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(25, zeroPx);
    ctx.lineTo(W - 5, zeroPx);
    ctx.stroke();
    ctx.setLineDash([]);

    // X-axis ticks.
    ctx.strokeStyle = C_AXIS;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25, H - 20);
    ctx.lineTo(W - 5, H - 20);
    ctx.stroke();

    ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = C_AXIS;
    ctx.textBaseline = "top";
    for (let i = 0; i <= 4; i++) {
      const tv = tLo + ((tHi - tLo) * i) / 4;
      const px = tToPx(tv);
      ctx.fillText(tv.toFixed(1), px - 8, H - 17);
    }

    // Y-axis labels.
    ctx.textBaseline = "middle";
    ctx.fillText("0", 5, zeroPx);

    // Curve.
    ctx.strokeStyle = C_CURVE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    samples.forEach((p, i) => {
      const px = tToPx(p.t);
      const py = yToPx(p.d);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Mark known roots.
    ctx.fillStyle = C_ROOT;
    for (const r of puzzle.roots) {
      if (r.t < tLo || r.t > tHi) continue;
      const px = tToPx(r.t);
      const py = yToPx(0);
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C_TEXT;
      ctx.font = "9px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillText(r.label, px - 12, py - 14);
      ctx.fillStyle = C_ROOT;
    }

    // Current t marker.
    const curPx = tToPx(t);
    const curPy = yToPx(puzzle.detExpr(t, s));
    ctx.strokeStyle = C_DOT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(curPx, 5);
    ctx.lineTo(curPx, H - 20);
    ctx.stroke();
    ctx.fillStyle = resolveColorAlpha(
      highlightOnTarget ? "var(--widget-success)" : "var(--widget-accent)",
      0.9,
    );
    ctx.beginPath();
    ctx.arc(curPx, curPy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Title axis label.
    ctx.fillStyle = C_TEXT;
    ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillText("det(A)", 5, 6);
  }, [puzzle, samples, yBounds, t, s, highlightOnTarget]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={PLOT_W}
      height={PLOT_H}
      className="sw__plot"
      role="img"
      aria-label="Determinant vs parameter plot."
    />
  );
}
