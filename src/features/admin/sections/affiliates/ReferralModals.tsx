"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, FormError, Icon, IconTile, Input, Modal, Select, Textarea } from "@/components/ui";
import { formatReferralCode, payoutMethodLabel } from "@/data/affiliates";
import type { ReferralOut } from "@/utils/api/models";
import { centsToDollars, dollarsToCents, formatCents } from "@/utils/format/money";
import { useAffiliateProgram, useCreateReferral, usePayoutDetails, useUpdateReferral } from "@/utils/hooks/useAffiliates";
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
  const [amount, setAmount] = useState(r.bonusCents === null ? "" : centsToDollars(r.bonusCents));
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
      title={`${r.referrer.name || r.referrer.email}’s bonus`}
      subtitle={`For referring ${referred}. The bonus is paid to the referrer, not the new client.`}
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
            {formatCents(r.bonusCents ?? 0)} was paid to {r.referrer.name || r.referrer.email}. Undo the payout to change the amount.
          </div>
        ) : (
          <>
            <Checkbox
              brand
              label={`Use the program’s bonus for their CRM package${
                program
                  ? ` (${formatCents(program.simpleBonusCents, program.currency)} Simple, ${formatCents(program.customBonusCents, program.currency)} Custom)`
                  : ""
              }`}
              checked={useProgram}
              onChange={() => setUseProgram((v) => !v)}
            />
            {!useProgram && (
              <Field label={`${r.referrer.name || r.referrer.email}’s bonus for this referral`} htmlFor="edit-ref-amount" strongLabel>
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

const DETAIL_LABELS: Record<string, string> = {
  email: "Account email",
  payment_link: "Wise payment link",
  bank_name: "Bank",
  account_number: "Account number",
  routing_number: "Routing number",
  swift: "SWIFT / BIC",
  country: "Country",
};

/** Where the referrer wants bonuses sent, in full, for sending the money. Owners and admins only; each look is logged. */
export function PayoutDetailsModal({ referral: r, onClose }: { referral: ReferralOut; onClose: () => void }) {
  const query = usePayoutDetails(r.referrer.id);
  const p = query.data;
  const who = r.referrer.name || r.referrer.email;

  return (
    <Modal
      open
      onClose={onClose}
      titleId="payout-title"
      kicker="PAYOUT DETAILS"
      title={`Send ${who}’s bonus`}
      subtitle={r.bonusCents !== null ? `${formatCents(r.bonusCents)} for referring ${r.referred.name || r.referred.email}` : undefined}
      width={480}
      media={
        <IconTile tone="green" size="lg">
          <Icon name="dollar" size={18} />
        </IconTile>
      }
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {query.isPending ? (
        <p className="text-small">Loading…</p>
      ) : p ? (
        <dl className="payout-details">
          <dt>Method</dt>
          <dd>{payoutMethodLabel(p.method)}</dd>
          <dt>Name on account</dt>
          <dd>{p.holderName}</dd>
          {Object.entries(p.details).map(([k, v]) => (
            <div key={k} className="payout-details__row">
              <dt>{DETAIL_LABELS[k] ?? k}</dt>
              <dd className="data-table__mono">
                {k === "payment_link" && /^https:\/\//.test(String(v)) ? (
                  <a href={String(v)} target="_blank" rel="noopener noreferrer">
                    {String(v)}
                  </a>
                ) : (
                  String(v)
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <FormError error={query.error} />
      <p className="text-small">Only owners and admins can see these details, and each view is recorded in the audit log.</p>
    </Modal>
  );
}
