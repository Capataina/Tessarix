/**
 * The concept target index for the prose linker. A "target" is one linkable
 * surface form of a concept, carrying its owning lesson, category, and SCOPE.
 *
 * Scope (context/plans/authored-prose-autolinking.md) governs *where* a concept
 * may be linked:
 *   strong     — relevant across every domain; linked globally
 *   contextual — meaningful only inside its own domain (or its bare word is
 *                polysemous); linked only when the reader is in that category
 *
 * Derived from LESSON_META: `strong` names the cross-domain subset of `teaches`;
 * everything else in `teaches` is contextual (the safe default). Aliases carry
 * extra surface forms. Longest-first so a multiword phrase wins over its head
 * word ("matrix multiplication" over "matrix"). Pure module, unit-testable.
 */
import { LESSON_META, type Category } from "./meta";
import { normalizePhrase } from "./normalize";
import { HEADER_RECORDS } from "./headers.generated";

export type Scope = "strong" | "contextual";

export interface Target {
  slug: string;
  category: Category;
  scope: Scope;
  /** Canonical concept name (for the link title/tooltip). */
  label: string;
  /** Normalised lemma sequence this target matches. */
  lemmas: string[];
  /** Section anchor to deep-link to (from a harvested header), if any. */
  anchor?: string;
}

/** One target per (slug, lemma-sequence); later same-key entries enrich, not duplicate. */
function keyOf(slug: string, lemmas: string[]): string {
  return `${slug}::${lemmas.join(" ")}`;
}

export function buildTargetIndex(): Target[] {
  const byKey = new Map<string, Target>();

  // 1. Authored concepts (teaches + aliases). Scope from `strong`; the rest is
  //    contextual (the safe default).
  for (const [slug, meta] of Object.entries(LESSON_META)) {
    const strong = new Set(meta.strong ?? []);
    for (const concept of meta.teaches) {
      const scope: Scope = strong.has(concept) ? "strong" : "contextual";
      for (const form of [concept, ...(meta.aliases?.[concept] ?? [])]) {
        const lemmas = normalizePhrase(form);
        if (lemmas.length === 0) continue;
        const k = keyOf(slug, lemmas);
        if (!byKey.has(k)) byKey.set(k, { slug, category: meta.category, scope, label: concept, lemmas });
      }
    }
  }

  // 2. Harvested section headers. If a header matches an authored concept in the
  //    same lesson, it just enriches it with the section ANCHOR (so the existing
  //    link deep-links to the section). Otherwise the header concept becomes a
  //    NEW global (strong) target — "a matrix multiplication is a matrix
  //    multiplication regardless of domain".
  for (const rec of HEADER_RECORDS) {
    const meta = LESSON_META[rec.slug];
    if (!meta) continue;
    const lemmas = normalizePhrase(rec.phrase);
    if (lemmas.length === 0) continue;
    const k = keyOf(rec.slug, lemmas);
    const existing = byKey.get(k);
    if (existing) {
      if (!existing.anchor) existing.anchor = rec.anchor;
    } else {
      byKey.set(k, {
        slug: rec.slug,
        category: meta.category,
        scope: "strong",
        label: rec.phrase,
        lemmas,
        anchor: rec.anchor,
      });
    }
  }

  // Longest lemma-sequence first: multiword phrases match before their head word.
  return [...byKey.values()].sort((a, b) => b.lemmas.length - a.lemmas.length);
}

export const TARGET_INDEX: Target[] = buildTargetIndex();
