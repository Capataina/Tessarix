import { useState } from "react";
import "./AFinePipeline.css";

const STAGES = [
  {
    id: "input",
    label: "Input pair",
    sub: "I_d, I_r",
    detail:
      "Two images: the distorted image I_d and the reference image I_r. A-FINE is a full-reference metric — both are required.",
    accent: "cyan" as const,
  },
  {
    id: "clip",
    label: "CLIP ViT-B/32",
    sub: "shared backbone",
    detail:
      "Both images pass through the SAME CLIP ViT-B/32 vision transformer (weights shared). Output: a 512-d feature embedding per image — f_d for distorted, f_r for reference. The CLIP backbone is borrowed from OpenAI's image-text pretraining (400M pairs) — far broader semantic features than VGG/ImageNet-trained backbones used by LPIPS / DISTS.",
    accent: "cyan" as const,
  },
  {
    id: "nr_head",
    label: "Naturalness head",
    sub: "applied twice",
    detail:
      "A small MLP (512 → 128 → 64 → 1) trained to predict a single 'how natural does this image look?' score. Applied independently to f_d (gives q_nat_d) and to f_r (gives q_nat_r). The SAME head with shared weights — naturalness is a property of one image, so it doesn't care which one of the pair.",
    accent: "magenta" as const,
  },
  {
    id: "fr_head",
    label: "Fidelity head",
    sub: "SSIM in CLIP space",
    detail:
      "An SSIM-like structural-similarity ratio computed BETWEEN f_d and f_r in the CLIP feature space (not pixel space). Uses constants c1 = c2 = 1e-10 — five orders of magnitude smaller than DISTS — because CLIP features are unit-scale. Output: q_fid, a raw fidelity score.",
    accent: "yellow" as const,
  },
  {
    id: "calibrators",
    label: "Logistic calibrators",
    sub: "5-parameter logistic",
    detail:
      "Each raw score (q_nat_d, q_nat_r, q_fid) is calibrated through a 5-parameter logistic function fitted on a labelled quality dataset. The calibrators ship as part of the pretrained checkpoint. The naturalness calibrator is reused for both q_nat_d and q_nat_r; the fidelity calibrator is its own.",
    accent: "green" as const,
  },
  {
    id: "adapter",
    label: "Adapter",
    sub: "asymmetric fusion",
    detail:
      "Fuses (s_nat_d, s_nat_r, s_fid) into one score. The 'adaptive' part: if the reference s_nat_r itself looks unnatural (it's a rendering, an old photo, etc.), the adapter weights fidelity LESS heavily because matching an unnatural reference is less informative. If the reference is highly natural, fidelity dominates. This is what makes the metric asymmetric in (distorted, reference).",
    accent: "violet" as const,
  },
  {
    id: "output",
    label: "Score",
    sub: "(0, 100)",
    detail:
      "Sigmoid + scale to (0, 100). Higher = better quality. Typical range for normal distortions: 50–90.",
    accent: "cyan" as const,
  },
];

export function AFinePipeline() {
  const [active, setActive] = useState<number>(0);
  const stage = STAGES[active];

  return (
    <figure className="afine-pipeline">
      <figcaption className="afine-pipeline__title">
        A-FINE forward pass — click any stage
      </figcaption>

      <div className="afine-pipeline__track">
        {STAGES.map((s, i) => (
          <button
            key={s.id}
            className={`afine-pipeline__stage afine-pipeline__stage--${s.accent} ${
              i === active ? "afine-pipeline__stage--active" : ""
            }`}
            onClick={() => setActive(i)}
            aria-pressed={i === active}
          >
            <span className="afine-pipeline__stage-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="afine-pipeline__stage-label">{s.label}</span>
            <span className="afine-pipeline__stage-sub">{s.sub}</span>
          </button>
        ))}
      </div>

      <div
        className={`afine-pipeline__detail afine-pipeline__detail--${stage.accent}`}
      >
        <div className="afine-pipeline__detail-header">
          <span className="afine-pipeline__detail-marker" />
          <span className="afine-pipeline__detail-title">
            Stage {String(active + 1).padStart(2, "0")} · {stage.label}
          </span>
        </div>
        <p className="afine-pipeline__detail-text">{stage.detail}</p>
      </div>

      <div className="afine-pipeline__nav">
        <button
          className="afine-pipeline__nav-btn"
          onClick={() => setActive((a) => Math.max(0, a - 1))}
          disabled={active === 0}
        >
          ← Previous
        </button>
        <span className="afine-pipeline__nav-counter">
          {active + 1} / {STAGES.length}
        </span>
        <button
          className="afine-pipeline__nav-btn"
          onClick={() =>
            setActive((a) => Math.min(STAGES.length - 1, a + 1))
          }
          disabled={active === STAGES.length - 1}
        >
          Next →
        </button>
      </div>
    </figure>
  );
}
