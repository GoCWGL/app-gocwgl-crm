import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Small monospace count after the label. */
  count?: number | string;
};

type SegmentedControlProps<T extends string> = {
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** "tabs" uses role=tablist; "radio" uses role=radiogroup; default is a pressed-button group. */
  kind?: "group" | "tabs" | "radio";
  /** "dark" = white track with a dark selected button; "soft" = tinted track, white selected. */
  variant?: "dark" | "soft";
  size?: "sm" | "md";
  className?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  kind = "group",
  variant = "dark",
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const role = kind === "tabs" ? "tablist" : kind === "radio" ? "radiogroup" : "group";

  return (
    <div
      className={cn("segmented", variant === "soft" && "segmented--soft", size === "sm" && "segmented--sm", className)}
      role={role}
      aria-label={label}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        const stateProps =
          kind === "tabs"
            ? { role: "tab", "aria-selected": on }
            : kind === "radio"
              ? { role: "radio", "aria-checked": on }
              : { "aria-pressed": on };
        return (
          <button
            key={opt.value}
            type="button"
            className="segmented__item"
            onClick={() => onChange(opt.value)}
            {...stateProps}
          >
            {opt.label}
            {opt.count !== undefined && <span className="segmented__count">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
