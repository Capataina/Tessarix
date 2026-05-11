# Music Theory

---

### Hooktheory — TheoryTab + Trends

- **URL**: https://www.hooktheory.com/theorytab
- **What it does**: A database of 40,000+ songs broken into Roman-numeral chord analyses. You play any song's chord progression in the browser with a piano roll. The Trends tool lets you enter a progression and instantly see every other song that uses it. Chords are colour-coded by scale degree so the same logic looks the same in every key.
- **Interactive pattern**: Bidirectional highlight (pattern 3, chord ↔ audio + chord ↔ Roman numeral) + multi-view pivot (pattern 4, song view ↔ corpus view) + spatial proximity / colour encoding (pattern 6, scale-degree colour) — strong multi-pattern composition.
- **For Tessarix**: "Enter a pattern, see every place it appears across a corpus" is exactly how you'd want to teach design patterns (enter a pattern shape, see every canonical implementation). The colour-coding-by-role-not-absolute-value is a direct steal for teaching variable binding or scope in a language runtime — the same identifier should look the same regardless of which concrete value it currently holds.

---

### muted.io

- **URL**: https://muted.io/
- **What it does**: A dense suite of interconnected music-theory reference tools: circle of fifths (click any key, all diatonic chords highlight), scale/mode explorer (pick a root, pick a mode, hear it, see every note on a piano roll), interval ear trainer, chord-quality player, and a theory cheat sheet that recomputes every relationship for the key you select.
- **Interactive pattern**: Parameter sliders / selectors (pattern 7) + spatial proximity (pattern 6, the circle of fifths) + multi-view pivot (pattern 4, the same key shown in multiple representations).
- **For Tessarix**: The "change one variable and everything that depends on it re-derives itself" pattern is directly applicable to teaching equation systems, type inference, graph algorithms. The circle-of-fifths layout — where spatial proximity encodes mathematical relationship — is a template for teaching modular arithmetic or lattice structures.

---

### Chord Progressor — Tonnetz Visualiser

- **URL**: https://chordprogressor.com/
- **What it does**: Renders chords as regions on a Tonnetz — a mathematical lattice where harmonic distance is literal geometric distance. Clicking a chord plays it and lights up the region; dragging across the lattice builds progressions. Pivot-key modulations are shown as the overlap between two lattice regions.
- **Interactive pattern**: Spatial proximity encodes relationship (pattern 6) — the strongest exemplar in the catalog where the topology IS the mathematics.
- **For Tessarix**: The Tonnetz is a graph where topology encodes a mathematical relationship. The same pattern (spatial proximity = conceptual relatedness) could teach graph distances, vector-space embeddings (where 2D projections of high-dimensional embeddings make semantic distance visible), or lattice-based type systems.
