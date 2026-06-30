/**
 * ASCII luminance-field primitives — the shared substrate for the A-FINE
 * "custom display" widgets (MetricComparison's rotating donut, EmbeddingHeatmap).
 *
 * A `Grid` is a single-channel luminance image (values 0..255) that doubles as
 * (a) the thing PSNR/SSIM measure and (b) the thing rendered to ASCII glyphs —
 * so every glyph the reader sees is a bucket of the exact field the metric
 * operates on. This replaces the canvas raster pipeline that used to live in
 * `lib/imaging` (drawReference + RGBA distortions + RGBA metrics): a luminance
 * grid is what PSNR/SSIM are defined on anyway, so the ASCII rewrite is also a
 * simplification — one channel instead of four, no `ImageData`, no canvas.
 *
 * Pure module (no React, no style imports) so it runs under
 * `node --experimental-strip-types` for metric verification.
 */

/** Glyph ramp, dark -> bright. The leading space renders empty / near-zero cells. */
export const RAMP = " .,-~:;=!*#$@";

export interface Grid {
  readonly w: number;
  readonly h: number;
  /** Row-major luminance, 0..255. */
  readonly data: Float32Array;
}

export function makeGrid(w: number, h: number, fill = 0): Grid {
  const data = new Float32Array(w * h);
  if (fill) data.fill(fill);
  return { w, h, data };
}

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

// --- distortion operators (single-channel ports of lib/imaging/distortions) ---

/**
 * Horizontal translation. Freed-up left columns become 0 (dark), matching the
 * old canvas widget's "clipped to black" behaviour. Vertical translation isn't
 * needed for the lesson's narrative.
 */
export function translate(src: Grid, dx: number): Grid {
  const { w, h, data } = src;
  const out = new Float32Array(w * h);
  const shift = Math.round(dx);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const sx = x - shift;
      out[row + x] = sx < 0 || sx >= w ? 0 : data[row + sx];
    }
  }
  return { w, h, data: out };
}

/** 1D Gaussian kernel; half-width ceil(3*sigma) covers ~99.7% of the mass. */
function gaussianKernel1D(sigma: number): Float32Array {
  if (sigma <= 0) return new Float32Array([1]);
  const r = Math.max(1, Math.ceil(3 * sigma));
  const size = 2 * r + 1;
  const k = new Float32Array(size);
  const twoSigmaSq = 2 * sigma * sigma;
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - r;
    k[i] = Math.exp(-(x * x) / twoSigmaSq);
    sum += k[i];
  }
  for (let i = 0; i < size; i++) k[i] /= sum;
  return k;
}

/** Separable Gaussian blur with mirror-reflect edges (so edges don't fade). */
export function blur(src: Grid, sigma: number): Grid {
  if (sigma <= 0) return { ...src, data: src.data.slice() };
  const { w, h, data } = src;
  const k = gaussianKernel1D(sigma);
  const r = (k.length - 1) / 2;
  const tmp = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let kx = -r; kx <= r; kx++) {
        let sx = x + kx;
        if (sx < 0) sx = -sx;
        if (sx >= w) sx = 2 * w - sx - 2;
        if (sx < 0) sx = 0;
        acc += k[kx + r] * data[row + sx];
      }
      tmp[row + x] = acc;
    }
  }

  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let ky = -r; ky <= r; ky++) {
        let sy = y + ky;
        if (sy < 0) sy = -sy;
        if (sy >= h) sy = 2 * h - sy - 2;
        if (sy < 0) sy = 0;
        acc += k[ky + r] * tmp[sy * w + x];
      }
      out[y * w + x] = clamp255(acc);
    }
  }
  return { w, h, data: out };
}

/**
 * Additive zero-mean Gaussian noise (sigma in 0..255 luminance units), via the
 * Box–Muller transform. `rand` is injectable so callers can pass a seeded RNG
 * for a stable display field; defaults to `Math.random` (parity with the old
 * widget, which used it for the metric).
 */
export function noise(src: Grid, sigma: number, rand: () => number = Math.random): Grid {
  if (sigma <= 0) return { ...src, data: src.data.slice() };
  const { w, h, data } = src;
  const out = new Float32Array(w * h);
  for (let i = 0; i < data.length; i++) {
    const u1 = Math.max(1e-12, rand());
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    out[i] = clamp255(data[i] + z * sigma);
  }
  return { w, h, data: out };
}

/** Uniform additive brightness shift (may be negative). */
export function brightness(src: Grid, delta: number): Grid {
  if (delta === 0) return { ...src, data: src.data.slice() };
  const { w, h, data } = src;
  const out = new Float32Array(w * h);
  for (let i = 0; i < data.length; i++) out[i] = clamp255(data[i] + delta);
  return { w, h, data: out };
}

/** A small deterministic PRNG (mulberry32) for reproducible display noise. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- metrics (single-channel ports of lib/imaging/metrics) ---

const SSIM_C1 = (0.01 * 255) ** 2;
const SSIM_C2 = (0.03 * 255) ** 2;

/** Peak Signal-to-Noise Ratio between two same-sized luminance grids, in dB. */
export function psnr(a: Grid, b: Grid): number {
  if (a.w !== b.w || a.h !== b.h) throw new Error("psnr: grid size mismatch");
  const da = a.data;
  const db = b.data;
  let sse = 0;
  for (let i = 0; i < da.length; i++) {
    const d = da[i] - db[i];
    sse += d * d;
  }
  const mse = sse / da.length;
  return mse <= 1e-12 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}

/**
 * Windowed SSIM over non-overlapping 8×8 windows (uniform weights) — the same
 * simplified Wang et al. 2004 variant the old widget used, now on a single
 * luminance channel directly. Returns a scalar in roughly [-1, 1].
 */
export function ssim(a: Grid, b: Grid, windowSize = 8): number {
  if (a.w !== b.w || a.h !== b.h) throw new Error("ssim: grid size mismatch");
  const { w, h } = a;
  const da = a.data;
  const db = b.data;
  const wn = windowSize;
  const N = wn * wn;

  let total = 0;
  let count = 0;
  for (let y0 = 0; y0 + wn <= h; y0 += wn) {
    for (let x0 = 0; x0 + wn <= w; x0 += wn) {
      let sumA = 0;
      let sumB = 0;
      for (let dy = 0; dy < wn; dy++) {
        const row = (y0 + dy) * w + x0;
        for (let dx = 0; dx < wn; dx++) {
          sumA += da[row + dx];
          sumB += db[row + dx];
        }
      }
      const muA = sumA / N;
      const muB = sumB / N;

      let varA = 0;
      let varB = 0;
      let cov = 0;
      for (let dy = 0; dy < wn; dy++) {
        const row = (y0 + dy) * w + x0;
        for (let dx = 0; dx < wn; dx++) {
          const xa = da[row + dx] - muA;
          const xb = db[row + dx] - muB;
          varA += xa * xa;
          varB += xb * xb;
          cov += xa * xb;
        }
      }
      varA /= N;
      varB /= N;
      cov /= N;

      const num = (2 * muA * muB + SSIM_C1) * (2 * cov + SSIM_C2);
      const den = (muA * muA + muB * muB + SSIM_C1) * (varA + varB + SSIM_C2);
      total += num / den;
      count++;
    }
  }
  return count > 0 ? total / count : 1;
}

// --- rendering helpers ---

/** Box-average downsample to a coarser grid (used to smooth the ASCII display). */
export function downsample(src: Grid, outW: number, outH: number): Grid {
  const out = new Float32Array(outW * outH);
  const sxScale = src.w / outW;
  const syScale = src.h / outH;
  for (let oy = 0; oy < outH; oy++) {
    const y0 = Math.floor(oy * syScale);
    const y1 = Math.max(y0 + 1, Math.floor((oy + 1) * syScale));
    for (let ox = 0; ox < outW; ox++) {
      const x0 = Math.floor(ox * sxScale);
      const x1 = Math.max(x0 + 1, Math.floor((ox + 1) * sxScale));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1 && y < src.h; y++) {
        const row = y * src.w;
        for (let x = x0; x < x1 && x < src.w; x++) {
          sum += src.data[row + x];
          n++;
        }
      }
      out[oy * outW + ox] = n > 0 ? sum / n : 0;
    }
  }
  return { w: outW, h: outH, data: out };
}

/** Pick a glyph for a luminance value, normalised by `vmax` (default 255). */
export function glyphFor(v: number, ramp = RAMP, vmax = 255): string {
  const t = v <= 0 ? 0 : v >= vmax ? 1 : v / vmax;
  return ramp[Math.round(t * (ramp.length - 1))];
}

/** Render a whole grid to a multi-line ASCII string (mono). */
export function gridToAscii(g: Grid, ramp = RAMP, vmax = 255): string {
  const n = ramp.length - 1;
  const lines: string[] = [];
  for (let y = 0; y < g.h; y++) {
    let line = "";
    const row = y * g.w;
    for (let x = 0; x < g.w; x++) {
      const v = g.data[row + x];
      const t = v <= 0 ? 0 : v >= vmax ? 1 : v / vmax;
      line += ramp[Math.round(t * n)];
    }
    lines.push(line);
  }
  return lines.join("\n");
}
