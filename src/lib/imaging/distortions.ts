/**
 * Pixel-level distortion operators that take and return `ImageData`. Used by
 * the MetricComparison widget to demonstrate how PSNR and SSIM respond to
 * different perturbations.
 *
 * Each operator allocates a fresh `ImageData`. None mutate the input. Speed
 * matters because these run on every slider tick; the inner loops are written
 * to avoid object allocation and to keep array accesses sequential.
 */

function clampU8(v: number): number {
  if (v < 0) return 0;
  if (v > 255) return 255;
  return v | 0;
}

function makeOutput(src: ImageData): ImageData {
  return new ImageData(
    new Uint8ClampedArray(src.data.length),
    src.width,
    src.height,
  );
}

/**
 * Horizontal translation. Pixels shifted past the right edge are clipped
 * (the freed-up left column is filled with black). Vertical translation is
 * not needed for the lesson's narrative.
 */
export function translate(src: ImageData, dx: number): ImageData {
  const out = makeOutput(src);
  const w = src.width;
  const h = src.height;
  const shift = Math.round(dx);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = x - shift;
      const di = (y * w + x) * 4;
      if (srcX < 0 || srcX >= w) {
        out.data[di + 3] = 255; // opaque black for clipped regions
        continue;
      }
      const si = (y * w + srcX) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

/**
 * Build a 1D Gaussian kernel for a given sigma. Kernel half-width is
 * `ceil(3 * sigma)` so the kernel covers ~99.7% of the mass.
 */
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

/**
 * Separable Gaussian blur. `sigma` of 0 returns a copy of the input.
 * Mirror-reflect boundary handling so edges don't fade.
 */
export function gaussianBlur(src: ImageData, sigma: number): ImageData {
  if (sigma <= 0) {
    const out = makeOutput(src);
    out.data.set(src.data);
    return out;
  }
  const kernel = gaussianKernel1D(sigma);
  const r = (kernel.length - 1) / 2;
  const w = src.width;
  const h = src.height;
  const tmp = new Float32Array(w * h * 3);
  const inData = src.data;

  // Horizontal pass.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let accR = 0;
      let accG = 0;
      let accB = 0;
      for (let kx = -r; kx <= r; kx++) {
        let sx = x + kx;
        if (sx < 0) sx = -sx;
        if (sx >= w) sx = 2 * w - sx - 2;
        if (sx < 0) sx = 0;
        const wgt = kernel[kx + r];
        const si = (y * w + sx) * 4;
        accR += wgt * inData[si];
        accG += wgt * inData[si + 1];
        accB += wgt * inData[si + 2];
      }
      const ti = (y * w + x) * 3;
      tmp[ti] = accR;
      tmp[ti + 1] = accG;
      tmp[ti + 2] = accB;
    }
  }

  // Vertical pass.
  const out = makeOutput(src);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let accR = 0;
      let accG = 0;
      let accB = 0;
      for (let ky = -r; ky <= r; ky++) {
        let sy = y + ky;
        if (sy < 0) sy = -sy;
        if (sy >= h) sy = 2 * h - sy - 2;
        if (sy < 0) sy = 0;
        const wgt = kernel[ky + r];
        const ti = (sy * w + x) * 3;
        accR += wgt * tmp[ti];
        accG += wgt * tmp[ti + 1];
        accB += wgt * tmp[ti + 2];
      }
      const di = (y * w + x) * 4;
      out.data[di] = clampU8(accR);
      out.data[di + 1] = clampU8(accG);
      out.data[di + 2] = clampU8(accB);
      out.data[di + 3] = inData[di + 3];
    }
  }
  return out;
}

/**
 * Add zero-mean Gaussian noise to each channel. `sigma` is in the same
 * [0, 255] range as the pixel values. Box–Muller transform; we generate one
 * sample at a time and discard the unused one (the overhead is dominated by
 * the per-pixel loop anyway).
 */
export function gaussianNoise(src: ImageData, sigma: number): ImageData {
  if (sigma <= 0) {
    const out = makeOutput(src);
    out.data.set(src.data);
    return out;
  }
  const out = makeOutput(src);
  const d = src.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const u1 = Math.max(1e-12, Math.random());
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      out.data[i + c] = clampU8(d[i + c] + z * sigma);
    }
    out.data[i + 3] = d[i + 3];
  }
  return out;
}

/**
 * Additive brightness shift, applied uniformly to all RGB channels. `delta`
 * may be positive (brighten) or negative (darken); values are clamped to
 * [0, 255].
 */
export function brightness(src: ImageData, delta: number): ImageData {
  if (delta === 0) {
    const out = makeOutput(src);
    out.data.set(src.data);
    return out;
  }
  const out = makeOutput(src);
  const d = src.data;
  for (let i = 0; i < d.length; i += 4) {
    out.data[i] = clampU8(d[i] + delta);
    out.data[i + 1] = clampU8(d[i + 1] + delta);
    out.data[i + 2] = clampU8(d[i + 2] + delta);
    out.data[i + 3] = d[i + 3];
  }
  return out;
}
