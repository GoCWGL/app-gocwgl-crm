"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Same limit as the API. */
export const MAX_CODE_LENGTH = 40;

/** Tag colors a client can pick (same list as the API). */
export const TAG_COLORS = ["blue", "green", "amber", "red", "purple", "pink", "teal", "gray"] as const;
export type TagColor = (typeof TAG_COLORS)[number];
export type TimeTag = { id: string; name: string; color: TagColor; addedBy?: string | null };

/** Project codes used before, most used first: offered as suggestions. */
export function codeSuggestions(entries: Array<{ projectCode?: string }>): string[] {
  const m = new Map<string, number>();
  entries.forEach((e) => e.projectCode && m.set(e.projectCode, (m.get(e.projectCode) ?? 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1]).map(([v]) => v).slice(0, 30);
}

/**
 * The client's tags, picked from a list. Type to search; a name that isn't there yet can be added to the client's list
 * (`onCreate`), and the client sees who added it. Each click saves straight away, so it works on a running timer.
 */
export function TagPicker({
  options,
  value,
  onChange,
  clientName,
  disabled = false,
  onCreate,
}: {
  options: TimeTag[];
  value: string[];
  onChange: (tags: string[]) => void;
  clientName: string;
  disabled?: boolean;
  /** Add a new tag to the client's list; resolves with its saved name. */
  onCreate?: (name: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const colorOf = (name: string) => options.find((o) => o.name === name)?.color ?? "gray";
  const toggle = (name: string) => onChange(value.includes(name) ? value.filter((t) => t !== name) : [...value, name]);
  const term = q.trim().replace(/\s+/g, " ");
  const list = term ? options.filter((o) => o.name.toLowerCase().includes(term.toLowerCase())) : options;
  const exact = options.some((o) => o.name.toLowerCase() === term.toLowerCase());
  const create = async () => {
    if (!onCreate || !term || exact || creating) return;
    setCreating(true);
    setError("");
    try {
      const name = await onCreate(term);
      onChange([...value, name]);
      setQ("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add that tag.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="tl-pick" ref={box}>
      {value.map((t) => (
        <span key={t} className={`tl-tag tl-tag--${colorOf(t)}`}>
          {t}
          {!disabled && (
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => toggle(t)}>
              <Icon name="close" size={10} />
            </button>
          )}
        </span>
      ))}
      <button type="button" className="tl-pick__btn" aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((o) => !o)}>
        <Icon name="tag" size={13} /> {value.length ? "Tags" : "Add tags"}
      </button>
      {open && (
        <div className="tl-pick__menu" role="listbox" aria-label="Tags" aria-multiselectable="true">
          <p className="tl-pick__title">{clientName}’s tags</p>
          {(onCreate || options.length > 6) && (
            <input
              className="tl-pick__search"
              autoFocus
              value={q}
              maxLength={30}
              placeholder={onCreate ? "Search or add a tag" : "Search tags"}
              aria-label={onCreate ? "Search or add a tag" : "Search tags"}
              onChange={(e) => (setQ(e.target.value), setError(""))}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const hit = list.find((o) => o.name.toLowerCase() === term.toLowerCase()) ?? (list.length === 1 ? list[0] : null);
                if (hit) {
                  toggle(hit.name);
                  setQ("");
                } else create();
              }}
            />
          )}
          {list.length ? (
            <ul>
              {list.map((o) => {
                const on = value.includes(o.name);
                return (
                  <li key={o.id}>
                    <button type="button" role="option" aria-selected={on} className={cn("tl-pick__item", on && "is-on")} onClick={() => toggle(o.name)}>
                      <span className={`tl-dot tl-dot--${o.color}`} aria-hidden="true" />
                      <span className="u-grow">{o.name}</span>
                      {on && <Icon name="check" size={14} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            !term && (
              <p className="tl-pick__empty">
                No tags yet.{onCreate ? " Add the first one above; " : " "}
                {clientName} can add them in their VA tracker too.
              </p>
            )
          )}
          {onCreate && term && !exact && (
            <button type="button" className="tl-pick__create" onClick={create} disabled={creating}>
              <Icon name="plus" size={13} /> {creating ? "Adding…" : <>Add “{term}” to {clientName}’s tags</>}
            </button>
          )}
          {error && (
            <p className="tl-pick__error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** The client's project or job code. Saves on Enter or when you leave the box. Uncontrolled: give it a `key` to start over. */
export function ProjectCodeInput({
  initial,
  onCommit,
  suggestions = [],
  compact = false,
  id,
}: {
  initial: string;
  onCommit: (code: string) => void;
  suggestions?: string[];
  compact?: boolean;
  id?: string;
}) {
  const [value, setValue] = useState(initial);
  const listId = useId();
  const save = () => value.trim() !== initial.trim() && onCommit(value.trim());
  return (
    <label className={cn("tl-code", compact && "tl-code--compact", value && "has-value")}>
      <Icon name="hash" size={13} />
      <input
        id={id}
        list={suggestions.length ? listId : undefined}
        value={value}
        maxLength={MAX_CODE_LENGTH}
        placeholder="Project code"
        aria-label="Project code"
        size={Math.max(12, value.length + 1)}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </label>
  );
}

/** Read-only: the project code and tags on an entry (VA list and the client's VA tracker). */
export function EntryLabelChips({ tags, projectCode, colors }: { tags?: string[]; projectCode?: string; colors?: Map<string, TagColor> }) {
  if (!projectCode && !tags?.length) return null;
  return (
    <span className="tl-chips">
      {projectCode && (
        <span className="tl-chip tl-chip--code" title="Project code">
          <Icon name="hash" size={11} />
          {projectCode}
        </span>
      )}
      {tags?.map((t) => (
        <span key={t} className={`tl-chip tl-chip--${colors?.get(t) ?? "gray"}`}>
          {t}
        </span>
      ))}
    </span>
  );
}
