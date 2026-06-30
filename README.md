# Tessarix

A local-first, interactive **learning environment**. Tessarix is a desktop app that teaches abstract concepts — software, mathematics, machine learning, finance, and adjacent domains — through narrative lessons fused with embedded interactive widgets, drill-down playgrounds, and step-throughable visualisations, navigated as a connected knowledge graph rather than a list of pages.

The bet: when an abstract topic is reduced to a wall of text it loses the dimension that makes it understandable. Interactive, visual, and step-throughable representations restore that dimension — and a *web of linked concepts* restores the second dimension a textbook also throws away: where each idea sits relative to everything around it. Tessarix is the substrate for learning in that mode.

It is authored against — and consumes — a personal `Learning/` archive (Foundations + Domains + per-project notes) as research input, but emits qualitatively richer content than the source notes: lessons, question banks, and playgrounds, navigated as a hypertext graph rather than a slideshow.

> The canonical design history for this project lives in the LifeOS vault at `Projects/Potential Projects/Adaptive Learning Helper.md`. This README is the working, self-contained description of the project as it is being built. Implementation-facing memory lives in [`context/`](context/); the design disciplines referenced throughout are the notes in [`context/notes/`](context/notes/) and the forward plans in [`context/plans/`](context/plans/).

---

## 1. The problem and the shape of the bet

Reading through countless pages of prose to learn a complex topic is slow, low-signal, and easily skimmed. The same content, structured as retrieval practice + interactive widgets + step-through visualisations, *and* embedded in a graph that shows how every concept connects, is qualitatively faster and stickier.

Three motivating examples — each one a concept the author has already invested in but does not fully understand from prose alone:

| Concept | Prose-only mode | Tessarix mode |
|---|---|---|
| **A-FINE** (a robust regression metric, burn PR #4894) | Read paper, scroll videos, still hazy. | Sensitivity curve as a slider-bound function + the metric computed step-by-step on a tiny illustrative input, with every term ("PSNR", "SSIM", "CLIP") linking to its own lesson. |
| **Hebbian plasticity** ("neurons that fire together, wire together") | Sterile single-line maxim. | Interactive neural-web where co-firing neurons darken their connecting edge in real time. |
| **Algebra / calculus** | Hand-solve, hope it sticks. | Real-time renderer with sliders, coefficients, and variables — intuition for how the function responds, reachable from a graph that shows what to learn before it. |

The bet is that authoring lessons in this richer mode is worth the cost — and that a small, well-chosen component library plus two shared backbones (below) are the leverage points that make per-lesson authoring cheap once the substrate is built.

---

## 2. What Tessarix is becoming — the learning environment

The original framing was "lessons with widgets." That undersells it. The north star is a **learning environment** with four properties that compound:

1. **Navigable as a graph, not a list.** You enter through a top-level category (Mathematics, Finance, Science…), see its topics as a graph, and expand any topic into its lesson sub-tree. The graph shows *what to learn in what order* and *which lessons connect to which* — not a wall of cards. (→ [`context/plans/curriculum-graph.md`](context/plans/curriculum-graph.md))
2. **Densely cross-linked.** Any concept mentioned in a lesson — "matrix multiplication", "transpose", "eigenvalue" — links to the lesson that teaches it, automatically, Wikipedia-style. The corpus becomes one connected knowledge base rather than a pile of independent pages. (→ [`context/notes/content-architecture.md`](context/notes/content-architecture.md))
3. **Adaptive and explainable at every scale.** Every interactive widget explains its current state in plain language; every widget can be expanded into an AI-generated mini-lesson; any text can be selected for an inline explanation or turned into a transient lesson on demand. The reader is never stuck. (→ [`context/notes/llm-integrations.md`](context/notes/llm-integrations.md), [`context/notes/explanations-must-adapt-to-state.md`](context/notes/explanations-must-adapt-to-state.md))
4. **A distinct visual identity.** A warm "tailored leather notebook that happens to run in a terminal" — chocolate-luxe surfaces, mono structure, ASCII-art custom displays — with a per-category palette so each domain feels like its own room. (→ [`context/notes/visual-identity.md`](context/notes/visual-identity.md))

These are not four loose features. As §6 shows, they rest on **two backbones**, and almost everything in this README is either producing data for one backbone or consuming it.

---

## 3. Inspirations (a deliberate blend, not a clone)

| Reference | Pattern borrowed |
|---|---|
| [Brilliant.org](https://brilliant.org) | Lesson narrative with embedded interactive widgets + problems woven through |
| [Cartesian.app](https://cartesian.app) | Visualisation-first drill-down pages |
| [visualgo.net](https://visualgo.net) | Pure algorithm playgrounds (no narrative wrapper) |
| [learn-algo.com](https://learn-algo.com) | Step-through visualisation alongside narrative |
| [ByteByteGo](https://bytebytego.com) | Diagram + technical-depth illustrations where interactivity is the wrong tool |
| [ethereum.org docs](https://ethereum.org/en/developers/docs/) | End-of-page knowledge-check questions inline with the lesson |
| Wikipedia | Inline blue-link navigation between concepts as a knowledge graph |
| Obsidian | A personal knowledge graph where everything links to everything; the model for §5 |

No single one is the model. The product is a hypertext graph: enter via the concept graph, drop into a narrative lesson, drill into a Cartesian-style playground when you want to manipulate, drop into a ByteByteGo diagram when the topic needs static depth, hit end-of-page assessments before moving on. In-lesson hyperlinks navigate between nodes; breadcrumbs and the graph return you to where you came from.

---

## 4. The three pillars (branches, not steps)

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
| **Interview** | Rehearse explaining the concept under pressure | Full question bank + free-response slots + optional timer + Claude-API-graded responses against a per-question rubric (or a fully conversational LLM-driven interview — see [`context/notes/llm-integrations.md`](context/notes/llm-integrations.md) §3). |

Routing convention: `/<topic>` is teach view, `/<topic>/quiz` is quiz view, `/<topic>/interview` is interview view. Same content + same question bank, three rendering modes. (Today the Teach pillar is built; the Quiz/Interview chrome exists but their engines are planned — see §13 Status.)

### The adaptive trajectory (worked example)

Pick a topic — say, the Nyquestro order-matching engine. The system starts at Foundations tier (core types, error model, fill semantics). If answers come back right, it picks up the pace and jumps ahead to the matching-engine + observability tier. The moment it sees a mistake, it switches modes: rather than just marking "wrong", it **generates a real-time guiding question** that scaffolds toward the answer — an open-ended prompt that has the learner think and find the gap themselves.

The artefact the system produces over time is the per-session adaptive trajectory + the long-term retention curve across topics, not just a Leitner-box card deck.

---

## 5. How learning happens — the lesson philosophy

Sections 1–4 set up *how* Tessarix teaches (interactive, not prose), the environment it lives in, and the three modes a concept is offered in. This section is the layer beneath all of them: the **content philosophy** that governs how every lesson is authored. Two bets sit at the root —

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

## 6. The two backbones (the architecture of the environment)

The features in §2 are not independent systems. They rest on exactly two shared structures, and the smart engineering decisions are about the backbones, not the features.

```
CONCEPT GRAPH  (the brain — data)              TOKEN-DRIVEN COMPONENTS (the skin — presentation)
category ▸ topic ▸ lesson ▸ concept            global primitives + one WidgetFrame,
edges: prereq · part-of · mentions · taught-by  every component reads src/styles tokens
        │                                                │
        ├─ graph navigation                              ├─ coherence / no overflow
        ├─ inline concept links                          ├─ widget frame + fullscreen drawer
        ├─ woven links in generated content              └─ per-category palette swap
        │  (mini-lessons, explain-here,
        │   turn-into-lesson)
        └────────────── they meet at ────────────────────┘
                         CATEGORIES
              (the graph's roots ARE the colour schemes)
```

- **The concept graph (brain)** is a typed DAG: nodes for categories, topics, lessons, and concepts; edges for `part-of`, `prerequisite`, `taught-by`, `mentions`, `related`. It is derived from lesson frontmatter, not hand-maintained. It powers navigation, inline links, and the links woven into every piece of generated content. (→ [`context/plans/curriculum-graph.md`](context/plans/curriculum-graph.md))
- **The token-driven component layer (skin)** is one globalised set of primitives, all reading the single design-token source of truth, so the whole app is coherent by construction and can be recoloured in one move. (→ [`context/plans/component-system.md`](context/plans/component-system.md))
- **They meet at categories.** A category is simultaneously a *root of the graph* and a *colour scheme*. Navigating into Mathematics in the graph view is what recolours the app blue.

### The load-bearing rule: generation is separated from linking

Every surface that generates prose — the chat, the per-widget mini-lesson, "explain here", "turn into lesson" — writes its text with an LLM, then runs that text through **one deterministic linker** that injects cross-page links from the concept index. The model never emits link targets (it would hallucinate them); the linker only links concepts that exist. Consequence: **all generated content is densely, correctly cross-linked by construction, and a hallucinated lesson reference is structurally impossible.** This single separation ties the brain to every generative feature. (→ [`context/notes/content-architecture.md`](context/notes/content-architecture.md))

---

## 7. Navigation and cross-linking

### The concept graph as the front door

The launch experience replaces the card grid: a landing page with the chat bar on top and the top-level categories to pick from. Choosing one opens that category's **topic graph** (and recolours the app to its palette); clicking a topic expands it *in place* into its lesson sub-tree — a recursive tree-in-tree, so `matrix-operations` is a leaf of `matrices`, which is a leaf of `linear-algebra-foundations`. Edges show prerequisite order and which lessons connect to which. Only top-level nodes show by default; depth reveals on demand. (→ [`context/plans/curriculum-graph.md`](context/plans/curriculum-graph.md))

### Inline concept links (the durable win)

The four-tier [content architecture](context/notes/content-architecture.md) — full **lesson** / cross-page **hyperlink** / **glossary** entry / **chat** safety-net — gets an automation layer. Each lesson declares the concepts it *teaches* and its *category* in frontmatter; a build step inverts this into a `concept → owning-lesson` index; a deterministic linker then auto-links concept terms wherever they appear. A tensor-maths lesson mentioning "matrix multiplication", "transpose", and "matrices" links all three, no manual work, and every new lesson retro-links the corpus. This is durable, cheap, and reduces the need for on-demand generated lessons by a wide margin.

---

## 8. Adaptive explanation and on-demand generation

Four reader-facing LLM surfaces, **local-first** (Ollama today) with Claude reserved for the quality-critical paths, all grounded in the lesson and all cross-linked via the §6 linker:

| Surface | What it does | Distinct from |
|---|---|---|
| **State caption** (`<WidgetExplainer>`) | Explains the widget's *current* state in the reader's exact values; recomputed on every change | — (the baseline; shipped) |
| **Fullscreen mini-lesson** | Expand a widget into a draggable bottom drawer; the LLM explains what it is, how to read it, the background, and weaves in links to relevant lessons | the state caption — this is background + how-to-read, not "what am I seeing now" |
| **Explain here** | Select any text → right-click → an inline popover explains it, grounded in the surroundings; chat to go deeper | the chatbot — scoped to a selection, not the whole section |
| **Turn into lesson** | Select text → generate a *transient, non-durable* structured mini-lesson composed from the existing widget kit (with `<TODO>` where a widget is missing) | a durable lesson — reader-scoped, regenerable, promote-to-durable later |

The hard constraints: the model writes prose and *composes existing widgets* — it never authors new widgets (that stays human until the kit is rich enough); outputs are short, link-routed, and grounded, never authoritative; and generated lessons are ephemeral until an author promotes one. (→ [`context/notes/llm-integrations.md`](context/notes/llm-integrations.md), [`context/notes/interface-affordances.md`](context/notes/interface-affordances.md))

---

## 9. Visual identity and design language

Tessarix's identity is **"a tailored leather notebook that happens to run in a terminal"**: warm chocolate / camel / cream surfaces (COS / Ralph Lauren register) carrying terminal-grade structure (monospace labels, hairline frames, a muted "dried-pigment" chart palette). It replaced a neon-on-near-black dashboard look that read as an edgy-teenager project.

Signature decisions, each a discipline in [`context/notes/visual-identity.md`](context/notes/visual-identity.md):

- **The tesseract mark** — a hairline cube-in-cube (the 2D shadow of a 4-cube), tying the name, the subject (geometry), and the warm-technical identity into one glyph.
- **Terminal-pane widgets** — a single hairline frame on a prose-blended surface, mono uppercase labels, no nested cards, so widgets read as inline figures rather than embedded apps.
- **ASCII custom displays** — any bespoke display that isn't a standard chart renders as ASCII art, native to the terminal identity rather than a photo dropped into it. The A-FINE lesson's metric comparison is a rotating `donut.c` torus over CRT scanlines (its luminance field *is* what PSNR/SSIM measure); its embedding panels are ASCII character heatmaps. Built on [`src/lib/ascii/`](src/lib/ascii). Standard charts stay charts.
- **Per-category palettes** — each top-level category gets its own scheme (Maths blue, Finance dark green, Science light green…). The rule that keeps it coherent: **identity = structure (constant) + palette (variable)** — the terminal structure is invariant, only the accent + chart set change. Because every component and ASCII widget reads the design tokens, swapping a category's palette recolours the whole app — donut included — in one move.
- **Motion** — one orchestrated moment (the boot cascade, content printing in like a terminal coming up) plus quiet micro-interactions, always gated by `prefers-reduced-motion`.

All of it flows from a single token source of truth ([`context/systems/styling-system.md`](context/systems/styling-system.md)) consumed by a globalised component layer ([`context/plans/component-system.md`](context/plans/component-system.md)). The design language is built up decision-by-decision — per motion, per interaction, per colour — not painted on at the end.

---

## 10. Architecture

Tauri 2 shell wraps a Vite + React 19 + TypeScript frontend. The frontend reads MDX lessons and typed question banks; a TSX component library renders interactive widgets; a local LLM (Ollama today) powers the in-lesson chat, the catalog recommender, state-aware widget explanations, and tiered hints. A SQLite database (planned) will hold spaced-repetition state; the Claude API (planned) will power the sync-learning authoring agent and the interview-view grader.

```
+----------------------------------------------------------+
|                       Tauri 2 shell                       |
|                                                          |
|   +---------------+         +-------------------------+  |
|   |  Vite + React |  IPC    |  Rust backend           |  |
|   |  + MDX        |<------->|  - llm/ (reqwest →      |  |
|   |  + KaTeX      |         |    Ollama, streaming)   |  |
|   |  + src/lib/   |         |  - telemetry/ (JSONL)   |  |
|   |    ascii      |         |  - SQLite (WAL) [planned]|  |
|   |  + src/styles |         |  - Claude client [planned]|  |
|   +-------+-------+         +-----------+-------------+  |
|           |                             |                |
|           v                             v                |
|   lessons/<slug>.mdx          .claude/skills/            |
|   lessons/<slug>.questions.ts   sync-learning-app/  -->  |
|   components/widgets/          (reads vault Learning/    |
|   lib/ascii/ · lib/llm/         emits draft MDX)         |
|   styles/ (token source)                                |
+----------------------------------------------------------+
```

### 10.1 Content shape

```
src/lessons/<topic-slug>.mdx              # narrative + embedded widgets + inline assessments
src/lessons/<topic-slug>.questions.ts     # typed question bank (consumed by quiz + interview)  [planned]
src/lessons/registry.ts                   # slug → lazy component map; source of truth for slugs
src/components/widgets/                    # the TSX component library
  afine/ · linear-algebra/ · shared/
src/components/assessments/               # MultipleChoice, GoalChain, PredictThenVerify, KnowledgeCheck
src/components/chatbot/                    # AskAboutLesson (right-pane LLM chat)
src/lib/ascii/                            # luminance Grid + ramp, grid distortions/metrics, donut scene, AsciiField
src/lib/llm/                              # Ollama client hooks
src/lib/telemetry/                        # interaction telemetry
src/styles/                               # tokens.ts (source) · derived.ts · inject.ts · motion.css
```

A single concept is `lessons/<slug>.mdx` + (planned) `lessons/<slug>.questions.ts` + optionally one or more playgrounds. The MDX file embeds widgets directly; the question bank is shared by quiz and interview views.

### 10.2 Component library (grows opportunistically)

The library is the **residue of authoring real lessons**, not a pre-built monolith. Each new lesson reuses primitives + occasionally adds one. Visualisation primitives (`<StepController>`, `<FunctionGrapher>`, the matrix/vector/graph visualisers, the `src/lib/ascii` toolkit) and assessment primitives (`<MultipleChoice>`, `<GoalChain>`, `<PredictThenVerify>`, planned `<CodeQuestion>` / `<FreeResponse>`) accrete this way. A planned **`<WidgetFrame>`** will become the one container every widget sits in — fixing the "escaping box" overflow class and carrying the explain + fullscreen affordances.

### 10.3 Playground engine: semi-generic, not fully generic

Fully-generic (parse arbitrary algorithm code, infer data structures, polymorphic visualisation) is essentially a small visualisation IDE — months of work for marginal gain at the self-audience quality bar. Semi-generic is the chosen starting point: `<StepController>` + the typed data-visualiser library + per-algorithm code that calls into them. Fully-generic can graduate from semi-generic later if patterns repeat enough to obviously pay. The abstraction is not pre-built.

### 10.4 Self-auditing test harness (planned)

The author cannot eyeball every lesson for visual and behavioural bugs (the rotating donut once leaked its container) — so the agent has to verify the app itself. The framework is modelled on the Performance Profiler's layered off-game harness, adapted to Tessarix's advantage of having **no loader-lock**: the frontend is directly drivable, so the visual + interactive layers are the primary gate, not a substitute for a blocked one.

- **Unit / logic** — `vitest` (TS: the `src/lib/ascii` maths, geometry, the concept-linker, the graph builder) + `cargo test` (Rust host). `scripts/verify-donut.ts` is the seed.
- **Structural probes** — deterministic Playwright DOM + computed-style probes for overflow / leaks, unreadable or unstyled text, broken layout, mis-alignment. The load-bearing lesson from Performance Profiler: **probes beat screenshots for structure** (vision over-reports on layout); the donut-leak is an overflow probe, not a visual review.
- **Render coverage + adaptive interaction** — walk the lesson registry, render every widget at default *and* edge-case states, and **discover interactions generically** (DOM scan + a per-widget descriptor) to drive sliders / buttons / drag-regions and catch anomalies (NaN, dead controls, console errors, mid-interaction overflow). Generic by construction: a new lesson is tested with zero harness change.
- **Vision design audit** — the agent reviews a screenshot gallery against a design rubric for *holistic* quality (stiffness, inconsistency, off-identity), writing durable per-surface dossiers. Reserved for what probes can't judge.

The connective tissue is one **widget descriptor** — an extension of the existing `widgetDescription` prop — consumed by three systems: `<WidgetExplainer>` (state caption), the mini-lesson + concept index (`teaches` / `howToRead`), and the test harness (`controls` / `invariants`). (→ [`context/plans/testing-framework.md`](context/plans/testing-framework.md))

---

## 11. The sync-learning agent (autonomous AI authoring layer)

The vision: Tessarix reads the personal `Learning/` archive, semantically decides what's new versus already covered, and emits structured lesson scaffolds + question-bank entries. This is an AI authoring layer, not a copy operation — the durable, editorial cousin of the reader-facing "turn into lesson" (§8).

Running `sync-learning` triggers an agent that reads new content, cross-references existing Tessarix lessons, classifies deltas (*new topic* / *extension* / *cross-cutting pattern*), and emits drafts to `lessons/_drafts/` with `<TODO />` placeholders where it cannot credibly author the interactive widget.

**Hard rule: drafts are never auto-applied.** The LLM can write prose but cannot author the visualisations + interactive widgets that are the whole point. The agent compresses hours of prose-authoring; widgets stay manual until the component library is rich enough that the LLM can plausibly compose them. (→ [`context/notes/authoring-discipline.md`](context/notes/authoring-discipline.md))

---

## 12. The adaptive scheduler

The Quiz pillar is where adaptive spaced-repetition lives. It is deliberately more than an Anki/SM-2 clone.

| Layer | Role |
|---|---|
| **Long-term spacing** | SM-2 baseline; FSRS as a swap-in later if benchmarks warrant. Per-card decay + review intervals scheduled across sessions. |
| **Within-session adaptive difficulty** | Tracks per-topic mastery and per-question-shape competence in-session; modulates which scheduled card surfaces next (and at which difficulty band). |
| **Question-shape variety** | MC for high-confidence checks, open-ended for low-confidence probes, fill-in-blank for vocabulary, code-question for procedural skill — chosen per-question, not per-deck. |
| **Real-time guiding questions** | When the learner stumbles, the system generates a follow-up that scaffolds toward the answer rather than reading the source note aloud. |
| **Per-topic mastery view** | Multi-dimensional ("Foundations: mastered; Phase-2 HFT: 40%, weak on order-book invariants"), not "60% retained in deck X". |

The naive "right → harder, wrong → easier" loop converges on a single difficulty band fast and stops surfacing new content. The scheduler's job is to **avoid that collapse** — a multi-dimensional model rather than a single difficulty scalar.

---

## 13. Status

**Past Milestones 1–2, with the first cut of Milestones 3–5 landed (version 0.4.0).** Scaffolded 2026-05-11. State:

| Built | Planned |
|---|---|
| M1 substrate — Tauri + Vite + React + MDX + KaTeX; A-FINE with all three views | SQLite (WAL) spaced-repetition store |
| 8 MDX lessons (A-FINE + a 7-lesson linear-algebra track), **53 widgets**, each wrapped in a universal `<WidgetFrame>` | The adaptive scheduler + the live Quiz/Interview engines (chrome exists; engines don't) |
| **Concept graph + graph navigation** (`src/lib/graph` + `GraphNav`) — the category ▸ topic ▸ lesson tree, replacing the card grid | Breadth beyond linear algebra (Hebbian, CNN, quant, an algorithm playground) |
| **Globalised component layer** (Radix + `vaul` on the tokens) + `<WidgetFrame>` + **full per-category palettes** | Auto-linking *authored lesson prose* (the linker runs on generated content today) |
| **Widget fullscreen mini-lesson** drawer (LLM-generated, concept-linked) | "Explain here" + ephemeral "turn into lesson" |
| **Self-auditing test framework** — vitest unit + a Playwright structural/interaction/visual harness (run: 75→9 findings) | The sync-learning agent; the Claude-API grader / conversational interview |
| Local-LLM layer (**Ollama**, now with a browser fetch fallback), telemetry, ASCII custom displays, complexity tiers + three-pillar shell, the chocolate-luxe identity | The vision design-audit dossier layer of the test harness |

The host (Rust) side stays thin beyond the Ollama + telemetry IPC modules. The README's Claude-API mentions describe *future* intent (the grader + sync agent); the shipped interactive LLM features run on local Ollama.

---

## 14. Roadmap

No timeframes — each milestone is a deliverable. The ordering reflects the §6 dependency structure: build the backbones, then the features fall out cheaply.

### ✅ Milestone 1 — Substrate proven via one hand-authored lesson
Tauri shell + Vite + React + MDX + KaTeX; minimal component library; the A-FINE lesson; all three views render. **Done.**

### 🟡 Milestone 2 — Component-library expansion + breadth of lessons + the adaptive layer
Lessons across the breadth of interests to stress-test the substrate. *Done:* the linear-algebra track (44 widgets), the LLM layer, the styling system, ASCII displays. *Remaining:* breadth beyond linear algebra (Hebbian plasticity, CNN, options/compound-interest, an algorithm playground), and the SQLite + within-session adaptive-difficulty layer that turns Quiz from chrome into an engine.

### ✅ Milestone 3 — The concept graph + navigation (keystone) — BUILT
The typed graph from lesson metadata (`category` / `topic` / `teaches` / `prerequisites`), the `concept → owning-lesson` index, the deterministic linker, and the graph-nav landing that replaces the card grid — all shipped (`src/lib/graph`, `src/components/nav/GraphNav.tsx`). *Remaining:* auto-linking authored lesson prose (the linker runs on generated content today). (→ [`context/plans/curriculum-graph.md`](context/plans/curriculum-graph.md))

### ✅ Milestone 4 — The component spine + visual identity — BUILT
The globalised Radix + `vaul` primitive layer + the universal `<WidgetFrame>` (containment, chrome, the mini-lesson affordance) + full per-category palettes wired through the token system — shipped; all 53 widgets wrapped. (→ [`context/plans/component-system.md`](context/plans/component-system.md))

### 🟡 Milestone 5 — On-demand explanation + generation — mini-lesson BUILT
The fullscreen widget mini-lesson (bottom drawer, LLM-generated, concept-linked) is shipped and verified against the local Ollama model (`qwen3:4b-instruct-2507` as of 2026-06-30; originally `llama3.2:3b`). *Remaining:* "explain here" (selection popover) and ephemeral "turn into lesson". All generation-separated-from-linking, reusing the M3 concept index. (→ [`context/notes/llm-integrations.md`](context/notes/llm-integrations.md) §10)

### Milestone 6 — Sync-learning agent
`.claude/skills/sync-learning-app/` reads `Learning/` deltas, classifies, emits drafts to `lessons/_drafts/`. Manual-fire only; editorial review required.

### Milestone 7 — Claude-graded interview + conversational interview
`<FreeResponse>` + Claude API grader + rubric conventions; then the fully LLM-driven conversational interview. The Interview pillar becomes genuinely strong.

### Milestone 8+ — Graduated abstractions
Lift abstractions (fully-generic playground engine, parameterised lesson templates, shared rubric library) only where repetition by then obviously pays. Deferred until the patterns surface.

### 🟡 Cross-cutting — the self-auditing test harness — FIRST CUT BUILT
Built incrementally alongside everything above (Performance-Profiler-style). *Shipped:* the vitest unit layer (donut metrics + the linker, 19 tests) and the Playwright structural-probe + adaptive-interaction harness — run against every lesson, generic by construction (75 findings → 9 after fixing the classes it caught). *Remaining:* the vision design-audit dossier layer as a persisted artefact (done ad-hoc this run). The agent verifies the app itself; the author stops being the only bug-catcher. (→ [`context/plans/testing-framework.md`](context/plans/testing-framework.md))

---

## 15. Why this is interesting

| Angle | Why it matters |
|---|---|
| **A learning environment, not a lessons app** | The graph navigation + automatic concept linking + on-demand generation make it a connected knowledge base that adapts to the reader, not a static set of pages. |
| **Real-time adaptive difficulty over generated content** | Anki / SuperMemo are mature for static decks. The novelty: questions are **generated** from source notes, and difficulty + question-shape adapt **within-session**, not just between-sessions on a fixed schedule. |
| **Question-shape diversity beats binary "remembered / not"** | A system that varies shape based on confidence (MC for high-confidence checks, open-ended for low-confidence probes) extracts more signal per minute than card-based recall. |
| **Two-backbone architecture** | One concept graph + one token-driven component layer means new features are thin; the generation-separated-from-linking rule makes AI content trustworthy by construction. |
| **Eats its own dogfood** | The author has a real `Learning/` archive. The tool solves a problem present today, on content already authored. |
| **Stacks Rust + Tauri + LLM-agent skills** | Rust backend orchestrates local + cloud LLMs, Tauri + React handles the UI, SQLite holds session history + per-topic mastery. Reuses architectural patterns proven in adjacent projects. |

---

## 16. Why it might be hard

- **Question-generation quality is load-bearing.** Bad LLM questions collapse the experience. The generator needs calibration + a verification step (LLM-as-judge that rejects bad questions before they reach the user).
- **Adaptive difficulty is harder than it looks.** The naive loop converges on a single band fast. Real systems use multi-dimensional models (per-topic mastery, per-shape competence, freshness × difficulty).
- **The concept index has to stay honest.** Over-linking turns prose into noise; ambiguous concepts ("kernel") must be namespaced by category; the linker must be density-capped and reviewed.
- **Generation must stay grounded.** Mini-lessons and "turn into lesson" risk becoming the prose wall the project exists to kill — bounded by keeping outputs short, widget-composed, link-routed, and never authoritative.
- **Per-category identity vs cohesion.** Five palettes risk five apps; the structure-constant / palette-variable rule is the discipline that prevents it.
- **Generation cost vs pre-cached.** Per-session live generation has real cost; a pre-generation pass with on-the-fly reserved for "real-time guiding question" moments is likely the right split.

---

## 17. Open questions (deliberately deferred)

| Question | Status |
|---|---|
| Pre-generated bank vs live-generation tradeoff | Both modes likely needed; proportion is a design call. |
| Topic granularity — per-file / per-section / per-concept? | The `topic` frontmatter field is the current answer; revisit if clusters get fuzzy. |
| Prerequisite enforcement — hard gate or advisory? | Lean advisory (show the order, don't lock it); unresolved. |
| Component layer — Radix-on-tokens vs shadcn+Tailwind? | **Decided: Radix + `vaul` on the existing tokens**, fully animated — shadcn generics are insufficient and Tailwind would fork the token system. (→ [`context/plans/component-system.md`](context/plans/component-system.md)) |
| Per-category colour — accent-only vs full surface-temperature shift? | **Decided: full surface-temperature shift** per category; cohesion comes from the invariant structure, not a shared surface colour. |
| Test-harness deps + Playwright MCP | Adds `vitest` + `@playwright/test` (dev-only; needs confirmation). A Playwright MCP isn't currently surfaced in-session; the in-repo harness is the durable core regardless. (→ [`context/plans/testing-framework.md`](context/plans/testing-framework.md)) |
| Should the graph view itself be ASCII/terminal-styled? | Lean: proper node-graph for the map, terminal styling on the node chrome. |
| SM-2 first or FSRS first? | SM-2 ships first; swap to FSRS later if benchmarks warrant. |

---

## 18. Develop and build

```sh
pnpm install
pnpm tauri dev          # development with hot reload
pnpm tauri build        # production build
pnpm build              # type-check + frontend build without Tauri packaging

# verification helpers
pnpm tsx scripts/verify-donut.ts            # ASCII donut metric goals + render
node --experimental-strip-types scripts/lint-lesson-frontmatter.ts
```

Prerequisites: Node 20+, pnpm 9+, Rust toolchain (stable), the Tauri 2 system dependencies for the host platform, and a local Ollama install (`brew services start ollama`) with the configured model pulled for the LLM features.

---

## 19. Stack

| Layer | Choice | Reason |
|---|---|---|
| App shell | Tauri 2 | Native binary + webview — full CPU/GPU for heavy visualisations while keeping the MDX + TSX stack natural. |
| Frontend | Vite + React 19 + TypeScript | Fast HMR, type-safe component library, MDX ecosystem maturity. |
| Content layer | MDX | Markdown with embedded React components — the natural fit for "narrative + widgets". |
| Math / highlighting | KaTeX, Shiki | Fast typesetting; high-quality theme-flexible code rendering. |
| Visualisation | SVG + Canvas/Konva + react-flow / xyflow + `src/lib/ascii` | Right tool per class: diagrams, high-frame-rate animation, node-graphs, ASCII custom displays. |
| Design system | `src/styles` token source → injected CSS vars + a typed canvas/ASCII API | One source of truth for colour/type/motion; the engine behind per-category theming. |
| Components | Radix primitives + `vaul` on the tokens *(planned; see §17)* | Accessible behaviour without a second styling paradigm. |
| Storage | SQLite (WAL) *(planned)* | Spaced-repetition state + session history + per-topic mastery. Local-first, durable. |
| LLM | Ollama (local, shipped) → Claude API for quality-critical paths *(planned)* | Interactive/high-volume → local; deliberate/quality-critical → cloud. |
| Testing | `vitest` (unit) + `@playwright/test` (structural / interactive / vision) *(planned)* | A self-auditing harness modelled on the Performance Profiler's layered off-game harness; the agent verifies the frontend + backend itself. |
| Deployment | Tauri desktop initially | Web build is a config flip later if framing demands it. |

**Why Tauri specifically:** plain web cannot reliably tap CPU/GPU for the heavier visualisations; a TUI cannot deliver the interactivity + visual richness. Tauri sits in the middle — native-binary backed, webview frontend — so the MDX + TSX stack works natively while CPU/GPU stays accessible and the user gets a desktop-app install.

---

## 20. References and related work

- **LifeOS `Learning/` archive** — content source the sync-learning agent will consume.
- **`upkeep-learning` skill** — produces the `Learning/` archive content this tool consumes.
- **`extract-project` skill** — upstream project-knowledge extraction this tool layers retrieval-practice on top of.
- **Cernio** — agent-orchestration precedent for the sync-learning skill pattern.
- **Image Browser** — Tauri 2 + Rust + SQLite WAL precedent; HNSW lesson candidate.
- **NeuroDrive** — Hebbian plasticity lesson candidate + RL / continual-learning concept source.
- **Aurix** — V3 LP backtester + Timeboost MEV concept source for quant lessons.
- **burn — A-FINE PR #4894** — Milestone 1 stress-test lesson target.
- **`context/`** — the implementation-facing memory: [`architecture.md`](context/architecture.md), the design [`notes/`](context/notes/), and the forward [`plans/`](context/plans/).
