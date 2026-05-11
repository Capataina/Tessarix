import { useMemo } from "react";
import { LineChart, type Series } from "./LineChart";
import { WidgetExplainer } from "./WidgetExplainer";
import "./GeluComparison.css";

const X_MIN = -3;
const X_MAX = 3;
const SAMPLES = 121;

/** Abramowitz-Stegun erf approximation (max error ~1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const t = 1 / (1 + p * ax);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

const SQRT_HALF = 1 / Math.sqrt(2);

function quickGelu(x: number): number {
  return x / (1 + Math.exp(-1.702 * x));
}

function erfGelu(x: number): number {
  return 0.5 * x * (1 + erf(x * SQRT_HALF));
}

export function GeluComparison() {
  const { xs, quickYs, erfYs, diffYs } = useMemo(() => {
    const xs: number[] = [];
    const quickYs: number[] = [];
    const erfYs: number[] = [];
    const diffYs: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const x = X_MIN + (i * (X_MAX - X_MIN)) / (SAMPLES - 1);
      const q = quickGelu(x);
      const e = erfGelu(x);
      xs.push(x);
      quickYs.push(q);
      erfYs.push(e);
      diffYs.push(q - e);
    }
    return { xs, quickYs, erfYs, diffYs };
  }, []);

  const maxAbsDiff = useMemo(
    () => Math.max(...diffYs.map((d) => Math.abs(d))),
    [diffYs],
  );

  const activationSeries: Series[] = [
    {
      id: "quick",
      label: "QuickGELU",
      ys: quickYs,
      color: "var(--widget-chart-1)",
    },
    {
      id: "erf",
      label: "erf-GELU",
      ys: erfYs,
      color: "var(--widget-chart-2)",
      dash: "5 3",
    },
  ];

  const diffSeries: Series[] = [
    {
      id: "diff",
      label: "QuickGELU − erf-GELU",
      ys: diffYs,
      color: "var(--widget-chart-3)",
    },
  ];

  return (
    <div className="gelu-comparison">
      <div className="gelu-comparison__plots">
        <div className="gelu-comparison__plot">
          <div className="gelu-comparison__plot-title">Activations</div>
          <LineChart
            xs={xs}
            series={activationSeries}
            xDomain={[X_MIN, X_MAX]}
            xTicks={7}
            yTicks={5}
            formatX={(v) => v.toFixed(1)}
            formatY={(v) => v.toFixed(2)}
            xLabel="x"
            yLabel="GELU(x)"
            height={220}
          />
        </div>

        <div className="gelu-comparison__plot">
          <div className="gelu-comparison__plot-title">
            Difference
            <span className="gelu-comparison__plot-aside">
              max | Δ | = {maxAbsDiff.toFixed(4)}
            </span>
          </div>
          <LineChart
            xs={xs}
            series={diffSeries}
            xDomain={[X_MIN, X_MAX]}
            xTicks={7}
            yTicks={5}
            formatX={(v) => v.toFixed(1)}
            formatY={(v) => v.toFixed(4)}
            xLabel="x"
            yLabel="ΔGELU"
            height={220}
          />
        </div>
      </div>

      <WidgetExplainer
        widgetName="QuickGELU vs erf-GELU comparison"
        widgetDescription="Two activation curves overlaid (QuickGELU and erf-based GELU) plus a difference curve at full precision. Static plot — no interactive controls — but readers can ask questions about the difference's shape and why the ~1% gap fails the parity test."
        stateSummary={`Static plot of QuickGELU (x · sigmoid(1.702 x)) versus the erf-based GELU (0.5 · x · (1 + erf(x / √2))) over x ∈ [-3, 3]. The maximum pointwise absolute difference is ${maxAbsDiff.toFixed(4)}, located near |x| ≈ 1.2. The CLIP backbone uses QuickGELU; the naturalness head uses erf-based GELU.`}
        stateKey="static"
      />
    </div>
  );
}
