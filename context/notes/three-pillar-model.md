# Three-Pillar Model

## 1. Current Understanding

For any given concept, Tessarix presents three branches: **Teach**, **Quiz**, **Interview**. These are not steps in a linear progression. They are alternative views over the **same content and the same question bank**, distinguished only by how that material is rendered and which interactions are exposed.

Routing convention:

| URL | View | Shape |
|---|---|---|
| `/<topic>` | Teach | MDX lesson: narrative prose + KaTeX math + embedded interactive widgets + drill-down links + ByteByteGo-style diagrams + 2–5 inline end-of-page assessment questions. |
| `/<topic>/quiz` | Quiz | Question-only view sourced from the topic's question bank. SM-2 / FSRS spacing across sessions, adaptive difficulty within a session, question-shape variety (MC, T/F, fill-in-blank, cloze, open-ended). |
| `/<topic>/interview` | Interview | Full question bank + free-response slots + optional timer + Claude-API-graded responses against a per-question rubric. |

Underlying storage:

- `lessons/<topic>.mdx` — the narrative + embedded widgets + inline assessments,
- `lessons/<topic>.questions.ts` — the typed question bank consumed by both quiz and interview views.

The three URLs read the same two files and render them differently.

## 2. Rationale

The branches-not-steps decision is deliberate. A linear "first you teach, then you quiz, then you interview" flow would force a sequence the learner did not ask for and would hide that the same material can be approached in different modes depending on intent (build understanding / drill retrieval / rehearse explaining).

Three modes covers the three real intents the product is targeted at:

| Intent | Mode |
|---|---|
| I do not yet understand this; I want to learn it. | Teach. |
| I think I know this; I want to confirm I have it under recall pressure. | Quiz. |
| I think I know this; I want to confirm I can explain it under unstructured pressure. | Interview. |

The same question bank serves both quiz and interview because the underlying knowledge probes are the same — what differs is the answering surface (constrained MC/cloze for quiz, free-response with rubric for interview).

## 3. What Was Tried

Nothing tried-and-abandoned yet; this is the design from day one. The earlier 2026-05-07 design sketch (vault doc `Adaptive Learning Helper.md`) framed the project as adaptive-spaced-repetition only — that became the **quiz pillar** of the wider three-pillar model after the 2026-05-11 design discussion. The earlier framing is not wrong; it is now one third of the product.

## 4. Guiding Principles

- **Same content + same question bank, different rendering modes.** The three views share storage so authoring effort is amortised across all three. Adding a question to the bank means it appears in both quiz and interview automatically.
- **Routing reflects the mode.** A learner looking at `/cnn` is in teach mode; clicking through to `/cnn/quiz` is an explicit mode switch. The URL is the mode.
- **No mode is the "main" mode.** The product is not a quiz tool with lessons attached, nor a lesson tool with a quiz on top. The three branches are first-class peers.

## 5. Trade-offs and Constraints

- **Question banks are shared across two views with different needs.** Quiz wants questions that work as MC/cloze; interview wants questions that work as open-ended prompts. Some questions naturally support both shapes; some do not. The data model needs to allow question shapes to be specified at the bank level and rendered appropriately per view.
- **Inline assessments in the teach view re-use question-bank entries.** A teach-view assessment should pull from the same `lessons/<topic>.questions.ts` rather than duplicate the question inline in the MDX. Otherwise quiz and teach views drift.

## 6. Open Questions

- **How are inline teach-view assessments selected from the bank?** Manual `<MultipleChoice id="..." />` references in MDX, or automatic by tag? Likely manual at M1 (simpler), revisit later.
- **Is there cross-view state sharing?** If a learner answers a question correctly in the teach-view inline assessment, does that count toward their SR record for the quiz view? Probably yes (correct retrieval is correct retrieval regardless of context) but the routing + persistence story needs to handle it.

## 7. Related Systems and Notes

- [`../systems/frontend-shell.md`](../systems/frontend-shell.md) — where the routing layer and the three view components will live.
- [`stack-rationale.md`](stack-rationale.md) — the broader stack that makes this model implementable (MDX + Monaco + Claude API).
- [`authoring-discipline.md`](authoring-discipline.md) — the rules for how lesson + question-bank content is authored.
