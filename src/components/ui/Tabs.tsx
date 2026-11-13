"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { toneClass, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./Icon";

export type TabOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** A short line under the label ("Paying now"). */
  hint?: ReactNode;
  icon?: IconName;
  /** Color of the icon, count and underline (default: brand orange). */
  tone?: Tone;
  /** Shown in a pill after the label; "–" while loading. */
  count?: number | string;
};

export type TabsProps<T extends string> = {
  options: Array<TabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the tab list. */
  label: string;
  className?: string;
};

/**
 * The app's tabs: underlined, each with an optional icon, hint and count in the tab's color.
 * Arrow keys (and Home / End) move between tabs.
 */
export function Tabs<T extends string>({ options, value, onChange, label, className }: TabsProps<T>) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.value === value);
    const next =
      e.key === "ArrowRight" ? (i + 1) % options.length
      : e.key === "ArrowLeft" ? (i - 1 + options.length) % options.length
      : e.key === "Home" ? 0
      : e.key === "End" ? options.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <div className={cn("tabs", className)} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={cn("tabs__tab", toneClass(o.tone ?? "brand"), !o.hint && "tabs__tab--compact")}
            onClick={() => onChange(o.value)}
          >
            {o.icon && (
              <span className="tabs__icon" aria-hidden="true">
                <Icon name={o.icon} size={15} strokeWidth={2} />
              </span>
            )}
            <span className="tabs__text">
              <span className="tabs__label">{o.label}</span>
              {o.hint && <span className="tabs__hint">{o.hint}</span>}
            </span>
            {o.count !== undefined && <span className="tabs__count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
