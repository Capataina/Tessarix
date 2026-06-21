/**
 * Procedural reference image renderer. The MetricComparison widget paints this
 * onto its left canvas, then applies distortions to derive the right canvas.
 *
 * The image is deliberately textured rather than uniform — it includes flat
 * gradients (where PSNR-style metrics behave well), sharp edges (where SSIM's
 * structural term matters), high-frequency hatching (which blur destroys
 * obviously), and solid colour patches (where brightness shifts show up
 * visually before they show up in either metric).
 *
 * Every colour comes from `refImage` in the design system (computed from the
 * base tokens), so the test image stays in the page's palette automatically.
 */

import { refImage } from "../../styles";

export function drawReference(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Flat horizontal palette bands instead of a smooth gradient — reads as a
  // terminal diagram, not a photo. Hard edges between bands give SSIM
  // structure; the uniform fills give PSNR / brightness a clean target.
  for (let i = 0; i < refImage.bands.length; i++) {
    const [yFrac, c] = refImage.bands[i];
    const yEnd = i + 1 < refImage.bands.length ? refImage.bands[i + 1][0] : 1;
    ctx.fillStyle = c;
    ctx.fillRect(0, Math.round(yFrac * h), w, Math.ceil((yEnd - yFrac) * h));
  }

  // Diagonal hatching across the lower half — SSIM-sensitive structure.
  ctx.save();
  ctx.strokeStyle = refImage.hatch;
  ctx.lineWidth = 1.2;
  for (let i = -h; i < w + h; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, h);
    ctx.lineTo(i + h * 0.45, h * 0.55);
    ctx.stroke();
  }
  ctx.restore();

  // Ochre horizontal bar — easy visual anchor for translation.
  ctx.fillStyle = refImage.bar;
  ctx.fillRect(0, Math.round(h * 0.66), w, Math.max(3, Math.round(h * 0.035)));

  // Terracotta circle — solid, slightly translucent so blur shows up clearly.
  ctx.fillStyle = refImage.circle;
  ctx.beginPath();
  ctx.arc(w * 0.28, h * 0.33, w * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // Eucalyptus square — second solid region, no anti-aliased edge alignment
  // with the circle so SSIM can see two different structures.
  ctx.fillStyle = refImage.square;
  ctx.fillRect(
    Math.round(w * 0.55),
    Math.round(h * 0.18),
    Math.round(w * 0.22),
    Math.round(h * 0.26),
  );

  // Slim dark stripe across the very top — gives translation an obvious failure
  // mode on the right edge (the band disappears when shifted past the canvas).
  ctx.fillStyle = refImage.topStripe;
  ctx.fillRect(0, 0, w, Math.max(2, Math.round(h * 0.025)));
}
