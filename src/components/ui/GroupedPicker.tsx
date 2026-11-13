"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./Icon";

export type PickerGroup = { group: string; icon?: IconName; options: string[] };

type GroupedPickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  groups: PickerGroup[];
  placeholder?: string;
  /** Label of the empty choice ("No category"); leave out to not offer one. */
  emptyLabel?: string;
  searchPlaceholder?: string;
};

/**
 * A modern single-choice dropdown: searchable, grouped under headings, keyboard friendly
 * (↑ ↓ to move, Enter to pick, Esc to close). A listbox for screen readers.
 */
export function GroupedPicker({
  id,
  value,
  onChange,
  groups,
  placeholder = "Choose…",
  emptyLabel,
  searchPlaceholder = "Search…",
}: GroupedPickerProps) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => groups.map((g) => ({ ...g, options: g.options.filter((o) => !q || o.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)) })).filter((g) => g.options.length),
    [groups, q],
  );
  // Every choice in order, for the keyboard ("" = the empty choice).
  const flat = useMemo(() => [...(emptyLabel && !q ? [""] : []), ...filtered.flatMap((g) => g.options)], [filtered, emptyLabel, q]);
  const groupOf = groups.find((g) => g.options.includes(value))?.group;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    search.current?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    setQuery("");
    setActive(Math.max(0, flat.indexOf(value)));
    setOpen(true);
  };
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[active] !== undefined) pick(flat[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  let index = emptyLabel && !q ? 1 : 0;

  return (
    <div className={cn("gpicker", open && "gpicker--open")} ref={root} onKeyDown={onKeyDown}>
      <button
        id={id}
        type="button"
        className="gpicker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        {value ? (
          <span className="gpicker__value">
            <span className="gpicker__label">{value}</span>
            {groupOf && <span className="gpicker__group">{groupOf}</span>}
          </span>
        ) : (
          <span className="gpicker__placeholder">{placeholder}</span>
        )}
        <Icon name="chevronDown" size={16} className="gpicker__chevron" />
      </button>

      {open && (
        <div className="gpicker__panel">
          <label className="gpicker__search">
            <Icon name="search" size={15} />
            <input
              ref={search}
              type="text"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              aria-activedescendant={flat[active] !== undefined ? `${listId}-${active}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
            />
          </label>
          <div className="gpicker__list" id={listId} role="listbox" aria-label={placeholder}>
            {emptyLabel && !q && (
              <Option id={`${listId}-0`} index={0} label={emptyLabel} muted selected={!value} active={active === 0} onPick={() => pick("")} onHover={setActive} />
            )}
            {filtered.map((g) => (
              <div key={g.group} role="group" aria-label={g.group} className="gpicker__groupbox">
                <div className="gpicker__heading" aria-hidden="true">
                  {g.icon && <Icon name={g.icon} size={13} />}
                  {g.group}
                </div>
                {g.options.map((o) => {
                  const i = index++;
                  return (
                    <Option
                      key={o}
                      id={`${listId}-${i}`}
                      index={i}
                      label={o}
                      query={q}
                      selected={o === value}
                      active={active === i}
                      onPick={() => pick(o)}
                      onHover={setActive}
                    />
                  );
                })}
              </div>
            ))}
            {!flat.length && <div className="gpicker__empty">No matches for “{query.trim()}”.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Option({
  id,
  index,
  label,
  query,
  selected,
  active,
  muted,
  onPick,
  onHover,
}: {
  id: string;
  index: number;
  label: string;
  query?: string;
  selected: boolean;
  active: boolean;
  muted?: boolean;
  onPick: () => void;
  onHover: (i: number) => void;
}) {
  // Bold the part that matches the search.
  const at = query ? label.toLowerCase().indexOf(query) : -1;
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      data-index={index}
      className={cn("gpicker__option", active && "is-active", muted && "is-muted")}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      onMouseEnter={() => onHover(index)}
    >
      <span className="u-grow">
        {at >= 0 ? (
          <>
            {label.slice(0, at)}
            <mark>{label.slice(at, at + query!.length)}</mark>
            {label.slice(at + query!.length)}
          </>
        ) : (
          label
        )}
      </span>
      {selected && <Icon name="check" size={15} strokeWidth={2.4} className="gpicker__check" />}
    </div>
  );
}
