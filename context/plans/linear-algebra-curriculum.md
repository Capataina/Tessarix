# Linear Algebra Curriculum — full plan

A complete linear-algebra track for Tessarix, scoped at "foundations through SVD plus applications." The current lesson (`src/lessons/linear-algebra.mdx`, slug `linear-algebra`) is the **primer / entry point**; this document plans the dozen-plus lessons that should follow it.

## Architectural decision

**Not a mega-lesson. Not a flat list. A connected graph of focused lessons.**

The four-tier content architecture (`context/notes/content-architecture.md`) already prescribes the model: full lessons, cross-page hyperlinks to other lessons, glossary entries, chat safety-net. Linear algebra is the first place this graph actually has more than two nodes — we'll feel out the lesson-graph patterns here before scaling them.

| Rejected approach | Why |
|---|---|
| One mega-lesson covering scalar through SVD | 200+ KB MDX, unnavigable, every change touches everything. Violates the lesson-as-curated-artefact discipline. |
| Flat list of 30 lessons in a single folder | Doesn't capture the dependency structure. A reader picking "eigenvectors" without knowing what a basis is is going to bounce. |
| One linear sequence (each lesson opens the next, no branching) | Linear algebra isn't actually linear — multiple legitimate entry points (geometric vs computational vs applied) lead through it. Force-linearising it loses pedagogical flexibility. |

**Chosen approach**: a directed acyclic prerequisite graph. Each lesson states its prerequisites. The primer is the universal root. Readers can enter via the primer and walk forward; or jump in via an applied lesson and follow back-pointers when they hit something they don't have prerequisites for. Cross-page hyperlinks in the lesson body do that "follow back" navigation.

## Status — what's built

As of 2026-05-11, **five lessons** in the linear-algebra track are authored, all in the canonical voice (`context/notes/lesson-voice.md`):

| Slug | Title | Layer | Status |
|---|---|---|---|
| `linear-algebra-foundations` | Foundations | 1 | ✅ Built |
| `linear-algebra-matrices` | Matrices as Transformations | 2 | ✅ Built |
| `linear-algebra-dot-product` | The Dot Product | 1 | ✅ Built |
| `linear-algebra-span` | Linear Combinations and Span | 3 | ✅ Built |
| `linear-algebra-matrix-operations` | Matrix Operations | 2 | ✅ Built |

The remaining lessons in the 12-lesson recommended track are not yet authored. The next priorities are listed in §Implementation priorities below.

**Widgets shipped in support of these lessons** (cross-listed against `widget-creativity-discipline.md`'s metaphor library):

- `VectorPlot` — patterns §4 (direct manipulation) + §1 (iterated operation, via the head-to-tail sum chain)
- `ScalarMultiplier` — pattern §1 (iterated operation)
- `MatrixTransform` — pattern §3 (deformation/morph) + §4 (direct manipulation)
- `DotProductGeometry` — pattern §2 (projection/shadow)
- `LinearCombination` — patterns §10 (constructive build-up) + §6 (particle-field span trail) + §4 (direct manipulation of all three vector handles)
- `MatrixComposition` — patterns §5 (dual-state simultaneous AB-vs-BA panels) + §7 (composition timeline)

## Curriculum (6 layers, 28 lessons)

Lessons marked **PRIMER** are the current `linear-algebra.mdx` content (will eventually be split out). Lessons marked **NEXT** are the immediate priority after the primer. The rest are sketches; their scope may consolidate as authoring progresses.

### Layer 1 — Foundations *(scalar through vector operations)*

| Slug | Title | Pivot | Widgets |
|---|---|---|---|
| `scalars` | What is a scalar | PRIMER | (none new — prose + assessment) |
| `vectors` | Vectors as components and as arrows | PRIMER | VectorPlot |
| `vector-addition` | Adding vectors head-to-tail | PRIMER | VectorPlot with sum |
| `scalar-multiplication` | k·v as iterated addition | PRIMER | ScalarMultiplier |
| `dot-product` | Dot product geometry and algebra | NEXT — in primer (Complete tier) | DotProductGeometry |
| `vector-norms` | |v|₁, |v|₂, |v|∞, geometry of unit balls | LATER | UnitBallExplorer (new) |

### Layer 2 — Matrices and transformations

| Slug | Title | Pivot | Widgets |
|---|---|---|---|
| `matrices-as-transformations` | The unit square's image; determinant as area scaling | PRIMER | MatrixTransform |
| `matrix-operations` | Addition, scalar multiplication, transpose | NEXT | MatrixOperations (new) |
| `matrix-multiplication` | AB as composition of transformations; AB ≠ BA | NEXT | MatrixComposition |
| `matrix-vector-product` | A·v as the action of A on v; matrix-vector mul row-by-row | NEXT | MatrixTransform with test vector |
| `common-matrices` | Identity, diagonal, rotation, reflection, shear, projection | NEXT — in primer (gallery) | MatrixGallery (using MatrixTransform presets) |
| `matrix-inverse` | A⁻¹ undoes A; when does it exist; computation by row reduction | LATER | MatrixInverse (new) |
| `gaussian-elimination` | Row reduction; pivots; rank; back-substitution | LATER | RowReduction (new) |

### Layer 3 — Structure of vector spaces

| Slug | Title | Pivot | Widgets |
|---|---|---|---|
| `linear-combinations-and-span` | α·u + β·v fills out the span | NEXT — in primer | LinearCombination |
| `linear-independence` | When can a vector be expressed in others | LATER | LinearDependence (new) |
| `basis-and-coordinates` | Why bases matter; coordinates depend on the basis | LATER | BasisChange (new) |
| `change-of-basis` | The change-of-basis matrix; expressing the same vector in different bases | LATER | BasisChange |
| `subspaces` | Lines and planes through the origin; closure under combination | LATER | SubspaceExplorer (new) |
| `null-space-and-rank` | What gets sent to zero; the rank-nullity theorem | LATER | NullSpaceVisualizer (new) |
| `column-space-and-row-space` | Reach of A; orthogonality between row and null space | LATER | RowColSpace (new) |

### Layer 4 — Eigenstructure

| Slug | Title | Pivot | Widgets |
|---|---|---|---|
| `eigenvectors-intuition` | The vectors A doesn't rotate; their eigenvalues are scaling factors | LATER | EigenvectorExplorer (new) |
| `characteristic-polynomial` | The algebraic side: det(A − λI) = 0 | LATER | (mostly prose + computation) |
| `diagonalisation` | When A = PDP⁻¹; what diagonalisation lets you do | LATER | DiagonalisationSteps (new) |
| `symmetric-matrices-spectral-theorem` | Symmetric matrices are always diagonalisable with orthogonal eigenvectors | LATER | SpectralTheorem (new) |

### Layer 5 — Decompositions

| Slug | Title | Pivot | Widgets |
|---|---|---|---|
| `lu-decomposition` | LU as recording the elimination steps | LATER | (computation walkthrough) |
| `qr-decomposition` | Gram-Schmidt; QR as orthonormal-then-upper-triangular | LATER | GramSchmidtAnimation (new) |
| `singular-value-decomposition` | SVD as rotation–scaling–rotation; the most important factorisation | LATER | SVDExplorer (new) |
| `pca-as-applied-svd` | Compress data by keeping top-k singular values | LATER | PCAProjection (new) |

### Layer 6 — Applications

| Slug | Title | Pivot | Widgets |
|---|---|---|---|
| `linear-regression-as-least-squares` | Projection onto the column space minimises residuals | LATER | (composition of LinearCombination + projection) |
| `pagerank-as-eigenvector` | The dominant eigenvector of a transition matrix | LATER | (graph + power iteration) |
| `quantum-state-vectors` | Quantum states as unit complex vectors; measurement as inner product | LATER | (light touch — bridges into a quantum lesson) |
| `compression-and-image-processing` | SVD-truncate an image; watch the quality loss | LATER | ImageCompressionDemo (new) |

## Prerequisite graph

```
                          scalars
                             │
                             ▼
                          vectors
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       vector-addition  scalar-mul     dot-product
              │              │              │
              └─────┬────────┴──────────────┘
                    ▼
            matrices-as-transformations
                    │
   ┌────────────────┼─────────────────┐
   ▼                ▼                 ▼
matrix-ops    matrix-vector       common-matrices
   │                │
   └─────┬──────────┘
         ▼
matrix-multiplication
         │
         ▼
linear-combinations-and-span ─────┐
         │                        │
   ┌─────┴──────┐                 ▼
   ▼            ▼          matrix-inverse
linear-indep  basis-and-coords
   │            │
   └─────┬──────┘
         ▼
   subspaces ─────► null-space-and-rank ─────► column-and-row-space
                                                       │
                                                       ▼
                                              eigenvectors-intuition
                                                       │
   ┌───────────────────┬───────────────────────────────┤
   ▼                   ▼                               ▼
char-polynomial   diagonalisation              symmetric-matrices
                       │                               │
                       ▼                               ▼
                 lu-decomposition                  qr-decomposition
                       │                               │
                       └───────┬───────────────────────┘
                               ▼
                          singular-value-decomposition
                               │
                               ▼
                       pca-as-applied-svd
                               │
                  ┌────────────┼─────────────┐
                  ▼            ▼             ▼
            linear-regression  pagerank   compression
```

## Implementation priorities

**Priority 1 — foundations + matrices + dot-product + span + matrix-operations**. ✅ DONE.
The current 5 lessons cover the entire foundation layer of the curriculum plus the matrices + matrix-operations entry into Layer 2.

**Priority 2 — Matrix Inverse and Gaussian Elimination**. Next up.
Covers: when $A^{-1}$ exists, the row-reduction algorithm, the structural correspondence between solving $A\mathbf{x} = \mathbf{b}$, computing inverses, and Gaussian elimination. Cross-references back to the determinant interpretation from `linear-algebra-matrices` and the column-space discussion from `linear-algebra-span`.

Widget needs:
- A `RowReduction` widget that animates the elimination steps on a small matrix, with row-swap and row-scaling operations as discrete moves the reader can drive. Pattern §1 (iterated operation) + §11 (convergence animation).
- Possibly extending `MatrixTransform` with an "inverse mode" that shows A and $A^{-1}$ side-by-side, with their composed transformation collapsing back to the identity. Pattern §5 (dual-state).

**Priority 3 — Basis and Change of Basis**. After matrix inverse.
Builds directly on linear combinations and span. A new widget — `BasisExplorer` — would let the reader set two basis vectors and then see the coordinates of an arbitrary target point in two different bases (the standard basis and the custom one). Pattern §4 (direct manipulation) + §5 (dual-state).

**Priority 4 — Rank, Null Space, and the Four Fundamental Subspaces**. Substantial conceptual leap. Needs a widget for visualising the column space and null space of a matrix as geometric subspaces — likely an extension of `LinearCombination` + a new `NullSpaceVisualiser`.

**Priority 5+ — Eigenvectors, Diagonalisation, SVD**. Layer 4 + 5. Each lesson needs a substantial new widget (`EigenvectorExplorer` for "vectors that don't rotate under A"; `SVDExplorer` for rotation-scaling-rotation decomposition; etc.). Author when the prerequisite layer is fully built and the next-step pedagogical needs are clearer.

## Open design questions

- **Splitting the primer.** Once the primer has all 8 PRIMER topics, does it get split into one lesson per topic? Probably yes — keeps individual lessons under ~10 minutes. The primer becomes a "Start here" overview that cross-page-hyperlinks to each.
- **Glossary vs lesson.** Eigenvalue, basis, span — when do these graduate from glossary entries to standalone lessons? Tentatively: when their widget design crystallises. Eigenvalues earn a lesson because EigenvectorExplorer is a real widget; "scalar" stays in the primer because there's no widget for it.
- **Tier discipline.** Each lesson gets `lite` / `standard` / `complete` tiers. Lite = 5 min read, standard = full conceptual walkthrough, complete = formal proofs, computational details, edge cases. Lesson authors must respect all three tiers per lesson.
- **Cross-references to other Tessarix lessons.** A-FINE's fidelity head IS an SSIM-style ratio in feature space — that's a natural cross-link from the dot product lesson into A-FINE's fidelity-head section. Capture in `notes/content-architecture.md` once the linear algebra lessons exist.
- **Cross-references to external resources.** Each lesson ends with a "Where to read next" — 3Blue1Brown, Strang, Immersive Math, etc. Standardise the format across lessons.

## When this document is wrong

This is a plan, not a contract. Things that should update it:
- A lesson turns out to need a different prerequisite chain than drafted (e.g. SVD needs more matrix-multiplication background than expected).
- A widget that seemed essential isn't actually feasible at the local-LLM quality bar.
- A topic is too big or too small for a single lesson.

When updating: append a "Revision history" entry at the bottom with date + what changed + why.
