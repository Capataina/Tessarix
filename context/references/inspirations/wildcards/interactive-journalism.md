# Interactive Journalism

The Pudding (pudding.cool) is one of the most consistent producers of interactive educational content outside of formal courseware. The pieces here are journalism by genre but pedagogy by function — they teach a concept through interaction, then move on.

---

### The Pudding — Musical Motifs: How Musicals Tell Stories

- **URL**: https://pudding.cool/2025/12/motifs/
- **What it does**: Visualises recurring musical motifs in Broadway scores. As you scroll, a score-follower highlights the motif in the sheet music, the audio plays it, and a timeline shows every occurrence across the full show. You can filter by character or scene to see how a motif is transformed.
- **Interactive pattern**: Scroll-driven (pattern 2) + bidirectional highlight (pattern 3, audio ↔ score) + time-scrubber (pattern 8, occurrence timeline) + parameter sliders / filters (pattern 7) — strong multi-pattern composition.
- **For Tessarix**: "See every occurrence of a pattern across a corpus, with audio/visual context for each hit" translates to teaching regex (highlight every match across a sample text), design-pattern recurrence (highlight every place a pattern appears in a codebase), or call-graph traversal (highlight every place a function is called with each surrounding context shown).

---

### The Pudding — Music DNA Legacies

- **URL**: https://pudding.cool/2025/04/music-dna/
- **What it does**: Traces the lineage of musical influence from classical works through to contemporary hip-hop as an interactive DAG. Each node is a genre or artist; edges represent documented influence. Clicking a node plays a sample and shows its upstream and downstream influences.
- **Interactive pattern**: Multi-level zoom (pattern 5) on a DAG + bidirectional highlight (pattern 3, node ↔ audio sample) + draw-and-simulate-adjacent (pattern 10, the DAG was authored but feels explorable).
- **For Tessarix**: This is the pattern for a visual dependency graph where each node is **executable** — click a node in a call graph, run it, and see its callers and callees expand. Translates to: a CI/CD pipeline visualiser where each stage can be re-run; a make-graph where each rule can be triggered individually; a notebook-cell graph where each cell shows its dependencies.
