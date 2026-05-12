/**
 * EigenbasisHunt — discover the special directions of a matrix.
 *
 * Used by:
 *   - linear-algebra-basis (this lesson — foreshadows eigenvectors)
 * Cross-link candidates:
 *   - linear-algebra-matrices (the matrix's action on a test vector)
 *   - any future eigenvectors/diagonalisation lesson — this widget IS
 *     the eigenvector-as-fixed-direction insight in pre-vocabulary form
 *
 * THIS IS A DISCOVERY PUZZLE. Not a slider, not a passive plot — a
 * draggable test vector x with a real-time "are x and Ax parallel?"
 * indicator. The reader drags x around the plane; the widget shows
 * both x (input) and Ax (output) as arrows. An alignment meter reads
 * the angle between them; when the angle is within ~3° of either 0°
 * (positive eigenvalue — same direction) or 180° (negative eigenvalue
 * — flipped direction), the meter goes GREEN and a glow appears.
 * Found directions are saved on a side panel, so the reader can
 * survey the full eigenbasis they've discovered.
 *
 * Most points produce non-parallel pairs; the special points where x
 * and Ax line up are the EIGENVECTORS of A — directions along which A
 * acts as pure scaling. The widget makes them findable by inspection,
 * foreshadowing the eigenvalue lesson without using the vocabulary.
 *
 * Presets cycle through canonical matrices:
 *   - Diagonal scale: trivial — every direction is an eigendirection
 *     (no rotation anywhere).
 *   - Rotation: NO real eigendirections — the reader will sweep the
 *     whole plane and never find one. The negative result is
 *     pedagogically valuable.
 *   - Shear: a single eigendirection (the shear axis). Subtle.
 *   - Mixed: two distinct eigendirections in general position.
 *
 * Implements metaphor library §4 (direct manipulation) plus a brand-new
 * "discovery-by-survey" mechanic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./EigenbasisHunt.css";

const CANVAS_SIZE = 380;
/** Angle (in radians) tolerance for "parallel". ~3°. */
const PARALLEL_EPS = 0.05;
/** Two found directions count as "same eigendirection" if their unit
 * vectors are within this many radians of each other (allowing both
 * +x and -x as the same line). */
const DEDUP_EPS = 0.15;

interface Vec2 {
  x: number;
  y: number;
}

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface Preset {
  label: string;
  matrix: Matrix2;
  /** How many real eigendirections this matrix has (used for the "found
   * X of Y" score). Pure rotations have 0; shears have 1; diagonal
   * matrices with equal eigenvalues are "every direction"; generic
   * diagonalisable matrices have 2. */
  expectedDirections: number;
  description: string;
}

const PRESETS: Preset[] = [
  {
    label: "Shear",
    matrix: { a: 1, b: 1, c: 0, d: 1 },
    expectedDirections: 1,
    description:
      "Horizontal shear. There's exactly one eigendirection: the horizontal axis. Anything off-axis tilts.",
  },
  {
    label: "Stretch + shear",
    matrix: { a: 2, b: 1, c: 0, d: 1 },
    expectedDirections: 2,
    description:
      "Stretches x by 2 plus a shear. Two real eigendirections; one is the x-axis, the other is more subtle.",
  },
  {
    label: "Rotation 30°",
    matrix: {
      a: Math.cos(Math.PI / 6),
      b: -Math.sin(Math.PI / 6),
      c: Math.sin(Math.PI / 6),
      d: Math.cos(Math.PI / 6),
    },
    expectedDirections: 0,
    description:
      "Pure rotation. NO real eigendirection — every vector gets rotated. Sweep the whole plane; you'll never line them up.",
  },
  {
    label: "Diagonal scale",
    matrix: { a: 2, b: 0, c: 0, d: 3 },
    expectedDirections: 2,
    description:
      "Pure scaling. The x-axis is an eigendirection with eigenvalue 2; the y-axis is an eigendirection with eigenvalue 3.",
  },
  {
    label: "Reflection",
    matrix: { a: 1, b: 0, c: 0, d: -1 },
    expectedDirections: 2,
    description:
      "Reflection across x-axis. The x-axis maps to itself (eigenvalue +1); the y-axis maps to its negative (eigenvalue -1).",
  },
];

function apply(M: Matrix2, p: Vec2): Vec2 {
  return { x: M.a * p.x + M.b * p.y, y: M.c * p.x + M.d * p.y };
}

function angleBetween(u: Vec2, v: Vec2): number {
  const lu = Math.hypot(u.x, u.y);
  const lv = Math.hypot(v.x, v.y);
  if (lu < 1e-6 || lv < 1e-6) return Math.PI; // degenerate
  let c = (u.x * v.x + u.y * v.y) / (lu * lv);
  c = Math.max(-1, Math.min(1, c));
  return Math.acos(c);
}

interface FoundDirection {
  /** Unit vector marking the discovered line. */
  unit: Vec2;
  /** Eigenvalue λ along this direction (= signed scale factor). */
  lambda: number;
}

interface EigenbasisHuntProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function EigenbasisHunt({ onStateChange }: EigenbasisHuntProps) {
  const { recordInteraction } = useWidgetTelemetry("EigenbasisHunt");
  const [presetIdx, setPresetIdx] = useState(0);
  const [x, setX] = useState<Vec2>({ x: 1, y: 0.5 });
  const [found, setFound] = useState<FoundDirection[]>([]);

  const preset = PRESETS[presetIdx];
  const A = preset.matrix;
  const Ax = useMemo(() => apply(A, x), [A, x]);
  const angle = useMemo(() => angleBetween(x, Ax), [x, Ax]);
  // |x| should be at least somewhat large so the alignment indicator is meaningful.
  const xMag = Math.hypot(x.x, x.y);
  const AxMag = Math.hypot(Ax.x, Ax.y);
  const aligned =
    xMag > 0.05 &&
    AxMag > 0.05 &&
    (angle < PARALLEL_EPS || Math.PI - angle < PARALLEL_EPS);
  /** Sign of the eigenvalue λ: +1 if x and Ax point the SAME way,
   * -1 if opposite. Magnitude is |Ax| / |x|. */
  const lambdaSign = angle < Math.PI / 2 ? 1 : -1;
  const lambdaMag = xMag > 0.05 ? AxMag / xMag : 0;
  const lambdaApprox = aligned ? lambdaSign * lambdaMag : null;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      preset_index: presetIdx,
      x_x: Number(x.x.toFixed(3)),
      x_y: Number(x.y.toFixed(3)),
      ax_x: Number(Ax.x.toFixed(3)),
      ax_y: Number(Ax.y.toFixed(3)),
      angle_radians: Number(angle.toFixed(4)),
      angle_deg: Number(((angle * 180) / Math.PI).toFixed(1)),
      aligned: aligned ? 1 : 0,
      lambda_approx: lambdaApprox ?? Number.NaN,
      found_count: found.length,
      expected_directions: preset.expectedDirections,
    });
  }, [presetIdx, x, Ax, angle, aligned, lambdaApprox, found.length, preset, onStateChange]);

  const markFound = useCallback(() => {
    if (!aligned || xMag < 0.05 || lambdaApprox === null) return;
    const unit = { x: x.x / xMag, y: x.y / xMag };
    // De-duplicate: same line if unit vectors point within DEDUP_EPS,
    // OR are antipodal within DEDUP_EPS.
    const sameLine = (a: Vec2, b: Vec2) => {
      const same = Math.hypot(a.x - b.x, a.y - b.y);
      const opp = Math.hypot(a.x + b.x, a.y + b.y);
      return Math.min(same, opp) < DEDUP_EPS;
    };
    for (const f of found) {
      if (sameLine(f.unit, unit)) return;
    }
    setFound((prev) => [...prev, { unit, lambda: lambdaApprox }]);
    recordInteraction("found", {
      preset: preset.label,
      lambda: Number(lambdaApprox.toFixed(2)),
      unit_x: Number(unit.x.toFixed(2)),
      unit_y: Number(unit.y.toFixed(2)),
    });
  }, [aligned, x, xMag, lambdaApprox, found, preset, recordInteraction]);

  // Auto-mark when alignment becomes strong (smoothes UX so the reader
  // doesn't have to click a button every time).
  useEffect(() => {
    if (aligned) markFound();
    // We intentionally include only `aligned` and `markFound` so each
    // crossing-into-alignment-threshold fires once at most.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aligned, presetIdx]);

  const reset = useCallback(() => {
    setFound([]);
    setX({ x: 1, y: 0.5 });
    recordInteraction("reset");
  }, [recordInteraction]);

  const choosePreset = useCallback(
    (idx: number) => {
      setPresetIdx(idx);
      setFound([]);
      setX({ x: 1, y: 0.5 });
      recordInteraction("preset", { label: PRESETS[idx].label });
    },
    [recordInteraction],
  );

  const complete =
    preset.expectedDirections === 0 // rotation — nothing to find, "complete" never fires
      ? false
      : found.length >= preset.expectedDirections;

  const stateSummary = useMemo(() => {
    const angleDeg = ((angle * 180) / Math.PI).toFixed(1);
    const alignText = aligned
      ? `PARALLEL — x and Ax line up; A acts as scaling by ≈${lambdaApprox?.toFixed(2)} along this direction.`
      : `not parallel (angle ${angleDeg}°). Drag x along the highlighted ring to scan for eigendirections.`;
    const foundText =
      found.length === 0
        ? "no eigendirections found yet."
        : `${found.length} eigendirection(s) found: ${found
            .map(
              (f) =>
                `(unit (${f.unit.x.toFixed(2)}, ${f.unit.y.toFixed(2)}), λ≈${f.lambda.toFixed(2)})`,
            )
            .join("; ")}.`;
    return `Preset "${preset.label}", matrix [[${A.a.toFixed(2)}, ${A.b.toFixed(2)}], [${A.c.toFixed(2)}, ${A.d.toFixed(2)}]]; x = (${x.x.toFixed(2)}, ${x.y.toFixed(2)}); Ax = (${Ax.x.toFixed(2)}, ${Ax.y.toFixed(2)}). ${alignText} ${foundText} Goal: find ${preset.expectedDirections} eigendirection(s) for this matrix.`;
  }, [preset, A, x, Ax, angle, aligned, lambdaApprox, found]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        preset: presetIdx,
        x: [Number(x.x.toFixed(1)), Number(x.y.toFixed(1))],
        aligned,
        found_count: found.length,
      }),
    [presetIdx, x, aligned, found.length],
  );

  return (
    <div className={`ebh${complete ? " ebh--complete" : ""}`}>
      <header className="ebh__head">
        <div className="ebh__heading">
          <span className="ebh__heading-label">MATRIX A</span>
          <span className="ebh__heading-value">
            [[{A.a.toFixed(2)}, {A.b.toFixed(2)}], [{A.c.toFixed(2)}, {A.d.toFixed(2)}]]
          </span>
        </div>
        <div className="ebh__heading">
          <span className="ebh__heading-label">ALIGNMENT</span>
          <span
            className={`ebh__heading-value ebh__heading-value--${aligned ? "ok" : "neutral"}`}
          >
            {aligned
              ? `PARALLEL · λ ≈ ${lambdaApprox?.toFixed(2)}`
              : `angle ${((angle * 180) / Math.PI).toFixed(1)}°`}
          </span>
        </div>
        <div className="ebh__heading">
          <span className="ebh__heading-label">FOUND</span>
          <span className="ebh__heading-value">
            {found.length} /{" "}
            {preset.expectedDirections === 0 ? "0 (none exist)" : preset.expectedDirections}
          </span>
        </div>
      </header>

      <HuntCanvas
        A={A}
        x={x}
        setX={setX}
        Ax={Ax}
        aligned={aligned}
        found={found}
      />

      <div className="ebh__found">
        <span className="ebh__found-label">EIGENDIRECTIONS FOUND</span>
        {found.length === 0 ? (
          <span className="ebh__found-empty">
            Drag the input vector x. When x and Ax line up, the widget will
            auto-record the direction here.
          </span>
        ) : (
          <ul className="ebh__found-list">
            {found.map((f, i) => (
              <li key={i} className="ebh__found-item">
                <span className="ebh__found-vec">
                  direction ≈ ({f.unit.x.toFixed(2)}, {f.unit.y.toFixed(2)})
                </span>
                <span className="ebh__found-lambda">λ ≈ {f.lambda.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className={`ebh__verdict ebh__verdict--${
          preset.expectedDirections === 0 && found.length === 0
            ? "rotation"
            : complete
              ? "complete"
              : "hunting"
        }`}
      >
        <span className="ebh__verdict-label">Hunt status</span>
        <span className="ebh__verdict-value">
          {preset.expectedDirections === 0
            ? `Pure rotation — no real eigendirection exists. Sweep x in a full circle to convince yourself: x and Ax stay rigidly offset by 30°.`
            : complete
              ? `✓ All ${preset.expectedDirections} eigendirection(s) found. These directions are the EIGENBASIS of A — coordinates in which A acts as pure scaling.`
              : `${found.length} of ${preset.expectedDirections} eigendirection(s) found. ${preset.description}`}
        </span>
      </div>

      <div className="ebh__row">
        <button type="button" className="ebh__btn" onClick={reset}>
          Reset found list
        </button>
        <div className="ebh__preset-row">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              className={`ebh__preset-pick${i === presetIdx ? " ebh__preset-pick--active" : ""}`}
              onClick={() => choosePreset(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <WidgetExplainer
        widgetName="Eigenbasis hunt — discover the special directions of a matrix"
        widgetDescription="A discovery puzzle that foreshadows eigenvectors without using the vocabulary. The reader sees a matrix A and a draggable test vector x; the widget continuously shows x's image Ax as a second arrow. An alignment meter tracks the angle between x and Ax; when the angle is within 3° of 0 or 180°, the meter goes parallel and the widget auto-records the direction as a found eigendirection (with its signed eigenvalue, |Ax| / |x| with the sign determined by whether x and Ax point the same or opposite way). Five presets span the regime: shear (one eigendirection), stretch+shear (two), pure rotation (zero — pedagogically the most important: the reader will sweep x in a full circle and never align), diagonal scaling (two — the axes), and reflection (two — the axis of reflection and its perpendicular). The widget de-duplicates found directions by checking both same-sign and antipodal closeness, so x and -x count as the same direction. Pedagogical intent: directions where A acts as pure scaling are the eigenvectors of A; making them findable by inspection grounds the lesson that follows."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Canvas ────────────────────────────────────────────────────────────

interface HuntCanvasProps {
  A: Matrix2;
  x: Vec2;
  setX: (v: Vec2) => void;
  Ax: Vec2;
  aligned: boolean;
  found: FoundDirection[];
}

function HuntCanvas({
  A,
  x,
  setX,
  Ax,
  aligned,
  found,
}: HuntCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const domain = useMemo(
    () =>
      computeDomain([x, Ax, { x: 2, y: 2 }, { x: -2, y: -2 }], {
        padding: 1.4,
        floor: 3,
        ceiling: 8,
      }),
    [x, Ax],
  );

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);
  const fromPx = useMemo(() => makeFromPx(CANVAS_SIZE, domain), [domain]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_X = resolveColor("var(--widget-chart-1)");
    const C_AX = resolveColor("var(--widget-chart-2)");
    const C_FOUND = resolveColor("var(--widget-success)");
    const C_TEXT = resolveColor("var(--widget-text)");

    // Grid.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    const pxPerUnit = W / (2 * domain);
    const unitsPerHalf = Math.ceil(domain);
    for (let i = -unitsPerHalf; i <= unitsPerHalf; i++) {
      const xPx = W / 2 + i * pxPerUnit;
      const yPx = H / 2 - i * pxPerUnit;
      ctx.beginPath();
      ctx.moveTo(xPx, 0);
      ctx.lineTo(xPx, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, yPx);
      ctx.lineTo(W, yPx);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    const origin = toPx({ x: 0, y: 0 });

    // Found eigendirection lines — draw extending through origin in both
    // directions so the reader can see the "line of fixed-direction".
    for (const f of found) {
      ctx.strokeStyle = resolveColorAlpha("var(--widget-success)", 0.55);
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 4]);
      const ext = domain * 1.4;
      const s = toPx({ x: -ext * f.unit.x, y: -ext * f.unit.y });
      const e = toPx({ x: ext * f.unit.x, y: ext * f.unit.y });
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // λ label near positive tip.
      const labelPos = toPx({ x: 1.6 * f.unit.x, y: 1.6 * f.unit.y });
      ctx.fillStyle = C_FOUND;
      ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillText(`λ≈${f.lambda.toFixed(2)}`, labelPos.x + 6, labelPos.y - 6);
    }

    // Glow ring on the input vector if aligned.
    if (aligned) {
      ctx.strokeStyle = resolveColorAlpha("var(--widget-success)", 0.55);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(toPx(x).x, toPx(x).y, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw x and Ax.
    drawArrow(ctx, origin, toPx(x), C_X, "x", 2.6);
    drawArrow(ctx, origin, toPx(Ax), C_AX, "Ax", 2.6);

    // Handle.
    drawHandle(ctx, toPx(x), C_X);

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Hint label: at low magnitude, prompt the reader.
    if (Math.hypot(x.x, x.y) < 0.3) {
      ctx.fillStyle = resolveColorAlpha("var(--widget-text-dim)", 0.9);
      ctx.font = "500 12px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillText(
        "Drag x outward to see its image Ax",
        origin.x + 14,
        origin.y - 12,
      );
    }
  }, [A, x, Ax, aligned, found, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer drag on handle, treating any pointerdown near x as a drag start.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointerMath = (e: PointerEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      return fromPx({ x: px, y: py });
    };

    const onDown = (e: PointerEvent) => {
      const m = pointerMath(e);
      setDragging(true);
      canvas.setPointerCapture(e.pointerId);
      // Snap x to the click position — frees the reader from finding
      // the exact handle.
      setX({
        x: Math.max(-domain + 0.1, Math.min(domain - 0.1, m.x)),
        y: Math.max(-domain + 0.1, Math.min(domain - 0.1, m.y)),
      });
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const m = pointerMath(e);
      setX({
        x: Math.max(-domain + 0.1, Math.min(domain - 0.1, m.x)),
        y: Math.max(-domain + 0.1, Math.min(domain - 0.1, m.y)),
      });
    };
    const onUp = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      setDragging(false);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, domain, fromPx, setX]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="ebh__canvas"
      role="img"
      aria-label="Eigenbasis Hunt canvas — drag input vector x and watch image Ax for parallelism."
    />
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: Vec2,
  head: Vec2,
  color: string,
  label: string,
  width: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const len = Math.hypot(dx, dy);
  if (len > 5) {
    const ang = Math.atan2(dy, dx);
    const aLen = Math.min(10, len * 0.32);
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(
      head.x - aLen * Math.cos(ang - Math.PI / 6),
      head.y - aLen * Math.sin(ang - Math.PI / 6),
    );
    ctx.lineTo(
      head.x - aLen * Math.cos(ang + Math.PI / 6),
      head.y - aLen * Math.sin(ang + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = "700 13px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(label, head.x + 6, head.y - 8);
  ctx.restore();
}

function drawHandle(ctx: CanvasRenderingContext2D, p: Vec2, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
