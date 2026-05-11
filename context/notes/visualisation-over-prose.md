---
name: Visualisation over prose — when explanation needs a widget, not paragraphs
description: Tessarix's authoring discipline. If a concept is best understood by watching something change in response to a parameter, the lesson owes the reader a widget. Prose explanations of phenomena that disagree, diverge, or depend continuously on inputs are a failure mode the author is responsible for catching.
type: feedback
---

# Visualisation over prose

## The rule

If a concept's whole point is *that two things disagree*, *that an output depends continuously on an input*, *that a small parameter change produces a qualitative shift*, or *that the reader's eyes will tell them one thing while the maths tells them another* — **the lesson must include a widget that makes that visible**. Prose alone is not acceptable.

A static formula plus a paragraph of "PSNR is fast, mathematically clean, and correlates poorly with human perception" is a failure of authoring discipline. The reader has not *seen* the failure mode the prose is describing — they have only been told it exists.

The acid test: read the section aloud. If the sentences are *naming phenomena the reader should be able to feel* but no widget is anchoring those phenomena, the section is incomplete regardless of how good the prose reads.

## Why

**The product's whole differentiator is interactivity.** A lesson that explains image-quality metrics with formulas and paragraphs is doing exactly the job a textbook or a blog post already does, and the textbook will be more rigorous and the blog post will be shorter. The reason a reader is on Tessarix at all is that Tessarix promises to *show* what other formats can only describe. Every paragraph that falls back on prose where a widget was possible is a paragraph that broke that promise.

**Visualisation transfers calibration, not just facts.** The reader who *moves a translation slider 2 pixels and watches PSNR collapse* doesn't just *know* PSNR mishandles translation — they feel how much, how fast, and at what threshold. Prose can give the fact; only direct manipulation gives the calibration. The next time that reader thinks about PSNR they will recall the slider, not the sentence.

**Pre-experienced phenomena make assessment questions land harder.** A PredictThenVerify question asking "which metric drops more under a 2-pixel shift?" is shallow if the reader has not first played with the underlying widget. It becomes a genuinely interesting prediction once they have seen these metrics behave on every other distortion. The widget makes the question possible; without the widget, the question is closer to a trivia test.

**The product's competitors have already set this bar.** Brilliant, 3Blue1Brown, Distill.pub, Cartesian — every reference platform we pull inspiration from will visualise a concept whenever visualisation is feasible. A lesson that reverts to prose for a visualisable concept is below the field, not at it.

## When this trap fires

It fires when authoring under time pressure and reaching for the format that's fastest to write. Prose is fast. Diagrams are slower. Widgets are slowest. The first draft tends to default to prose; the polish pass is where prose should be promoted to widgets. **If a polish pass shipped without that promotion happening, the polish pass was incomplete.**

It fires especially around:

- **Comparisons between competing metrics or methods** — the whole point of the comparison is that they diverge; show them diverging.
- **Formulas with named parameters whose meaning is geometric** — let the reader move the parameter and watch the geometry change. (FunctionGrapher already supports this; not using it is the trap firing.)
- **"This silently breaks if you do X" failure modes** — show the break visually instead of asserting it. Side-by-side curves, before/after panels, anything that lets the reader see the wrong answer is qualitatively wrong.
- **Architectural pipelines with multiple stages** — show the stages and what each one does to a sample input. (AFinePipeline already does this; the principle is to use it more, not less.)
- **Probabilistic or distributional claims** — show samples from the distribution, not just the mean and the variance.
- **Asymmetries and dependencies** — "X depends on Y in this way" wants a 2D heatmap or a controllable curve, not a sentence.

## When prose alone is fine

Some content genuinely doesn't benefit from a widget:

- **Definitions and terminology.** "The fidelity head asks: given two embeddings, how faithful is f_d to f_r?" — a widget would not make this clearer.
- **Historical / narrative context.** "Around 2018 the field shifted from pixel-domain to feature-domain metrics" — prose is the right shape.
- **Bullet-point checklists of implementation traps.** Some failure modes are textual (HashMap iteration order, weight-loader silent drops). A widget can't dramatise those.
- **Cross-references and citation pointers.** Hyperlinks are the right affordance.

The discrimination: *can the reader's intuition change by manipulating a parameter*? If yes, widget. If no, prose.

## Companion discipline

This note answers "should this concept have a widget at all?" Once the answer is yes, [`widget-creativity-discipline.md`](widget-creativity-discipline.md) answers "what *shape* should that widget take?" — with the two-draft rule that prevents every widget from defaulting to "slider + chart" and the metaphor library of patterns that have proven out. Read both notes together when authoring.

## What this means in practice

Every lesson's authoring checklist gains one mandatory pass:

> **Visualisation audit.** For every concept named in the lesson, ask: *would the reader's understanding improve if they could manipulate this and watch the output change?* If yes, the lesson owes them a widget. If no, prose is correct. Document the answer for each concept in the lesson's authoring notes so the next author cannot quietly skip the audit.

Lessons that ship without passing this audit are not done — they are first drafts.

## Examples of the gap (A-FINE lesson, as of M1)

This note exists because the A-FINE lesson shipped with the principle violated. Identified gaps:

1. **PSNR vs SSIM comparison** (the "classical baselines" section). The whole punchline is that the two metrics disagree on what humans see. Static formulas and a paragraph of prose. A reference-vs-distorted side-by-side widget with sliders for translation, blur, noise, and brightness shift — and live PSNR + SSIM readouts — is what this section was supposed to be.

2. **`c1 = c2 = 1e-10` vs `1e-6`** (the fidelity head section). The lesson claims "substituting 1e-6 silently breaks the metric without raising any error." A widget showing the ratio collapse — two curves side by side, one with the right constants and one with the wrong ones, across a range of feature distributions — would make the silent failure visible. Currently it's an assertion.

3. **The asymmetry property** (the adapter section). "Swapping distorted and reference doesn't give the same score." A toggle that lets the reader swap the two and watch the score change, paired with a 2D heatmap of the final score as a function of (s_nat_r, s_fid), would make asymmetry feel mechanical rather than asserted.

4. **QuickGELU vs erf-based GELU** (the implementation traps). A small two-curve plot showing the ~1% activation difference would dramatise why the parity test fails.

5. **CLIP feature embedding** ("produces a 512-d feature embedding"). A heatmap of a sample embedding, or a scatter of multiple images projected via PCA, would make "512-d embedding" feel concrete rather than abstract.

These are the same lesson, found in one pass. Other lessons will have their own list. The discipline is the same.

## When to revisit

Re-read this note when:

- Authoring a new lesson — run the visualisation audit before considering the draft complete.
- Polishing an existing lesson — the polish pass is precisely where the audit applies.
- Reviewing someone else's lesson — apply the acid test (read it aloud; does prose name phenomena the reader should feel?).
- The widget kit gains a new primitive that opens up visualisations previously too expensive to author.
