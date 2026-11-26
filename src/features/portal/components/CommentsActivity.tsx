"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Avatar, Button, FormError, Icon, type IconName } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { SubtaskOut } from "@/utils/api/models";

/** Something that happened on a task or project (requested, a subtask added or ticked off…), shown under Activity. */
export type FeedActivity = { id: string; at: string; who: string; text: ReactNode; icon: IconName };

/** A comment, already drawn by the caller as an <li> (CommentItem; it knows the author tags, read ticks or quote card). */
export type FeedComment = { id: string; at: string; node: ReactNode };

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? `Today at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};

/** The activity every checklist adds: who added each subtask, and who ticked it off. */
export function subtaskActivity(subtasks: SubtaskOut[] | undefined): FeedActivity[] {
  return (subtasks ?? []).flatMap((s) => [
    ...(s.createdByName
      ? [{ id: `sub-add-${s.id}`, at: s.createdAt, who: s.createdByName, icon: "plus" as const, text: <>added the subtask <b>{s.title}</b></> }]
      : []),
    ...(s.done && s.doneAt
      ? [{ id: `sub-done-${s.id}`, at: s.doneAt, who: s.doneByName || "Someone", icon: "circleCheck" as const, text: <>completed <b>{s.title}</b></> }]
      : []),
  ]);
}

/** One comment: avatar, name with a tag and the time, then the comment in a card. */
export function CommentItem({
  name,
  own,
  tag,
  at,
  children,
  footer,
  bubbleClass,
}: {
  name: string;
  own?: boolean;
  tag?: { label: string; tone: "staff" | "va" | "client" };
  at: string;
  children: ReactNode;
  footer?: ReactNode;
  bubbleClass?: string;
}) {
  return (
    <li className={cn("ca__item", own && "is-mine")}>
      <Avatar name={name} tone={avatarTone(name)} size="sm" />
      <div className="ca__body">
        <span className="ca__meta">
          <strong>{own ? "You" : name}</strong>
          {tag && <span className={`ca__tag ca__tag--${tag.tone}`}>{tag.label}</span>}
          <time dateTime={at} title={new Date(at).toLocaleString()}>
            {when(at)}
          </time>
        </span>
        <div className={cn("ca__bubble", bubbleClass)}>{children}</div>
        {footer}
      </div>
    </li>
  );
}

/**
 * A task's or project's comments and its activity, as two sections: Comments (write one at the top, then newest
 * first, as cards) and Activity below it (what happened on it: requested, subtasks added or completed, a VA assigned…,
 * as a quiet timeline). Enter saves a comment, Shift+Enter adds a line.
 */
export function CommentsActivity({
  subtitle,
  comments,
  activity = [],
  loading,
  error,
  write,
  closedText,
  emptyText,
}: {
  subtitle: string;
  comments: FeedComment[];
  activity?: FeedActivity[];
  loading?: boolean;
  error?: unknown;
  /** Writing a comment; left out when it's read only (closedText says why). */
  write?: { placeholder: string; send: (body: string, done: () => void) => void; sending: boolean; error: unknown };
  closedText?: string;
  emptyText: string;
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [allActivity, setAllActivity] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  // Grow the box with what's typed (up to a few lines).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!write || !body || write.sending) return;
    write.send(body, () => setDraft(""));
  };

  const newest = (a: { at: string; id: string }, b: { at: string; id: string }) =>
    // "Requested" is always the oldest line, even beside subtasks written on the same form.
    b.at.localeCompare(a.at) || Number(a.id === "created") - Number(b.id === "created");
  const sortedComments = [...comments].sort(newest);
  const sortedActivity = [...activity].sort(newest);
  // The latest few, with "Show all" for the rest.
  const ACTIVITY_SHOWN = 5;
  const shownActivity = allActivity ? sortedActivity : sortedActivity.slice(0, ACTIVITY_SHOWN);
  const open = focused || !!draft;

  return (
    <>
      <section className="ca" aria-label="Comments">
        <header className="ca__head">
          <h4 className="tk-sheet__h">
            <Icon name="message" size={14} /> Comments
            {comments.length > 0 && <span className="tk-sheet__count">{comments.length}</span>}
          </h4>
        </header>
        <p className="ca__sub">{subtitle}</p>

        {write ? (
          <form className={cn("ca__write", open && "is-open")} onSubmit={submit}>
            <Avatar name="You" tone="cyan" size="sm" />
            <div className="ca__write-col">
              <div className="ca__input">
                <textarea
                  ref={box}
                  rows={1}
                  value={draft}
                  maxLength={4000}
                  aria-label="Write a comment"
                  placeholder={write.placeholder}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
              </div>
              <FormError error={write.error} />
              {open && (
                <div className="ca__write-foot">
                  {/* Keep focus on the box while clicking Save, so it doesn't fold away first. */}
                  <Button type="submit" size="sm" variant="primary" disabled={!draft.trim() || write.sending} onMouseDown={(e) => e.preventDefault()}>
                    {write.sending ? "Saving…" : "Save"}
                  </Button>
                  <span className="ca__hint">Enter to save · Shift+Enter for a new line</span>
                </div>
              )}
            </div>
          </form>
        ) : (
          closedText && (
            <p className="ca__closed">
              <Icon name="lock" size={12} /> {closedText}
            </p>
          )
        )}

        {loading ? (
          <p className="ca__empty">Loading comments…</p>
        ) : error ? (
          <FormError error={error} />
        ) : !sortedComments.length ? (
          <p className="ca__empty">{emptyText}</p>
        ) : (
          <ol className="ca__list" aria-live="polite">
            {sortedComments.map((c) => (
              <Fragment key={c.id}>{c.node}</Fragment>
            ))}
          </ol>
        )}
      </section>

      {sortedActivity.length > 0 && (
        <section className="ca ca--activity" aria-label="Activity">
          <header className="ca__head">
            <h4 className="tk-sheet__h">
              <Icon name="pulse" size={14} /> Activity
            </h4>
            {sortedActivity.length > ACTIVITY_SHOWN && (
              <button type="button" className="ca__toggle" aria-expanded={allActivity} onClick={() => setAllActivity((a) => !a)}>
                {allActivity ? "Show less" : `Show all (${sortedActivity.length})`}
              </button>
            )}
          </header>
          <ol className="ca__timeline">
            {shownActivity.map((f) => (
              <li key={f.id} className="ca__item ca__item--activity">
                <span className="ca__dot" aria-hidden="true">
                  <Icon name={f.icon} size={12} />
                </span>
                <div className="ca__body">
                  <span className="ca__line">
                    <strong>{f.who}</strong> {f.text}
                  </span>
                  <time dateTime={f.at} title={new Date(f.at).toLocaleString()}>
                    {when(f.at)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
