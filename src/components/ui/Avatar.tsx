import type { ReactNode } from "react";
import { cn, initials as toInitials } from "@/lib/utils";
import { toneClass, type Tone } from "@/lib/tones";

type AvatarProps = {
  /** Full name; initials are derived from it. */
  name?: string;
  /** Explicit text instead of initials. */
  text?: string;
  tone?: Tone;
  size?: "sm" | "default" | "md" | "lg" | "xl";
  ring?: boolean;
  /** Orange gradient (signed-in user). */
  brand?: boolean;
  square?: boolean;
  className?: string;
};

export function Avatar({ name, text, tone, size = "default", ring, brand, square, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "avatar",
        size !== "default" && `avatar--${size}`,
        ring && "avatar--ring",
        brand && "avatar--brand",
        square && "avatar--square",
        toneClass(tone),
        className,
      )}
      aria-hidden="true"
    >
      {text ?? (name ? toInitials(name) : "")}
    </span>
  );
}

type IconTileProps = {
  tone?: Tone;
  size?: "xs" | "sm" | "default" | "md" | "lg" | "xl";
  /** Orange gradient tile used in modal headers. */
  brand?: boolean;
  /** Children are short text (e.g. "PDF") rather than an icon. */
  text?: boolean;
  className?: string;
  children: ReactNode;
};

/** Rounded square holding an icon or short text, tinted by a tone. */
export function IconTile({ tone, size = "default", brand, text, className, children }: IconTileProps) {
  return (
    <span
      className={cn(
        "icon-tile",
        size !== "default" && `icon-tile--${size}`,
        brand && "icon-tile--brand",
        text && "icon-tile--text",
        toneClass(tone),
        className,
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
