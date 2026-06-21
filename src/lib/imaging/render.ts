/**
 * Procedural reference image renderer. The MetricComparison widget paints this
 * onto its left canvas, then applies distortions to derive the right canvas.
 *
 * The image is deliberately textured rather than uniform — it includes flat
 * gradients (where PSNR-style metrics behave well), sharp edges (where SSIM's
 * structural term matters), high-frequency hatching (which blur destroys
 * obviously), and saturated colour patches (where brightness shifts show up
 * visually before they show up in either metric).
 */

export function drawReference(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Diagonal multi-stop gradient background — gives PSNR something to chew on
  // when brightness shifts.
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#241a12");
  grad.addColorStop(0.45, "#6b4a2e");
  grad.addColorStop(0.85, "#a8784a");
  grad.addColorStop(1, "#d8c2a0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Diagonal hatching across the lower half — SSIM-sensitive structure.
  ctx.save();
  ctx.strokeStyle = "rgba(236, 229, 217, 0.4)";
  ctx.lineWidth = 1.2;
  for (let i = -h; i < w + h; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, h);
    ctx.lineTo(i + h * 0.45, h * 0.55);
    ctx.stroke();
  }
  ctx.restore();

  // Ochre horizontal bar — easy visual anchor for translation.
  ctx.fillStyle = "#bd8e48";
  ctx.fillRect(0, Math.round(h * 0.66), w, Math.max(3, Math.round(h * 0.035)));

  // Terracotta circle — solid, slightly translucent so blur shows up clearly.
  ctx.fillStyle = "#b8704a";
  ctx.beginPath();
  ctx.arc(w * 0.28, h * 0.33, w * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // Eucalyptus square — second solid region, no anti-aliased edge alignment
  // with the circle so SSIM can see two different structures.
  ctx.fillStyle = "#62807a";
  ctx.fillRect(
    Math.round(w * 0.55),
    Math.round(h * 0.18),
    Math.round(w * 0.22),
    Math.round(h * 0.26),
  );

  // Slim dark stripe across the very top — gives translation an obvious failure
  // mode on the right edge (the band disappears when shifted past the canvas).
  ctx.fillStyle = "rgba(12, 9, 6, 0.6)";
  ctx.fillRect(0, 0, w, Math.max(2, Math.round(h * 0.025)));
}
