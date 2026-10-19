"use client";

import { useState } from "react";
import { Button, Checkbox, FormError, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { EmbedOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";

type EmbedThreadProps = {
  embed: EmbedOut;
  /** "team" = GoCWGL admin (can flag errors); "client" = the portal user. */
  as: "team" | "client";
  /** Post a comment. `issue` true flags the code as broken, false marks it fixed (team only). */
  onPost: (text: string, issue?: boolean) => Promise<unknown>;
  /** Hide the reply box (read-only "View as client", portal viewers). */
  readOnly?: boolean;
};

/** Comments on a client's embed code, shared by the admin profile and the portal. */
export function EmbedThread({ embed, as, onPost, readOnly }: EmbedThreadProps) {
  const [text, setText] = useState("");
  const [flag, setFlag] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const comments = embed.comments ?? [];
  const isTeam = as === "team";

  const send = async (body: string, issue?: boolean) => {
    setPending(true);
    setError(null);
    try {
      await onPost(body, issue);
      setText("");
      setFlag(false);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const post = () => {
    const body = text.trim();
    if (body) void send(body, isTeam && flag ? true : undefined);
  };

  const markFixed = () => void send(text.trim() || "Marked as fixed. Thanks!", false);

  return (
    <div className="embed-thread">
      {comments.length > 0 ? (
        comments.map((c) => (
          <div key={c.id} className={cn("message", c.flag ? "message--note" : c.authorKind === "client" && "message--violet")}>
            <span className="message__meta">
              {c.authorName} · {c.authorKind === "client" ? "Client" : "GoCWGL team"} · {formatShort(c.createdAt)}
              {c.flag && " · flagged an error"}
            </span>
            {c.text}
          </div>
        ))
      ) : (
        <span className="text-small">
          {isTeam ? "No comments yet. Leave one if something in this code needs fixing." : "No comments from your team yet."}
        </span>
      )}

      {!readOnly && (
        <>
          <Textarea
            rows={2}
            aria-label={isTeam ? "Comment on this embed code" : "Reply to your team"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isTeam ? "e.g. The form is missing its script tag, please copy the full code again" : "Reply to your team…"}
          />
          <FormError error={error} />
          <div className="cluster cluster--8">
            {isTeam && !embed.hasIssue && (
              <Checkbox brand label="Flag as an error the client needs to fix" checked={flag} onChange={() => setFlag(!flag)} />
            )}
            <span className="u-grow" />
            {isTeam && embed.hasIssue && (
              <Button variant="outline" size="sm" onClick={markFixed} disabled={pending}>
                Mark as fixed
              </Button>
            )}
            <Button variant={isTeam && flag ? "danger" : "primary"} size="sm" disabled={!text.trim() || pending} onClick={post}>
              {pending ? "Sending…" : isTeam ? (flag ? "Flag error" : "Comment") : "Reply"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
