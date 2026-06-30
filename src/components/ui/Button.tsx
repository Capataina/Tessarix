import { forwardRef, type ButtonHTMLAttributes } from "react";
import "./Button.css";

type Variant = "solid" | "ghost" | "hairline";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * The one button. Token-driven, animated (hover lift + press settle within
 * --dur-fast), reduced-motion-gated by the shared motion CSS. Every button in
 * the app routes through here so press/hover feel is consistent and a single
 * edit restyles them all. See context/plans/component-system.md.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "hairline", size = "md", className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      data-variant={variant}
      data-size={size}
      className={`ui-button${className ? ` ${className}` : ""}`}
      {...rest}
    />
  ),
);
Button.displayName = "Button";

export interface IconButtonProps extends ButtonProps {
  /** Accessible label — required, since the content is an icon glyph. */
  "aria-label": string;
}

/** A square icon button (frame corner controls, drawer handles). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, ...rest }, ref) => (
    <Button
      ref={ref}
      className={`ui-icon-button${className ? ` ${className}` : ""}`}
      {...rest}
    />
  ),
);
IconButton.displayName = "IconButton";
