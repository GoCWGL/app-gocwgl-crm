"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, FormError, Icon, IconTile, LoadState, Modal, SearchBox, SegmentedControl, Select, Tabs, Textarea } from "@/components/ui";
import { BUG_STATUS_TONES, BUG_STATUSES, SEVERITIES, SEVERITY_TONES, TICKET_TYPES, type BugSeverity, type BugStatus } from "@/data/admin";
import { cn } from "@/lib/utils";
import type { TicketOut } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort, formatShortDateTime } from "@/utils/format/dates";
import { usePostTicketMessage, useTickets, useUpdateTicket } from "@/utils/hooks/useSupport";
import { useMe } from "@/utils/hooks/useUsers";
import { useAdmin } from "../../state/AdminContext";

type Who = "clients" | "vas";
type StatusFilter = "open" | "all" | BugStatus;

const isVaTicket = (t: TicketOut) => t.source === "va";
const isOpen = (t: TicketOut) => t.status !== "Done";
const typeLabel = (t: TicketOut) => TICKET_TYPES.find((x) => x.value === t.type)?.label ?? t.type;
const STATUS_LABEL: Record<BugStatus, string> = {
  New: "New",
  "In progress": "In progress",
  "Waiting on client": "Waiting",
  Answered: "Answered",
  Done: "Done",
};

/** Engagement › Support: every request for help from clients and VAs. */
export function SupportSection() {
  const canWrite = canWriteCrm(useMe().data);
  const query = useTickets();
  // Client requests: everything a client (portal, their CRM) or the team opened for a client; VA requests: the VA portal.
  const tickets = (query.data ?? []).filter((t) => t.type !== "bug" || t.source !== "crm");
  const [who, setWho] = useState<Who>("clients");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState("");
  const q = search.trim().toLowerCase();

  const inTab = tickets.filter((t) => (who === "vas" ? isVaTicket(t) : !isVaTicket(t)));
  const count = (f: StatusFilter) => inTab.filter((t) => (f === "all" ? true : f === "open" ? isOpen(t) : t.status === f)).length;
  const shown = inTab.filter(
    (t) =>
      (status === "all" || (status === "open" ? isOpen(t) : t.status === status)) &&
      (!q || `${t.code} ${t.title} ${t.reporterName} ${t.reporterEmail} ${t.description}`.toLowerCase().includes(q)),
  );
  const open = tickets.find((t) => t.id === openId) ?? null;

  return (
    <div className="page-stack">
      <div className="card card--flat board">
        <div className="board__bar">
          <Tabs<Who>
            label="Support requests"
            value={who}
            onChange={(w) => {
              setWho(w);
              setStatus("open");
            }}
            options={[
              {
                value: "clients",
                label: "Client requests",
                hint: "From client portals",
                icon: "users",
                tone: "orange",
                count: query.isPending ? "–" : tickets.filter((t) => !isVaTicket(t) && isOpen(t)).length,
              },
              {
                value: "vas",
                label: "VA requests",
                hint: "From the VA portal",
                icon: "briefcase",
                tone: "cyan",
                count: query.isPending ? "–" : tickets.filter((t) => isVaTicket(t) && isOpen(t)).length,
              },
            ]}
          />
          <div className="board__actions">
            <SearchBox label="Search requests" placeholder="Search requests" value={search} onChange={setSearch} />
          </div>
        </div>

        <div className="course-filters">
          <div className="filter-track" role="group" aria-label="Filter by status">
            {(["open", "New", "In progress", "Waiting on client", "Answered", "Done", "all"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={cn("filter-pill", f !== "open" && f !== "all" && `tone-${BUG_STATUS_TONES[f as BugStatus]}`)}
                aria-pressed={status === f}
                onClick={() => setStatus(f)}
              >
                {f !== "open" && f !== "all" && <span className="filter-pill__dot" aria-hidden="true" />}
                {f === "open" ? "Open" : f === "all" ? "All" : STATUS_LABEL[f as BugStatus]}
                <span className="filter-pill__count">{count(f)}</span>
              </button>
            ))}
          </div>
        </div>

        <LoadState query={query} loadingText="Loading requests…">
          {shown.length === 0 ? (
            <div className="board__empty">
              <span className={cn("board__empty-icon", who === "vas" ? "tone-cyan" : "tone-orange")} aria-hidden="true">
                <Icon name="lifebuoy" size={18} />
              </span>
              <span className="text-strong">{q ? `No matches for “${search.trim()}”` : status === "open" ? "Nothing waiting on you" : "No requests here"}</span>
              <span className="text-small">
                {who === "vas" ? "VAs ask for help from Request Support in their portal." : "Clients ask for help from Support in their portal."}
              </span>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table data-table--plain support-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>{who === "vas" ? "VA" : "From"}</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((t) => {
                    const last = t.messages[t.messages.length - 1];
                    const waitingOnUs = last ? last.kind === "client" : true;
                    return (
                      <tr key={t.id} className={cn(isOpen(t) && waitingOnUs && "is-unanswered")}>
                        <td>
                          <button type="button" className="cell-button" onClick={() => setOpenId(t.id)}>
                            <strong className="data-table__strong">{t.title}</strong>
                            <span className="text-small">
                              {t.code} · {t.messages.length} message{t.messages.length === 1 ? "" : "s"}
                            </span>
                          </button>
                        </td>
                        <td>
                          <div className="stack stack--2">
                            <span className="u-strong u-ink">{t.reporterName || "—"}</span>
                            <span className="text-small">{t.reporterEmail}</span>
                          </div>
                        </td>
                        <td>{typeLabel(t)}</td>
                        <td>
                          <Badge tone={SEVERITY_TONES[t.priority as BugSeverity] ?? "neutral"}>{t.priority}</Badge>
                        </td>
                        <td>
                          <Badge tone={BUG_STATUS_TONES[t.status as BugStatus] ?? "neutral"} dot>
                            {STATUS_LABEL[t.status as BugStatus] ?? t.status}
                          </Badge>
                        </td>
                        <td>{formatShort(t.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </LoadState>
      </div>

      {open && <SupportThread ticket={open} canWrite={canWrite} onClose={() => setOpenId("")} />}
    </div>
  );
}

function SupportThread({ ticket: t, canWrite, onClose }: { ticket: TicketOut; canWrite: boolean; onClose: () => void }) {
  const { notify } = useAdmin();
  const save = useUpdateTicket();
  const post = usePostTicketMessage();
  const [kind, setKind] = useState<"reply" | "note">("reply");
  const [text, setText] = useState("");
  const va = isVaTicket(t);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    post.mutate(
      { id: t.id, text: text.trim(), kind },
      {
        onSuccess: () => {
          setText("");
          notify(kind === "reply" ? `Reply sent on ${t.code}.` : "Note added.");
        },
      },
    );
  };

  return (
    <Modal
      open
      variant="drawer"
      width={640}
      onClose={onClose}
      titleId="support-thread"
      kicker={`${t.code} · ${va ? "VA REQUEST" : "CLIENT REQUEST"}`}
      title={t.title}
      subtitle={`${t.reporterName || "Someone"}${t.reporterEmail ? ` · ${t.reporterEmail}` : ""} · opened ${formatShort(t.createdAt)}`}
      media={
        <IconTile tone={va ? "cyan" : "orange"} size="lg">
          <Icon name="lifebuoy" size={18} />
        </IconTile>
      }
    >
      <div className="stack stack--16">
        <FormError error={save.error ?? post.error} />
        <div className="form-grid">
          <Field label="Status" htmlFor="st-status">
            <Select
              id="st-status"
              value={t.status}
              disabled={!canWrite || save.isPending}
              options={BUG_STATUSES.map((s) => ({ value: s, label: s === "Waiting on client" && va ? "Waiting on VA" : s }))}
              onChange={(e) => save.mutate({ id: t.id, body: { status: e.target.value as BugStatus } })}
            />
          </Field>
          <Field label="Priority" htmlFor="st-priority">
            <Select
              id="st-priority"
              value={t.priority}
              disabled={!canWrite || save.isPending}
              options={SEVERITIES}
              onChange={(e) => save.mutate({ id: t.id, body: { priority: e.target.value as BugSeverity } })}
            />
          </Field>
        </div>

        <div className="support-thread">
          <div className="support-msg support-msg--theirs">
            <span className="support-msg__who">
              {t.reporterName || "Requester"} · {typeLabel(t)} · {formatShortDateTime(t.createdAt)}
            </span>
            <p className="va-pre">{t.description || <span className="vp-empty">No details.</span>}</p>
          </div>
          {t.messages.map((m) => (
            <div
              key={m.id}
              className={cn("support-msg", m.kind === "client" ? "support-msg--theirs" : m.kind === "note" ? "support-msg--note" : "support-msg--ours")}
            >
              <span className="support-msg__who">
                {m.kind === "note" && <Icon name="lock" size={11} />}
                {m.authorName} · {m.kind === "note" ? "Team note" : m.kind === "reply" ? "Reply" : va ? "VA" : "Client"} ·{" "}
                {formatShortDateTime(m.createdAt)}
              </span>
              <p className="va-pre">{m.text}</p>
            </div>
          ))}
        </div>

        {canWrite && (
          <form className="support-compose" onSubmit={send}>
            <SegmentedControl<"reply" | "note">
              kind="radio"
              variant="soft"
              size="sm"
              label="Message type"
              value={kind}
              onChange={setKind}
              options={[
                { value: "reply", label: va ? "Reply to VA" : "Reply to client" },
                { value: "note", label: "Team note" },
              ]}
            />
            <Textarea
              rows={4}
              aria-label={kind === "reply" ? "Reply" : "Team note"}
              placeholder={kind === "reply" ? "Write your reply…" : "Only your team sees this."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="cluster cluster--between">
              <span className="text-small">{kind === "reply" ? "Sends to them and marks the request Answered." : "Never shown to them."}</span>
              <Button type="submit" variant="primary" disabled={!text.trim() || post.isPending}>
                <Icon name="send" size={13} /> {post.isPending ? "Sending…" : kind === "reply" ? "Send reply" : "Add note"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
