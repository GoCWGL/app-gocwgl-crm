"use client";

import { useVaAccess } from "../lib/access";
import { useState, type FormEvent } from "react";
import { Badge, Button, Field, FormError, Icon, IconTile, Input, LoadState, Modal, Select, Textarea } from "@/components/ui";
import { BUG_STATUS_TONES, type BugStatus, type TicketType } from "@/data/admin";
import { cn } from "@/lib/utils";
import type { TicketOut } from "@/utils/api/models";
import { formatShort, formatShortDateTime } from "@/utils/format/dates";
import { useCloseVaRequest, useCreateVaRequest, useReplyVaRequest, useVaRequests } from "@/utils/hooks/useSupport";

/** What a VA can ask for (the API's ticket types, worded for VAs). */
const KINDS: Array<{ value: TicketType; label: string; hint: string }> = [
  { value: "question", label: "A question", hint: "How to do something, or what a client expects." },
  { value: "bug", label: "A problem with a tool", hint: "Something isn't working: a login, the portal, an app." },
  { value: "change", label: "Access or account change", hint: "New logins, permissions, or a change to your account." },
  { value: "feature", label: "An idea or suggestion", hint: "Something that would make the work easier." },
];
const kindLabel = (t: TicketOut) => KINDS.find((k) => k.value === t.type)?.label ?? t.type;
const STATUS_TEXT: Record<BugStatus, string> = {
  New: "Sent",
  "In progress": "In progress",
  "Waiting on client": "Waiting on you",
  Answered: "Answered",
  Done: "Resolved",
};

/** VA portal › Request Support: ask the GoCWGL team for help and follow the conversation. */
export function RequestSupportSection() {
  const va = useVaAccess().ready;
  const query = useVaRequests(va);
  const requests = query.data ?? [];
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState("");
  const open = requests.find((r) => r.id === openId) ?? null;

  const active = requests.filter((r) => r.status !== "Done");
  const done = requests.filter((r) => r.status === "Done");

  return (
    <div className="page-stack">
      <div className="card va-support-hero">
        <IconTile tone="cyan" size="lg">
          <Icon name="lifebuoy" size={20} />
        </IconTile>
        <span className="stack stack--2 u-grow">
          <span className="text-strong">Need help? Ask the GoCWGL team.</span>
          <span className="text-small">Questions, problems with a tool, access you need — we usually reply within one business day.</span>
        </span>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={14} /> New request
        </Button>
      </div>

      <LoadState query={query} loadingText="Loading your requests…" isEmpty={!requests.length} empty="No requests yet. Your requests and the team's replies show up here.">
        {[
          ["OPEN", active],
          ["RESOLVED", done],
        ].map(([label, list]) =>
          (list as TicketOut[]).length ? (
            <section key={label as string} className="stack stack--8">
              <span className="kicker">
                {label as string} · {(list as TicketOut[]).length}
              </span>
              <div className="va-requests">
                {(list as TicketOut[]).map((r) => {
                  const replies = r.messages.filter((m) => m.kind === "reply").length;
                  return (
                    <button key={r.id} type="button" className="va-request" onClick={() => setOpenId(r.id)}>
                      <span className="stack stack--2 u-grow">
                        <span className="text-strong">{r.title}</span>
                        <span className="text-small">
                          {r.code} · {kindLabel(r)} · updated {formatShort(r.updatedAt)}
                          {replies ? ` · ${replies} repl${replies === 1 ? "y" : "ies"}` : ""}
                        </span>
                      </span>
                      <Badge tone={BUG_STATUS_TONES[r.status as BugStatus] ?? "neutral"} dot>
                        {STATUS_TEXT[r.status as BugStatus] ?? r.status}
                      </Badge>
                      <Icon name="chevronRight" size={15} />
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null,
        )}
      </LoadState>

      {creating && <NewRequestModal onClose={() => setCreating(false)} onCreated={(id) => setOpenId(id)} />}
      {open && <RequestThread request={open} onClose={() => setOpenId("")} />}
    </div>
  );
}

function NewRequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const create = useCreateVaRequest();
  const [type, setType] = useState<TicketType>("question");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [urgent, setUrgent] = useState("Medium");
  const [tried, setTried] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!title.trim()) return;
    create.mutate(
      { type, title: title.trim(), description: details.trim(), priority: urgent as "Low" | "Medium" | "High" | "Critical" },
      {
        onSuccess: (t) => {
          onClose();
          onCreated(t.id);
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="va-new-request"
      kicker="REQUEST SUPPORT"
      title="New request"
      subtitle="Tell us what you need. The more detail, the faster we can help."
      width={560}
      media={
        <IconTile brand size="lg">
          <Icon name="lifebuoy" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            <Icon name="send" size={13} /> {create.isPending ? "Sending…" : "Send request"}
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        <FormError error={create.error} />
        <div className="va-kinds" role="radiogroup" aria-label="What do you need?">
          {KINDS.map((k) => (
            <button key={k.value} type="button" role="radio" aria-checked={type === k.value} className="va-kind" onClick={() => setType(k.value)}>
              <span className="text-strong">{k.label}</span>
              <span className="text-small">{k.hint}</span>
            </button>
          ))}
        </div>
        <Field label="Subject" htmlFor="vr-title" required error={tried && !title.trim() && "Add a short subject."}>
          <Input id="vr-title" placeholder="Can’t sign in to the client’s Canva" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Details" htmlFor="vr-details">
          <Textarea
            id="vr-details"
            rows={5}
            placeholder="What happened, which client or tool, and what you've tried."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </Field>
        <Field label="How urgent is it?" htmlFor="vr-urgent">
          <Select
            id="vr-urgent"
            value={urgent}
            options={[
              { value: "Low", label: "Low — whenever you can" },
              { value: "Medium", label: "Normal" },
              { value: "High", label: "High — it's blocking my work" },
              { value: "Critical", label: "Urgent — a client is affected right now" },
            ]}
            onChange={(e) => setUrgent(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function RequestThread({ request: r, onClose }: { request: TicketOut; onClose: () => void }) {
  const reply = useReplyVaRequest();
  const close = useCloseVaRequest();
  const [text, setText] = useState("");
  const resolved = r.status === "Done";

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    reply.mutate({ id: r.id, text: text.trim() }, { onSuccess: () => setText("") });
  };

  return (
    <Modal
      open
      variant="drawer"
      width={600}
      onClose={onClose}
      titleId="va-request-thread"
      kicker={`${r.code} · ${kindLabel(r).toUpperCase()}`}
      title={r.title}
      subtitle={`${STATUS_TEXT[r.status as BugStatus] ?? r.status} · opened ${formatShort(r.createdAt)}`}
      footer={
        <>
          {!resolved && (
            <Button variant="outline" disabled={close.isPending} onClick={() => close.mutate(r.id)}>
              <Icon name="check" size={13} /> Mark resolved
            </Button>
          )}
          <span className="u-spacer" />
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="stack stack--16">
        <FormError error={reply.error ?? close.error} />
        <div className="support-thread">
          <div className="support-msg support-msg--ours">
            <span className="support-msg__who">You · {formatShortDateTime(r.createdAt)}</span>
            <p className="va-pre">{r.description || "No details."}</p>
          </div>
          {r.messages.map((m) => (
            <div key={m.id} className={cn("support-msg", m.kind === "client" ? "support-msg--ours" : "support-msg--theirs")}>
              <span className="support-msg__who">
                {m.kind === "client" ? "You" : `${m.authorName} · GoCWGL team`} · {formatShortDateTime(m.createdAt)}
              </span>
              <p className="va-pre">{m.text}</p>
            </div>
          ))}
        </div>
        <form className="support-compose" onSubmit={send}>
          <Textarea
            rows={3}
            aria-label="Your reply"
            placeholder={resolved ? "Reply to reopen this request…" : "Write a reply…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="cluster cluster--between">
            <span className="text-small">{resolved ? "Replying reopens it." : "The team gets your reply right away."}</span>
            <Button type="submit" variant="primary" disabled={!text.trim() || reply.isPending}>
              <Icon name="send" size={13} /> {reply.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
