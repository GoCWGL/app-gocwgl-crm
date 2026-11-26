"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Icon } from "@/components/ui";
import type { RequestCommentOut } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { CommentItem, CommentsActivity, type FeedActivity } from "./CommentsActivity";

/**
 * The comments and activity on a VA request, between the client and GoCWGL (client portal pop-up and the admin request
 * page). GoCWGL's quote for an open project shows as its own card, and the client agreeing to it as a line in the
 * activity. Newest first.
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
  activity,
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
  /** What happened on the request (sent, reviewed, a VA assigned, subtasks…), shown between the comments. */
  activity?: FeedActivity[];
}) {
  const rows = comments.data ?? [];
  const me = side === "client" && !staffViewing ? "client" : "staff";
  return (
    <CommentsActivity
      subtitle={side === "client" ? "Questions, answers and your quote, with GoCWGL" : "With the client: questions, answers and the quote"}
      loading={comments.isLoading}
      error={comments.isError ? comments.error : undefined}
      activity={activity}
      comments={rows.map((c) => {
        const own = c.authorRole === me;
        if (c.kind === "quote_accepted") {
          return {
            id: c.id,
            at: c.createdAt,
            node: (
              <li className="ca__item ca__item--activity ca__item--agreed">
                <span className="ca__dot" aria-hidden="true">
                  <Icon name="circleCheck" size={12} />
                </span>
                <div className="ca__body">
                  <span className="ca__line">
                    <strong>{c.authorRole === "client" && me === "client" ? "You" : c.authorName}</strong> agreed to <b>{formatCentsExact(c.amountCents)}</b>
                  </span>
                  <span className="ca__next">
                    {side === "client"
                      ? "Next: GoCWGL sends you the invoice (in Invoices). Once it’s paid, we assign your VA to the project."
                      : "Next: send the client the invoice. Once it’s paid, assign the VA."}
                  </span>
                </div>
              </li>
            ),
          };
        }
        return {
          id: c.id,
          at: c.createdAt,
          node: (
            <CommentItem
              name={c.authorName}
              own={own}
              at={c.createdAt}
              tag={c.authorRole === "staff" ? { label: "GoCWGL", tone: "staff" } : !own ? { label: "Client", tone: "client" } : undefined}
              bubbleClass={c.kind === "quote" ? "rq-comments__quote" : undefined}
            >
              {c.kind === "quote" ? (
                <>
                  <span className="rq-comments__quote-label">
                    <Icon name="invoice" size={13} /> Quote for this project
                  </span>
                  <strong className="rq-comments__quote-amount">{formatCentsExact(c.amountCents)}</strong>
                  {c.body && <span className="rq-comments__quote-note">{c.body}</span>}
                </>
              ) : (
                c.body
              )}
            </CommentItem>
          ),
        };
      })}
      write={closed || readOnly ? undefined : { placeholder: side === "client" ? "Write a comment…" : "Write to the client…", send, sending, error: sendError }}
      closedText={closed ? "This request was cancelled, so comments are closed." : "Viewing only: you can’t write comments."}
      emptyText={
        side === "client"
          ? "No comments yet. Ask GoCWGL anything about this request. For an open project, your quote shows here too."
          : "No comments yet. Write to the client about this request. For an open project, send the quote from the Quote card."
      }
    />
  );
}
