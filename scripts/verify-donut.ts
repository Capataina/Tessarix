/**
 * Verifies the ASCII donut scene against the A-FINE lesson's GoalChain
 * predicates (afine.mdx) using the real shipping code in src/lib/ascii/.
 * Run: pnpm tsx scripts/verify-donut.ts
 */
import { drawDonutScene, type Pose } from "../src/lib/ascii/donut";
import {
  blur,
  downsample,
  gridToAscii,
  noise,
  psnr,
  ssim,
  translate,
  seededRandom,
} from "../src/lib/ascii/field";

const POSE: Pose = { a: 1.0, b: 0.3 };
const N = 256;
const ref = drawDonutScene(N, N, POSE, { charAspect: 1 });

function line(label: string, p: number, q: number, hit: boolean): void {
  const ps = p === Infinity ? "  inf" : p.toFixed(1).padStart(5);
  console.log(`  ${label.padEnd(10)} PSNR ${ps}  SSIM ${q.toFixed(3)}  ${hit ? "HIT" : "."}`);
}

console.log("== GoalChain reachability (metric grid 256², real TS) ==");
console.log(" Translation goal: psnr<25 && ssim>0.85");
for (const px of [4, 6, 8, 10, 12]) {
  const d = translate(ref, px);
  const p = psnr(ref, d), q = ssim(ref, d);
  line(`@${px}px`, p, q, p < 25 && q > 0.85);
}
console.log(" Blur goal: ssim<0.85 && psnr>30");
for (const s of [1.0, 1.5, 2.0, 2.5]) {
  const d = blur(ref, s);
  const p = psnr(ref, d), q = ssim(ref, d);
  line(`@${s}σ`, p, q, q < 0.85 && p > 30);
}
console.log(" Noise goal: psnr<22 && ssim<0.75");
for (const s of [25, 35, 50]) {
  const d = noise(ref, s, seededRandom(7));
  const p = psnr(ref, d), q = ssim(ref, d);
  line(`@${s}σ`, p, q, p < 22 && q < 0.75);
}

console.log("\n== Display render (2× supersample → 72×34 box-downsample) ==");
const ss = drawDonutScene(144, 68, POSE, { charAspect: 2 });
console.log(gridToAscii(downsample(ss, 72, 34)));
