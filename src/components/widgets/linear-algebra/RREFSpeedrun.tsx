/**
 * RREFSpeedrun — timed row-reduction game.
 *
 * Used by:
 *   - linear-algebra-matrix-inverse
 *
 * THIS IS A SPEEDRUN. A random 3×3 augmented matrix appears. The
 * reader has 60 seconds (configurable) to row-reduce it all the way
 * to reduced row-echelon form (RREF). The clock starts on the first
 * row operation. Score is computed from time used and operations
 * applied; fewer ops + less time = higher score.
 *
 * The widget exposes the same three elementary row operations the
 * GaussianElimination widget does (swap, scale, add-multiple), but
 * cuts the UI down to minimum chrome so the reader can move fast.
 * A "RREF detected" auto-stops the clock; reaching RREF before the
 * timer runs out is the win condition.
 *
 * Pedagogy: row-reduction is mechanical, but the *strategy* is not.
 * Which pivot to clear first? When to swap rows to avoid fractions?
 * When to scale before adding? The unconstrained GaussianElimination
 * widget rewards exploration; this one rewards efficiency. Re-running
 * the same matrix multiple times with the same time budget surfaces
 * the better strategies — and the reader's personal-best score
 * across runs is the feedback loop.
 *
 * Three matrices of increasing difficulty:
 *   - Easy:   diagonal-dominant, integer pivots, no swaps needed.
 *   - Medium: requires at least one swap, fractions tolerable.
 *   - Hard:   negative pivots, multiple swaps optimal, requires
 *             planning the sequence to avoid pivot proliferation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./RREFSpeedrun.css";

const ROWS = 3;
const COLS = 4;
const DEFAULT_TIME_LIMIT = 60;

type Matrix = number[][];

interface Preset {
  label: string;
  difficulty: "easy" | "medium" | "hard";
  matrix: Matrix;
  hint: string;
}

const PRESETS: Preset[] = [
  {
    label: "Easy: diagonal-dominant",
    difficulty: "easy",
    matrix: [
      [2, 0, 0, 4],
      [0, 3, 0, 6],
      [0, 0, 5, 10],
    ],
    hint: "Already in echelon form — just scale each pivot to 1.",
  },
  {
    label: "Medium: classic 3×3",
    difficulty: "medium",
    matrix: [
      [1, 1, 1, 6],
      [2, 1, 3, 14],
      [1, 3, 2, 13],
    ],
    hint: "Clear column 1 with R1, then column 2 with the new R2.",
  },
  {
    label: "Medium: swap required",
    difficulty: "medium",
    matrix: [
      [0, 1, 2, 3],
      [1, 2, 1, 4],
      [2, 1, 1, 3],
    ],
    hint: "R1 has a zero pivot — swap R1 ↔ R2 before doing anything else.",
  },
  {
    label: "Hard: negative pivots",
    difficulty: "hard",
    matrix: [
      [2, -1, 1, 3],
      [1, 2, -1, 4],
      [-1, 1, 2, 1],
    ],
    hint: "Scaling factors will involve fractions. Plan two add-multiples per pivot column.",
  },
];

function cloneMatrix(M: Matrix): Matrix {
  return M.map((row) => [...row]);
}

function isCloseToZero(x: number): boolean {
  return Math.abs(x) < 1e-9;
}

function isReducedRowEchelon(M: Matrix): boolean {
  let lastPivotCol = -1;
  let sawEmpty = false;
  for (let i = 0; i < ROWS; i++) {
    const pivotCol = M[i]
      .slice(0, COLS - 1)
      .findIndex((x) => !isCloseToZero(x));
    if (pivotCol === -1) {
      sawEmpty = true;
      continue;
    }
    if (sawEmpty) return false;
    if (pivotCol <= lastPivotCol) return false;
    if (Math.abs(M[i][pivotCol] - 1) > 1e-6) return false;
    for (let r = 0; r < ROWS; r++) {
      if (r === i) continue;
      if (!isCloseToZero(M[r][pivotCol])) return false;
    }
    lastPivotCol = pivotCol;
  }
  return true;
}

function formatNumber(x: number): string {
  if (isCloseToZero(x)) return "0";
  if (Math.abs(x - Math.round(x)) < 1e-9) return Math.round(x).toString();
  return x.toFixed(2);
}

interface RREFSpeedrunProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function RREFSpeedrun({ onStateChange }: RREFSpeedrunProps) {
  const { recordInteraction } = useWidgetTelemetry("RREFSpeedrun");
  const [presetIdx, setPresetIdx] = useState(0);
  const [M, setM] = useState<Matrix>(() => cloneMatrix(PRESETS[0].matrix));
  const [ops, setOps] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [outcome, setOutcome] = useState<"none" | "won" | "timeout">("none");
  const [best, setBest] = useState<Record<number, number>>({});

  const [opType, setOpType] = useState<"swap" | "scale" | "add">("add");
  const [rowI, setRowI] = useState(0);
  const [rowJ, setRowJ] = useState(1);
  const [scalar, setScalar] = useState(1);

  const timeoutRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const preset = PRESETS[presetIdx];
  const rrefAchieved = isReducedRowEchelon(M);

  // Score: 1000 - (elapsed seconds * 10) - (ops * 20), clamped >= 0.
  const score = Math.max(
    0,
    Math.round(1000 - elapsed * 10 - ops * 20),
  );

  // Tick the clock.
  useEffect(() => {
    if (!running) {
      if (timeoutRef.current !== null) {
        window.clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    timeoutRef.current = window.setInterval(() => {
      const since = startedAtRef.current
        ? (performance.now() - startedAtRef.current) / 1000
        : 0;
      setElapsed(since);
      if (since >= DEFAULT_TIME_LIMIT) {
        setRunning(false);
        setFinished(true);
        setOutcome("timeout");
      }
    }, 100);
    return () => {
      if (timeoutRef.current !== null) {
        window.clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [running]);

  // Detect win.
  useEffect(() => {
    if (rrefAchieved && running) {
      setRunning(false);
      setFinished(true);
      setOutcome("won");
      const finalScore = Math.max(0, Math.round(1000 - elapsed * 10 - ops * 20));
      setBest((prev) => {
        const prior = prev[presetIdx];
        if (prior !== undefined && prior >= finalScore) return prev;
        return { ...prev, [presetIdx]: finalScore };
      });
    }
  }, [rrefAchieved, running, elapsed, ops, presetIdx]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      preset: presetIdx,
      ops,
      elapsed: Number(elapsed.toFixed(2)),
      score,
      finished: finished ? 1 : 0,
      won: outcome === "won" ? 1 : 0,
    });
  }, [presetIdx, ops, elapsed, score, finished, outcome, onStateChange]);

  const ensureRunning = () => {
    if (!running && !finished) {
      setRunning(true);
      startedAtRef.current = performance.now();
    }
  };

  const handleSwap = useCallback(() => {
    if (finished) return;
    if (rowI === rowJ) return;
    ensureRunning();
    setM((prev) => {
      const next = cloneMatrix(prev);
      const tmp = next[rowI];
      next[rowI] = next[rowJ];
      next[rowJ] = tmp;
      return next;
    });
    setOps((o) => o + 1);
    recordInteraction("swap", { row_i: rowI, row_j: rowJ });
  }, [finished, rowI, rowJ, recordInteraction]);

  const handleScale = useCallback(() => {
    if (finished) return;
    if (Math.abs(scalar) < 1e-9) return;
    ensureRunning();
    setM((prev) => {
      const next = cloneMatrix(prev);
      next[rowI] = next[rowI].map((x) => x * scalar);
      return next;
    });
    setOps((o) => o + 1);
    recordInteraction("scale", { row_i: rowI, scalar });
  }, [finished, rowI, scalar, recordInteraction]);

  const handleAdd = useCallback(() => {
    if (finished) return;
    if (rowI === rowJ) return;
    ensureRunning();
    setM((prev) => {
      const next = cloneMatrix(prev);
      next[rowI] = next[rowI].map((x, c) => x + scalar * next[rowJ][c]);
      return next;
    });
    setOps((o) => o + 1);
    recordInteraction("add", { row_i: rowI, row_j: rowJ, scalar });
  }, [finished, rowI, rowJ, scalar, recordInteraction]);

  const handleApply = () => {
    if (opType === "swap") handleSwap();
    else if (opType === "scale") handleScale();
    else handleAdd();
  };

  const handleReset = useCallback(() => {
    setM(cloneMatrix(PRESETS[presetIdx].matrix));
    setOps(0);
    setElapsed(0);
    setRunning(false);
    setFinished(false);
    setOutcome("none");
    startedAtRef.current = null;
    recordInteraction("reset");
  }, [presetIdx, recordInteraction]);

  const handlePreset = useCallback(
    (idx: number) => {
      setPresetIdx(idx);
      setM(cloneMatrix(PRESETS[idx].matrix));
      setOps(0);
      setElapsed(0);
      setRunning(false);
      setFinished(false);
      setOutcome("none");
      startedAtRef.current = null;
      recordInteraction("preset", { preset: PRESETS[idx].label });
    },
    [recordInteraction],
  );

  const stateSummary = useMemo(() => {
    const rows = M.map(
      (r) => `[${r.map(formatNumber).join(", ")}]`,
    ).join("; ");
    const status = finished
      ? outcome === "won"
        ? `WON in ${ops} ops, ${elapsed.toFixed(1)}s. Score ${score}. Best ${best[presetIdx] ?? score}.`
        : `TIMED OUT at ${ops} ops, RREF not reached.`
      : running
        ? `RUN ACTIVE: ${ops} ops, ${elapsed.toFixed(1)}s elapsed.`
        : "READY (clock starts on first operation).";
    return `RREF Speedrun — preset "${preset.label}" (${preset.difficulty}). Current matrix: ${rows}. ${status}`;
  }, [M, finished, outcome, ops, elapsed, score, best, presetIdx, running, preset]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        preset: presetIdx,
        ops,
        finished,
        outcome,
      }),
    [presetIdx, ops, finished, outcome],
  );

  return (
    <div
      className={`rr${outcome === "won" ? " rr--won" : ""}${outcome === "timeout" ? " rr--timeout" : ""}`}
    >
      <header className="rr__head">
        <div className="rr__heading">
          <span className="rr__heading-label">TIME</span>
          <span
            className={`rr__heading-value rr__heading-value--large${
              elapsed > DEFAULT_TIME_LIMIT * 0.8 && !finished
                ? " rr__heading-value--warn"
                : ""
            }`}
          >
            {Math.max(0, DEFAULT_TIME_LIMIT - elapsed).toFixed(1)}s
          </span>
        </div>
        <div className="rr__heading">
          <span className="rr__heading-label">OPS</span>
          <span className="rr__heading-value rr__heading-value--large">{ops}</span>
        </div>
        <div className="rr__heading">
          <span className="rr__heading-label">SCORE</span>
          <span className="rr__heading-value rr__heading-value--large">
            {score}
          </span>
        </div>
        <div className="rr__heading">
          <span className="rr__heading-label">BEST</span>
          <span className="rr__heading-value">{best[presetIdx] ?? "—"}</span>
        </div>
      </header>

      <div className="rr__matrix">
        <div className="rr__matrix-bracket rr__matrix-bracket--left" />
        <div className="rr__matrix-grid">
          {M.map((row, i) =>
            row.map((x, j) => (
              <span
                key={`${i}-${j}`}
                className={`rr__cell${j === COLS - 2 ? " rr__cell--last-coef" : ""}${j === COLS - 1 ? " rr__cell--rhs" : ""}`}
              >
                {formatNumber(x)}
              </span>
            )),
          )}
        </div>
        <div className="rr__matrix-bracket rr__matrix-bracket--right" />
      </div>

      <div className="rr__ops">
        <div className="rr__op-tabs">
          {(["swap", "scale", "add"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`rr__op-tab${t === opType ? " rr__op-tab--active" : ""}`}
              onClick={() => setOpType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="rr__op-controls">
          <label className="rr__op-label">i:</label>
          <select
            value={rowI}
            onChange={(e) => setRowI(Number(e.target.value))}
            className="rr__op-select"
          >
            <option value={0}>R1</option>
            <option value={1}>R2</option>
            <option value={2}>R3</option>
          </select>

          {(opType === "swap" || opType === "add") && (
            <>
              <label className="rr__op-label">{opType === "swap" ? "j:" : "j (source):"}</label>
              <select
                value={rowJ}
                onChange={(e) => setRowJ(Number(e.target.value))}
                className="rr__op-select"
              >
                <option value={0}>R1</option>
                <option value={1}>R2</option>
                <option value={2}>R3</option>
              </select>
            </>
          )}

          {(opType === "scale" || opType === "add") && (
            <>
              <label className="rr__op-label">k:</label>
              <input
                type="number"
                step={0.5}
                value={scalar}
                onChange={(e) => setScalar(Number(e.target.value) || 0)}
                className="rr__op-input"
              />
            </>
          )}

          <button
            type="button"
            className="rr__apply"
            onClick={handleApply}
            disabled={finished || (opType !== "scale" && rowI === rowJ)}
          >
            Apply
          </button>
        </div>

        <div className="rr__op-formula">
          {opType === "swap" && `R${rowI + 1} ↔ R${rowJ + 1}`}
          {opType === "scale" && `R${rowI + 1} ← (${formatNumber(scalar)})·R${rowI + 1}`}
          {opType === "add" &&
            `R${rowI + 1} ← R${rowI + 1} + (${formatNumber(scalar)})·R${rowJ + 1}`}
        </div>
      </div>

      <div className="rr__actions">
        <button
          type="button"
          className="rr__action rr__action--reset"
          onClick={handleReset}
        >
          Reset run
        </button>
        <span className="rr__hint">Hint: {preset.hint}</span>
      </div>

      <div
        className={`rr__verdict rr__verdict--${
          outcome === "won" ? "won" : outcome === "timeout" ? "timeout" : "idle"
        }`}
      >
        <span className="rr__verdict-label">Status</span>
        <span className="rr__verdict-value">
          {outcome === "none" && !running && (
            <>Clock starts on your first operation. Reduce the matrix to RREF before the timer runs out — score is <strong>1000 − 10·seconds − 20·ops</strong>.</>
          )}
          {outcome === "none" && running && (
            <>Run active. Keep reducing — the clock auto-stops the moment the matrix reaches RREF.</>
          )}
          {outcome === "won" && (
            <>✓ Solved in {ops} ops and {elapsed.toFixed(1)}s. Score {score}.{best[presetIdx] !== undefined && best[presetIdx] === score && " New personal best!"}</>
          )}
          {outcome === "timeout" && (
            <>Timed out at {ops} ops. The matrix wasn't in RREF when the clock hit zero — try again with a sharper plan.</>
          )}
        </span>
      </div>

      <div className="rr__preset-row">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`rr__preset-pick${i === presetIdx ? " rr__preset-pick--active" : ""}`}
            onClick={() => handlePreset(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <WidgetExplainer
        widgetName="RREF Speedrun — timed row-reduction game"
        widgetDescription="A timed game over a 3×3 augmented matrix. The reader has 60 seconds to row-reduce the matrix to reduced row-echelon form (RREF) using the three elementary row operations (swap, scale, add multiple). The clock starts on the first applied operation, not on widget mount, so reading time is free. Score is computed as 1000 − 10·seconds − 20·operations, clamped to 0; the formula rewards both fewer operations and less wall-clock time. The matrix view shows the augmented form with the RHS visually separated from the coefficient block. Personal-best score per preset is tracked across runs. Four presets of increasing difficulty: an already-echelon diagonal that only needs scaling; a classic 3×3 needing two pivot-clear passes; a swap-required matrix where R1's pivot is zero; and a hard preset with negative pivots that forces fractional scalars. Hints surface the optimal first move for each preset. The pedagogical point: row reduction is mechanical, but the STRATEGY isn't — which pivot to clear first, when to swap to avoid fractions, how to plan the operation sequence to minimise steps. Re-running the same matrix with a time budget surfaces the better strategies; the personal-best counter rewards optimisation."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}
