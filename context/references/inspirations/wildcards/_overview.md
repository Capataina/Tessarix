# Wildcards — Patterns from Unexpected Fields

Tools from fields where prose has historically been the conventional teaching mode and someone broke that convention with interactivity. The wildcards folder is the "borrow from unexpected fields" beat: a music-theory tool's interactive pattern often translates to teaching ML internals; a history-map's time-scrubber translates to teaching gradient-descent checkpoints; an anatomy-app's layer-peel translates to teaching network-stack abstractions.

The patterns from these tools are often the most distinctive in the catalog precisely because the source domain forced creativity — these designers couldn't fall back on the standard "show the algorithm step by step" template the way an algorithm-visualisation tool can.

## Files

| File | Tools | Topics |
|---|---|---|
| [`music-theory.md`](music-theory.md) | 3 | Chord progressions, scales, ear training, Tonnetz |
| [`linguistics-phonetics.md`](linguistics-phonetics.md) | 4 | IPA charts, MRI phonetics, etymology trees |
| [`history-geography-art.md`](history-geography-art.md) | 4 | Timeline scrubbers, historical atlases, museum collections |
| [`anatomy.md`](anatomy.md) | 2 | 3D body explorers with layer-peel |
| [`climate.md`](climate.md) | 1 | Multi-parameter systems-dynamics policy simulator (En-ROADS) |
| [`philosophy-systems.md`](philosophy-systems.md) | 3 | Game theory, argument mapping, systems thinking |
| [`interactive-journalism.md`](interactive-journalism.md) | 2 | The Pudding (music, culture) |

## Strongest exemplars to study first

1. **Nicky Case's tools** (`philosophy-systems.md`) — Evolution of Trust, LOOPY, and (in `stem-core/neuroscience.md`) the spaced-repetition comic. The cleanest exemplars of "play the mechanic first, name the theory second" and "the medium IS the message."
2. **En-ROADS** (`climate.md`) — the densest exemplar of multi-parameter sliders driving a causal system. Aspire to this density for any Tessarix lesson with many independent controls.
3. **Zygote Body** (`anatomy.md`) — the cleanest exemplar of layer-peel via opacity. Direct template for teaching abstraction layers.

## Patterns most represented in wildcards

Cross-referencing `../recurring-patterns.md`:

- Spatial proximity encodes relationship (pattern 6): Circle of fifths, Tonnetz, IPA chart — wildcards are over-represented in this pattern.
- Time-scrubber over state machine (pattern 8): Histography, Chronas, Running Reality — historical/geographical tools dominate here.
- Concept enacted by the medium (pattern 12): Nicky Case's tools — the strongest exemplars in the catalog.
- Layer-peel via opacity (pattern 13): Zygote Body, BioDigital — anatomy is the source domain for this pattern.

## How to use this folder when designing a Tessarix widget

The transposition is intentional. When designing a widget for a software/ML topic, ask: "what music tool / history tool / anatomy tool uses a shape that fits this concept?" The answer is often more useful than asking "what algorithm-visualisation tool does this concept?" because the algorithm-visualisation answer is likely already obvious.

Concrete examples of the translation:

- **Music theory's Circle of Fifths** → hyperparameter grids, modular arithmetic, lattice-based type systems.
- **History's time-scrubber** → gradient-descent trajectory replay, training-loop epoch playback.
- **Anatomy's layer-peel** → network stack abstraction, compiler pass toggling.
- **Argdown's argument map** → dependency graphs, type-inference derivations.
- **The Pudding's musical motif highlighting** → regex-match highlighting across a corpus.

The wildcards are not optional — they are where the freshest patterns come from.
