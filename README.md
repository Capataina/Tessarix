# Tessarix

A local-first interactive learning substrate. Multi-modal hypertext app for learning abstract concepts (software, mathematics, ML, finance, adjacent domains) through narrative + embedded interactive widgets + drill-down playgrounds + step-throughable visualisations, rather than plain prose.

Three pillars per concept, branches not steps:

- **Teach**: lesson narrative (MDX) with embedded widgets and ByteByteGo-style diagrams
- **Quiz**: question-bank-driven adaptive retrieval-practice with SM-2 / FSRS spacing
- **Interview**: free-response questions with Claude-API-graded feedback

Inspirations: Brilliant.org + Cartesian.app + visualgo.net + learn-algo.com + ByteByteGo + ethereum.org docs end-of-page assessments. The product is a deliberate blend; no single one is the model.

Full design doc lives in the LifeOS vault at `Projects/Potential Projects/Adaptive Learning Helper.md`.

## Stack

- Tauri 2 + Vite + React 19 + TypeScript
- MDX for lesson content (markdown with embedded React components)
- KaTeX for math
- Monaco editor for code questions + playground code editing
- SQLite (WAL) for spaced-repetition state + session history + per-topic mastery
- Claude API for the sync-learning authoring agent + free-response interview grader

## Develop

```sh
pnpm install
pnpm tauri dev
```

## Build

```sh
pnpm tauri build
```

## Status

Milestone 1 in progress: scaffold + initial component library + first hand-authored lesson (A-FINE).
