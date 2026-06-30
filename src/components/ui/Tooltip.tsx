import type { ReactNode } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import "./Tooltip.css";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayMs?: number;
}

/**
 * Token-driven tooltip on Radix's headless primitive. Animated in/out via the
 * data-state attribute (see Tooltip.css). Self-contained provider so callers
 * can drop a single <Tooltip> anywhere without wiring a root provider.
 */
export function Tooltip({ content, children, side = "top", delayMs = 250 }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayMs}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content className="ui-tooltip" side={side} sideOffset={6}>
            {content}
            <RadixTooltip.Arrow className="ui-tooltip__arrow" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
