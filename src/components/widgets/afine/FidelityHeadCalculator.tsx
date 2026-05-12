import { useCallback, useEffect, useMemo, useState } from "react";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./FidelityHeadCalculator.css";

const DIM = 8;
const C1 = 1e-10;
const C2 = 1e-10;

const REF_VECTOR: number[] = [0.4, -0.2, 0.6, 0.1, -0.3, 0.5, 0.2, -0.4];

function stats(a: number[], b: number[]) {
  const n = a.length;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const muA = sumA / n;
  const muB = sumB / n;
  let vA = 0;
  let vB = 0;
  let cov = 0;
  for (let i = 0; i < n; i++) {
    const dA = a[i] - muA;
    const dB = b[i] - muB;
    vA += dA * dA;
    vB += dB * dB;
    cov += dA * dB;
  }
  vA /= n;
  vB /= n;
  cov /= n;
  return { muA, muB, vA, vB, cov };
}

interface FidelityHeadCalculatorProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function FidelityHeadCalculator({
  onStateChange,
}: FidelityHeadCalculatorProps = {}) {
  const [fD, setFD] = useState<number[]>([...REF_VECTOR]);

  const fR = REF_VECTOR;

  const s = useMemo(() => stats(fD, fR), [fD]);

  const numFactor1 = 2 * s.muA * s.muB + C1;
  const numFactor2 = 2 * s.cov + C2;
  const denFactor1 = s.muA * s.muA + s.muB * s.muB + C1;
  const denFactor2 = s.vA + s.vB + C2;
  const ratio = (numFactor1 * numFactor2) / (denFactor1 * denFactor2);

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        mu_d: s.muA,
        mu_r: s.muB,
        var_d: s.vA,
        var_r: s.vB,
        cov: s.cov,
        ratio,
      });
    }
  }, [s, ratio, onStateChange]);

  const handleDim = (i: number) => (v: number) => {
    setFD((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const handlePreset = useCallback((preset: "match" | "anti" | "zero" | "random") => {
    if (preset === "match") setFD([...fR]);
    else if (preset === "anti") setFD(fR.map((v) => -v));
    else if (preset === "zero") setFD(Array(DIM).fill(0));
    else if (preset === "random") {
      setFD(Array.from({ length: DIM }, () => Math.random() * 1.6 - 0.8));
    }
  }, []);

  return (
    <div className="fhc">
      <div className="fhc__vectors">
        <div className="fhc__vector fhc__vector--ref">
          <div className="fhc__vector-head">
            <span className="fhc__vector-label">f_r (reference, fixed)</span>
            <span className="fhc__vector-stats">
              μ = {s.muB.toFixed(3)} &nbsp; σ² = {s.vB.toFixed(3)}
            </span>
          </div>
          <BarGrid values={fR} editable={false} />
        </div>

        <div className="fhc__vector fhc__vector--dist">
          <div className="fhc__vector-head">
            <span className="fhc__vector-label">f_d (distorted, drag bars)</span>
            <span className="fhc__vector-stats">
              μ = {s.muA.toFixed(3)} &nbsp; σ² = {s.vA.toFixed(3)}
            </span>
          </div>
          <BarGrid values={fD} editable onChange={handleDim} />
        </div>
      </div>

      <div className="fhc__presets">
        <button
          type="button"
          className="fhc__preset"
          onClick={() => handlePreset("match")}
        >
          Match f_r
        </button>
        <button
          type="button"
          className="fhc__preset"
          onClick={() => handlePreset("anti")}
        >
          Anticorrelate
        </button>
        <button
          type="button"
          className="fhc__preset"
          onClick={() => handlePreset("zero")}
        >
          Zero
        </button>
        <button
          type="button"
          className="fhc__preset"
          onClick={() => handlePreset("random")}
        >
          Randomise
        </button>
      </div>

      <div className="fhc__formula">
        <div className="fhc__cov-row">
          <span>Covariance σ_dr</span>
          <span className="fhc__cov-value">{s.cov.toFixed(4)}</span>
        </div>
        <div className="fhc__assembly">
          <div className="fhc__assembly-line">
            <span className="fhc__assembly-label">
              Numerator factor 1: (2μ_d · μ_r + c₁)
            </span>
            <span className="fhc__assembly-value">{numFactor1.toExponential(2)}</span>
          </div>
          <div className="fhc__assembly-line">
            <span className="fhc__assembly-label">
              Numerator factor 2: (2σ_dr + c₂)
            </span>
            <span className="fhc__assembly-value">{numFactor2.toExponential(2)}</span>
          </div>
          <div className="fhc__assembly-line">
            <span className="fhc__assembly-label">
              Denominator factor 1: (μ_d² + μ_r² + c₁)
            </span>
            <span className="fhc__assembly-value">{denFactor1.toExponential(2)}</span>
          </div>
          <div className="fhc__assembly-line">
            <span className="fhc__assembly-label">
              Denominator factor 2: (σ_d² + σ_r² + c₂)
            </span>
            <span className="fhc__assembly-value">{denFactor2.toExponential(2)}</span>
          </div>
          <div className="fhc__assembly-line fhc__assembly-line--total">
            <span className="fhc__assembly-label">
              Fidelity ratio = (num1 × num2) / (den1 × den2)
            </span>
            <span className="fhc__assembly-value">{ratio.toFixed(4)}</span>
          </div>
        </div>
      </div>

      <WidgetExplainer
        widgetName="Fidelity head — 8-dim SSIM-in-feature-space calculator"
        widgetDescription="An 8-dimensional simplification of A-FINE's fidelity head. The reference vector f_r is fixed; the reader drags each of the 8 components of f_d to manipulate the distorted vector. Live readouts show μ_d, μ_r, σ_d², σ_r², σ_dr, the four bracket terms of the SSIM formula, and the assembled ratio."
        stateSummary={`f_d = [${fD.map((v) => v.toFixed(2)).join(", ")}]. Statistics: μ_d = ${s.muA.toFixed(3)}, μ_r = ${s.muB.toFixed(3)}, σ_d² = ${s.vA.toFixed(3)}, σ_r² = ${s.vB.toFixed(3)}, σ_dr = ${s.cov.toFixed(4)}. Fidelity ratio = ${ratio.toFixed(4)}.`}
        stateKey={JSON.stringify(fD.map((v) => Number(v.toFixed(2))))}
      />
    </div>
  );
}

interface BarGridProps {
  values: number[];
  editable: boolean;
  onChange?: (i: number) => (v: number) => void;
}

function BarGrid({ values, editable, onChange }: BarGridProps) {
  return (
    <div className="fhc__grid">
      {values.map((v, i) => (
        <BarCell
          key={i}
          index={i}
          value={v}
          editable={editable}
          onChange={onChange?.(i)}
        />
      ))}
    </div>
  );
}

interface BarCellProps {
  index: number;
  value: number;
  editable: boolean;
  onChange?: (v: number) => void;
}

function BarCell({ index, value, editable, onChange }: BarCellProps) {
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  // Bar runs from -1 to 1; visual midline at 50%.
  const heightPct = Math.abs(value) * 50;
  const isNeg = value < 0;

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const py = (e.clientY - rect.top) / rect.height;
    const newVal = clamp(1 - py * 2);
    onChange(Number(newVal.toFixed(2)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointer(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    handlePointer(e);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      className={`fhc__cell ${editable ? "fhc__cell--editable" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      title={`f[${index}] = ${value.toFixed(2)}`}
      role={editable ? "slider" : undefined}
      aria-label={editable ? `Dimension ${index}` : undefined}
      aria-valuenow={editable ? value : undefined}
      aria-valuemin={-1}
      aria-valuemax={1}
    >
      <div className="fhc__cell-axis" />
      <div
        className={`fhc__cell-bar ${isNeg ? "fhc__cell-bar--neg" : ""}`}
        style={{
          height: `${heightPct}%`,
          ...(isNeg ? { top: "50%" } : { bottom: "50%" }),
        }}
      />
      <span className="fhc__cell-label">{value.toFixed(2)}</span>
    </div>
  );
}
