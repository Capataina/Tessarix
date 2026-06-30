/**
 * The concept index + the deterministic concept-linker. Pure: imports only the
 * authored metadata (no registry, no MDX), so it is unit-testable in plain node
 * and safe to call from anywhere (including on LLM-generated prose).
 *
 * Generation is separated from linking (context/notes/content-architecture.md):
 * a generator writes prose; this injects the correct cross-page links afterward,
 * so a hallucinated lesson reference is impossible.
 */
import { LESSON_META, type Category, type LessonMeta } from "./meta";

export interface ConceptEntry {
  concept: string;
  /** Every surface form to match (concept + aliases), lowercased. */
  forms: string[];
  slug: string;
  category: Category;
}

/** One entry per concept, longest-surface-form first for matching priority. */
export const CONCEPT_INDEX: ConceptEntry[] = Object.entries(LESSON_META)
  .flatMap(([slug, meta]: [string, LessonMeta]) =>
    meta.teaches.map((concept) => ({
      concept,
      forms: [concept, ...(meta.aliases?.[concept] ?? [])].map((f) => f.toLowerCase()),
      slug,
      category: meta.category,
    })),
  )
  .sort(
    (a, b) =>
      Math.max(...b.forms.map((f) => f.length)) -
      Math.max(...a.forms.map((f) => f.length)),
  );

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface LinkOptions {
  /** Don't link concepts owned by this lesson (no self-links). */
  excludeSlug?: string;
  /** Prefer this category when a concept term is ambiguous across categories. */
  category?: Category;
}

/**
 * Inject cross-page concept links into prose, returning HTML. Density-capped to
 * one link per target lesson; longest surface form wins; whole-word, case-
 * insensitive; never links a concept owned by `excludeSlug`. Input is HTML-
 * escaped first and only known-good anchors are inserted, so LLM prose is safe.
 */
export function linkConceptsToHtml(text: string, opts: LinkOptions = {}): string {
  let result = escapeHtml(text);
  const usedSlugs = new Set<string>();
  const placeholders: Array<{ token: string; html: string }> = [];

  const entries = [...CONCEPT_INDEX].sort((a, b) => {
    if (opts.category) {
      const ac = a.category === opts.category ? 0 : 1;
      const bc = b.category === opts.category ? 0 : 1;
      if (ac !== bc) return ac - bc;
    }
    return 0;
  });

  for (const entry of entries) {
    if (entry.slug === opts.excludeSlug) continue;
    if (usedSlugs.has(entry.slug)) continue;
    for (const form of entry.forms) {
      const re = new RegExp(`\\b(${escapeRegex(form)})\\b`, "i");
      const m = re.exec(result);
      if (!m) continue;
      const token = ` L${placeholders.length} `;
      placeholders.push({
        token,
        html: `<a href="#/lesson/${entry.slug}" class="concept-link" data-concept="${entry.slug}">${m[1]}</a>`,
      });
      result = result.slice(0, m.index) + token + result.slice(m.index + m[0].length);
      usedSlugs.add(entry.slug);
      break;
    }
  }

  for (const { token, html } of placeholders) result = result.replace(token, html);
  return result;
}
