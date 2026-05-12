import { useEffect, useMemo, useState } from "react";
import { drawReference } from "../../../lib/imaging/render";
import { gaussianBlur, translate } from "../../../lib/imaging/distortions";
import { psnr, ssim } from "../../../lib/imaging/metrics";
import { LineChart } from "../shared/LineChart";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./TranslationVsBlurPlot.css";

const CANVAS_SIZE = 192;
const TRANS_STEPS = 17; // 0..16 px
const BLUR_STEPS = 17; // 0..4 sigma

interface ResponseCurve {
  xs: number[];
  psnrs: number[];
  ssims: number[];
}

/**
 * Compute PSNR and SSIM response across a parameter range. Runs once on mount
 * in a deferred effect so it doesn't block the lesson's initial paint.
 */
function computeCurves(
  ref: ImageData,
  steps: number,
  xMax: number,
  apply: (img: ImageData, x: number) => ImageData,
): ResponseCurve {
  const xs: number[] = [];
  const psnrs: number[] = [];
  const ssims: number[] = [];
  for (let i = 0; i < steps; i++) {
    const x = (i * xMax) / (steps - 1);
    const distorted = apply(ref, x);
    xs.push(x);
    const p = psnr(ref, distorted);
    psnrs.push(isFinite(p) ? p : 50);
    ssims.push(ssim(ref, distorted));
  }
  return { xs, psnrs, ssims };
}

export function TranslationVsBlurPlot() {
  const [curves, setCurves] = useState<{
    translation: ResponseCurve;
    blur: ResponseCurve;
  } | null>(null);

  useEffect(() => {
    // Defer past the initial paint so the lesson isn't blocked on this.
    const handle = setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawReference(ctx, CANVAS_SIZE, CANVAS_SIZE);
      const ref = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const translation = computeCurves(ref, TRANS_STEPS, 16, (img, px) =>
        translate(img, px),
      );
      const blur = computeCurves(ref, BLUR_STEPS, 4, (img, sigma) =>
        gaussianBlur(img, sigma),
      );
      setCurves({ translation, blur });
    }, 100);
    return () => clearTimeout(handle);
  }, []);

  // Build series arrays scaled so PSNR (dB, range ~10..50) and SSIM (~0..1)
  // can sit on the same axis. We split into two plots for clarity instead.

  const translationStateSummary = useMemo(() => {
    if (!curves) return "Curves still computing.";
    const t = curves.translation;
    const lastPsnr = t.psnrs[t.psnrs.length - 1];
    const lastSsim = t.ssims[t.ssims.length - 1];
    return `At translation = 0, both metrics report a perfect match. At translation = ${t.xs[t.xs.length - 1].toFixed(0)} px, PSNR has dropped to ${lastPsnr.toFixed(1)} dB while SSIM is at ${lastSsim.toFixed(3)}. PSNR drops monotonically; SSIM drops in shallow steps as content shifts in and out of each 8×8 window.`;
  }, [curves]);

  const blurStateSummary = useMemo(() => {
    if (!curves) return "Curves still computing.";
    const b = curves.blur;
    const lastPsnr = b.psnrs[b.psnrs.length - 1];
    const lastSsim = b.ssims[b.ssims.length - 1];
    return `At blur sigma = 0, both metrics report a perfect match. At blur sigma = ${b.xs[b.xs.length - 1].toFixed(1)}, PSNR has dropped to ${lastPsnr.toFixed(1)} dB while SSIM is at ${lastSsim.toFixed(3)}. SSIM drops faster than PSNR — pixel averages survive blur, but local structure inside each 8×8 window is what blur destroys.`;
  }, [curves]);

  return (
    <div className="tvb-plot">
      <div className="tvb-plot__plots">
        <div className="tvb-plot__plot">
          <div className="tvb-plot__plot-title">Translation response</div>
          {curves ? (
            <>
              <LineChart
                xs={curves.translation.xs}
                series={[
                  {
                    id: "psnr",
                    label: "PSNR (dB)",
                    ys: curves.translation.psnrs,
                    color: "var(--widget-chart-1)",
                  },
                ]}
                xDomain={[0, 16]}
                xLabel="translation (px)"
                yLabel="PSNR (dB)"
                xTicks={5}
                yTicks={5}
                formatX={(v) => v.toFixed(0)}
                formatY={(v) => v.toFixed(0)}
                height={180}
              />
              <LineChart
                xs={curves.translation.xs}
                series={[
                  {
                    id: "ssim",
                    label: "SSIM",
                    ys: curves.translation.ssims,
                    color: "var(--widget-success)",
                  },
                ]}
                xDomain={[0, 16]}
                xLabel="translation (px)"
                yLabel="SSIM"
                xTicks={5}
                yTicks={5}
                formatX={(v) => v.toFixed(0)}
                formatY={(v) => v.toFixed(2)}
                height={180}
              />
            </>
          ) : (
            <div className="tvb-plot__loading">Computing response curves…</div>
          )}
        </div>

        <div className="tvb-plot__plot">
          <div className="tvb-plot__plot-title">Blur response</div>
          {curves ? (
            <>
              <LineChart
                xs={curves.blur.xs}
                series={[
                  {
                    id: "psnr",
                    label: "PSNR (dB)",
                    ys: curves.blur.psnrs,
                    color: "var(--widget-chart-1)",
                  },
                ]}
                xDomain={[0, 4]}
                xLabel="blur sigma"
                yLabel="PSNR (dB)"
                xTicks={5}
                yTicks={5}
                formatX={(v) => v.toFixed(1)}
                formatY={(v) => v.toFixed(0)}
                height={180}
              />
              <LineChart
                xs={curves.blur.xs}
                series={[
                  {
                    id: "ssim",
                    label: "SSIM",
                    ys: curves.blur.ssims,
                    color: "var(--widget-success)",
                  },
                ]}
                xDomain={[0, 4]}
                xLabel="blur sigma"
                yLabel="SSIM"
                xTicks={5}
                yTicks={5}
                formatX={(v) => v.toFixed(1)}
                formatY={(v) => v.toFixed(2)}
                height={180}
              />
            </>
          ) : (
            <div className="tvb-plot__loading">Computing response curves…</div>
          )}
        </div>
      </div>

      <WidgetExplainer
        widgetName="Translation vs blur response curves"
        widgetDescription="Two precomputed response curves: PSNR and SSIM measured against translation magnitude (0–16 px) and Gaussian blur sigma (0–4). Shows the shape of each metric's response to each distortion type, side by side."
        stateSummary={`Translation curve: ${translationStateSummary}\nBlur curve: ${blurStateSummary}`}
        stateKey="static"
      />
    </div>
  );
}
