/**
 * Components provided to MDX via MDXProvider. Lessons import their own
 * widgets inline, so this map is intentionally light — it covers cross-
 * cutting tweaks (e.g. wrapping the lead chip block) rather than overriding
 * every HTML element.
 *
 * `p` and `li` are overridden to auto-link concept mentions in prose (the
 * LinkedP/LinkedLi pair only touch raw string children, so code/math/existing
 * links pass through untouched). See context/plans/authored-prose-autolinking.md.
 */
import type { ComponentProps } from "react";
import { LinkedP, LinkedLi } from "../lib/graph/linkify";

interface LessonMetaProps extends ComponentProps<"div"> {
  tags?: string[];
}

export function LessonMeta({ tags = [], children, ...rest }: LessonMetaProps) {
  return (
    <div className="lesson-meta" {...rest}>
      {tags.map((t, i) => (
        <span
          key={t + i}
          className={`lesson-meta__chip ${i === 0 ? "lesson-meta__chip--accent" : ""}`}
        >
          {t}
        </span>
      ))}
      {children}
    </div>
  );
}

export const mdxComponents = {
  LessonMeta,
  p: LinkedP,
  li: LinkedLi,
};
