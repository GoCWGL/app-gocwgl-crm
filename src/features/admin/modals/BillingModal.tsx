"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Field, Icon, IconButton, IconTile, Input, Modal, SegmentedControl, Select, type IconName } from "@/components/ui";
import {
  BILLING_INTERVALS,
  PAYMENT_METHODS,
  isPayUrl,
  paymentMethodLabel,
  type BillingInterval,
  type PaymentMethod,
} from "@/data/admin";
import type { PaymentOptionOut } from "@/utils/api/models";
import { addDaysIso, todayIso } from "@/utils/format/dates";
import { centsToDollars, dollarsToCents, formatCents, formatCentsExact } from "@/utils/format/money";
import { errorMessage, fieldErrors } from "@/utils/errors";
import { useCreateInvoice, useCreatePaymentOption, useCreateSubscription, usePaymentOptions } from "@/utils/hooks/useBilling";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { MaintenanceFeeModal } from "../sections/payments/VaFeeInvoiceModal";
import { contactName } from "../lib/contacts";

type LineDraft = { desc: string; qty: string; price: string };

export type BillingKind = "invoice" | "sub" | "maintenance";

/** Shorter names shown in the preset picker; the invoice line keeps the full name. */
const PRESET_NAMES: Record<string, string> = {
  "Custom CRM - Discounted Price": "Custom CRM",
  "Funnel - Foundation Build": "Foundation Build Funnel",
  "Funnel - Full Bundle": "Full Bundle Funnel",
  "Funnel - VIP Repeat Funnel": "VIP Repeat Funnel",
};

/** One-time products grouped for the product picker. */
function presetGroups(options: PaymentOptionOut[]): { label: string; icon: IconName; options: PaymentOptionOut[] }[] {
  const groups: { label: string; icon: IconName; test: (n: string) => boolean }[] = [
    { label: "CRM", icon: "pipeline", test: (n) => /\bcrm\b/i.test(n) },
    { label: "Funnel", icon: "funnel", test: (n) => /funnel/i.test(n) },
    { label: "Other", icon: "sparkle", test: () => true },
  ];
  const placed = new Set<string>();
  return groups
    .map((g) => {
      const mine = options.filter((o) => !placed.has(o.id) && g.test(o.name));
      mine.forEach((o) => placed.add(o.id));
      return { label: g.label, icon: g.icon, options: mine };
    })
    .filter((g) => g.options.length);
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();


type BillingModalProps = {
  kind: BillingKind;
  onKind: (kind: BillingKind) => void;
  onClose: () => void;
  /** Called with the table to show and a confirmation message. */
  onCreated: (view: "subs" | "inv", message: string) => void;
};

/**
 * Create a one-time invoice (products or your own lines, with the payment method and link), set up a recurring
 * subscription, or bill a VA maintenance fee. A payment that comes in outside the app is recorded with "Mark paid" on the invoice list. Prices and
 * links come from your products (Invoices › Products), so a price change needs no code. Totals are computed by the API.
 */
export function BillingModal({ kind, onKind, onClose, onCreated }: BillingModalProps) {
  const contacts = useAllContacts().data ?? [];
  const options = usePaymentOptions().data ?? [];
  const oneTime = options.filter((o) => !o.interval);
  const plans = options.filter((o) => o.interval);
  const createInvoice = useCreateInvoice();
  const createSub = useCreateSubscription();
  const createOption = useCreatePaymentOption();

  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<LineDraft[]>([{ desc: "", qty: "1", price: "" }]);
  const [due, setDue] = useState("7");
  const [note, setNote] = useState("");
  // No preset plan or price: the team enters what each client's subscription is for and what it costs.
  const [plan, setPlan] = useState("");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState<BillingInterval>("Month");
  const [trial, setTrial] = useState("0");
  const [presetsOpen, setPresetsOpen] = useState(false);
  // Payment details (invoice and subscription).
  const [method, setMethod] = useState<PaymentMethod>("wise");
  const [payUrl, setPayUrl] = useState("");
  const [saveOption, setSaveOption] = useState(true);
  const [error, setError] = useState("");

  const isInvoice = kind === "invoice";
  const isSub = kind === "sub";
  const client = contacts.find((c) => c.id === clientId);
  const lineCents = (it: LineDraft) => Math.max(1, Number(it.qty) || 1) * dollarsToCents(it.price || 0);
  // Preview only: the saved invoice's total comes back from the API as totalCents.
  const estimate = items.reduce((n, it) => n + lineCents(it), 0);
  const patchItem = (i: number, patch: Partial<LineDraft>) => {
    setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
    setError("");
  };
  const filled = items.filter((it) => it.desc.trim() && dollarsToCents(it.price) > 0);
  // The API gives a single line that is exactly a saved option (name and price) that option's link.
  const invoiceMatch =
    filled.length === 1 && Number(filled[0].qty || 1) === 1
      ? oneTime.find((o) => sameName(o.name, filled[0].desc) && o.amountCents === dollarsToCents(filled[0].price))
      : undefined;
  const planMatch = plans.find((o) => sameName(o.name, plan) && o.amountCents === dollarsToCents(amount) && o.interval === interval);
  // A one-line invoice (or a subscription) with a link: offer to save it as a product, unless it already is one.
  const single = isInvoice && filled.length === 1 && Number(filled[0].qty || 1) === 1 ? filled[0] : undefined;
  const customCents = isInvoice ? (single ? dollarsToCents(single.price) : 0) : dollarsToCents(amount || 0);
  const customLabel = isInvoice ? (single?.desc ?? "") : plan;
  const alreadySaved = (isInvoice ? oneTime : plans).some(
    (o) =>
      sameName(o.name, customLabel) &&
      o.amountCents === customCents &&
      o.paymentUrl === payUrl.trim() &&
      o.method === method &&
      (isInvoice || o.interval === interval),
  );
  const canSave = !alreadySaved && payUrl.trim() !== "" && (!isInvoice || !!single);
  const pending = createInvoice.isPending || createSub.isPending || createOption.isPending;
  const onError = (err: unknown) => setError(Object.values(fieldErrors(err))[0] || errorMessage(err));

  const fillFromOption = (o: PaymentOptionOut | undefined) => {
    setError("");
    if (!o) return;
    setMethod(o.method as PaymentMethod);
    setPayUrl(o.paymentUrl);
    if (o.interval) {
      setPlan(o.name);
      setAmount(centsToDollars(o.amountCents));
      setInterval(o.interval as BillingInterval);
    }
  };

  /** Save the entered price and link as a payment option first (when ticked), then run `then`. */
  const withSavedOption = (then: () => void) => {
    if (!(saveOption && canSave)) return then();
    createOption.mutate(
      { name: customLabel.trim(), amountCents: customCents, method, paymentUrl: payUrl.trim(), interval: isSub ? interval : null },
      { onSuccess: then, onError },
    );
  };

  const create = (draft: boolean) => {
    if (!client) return setError("Choose a client first.");
    const dueDate = due === "0" ? null : addDaysIso(todayIso(), Number(due));
    const sentMessage = (iv: { number: string; totalCents: number; currency: string }) =>
      draft ? `${iv.number} saved as a draft.` : `${iv.number} (${formatCentsExact(iv.totalCents, iv.currency)}) sent to ${client.email}.`;

    if (isInvoice) {
      const lines = filled;
      if (!lines.length) return setError("Add at least one line with a description and price.");
      if (payUrl.trim() && !isPayUrl(payUrl)) return setError("The payment link must start with https://");
      withSavedOption(() =>
        createInvoice.mutate(
          {
            contactId: client.id,
            items: lines.map((it) => ({ description: it.desc.trim(), quantity: Math.max(1, Number(it.qty) || 1), unitPriceCents: dollarsToCents(it.price) })),
            dueDate,
            note: note.trim(),
            send: !draft,
            // Empty: a single line that is exactly a saved product gets that product's link (on the server).
            ...(payUrl.trim() && { paymentUrl: payUrl.trim(), paymentMethod: method }),
          },
          { onSuccess: (iv) => onCreated("inv", sentMessage(iv)), onError },
        ),
      );
      return;
    }

    const cents = dollarsToCents(amount);
    if (!plan.trim()) return setError("Enter what the subscription is for.");
    if (!(cents > 0)) return setError("Enter an amount above zero.");
    if (payUrl.trim() && !isPayUrl(payUrl)) return setError("The payment link must start with https://");
    const trialDays = Number(trial);
    withSavedOption(() =>
      createSub.mutate(
        {
          contactId: client.id,
          plan: plan.trim(),
          amountCents: cents,
          interval,
          nextBillingDate: addDaysIso(todayIso(), trialDays),
          status: trialDays ? "Trial" : "Awaiting payment",
          // Empty: the API uses the saved plan's link when one matches.
          ...(payUrl.trim() && { paymentUrl: payUrl.trim(), paymentMethod: method }),
        },
        {
          onSuccess: (sub) =>
            onCreated("subs", `Subscription for ${contactName(client)} created: ${formatCents(sub.amountCents, sub.currency)} per ${sub.interval.toLowerCase()}.`),
          onError,
        },
      ),
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create(false);
  };

  const kindSwitch = (
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
        { value: "maintenance", label: "Maintenance fee" },
      ]}
    />
  );

  const subLink = payUrl.trim() ? `${paymentMethodLabel(method)} link` : planMatch ? `your saved ${paymentMethodLabel(planMatch.method)} link` : "";

  const linkFields = (
    <div className="form-grid">
      <Field label="Payment method" htmlFor="bm-pay-method">
        <Select id="bm-pay-method" value={method} options={PAYMENT_METHODS} onChange={(e) => setMethod(e.target.value as PaymentMethod)} />
      </Field>
      <Field
        label="Payment link"
        htmlFor="bm-pay-url"
        hint={
          isInvoice
            ? invoiceMatch && !payUrl.trim()
              ? `Empty: uses your saved ${paymentMethodLabel(invoiceMatch.method)} link for ${invoiceMatch.name}.`
              : "The Pay button in the invoice email opens this link (e.g. a Wise request for this total). Leave empty to send payment details yourself."
            : planMatch && !payUrl.trim()
              ? `Empty: uses your saved ${paymentMethodLabel(planMatch.method)} link for this plan.`
              : "On every invoice. Leave empty to send payment details yourself."
        }
      >
        <Input
          id="bm-pay-url"
          type="url"
          value={payUrl}
          placeholder="https://wise.com/pay/r/…"
          onChange={(e) => {
            setPayUrl(e.target.value);
            setError("");
          }}
        />
      </Field>
    </div>
  );

  const saveBox = canSave && (
    <Checkbox
      brand
      label={`Save ${customLabel.trim() || "it"} as a product, so you can pick it next time`}
      checked={saveOption}
      onChange={() => setSaveOption(!saveOption)}
    />
  );

  const dueField = (
    <Field label="Due" htmlFor="bm-due" hint="A follow-up email goes out every 2 days until it’s paid.">
      <Select id="bm-due" value={due} onChange={(e) => setDue(e.target.value)}>
        <option value="0">On receipt</option>
        <option value="7">In 7 days</option>
        <option value="14">In 14 days</option>
        <option value="30">In 30 days</option>
      </Select>
    </Field>
  );

  // Maintenance fee: the client's VAs for a month, their hours and the fees (its own form).
  if (kind === "maintenance") {
    return <MaintenanceFeeModal top={kindSwitch} onClose={onClose} onDone={(message) => onCreated("inv", message)} />;
  }

  return (
    <Modal
      open
      width={680}
      onClose={onClose}
      onSubmit={submit}
      titleId="bm-title"
      kicker="BILL A CLIENT"
      title={isInvoice ? "One-time invoice" : "New subscription"}
      subtitle={isInvoice ? "Products or your own lines and prices, with the payment method and link the client pays with." : undefined}
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
            {pending
              ? "Saving…"
              : isInvoice
                  ? "Send invoice"
                  : Number(trial)
                    ? "Create subscription"
                    : "Create and send invoice"}
          </Button>
        </>
      }
    >
      {kindSwitch}
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
        {isSub ? (
          <Field
            label="Product"
            htmlFor="bm-option"
            hint="Fills in the plan, price and link."
          >
            <Select
              id="bm-option"
              value=""
              placeholder={plans.length ? "Choose a product…" : "No products yet"}
              options={plans.map((o) => ({
                value: o.id,
                label: `${o.name} · ${formatCents(o.amountCents)}${o.interval ? ` / ${o.interval.toLowerCase()}` : ""}`,
              }))}
              onChange={(e) => fillFromOption(options.find((o) => o.id === e.target.value))}
            />
          </Field>
        ) : (
          <Field label="Clients pay with" htmlFor="bm-method" hint="Or they pay you directly; then mark it paid.">
            <Input
              id="bm-method"
              readOnly
              value={
                payUrl.trim()
                  ? `The ${paymentMethodLabel(method)} link below`
                  : invoiceMatch
                    ? `${paymentMethodLabel(invoiceMatch.method)} payment link for the ${invoiceMatch.name}`
                    : "Payment details you send them (add a link below to include one)"
              }
            />
          </Field>
        )}
      </div>

      {isInvoice ? (
        <div className="stack stack--8">
          <span className="kicker">LINE ITEMS</span>
          {oneTime.length > 0 && (
            <div className="preset-picker">
              <button
                type="button"
                className="preset-picker__trigger"
                aria-expanded={presetsOpen}
                aria-controls="bm-presets"
                onClick={() => setPresetsOpen(!presetsOpen)}
              >
                <IconTile size="sm" brand>
                  <Icon name="sparkle" size={14} />
                </IconTile>
                <span className="preset-picker__trigger-text">
                  <span className="text-strong">Add a product</span>
                  <span className="text-small text-muted">From your products, at their price</span>
                </span>
                <Icon name={presetsOpen ? "chevronUp" : "chevronDown"} size={16} className="preset-picker__chevron" />
              </button>
              {presetsOpen && (
                <div id="bm-presets" className="preset-picker__panel u-slide-up">
                  {presetGroups(oneTime).map((g) => (
                    <div className="preset-picker__group" key={g.label} role="group" aria-label={g.label}>
                      <span className="preset-picker__group-label">
                        <Icon name={g.icon} size={13} />
                        {g.label}
                      </span>
                      {g.options.map((o) => {
                        const added = items.some((it) => sameName(it.desc, o.name));
                        const line = { desc: o.name, qty: "1", price: centsToDollars(o.amountCents) };
                        return (
                          <button
                            type="button"
                            key={o.id}
                            className="preset-picker__item"
                            data-added={added || undefined}
                            onClick={() => {
                              // Fill the first empty line, or add one.
                              const empty = items.findIndex((it) => !it.desc.trim() && !it.price);
                              setItems(empty >= 0 ? items.map((it, k) => (k === empty ? line : it)) : [...items, line]);
                              if (!payUrl.trim() && o.paymentUrl) {
                                setPayUrl(o.paymentUrl);
                                setMethod(o.method as PaymentMethod);
                              }
                              setPresetsOpen(false);
                              setError("");
                            }}
                          >
                            <span className="preset-picker__item-name">
                              {PRESET_NAMES[o.name] ?? o.name}
                              {/discount/i.test(o.name) && <span className="preset-picker__item-tag">Discounted</span>}
                            </span>
                            <span className="preset-picker__item-price">{formatCents(o.amountCents)}</span>
                            <Icon name={added ? "check" : "plus"} size={14} className="preset-picker__item-icon" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
          <span className="kicker">PAYMENT</span>
          {linkFields}
          <div className="invoice-total">
            {dueField}
            <div className="invoice-total__amount">
              <span className="text-small">Estimated total</span>
              <span className="billing-summary__amount">{formatCentsExact(estimate)}</span>
            </div>
          </div>
          <Field label="Note to client" htmlFor="bm-note">
            <Input id="bm-note" value={note} placeholder="Thank you for your business!" onChange={(e) => setNote(e.target.value)} />
          </Field>
          {saveBox}
        </div>
      ) : (
        <>
          <div className="form-grid">
            <Field label="Plan name" htmlFor="bm-plan" required>
              <Input id="bm-plan" value={plan} placeholder="e.g. VA maintenance fee" onChange={(e) => setPlan(e.target.value)} />
            </Field>
            <Field label="Amount" htmlFor="bm-amt" required>
              <Input id="bm-amt" type="number" min={0} step="0.01" mono value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
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
          {linkFields}
          {saveBox}
          <div className="inset inset--soft text-body">
            {Number(trial) ? `After a ${trial}-day free trial, ` : ""}
            {client ? contactName(client) : "The client"} gets a {formatCents(dollarsToCents(amount))} invoice
            {Number(trial) ? "" : " now"} and then every {interval.toLowerCase()} until it’s cancelled
            {subLink ? `, with ${subLink}` : ""}. Nothing is charged automatically; the client pays each invoice. Unpaid invoices get a
            follow-up every 2 days. You or the client can cancel anytime from Invoices.
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
