"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Icon, IconButton, IconTile, Input, Modal, SegmentedControl, Select } from "@/components/ui";
import { PAYMENT_PROVIDERS, PLAN_PRICE, type InvoiceItem, type Subscription } from "@/data/admin";
import { addDays } from "@/lib/dates";
import { formatMoney, newId } from "@/lib/utils";
import { invoiceTotal, providerName } from "../lib/billing";
import { useAdmin } from "../state/AdminContext";

type BillingModalProps = {
  kind: "invoice" | "sub";
  onKind: (kind: "invoice" | "sub") => void;
  onClose: () => void;
  /** Called with the table to show and a confirmation message. */
  onCreated: (view: "subs" | "inv", message: string) => void;
};

/** Create a one-time invoice or a recurring subscription for a client. */
export function BillingModal({ kind, onKind, onClose, onCreated }: BillingModalProps) {
  const { state, update } = useAdmin();
  const connected = PAYMENT_PROVIDERS.filter((p) => state.paymentConnections[p.id]?.connected);

  const [clientId, setClientId] = useState("");
  const [method, setMethod] = useState(connected.some((p) => p.id === state.paymentDefault) ? state.paymentDefault : (connected[0]?.id ?? ""));
  const [items, setItems] = useState<InvoiceItem[]>([{ desc: "", qty: 1, price: "" }]);
  const [due, setDue] = useState("7");
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState("[Your Plan]");
  const [amount, setAmount] = useState(String(PLAN_PRICE));
  const [interval, setInterval] = useState<Subscription["interval"]>("Month");
  const [trial, setTrial] = useState("0");
  const [error, setError] = useState("");

  const isInvoice = kind === "invoice";
  const client = state.contacts.find((c) => String(c.id) === clientId);
  const total = invoiceTotal({ items });
  const patchItem = (i: number, patch: Partial<InvoiceItem>) => {
    setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
    setError("");
  };

  const create = (draft: boolean) => {
    if (!client) return setError("Choose a client first.");

    if (isInvoice) {
      const lines = items.filter((it) => String(it.desc).trim() && Number(it.price) > 0);
      if (!lines.length) return setError("Add at least one line with a description and price.");
      const no = `INV-${1001 + state.invoices.length}`;
      const clean = lines.map((it) => ({ desc: String(it.desc).trim(), qty: Number(it.qty) || 1, price: Number(it.price) }));
      update((s) => ({
        invoices: [{ no, cid: client.id, items: clean, due: due === "0" ? "On receipt" : addDays(Number(due)), status: draft ? "Draft" : "Sent", note }, ...s.invoices],
      }));
      onCreated("inv", draft ? `${no} saved as a draft.` : `${no} (${formatMoney(invoiceTotal({ items: clean }))}) sent to ${client.email}.`);
      return;
    }

    if (!(Number(amount) > 0)) return setError("Enter an amount above zero.");
    if (state.subscriptions.some((x) => x.cid === client.id)) return setError(`${client.name} already has a subscription.`);
    const trialDays = Number(trial);
    update((s) => ({
      subscriptions: [
        ...s.subscriptions,
        {
          id: newId(),
          cid: client.id,
          plan: plan.trim() || "[Your Plan]",
          amount: Number(amount),
          interval,
          next: addDays(trialDays),
          status: trialDays ? "Trial" : "Awaiting payment",
        },
      ],
    }));
    onCreated("subs", `Payment link sent to ${client.email} for ${formatMoney(Number(amount))} per ${interval.toLowerCase()}.`);
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
            <Button variant="accent" onClick={() => create(true)}>
              Save as draft
            </Button>
          )}
          <Button type="submit" variant="primary">
            {isInvoice ? "Send invoice" : "Send payment link"}
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
            options={state.contacts.map((c) => ({ value: String(c.id), label: `${c.name} — ${c.email}` }))}
            onChange={(e) => {
              setClientId(e.target.value);
              setError("");
            }}
          />
        </Field>
        <Field label="Pay with" htmlFor="bm-method">
          <Select
            id="bm-method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={
              connected.length
                ? connected.map((p) => ({ value: p.id, label: providerName(p, state.paymentConnections) }))
                : [{ value: "", label: "Connect a payment method first" }]
            }
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
                value={String(it.desc)}
                placeholder="e.g. Landing page setup"
                onChange={(e) => patchItem(i, { desc: e.target.value })}
              />
              <Input
                className="line-item__qty"
                type="number"
                min={1}
                mono
                aria-label="Quantity"
                value={String(it.qty)}
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
                value={String(it.price)}
                onChange={(e) => patchItem(i, { price: e.target.value })}
              />
              <span className="line-item__total">{formatMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}</span>
              <IconButton
                label="Remove line"
                danger
                onClick={() => setItems(items.length > 1 ? items.filter((_, k) => k !== i) : [{ desc: "", qty: 1, price: "" }])}
              >
                ×
              </IconButton>
            </div>
          ))}
          <Button variant="dashed" size="sm" onClick={() => setItems([...items, { desc: "", qty: 1, price: "" }])}>
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
              <span className="text-small">Total</span>
              <span className="billing-summary__amount">{formatMoney(total)}</span>
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
              <Select id="bm-int" value={interval} options={["Week", "Month", "Quarter", "Year"]} onChange={(e) => setInterval(e.target.value as Subscription["interval"])} />
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
            {client ? client.name : "The client"} gets a secure payment link by email.{" "}
            {Number(trial) ? `After a ${trial}-day free trial, they` : "They"} will be charged {formatMoney(Number(amount) || 0)} every{" "}
            {interval.toLowerCase()} until cancelled.
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
