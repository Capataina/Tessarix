import { useEffect, useMemo, useState } from "react";
import { LineChart, type Series } from "./LineChart";
import { WidgetExplainer } from "./WidgetExplainer";
import "./RatioCollapseDemo.css";

const FEATURE_DIM = 512;
const ALPHA_SAMPLES = 41;

function rng(seed: number): () => number {
  let s = seed | 0;
  if (s === 0) s = 0x1a2b3c4d;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 0xffffffff) * 2 - 1;
  };
}

function unitVector(dim: number, gen: () => number): Float32Array {
  const v = new Float32Array(dim);
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    v[i] = gen();
    sumSq += v[i] * v[i];
  }
  const inv = 1 / Math.sqrt(sumSq);
  for (let i = 0; i < dim; i++) v[i] *= inv;
  return v;
}

function orthonormaliseAgainst(v: Float32Array, u: Float32Array): Float32Array {
  let dot = 0;
  for (let i = 0; i < v.length; i++) dot += v[i] * u[i];
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) {
    v[i] -= dot * u[i];
    sumSq += v[i] * v[i];
  }
  const inv = 1 / Math.sqrt(sumSq);
  for (let i = 0; i < v.length; i++) v[i] *= inv;
  return v;
}

interface PairCache {
  ref: Float32Array;
  orth: Float32Array;
}

function buildPairCache(dim: number): PairCache {
  const gA = rng(0x4d6c7a1f);
  const gB = rng(0x71a3f2e0);
  const ref = unitVector(dim, gA);
  const orth = orthonormaliseAgainst(unitVector(dim, gB), ref);
  return { ref, orth };
}

function fidelityRatio(
  fa: Float32Array,
  fb: Float32Array,
  c1: number,
  c2: number,
): number {
  const n = fa.length;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += fa[i];
    sumB += fb[i];
  }
  const muA = sumA / n;
  const muB = sumB / n;
  let vA = 0;
  let vB = 0;
  let cov = 0;
  for (let i = 0; i < n; i++) {
    const dA = fa[i] - muA;
    const dB = fb[i] - muB;
    vA += dA * dA;
    vB += dB * dB;
    cov += dA * dB;
  }
  vA /= n;
  vB /= n;
  cov /= n;
  const num = (2 * muA * muB + c1) * (2 * cov + c2);
  const den = (muA * muA + muB * muB + c1) * (vA + vB + c2);
  return num / den;
}

interface LogSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function LogSlider({ label, value, min, max, onChange }: LogSliderProps) {
  const display =
    value < 1e-3 || value > 1e3 ? value.toExponential(1) : value.toFixed(3);
  return (
    <label className="ratio-demo__slider-row">
      <span className="ratio-demo__slider-label">{label}</span>
      <input
        type="range"
        min={Math.log10(min)}
        max={Math.log10(max)}
        step={0.05}
        value={Math.log10(value)}
        onChange={(e) => onChange(10 ** Number(e.target.value))}
        className="ratio-demo__slider"
      />
      <span className="ratio-demo__slider-value">{display}</span>
    </label>
  );
}

interface LinSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}

function LinSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: LinSliderProps) {
  return (
    <label className="ratio-demo__slider-row">
      <span className="ratio-demo__slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ratio-demo__slider"
      />
      <span className="ratio-demo__slider-value">
        {value.toFixed(2)}
        {suffix}
      </span>
    </label>
  );
}

const A_FINE_C = 1e-10;
const DISTS_C = 1e-6;

interface RatioCollapseDemoProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function RatioCollapseDemo({ onStateChange }: RatioCollapseDemoProps = {}) {
  const [featureScale, setFeatureScale] = useState(1);
  const [customC, setCustomC] = useState(1e-4);

  const pair = useMemo(() => buildPairCache(FEATURE_DIM), []);

  const { xs, aFineYs, distsYs, customYs } = useMemo(() => {
    const refScaled = new Float32Array(FEATURE_DIM);
    const orthScaled = new Float32Array(FEATURE_DIM);
    for (let i = 0; i < FEATURE_DIM; i++) {
      refScaled[i] = pair.ref[i] * featureScale;
      orthScaled[i] = pair.orth[i] * featureScale;
    }
    const xs: number[] = [];
    const aFineYs: number[] = [];
    const distsYs: number[] = [];
    const customYs: number[] = [];
    const fd = new Float32Array(FEATURE_DIM);
    for (let s = 0; s < ALPHA_SAMPLES; s++) {
      const alpha = s / (ALPHA_SAMPLES - 1);
      const beta = Math.sqrt(Math.max(0, 1 - alpha * alpha));
      for (let i = 0; i < FEATURE_DIM; i++) {
        fd[i] = alpha * refScaled[i] + beta * orthScaled[i];
      }
      xs.push(alpha);
      aFineYs.push(fidelityRatio(refScaled, fd, A_FINE_C, A_FINE_C));
      distsYs.push(fidelityRatio(refScaled, fd, DISTS_C, DISTS_C));
      customYs.push(fidelityRatio(refScaled, fd, customC, customC));
    }
    return { xs, aFineYs, distsYs, customYs };
  }, [pair, featureScale, customC]);

  const gap = useMemo(() => {
    if (aFineYs.length === 0) return 0;
    const aFineRange = Math.max(...aFineYs) - Math.min(...aFineYs);
    const distsRange = Math.max(...distsYs) - Math.min(...distsYs);
    if (aFineRange < 1e-9) return 0;
    return 1 - distsRange / aFineRange;
  }, [aFineYs, distsYs]);

  const collapseSeverity =
    gap < 0.05
      ? "negligible"
      : gap < 0.2
        ? "small"
        : gap < 0.5
          ? "moderate"
          : "severe";

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        feature_scale: featureScale,
        custom_c: customC,
        log_custom_c: Math.log10(customC),
        gap,
      });
    }
  }, [featureScale, customC, gap, onStateChange]);

  const series: Series[] = [
    {
      id: "aFine",
      label: "A-FINE  c = 1e-10",
      ys: aFineYs,
      color: "#5dc3d9",
    },
    {
      id: "dists",
      label: "DISTS  c = 1e-6",
      ys: distsYs,
      color: "#e8825c",
    },
    {
      id: "custom",
      label: `custom  c = ${customC.toExponential(1)}`,
      ys: customYs,
      color: "#c8a35a",
      dash: "5 4",
      width: 1.6,
    },
  ];

  return (
    <div className="ratio-demo">
      <LineChart
        xs={xs}
        series={series}
        xDomain={[0, 1]}
        xLabel="Feature alignment α (cosine similarity)"
        yLabel="ratio"
        xTicks={6}
        yTicks={6}
        formatX={(v) => v.toFixed(1)}
        formatY={(v) => v.toFixed(2)}
        height={260}
      />

      <div className="ratio-demo__diagnostic">
        <span className="ratio-demo__diagnostic-label">
          Dynamic-range loss at c = 1e-6 vs c = 1e-10
        </span>
        <span
          className={`ratio-demo__diagnostic-value ratio-demo__diagnostic-value--${collapseSeverity}`}
        >
          {(gap * 100).toFixed(1)}% ({collapseSeverity})
        </span>
      </div>

      <div className="ratio-demo__sliders">
        <LinSlider
          label="Feature scale ×"
          value={featureScale}
          min={0.05}
          max={5}
          step={0.05}
          onChange={setFeatureScale}
        />
        <LogSlider
          label="Custom c"
          value={customC}
          min={1e-12}
          max={1e-2}
          onChange={setCustomC}
        />
      </div>

      <WidgetExplainer
        widgetName="SSIM-style ratio collapse demo"
        widgetDescription="Shows the SSIM-style structural-similarity ratio in CLIP feature space at three different stabilising constants: A-FINE's c = 1e-10, DISTS's c = 1e-6, and a reader-controlled custom c. The reader can also scale the synthetic feature norm to see how the c constant interacts with feature scale."
        stateSummary={`Feature scale = ${featureScale.toFixed(2)} × unit-norm. Custom c = ${customC.toExponential(2)}. Dynamic-range loss between c = 1e-6 and c = 1e-10 = ${(gap * 100).toFixed(1)}% (${collapseSeverity}).`}
        stateKey={JSON.stringify({
          fs: Number(featureScale.toFixed(2)),
          c: Number(Math.log10(customC).toFixed(2)),
        })}
      />
    </div>
  );
}
