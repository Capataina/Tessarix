import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { sequentialWarm } from "../../../styles";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import { WidgetFrame } from "../shared/WidgetFrame";
import type { WidgetDescriptor } from "../../../lib/widgets/descriptor";
import "./AdapterHeatmap.css";

const DESCRIPTOR: WidgetDescriptor = {
  name: "A-FINE adapter heatmap",
  description:
    "2D heatmap of A-FINE's final score over (s_nat_r, s_fid) for fixed k and s_nat_d. The reader can drag a primary cursor anywhere on the heatmap; a ghost cursor automatically tracks the swap-twin position (same s_fid, x = s_nat,d). Both scores are always visible, so the asymmetry is observable without mutating state.",
  teaches: ["adapter", "A-FINE score", "asymmetry"],
  howToRead:
    "Drag the cursor across the heatmap to set (s_nat,r, s_fid); the colour is the fused A-FINE score and the dashed ghost cursor marks the swap-twin. The asymmetry |Δ| readout is the score gap between the current point and its twin, and goes to zero when k=0, s_fid=1, or the two naturalness scores match.",
  controls: [
    { kind: "drag", label: "Heatmap cursor (s_nat,r, s_fid)" },
    { kind: "slider", label: "k — blend parameter", min: 0, max: 1, step: 0.01 },
    {
      kind: "slider",
      label: "s_nat,d — distorted naturalness",
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      kind: "slider",
      label: "s_nat,r — reference naturalness",
      min: 0,
      max: 1,
      step: 0.01,
    },
    { kind: "slider", label: "s_fid — fidelity", min: 0, max: 1, step: 0.01 },
  ],
  invariants: [
    "the score readouts are finite numbers",
    "asymmetry |Δ| is non-negative",
    "the heatmap and cursors do not overflow the widget frame",
  ],
};

const HEATMAP_SIZE = 240;

/**
 * A-FINE adapter formula:
 *   blend = k * s_nat_r + (1 - k)
 *   score = blend * s_fid + (1 - blend) * s_nat_d
 */
function adapterScore(
  sNatD: number,
  sNatR: number,
  sFid: number,
  k: number,
): number {
  const blend = k * sNatR + (1 - k);
  return blend * sFid + (1 - blend) * sNatD;
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
    <label className="adapter-heatmap__slider-row">
      <span className="adapter-heatmap__slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="adapter-heatmap__slider"
      />
      <span className="adapter-heatmap__slider-value">{value.toFixed(2)}</span>
    </label>
  );
}

interface AdapterHeatmapProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function AdapterHeatmap({ onStateChange }: AdapterHeatmapProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);
  const [k, setK] = useState(0.6);
  const [sNatD, setSNatD] = useState(0.7);
  const [sNatR, setSNatR] = useState(0.4);
  const [sFid, setSFid] = useState(0.55);

  // Redraw the heatmap whenever k or s_nat_d changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(HEATMAP_SIZE, HEATMAP_SIZE);
    for (let py = 0; py < HEATMAP_SIZE; py++) {
      const sFidLocal = 1 - py / (HEATMAP_SIZE - 1);
      for (let px = 0; px < HEATMAP_SIZE; px++) {
        const sNatRLocal = px / (HEATMAP_SIZE - 1);
        const score = adapterScore(sNatD, sNatRLocal, sFidLocal, k);
        const [r, g, b] = sequentialWarm(score);
        const idx = (py * HEATMAP_SIZE + px) * 4;
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [k, sNatD]);

  const evalPoint = useMemo(() => {
    const original = adapterScore(sNatD, sNatR, sFid, k);
    const swapped = adapterScore(sNatR, sNatD, sFid, k);
    const asymmetry = Math.abs(original - swapped);
    return { original, swapped, asymmetry };
  }, [sNatD, sNatR, sFid, k]);

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        k,
        s_nat_d: sNatD,
        s_nat_r: sNatR,
        s_fid: sFid,
        score: evalPoint.original,
        swapped_score: evalPoint.swapped,
        asymmetry: evalPoint.asymmetry,
      });
    }
  }, [k, sNatD, sNatR, sFid, evalPoint, onStateChange]);

  // Click-and-drag cursor positioning. Replaces the swap button as the
  // primary interaction surface — sliders remain for keyboard / precision use.
  const updateFromPointer = useCallback(
    (clientX: number, clientY: number, target: HTMLCanvasElement) => {
      const rect = target.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      const newR = Math.max(0, Math.min(1, px));
      const newF = Math.max(0, Math.min(1, 1 - py));
      setSNatR(newR);
      setSFid(newF);
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX, e.clientY, e.currentTarget);
    },
    [updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      updateFromPointer(e.clientX, e.clientY, e.currentTarget);
    },
    [updateFromPointer],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [],
  );

  // Primary cursor: current (sNatR, sFid).
  const primaryX = sNatR * 100;
  const primaryY = (1 - sFid) * 100;
  // Ghost cursor: where the swap-twin lives — same s_fid, x at sNatD.
  // The ghost shows the reader where the swapped state's coordinates sit
  // simultaneously, so they don't lose context flipping back and forth.
  const ghostX = sNatD * 100;
  const ghostY = (1 - sFid) * 100;

  return (
    <WidgetFrame descriptor={DESCRIPTOR}>
      <div className="adapter-heatmap">
      <div className="adapter-heatmap__layout">
        <div className="adapter-heatmap__chart-wrap">
          <canvas
            ref={canvasRef}
            width={HEATMAP_SIZE}
            height={HEATMAP_SIZE}
            className="adapter-heatmap__canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="application"
            aria-label="Adapter score heatmap. Click and drag to move the cursor."
          />
          {/* Ghost cursor — the swap-twin */}
          <div
            className="adapter-heatmap__cursor adapter-heatmap__cursor--ghost"
            style={{
              left: `${ghostX}%`,
              top: `${ghostY}%`,
            }}
            aria-hidden
            title="If swapped (treat distorted as reference)"
          />
          {/* Primary cursor — the current point */}
          <div
            className="adapter-heatmap__cursor adapter-heatmap__cursor--primary"
            style={{
              left: `${primaryX}%`,
              top: `${primaryY}%`,
            }}
            aria-hidden
            title="Current point"
          />
          <div className="adapter-heatmap__axis-x" aria-hidden>
            s_nat,r →
          </div>
          <div className="adapter-heatmap__axis-y" aria-hidden>
            ↑ s_fid
          </div>
          <div className="adapter-heatmap__hint" aria-hidden>
            Click anywhere on the heatmap to set the cursor
          </div>
        </div>

        <div className="adapter-heatmap__readout">
          <div className="adapter-heatmap__legend">
            <span className="adapter-heatmap__legend-item">
              <span className="adapter-heatmap__legend-swatch adapter-heatmap__legend-swatch--primary" />
              Current point
            </span>
            <span className="adapter-heatmap__legend-item">
              <span className="adapter-heatmap__legend-swatch adapter-heatmap__legend-swatch--ghost" />
              If swapped (twin)
            </span>
          </div>

          <div className="adapter-heatmap__readout-row">
            <span className="adapter-heatmap__readout-label">
              Score — current
            </span>
            <span className="adapter-heatmap__readout-value">
              {evalPoint.original.toFixed(3)}
            </span>
          </div>
          <div className="adapter-heatmap__readout-row">
            <span className="adapter-heatmap__readout-label">
              Score — swapped
            </span>
            <span className="adapter-heatmap__readout-value">
              {evalPoint.swapped.toFixed(3)}
            </span>
          </div>
          <div className="adapter-heatmap__readout-row adapter-heatmap__readout-row--accent">
            <span className="adapter-heatmap__readout-label">Asymmetry |Δ|</span>
            <span className="adapter-heatmap__readout-value">
              {evalPoint.asymmetry.toFixed(3)}
            </span>
          </div>

          <p className="adapter-heatmap__readout-note">
            Both states are shown at all times: the solid cursor is your current
            point; the dashed cursor is its swap-twin (same s_fid, x-coordinate
            at s_nat,d). Asymmetry is the score difference between them, and
            equals <code>k · |s_nat,d − s_nat,r| · (1 − s_fid)</code> — it goes
            to zero when k=0, when s_fid=1, or when the two naturalness scores
            are equal.
          </p>
        </div>
      </div>

      <WidgetExplainer
        widgetName="A-FINE adapter heatmap"
        widgetDescription="2D heatmap of A-FINE's final score over (s_nat_r, s_fid) for fixed k and s_nat_d. The reader can drag a primary cursor anywhere on the heatmap; a ghost cursor automatically tracks the swap-twin position (same s_fid, x = s_nat,d). Both scores are always visible, so the asymmetry is observable without mutating state."
        stateSummary={`k = ${k.toFixed(2)}, s_nat,d = ${sNatD.toFixed(2)}, s_nat,r = ${sNatR.toFixed(2)}, s_fid = ${sFid.toFixed(2)}. Score at the current point = ${evalPoint.original.toFixed(3)}. Score at the swap-twin point = ${evalPoint.swapped.toFixed(3)}. Asymmetry |Δ| = ${evalPoint.asymmetry.toFixed(3)}.`}
        stateKey={JSON.stringify({
          k: Number(k.toFixed(2)),
          d: Number(sNatD.toFixed(2)),
          r: Number(sNatR.toFixed(2)),
          f: Number(sFid.toFixed(2)),
        })}
      />

      <div className="adapter-heatmap__sliders">
        <Slider
          label="k — blend parameter"
          value={k}
          min={0}
          max={1}
          step={0.01}
          onChange={setK}
        />
        <Slider
          label="s_nat,d — distorted naturalness"
          value={sNatD}
          min={0}
          max={1}
          step={0.01}
          onChange={setSNatD}
        />
        <Slider
          label="s_nat,r — reference naturalness"
          value={sNatR}
          min={0}
          max={1}
          step={0.01}
          onChange={setSNatR}
        />
        <Slider
          label="s_fid — fidelity"
          value={sFid}
          min={0}
          max={1}
          step={0.01}
          onChange={setSFid}
        />
      </div>
      </div>
    </WidgetFrame>
  );
}
