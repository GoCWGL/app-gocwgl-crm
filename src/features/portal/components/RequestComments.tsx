"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { FormError, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { RequestCommentOut } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * The comments on a VA request, between the client and GoCWGL (client portal pop-up and the admin request page).
 * GoCWGL's quote for an open project shows as its own message, and the client agreeing to it as a marker. Your
 * comments sit on the right. Enter sends, Shift+Enter adds a line.
 */
export function RequestComments({
  side,
  comments,
  send,
  sending,
  sendError,
  closed,
  readOnly,
  staffViewing,
}: {
  /** Whose screen this is: the client portal, or the admin. */
  side: "client" | "staff";
  comments: UseQueryResult<RequestCommentOut[]>;
  send: (body: string, done: () => void) => void;
  sending: boolean;
  sendError: unknown;
  /** A cancelled request: read only. */
  closed?: boolean;
  readOnly?: boolean;
  /** GoCWGL looking at the client portal ("View as client"): their comments are the GoCWGL ones. */
  staffViewing?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const rows = comments.data ?? [];
  const me = side === "client" && !staffViewing ? "client" : "staff";

  // Keep the newest comment in view.
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

  const other = side === "client" ? "GoCWGL" : "the client";
  return (
    <section className="tk-chat rq-comments" aria-label="Comments">
      <header className="tk-chat__head">
        <span className="tk-chat__head-icon" aria-hidden="true">
          <Icon name="message" size={15} />
        </span>
        <span className="stack stack--0">
          <strong>Comments</strong>
          <span>{side === "client" ? "Questions, answers and your quote, with GoCWGL" : "With the client: questions, answers and the quote"}</span>
        </span>
        {rows.length > 0 && <span className="tk-chat__count">{rows.length}</span>}
      </header>

      <div ref={list} className="tk-chat__list" aria-live="polite">
        {comments.isLoading ? (
          <p className="tk-chat__empty">Loading comments…</p>
        ) : comments.isError ? (
          <FormError error={comments.error} />
        ) : !rows.length ? (
          <div className="tk-chat__empty">
            <span className="tk-chat__empty-icon" aria-hidden="true">
              <Icon name="message" size={22} />
            </span>
            <strong>No comments yet</strong>
            <span>
              {side === "client"
                ? "Ask GoCWGL anything about this request. For an open project, your quote shows here too."
                : "Write to the client about this request. For an open project, send the quote from the Quote card."}
            </span>
          </div>
        ) : (
          rows.map((c) => {
            if (c.kind === "quote_accepted") {
              return (
                <div key={c.id} className="rq-comments__agreed-wrap">
                  <div className="tk-chat__day rq-comments__agreed">
                    <span>
                      <Icon name="circleCheck" size={12} /> {c.authorRole === "client" ? (me === "client" ? "You" : c.authorName) : c.authorName} agreed to{" "}
                      {formatCentsExact(c.amountCents)} · {when(c.createdAt)}
                    </span>
                  </div>
                  <p className="rq-comments__next">
                    {side === "client"
                      ? "Next: GoCWGL sends you the invoice (in Invoices). Once it’s paid, we assign your VA to the project."
                      : "Next: send the client the invoice. Once it’s paid, assign the VA."}
                  </p>
                </div>
              );
            }
            const own = c.authorRole === me;
            return (
              <div key={c.id} className="tk-chat__group">
                <div className={cn("tk-msg", own ? "is-mine" : "is-theirs", `from-${c.authorRole}`)}>
                  {!own && (
                    <span className="tk-msg__avatar" aria-hidden="true">
                      {initials(c.authorName)}
                    </span>
                  )}
                  <div className="tk-msg__col">
                    <span className="tk-msg__meta">
                      <strong>{own ? "You" : c.authorName}</strong>
                      {c.authorRole === "staff" && <span className="tk-msg__tag">GoCWGL</span>}
                      {c.authorRole === "client" && !own && <span className="tk-msg__tag tk-msg__tag--client">Client</span>}
                      <span className="tk-msg__time">{when(c.createdAt)}</span>
                    </span>
                    {c.kind === "quote" ? (
                      <div className="tk-msg__bubble rq-comments__quote">
                        <span className="rq-comments__quote-label">
                          <Icon name="invoice" size={13} /> Quote for this project
                        </span>
                        <strong className="rq-comments__quote-amount">{formatCentsExact(c.amountCents)}</strong>
                        {c.body && <span className="rq-comments__quote-note">{c.body}</span>}
                      </div>
                    ) : (
                      <div className="tk-msg__bubble" title={new Date(c.createdAt).toLocaleString()}>
                        {c.body}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!closed && !readOnly ? (
        <form className="tk-chat__composer" onSubmit={submit}>
          <FormError error={sendError} />
          <div className="tk-chat__input">
            <textarea
              ref={box}
              rows={1}
              value={draft}
              maxLength={4000}
              aria-label="Write a comment"
              placeholder={`Write to ${other}…`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button type="submit" className="tk-chat__send" disabled={!draft.trim() || sending} aria-label="Send comment">
              <Icon name="send" size={15} />
            </button>
          </div>
          <span className="tk-chat__hint">Enter to send · Shift+Enter for a new line</span>
        </form>
      ) : (
        <p className="tk-chat__closed">
          <Icon name="lock" size={12} /> {closed ? "This request was cancelled, so comments are closed." : "Viewing only: you can’t write comments."}
        </p>
      )}
    </section>
  );
}
