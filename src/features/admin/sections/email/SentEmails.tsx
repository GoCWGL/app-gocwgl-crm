"use client";

import { Avatar, Badge, LoadState } from "@/components/ui";
import { EMAIL_STATUS_TONES, type EmailStatus } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { formatShort } from "@/utils/format/dates";
import { useSentEmails } from "@/utils/hooks/useMarketing";

export function SentEmails() {
  const sent = useSentEmails();

  return (
    <section className="card sent-emails">
      <h2 className="card-title">Sent emails</h2>
      <LoadState query={sent} isEmpty={!sent.data?.length} empty="No emails sent yet.">
        <div>
          {sent.data?.map((m) => (
            <div className="list-row list-row--nowrap sent-email" key={m.id}>
              {m.contactId ? (
                <Avatar name={m.toLabel} tone={avatarTone(m.contactId)} size="md" />
              ) : (
                <Avatar text={String(m.recipientCount || "")} tone="sky" size="md" />
              )}
              <div className="stack stack--2 u-grow sent-email__body">
                <div className="cluster cluster--between cluster--nowrap">
                  <span className="text-strong u-truncate">{m.toLabel}</span>
                  <span className="text-small u-nowrap">{formatShort(m.createdAt)}</span>
                </div>
                <span className="u-truncate u-semibold">{m.subject}</span>
                <span className="text-small u-truncate">{m.preview}</span>
                <Badge tone={EMAIL_STATUS_TONES[m.status as EmailStatus] ?? "neutral"}>{m.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </LoadState>
    </section>
  );
}
