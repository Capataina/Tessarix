/**
 * Image-quality metrics over `ImageData`. Used by the MetricComparison widget
 * to compute PSNR and a windowed SSIM live as the reader manipulates the
 * distortion sliders.
 *
 * Implementation notes:
 *  - Both metrics operate on the RGB channels (alpha is ignored).
 *  - SSIM is computed on the luminance channel and averaged over non-overlapping
 *    8×8 windows with uniform weights. This is a simplified variant of the
 *    Wang et al. 2004 SSIM — the original uses 11×11 Gaussian-weighted windows
 *    — but the pedagogically-relevant ordinal behaviour (PSNR collapses under
 *    translation while SSIM mostly survives; both agree under additive noise)
 *    is preserved, and the simpler form runs in <5 ms on a 256×256 image.
 *  - SSIM uses the standard stabilising constants for 8-bit images:
 *      C1 = (0.01 * 255)^2,  C2 = (0.03 * 255)^2.
 */

const LUM_R = 0.299;
const LUM_G = 0.587;
const LUM_B = 0.114;

const SSIM_C1 = (0.01 * 255) ** 2;
const SSIM_C2 = (0.03 * 255) ** 2;

/** Compute Peak Signal-to-Noise Ratio between two same-sized images, in dB. */
export function psnr(ref: ImageData, dist: ImageData): number {
  if (ref.width !== dist.width || ref.height !== dist.height) {
    throw new Error("psnr: image size mismatch");
  }
  const a = ref.data;
  const b = dist.data;
  let sse = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const dr = a[i] - b[i];
    const dg = a[i + 1] - b[i + 1];
    const db = a[i + 2] - b[i + 2];
    sse += dr * dr + dg * dg + db * db;
    n += 3;
  }
  const mse = sse / n;
  if (mse <= 1e-12) return Infinity;
  return 10 * Math.log10((255 * 255) / mse);
}

/** Convert RGBA `ImageData` to a Float32Array of luminance values [0,255]. */
function toLuminance(img: ImageData): Float32Array {
  const px = img.width * img.height;
  const out = new Float32Array(px);
  const d = img.data;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    out[j] = LUM_R * d[i] + LUM_G * d[i + 1] + LUM_B * d[i + 2];
  }
  return out;
}

/**
 * Windowed Structural Similarity Index over non-overlapping 8×8 windows.
 * Returns a single scalar in roughly [-1, 1], with 1 meaning perfectly similar.
 */
export function ssim(
  ref: ImageData,
  dist: ImageData,
  windowSize = 8,
): number {
  if (ref.width !== dist.width || ref.height !== dist.height) {
    throw new Error("ssim: image size mismatch");
  }
  const w = ref.width;
  const h = ref.height;
  const a = toLuminance(ref);
  const b = toLuminance(dist);
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
          sumA += a[row + dx];
          sumB += b[row + dx];
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
          const va = a[row + dx] - muA;
          const vb = b[row + dx] - muB;
          varA += va * va;
          varB += vb * vb;
          cov += va * vb;
        }
      }
      varA /= N;
      varB /= N;
      cov /= N;

      const num = (2 * muA * muB + SSIM_C1) * (2 * cov + SSIM_C2);
      const den =
        (muA * muA + muB * muB + SSIM_C1) * (varA + varB + SSIM_C2);
      total += num / den;
      count++;
    }
  }

  return count > 0 ? total / count : 1;
}
