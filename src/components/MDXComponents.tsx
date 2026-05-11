/**
 * Components provided to MDX via MDXProvider. Lessons import their own
 * widgets inline, so this map is intentionally light — it covers cross-
 * cutting tweaks (e.g. wrapping the lead chip block) rather than overriding
 * every HTML element.
 */
import type { ComponentProps } from "react";

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
};
