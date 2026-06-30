import type { ReactNode } from "react";
import { Drawer as Vaul } from "vaul";
import "./Drawer.css";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible (and visible) drawer title. */
  title: ReactNode;
  children: ReactNode;
}

/**
 * Bottom sheet on `vaul` — draggable (grab the handle to raise / lower /
 * dismiss). The mini-lesson surface. vaul owns the drag physics + snap; the CSS
 * adds the overlay fade and the terminal-pane chrome. Controlled so a widget can
 * own its open state.
 */
export function Drawer({ open, onOpenChange, title, children }: DrawerProps) {
  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange}>
      <Vaul.Portal>
        <Vaul.Overlay className="ui-drawer__overlay" />
        <Vaul.Content className="ui-drawer__content" aria-describedby={undefined}>
          <div className="ui-drawer__grip">
            <Vaul.Handle className="ui-drawer__handle" />
          </div>
          <Vaul.Title className="ui-drawer__title">{title}</Vaul.Title>
          <div className="ui-drawer__body">{children}</div>
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}
