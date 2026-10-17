"use client";

import { useState } from "react";
import { EmbedThread } from "@/components/embeds/EmbedThread";
import { Badge, Button, Icon } from "@/components/ui";
import { EMBED_KINDS } from "@/data/embeds";
import { useClientEmbeds } from "@/lib/embedStore";
import { copyToClipboard } from "@/lib/utils";
import { useAdmin } from "../state/AdminContext";

/** Embed codes the client pasted in their portal from their own CRM, grouped by funnel. */
export function ClientEmbedsCard({ clientId }: { clientId: number }) {
  const { state } = useAdmin();
  const embeds = useClientEmbeds(clientId);
  const [openId, setOpenId] = useState(0);
  const [copiedId, setCopiedId] = useState(0);
  if (!embeds.length) return null;

  const funnels = [...new Set(embeds.map((e) => e.funnel))];
  const issues = embeds.filter((e) => e.issue).length;

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
      {funnels.map((funnel) => (
        <div className="stack stack--6" key={funnel}>
          <span className="kicker kicker--sm kicker--muted">{funnel.toUpperCase()}</span>
          {embeds
            .filter((e) => e.funnel === funnel)
            .map((e) => {
              const open = openId === e.id;
              const count = e.comments?.length ?? 0;
              return (
                <div className="client-embeds__item" data-issue={e.issue || undefined} key={e.id}>
                  <div className="client-embeds__row">
                    <span className="client-embeds__kind">{EMBED_KINDS.find((k) => k.kind === e.kind)?.short}</span>
                    <span className="client-embeds__label">{e.label}</span>
                    {e.issue && (
                      <Badge tone="red" mono size="xs">
                        NEEDS FIX
                      </Badge>
                    )}
                    {count > 0 && (
                      <span className="text-tiny client-embeds__count" title={`${count} comment${count === 1 ? "" : "s"}`}>
                        <Icon name="message" size={12} /> {count}
                      </span>
                    )}
                    <span className="text-tiny">{e.updated}</span>
                    <Button size="sm" aria-expanded={open} onClick={() => setOpenId(open ? 0 : e.id)}>
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
                      <pre className="code-block client-embeds__code">{e.code}</pre>
                      <span className="kicker kicker--sm kicker--muted">COMMENTS</span>
                      <EmbedThread clientId={clientId} embed={e} as="team" who={state.settings.name || "GoCWGL team"} />
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
