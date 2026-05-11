# Blockchain

---

### Tenderly — EVM Debugger & Gas Profiler

- **URL**: https://tenderly.co/debugging-tools
- **What it does**: Paste a transaction hash or simulate a custom transaction. The debugger replays it opcode by opcode: the execution trace panel on the left shows the call tree, the source panel on the right highlights the Solidity line currently executing, and a bottom panel shows live storage, stack, and memory state at each step. A gas flame chart breaks down gas consumed per function and per opcode.
- **Interactive pattern**: Step-by-step advance (pattern 9) + bidirectional highlight (pattern 3, source ↔ trace) + multi-view pivot (pattern 4, trace + source + state + flame chart).
- **For Tessarix**: The "flame chart over execution depth" pattern is directly portable to teaching compute graphs (what fraction of FLOPs is each layer?) or query-plan cost trees. The combination of step-through + flame chart shows two views of the same execution — "where did time/gas/compute go?" answered visually.

---

### ethereum.org docs [seed]

- **URL**: https://ethereum.org/en/developers/docs/
- **What it does**: Standard documentation prose with end-of-page knowledge-check quizzes. The interactive layer is minimal — just inline assessment questions before moving on to the next page.
- **Interactive pattern**: In-prose widgets (cross-cutting) — but minimal. The pattern is "inline end-of-page assessment" — the simplest possible Quiz integration into a Teach lesson.
- **For Tessarix**: A floor for Teach-pillar lesson density — at minimum, every lesson page should end with 2-5 questions before allowing progression to the next. This is what the user cited in the README inspirations table: not a deep interactive pattern, but a non-negotiable baseline expectation. Implement as a `<KnowledgeCheck>` MDX component placed at the end of each section.
