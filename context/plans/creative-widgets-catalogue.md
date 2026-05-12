# Creative widgets catalogue — linear algebra track

A catalogue of *truly interactive* widget ideas, beyond the slider+chart and multiple-choice patterns. Compiled in response to "I barely see any quizzes anywhere, especially when it comes to interactive ones … come up with at least 5 truly creative widgets for each lesson … I mean truly interactive and creative. Things that are actually unique."

The metaphor library in `notes/widget-creativity-discipline.md` covers some of these, but most of the widgets shipped so far still default to "drag a vector, watch a number change." That's interactive but it's NOT a quiz — there's no win-state, no failure mode, no scoring, no creative-problem-solving moment. The widgets in this catalogue try to push past that: drag-to-construct puzzles, ordering games, click-to-mark mechanics, race-the-clock challenges, free-form drawing assessments, build-the-equation tile games, and Brilliant-style mini-games.

The aim is for each lesson to have **at least one widget that genuinely tests the reader** — where success is unambiguous and the widget can detect both the right answer and common wrong-answer patterns.

---

## Lesson: Linear Algebra — Foundations (`linear-algebra`)

### 1. VectorChainPuzzle (drag-to-construct)
**Mechanic**: A target vector $\mathbf{T}$ is shown on a grid. A "palette" of 4–6 candidate vectors sits below the canvas. Reader drags vectors from the palette onto the canvas; they snap head-to-tail. Goal: build a chain whose total reaches $\mathbf{T}$. Multiple solutions accepted; widget detects success (sum is within ε of T) and highlights elegant solutions (fewest segments).
**Teaches**: Vector addition is associative + commutative + path-independent. The geometric meaning of "sum" is "concatenation of segments".
**Distinctive**: It's a JIGSAW. Drag-and-drop with snap-to-tail and a verifiable win-state — no widget currently has this.

### 2. ScalarSpeedMatch (timed multiple-choice with vector visualisation)
**Mechanic**: A vector $\mathbf{v}$ flashes on screen; a "scalar question" appears: "which scalar takes $\mathbf{v}$ to the indicated target?" Reader has 3 seconds to tap one of four scalar candidates. Score across 10 rounds.
**Teaches**: Reflexive intuition for $k\mathbf{v}$ as length-scaling.
**Distinctive**: Time pressure is genuinely new mechanic — forces gut-level intuition rather than careful calculation.

### 3. VectorMaze (path-navigation game)
**Mechanic**: A 2D maze rendered on a grid. The player's position is a vector; moving = adding a vector from a fixed action set (e.g. ê₁, ê₂, ê₁+ê₂, -ê₁). Goal: reach the exit. Walls block certain moves. Track shows the running vector sum.
**Teaches**: Vector addition is a translation. Path-additivity. The order of operations doesn't matter for the destination — only for the *path*.
**Distinctive**: Honest minigame, not just a visualisation. The reader has a goal, makes choices, can lose (run out of moves).

### 4. MagnitudeRanker (drag-to-order)
**Mechanic**: 5–7 vectors of different lengths shown at once. Reader drags them into a vertical list, ordered by magnitude. Widget grades on submit; correct positions glow green, wrong ones red.
**Teaches**: Magnitude is independent of direction. Pythagorean magnitudes can deceive — (3, 4) feels small but has magnitude 5.
**Distinctive**: Drag-to-reorder is a new mechanic for this codebase.

### 5. ComponentReverseEngineer (build-the-vector)
**Mechanic**: A vector is drawn on a grid, NO components shown. Reader uses two sliders or click-arrows to set $v_x, v_y$. When their tuple matches the drawn vector (within tolerance), green flash + next round. Levels of difficulty (decimal precision, off-grid placement).
**Teaches**: Reading components from a drawn vector. The reverse of the usual exercise (given components → draw).
**Distinctive**: Auto-graded puzzle, scoring across rounds. Not just visualisation.

---

## Lesson: Linear Algebra — The Dot Product (`linear-algebra-dot-product`)

### 1. OrthogonalityDartboard (aim + verify)
**Mechanic**: A fixed reference vector $\mathbf{r}$ is drawn. The reader drags a "dart" vector. The widget colour-codes the angle: red when not perpendicular, yellow as it approaches 90°, green when within 2°. Score: hit perpendicular targets in fewer drags. Includes random new $\mathbf{r}$ on each round.
**Teaches**: Orthogonality has a geometric "feel" — when the dart is at 90° to the reference, the dot product collapses to zero. Reader develops a visual gut sense for "perpendicular".
**Distinctive**: Continuous feedback + auto-rounds + scoring loop. Not just drag-and-see.

### 2. ProjectionTargetGame (predict-then-verify with quantitative scoring)
**Mechanic**: Two vectors shown; reader is asked to estimate (in their head) what the projection of $\mathbf{a}$ onto $\mathbf{b}$ will be. They click a target position on $\mathbf{b}$'s line where they THINK the foot of the perpendicular will land. Widget reveals the actual foot and scores by closeness.
**Teaches**: Projection is geometric, not algebraic — you should be able to "see" where the foot lands without computing.
**Distinctive**: Asks the reader to predict by CLICKING THE POSITION rather than picking from MC options. Spatial prediction.

### 3. EmbeddingNearestNeighbour (high-dim simulator)
**Mechanic**: A scatter of 30 colored 2D points (each a "fake embedding"). Reader picks a query point. Widget highlights the 3 nearest neighbours by cosine similarity (largest dot product, both unit-normalised). Reader's job: predict the 3 nearest before clicking "reveal".
**Teaches**: Cosine similarity in low-D is mostly about direction agreement. High-D embeddings (CLIP, BERT) work the same way conceptually.
**Distinctive**: Bridges to ML interpretation. Genuinely novel mechanic for this codebase.

### 4. DotProductCalculator (build-the-sum)
**Mechanic**: Two vectors shown. The dot product formula $a_1 b_1 + a_2 b_2$ is presented as DRAGGABLE TILES (each $a_i b_i$ is a tile). Reader must drag the right products into the "sum bar". Wrong products are auto-rejected.
**Teaches**: The mechanical algorithm for computing dot products, with no shortcut. Component pairs go together; you can't mix $a_1$ with $b_2$.
**Distinctive**: Tangible algorithm execution. A "do this calculation correctly" mini-game.

### 5. CosineWheelHunt (find-the-angle)
**Mechanic**: Two vectors of fixed magnitudes are drawn at unknown angles. A "wheel" of pre-computed cosine values is shown. Reader is asked: "Find any pair of vectors whose dot product equals X." Reader drags both vectors until the dot product matches X within tolerance. Then a new X.
**Teaches**: Many vector configurations produce the same dot product. The dot product is a many-to-one invariant.
**Distinctive**: An open-ended construction puzzle. Multiple valid solutions per round.

---

## Lesson: Linear Algebra — Matrices as Transformations (`linear-algebra-matrices`)

### 1. MatrixGuessr (reverse-engineering quiz)
**Mechanic**: The widget shows the unit square transformed into a parallelogram. The matrix that produced it is hidden. Reader has 4 inputs (a, b, c, d) and must enter the matrix. On submit, widget grades correctness with tolerance. Difficulty levels (integer matrices, decimal, off-screen geometry).
**Teaches**: Reading a matrix off the geometry. The basis-vector images $A\hat{\imath}, A\hat{\jmath}$ ARE the columns of $A$.
**Distinctive**: TRUE quiz. Reader has to commit to an answer. Auto-grading.

### 2. TransformationLibraryMatch (drag-to-match)
**Mechanic**: 6 named transformations on the left ("Rotation 30°", "Shear-x by 1", "Scale 2× vertical", etc.). 6 matrices on the right. Reader drags lines to connect each name to its matrix. Lines turn green when right.
**Teaches**: The mapping from geometric names to matrix entries.
**Distinctive**: Drag-to-connect mechanic, line-drawing. Distinctive UI.

### 3. UnitSquareTetris (real-time transformation game)
**Mechanic**: Shapes drop from the top. To dock each shape into the right slot at the bottom, the reader must apply a transformation. Reader picks from 4 candidate matrices; the shape is transformed and either fits or doesn't. Lives are limited.
**Teaches**: Composing transformations to match targets. Rapid mental application of matrices.
**Distinctive**: Tetris-like minigame. New mechanic entirely.

### 4. DeterminantSlider (race-condition game)
**Mechanic**: Two basis vectors drawn; reader can drag both. A "danger meter" shows $|\det A|$. Goal: drive det to *exactly zero* (within 0.005) by adjusting the vectors. As a twist, time penalty if you exceed certain values; "near miss" effect as you approach singular.
**Teaches**: Singularity is a knife edge — small changes flip you between invertible and non-invertible.
**Distinctive**: Target-zero game. Hyper-fine control challenge.

### 5. ShapeTransformPainter (paint the image)
**Mechanic**: A matrix is given. The unit square is drawn. Reader must PAINT the image of the unit square — clicking and dragging to fill in where the parallelogram will land. The widget grades coverage and overshoot, scoring on accuracy.
**Teaches**: Predicting where points go under a known matrix.
**Distinctive**: Free-form drawing assessment. NEW: requires canvas paint mechanics.

---

## Lesson: Linear Algebra — Linear Combinations and Span (`linear-algebra-span`)

### 1. SpanColouringGame (click-to-mark)
**Mechanic**: Two basis vectors $\mathbf{u}, \mathbf{v}$ are draggable. Reader clicks points on the plane. Each click is colour-coded: green if the point is in the span of $\mathbf{u}, \mathbf{v}$, red if not. Score: marks made / reachability ratio. When span is 2D, every click is green; when 1D, only collinear clicks score.
**Teaches**: Span is a region. Most points ARE in 2D span unless $\mathbf{u}$ and $\mathbf{v}$ are dependent.
**Distinctive**: Click-to-test mechanic. Different from existing widgets.

### 2. ReachTheTarget (multi-coefficient puzzle)
**Mechanic**: A target point $\mathbf{T}$ is fixed. Two basis vectors $\mathbf{u}, \mathbf{v}$ are draggable. Reader adjusts $\alpha, \beta$ (the coefficients in $\alpha\mathbf{u} + \beta\mathbf{v}$) with sliders OR by clicking on the lattice generated by integer multiples of $\mathbf{u}, \mathbf{v}$. Goal: reach $\mathbf{T}$ exactly with integer coefficients if possible (else with decimals).
**Teaches**: Integer-coefficient combinations form a lattice, not the whole plane. Decimal combinations reach every point in the span.
**Distinctive**: Integer-vs-continuous mode toggle. Lattice + plane modes.

### 3. DependenceDetector (multi-select identification game)
**Mechanic**: 6–8 vectors are drawn. Reader must SELECT (click) every subset of two vectors that is linearly DEPENDENT. Submit at the end; widget grades all selections.
**Teaches**: Detecting collinearity by inspection. The geometric pattern of dependent pairs.
**Distinctive**: Multi-select interaction. A "find them all" mechanic.

### 4. BasisOrNot (rapid-fire judgement)
**Mechanic**: A pair of vectors flashes; reader hits "basis" or "not basis" key. Detects "yes-bias" vs "no-bias" patterns. Quizzes 10 pairs.
**Teaches**: Quick recognition of degenerate cases.
**Distinctive**: Speed quiz format. Honest rapid-fire.

### 5. SpanShrinker (constraint-satisfaction puzzle)
**Mechanic**: Start with 3 vectors. The reader must REMOVE vectors one at a time, predicting at each step whether the span will shrink. Lose if their prediction is wrong.
**Teaches**: Spanning sets can have redundancy. Removing the right vector preserves span; removing the wrong one shrinks it.
**Distinctive**: Predictive-removal mechanic.

---

## Lesson: Linear Algebra — Matrix Operations (`linear-algebra-matrix-operations`)

### 1. MatrixMultiplicationBuilder (drag-the-product)
**Mechanic**: Two matrices A and B are shown. Below them, the 4 entry slots of $AB$ are empty. The reader is shown the row-dot-column rule and must drag the right rows of A and the right columns of B onto the right slots to construct $AB$. Wrong combinations are rejected; right ones light up.
**Teaches**: $AB$'s $(i, j)$ entry is row $i$ of $A$ dotted with column $j$ of $B$. By construction.
**Distinctive**: Algorithmic-execution mini-game. Forces understanding of the index pattern.

### 2. CommutativityBingo (multi-pair speed-judgement)
**Mechanic**: A 4×4 grid of matrix pairs $(A, B)$. Reader marks each cell "commute" or "don't commute" by colouring it. Submit grades all 16; correct → score, wrong → highlight.
**Teaches**: Commuting pairs are EXCEPTIONS; most pairs don't commute. Visual pattern recognition for special cases (rotations, scalar multiples of identity).
**Distinctive**: Bingo-style grid game. Speed plus accuracy.

### 3. TransposeFlipper (free-form puzzle)
**Mechanic**: A 3×3 matrix shown. Reader clicks pairs of entries to "swap" them. Goal: get to the transposed matrix in the minimum number of swaps. Lock the diagonal.
**Teaches**: Transpose is reflection across the diagonal — entries $(i, j)$ and $(j, i)$ swap.
**Distinctive**: Constraint-satisfaction puzzle. Optimality scoring.

### 4. ABversusBAGuesser (predict-then-verify with elegance)
**Mechanic**: A and B are shown. Reader predicts ONE entry of AB and ONE entry of BA before the reveal. Score is the closer one to truth. Multiple rounds; widget tracks accuracy distribution.
**Teaches**: AB and BA differ — and the difference is rarely small. Quantitative feel for non-commutativity.
**Distinctive**: Single-entry prediction (not full-matrix). Tightens cognitive load.

### 5. ChainComposition (drag-to-order)
**Mechanic**: 4 transformation cards: Rotate, Shear, Scale, Reflect. Reader drags them into a sequence. Widget shows the resulting transformation. Goal: reach a target shape (drawn on screen). Multiple solutions accepted.
**Teaches**: Order of composition matters; same cards different order → different result.
**Distinctive**: Cardgame ordering puzzle. Open-ended solution space.

---

## Lesson: Linear Algebra — Matrix Inverse and Gaussian Elimination (`linear-algebra-matrix-inverse`)

### 1. InverseRevealer (predict-then-verify with grading)
**Mechanic**: A 2×2 matrix shown. Reader must enter $A^{-1}$ in 4 input boxes (or use a "compute" wizard). Widget grades within tolerance; wrong entries highlighted. Wizards for det check, formula reminder.
**Teaches**: Apply the 2×2 inverse formula by hand. Spot singularities.
**Distinctive**: Manual entry quiz. Forces the actual computation.

### 2. ElementaryMatrixCardGame (build-the-inverse)
**Mechanic**: Reader is shown $A$. A deck of "elementary row operation cards" appears. Reader plays cards one at a time; each card multiplies $A$ on the left by an elementary matrix. Goal: reduce $A$ to the identity. The PRODUCT of the played cards is $A^{-1}$ — widget displays the running product.
**Teaches**: $A^{-1}$ is a product of elementary matrices. The Gauss-Jordan trick is just keeping track of those products.
**Distinctive**: Cardgame format. Running-product display is novel.

### 3. SingularityWatcher (find-the-singularity puzzle)
**Mechanic**: A 2×2 matrix with one variable parameter $t$. Reader adjusts $t$ to make $\det(A(t)) = 0$. Live readout. Multiple-equation puzzles where $t$ must simultaneously satisfy two constraints.
**Teaches**: Singular conditions are equations to solve. Finding them is rootfinding.
**Distinctive**: Parametric singularity hunting. Genuinely novel.

### 4. RREFSpeedrun (timed elimination game)
**Mechanic**: A 3×3 system is given. Reader has 60 seconds to row-reduce to RREF using the existing GaussianElimination widget interface. Score: fewer operations + time.
**Teaches**: Efficient elimination sequences. Strategic pivot selection.
**Distinctive**: Timed gameplay over existing widget. Adds a scoring layer.

### 5. SystemTriage (rapid-classify quiz)
**Mechanic**: 8 random systems flash. Reader classifies each as "unique", "infinite", "no solution" in under 5s per system. Widget grades.
**Teaches**: Quick row-reduction in your head. Spotting telltale signs (rows of zeros, inconsistent rows).
**Distinctive**: Speed-classify minigame.

---

## Lesson: Linear Algebra — Basis and Change of Basis (`linear-algebra-basis`)

### 1. CoordinateTranslator (basis-swap puzzle)
**Mechanic**: A target point is shown with its **custom-basis** coordinates. Reader must navigate a "spaceship" (in the standard basis) to that point. The spaceship's controls are in the *custom basis* — pressing "up" moves by $+v$, not $+\hat{\jmath}$. Reader must mentally translate.
**Teaches**: Coordinates DEPEND on basis. Forcing the reader to compute the custom-to-standard translation makes the dependency vivid.
**Distinctive**: Real-time control under coordinate translation. Genuinely Brilliant-style.

### 2. BasisCard Tournament (pair-recognition game)
**Mechanic**: Pairs of vectors flash, one at a time. Reader hits ✓ (is a basis) or ✗ (is not). Tournament bracket — survive 10 rounds. Wrong answer ends the run.
**Teaches**: Identifying basis status fast.
**Distinctive**: Tournament format. Stakes feel real.

### 3. EigenbasisHunt (vector-selection puzzle)
**Mechanic**: A matrix $A$ is given. The reader sees the action of $A$ on a "test vector" they drag. Goal: find any direction along which $A$ acts as pure scaling (no rotation). Visual indicator helps when the vector and its image are parallel.
**Teaches**: Eigenvectors are real geometric objects you can find by inspection (foreshadows the eigenvectors lesson).
**Distinctive**: Foreshadows future lesson. Discovery-driven.

### 4. GridMorphMatcher (visual basis-identification)
**Mechanic**: A morphed grid is drawn (a 2D lattice with a specific tilt). Reader must drag $\mathbf{u}$ and $\mathbf{v}$ to RECONSTRUCT the grid. Multiple correct solutions accepted.
**Teaches**: A basis is the rule that defines a coordinate grid. Different bases → different grids.
**Distinctive**: Reverse-engineering a grid from the visual.

### 5. ChangeOfBasisRelay (multi-step solver)
**Mechanic**: Reader is given $\mathbf{v}$ in basis $B_1$ and asked to find its coordinates in basis $B_2$. Sets up the relay: $[\mathbf{v}]_{std} = B_1 [\mathbf{v}]_{B_1}$, then $[\mathbf{v}]_{B_2} = B_2^{-1} [\mathbf{v}]_{std}$. The widget walks them through each step with intermediate answers.
**Teaches**: Change of basis is a TWO-STEP process. Composition.
**Distinctive**: Multi-step solver with checkpoints.

---

## Cross-lesson — minigames that revisit fundamentals

### 1. VectorSpaceArcade (multi-game hub)
A landing widget where the reader can choose from 5–6 quick games (one per fundamental concept). Acts as a review / replay surface — like a tier-0 lesson summary.

### 2. LinearAlgebraBuilder (sandbox)
Open-ended canvas where the reader can stamp vectors, matrices, and combine them via drag-and-drop. Free experimentation; no fixed goal. Captures what the reader builds and reports back what they explored.

### 3. AdaptiveDifficultyQuiz (per-lesson)
A pool of generated questions calibrated by reader's recent answers. Wrong answers spawn easier follow-ups; right answers spawn harder ones. Tracks mastery per concept.

---

## Implementation strategy

**40+ widgets is too many for one session.** Realistic cadence:

- Wave 1 (this session): pick 4-6 mechanics that introduce truly new interaction patterns (drag-to-construct, click-to-mark, ordering, matching), implement them, and wire each into the relevant lesson.
- Wave 2 (next session): more in the same vein, plus polish.
- Wave 3+: stretch goals (Tetris-style real-time, free-form drawing, tournament brackets).

**Wave 1 picks** (priority based on mechanic novelty):
1. **VectorChainPuzzle** (Foundations) — drag-and-drop snap-to-tail. ⟵ a brand new mechanic.
2. **SpanColouringGame** (Span) — click-to-mark.
3. **MatrixGuessr** (Matrices) — auto-graded input quiz.
4. **TransformationOrdering** (Matrix Operations) — drag-to-order cards.
5. **CoordinateTranslator** (Basis) — control-translation under basis change.
6. **OrthogonalityDartboard** (Dot Product) — aim-to-perpendicular.

Each commits independently as it ships.

## Status — 2026-05-12

**31 of the 35 catalogue widgets shipped** in a single parallel-agent wave (7 Opus background agents in worktree isolation, one per lesson). Total linear-algebra widget count: **44** (was 13 going in: VectorPlot, ScalarMultiplier, MatrixTransform, DotProductGeometry, LinearCombination, MatrixComposition, MatrixInverse, GaussianElimination, BasisExplorer + 4 shipped by orchestrator this session pre-dispatch).

**Per-lesson shipped count:**

| Lesson | New widgets this session |
|---|---|
| Foundations | VectorChainPuzzle, ScalarSpeedMatch, VectorMaze, MagnitudeRanker, ComponentReverseEngineer (5) |
| Dot Product | OrthogonalityDartboard, ProjectionTargetGame, EmbeddingNearestNeighbour, DotProductCalculator, CosineWheelHunt (5) |
| Matrices | MatrixGuessr, TransformationLibraryMatch, UnitSquareTetris, DeterminantSlider, CornerPredictor (5) |
| Span | SpanColouringGame, ReachTheTarget, DependenceDetector, BasisOrNot, SpanShrinker (5) |
| Matrix Operations | TransformationOrdering, MatrixMultiplicationBuilder, CommutativityBingo, TransposeFlipper, ABversusBAGuesser (5) |
| Matrix Inverse | InverseRevealer, ElementaryMatrixCardGame, SingularityWatcher, RREFSpeedrun, SystemTriage (5) |
| Basis | CoordinateTranslator, BasisCardTournament, EigenbasisHunt, GridMorphMatcher, ChangeOfBasisRelay (5) |

**Catalogue deviations (substitutes / not-shipped):**

- **Matrices: CornerPredictor substituted for ShapeTransformPainter** — the agent's choice; free-form paint mechanics would have added UI complexity (brush, stroke buffering, area accumulation) for the same conceptual payload; per-corner-distance is a cleaner grading signal.
- **Dot Product: CosineWheelHunt named-as-catalogue but implemented as a free-drag target hunt** with live |u|·|v|·cos θ readout; the "wheel" concept folded into the readout rather than rendered as a separate dial.
- No other deviations; all other catalogue widgets shipped as-spec.

**Mechanics introduced** (none of these existed before): drag-to-construct (snap-to-tail) · click-to-mark · auto-graded input quiz (3 difficulty tiers) · drag-to-order cards (with adjacent-swap) · drag-to-connect lines · real-time matrix-recognition tetris · race-to-zero target game · spatial-prediction click-the-foot · multi-select identification · rapid-fire judgement quiz · constraint-satisfaction predict-the-shrink · build-the-product algorithmic game · commutativity bingo grid · min-swap puzzle · predict-one-entry · cosine-vs-Euclidean nearest-neighbour comparison · build-the-sum tile drop · open-ended target-hunt · navigate-under-custom-basis · tournament survival bracket · eigenvector discovery · lattice reconstruction · two-step relay solver · timed elimination speedrun · 5-second rapid classification · build-A⁻¹-from-cards · root-hunt singularity.

**Workflow note (durable):** the wide-scope build pattern used here — 7 Opus background agents in worktree isolation, one per lesson, each with a self-contained brief — is captured as an auto-memory entry (`project_parallel_agent_dispatch_for_wide_scope.md`). Reach for it again when a future wave (eigenvalue track, decompositions track, applied-LA track) lands.

**Wave 2 candidates:** the 4 catalogue widgets not shipped (ShapeTransformPainter-as-free-form, a "wheel" version of CosineWheelHunt, plus any new mechanics that surface from subsequent feedback). Plus the cross-lesson stretch ideas (VectorSpaceArcade hub, LinearAlgebraBuilder sandbox, AdaptiveDifficultyQuiz).

**What ISN'T in this catalogue (and why):**
- Anything that requires backend AI grading (would slow down the page; we have local LLM for explanations, not for grading).
- Anything 3D (entire codebase is 2D; introducing 3D would need a new rendering layer).
- Anything requiring touch-specific gestures (Tauri desktop-first).

---

## Schema for new widget creation

Every new widget gets:
- A two-draft commit message section per `notes/widget-creativity-discipline.md`.
- A `widget_mount` / `widget_unmount` lifecycle via `useWidgetTelemetry`.
- A `widget_interact` event per user action.
- A `WidgetExplainer` with a state-summary callback (per `notes/explanations-must-adapt-to-state.md`).
- A "win state" or "score state" surfaced to `onStateChange` so a `GoalChain` can wrap it.
- Theme tokens only — no hardcoded hex.
- Relative viewport via `computeDomain` / `makeToPx`.
