import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneClass, type Tone } from "@/lib/tones";

type BadgeProps = {
  tone?: Tone;
  /** Show a small colored dot before the text. */
  dot?: boolean;
  /** Uppercase monospace style ("LIVE", "CONNECTED"). */
  mono?: boolean;
  size?: "xs" | "md" | "lg";
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = "neutral", dot, mono, size = "md", className, children }: BadgeProps) {
  return (
    <span className={cn("badge", toneClass(tone), mono && "badge--mono", size !== "md" && `badge--${size}`, className)}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Small square counter used next to nav items and column titles. */
export function CountChip({ tone, children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("count-chip", toneClass(tone))}>{children}</span>;
}
