# Interface Affordances

## 1. Current Understanding

Tessarix's lesson-reading interface needs three affordances beyond the body content itself: a **left-side table of contents** for orientation and navigation, a **complexity tier control** so the reader can choose depth, and (later) a **right-side AI chatbot** for in-lesson Q&A. All three exist in service of the same goal: making a long, dense lesson navigable and shape-able by the reader rather than dictated entirely by the author.

The three-pillar pill nav (Teach / Quiz / Interview) in the topbar remains; these affordances sit underneath it and operate within the Teach pillar primarily.

## 2. Left-side Table of Contents

### Design intent

A persistent left sidebar that shows the lesson's structural outline as a hierarchical tree of headings (h2 / h3 / h4), with the current section highlighted as the reader scrolls. Clicking any entry smooth-scrolls to that section.

### Behaviour

- Headings get auto-generated `id`s via a `rehype-slug` plugin at MDX compile time.
- A `<LessonTOC>` component scans the rendered DOM for `h2`/`h3`/`h4`, builds a nested list, and uses `IntersectionObserver` to track which heading is currently in view.
- Click → URL hash updates → smooth scroll. Back-button navigation works because URL hashes are honoured.
- Indentation: h2 flush left, h3 indented one step, h4 indented two steps. Consistent with the existing CSS scale (4px base).
- The active entry has the cyan accent treatment (matching the lesson's `.lesson h2::before` bar). Inactive entries are `--text-secondary` or `--text-muted`.
- Sticky positioning so it stays visible while the reader scrolls the lesson column.

### Layout trade-offs

With a TOC on the left and the eventual AI chatbot on the right, viewport real estate becomes scarce. Breakpoint strategy:

| Viewport width | TOC | Lesson column | AI chatbot |
|---|---|---|---|
| ≥1400px | Visible | ~760px (current) | Visible (when M4+ ships) |
| 1024-1400px | Visible | ~760px | Hidden; opens on demand |
| <1024px | Hidden by default; opens as overlay drawer | Full-width (max 760px) | Hidden |

The lesson column stays capped at ~760px regardless. Readability is more important than filling the viewport — wider lines hurt reading.

### Affordance details

- **Section progress indicator within the TOC.** A small dot or chip next to each entry: filled if the reader has scrolled past it, hollow otherwise. Soft signal of progress without forcing a "you have completed this" interaction.
- **Hide/show toggle.** A small caret in the topbar lets the reader collapse the TOC entirely if they want full lesson focus.
- **Keyboard navigation.** Tab cycles through TOC entries; Enter activates. Critical for accessibility.

## 3. Complexity tier system

### Design intent

The reader chooses how deep the lesson goes. A short visit for orientation; the standard lesson for actually learning; the deep dive for completeness. Same source MDX, three rendering depths.

### Three discrete tiers (not a continuous slider)

- **Essential** — what the topic IS, the pipeline shape, the headline trade-off. ~5 min read for the A-FINE example. The reader leaves with the elevator pitch.
- **Standard** — + the mechanisms in enough depth to understand why each component exists. ~20 min read. The default; what most readers want.
- **Complete** — + edge cases, implementation traps, parity-test concerns, the more advanced widgets and code questions. ~45 min read. The current A-FINE lesson is at this tier.

Three discrete buttons, not a slider. Sliders imply continuous; the underlying content model is discrete sections tagged at one of three levels.

### Mechanism

Inline gating via a wrapper component:

```mdx
<Tier level="essential">
  Brief intro to the concept. Always visible.
</Tier>

<Tier level="standard">
  The full mechanism explanation with widgets. Visible at standard and complete.
</Tier>

<Tier level="complete">
  Implementation traps, edge cases, the deep-dive code question.
  Only visible at complete tier.
</Tier>
```

Each `<Tier>` either renders its children or returns `null` based on the global active tier (held in React context).

### Single source of truth, not three documents

The alternative — `afine.essential.mdx`, `afine.standard.mdx`, `afine.complete.mdx` — was rejected. Reasons:

- 3× authoring cost per lesson.
- Drift between tiers as the lesson evolves (one tier gets a fix, others don't).
- Loses the ability to dynamically include/exclude small inline sub-sections without writing them three times.

Inline gating means a single MDX file is authored once with sections tagged at the right tier. The reader sees a coherent lesson at any tier; the author maintains one file.

### Visual treatment

- Tier indicator chip near the lesson title in the topbar (e.g., `STANDARD` in mono, accent border). The reader always knows their current tier.
- Tier-switcher control sits next to the chip: three buttons `Essential | Standard | Complete`, the active one highlighted.
- Sections that exist at higher tiers than the current one are **not** shown as "click to expand" — they're simply absent. The TOC respects the active tier too; advanced sections don't appear in the TOC when the reader is at the essential or standard tier. This keeps the reading flow clean.
- The current tier persists across sessions once SQLite is available; until then per-page-load.
- The reader can switch tiers mid-lesson; the page re-renders, but scroll position is preserved as close to the previous reading position as possible.

### Trade-offs

- **Author overhead**: each lesson needs sections tagged at one of three levels. This is real authoring work but lighter than writing three versions.
- **Skipping ahead is harder at lower tiers**: a reader on `essential` who suddenly wants to see one specific advanced detail has to switch tiers. Solution (open): per-section "show this section anyway" override that doesn't change global tier.
- **Some sections genuinely belong at multiple tiers**. The `<Tier>` wrapper takes a single level. For sections that should appear at both `standard` and `complete`, use `<Tier level="standard">` (which renders at `standard` AND `complete` — see "tier inclusion semantics" below).

### Tier inclusion semantics (decided)

Each `<Tier level="X">` renders at level X **and all levels above it**. So:

- `<Tier level="essential">` content shows at all three tiers.
- `<Tier level="standard">` content shows at standard and complete.
- `<Tier level="complete">` content shows only at complete.

The mental model: tagging marks the minimum tier at which a section becomes relevant. Higher tiers always include everything from lower tiers.

## 4. Right-side AI chatbot

Defer. The detailed design lives in [`llm-integrations.md`](llm-integrations.md). Brief notes on its impact on this interface:

- Right sidebar, parallel to the left TOC. Sticky, scrollable independently.
- Opens on demand at <1400px viewports (overlay or push-content drawer).
- Has access to the active lesson's MDX content + the current scroll position / active section as context.
- Conversational; the reader types questions, the model answers grounded in the lesson.
- A small "Ask about this section" button next to each section heading deep-links the chatbot into that context.

## 5. Section progress / reading bar

A thin horizontal bar at the very top of the viewport (under the topbar) fills as the reader scrolls the lesson. Tiny touch, big perceived-progress payoff. Linear, Stripe, and most modern docs use it.

Implementation: a CSS-only progress indicator driven by scroll position via a small `useScrollProgress` hook. ~30 lines of code.

## 6. Guiding Principles

- **The lesson column is the constant.** Sidebars come and go based on viewport and user preference; the lesson column stays at ~760px max for readability. Don't let the column stretch to fill space — that hurts the reader.
- **Tier is a depth-control, not a difficulty-control.** Higher tier = more content, not harder content. Easy content can exist at `complete` tier (e.g., a trivial worked example); medium content can exist at `essential` tier (e.g., the headline insight). Don't conflate the two.
- **Affordances are skippable.** TOC, tier control, eventual chatbot — none of them are required for the reader to read the lesson. The lesson works without any sidebar at narrow viewports. The affordances are progressive enhancement, not load-bearing infrastructure.
- **Persisted state is preference, not lock-in.** When SQLite lands and the reader's tier preference, TOC collapse state, etc. persist across sessions, they're suggestions to restore — not gates. Always offer the ability to switch.

## 7. Trade-offs and Constraints

| Trade-off | Decision | Cost accepted |
|---|---|---|
| Continuous slider vs discrete tiers | Discrete three-button | Less granular than a slider; clearer model |
| One MDX per lesson with `<Tier>` wrappers vs three files | One file | Author tags every advanced section; one file to maintain |
| TOC always visible vs collapsible | Collapsible at narrow viewports; sticky at wide | Slightly more UI state; standard pattern |
| Tier persists in URL vs in storage | URL hash + storage fallback | URL is shareable; storage handles per-session continuity |

## 8. Open Questions

- **Where exactly does the tier control sit?** Topbar (always visible) or near the lesson title (less prominent)? Probably topbar — it's a global concern, like the pillar nav.
- **Should the tier control affect the TOC entries themselves?** If at `essential` tier, do `complete`-only sections show greyed out in the TOC ("there's more here at higher tiers") or are they hidden entirely? Tentatively hidden — keep the reading flow clean. The tier-switcher button is the affordance for "I want more."
- **Does the reading-progress bar account for hidden tier sections?** When at `essential` tier, the bar fills based on the visible content length, not the full document. Probably yes — the bar should reflect what the reader is actually traversing.
- **What about the assessment progress?** Does the TOC show "5 questions in this section, you've answered 2"? Could be a future enhancement. Out of scope for the initial TOC build.
- **Mobile / very narrow viewports.** Drawer pattern for the TOC is standard but takes care to implement. Initial scope can ship desktop-only.

## 9. Related Systems and Notes

- [`assessment-design.md`](assessment-design.md) — the complete-tier code question is one place these systems compose. Tier visibility affects which assessments show.
- [`llm-integrations.md`](llm-integrations.md) — the AI chatbot lives on the right side; this note's layout strategy makes room for it.
- [`lessons-as-living-documents.md`](lessons-as-living-documents.md) — tier tagging is part of lesson frontmatter; tier visibility is preserved across lesson revisions.
- [`three-pillar-model.md`](three-pillar-model.md) — the Teach pillar gets these affordances first; Quiz and Interview pillars may have their own affordances (Quiz: SR-queue sidebar; Interview: rubric sidebar) that compose with the Teach layout.
- [`../systems/frontend-shell.md`](../systems/frontend-shell.md) — the layout components (`<Layout>`, future `<LessonTOC>`, future `<TierControl>`) live here.
- [`../references/inspirations/recurring-patterns.md`](../references/inspirations/recurring-patterns.md) — the multi-level zoom (pattern 5) and layer-peel (pattern 13) are related ideas; the tier system is a coarse version of them at the lesson-structure level.
