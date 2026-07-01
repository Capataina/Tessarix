/**
 * Token normalisation for the concept linker. The author's goal is "close
 * enough is good enough — don't enumerate every surface form"; the precise way
 * to deliver that (without the false positives of character-level fuzzy
 * matching) is morphological normalisation via a real lemmatiser.
 *
 * The SAME normaliser is applied to both the concept target forms and the prose
 * tokens, so it is *consistency* — not linguistic perfection — that makes them
 * match. `matrices` and `matrix` both fold to `matrix`; `multiplications` folds
 * to `multiplication`; so "matrices multiplications" matches "matrix
 * multiplication". Pure module (no React), unit-testable in plain node.
 */
import winkLemmatizer from "wink-lemmatizer";

const { noun } = winkLemmatizer;

/** Strip leading/trailing non-alphanumerics (unicode-aware). */
const EDGE_PUNCT = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/** A word plus internal apostrophes/hyphens; drives tokenisation. */
const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/** Lowercase, strip edge punctuation, then noun-lemmatise a single token. */
export function normalizeToken(raw: string): string {
  const w = raw.toLowerCase().replace(EDGE_PUNCT, "");
  return w ? noun(w) : "";
}

export interface Token {
  /** The original substring, for reconstructing output. */
  raw: string;
  /** Char offset of the token start in the source text. */
  start: number;
  /** Char offset one past the token end. */
  end: number;
  /** Normalised (lemmatised) form, used for matching. */
  lemma: string;
}

/** Tokenise text into words with source offsets and their lemmas. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const raw = m[0];
    const start = m.index ?? 0;
    tokens.push({ raw, start, end: start + raw.length, lemma: normalizeToken(raw) });
  }
  return tokens;
}

/** Lemma sequence for a concept phrase (empty tokens dropped). */
export function normalizePhrase(phrase: string): string[] {
  return tokenize(phrase)
    .map((t) => t.lemma)
    .filter(Boolean);
}
