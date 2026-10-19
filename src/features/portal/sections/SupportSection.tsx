"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import logoMark from "@/assets/images/logo-mark.png";
import { Badge, Button, Field, FormError, Input, LoadState, SegmentedControl, Select, Textarea } from "@/components/ui";
import { BUG_AREAS, PRIORITIES, REQUEST_TYPES, type RequestType } from "@/data/portal";
import type { Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { TicketOut } from "@/utils/api/models";
import { formatRelative, formatShort } from "@/utils/format/dates";
import {
  useClosePortalTicket,
  useCreatePortalTicket,
  usePortalMessages,
  usePortalTickets,
  useReplyPortalTicket,
  useSendPortalMessage,
} from "@/utils/hooks/useSupport";
import { usePortal, type SupportDraft } from "../state/PortalContext";

const TICKET_TONES: Record<string, Tone> = {
  "In progress": "purple",
  New: "cyan",
  "Waiting on client": "amber",
  Answered: "green",
  Done: "green",
};

const TYPE_LABELS: Record<string, string> = { change: "Change request", feature: "New feature", bug: "Bug", question: "Question" };

export function SupportSection() {
  const { state, update } = usePortal();
  const draft = state.support;
  const setDraft = (patch: Partial<SupportDraft>) => update((s) => ({ support: { ...s.support, ...patch } }));

  return (
    <div className="page-stack">
      <SegmentedControl
        kind="tabs"
        label="Support"
        value={draft.view}
        onChange={(view) => setDraft({ view })}
        options={[
          { value: "requests", label: "Requests & bugs" },
          { value: "messages", label: "Messages" },
        ]}
      />
      {draft.view === "requests" ? <RequestsView draft={draft} setDraft={setDraft} /> : <MessagesView />}
    </div>
  );
}

function RequestsView({ draft, setDraft }: { draft: SupportDraft; setDraft: (p: Partial<SupportDraft>) => void }) {
  const { update, readOnly } = usePortal();
  const ticketsQuery = usePortalTickets();
  const tickets = ticketsQuery.data ?? [];
  const create = useCreatePortalTicket();
  const [area, setArea] = useState(BUG_AREAS[0]);
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]["value"]>("Medium");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");
  const type = REQUEST_TYPES[draft.type];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.details.trim()) {
      setError("Please add a short summary and some details.");
      return;
    }
    create.mutate(
      {
        type: draft.type,
        title: draft.title.trim(),
        description: draft.details.trim(),
        area: draft.type === "bug" ? area : "",
        priority,
        device: typeof navigator === "undefined" ? "" : navigator.userAgent.slice(0, 200),
      },
      {
        onSuccess: (t) =>
          update((s) => ({
            support: { ...s.support, title: "", details: "" },
            toast: `${t.code} sent. Your GoCWGL team will get back to you soon.`,
          })),
      },
    );
  };

  return (
    <div className="card-row">
      {!readOnly && (
      <form className="card card--glow support-form" onSubmit={submit}>
        <span className="kicker">NEW REQUEST</span>
        <div className="cluster cluster--6" role="group" aria-label="Request type">
          {(Object.keys(REQUEST_TYPES) as RequestType[]).map((key) => (
            <button
              key={key}
              type="button"
              className="chip chip--square"
              aria-pressed={draft.type === key}
              onClick={() => {
                setDraft({ type: key });
                setError("");
              }}
            >
              {REQUEST_TYPES[key].label}
            </button>
          ))}
        </div>
        <Field label="Short summary" htmlFor="sp-title">
          <Input
            id="sp-title"
            value={draft.title}
            placeholder={type.titlePh}
            onChange={(e) => {
              setDraft({ title: e.target.value });
              setError("");
            }}
          />
        </Field>
        {draft.type === "bug" && (
          <Field label="Where did it happen?" htmlFor="sp-area">
            <Select id="sp-area" value={area} options={BUG_AREAS} onChange={(e) => setArea(e.target.value)} />
          </Field>
        )}
        <Field label="Details" htmlFor="sp-details">
          <Textarea
            id="sp-details"
            rows={5}
            value={draft.details}
            placeholder={type.detailsPh}
            onChange={(e) => {
              setDraft({ details: e.target.value });
              setError("");
            }}
          />
        </Field>
        <Field label="How urgent?" htmlFor="sp-pri">
          <Select
            id="sp-pri"
            value={priority}
            options={PRIORITIES}
            onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number]["value"])}
          />
        </Field>
        {error && (
          <p className="text-error" role="alert">
            {error}
          </p>
        )}
        <FormError error={create.error} />
        <Button type="submit" variant="primary" className="u-self-end" disabled={create.isPending}>
          {create.isPending ? "Sending…" : "Send to GoCWGL"}
        </Button>
      </form>
      )}

      <section className="card support-tickets">
        <span className="kicker">YOUR REQUESTS</span>
        <LoadState query={ticketsQuery} inline isEmpty={!tickets.length} empty="No requests yet.">
          <div>
            {tickets.map((t) => (
              <div key={t.id}>
                <button type="button" className="list-row cell-button" aria-expanded={openId === t.id} onClick={() => setOpenId(openId === t.id ? "" : t.id)}>
                  <span className="ticket-code">{t.code}</span>
                  <span className="stack stack--2 u-grow">
                    <span className="text-strong">{t.title}</span>
                    <span className="text-small">
                      {TYPE_LABELS[t.type] ?? t.type} · {formatShort(t.createdAt)} · {t.priority}
                    </span>
                  </span>
                  <Badge tone={TICKET_TONES[t.status] ?? "cyan"} dot>
                    {t.status}
                  </Badge>
                </button>
                {openId === t.id && <TicketThread ticket={t} readOnly={readOnly} />}
              </div>
            ))}
          </div>
        </LoadState>
      </section>
    </div>
  );
}

/** A request's conversation with the team (internal team notes are never sent to the portal). */
function TicketThread({ ticket, readOnly }: { ticket: TicketOut; readOnly: boolean }) {
  const reply = useReplyPortalTicket();
  const close = useClosePortalTicket();
  const [text, setText] = useState("");

  return (
    <div className="inset stack stack--8">
      {ticket.description && <p className="text-body u-pre-line">{ticket.description}</p>}
      {ticket.messages.map((m) => (
        <div key={m.id} className={cn("message", m.kind === "client" && "message--violet")}>
          <span className="message__meta">
            {m.authorName} · {formatShort(m.createdAt)}
          </span>
          {m.text}
        </div>
      ))}
      {!readOnly && (
        <>
          <Textarea rows={2} aria-label="Reply to your team" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply to your team…" />
          <FormError error={reply.error ?? close.error} />
          <div className="cluster cluster--8 cluster--end">
            {ticket.status !== "Done" && (
              <Button size="sm" disabled={close.isPending} onClick={() => close.mutate(ticket.id)}>
                Mark as resolved
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              disabled={!text.trim() || reply.isPending}
              onClick={() => reply.mutate({ id: ticket.id, text: text.trim() }, { onSuccess: () => setText("") })}
            >
              {ticket.status === "Done" ? "Reply and reopen" : "Reply"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function MessagesView() {
  const { readOnly } = usePortal();
  const messages = usePortalMessages();
  const sendMessage = useSendPortalMessage();
  const [text, setText] = useState("");
  // Oldest first, like a chat.
  const list = [...(messages.data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const send = (e: FormEvent) => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    sendMessage.mutate(message, { onSuccess: () => setText("") });
  };

  return (
    <section className="chat">
      <div className="chat__header">
        <Image className="chat__avatar" src={logoMark} alt="" width={36} height={36} />
        <div className="stack stack--2">
          <span className="text-strong">GoCWGL team</span>
          <span className="chat__status">
            <span className="chat__status-dot" aria-hidden="true" />
            Usually replies within a few hours
          </span>
        </div>
      </div>
      <div className="chat__messages">
        <LoadState query={messages} inline isEmpty={!list.length} empty="No messages yet. Say hi to your team!">
          {list.map((m) => {
            const mine = !m.fromTeam;
            return (
              <div key={m.id} className={cn("chat__row", mine && "chat__row--mine")}>
                <div className={cn("chat__bubble", mine && "chat__bubble--mine")}>
                  <span className="chat__meta">
                    {m.authorName} · {formatRelative(m.createdAt)}
                  </span>
                  {m.text}
                </div>
              </div>
            );
          })}
        </LoadState>
      </div>
      <FormError error={sendMessage.error} />
      {!readOnly && (
      <form className="chat__composer" onSubmit={send}>
        <label className="sr-only" htmlFor="sp-msg">
          Message
        </label>
        <Input id="sp-msg" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" />
        <Button type="submit" variant="primary" size="lg" disabled={sendMessage.isPending}>
          Send
        </Button>
      </form>
      )}
    </section>
  );
}
