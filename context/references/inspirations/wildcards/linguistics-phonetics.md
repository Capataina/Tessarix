# Linguistics & Phonetics

---

### Seeing Speech — University of Glasgow IPA Chart

- **URL**: https://www.seeingspeech.ac.uk/ipa-charts/
- **What it does**: Every IPA symbol is clickable. Clicking one plays the sound AND shows a real MRI video or ultrasound tongue-imaging of the vocal tract producing that phoneme. You can switch between MRI, ultrasound, and 2D animated sagittal-cross-section views for the same sound.
- **Interactive pattern**: Bidirectional highlight (pattern 3, symbol ↔ mechanism) + multi-view pivot (pattern 4, MRI / ultrasound / 2D animation of the same phoneme).
- **For Tessarix**: Multi-representation of the same event is the core pedagogical shape. Translates to showing the same instruction in source code, IR, assembly, and CPU microcode simultaneously — click a line and see it at every abstraction level. Or: a single neural-net layer shown as weight matrix, computation graph, and visualised activation — three views of the same thing.

---

### etytree — Visual Etymology

- **URL**: https://etytree.vercel.app/
- **What it does**: Type any English word and a D3-based force-directed tree grows to show every ancestor word, related cognates across languages, and branching points where the root split into different descendants. Nodes are language-tagged; edges show derivation direction.
- **Interactive pattern**: Draw-and-simulate (pattern 10, the tree generates from your input) + spatial proximity (pattern 6, force-directed positioning) + multi-level zoom (pattern 5, expand a node to see its descendants).
- **For Tessarix**: This is exactly the shape for teaching inheritance hierarchies, dependency resolution, or type-class derivation — generate the tree from a root symbol and explore how it branches. Apply to Rust trait resolution, npm dependency graphs, or Git branch genealogies.

---

### Diachronica — Word History Visualiser

- **URL**: https://diachronica.com/
- **What it does**: 1+ billion words from Old English to present, with five D3 visualisations: phylogenetic tree, force-directed network, timeline, geographic map, and a sunburst. Any word can be traced through its historical usage frequency, cognate network, and geographic spread.
- **Interactive pattern**: Multi-view pivot (pattern 4) — the strongest exemplar of N-representation switching in the catalog + time-scrubber (pattern 8, the timeline view).
- **For Tessarix**: "Five views of one dataset, pivotable on the fly" is the shape for teaching that every data structure is a different view of the same information — pivot between a binary tree, a hash map, a sorted array, and an adjacency list over the same dataset. Demonstrates that the same data is the same data; the structure is the abstraction we impose on it.

---

### Interactive American IPA Chart

- **URL**: https://americanipachart.com/
- **What it does**: A full IPA consonant/vowel grid for American English. Every cell is clickable — clicking plays the sound, shows the place and manner of articulation, and gives a minimal-pair word example. The grid is organised by two orthogonal phonetic parameters: place of articulation (columns) and manner (rows), so proximity on the grid encodes phonetic similarity.
- **Interactive pattern**: Spatial proximity encodes relationship (pattern 6) — 2D parameter grid where both axes are independent phonetic dimensions.
- **For Tessarix**: A 2D grid where both axes are independent parameters and every cell is a distinct configuration is the shape for teaching hyperparameter grids in ML, truth tables in logic, or the full type matrix of a generic type system. Worth copying the grid-as-primary-interface pattern wherever the underlying concept has two orthogonal dimensions.
