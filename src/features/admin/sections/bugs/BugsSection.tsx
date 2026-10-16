"use client";

import { useState, type FormEvent } from "react";
import { Avatar, Badge, Button, Field, IconButton, Input, Select, StatGrid, Textarea } from "@/components/ui";
import {
  BUG_STATUSES,
  BUG_STATUS_TONES,
  SEVERITIES,
  SEVERITY_TONES,
  type BugStatus,
  type BugTicket,
  type ThreadMessage,
} from "@/data/admin";
import { daysAgo, parseIsoDate, parseShortDate, TODAY, TODAY_SHORT } from "@/lib/dates";
import type { Tone } from "@/lib/tones";
import { cn, initials } from "@/lib/utils";
import { useAdmin } from "../../state/AdminContext";

type DateFilter = "any" | "today" | "7" | "30" | "month" | "custom";

const SEVERITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const CLIENT_TONES: Tone[] = ["cyan", "purple", "orange", "green", "pink"];

const MESSAGE_CLASS: Record<ThreadMessage["kind"], string> = {
  client: "message",
  reply: "message message--mine",
  note: "message message--note",
};

export function BugsSection() {
  const { state, update } = useAdmin();
  const tickets = state.tickets;

  const [query, setQuery] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState<"" | "open" | BugStatus>("open");
  const [severity, setSeverity] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [from, setFrom] = useState("2026-10-01");
  const [to, setTo] = useState("2026-10-14");
  const [selectedId, setSelectedId] = useState(101);

  const clients = Array.from(new Set(tickets.map((t) => t.client)));
  const q = query.trim().toLowerCase();

  const inDateRange = (t: BugTicket) => {
    if (dateFilter === "any") return true;
    const d = parseShortDate(t.date);
    if (dateFilter === "today") return d.getTime() === TODAY.getTime();
    if (dateFilter === "7") return d >= daysAgo(6) && d <= TODAY;
    if (dateFilter === "30") return d >= daysAgo(29) && d <= TODAY;
    if (dateFilter === "month") return d >= new Date(2026, 9, 1) && d <= TODAY;
    const f = parseIsoDate(from);
    const t2 = parseIsoDate(to);
    return (!f || d >= f) && (!t2 || d <= t2);
  };

  const rows = tickets
    .filter(
      (t) =>
        inDateRange(t) &&
        (!client || t.client === client) &&
        (!severity || t.sev === severity) &&
        (!status || (status === "open" ? t.status !== "Fixed" : t.status === status)) &&
        (!q || `${t.title} ${t.client} ${t.reporter}`.toLowerCase().includes(q)),
    )
    .sort(
      (a, b) =>
        Number(a.status === "Fixed") - Number(b.status === "Fixed") || SEVERITY_RANK[a.sev] - SEVERITY_RANK[b.sev] || b.id - a.id,
    );

  const open = tickets.filter((t) => t.status !== "Fixed");
  const selected = tickets.find((t) => t.id === selectedId);

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "Open bugs", value: open.length, tone: "cyan" },
          { label: "Critical / high", value: open.filter((t) => t.sev === "Critical" || t.sev === "High").length, tone: "orange" },
          { label: "Clients affected", value: new Set(open.map((t) => t.client)).size, tone: "purple" },
          { label: "Fixed", value: tickets.length - open.length, tone: "green" },
        ]}
      />

      <div className="toolbar toolbar--card toolbar--fields">
        <Field label={<span className="kicker kicker--sm">SEARCH</span>} htmlFor="bug-q" className="toolbar__grow">
          <Input id="bug-q" type="search" placeholder="Bug title, client or reporter" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          Showing {rows.length} of {tickets.length} bugs
        </span>
      </div>

      <div className="split">
        <section className="split__main card card--table">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Bug</th>
                <th>Client CRM</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} aria-selected={t.id === selectedId}>
                  <td className="data-table__code">BUG-{t.id}</td>
                  <td>
                    <button type="button" className="cell-button" onClick={() => setSelectedId(t.id)}>
                      <strong className="data-table__strong">{t.title}</strong>
                      <span className="text-small">
                        {t.area} · {t.reporter}
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className="cluster cluster--8 cluster--nowrap u-strong">
                      <Avatar text={initials(t.client)} tone={CLIENT_TONES[clients.indexOf(t.client) % CLIENT_TONES.length]} size="sm" square />
                      {t.client}
                    </span>
                  </td>
                  <td>
                    <Badge tone={SEVERITY_TONES[t.sev]}>{t.sev}</Badge>
                  </td>
                  <td>
                    <Badge tone={BUG_STATUS_TONES[t.status]} dot>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="u-nowrap">{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="table-empty">No bugs match these filters.</p>}
        </section>

        {selected ? (
          <BugDetails
            key={selected.id}
            ticket={selected}
            onClose={() => setSelectedId(0)}
            onUpdate={(patch) => update((s) => ({ tickets: s.tickets.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)) }))}
          />
        ) : (
          <section className="split__side empty-state bug-placeholder">
            Click a bug to see the details, change its status and reply to the client.
          </section>
        )}
      </div>
    </div>
  );
}

function BugDetails({
  ticket,
  onClose,
  onUpdate,
}: {
  ticket: BugTicket;
  onClose: () => void;
  onUpdate: (patch: Partial<BugTicket>) => void;
}) {
  const [reply, setReply] = useState("");
  const thread: ThreadMessage[] = [{ from: ticket.reporter, kind: "client", when: ticket.date, text: "Reported this bug." }, ...ticket.thread];

  const addMessage = (kind: "reply" | "note") => {
    const text = reply.trim();
    if (!text) return;
    onUpdate({ thread: [...ticket.thread, { from: "You", kind, when: TODAY_SHORT, text }] });
    setReply("");
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    addMessage("reply");
  };

  return (
    <section className="split__side card card--glow bug-details" aria-label="Bug details">
      <div className="cluster cluster--nowrap bug-details__head">
        <div className="stack stack--4 u-grow">
          <span className="kicker">
            BUG-{ticket.id} · {ticket.client}
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
          <span className="u-strong">{ticket.reporter}</span>
          <span className="u-muted">{ticket.email}</span>
        </div>
        <div className="stack stack--2">
          <span className="u-muted">Where</span>
          <span className="u-strong">{ticket.area} page</span>
          <span className="u-muted">{ticket.device}</span>
        </div>
        <div className="stack stack--2">
          <span className="u-muted">Severity</span>
          <span className="u-strong">{ticket.sev}</span>
        </div>
        <div className="stack stack--2">
          <span className="u-muted">Reported</span>
          <span className="u-strong">{ticket.date}</span>
        </div>
      </div>

      <Field label="What happened">
        <p className="text-body u-ink u-pre-line">{ticket.desc}</p>
      </Field>

      <Field label="Status" htmlFor="bug-set-status">
        <Select
          id="bug-set-status"
          className="u-strong"
          value={ticket.status}
          options={BUG_STATUSES}
          onChange={(e) =>
            onUpdate({
              status: e.target.value as BugStatus,
              thread: [...ticket.thread, { from: "You", kind: "note", when: TODAY_SHORT, text: `Status changed to ${e.target.value}.` }],
            })
          }
        />
      </Field>

      <div className="stack stack--8">
        <span className="kicker">ACTIVITY</span>
        {thread.map((m, i) => (
          <div key={i} className={cn(MESSAGE_CLASS[m.kind])}>
            <span className="message__meta">
              {m.kind === "note" ? "Internal note" : m.from} · {m.when}
            </span>
            {m.text}
          </div>
        ))}
      </div>

      <form className="stack stack--8" onSubmit={send}>
        <Field label={`Reply to ${ticket.reporter.split(" ")[0]}`} htmlFor="bug-reply">
          <Textarea
            id="bug-reply"
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Let them know what you found or when it will be fixed"
          />
        </Field>
        <div className="cluster cluster--8 cluster--end">
          <Button onClick={() => addMessage("note")}>Add internal note</Button>
          <Button type="submit" variant="primary">
            Send reply
          </Button>
        </div>
      </form>
    </section>
  );
}
