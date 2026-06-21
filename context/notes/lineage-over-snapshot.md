---
name: Lineage over snapshot — teach why a concept came to be, not just what it is now
description: Tessarix's authoring discipline. A concept is the surviving answer to a question; a lesson that renders only the polished final form has erased the question, the rejected alternatives, and the reason the survivor won. Teach the genealogy (why it came to be, what lost and why), the boundary (where it breaks), and the leverage (what it now buys) — not just the current snapshot.
type: feedback
---

# Lineage over snapshot

## The rule

A concept is not a fact; it is the **surviving answer to a question someone once couldn't answer**. The polished definition the reader sees is the last frame of a film — the winner of an argument, with the argument deleted. A lesson that presents only that final frame teaches *what the thing is* and silently withholds *why it is that way*, which is the part the reader actually needs in order to understand rather than memorise.

So: when explaining anything, do not stop at the current state. Show its **lineage** — the problem it was invented to solve, the naive first attempt, where that attempt broke, the alternatives that were tried, and why each one died. The genealogy *is* the understanding; the snapshot is just where the genealogy happened to stop.

The acid test: read the section and ask *"could the reader regenerate this concept from the motivation, or could they only recognise it once shown?"* If the lesson would let a reader reinvent the idea by walking the same path that produced it, the lineage is present. If the reader can only nod at the finished form, the lesson is a snapshot and is incomplete.

## The four faces of a concept

Lineage is one face of a more general stance: teach a concept as a living object with a past, a present, a boundary, and a leverage. Most material renders only the present and wonders why it doesn't stick.

| Face | The question it answers | Owned by |
|---|---|---|
| **Past** (genealogy) | Why does this exist? What did it replace, and why did the alternatives lose? | **This note** — the headline. |
| **Boundary** (failure modes) | When is this *false*? What are the hypotheses, the edge cases, the counterexamples? | **This note** — rides with genealogy. |
| **Leverage** (the payoff) | What does having this make *easy* that was hard before? What does it unify? | **This note** — the dual of genealogy. |
| **Present** (many representations) | What *is* it, seen from every angle at once — algebra, geometry, code? | [`visualisation-over-prose.md`](visualisation-over-prose.md) + dual-state widgets. |

Boundary and leverage belong here because they fail for the same reason genealogy does: the author's own fluency hides the learner's real questions. The author knows where the concept breaks and what it buys so deeply they forget to say it. The present-state face is already covered by the visualisation discipline, so this note cross-links it rather than re-stating it.

## Why

**The genesis of this note is a real moment.** Reading the Nyquestro limit-order book, the reaction was: *"I understand what the last version is supposed to look like, but I don't understand why any of these things came to be."* A limit order book is a pile of design decisions — `BTreeMap` price ladders, FIFO queues inside each level, a matching loop that refuses to call `Ts::now()` — and the final code is every one of those decisions with its *why* erased. `checked_sub` over `saturating_sub` is invisible as a choice until you know it encodes a bug class someone designed against. The struct is legible; the reasoning is not. That gap is exactly what a snapshot-only lesson reproduces.

**The why is what transfers; the what is what fades.** A reader who memorises the determinant as "the area-scaling factor" holds an inert fact. A reader who learns that people needed to know *when a linear system has a unique solution*, that this question produces a single number which is zero exactly when the columns collapse, and that area-scaling is a *consequence* discovered later — that reader can reconstruct the determinant from its purpose. Purpose survives; definitions decay.

**Dead alternatives carry more signal than the survivor.** Knowing why the rejected option lost teaches the constraint that actually shaped the design. "We could store the book as a flat sorted array, but every insert is O(n); a `BTreeMap` keeps inserts and best-price reads both logarithmic" teaches more about order-book design than any description of the `BTreeMap` alone. The corpse names the constraint; the survivor only satisfies it.

**It is the part textbooks and the snapshot both omit.** Every reference platform can state the final form. Tessarix's edge is showing the reader *how the field got there* and *where it still breaks* — the dimension a static reference flattens. A lesson that only states the final form is competing with the textbook on the textbook's terms.

## Where this trap fires

It fires hardest exactly where the author is most fluent, because fluency is what hides the question:

- **"Here is the definition" openings.** Leading with the formal statement (`Av = λv`) instead of the hunt that motivates it. Motivation-first is the fix; see [`lesson-voice.md`](lesson-voice.md).
- **Clean final algorithms.** Gaussian elimination presented as a finished procedure, with no trace of *why* the pivot-swap step exists (because a zero pivot breaks the naive version) or *why* back-substitution is shaped the way it is.
- **Abstractions presented as obvious.** Change-of-basis shown as a matrix multiply, with no account of the index-chasing slog it replaced — so the reader never feels the leverage the abstraction bought.
- **Concepts with hidden hypotheses.** Any "this always works" that is actually "this works *when* the matrix is invertible / the pivot is non-zero / the system is consistent." The boundary is where the understanding lives; a snapshot omits it for prettiness.

## When the snapshot alone is fine

Lineage is not a tax on every sentence. Skip it when the concept genuinely has no instructive history:

- **Pure notation and naming conventions.** "We write the transpose as Aᵀ" has no genealogy worth telling.
- **Arbitrary-but-fixed choices.** Conventions that could have gone either way and carry no lesson in having gone one way (row-major vs column-major, when nothing downstream depends on it).
- **Genuinely atomic primitives** with no predecessor — rare, but they exist.

The discrimination: *does knowing how this came to be change how the reader uses it?* If yes, owe them the lineage. If the history is an arbitrary coin-flip with no downstream consequence, the snapshot is honest.

## Companion disciplines

- [`visualisation-over-prose.md`](visualisation-over-prose.md) — owns the **present** face. Lineage answers *why it came to be*; visualisation answers *what it is, made manipulable*. A genealogy is often best walked as a widget, not read as prose, which is where the two disciplines meet.
- [`lesson-voice.md`](lesson-voice.md) — motivation-first and concrete-before-abstract are the supporting clauses of this note. Show the gap before filling it; climb the abstraction ladder from a worked case, never parachute onto the general definition.
- [`widget-creativity-discipline.md`](widget-creativity-discipline.md) — if a lineage earns its own widget archetype (see the open question below), the two-draft rule and metaphor library govern its shape.

## What this means in practice

Every lesson's authoring checklist gains one pass, alongside the visualisation audit:

> **Lineage audit.** For every load-bearing concept in the lesson, ask: *have I shown why this came to be, what the alternatives were, why they lost, where it breaks, and what it now buys?* If the section presents only the finished form, it is a snapshot and is not done. Document, per concept, which faces (past / boundary / leverage) the lesson covers and which it deliberately skips, so the next author can see the gaps rather than inherit them silently.

A lesson that passes the visualisation audit but fails the lineage audit is a beautiful rendering of a fact whose origin the reader still cannot reconstruct. Both audits must pass.

## An open design question — does lineage want its own widget archetype?

Genealogy can be honoured in **prose** (a short "how we got here" narrative woven through the section) or as a **widget archetype** — for example a *decision-tree explorer* where the reader walks each historical alternative, applies it, and watches it fail against the constraint that killed it, before arriving at the survivor. The widget version makes the dead alternatives *experienced* rather than asserted, which is the whole thesis of the project applied to history itself. It also costs real authoring effort per lesson.

This is unresolved and deliberately deferred. The cost/benefit likely depends on the interface redesign currently under discussion; revisit once that lands. If a genealogy archetype is built, it becomes a numbered entry in the [`widget-creativity-discipline.md`](widget-creativity-discipline.md) metaphor library.

## When to revisit

Re-read this note when:

- Authoring a new lesson — run the lineage audit before considering the draft complete.
- A lesson explains a concept that has a real history of competing approaches (most of mathematics, all of systems design) — that is where the payoff is largest.
- Reviewing someone else's lesson — apply the acid test: could the reader *regenerate* the concept from what the lesson gave them, or only recognise it?
- The interface redesign resolves whether genealogy gets a dedicated widget archetype.
