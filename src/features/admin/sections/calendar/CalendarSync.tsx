"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Avatar, Badge, Button, Checkbox, Field, FormError, Input, LoadState, buttonClass } from "@/components/ui";
import { CALENDAR_PROVIDERS, legacyProvider, type CalendarProvider } from "@/data/admin";
import { cn } from "@/lib/utils";
import type { ConnectionCreate, ConnectionOut, SubCalendar } from "@/utils/api/models";
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
import { GoogleConnectButton } from "./GoogleConnectButton";

/** What the API shows for a Google calendar connected by signing in (instead of a pasted link). */
const GOOGLE_SIGNED_IN = "Connected with Google";

/**
 * Calendar sync. Google Calendar and any other calendar are read from their private iCal link every
 * 15 minutes, and the busy times block slots on every booking link; bookings reach your calendar as
 * emailed invites. Connections saved earlier for providers that don't sync can only be disconnected.
 */
export function CalendarSync() {
  const connections = useCalendarConnections();
  const canWrite = canWriteCrm(useMe().data);
  const byProvider = (id: string) => connections.data?.find((c) => c.provider === id);
  const legacy = (connections.data ?? []).filter((c) => !CALENDAR_PROVIDERS.some((p) => p.id === c.provider));

  return (
    <div className="page-stack">
      <div className="card-row card-row--stretch">
        <div className="card card--tight sync-intro">
          <span className="kicker">HOW IT WORKS</span>
          <span className="text-body">
            Connect Google Calendar or any calendar with an iCal link. Every 15 minutes we read when you are busy (never what the events are)
            and hide those times on every booking link, so nobody can book you while you are in another meeting.
          </span>
        </div>
        <div className="card card--tight sync-target">
          <span className="kicker kicker--brand">BOOKINGS IN YOUR CALENDAR</span>
          <span className="text-small">
            Every booking, reschedule and cancellation emails your team a calendar invite (.ics). Open it to add, move or remove the call in
            your calendar. It goes to whoever gets the “Call booked” alert in Settings. Guests get an invite with their confirmation too.
          </span>
        </div>
      </div>

      <LoadState query={connections}>
        <div className="provider-grid">
          {CALENDAR_PROVIDERS.map((p) => (
            <ProviderCard key={p.id} provider={p} connection={byProvider(p.id)} canWrite={canWrite} />
          ))}
          {legacy.map((c) => (
            <ProviderCard key={c.id} provider={legacyProvider(c.provider)} connection={c} canWrite={canWrite} />
          ))}
        </div>
      </LoadState>
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
        provider: p.id as ConnectionCreate["provider"],
        account: (draft.account ?? "").trim(),
        // Calendar apps label feed links webcal://; it is plain https underneath.
        server: (draft.server ?? "").trim().replace(/^webcal:\/\//i, "https://"),
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
        {on ? (p.available ? "CONNECTED · READ ONLY" : "NOT SYNCING") : "NOT CONNECTED"}
      </Badge>

      {on && connection && (
        <div className="stack stack--8">
          <span className="provider-card__account">
            {connection.server === GOOGLE_SIGNED_IN ? `${connection.account} · signed in with Google` : connection.account || connection.server}
          </span>
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
          {connection.syncError ? (
            <span className="field__error" role="alert">
              Last sync failed: {connection.syncError}
            </span>
          ) : (
            <span className="text-small">
              {connection.syncedAt
                ? `Synced ${formatRelative(connection.syncedAt)} · checks every 15 minutes`
                : p.available
                  ? "Syncing for the first time…"
                  : "This calendar doesn’t sync. Disconnect it and use Google Calendar or an iCal link."}
            </span>
          )}
        </div>
      )}

      {editing && (
        <form className="provider-card__form" onSubmit={submit} autoComplete="off">
          <span className="text-small">{p.help}</span>
          {p.steps && (
            <ol className="provider-card__steps text-small">
              {p.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {p.settingsUrl && (
            <a className={buttonClass({ variant: "outline", size: "sm" })} href={p.settingsUrl.href} target="_blank" rel="noopener noreferrer">
              {p.settingsUrl.label}
            </a>
          )}
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
            <Button type="submit" size="sm" variant="primary" className="u-grow" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Save connection"}
            </Button>
          </div>
        </form>
      )}

      <FormError error={update.error ?? remove.error} />
      {canWrite && !on && !editing && p.oauth && (
        <div className="stack stack--6 provider-card__actions">
          <GoogleConnectButton />
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setEditing(true);
              setError("");
            }}
          >
            Or paste the secret iCal address
          </Button>
        </div>
      )}
      {canWrite && on && connection?.server === GOOGLE_SIGNED_IN && connection.syncError && (
        <GoogleConnectButton label="Reconnect with Google" variant="outline" />
      )}
      {canWrite && (
        <div className="cluster cluster--8 cluster--nowrap provider-card__actions">
          {!on && !editing && p.available && !p.oauth && (
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
