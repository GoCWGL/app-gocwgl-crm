"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, FormError, Icon, IconTile, Input, Modal, Select, Textarea } from "@/components/ui";
import { formatReferralCode } from "@/data/affiliates";
import type { ReferralOut } from "@/utils/api/models";
import { centsToDollars, dollarsToCents, formatCents } from "@/utils/format/money";
import { useAffiliateProgram, useCreateReferral, useUpdateReferral } from "@/utils/hooks/useAffiliates";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { contactName } from "../../lib/contacts";

/** Link a client to whoever referred them, e.g. they signed up with Google or forgot the referral ID. */
export function LinkReferralModal({ open, onClose, onLinked }: { open: boolean; onClose: () => void; onLinked: (r: ReferralOut) => void }) {
  const contacts = useAllContacts({}, open).data ?? [];
  const create = useCreateReferral();
  const [referrer, setReferrer] = useState("");
  const [referred, setReferred] = useState("");
  const options = [...contacts]
    .sort((a, b) => contactName(a).localeCompare(contactName(b)))
    .map((c) => ({ value: c.id, label: [contactName(c), c.company].filter(Boolean).join(" · ") }));

  const close = () => {
    setReferrer("");
    setReferred("");
    create.reset();
    onClose();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!referrer || !referred) return;
    create.mutate(
      { referrerContactId: referrer, referredContactId: referred },
      {
        onSuccess: (r) => {
          onLinked(r);
          close();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      titleId="link-ref-title"
      kicker="AFFILIATES"
      title="Link a referral"
      subtitle="For a client who was referred but didn’t enter a referral ID when they signed up."
      width={520}
      media={
        <IconTile tone="amber" size="lg">
          <Icon name="gift" size={18} />
        </IconTile>
      }
      onSubmit={submit}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!referrer || !referred || referrer === referred || create.isPending}>
            {create.isPending ? "Linking…" : "Link referral"}
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        <Field label="Referred client (the new client)" htmlFor="link-ref-referred" strongLabel>
          <Select id="link-ref-referred" placeholder="Choose a client…" options={options} value={referred} onChange={(e) => setReferred(e.target.value)} />
        </Field>
        <Field label="Referred by" htmlFor="link-ref-referrer" strongLabel error={referrer && referrer === referred ? "A client can’t refer themselves." : ""}>
          <Select
            id="link-ref-referrer"
            placeholder="Choose who referred them…"
            options={options}
            value={referrer}
            onChange={(e) => setReferrer(e.target.value)}
          />
        </Field>
        <FormError error={create.error} />
      </div>
    </Modal>
  );
}

/** This referral's own bonus amount (or the program's), and a note for the team. */
export function EditReferralModal({ referral, onClose }: { referral: ReferralOut | null; onClose: () => void }) {
  // Keyed by referral so the form starts from that referral's values each time it opens.
  return referral ? <EditReferralForm key={referral.id} referral={referral} onClose={onClose} /> : null;
}

function EditReferralForm({ referral: r, onClose }: { referral: ReferralOut; onClose: () => void }) {
  const program = useAffiliateProgram().data;
  const save = useUpdateReferral();
  const paid = r.bonusStatus === "paid";
  const [useProgram, setUseProgram] = useState(!r.customBonus);
  const [amount, setAmount] = useState(centsToDollars(r.bonusCents));
  const [note, setNote] = useState(r.note);
  const referred = r.referred.name || r.referred.email;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = paid ? { note } : { note, bonusCents: useProgram ? null : dollarsToCents(amount) };
    save.mutate({ id: r.id, body }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      titleId="edit-ref-title"
      kicker={`REFERRAL · ${r.code ? formatReferralCode(r.code) : "LINKED BY THE TEAM"}`}
      title={`${referred}’s referral bonus`}
      subtitle={`Referred by ${r.referrer.name || r.referrer.email}`}
      width={500}
      onSubmit={submit}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="stack stack--12">
        {paid ? (
          <div className="notice notice--success" role="status">
            {formatCents(r.bonusCents)} was paid to {r.referrer.name || r.referrer.email}. Undo the payout to change the amount.
          </div>
        ) : (
          <>
            <Checkbox
              brand
              label={`Use the program’s bonus${program ? ` (${formatCents(program.bonusCents, program.currency)})` : ""}`}
              checked={useProgram}
              onChange={() => setUseProgram((v) => !v)}
            />
            {!useProgram && (
              <Field label="This referral’s bonus" htmlFor="edit-ref-amount" strongLabel>
                <Input id="edit-ref-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              </Field>
            )}
          </>
        )}
        <Field label="Note for the team" htmlFor="edit-ref-note" hint="Not shown to the client, e.g. how the bonus was paid.">
          <Textarea id="edit-ref-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <FormError error={save.error} />
      </div>
    </Modal>
  );
}
