# Tessarix

A local-first, interactive learning substrate. Tessarix is a desktop app that teaches abstract concepts — software, mathematics, machine learning, finance, and adjacent domains — through narrative lessons fused with embedded interactive widgets, drill-down playgrounds, and step-throughable visualisations, rather than plain prose.

The bet: when an abstract topic is reduced to a wall of text it loses the dimension that makes it understandable. Interactive, visual, and step-throughable representations restore that dimension. Tessarix is the substrate for learning in that mode.

It is authored against — and consumes — a personal `Learning/` archive (Foundations + Domains + per-project notes) as research input, but emits qualitatively richer content than the source notes: lessons, question banks, and playgrounds, navigated as a hypertext graph rather than a slideshow.

> The canonical design history for this project lives in the LifeOS vault at `Projects/Potential Projects/Adaptive Learning Helper.md`. This README is the working, self-contained description of the project as it is being built.

---

## 1. The problem and the shape of the bet

Reading through countless pages of prose to learn a complex topic is slow, low-signal, and easily skimmed. The same content, structured as retrieval practice + interactive widgets + step-through visualisations, is qualitatively faster and stickier.

Three motivating examples — each one a concept the author has already invested in but does not fully understand from prose alone:

| Concept | Prose-only mode | Interactive mode |
|---|---|---|
| **A-FINE** (a robust regression metric, burn PR #4894) | Read paper, scroll videos, still hazy. | Sensitivity curve as a slider-bound function + the metric computed step-by-step on a tiny illustrative input. |
| **Hebbian plasticity** ("neurons that fire together, wire together") | Sterile single-line maxim. | Interactive neural-web where co-firing neurons darken their connecting edge in real time. |
| **Algebra / calculus** | Hand-solve, hope it sticks. | Real-time renderer with sliders, coefficients, and variables — intuition for how the function responds. |

The bet is that authoring lessons in this richer mode is worth the cost — and that a small, well-chosen component library is the leverage point that makes per-lesson authoring cheap once the substrate is built.

---

## 2. Inspirations (a deliberate blend, not a clone)

| Reference | Pattern borrowed |
|---|---|
| [Brilliant.org](https://brilliant.org) | Lesson narrative with embedded interactive widgets + problems woven through |
| [Cartesian.app](https://cartesian.app) | Visualisation-first drill-down pages |
| [visualgo.net](https://visualgo.net) | Pure algorithm playgrounds (no narrative wrapper) |
| [learn-algo.com](https://learn-algo.com) | Step-through visualisation alongside narrative |
| [ByteByteGo](https://bytebytego.com) | Diagram + technical-depth illustrations where interactivity is the wrong tool |
| [ethereum.org docs](https://ethereum.org/en/developers/docs/) | End-of-page knowledge-check questions inline with the lesson |

No single one is the model. The product is a hypertext graph: enter via a narrative lesson, drill into a Cartesian-style playground when you want to manipulate, drop into a ByteByteGo diagram when the topic needs static depth, hit end-of-page assessments before moving on. In-lesson hyperlinks navigate between nodes; breadcrumbs return you to where you came from.

---

## 3. The three pillars (branches, not steps)

For any given concept, Tessarix offers three branches. These are **alternative views** over the same underlying content + question bank — not a linear progression.

```
                         Concept (e.g. /cnn)
                                 |
        +------------------------+------------------------+
        |                        |                        |
      Teach                    Quiz                   Interview
     (/cnn)                 (/cnn/quiz)            (/cnn/interview)
        |                        |                        |
   MDX lesson           SR-paced questions       Free-response slots
   + widgets            + within-session         + optional timer
   + diagrams             adaptive difficulty    + Claude-graded
   + 2-5 inline          + question-shape          feedback
     assessments           variety
```

| Branch | Purpose | Shape |
|---|---|---|
| **Teach** | Build understanding of a new concept | MDX lesson: narrative prose + KaTeX math + embedded interactive widgets + drill-down links into playgrounds + ByteByteGo-style diagrams where interactivity is the wrong tool + 2–5 inline end-of-page assessment questions. |
| **Quiz** | Active retrieval-practice | Question-only view sourced from the same topic's question bank, with SM-2 / FSRS spacing + within-session adaptive difficulty + question-shape variety (MC, T/F, fill-in-blank, cloze, open-ended). |
| **Interview** | Rehearse explaining the concept under pressure | Full question bank + free-response slots + optional timer + Claude-API-graded responses against a per-question rubric. |

Routing convention: `/<topic>` is teach view, `/<topic>/quiz` is quiz view, `/<topic>/interview` is interview view. Same content + same question bank, three rendering modes.

### The adaptive trajectory (worked example)

Pick a topic — say, the Nyquestro order-matching engine. The system starts at Foundations tier (core types, error model, fill semantics). If answers come back right, it picks up the pace and jumps ahead to the matching-engine + observability tier. The moment it sees a mistake, it switches modes: rather than just marking "wrong", it **generates a real-time guiding question** that scaffolds toward the answer — an open-ended prompt that has the learner think and find the gap themselves.

The artefact the system produces over time is the per-session adaptive trajectory + the long-term retention curve across topics, not just a Leitner-box card deck.

---

## 4. How learning happens — the lesson philosophy

Sections 1 and 3 set up *how* Tessarix teaches (interactive, not prose) and the three modes a concept is offered in. This section is the layer beneath both: the **content philosophy** that governs how every lesson is authored. Two bets sit at the root —

- **How we teach** — interactive, manipulable, visual. Calibration transfers through the reader's hands, not through description.
- **What we teach** — the *lineage* of an idea, not just its polished final form. A concept is the surviving answer to a question; teach the question, the dead alternatives, and where the answer breaks.

Every principle below follows from those two bets. Each is a hard authoring discipline with a full note in [`context/notes/`](context/notes/) — the table is the index; the notes are the contract. A lesson that violates one is a first draft, not a finished lesson.

| Principle | Why it exists | What it does for the reader | The failure it prevents |
|---|---|---|---|
| **[Interactive over prose](context/notes/visualisation-over-prose.md)** | A static formula plus a paragraph is the job a textbook already does better; the product's whole differentiator is manipulation. | The reader *feels* how fast a metric collapses under a 2px shift, at what threshold, by how much — calibration, not just the stated fact. | A visualisable concept rendered as prose: the reader is *told* a phenomenon exists but never *sees* it. A textbook clone. |
| **[Lineage over snapshot](context/notes/lineage-over-snapshot.md)** | A concept is the surviving answer to a question someone couldn't answer; the *why* transfers, the bare definition decays. | The reader can reconstruct the idea from its purpose, and knows the dead alternatives, the boundary where it breaks, and what it buys. | "I understand what the final version looks like, but not why any of it came to be." The argument deleted, only the winner shown. |
| **[Creative widgets, never a default chart](context/notes/widget-creativity-discipline.md)** | A chart shows an operation's *output* without embodying its *meaning*; a two-draft rule forces a metaphor before any widget is built. | The reader experiences what the operation *is* — stacking, projecting, deforming, racing a clock — not just a response curve. | Every widget collapsing to slider-left / chart-right, the path of least resistance, leaving the differentiator on the floor. |
| **[Explanations adapt to state](context/notes/explanations-must-adapt-to-state.md)** | Once a widget is interactive, a hardcoded caption cannot describe the state the reader actually produced; the LLM can. | The reader always knows *what they are seeing*, grounded in their exact values, and can ask a question scoped to the current state. | The "multiple things changed — try isolating one at a time" dead caption: interactivity wasted because the words can't keep up. |
| **[Test understanding, not memory](context/notes/assessment-design.md)** | An assessment answerable by recalling the prose tests attention, not understanding; each question shape probes a different cognitive demand. | The reader has to *use* the mechanism — reach a target state, predict-then-verify, spot the bug — which is impossible without a real model of it. | MCQ-everywhere: a one-dimensional signal that rewards retrieval and never finds out whether the reader can reason. |
| **[Authored questions, adaptive help](context/notes/assessment-design.md)** | A small local model will happily write a question whose "correct" answer is wrong; the hard craft is the plausible-but-wrong distractor. | Questions grade cleanly and reproducibly with author-grade traps, while hints and per-pick explanations still personalise via the LLM. | Outsourcing the assessment surface to the model: silent wrong answers, toothless distractors, no reviewer control. |
| **[Reader controls the depth](context/notes/interface-affordances.md)** | One reader wants the elevator pitch, another the full edge-case tour; same source MDX, three rendering depths (essential / standard / complete). | The reader shapes the lesson to their need instead of being handed one fixed length and told to cope. | One-size lessons: too shallow for the committed learner, too long for the one who only wants orientation. |
| **[Direct manipulation everywhere](context/notes/interface-affordances.md)** | The first instinct on seeing a dot on a field is to grab it; mode-flipping is friction, showing both states at once is clarity. | The reader reaches straight for the diagram, and sees both halves of a pair (A and A⁻¹, AB and BA) at the same time. | Slider-only widgets that force an unnatural loop; swap-toggles that make the reader hold the old state in their head. |
| **[Canonical voice](context/notes/lesson-voice.md)** | Voice is what makes content a *lesson* and not a wiki entry: a warm, commanding lecturer who makes the obvious sound striking. | The reader is carried by one recognisable author whose register shifts to the moment — story, definition, trap, aside. | Robotic encyclopedia prose, YouTube-intro hype, or precious wonder — three ways a lesson stops sounding like a person. |
| **[Lessons are living documents](context/notes/lessons-as-living-documents.md)** | The widget kit and the author's understanding both grow; a lesson should absorb new primitives without a rewrite, and link out rather than bloat. | The reader walks a connected hypertext graph — cross-page links, a glossary, a chat safety-net — and old lessons keep getting better. | Monolithic lessons that teach their whole lineage inline, and permanent quality variance between the first lesson and the tenth. |

The throughline across all ten: **wherever a runtime capability — a widget, the LLM, or the reader's own hand — can do better than a static authored artefact, use it; and wherever understanding depends on the *why*, teach the history, not just the latest version.**

---

## 5. Architecture

Tauri 2 shell wraps a Vite + React 19 + TypeScript frontend. The frontend reads MDX lessons and typed question banks; a TSX component library renders interactive widgets; a SQLite database holds spaced-repetition state; the Claude API powers the optional sync-learning authoring agent and the interview-view grader.

```
+----------------------------------------------------------+
|                       Tauri 2 shell                       |
|                                                          |
|   +---------------+         +-------------------------+  |
|   |  Vite + React |  IPC    |  Rust backend           |  |
|   |  + MDX        |<------->|  - SQLite (WAL)         |  |
|   |  + KaTeX      |         |    spaced-rep + session |  |
|   |  + Monaco     |         |  - Claude API client    |  |
|   |  + Konva/SVG  |         |    (grader + sync agent)|  |
|   +-------+-------+         +-----------+-------------+  |
|           |                             |                |
|           v                             v                |
|   lessons/<slug>.mdx          .claude/skills/            |
|   lessons/<slug>.questions.ts   sync-learning-app/  -->  |
|   playgrounds/<slug>/                                    |
|   components/                  (reads vault Learning/    |
|                                 emits draft MDX)         |
+----------------------------------------------------------+
```

### 5.1 Content shape

```
lessons/<topic-slug>.mdx              # narrative + embedded widgets + inline assessments
lessons/<topic-slug>.questions.ts     # typed question bank (consumed by quiz + interview)
playgrounds/<slug>/                   # per-algorithm or per-concept playground code
components/                           # the TSX component library
  visualisers/                        # StepController, ArrayVisualiser, NeuralNetVisualiser, ...
  assessments/                        # CodeQuestion, MultipleChoice, FreeResponse, ...
  navigation/                         # breadcrumbs, drill-down links, topic graph
```

A single concept is `lessons/<slug>.mdx` + `lessons/<slug>.questions.ts` + optionally one or more `playgrounds/<slug>/`. The MDX file embeds widgets directly; the question bank is shared by quiz and interview views.

### 5.2 Component library (grows opportunistically)

The library is the **residue of authoring real lessons**, not a pre-built upfront monolith. Each new lesson reuses primitives + occasionally adds one.

**Visualisation / drill-down primitives:**

- `<StepController>` — generic step-through controller; drives any visualiser given a list of steps.
- `<ArrayVisualiser>`, `<TreeVisualiser>`, `<GraphVisualiser>`, `<MatrixVisualiser>`, `<NeuralNetVisualiser>` — typed data-structure visualisers consumed by `<StepController>`.
- `<FunctionGrapher>` — equation with slider-bound variables; real-time graph render.
- `<CodeEditor>` — Monaco-based, sandboxed JS/TS eval; drives playground re-runs on edit.
- `<Diagram>` — illustrated SVG wrapper for ByteByteGo-style content.

**Assessment primitives:**

- `<CodeQuestion tests={...} starter="..." />` — Monaco + test runner ("write a function that does X").
- `<MathQuestion answer="..." />` — input field + symbolic compare or numeric tolerance.
- `<VariableFinder eq="..." given={{...}} find="x" />` — fill-in-the-blank for equations.
- `<FillInTheBlank />`, `<MultipleChoice />`, `<TrueFalse />` — simpler shapes.
- `<FreeResponse rubric="..." />` — interview-only; pipes answer + rubric to the Claude API for graded feedback.

### 5.3 Playground engine: semi-generic, not fully generic

Fully-generic (parse arbitrary algorithm code, infer data structures from runtime, polymorphic visualisation across all types) is essentially building a small visualisation IDE — months of work for marginal gain at the self-audience quality bar.

Semi-generic is the chosen starting point: `<StepController>` + the typed data-visualiser library + per-algorithm code that calls into them. Lesson author writes:

```tsx
const steps = bubbleSort(input);
return (
  <StepController steps={steps}>
    <ArrayVisualiser data={state.array} highlights={state.compared} />
  </StepController>
);
```

The "edit code and watch it break" workflow still works: `<CodeEditor>` re-runs the visualiser on every edit. Per-algorithm authoring cost after the engine ships is short; initial engine scaffold cost is substantial but bounded.

Fully-generic can graduate from semi-generic later if patterns repeat enough to obviously pay. The abstraction is not pre-built.

---

## 6. The sync-learning agent (autonomous AI authoring layer)

The vision: Tessarix reads the personal `Learning/` archive, semantically decides what's new versus what's already covered, and emits structured lesson scaffolds + question-bank entries. This is an AI authoring layer, not a copy operation.

**Worked example:** thirteen new CNN-related files land in the `Learning/` archive. Running `sync-learning` (a vault-local skill or in-app command) triggers an agent that:

1. Reads the new content.
2. Cross-references existing Tessarix lessons.
3. Classifies the deltas: *new topic*, *extension of existing*, *cross-cutting pattern*.
4. Emits drafts to `lessons/_drafts/` — e.g. "2 new lessons (CNN Fundamentals, CNN Architectures) + 4 sections appended to existing lessons (Image Recognition Pipeline, Convolution Math, Feature Extraction, Backprop in CNNs)".
5. Inserts `<TODO />` placeholders where the LLM cannot credibly author the interactive widget.

**Hard rule: drafts are never auto-applied.** Generated narrative needs an editorial pass because the LLM can write the prose but cannot author the visualisations + interactive widgets that are the whole point of the project. The agent's job is to compress hours of prose-authoring; widgets stay manual until the component library is rich enough that the LLM can plausibly compose them too.

The earlier "read note → generate quiz cards" agent is the **quiz-side equivalent**: same pattern, different output shape (question-bank entries instead of MDX narrative). Both can share a single `.claude/skills/sync-learning-app/` skill or split into two with shared prompt scaffolding.

---

## 7. The adaptive scheduler

The quiz pillar is where adaptive-spaced-repetition lives. It is deliberately more than an Anki/SM-2 clone.

| Layer | Role |
|---|---|
| **Long-term spacing** | SM-2 baseline; FSRS as a swap-in later if benchmarks warrant. Per-card decay + review intervals are scheduled across sessions. |
| **Within-session adaptive difficulty** | Tracks per-topic mastery and per-question-shape competence in-session. Modulates which scheduled card surfaces next (and at which difficulty band). |
| **Question-shape variety** | MC for high-confidence checks, open-ended for low-confidence probes, fill-in-the-blank for vocabulary, code-question for procedural skill. The shape is chosen per-question, not per-deck. |
| **Real-time guiding questions** | When the learner stumbles, the system generates a follow-up that scaffolds toward the answer rather than reading the source note aloud. |
| **Per-topic mastery view** | Not "60% retained in deck X"; rather "Foundations: mastered; Phase-2 HFT: 40%, weak on order-book invariants". The mastery model is multi-dimensional. |

The naive "got it right → harder, got it wrong → easier" loop converges on a single difficulty band fast and stops surfacing new content. The scheduler's job is to **avoid that collapse** — using a multi-dimensional model rather than a single difficulty scalar.

---

## 8. Stack

| Layer | Choice | Reason |
|---|---|---|
| App shell | Tauri 2 | Native binary + webview frontend — full CPU/GPU access for heavy visualisations while keeping the MDX + TSX stack natural. |
| Frontend | Vite + React 19 + TypeScript | Modern, fast HMR, type-safe component library, MDX ecosystem maturity. |
| Content layer | MDX | Markdown with embedded React components — the natural fit for "narrative + widgets". |
| Math | KaTeX | Fast, dependency-free typesetting. |
| Syntax highlighting | Shiki | High-quality, theme-flexible code rendering. |
| Code editor | Monaco | Same engine as VSCode; powers both code-question widgets and playground editing. |
| Visualisation primitives | SVG (diagrams, grid viz) + Canvas/Konva (high-frame-rate animation) + react-flow / xyflow (node-graph viz like neural nets) | Right tool per visualisation class. |
| Storage | SQLite (WAL mode) | Spaced-repetition state + session history + per-topic mastery + question-bank cache. Local-first, durable, simple. |
| LLM agent | Claude API | Sync-learning content + question generator, plus the free-response grader. |
| Deployment | Tauri desktop only initially | Web build is a config flip later if portfolio framing demands it. |

**Why Tauri specifically:** plain web cannot reliably tap CPU/GPU for the heavier visualisations (large neural-net renders, real-time function-grapher with many concurrent sliders, code execution with tracing). A TUI cannot deliver the interactivity + visual richness the project requires. Tauri sits in the middle: native-binary backed, webview frontend — the MDX + TSX stack works natively while CPU/GPU stays accessible and the user gets a desktop-app installation experience.

---

## 9. Milestones

No timeframes attached. Each milestone is a deliverable, not a deadline.

### Milestone 1 — Substrate proven via one hand-authored lesson

Tauri shell + Vite + React + MDX + KaTeX + Monaco. Minimal component library:

- `<StepController>` + `<ArrayVisualiser>`
- `<FunctionGrapher>`
- `<CodeQuestion>` + `<MultipleChoice>`

One hand-authored lesson: **A-FINE** (the burn PR #4894 metric the author shipped 2k lines of without yet understanding conceptually). Narrative explaining what the metric does, embedded `<FunctionGrapher>` for the sensitivity curve, `<ArrayVisualiser>` driven by the actual A-FINE computation, 2–3 end-of-page questions mixing `<MultipleChoice>` + one `<CodeQuestion>`. All three views render: teach (everything inline), quiz (questions only), interview (full question bank + free-response slot, no Claude grading yet).

**Deliverable:** open the app, navigate to A-FINE, learn it the way the project promises to teach.

### Milestone 2 — Component library expansion + 3–5 more hand-authored lessons

Lessons across the breadth of interests to stress-test the substrate:

- Hebbian plasticity (NeuroDrive territory)
- CNN (ML)
- Options theta or compound interest (quant)
- An algorithm playground — e.g. HNSW (Image Browser persistent-vector-index work)

New components accrete from these lessons: `<NeuralNetVisualiser>`, `<TreeVisualiser>`, `<VariableFinder>`, `<FillInTheBlank>`. Question bank grows. Spaced-repetition + within-session adaptive difficulty lands on top.

### Milestone 3 — Sync-learning agent

`.claude/skills/sync-learning-app/` (or in-app button shelling out to Claude API). Reads `Learning/` deltas, classifies, emits drafts to `lessons/_drafts/`. Manual-fire only; editorial review required.

### Milestone 4 — Free-response Claude-graded interview view

`<FreeResponse>` component + Claude API grader + rubric authoring conventions. Interview view becomes genuinely strong: rehearse explaining a concept the author does not fully know, get real reasoning back, identify gaps without searching for answers.

### Milestone 5+ — Graduated abstractions

If by Milestone 4 the per-algorithm playground code shows obvious repetition that an abstraction would collapse, lift the abstraction (fully-generic playground engine, parameterised lesson templates, shared rubric library, etc.). Otherwise stay semi-generic. These decisions are deferred until the patterns surface.

---

## 10. Why this is interesting

| Angle | Why it matters |
|---|---|
| **Real-time adaptive difficulty over generated content** | Anki / SuperMemo are mature for static decks. The novelty is twofold: (a) questions are **generated** from source notes, not hand-authored cards, and (b) difficulty + question-shape adapt **within-session**, not just between-sessions on a fixed SM-2 schedule. |
| **Question-shape diversity beats binary "remembered / not"** | The same knowledge gap is exposed differently by an open-ended question than by a multiple-choice. A system that varies shape based on confidence (MC for high-confidence checks, open-ended for low-confidence probes, fill-in-blank for vocabulary) extracts more signal per minute than card-based recall. |
| **Eats its own dogfood** | The author has a real `Learning/` archive (159+ files post-Nyquestro upkeep-learning run). The tool solves a problem present today, on content already authored. |
| **Stacks Rust + Tauri + LLM-agent skills** | Rust backend orchestrates LLM agents (question generation), Tauri + React frontend handles the UI, SQLite holds session history + per-topic mastery. Reuses architectural patterns proven in adjacent projects. |

## 11. Why it might be hard

- **Question-generation quality is load-bearing.** Bad LLM-generated questions (ambiguous wording, multiple-correct-answer MC, fill-in-blank with multiple plausible answers) collapse the experience. The generator needs calibration + a verification step (LLM-as-judge that rejects bad questions before they reach the user).
- **Adaptive difficulty is harder than it looks.** The naive loop converges on a single difficulty band fast. Real adaptive systems use multi-dimensional models (per-topic mastery, per-question-shape competence, freshness × difficulty bands). The design must avoid both Anki-clone simplicity and overfit-to-recent-mistakes bouncing.
- **Generation cost vs pre-cached questions.** Per-session live generation has real API cost. A pre-generation pass that builds the question bank per topic, with on-the-fly generation reserved for "real-time guiding question" moments, is likely the right split — the proportion is a design call.
- **Open-ended grading.** Free-text grading is an LLM-judge problem with its own calibration concerns. The interview view starts with structured shapes (MC, T/F, fill-in-blank) and earns open-ended later.
- **Session boundaries vs continuous use.** Anki is session-based; this app's framing is more continuous. Cadence, reminders, "next session due in N hours" UX all need design.

---

## 12. Open questions (deliberately deferred)

| Question | Status |
|---|---|
| Pre-generated bank vs live-generation tradeoff | Both modes likely needed; proportion is a design call. |
| Topic granularity — per-file / per-section / per-concept? | Likely per-concept-cluster, but the cluster definition is fuzzy. |
| Default session length — 10 / 30 / open-ended minutes? | Configurable; the default sets the engagement curve. |
| SM-2 first or FSRS first? | SM-2 ships first; swap to FSRS later if benchmark warrants. |
| Cross-topic prerequisite graph — enforced or free-form? | Both modes have arguments; unresolved. |

---

## 13. Develop and build

```sh
pnpm install
pnpm tauri dev          # development with hot reload
pnpm tauri build        # production build
```

Type-check + frontend build without Tauri packaging:

```sh
pnpm build
```

Prerequisites: Node 20+, pnpm 9+, Rust toolchain (stable), and the Tauri 2 system dependencies for the host platform (see the Tauri docs).

---

## 14. Status

Past Milestone 1, well into Milestone 2 (version 0.3.2). Scaffolded 2026-05-11; since then the M1 substrate shipped (the A-FINE lesson with all three views rendering), followed by an 8-lesson linear-algebra track carrying ~50 interactive widgets, a local-LLM layer (Ollama) powering the in-lesson chatbot, the catalog recommender, and state-aware widget explanations, a telemetry layer, and — most recently — a single-source design system (`src/styles/`, see `context/systems/styling-system.md`) under a chocolate-luxe / terminal visual identity (`context/notes/visual-identity.md`). Still unbuilt: the SQLite spaced-repetition store, the adaptive scheduler, the Quiz / Interview pillars, the sync-learning agent, and the Claude-API grader. The host (Rust) side stays thin beyond the Ollama + telemetry IPC modules.

---

## 15. References and related work

- **LifeOS `Learning/` archive** — content source the sync-learning agent will consume.
- **`upkeep-learning` skill** — produces the `Learning/` archive content this tool consumes.
- **`extract-project` skill** — upstream project-knowledge extraction this tool layers retrieval-practice on top of.
- **Cernio** — agent-orchestration precedent for the sync-learning skill pattern.
- **Image Browser** — Tauri 2 + Rust + SQLite WAL precedent; HNSW lesson candidate.
- **NeuroDrive** — Hebbian plasticity lesson candidate + RL / continual-learning concept source.
- **Aurix** — V3 LP backtester + Timeboost MEV concept source for quant lessons (regime detection, options theta).
- **burn — A-FINE PR #4894** — Milestone 1 stress-test lesson target.
