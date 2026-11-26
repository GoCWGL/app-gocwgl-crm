"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Icon } from "@/components/ui";
import type { TaskMessageOut } from "@/utils/api/models";
import { CommentItem, CommentsActivity, type FeedActivity } from "./CommentsActivity";

type Side = "va" | "client";

/** A message icon with a dot and the count: the other side wrote and you haven't opened the task since. */
export function UnreadMark({ count }: { count: number }) {
  return (
    <span className="tk-unread" title={`${count} unread message${count === 1 ? "" : "s"}`} aria-label={`${count} unread message${count === 1 ? "" : "s"}`}>
      <Icon name="message" size={12} />
      {count}
    </span>
  );
}

/**
 * A task's comments and activity: the VA asks for clarification, the client answers (GoCWGL can join from the client
 * portal), alongside what happened on the task. Newest first, each with its date and time.
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
  otherPlural,
  activity,
}: {
  /** Whose portal this is. */
  side: Side;
  /** The other side's name, for the empty state and the placeholder. */
  otherName: string;
  /** The VA on the task, named under the heading on both sides. */
  vaName: string;
  messages: UseQueryResult<TaskMessageOut[]>;
  send: (body: string, done: () => void) => void;
  sending: boolean;
  sendError: unknown;
  /** Cancelled tasks: the comments can be read but not added to. */
  closed?: boolean;
  readOnly?: boolean;
  /** GoCWGL staff looking at the client portal ("View as client"): their own comments are the ones from GoCWGL. */
  staffViewing?: boolean;
  /** The other side is several people (a task shared by several VAs). */
  otherPlural?: boolean;
  /** What happened on the task (requested, subtasks…), shown between the comments. */
  activity?: FeedActivity[];
}) {
  const rows = messages.data ?? [];
  const mine = (m: TaskMessageOut) => m.authorRole === (side === "client" && staffViewing ? "staff" : side);
  const tags = { staff: { label: "GoCWGL", tone: "staff" }, va: { label: "VA", tone: "va" }, client: { label: "Client", tone: "client" } } as const;
  return (
    <CommentsActivity
      subtitle={side === "va" ? `Questions and answers with ${otherName}` : `Questions and answers with ${vaName}`}
      loading={messages.isLoading}
      error={messages.isError ? messages.error : undefined}
      activity={activity}
      comments={rows.map((m) => {
        const own = mine(m);
        return {
          id: m.id,
          at: m.createdAt,
          node: (
            <CommentItem
              name={m.authorName}
              own={own}
              at={m.createdAt}
              tag={own && m.authorRole !== "staff" ? undefined : tags[m.authorRole]}
            >
              {m.body}
            </CommentItem>
          ),
        };
      })}
      write={
        closed || readOnly
          ? undefined
          : { placeholder: side === "va" ? `Write a comment or ask ${otherName} a question…` : "Write a comment…", send, sending, error: sendError }
      }
      closedText={closed ? "This task was cancelled, so comments are closed." : "Viewing only: you can’t write comments."}
      emptyText={
        side === "va"
          ? `No comments yet. Anything unclear? Ask ${otherName} here; they see it on their Tasks page.`
          : `No comments yet. When ${otherName} ${otherPlural ? "have" : "has"} a question about this task, it shows here and you can answer.`
      }
    />
  );
}
