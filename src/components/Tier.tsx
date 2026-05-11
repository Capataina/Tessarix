import type { ReactNode } from "react";
import { useTier, type ComplexityTier } from "../state/TierContext";

interface TierProps {
  /**
   * Minimum tier at which this content becomes relevant.
   * - "essential" — always shown.
   * - "standard"  — shown at standard + complete tiers.
   * - "complete"  — shown only at the complete tier.
   *
   * Below the threshold, the wrapper is **kept in the DOM** but hidden via
   * CSS (`display: none` + `aria-hidden`). This is deliberate: LLM-powered
   * features extract context from the rendered DOM and need the full lesson
   * regardless of which tier the reader has selected for display.
   */
  level: ComplexityTier;
  children: ReactNode;
}

/**
 * Inline complexity-tier wrapper. Always renders its children into the DOM;
 * hides them visually when the current tier is below `level`. Hidden blocks
 * carry `data-tier-hidden="true"` so downstream tooling (TOC filter, future
 * dev-only inspectors) can distinguish them.
 *
 * See TierContext for inclusion semantics.
 */
export function Tier({ level, children }: TierProps) {
  const { shouldRender } = useTier();
  const visible = shouldRender(level);
  return (
    <div
      className={`tier-block tier-block--${level}`}
      data-tier={level}
      data-tier-hidden={visible ? undefined : "true"}
      aria-hidden={visible ? undefined : true}
      style={visible ? undefined : { display: "none" }}
    >
      {children}
    </div>
  );
}
