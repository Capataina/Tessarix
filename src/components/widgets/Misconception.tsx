import type { ReactNode } from "react";
import "./Misconception.css";

interface MisconceptionProps {
  /** The wrong belief, stated plainly. */
  belief: string;
  /** Why it's wrong. */
  children: ReactNode;
}

/**
 * A "common confusion" callout. Visually distinct from a normal callout —
 * yellow warning border on the left, mono "MISCONCEPTION" label. Used to
 * call attention to the traps a reader is most likely to fall into.
 */
export function Misconception({ belief, children }: MisconceptionProps) {
  return (
    <aside className="misconception">
      <div className="misconception__header">
        <span className="misconception__icon" aria-hidden>⚠</span>
        <span className="misconception__label">Common misconception</span>
      </div>
      <div className="misconception__belief">{belief}</div>
      <div className="misconception__correction">{children}</div>
    </aside>
  );
}
