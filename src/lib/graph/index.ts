/**
 * The concept graph: the pure HTML linker (linker.ts, for generated prose) + the
 * lemma-based prose matcher (normalize/targets/match, for authored MDX) + the
 * registry-coupled graph builder (build.ts) + the category types.
 * See context/plans/curriculum-graph.md + authored-prose-autolinking.md.
 */
export * from "./linker";
export * from "./build";
export * from "./normalize";
export * from "./targets";
export * from "./match";
export type { Category, LessonMeta } from "./meta";
export { LESSON_META } from "./meta";
