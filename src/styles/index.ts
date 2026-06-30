/**
 * Public API for the Tessarix design system. Import tokens and derived helpers
 * from here in any widget or component:
 *
 *   import { color, font, divergingColor, sequentialWarm, alpha } from "@/styles";
 *
 * CSS consumes the same values via custom properties written by
 * injectDesignTokens() (called once in main.tsx before render).
 */
export * from "./tokens";
export * from "./derived";
export { injectDesignTokens } from "./inject";
