# Databases

---

### B-Tree Simulator (toolkit.whysonil.dev)

- **URL**: https://toolkit.whysonil.dev/simulators/btree/
- **What it does**: Users insert, search, or delete keys one at a time (or seed 15 / 30 / 60 at once). Nodes are rendered graphically; splits animate — the median promotes to the parent and siblings separate visually. A trace panel logs each operation. Live metrics show order, height, node count, and key count. A "Scan" mode runs range queries and highlights the traversal path.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + step-by-step advance (pattern 9) + multi-view pivot (pattern 4, structure + metrics + trace log all live).
- **For Tessarix**: Node-split animation is a crisp example of "local operation, global structure change" — the same teaching pattern works for trie insertion, red-black rotations, neural-net neuron pruning, or graph-algorithm relaxation steps.

---

### boringSQL MVCC Visualiser

- **URL**: https://boringsql.com/posts/postgresql-mvcc-byte-by-byte/
- **What it does**: Embeds a live MVCC simulator alongside annotated prose. Two concurrent sessions run against the same heap page. Users flip between READ COMMITTED and REPEATABLE READ isolation levels and watch xmin/xmax visibility badges on each tuple flip accordingly. Running VACUUM clears dead tuple versions; the "reclaim count" shows what the GC can and cannot collect while a snapshot is held.
- **Interactive pattern**: Parameter sliders / toggles (pattern 7) + state-overlay (pattern 15, two concurrent observers) + in-prose widgets (cross-cutting).
- **For Tessarix**: The "two concurrent observers, each with a different view of the same state" widget pattern translates directly to teaching distributed consensus (two nodes' logs diverge) or cache coherence. The boringSQL inline format — paragraph, embedded widget, paragraph — is a strong template for any Tessarix lesson on a stateful subsystem.

---

### Jovis — PostgreSQL Query Optimiser Visualiser

- **URL**: https://arxiv.org/html/2411.14788v2 (paper); jovis.ai (tool)
- **What it does**: Visualises the query optimiser's dynamic-programming join-enumeration as a directed acyclic graph. Users can see every partial plan considered, the cost assigned to each, and why the planner chose its final plan. Tweak join-order hints or disable specific indexes, and the DAG regenerates to show how the plan space changes.
- **Interactive pattern**: Parameter sliders / toggles (pattern 7) + multi-view pivot (pattern 4) + bidirectional highlight (pattern 3, plan node ↔ cost).
- **For Tessarix**: Externalising a search process that is normally opaque (optimiser, beam search, A*, MCTS) as a navigable DAG is a teaching pattern with broad applicability. Any topic where the algorithm's value comes from search rather than computation should consider this representation.
