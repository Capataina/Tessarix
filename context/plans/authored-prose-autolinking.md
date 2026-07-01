# Plan — Auto-linking authored lesson prose

**Status:** FIRST CUT BUILT (2026-07-01) · engine + scope tiers + real lemmatiser + reader dial + MDX wiring + unit tests.
**Owner concept:** the M3 "remaining" item — the deterministic linker runs on *generated* content (mini-lessons) today; this extends it to *authored MDX prose*.
**Related:** [`curriculum-graph.md`](curriculum-graph.md) · [`../notes/content-architecture.md`](../notes/content-architecture.md) (generation ≠ linking) · [`../notes/interface-affordances.md`](../notes/interface-affordances.md) (reader controls depth).

---

## 1. The problem

Every concept a lesson mentions ("matrix", "dot product", "basis") should link to the lesson that teaches it, Wikipedia-style — automatically, with **no per-link human review** (we don't have the luxury; the corpus will be 30+ lessons). That constraint is the whole design driver:

> **No review ⇒ precision over recall. When the linker is unsure, it does not link.**

A missed link is a non-event — the concept is still reachable through the graph nav and (later) the glossary. A *wrong* link ships silently and erodes trust, so the only errors the system is allowed to make are errors of omission. A corollary the strategy discussion turned on: under precision-first, **a partial linker is a *correct* linker with lower recall**, so this feature can ship incrementally without the "half-done poisons downstream" failure that afflicts most infrastructure.

---

## 2. The model — targets carrying a scope

A lesson declares a set of **link targets**. Each target has a **scope** that governs *where* it may be linked:

| Scope | Meaning | Linked where | Examples |
|---|---|---|---|
| **`strong`** | the concept is relevant across every domain | **globally** — a finance lesson mentioning "matrix multiplication" reaches the maths lesson | matrix, vector, dot product, matrix multiplication, transpose, determinant, linear transformation |
| **`contextual`** | the concept is meaningful only inside its own domain, or its bare word is polysemous | **in-domain only** (same category) | basis, span, change of basis, RREF, PSNR, SSIM, A-FINE, fidelity ratio |

This is a **scope** axis, not an ambiguity axis — it's the easier question for an author to answer ("relevant everywhere, or only here?"), and it reuses the category graph. It also happens to solve the polysemy cases for free: "basis" (`contextual`, Mathematics) can never leak into a Finance lesson where it would mean *basis points*; "span" (`contextual`) never links from prose about a bridge that spans a river outside a maths room.

There is **no `never` tier** — a term that shouldn't be linked is simply *not declared as a target*. Absence is the "never".

### Authoring surface

Scope lives in `src/lib/graph/meta.ts`, additive to the existing `teaches` array:

```ts
"linear-algebra-matrices": {
  category: "Mathematics", topic: "Linear Algebra",
  teaches: ["matrix", "linear transformation", "determinant", "basis vectors"],
  strong: ["matrix", "linear transformation", "determinant"],  // ← the cross-domain subset
  aliases: { matrix: ["matrices"] },
},
```

`strong` names the cross-domain subset of `teaches`; everything else in `teaches` is `contextual` by default (the safe default). One small, one-time decision per concept, made when the lesson is authored — this is *authoring*, not *review*.

---

## 3. The matching pipeline (lemma, not fuzzy)

The author's goal was "close enough is good enough — don't make me enumerate every surface form." The right mechanism for that is **morphological normalisation (lemmatisation)**, NOT character-level fuzzy matching. Fuzzy is recall-maximising by definition and directly fights precision-first: the edit-distance threshold that catches "matrices multiplications" also links "basically" → basis and "spans the river" → span. Lemmatisation folds inflections precisely without opening that door.

```
prose text ─▶ tokenise (unicode words, keep char offsets)
           ─▶ normalise each token: lowercase, strip edge punctuation, NOUN-lemmatise
                 matrices → matrix   multiplications → multiplication   vectors → vector
           ─▶ slide a window (≤ max target length) and match lemma-sequences
                 against the target index (built once from meta)
           ─▶ gate each match by scope · self-exclude · density-cap
           ─▶ emit segments: [text | link | text | …]
```

- **Lemmatiser:** `wink-lemmatizer` (dictionary-backed, deterministic, pure-JS so it bundles for the Tauri webview). Noun lemmatisation is applied to *both* the target forms and the prose tokens, so consistency — not linguistic perfection — is what makes them match.
- **Longest-match, left-to-right, non-overlapping.** "matrix multiplication" wins over "matrix".
- **Aliases** (existing field) still carry extra surface forms; each alias is lemmatised into the index.

### The irregular-plural precision guard (the archetypal example)

`noun("bases") → "base"`, but `noun("basis") → "basis"` — the irregular plural doesn't fold back to its singular, and worse, its lemma "base" collides with the common word "base" ("base case", "number base"). Keeping `bases` as a basis alias would let "base" mislink. **Precision-first resolution: drop the `bases` alias.** Prose "bases" then simply won't link (a safe omission) rather than risking "base" → basis (an unsafe false link). This is the template for the future per-target **deny valve**: when a `contextual` term proves noisy in calibration, add a deny form rather than loosening the match.

---

## 4. Scope gate semantics — driven by the reader dial

The linker takes a `mode` from a reader-facing setting (§5). The gate:

| Mode | `strong` targets | `contextual` targets |
|---|---|---|
| **`none`** | not linked | not linked |
| **`normal`** (default) | linked globally | linked **only** when `target.category === active lesson's category` |
| **`all`** ("Exploratory") | linked globally | linked globally (cross-domain guesses allowed) |

Plus, always: **self-exclude** (never link a concept owned by the lesson being read) and **density cap** (one link per target per text block — see §7 for the per-paragraph vs per-lesson note).

`all`/Exploratory is deliberately the noisy mode — it switches on exactly the cross-domain false-positives that `contextual` scoping exists to suppress. That's legitimate *because the reader opts into it knowingly*; it is not the default, and it's labelled so its cost is legible (not "All = more complete").

---

## 5. The reader dial

A three-way setting, `autolinkMode: "all" | "normal" | "none"`, default `normal`, persisted with the other UI prefs (`tessarix:settings:v1`). Surfaced in the Settings panel as a segmented control matching the existing font-size / width / density controls:

| Value | Label | Description |
|---|---|---|
| `all` | **Exploratory** | "Also shows speculative cross-domain links. Denser, occasionally a stretch." |
| `normal` | **Normal** | "Links core concepts; domain-specific terms link only inside their subject." |
| `none` | **Off** | "No automatic concept links." |

Read by the linkify layer via `useSettings()`, so flipping it re-renders every open lesson's links live.

---

## 6. Wiring into MDX

Lessons render inside `<MDXProvider components={mdxComponents}>` (App.tsx). Today `mdxComponents` only maps `LessonMeta`, so `p`/`li` use default rendering. We add `p` and `li` overrides that linkify **only their raw string children**:

- string child → run through `linkToSegments` → `text` and `<a class="concept-link">` nodes.
- **element** child (`<code>`, `<strong>`, `<a>`, KaTeX `<span class="katex">`) → **passed through untouched**.

This is the clean part: because inline code, math, and existing links are already *elements* by the time the override sees them (not strings), skipping non-string children **automatically** honours "never link inside code / math / links" with no special-casing. Headings (`h1`–`h6`) are left un-overridden — they are link *targets*, not link *sources*.

`<LinkProvider slug={route.slug}>` wraps the lesson content and supplies the current slug (for self-exclude) and its category (from `LESSON_META`, for contextual scoping).

---

## 7. What is BUILT now vs DEFERRED

**Built (first cut):**
- `strong`/`contextual` scope on all 8 lessons' concepts.
- Lemma normaliser (`normalize.ts`) + target index (`targets.ts`) + pure matcher (`match.ts`).
- Scope gate (all/normal/none), self-exclude, density cap, longest-match.
- Reader dial (settings field + panel control + persistence).
- MDX `p`/`li` linkify overrides + `LinkProvider`.
- Unit tests (`normalize.test.ts`, `match.test.ts`) as the golden corpus.

**Deferred (documented, not silent):**
- **Header harvesting** — auto-deriving targets (and *section anchors*) from each lesson's `##` headers so links land on the exact subsection (`rehype-slug` already emits header ids). The engine carries an optional `anchor` field ready for this; first cut seeds targets from authored `teaches`.
- **Per-lesson density cap** — the cap is currently **per-paragraph** (first occurrence of each target *per text block*), which is deterministic and React-pure. Per-lesson (one link per target across the whole lesson) would need cross-component mutable dedup during render, which **StrictMode's double-invoke and partial re-renders (settings/tier changes) make unsafe** — so the correct home is the build-time rehype pass (a per-document `Set`, no runtime state). Deferred there. Measured density on the prose-heavy `matrix-operations` lesson: ~91 links across 6 concepts (≈15× "matrix"). Mitigated for now by a lesson-scoped calm style (`.lesson .concept-link`: prose-coloured, faint underline, accent on hover) so repetition reads quietly rather than repainting the prose; the reader dial (Off) is the hard escape.
- **Deny valve** — per-target deny forms/collocations, added reactively when a `contextual` term proves noisy in the calibration run (the `bases`/`base` class is the first candidate).
- **Aho-Corasick index** — the current matcher iterates the (small) target set per token, O(tokens × targets). Swap to an Aho-Corasick automaton over lemmas (O(text)) when the corpus makes it worth it; precise *and* faster, no recall trade.
- **Unifying with `injectLinks`** — the HTML-string linker for LLM prose (`linker.ts`) still runs the old regex path; the new lemma engine and it should converge on one matching core later. Left independent this cut to avoid destabilising the shipped mini-lesson.

---

## 8. Precision posture & calibration

The safety mechanism that replaces human review is the **golden test corpus** (`match.test.ts`): every bad link ever spotted becomes a pinned regression case, and no change may regress a prior one — review-effort converted to test-effort, amortised per failure-mode instead of per occurrence. Calibration = run over the 8 existing lessons, read the aggregate, tune `strong`/`contextual` assignments and (later) deny forms. That is calibration, not review: you look once to set policy, then it runs unattended.

---

## 9. Blast radius

- `meta.ts` gains an optional `strong?: string[]` — additive; `CONCEPT_INDEX`, `buildGraph`, and the existing `injectLinks` are unaffected (they ignore it).
- `mdxComponents` gains `p`/`li` — affects every lesson's prose rendering (intended). Non-lesson MDX is not wrapped by this provider.
- `SettingsContext`/`SettingsPanel` gain one field + one control, following the documented add-a-setting steps.
- New dependency: `wink-lemmatizer` (pure JS, ~small, MIT).
