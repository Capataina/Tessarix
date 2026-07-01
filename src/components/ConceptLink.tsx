/**
 * A concept link with a hover "instant summary". While the pointer rests on the
 * link, the underline fills like a progress bar; generation of a contextual
 * explanation starts EARLY (at GEN_AT_MS) so that by the time the bar completes
 * (REVEAL_MS) the tooltip can appear with the answer already (or streaming in).
 * The explanation is grounded in the specific passage the link sits in, not a
 * generic definition (see src/lib/llm/contextual.ts).
 *
 * Progress is driven by direct DOM style mutation (a CSS var) rather than React
 * state, so the 60fps fill never re-renders the component — only the tooltip's
 * appearance/content uses state.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { conceptTooltip } from "../lib/llm/contextual";
import type { Category } from "../lib/graph/meta";
import "./ConceptLink.css";

const REVEAL_MS = 2600; // underline fill duration → tooltip appears
const GEN_AT_MS = 1000; // start generating this early into the hover

interface ConceptLinkProps {
  href: string;
  slug: string;
  label: string;
  category: Category;
  children: ReactNode;
}

interface TipPos {
  left: number;
  top: number;
  bottom: number;
  below: boolean;
}

export function ConceptLink({ href, slug, label, category, children }: ConceptLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const rafRef = useRef(0);
  const genStarted = useRef(false);
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<TipPos | null>(null);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const startGen = useCallback(() => {
    if (genStarted.current) return;
    genStarted.current = true;
    const passage = ref.current?.closest("p, li")?.textContent?.trim() ?? "";
    const title = document.querySelector(".lesson h1")?.textContent?.trim() ?? "";
    setLoading(true);
    conceptTooltip(label, passage, title)
      .then((t) => setTip(t))
      .catch(() => setTip(null))
      .finally(() => setLoading(false));
  }, [label]);

  const onEnter = useCallback(() => {
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(1, elapsed / REVEAL_MS);
      ref.current?.style.setProperty("--hover-progress", String(p));
      if (elapsed >= GEN_AT_MS) startGen();
      if (p >= 1) {
        const r = ref.current?.getBoundingClientRect();
        if (r) setPos({ left: r.left + r.width / 2, top: r.top, bottom: r.bottom, below: r.top < 150 });
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [startGen]);

  const onLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    ref.current?.style.setProperty("--hover-progress", "0");
    setPos(null);
    genStarted.current = false; // allow re-gen next hover (the cache makes it instant)
  }, []);

  return (
    <>
      <a
        ref={ref}
        href={href}
        className="concept-link"
        data-concept={slug}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {children}
      </a>
      {pos &&
        createPortal(
          <div
            className="concept-tip"
            data-below={pos.below ? "true" : "false"}
            style={{ left: pos.left, top: pos.below ? pos.bottom : pos.top }}
            role="tooltip"
          >
            <div className="concept-tip__head">
              <span className="concept-tip__label">{label}</span>
              <span className="concept-tip__cat">{category}</span>
            </div>
            <div className="concept-tip__body">
              {tip ?? (
                <span className="concept-tip__thinking">
                  {loading ? "Reading this passage…" : "…"}
                </span>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
