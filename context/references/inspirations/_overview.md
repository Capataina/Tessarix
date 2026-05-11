# Inspirations — Overview

This folder catalogues interactive-learning tools surveyed during initial Tessarix research. The premise: when the project is in scaffold state, the cheapest education for *us* about what a great Teach lesson looks like is to study the dozens of tools other people have built across every domain. The patterns scale; the tools are evidence.

The catalog is a working reference, not a static archive. It will grow as new tools are discovered and shrink as ones we learn nothing from are pruned.

## How to use this folder

**Start here, before designing a new lesson type or widget.** If you're about to write a `<FunctionGrapher>` or design how the Teach pillar handles a multi-step algorithm, look first at how the surveyed tools handle the same shape. Most patterns we'd plausibly invent have been tried elsewhere — usually well, sometimes badly. Either is informative.

The structure:

```text
inspirations/
├── _overview.md            ← this file (map + how to use)
├── recurring-patterns.md   ← the centerpiece: what scaled, why, how to apply
├── stem-core/              ← math, physics, chem/bio, CS, ML, neuro
├── technical-specialised/  ← quant, quantum, crypto, hardware, net, DB, compilers, OS, blockchain
└── wildcards/              ← music, linguistics, history, anatomy, climate, philosophy, journalism
```

**`recurring-patterns.md` is the most valuable file in this folder.** Per-domain files are evidence; the patterns file is the synthesis. When designing a widget, read patterns first to identify the shape, then read the relevant domain file for concrete implementations.

## Reading order by intent

| Intent | Read this |
|---|---|
| "How should I shape *this* widget?" | `recurring-patterns.md` → then the §Selection guidance table for which pattern fits your teaching task → then the relevant domain file for implementations. |
| "What does the state of the art look like in *this* domain?" | The matching domain file. |
| "What patterns do I know about?" | `recurring-patterns.md` §The Patterns section is the catalog. |
| "What's the floor a Tessarix Teach lesson must clear?" | Brilliant.org and ethereum.org docs entries in `stem-core/general-platforms.md` and `technical-specialised/blockchain.md`. |
| "What's the ceiling?" | Transformer Explainer, En-ROADS, Quirk, Nicky Case's tools — all linked from `recurring-patterns.md` §Composability. |

## Catalog size

~73 tools total at initialisation:

- **stem-core**: 22 tools across 7 sub-domains.
- **technical-specialised**: 25 tools across 9 sub-domains.
- **wildcards**: 18 tools across 7 sub-domains.
- **User-originated seed examples** (Brilliant, Cartesian, visualgo, learn-algo, ByteByteGo, ethereum.org docs, Black Opal, Quantt, dcaclab, scienceinteractive): 10 tools, distributed into the relevant domain files and tagged `[seed]`.

A handful of seed examples (notably ByteByteGo) are not strongly interactive but were cited as inspirations; they are included for completeness with the limitation noted.

## How entries are formatted

Every tool entry follows the same shape:

```markdown
### Tool Name [tag if applicable]

- **URL**: ...
- **Domain**: <sub-domain if more specific than the file's>
- **What it does**: ...
- **Interactive pattern**: <patterns from recurring-patterns.md, by name>
- **Why interesting for Tessarix**: <which Tessarix pillar / subsystem / primitive this informs>
```

The **Interactive pattern** field references `recurring-patterns.md` by pattern name. Names there are the source of truth; if a tool exhibits a pattern not in that catalog, add the pattern there first.

## Lifecycle

This folder is a `references/` artefact, so it follows the rules in the upkeep-context skill: kept current, pruned when stale, expanded when something material is missing. Do not add a tool to the catalog without filling in all five fields. An entry without the "Why interesting for Tessarix" field is noise — the catalog's job is to translate observed-elsewhere into actionable-here.

When a pattern recurs across enough new tools to deserve its own catalog entry in `recurring-patterns.md`, add it there. The patterns file grows; the open-list permission from the upkeep-context skill applies.
