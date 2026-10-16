import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "accent"
  | "dark"
  | "cyan"
  | "soft"
  | "danger"
  | "danger-solid"
  | "dashed"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
};

/** Class names for a button look, so links (<a>, <label>) can share it. */
export function buttonClass({ variant = "secondary", size = "md", block, className }: ButtonStyleOptions = {}) {
  return cn("btn", `btn--${variant}`, size !== "md" && `btn--${size}`, block && "btn--block", className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleOptions;

export function Button({ variant, size, block, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size, block, className })} {...rest} />;
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  size?: "sm" | "md" | "lg";
  ghost?: boolean;
  danger?: boolean;
};

export function IconButton({ label, size = "md", ghost, danger, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "icon-btn",
        size !== "md" && `icon-btn--${size}`,
        ghost && "icon-btn--ghost",
        danger && "icon-btn--danger",
        className,
      )}
      {...rest}
    />
  );
}
