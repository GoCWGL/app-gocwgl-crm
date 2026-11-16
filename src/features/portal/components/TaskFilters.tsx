"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";

/** The Tasks pages' filter bar (client portal and VA portal): tabs and search on top, filters below. */
export function TaskBar({ top, filters }: { top: ReactNode; filters: ReactNode }) {
  return (
    <div className="tk-bar">
      <div className="tk-bar__top">{top}</div>
      <div className="tk-bar__filters">{filters}</div>
    </div>
  );
}

/** Open / Done / … as tabs with counts. */
export function TaskTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; count: number }>;
}) {
  return (
    <div className="tk-tabs" role="tablist" aria-label="Tasks">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={cn("tk-tabs__tab", value === o.value && "is-on")} onClick={() => onChange(o.value)}>
          {o.label}
          <span className="tk-tabs__count">{o.count}</span>
        </button>
      ))}
    </div>
  );
}

/** Search the tasks by title, details or name. */
export function TaskSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="tk-search">
      <Icon name="search" size={15} />
      <input type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" className="tk-search__clear" aria-label="Clear search" onClick={() => onChange("")}>
          <Icon name="close" size={12} />
        </button>
      )}
    </label>
  );
}

/** A compact filter: an icon, a small label and its choice (a native select, so it works everywhere). */
export function TaskFilter<T extends string>({
  icon,
  label,
  value,
  onChange,
  options,
  active,
}: {
  icon: IconName;
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  /** Highlighted when it narrows the list. */
  active?: boolean;
}) {
  return (
    <label className={cn("tk-filter", active && "is-active")}>
      <Icon name={icon} size={14} />
      <span className="tk-filter__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={12} className="tk-filter__chev" />
    </label>
  );
}

/** Lower-case text of a task for the search box. */
export const taskText = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" ").toLowerCase();
