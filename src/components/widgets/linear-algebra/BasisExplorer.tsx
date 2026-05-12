/**
 * BasisExplorer — the same vector, two different bases, two different
 * coordinate tuples.
 *
 * Used by:
 *   - linear-algebra-basis (this lesson)
 * Cross-link candidates:
 *   - linear-algebra-span (the basis vectors must span the plane; the
 *     widget's "collapse" mode is the same singularity as a dependent
 *     pair of vectors)
 *   - linear-algebra-matrix-inverse (computing the custom-basis
 *     coordinates of w is exactly M⁻¹·w, where M = [u | v])
 *
 * Implements metaphor library §5 (dual-state simultaneous display) +
 * §4 (direct manipulation). The pedagogical point: a vector is a
 * geometric object, and its *coordinates* are a representation that
 * depends on the basis you chose. Two panels make this distinction
 * visible — the vector w sits in exactly the same place in the plane
 * in both panels, but its coordinate tuple is different because the
 * gridlines are different. The reader drags u, v, and w; both panels
 * stay in lock-step on the underlying geometric facts.
 *
 * Pattern §5 is the right fit because the "natural pair" here is
 * standard-basis vs custom-basis. Toggling between bases would force
 * the reader to remember the previous state; showing both at once
 * makes the comparison visible without any mental bookkeeping.
 *
 * When the custom basis collapses (u and v become parallel, i.e.
 * det([u|v]) ≈ 0), the right panel shows a "no basis" overlay — two
 * parallel vectors cannot span a 2D plane, so they do not form a
 * basis and the custom-coordinate tuple is undefined. The widget
 * surfaces this rather than producing nonsense.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./BasisExplorer.css";

const CANVAS_SIZE = 300;
const COLLAPSE_EPS = 0.03;

interface Vec2 {
  x: number;
  y: number;
}

function det2(u: Vec2, v: Vec2): number {
  return u.x * v.y - u.y * v.x;
}

/**
 * Coordinates of w in the basis {u, v}: solve α·u + β·v = w for (α, β).
 * Closed form via 2×2 inversion. Returns null when the basis is degenerate.
 */
function coordsInBasis(u: Vec2, v: Vec2, w: Vec2): { a: number; b: number } | null {
  const D = det2(u, v);
  if (Math.abs(D) < COLLAPSE_EPS) return null;
  // M = [u | v]; M⁻¹ = (1/det) · [[v.y, -v.x], [-u.y, u.x]].
  const a = (v.y * w.x - v.x * w.y) / D;
  const b = (-u.y * w.x + u.x * w.y) / D;
  return { a, b };
}

interface BasisExplorerProps {
  initialU?: Vec2;
  initialV?: Vec2;
  initialW?: Vec2;
  onStateChange?: (state: Record<string, number>) => void;
}

export function BasisExplorer({
  initialU = { x: 1.2, y: 0.4 },
  initialV = { x: -0.4, y: 1.3 },
  initialW = { x: 1.5, y: 1.5 },
  onStateChange,
}: BasisExplorerProps) {
  const [u, setU] = useState<Vec2>(initialU);
  const [v, setV] = useState<Vec2>(initialV);
  const [w, setW] = useState<Vec2>(initialW);

  const D = det2(u, v);
  const isCollapsed = Math.abs(D) < COLLAPSE_EPS;
  const coords = coordsInBasis(u, v, w);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      u_x: u.x, u_y: u.y,
      v_x: v.x, v_y: v.y,
      w_x: w.x, w_y: w.y,
      basis_det: D,
      collapsed: isCollapsed ? 1 : 0,
      alpha: coords?.a ?? Number.NaN,
      beta: coords?.b ?? Number.NaN,
    });
  }, [u, v, w, D, isCollapsed, coords, onStateChange]);

  const stateSummary = useMemo(() => {
    const std = `Standard basis: w = (${w.x.toFixed(2)}, ${w.y.toFixed(2)}).`;
    const cust = coords
      ? `Custom basis (u = (${u.x.toFixed(2)}, ${u.y.toFixed(2)}), v = (${v.x.toFixed(2)}, ${v.y.toFixed(2)})): w = ${coords.a.toFixed(2)}·u + ${coords.b.toFixed(2)}·v, i.e. [α, β] = (${coords.a.toFixed(2)}, ${coords.b.toFixed(2)}).`
      : `Custom basis is collapsed (u and v are parallel; det[u|v] = ${D.toFixed(3)}). No basis-coordinates exist for w.`;
    return `${std} ${cust}`;
  }, [u, v, w, D, coords]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        u: [u.x, u.y].map((x) => Number(x.toFixed(2))),
        v: [v.x, v.y].map((x) => Number(x.toFixed(2))),
        w: [w.x, w.y].map((x) => Number(x.toFixed(2))),
      }),
    [u, v, w],
  );

  const presets: { label: string; u: Vec2; v: Vec2 }[] = [
    { label: "Standard basis", u: { x: 1, y: 0 }, v: { x: 0, y: 1 } },
    { label: "Skewed (shear)", u: { x: 1.2, y: 0.4 }, v: { x: -0.4, y: 1.3 } },
    { label: "Rotated 30°", u: { x: 0.866, y: 0.5 }, v: { x: -0.5, y: 0.866 } },
    { label: "Stretched diagonal", u: { x: 1.6, y: 1.6 }, v: { x: -1.2, y: 1.2 } },
    { label: "Collapsed (parallel)", u: { x: 1, y: 1 }, v: { x: -1, y: -1 } },
  ];

  return (
    <div className="basis">
      <div className="basis__presets">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className="basis__preset"
            onClick={() => {
              setU(p.u);
              setV(p.v);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="basis__plots">
        <BasisPanel
          title="Standard basis"
          subtitle={`w has coordinates (${w.x.toFixed(2)}, ${w.y.toFixed(2)}) — i.e. ${w.x.toFixed(2)}·ê₁ + ${w.y.toFixed(2)}·ê₂.`}
          basisU={{ x: 1, y: 0 }}
          basisV={{ x: 0, y: 1 }}
          target={w}
          onDragTarget={setW}
          accent="primary"
          collapsed={false}
        />
        <BasisPanel
          title="Custom basis {u, v}"
          subtitle={
            coords
              ? `w has coordinates [α, β] = (${coords.a.toFixed(2)}, ${coords.b.toFixed(2)}) — i.e. ${coords.a.toFixed(2)}·u + ${coords.b.toFixed(2)}·v.`
              : "u and v are parallel — they do not form a basis."
          }
          basisU={u}
          basisV={v}
          onDragU={setU}
          onDragV={setV}
          target={w}
          onDragTarget={setW}
          accent="secondary"
          collapsed={isCollapsed}
        />
      </div>

      <div className="basis__readout">
        <div className="basis__readout-row">
          <span className="basis__readout-label">Standard coords (w)</span>
          <span className="basis__readout-value">
            ({w.x.toFixed(2)}, {w.y.toFixed(2)})
          </span>
        </div>
        <div className="basis__readout-row">
          <span className="basis__readout-label">Custom coords [α, β]</span>
          <span
            className={`basis__readout-value${
              isCollapsed ? " basis__readout-value--invalid" : ""
            }`}
          >
            {coords
              ? `(${coords.a.toFixed(2)}, ${coords.b.toFixed(2)})`
              : "— (basis collapsed)"}
          </span>
        </div>
        <div className="basis__readout-row">
          <span className="basis__readout-label">det[u | v]</span>
          <span
            className={`basis__readout-value${
              isCollapsed
                ? " basis__readout-value--invalid"
                : " basis__readout-value--ok"
            }`}
          >
            {D.toFixed(3)}
            {isCollapsed && " (collapsed)"}
          </span>
        </div>
      </div>

      <WidgetExplainer
        widgetName="Basis explorer — same vector, two coordinate tuples"
        widgetDescription="Two side-by-side panels display the SAME draggable vector w under two different bases. Left panel uses the standard basis (ê₁, ê₂) so w's coordinates are just its (x, y). Right panel uses a custom basis {u, v} (draggable basis vectors); w's coordinates in that basis are (α, β) where w = α·u + β·v, computed by solving the 2×2 system. The geometric position of w is the SAME in both panels — only the gridlines and the coordinate tuple change. When the user drags u and v close to parallel, det[u | v] approaches zero, the basis collapses, and the right panel shows a 'no basis' overlay because two parallel vectors cannot span the plane."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface BasisPanelProps {
  title: string;
  subtitle: string;
  basisU: Vec2;
  basisV: Vec2;
  target: Vec2;
  onDragU?: (v: Vec2) => void;
  onDragV?: (v: Vec2) => void;
  onDragTarget?: (v: Vec2) => void;
  accent: "primary" | "secondary";
  collapsed: boolean;
}

type DragHandle = "u" | "v" | "target" | null;

function BasisPanel({
  title,
  subtitle,
  basisU,
  basisV,
  target,
  onDragU,
  onDragV,
  onDragTarget,
  accent,
  collapsed,
}: BasisPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState<DragHandle>(null);

  const domain = useMemo(() => {
    return computeDomain([basisU, basisV, target, { x: 1, y: 1 }, { x: -1, y: -1 }], {
      padding: 1.4,
      floor: 2,
      ceiling: 6,
    });
  }, [basisU, basisV, target]);

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
    const C_ACCENT = accent === "primary" ? C_PRIMARY : C_SECONDARY;
    const C_TARGET = resolveColor("var(--widget-chart-3)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_FILL =
      accent === "primary"
        ? resolveColorAlpha("var(--widget-chart-1)", 0.05)
        : resolveColorAlpha("var(--widget-chart-2)", 0.05);

    // Standard cartesian grid (faint background).
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
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
    // Axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Basis lattice (gridlines aligned with u and v).
    if (!collapsed) {
      ctx.strokeStyle = resolveColorAlpha(
        accent === "primary" ? "var(--widget-chart-1)" : "var(--widget-chart-2)",
        0.32,
      );
      ctx.lineWidth = 1;
      const N = 6;
      const origin = toPx({ x: 0, y: 0 });
      for (let i = -N; i <= N; i++) {
        // Lines parallel to v, at integer multiples of u.
        const start = toPx({ x: i * basisU.x - N * basisV.x, y: i * basisU.y - N * basisV.y });
        const end = toPx({ x: i * basisU.x + N * basisV.x, y: i * basisU.y + N * basisV.y });
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      for (let j = -N; j <= N; j++) {
        // Lines parallel to u, at integer multiples of v.
        const start = toPx({ x: -N * basisU.x + j * basisV.x, y: -N * basisU.y + j * basisV.y });
        const end = toPx({ x: N * basisU.x + j * basisV.x, y: N * basisU.y + j * basisV.y });
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      // Faint fill of the basis parallelogram (u, v).
      ctx.fillStyle = C_FILL;
      const o = toPx({ x: 0, y: 0 });
      const pu = toPx(basisU);
      const puv = toPx({ x: basisU.x + basisV.x, y: basisU.y + basisV.y });
      const pv = toPx(basisV);
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(pu.x, pu.y);
      ctx.lineTo(puv.x, puv.y);
      ctx.lineTo(pv.x, pv.y);
      ctx.closePath();
      ctx.fill();
      void origin;
    }

    // Basis vectors (drawn even when collapsed so the reader can see them).
    const origin = toPx({ x: 0, y: 0 });
    drawArrow(ctx, origin, toPx(basisU), C_ACCENT, "u", 2.2);
    drawArrow(ctx, origin, toPx(basisV), C_ACCENT, "v", 2.2);

    // Target vector w.
    if (!collapsed || accent === "primary") {
      drawArrow(ctx, origin, toPx(target), C_TARGET, "w", 2.4);
      // Draggable handle.
      if (onDragTarget) {
        const wPx = toPx(target);
        ctx.fillStyle = C_TARGET;
        ctx.beginPath();
        ctx.arc(wPx.x, wPx.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draggable basis-vector handles.
    if (onDragU) drawHandle(ctx, toPx(basisU), C_ACCENT);
    if (onDragV) drawHandle(ctx, toPx(basisV), C_ACCENT);

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Collapsed overlay.
    if (collapsed) {
      ctx.fillStyle = "rgba(8, 12, 22, 0.78)";
      ctx.fillRect(0, 0, W, H);
      ctx.font =
        "600 13px 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
      ctx.fillStyle = resolveColor("var(--widget-danger)");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Basis collapsed", W / 2, H / 2 - 14);
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font =
        "400 11px 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
      ctx.fillText("u and v are parallel —", W / 2, H / 2 + 6);
      ctx.fillText("they do not span the plane.", W / 2, H / 2 + 20);
      ctx.textAlign = "start";
    }
  }, [basisU, basisV, target, onDragU, onDragV, onDragTarget, accent, domain, toPx, collapsed]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Drag handling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointerMath = (e: PointerEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      return fromPx({ x: px, y: py });
    };

    const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

    const onDown = (e: PointerEvent) => {
      const m = pointerMath(e);
      const hitRadius = 0.28;
      // Pick the closest handle within the hit radius.
      const candidates: { handle: DragHandle; pos: Vec2 }[] = [];
      if (onDragU) candidates.push({ handle: "u", pos: basisU });
      if (onDragV) candidates.push({ handle: "v", pos: basisV });
      if (onDragTarget) candidates.push({ handle: "target", pos: target });
      let best: DragHandle = null;
      let bestDist = hitRadius;
      for (const c of candidates) {
        const d = distance(m, c.pos);
        if (d < bestDist) {
          bestDist = d;
          best = c.handle;
        }
      }
      if (best) {
        setDragging(best);
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const m = pointerMath(e);
      const clamp = (n: number) =>
        Math.max(-domain + 0.1, Math.min(domain - 0.1, n));
      const v = { x: clamp(m.x), y: clamp(m.y) };
      if (dragging === "u" && onDragU) onDragU(v);
      else if (dragging === "v" && onDragV) onDragV(v);
      else if (dragging === "target" && onDragTarget) onDragTarget(v);
    };
    const onUp = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      setDragging(null);
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
  }, [dragging, basisU, basisV, target, onDragU, onDragV, onDragTarget, fromPx, domain]);

  const draggable = !!(onDragU || onDragV || onDragTarget);

  return (
    <div className={`basis__panel basis__panel--${accent}`}>
      <header className="basis__panel-head">
        <span className="basis__panel-title">{title}</span>
        <span className="basis__panel-subtitle">{subtitle}</span>
      </header>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={`basis__canvas${
          draggable ? " basis__canvas--draggable" : ""
        }`}
        role="img"
        aria-label={`Panel showing ${title}.`}
      />
    </div>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: Vec2,
  head: Vec2,
  color: string,
  label: string | undefined,
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
    const aLen = Math.min(9, len * 0.35);
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
    ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(label, head.x + 6, head.y - 8);
  }
  ctx.restore();
}

function drawHandle(ctx: CanvasRenderingContext2D, p: Vec2, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
