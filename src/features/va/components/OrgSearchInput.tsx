"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { OrgKind } from "@/utils/api/vaPortal";
import { useOrgLookup } from "@/utils/hooks/useVaPortal";

type Props = {
  id: string;
  /** highschool: high and secondary schools in `country`. */
  kind: OrgKind;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  /** Places in this country are suggested first. */
  country?: string;
};

/**
 * A company or school name with suggestions searched online as you type. Any name can still be typed:
 * small agencies and local schools aren't always listed.
 */
export function OrgSearchInput({ id, kind, value, onChange, placeholder, maxLength = 120, invalid, country = "" }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");
  const blurTimer = useRef<number | undefined>(undefined);

  // Search a moment after typing stops, not on every key.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(value), 250);
    return () => window.clearTimeout(t);
  }, [value]);

  const lookup = useOrgLookup(kind, open ? query : "", country);
  const items = lookup.data ?? [];
  // Nothing to suggest once the name typed is the only match.
  const settled = items.length === 1 && items[0].name.toLowerCase() === value.trim().toLowerCase();
  const show = open && value.trim().length >= 2 && !settled && (items.length > 0 || lookup.isFetching);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setActive(-1);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter" && active >= 0 && items[active]) {
      e.preventDefault();
      choose(items[active].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="org-search">
      <span className="org-search__icon" aria-hidden="true">
        <Icon name={kind === "company" ? "building" : "graduation"} size={14} />
      </span>
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          window.clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        // Let a click on a suggestion land before the list closes.
        onBlur={() => (blurTimer.current = window.setTimeout(() => setOpen(false), 150))}
        onKeyDown={onKey}
      />
      {show && (
        <ul className="org-search__list" id={listId} role="listbox">
          {items.length === 0 && <li className="org-search__status">Searching…</li>}
          {items.map((o, i) => (
            <li
              key={`${o.name}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={cn("org-search__item", i === active && "is-active")}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.name)}
            >
              <strong>{o.name}</strong>
              {o.description && <span>{o.description}</span>}
            </li>
          ))}
          {items.length > 0 && <li className="org-search__status">Not listed? Just type the full name.</li>}
        </ul>
      )}
    </div>
  );
}
