import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawReference } from "../../lib/imaging/render";
import {
  brightness,
  gaussianBlur,
  gaussianNoise,
  translate,
} from "../../lib/imaging/distortions";
import { psnr, ssim } from "../../lib/imaging/metrics";
import { emit as emitTelemetry } from "../../lib/telemetry";
import { WidgetExplainer } from "./WidgetExplainer";
import "./MetricComparison.css";

const CANVAS_SIZE = 256;

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

const PRESETS: Preset[] = [
  {
    id: "translate-6",
    label: "Translate 6px",
    state: { translation: 6, blur: 0, noise: 0, brightnessShift: 0 },
  },
  {
    id: "heavy-blur",
    label: "Heavy blur",
    state: { translation: 0, blur: 3.5, noise: 0, brightnessShift: 0 },
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
  const refCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const distCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const refImageDataRef = useRef<ImageData | null>(null);
  const [psnrValue, setPsnrValue] = useState<number>(Infinity);
  const [ssimValue, setSsimValue] = useState<number>(1);

  // Draw the reference image once.
  useEffect(() => {
    const canvas = refCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawReference(ctx, CANVAS_SIZE, CANVAS_SIZE);
    refImageDataRef.current = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  // Recompute the distorted image and metrics whenever the distortion state
  // changes.
  useEffect(() => {
    const refData = refImageDataRef.current;
    const canvas = distCanvasRef.current;
    if (!refData || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply distortions in a fixed order: translate -> blur -> noise -> brightness.
    let current = new ImageData(
      new Uint8ClampedArray(refData.data),
      refData.width,
      refData.height,
    );
    if (dist.translation !== 0) current = translate(current, dist.translation);
    if (dist.blur > 0.01) current = gaussianBlur(current, dist.blur);
    if (dist.noise > 0.5) current = gaussianNoise(current, dist.noise);
    if (dist.brightnessShift !== 0)
      current = brightness(current, dist.brightnessShift);

    ctx.putImageData(current, 0, 0);
    const psnrVal = psnr(refData, current);
    const ssimVal = ssim(refData, current);
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
    return `Translation = ${dist.translation} px, Gaussian blur sigma = ${dist.blur.toFixed(2)}, Gaussian noise sigma = ${dist.noise.toFixed(1)}, Brightness shift = ${dist.brightnessShift}. Current metrics: PSNR = ${psnrStr}, SSIM = ${ssimValue.toFixed(3)}.`;
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
          <canvas
            ref={refCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="metric-comparison__canvas"
          />
        </figure>
        <figure className="metric-comparison__panel">
          <figcaption>Distorted</figcaption>
          <canvas
            ref={distCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="metric-comparison__canvas"
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
        widgetDescription="Side-by-side reference and distorted images with live PSNR and SSIM readouts; the reader applies translation, Gaussian blur, Gaussian noise, and brightness shift via sliders to watch where the two metrics agree and disagree."
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
