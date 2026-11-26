"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

export type DropdownItem<T extends string> = {
  value: T;
  label: ReactNode;
  /** Right-aligned detail ("12h 30m"). */
  meta?: ReactNode;
  /** Shown before the label (a color dot, an icon). */
  lead?: ReactNode;
  /** A heading above this item. */
  section?: string;
};

type Props<T extends string> = {
  label: string;
  value: T;
  items: Array<DropdownItem<T>>;
  onChange: (value: T) => void;
  /** The button's contents. */
  children: ReactNode;
  className?: string;
  menuClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
  /** The trigger's id, so a <label htmlFor> can point at it. */
  id?: string;
};

/** A button that opens a list to pick one value from (Esc or a click outside closes it). */
export function Dropdown<T extends string>({ label, value, items, onChange, children, className, menuClassName, align = "left", disabled, id }: Props<T>) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const listId = useId();

  // Inside a scrolling pop-up the list can open below the fold: bring it into view.
  useEffect(() => {
    if (open) menu.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    // Escape closes just the list, not a pop-up it sits in (that listens on window, after this).
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className={cn("dropdown", className)} ref={root}>
      <button
        type="button"
        id={id}
        className="dropdown__trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
        <Icon name="chevronDown" size={14} className="dropdown__chev" />
      </button>
      {open && (
        <ul ref={menu} id={listId} role="listbox" aria-label={label} className={cn("dropdown__menu", align === "right" && "is-right", menuClassName)}>
          {items.map((it) => (
            <li key={it.value} role="presentation">
              {it.section && <span className="dropdown__section">{it.section}</span>}
              <button
                type="button"
                role="option"
                aria-selected={it.value === value}
                className="dropdown__item"
                onClick={() => {
                  onChange(it.value);
                  setOpen(false);
                }}
              >
                {it.lead}
                <span className="dropdown__label">{it.label}</span>
                {it.meta && <span className="dropdown__meta">{it.meta}</span>}
                {it.value === value && <Icon name="check" size={13} className="dropdown__tick" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
