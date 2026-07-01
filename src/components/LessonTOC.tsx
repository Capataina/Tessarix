import { useEffect, useMemo, useState } from "react";
import { useTier } from "../state/TierContext";
import "./LessonTOC.css";

interface TOCEntry {
  id: string;
  text: string;
  level: 2 | 3 | 4;
}

/** The current lesson slug from the router hash (`#/lesson/<slug>[?s=…]`). */
function lessonSlugFromHash(): string | null {
  const raw = (window.location.hash || "").replace(/^#\/?/, "");
  return raw.startsWith("lesson/") ? raw.slice("lesson/".length).split("?")[0] : null;
}

/**
 * Scans the rendered lesson DOM for h2/h3/h4 headings (which carry `id`s
 * thanks to rehype-slug), builds a hierarchical TOC, and tracks which
 * section is currently in view via IntersectionObserver.
 *
 * Re-scans when the complexity tier changes, because hidden Tier sections
 * remove their headings from the DOM.
 */
export function LessonTOC() {
  const [entries, setEntries] = useState<TOCEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { tier } = useTier();

  // Re-scan headings on mount + whenever the tier changes. Headings inside
  // currently-hidden tier blocks (data-tier-hidden="true") are excluded so the
  // reader doesn't see TOC entries they can't navigate to. The DOM still
  // contains them (for LLM-context extraction); the TOC just hides them.
  //
  // The lesson body is lazy-loaded (Suspense), so headings are usually NOT in
  // the DOM on the first frame after mount — a single rAF scan finds nothing and
  // leaves the TOC empty. We retry across frames until they appear. (Lesson-to-
  // lesson swaps are handled by the `key={slug}` remount in Layout, which gives
  // a fresh scan per lesson.)
  useEffect(() => {
    let raf = 0;
    let tries = 0;
    const scan = () => {
      const headings = Array.from(
        document.querySelectorAll<HTMLHeadingElement>(
          ".lesson h2[id], .lesson h3[id], .lesson h4[id]",
        ),
      ).filter((h) => !h.closest('[data-tier-hidden="true"]'));
      if (headings.length === 0 && tries++ < 120) {
        raf = requestAnimationFrame(scan); // ~2s of retries for the lazy body
        return;
      }
      const next: TOCEntry[] = headings.map((h) => ({
        id: h.id,
        text: h.textContent ?? "",
        level: Number(h.tagName.slice(1)) as 2 | 3 | 4,
      }));
      setEntries(next);
      setActiveId((cur) => (next.some((e) => e.id === cur) ? cur : (next[0]?.id ?? null)));
    };
    raf = requestAnimationFrame(scan);
    return () => cancelAnimationFrame(raf);
  }, [tier]);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    if (entries.length === 0) return;
    const observer = new IntersectionObserver(
      (observed) => {
        // Find the topmost intersecting entry; that's the "currently in view"
        const visible = observed
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      },
    );
    entries.forEach((entry) => {
      const el = document.getElementById(entry.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [entries]);

  const handleClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Write the URL in the router's scheme (`#/lesson/<slug>?s=<id>`), NOT a
      // bare `#<id>` — a bare hash doesn't match the `lesson/` route prefix and
      // would resolve to the catalog on the next reload/back. replaceState keeps
      // section jumps out of the history stack, so Back steps by lesson.
      const slug = lessonSlugFromHash();
      if (slug) history.replaceState(null, "", `#/lesson/${slug}?s=${id}`);
      setActiveId(id);
    }
  };

  const headingCount = useMemo(() => entries.length, [entries]);
  const slug = lessonSlugFromHash();

  if (headingCount === 0) {
    return null;
  }

  return (
    <nav className="toc" aria-label="Table of contents">
      <div className="toc__header">
        <span className="toc__header-text">On this page</span>
      </div>
      <ul className="toc__list">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={`toc__item toc__item--level-${entry.level} ${
              entry.id === activeId ? "toc__item--active" : ""
            }`}
          >
            <a
              href={slug ? `#/lesson/${slug}?s=${entry.id}` : `#${entry.id}`}
              onClick={handleClick(entry.id)}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
