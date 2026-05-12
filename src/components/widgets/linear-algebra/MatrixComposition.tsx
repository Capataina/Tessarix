/**
 * MatrixComposition — visualise that AB ≠ BA in general.
 *
 * Used by:
 *   - linear-algebra-matrix-operations (this lesson)
 * Cross-link candidates:
 *   - linear-algebra-matrices (the matrix-multiplication-is-composition
 *     section there points forward to this widget)
 *
 * Implements metaphor library §7 (composition timeline): apply A, see
 * the intermediate state, then apply B. Two side-by-side plots run the
 * same unit square through BOTH orderings — AB applied to the unit
 * square in one panel, BA applied to it in the other. The reader sets
 * the two matrices independently via sliders and watches the two
 * resulting parallelograms diverge.
 *
 * Pedagogy: matrix multiplication's non-commutativity is the single
 * most consequential fact in linear algebra beyond the basics, and
 * prose can only assert it. Side-by-side simultaneous comparison makes
 * the non-commutativity *visible* — two different shapes for the same
 * two matrices, depending only on the order of application.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./MatrixComposition.css";

const CANVAS_SIZE = 280;

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

function multiply(M: Matrix2, N: Matrix2): Matrix2 {
  // (M · N) — standard matrix product with M's rows × N's columns.
  return {
    a: M.a * N.a + M.b * N.c,
    b: M.a * N.b + M.b * N.d,
    c: M.c * N.a + M.d * N.c,
    d: M.c * N.b + M.d * N.d,
  };
}

function apply(M: Matrix2, p: { x: number; y: number }) {
  return { x: M.a * p.x + M.b * p.y, y: M.c * p.x + M.d * p.y };
}

interface MatrixCompositionProps {
  initialA?: Matrix2;
  initialB?: Matrix2;
  onStateChange?: (state: Record<string, number>) => void;
}

export function MatrixComposition({
  initialA = { a: 1, b: 1, c: 0, d: 1 }, // shear-x
  initialB = { a: 0.707, b: -0.707, c: 0.707, d: 0.707 }, // rotate 45°
  onStateChange,
}: MatrixCompositionProps) {
  const { recordInteraction } = useWidgetTelemetry("MatrixComposition");
  const [A, setA] = useState<Matrix2>(initialA);
  const [B, setB] = useState<Matrix2>(initialB);

  const AB = useMemo(() => multiply(A, B), [A, B]);
  const BA = useMemo(() => multiply(B, A), [A, B]);
  const detAB = AB.a * AB.d - AB.b * AB.c;
  const detBA = BA.a * BA.d - BA.b * BA.c;
  // Distance between AB and BA: norm of the difference matrix. Zero when
  // they commute, large when they differ a lot.
  const nonCommutativity = Math.sqrt(
    (AB.a - BA.a) ** 2 +
      (AB.b - BA.b) ** 2 +
      (AB.c - BA.c) ** 2 +
      (AB.d - BA.d) ** 2,
  );

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      A_a: A.a, A_b: A.b, A_c: A.c, A_d: A.d,
      B_a: B.a, B_b: B.b, B_c: B.c, B_d: B.d,
      AB_a: AB.a, AB_b: AB.b, AB_c: AB.c, AB_d: AB.d,
      BA_a: BA.a, BA_b: BA.b, BA_c: BA.c, BA_d: BA.d,
      det_AB: detAB,
      det_BA: detBA,
      non_commutativity: nonCommutativity,
      commute: nonCommutativity < 0.01 ? 1 : 0,
    });
  }, [A, B, AB, BA, detAB, detBA, nonCommutativity, onStateChange]);

  const stateSummary = useMemo(() => {
    const commute = nonCommutativity < 0.01;
    return `A = [[${A.a.toFixed(2)}, ${A.b.toFixed(2)}], [${A.c.toFixed(2)}, ${A.d.toFixed(2)}]]; B = [[${B.a.toFixed(2)}, ${B.b.toFixed(2)}], [${B.c.toFixed(2)}, ${B.d.toFixed(2)}]]. Product AB = [[${AB.a.toFixed(2)}, ${AB.b.toFixed(2)}], [${AB.c.toFixed(2)}, ${AB.d.toFixed(2)}]] with det = ${detAB.toFixed(3)}. Product BA = [[${BA.a.toFixed(2)}, ${BA.b.toFixed(2)}], [${BA.c.toFixed(2)}, ${BA.d.toFixed(2)}]] with det = ${detBA.toFixed(3)}. ${commute ? "AB equals BA — the two matrices COMMUTE here." : `AB and BA differ by ||AB - BA|| = ${nonCommutativity.toFixed(3)} — they do NOT commute.`}`;
  }, [A, B, AB, BA, detAB, detBA, nonCommutativity]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        A: [A.a, A.b, A.c, A.d].map((x) => Number(x.toFixed(2))),
        B: [B.a, B.b, B.c, B.d].map((x) => Number(x.toFixed(2))),
      }),
    [A, B],
  );

  const presets: { label: string; A: Matrix2; B: Matrix2 }[] = [
    {
      label: "Shear-x then Rotate45",
      A: { a: 1, b: 1, c: 0, d: 1 },
      B: { a: 0.707, b: -0.707, c: 0.707, d: 0.707 },
    },
    {
      label: "Scale-2x then Reflect-y",
      A: { a: 2, b: 0, c: 0, d: 2 },
      B: { a: -1, b: 0, c: 0, d: 1 },
    },
    {
      label: "Two rotations (commute)",
      A: { a: 0.5, b: -0.866, c: 0.866, d: 0.5 }, // rotate 60
      B: { a: 0.866, b: -0.5, c: 0.5, d: 0.866 }, // rotate 30
    },
    {
      label: "Identity × anything (commute)",
      A: { a: 1, b: 0, c: 0, d: 1 },
      B: { a: 1.5, b: 0.3, c: -0.2, d: 1.2 },
    },
  ];

  return (
    <div className="mat-comp">
      <div className="mat-comp__top">
        <MatrixControls label="A" M={A} setM={setA} />
        <MatrixControls label="B" M={B} setM={setB} />
      </div>

      <div className="mat-comp__presets">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className="mat-comp__preset"
            onClick={() => {
              setA(p.A);
              setB(p.B);
              recordInteraction("preset", { label: p.label });
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mat-comp__plots">
        <CompositionPanel
          title="AB applied to the unit square"
          subtitle="Apply B first, then A — i.e. A·(B·v) for every corner v of the square."
          M={AB}
          accent="primary"
        />
        <CompositionPanel
          title="BA applied to the unit square"
          subtitle="Apply A first, then B — i.e. B·(A·v) for every corner v of the square."
          M={BA}
          accent="secondary"
        />
      </div>

      <div
        className={`mat-comp__verdict mat-comp__verdict--${nonCommutativity < 0.01 ? "commute" : "no-commute"}`}
      >
        <span className="mat-comp__verdict-label">Verdict</span>
        <span className="mat-comp__verdict-value">
          {nonCommutativity < 0.01
            ? `AB = BA — the two matrices commute (||AB − BA|| = ${nonCommutativity.toFixed(4)})`
            : `AB ≠ BA — they do not commute (||AB − BA|| = ${nonCommutativity.toFixed(3)})`}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Matrix composition — AB vs BA side-by-side"
        widgetDescription="Two 2x2 matrices A and B set by sliders. The widget computes AB (apply B first, then A) and BA (apply A first, then B), draws each as a transformation of the unit square in its own panel, and reports the non-commutativity ||AB - BA||. Shows directly that matrix multiplication is non-commutative in general, and lets the reader find the special cases where commutativity holds (identity, two rotations around the same point, two scalings of the same axes)."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface MatrixControlsProps {
  label: string;
  M: Matrix2;
  setM: (m: Matrix2) => void;
}

function MatrixControls({ label, M, setM }: MatrixControlsProps) {
  const update = (key: keyof Matrix2) => (v: number) =>
    setM({ ...M, [key]: v });
  return (
    <div className="mat-comp__matrix">
      <div className="mat-comp__matrix-label">{label}</div>
      <div className="mat-comp__matrix-bracket mat-comp__matrix-bracket--left" />
      <div className="mat-comp__matrix-entries">
        <Entry label="a" value={M.a} onChange={update("a")} />
        <Entry label="b" value={M.b} onChange={update("b")} />
        <Entry label="c" value={M.c} onChange={update("c")} />
        <Entry label="d" value={M.d} onChange={update("d")} />
      </div>
      <div className="mat-comp__matrix-bracket mat-comp__matrix-bracket--right" />
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
    <label className="mat-comp__entry">
      <span className="mat-comp__entry-label">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value.toFixed(2)}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        className="mat-comp__entry-input"
      />
      <input
        type="range"
        min={-2}
        max={2}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mat-comp__entry-slider"
      />
    </label>
  );
}

interface CompositionPanelProps {
  title: string;
  subtitle: string;
  M: Matrix2;
  accent: "primary" | "secondary";
}

function CompositionPanel({
  title,
  subtitle,
  M,
  accent,
}: CompositionPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic viewport that fits the transformed parallelogram + axes.
  const domain = useMemo(() => {
    const corners = [
      { x: 0, y: 0 },
      apply(M, { x: 1, y: 0 }),
      apply(M, { x: 0, y: 1 }),
      apply(M, { x: 1, y: 1 }),
    ];
    return computeDomain(corners, { padding: 1.4, floor: 1.5, ceiling: 6 });
  }, [M]);

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);

  const det = M.a * M.d - M.b * M.c;

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

    // Original unit square (dashed).
    const o = toPx({ x: 0, y: 0 });
    const u1 = toPx({ x: 1, y: 0 });
    const u2 = toPx({ x: 1, y: 1 });
    const u3 = toPx({ x: 0, y: 1 });
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(u1.x, u1.y);
    ctx.lineTo(u2.x, u2.y);
    ctx.lineTo(u3.x, u3.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Transformed parallelogram.
    const t0 = toPx({ x: 0, y: 0 });
    const ti = toPx(apply(M, { x: 1, y: 0 }));
    const tij = toPx(apply(M, { x: 1, y: 1 }));
    const tj = toPx(apply(M, { x: 0, y: 1 }));
    ctx.fillStyle = C_FILL;
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(ti.x, ti.y);
    ctx.lineTo(tij.x, tij.y);
    ctx.lineTo(tj.x, tj.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C_ACCENT;
    ctx.lineWidth = 2;
    ctx.stroke();

    // î and ĵ image arrows
    drawArrow(ctx, t0, ti, C_ACCENT, "î′");
    drawArrow(ctx, t0, tj, C_ACCENT, "ĵ′");

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [M, toPx, domain, accent]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className={`mat-comp__panel mat-comp__panel--${accent}`}>
      <header className="mat-comp__panel-head">
        <span className="mat-comp__panel-title">{title}</span>
        <span className="mat-comp__panel-subtitle">{subtitle}</span>
        <span className="mat-comp__panel-det">det = {det.toFixed(3)}</span>
      </header>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="mat-comp__canvas"
        role="img"
        aria-label={`Composition panel showing the unit square transformed by ${title}.`}
      />
    </div>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: { x: number; y: number },
  head: { x: number; y: number },
  color: string,
  label?: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
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
  if (label) {
    ctx.font = "600 11px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(label, head.x + 5, head.y - 7);
  }
  ctx.restore();
}
