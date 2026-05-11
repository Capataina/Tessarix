# Lessons as Living Documents

## 1. Current Understanding

Lessons in Tessarix are not "ship once and forget" artefacts. They are living documents that evolve as the project's widget library grows, as the author's understanding of the topic deepens, and as new interactive patterns become available. A lesson written today using only `<FunctionGrapher>` and `<MultipleChoice>` should be expected to gain a `<GoalDrivenWrapper>`, a `<CodeQuestion>`, a `<PredictThenVerify>`, or a richer custom widget when those primitives ship — without requiring a full rewrite.

The implication is structural: the project must be architected for cheap revisit and incremental improvement of existing lessons, not for "finish A-FINE, move on to CNN, never touch A-FINE again."

## 2. Rationale

Three forcing functions make this the right stance:

1. **Widget library grows opportunistically** (the principle already captured in [`authoring-discipline.md`](authoring-discipline.md)). Each new lesson surfaces missing primitives; each new primitive could improve every prior lesson that would have used it. The first finance lesson will have a sparse widget palette; the tenth finance lesson will have a rich one. The first lesson should benefit from the tenth's primitives, retroactively.
2. **The author's understanding deepens with each adjacent lesson.** Writing the CLIP/ViT lesson will surface clarifications, correct misconceptions, and reveal better framings that the original A-FINE lesson should absorb. Treating lessons as immutable would lock in early-stage confusion.
3. **Pedagogical patterns themselves evolve.** The recurring-patterns catalog (`context/references/inspirations/recurring-patterns.md`) is an open list. When a new pattern is added — say, conversational LLM interviews ([`llm-integrations.md`](llm-integrations.md)) — old lessons may genuinely improve by adopting it.

Without this principle the project drifts toward "lesson-as-finished-artefact" — which forces either (a) accepting permanent quality variance between early and late lessons, or (b) doing a single heroic rewrite when accumulated debt becomes unbearable. Both outcomes are worse than continuous small refinement.

## 3. What Was Tried

Nothing tried-and-abandoned yet — this is a forward-stated principle, not a correction. Worth recording for future sessions: the initial framing of A-FINE assumed "write the lesson once, then move on." This note exists because that framing is wrong; the lesson WILL be revisited, probably multiple times.

## 4. Guiding Principles

- **Widget API stability is a feature, not a chore.** When `<FunctionGrapher>` grows a new capability, add a prop with a default; don't reshape the call signature. Breaking changes to widget APIs make revisiting old lessons painful, which makes revisits less likely, which makes the living-documents principle fail in practice.
- **Lessons declare their dependencies in frontmatter.** Each lesson MDX should carry metadata: `title`, `tags`, `prerequisites` (slugs of other lessons), `estimated_time`, `last_updated`, `widgets_used`. This metadata powers stale-content discovery, prerequisite graphing, and the eventual "lessons not touched in 6 months" view.
- **Old lessons surface for revisit via signals, not memory.** Don't rely on the author remembering which lessons could benefit from a new widget. Build mechanical surfacing: `lessons_using_widget("FunctionGrapher")` returns a list; the sync-learning agent's reach can extend to "lessons that should be updated because the Learning archive's source notes have changed."
- **Staleness is adaptive, not absolute.** A lesson is "stale" if it is significantly *older than the project's recent edit rhythm*, not if its `last_updated` timestamp is older than some fixed wall-clock duration. If the project goes untouched for three weeks, the lessons are not all suddenly stale — they are still aligned with each other and with the current state of the codebase. But if the project has been edited frequently and one lesson has not been touched in 14 days while the median lesson was edited 3 days ago, that lesson is genuinely behind. The right staleness signal is `(now − file.last_updated) − (now − median(all_files.last_updated))` or similar — the difference between the file's age and the project's working rhythm. Concretely: a "lessons due for revisit" surface should compute `oldest_lesson_last_updated` and `newest_lesson_last_updated` for the project, then flag any lesson whose `last_updated` lags `newest` by more than some adaptive threshold (e.g. more than 2× the median inter-edit gap). This avoids false-positive staleness when the project is dormant, and avoids false-negative staleness when the project is rapidly evolving and a "merely 5-day-old" lesson is actually behind.
- **Revisits are normal, not exceptional.** A lesson editing session that produces "version 2 of A-FINE" is normal product work, not a sign that version 1 was broken. Commit message conventions and changelog patterns should reflect this — "refine A-FINE to use `<GoalDrivenWrapper>`" is a normal commit, not a rewrite.
- **Backward-compatible widget APIs > breaking changes**, almost always. When a breaking change is genuinely necessary (a widget's mental model was wrong), introduce a versioned successor (`<FunctionGrapher2>`) and migrate lessons explicitly rather than silently breaking renders.

## 5. Trade-offs and Constraints

| Trade-off | Decision | Cost accepted |
|---|---|---|
| Backward-compatible widget APIs | Required by default | Slower widget evolution; we can't aggressively rename or reshape APIs |
| Lesson frontmatter overhead | Required on every lesson | ~10 lines of YAML-ish frontmatter per lesson; small |
| Old-lesson revisit cadence | No fixed cadence; surface mechanically when signals fire | Some lessons may stay stale longer than ideal if no signal fires |
| Versioned widget successors when breaking changes are needed | Allowed but discouraged | API surface grows over time; periodic deprecation cycles needed |

## 6. Open Questions

- **What's the right surface for "lessons due for revisit"?** A dashboard view? A CLI command? A weekly digest? Probably a dashboard view in the eventual lesson-management UI, but the data source should be queryable from anywhere. The data computation must implement the adaptive-staleness principle above — querying for "lessons older than N days" is the wrong shape; querying for "lessons whose age relative to the project's edit rhythm exceeds a threshold" is the right shape.
- **How does the sync-learning agent participate in revisits?** Its M3 scope says "emit drafts for new content." A natural extension: "emit revision drafts for stale content when the source notes have changed." Open whether this is the same skill or a separate one.
- **Should lessons be versioned in git history alone, or should there be in-lesson change-log entries?** Git history is authoritative but unhelpful for surfacing "what changed in this lesson since you last read it" to the reader. A `### Revision history` section at the end of each lesson is a small overhead that adds reader-facing transparency. Tentatively yes.
- **How to handle "the lesson got significantly better" notifications for readers who've already completed it?** Probably surfaces in the Quiz pillar's SR scheduling — refreshed lessons can re-enter the queue at a low priority.

## 7. Related Systems and Notes

- [`authoring-discipline.md`](authoring-discipline.md) — the upstream principle that the component library accretes from real lessons (which is what produces the version drift this note addresses).
- [`assessment-design.md`](assessment-design.md) — assessment shapes evolve too; the A-FINE lesson will gain `<GoalDrivenWrapper>` probes once they ship.
- [`interface-affordances.md`](interface-affordances.md) — the complexity tier system makes lessons more reshape-friendly because new sections can be inserted at any tier without disturbing existing flow.
- [`llm-integrations.md`](llm-integrations.md) — the eventual sync-learning agent's revisit-detection scope sits here.
- [`../systems/frontend-shell.md`](../systems/frontend-shell.md) — the place where lesson MDX files physically live and where widget primitives are versioned.
- [`../references/inspirations/recurring-patterns.md`](../references/inspirations/recurring-patterns.md) — when a new pattern is added there, old lessons may improve by adopting it; this note's principle is what makes that improvement actually happen.

## 8. Worked Example

The A-FINE lesson as built on 2026-05-11 uses `<AFinePipeline>`, `<FunctionGrapher>` (twice), `<MultipleChoice>` (seven times), and `<KnowledgeCheck>` (once). Per the assessment-design conversation, this is too MCQ-heavy and needs `<GoalDrivenWrapper>`, `<PredictThenVerify>`, and `<ClickableHotspot>` to replace several of the MCQs.

When those three widgets ship:

1. Reopen `src/lessons/afine.mdx`.
2. Replace specific MCQs with the new shapes per the table in `assessment-design.md` §6.
3. Bump `last_updated` in the frontmatter.
4. Optionally add a brief "Revision history" entry at the lesson's end noting what changed and why.
5. Commit with a message that captures the *why* — "rebuild A-FINE assessment layer to use understanding-testing widgets per assessment-design.md".

This is normal work, not a heroic rewrite. The lesson got better; the structural cost of making it better was small because the widget APIs are stable and the lesson's prose didn't need to change.
