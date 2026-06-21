/**
 * Writes the design tokens to `:root` as CSS custom properties at boot, so every
 * `.css` file keeps consuming `var(--token)` from the single TS source of truth.
 * Called synchronously from main.tsx before React renders, so there is no flash.
 *
 * The custom-property NAMES are preserved exactly (including the legacy neon-era
 * aliases and the --surface-1/2 namespace), so no stylesheet needs editing when
 * the tokens move here from the old static theme.css :root block.
 */

import { color, font, fontSize, space, radius, shadow, motion } from "./tokens";
import { alpha } from "./derived";

function buildVars(): Record<string, string> {
  const c = color;
  const px = (n: number) => `${n}px`;
  return {
    // Backgrounds
    "--bg-base": c.bgBase,
    "--bg-surface": c.bgSurface,
    "--bg-elevated": c.bgElevated,
    "--bg-overlay": c.bgOverlay,
    // Borders
    "--border-subtle": c.borderSubtle,
    "--border-strong": c.borderStrong,
    "--border-accent": alpha(c.camel, 0.26),
    // Text
    "--text-primary": c.textPrimary,
    "--text-secondary": c.textSecondary,
    "--text-muted": c.textMuted,
    "--text-disabled": c.textDisabled,
    // Semantic warm accents
    "--accent-camel": c.camel,
    "--accent-tobacco": c.tobacco,
    "--accent-rust": c.rust,
    "--accent-ochre": c.ochre,
    "--accent-sage": c.sage,
    "--accent-eucalyptus": c.eucalyptus,
    "--accent-mauve": c.mauve,
    "--accent-brick": c.brick,
    // Legacy neon-era aliases → warm
    "--accent-cyan": c.camel,
    "--accent-cyan-dim": c.tobacco,
    "--accent-magenta": c.rust,
    "--accent-yellow": c.ochre,
    "--accent-green": c.sage,
    "--accent-red": c.brick,
    "--accent-violet": c.mauve,
    // Legacy namespace (SettingsPanel / GoalChain)
    "--surface-1": c.bgSurface,
    "--surface-2": c.bgElevated,
    "--text-1": c.textPrimary,
    "--text-2": c.textSecondary,
    "--accent": c.camel,
    // Emphasis tints (faint warm washes, no neon halos)
    "--glow-cyan": alpha(c.camel, 0.18),
    "--glow-magenta": alpha(c.rust, 0.16),
    "--glow-yellow": alpha(c.ochre, 0.16),
    "--glow-green": alpha(c.sage, 0.16),
    // Typography
    "--font-body": font.body,
    "--font-mono": font.mono,
    "--text-xs": px(fontSize.xs),
    "--text-sm": px(fontSize.sm),
    "--text-base": px(fontSize.base),
    "--text-md": px(fontSize.md),
    "--text-lg": px(fontSize.lg),
    "--text-xl": px(fontSize.xl),
    "--text-2xl": px(fontSize["2xl"]),
    "--text-3xl": px(fontSize["3xl"]),
    "--text-4xl": px(fontSize["4xl"]),
    // Spacing
    "--space-1": px(space[1]),
    "--space-2": px(space[2]),
    "--space-3": px(space[3]),
    "--space-4": px(space[4]),
    "--space-5": px(space[5]),
    "--space-6": px(space[6]),
    "--space-8": px(space[8]),
    "--space-10": px(space[10]),
    "--space-12": px(space[12]),
    "--space-16": px(space[16]),
    "--space-20": px(space[20]),
    // Radii
    "--radius-sm": px(radius.sm),
    "--radius-md": px(radius.md),
    "--radius-lg": px(radius.lg),
    "--radius-xl": px(radius.xl),
    // Shadows
    "--shadow-card": shadow.card,
    "--shadow-elevated": shadow.elevated,
    "--shadow-glow-cyan": `0 0 0 1px ${alpha(c.camel, 0.26)}, 0 10px 28px -12px ${alpha(c.camel, 0.18)}`,
    // Transitions (legacy named) + motion primitives (for the motion language)
    "--t-fast": `${motion.durFast}ms ease`,
    "--t-base": `${motion.durBase}ms ease`,
    "--t-slow": `${motion.durSlow}ms ease`,
    "--dur-fast": `${motion.durFast}ms`,
    "--dur-base": `${motion.durBase}ms`,
    "--dur-slow": `${motion.durSlow}ms`,
    "--dur-boot": `${motion.durBoot}ms`,
    "--ease-standard": motion.easeStandard,
    "--ease-out": motion.easeOut,
    // Widget kit aliases
    "--widget-bg": c.widgetBg,
    "--widget-bg-elevated": c.widgetBgElevated,
    "--widget-bg-soft": alpha(c.camel, 0.04),
    "--widget-border": c.borderSubtle,
    "--widget-border-strong": c.borderStrong,
    "--widget-text": c.textPrimary,
    "--widget-text-dim": c.textSecondary,
    "--widget-text-muted": c.textMuted,
    "--widget-accent": c.camel,
    "--widget-accent-dim": c.tobacco,
    "--widget-accent-glow": alpha(c.camel, 0.18),
    "--widget-success": c.sage,
    "--widget-warn": c.ochre,
    "--widget-danger": c.brick,
    "--widget-chart-1": c.camel,
    "--widget-chart-2": c.rust,
    "--widget-chart-3": c.eucalyptus,
    "--widget-chart-4": c.sage,
    "--widget-chart-5": c.mauve,
    "--widget-radius": px(radius.md),
    "--widget-radius-sm": px(radius.sm),
    "--widget-shadow": shadow.card,
    "--widget-shadow-elevated": shadow.elevated,
    "--widget-canvas-max-h": "min(52vh, 360px)",
  };
}

export function injectDesignTokens(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = buildVars();
  for (const name in vars) root.style.setProperty(name, vars[name]);
}
