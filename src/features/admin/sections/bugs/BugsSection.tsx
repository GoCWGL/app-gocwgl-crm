"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Field, FormError, IconButton, Input, LoadState, Select, StatGrid, Textarea } from "@/components/ui";
import {
  BUG_STATUSES,
  BUG_STATUS_TONES,
  SEVERITIES,
  SEVERITY_TONES,
  TICKET_TYPES,
  type BugSeverity,
  type BugStatus,
} from "@/data/admin";
import type { Tone } from "@/lib/tones";
import { cn, initials } from "@/lib/utils";
import type { TicketOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { addDaysIso, formatShort, getTimeZone, isoDateIn, todayIso } from "@/utils/format/dates";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { usePostTicketMessage, useTickets, useUpdateTicket } from "@/utils/hooks/useSupport";
import { useMe } from "@/utils/hooks/useUsers";
import { businessName } from "../../lib/contacts";

type DateFilter = "any" | "today" | "7" | "30" | "month" | "custom";

const SEVERITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const CLIENT_TONES: Tone[] = ["cyan", "purple", "orange", "green", "pink"];

const MESSAGE_CLASS: Record<string, string> = {
  client: "message",
  reply: "message message--mine",
  note: "message message--note",
};

const isClosed = (t: TicketOut) => t.status === "Done";

export function BugsSection() {
  const canWrite = canWriteCrm(useMe().data);
  const [type, setType] = useState("bug");
  const query = useTickets(type ? { type } : {});
  const tickets = query.data ?? [];
  const contacts = useAllContacts().data ?? [];
  const archived = useAllContacts({ archived: true }).data ?? [];
  const today = todayIso();

  const [search, setSearch] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState<"" | "open" | BugStatus>("open");
  const [severity, setSeverity] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [from, setFrom] = useState(addDaysIso(today, -30));
  const [to, setTo] = useState(today);
  const [selectedId, setSelectedId] = useState("");

  const clientName = (t: TicketOut) => {
    const c = contacts.find((x) => x.id === t.contactId) ?? archived.find((x) => x.id === t.contactId);
    return c ? businessName(c) : t.contactId ? "Client" : "No client";
  };
  const clients = Array.from(new Set(tickets.map(clientName)));
  const q = search.trim().toLowerCase();

  const inDateRange = (t: TicketOut) => {
    if (dateFilter === "any") return true;
    const d = isoDateIn(new Date(t.createdAt), getTimeZone());
    if (dateFilter === "today") return d === today;
    if (dateFilter === "7") return d >= addDaysIso(today, -6) && d <= today;
    if (dateFilter === "30") return d >= addDaysIso(today, -29) && d <= today;
    if (dateFilter === "month") return d >= today.slice(0, 8) + "01" && d <= today;
    return (!from || d >= from) && (!to || d <= to);
  };

  const rows = tickets
    .filter(
      (t) =>
        inDateRange(t) &&
        (!client || clientName(t) === client) &&
        (!severity || t.priority === severity) &&
        (!status || (status === "open" ? !isClosed(t) : t.status === status)) &&
        (!q || `${t.title} ${clientName(t)} ${t.reporterName} ${t.code}`.toLowerCase().includes(q)),
    )
    .sort(
      (a, b) =>
        Number(isClosed(a)) - Number(isClosed(b)) ||
        (SEVERITY_RANK[a.priority] ?? 9) - (SEVERITY_RANK[b.priority] ?? 9) ||
        b.createdAt.localeCompare(a.createdAt),
    );

  const open = tickets.filter((t) => !isClosed(t));
  const selected = tickets.find((t) => t.id === selectedId);

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Open tickets", value: open.length, tone: "cyan" },
          { label: "Critical / high", value: open.filter((t) => t.priority === "Critical" || t.priority === "High").length, tone: "orange" },
          { label: "Clients affected", value: new Set(open.map((t) => t.contactId).filter(Boolean)).size, tone: "purple" },
          { label: "Done", value: tickets.length - open.length, tone: "green" },
        ]}
      />

      <div className="toolbar toolbar--card toolbar--fields">
        <Field label={<span className="kicker kicker--sm">SEARCH</span>} htmlFor="bug-q" className="toolbar__grow">
          <Input id="bug-q" type="search" placeholder="Title, client, reporter or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <Field label={<span className="kicker kicker--sm">TYPE</span>} htmlFor="bug-type">
          <Select id="bug-type" value={type} placeholder="Any type" options={TICKET_TYPES} onChange={(e) => setType(e.target.value)} />
        </Field>
        <Field label={<span className="kicker kicker--sm">CLIENT CRM</span>} htmlFor="bug-client">
          <Select id="bug-client" value={client} placeholder="All clients" options={clients} onChange={(e) => setClient(e.target.value)} />
        </Field>
        <Field label={<span className="kicker kicker--sm">STATUS</span>} htmlFor="bug-status">
          <Select id="bug-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="">Any status</option>
            <option value="open">Still open</option>
            {BUG_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label={<span className="kicker kicker--sm">SEVERITY</span>} htmlFor="bug-sev">
          <Select id="bug-sev" value={severity} placeholder="Any" options={SEVERITIES} onChange={(e) => setSeverity(e.target.value)} />
        </Field>
        <Field label={<span className="kicker kicker--sm">REPORTED</span>} htmlFor="bug-date">
          <Select id="bug-date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}>
            <option value="any">Any time</option>
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="month">This month</option>
            <option value="custom">Custom range</option>
          </Select>
        </Field>
        {dateFilter === "custom" && (
          <div className="date-range">
            <Field label={<span className="kicker kicker--sm">FROM</span>} htmlFor="bug-from">
              <Input id="bug-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <span className="date-range__arrow" aria-hidden="true">
              →
            </span>
            <Field label={<span className="kicker kicker--sm">TO</span>} htmlFor="bug-to">
              <Input id="bug-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        )}
        <span className="text-small toolbar__count">
          Showing {rows.length} of {tickets.length}
        </span>
      </div>

      <div className="split">
        <section className="split__main card card--table">
          <LoadState query={query} loadingText="Loading tickets…">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ticket</th>
                  <th>Client CRM</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Reported</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const name = clientName(t);
                  return (
                    <tr key={t.id} aria-selected={t.id === selectedId}>
                      <td className="data-table__code">{t.code}</td>
                      <td>
                        <button type="button" className="cell-button" onClick={() => setSelectedId(t.id)}>
                          <strong className="data-table__strong">{t.title}</strong>
                          <span className="text-small">
                            {[t.area, t.reporterName].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="cluster cluster--8 cluster--nowrap u-strong">
                          <Avatar text={initials(name)} tone={CLIENT_TONES[clients.indexOf(name) % CLIENT_TONES.length]} size="sm" square />
                          {name}
                        </span>
                      </td>
                      <td>
                        <Badge tone={SEVERITY_TONES[t.priority as BugSeverity] ?? "neutral"}>{t.priority}</Badge>
                      </td>
                      <td>
                        <Badge tone={BUG_STATUS_TONES[t.status as BugStatus] ?? "neutral"} dot>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="u-nowrap">{formatShort(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <p className="table-empty">{tickets.length ? "Nothing matches these filters." : "No tickets yet."}</p>}
          </LoadState>
        </section>

        {selected ? (
          <BugDetails key={selected.id} ticket={selected} client={clientName(selected)} canWrite={canWrite} onClose={() => setSelectedId("")} />
        ) : (
          <section className="split__side empty-state bug-placeholder">
            Click a ticket to see the details, change its status and reply to the client.
          </section>
        )}
      </div>
    </div>
  );
}

function BugDetails({ ticket, client, canWrite, onClose }: { ticket: TicketOut; client: string; canWrite: boolean; onClose: () => void }) {
  const [reply, setReply] = useState("");
  const update = useUpdateTicket();
  const post = usePostTicketMessage();
  const firstName = (ticket.reporterName || "the client").split(" ")[0];

  const addMessage = (kind: "reply" | "note") => {
    const text = reply.trim();
    if (!text) return;
    // Notes are team-only: the client never sees them.
    post.mutate({ id: ticket.id, text, kind }, { onSuccess: () => setReply("") });
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    addMessage("reply");
  };

  return (
    <section className="split__side card card--glow bug-details" aria-label="Ticket details">
      <div className="cluster cluster--nowrap bug-details__head">
        <div className="stack stack--4 u-grow">
          <span className="kicker">
            {ticket.code} · {client}
          </span>
          <h2 className="bug-details__title">{ticket.title}</h2>
        </div>
        <IconButton label="Close details" size="lg" onClick={onClose}>
          ×
        </IconButton>
      </div>

      <div className="bug-details__facts">
        <div className="stack stack--2">
          <span className="u-muted">Reported by</span>
          <span className="u-strong">{ticket.reporterName || "—"}</span>
          <span className="u-muted">{ticket.reporterEmail}</span>
        </div>
        <div className="stack stack--2">
          <span className="u-muted">Where</span>
          <span className="u-strong">{ticket.area ? `${ticket.area} page` : "—"}</span>
          <span className="u-muted">{ticket.device}</span>
        </div>
        <div className="stack stack--2">
          <span className="u-muted">Severity</span>
          {canWrite ? (
            <Select
              size="sm"
              aria-label="Severity"
              value={ticket.priority}
              options={SEVERITIES}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ id: ticket.id, body: { priority: e.target.value as BugSeverity } })}
            />
          ) : (
            <span className="u-strong">{ticket.priority}</span>
          )}
        </div>
        <div className="stack stack--2">
          <span className="u-muted">Reported</span>
          <span className="u-strong">{formatShort(ticket.createdAt)}</span>
        </div>
      </div>

      <Field label="What happened">
        <p className="text-body u-ink u-pre-line">{ticket.description || "No description."}</p>
      </Field>

      <Field label="Status" htmlFor="bug-set-status">
        <Select
          id="bug-set-status"
          className="u-strong"
          value={ticket.status}
          options={BUG_STATUSES}
          disabled={!canWrite || update.isPending}
          onChange={(e) => update.mutate({ id: ticket.id, body: { status: e.target.value as BugStatus } })}
        />
      </Field>
      <FormError error={update.error ?? post.error} />

      <div className="stack stack--8">
        <span className="kicker">ACTIVITY</span>
        {ticket.messages.length === 0 && <span className="text-small">No messages yet.</span>}
        {ticket.messages.map((m) => (
          <div key={m.id} className={cn(MESSAGE_CLASS[m.kind] ?? "message")}>
            <span className="message__meta">
              {m.kind === "note" ? "Internal note" : m.authorName} · {formatShort(m.createdAt)}
            </span>
            {m.text}
          </div>
        ))}
      </div>

      {canWrite && (
        <form className="stack stack--8" onSubmit={send}>
          <Field label={`Reply to ${firstName}`} htmlFor="bug-reply">
            <Textarea
              id="bug-reply"
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Let them know what you found or when it will be fixed"
            />
          </Field>
          <div className="cluster cluster--8 cluster--end">
            <Button onClick={() => addMessage("note")} disabled={post.isPending}>
              Add internal note
            </Button>
            <Button type="submit" variant="primary" disabled={post.isPending}>
              {post.isPending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
