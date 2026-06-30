/**
 * The widget descriptor — one manifest per widget, consumed by three systems:
 *   1. <WidgetExplainer>     → `description` (the live state caption)
 *   2. the fullscreen mini-lesson + concept index → `teaches` / `howToRead`
 *   3. the test harness       → `controls` (what to drive) + `invariants` (what to assert)
 *
 * Most standard controls (range inputs, buttons) are auto-discovered from the DOM
 * by the test harness, so `controls` only needs entries the DOM can't infer
 * (canvas drag-regions, or a slider whose semantics matter). `invariants` are
 * plain-English assertions a future harness can check structurally or by probe.
 *
 * See context/plans/testing-framework.md and context/plans/component-system.md.
 */

export type ControlKind =
  | "slider"
  | "button"
  | "drag"
  | "select"
  | "toggle"
  | "canvas";

export interface ControlSpec {
  kind: ControlKind;
  /** Human label for reports. */
  label: string;
  /** Optional CSS selector (relative to the widget root) to locate it. */
  selector?: string;
  /** For sliders the DOM can't fully describe. */
  min?: number;
  max?: number;
  step?: number;
}

export interface WidgetDescriptor {
  /** Stable widget name (mono label + prompt + telemetry key). */
  name: string;
  /** One-sentence "what this widget is" anchor (also feeds <WidgetExplainer>). */
  description: string;
  /** Concepts this widget teaches — feeds the concept index + the mini-lesson. */
  teaches?: string[];
  /** How to read the widget — feeds the fullscreen mini-lesson. */
  howToRead?: string;
  /** Interactive surface the DOM can't infer (drag regions, semantic sliders). */
  controls?: ControlSpec[];
  /** Plain-English invariants the test harness asserts. */
  invariants?: string[];
}
