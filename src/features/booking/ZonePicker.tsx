"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { browserZone, offsetLabel, zoneOptions } from "./zones";

type Zone = { value: string; city: string; region: string; offset: string };

const toZone = (value: string): Zone => {
  const parts = value.split("/");
  return {
    value,
    city: (parts.at(-1) ?? value).replace(/_/g, " "),
    region: parts.length > 1 ? parts.slice(0, -1).join(" / ").replace(/_/g, " ") : "",
    offset: offsetLabel(value),
  };
};

const clock = (zone: string, now: Date) => new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(now);

/** The current time, refreshed every 30 seconds while mounted. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * Time zone picker for the booking page: shows the zone and its local time; opens a searchable list (upward, so it
 * stays inside the booking box) with the visitor's and the business's zones first. Keyboard: arrows, Enter, Escape.
 */
export function ZonePicker({ value, businessZone, onChange }: { value: string; businessZone: string; onChange: (zone: string) => void }) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const own = browserZone(businessZone);

  const all = useMemo(() => zoneOptions([own, businessZone, value]).map((o) => toZone(o.value)), [own, businessZone, value]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return all.filter((z) => `${z.value} ${z.city} ${z.offset}`.toLowerCase().replace(/_/g, " ").includes(q));
    const pinned = [...new Set([own, businessZone])].map(toZone);
    return [...pinned, ...all.filter((z) => !pinned.some((p) => p.value === z.value))];
  }, [all, query, own, businessZone]);
  const current = toZone(value);

  // Close on a click outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Opening: focus the search and scroll to the selected zone (highlighted by toggle()).
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
  }, [open]);

  const toggle = () => {
    if (!open) setActive(Math.max(0, shown.findIndex((z) => z.value === value)));
    setOpen(!open);
  };

  const choose = (zone: string) => {
    onChange(zone);
    setOpen(false);
    setQuery("");
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "Enter" && shown[active]) {
      e.preventDefault();
      return choose(shown[active].value);
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const next = Math.min(shown.length - 1, Math.max(0, active + (e.key === "ArrowDown" ? 1 : -1)));
    setActive(next);
    list.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };

  const tag = (zone: string) => (zone === own ? "Your time zone" : zone === businessZone ? "Business time zone" : "");

  return (
    <div className={cn("zone-picker", open && "zone-picker--open")} ref={root}>
      <span className="zone-picker__label" id={`${listId}-label`}>
        <Icon name="globe" size={15} className="zone-picker__globe" />
        Time zone
      </span>
      <button
        type="button"
        className="zone-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label`}
        onClick={toggle}
      >
        <span className="zone-picker__main">
          <span className="zone-picker__city">{current.city}</span>
          <span className="zone-picker__sub">
            {current.offset} · {clock(value, now)}
            {tag(value) && <span className="zone-picker__tag">{tag(value)}</span>}
          </span>
        </span>
        <Icon path="M6 9l6 6 6-6" size={18} className="zone-picker__chevron" />
      </button>

      {open && (
        <div className="zone-picker__panel" onKeyDown={onKey}>
          <div className="zone-picker__search">
            <Icon name="search" size={15} />
            <input
              ref={search}
              type="text"
              placeholder="Search a city or GMT offset"
              value={query}
              role="combobox"
              aria-controls={listId}
              aria-expanded
              aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                list.current?.scrollTo({ top: 0 });
              }}
            />
          </div>
          <ul className="zone-picker__list" role="listbox" id={listId} ref={list} aria-labelledby={`${listId}-label`}>
            {shown.map((z, i) => (
              <li
                key={z.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={z.value === value}
                className={cn("zone-picker__option", i === active && "zone-picker__option--active")}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(z.value)}
              >
                <span className="zone-picker__main">
                  <span className="zone-picker__city">
                    {z.city}
                    {tag(z.value) && <span className="zone-picker__tag">{tag(z.value)}</span>}
                  </span>
                  <span className="zone-picker__sub">{z.region || "—"}</span>
                </span>
                <span className="zone-picker__time">
                  <span>{clock(z.value, now)}</span>
                  <span className="zone-picker__offset">{z.offset}</span>
                </span>
                {z.value === value && <Icon name="check" size={16} className="zone-picker__check" />}
              </li>
            ))}
            {shown.length === 0 && <li className="zone-picker__empty">No time zone matches “{query}”.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
