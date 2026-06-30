/**
 * ASCII luminance-field toolkit — the substrate for the A-FINE "custom display"
 * widgets (rotating donut, embedding heatmaps). Custom displays that aren't
 * standard charts render as ASCII art for coherence with the terminal identity;
 * see context/notes/visual-identity.md.
 */
export * from "./field";
export * from "./donut";
export { AsciiField, type AsciiFieldProps } from "./AsciiField";
