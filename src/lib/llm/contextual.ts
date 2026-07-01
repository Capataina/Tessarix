/**
 * Contextual, in-place explanations — the "instant summaries" surface. Given a
 * term the reader hovered (or selected) plus the passage it sits in, the model
 * explains what the term means and contributes RIGHT HERE, grounded in the
 * passage rather than as a generic dictionary definition.
 *
 * Results are cached per (term, passage) so re-hovering is instant and a hover
 * that starts generation early (before its tooltip is due) is deduped against
 * the eventual reveal. The cache stores the in-flight promise, so two hovers of
 * the same term in the same passage share one model call.
 */
import type { ChatMessage } from "./types";
import { llmComplete } from "./client";

export interface ContextualInput {
  term: string;
  passage: string;
  lessonTitle: string;
}

export function buildConceptTooltipMessages(input: ContextualInput): ChatMessage[] {
  const system =
    "You explain a single term as it is used in one specific passage of a lesson. " +
    "Give a 1-2 sentence, concrete explanation of what the term means and what it " +
    "contributes to THIS passage — grounded in the passage, not a generic " +
    "dictionary definition. Use only what the passage supports; do not invent " +
    "formulas or facts. No markdown, no lists, no links, no preamble — just the " +
    "explanation.";
  const user =
    `Lesson: ${input.lessonTitle}\n\n` +
    `Passage:\n${input.passage}\n\n` +
    `Term: "${input.term}"\n\n` +
    `In 1-2 sentences, what does "${input.term}" mean here and what does it ` +
    `contribute to this passage?`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

const cache = new Map<string, Promise<string>>();

/** djb2 over the passage keeps the cache key small and stable per passage. */
function keyOf(term: string, passage: string): string {
  let h = 5381;
  for (let i = 0; i < passage.length; i++) h = ((h << 5) + h + passage.charCodeAt(i)) | 0;
  return `${term}::${h}`;
}

/** Contextual explanation of `term` inside `passage`; cached (promise-deduped). */
export function conceptTooltip(term: string, rawPassage: string, lessonTitle: string): Promise<string> {
  // Cap the passage: the local sentence carries the context and a shorter prompt
  // keeps prompt-eval fast (the tooltip must feel instant on a warm model).
  const passage = rawPassage.length > 700 ? rawPassage.slice(0, 700) + "…" : rawPassage;
  const key = keyOf(term, passage);
  const hit = cache.get(key);
  if (hit) return hit;
  // llmComplete is a non-hook call (no telemetry emission); the tooltip trades
  // that for being fireable from this cached module function on hover.
  const p = llmComplete(
    buildConceptTooltipMessages({ term, passage, lessonTitle }),
    { temperature: 0.2, maxTokens: 120 },
  )
    .then((t) => t.trim())
    .catch((e) => {
      cache.delete(key); // don't cache failures — allow a retry on next hover
      throw e;
    });
  cache.set(key, p);
  return p;
}
