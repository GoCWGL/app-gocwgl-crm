"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, FormError, Icon, IconButton, IconTile, Input, LoadState, Modal, Select, Textarea, Toggle } from "@/components/ui";
import type { PaymentMethodOut } from "@/utils/api/models";
import { useAddPaymentMethod, useDeletePaymentMethod, usePaymentMethods, useUpdatePaymentMethod } from "@/utils/hooks/useVaInvoices";
import { useVaAccess } from "../../lib/access";
import { METHOD_KINDS, kindLabel, type MethodKind } from "./shared";

/** Invoices › Payment details: where clients pay the VA. Picked when creating an invoice. */
export function PaymentDetails() {
  const query = usePaymentMethods(useVaAccess().ready);
  const save = useUpdatePaymentMethod();
  const remove = useDeletePaymentMethod();
  const [editing, setEditing] = useState<PaymentMethodOut | "new" | null>(null);
  const [confirm, setConfirm] = useState("");

  return (
    <div className="stack stack--14">
      <div className="card va-note">
        <Icon name="lock" size={16} />
        <span className="text-small">
          These go on your invoices so clients know how to pay you. Only you and GoCWGL admins can see them. Changing them later doesn’t change invoices you
          already made.
        </span>
      </div>
      <FormError error={save.error ?? remove.error} />
      <LoadState query={query} loadingText="Loading payment details…">
        <div className="pay-grid">
          {query.data?.map((m) => (
            <article key={m.id} className={`card pay-card${m.isDefault ? " is-default" : ""}`}>
              <header className="pay-card__head">
                <IconTile tone={m.isDefault ? "green" : "slate"} size="md">
                  <Icon name={m.kind === "bank" ? "building" : "card"} size={16} />
                </IconTile>
                <span className="stack stack--2 u-grow u-minw0">
                  <strong className="u-truncate">{m.label}</strong>
                  <span className="text-small">{kindLabel(m.kind)}</span>
                </span>
                {m.isDefault && <Badge tone="green">Default</Badge>}
              </header>
              {m.accountName && <span className="text-small">Account name: {m.accountName}</span>}
              {m.details && <p className="va-pre pay-card__details">{m.details}</p>}
              <footer className="pay-card__foot">
                {!m.isDefault && (
                  <Button size="sm" variant="link" disabled={save.isPending} onClick={() => save.mutate({ id: m.id, body: { isDefault: true } })}>
                    Make default
                  </Button>
                )}
                <span className="u-spacer" />
                <IconButton label="Edit" size="sm" onClick={() => setEditing(m)}>
                  <Icon name="edit" size={13} />
                </IconButton>
                {confirm === m.id ? (
                  <Button size="sm" variant="danger-solid" disabled={remove.isPending} onClick={() => remove.mutate(m.id)}>
                    Delete
                  </Button>
                ) : (
                  <IconButton label="Delete" size="sm" onClick={() => setConfirm(m.id)}>
                    <Icon name="trash" size={13} />
                  </IconButton>
                )}
              </footer>
            </article>
          ))}
          <button type="button" className="pay-add" onClick={() => setEditing("new")}>
            <Icon name="plus" size={18} />
            <strong>Add payment details</strong>
            <span className="text-small">Bank, PayPal, Wise, GCash…</span>
          </button>
        </div>
      </LoadState>
      {editing && <MethodModal method={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function MethodModal({ method, onClose }: { method: PaymentMethodOut | null; onClose: () => void }) {
  const add = useAddPaymentMethod();
  const save = useUpdatePaymentMethod();
  const [kind, setKind] = useState<MethodKind>(method?.kind ?? "bank");
  const [label, setLabel] = useState(method?.label ?? "");
  const [accountName, setAccountName] = useState(method?.accountName ?? "");
  const [details, setDetails] = useState(method?.details ?? "");
  const [isDefault, setIsDefault] = useState(method?.isDefault ?? false);
  const [tried, setTried] = useState(false);
  const busy = add.isPending || save.isPending;
  const hint = METHOD_KINDS.find((k) => k.value === kind)?.hint;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!label.trim()) return;
    const body = { kind, label: label.trim(), accountName: accountName.trim(), details: details.trim(), isDefault };
    if (method) save.mutate({ id: method.id, body }, { onSuccess: onClose });
    else add.mutate(body, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="pay-method"
      kicker="PAYMENT DETAILS"
      title={method ? "Edit payment details" : "Add payment details"}
      subtitle="Shown on the invoices you pick it for."
      width={540}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="stack stack--14">
        <FormError error={add.error ?? save.error} />
        <div className="form-grid">
          <Field label="Type" htmlFor="pm-kind">
            <Select id="pm-kind" value={kind} options={METHOD_KINDS.map((k) => ({ value: k.value, label: k.label }))} onChange={(e) => setKind(e.target.value as MethodKind)} />
          </Field>
          <Field label="Name it" htmlFor="pm-label" required error={tried && !label.trim() && "Give it a name."}>
            <Input id="pm-label" maxLength={80} placeholder="BPI savings" value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
        </div>
        <Field label="Account name" htmlFor="pm-name">
          <Input id="pm-name" maxLength={120} placeholder="As it appears on the account" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </Field>
        <Field label="Details" htmlFor="pm-details" hint={hint}>
          <Textarea id="pm-details" rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
        <Toggle checked={isDefault} onChange={setIsDefault} label="Use by default on new invoices" showLabel />
      </div>
    </Modal>
  );
}
