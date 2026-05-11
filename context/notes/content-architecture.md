---
name: Content architecture — lessons, glossary, and the chat safety-net
description: Three-tier model for organising Tessarix content. When does a concept get a full lesson, when does it get a short glossary entry, and when does it just live in the LLM chat?
type: feedback
---

# Content architecture

## The principle

Tessarix organises content into **four tiers**, gated by a single question per concept: *what shape of artefact does this concept deserve?*

| Tier | What it is | When it applies | Example |
|---|---|---|---|
| **Lesson** | Full MDX file with widgets, tiered complexity, assessments, AI-driven explanations | The concept is a *destination* in its own right — readers will spend time with it, manipulate it, get tested on it | A-FINE, CLIP/ViT, SSIM, gradient descent, attention mechanism |
| **Cross-page hyperlink** | Inline link from one lesson to **another full lesson** that already exists | The mentioned concept has its own dedicated lesson page. Clicking the link navigates to that page entirely — same shape as Wikipedia. Two destinations linked into one knowledge graph. | Tensor-Operations lesson mentions "matrices" → links to the Linear-Algebra/Matrices lesson page |
| **Glossary entry** | 1-3 sentence definition, optional one-line citation, possibly hoverable | The concept appears in lessons and needs orientation, but doesn't warrant a widget — and doesn't have its own lesson page (yet) | LPIPS, DISTS, VGG-16, ImageNet, the term "CNN" itself when it appears in passing |
| **Chat safety-net** | Reader asks the right-side chatbot | The concept is fully outside the lesson scope or wasn't anticipated by the author | A reader's tangential curiosity, edge cases the lesson didn't cover, "wait what's X again?" mid-read |

## Why these four tiers

**Lessons** are expensive to author (widgets, prose, assessments, multi-tier content). They earn their cost by being the *primary teaching surface* for a concept the project genuinely teaches. Reserve them for topics that justify the investment.

**Cross-page hyperlinks** are the *bridges between lessons*. When a Tensor Operations lesson says "this composes two matrices," the word "matrices" links to the standalone Matrices lesson. The reader either clicks (full deep-dive) or doesn't (already knows it, keeps reading). The reading path becomes a directed graph of lessons rather than a single linear sequence. This is the mechanism that lets the project grow into a richly interconnected knowledge base — every new lesson is potentially a destination *and* a prerequisite for other lessons. Crucially, this is *not* "inline embedding the other lesson" — it's a navigation event to a separate page, just like Wikipedia's blue links.

**Glossary entries** solve the "I came here for A-FINE but the lesson keeps mentioning LPIPS and DISTS, and there's no LPIPS lesson page" problem. The reader doesn't need a full lesson on LPIPS to understand A-FINE — they need a sentence or two so the surrounding prose makes sense. A glossary entry is the right shape: short, definitional, often hoverable. Glossary entries are a holding pen: a concept lives here until either (a) it earns a full lesson (then becomes a cross-page hyperlink target) or (b) it stays minor enough that a definition is forever enough.

**Chat safety-net** catches everything else. Local LLM grounded in the lesson DOM; gives partial answers when topics drift adjacent. Already implemented as the right-side chat panel.

## The gating question

When a concept comes up inside a lesson:

1. Does another lesson page already cover it as its primary subject? → **Cross-page hyperlink** to that lesson.
2. Does it warrant a widget (slider, simulator, step-through, assessment) and deserve its own destination? → Author a new **lesson**, then add a cross-page hyperlink from here once it exists.
3. Does it need orientation but not interactivity, and doesn't have its own page? → **Glossary entry**.
4. Is it adjacent, tangential, or unanticipated? → **Chat handles it**.

Promotion paths are one-way and lazy:
- **Glossary → Lesson**: when widget ideas crystallise or telemetry shows the term gets visited often.
- **Lesson → Cross-page hyperlink target**: automatic the moment the lesson exists; mentions in older lessons can be back-filled to link to it.

## What this means for file structure

```
src/lessons/                 — full lessons, one MDX per concept; routable destinations
src/glossary.mdx             — single file, all terms; or a folder once it grows
src/glossary/                — alternative: one MDX per term, only if cross-linking warrants it
```

For Tessarix's current size, a **single `glossary.mdx` file** is probably the right starting point. Each term becomes a `## Term` heading. Inline lesson links to glossary terms via `#term-slug`. Hover popovers can be implemented later as a small enhancement.

For lesson-to-lesson links (the cross-page hyperlinks), the MDX format `[matrices](/lessons/linear-algebra/matrices)` or a `<LessonLink slug="linear-algebra/matrices">matrices</LessonLink>` widget. A widget gives us:

- **Telemetry hooks** — emit `cross_lesson_navigation` events on click so we can see which lessons are gateways into which.
- **Validation** — fail the build when a link points to a non-existent lesson slug.
- **Render affordances** — a small icon or hover preview that makes the link visually distinct from external URLs.

The router (probably react-router) maps `/lessons/<slug>` to the corresponding MDX file. Authoring stays MDX-native; the link is just a React component the lesson author uses inline.

## What this rejects

- **Monolithic lessons that teach everything in their lineage.** A-FINE's file shouldn't also be the canonical lesson on LPIPS/DISTS. That bloats the A-FINE reader's path with content they didn't come for. If LPIPS earns a lesson later, the A-FINE page cross-page-hyperlinks to it; until then, glossary.
- **Embedding-not-linking.** Cross-page hyperlinks navigate to another page — they do NOT inline-embed the target lesson into the current page. Embedding would create circular content, conflicting tier states, and TOC chaos. The pattern is Wikipedia-style: click → navigate → back-button returns.
- **A file per every concept name.** VGG-16 doesn't deserve its own file. ImageNet doesn't deserve its own file. They deserve glossary entries until something genuinely changes.
- **LLM-generated lesson pages on demand.** Local 3B models can't generate widget-rich content; even with streaming, the latency is bad; quality is too unreliable for a primary teaching surface. The chat safety-net does the *targeted* version of this and is the right scope.

## When to revisit

Re-read this note when:

- A glossary entry has been visited often enough (via telemetry) that promoting it to a lesson is warranted.
- Cross-glossary linking gets heavy enough that a folder structure would help.
- Cross-page navigation telemetry shows reading paths the current TOC doesn't reflect — that's a signal that the lesson dependency graph deserves a visual / sidebar treatment of its own.
- Larger local models change the "can LLMs generate widgets?" calculus.
- The project grows past ~50 lessons and a search / index UX becomes necessary.
