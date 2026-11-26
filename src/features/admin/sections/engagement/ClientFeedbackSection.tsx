"use client";

import { useState } from "react";
import { Avatar, Badge, Icon, LoadState, SearchBox, StatGrid } from "@/components/ui";
import { BUG_STATUS_TONES, type BugStatus } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { TicketOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort, todayIso } from "@/utils/format/dates";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useFeedbackTickets } from "@/utils/hooks/useSupport";
import { useMe } from "@/utils/hooks/useUsers";
import { businessName, contactName } from "../../lib/contacts";
import { BugDetails } from "../bugs/BugsSection";

type StatusFilter = "" | "open" | "Done";

const isDone = (t: TicketOut) => t.status === "Done";

/**
 * Clients › Client feedback: what clients think of their portal, sent as "Feedback" from Request support.
 * Click one to read it, reply to the client, add a team note or mark it done.
 */
export function ClientFeedbackSection() {
  const canWrite = canWriteCrm(useMe().data);
  const query = useFeedbackTickets();
  const rows = query.data ?? [];
  const contacts = useAllContacts().data ?? [];
  const archived = useAllContacts({ archived: true }).data ?? [];
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const contactOf = (t: TicketOut) => contacts.find((x) => x.id === t.contactId) ?? archived.find((x) => x.id === t.contactId);
  const clientName = (t: TicketOut) => {
    const c = contactOf(t);
    return c ? businessName(c) : t.contactId ? "Client" : "No client";
  };
  const personName = (t: TicketOut) => {
    const c = contactOf(t);
    const person = contactName(c);
    return c && person !== businessName(c) ? person : t.reporterName;
  };

  const q = search.trim().toLowerCase();
  const shown = rows
    .filter(
      (t) =>
        (!status || (status === "open" ? !isDone(t) : isDone(t))) &&
        (!q || `${t.title} ${t.description} ${clientName(t)} ${personName(t)} ${t.code}`.toLowerCase().includes(q)),
    )
    .sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || b.createdAt.localeCompare(a.createdAt));
  const open = rows.filter((t) => !isDone(t));
  const month = todayIso().slice(0, 7);
  const selected = rows.find((t) => t.id === selectedId);

  return (
    <div className="page-stack">
      <StatGrid
        items={[
          { label: "To read", value: open.length, tone: "orange" },
          { label: "This month", value: rows.filter((t) => t.createdAt.slice(0, 7) === month).length, tone: "cyan" },
          { label: "Clients who sent feedback", value: new Set(rows.map((t) => t.contactId).filter(Boolean)).size, tone: "purple" },
          { label: "Done", value: rows.length - open.length, tone: "green" },
        ]}
      />

      <div className="split">
        <div className="split__main card card--flat board">
          <div className="course-toolbar">
            <div className="stack stack--2">
              <h3 className="course-toolbar__title">Client feedback</h3>
              <span className="text-small">
                {shown.length} of {rows.length} · clients send it from Request support › Feedback in their portal
              </span>
            </div>
            <div className="course-toolbar__tools">
              <SearchBox label="Search feedback" placeholder="Search feedback or clients" value={search} onChange={setSearch} />
            </div>
          </div>
          <div className="course-filters">
            <div className="filter-track" role="group" aria-label="Filter by status">
              {(
                [
                  ["", "All", rows.length],
                  ["open", "To read", open.length],
                  ["Done", "Done", rows.length - open.length],
                ] as Array<[StatusFilter, string, number]>
              ).map(([value, label, count]) => (
                <button key={label} type="button" className="filter-pill tone-orange" aria-pressed={status === value} onClick={() => setStatus(value)}>
                  {label}
                  <span className="filter-pill__count">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <LoadState query={query} loadingText="Loading feedback…">
            {shown.length === 0 ? (
              <div className="board__empty">
                <span className="board__empty-icon tone-orange" aria-hidden="true">
                  <Icon name="message" size={18} />
                </span>
                <span className="text-strong">{rows.length ? "No feedback matches these filters" : "No client feedback yet"}</span>
                <span className="text-small">
                  {rows.length ? "Try another filter." : "Clients send it from Request support in their portal by choosing Feedback."}
                </span>
              </div>
            ) : (
              <div className="feedback-list">
                {shown.map((t) => (
                  <article
                    key={t.id}
                    className={cn("feedback-card client-feedback-card", t.id === selectedId && "is-selected")}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <header className="feedback-card__head">
                      <span className="cluster cluster--8">
                        <span className="ticket-code">{t.code}</span>
                        <Badge tone={BUG_STATUS_TONES[t.status as BugStatus] ?? "neutral"} dot>
                          {isDone(t) ? "Done" : t.status === "New" ? "New" : t.status}
                        </Badge>
                      </span>
                      <span className="text-small">{formatShort(t.createdAt)}</span>
                    </header>
                    <button type="button" className="cell-button client-feedback-card__open" onClick={() => setSelectedId(t.id)}>
                      <strong className="text-strong">{t.title}</strong>
                    </button>
                    {t.description ? <p className="feedback-card__comment">“{t.description}”</p> : <p className="vp-empty">No details.</p>}
                    <footer className="feedback-card__foot">
                      <span className="feedback-card__who">
                        <Avatar name={clientName(t)} tone={avatarTone(t.contactId ?? t.id)} size="sm" />
                        <span className="stack stack--2">
                          <span className="text-strong">{personName(t) || clientName(t)}</span>
                          <span className="text-small">{clientName(t)}</span>
                        </span>
                      </span>
                      {t.messages.length > 0 && (
                        <span className="text-small u-push-right">
                          <Icon name="message" size={12} /> {t.messages.length}
                        </span>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </LoadState>
        </div>

        {selected ? (
          <BugDetails
            key={selected.id}
            ticket={selected}
            client={[clientName(selected), personName(selected)].filter(Boolean).join(" · ")}
            canWrite={canWrite}
            onClose={() => setSelectedId("")}
          />
        ) : (
          <section className="split__side empty-state bug-placeholder">Click feedback to read it, reply to the client or mark it done.</section>
        )}
      </div>
    </div>
  );
}
