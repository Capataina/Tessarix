/**
 * GaussianElimination — step-through row reduction of an augmented matrix.
 *
 * Used by:
 *   - linear-algebra-matrix-inverse (this lesson)
 * Cross-link candidates:
 *   - eventual linear-systems-and-solutions lesson
 *   - rank / null-space lesson (RREF is the canonical tool for rank)
 *
 * Implements metaphor library §1 (iterated operation, the elimination IS
 * the iteration) and §7 (composition timeline, the history strip records
 * the move sequence). The widget exists to make row reduction *tangible*
 * — the reader picks moves, watches entries change, undoes mistakes, and
 * learns by manipulation what no prose explanation can deliver.
 *
 * Three operation types are exposed, matching the three elementary row
 * operations:
 *   • swap rows i ↔ j
 *   • scale row i by a non-zero scalar k
 *   • add k·rowⱼ to rowᵢ  (the workhorse of elimination)
 *
 * The widget reports the current state of the matrix, whether it has
 * reached row-echelon form (zeros below the diagonal) or RREF (leading
 * 1s with zeros above and below each pivot), and classifies the system
 * as having a unique solution, free variable(s), or being inconsistent.
 */

import { useEffect, useMemo, useState } from "react";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./GaussianElimination.css";

const ROWS = 3;
const COLS = 4; // 3 unknowns + 1 RHS

type Matrix = number[][];

interface HistoryStep {
  description: string;
}

interface Preset {
  label: string;
  matrix: Matrix;
  description: string;
}

const PRESETS: Preset[] = [
  {
    label: "Unique solution",
    description:
      "A standard 3×3 system with one solution. Target: RREF should give the identity in the left block, with the solution in the rightmost column.",
    matrix: [
      [2, 1, -1, 8],
      [-3, -1, 2, -11],
      [-2, 1, 2, -3],
    ],
  },
  {
    label: "Free variable",
    description:
      "An under-determined system — one row is a linear combination of the others. Row-reduction will leave a row of zeros and expose a free variable.",
    matrix: [
      [1, 2, 3, 6],
      [2, 4, 6, 12],
      [1, 1, 1, 3],
    ],
  },
  {
    label: "Inconsistent",
    description:
      "An impossible system — elimination produces a row [0 0 0 | non-zero], i.e. 0 = c for some non-zero c.",
    matrix: [
      [1, 2, 3, 1],
      [2, 4, 6, 5],
      [1, 1, 1, 2],
    ],
  },
];

function cloneMatrix(M: Matrix): Matrix {
  return M.map((row) => [...row]);
}

function isCloseToZero(x: number): boolean {
  return Math.abs(x) < 1e-9;
}

function isRowEchelon(M: Matrix): boolean {
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
    lastPivotCol = pivotCol;
  }
  return true;
}

function isReducedRowEchelon(M: Matrix): boolean {
  if (!isRowEchelon(M)) return false;
  for (let i = 0; i < ROWS; i++) {
    const pivotCol = M[i]
      .slice(0, COLS - 1)
      .findIndex((x) => !isCloseToZero(x));
    if (pivotCol === -1) continue;
    if (Math.abs(M[i][pivotCol] - 1) > 1e-6) return false;
    for (let r = 0; r < ROWS; r++) {
      if (r === i) continue;
      if (!isCloseToZero(M[r][pivotCol])) return false;
    }
  }
  return true;
}

function classifySolution(M: Matrix): string {
  for (let i = 0; i < ROWS; i++) {
    const left = M[i].slice(0, COLS - 1);
    if (
      left.every((x) => isCloseToZero(x)) &&
      !isCloseToZero(M[i][COLS - 1])
    ) {
      return "Inconsistent: a row reads 0 = non-zero. No solution exists.";
    }
  }
  let pivots = 0;
  for (let i = 0; i < ROWS; i++) {
    if (M[i].slice(0, COLS - 1).some((x) => !isCloseToZero(x))) pivots++;
  }
  if (pivots < COLS - 1) {
    return `Under-determined: ${COLS - 1 - pivots} free variable(s). Infinitely many solutions.`;
  }
  if (isReducedRowEchelon(M)) {
    const xs = M.map((row) => row[COLS - 1]);
    return `Unique solution: x = ${xs[0].toFixed(2)}, y = ${xs[1].toFixed(2)}, z = ${xs[2].toFixed(2)}.`;
  }
  return "Unique-solution system — keep reducing to read it off.";
}

function formatNumber(x: number): string {
  if (isCloseToZero(x)) return "0";
  if (Math.abs(x - Math.round(x)) < 1e-9) return Math.round(x).toString();
  return x.toFixed(2);
}

interface GaussianEliminationProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function GaussianElimination({
  onStateChange,
}: GaussianEliminationProps) {
  const [preset, setPreset] = useState(0);
  const [snapshots, setSnapshots] = useState<Matrix[]>([
    cloneMatrix(PRESETS[0].matrix),
  ]);
  const [history, setHistory] = useState<HistoryStep[]>([]);

  const [opType, setOpType] = useState<"swap" | "scale" | "add">("add");
  const [rowI, setRowI] = useState(0);
  const [rowJ, setRowJ] = useState(1);
  const [scalar, setScalar] = useState(1);

  const M = snapshots[snapshots.length - 1];
  const echelon = isRowEchelon(M);
  const rref = isReducedRowEchelon(M);
  const verdict = classifySolution(M);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      step_count: history.length,
      echelon: echelon ? 1 : 0,
      rref: rref ? 1 : 0,
      preset,
    });
  }, [history.length, echelon, rref, preset, onStateChange]);

  const stateSummary = useMemo(() => {
    const rows = M.map((r) => `[${r.map(formatNumber).join(", ")}]`).join("; ");
    return `Augmented matrix (preset "${PRESETS[preset].label}"): ${rows}. ${history.length} row operations applied. Row-echelon form: ${echelon ? "yes" : "no"}; RREF: ${rref ? "yes" : "no"}. ${verdict}`;
  }, [M, preset, history.length, echelon, rref, verdict]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        preset,
        steps: history.length,
        echelon,
        rref,
      }),
    [preset, history.length, echelon, rref],
  );

  const applyOp = () => {
    const next = cloneMatrix(M);
    let desc = "";
    if (opType === "swap") {
      if (rowI === rowJ) return;
      [next[rowI], next[rowJ]] = [next[rowJ], next[rowI]];
      desc = `R${rowI + 1} ↔ R${rowJ + 1}`;
    } else if (opType === "scale") {
      if (isCloseToZero(scalar)) return;
      for (let c = 0; c < COLS; c++) next[rowI][c] *= scalar;
      desc = `R${rowI + 1} → ${formatNumber(scalar)}·R${rowI + 1}`;
    } else {
      if (rowI === rowJ) return;
      if (isCloseToZero(scalar)) return;
      for (let c = 0; c < COLS; c++)
        next[rowI][c] += scalar * next[rowJ][c];
      desc = `R${rowI + 1} → R${rowI + 1} + (${formatNumber(scalar)})·R${rowJ + 1}`;
    }
    setSnapshots([...snapshots, next]);
    setHistory([...history, { description: desc }]);
  };

  const undo = () => {
    if (snapshots.length <= 1) return;
    setSnapshots(snapshots.slice(0, -1));
    setHistory(history.slice(0, -1));
  };

  const reset = (idx: number = preset) => {
    setPreset(idx);
    const fresh = cloneMatrix(PRESETS[idx].matrix);
    setSnapshots([fresh]);
    setHistory([]);
  };

  return (
    <div className="gauss">
      <div className="gauss__presets">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`gauss__preset${i === preset ? " gauss__preset--active" : ""}`}
            onClick={() => reset(i)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="gauss__preset-desc">{PRESETS[preset].description}</div>

      <div className="gauss__matrix">
        <div className="gauss__bracket gauss__bracket--left" />
        <div className="gauss__grid">
          {M.map((row, i) => (
            <div key={i} className="gauss__row">
              <span className="gauss__row-label">R{i + 1}</span>
              {row.map((val, c) => (
                <span
                  key={c}
                  className={`gauss__cell${c === COLS - 1 ? " gauss__cell--rhs" : ""}${isCloseToZero(val) ? " gauss__cell--zero" : ""}`}
                >
                  {formatNumber(val)}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="gauss__bracket gauss__bracket--right" />
      </div>

      <div className="gauss__op">
        <div className="gauss__op-row">
          <span className="gauss__op-label">Operation</span>
          <select
            className="gauss__select"
            value={opType}
            onChange={(e) =>
              setOpType(e.target.value as "swap" | "scale" | "add")
            }
          >
            <option value="add">Add k · Rj to Ri</option>
            <option value="scale">Scale Ri by k</option>
            <option value="swap">Swap Ri ↔ Rj</option>
          </select>
        </div>
        <div className="gauss__op-row">
          <span className="gauss__op-label">Ri</span>
          <select
            className="gauss__select"
            value={rowI}
            onChange={(e) => setRowI(Number(e.target.value))}
          >
            {[0, 1, 2].map((i) => (
              <option key={i} value={i}>{`R${i + 1}`}</option>
            ))}
          </select>
          {opType !== "scale" && (
            <>
              <span className="gauss__op-label">Rj</span>
              <select
                className="gauss__select"
                value={rowJ}
                onChange={(e) => setRowJ(Number(e.target.value))}
              >
                {[0, 1, 2].map((i) => (
                  <option key={i} value={i}>{`R${i + 1}`}</option>
                ))}
              </select>
            </>
          )}
          {opType !== "swap" && (
            <>
              <span className="gauss__op-label">k</span>
              <input
                type="number"
                step="0.1"
                value={scalar}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setScalar(v);
                }}
                className="gauss__input"
              />
            </>
          )}
        </div>
        <div className="gauss__op-buttons">
          <button
            type="button"
            className="gauss__apply"
            onClick={applyOp}
            disabled={opType !== "scale" && rowI === rowJ}
          >
            Apply
          </button>
          <button
            type="button"
            className="gauss__undo"
            onClick={undo}
            disabled={snapshots.length <= 1}
          >
            Undo
          </button>
          <button
            type="button"
            className="gauss__reset"
            onClick={() => reset()}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="gauss__history">
        <div className="gauss__history-label">History ({history.length})</div>
        {history.length === 0 ? (
          <span className="gauss__history-empty">
            No operations applied yet. Pick an operation above and click Apply.
          </span>
        ) : (
          <ol className="gauss__history-list">
            {history.map((step, i) => (
              <li key={i} className="gauss__history-step">
                {step.description}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div
        className={`gauss__verdict gauss__verdict--${
          rref ? "rref" : echelon ? "echelon" : "working"
        }`}
      >
        <span className="gauss__verdict-label">Status</span>
        <span className="gauss__verdict-value">
          {rref
            ? "✓ Reduced row-echelon form (RREF). "
            : echelon
              ? "Row-echelon form reached. Continue to get RREF. "
              : "Working towards row-echelon form. "}
          {verdict}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Gaussian elimination — step-through row reduction"
        widgetDescription="An interactive 3x3 augmented matrix with three elementary row operations the reader can apply: swap two rows, scale a row by a non-zero scalar, or add a scalar multiple of one row to another. Each application updates the matrix and appends to a history of moves. The widget detects when the matrix has reached row-echelon form (pivots strictly right-ward) or reduced row-echelon form (RREF — leading 1s with zeros above and below each pivot) and reports the solution: unique, under-determined with free variables, or inconsistent. Three presets cover the canonical cases: a system with one solution, a system with a free variable (under-determined), and an inconsistent system (0 = non-zero)."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}
