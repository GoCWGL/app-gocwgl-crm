"use client";

import { useState } from "react";
import { Button, Checkbox, Textarea } from "@/components/ui";
import type { ClientEmbed } from "@/data/embeds";
import { commentOnEmbed } from "@/lib/embedStore";
import { cn } from "@/lib/utils";

type EmbedThreadProps = {
  clientId: number;
  embed: ClientEmbed;
  /** "team" = GoCWGL admin (can flag errors); "client" = the portal user. */
  as: "team" | "client";
  who: string;
};

/** Comments on a client's embed code, shared by the admin profile and the portal. */
export function EmbedThread({ clientId, embed, as, who }: EmbedThreadProps) {
  const [text, setText] = useState("");
  const [flag, setFlag] = useState(false);
  const comments = embed.comments ?? [];
  const isTeam = as === "team";

  const post = () => {
    const body = text.trim();
    if (!body) return;
    commentOnEmbed(clientId, embed.id, { from: as, who, text: body, flag: isTeam && flag }, isTeam && flag ? true : undefined);
    setText("");
    setFlag(false);
  };

  const markFixed = () => {
    commentOnEmbed(clientId, embed.id, { from: "team", who, text: text.trim() || "Marked as fixed. Thanks!" }, false);
    setText("");
  };

  return (
    <div className="embed-thread">
      {comments.length > 0 ? (
        comments.map((c) => (
          <div key={c.id} className={cn("message", c.flag ? "message--note" : c.from === "client" && "message--violet")}>
            <span className="message__meta">
              {c.who} · {c.from === "team" ? "GoCWGL team" : "Client"} · {c.when}
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

      <Textarea
        rows={2}
        aria-label={isTeam ? "Comment on this embed code" : "Reply to your team"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isTeam ? "e.g. The form is missing its script tag, please copy the full code again" : "Reply to your team…"}
      />
      <div className="cluster cluster--8">
        {isTeam && !embed.issue && <Checkbox brand label="Flag as an error the client needs to fix" checked={flag} onChange={() => setFlag(!flag)} />}
        <span className="u-grow" />
        {isTeam && embed.issue && (
          <Button variant="outline" size="sm" onClick={markFixed}>
            Mark as fixed
          </Button>
        )}
        <Button variant={isTeam && flag ? "danger" : "primary"} size="sm" disabled={!text.trim()} onClick={post}>
          {isTeam ? (flag ? "Flag error" : "Comment") : "Reply"}
        </Button>
      </div>
    </div>
  );
}
