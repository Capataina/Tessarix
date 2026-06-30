/**
 * Globalised component primitives — token-driven, animated, accessible (Radix /
 * vaul under the hood). Every chrome element routes through these so the app is
 * coherent by construction and a single edit restyles everything. The bespoke
 * learning widgets are NOT here; they live in components/widgets and sit inside a
 * <WidgetFrame>. See context/plans/component-system.md.
 */
export { Button, IconButton, type ButtonProps } from "./Button";
export { Tooltip, type TooltipProps } from "./Tooltip";
export { Drawer, type DrawerProps } from "./Drawer";
