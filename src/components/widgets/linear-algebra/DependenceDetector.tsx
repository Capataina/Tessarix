/**
 * DependenceDetector — multi-select dependency identification game.
 *
 * Used by:
 *   - linear-algebra-span
 *
 * THIS IS A FIND-THEM-ALL QUIZ. 7 vectors are drawn on a single canvas.
 * Some pairs are linearly dependent (one is a scalar multiple of the
 * other — they lie on the same line through the origin); others are
 * independent. The reader clicks pairs of vectors to SELECT them, then
 * submits. The widget grades the full selection: every correctly-found
 * dependent pair scores, every wrongly-selected independent pair costs.
 *
 * Pedagogy: dependence in 2D is a geometric pattern — "two vectors on
 * the same line through the origin." Once the reader sees five vectors
 * at a glance, picking out the dependent pairs is mostly about
 * recognising colinearity. The quiz makes the reader commit to a full
 * judgement before grading, so they cannot succeed by trial-and-error
 * on individual pairs.
 *
 * Scoring:
 *   - Precision: (correct selections) / (total selections)
 *   - Recall: (correct selections) / (total dependent pairs)
 *   - F1 combines them for a single number.
 *
 * Selection mechanism:
 *   - Click a vector to "arm" it. Click another vector to form a pair;
 *     the pair is added to the selection set.
 *   - Click an already-selected pair (in the list below) to remove it.
 *
 * Implements metaphor library §10 (constructive build-up) by having
 * the reader CONSTRUCT a hypothesised dependency graph, plus a quiz
 * scoring layer absent from the existing span widgets.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./DependenceDetector.css";

const CANVAS_SIZE = 360;
const COLLINEAR_EPS = 0.04;

interface Vec2 {
  x: number;
  y: number;
}

interface VectorLabel {
  id: string;
  v: Vec2;
}

interface Round {
  label: string;
  vectors: VectorLabel[];
}

// Each round below is hand-checked: dependent pairs are *exactly* the
// pairs listed in the label. Adding a vector that happens to align with
// an existing one will silently increase the count — keep collinear
// groups to size 2.
const ROUNDS: Round[] = [
  {
    // Dependent pairs: (a,c)=2a, (b,e)=2b, (d,g)=0.5d. Three pairs total.
    label: "Round 1 — three dependent pairs (size-2 collinear groups)",
    vectors: [
      { id: "a", v: { x: 2, y: 1 } },
      { id: "b", v: { x: -1, y: 1.5 } },
      { id: "c", v: { x: 4, y: 2 } }, // 2·a
      { id: "d", v: { x: 1, y: -2 } },
      { id: "e", v: { x: -2, y: 3 } }, // 2·b
      { id: "f", v: { x: 2.5, y: 0.5 } }, // not collinear with anything
      { id: "g", v: { x: 0.5, y: -1 } }, // 0.5·d
    ],
  },
  {
    // Dependent pairs: (a,c)=−a, (b,e)=−2b. Two pairs.
    label: "Round 2 — two pairs, watch for negatives",
    vectors: [
      { id: "a", v: { x: 1, y: 2 } },
      { id: "b", v: { x: 2, y: -1 } },
      { id: "c", v: { x: -1, y: -2 } }, // −1·a
      { id: "d", v: { x: 3, y: 1 } },
      { id: "e", v: { x: -4, y: 2 } }, // −2·b
      { id: "f", v: { x: 0.7, y: 1.7 } }, // not collinear with a (cross=0.7·2−1.7·1=0)? 1.4−1.7=−0.3 → not collinear
    ],
  },
  {
    // Dependent pairs: (a,f)=−1.5a, (b,d)=1.5b. Two pairs in a 7-vector field.
    label: "Round 3 — two pairs hiding in seven vectors",
    vectors: [
      { id: "a", v: { x: 2, y: 0 } },
      { id: "b", v: { x: 1, y: 3 } },
      { id: "c", v: { x: -1, y: 2 } },
      { id: "d", v: { x: 1.5, y: 4.5 } }, // 1.5·b
      { id: "e", v: { x: 0, y: -2 } },
      { id: "f", v: { x: -3, y: 0 } }, // −1.5·a
      { id: "g", v: { x: 2.5, y: -1 } },
    ],
  },
];

/** True iff u and v are linearly dependent (cross-product is near-zero
 *  AND both are non-zero). */
function isDependentPair(u: Vec2, v: Vec2): boolean {
  if (Math.hypot(u.x, u.y) < 0.05 || Math.hypot(v.x, v.y) < 0.05) {
    return true; // zero vector is technically dependent with anything
  }
  return Math.abs(u.x * v.y - u.y * v.x) < COLLINEAR_EPS;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

interface DependenceDetectorProps {
  initialRound?: number;
  onStateChange?: (state: Record<string, number>) => void;
}

export function DependenceDetector({
  initialRound = 0,
  onStateChange,
}: DependenceDetectorProps) {
  const { recordInteraction } = useWidgetTelemetry("DependenceDetector");
  const [roundIdx, setRoundIdx] = useState(initialRound);
  const [armed, setArmed] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const round = ROUNDS[roundIdx];

  // Enumerate all truly-dependent pairs in this round.
  const truePairs = useMemo(() => {
    const out = new Set<string>();
    for (let i = 0; i < round.vectors.length; i++) {
      for (let j = i + 1; j < round.vectors.length; j++) {
        const a = round.vectors[i];
        const b = round.vectors[j];
        if (isDependentPair(a.v, b.v)) {
          out.add(pairKey(a.id, b.id));
        }
      }
    }
    return out;
  }, [round]);

  // Grade.
  const correct = useMemo(() => {
    let n = 0;
    for (const k of selected) if (truePairs.has(k)) n++;
    return n;
  }, [selected, truePairs]);
  const falsePositive = selected.size - correct;
  const missed = truePairs.size - correct;
  const precision = selected.size === 0 ? 0 : correct / selected.size;
  const recall = truePairs.size === 0 ? 1 : correct / truePairs.size;
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      round_index: roundIdx,
      vectors_count: round.vectors.length,
      true_pairs: truePairs.size,
      selected_count: selected.size,
      correct,
      false_positive: falsePositive,
      missed,
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1: Number(f1.toFixed(3)),
      submitted: submitted ? 1 : 0,
    });
  }, [
    roundIdx, round, truePairs, selected.size, correct, falsePositive, missed,
    precision, recall, f1, submitted, onStateChange,
  ]);

  const stateSummary = useMemo(() => {
    const labels = round.vectors.map((vl) => `${vl.id}=(${vl.v.x}, ${vl.v.y})`).join("; ");
    const status = submitted
      ? `Submitted: ${correct} correct / ${selected.size} selected / ${truePairs.size} actual dependent pairs. Precision ${(precision * 100).toFixed(0)}%, recall ${(recall * 100).toFixed(0)}%, F1 ${f1.toFixed(2)}.`
      : `Not yet submitted. Reader has selected ${selected.size} pair${selected.size === 1 ? "" : "s"} so far.`;
    return `Dependence Detector, ${round.label}. Vectors: ${labels}. ${status}`;
  }, [round, submitted, correct, selected.size, truePairs.size, precision, recall, f1]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        round: roundIdx,
        selected: Array.from(selected).sort(),
        submitted,
      }),
    [roundIdx, selected, submitted],
  );

  const handleClickVector = useCallback(
    (id: string) => {
      if (submitted) return;
      if (armed === null) {
        setArmed(id);
        recordInteraction("arm", { vector: id });
        return;
      }
      if (armed === id) {
        setArmed(null);
        return;
      }
      const k = pairKey(armed, id);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
      recordInteraction("toggle_pair", { pair: k });
      setArmed(null);
    },
    [armed, submitted, recordInteraction],
  );

  const handleRemovePair = useCallback(
    (k: string) => {
      if (submitted) return;
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
      recordInteraction("remove_pair", { pair: k });
    },
    [submitted, recordInteraction],
  );

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    recordInteraction("submit", {
      selected: selected.size,
      correct,
      false_positive: falsePositive,
      missed,
    });
  }, [selected.size, correct, falsePositive, missed, recordInteraction]);

  const handleReset = useCallback(() => {
    setSelected(new Set());
    setSubmitted(false);
    setArmed(null);
    recordInteraction("reset");
  }, [recordInteraction]);

  const handleRound = useCallback(
    (idx: number) => {
      setRoundIdx(idx);
      setSelected(new Set());
      setSubmitted(false);
      setArmed(null);
      recordInteraction("round", { round: idx });
    },
    [recordInteraction],
  );

  const allCorrect = submitted && correct === truePairs.size && falsePositive === 0;

  return (
    <div className={`dd${allCorrect ? " dd--solved" : ""}`}>
      <header className="dd__head">
        <div className="dd__heading">
          <span className="dd__heading-label">ROUND</span>
          <span className="dd__heading-value">{round.label}</span>
        </div>
        <div className="dd__heading">
          <span className="dd__heading-label">SELECTED</span>
          <span className="dd__heading-value">
            {selected.size} pair{selected.size === 1 ? "" : "s"}
          </span>
        </div>
        <div className="dd__heading">
          <span className="dd__heading-label">DEPENDENT PAIRS</span>
          <span className="dd__heading-value">
            {submitted ? `${truePairs.size} actual` : "hidden until submit"}
          </span>
        </div>
      </header>

      <DetectorCanvas
        vectors={round.vectors}
        selected={selected}
        armed={armed}
        truePairs={truePairs}
        submitted={submitted}
        onClickVector={handleClickVector}
      />

      <div className="dd__selection-strip">
        <span className="dd__selection-label">YOUR SELECTIONS</span>
        {selected.size === 0 && (
          <span className="dd__selection-empty">
            Click two vectors on the canvas to pair them.
            {armed && ` Armed: ${armed}. Click a second vector.`}
          </span>
        )}
        {Array.from(selected).map((k) => {
          const verdict = submitted
            ? truePairs.has(k)
              ? "correct"
              : "wrong"
            : "neutral";
          return (
            <button
              key={k}
              type="button"
              className={`dd__chip dd__chip--${verdict}`}
              onClick={() => handleRemovePair(k)}
              disabled={submitted}
              title={submitted ? "" : "Click to remove from selection"}
            >
              {k.replace("-", " ↔ ")}
              {verdict === "correct" && " ✓"}
              {verdict === "wrong" && " ✗"}
            </button>
          );
        })}
      </div>

      <div className="dd__actions">
        <button
          type="button"
          className="dd__submit"
          onClick={handleSubmit}
          disabled={submitted || selected.size === 0}
        >
          Submit selections
        </button>
        <button type="button" className="dd__btn" onClick={handleReset}>
          Reset
        </button>
        <div className="dd__round-row">
          {ROUNDS.map((r, i) => (
            <button
              key={r.label}
              type="button"
              className={`dd__round-pick${i === roundIdx ? " dd__round-pick--active" : ""}`}
              onClick={() => handleRound(i)}
            >
              {`R${i + 1}`}
            </button>
          ))}
        </div>
      </div>

      {submitted && (
        <div className={`dd__verdict dd__verdict--${allCorrect ? "win" : missed > 0 || falsePositive > 0 ? "partial" : "win"}`}>
          <span className="dd__verdict-label">Result</span>
          <span className="dd__verdict-value">
            {allCorrect &&
              `✓ Perfect. Found all ${truePairs.size} dependent pair${truePairs.size === 1 ? "" : "s"}, no false positives. F1 = 1.00.`}
            {!allCorrect &&
              `${correct} correct out of ${truePairs.size} dependent pairs (recall ${(recall * 100).toFixed(0)}%). ${falsePositive} false positive${falsePositive === 1 ? "" : "s"} (precision ${(precision * 100).toFixed(0)}%). Missed pairs are marked yellow on the canvas; wrong selections marked red.`}
          </span>
        </div>
      )}

      <div className="dd__instructions">
        <strong>How to play.</strong> Each vector is labelled a, b, c… Click a vector to <em>arm</em> it, then click a second vector to mark the pair. Repeat for every pair you think is linearly dependent — i.e. lying on the same line through the origin. Hit <em>Submit</em> when ready. The widget will reveal which pairs were actually dependent and grade your selection.
      </div>

      <WidgetExplainer
        widgetName="Dependence Detector — find every dependent pair"
        widgetDescription="A find-them-all quiz widget for linear dependence. Six or seven vectors are drawn on a single canvas (each labelled a, b, c, …). Some pairs are linearly dependent (one is a scalar multiple of the other — colinear through the origin); others are independent. The reader clicks two vectors to mark them as a hypothesised-dependent pair, then iterates to mark every such pair. On submit, the widget grades the full selection: each correctly-found dependent pair counts toward recall; each falsely-selected independent pair degrades precision. F1 combines them. The pedagogical goal is to make the reader recognise dependence as a visual pattern (two vectors on the same line through the origin), with the multi-select interaction forcing a commitment before grading rather than letting them trial-and-error individual pairs."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface DetectorCanvasProps {
  vectors: VectorLabel[];
  selected: Set<string>;
  armed: string | null;
  truePairs: Set<string>;
  submitted: boolean;
  onClickVector: (id: string) => void;
}

function DetectorCanvas({
  vectors,
  selected,
  armed,
  truePairs,
  submitted,
  onClickVector,
}: DetectorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const domain = useMemo(() => {
    return computeDomain(vectors.map((vl) => vl.v), {
      padding: 1.4,
      floor: 3,
      ceiling: 7,
    });
  }, [vectors]);

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);

  // Build click-target lookup.
  const tips = useMemo(
    () =>
      vectors.map((vl) => ({
        id: vl.id,
        v: vl.v,
        px: toPx(vl.v),
      })),
    [vectors, toPx],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_TEXT = resolveColor("var(--widget-text)");
    const C_OK = resolveColor("var(--widget-success)");
    const C_BAD = resolveColor("var(--widget-danger)");
    const C_WARN = resolveColor("var(--widget-warn)");
    const C_ACCENT = resolveColor("var(--widget-accent)");

    // Grid + axes.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
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

    // After submit, draw dashed dependency lines for each true pair so the
    // reader can visually verify why each pair was dependent.
    if (submitted) {
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 6]);
      for (const k of truePairs) {
        const [aId, bId] = k.split("-");
        const a = tips.find((t) => t.id === aId);
        const b = tips.find((t) => t.id === bId);
        if (!a || !b) continue;
        const wasSelected = selected.has(k);
        ctx.strokeStyle = wasSelected
          ? resolveColorAlpha("var(--widget-success)", 0.7)
          : resolveColorAlpha("var(--widget-warn)", 0.85);
        // Draw the line through the origin (extended both directions).
        const dir = a.v;
        const dirLen = Math.hypot(dir.x, dir.y);
        if (dirLen < 0.05) continue;
        const ext = domain * 1.4;
        const norm = { x: dir.x / dirLen, y: dir.y / dirLen };
        const start = toPx({ x: -ext * norm.x, y: -ext * norm.y });
        const end = toPx({ x: ext * norm.x, y: ext * norm.y });
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Vectors.
    const originPx = toPx({ x: 0, y: 0 });
    for (const t of tips) {
      // Determine colour based on submitted state and membership.
      let color = C_ACCENT;
      if (submitted) {
        // Check whether this vector participates in any truePair that the user got right / wrong.
        let participatesCorrect = false;
        let participatesWrong = false;
        for (const k of selected) {
          if (k.includes(t.id)) {
            if (truePairs.has(k)) participatesCorrect = true;
            else participatesWrong = true;
          }
        }
        if (participatesWrong) color = C_BAD;
        else if (participatesCorrect) color = C_OK;
        else color = C_TEXT;
      } else if (t.id === armed) {
        color = C_WARN;
      }

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(originPx.x, originPx.y);
      ctx.lineTo(t.px.x, t.px.y);
      ctx.stroke();
      // Arrowhead.
      const dx = t.px.x - originPx.x;
      const dy = t.px.y - originPx.y;
      const len = Math.hypot(dx, dy);
      if (len > 5) {
        const ang = Math.atan2(dy, dx);
        const aLen = Math.min(9, len * 0.3);
        ctx.beginPath();
        ctx.moveTo(t.px.x, t.px.y);
        ctx.lineTo(
          t.px.x - aLen * Math.cos(ang - Math.PI / 6),
          t.px.y - aLen * Math.sin(ang - Math.PI / 6),
        );
        ctx.lineTo(
          t.px.x - aLen * Math.cos(ang + Math.PI / 6),
          t.px.y - aLen * Math.sin(ang + Math.PI / 6),
        );
        ctx.closePath();
        ctx.fill();
      }
      // Tip handle for clickability.
      ctx.beginPath();
      ctx.arc(t.px.x, t.px.y, t.id === armed ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Label.
      ctx.font = "600 12px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillStyle = color;
      ctx.fillText(t.id, t.px.x + 9, t.px.y - 9);
    }

    // Origin.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(originPx.x, originPx.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [tips, armed, selected, truePairs, submitted, toPx, domain]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      // Find nearest tip within hit radius.
      let best: { id: string; d: number } | null = null;
      for (const t of tips) {
        const d = Math.hypot(t.px.x - px, t.px.y - py);
        if (d < 20 && (!best || d < best.d)) best = { id: t.id, d };
      }
      if (best) onClickVector(best.id);
    };
    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  }, [tips, onClickVector]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="dd__canvas"
      role="img"
      aria-label="Dependence Detector canvas with multiple labelled vectors."
    />
  );
}
