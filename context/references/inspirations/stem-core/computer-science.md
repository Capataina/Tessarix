# Computer Science (Algorithms & Data Structures)

Both entries are seed examples from the user. Both occupy the same pedagogical niche — pure algorithm playgrounds — with the main difference being whether narrative is present.

---

### visualgo.net [seed]

- **URL**: https://visualgo.net
- **What it does**: Step-through animations of essentially every undergraduate-CS algorithm — sorting (bubble/merge/quick/Tim/heap/etc), BSTs, heaps, graph algorithms (BFS/DFS/Dijkstra/Bellman-Ford/Floyd-Warshall), string matching, computational geometry. Pure playground, no narrative wrapper.
- **Interactive pattern**: Step-by-step state advance (pattern 9) + draw-and-simulate (pattern 10) — you can configure the input dataset.
- **For Tessarix**: Reference for what an algorithm playground looks like *without* narrative. The lack of narrative is intentional — for some users, the visualisation alone teaches. For Tessarix specifically: the question is whether to wrap visualgo-style playgrounds in narrative (Teach pillar) or expose them raw (a fourth "Explore" mode beyond the three pillars? — open question deferred for now). The `<StepController>` primitive in the M1 plan is the same machinery visualgo uses.

---

### learn-algo / Algorithm Visualizer [seed]

- **URL**: https://algorithm-visualizer.org/ (canonical project) and similarly-named clones at learn-algo.com / learnalgo.com
- **What it does**: Step-through visualisation alongside narrative explanation. Hybrid of visualgo (pure play) and a textbook (pure prose). Code displayed alongside the visualisation; current execution line highlighted.
- **Interactive pattern**: Step-by-step advance (pattern 9) + bidirectional highlight (pattern 3) between code and visualisation + scroll-driven (pattern 2) narrative.
- **For Tessarix**: The "narrative + playground + highlighted code, all synchronised" three-pane layout is the most direct template for a Tessarix algorithm Teach lesson. M1's A-FINE lesson follows this exact shape: prose narrative on the left, an `<ArrayVisualiser>` driven by `<StepController>` in the middle, the source code highlighted on the right.
