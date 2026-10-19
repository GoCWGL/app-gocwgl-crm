"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Avatar, Badge, Button, Checkbox, Field, FormError, Input, LoadState, Select, SoonNote } from "@/components/ui";
import { CALENDAR_PROVIDERS, type CalendarProvider } from "@/data/admin";
import { cn } from "@/lib/utils";
import type { ConnectionOut, SubCalendar } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { formatRelative } from "@/utils/format/dates";
import {
  useCalendarConnections,
  useCreateCalendarConnection,
  useDeleteCalendarConnection,
  useUpdateCalendarConnection,
} from "@/utils/hooks/useCalendar";
import { useMe } from "@/utils/hooks/useUsers";

/**
 * Calendar connections. They save today, but syncing isn't built yet (backend F-1 / F-2), so busy
 * times don't block slots and bookings aren't written back. The page says so instead of faking it.
 */
export function CalendarSync() {
  const connections = useCalendarConnections();
  const canWrite = canWriteCrm(useMe().data);
  const byProvider = (id: string) => connections.data?.find((c) => c.provider === id);
  const writable = CALENDAR_PROVIDERS.filter((p) => byProvider(p.id) && !p.readOnly);

  return (
    <div className="page-stack">
      <div className="card-row card-row--stretch">
        <div className="card card--tight sync-intro">
          <span className="kicker">HOW IT WORKS</span>
          <span className="text-body">
            Connect your own calendar (Google, Outlook, Apple or any other). Once syncing is switched on, busy times there will block booking
            slots here and every new booking will be added to your calendar. <SoonNote>Syncing coming soon</SoonNote>
          </span>
        </div>
        <div className="card card--tight sync-target">
          <label className="kicker kicker--brand" htmlFor="cc-write">
            ADD NEW BOOKINGS TO
          </label>
          <Select
            id="cc-write"
            className="u-strong"
            disabled
            value={writable[0]?.id ?? ""}
            options={
              writable.length
                ? writable.map((p) => ({ value: p.id, label: `${p.name} · ${byProvider(p.id)?.account}` }))
                : [{ value: "", label: "Only the CRM calendar" }]
            }
          />
          <span className="text-small">
            Writing bookings into your own calendar is coming soon. Until then, bookings live in the CRM calendar.
          </span>
        </div>
      </div>

      <LoadState query={connections}>
        <div className="provider-grid">
          {CALENDAR_PROVIDERS.map((p) => (
            <ProviderCard key={p.id} provider={p} connection={byProvider(p.id)} canWrite={canWrite} />
          ))}
        </div>
      </LoadState>

      <div className="card card--tight feed-card">
        <div className="stack stack--4 u-grow">
          <span className="kicker">SUBSCRIBE FROM ANY APP</span>
          <span className="text-body">
            A read-only calendar link with your CRM bookings, for any calendar app. <SoonNote />
          </span>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({ provider: p, connection, canWrite }: { provider: CalendarProvider; connection?: ConnectionOut; canWrite: boolean }) {
  const create = useCreateCalendarConnection();
  const update = useUpdateCalendarConnection();
  const remove = useDeleteCalendarConnection();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const on = !!connection;
  const subs = (connection?.subCalendars ?? []) as SubCalendar[];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const missing = p.fields.filter((f) => !(draft[f.key] ?? "").trim() && !f.label.includes("optional"));
    if (missing.length) return setError(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
    create.mutate(
      {
        provider: p.id,
        account: (draft.account ?? "").trim(),
        server: (draft.server ?? "").trim(),
        secret: draft.secret ? draft.secret : null,
        checkConflicts: true,
      },
      {
        onSuccess: () => {
          setEditing(false);
          setDraft({});
        },
        onError: (err) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err)),
      },
    );
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
        {on ? (p.readOnly ? "SAVED · READ ONLY" : "SAVED") : "NOT CONNECTED"}
      </Badge>

      {on && connection && (
        <div className="stack stack--8">
          <span className="provider-card__account">{connection.account || connection.server}</span>
          <Checkbox
            brand
            label="Block times when I am busy here"
            checked={connection.checkConflicts}
            disabled={!canWrite || update.isPending}
            onChange={() => update.mutate({ id: connection.id, body: { checkConflicts: !connection.checkConflicts } })}
          />
          {subs.length > 0 && (
            <div className="inset inset--soft provider-card__subs">
              <span className="kicker kicker--sm kicker--muted">CHECK THESE CALENDARS</span>
              {subs.map((sub, i) => (
                <label className="check" key={sub.name}>
                  <input
                    type="checkbox"
                    checked={sub.on}
                    disabled={!canWrite || update.isPending}
                    onChange={() =>
                      update.mutate({ id: connection.id, body: { subCalendars: subs.map((x, k) => (k === i ? { ...x, on: !x.on } : x)) } })
                    }
                  />
                  <span className="provider-card__swatch" style={{ "--swatch": sub.color } as CSSProperties} aria-hidden="true" />
                  {sub.name}
                </label>
              ))}
            </div>
          )}
          <span className="text-small">
            {connection.syncedAt ? `Synced ${formatRelative(connection.syncedAt)}` : "Saved — syncing coming soon"}
          </span>
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
          {p.oauth && <span className="text-small">Signing in with {p.name.split(" ")[0]} is coming soon; this saves the account for now.</span>}
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
          <div className="cluster cluster--8 cluster--nowrap">
            <Button size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="primary" className="u-grow" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Save connection"}
            </Button>
          </div>
        </form>
      )}

      <FormError error={update.error ?? remove.error} />
      {canWrite && (
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
              Connect
            </Button>
          )}
          {on && connection && (
            <Button variant="danger" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(connection.id)}>
              Disconnect
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
