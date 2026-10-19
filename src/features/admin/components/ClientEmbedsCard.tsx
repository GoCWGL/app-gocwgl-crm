"use client";

import { useState } from "react";
import { EmbedThread } from "@/components/embeds/EmbedThread";
import { Badge, Button, Icon } from "@/components/ui";
import { EMBED_KINDS } from "@/data/embeds";
import { copyToClipboard } from "@/lib/utils";
import { formatShort } from "@/utils/format/dates";
import { useClientEmbeds, useCommentOnClientEmbed } from "@/utils/hooks/useDelivery";
import { useAdminFunnels } from "@/utils/hooks/usePortal";

/** Embed codes the client pasted in their portal from their own CRM, grouped by funnel. */
export function ClientEmbedsCard({ clientId }: { clientId: string }) {
  const embeds = useClientEmbeds(clientId).data ?? [];
  const funnels = useAdminFunnels(clientId).data ?? [];
  const comment = useCommentOnClientEmbed();
  const [openId, setOpenId] = useState("");
  const [copiedId, setCopiedId] = useState("");
  if (!embeds.length) return null;

  const funnelName = (id: string | null) => (id ? (funnels.find((f) => f.id === id)?.name ?? "Funnel") : "Not linked to a funnel");
  const groups = [...new Set(embeds.map((e) => e.funnelId ?? ""))];
  const issues = embeds.filter((e) => e.hasIssue).length;

  return (
    <div className="inset client-embeds">
      <div className="cluster cluster--nowrap">
        <span className="icon-tile tone-cyan" aria-hidden="true">
          <Icon name="code" size={15} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="kicker">EMBED CODES FROM THEIR CRM · {embeds.length}</span>
          <span className="text-tiny">
            Pasted by the client in their portal. View the code and leave a comment if something needs fixing — the client sees it in their portal.
          </span>
        </span>
        {issues > 0 && (
          <Badge tone="red" mono>
            {issues} NEED{issues === 1 ? "S" : ""} FIX
          </Badge>
        )}
      </div>
      {groups.map((group) => (
        <div className="stack stack--6" key={group || "none"}>
          <span className="kicker kicker--sm kicker--muted">{funnelName(group || null).toUpperCase()}</span>
          {embeds
            .filter((e) => (e.funnelId ?? "") === group)
            .map((e) => {
              const open = openId === e.id;
              const count = e.comments?.length ?? 0;
              return (
                <div className="client-embeds__item" data-issue={e.hasIssue || undefined} key={e.id}>
                  <div className="client-embeds__row">
                    <span className="client-embeds__kind">{EMBED_KINDS.find((k) => k.kind === e.kind)?.short}</span>
                    <span className="client-embeds__label">{e.label}</span>
                    {e.hasIssue && (
                      <Badge tone="red" mono size="xs">
                        NEEDS FIX
                      </Badge>
                    )}
                    {count > 0 && (
                      <span className="text-tiny client-embeds__count" title={`${count} comment${count === 1 ? "" : "s"}`}>
                        <Icon name="message" size={12} /> {count}
                      </span>
                    )}
                    <span className="text-tiny">{formatShort(e.updatedAt)}</span>
                    <Button size="sm" aria-expanded={open} onClick={() => setOpenId(open ? "" : e.id)}>
                      <Icon name={open ? "close" : "eye"} size={13} />
                      {open ? "Hide" : "View code"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        copyToClipboard(e.code);
                        setCopiedId(e.id);
                      }}
                    >
                      {copiedId === e.id ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  {open && (
                    <div className="client-embeds__body">
                      {/* Shown as text only: embed code is untrusted HTML. */}
                      <pre className="code-block client-embeds__code">{e.code}</pre>
                      <span className="kicker kicker--sm kicker--muted">COMMENTS</span>
                      <EmbedThread
                        embed={e}
                        as="team"
                        onPost={(text, issue) => comment.mutateAsync({ contactId: clientId, embedId: e.id, text, issue })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
