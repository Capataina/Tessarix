/**
 * MatrixInverse — visualise that A⁻¹ undoes A, and that singular matrices
 * have no inverse.
 *
 * Used by:
 *   - linear-algebra-matrix-inverse (this lesson)
 * Cross-link candidates:
 *   - linear-algebra-matrices (the determinant-as-area-scaling section
 *     points forward here to "what does det = 0 mean")
 *   - linear-algebra-matrix-operations (inverse extends the four
 *     operations to a fifth — the partial undo operation)
 *
 * Implements metaphor library §5 (dual-state simultaneous display): the
 * left panel shows A acting on the unit square (square → parallelogram),
 * the right panel shows A⁻¹ acting on that parallelogram (parallelogram
 * → back to the unit square). The two panels run in lock-step on the
 * SAME current A so the visual narrative is "the right panel undoes
 * the left panel, by construction". The dashed-outline on each side is
 * the *source* shape; the solid parallelogram is the *image* shape.
 *
 * When det(A) ≈ 0, the right panel is overlaid with a "no inverse"
 * banner — the visual point of the entire lesson is that the inverse
 * fails exactly when the determinant is zero, and the widget should
 * make that failure mode obviously, not hide it.
 *
 * The reader also drags a test vector v in the left panel. Its image
 * A·v appears in the same panel; in the right panel, the dashed source
 * shows A·v and the solid arrow shows A⁻¹·(A·v) — which must coincide
 * with the original v. The numeric verdict ||A⁻¹·A·v − v|| reports the
 * round-trip error, which should be vanishingly small for non-singular
 * A and divergent / undefined when A is singular.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./MatrixInverse.css";

const CANVAS_SIZE = 280;
const SINGULAR_EPS = 0.02;

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface Vec2 {
  x: number;
  y: number;
}

function det(M: Matrix2): number {
  return M.a * M.d - M.b * M.c;
}

function inverse(M: Matrix2): Matrix2 | null {
  const D = det(M);
  if (Math.abs(D) < SINGULAR_EPS) return null;
  return {
    a: M.d / D,
    b: -M.b / D,
    c: -M.c / D,
    d: M.a / D,
  };
}

function apply(M: Matrix2, p: Vec2): Vec2 {
  return { x: M.a * p.x + M.b * p.y, y: M.c * p.x + M.d * p.y };
}

interface MatrixInverseProps {
  initialA?: Matrix2;
  initialV?: Vec2;
  onStateChange?: (state: Record<string, number>) => void;
}

export function MatrixInverse({
  initialA = { a: 2, b: 1, c: 0, d: 1.5 },
  initialV = { x: 0.7, y: 0.4 },
  onStateChange,
}: MatrixInverseProps) {
  const [A, setA] = useState<Matrix2>(initialA);
  const [v, setV] = useState<Vec2>(initialV);

  const D = det(A);
  const isSingular = Math.abs(D) < SINGULAR_EPS;
  const Ainv = useMemo(() => inverse(A), [A]);

  // Round-trip error for the test vector.
  const Av = apply(A, v);
  const roundTrip = Ainv ? apply(Ainv, Av) : null;
  const roundTripErr = roundTrip
    ? Math.hypot(roundTrip.x - v.x, roundTrip.y - v.y)
    : Number.POSITIVE_INFINITY;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      A_a: A.a, A_b: A.b, A_c: A.c, A_d: A.d,
      det: D,
      singular: isSingular ? 1 : 0,
      Ainv_a: Ainv?.a ?? Number.NaN,
      Ainv_b: Ainv?.b ?? Number.NaN,
      Ainv_c: Ainv?.c ?? Number.NaN,
      Ainv_d: Ainv?.d ?? Number.NaN,
      v_x: v.x,
      v_y: v.y,
      round_trip_err: Number.isFinite(roundTripErr) ? roundTripErr : -1,
    });
  }, [A, D, isSingular, Ainv, v, roundTripErr, onStateChange]);

  const stateSummary = useMemo(() => {
    const Adesc = `A = [[${A.a.toFixed(2)}, ${A.b.toFixed(2)}], [${A.c.toFixed(2)}, ${A.d.toFixed(2)}]] with det(A) = ${D.toFixed(3)}.`;
    const invDesc = Ainv
      ? `A⁻¹ = [[${Ainv.a.toFixed(2)}, ${Ainv.b.toFixed(2)}], [${Ainv.c.toFixed(2)}, ${Ainv.d.toFixed(2)}]].`
      : "A is singular — no inverse exists (det(A) ≈ 0).";
    const trip = Number.isFinite(roundTripErr)
      ? `Test vector v = (${v.x.toFixed(2)}, ${v.y.toFixed(2)}); round-trip A⁻¹(A·v) = (${roundTrip!.x.toFixed(2)}, ${roundTrip!.y.toFixed(2)}); error ‖A⁻¹A·v − v‖ = ${roundTripErr.toFixed(4)}.`
      : `Round-trip undefined — A is singular.`;
    return `${Adesc} ${invDesc} ${trip}`;
  }, [A, D, Ainv, v, roundTrip, roundTripErr]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        A: [A.a, A.b, A.c, A.d].map((x) => Number(x.toFixed(2))),
        v: [v.x, v.y].map((x) => Number(x.toFixed(2))),
      }),
    [A, v],
  );

  const presets: { label: string; A: Matrix2 }[] = [
    { label: "Stretch + shear (invertible)", A: { a: 2, b: 1, c: 0, d: 1.5 } },
    { label: "Rotate 30°", A: { a: 0.866, b: -0.5, c: 0.5, d: 0.866 } },
    { label: "Reflect across y = x", A: { a: 0, b: 1, c: 1, d: 0 } },
    { label: "Collapse to a line (singular)", A: { a: 1, b: 2, c: 2, d: 4 } },
    { label: "Zero matrix (singular)", A: { a: 0, b: 0, c: 0, d: 0 } },
    { label: "Identity (trivially its own inverse)", A: { a: 1, b: 0, c: 0, d: 1 } },
  ];

  return (
    <div className="mat-inv">
      <div className="mat-inv__top">
        <MatrixControls label="A" M={A} setM={setA} />
        <InverseDisplay Ainv={Ainv} D={D} isSingular={isSingular} />
      </div>

      <div className="mat-inv__presets">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className="mat-inv__preset"
            onClick={() => setA(p.A)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mat-inv__plots">
        <InversePanel
          title="Apply A — unit square becomes a parallelogram"
          subtitle="The dashed outline is the input. The filled shape is the image under A."
          M={A}
          source={UNIT_SQUARE}
          sourceVector={v}
          imageVectorOfSource={Av}
          onVectorDrag={setV}
          accent="primary"
          singular={false}
        />
        <InversePanel
          title={
            isSingular
              ? "Apply A⁻¹ — but A is singular, so the inverse does not exist"
              : "Apply A⁻¹ — parallelogram becomes the unit square again"
          }
          subtitle={
            isSingular
              ? "When det(A) = 0, A crushed two dimensions into one. There's no operation that unflattens it."
              : "The dashed outline is A's image (the parallelogram from the left panel). The filled shape is A⁻¹'s image — back to the unit square."
          }
          M={Ainv ?? IDENTITY}
          source={Ainv ? applyMatrixToShape(A, UNIT_SQUARE) : UNIT_SQUARE}
          sourceVector={Ainv ? Av : v}
          imageVectorOfSource={Ainv ? apply(Ainv, Av) : v}
          accent="secondary"
          singular={isSingular}
        />
      </div>

      <div
        className={`mat-inv__verdict mat-inv__verdict--${
          isSingular ? "singular" : "invertible"
        }`}
      >
        <span className="mat-inv__verdict-label">Verdict</span>
        <span className="mat-inv__verdict-value">
          {isSingular
            ? `det(A) = ${D.toFixed(3)} — A is singular. No A⁻¹ exists. The right panel cannot undo the left.`
            : `det(A) = ${D.toFixed(3)} ≠ 0 — A is invertible. Round-trip error ‖A⁻¹A·v − v‖ = ${roundTripErr.toExponential(2)} (numerically zero).`}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Matrix inverse — A and A⁻¹ as paired transformations"
        widgetDescription="A 2x2 matrix A controlled by sliders. The widget computes A⁻¹ using the closed-form formula (1/det A)·[[d, -b], [-c, a]] and draws both transformations side-by-side. Left panel: A applied to the unit square (and to a draggable test vector v) shows the image parallelogram. Right panel: A⁻¹ applied to that parallelogram returns the unit square — visually demonstrating that A⁻¹ undoes A. When det(A) ≈ 0, A is singular: the right panel shows a 'no inverse exists' overlay because the transformation has collapsed two dimensions into one, and no operation can un-collapse it. Numeric verdict reports the round-trip error ‖A⁻¹A·v − v‖, which is vanishingly small for non-singular A."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// --- Helpers -----------------------------------------------------------

const UNIT_SQUARE: Vec2[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

const IDENTITY: Matrix2 = { a: 1, b: 0, c: 0, d: 1 };

function applyMatrixToShape(M: Matrix2, shape: Vec2[]): Vec2[] {
  return shape.map((p) => apply(M, p));
}

// --- Controls ----------------------------------------------------------

interface MatrixControlsProps {
  label: string;
  M: Matrix2;
  setM: (m: Matrix2) => void;
}

function MatrixControls({ label, M, setM }: MatrixControlsProps) {
  const update = (key: keyof Matrix2) => (v: number) =>
    setM({ ...M, [key]: v });
  return (
    <div className="mat-inv__matrix">
      <div className="mat-inv__matrix-label">{label}</div>
      <div className="mat-inv__matrix-bracket mat-inv__matrix-bracket--left" />
      <div className="mat-inv__matrix-entries">
        <Entry label="a" value={M.a} onChange={update("a")} />
        <Entry label="b" value={M.b} onChange={update("b")} />
        <Entry label="c" value={M.c} onChange={update("c")} />
        <Entry label="d" value={M.d} onChange={update("d")} />
      </div>
      <div className="mat-inv__matrix-bracket mat-inv__matrix-bracket--right" />
    </div>
  );
}

interface EntryProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function Entry({ label, value, onChange }: EntryProps) {
  return (
    <label className="mat-inv__entry">
      <span className="mat-inv__entry-label">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value.toFixed(2)}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        className="mat-inv__entry-input"
      />
      <input
        type="range"
        min={-2}
        max={2}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mat-inv__entry-slider"
      />
    </label>
  );
}

interface InverseDisplayProps {
  Ainv: Matrix2 | null;
  D: number;
  isSingular: boolean;
}

function InverseDisplay({ Ainv, D, isSingular }: InverseDisplayProps) {
  return (
    <div className="mat-inv__readout">
      <div className="mat-inv__readout-label">A⁻¹ (computed)</div>
      <div className="mat-inv__matrix">
        <div className="mat-inv__matrix-label">&nbsp;</div>
        <div className="mat-inv__matrix-bracket mat-inv__matrix-bracket--left" />
        <div className="mat-inv__matrix-entries">
          <ReadEntry label="a" value={Ainv?.a} />
          <ReadEntry label="b" value={Ainv?.b} />
          <ReadEntry label="c" value={Ainv?.c} />
          <ReadEntry label="d" value={Ainv?.d} />
        </div>
        <div className="mat-inv__matrix-bracket mat-inv__matrix-bracket--right" />
      </div>
      <div
        className={`mat-inv__det mat-inv__det--${
          isSingular ? "singular" : "invertible"
        }`}
      >
        det(A) = {D.toFixed(3)}
        {isSingular && " (singular — no inverse)"}
      </div>
    </div>
  );
}

interface ReadEntryProps {
  label: string;
  value: number | undefined;
}

function ReadEntry({ label, value }: ReadEntryProps) {
  const display =
    value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(2);
  return (
    <div className="mat-inv__readentry">
      <span className="mat-inv__entry-label">{label}</span>
      <span className="mat-inv__readentry-value">{display}</span>
    </div>
  );
}

// --- Panel -------------------------------------------------------------

interface InversePanelProps {
  title: string;
  subtitle: string;
  /** The transformation matrix this panel applies to its source. */
  M: Matrix2;
  /** The source shape (dashed outline). */
  source: Vec2[];
  /** The source vector — drawn dashed in this panel. */
  sourceVector: Vec2;
  /** The image of `sourceVector` under M — drawn solid. */
  imageVectorOfSource: Vec2;
  /** Optional drag callback; enables vector interactivity. */
  onVectorDrag?: (v: Vec2) => void;
  accent: "primary" | "secondary";
  /** If true, draw a "no inverse" overlay instead of the transformation. */
  singular: boolean;
}

function InversePanel({
  title,
  subtitle,
  M,
  source,
  sourceVector,
  imageVectorOfSource,
  onVectorDrag,
  accent,
  singular,
}: InversePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const image = useMemo(() => applyMatrixToShape(M, source), [M, source]);

  // Dynamic viewport that fits the source, the image, and both vectors.
  const domain = useMemo(() => {
    return computeDomain(
      [...source, ...image, sourceVector, imageVectorOfSource],
      { padding: 1.4, floor: 1.8, ceiling: 6 },
    );
  }, [source, image, sourceVector, imageVectorOfSource]);

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

    const C_PRIMARY = resolveColor("var(--widget-chart-1)");
    const C_SECONDARY = resolveColor("var(--widget-chart-2)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_ACCENT = accent === "primary" ? C_PRIMARY : C_SECONDARY;
    const C_FILL =
      accent === "primary"
        ? resolveColorAlpha("var(--widget-chart-1)", 0.18)
        : resolveColorAlpha("var(--widget-chart-2)", 0.18);
    const C_VECTOR = resolveColor("var(--widget-chart-3)");

    // Grid + axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    const pxPerUnit = W / (2 * domain);
    const unitsPerHalf = Math.ceil(domain);
    for (let u = -unitsPerHalf; u <= unitsPerHalf; u++) {
      const xPx = W / 2 + u * pxPerUnit;
      const yPx = H / 2 - u * pxPerUnit;
      if (xPx >= 0 && xPx <= W) {
        ctx.beginPath();
        ctx.moveTo(xPx, 0);
        ctx.lineTo(xPx, H);
        ctx.stroke();
      }
      if (yPx >= 0 && yPx <= H) {
        ctx.beginPath();
        ctx.moveTo(0, yPx);
        ctx.lineTo(W, yPx);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Source polygon (dashed).
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    source.forEach((p, i) => {
      const px = toPx(p);
      if (i === 0) ctx.moveTo(px.x, px.y);
      else ctx.lineTo(px.x, px.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Image polygon (solid).
    if (!singular) {
      ctx.fillStyle = C_FILL;
      ctx.beginPath();
      image.forEach((p, i) => {
        const px = toPx(p);
        if (i === 0) ctx.moveTo(px.x, px.y);
        else ctx.lineTo(px.x, px.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C_ACCENT;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Vectors. Source is dashed; image is solid.
    const origin = toPx({ x: 0, y: 0 });
    const srcPx = toPx(sourceVector);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    drawArrowRaw(ctx, origin, srcPx);
    ctx.setLineDash([]);
    if (onVectorDrag) {
      ctx.fillStyle = C_VECTOR;
      ctx.beginPath();
      ctx.arc(srcPx.x, srcPx.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!singular) {
      const imgPx = toPx(imageVectorOfSource);
      ctx.strokeStyle = C_VECTOR;
      ctx.fillStyle = C_VECTOR;
      ctx.lineWidth = 2.2;
      drawArrowRaw(ctx, origin, imgPx);
    }

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Singular overlay.
    if (singular) {
      ctx.fillStyle = "rgba(8, 12, 22, 0.78)";
      ctx.fillRect(0, 0, W, H);
      ctx.font =
        "600 13px 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
      ctx.fillStyle = resolveColor("var(--widget-danger)");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Inverse does not exist", W / 2, H / 2 - 14);
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font =
        "400 11px 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
      ctx.fillText("det(A) ≈ 0 — A collapsed", W / 2, H / 2 + 6);
      ctx.fillText("the plane onto a line.", W / 2, H / 2 + 20);
      ctx.textAlign = "start";
    }
  }, [
    M,
    source,
    image,
    sourceVector,
    imageVectorOfSource,
    onVectorDrag,
    accent,
    domain,
    toPx,
    singular,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Drag handling for the source vector (only when onVectorDrag is provided).
  useEffect(() => {
    if (!onVectorDrag) return;
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
      const dx = m.x - sourceVector.x;
      const dy = m.y - sourceVector.y;
      // Hit-test in math units against a ~0.25-unit radius — bigger than the
      // visible dot so the grab is forgiving.
      if (Math.hypot(dx, dy) < 0.28) {
        setDragging(true);
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const m = pointerMath(e);
      // Clamp to keep the vector inside the visible domain.
      const clamp = (n: number) =>
        Math.max(-domain + 0.1, Math.min(domain - 0.1, n));
      onVectorDrag({ x: clamp(m.x), y: clamp(m.y) });
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
  }, [dragging, sourceVector, onVectorDrag, fromPx, domain]);

  return (
    <div className={`mat-inv__panel mat-inv__panel--${accent}`}>
      <header className="mat-inv__panel-head">
        <span className="mat-inv__panel-title">{title}</span>
        <span className="mat-inv__panel-subtitle">{subtitle}</span>
      </header>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={`mat-inv__canvas${
          onVectorDrag ? " mat-inv__canvas--draggable" : ""
        }`}
        role="img"
        aria-label={`Panel showing ${title}.`}
      />
    </div>
  );
}

function drawArrowRaw(
  ctx: CanvasRenderingContext2D,
  tail: Vec2,
  head: Vec2,
) {
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const len = Math.hypot(dx, dy);
  if (len > 5) {
    const ang = Math.atan2(dy, dx);
    const aLen = Math.min(8, len * 0.35);
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
}
