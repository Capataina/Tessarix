---
name: Lesson voice — canonical authoring voice for Tessarix lessons
description: The aggregated voice every lesson is written in. Derived from a 20-sample voice audit (10 spoken-style + 10 written-style + 3 blends, with explicit per-sample feedback). Captures the moves to keep, the registers to modulate between, the acid tests, and the anti-patterns. Every lesson author — human or agent — reads this before drafting prose, and recalibrates against it whenever a lesson sounds "robotic," "sales-y," or "obfuscated."
type: feedback
---

# Lesson voice

## The voice in one sentence

A warm, commanding lecturer who finds the strange and the beautiful in technical material, spells out what should be obvious until it sounds striking, and names the trap clearly when accuracy demands it.

## How the voice was chosen

Twenty voice samples were drafted on the same paragraph (the A-FINE "image-quality assessment problem" section). Ten spoken-lecturer voices: Feynman, Strang, Strogatz, Knuth, 3Blue1Brown, du Sautoy, Halmos, MacKay, Tim Urban, Yudkowsky. Seven book-prose voices: Spivak, Tao, Jaynes, Wasserman, Sutton & Barto, Bishop, Russell. Three blends across the most-liked spoken voices.

The samples kept (moves preserved into the canonical voice):

- **Feynman**'s visualizable openings — "Suppose you want to build a machine that looks at a picture…" Reader can picture it. Used at section openings.
- **Strang**'s "spell-it-out-cool" cadence — "Your brain has been calibrated for this since you were old enough to look at pictures." Takes something the reader already does effortlessly and states it, so the obvious sounds striking.
- **Strogatz**'s discovery moments — "There's something quietly remarkable about the way we judge images." Used sparingly — at most once or twice per lesson. Overuse becomes precious.
- **Yudkowsky / LessWrong**'s trap-namer — "These are not the same question. They are different problems wearing similar-looking clothes." Used at moments where accuracy genuinely matters.
- **Spivak**'s commanding-warm prose — "It is not difficult to invent some procedure or other; the difficulty is that…" Formal mathematical "we" alongside friendly direct address. The voice's *backbone*.
- **Tao**'s precise passion — "To begin with, observe that…" Carries care for the topic without robotic stiffness. Used when introducing precise distinctions.
- **MacKay**'s sharp asides — short parenthetical clarifications that read like the lecturer leaning in mid-sentence.

The samples explicitly rejected (with reasons):

- **Knuth**: too technical / robotic
- **3Blue1Brown**: works on video with transitions and pauses; the same prose feels off-key in print
- **du Sautoy**: fluff (civilisational framing for routine technical material)
- **Halmos**: too short / telegraphic
- **Tim Urban**: sounds sales-y
- **Jaynes**: obfuscated ("in a quite precise sense, wrong")
- **Wasserman**: too direct, lacks storytelling
- **Sutton & Barto**: not enough storytelling
- **Bishop**: too formal
- **Russell**: hard to parse for non-native English readers

## Voice modulation — when to shift register

The voice is not monotone. Content calls for different shifts. The author's *personality* stays constant; the *register* moves to fit what's being said. Shifts happen inside paragraphs, often inside sentences.

| Content moment | Register | Cue words / cadence |
|---|---|---|
| Opening a section / introducing a topic | **Storytelling**, visualizable, lightly lyrical | "Suppose…", "Imagine…", "Picture a…" |
| Stating a definition | **Commanding-warm** (Spivak/Strang) | "An X is…", "We call this Y." |
| Spelling out what should be obvious | **Spell-it-out mentor** (Strang) | "Your brain has been doing this since…", "You'd notice immediately if…" |
| Naming a critical distinction | **Sharp trap-namer** (Yudkowsky) | "These are not the same question.", "Don't conflate X with Y." |
| Mid-section technical detail | **Clean and direct**, warmth still present | Plain assertion, with care for the reader |
| Brief caveat / corner case | **Parenthetical aside** (MacKay) | "(A-FINE, by the way, has both — …)" |
| Genuine discovery moment | **Lyrical pause** (Strogatz) — used sparingly | "There's something quietly remarkable about…" |
| Section closure / cementing | **Confident summary** | "That's the corner this lesson lives in." |
| Bridging two ideas | **Connective**, conversational | "Here's where it gets interesting.", "Hold onto that — we'll need it." |

The acid test for register modulation: read three consecutive paragraphs aloud. If they all feel the same temperature, the voice is not modulating. If they feel jarringly different, the personality has drifted between paragraphs. Aim for *flow*: each paragraph picks the register the content needs, but the underlying voice is recognisable as one author.

## What this voice is NOT

- **Not sales-y or hype-y.** No "Ready?" "Watch this!" "Isn't that crazy?!" If a sentence reads like a YouTube intro, cut it. (Tim Urban's voice — rejected for this reason.)
- **Not fluffy or padding.** No civilisational framing for routine technical material ("In every age, civilisations have wanted to measure…"). The lesson is not a TED talk. (du Sautoy — rejected for this reason.)
- **Not telegraphic textbook minimalism.** Halmos's voice — "We need a number for the quality of an image." — was rejected for being too short. The reader is here to learn deeply, not skim.
- **Not stiff formality.** "We shall now consider…" without warmth is robotic. Bishop and Russell were both rejected for this. Formal cadence is fine; cold formality is not.
- **Not opinionated obfuscation.** Jaynes's "in a quite precise sense, wrong" is the kind of writerly flourish that adds nothing. Be sharp where it helps; never sharp as a style.
- **Not video-paced.** "Now watch this." "Ready for the surprising part?" These work on YouTube with cuts and animations. In print they fall flat because the reader controls the pace. 3Blue1Brown — rejected for this reason in *written* form (his videos are the gold standard; his prose-only transcripts are not).
- **Not English-vocabulary-flexing.** A non-native English reader should never have to reach for a dictionary because the author wanted to sound erudite. "Comprise" is fine; "subsume" is showing off. Russell — rejected primarily for accessibility.

## The voice's moves, with examples

### 1. The visualizable opening (Feynman)

Start a section with a concrete scenario the reader can physically picture. The scenario should be specific enough to imagine, simple enough to grasp instantly, and pointed at the section's actual subject.

> Suppose you want to build a machine that looks at a picture and tells you how good it is. Not what's in it — how *good* it looks. Sounds easy enough. We do this with our eyes constantly: "this one is sharp," "this one is blurry," "this one has weird compression marks."

The follow-up sentence usually pivots from "this seems simple" to "here's what makes it hard." That pivot is the section's entry point.

### 2. The spell-it-out-cool moment (Strang)

Take something the reader already does effortlessly. State it. The statement, by being explicit, makes the unstated thing remarkable.

> Your brain has been calibrated for this since you were old enough to look at pictures.

Use this when you want to defamiliarise something familiar so the reader sees it freshly. One or two per section is the right dose.

### 3. The trap-namer (Yudkowsky)

When a distinction genuinely matters — getting it wrong would produce a real error — name the trap explicitly. Don't just say "these are different"; say *how* they look the same and *why* the conflation is wrong.

> These are not the same question. They are different problems wearing similar-looking clothes.

> People conflate per-image and distributional metrics constantly; they measure different things, and using one when you mean the other will quietly give you the wrong answer.

Used too often, this becomes preachy. Reserve for the two or three places per lesson where the reader genuinely could make the mistake.

### 4. Commanding-warm prose (Spivak)

The backbone register. Mathematical "we" and "one" alongside direct second-person "you." Confident voice; friendly stance. Treats the reader as an equal who is *learning*, not a beginner who must be coddled.

> It is not difficult to invent some procedure or other for doing this; the difficulty is that "quality," as a quantity, is doing several different jobs at once.

> We require a function whose input is an image, and whose output is a real number that agrees with what a human would say.

Use this as the default register when no other shift is called for.

### 5. Passionate precision (Tao)

When introducing a careful distinction or a definition that matters, carry the care visibly.

> To begin with, observe that the word "quality" is itself somewhat ambiguous. One might mean fidelity. One might mean naturalness. One might mean structural integrity. A single number cannot capture all three simultaneously without compromise.

The "observe" / "consider" / "notice" cadence flags moments worth pausing on.

### 6. Sharp asides (MacKay)

Mid-sentence parentheticals that sound like the lecturer leaning in to clarify.

> A-FINE has both: a no-reference head it can run alone, and a full-reference head that consumes a reference. (And yes, the same body can serve both heads — they share the CLIP backbone.)

Use these for caveats, corner cases, or sotto-voce qualifications.

### 7. Lyrical discovery (Strogatz) — used sparingly

At most once or twice per lesson. A genuine moment of "isn't this quietly strange?" — earned, not forced.

> There's something quietly remarkable about the way we judge images. Look at any two photographs, and within a fraction of a second your brain has produced a verdict.

If two paragraphs in a row use this register, the voice has tipped into preciousness. Cut one.

## The acid tests

Before declaring a lesson's prose done, ask:

1. **Can the reader picture something concrete?** Every section should have at least one passage where the reader's mind builds a visual or a scenario.
2. **Is there at least one observation that sounds obvious-but-striking?** A spell-it-out-cool moment per section. If a section is purely "here are the facts," it's missing this.
3. **Where precision matters, is the trap named?** Not every paragraph. Only the two or three places per lesson where the reader could genuinely make the mistake.
4. **Does the voice feel commanding-but-friendly, or does it feel stern, sales-y, or precious?** Only the first is acceptable.
5. **Read three consecutive paragraphs aloud — does the register modulate or is it monotone?** Modulation is required.
6. **Does any sentence sound like it's reaching for vocabulary?** If yes, cut or simplify.
7. **Does the lesson sound like a single author wrote it?** Not "a Feynman paragraph then a Strogatz paragraph" — one personality whose register adapts.

## Anti-patterns — failure modes to recognise in yourself

When auditing a draft, watch for:

- **The encyclopedic mode**: every sentence is a fact statement, no warmth, no anchoring scenarios. Robotic register. Recalibrate by adding a visualisation at the section opening.
- **The hype mode**: "you'll be amazed," "watch this," "incredible." Cut every adjective doing emotional work.
- **The civilisational opener**: any sentence beginning "In every age, humans have…" or "Since the dawn of…" Burn it.
- **The over-distinguished mode**: every paragraph names a trap. Becomes preachy. Trap-naming is a spice, not a base.
- **The over-lyrical mode**: every section opens with quiet wonder. Becomes precious. Save discovery moments for once or twice per lesson.
- **The over-direct mode**: "Sounds straightforward. It isn't." as a default sentence pattern. One use is sharp; three uses is a tic.

## Worked example — opening of the A-FINE lesson

### Before (encyclopedic, robotic register)

> A-FINE is a **full-reference image quality metric**: it takes a distorted image and a reference image, runs both through a CLIP vision transformer, and produces a single number in `(0, 100)` that correlates with how a human would rate the distorted image's quality. The "adaptive" part — and the reason it was worth adding to `burn` next to LPIPS, DISTS, and FID — is that A-FINE doesn't assume the reference is itself a high-quality natural image.

Three problems with this version. First, it's all definition and no scenario — there's nothing for the reader to picture. Second, the prose is fact-statement after fact-statement; no register shifts, no breathing room. Third, the "adaptive" framing is buried in a subordinate clause; the lesson's central point is delivered as a side remark.

### After (visualisable opener + commanding-warm middle)

> Imagine you've trained a model to upscale low-resolution photographs. Sometimes the model produces something gorgeous — sharper than the input, free of compression artefacts, plausible as a real high-resolution photo. Sometimes it produces something subtly wrong — sharp in the wrong places, hallucinating textures that aren't actually there. You need a number that tells you which is which, automatically, across millions of outputs. That number is the job of an **image quality metric**, and **A-FINE** is one of the better ones.

> A-FINE is full-reference: it takes a distorted image and a reference image, runs both through a CLIP vision transformer, and produces a single number in $(0, 100)$ that correlates with how a human would rate the distorted image's quality. The "adaptive" part — and the reason it was worth adding to `burn` next to LPIPS, DISTS, and FID — is the move it makes when the reference itself isn't trustworthy. Most metrics assume the reference is a clean high-quality original. A-FINE doesn't. When the reference is unnatural — a synthetic render, a low-quality stock photo, a degraded older copy — A-FINE quietly drops its weight on faithful reconstruction and lets the distorted image's own naturalness carry more of the score. The metric is asymmetric on purpose, and that asymmetry is where most of its design intelligence lives.

Three moves did the work:

1. **Visualisable opener** — Feynman pattern §1. The reader pictures a concrete model and concrete failure modes before any technical term arrives.
2. **Register modulation in the second paragraph** — Spivak commanding-warm backbone, with a Strang spell-it-out moment ("Most metrics assume the reference is a clean high-quality original. A-FINE doesn't.") that takes a fact and gives it weight.
3. **The "adaptive" framing promoted** — "the metric is asymmetric on purpose, and that asymmetry is where most of its design intelligence lives" closes the section as the lesson's thesis instead of being buried in a subordinate clause.

The factual content is identical between the two versions. The voice modulation is what makes the second a lesson and the first an encyclopaedia entry.

## When to revisit this note

- Before authoring any new lesson's prose.
- After a user reports a lesson "sounds robotic" or "sounds sales-y" — that's a signal the voice has drifted; recalibrate.
- When adding a new author to the voice library — append a "Moves to incorporate / reject" section with concrete examples.
- When the acid tests start to feel mechanical — that means the voice has been internalised and the tests can lighten up, OR the tests have become a checklist that doesn't catch real drift. Either way, sit with the lesson and read it aloud.

## Related discipline

- [`visualisation-over-prose.md`](visualisation-over-prose.md) — when to use a widget instead of prose.
- [`explanations-must-adapt-to-state.md`](explanations-must-adapt-to-state.md) — when prose is the right tool but it needs to be LLM-generated and state-aware.
- [`widget-creativity-discipline.md`](widget-creativity-discipline.md) — the two-draft rule for widgets, plus the metaphor library. The companion discipline for visual design; this note is the companion discipline for written voice.

Together these four notes are the authoring quartet: *should this be a widget?* (visualisation), *what shape of widget?* (creativity), *what shape of explanation around the widget?* (adapts-to-state), *what voice when prose is the right tool?* (this note).
