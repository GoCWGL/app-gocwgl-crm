"use client";

import { Avatar, Badge } from "@/components/ui";
import { EMAIL_STATUS_TONES } from "@/data/admin";
import { avatarTone } from "@/lib/tones";
import { useAdmin } from "../../state/AdminContext";

export function SentEmails() {
  const { state } = useAdmin();
  const { sentEmails, contacts } = state;

  return (
    <section className="card sent-emails">
      <h2 className="card-title">Sent emails</h2>
      <div>
        {sentEmails.map((m) => {
          const contact = contacts.find((c) => c.id === m.cid);
          return (
            <div className="list-row list-row--nowrap sent-email" key={m.id}>
              {contact ? (
                <Avatar name={contact.name} tone={avatarTone(contact.id)} size="md" />
              ) : (
                <Avatar text={String(m.count ?? "")} tone="sky" size="md" />
              )}
              <div className="stack stack--2 u-grow sent-email__body">
                <div className="cluster cluster--between cluster--nowrap">
                  <span className="text-strong u-truncate">{m.to}</span>
                  <span className="text-small u-nowrap">{m.date}</span>
                </div>
                <span className="u-truncate u-semibold">{m.subject}</span>
                <span className="text-small u-truncate">{m.preview}</span>
                <Badge tone={EMAIL_STATUS_TONES[m.status]}>{m.status}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
