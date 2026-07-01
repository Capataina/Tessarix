/**
 * Ambient types for wink-lemmatizer (ships no .d.ts). Dictionary-backed
 * lemmatiser; we use the noun form as a consistent normaliser for concept
 * matching (see src/lib/graph/normalize.ts).
 */
declare module "wink-lemmatizer" {
  export function noun(word: string): string;
  export function verb(word: string): string;
  export function adjective(word: string): string;
  const lemmatizer: {
    noun: typeof noun;
    verb: typeof verb;
    adjective: typeof adjective;
  };
  export default lemmatizer;
}
