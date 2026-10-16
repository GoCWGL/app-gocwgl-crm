"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import logoMark from "@/assets/images/logo-mark.png";
import { Badge, Button, Field, Input, SegmentedControl, Select, Textarea } from "@/components/ui";
import { BUG_AREAS, PRIORITIES, REQUEST_TYPES, type RequestType, type TicketStatus } from "@/data/portal";
import { TODAY_SHORT } from "@/lib/dates";
import type { Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { usePortal, type SupportDraft } from "../state/PortalContext";

const TICKET_TONES: Record<TicketStatus, Tone> = {
  "In progress": "purple",
  New: "cyan",
  Answered: "green",
  Done: "green",
};

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
  const { state, update } = usePortal();
  const [area, setArea] = useState(BUG_AREAS[0]);
  const [priority, setPriority] = useState("Medium");
  const [error, setError] = useState("");
  const type = REQUEST_TYPES[draft.type];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.details.trim()) {
      setError("Please add a short summary and some details.");
      return;
    }
    const isBug = draft.type === "bug";
    const code = (isBug ? "BUG-" : "REQ-") + (215 + state.tickets.length);
    update((s) => ({
      tickets: [
        { code, type: isBug ? "Bug" : type.label, title: draft.title.trim(), date: TODAY_SHORT, priority: priority.split(" ")[0], status: "New" },
        ...s.tickets,
      ],
      support: { ...s.support, title: "", details: "" },
      toast: `${code} sent. Your GoCWGL team will get back to you soon.`,
    }));
  };

  return (
    <div className="card-row">
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
          <Select id="sp-pri" value={priority} options={PRIORITIES} onChange={(e) => setPriority(e.target.value)} />
        </Field>
        {error && (
          <p className="text-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="u-self-end">
          Send to GoCWGL
        </Button>
      </form>

      <section className="card support-tickets">
        <span className="kicker">YOUR REQUESTS</span>
        <div>
          {state.tickets.map((t) => (
            <div className="list-row" key={t.code}>
              <span className="ticket-code">{t.code}</span>
              <div className="stack stack--2 u-grow">
                <span className="text-strong">{t.title}</span>
                <span className="text-small">
                  {t.type} · {t.date} · {t.priority}
                </span>
              </div>
              <Badge tone={TICKET_TONES[t.status] ?? "cyan"} dot>
                {t.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MessagesView() {
  const { state, update } = usePortal();
  const [text, setText] = useState("");

  const send = (e: FormEvent) => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    setText("");
    update((s) => ({ messages: [...s.messages, { mine: true, who: "You", when: "Just now", text: message }] }));
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
        {state.messages.map((m, i) => (
          <div key={i} className={cn("chat__row", m.mine && "chat__row--mine")}>
            <div className={cn("chat__bubble", m.mine && "chat__bubble--mine")}>
              <span className="chat__meta">
                {m.who} · {m.when}
              </span>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <form className="chat__composer" onSubmit={send}>
        <label className="sr-only" htmlFor="sp-msg">
          Message
        </label>
        <Input id="sp-msg" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" />
        <Button type="submit" variant="primary" size="lg">
          Send
        </Button>
      </form>
    </section>
  );
}
