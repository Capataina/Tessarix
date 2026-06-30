# Curriculum graph — the typed concept DAG, the index, and graph navigation

**Status: BUILT (2026-06-30).** The concept graph (`src/lib/graph/{meta,linker,build}`), the
deterministic linker, and the graph-nav front door (`src/components/nav/GraphNav.tsx`) shipped.
Remaining sub-item: auto-linking *authored lesson prose* (the linker runs on generated content —
the mini-lesson — today; an MDX rehype pass would extend it to lesson bodies). Edges shown are
prerequisite-order + teaches; a richer node-graph render is a future enhancement.

## Why this is the keystone

Four separate features all turn out to consume one data structure. Build the structure
once and they become thin features on top of it instead of four bespoke systems:

| Feature | What it does with the graph |
|---|---|
| **Graph/tree navigation** | *Renders* the graph as the app's landing + browse surface |
| **Inline concept links** ([content-architecture.md](../notes/content-architecture.md)) | *Resolves* concept terms in prose to their owning-lesson nodes |
| **Fullscreen widget mini-lesson** ([interface-affordances.md](../notes/interface-affordances.md) §10) | *Queries* the graph to weave links into generated explanations |
| **"Explain here" / "turn into lesson"** ([llm-integrations.md](../notes/llm-integrations.md) §10) | Same — generated prose linked via the concept index |

> The graph is the **brain**; the [token-driven component system](component-system.md) is the
> **skin**. They meet at categories: a category is both a *root of the graph* and a
> *colour scheme* ([visual-identity.md](../notes/visual-identity.md) per-category palettes).

## The data model

A typed, directed graph — a DAG for prerequisites (topics share prerequisites, so it's a
graph, not a tree), with several edge kinds:

```
nodes:   category  ▸  topic  ▸  lesson  ▸  concept
                 (a concept is owned/taught by exactly one lesson; mentioned by many)

edges:
  part-of        lesson → topic → category        (containment / the browse hierarchy)
  prerequisite   lesson → lesson                   (learn-order; the DAG; may cross topics)
  taught-by      concept → lesson                  (the concept index; one owner)
  mentions       lesson → concept                  (where a concept appears; many)
  related        lesson ↔ lesson                   (soft "see also", non-prerequisite)
```

The single source of truth is **lesson frontmatter** (the registry already exists at
`src/lessons/registry.ts`; the graph is derived from frontmatter + the registry, not a
separate hand-maintained file):

```yaml
slug: linear-algebra-matrix-operations
title: Matrix operations
category: mathematics            # → colour scheme + concept namespace
topic: matrices                  # → the browse hierarchy
teaches:                         # concepts this lesson OWNS (taught-by edges)
  - matrix-multiplication
  - transpose
aliases:                         # surface forms the linker should catch
  matrix-multiplication: [matrix multiply, matmul]
prerequisites:                   # lesson slugs (prerequisite edges; the DAG)
  - linear-algebra-matrices
related: [linear-algebra-dot-product]
```

A build step (extend `scripts/`, sibling to `lint-lesson-frontmatter.ts`) inverts this into:

- **`concept → owning-lesson` index** (from `teaches` + `aliases`), keyed by `(category, concept)`
  so "kernel" disambiguates per domain.
- **the prerequisite DAG** (from `prerequisites`) — validated acyclic at build time.
- **the containment tree** (category ▸ topic ▸ lesson) for the browse UI.

## The deterministic linker

Scans authored prose AND generated prose, replaces known concept terms with cross-page
hyperlinks to their owning lesson. See [content-architecture.md](../notes/content-architecture.md)
("Automating the links" + "Generation is separated from linking"). Density-capped
(first occurrence per section); category-namespaced; never invents a target.

## The navigation view (replaces the card grid)

The launch experience the user described:

```
Landing  ─ chat bar on top ─  pick a top-level CATEGORY
   │        (Mathematics · Finance · Science · …)
   ▼
Category graph  ─ shows only the TOPICS as nodes (Linear Algebra, Calculus, …)
   │             the app recolours to the category's palette here
   ▼
Click a topic  ─ it EXPANDS in place into its lesson sub-tree
   │             ("inception" / recursive tree-in-tree: matrix-ops is a leaf of
   │              matrices, which is a leaf of linear-algebra-foundations)
   ▼
Click a lesson ─ open it; the graph showed prereq order + which lessons connect
```

- Only top-level nodes are visible by default; deeper structure reveals on expand
  (progressive disclosure — avoids the wall-of-cards problem).
- Edges visualise prerequisite order ("what to learn first") and `related`/`mentions`
  cross-links ("which lessons are connected / tagged in which").
- Rendering: the stack already lists `react-flow / xyflow` (README §8) for node-graph viz;
  a custom SVG/canvas is the alternative. **Open: should the graph itself be ASCII/terminal-
  styled** to match the identity, or a proper node-graph? Lean: proper node-graph for the map
  (genuine 2D geometry), terminal styling on the node chrome.

## Sequence

1. **Frontmatter schema + build step** → emit the concept index + the DAG + containment tree;
   validate acyclic; fail build on a `prerequisites`/`teaches` pointing at a non-existent slug.
2. **Deterministic linker** → ship **inline concept links** first (cheapest, durable, highest
   value; the user noted it dwarfs "create your own lesson"). Back-fill existing lessons'
   `teaches`/`category` frontmatter.
3. **Graph nav view** → landing → category → expanding tree, consuming the same derived data.
4. The generated-content surfaces (mini-lesson, explain-here, turn-into-lesson) reuse the
   linker from step 2 — no new linking work.

## Open questions

- Topic granularity — per-file, per-section, or per-concept-cluster? (README §12 already flags
  this; the `topic` field is the current answer, revisit if clusters get fuzzy.)
- Prerequisite enforcement — hard gate ("finish X before Y") or free-form advisory? (README §12;
  lean advisory — show the order, don't lock it.)
- Is `concept` a real node or just an index key? Start as an index key; promote to a node only
  if the graph view wants to show concepts as first-class nodes.

## Blast radius / related

- `src/lessons/registry.ts` + every lesson's frontmatter (the `teaches`/`category`/`prerequisites`
  fields are additive; lint can warn on missing ones).
- Replaces the current catalog card grid as the primary nav (the catalog/recommender logic moves
  onto the graph).
- [component-system.md](component-system.md) — the nav + graph render through the global components.
- [content-architecture.md](../notes/content-architecture.md), [interface-affordances.md](../notes/interface-affordances.md),
  [llm-integrations.md](../notes/llm-integrations.md), [visual-identity.md](../notes/visual-identity.md).
