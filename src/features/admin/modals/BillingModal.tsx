"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Icon, IconButton, IconTile, Input, Modal, SegmentedControl, Select } from "@/components/ui";
import { BILLING_INTERVALS, PAYMENT_PROVIDERS, type BillingInterval } from "@/data/admin";
import { isStaffAdmin } from "@/utils/auth/session";
import { addDaysIso, todayIso } from "@/utils/format/dates";
import { centsToDollars, dollarsToCents, formatCents, formatCentsExact } from "@/utils/format/money";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useCreateInvoice, useCreateSubscription, usePaymentConnections, useSubscriptions } from "@/utils/hooks/useBilling";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useSettings } from "@/utils/hooks/useSettings";
import { useMe } from "@/utils/hooks/useUsers";
import { connectionOf, providerName } from "../lib/billing";
import { contactName } from "../lib/contacts";

type LineDraft = { desc: string; qty: string; price: string };

type BillingModalProps = {
  kind: "invoice" | "sub";
  onKind: (kind: "invoice" | "sub") => void;
  onClose: () => void;
  /** Called with the table to show and a confirmation message. */
  onCreated: (view: "subs" | "inv", message: string) => void;
};

/** Create a one-time invoice or a recurring subscription for a client. Totals are computed by the API. */
export function BillingModal({ kind, onKind, onClose, onCreated }: BillingModalProps) {
  const canAdmin = isStaffAdmin(useMe().data);
  const contacts = useAllContacts().data ?? [];
  const subs = useSubscriptions().data ?? [];
  const connections = usePaymentConnections(canAdmin).data;
  const settings = useSettings().data;
  const createInvoice = useCreateInvoice();
  const createSub = useCreateSubscription();
  const connected = PAYMENT_PROVIDERS.filter((p) => connectionOf(connections, p.id));
  const defaultProvider = connected.find((p) => p.id === settings?.defaultPaymentProvider) ?? connected[0];
  // A new subscription starts from the plan most clients already have (display default only).
  const template = subs.find((s) => s.status === "Active") ?? subs[0];

  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<LineDraft[]>([{ desc: "", qty: "1", price: "" }]);
  const [due, setDue] = useState("7");
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState(template?.plan ?? "Monthly retainer");
  const [amount, setAmount] = useState(template ? centsToDollars(template.amountCents) : "97");
  const [interval, setInterval] = useState<BillingInterval>((template?.interval as BillingInterval) ?? "Month");
  const [trial, setTrial] = useState("0");
  const [error, setError] = useState("");

  const isInvoice = kind === "invoice";
  const client = contacts.find((c) => c.id === clientId);
  const lineCents = (it: LineDraft) => (Math.max(1, Number(it.qty) || 1)) * dollarsToCents(it.price || 0);
  // Preview only: the saved invoice's total comes back from the API as totalCents.
  const estimate = items.reduce((n, it) => n + lineCents(it), 0);
  const patchItem = (i: number, patch: Partial<LineDraft>) => {
    setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
    setError("");
  };
  const pending = createInvoice.isPending || createSub.isPending;
  const onError = (err: unknown) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err));

  const create = (draft: boolean) => {
    if (!client) return setError("Choose a client first.");

    if (isInvoice) {
      const lines = items.filter((it) => it.desc.trim() && dollarsToCents(it.price) > 0);
      if (!lines.length) return setError("Add at least one line with a description and price.");
      createInvoice.mutate(
        {
          contactId: client.id,
          items: lines.map((it) => ({ description: it.desc.trim(), quantity: Math.max(1, Number(it.qty) || 1), unitPriceCents: dollarsToCents(it.price) })),
          dueDate: due === "0" ? null : addDaysIso(todayIso(), Number(due)),
          note: note.trim(),
          send: !draft,
        },
        {
          onSuccess: (iv) =>
            onCreated(
              "inv",
              draft ? `${iv.number} saved as a draft.` : `${iv.number} (${formatCentsExact(iv.totalCents, iv.currency)}) sent to ${client.email}.`,
            ),
          onError,
        },
      );
      return;
    }

    const cents = dollarsToCents(amount);
    if (!(cents > 0)) return setError("Enter an amount above zero.");
    const trialDays = Number(trial);
    createSub.mutate(
      {
        contactId: client.id,
        plan: plan.trim() || "Monthly retainer",
        amountCents: cents,
        interval,
        nextBillingDate: addDaysIso(todayIso(), trialDays),
        status: trialDays ? "Trial" : "Awaiting payment",
      },
      {
        onSuccess: (sub) =>
          onCreated("subs", `Subscription for ${contactName(client)} created: ${formatCents(sub.amountCents, sub.currency)} per ${sub.interval.toLowerCase()}.`),
        onError,
      },
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create(false);
  };

  return (
    <Modal
      open
      width={680}
      onClose={onClose}
      onSubmit={submit}
      titleId="bm-title"
      kicker="BILL A CLIENT"
      title={isInvoice ? "New invoice" : "New subscription"}
      media={
        <IconTile brand size="lg">
          <Icon name="invoice" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {isInvoice && (
            <Button variant="accent" onClick={() => create(true)} disabled={pending}>
              Save as draft
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : isInvoice ? "Send invoice" : "Create subscription"}
          </Button>
        </>
      }
    >
      <SegmentedControl
        variant="soft"
        label="Billing type"
        value={kind}
        onChange={(k) => {
          onKind(k);
          setError("");
        }}
        options={[
          { value: "invoice", label: "One-time invoice" },
          { value: "sub", label: "Subscription" },
        ]}
      />
      <div className="form-grid">
        <Field label="Client" htmlFor="bm-client" required>
          <Select
            id="bm-client"
            value={clientId}
            placeholder="Choose a client…"
            options={contacts.map((c) => ({ value: c.id, label: `${contactName(c)} — ${c.email}` }))}
            onChange={(e) => {
              setClientId(e.target.value);
              setError("");
            }}
          />
        </Field>
        <Field label="Clients pay with" htmlFor="bm-method" hint="Your default checkout (Payments › Payment methods).">
          <Input
            id="bm-method"
            readOnly
            value={!canAdmin ? "Your default checkout" : defaultProvider ? providerName(defaultProvider, connections) : "Connect a payment method first"}
          />
        </Field>
      </div>

      {isInvoice ? (
        <div className="stack stack--8">
          <span className="kicker">LINE ITEMS</span>
          {items.map((it, i) => (
            <div className="line-item" key={i}>
              <Input
                className="line-item__desc"
                aria-label="Item description"
                value={it.desc}
                placeholder="e.g. Landing page setup"
                onChange={(e) => patchItem(i, { desc: e.target.value })}
              />
              <Input
                className="line-item__qty"
                type="number"
                min={1}
                mono
                aria-label="Quantity"
                value={it.qty}
                onChange={(e) => patchItem(i, { qty: e.target.value })}
              />
              <Input
                className="line-item__price"
                type="number"
                min={0}
                step="0.01"
                mono
                aria-label="Unit price"
                placeholder="0.00"
                value={it.price}
                onChange={(e) => patchItem(i, { price: e.target.value })}
              />
              <span className="line-item__total">{formatCentsExact(lineCents(it))}</span>
              <IconButton
                label="Remove line"
                danger
                onClick={() => setItems(items.length > 1 ? items.filter((_, k) => k !== i) : [{ desc: "", qty: "1", price: "" }])}
              >
                ×
              </IconButton>
            </div>
          ))}
          <Button variant="dashed" size="sm" onClick={() => setItems([...items, { desc: "", qty: "1", price: "" }])}>
            + Add line
          </Button>
          <div className="invoice-total">
            <Field label="Due" htmlFor="bm-due">
              <Select id="bm-due" value={due} onChange={(e) => setDue(e.target.value)}>
                <option value="0">On receipt</option>
                <option value="7">In 7 days</option>
                <option value="14">In 14 days</option>
                <option value="30">In 30 days</option>
              </Select>
            </Field>
            <div className="invoice-total__amount">
              <span className="text-small">Estimated total</span>
              <span className="billing-summary__amount">{formatCentsExact(estimate)}</span>
            </div>
          </div>
          <Field label="Note to client" htmlFor="bm-note">
            <Input id="bm-note" value={note} placeholder="Thank you for your business!" onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      ) : (
        <>
          <div className="form-grid">
            <Field label="Plan name" htmlFor="bm-plan">
              <Input id="bm-plan" value={plan} onChange={(e) => setPlan(e.target.value)} />
            </Field>
            <Field label="Amount" htmlFor="bm-amt">
              <Input id="bm-amt" type="number" min={0} step="0.01" mono value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Bill every" htmlFor="bm-int">
              <Select id="bm-int" value={interval} options={BILLING_INTERVALS} onChange={(e) => setInterval(e.target.value as BillingInterval)} />
            </Field>
            <Field label="Free trial" htmlFor="bm-trial">
              <Select id="bm-trial" value={trial} onChange={(e) => setTrial(e.target.value)}>
                <option value="0">No trial</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </Select>
            </Field>
          </div>
          <div className="inset inset--soft text-body">
            {Number(trial) ? `After a ${trial}-day free trial, ` : ""}
            {client ? contactName(client) : "The client"} will be billed {formatCents(dollarsToCents(amount))} every {interval.toLowerCase()} until
            cancelled. They can start the plan from Billing in their portal.
          </div>
        </>
      )}

      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
