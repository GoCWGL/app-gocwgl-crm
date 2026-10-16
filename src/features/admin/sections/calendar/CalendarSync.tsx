"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Avatar, Badge, Button, Checkbox, Field, Input, Select } from "@/components/ui";
import { CALENDAR_PROVIDERS, type CalendarConnection, type CalendarProvider } from "@/data/admin";
import { cn, copyToClipboard } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";

/** Two-way sync with Google, Outlook, Apple and other calendars. */
export function CalendarSync() {
  const { state } = useAdmin();
  const connections = state.calendarConnections;
  const [writeTo, setWriteTo] = useState("google");
  const [copied, setCopied] = useState(false);

  const writable = CALENDAR_PROVIDERS.filter((p) => connections[p.id]?.connected && !p.readOnly);
  const writeId = writable.some((p) => p.id === writeTo) ? writeTo : (writable[0]?.id ?? "");
  const feed = `https://${state.subdomain || "gocwgl"}.[yourplatform].com/calendar/feed-8f3k2.ics`;

  return (
    <div className="page-stack">
      <div className="card-row card-row--stretch">
        <div className="card card--tight sync-intro">
          <span className="kicker">HOW IT WORKS</span>
          <span className="text-body">
            Sync your own calendar (Google, Outlook, Apple or any other) both ways: busy times there block booking slots here, so you
            never get double-booked, and every new booking is added to your calendar with the meeting link and client details.
          </span>
        </div>
        <div className="card card--tight sync-target">
          <label className="kicker kicker--brand" htmlFor="cc-write">
            ADD NEW BOOKINGS TO
          </label>
          <Select
            id="cc-write"
            className="u-strong"
            value={writeId}
            onChange={(e) => setWriteTo(e.target.value)}
            options={
              writable.length
                ? writable.map((p) => ({ value: p.id, label: `${p.name} · ${connections[p.id].account}` }))
                : [{ value: "", label: "Only the CRM calendar" }]
            }
          />
          <span className="text-small">
            {writeId
              ? "Each booking appears in this calendar with the client’s name, email and meeting link."
              : "Connect a calendar to have bookings added to it automatically."}
          </span>
        </div>
      </div>

      <div className="provider-grid">
        {CALENDAR_PROVIDERS.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            connection={connections[p.id]}
            onConnected={() => {
              // The first calendar you connect becomes where new bookings are added.
              if (!writeId && !p.readOnly) setWriteTo(p.id);
            }}
          />
        ))}
      </div>

      <div className="card card--tight feed-card">
        <div className="stack stack--4 u-grow">
          <span className="kicker">SUBSCRIBE FROM ANY APP</span>
          <span className="text-body">Paste this link into any calendar app to see your CRM bookings there (read-only).</span>
          <span className="feed-card__url">{feed}</span>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            copyToClipboard(feed);
            setCopied(true);
          }}
        >
          {copied ? "Link copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

function ProviderCard({
  provider: p,
  connection,
  onConnected,
}: {
  provider: CalendarProvider;
  connection?: CalendarConnection;
  onConnected: () => void;
}) {
  const { update } = useAdmin();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const on = !!connection?.connected;

  const setConnection = (patch: Partial<CalendarConnection>) =>
    update((s) => ({ calendarConnections: { ...s.calendarConnections, [p.id]: { ...s.calendarConnections[p.id], ...patch } } }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const missing = p.fields.filter((f) => !(draft[f.key] ?? "").trim() && !f.label.includes("optional"));
    if (missing.length) return setError(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
    const serverField = p.fields.find((f) => f.key === "server");
    if (draft.server && serverField?.type === "url" && !/^https?:\/\//.test(draft.server.trim())) {
      return setError("The link should start with https://");
    }
    update((s) => ({
      calendarConnections: {
        ...s.calendarConnections,
        [p.id]: {
          connected: true,
          account: (draft.account || draft.server || "").trim(),
          conflicts: true,
          synced: "Synced just now",
          subs: p.readOnly
            ? [{ name: "Feed", on: true, color: "#10B981" }]
            : [
                { name: "Calendar", on: true, color: "#0891B2" },
                { name: "Work", on: true, color: "#7C3AED" },
              ],
        },
      },
    }));
    setEditing(false);
    setDraft({});
    onConnected();
  };

  return (
    <article className={cn("card card--tight provider-card", on && "provider-card--on", editing && "provider-card--editing")}>
      <div className="cluster cluster--nowrap">
        <Avatar text={p.initials} tone={p.tone} size="lg" square />
        <div className="stack stack--2 u-grow">
          <span className="text-strong">{p.name}</span>
          <span className="text-small">{p.desc}</span>
        </div>
      </div>
      <Badge tone={on ? "green" : "neutral"} mono dot>
        {on ? (p.readOnly ? "CONNECTED · READ ONLY" : "CONNECTED") : "NOT CONNECTED"}
      </Badge>

      {on && connection && (
        <div className="stack stack--8">
          <span className="provider-card__account">{connection.account}</span>
          <Checkbox
            brand
            label="Block times when I am busy here"
            checked={connection.conflicts}
            onChange={() => setConnection({ conflicts: !connection.conflicts })}
          />
          <div className="inset inset--soft provider-card__subs">
            <span className="kicker kicker--sm kicker--muted">CHECK THESE CALENDARS</span>
            {connection.subs.map((sub, i) => (
              <label className="check" key={sub.name}>
                <input
                  type="checkbox"
                  checked={sub.on}
                  onChange={() => setConnection({ subs: connection.subs.map((x, k) => (k === i ? { ...x, on: !x.on } : x)) })}
                />
                <span className="provider-card__swatch" style={{ "--swatch": sub.color } as CSSProperties} aria-hidden="true" />
                {sub.name}
              </label>
            ))}
          </div>
          <span className="text-small">{connection.synced}</span>
        </div>
      )}

      {editing && (
        <form className="provider-card__form" onSubmit={submit} autoComplete="off">
          <span className="text-small">{p.help}</span>
          {p.fields.map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`cc-${p.id}-${f.key}`}>
              <Input
                id={`cc-${p.id}-${f.key}`}
                type={f.type}
                mono
                size="sm"
                autoComplete="off"
                spellCheck={false}
                placeholder={f.placeholder}
                value={draft[f.key] ?? ""}
                onChange={(e) => {
                  setDraft({ ...draft, [f.key]: e.target.value });
                  setError("");
                }}
              />
            </Field>
          ))}
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
          <div className="cluster cluster--8 cluster--nowrap">
            <Button size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="primary" className="u-grow">
              {p.oauth ? `Continue to ${p.name.split(" ")[0]}` : "Connect calendar"}
            </Button>
          </div>
        </form>
      )}

      <div className="cluster cluster--8 cluster--nowrap provider-card__actions">
        {!on && !editing && (
          <Button
            variant="primary"
            block
            onClick={() => {
              setEditing(true);
              setError("");
            }}
          >
            {p.oauth ? `Sign in with ${p.name.split(" ")[0]}` : "Connect"}
          </Button>
        )}
        {on && (
          <>
            <Button variant="outline" size="sm" className="u-grow" onClick={() => setConnection({ synced: "Synced just now" })}>
              Sync now
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                update((s) => {
                  const next = { ...s.calendarConnections };
                  delete next[p.id];
                  return { calendarConnections: next };
                })
              }
            >
              Disconnect
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
