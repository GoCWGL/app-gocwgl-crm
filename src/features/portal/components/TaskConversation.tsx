"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { FormError, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { TaskMessageOut } from "@/utils/api/models";

type Side = "va" | "client";

/** Under your own message: one tick when sent, two (colored) once the other side has read it. */
function Receipt({ read, who }: { read: boolean; who: string }) {
  return (
    <span className={cn("tk-msg__receipt", read && "is-read")} title={read ? `Read by ${who}` : "Sent"}>
      <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden="true">
        <path d="M1 6l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {read && <path d="M7 9l1 0.5L14 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {read ? "Read" : "Sent"}
    </span>
  );
}

/** A message icon with a dot and the count: the other side wrote and you haven't opened the task since. */
export function UnreadMark({ count }: { count: number }) {
  return (
    <span className="tk-unread" title={`${count} unread message${count === 1 ? "" : "s"}`} aria-label={`${count} unread message${count === 1 ? "" : "s"}`}>
      <Icon name="message" size={12} />
      {count}
    </span>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

/**
 * A task's conversation: the VA asks for clarification, the client answers (GoCWGL can join from the client portal).
 * Your messages sit on the right; the other side's on the left. Enter sends, Shift+Enter adds a line.
 */
export function TaskConversation({
  side,
  otherName,
  vaName,
  messages,
  send,
  sending,
  sendError,
  closed,
  readOnly,
  staffViewing,
  otherReadAt,
  otherPlural,
}: {
  /** Whose portal this is. */
  side: Side;
  /** The other side's name, for the empty state and the placeholder. */
  otherName: string;
  /** The VA on the task, named in the header on both sides. */
  vaName: string;
  messages: UseQueryResult<TaskMessageOut[]>;
  send: (body: string, done: () => void) => void;
  sending: boolean;
  sendError: unknown;
  /** Cancelled tasks: the conversation can be read but not added to. */
  closed?: boolean;
  readOnly?: boolean;
  /** GoCWGL staff looking at the client portal ("View as client"): their own messages are the ones from GoCWGL. */
  staffViewing?: boolean;
  /** When the other side last read the conversation: your messages before then show as read. */
  otherReadAt?: string | null;
  /** The other side is several people (a task shared by several VAs). */
  otherPlural?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const rows = messages.data ?? [];
  const mine = (m: TaskMessageOut) => m.authorRole === (side === "client" && staffViewing ? "staff" : side);

  // Keep the newest message in view.
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  // Grow the box with what's typed (up to a few lines).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    send(body, () => setDraft(""));
  };

  const canWrite = !closed && !readOnly;
  return (
    <section className="tk-chat" aria-label="Conversation">
      <header className="tk-chat__head">
        <span className="tk-chat__head-icon" aria-hidden="true">
          <Icon name="message" size={15} />
        </span>
        <span className="stack stack--0">
          <strong>Conversation</strong>
          <span>Questions and answers with {vaName}</span>
        </span>
        {rows.length > 0 && <span className="tk-chat__count">{rows.length}</span>}
      </header>

      <div ref={list} className="tk-chat__list" aria-live="polite">
        {messages.isLoading ? (
          <p className="tk-chat__empty">Loading the conversation…</p>
        ) : messages.isError ? (
          <FormError error={messages.error} />
        ) : !rows.length ? (
          <div className="tk-chat__empty">
            <span className="tk-chat__empty-icon" aria-hidden="true">
              <Icon name="message" size={22} />
            </span>
            <strong>No messages yet</strong>
            <span>
              {side === "va"
                ? `Anything unclear? Ask ${otherName} here; they get it on their Tasks page.`
                : `When ${otherName} ${otherPlural ? "have" : "has"} a question about this task, it shows here and you can answer.`}
            </span>
          </div>
        ) : (
          rows.map((m, i) => {
            const own = mine(m);
            const newDay = i === 0 || dayKey(rows[i - 1].createdAt) !== dayKey(m.createdAt);
            const grouped = !newDay && i > 0 && rows[i - 1].authorRole === m.authorRole && rows[i - 1].authorName === m.authorName;
            return (
              <div key={m.id} className="tk-chat__group">
                {newDay && (
                  <div className="tk-chat__day">
                    <span>{dayLabel(m.createdAt)}</span>
                  </div>
                )}
                <div className={cn("tk-msg", own ? "is-mine" : "is-theirs", `from-${m.authorRole}`, grouped && "is-grouped")}>
                  {!own && (
                    <span className="tk-msg__avatar" aria-hidden="true">
                      {grouped ? "" : initials(m.authorName)}
                    </span>
                  )}
                  <div className="tk-msg__col">
                    {!grouped && (
                      <span className="tk-msg__meta">
                        <strong>{own ? "You" : m.authorName}</strong>
                        {m.authorRole === "staff" && <span className="tk-msg__tag">GoCWGL</span>}
                        {m.authorRole === "va" && !own && <span className="tk-msg__tag tk-msg__tag--va">VA</span>}
                        {m.authorRole === "client" && !own && <span className="tk-msg__tag tk-msg__tag--client">Client</span>}
                        <span className="tk-msg__time">{time(m.createdAt)}</span>
                      </span>
                    )}
                    <div className="tk-msg__bubble" title={new Date(m.createdAt).toLocaleString()}>
                      {m.body}
                    </div>
                    {own && <Receipt read={!!otherReadAt && Date.parse(otherReadAt) >= Date.parse(m.createdAt)} who={otherName} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canWrite ? (
        <form className="tk-chat__composer" onSubmit={submit}>
          <FormError error={sendError} />
          <div className="tk-chat__input">
            <textarea
              ref={box}
              rows={1}
              value={draft}
              maxLength={4000}
              aria-label="Write a message"
              placeholder={side === "va" ? `Ask ${otherName} a question…` : `Reply to ${otherName}…`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button type="submit" className="tk-chat__send" disabled={!draft.trim() || sending} aria-label="Send message">
              <Icon name="send" size={15} />
            </button>
          </div>
          <span className="tk-chat__hint">Enter to send · Shift+Enter for a new line</span>
        </form>
      ) : (
        <p className="tk-chat__closed">
          <Icon name="lock" size={12} /> {closed ? "This task was cancelled, so the conversation is closed." : "Viewing only: you can’t send messages."}
        </p>
      )}
    </section>
  );
}
