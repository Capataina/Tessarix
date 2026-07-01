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

export type Scope = "strong" | "contextual";

export interface Target {
  slug: string;
  category: Category;
  scope: Scope;
  /** Canonical concept name (for the link title/tooltip). */
  label: string;
  /** Normalised lemma sequence this target matches. */
  lemmas: string[];
}

export function buildTargetIndex(): Target[] {
  const targets: Target[] = [];
  for (const [slug, meta] of Object.entries(LESSON_META)) {
    const strong = new Set(meta.strong ?? []);
    for (const concept of meta.teaches) {
      const scope: Scope = strong.has(concept) ? "strong" : "contextual";
      const forms = [concept, ...(meta.aliases?.[concept] ?? [])];
      for (const form of forms) {
        const lemmas = normalizePhrase(form);
        if (lemmas.length === 0) continue;
        targets.push({ slug, category: meta.category, scope, label: concept, lemmas });
      }
    }
  }
  // Longest lemma-sequence first: multiword phrases match before their head word.
  return targets.sort((a, b) => b.lemmas.length - a.lemmas.length);
}

export const TARGET_INDEX: Target[] = buildTargetIndex();
