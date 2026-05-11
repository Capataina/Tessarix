import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor } from "../../lib/theme";
import { WidgetExplainer } from "./WidgetExplainer";
import "./VectorPlot.css";

/**
 * Interactive 2D vector plot. The reader can drag each vector's tip directly
 * on the plot. Useful for: components, magnitude/direction, vector addition,
 * dot product geometry, projection onto another vector.
 *
 * The widget supports up to 3 vectors and optionally draws their head-to-tail
 * sum (when `showSum` is true).
 */

const CANVAS_SIZE = 320;
const DOMAIN = 5;

interface Vector2 {
  x: number;
  y: number;
}

interface VectorPlotProps {
  /** Initial vectors. Reader can drag any of them. */
  initial: { id: string; v: Vector2; label?: string; color?: string }[];
  /** Show a head-to-tail sum chain (a + b + c). */
  showSum?: boolean;
  /** Lock the second/third vectors (only the first is draggable). */
  lockTail?: boolean;
  /** Optional callback receiving the current vector state on every change. */
  onStateChange?: (state: Record<string, number>) => void;
  /** Widget-explainer overrides so callers can mount the right LLM context. */
  widgetName?: string;
  widgetDescription?: string;
}

const DEFAULT_COLORS = [
  "var(--widget-chart-1)",
  "var(--widget-chart-2)",
  "var(--widget-chart-3)",
];

export function VectorPlot({
  initial,
  showSum,
  lockTail,
  onStateChange,
  widgetName = "Vector plot",
  widgetDescription = "Interactive 2D vector field. Drag each vector's tip to manipulate its components; readouts show the components, magnitude, and direction.",
}: VectorPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [vectors, setVectors] = useState(
    initial.map((v, i) => ({
      ...v,
      color: v.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    })),
  );
  const draggingRef = useRef<number | null>(null);

  // Convert plot coordinates ↔ canvas pixels.
  const toPx = useCallback((p: Vector2) => {
    return {
      x: (CANVAS_SIZE / 2) + (p.x / DOMAIN) * (CANVAS_SIZE / 2),
      y: (CANVAS_SIZE / 2) - (p.y / DOMAIN) * (CANVAS_SIZE / 2),
    };
  }, []);

  const fromPx = useCallback((px: { x: number; y: number }): Vector2 => {
    return {
      x: ((px.x - CANVAS_SIZE / 2) / (CANVAS_SIZE / 2)) * DOMAIN,
      y: -((px.y - CANVAS_SIZE / 2) / (CANVAS_SIZE / 2)) * DOMAIN,
    };
  }, []);

  // Redraw on every state change. Pure rendering; no animation.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    // Grid.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const step = W / (2 * DOMAIN);
    for (let i = 0; i <= 2 * DOMAIN; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(W, i * step);
      ctx.stroke();
    }

    // Axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Origin marker.
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Resolve theme tokens (canvas can't parse `var(...)`).
    const C_SUCCESS = resolveColor("var(--widget-success)");
    const C_TEXT = resolveColor("var(--widget-text)");

    // Head-to-tail sum chain.
    if (showSum && vectors.length > 1) {
      let tailX = 0;
      let tailY = 0;
      for (const vec of vectors) {
        const tail = toPx({ x: tailX, y: tailY });
        const head = toPx({ x: tailX + vec.v.x, y: tailY + vec.v.y });
        drawArrow(ctx, tail, head, resolveColor(vec.color), 1.5, true);
        tailX += vec.v.x;
        tailY += vec.v.y;
      }
      // Resultant in a distinct style.
      const tail = toPx({ x: 0, y: 0 });
      const head = toPx({ x: tailX, y: tailY });
      drawArrow(ctx, tail, head, C_SUCCESS, 2.6, false);
    }

    // Each vector at the origin.
    for (const vec of vectors) {
      if (showSum) continue; // already drawn above
      const tail = toPx({ x: 0, y: 0 });
      const head = toPx(vec.v);
      drawArrow(ctx, tail, head, resolveColor(vec.color), 2.4, false);
    }

    // Draggable tip handles.
    for (let i = 0; i < vectors.length; i++) {
      if (lockTail && i > 0) continue;
      const headBase = showSum
        ? sumPrefix(vectors, i + 1)
        : vectors[i].v;
      const head = toPx(headBase);
      ctx.fillStyle = resolveColor(vectors[i].color);
      ctx.strokeStyle = C_TEXT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [vectors, showSum, lockTail, toPx]);

  // Emit state changes to optional listener.
  useEffect(() => {
    if (!onStateChange) return;
    const flat: Record<string, number> = {};
    vectors.forEach((v) => {
      flat[`${v.id}_x`] = v.v.x;
      flat[`${v.id}_y`] = v.v.y;
      flat[`${v.id}_mag`] = Math.hypot(v.v.x, v.v.y);
    });
    if (showSum) {
      const sum = vectors.reduce(
        (acc, v) => ({ x: acc.x + v.v.x, y: acc.y + v.v.y }),
        { x: 0, y: 0 },
      );
      flat.sum_x = sum.x;
      flat.sum_y = sum.y;
      flat.sum_mag = Math.hypot(sum.x, sum.y);
    }
    onStateChange(flat);
  }, [vectors, showSum, onStateChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      // Hit-test each handle, pick the nearest within 14 px.
      let bestIdx = -1;
      let bestDist = 14;
      for (let i = 0; i < vectors.length; i++) {
        if (lockTail && i > 0) continue;
        const headBase = showSum
          ? sumPrefix(vectors, i + 1)
          : vectors[i].v;
        const head = toPx(headBase);
        const d = Math.hypot(head.x - px.x, head.y - px.y);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        draggingRef.current = bestIdx;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [vectors, lockTail, showSum, toPx],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (draggingRef.current === null) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      const idx = draggingRef.current;
      setVectors((prev) => {
        const next = [...prev];
        if (showSum) {
          // The handle sits at the cumulative head. To get this vector's
          // component contribution, subtract the cumulative head BEFORE
          // this vector from the new pointer position.
          const head = fromPx(px);
          const before = sumPrefix(prev, idx);
          next[idx] = {
            ...next[idx],
            v: { x: head.x - before.x, y: head.y - before.y },
          };
        } else {
          next[idx] = { ...next[idx], v: fromPx(px) };
        }
        return next;
      });
    },
    [showSum, fromPx],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [],
  );

  const stateSummary = useMemo(() => {
    return vectors
      .map((v) => {
        const mag = Math.hypot(v.v.x, v.v.y);
        const angleDeg = (Math.atan2(v.v.y, v.v.x) * 180) / Math.PI;
        return `${v.label ?? v.id} = (${v.v.x.toFixed(2)}, ${v.v.y.toFixed(2)}), magnitude = ${mag.toFixed(2)}, angle = ${angleDeg.toFixed(1)}°`;
      })
      .join("; ");
  }, [vectors]);

  const stateKey = useMemo(
    () =>
      JSON.stringify(
        vectors.map((v) => [
          Number(v.v.x.toFixed(2)),
          Number(v.v.y.toFixed(2)),
        ]),
      ),
    [vectors],
  );

  return (
    <div className="vec-plot">
      <div className="vec-plot__chart-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="vec-plot__canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="application"
          aria-label="2D vector plot. Drag vector tips to manipulate components."
        />
        <div className="vec-plot__hint" aria-hidden>
          Drag any tip dot to move that vector
        </div>
      </div>

      <div className="vec-plot__readouts">
        {vectors.map((v) => (
          <div key={v.id} className="vec-plot__readout">
            <span
              className="vec-plot__readout-swatch"
              style={{ background: v.color }}
            />
            <span className="vec-plot__readout-label">
              {v.label ?? v.id}
            </span>
            <span className="vec-plot__readout-values">
              <span>
                ({v.v.x.toFixed(2)}, {v.v.y.toFixed(2)})
              </span>
              <span className="vec-plot__readout-aux">
                |·| = {Math.hypot(v.v.x, v.v.y).toFixed(2)}
              </span>
            </span>
          </div>
        ))}
        {showSum && (
          <div className="vec-plot__readout vec-plot__readout--sum">
            <span
              className="vec-plot__readout-swatch"
              style={{ background: "var(--widget-success)" }}
            />
            <span className="vec-plot__readout-label">sum</span>
            <span className="vec-plot__readout-values">
              {(() => {
                const sum = vectors.reduce(
                  (a, v) => ({ x: a.x + v.v.x, y: a.y + v.v.y }),
                  { x: 0, y: 0 },
                );
                return (
                  <>
                    <span>
                      ({sum.x.toFixed(2)}, {sum.y.toFixed(2)})
                    </span>
                    <span className="vec-plot__readout-aux">
                      |·| = {Math.hypot(sum.x, sum.y).toFixed(2)}
                    </span>
                  </>
                );
              })()}
            </span>
          </div>
        )}
      </div>

      <WidgetExplainer
        widgetName={widgetName}
        widgetDescription={widgetDescription}
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  tail: { x: number; y: number },
  head: { x: number; y: number },
  color: string,
  width: number,
  dashed: boolean,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Arrowhead.
  const ang = Math.atan2(head.y - tail.y, head.x - tail.x);
  const len = 9;
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(
    head.x - len * Math.cos(ang - Math.PI / 6),
    head.y - len * Math.sin(ang - Math.PI / 6),
  );
  ctx.lineTo(
    head.x - len * Math.cos(ang + Math.PI / 6),
    head.y - len * Math.sin(ang + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function sumPrefix(
  vectors: { v: Vector2 }[],
  upToExclusive: number,
): Vector2 {
  let x = 0;
  let y = 0;
  for (let i = 0; i < upToExclusive; i++) {
    x += vectors[i].v.x;
    y += vectors[i].v.y;
  }
  return { x, y };
}
