/**
 * Per-category palettes — the locked "full surface-temperature shift" identity
 * decision (context/notes/visual-identity.md). Each top-level category recolours
 * the WHOLE palette (surfaces, accent, chart set); the structure (radii, spacing,
 * type, motion, terminal grammar) is invariant, so each category reads as the
 * same app in a different room.
 *
 * The base (house) chocolate-luxe palette stays the default and is Machine
 * Learning's identity; Mathematics shifts to a cool, premium slate-blue. Applied
 * by re-injecting the token set (inline custom properties win over CSS), so a
 * category swap recolours everything — chrome, charts, the ASCII donut — at once.
 */
import { useEffect } from "react";
import { injectDesignTokens, type Palette } from "../../styles/inject";
import type { Category } from "./meta";

export const CATEGORY_PALETTES: Partial<Record<Category, Partial<Palette>>> = {
  // Machine Learning keeps the house warm palette (no override).
  "Machine Learning": undefined,
  // Mathematics — cool, premium slate-blue. Surfaces go cool; the accent becomes
  // steel-blue; the chart pigment set shifts to a cool-leaning spread.
  Mathematics: {
    bgBase: "#0a0c11",
    bgSurface: "#0f131a",
    bgElevated: "#151b24",
    bgOverlay: "#1d2530",
    widgetBg: "#0e1218",
    widgetBgElevated: "#141a22",
    borderSubtle: "#1b2430",
    borderStrong: "#2b3645",
    textPrimary: "#dce4ee",
    textSecondary: "#94a4b8",
    textMuted: "#5f6f82",
    textDisabled: "#414c5a",
    camel: "#7fa6cf", // accent → steel blue
    tobacco: "#5878a0",
    rust: "#a87a9a", // muted mauve-pink (chart-2)
    ochre: "#c2a06a", // warm tan retained for chart contrast
    sage: "#6f9c8c", // teal-green
    eucalyptus: "#5f93a0",
    mauve: "#9a84b8",
    brick: "#b06a78",
  },
};

/** Apply a category's palette app-wide (or reset to the house palette for null). */
export function applyCategoryTheme(category: Category | null): void {
  injectDesignTokens(category ? CATEGORY_PALETTES[category] : undefined);
}

/** React effect wrapper — recolours the app to `category` and resets on unmount. */
export function useCategoryTheme(category: Category | null): void {
  useEffect(() => {
    applyCategoryTheme(category);
    return () => applyCategoryTheme(null);
  }, [category]);
}
