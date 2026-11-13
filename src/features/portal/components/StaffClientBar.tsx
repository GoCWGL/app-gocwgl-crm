"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar, Icon } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { useSession } from "@/utils/auth/session";
import { useContact, useContactsPage } from "@/utils/hooks/useContacts";
import { usePortal } from "../state/PortalContext";

const label = (c: { company: string; name: string; email: string }) => c.company || c.name || c.email;

/**
 * The bar staff see at the top of the client portal (opened from the admin menu): whose portal this is,
 * a searchable client switcher, and whether they can act or only look.
 */
export function StaffClientBar() {
  const { user, embedded, viewAsClientId } = useSession();
  const { state, readOnly } = usePortal();
  const router = useRouter();
  const current = useContact(viewAsClientId ?? "").data;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const results = useContactsPage({ q: debounced, limit: 8 });
  if (!user?.isStaff || embedded || !viewAsClientId) return null;

  const pick = (id: string) => {
    setOpen(false);
    setQ("");
    if (id !== viewAsClientId) router.replace(`/portal?as=${encodeURIComponent(id)}&tab=${state.tab}`);
  };
  const items = results.data?.items ?? [];

  return (
    <div className="staff-va-bar staff-client-bar" role="status">
      <span className="staff-va-bar__label">
        <Icon name="eye" size={14} /> Viewing as
      </span>
      <div className="cp-switch" ref={box}>
        <button type="button" className="cp-switch__trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {current && <Avatar name={label(current)} tone={avatarTone(current.id)} size="sm" />}
          <span className="stack stack--0">
            <strong>{current ? label(current) : "Client"}</strong>
            {current?.company && current.name && <span className="text-tiny">{current.name}</span>}
          </span>
          <Icon name="chevronDown" size={14} />
        </button>
        {open && (
          <div className="cp-switch__menu">
            <label className="cp-switch__search">
              <Icon name="search" size={14} />
              <input autoFocus placeholder="Search clients by name, company or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" />
            </label>
            <ul role="listbox" aria-label="Clients">
              {items.map((c) => (
                <li key={c.id}>
                  <button type="button" role="option" aria-selected={c.id === viewAsClientId} className={cn("cp-switch__item", c.id === viewAsClientId && "is-current")} onClick={() => pick(c.id)}>
                    <Avatar name={label(c)} tone={avatarTone(c.id)} size="sm" />
                    <span className="stack stack--0 u-grow">
                      <strong>{label(c)}</strong>
                      <span className="text-tiny">{[c.company ? c.name : "", c.email].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="cp-switch__stage">{c.stage}</span>
                    {c.id === viewAsClientId && <Icon name="check" size={14} />}
                  </button>
                </li>
              ))}
              {results.isSuccess && !items.length && <li className="cp-switch__empty">No clients match “{debounced}”.</li>}
              {results.isPending && <li className="cp-switch__empty">Loading…</li>}
            </ul>
          </div>
        )}
      </div>
      <span className={cn("staff-va-bar__mode", readOnly && "is-readonly")}>
        {readOnly ? "View only for your role." : "You can do anything this client can. Changes are logged under your name."}
      </span>
    </div>
  );
}
