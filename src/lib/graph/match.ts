/**
 * The prose concept-matcher: given a run of text and a reader context, find the
 * concept links to inject. Pure (no React) so it is unit-testable and is the
 * golden-corpus surface (match.test.ts) that stands in for human review.
 *
 * Precision over recall is the governing rule (there is no per-link review): the
 * gate below defaults toward *not* linking. A missed link is a non-event (the
 * concept is still reachable via the graph nav); a wrong link ships silently and
 * erodes trust, so omission is the only error the matcher is allowed to make.
 */
import { tokenize } from "./normalize";
import { TARGET_INDEX, type Target } from "./targets";
import type { Category } from "./meta";

/** The reader-facing autolink visibility mode (SettingsContext). */
export type LinkMode = "all" | "normal" | "none";

export interface LinkOpts {
  /** The category of the lesson being read; gates contextual targets. */
  activeCategory: Category | null;
  /** Reader dial. */
  mode: LinkMode;
  /** The current lesson slug — never self-linked. */
  excludeSlug?: string;
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; slug: string; label: string; category: Category };

/** Scope gate — the heart of the precision policy. */
function allowed(t: Target, opts: LinkOpts): boolean {
  if (t.slug === opts.excludeSlug) return false; // no self-links
  if (opts.mode === "all") return true; // reader opted into cross-domain guesses
  if (t.scope === "strong") return true; // relevant everywhere
  return t.category === opts.activeCategory; // contextual: in-domain only
}

interface Hit {
  start: number;
  end: number;
  target: Target;
}

/**
 * Find the concept hits in `text`. Longest-match, left-to-right, non-
 * overlapping, density-capped to one hit per target lesson per block.
 */
export function findHits(text: string, opts: LinkOpts, index: Target[] = TARGET_INDEX): Hit[] {
  if (opts.mode === "none") return [];
  const tokens = tokenize(text);
  const hits: Hit[] = [];
  const used = new Set<string>(); // density cap: one link per slug per block
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (const t of index) {
      // index is longest-first, so the first match at this position is the longest.
      if (used.has(t.slug)) continue;
      if (!allowed(t, opts)) continue;
      const n = t.lemmas.length;
      if (i + n > tokens.length) continue;
      let ok = true;
      for (let k = 0; k < n; k++) {
        if (tokens[i + k].lemma !== t.lemmas[k]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      hits.push({ start: tokens[i].start, end: tokens[i + n - 1].end, target: t });
      used.add(t.slug);
      i += n;
      matched = true;
      break;
    }
    if (!matched) i += 1;
  }
  return hits;
}

/** Split `text` into text/link segments the React layer can render. */
export function linkToSegments(text: string, opts: LinkOpts): Segment[] {
  const hits = findHits(text, opts);
  if (hits.length === 0) return [{ kind: "text", text }];
  const segs: Segment[] = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.start > cursor) segs.push({ kind: "text", text: text.slice(cursor, h.start) });
    segs.push({
      kind: "link",
      text: text.slice(h.start, h.end),
      slug: h.target.slug,
      label: h.target.label,
      category: h.target.category,
    });
    cursor = h.end;
  }
  if (cursor < text.length) segs.push({ kind: "text", text: text.slice(cursor) });
  return segs;
}
