# History, Geography & Art

Consolidated because all four entries share the same dominant pattern (time-scrubber + zoom + spatial canvas) — they are the same shape applied to different domains.

---

### Histography — Timeline of All History

- **URL**: https://histography.io/
- **What it does**: Pulls every event from Wikipedia and renders it as a dot on a 14-billion-year horizontal timeline. Left-sidebar categories (wars, literature, inventions, disasters) act as filters; a bottom scrollbar zooms to named eras (Stone Age, Renaissance, Industrial Revolution). Each dot opens its Wikipedia article in a panel.
- **Interactive pattern**: Time-scrubber (pattern 8) + multi-level zoom (pattern 5) + parameter sliders / filters (pattern 7).
- **For Tessarix**: Pure "zoom and filter a massive dataset across a time axis" shape. Translates to visualising commit history, the chronological evolution of an algorithm (e.g. sorting algorithms from bubble → merge → Timsort), or the history of ML loss functions.

---

### Chronas — Interactive Historical Atlas

- **URL**: https://www.chronas.org/
- **What it does**: A world map where every border, ruler, religion, and culture is indexed by year. A time slider scrubs from 200 AD to the present; clicking any region opens a Wikipedia entry for that nation at that moment. Sunburst charts show demographic composition at the selected year.
- **Interactive pattern**: Time-scrubber (pattern 8) on a geographic canvas + bidirectional highlight (pattern 3, region ↔ details) + multi-view pivot (pattern 4, map + sunburst).
- **For Tessarix**: "Scrub time on a spatial canvas, click a region to see what it contains at that moment" maps cleanly to visualising how a distributed system's state (partitions, leaders, replicas) changes over time, or how a compiler's IR looks at each optimisation pass.

---

### Running Reality — World History in 3D

- **URL**: https://www.runningreality.org/
- **What it does**: An interactive map that renders the world at any chosen date, showing the growth and fall of every city, the extent of every empire, and how roads, trade routes, and borders evolve. You type a year and the map rebuilds.
- **Interactive pattern**: Parameter input (pattern 7) → full world-state rerender (time-scrubber pattern 8 via discrete dates).
- **For Tessarix**: "Set a parameter and get the full system state at that moment" is the shape for teaching distributed consensus (what does the system look like at logical time T?), version-control branching, or neural network training (what does weight space look like at epoch N?).

---

### WCMA Collection Explorer (Williams College Museum of Art)

- **URL**: https://artmuseum.williams.edu/wcma-digital-project/
- **What it does**: Presents the entire 12,400-object WCMA collection on a single zoomable canvas using a pan-and-zoom interaction model borrowed from online maps. You start at a bird's-eye view of every work simultaneously and drill down to a full-resolution detail view of a single painting — no pagination, no list.
- **Interactive pattern**: Multi-level zoom (pattern 5) on a spatial canvas + spatial proximity (pattern 6, clustering by period/medium).
- **For Tessarix**: "Zoom from dataset overview to individual item without losing spatial context" translates directly to exploring a codebase's dependency graph, a neural-network layer topology, or a corpus of algorithms — let users pan across the whole field and zoom to any node, with semantic clustering visible in the layout.
