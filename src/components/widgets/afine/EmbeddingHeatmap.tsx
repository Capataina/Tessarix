import { useMemo, useState } from "react";
import { divergingColor } from "../../../styles";
import { AsciiField } from "../../../lib/ascii";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./EmbeddingHeatmap.css";

const EMBED_DIM = 512;
const GRID_W = 32;
const GRID_H = 16;

function rng(seed: number): () => number {
  let s = seed | 0;
  if (s === 0) s = 0x1a2b3c4d;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 0xffffffff) * 2 - 1;
  };
}

/**
 * Generate a CLIP-like 512-d feature embedding: mostly low-magnitude values
 * with sparse high-magnitude spikes, L2-normalised. Two seeds → two distinct
 * but structurally similar embeddings.
 */
function generateEmbedding(seed: number, sparsity = 0.18): Float32Array {
  const gen = rng(seed);
  const v = new Float32Array(EMBED_DIM);
  for (let i = 0; i < EMBED_DIM; i++) {
    const base = gen() * 0.25;
    const spike = Math.abs(gen()) < sparsity ? gen() * 1.6 : 0;
    v[i] = base + spike;
  }
  // Apply a mild low-pass to give the heatmap visible structure.
  const smoothed = new Float32Array(EMBED_DIM);
  for (let i = 0; i < EMBED_DIM; i++) {
    const a = v[(i - 1 + EMBED_DIM) % EMBED_DIM];
    const b = v[i];
    const c = v[(i + 1) % EMBED_DIM];
    smoothed[i] = 0.25 * a + 0.5 * b + 0.25 * c;
  }
  // L2-normalise.
  let sumSq = 0;
  for (let i = 0; i < EMBED_DIM; i++) sumSq += smoothed[i] * smoothed[i];
  const inv = 1 / Math.sqrt(sumSq);
  for (let i = 0; i < EMBED_DIM; i++) smoothed[i] *= inv;
  return smoothed;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

function fidelityRatio(a: Float32Array, b: Float32Array): number {
  const c1 = 1e-10;
  const c2 = 1e-10;
  const n = a.length;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const muA = sumA / n;
  const muB = sumB / n;
  let vA = 0;
  let vB = 0;
  let cov = 0;
  for (let i = 0; i < n; i++) {
    const dA = a[i] - muA;
    const dB = b[i] - muB;
    vA += dA * dA;
    vB += dB * dB;
    cov += dA * dB;
  }
  vA /= n;
  vB /= n;
  cov /= n;
  const num = (2 * muA * muB + c1) * (2 * cov + c2);
  const den = (muA * muA + muB * muB + c1) * (vA + vB + c2);
  return num / den;
}

/** Reshape a flat embedding into a row-major 2D grid for the ASCII field. */
function toRows(embedding: Float32Array): number[][] {
  const rows: number[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < GRID_W; x++) row.push(embedding[y * GRID_W + x]);
    rows.push(row);
  }
  return rows;
}

interface HeatmapProps {
  label: string;
  embedding: Float32Array;
  vmax: number;
}

/**
 * One embedding rendered as an ASCII character field: glyph density encodes
 * magnitude (|value| / vmax), per-cell colour encodes value via the shared
 * diverging colormap (espresso at zero → tan positive, rust negative). The
 * coherent terminal-native replacement for the old pixel canvas.
 */
function Heatmap({ label, embedding, vmax }: HeatmapProps) {
  const rows = useMemo(() => toRows(embedding), [embedding]);
  return (
    <figure className="embedding-heatmap__panel">
      <figcaption>{label}</figcaption>
      <AsciiField
        className="embedding-heatmap__ascii"
        rows={rows}
        // sqrt gamma lifts the low-magnitude field so the heatmap reads as a
        // textured surface rather than near-empty (the embedding is sparse); the
        // spikes still saturate to the densest glyphs.
        intensity={(v) => Math.sqrt(Math.abs(v) / (vmax || 1e-9))}
        colorFor={(v) => {
          const [r, g, b] = divergingColor(v, vmax);
          return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
        }}
        ariaLabel={`${label} feature heatmap`}
      />
    </figure>
  );
}

export function EmbeddingHeatmap() {
  const reference = useMemo(() => generateEmbedding(0x4a3b1c2d), []);
  const distorted = useMemo(() => generateEmbedding(0x4a3b1c2d + 9173), []);

  const [t, setT] = useState(0.4);

  const morphed = useMemo(() => {
    const out = new Float32Array(EMBED_DIM);
    for (let i = 0; i < EMBED_DIM; i++) {
      out[i] = (1 - t) * reference[i] + t * distorted[i];
    }
    let sumSq = 0;
    for (let i = 0; i < EMBED_DIM; i++) sumSq += out[i] * out[i];
    const inv = 1 / Math.sqrt(sumSq);
    for (let i = 0; i < EMBED_DIM; i++) out[i] *= inv;
    return out;
  }, [reference, distorted, t]);

  // Shared color scale across all three panels for honest comparison.
  const vmax = useMemo(() => {
    let m = 0;
    for (let i = 0; i < EMBED_DIM; i++) {
      m = Math.max(m, Math.abs(reference[i]), Math.abs(distorted[i]));
    }
    return m;
  }, [reference, distorted]);

  const cosVal = useMemo(() => cosine(reference, morphed), [reference, morphed]);
  const fidVal = useMemo(
    () => fidelityRatio(reference, morphed),
    [reference, morphed],
  );

  return (
    <div className="embedding-heatmap">
      <div className="embedding-heatmap__panels">
        <Heatmap label="Reference embedding" embedding={reference} vmax={vmax} />
        <Heatmap label="Morphed (current)" embedding={morphed} vmax={vmax} />
        <Heatmap label="Distorted embedding" embedding={distorted} vmax={vmax} />
      </div>

      <div className="embedding-heatmap__metrics">
        <div className="embedding-heatmap__metric">
          <div className="embedding-heatmap__metric-label">
            Cosine(reference, morphed)
          </div>
          <div className="embedding-heatmap__metric-value">
            {cosVal.toFixed(3)}
          </div>
        </div>
        <div className="embedding-heatmap__metric">
          <div className="embedding-heatmap__metric-label">
            Fidelity ratio (SSIM-in-feature-space)
          </div>
          <div className="embedding-heatmap__metric-value">
            {fidVal.toFixed(3)}
          </div>
        </div>
      </div>

      <label className="embedding-heatmap__slider-row">
        <span className="embedding-heatmap__slider-label">
          Morph: reference → distorted
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={t}
          onChange={(e) => setT(Number(e.target.value))}
          className="embedding-heatmap__slider"
        />
        <span className="embedding-heatmap__slider-value">{t.toFixed(2)}</span>
      </label>

      <WidgetExplainer
        widgetName="CLIP embedding heatmap"
        widgetDescription="Two synthetic 512-d CLIP-like embeddings rendered as 32×16 ASCII character heatmaps (glyph density = magnitude, colour = sign via the diverging colormap) with a morph slider linearly interpolating between them. Shows both cosine similarity (the linear-space alignment) and the SSIM-style fidelity ratio (the structural-similarity measure A-FINE's fidelity head actually uses), so the reader can see when the two metrics agree and where they diverge."
        stateSummary={`Morph value t = ${t.toFixed(2)} (0 = reference, 1 = distorted). Current morphed embedding: cosine(reference, morphed) = ${cosVal.toFixed(3)}, SSIM-in-feature-space fidelity ratio = ${fidVal.toFixed(3)}.`}
        stateKey={JSON.stringify({ t: Number(t.toFixed(2)) })}
      />
    </div>
  );
}
