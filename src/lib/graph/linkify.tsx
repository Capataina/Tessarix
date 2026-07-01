/**
 * The React binding for the prose linker: MDX component overrides that inject
 * concept links into authored lesson prose, and the context that scopes them.
 *
 * The clean part of the design: an override only linkifies its *raw string*
 * children. Inline code, KaTeX math, existing links, and bold are already React
 * *elements* by the time the override sees them, so passing non-string children
 * through untouched automatically honours "never link inside code / math /
 * links" with no special-casing. Headings are not overridden — they are link
 * targets, not sources.
 *
 * Density is capped per text block (paragraph / list item) rather than per
 * lesson: the matcher runs independently per override call, which keeps this
 * pure and React-safe (no mutable cross-component render state). Per-lesson
 * dedup is a documented follow-up (context/plans/authored-prose-autolinking.md).
 */
import { Children, createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { LESSON_META, type Category } from "./meta";
import { linkToSegments } from "./match";
import { useSettings } from "../../state/SettingsContext";
import { ConceptLink } from "../../components/ConceptLink";

interface LinkCtx {
  slug?: string;
  category: Category | null;
}

const LinkContext = createContext<LinkCtx>({ category: null });

/** Supplies the current lesson slug + category so links self-exclude and scope. */
export function LinkProvider({ slug, children }: { slug?: string; children: ReactNode }) {
  const category = slug ? (LESSON_META[slug]?.category ?? null) : null;
  return <LinkContext.Provider value={{ slug, category }}>{children}</LinkContext.Provider>;
}

/** Linkify the string children of a prose element; pass elements through. */
function useLinkified(children: ReactNode): ReactNode {
  const { slug, category } = useContext(LinkContext);
  const { settings } = useSettings();
  const mode = settings.autolinkMode;
  if (mode === "none") return children;
  return Children.map(children, (child) => {
    if (typeof child !== "string") return child; // code / math / links / bold pass through
    const segments = linkToSegments(child, { activeCategory: category, mode, excludeSlug: slug });
    if (segments.length === 1 && segments[0].kind === "text") return child;
    return segments.map((s, i) =>
      s.kind === "text" ? (
        s.text
      ) : (
        <ConceptLink
          key={i}
          href={`#/lesson/${s.slug}${s.anchor ? `?s=${s.anchor}` : ""}`}
          slug={s.slug}
          label={s.label}
          category={s.category}
        >
          {s.text}
        </ConceptLink>
      ),
    );
  });
}

export function LinkedP({ children, ...rest }: ComponentProps<"p">) {
  return <p {...rest}>{useLinkified(children)}</p>;
}

export function LinkedLi({ children, ...rest }: ComponentProps<"li">) {
  return <li {...rest}>{useLinkified(children)}</li>;
}
