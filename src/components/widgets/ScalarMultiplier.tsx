import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../lib/geometry";
import { WidgetExplainer } from "./WidgetExplainer";
import "./ScalarMultiplier.css";

/**
 * Interactive scalar-multiplication visualisation.
 *
 * Two modes:
 *   - **Stretch**: the canonical "k scales the vector" view — the original
 *     vector v plus the scaled kv drawn at the same origin, the latter in
 *     a distinct colour.
 *   - **Stacking**: makes scalar multiplication's geometric meaning
 *     concrete by drawing |k| copies of v head-to-tail (or -v for k<0).
 *     Fractional k draws ⌊|k|⌋ full copies plus a partial copy with
 *     reduced opacity. This is the operation's *definition* for integer
 *     k — kv = v + v + ... + v — visually realised.
 *
 * The reader drags the tip of v directly to set the base vector; a slider
 * controls k. Plot also shows magnitude, direction, and a clear "flipped"
 * badge when k < 0.
 */

const CANVAS_SIZE = 360;

interface Vector2 {
  x: number;
  y: number;
}

interface ScalarMultiplierProps {
  initialVector?: Vector2;
  initialK?: number;
  onStateChange?: (state: Record<string, number>) => void;
}

export function ScalarMultiplier({
  initialVector = { x: 1.2, y: 0.8 },
  initialK = 2,
  onStateChange,
}: ScalarMultiplierProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);
  const [v, setV] = useState<Vector2>(initialVector);
  const [k, setK] = useState(initialK);
  const [mode, setMode] = useState<"stretch" | "stacking">("stacking");

  // Dynamic viewport — fits both v and the cumulative kv endpoint regardless
  // of mode (stacking puts the final point at k·v just like stretch does).
  const domain = useMemo(() => {
    const points: Vector2[] = [v, { x: k * v.x, y: k * v.y }];
    return computeDomain(points, { padding: 1.35, floor: 1.8, ceiling: 9 });
  }, [v, k]);

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);
  const fromPx = useMemo(() => makeFromPx(CANVAS_SIZE, domain), [domain]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_V = resolveColor("var(--widget-chart-1)");
    const C_KV = resolveColor("var(--widget-warn)");
    const C_FLIP = resolveColor("var(--widget-chart-2)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_TEXT_DIM = resolveColor("var(--widget-text-dim)");

    // Grid.
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

    // Axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    const oPx = toPx({ x: 0, y: 0 });
    const vPx = toPx(v);
    const kvPx = toPx({ x: k * v.x, y: k * v.y });
    const flipped = k < 0;
    const kvColor = flipped ? C_FLIP : C_KV;

    if (mode === "stretch") {
      // kv drawn first so v sits on top of kv at the shared base.
      drawArrow(ctx, oPx, kvPx, kvColor, 3, k === 0 ? "0" : null);
      // Original v in its base colour.
      drawArrow(ctx, oPx, vPx, C_V, 2.4, "v");
    } else {
      // Stacking mode. For positive k, stack ⌊k⌋ copies of v head-to-tail
      // plus a (k - ⌊k⌋) partial copy at the end. For negative k, same
      // with |k| copies of -v.
      const sign = k >= 0 ? 1 : -1;
      const absK = Math.abs(k);
      const wholeCount = Math.floor(absK + 1e-9);
      const frac = absK - wholeCount;
      const unit = { x: sign * v.x, y: sign * v.y };

      let cumX = 0;
      let cumY = 0;
      for (let i = 0; i < wholeCount; i++) {
        const tail = toPx({ x: cumX, y: cumY });
        cumX += unit.x;
        cumY += unit.y;
        const head = toPx({ x: cumX, y: cumY });
        drawArrow(ctx, tail, head, kvColor, 2.6, null);
        // Index label at the midpoint of each segment.
        const mid = { x: (tail.x + head.x) / 2, y: (tail.y + head.y) / 2 };
        ctx.fillStyle = C_TEXT_DIM;
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), mid.x + 10, mid.y - 10);
      }
      if (frac > 1e-3) {
        const tail = toPx({ x: cumX, y: cumY });
        cumX += frac * unit.x;
        cumY += frac * unit.y;
        const head = toPx({ x: cumX, y: cumY });
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawArrow(ctx, tail, head, kvColor, 2.4, null);
        ctx.restore();
      }
      // Faded "original v" reference at the origin so the reader keeps
      // sight of the building block.
      ctx.save();
      ctx.globalAlpha = 0.35;
      drawArrow(ctx, oPx, vPx, C_V, 2.4, "v");
      ctx.restore();
      // The cumulative end gets the brighter "k·v" badge.
      const finalPx = toPx({ x: cumX, y: cumY });
      ctx.fillStyle = kvColor;
      ctx.font = "600 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${k.toFixed(2)} · v`, finalPx.x + 24, finalPx.y - 12);
    }

    // Draggable tip handle on v.
    ctx.fillStyle = C_V;
    ctx.strokeStyle = C_TEXT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(vPx.x, vPx.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Light fill on kv tip too (non-draggable, just a marker).
    if (mode === "stretch" && k !== 0) {
      ctx.fillStyle = resolveColorAlpha(
        flipped ? "var(--widget-chart-2)" : "var(--widget-warn)",
        0.55,
      );
      ctx.beginPath();
      ctx.arc(kvPx.x, kvPx.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [v, k, mode, toPx]);

  useEffect(() => {
    if (!onStateChange) return;
    const mag = Math.hypot(v.x, v.y);
    onStateChange({
      v_x: v.x,
      v_y: v.y,
      v_mag: mag,
      k,
      kv_x: k * v.x,
      kv_y: k * v.y,
      kv_mag: Math.abs(k) * mag,
      flipped: k < 0 ? 1 : 0,
    });
  }, [v, k, onStateChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      const vPx = toPx(v);
      if (Math.hypot(vPx.x - px.x, vPx.y - px.y) < 16) {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [v, toPx],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
      setV(fromPx(px));
    },
    [fromPx],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [],
  );

  const stateSummary = useMemo(() => {
    const vMag = Math.hypot(v.x, v.y);
    const kvMag = Math.abs(k) * vMag;
    const dir = k > 0 ? "same as v" : k < 0 ? "opposite to v" : "zero vector";
    return `v = (${v.x.toFixed(2)}, ${v.y.toFixed(2)}), magnitude $|v| = ${vMag.toFixed(2)}$. Scalar $k = ${k.toFixed(2)}$. Scaled vector $kv = (${(k * v.x).toFixed(2)}, ${(k * v.y).toFixed(2)})$, magnitude $|kv| = ${kvMag.toFixed(2)}$, direction ${dir}.`;
  }, [v, k]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        v: [Number(v.x.toFixed(2)), Number(v.y.toFixed(2))],
        k: Number(k.toFixed(2)),
        mode,
      }),
    [v, k, mode],
  );

  const presets = [
    { label: "k = 2", k: 2 },
    { label: "k = 0.5", k: 0.5 },
    { label: "k = 0", k: 0 },
    { label: "k = −1", k: -1 },
    { label: "k = −2", k: -2 },
    { label: "k = 3", k: 3 },
  ];

  const vMag = Math.hypot(v.x, v.y);
  const kvMag = Math.abs(k) * vMag;

  return (
    <div className="scalar-mult">
      <div className="scalar-mult__layout">
        <div className="scalar-mult__chart-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="scalar-mult__canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="application"
            aria-label="Scalar multiplication. Drag the tip of v to change the base vector; the scaled k·v updates live."
          />
          <div className="scalar-mult__hint" aria-hidden>
            Drag v's tip to change it
          </div>
        </div>

        <div className="scalar-mult__panel">
          <div className="scalar-mult__mode">
            <span className="scalar-mult__mode-label">View as</span>
            <div className="scalar-mult__mode-options" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={mode === "stacking"}
                className={`scalar-mult__mode-option ${mode === "stacking" ? "scalar-mult__mode-option--active" : ""}`}
                onClick={() => setMode("stacking")}
              >
                Stacked copies
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "stretch"}
                className={`scalar-mult__mode-option ${mode === "stretch" ? "scalar-mult__mode-option--active" : ""}`}
                onClick={() => setMode("stretch")}
              >
                Single stretched arrow
              </button>
            </div>
            <p className="scalar-mult__mode-explain">
              {mode === "stacking"
                ? "k·v drawn as |k| copies of v head-to-tail (or −v for k < 0). For non-integer k, a partial copy completes the chain. This is what kv = v + v + ... + v means."
                : "k·v drawn as a single arrow from the origin, stretched (or flipped) relative to v. The simpler picture; loses the iterated-addition meaning."}
            </p>
          </div>

          <div className="scalar-mult__k-slider">
            <div className="scalar-mult__k-row">
              <span className="scalar-mult__k-label">
                <em>k</em>
              </span>
              <span className="scalar-mult__k-value">{k.toFixed(2)}</span>
              {k < 0 && (
                <span className="scalar-mult__k-flag">flipped</span>
              )}
              {k === 0 && (
                <span className="scalar-mult__k-flag scalar-mult__k-flag--zero">
                  zero vector
                </span>
              )}
            </div>
            <input
              type="range"
              min={-3}
              max={3}
              step={0.1}
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="scalar-mult__slider"
            />
          </div>

          <div className="scalar-mult__presets">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`scalar-mult__preset ${Math.abs(k - p.k) < 0.01 ? "scalar-mult__preset--active" : ""}`}
                onClick={() => setK(p.k)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="scalar-mult__readout">
            <div className="scalar-mult__readout-row">
              <span className="scalar-mult__readout-label">
                |v|
              </span>
              <span className="scalar-mult__readout-value">
                {vMag.toFixed(3)}
              </span>
            </div>
            <div className="scalar-mult__readout-row">
              <span className="scalar-mult__readout-label">
                |k·v|
              </span>
              <span className="scalar-mult__readout-value">
                {kvMag.toFixed(3)}
              </span>
              <span className="scalar-mult__readout-aux">
                = |k| · |v| = {Math.abs(k).toFixed(2)} × {vMag.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <WidgetExplainer
        widgetName="Scalar multiplication — stacking & stretch views"
        widgetDescription="Interactive scalar multiplication. The reader drags v's tip; a slider sets the scalar k. Two view modes: 'stacked copies' draws k·v as |k| copies of v head-to-tail (the iterated-addition meaning of scalar multiplication), and 'single stretched arrow' draws k·v as one arrow at the same origin. Both modes show how k changes magnitude and direction; negative k flips orientation."
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
  label: string | null,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const len = Math.hypot(dx, dy);
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  // Arrowhead only when there's enough length.
  if (len > 6) {
    const ang = Math.atan2(dy, dx);
    const aLen = Math.min(10, len * 0.5);
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
  } else if (len <= 1) {
    // Degenerate / zero arrow — draw a small dot so the reader sees that
    // k·v has collapsed.
    ctx.beginPath();
    ctx.arc(tail.x, tail.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (label) {
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(label, head.x + 6, head.y - 8);
  }
  ctx.restore();
}
