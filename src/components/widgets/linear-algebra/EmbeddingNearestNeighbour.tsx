/**
 * EmbeddingNearestNeighbour — high-dim simulator in 2D.
 *
 * Used by:
 *   - linear-algebra-dot-product
 *
 * THIS IS A PREDICT-THEN-REVEAL QUIZ for cosine similarity. 30 colored
 * "fake embedding" points are scattered across a 2D plane, grouped into
 * a few semantic clusters (the colour is the cluster). The reader picks
 * a query point and is asked: WHICH THREE POINTS DO YOU THINK ARE THE
 * NEAREST NEIGHBOURS BY COSINE SIMILARITY?
 *
 * The reader clicks 3 points (their guesses); on Reveal the widget
 * shows the true top-3 by cosine similarity (largest a·b/|a||b|) and
 * scores by overlap.
 *
 * Pedagogical lift:
 *   1. Cosine similarity in low-D is mostly about direction agreement
 *      — distance and magnitude don't dominate.
 *   2. High-D embeddings (CLIP, BERT, OpenAI's text-embedding-3, etc.)
 *      work the same way conceptually — the geometric reasoning carries
 *      over even though we can't draw the 512-D plot.
 *   3. The reader's 2D eyeballing reveals where their intuition fails:
 *      a point that LOOKS close (Euclidean) may have low cosine
 *      similarity if it's at a different angle from the origin.
 *
 * Mechanic detail:
 *   - The query point is itself one of the embeddings (the reader picks
 *     it from the scatter). Cosine similarity to itself is excluded
 *     from the top-3.
 *   - Hover shows the cosine similarity to each point — but only AFTER
 *     reveal, so the reader's prediction has to come from eye geometry.
 *   - Distractor points are positioned so the closest-by-EUCLIDEAN
 *     differs from closest-by-COSINE for at least one query — making
 *     the "direction not distance" lesson tangible.
 *
 * Implements metaphor library §10 (constructive build-up) inverted: the
 * reader has 30 component points and must SELECT the right subset
 * matching the cosine-similarity criterion.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveColor, resolveColorAlpha } from "../../../lib/theme";
import { computeDomain, makeFromPx, makeToPx } from "../../../lib/geometry";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./EmbeddingNearestNeighbour.css";

const CANVAS_SIZE = 380;
const TOP_K = 3;

interface Vec2 {
  x: number;
  y: number;
}

interface EmbeddingPoint {
  id: number;
  pos: Vec2;
  cluster: number; // 0..4 — paints colour
  label: string;
}

/** Five clusters, ~6 points each, deterministic so the page renders
 *  identically across reloads (testability + reproducibility). */
function buildScatter(): EmbeddingPoint[] {
  // Cluster centres roughly at five angles around the origin (so cosine
  // similarity within a cluster is high). Each cluster gets ~6 points
  // with small radial jitter — keeping them in roughly the same
  // direction but with varying magnitude.
  const clusterAngles = [
    25 * (Math.PI / 180),
    95 * (Math.PI / 180),
    165 * (Math.PI / 180),
    -125 * (Math.PI / 180),
    -55 * (Math.PI / 180),
  ];
  const clusterLabels = ["animals", "vehicles", "food", "places", "tools"];

  // Hand-crafted jitter values (pseudo-random but fully deterministic).
  const jitterTable = [
    0.12, -0.18, 0.07, 0.22, -0.13, 0.05,
    0.18, -0.09, 0.21, -0.06, 0.11, -0.2,
    -0.05, 0.16, -0.22, 0.09, 0.19, -0.15,
    0.04, -0.11, 0.23, -0.17, 0.08, 0.14,
    -0.21, 0.13, -0.06, 0.18, -0.1, 0.05,
  ];
  const magTable = [
    2.4, 2.8, 1.9, 2.1, 3.2, 2.6,
    1.6, 3.0, 2.3, 2.5, 1.8, 3.4,
    2.7, 2.1, 1.5, 2.9, 3.1, 2.4,
    2.0, 2.6, 1.7, 3.3, 2.2, 2.8,
    2.5, 1.9, 3.0, 2.3, 2.7, 2.1,
  ];

  const points: EmbeddingPoint[] = [];
  let id = 0;
  for (let c = 0; c < clusterAngles.length; c++) {
    const base = clusterAngles[c];
    for (let i = 0; i < 6; i++) {
      const ang = base + jitterTable[c * 6 + i] * 1.2;
      const mag = magTable[c * 6 + i];
      points.push({
        id: id++,
        pos: { x: mag * Math.cos(ang), y: mag * Math.sin(ang) },
        cluster: c,
        label: `${clusterLabels[c]}#${i}`,
      });
    }
  }
  return points;
}

function cosineSim(u: Vec2, v: Vec2): number {
  const mu = Math.hypot(u.x, u.y);
  const mv = Math.hypot(v.x, v.y);
  if (mu < 1e-6 || mv < 1e-6) return 0;
  return (u.x * v.x + u.y * v.y) / (mu * mv);
}

function topKByCosine(
  query: EmbeddingPoint,
  all: EmbeddingPoint[],
  k: number,
): EmbeddingPoint[] {
  return all
    .filter((p) => p.id !== query.id)
    .map((p) => ({ p, sim: cosineSim(query.pos, p.pos) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, k)
    .map((x) => x.p);
}

function topKByEuclidean(
  query: EmbeddingPoint,
  all: EmbeddingPoint[],
  k: number,
): EmbeddingPoint[] {
  return all
    .filter((p) => p.id !== query.id)
    .map((p) => ({
      p,
      d: Math.hypot(query.pos.x - p.pos.x, query.pos.y - p.pos.y),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((x) => x.p);
}

interface EmbeddingNearestNeighbourProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function EmbeddingNearestNeighbour({
  onStateChange,
}: EmbeddingNearestNeighbourProps) {
  const { recordInteraction } = useWidgetTelemetry("EmbeddingNearestNeighbour");
  const points = useMemo(() => buildScatter(), []);

  // Three phases: pick-query, guess, revealed.
  const [queryId, setQueryId] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);

  const query = useMemo(
    () => (queryId === null ? null : points.find((p) => p.id === queryId) ?? null),
    [queryId, points],
  );
  const trueTop = useMemo(
    () => (query ? topKByCosine(query, points, TOP_K) : []),
    [query, points],
  );
  const trueEuclidean = useMemo(
    () => (query ? topKByEuclidean(query, points, TOP_K) : []),
    [query, points],
  );
  const trueTopIds = useMemo(() => new Set(trueTop.map((p) => p.id)), [trueTop]);
  const correctGuesses = guesses.filter((g) => trueTopIds.has(g)).length;
  const phase: "pick-query" | "guess" | "revealed" =
    query === null ? "pick-query" : revealed ? "revealed" : "guess";

  const handlePoint = useCallback(
    (id: number) => {
      if (phase === "pick-query") {
        setQueryId(id);
        recordInteraction("pick_query", { id });
      } else if (phase === "guess") {
        if (id === queryId) return; // can't guess the query
        if (guesses.includes(id)) {
          // toggle off
          setGuesses((prev) => prev.filter((g) => g !== id));
          recordInteraction("unguess", { id });
        } else if (guesses.length < TOP_K) {
          setGuesses((prev) => [...prev, id]);
          recordInteraction("guess", { id, n: guesses.length + 1 });
        }
      }
    },
    [phase, queryId, guesses, recordInteraction],
  );

  const handleReveal = useCallback(() => {
    if (guesses.length !== TOP_K) return;
    setRevealed(true);
    recordInteraction("reveal", {
      correct: correctGuesses,
      query_id: queryId ?? -1,
    });
  }, [guesses.length, correctGuesses, queryId, recordInteraction]);

  const handleReset = useCallback(() => {
    setQueryId(null);
    setGuesses([]);
    setRevealed(false);
    recordInteraction("reset");
  }, [recordInteraction]);

  const handleNewQuery = useCallback(() => {
    setQueryId(null);
    setGuesses([]);
    setRevealed(false);
    recordInteraction("new_query");
  }, [recordInteraction]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      phase: phase === "pick-query" ? 0 : phase === "guess" ? 1 : 2,
      query_id: queryId ?? -1,
      guesses: guesses.length,
      correct: correctGuesses,
      revealed: revealed ? 1 : 0,
    });
  }, [phase, queryId, guesses.length, correctGuesses, revealed, onStateChange]);

  const stateSummary = useMemo(() => {
    if (phase === "pick-query") {
      return `Embedding nearest-neighbour quiz, 30 fake embedding points across 5 clusters (animals / vehicles / food / places / tools). Reader has not picked a query yet — they will click one point to act as the query, then guess its 3 nearest neighbours by cosine similarity.`;
    }
    if (phase === "guess" && query) {
      return `Query is point ${query.label} (cluster ${query.cluster}, position (${query.pos.x.toFixed(2)}, ${query.pos.y.toFixed(2)})). Reader has selected ${guesses.length}/3 guesses${guesses.length > 0 ? `: ${guesses.map((id) => points.find((p) => p.id === id)?.label).join(", ")}` : ""}. They have not yet revealed the true top-3.`;
    }
    if (phase === "revealed" && query) {
      const trueLabels = trueTop.map((p) => p.label).join(", ");
      const guessLabels = guesses.map((id) => points.find((p) => p.id === id)?.label).join(", ");
      const eucMismatch = trueEuclidean
        .filter((p) => !trueTopIds.has(p.id))
        .map((p) => p.label);
      return `Query was ${query.label}. Reader guessed ${guessLabels}; true top-3 by cosine similarity are ${trueLabels}; overlap ${correctGuesses}/3. ${eucMismatch.length > 0 ? `Notably, ${eucMismatch.join(", ")} were closer by Euclidean distance but did NOT make the cosine top-3 — direction matters more than proximity.` : "Top-3 cosine and Euclidean rankings agreed for this query."}`;
    }
    return "Embedding nearest-neighbour widget — state unrecognised.";
  }, [phase, query, guesses, points, trueTop, trueEuclidean, trueTopIds, correctGuesses]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        phase,
        query: queryId,
        guesses: [...guesses].sort(),
        revealed,
      }),
    [phase, queryId, guesses, revealed],
  );

  return (
    <div className={`enn enn--${phase}`}>
      <header className="enn__head">
        <div className="enn__heading">
          <span className="enn__heading-label">PHASE</span>
          <span className="enn__heading-value">
            {phase === "pick-query"
              ? "1. Pick a query"
              : phase === "guess"
                ? `2. Guess (${guesses.length}/3)`
                : `3. Revealed (${correctGuesses}/3 correct)`}
          </span>
        </div>
        {query && (
          <div className="enn__heading">
            <span className="enn__heading-label">QUERY</span>
            <span className="enn__heading-value">{query.label}</span>
          </div>
        )}
        {phase === "revealed" && (
          <div className="enn__heading">
            <span className="enn__heading-label">SCORE</span>
            <span
              className={`enn__heading-value enn__heading-value--${
                correctGuesses === 3
                  ? "ok"
                  : correctGuesses >= 2
                    ? "warm"
                    : "cold"
              }`}
            >
              {correctGuesses}/3 cosine matches
            </span>
          </div>
        )}
      </header>

      <ScatterCanvas
        points={points}
        query={query}
        guesses={guesses}
        trueTop={revealed ? trueTop : []}
        trueEuclidean={revealed ? trueEuclidean : []}
        phase={phase}
        onPoint={handlePoint}
      />

      <div className="enn__instructions">
        {phase === "pick-query" && (
          <>
            <strong>Step 1.</strong> Click any point on the scatter to set
            it as the <em>query</em>. The 30 points are five semantic
            clusters (each colour = a cluster). Imagine these as 2D
            stand-ins for high-dimensional embeddings.
          </>
        )}
        {phase === "guess" && (
          <>
            <strong>Step 2.</strong> Click 3 points you think will be the
            nearest neighbours of the query by <em>cosine similarity</em>
            {" (cos θ = a·b / |a||b|)"}. Reminder: cosine similarity is
            about <strong>direction agreement</strong> — distance and
            magnitude don't drive it. Click a chosen point again to
            unselect.
          </>
        )}
        {phase === "revealed" && (
          <>
            <strong>Step 3.</strong> Green halos = the actual top-3 by
            cosine similarity. Blue circles = your guesses. The dashed
            ring shows the top-3 by Euclidean distance for comparison —
            notice where it disagrees with cosine.
          </>
        )}
      </div>

      {phase === "revealed" && query && (
        <SimilarityTable
          query={query}
          points={points}
          trueTop={trueTop}
          guessIds={guesses}
        />
      )}

      <div className="enn__controls">
        {phase === "guess" && (
          <button
            type="button"
            className="enn__btn enn__btn--primary"
            onClick={handleReveal}
            disabled={guesses.length !== TOP_K}
          >
            Reveal top-3 →
          </button>
        )}
        {phase === "revealed" && (
          <button
            type="button"
            className="enn__btn enn__btn--primary"
            onClick={handleNewQuery}
          >
            Try a different query →
          </button>
        )}
        <button type="button" className="enn__btn" onClick={handleReset}>
          Reset
        </button>
      </div>

      <WidgetExplainer
        widgetName="Embedding nearest-neighbour quiz"
        widgetDescription="A predict-then-reveal quiz for cosine similarity in 2D as a stand-in for high-dimensional embeddings. 30 fake embedding points are scattered across the plane in 5 deterministic semantic clusters (animals, vehicles, food, places, tools). Three phases: (1) reader clicks a point to set it as the query; (2) reader clicks 3 candidate nearest neighbours by cosine similarity (their direction agreement to the query); (3) widget reveals the true cosine top-3 (green halos) and the Euclidean top-3 for comparison (dashed rings). Scores the reader's prediction by overlap with cosine top-3. The pedagogical lift is that cosine similarity in 2D is mostly about DIRECTION agreement, not distance — a point that LOOKS close (Euclidean) can have low cosine similarity if it's at a different angle. This 2D intuition transfers conceptually to high-D embedding similarity (CLIP, BERT, OpenAI text-embedding-3): the geometry is the same; the only thing that changes is how many dimensions the cosine is computed in."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── Scatter canvas ─────────────────────────────────────────────────────

interface ScatterCanvasProps {
  points: EmbeddingPoint[];
  query: EmbeddingPoint | null;
  guesses: number[];
  trueTop: EmbeddingPoint[];
  trueEuclidean: EmbeddingPoint[];
  phase: "pick-query" | "guess" | "revealed";
  onPoint: (id: number) => void;
}

function ScatterCanvas({
  points,
  query,
  guesses,
  trueTop,
  trueEuclidean,
  phase,
  onPoint,
}: ScatterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverId, setHoverId] = useState<number | null>(null);

  const domain = useMemo(
    () => computeDomain(points.map((p) => p.pos), { padding: 1.25, floor: 3.5, ceiling: 5 }),
    [points],
  );

  const toPx = useMemo(() => makeToPx(CANVAS_SIZE, domain), [domain]);
  const fromPx = useMemo(() => makeFromPx(CANVAS_SIZE, domain), [domain]);

  const clusterColors = [
    "var(--widget-chart-1)",
    "var(--widget-chart-2)",
    "var(--widget-chart-3)",
    "var(--widget-chart-4)",
    "var(--widget-chart-5)",
  ];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    ctx.clearRect(0, 0, W, H);

    const C_OK = resolveColor("var(--widget-success)");
    const C_GUESS = resolveColor("var(--widget-accent)");
    const C_EUC = resolveColor("var(--widget-warn)");
    const C_TEXT = resolveColor("var(--widget-text)");
    const C_TEXT_DIM = resolveColor("var(--widget-text-dim)");

    // Faint origin grid.
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    const origin = toPx({ x: 0, y: 0 });

    // If query is set, draw a faint ray from origin through the query so
    // the reader sees the "direction" line cosine similarity cares about.
    if (query) {
      const qPx = toPx(query.pos);
      const ext = domain * 1.5;
      const ang = Math.atan2(query.pos.y, query.pos.x);
      const farEnd = toPx({ x: ext * Math.cos(ang), y: ext * Math.sin(ang) });
      const farStart = toPx({
        x: -ext * Math.cos(ang),
        y: -ext * Math.sin(ang),
      });
      ctx.save();
      ctx.strokeStyle = resolveColorAlpha("var(--widget-success)", 0.18);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(farStart.x, farStart.y);
      ctx.lineTo(farEnd.x, farEnd.y);
      ctx.stroke();
      ctx.restore();
      // Vector arrow from origin to query.
      ctx.save();
      ctx.strokeStyle = resolveColor("var(--widget-success)");
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(qPx.x, qPx.y);
      ctx.stroke();
      ctx.restore();
    }

    // Draw points (true-top halos UNDER the points themselves).
    if (phase === "revealed") {
      // Euclidean halo (dashed, behind cosine).
      ctx.save();
      ctx.strokeStyle = resolveColorAlpha("var(--widget-warn)", 0.7);
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (const p of trueEuclidean) {
        const pPx = toPx(p.pos);
        ctx.beginPath();
        ctx.arc(pPx.x, pPx.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      // Cosine halo (solid, brighter).
      ctx.save();
      ctx.strokeStyle = C_OK;
      ctx.lineWidth = 3;
      for (const p of trueTop) {
        const pPx = toPx(p.pos);
        ctx.beginPath();
        ctx.arc(pPx.x, pPx.y, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Guesses halo (always shown).
    ctx.save();
    ctx.strokeStyle = C_GUESS;
    ctx.lineWidth = 2;
    for (const id of guesses) {
      const p = points.find((pt) => pt.id === id);
      if (!p) continue;
      const pPx = toPx(p.pos);
      ctx.beginPath();
      ctx.arc(pPx.x, pPx.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Points themselves.
    for (const p of points) {
      const pPx = toPx(p.pos);
      const isQuery = query?.id === p.id;
      const color = isQuery
        ? resolveColor("var(--widget-success)")
        : resolveColor(clusterColors[p.cluster]);
      const radius = isQuery ? 8 : hoverId === p.id ? 7 : 5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pPx.x, pPx.y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (isQuery) {
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Origin marker.
    ctx.fillStyle = C_TEXT;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Hover label.
    if (hoverId !== null && phase !== "revealed") {
      const hp = points.find((p) => p.id === hoverId);
      if (hp) {
        const hpPx = toPx(hp.pos);
        ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = C_TEXT;
        ctx.fillText(hp.label, hpPx.x + 10, hpPx.y - 8);
      }
    }

    // Legend.
    ctx.font = "600 10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = C_TEXT_DIM;
    let legY = 10;
    if (phase === "revealed") {
      ctx.fillStyle = C_OK;
      ctx.fillText("● Cosine top-3", 10, legY);
      legY += 14;
      ctx.fillStyle = C_EUC;
      ctx.fillText("◌ Euclidean top-3 (dashed)", 10, legY);
      legY += 14;
    }
    ctx.fillStyle = C_GUESS;
    ctx.fillText("○ Your guesses", 10, legY);
  }, [
    points,
    query,
    guesses,
    trueTop,
    trueEuclidean,
    phase,
    hoverId,
    toPx,
    domain,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Click & hover handling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const findNearby = (clientX: number, clientY: number): number | null => {
      const rect = canvas.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const py = ((clientY - rect.top) / rect.height) * CANVAS_SIZE;
      let best: { id: number; d: number } | null = null;
      for (const p of points) {
        const ppx = toPx(p.pos);
        const d = Math.hypot(px - ppx.x, py - ppx.y);
        if (d < 18 && (!best || d < best.d)) {
          best = { id: p.id, d };
        }
      }
      return best?.id ?? null;
    };

    const onMove = (e: PointerEvent) => {
      setHoverId(findNearby(e.clientX, e.clientY));
    };
    const onLeave = () => setHoverId(null);
    const onClick = (e: PointerEvent) => {
      const id = findNearby(e.clientX, e.clientY);
      if (id !== null) onPoint(id);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onClick);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onClick);
    };
  }, [points, toPx, onPoint]);

  // Silence unused-variable lint for fromPx (kept for future expansion).
  void fromPx;

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="enn__canvas"
      role="img"
      aria-label="Embedding scatter — click points to set query and guess neighbours."
    />
  );
}

// ─── Similarity table (revealed only) ──────────────────────────────────

interface SimilarityTableProps {
  query: EmbeddingPoint;
  points: EmbeddingPoint[];
  trueTop: EmbeddingPoint[];
  guessIds: number[];
}

function SimilarityTable({
  query,
  points,
  trueTop,
  guessIds,
}: SimilarityTableProps) {
  // Build a small comparison table for the reader's guesses vs the truth.
  const rows = useMemo(() => {
    const trueSet = new Set(trueTop.map((p) => p.id));
    const guessRows = guessIds.map((id) => {
      const p = points.find((pt) => pt.id === id);
      if (!p) return null;
      const sim = cosineSim(query.pos, p.pos);
      const dist = Math.hypot(query.pos.x - p.pos.x, query.pos.y - p.pos.y);
      return {
        label: p.label,
        sim,
        dist,
        isTrueTop: trueSet.has(id),
        kind: "guess" as const,
      };
    });
    const trueRows = trueTop.map((p) => {
      const sim = cosineSim(query.pos, p.pos);
      const dist = Math.hypot(query.pos.x - p.pos.x, query.pos.y - p.pos.y);
      return {
        label: p.label,
        sim,
        dist,
        isTrueTop: true,
        kind: "truth" as const,
      };
    });
    return { guessRows: guessRows.filter(Boolean), trueRows };
  }, [query, points, trueTop, guessIds]);

  return (
    <div className="enn__table-wrap">
      <div className="enn__table">
        <div className="enn__table-head enn__table-row">
          <span>YOUR GUESSES</span>
          <span>cos sim</span>
          <span>euclid</span>
          <span>in truth</span>
        </div>
        {rows.guessRows.map((r, i) =>
          r ? (
            <div
              key={`g-${i}`}
              className={`enn__table-row${r.isTrueTop ? " enn__table-row--ok" : " enn__table-row--bad"}`}
            >
              <span>{r.label}</span>
              <span>{r.sim.toFixed(3)}</span>
              <span>{r.dist.toFixed(2)}</span>
              <span>{r.isTrueTop ? "✓" : "✗"}</span>
            </div>
          ) : null,
        )}
        <div className="enn__table-head enn__table-row">
          <span>TRUE TOP-3 (cosine)</span>
          <span>cos sim</span>
          <span>euclid</span>
          <span></span>
        </div>
        {rows.trueRows.map((r, i) => (
          <div key={`t-${i}`} className="enn__table-row enn__table-row--truth">
            <span>{r.label}</span>
            <span>{r.sim.toFixed(3)}</span>
            <span>{r.dist.toFixed(2)}</span>
            <span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
