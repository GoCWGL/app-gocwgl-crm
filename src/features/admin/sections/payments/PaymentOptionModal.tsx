"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Icon, IconTile, Input, Modal, Select } from "@/components/ui";
import { BILLING_INTERVALS, PAYMENT_METHODS, isPayUrl, type BillingInterval, type PaymentMethod } from "@/data/admin";
import type { PaymentOptionOut } from "@/utils/api/models";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { centsToDollars, dollarsToCents } from "@/utils/format/money";
import { useCreatePaymentOption, useUpdatePaymentOption } from "@/utils/hooks/useBilling";

/** Add or edit a product: a name and price, and optionally the link clients pay it with. A "Bill every" interval makes it a subscription plan. */
export function PaymentOptionModal({
  option,
  onClose,
  onSaved,
}: {
  option?: PaymentOptionOut;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const create = useCreatePaymentOption();
  const update = useUpdatePaymentOption();
  const [name, setName] = useState(option?.name ?? "");
  const [price, setPrice] = useState(option ? centsToDollars(option.amountCents) : "");
  const [method, setMethod] = useState<PaymentMethod>((option?.method as PaymentMethod) ?? "wise");
  const [url, setUrl] = useState(option?.paymentUrl ?? "");
  const [interval, setInterval] = useState<BillingInterval | "">((option?.interval as BillingInterval) ?? "");
  const [error, setError] = useState("");
  const pending = create.isPending || update.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = dollarsToCents(price);
    if (!name.trim()) return setError("Give the product a name. It’s the line the client sees on the invoice.");
    if (!(cents > 0)) return setError("Enter a price above zero.");
    if (url.trim() && !isPayUrl(url)) return setError("The payment link must start with https://");
    const body = { name: name.trim(), amountCents: cents, method, paymentUrl: url.trim() || null, interval: interval || null };
    const onError = (err: unknown) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err));
    if (option) update.mutate({ id: option.id, body }, { onSuccess: (o) => onSaved(`${o.name} updated. New invoices use the new price.`), onError });
    else create.mutate(body, { onSuccess: (o) => onSaved(`${o.name} added to your products. Pick it when you bill a client.`), onError });
  };

  return (
    <Modal
      open
      width={560}
      onClose={onClose}
      onSubmit={submit}
      titleId="po-title"
      kicker="PRODUCTS"
      title={option ? `Edit ${option.name}` : "New product"}
      subtitle="What you sell and its price. Change it here whenever your pricing changes."
      media={
        <IconTile brand size="lg">
          <Icon name="invoice" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : option ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Product name" htmlFor="po-name" required hint="Shown as the invoice line.">
          <Input id="po-name" value={name} placeholder="e.g. Custom CRM build" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Price" htmlFor="po-price" required hint="What one of these costs.">
          <Input id="po-price" type="number" min={0} step="0.01" mono placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Payment method" htmlFor="po-method">
          <Select id="po-method" value={method} options={PAYMENT_METHODS} onChange={(e) => setMethod(e.target.value as PaymentMethod)} />
        </Field>
        <Field label="Bill every" htmlFor="po-int" hint="Pick an interval for a subscription plan.">
          <Select id="po-int" value={interval} onChange={(e) => setInterval(e.target.value as BillingInterval | "")}>
            <option value="">One-time (invoice item)</option>
            {BILLING_INTERVALS.map((i) => (
              <option key={i} value={i}>
                {i} (subscription)
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Payment link" htmlFor="po-url" hint="Optional. The Pay button in the invoice email opens it; without one, the email says you’ll send payment details.">
        <Input id="po-url" type="url" value={url} placeholder="https://wise.com/pay/r/…" onChange={(e) => setUrl(e.target.value)} />
      </Field>
      {option && <p className="text-small text-muted">Invoices already sent keep the link they were sent with.</p>}
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
