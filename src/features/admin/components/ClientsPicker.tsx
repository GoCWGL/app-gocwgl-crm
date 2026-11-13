"use client";

import { useDeferredValue, useState } from "react";
import { Avatar, Icon, Input } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { contactName } from "../lib/contacts";

/** Pick any number of clients: the chosen ones as chips, and a search box to add more. */
export function ClientsPicker({ value, onChange, id }: { value: string[]; onChange: (ids: string[]) => void; id?: string }) {
  const all = useAllContacts().data ?? [];
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const byId = new Map(all.map((c) => [c.id, c]));
  const chosen = new Set(value);
  const matches = q
    ? all.filter((c) => !chosen.has(c.id) && [contactName(c), c.company, c.email].some((x) => x?.toLowerCase().includes(q))).slice(0, 8)
    : [];
  const label = (cid: string) => {
    const c = byId.get(cid);
    return c ? c.company || contactName(c) : "Client";
  };

  return (
    <div className="clients-picker">
      {value.length > 0 && (
        <ul className="clients-picker__chosen">
          {value.map((cid) => (
            <li key={cid}>
              <Avatar name={label(cid)} tone={avatarTone(cid)} size="sm" />
              <span>{label(cid)}</span>
              <button type="button" aria-label={`Remove ${label(cid)}`} onClick={() => onChange(value.filter((x) => x !== cid))}>
                <Icon name="close" size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input id={id} placeholder="Search clients by name, email or business" value={query} onChange={(e) => setQuery(e.target.value)} />
      {matches.length > 0 && (
        <ul className="clients-picker__results" role="listbox" aria-label="Matching clients">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onChange([...value, c.id]);
                  setQuery("");
                }}
              >
                <Avatar name={contactName(c)} tone={avatarTone(c.id)} size="sm" />
                <span className="stack stack--0 u-grow">
                  <strong>{c.company || contactName(c)}</strong>
                  <span className="text-tiny">{[c.company ? contactName(c) : "", c.email].filter(Boolean).join(" · ")}</span>
                </span>
                <Icon name="plus" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && !matches.length && <span className="text-small">No clients match “{query.trim()}”.</span>}
    </div>
  );
}
