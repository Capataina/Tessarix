---
name: Widget explanations must adapt to state, not be hardcoded captions
description: The companion discipline to visualisation-over-prose. Once a widget is interactive, its accompanying explanation must also be state-aware — driven by the LLM, scoped to the widget's current state, with an "ask a question" affordance. Static captions are a regression to the same problem visualisation-over-prose was meant to fix.
type: feedback
---

# Explanations must adapt to state

## The rule

If a widget is interactive — sliders, toggles, dragging, anything — its accompanying explanation must be **LLM-generated and state-aware**, not a hardcoded caption. Hardcoded captions degrade into uselessness the moment the reader's state diverges from the cases the author anticipated. The widget's explanation surface owes the reader two things:

1. **A state-aware running commentary** that updates as the reader interacts. Tells them what just changed, why the values they're seeing make sense, and what insight to take from the current state. The LLM has access to the lesson DOM context plus the widget's current state summary.
2. **An "ask a question" affordance** scoped to the widget's current state. The reader can ask anything about what they're looking at, with the LLM grounded in both the lesson context AND their specific state.

Static captions that say things like *"Multiple distortions stacked. The metrics now respond to a mixture — try isolating one at a time"* are the canonical anti-pattern. They confess the author's failure: the author imagined a few specific cases, wrote a few specific captions, then fell back to a generic "we don't know what you did" message for everything else. The LLM can do the explanation that the author couldn't pre-enumerate.

## Why

**The widget's interactivity is wasted if the explanation doesn't keep up.** Tessarix's whole point is that the reader can manipulate something and immediately understand what happened. That bargain breaks the moment the explanation falls back to *try isolating one at a time*. The reader's manipulation produced a specific state; the explanation should describe that specific state, not vaguely gesture toward "try something else."

**State-aware explanation transfers the same calibration that visualisation does.** Visualisation lets the reader *see* phenomena that prose can only describe. State-aware explanation lets the reader *know what they're seeing* — the missing half. A heatmap with a hardcoded caption is half-finished; a heatmap with an LLM tutor that says "you just moved s_nat_d to 0.3 and s_nat_r to 0.9 — the asymmetry shot up to 0.21 because k is large and fidelity is moderate, exactly where the closed-form predicts the maximum" is finished.

**The "ask a question" affordance closes the loop on the chat safety-net.** The lesson's right-side chatbot is the safety net for tangential questions; the widget-scoped chat is the safety net for *specifically what's on screen right now*. Without the in-widget chat, readers who don't notice the side chatbot — or don't realise it could help with this specific widget — lose the affordance. Putting "Ask a question" next to the widget makes the conversation discoverable where it matters.

**This is a sibling principle to visualisation-over-prose, not a new one.** The principle is the same: *given that LLMs can deliver dynamic, state-aware content, falling back to static content is leaving capability on the floor*. Visualisation-over-prose targets the explanation surface that the author wrote. Explanations-must-adapt-to-state targets the explanation surface that the *widget* writes. Both reject the same failure mode: an author imagining cases ahead of time when the runtime could just answer the actual case.

## How

Every interactive widget — defined as anything with state that changes in response to user input — wraps a `<WidgetExplainer>` component in place of any hardcoded caption it would otherwise have. The explainer takes:

- `widgetName` — short identifier, e.g. "PSNR vs SSIM comparison".
- `widgetDescription` — one-sentence "this is what this widget does" anchor for the LLM.
- `stateSummary()` — a callback returning the current state as plain text (e.g. *"translation = 6px, blur = 0σ, noise = 0σ, brightness = +16; PSNR = 19.7 dB; SSIM = 0.901"*).
- `stateKey` — a stable JSON-serialisable representation of the state, used as the cache key for the LLM call.

The component:

- **Debounces state changes by ~800 ms** to avoid spamming the LLM as the reader drags a slider.
- **Streams the explanation** token-by-token so the reader sees output building immediately, not a 3-second blank pane.
- **Aborts in-flight requests** when state changes again before the previous response completes.
- **Exposes an "Ask a question" button** that opens an inline AnswerThread-style chat, pre-loaded with the lesson context and the widget's current state. Telemetry distinguishes widget-scoped chat from lesson-wide chat.

Static caption text is allowed only when *nothing in the widget changes after first render* — pure read-only diagrams, computed reference charts that don't respond to input. As soon as a slider, toggle, or button enters the design, the explanation must come from the LLM.

## When hardcoded captions are still acceptable

- **Pure-static diagrams**: e.g. AFinePipeline if it never had a clickable hotspot.
- **One-sentence intros above the widget**: a leading sentence in the lesson prose explaining what the widget will demonstrate is *not* the same as a state-aware caption — it's narrative scaffolding. Keep these; they're authoring intent, not state description.
- **Hint text inside controls**: tooltips like "Drag to shift pixels right" are tooltip-level interface text, not explanation. Keep them.
- **Initial-state explanation while the LLM is still loading**: a one-sentence "Move a slider to see…" is fine as a placeholder for the first ~800ms before the first explanation streams in.

## What this rejects

- **Caption fallbacks of the "multiple things changed, try isolating" form**. This is the failure-mode signature. If your widget can produce a state that your hardcoded captions can't describe, the captions should not have been hardcoded.
- **Cases enumerated as if-else trees**. *"If translation > 0 and blur > 0, say X; if noise > 0, say Y"* — when the LLM can read the state directly, that branching logic is wasted effort that drifts as the widget's parameter space grows.
- **Captions that read the same regardless of state**. Generic insight statements that don't reference the reader's actual values defeat the purpose of having a caption at all.
- **Widget-scoped chat that doesn't see the widget state**. The reader asks "why did PSNR drop?" and the bot answers in lesson generalities because it didn't get the state summary. Same content-vs-state problem.

## Lesson authoring checklist addition

When polishing a lesson with any interactive widget, the visualisation audit ([`visualisation-over-prose.md`](visualisation-over-prose.md)) gains one new mandatory check:

> **State-aware explanation audit.** For every widget with non-trivial state, verify that the widget uses `<WidgetExplainer>` rather than a hardcoded caption. Verify that the widget exposes a state-summary callback returning text the LLM can ground its explanation in. Verify that an "Ask a question" affordance is present. Document the audit pass per widget so the next author can't quietly skip it.

This goes into the future [`enrich-lesson`](enrich-lesson-skill.md) skill as an audit dimension alongside visualisation-gap detection and assessment-gap detection.

## When to revisit

Re-read this note when:

- Authoring or polishing any lesson with an interactive widget.
- Building a new widget primitive — the explainer integration is part of the widget's contract, not an afterthought.
- Reviewing another lesson and spotting a static caption on an interactive widget — flag it.
- The local LLM stack changes (different model, hosted fallback for quality-critical paths). The latency and quality budget shifts; revisit the debounce timing and the "fall back to static caption?" decision.
- The widget-scoped chat telemetry shows readers asking the LLM the same questions repeatedly — those repeated questions might mean the auto-generated explanation isn't doing its job. Either tune the prompt or surface the answer more proactively.
