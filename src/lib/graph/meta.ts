/**
 * Concept-graph metadata, keyed by lesson slug. This is the authored source the
 * graph + concept index are derived from (see context/plans/curriculum-graph.md):
 *
 *   category  — the top-level domain (also the colour scheme; visual-identity.md)
 *   topic     — the mid-level grouping inside a category (the browse tree node)
 *   teaches   — the concepts this lesson OWNS (the `taught-by` edge; the concept
 *               index maps each of these → this slug)
 *   strong    — the cross-domain subset of `teaches`: concepts relevant in every
 *               domain, so the prose linker links them GLOBALLY. Everything else
 *               in `teaches` is "contextual" (linked only inside this category).
 *               See context/plans/authored-prose-autolinking.md.
 *   aliases   — extra surface forms the linker should also match for a concept
 *
 * Prerequisites live in each lesson's MDX frontmatter (already), and are folded
 * in by buildGraph(). Keeping teaches/category/topic here (synchronous) lets the
 * concept linker work without resolving the async frontmatter.
 */

export type Category = "Mathematics" | "Machine Learning";

export interface LessonMeta {
  category: Category;
  topic: string;
  teaches: string[];
  /** Cross-domain subset of `teaches` (linked globally); the rest is contextual. */
  strong?: string[];
  aliases?: Record<string, string[]>;
}

export const LESSON_META: Record<string, LessonMeta> = {
  afine: {
    category: "Machine Learning",
    topic: "Image Quality",
    teaches: ["A-FINE", "PSNR", "SSIM", "image quality assessment", "fidelity ratio"],
    aliases: {
      PSNR: ["peak signal-to-noise ratio"],
      SSIM: ["structural similarity"],
      "image quality assessment": ["IQA"],
    },
  },
  "linear-algebra-foundations": {
    category: "Mathematics",
    topic: "Linear Algebra",
    teaches: ["scalar", "vector", "vector addition", "scalar multiplication"],
    // scalar + vector are universal; the two operations are more domain-local.
    strong: ["scalar", "vector"],
    aliases: { vector: ["vectors"] },
  },
  "linear-algebra-matrices": {
    category: "Mathematics",
    topic: "Linear Algebra",
    teaches: ["matrix", "linear transformation", "determinant", "basis vectors"],
    strong: ["matrix", "linear transformation", "determinant"],
    aliases: { matrix: ["matrices"], "linear transformation": ["linear transformations"] },
  },
  "linear-algebra-dot-product": {
    category: "Mathematics",
    topic: "Linear Algebra",
    teaches: ["dot product", "cosine similarity", "projection", "orthogonality"],
    strong: ["dot product", "cosine similarity", "projection", "orthogonality"],
    aliases: { orthogonality: ["orthogonal", "perpendicular"] },
  },
  "linear-algebra-span": {
    category: "Mathematics",
    topic: "Linear Algebra",
    teaches: ["span", "linear combination", "linear independence"],
    aliases: {
      "linear combination": ["linear combinations"],
      "linear independence": ["linearly independent", "linearly dependent"],
    },
  },
  "linear-algebra-matrix-operations": {
    category: "Mathematics",
    topic: "Linear Algebra",
    teaches: ["matrix multiplication", "transpose", "matrix addition"],
    strong: ["matrix multiplication", "transpose"],
    aliases: { "matrix multiplication": ["matrix multiply", "matrix product"] },
  },
  "linear-algebra-matrix-inverse": {
    category: "Mathematics",
    topic: "Linear Algebra",
    teaches: ["matrix inverse", "Gaussian elimination", "singular matrix", "row reduction"],
    strong: ["matrix inverse"],
    aliases: {
      "matrix inverse": ["inverse matrix", "matrix inversion"],
      "Gaussian elimination": ["row reduction", "RREF"],
    },
  },
  "linear-algebra-basis": {
    category: "Mathematics",
    topic: "Linear Algebra",
    // All contextual (no `strong`): "basis" is polysemous ("on a regular basis",
    // "basis points"), so it must not link cross-domain. The `bases` alias is
    // deliberately dropped — noun("bases")="base" would drag "base case" in.
    teaches: ["basis", "change of basis", "coordinates"],
  },
};
