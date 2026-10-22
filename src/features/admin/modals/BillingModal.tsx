"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Icon, IconButton, IconTile, Input, Modal, SegmentedControl, Select } from "@/components/ui";
import { BILLING_INTERVALS, HOSTING_PLAN, type BillingInterval } from "@/data/admin";
import { CRM_PACKAGES } from "@/data/portal";
import { addDaysIso, todayIso } from "@/utils/format/dates";
import { centsToDollars, dollarsToCents, formatCents, formatCentsExact } from "@/utils/format/money";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useCreateInvoice, useCreateSubscription } from "@/utils/hooks/useBilling";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { contactName } from "../lib/contacts";

type LineDraft = { desc: string; qty: string; price: string };

export type BillingKind = "invoice" | "paid" | "sub";

/** How a recorded payment came in; saved at the start of the invoice's note. */
const PAID_BY = ["Bank transfer", "Cash", "Check", "Card (in person)", "Other"];

/** One-click lines for CRM work, which is invoiced personally rather than through Polar. */
const QUICK_LINES: LineDraft[] = [
  { desc: CRM_PACKAGES.simple.label + " build", qty: "1", price: centsToDollars(CRM_PACKAGES.simple.priceCents) },
  { desc: CRM_PACKAGES.custom.label + " build", qty: "1", price: centsToDollars(CRM_PACKAGES.custom.priceCents) },
];

/** A single CRM build line at its list price is paid with that build's Wise link (set by the API). */
const isWiseBuild = (lines: LineDraft[]) =>
  lines.length === 1 && QUICK_LINES.some((q) => q.desc === lines[0].desc.trim() && dollarsToCents(q.price) === dollarsToCents(lines[0].price) && Number(lines[0].qty) === 1);

type BillingModalProps = {
  kind: BillingKind;
  onKind: (kind: BillingKind) => void;
  onClose: () => void;
  /** Called with the table to show and a confirmation message. */
  onCreated: (view: "subs" | "inv", message: string) => void;
};

/**
 * Create a one-time invoice, record a payment taken outside the app (saved as a Paid invoice the client sees in
 * Transactions; nothing is emailed), or set up a recurring subscription. Totals are computed by the API.
 */
export function BillingModal({ kind, onKind, onClose, onCreated }: BillingModalProps) {
  const contacts = useAllContacts().data ?? [];
  const createInvoice = useCreateInvoice();
  const createSub = useCreateSubscription();

  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<LineDraft[]>([{ desc: "", qty: "1", price: "" }]);
  const [due, setDue] = useState("7");
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState(HOSTING_PLAN.plan);
  const [amount, setAmount] = useState(centsToDollars(HOSTING_PLAN.amountCents));
  const [interval, setInterval] = useState<BillingInterval>(HOSTING_PLAN.interval);
  const [trial, setTrial] = useState("0");
  const [paidOn, setPaidOn] = useState(todayIso());
  const [paidBy, setPaidBy] = useState(PAID_BY[0]);
  const [markClientPaid, setMarkClientPaid] = useState(true);
  const [error, setError] = useState("");

  const isPaid = kind === "paid";
  const isInvoice = kind === "invoice" || isPaid;
  const client = contacts.find((c) => c.id === clientId);
  const lineCents = (it: LineDraft) => (Math.max(1, Number(it.qty) || 1)) * dollarsToCents(it.price || 0);
  // Preview only: the saved invoice's total comes back from the API as totalCents.
  const estimate = items.reduce((n, it) => n + lineCents(it), 0);
  const patchItem = (i: number, patch: Partial<LineDraft>) => {
    setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
    setError("");
  };
  const isWiseHosting =
    plan.trim() === HOSTING_PLAN.plan && dollarsToCents(amount) === HOSTING_PLAN.amountCents && interval === HOSTING_PLAN.interval;
  const filled = items.filter((it) => it.desc.trim() && dollarsToCents(it.price) > 0);
  const pending = createInvoice.isPending || createSub.isPending;
  const onError = (err: unknown) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err));

  const create = (draft: boolean) => {
    if (!client) return setError("Choose a client first.");

    if (isInvoice) {
      const lines = filled;
      if (!lines.length) return setError("Add at least one line with a description and price.");
      if (isPaid && !paidOn) return setError("Choose the date it was paid.");
      createInvoice.mutate(
        {
          contactId: client.id,
          items: lines.map((it) => ({ description: it.desc.trim(), quantity: Math.max(1, Number(it.qty) || 1), unitPriceCents: dollarsToCents(it.price) })),
          dueDate: isPaid || due === "0" ? null : addDaysIso(todayIso(), Number(due)),
          note: isPaid ? [`Paid by ${paidBy.toLowerCase()}`, note.trim()].filter(Boolean).join(". ") : note.trim(),
          send: !draft && !isPaid,
          ...(isPaid && { paidOn, markClientPaid }),
        },
        {
          onSuccess: (iv) =>
            onCreated(
              "inv",
              isPaid
                ? `${iv.number} (${formatCentsExact(iv.totalCents, iv.currency)}) recorded as paid. It shows in ${contactName(client)}’s Transactions.`
                : draft
                  ? `${iv.number} saved as a draft.`
                  : `${iv.number} (${formatCentsExact(iv.totalCents, iv.currency)}) sent to ${client.email}.`,
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
        plan: plan.trim() || HOSTING_PLAN.plan,
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
      kicker={isPaid ? "RECORD A PAYMENT" : "BILL A CLIENT"}
      title={isPaid ? "Record a paid invoice" : isInvoice ? "New invoice" : "New subscription"}
      subtitle={isPaid ? "For payments you took yourself, like a CRM build paid by bank transfer. Nothing is emailed to the client." : undefined}
      media={
        <IconTile brand size="lg">
          <Icon name="invoice" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {isInvoice && !isPaid && (
            <Button variant="accent" onClick={() => create(true)} disabled={pending}>
              Save as draft
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : isPaid ? "Record paid invoice" : isInvoice ? "Send invoice" : Number(trial) ? "Create subscription" : "Create and send invoice"}
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
          { value: "paid", label: "Paid invoice" },
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
        {isPaid ? (
          <Field label="Paid by" htmlFor="bm-paid-by">
            <Select id="bm-paid-by" value={paidBy} options={PAID_BY} onChange={(e) => setPaidBy(e.target.value)} />
          </Field>
        ) : (
          <Field label="Clients pay with" htmlFor="bm-method" hint="Or they pay you directly; then mark it paid.">
            <Input
              id="bm-method"
              readOnly
              value={
                isInvoice
                  ? isWiseBuild(filled)
                    ? `Wise payment link for the ${filled[0].desc.trim()}`
                    : "Polar checkout, from their Transactions"
                  : isWiseHosting
                    ? "Wise payment link, on every invoice"
                    : "Polar checkout, on every invoice"
              }
            />
          </Field>
        )}
      </div>

      {isInvoice ? (
        <div className="stack stack--8">
          <span className="kicker">LINE ITEMS</span>
          <div className="cluster cluster--6">
            {QUICK_LINES.map((q) => (
              <Button
                key={q.desc}
                size="sm"
                variant="outline"
                onClick={() => {
                  // Fill the first empty line, or add one.
                  const empty = items.findIndex((it) => !it.desc.trim() && !it.price);
                  setItems(empty >= 0 ? items.map((it, k) => (k === empty ? q : it)) : [...items, q]);
                  setError("");
                }}
              >
                + {q.desc} · {formatCents(dollarsToCents(q.price))}
              </Button>
            ))}
          </div>
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
            {isPaid ? (
              <Field label="Paid on" htmlFor="bm-paid-on" required>
                <Input id="bm-paid-on" type="date" max={todayIso()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
              </Field>
            ) : (
              <Field label="Due" htmlFor="bm-due" hint="A follow-up email goes out every 2 days until it’s paid.">
                <Select id="bm-due" value={due} onChange={(e) => setDue(e.target.value)}>
                  <option value="0">On receipt</option>
                  <option value="7">In 7 days</option>
                  <option value="14">In 14 days</option>
                  <option value="30">In 30 days</option>
                </Select>
              </Field>
            )}
            <div className="invoice-total__amount">
              <span className="text-small">{isPaid ? "Amount paid" : "Estimated total"}</span>
              <span className="billing-summary__amount">{formatCentsExact(estimate)}</span>
            </div>
          </div>
          <Field label="Note to client" htmlFor="bm-note" hint={isPaid ? `Shown as “Paid by ${paidBy.toLowerCase()}. …” in their Transactions.` : undefined}>
            <Input id="bm-note" value={note} placeholder="Thank you for your business!" onChange={(e) => setNote(e.target.value)} />
          </Field>
          {isPaid && (
            <Checkbox
              brand
              label="Move the client to Paid (an active client, so you can start their build)"
              checked={markClientPaid}
              onChange={() => setMarkClientPaid(!markClientPaid)}
            />
          )}
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
            {client ? contactName(client) : "The client"} gets a {formatCents(dollarsToCents(amount))} invoice
            {Number(trial) ? "" : " now"} and then every {interval.toLowerCase()} until it’s cancelled
            {isWiseHosting ? ", with the Wise payment link" : ""}. Nothing is charged automatically; the client pays each invoice. Unpaid
            invoices get a follow-up every 2 days. You or the client can cancel anytime from Transactions.
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
