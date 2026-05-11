import { useEffect, useMemo, useState } from "react";
import { LineChart, type Series } from "./LineChart";
import { WidgetExplainer } from "./WidgetExplainer";
import "./CalibratorComparison.css";

const X_MIN = -4;
const X_MAX = 4;
const SAMPLES = 81;

interface CalibratorParams {
  b1: number;
  b2: number;
  b3: number;
  b4: number;
  b5: number;
}

// Plausible "trained checkpoint" values — distinct from the default starting
// values so the reader has something to aim at. Not the literal published
// values; the lesson body never claims to ship those.
const TRAINED: CalibratorParams = {
  b1: 1.4,
  b2: 1.8,
  b3: -0.3,
  b4: 0.08,
  b5: 0.55,
};

const STARTING: CalibratorParams = {
  b1: 1.0,
  b2: 1.5,
  b3: 0.0,
  b4: 0.05,
  b5: 0.5,
};

function calibrator(q: number, p: CalibratorParams): number {
  return (
    p.b1 * (0.5 - 1 / (1 + Math.exp(p.b2 * (q - p.b3)))) + p.b4 * q + p.b5
  );
}

function rmse(a: number[], b: number[]): number {
  let sse = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sse += d * d;
  }
  return Math.sqrt(sse / a.length);
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <label className="calibrator-comparison__slider-row">
      <span className="calibrator-comparison__slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="calibrator-comparison__slider"
      />
      <span className="calibrator-comparison__slider-value">
        {value.toFixed(2)}
      </span>
    </label>
  );
}

interface CalibratorComparisonProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function CalibratorComparison({
  onStateChange,
}: CalibratorComparisonProps = {}) {
  const [params, setParams] = useState<CalibratorParams>(STARTING);

  const { xs, trainedYs, readerYs } = useMemo(() => {
    const xs: number[] = [];
    const trainedYs: number[] = [];
    const readerYs: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const x = X_MIN + (i * (X_MAX - X_MIN)) / (SAMPLES - 1);
      xs.push(x);
      trainedYs.push(calibrator(x, TRAINED));
      readerYs.push(calibrator(x, params));
    }
    return { xs, trainedYs, readerYs };
  }, [params]);

  const fitError = useMemo(() => rmse(trainedYs, readerYs), [trainedYs, readerYs]);
  const fitQuality =
    fitError < 0.03
      ? "excellent"
      : fitError < 0.08
        ? "close"
        : fitError < 0.18
          ? "rough"
          : "far";

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        b1: params.b1,
        b2: params.b2,
        b3: params.b3,
        b4: params.b4,
        b5: params.b5,
        rmse_to_trained: fitError,
      });
    }
  }, [params, fitError, onStateChange]);

  const update = (key: keyof CalibratorParams) => (v: number) =>
    setParams((p) => ({ ...p, [key]: v }));

  const series: Series[] = [
    {
      id: "trained",
      label: "Trained calibrator (target)",
      ys: trainedYs,
      color: "var(--widget-chart-2)",
      width: 2.4,
    },
    {
      id: "reader",
      label: "Your calibrator",
      ys: readerYs,
      color: "var(--widget-chart-1)",
      dash: "5 4",
      width: 2,
    },
  ];

  return (
    <div className="calibrator-comparison">
      <LineChart
        xs={xs}
        series={series}
        xDomain={[X_MIN, X_MAX]}
        xLabel="raw network output q"
        yLabel="calibrated score s"
        xTicks={9}
        yTicks={5}
        formatX={(v) => v.toFixed(0)}
        formatY={(v) => v.toFixed(2)}
        height={240}
      />

      <div className="calibrator-comparison__fit">
        <span className="calibrator-comparison__fit-label">
          Fit to trained curve (RMSE)
        </span>
        <span
          className={`calibrator-comparison__fit-value calibrator-comparison__fit-value--${fitQuality}`}
        >
          {fitError.toFixed(3)} ({fitQuality})
        </span>
      </div>

      <div className="calibrator-comparison__sliders">
        <Slider
          label="β₁ — logistic amplitude"
          value={params.b1}
          min={0}
          max={2}
          step={0.05}
          onChange={update("b1")}
        />
        <Slider
          label="β₂ — steepness"
          value={params.b2}
          min={0.1}
          max={4}
          step={0.05}
          onChange={update("b2")}
        />
        <Slider
          label="β₃ — centre"
          value={params.b3}
          min={-3}
          max={3}
          step={0.05}
          onChange={update("b3")}
        />
        <Slider
          label="β₄ — linear slope"
          value={params.b4}
          min={-0.5}
          max={0.5}
          step={0.01}
          onChange={update("b4")}
        />
        <Slider
          label="β₅ — bias"
          value={params.b5}
          min={-0.5}
          max={1}
          step={0.01}
          onChange={update("b5")}
        />
      </div>

      <WidgetExplainer
        widgetName="Trained calibrator vs reader's calibrator"
        widgetDescription="Two five-parameter logistic calibrator curves overlaid: a trained reference (the kind A-FINE actually ships in its checkpoint) and the reader's free-parameter version. The reader manipulates β₁..β₅ to try to match the trained curve; RMSE between the two curves is shown live. Teaches what the training process optimised for — the trained β values absorb whatever offset and scale the raw head produces."
        stateSummary={`Reader's calibrator parameters: β₁=${params.b1.toFixed(2)}, β₂=${params.b2.toFixed(2)}, β₃=${params.b3.toFixed(2)}, β₄=${params.b4.toFixed(2)}, β₅=${params.b5.toFixed(2)}. RMSE against the trained reference = ${fitError.toFixed(3)} (${fitQuality}).`}
        stateKey={JSON.stringify({
          b1: Number(params.b1.toFixed(2)),
          b2: Number(params.b2.toFixed(2)),
          b3: Number(params.b3.toFixed(2)),
          b4: Number(params.b4.toFixed(2)),
          b5: Number(params.b5.toFixed(2)),
        })}
      />
    </div>
  );
}
