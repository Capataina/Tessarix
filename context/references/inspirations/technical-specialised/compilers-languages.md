# Compilers & Programming Languages

---

### Compiler Explorer (Godbolt)

- **URL**: https://godbolt.org/
- **What it does**: Write source code (C++, Rust, Go, Zig, and 40+ languages) in the left pane; the right pane shows the compiled assembly or LLVM IR, updated on every keystroke. Color-coded line mapping links each source line to its generated instructions. Switch compiler versions, toggle `-O2` / `-O3` flags, add optimisation remarks, or inspect specific LLVM passes. Multi-pane: source → IR → assembly, or two compilers side by side.
- **Interactive pattern**: Bidirectional highlight (pattern 3) — the canonical exemplar of source ↔ derivative + live model inference (pattern 14, the compiler runs in real time) + multi-view pivot (pattern 4, source / IR / assembly).
- **For Tessarix**: "Change one input token, watch the pipeline output change" maps directly to teaching tokenisation, parse-tree reconstruction, IR lowering. Compiler Explorer is the closest-in-kind inspiration for any Tessarix lesson on a compiler pipeline or a multi-stage transformation. The colour-coded line-mapping discipline is worth copying exactly.

---

### AST Explorer

- **URL**: https://astexplorer.net/
- **What it does**: The reader types source code in any of ~100 supported languages/parsers and the AST renders synchronously in the right panel. Click any AST node and the corresponding source text highlights; click source text and the node highlights. Switch parsers to see how the same code parses differently under different grammars.
- **Interactive pattern**: Bidirectional highlight (pattern 3) + live model inference (pattern 14, the parser runs live) + multi-view pivot (pattern 4, parser-comparison view).
- **For Tessarix**: The bidirectional correspondence — click a node, see source; click source, see node — is the definitive way to teach syntactic structure. The pattern translates to any topic with two isomorphic representations: a formula and a computation graph, a recursive call and a call-stack trace, a regular expression and its NFA, a type-derivation and an expression.

---

### FSM Simulator (ivanzuzak)

- **URL**: https://ivanzuzak.info/noam/webapps/fsm_simulator/
- **What it does**: Define a finite automaton (states, transitions, alphabet) via a text notation or by clicking a graph editor. Feed an input string and step through execution one symbol at a time: the current state highlights, the remaining input shrinks, and accept/reject status updates. Companion tool FSM2Regex converts automata back to regular expressions.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + step-by-step advance (pattern 9) + bidirectional highlight (pattern 3, between FSM and regex via FSM2Regex).
- **For Tessarix**: The "step one symbol, advance the machine" interaction is the simplest possible version of "step one token, advance a neural sequence model" — a clean template to borrow. The text-or-graph dual authoring mode (write FSM as text OR draw it as a graph) is also a useful pattern for any structured-data authoring.
