# Mathematics

---

### Immersive Linear Algebra

- **URL**: https://immersivemath.com/ila/index.html
- **What it does**: Full linear-algebra textbook where every theorem and definition has a 3D interactive figure inline. Drag vector endpoints in 3D; watch dot products update as vectors sweep angles; rotate matrix-transformation visualisations; explore eigenvectors as the axes that remain fixed under a given transform.
- **Interactive pattern**: In-prose widgets (cross-cutting) + parameter sliders (pattern 7) on geometric primitives.
- **For Tessarix**: The "inline 3D figure per concept" structure is the exact shape of a Tessarix Teach lesson. Direct template for any concept with geometric meaning. The transition from "drag this arrow concretely" to "here is the equation that describes what you just did" is the pedagogical bridge worth copying exactly.

---

### Seeing Theory

- **URL**: https://seeing-theory.brown.edu/
- **What it does**: Fifteen interactive D3 modules covering a first-semester stats course. Flip biased coins and watch long-run frequencies converge; drag probability masses on a distribution and watch the CLT sampling distribution shift; pull a prior and see a posterior update live on Bayes' theorem.
- **Interactive pattern**: Parameter sliders (pattern 7) + step-by-step advance (pattern 9) for the convergence demonstrations.
- **For Tessarix**: Shows that abstract frequentist/Bayesian intuition — the hardest conceptual hurdle in intro statistics — is buildable entirely from drag-and-sample interactions with no formula required for first contact. Apply directly when teaching probability fundamentals as prerequisites for ML concepts.

---

### Mathigon

- **URL**: https://mathigon.org/courses
- **What it does**: Narrative-driven courses where prose is broken into small steps, and the reader must complete an interactive step (drag a polygon to tile a plane, colour a graph with the minimum chromatic number, build the Sierpinski gasket recursively) before the next paragraph unlocks.
- **Interactive pattern**: Locked-prose gating (pattern 1) — the strongest exemplar in the catalog.
- **For Tessarix**: The "locked prose" gate is one of the strongest forcing functions for active engagement. Consider as a Tessarix Teach mechanic for concept sections where passive reading is insufficient — implement as a `<Gate predicate={...}>` MDX component. Mathigon proves the pattern works for an entire commercial textbook, not just isolated widgets.

---

### Setosa.io — Explained Visually

- **URL**: https://setosa.io/ev/
- **What it does**: Short, single-page visual essays on PCA, eigenvalues/eigenvectors, Markov chains, image kernels, conditional probability, least squares, sine/cosine, exponentiation. Each essay replaces a standard derivation with a live manipulable diagram.
- **Interactive pattern**: Parameter sliders (pattern 7) + in-prose widgets (cross-cutting) — one concept, one page, all interaction.
- **For Tessarix**: "One concept, one page, all interaction" is the cleanest possible unit of a Teach widget. The image-kernels explainer — drag a kernel over an image and watch the convolution output update — is a direct model for how Tessarix could teach CNN filters.

---

### GeoGebra

- **URL**: https://www.geogebra.org/calculator
- **What it does**: Browser-based dynamic geometry and graphing environment. Define functions, drag sliders, watch curves update; place geometric constructions that remain valid as points move; visualise Riemann sums that adjust as partition count changes; plot 3D surfaces.
- **Interactive pattern**: Parameter sliders (pattern 7) + draw-and-simulate (pattern 10) for user-built constructions.
- **For Tessarix**: GeoGebra is the most powerful free authoring environment for the kind of embedded widgets Tessarix needs. The MDX lesson format can embed GeoGebra applets directly via an iframe, with a massive community library of pre-built figures for nearly every undergraduate math topic. Consider as the bootstrap option for any math widget before building the equivalent natively.
