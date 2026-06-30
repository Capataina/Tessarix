import { describe, it, expect } from "vitest";
import { drawDonutScene } from "./donut";
import { blur, noise, psnr, ssim, translate, seededRandom } from "./field";

/**
 * Pins the A-FINE lesson's GoalChain reachability: the MetricComparison donut
 * must let the reader satisfy all three predicates (afine.mdx). If a future tweak
 * to the scene breaks the PSNR/SSIM divergence, this fails loudly. (Promotes
 * scripts/verify-donut.ts from an ad-hoc script to a pinned test.)
 */
describe("donut scene — A-FINE GoalChain reachability (256²)", () => {
  const ref = drawDonutScene(256, 256, { a: 1, b: 0.3 }, { charAspect: 1 });

  it("translation goal: psnr<25 && ssim>0.85 at a small shift", () => {
    const d = translate(ref, 6);
    expect(psnr(ref, d)).toBeLessThan(25);
    expect(ssim(ref, d)).toBeGreaterThan(0.85);
  });

  it("blur goal: ssim<0.85 && psnr>30 at light blur", () => {
    const d = blur(ref, 1.5);
    expect(ssim(ref, d)).toBeLessThan(0.85);
    expect(psnr(ref, d)).toBeGreaterThan(30);
  });

  it("noise goal: psnr<22 && ssim<0.75 at sigma 35", () => {
    const d = noise(ref, 35, seededRandom(7));
    expect(psnr(ref, d)).toBeLessThan(22);
    expect(ssim(ref, d)).toBeLessThan(0.75);
  });

  it("the scene is non-trivial (has bright and dark regions)", () => {
    let min = Infinity;
    let max = -Infinity;
    for (const v of ref.data) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    expect(max - min).toBeGreaterThan(150);
  });
});
