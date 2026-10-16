import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneClass, type Tone } from "@/lib/tones";

type ProgressBarProps = {
  /** 0–100 */
  value: number;
  /** "glow" = cyan→violet→orange, "sweep" = cyan→orange, "solid" = tone color. */
  variant?: "solid" | "glow" | "sweep";
  tone?: Tone;
  /** Any CSS color, for data-driven bars (funnel steps, sources). */
  color?: string;
  size?: "xs" | "sm" | "md" | "default" | "lg";
  label?: string;
  className?: string;
};

export function ProgressBar({ value, variant = "solid", tone, color, size = "default", label, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const style = { "--progress": `${pct}%`, ...(color ? { "--tone-solid": color } : {}) } as CSSProperties;

  return (
    <div
      className={cn(
        "progress",
        variant !== "solid" && `progress--${variant}`,
        size !== "default" && `progress--${size}`,
        toneClass(tone),
        className,
      )}
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuenow={label ? pct : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      style={style}
    >
      <div className="progress__fill" />
    </div>
  );
}

type BarRowProps = {
  label: string;
  /** Text on the right, e.g. "46 · 12%". */
  value: ReactNode;
  percent: number;
  color?: string;
  tone?: Tone;
};

/** Label + value line above a horizontal bar (funnels, lead sources). */
export function BarRow({ label, value, percent, color, tone }: BarRowProps) {
  return (
    <div className="bar-row">
      <div className="bar-row__head">
        <span className="bar-row__label">{label}</span>
        <span className="bar-row__value">{value}</span>
      </div>
      <ProgressBar value={percent} color={color} tone={tone} />
    </div>
  );
}
