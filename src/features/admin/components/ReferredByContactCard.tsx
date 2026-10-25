"use client";

import { useState } from "react";
import { Badge, Button, Field, FormError, Icon, Select } from "@/components/ui";
import { formatReferralCode } from "@/data/affiliates";
import type { ContactOut } from "@/utils/api/models";
import { isSuperAdmin } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { useContactReferrer, useSetContactReferrer } from "@/utils/hooks/useAffiliates";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useMe } from "@/utils/hooks/useUsers";
import { contactName } from "../lib/contacts";
import { useAdmin } from "../state/AdminContext";

/**
 * Contact profile › "Referred by": who referred this contact (they get the referral bonus). Everyone on the team can see
 * it; only super admins can set, change or clear it (the API enforces this too).
 */
export function ReferredByContactCard({ contact: c }: { contact: ContactOut }) {
  const { update } = useAdmin();
  const canEdit = isSuperAdmin(useMe().data);
  const query = useContactReferrer(c.id);
  const save = useSetContactReferrer();
  const contacts = useAllContacts({}, canEdit).data ?? [];
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState("");
  const data = query.data;
  const current = data?.referrer;

  const options = contacts
    .filter((x) => x.id !== c.id)
    .sort((a, b) => contactName(a).localeCompare(contactName(b)))
    .map((x) => ({ value: x.id, label: [contactName(x), x.company].filter(Boolean).join(" · ") }));

  const apply = (referrerContactId: string | null) =>
    save.mutate(
      { contactId: c.id, referrerContactId },
      {
        onSuccess: (r) => {
          setEditing(false);
          update({ toast: r.referrer ? `${contactName(c)} is now ${r.referrer.name || r.referrer.email}’s referral.` : "Referrer removed." });
        },
      },
    );

  return (
    <div className="inset referred-by-contact">
      <div className="cluster cluster--nowrap">
        <span className="icon-tile tone-amber" aria-hidden="true">
          <Icon name="userPlus" size={15} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="kicker">REFERRED BY</span>
          <span className="text-tiny">
            {!data
              ? "Checking…"
              : current
                ? `${current.name || current.email}${current.company ? ` · ${current.company}` : ""} gets the referral bonus${
                    data.code ? ` · used ID ${formatReferralCode(data.code)}` : " · set by the team"
                  }${data.linkedAt ? ` · ${formatShort(data.linkedAt)}` : ""}`
                : data.windowOpen && data.deadline
                  ? `No one yet. They can add it in their portal until ${formatShort(data.deadline)}.`
                  : "No one."}
          </span>
        </span>
        {data?.bonusPaid && (
          <Badge tone="green" mono>
            BONUS PAID
          </Badge>
        )}
        {canEdit && data && !editing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setChoice(current?.id ?? "");
              setEditing(true);
            }}
          >
            {current ? "Change" : "Set referrer"}
          </Button>
        )}
      </div>

      {editing && (
        <div className="stack stack--8">
          {data?.bonusPaid && (
            <div className="notice notice--warning" role="status">
              <span>The bonus for this referral is already paid. Undo the payout on the Affiliates page before changing the referrer.</span>
            </div>
          )}
          <Field label="Who referred this contact" htmlFor={`ref-by-${c.id}`}>
            <Select id={`ref-by-${c.id}`} placeholder="Choose a client…" options={options} value={choice} onChange={(e) => setChoice(e.target.value)} />
          </Field>
          <div className="cluster cluster--8">
            <Button size="sm" variant="primary" disabled={!choice || choice === current?.id || save.isPending} onClick={() => apply(choice)}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            {current && (
              <Button size="sm" variant="danger" disabled={save.isPending} onClick={() => apply(null)}>
                Remove referrer
              </Button>
            )}
            <Button size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
          <span className="text-tiny">Only super admins can change this. It decides who gets the referral bonus.</span>
        </div>
      )}
      <FormError error={save.error ?? query.error} />
    </div>
  );
}
