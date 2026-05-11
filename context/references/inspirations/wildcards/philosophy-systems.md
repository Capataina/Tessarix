# Philosophy & Systems Thinking

The Nicky Case body of work dominates this folder. Case has built the strongest examples of "the medium is the message" and "play the mechanic first, name the theory second" in the catalog — these tools are worth deep study.

---

### Nicky Case — The Evolution of Trust

- **URL**: https://ncase.me/trust/
- **What it does**: An interactive guide to iterated Prisoner's Dilemma. You play rounds against different agents (Copycat, Cheater, Grudger, Detective), observe how strategies evolve over tournaments of thousands of rounds, and then manipulate tournament parameters (noise rate, payoff matrix) to see how cooperative equilibria emerge or collapse.
- **Interactive pattern**: Concept enacted by the medium (pattern 12) + parameter sliders (pattern 7) + game/puzzle constraint structure (cross-cutting) + draw-and-simulate (pattern 10) in the tournament-customisation stages.
- **For Tessarix**: The "play the mechanic first, name the theory second" structure is the most transferable pattern on the wildcards list. You understand the Prisoner's Dilemma by experiencing it, not reading its definition. The same pattern teaches backpropagation (play a round of gradient descent by hand before seeing the formula), TCP handshake (play the handshake as a card game), or mutex contention (play the dining philosophers problem). Reserve this pattern for concepts where the gameplay genuinely IS the concept, not where gameplay is a thin wrapper around prose.

---

### Argdown — Live Argument Map Editor

- **URL**: https://argdown.org/
- **What it does**: A markdown-like syntax where you write premises, conclusions, and attack/support relationships as plain text. The right-hand panel renders a live argument map (directed graph) in real time as you type. Circular reasoning and unsupported claims are flagged.
- **Interactive pattern**: Bidirectional highlight (pattern 3, text ↔ graph) + draw-and-simulate (pattern 10, you author the graph through text) + live model inference (pattern 14, the parser runs on every keystroke).
- **For Tessarix**: "Write structured text, see a graph update live" is the pattern for teaching dataflow analysis, type systems, or dependency graphs — write a program and watch the call graph or type-inference graph update in real time. Argdown's text-to-graph dual representation is the cleanest non-domain-specific exemplar.

---

### Nicky Case — LOOPY: Systems Thinking

- **URL**: https://ncase.me/loopy/
- **What it does**: Draw circles (variables) and connect them with positive or negative causal arrows. Hit play and watch the system evolve. Balancing loops self-correct; reinforcing loops amplify. You can drag-simulate any node to inject a perturbation and watch feedback propagate.
- **Interactive pattern**: Draw-and-simulate (pattern 10) — the strongest exemplar of "let the reader build the model" in the catalog + live model inference (pattern 14, the simulation runs after you finish drawing) + shareable scenario URLs (cross-cutting).
- **For Tessarix**: Directly teaches feedback loops, which appear in ML optimisation, distributed systems, and control theory. The "draw the causal graph yourself, then simulate it" shape is the pattern for teaching gradient descent, epidemiological SIR models, or microservices dependency cycles. Reserve for concepts where the *act of building* surfaces understanding the *finished diagram* would not.
