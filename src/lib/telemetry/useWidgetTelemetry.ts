/**
 * React hook for widgets to emit lifecycle and interaction telemetry.
 *
 * Adopting a new widget:
 *   const { recordInteraction } = useWidgetTelemetry("MatrixInverse");
 *   // ... on a state-changing user action:
 *   recordInteraction("slider", { matrix_entry: "a", value });
 *
 * On mount, the hook emits a `widget_mount` event. On unmount, it emits
 * `widget_unmount` with dwell time and total interaction count. The
 * `recordInteraction` callback emits a `widget_interact` event with a
 * structured `action` discriminator and a free-form `detail` payload.
 *
 * The hook deliberately has a tiny surface area — most widgets will pass
 * the widget name and call `recordInteraction` from one or two places.
 * Bigger widgets can ignore `recordInteraction` if the existing emitters
 * (answer_select, goal_state, slider-on-state-change, etc.) already
 * cover their interaction surface.
 */

import { useCallback, useEffect, useRef } from "react";
import { emit as emitTelemetry } from ".";

export interface UseWidgetTelemetryResult {
  /** Emit a widget_interact event tagged with the supplied action. */
  recordInteraction: (
    action: string,
    detail?: Record<string, string | number | boolean>,
  ) => void;
}

export function useWidgetTelemetry(widget: string): UseWidgetTelemetryResult {
  const mountedAtRef = useRef<number>(0);
  const interactionsRef = useRef<number>(0);

  useEffect(() => {
    mountedAtRef.current = performance.now();
    emitTelemetry({ kind: "widget_mount", data: { widget } });
    return () => {
      const dwellMs = Math.round(performance.now() - mountedAtRef.current);
      emitTelemetry({
        kind: "widget_unmount",
        data: {
          widget,
          dwell_ms: dwellMs,
          interactions: interactionsRef.current,
        },
      });
    };
  }, [widget]);

  const recordInteraction = useCallback(
    (
      action: string,
      detail?: Record<string, string | number | boolean>,
    ) => {
      interactionsRef.current += 1;
      emitTelemetry({
        kind: "widget_interact",
        data: { widget, action, detail },
      });
    },
    [widget],
  );

  return { recordInteraction };
}
