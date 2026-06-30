/**
 * The rotating ASCII donut scene for MetricComparison — a smooth-shaded torus
 * (the classic `donut.c` projection: luminance = surface-normal · light) over a
 * faint horizontal CRT scanline field, rendered to a luminance `Grid`.
 *
 * Why this exact scene (it was not the obvious choice):
 *   PSNR/SSIM must DIVERGE for the lesson — translation should collapse PSNR
 *   while SSIM survives; blur should drop SSIM while PSNR survives; noise hits
 *   both. A bare donut fails: it's all smooth surface, so it blurs to near-itself
 *   and SSIM never drops. The fix is the scanlines. Horizontal scanlines are
 *   invariant under HORIZONTAL translation (SSIM survives) but smear under blur
 *   (SSIM drops), and their low energy keeps blur-PSNR above 30. They also happen
 *   to be exactly the terminal/CRT aesthetic the redesign is chasing. Verified
 *   against the afine.mdx GoalChain predicates at 256² in scripts/verify-donut.ts.
 *
 * Pure module (no React / style imports) so it runs under
 * `node --experimental-strip-types`. Colour is applied at render time by the
 * widget; this file only produces luminance.
 */

import { makeGrid, type Grid } from "./field";

export interface Pose {
  /** Rotation about the X axis (tumble). */
  a: number;
  /** Rotation about the Z axis (spin). */
  b: number;
}

export interface DonutSceneOpts {
  /** Donut radius as a fraction of width (outer torus radius R1+R2 = 3 units). */
  scale?: number;
  /** Background luminance floor (0..255). */
  ambient?: number;
  /** Scanline amplitude added on every `scanPeriod`-th row (0..255). */
  scanAmp?: number;
  /** Rows between scanlines. */
  scanPeriod?: number;
  /**
   * Cell height:width ratio. Use 1 for the square metric grid (round in pixels);
   * use ~2 for a character display grid (chars are ~2:1, so the donut reads round
   * on screen).
   */
  charAspect?: number;
  /** Donut minimum luminance where it lands (its dark side). */
  lo?: number;
}

const TWO_PI = Math.PI * 2;
const SQRT2 = Math.SQRT2;

const DEFAULTS: Required<DonutSceneOpts> = {
  scale: 0.4,
  ambient: 24,
  // amp 8 / period 2 widens the blur goal window to ~1.0–1.5σ while keeping
  // translation (SSIM survives) and noise reachable — see scripts/verify-donut.ts.
  scanAmp: 8,
  scanPeriod: 2,
  charAspect: 1,
  lo: 60,
};

/**
 * Render the donut scene at resolution `w × h` for the given pose. Step density
 * scales with the projected radius so the surface stays hole-free at any size.
 */
export function drawDonutScene(
  w: number,
  h: number,
  pose: Pose,
  opts: DonutSceneOpts = {},
): Grid {
  const { scale, ambient, scanAmp, scanPeriod, charAspect, lo } = {
    ...DEFAULTS,
    ...opts,
  };
  const g = makeGrid(w, h, ambient);
  const d = g.data;

  // Horizontal CRT scanlines across the whole field.
  if (scanAmp > 0) {
    for (let y = 0; y < h; y += scanPeriod) {
      const row = y * w;
      for (let x = 0; x < w; x++) d[row + x] = Math.min(255, d[row + x] + scanAmp);
    }
  }

  // Donut overlay (z-buffered nearest surface point per cell).
  const k1 = w * scale;
  const cx0 = w / 2;
  const cy0 = h / 2;
  const z = new Float32Array(w * h); // 1/z buffer; 0 = empty
  const cA = Math.cos(pose.a);
  const sA = Math.sin(pose.a);
  const cB = Math.cos(pose.b);
  const sB = Math.sin(pose.b);

  // Sample fine enough that the projected surface has no gaps. The tube (theta)
  // has radius ~R1=1, the ring sweep (phi) reaches ~R1+R2=3, so phi needs the
  // finer step.
  const thStep = Math.max(0.004, 1.1 / k1);
  const phStep = Math.max(0.002, 0.5 / k1);

  for (let th = 0; th < TWO_PI; th += thStep) {
    const ct = Math.cos(th);
    const st = Math.sin(th);
    const circleX = 2 + ct; // R2 + R1*cos(theta)
    const circleY = st; //      R1*sin(theta)
    for (let ph = 0; ph < TWO_PI; ph += phStep) {
      const cp = Math.cos(ph);
      const sp = Math.sin(ph);
      const x = circleX * (cB * cp + sA * sB * sp) - circleY * cA * sB;
      const y = circleX * (sB * cp - sA * cB * sp) + circleY * cA * cB;
      const ooz = 1 / (5 + cA * circleX * sp + circleY * sA);
      const xp = Math.round(cx0 + k1 * charAspect * ooz * x);
      const yp = Math.round(cy0 - k1 * ooz * y);
      if (xp < 0 || xp >= w || yp < 0 || yp >= h) continue;
      const lum =
        cp * ct * sB -
        cA * ct * sp -
        sA * st +
        cB * (cA * st - ct * sA * sp); // surface normal · light, in [-√2, √2]
      if (lum <= 0) continue;
      const idx = yp * w + xp;
      if (ooz > z[idx]) {
        z[idx] = ooz;
        let v = lo + (255 - lo) * (lum / SQRT2);
        if (scanAmp > 0 && yp % scanPeriod === 0) v = Math.min(255, v + scanAmp * 0.5);
        d[idx] = v;
      }
    }
  }
  return g;
}
