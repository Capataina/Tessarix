import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  blur,
  brightness,
  downsample,
  drawDonutScene,
  gridToAscii,
  noise,
  psnr,
  ssim,
  translate,
  type Grid,
  type Pose,
} from "../../../lib/ascii";
import { emit as emitTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./MetricComparison.css";

// The metric runs on a high-res square luminance field (matching the old 256px
// canvas) so PSNR/SSIM keep the resolution-sensitive behaviour the GoalChain
// predicates depend on. The display is a separate, coarse ASCII grid (rendered
// from a 2× supersample, box-downsampled) — the donut you see is a downsample of
// the field the metric measures. See context/plans/ascii-custom-displays.md.
const METRIC_N = 256;
const DISP_W = 56;
const DISP_H = 28;
const SS = 2; // display supersample factor
// Spatial distortions (translate px, blur σ) are calibrated on the 256 grid;
// scale them to the display grid so the donut you see is proportional to what
// the number measures. Intensity distortions (noise, brightness) are not spatial.
const DISP_SCALE = DISP_W / METRIC_N;
const FRAME_MS = 1000 / 24; // CRT-ish cadence; also caps render cost

interface DistortionState {
  translation: number;
  blur: number;
  noise: number;
  brightnessShift: number;
}

const INITIAL: DistortionState = {
  translation: 0,
  blur: 0,
  noise: 0,
  brightnessShift: 0,
};

interface Preset {
  id: string;
  label: string;
  state: DistortionState;
}

// Preset values land inside the GoalChain windows (verified in
// scripts/verify-donut.ts): translate 4–8px, blur ~1–1.5σ, noise ≥25.
const PRESETS: Preset[] = [
  {
    id: "translate-6",
    label: "Translate 6px",
    state: { translation: 6, blur: 0, noise: 0, brightnessShift: 0 },
  },
  {
    id: "blur",
    label: "Blur σ1.5",
    state: { translation: 0, blur: 1.5, noise: 0, brightnessShift: 0 },
  },
  {
    id: "heavy-noise",
    label: "Heavy noise",
    state: { translation: 0, blur: 0, noise: 35, brightnessShift: 0 },
  },
  {
    id: "bright-40",
    label: "Brightness +40",
    state: { translation: 0, blur: 0, noise: 0, brightnessShift: 40 },
  },
  {
    id: "reset",
    label: "Reset",
    state: INITIAL,
  },
];

/** Apply the distortion chain (translate → blur → noise → brightness) to a grid. */
function distort(
  grid: Grid,
  dist: DistortionState,
  spatialScale: number,
): Grid {
  let g = grid;
  if (dist.translation !== 0) g = translate(g, dist.translation * spatialScale);
  if (dist.blur > 0.01) g = blur(g, dist.blur * spatialScale);
  if (dist.noise > 0.5) g = noise(g, dist.noise); // luminance-space; Math.random
  if (dist.brightnessShift !== 0) g = brightness(g, dist.brightnessShift);
  return g;
}

interface MetricComparisonProps {
  /** Optional caption rendered above the widget. */
  title?: string;
  /**
   * Optional callback invoked whenever the widget's state changes. Passed a
   * flat state object with the distortion parameters and computed metrics:
   *   { translation, blur, noise, brightness_shift, psnr, ssim }.
   * Used by `<GoalChain>` to evaluate step goal predicates.
   */
  onStateChange?: (state: Record<string, number>) => void;
}

export function MetricComparison({
  title,
  onStateChange,
}: MetricComparisonProps) {
  const [dist, setDist] = useState<DistortionState>(INITIAL);
  const [psnrValue, setPsnrValue] = useState<number>(Infinity);
  const [ssimValue, setSsimValue] = useState<number>(1);

  const refPreRef = useRef<HTMLPreElement | null>(null);
  const distPreRef = useRef<HTMLPreElement | null>(null);
  // Live pose + dist for the rAF closure (which captures once on mount).
  const poseRef = useRef<Pose>({ a: 1.0, b: 0.3 });
  const distRef = useRef<DistortionState>(dist);
  useEffect(() => {
    distRef.current = dist;
  }, [dist]);

  // Animation loop: spin the donut and repaint both ASCII panels. The donut is a
  // 2× supersample box-downsampled to the display grid for smoother glyphs.
  useEffect(() => {
    const draw = () => {
      const base = downsample(
        drawDonutScene(DISP_W * SS, DISP_H * SS, poseRef.current, {
          charAspect: 2,
        }),
        DISP_W,
        DISP_H,
      );
      if (refPreRef.current) refPreRef.current.textContent = gridToAscii(base);
      if (distPreRef.current) {
        distPreRef.current.textContent = gridToAscii(
          distort(base, distRef.current, DISP_SCALE),
        );
      }
    };

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      draw();
      return;
    }

    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < FRAME_MS) return;
      last = t;
      poseRef.current = {
        a: poseRef.current.a + 0.035,
        b: poseRef.current.b + 0.014,
      };
      draw();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Recompute metrics on distortion change, at the donut's current pose. The
  // value is pose-stable (rotation distorts both panels equally), so it sits
  // steady while the donut spins and only moves when a slider does.
  useEffect(() => {
    const ref = drawDonutScene(METRIC_N, METRIC_N, poseRef.current, {
      charAspect: 1,
    });
    const distorted = distort(ref, dist, 1);
    const psnrVal = psnr(ref, distorted);
    const ssimVal = ssim(ref, distorted);
    setPsnrValue(psnrVal);
    setSsimValue(ssimVal);
    if (onStateChange) {
      onStateChange({
        translation: dist.translation,
        blur: dist.blur,
        noise: dist.noise,
        brightness_shift: dist.brightnessShift,
        psnr: isFinite(psnrVal) ? psnrVal : 999,
        ssim: ssimVal,
      });
    }
  }, [dist, onStateChange]);

  const onSlider = useCallback(
    (key: keyof DistortionState) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value);
        setDist((d) => ({ ...d, [key]: v }));
      },
    [],
  );

  const onPresetClick = useCallback((preset: Preset) => {
    setDist(preset.state);
    emitTelemetry({
      kind: "click",
      data: {
        widget: "metric_comparison",
        target_role: "preset",
        target_label: preset.label,
      },
    });
  }, []);

  const stateSummary = useMemo(() => {
    const psnrStr = isFinite(psnrValue) ? `${psnrValue.toFixed(2)} dB` : "∞ dB";
    return `Translation = ${dist.translation} px, Gaussian blur sigma = ${dist.blur.toFixed(2)}, Gaussian noise sigma = ${dist.noise.toFixed(1)}, Brightness shift = ${dist.brightnessShift}. Current metrics: PSNR = ${psnrStr}, SSIM = ${ssimValue.toFixed(3)}. The reference is a rotating ASCII donut over faint scanlines; both panels spin together so the metrics reflect only the distortion, not the rotation.`;
  }, [dist, psnrValue, ssimValue]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        t: dist.translation,
        b: Number(dist.blur.toFixed(2)),
        n: Number(dist.noise.toFixed(1)),
        br: dist.brightnessShift,
      }),
    [dist],
  );

  const psnrDisplay = useMemo(() => {
    if (!isFinite(psnrValue)) return "∞ dB";
    return `${psnrValue.toFixed(1)} dB`;
  }, [psnrValue]);

  const ssimDisplay = useMemo(() => ssimValue.toFixed(3), [ssimValue]);

  // Bar widths: PSNR ~10..50 dB, SSIM 0..1. Clamp + map for visual feedback.
  const psnrBar = isFinite(psnrValue)
    ? Math.max(0, Math.min(1, (psnrValue - 10) / 40))
    : 1;
  const ssimBar = Math.max(0, Math.min(1, ssimValue));

  return (
    <div className="metric-comparison">
      {title ? <div className="metric-comparison__title">{title}</div> : null}

      <div className="metric-comparison__panels">
        <figure className="metric-comparison__panel">
          <figcaption>Reference</figcaption>
          <pre ref={refPreRef} className="metric-comparison__ascii" aria-hidden />
        </figure>
        <figure className="metric-comparison__panel">
          <figcaption>Distorted</figcaption>
          <pre
            ref={distPreRef}
            className="metric-comparison__ascii"
            aria-hidden
          />
        </figure>
      </div>

      <div className="metric-comparison__metrics">
        <div className="metric-comparison__metric metric-comparison__metric--psnr">
          <div className="metric-comparison__metric-label">PSNR</div>
          <div className="metric-comparison__metric-value">{psnrDisplay}</div>
          <div className="metric-comparison__metric-bar">
            <div
              className="metric-comparison__metric-fill"
              style={{ width: `${psnrBar * 100}%` }}
            />
          </div>
        </div>
        <div className="metric-comparison__metric metric-comparison__metric--ssim">
          <div className="metric-comparison__metric-label">SSIM</div>
          <div className="metric-comparison__metric-value">{ssimDisplay}</div>
          <div className="metric-comparison__metric-bar">
            <div
              className="metric-comparison__metric-fill"
              style={{ width: `${ssimBar * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="metric-comparison__sliders">
        <SliderRow
          label="Translation"
          value={dist.translation}
          min={0}
          max={20}
          step={1}
          suffix=" px"
          onChange={onSlider("translation")}
        />
        <SliderRow
          label="Gaussian blur"
          value={dist.blur}
          min={0}
          max={5}
          step={0.1}
          suffix=" σ"
          onChange={onSlider("blur")}
        />
        <SliderRow
          label="Gaussian noise"
          value={dist.noise}
          min={0}
          max={60}
          step={1}
          suffix=" σ"
          onChange={onSlider("noise")}
        />
        <SliderRow
          label="Brightness shift"
          value={dist.brightnessShift}
          min={-60}
          max={60}
          step={1}
          suffix=""
          onChange={onSlider("brightnessShift")}
        />
      </div>

      <div className="metric-comparison__presets">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="metric-comparison__preset"
            onClick={() => onPresetClick(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <WidgetExplainer
        widgetName="PSNR vs SSIM comparison"
        widgetDescription="Side-by-side reference and distorted images (a rotating ASCII donut over faint scanlines) with live PSNR and SSIM readouts; the reader applies translation, Gaussian blur, Gaussian noise, and brightness shift via sliders to watch where the two metrics agree and disagree. Both panels spin in lockstep so the metrics reflect only the distortion."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: SliderRowProps) {
  return (
    <label className="metric-comparison__slider-row">
      <span className="metric-comparison__slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="metric-comparison__slider"
      />
      <span className="metric-comparison__slider-value">
        {Number.isInteger(value) ? value : value.toFixed(1)}
        {suffix}
      </span>
    </label>
  );
}
