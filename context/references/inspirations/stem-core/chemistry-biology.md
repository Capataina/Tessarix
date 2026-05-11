# Chemistry & Biology

Consolidated because each domain has few entries and the patterns overlap (molecular 3D viewers + multi-scale simulators).

---

## Chemistry

### MolView

- **URL**: https://molview.org/
- **What it does**: Search any molecule by name or draw it with a 2D structural editor, then watch the 3D conformation render in WebGL. Rotate, zoom, examine bond angles. Crystallographic databases and spectral data included.
- **Interactive pattern**: Bidirectional highlight (pattern 3) — 2D sketch ↔ 3D model + parameter sliders (pattern 7) for rotation/zoom.
- **For Tessarix**: The sketch-to-3D round-trip is a powerful pattern for any domain with a low-level symbolic representation and a high-level geometric one. Translates to: grammar → parse tree, circuit description → logic gate layout, regular expression → NFA graph.

---

### Falstad Hydrogen Orbital Viewer

- **URL**: https://www.falstad.com/qmatom/
- **What it does**: Select quantum numbers n, l, m from dropdowns; immediately see the 3D orbital density plot update in WebGL. Real vs complex orbitals, cross-sections, combinations.
- **Interactive pattern**: Parameter sliders / dropdowns (pattern 7) → live 3D re-render.
- **For Tessarix**: Shows that "select parameter → re-render complex 3D shape" is viable in-browser even for computationally expensive visualisations. Orbital shapes are described in prose as "dumbbell-shaped" but only understood when you can rotate them yourself — the same applies to any high-dimensional embedding visualisation.

---

## Biology

### Connected Biology

- **URL**: https://connectedbio.org/
- **What it does**: Multi-scale simulation where the reader zooms between population, organism, cell, and molecular levels — all causally linked. A nucleotide mutation at the molecular level propagates up to visible fur-colour changes at the organism level, and then to population-level allele frequency shifts over simulated generations.
- **Interactive pattern**: Multi-level zoom with causal propagation (pattern 5) — the strongest exemplar in the catalog.
- **For Tessarix**: "Same phenomenon visible at multiple levels of abstraction simultaneously" is one of the most powerful teaching structures in existence. Apply to: algorithms (code + data structure state + graph visualisation + performance metric all linked); neural networks (weight matrix + activation map + loss + prediction all linked); microservices (service mesh + individual service + function call + line of code all linked).

---

### HHMI BioInteractive

- **URL**: https://www.biointeractive.org/
- **What it does**: Curated collection of interactive data-analysis tools, 3D animations, and virtual labs developed with research scientists. Phylogenetic-tree builder where readers place species using actual morphological and genetic data; you reason from evidence to construct the tree rather than being shown the tree.
- **Interactive pattern**: Draw-and-simulate (pattern 10) — reconstruct the answer from primary evidence.
- **For Tessarix**: "Reconstruct from evidence" pattern is transferable to algorithm pedagogy — instead of showing how a sorting algorithm produces a sorted array, have the reader sort by constructing the comparisons. Same principle: don't show the answer, have the reader build it.
