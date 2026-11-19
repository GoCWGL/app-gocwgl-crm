"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Checkbox, Field, FormError, Icon, Input, Modal, Select, Textarea } from "@/components/ui";
import { PAYMENT_METHODS, isPayUrl, paymentMethodLabel, type PaymentMethod } from "@/data/admin";
import { hoursLabel } from "@/features/va/sections/invoices/shared";
import type { VaHoursRow } from "@/utils/api/models";
import { addDaysIso, formatLong, todayIso } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useCreateInvoice, usePaymentOptions } from "@/utils/hooks/useBilling";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useVaHours } from "@/utils/hooks/useVaInvoices";
import { contactName } from "../../lib/contacts";

/** One VA on the invoice: whether they're billed, and what their maintenance fee line says it's for. */
type VaPick = { row: VaHoursRow; on: boolean; purpose: string };

/** "November 2026". */
const monthLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** Every VA who worked for the client that month; the ones not invoiced yet (with something to bill) start ticked. */
function picksFor(rows: VaHoursRow[], month: string): VaPick[] {
  const m = monthLabel(month);
  return rows.map((row) => ({
    row,
    on: !row.invoice && row.gocwglTotalCents > 0,
    purpose: `VA maintenance fee · ${row.va.name}${row.hoursPerWeek ? ` (${row.hoursPerWeek} hours a week)` : ""} · ${m}`,
  }));
}

/** The invoice lines for the VAs picked: each one's maintenance fee (with their hours) and training fee. */
function itemsFor(picks: VaPick[], month: string) {
  const m = monthLabel(month);
  return picks.flatMap(({ row, purpose }) => [
    ...(row.maintenanceFeeCents
      ? [{ description: `${purpose.trim() || `VA maintenance fee · ${row.va.name}`} · ${hoursLabel(row.seconds)} logged`, quantity: 1, unitPriceCents: row.maintenanceFeeCents }]
      : []),
    ...(row.trainingFeeCents
      ? [
          {
            description: `VA training fee (first 6 months) · ${row.va.name} · ${hoursLabel(row.trainingSeconds)} × ${formatCentsExact(row.trainingRateCents)}/hr · ${m}`,
            quantity: 1,
            unitPriceCents: row.trainingFeeCents,
          },
        ]
      : []),
  ]);
}

/**
 * Finance › Billing & invoices › VA hours › Create invoice: GoCWGL's monthly invoice to one client, filled in from that
 * month's VA hours (each VA's maintenance fee and the training fee on their first-6-months hours). The admin attaches
 * the payment method and link (a saved payment link, or a new Wise link made for this amount), then sends it or saves
 * a draft. Nothing is sent automatically.
 */
export function VaFeeInvoiceModal({
  client,
  rows,
  month,
  onClose,
  onDone,
  top,
  title,
}: {
  /** Null until a client is picked (Bill a client › Maintenance fee). */
  client: { id: string; name: string } | null;
  rows: VaHoursRow[];
  month: string;
  onClose: () => void;
  onDone: (message: string) => void;
  /** Shown above the calculation: the billing type switch, and the client and month pickers. */
  top?: ReactNode;
  title?: string;
}) {
  const create = useCreateInvoice();
  const options = usePaymentOptions().data ?? [];
  const [picks, setPicks] = useState(() => picksFor(rows, month));
  const setPick = (vaId: string, patch: Partial<VaPick>) => setPicks((xs) => xs.map((x) => (x.row.va.id === vaId ? { ...x, ...patch } : x)));
  const [method, setMethod] = useState<PaymentMethod>("wise");
  const [payUrl, setPayUrl] = useState("");
  const [saved, setSaved] = useState("");
  const [due, setDue] = useState("3");
  const [error, setError] = useState("");
  const m = monthLabel(month);
  const [note, setNote] = useState(
    `Maintenance fee for ${m}. The training fee covers your VA's hours in their first 6 months with you; the same amount was taken off your VA's invoices, so your total for those hours doesn't change.`,
  );

  const picked = picks.filter((x) => x.on);
  const items = itemsFor(picked, month);
  const total = items.reduce((n, l) => n + l.unitPriceCents, 0);
  const training = picked.reduce((n, x) => n + x.row.trainingFeeCents, 0);
  const vaHours = picked.reduce((n, x) => n + x.row.valueCents, 0);
  // Saved payment links, the ones for this exact amount first.
  const savedOptions = options
    .filter((o) => !o.interval)
    .sort((a, b) => Number(b.amountCents === total) - Number(a.amountCents === total))
    .map((o) => ({
      value: o.id,
      label: `${o.name} · ${formatCentsExact(o.amountCents)} · ${paymentMethodLabel(o.method)}${o.amountCents === total ? " (matches)" : ""}`,
    }));

  const send = (draft: boolean) => {
    setError("");
    if (!client) return setError("Choose a client first.");
    if (!picked.length) return setError("Pick at least one VA to bill.");
    if (!items.length) return setError("The VAs picked have nothing to bill for this month.");
    if (!isPayUrl(payUrl)) return setError("Attach the payment link, starting with https:// (for example your Wise link for this amount).");
    create.mutate(
      {
        contactId: client.id,
        items,
        // Which VAs and month this bills, with their hours: Finance › VA hours shows them as invoiced.
        vaBilling: picked.map(({ row }) => ({
          vaId: row.va.id,
          vaName: row.va.name,
          month: month.slice(0, 7),
          seconds: row.seconds,
          billableSeconds: row.billableSeconds,
          trainingSeconds: row.trainingSeconds,
          maintenanceCents: row.maintenanceFeeCents ?? 0,
          trainingCents: row.trainingFeeCents,
          valueCents: row.valueCents,
          hoursPerWeek: row.hoursPerWeek,
        })),
        dueDate: due === "0" ? null : addDaysIso(todayIso(), Number(due)),
        note: note.trim(),
        send: !draft,
        paymentUrl: payUrl.trim(),
        paymentMethod: method,
      },
      {
        onSuccess: (iv) =>
          onDone(draft ? `${iv.number} saved as a draft for ${client.name}.` : `${iv.number} (${formatCentsExact(iv.totalCents)}) sent to ${client.name}.`),
      },
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(false);
  };

  return (
    <Modal
      open
      width={680}
      onClose={onClose}
      onSubmit={submit}
      titleId="va-fee-invoice"
      kicker="MAINTENANCE FEE INVOICE"
      title={title ?? client?.name ?? "Maintenance fee"}
      subtitle={`For ${m}: each VA's maintenance fee, plus the training fee on their hours in the first 6 months.`}
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => send(true)} disabled={create.isPending}>
            Save draft
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            <Icon name="send" size={14} /> {create.isPending ? "Sending…" : `Send ${formatCentsExact(total)}`}
          </Button>
        </>
      }
    >
      <div className="stack stack--16">
        {top}
        <section className="bill" aria-label="Calculation">
          <header className="bill__head">
            <span className="bill__icon" aria-hidden="true">
              <Icon name="invoice" size={16} />
            </span>
            <span className="stack stack--2">
              <h3 className="bill__title">Calculation</h3>
              <span className="text-small">From the VA hours for {m}. Pick the VAs this invoice is for; each line shows their hours.</span>
            </span>
          </header>
          <div className="vfi-explain" role="note">
            <strong>How this invoice works</strong>
            <ol>
              <li>
                <b>The VA’s work</b> is their billable hours × their hourly rate. The client pays this to the VA directly.
              </li>
              <li>
                <b>Training fee:</b> for the VA’s first 6 months with the client, $1.00 of every billable hour is taken off the VA’s invoice and billed
                by GoCWGL instead. The client pays the same in total.
              </li>
              <li>
                <b>This invoice</b> is the VA’s monthly maintenance fee ($25, $45 or $75 by plan) plus that training fee.
              </li>
            </ol>
          </div>
          <div className="vfi-vas">
            {picks.map(({ row, on, purpose }) => (
              <div key={row.va.id} className={on ? "vfi-va is-on" : "vfi-va"}>
                <div className="vfi-va__head">
                  <Checkbox brand checked={on} onChange={(e) => setPick(row.va.id, { on: e.target.checked })} label={<strong>Bill {row.va.name}</strong>} />
                  <span className="vfi-va__hours">
                    <strong>{hoursLabel(row.seconds)}</strong> logged · {hoursLabel(row.billableSeconds)} billable
                    {row.trainingSeconds ? ` · ${hoursLabel(row.trainingSeconds)} in training` : ""}
                  </span>
                </div>
                <PlanHours row={row} month={month} />
                {row.invoice && (
                  <span className="vfi-va__warn">
                    <Icon name="bolt" size={13} /> Already on {row.invoice.number} ({row.invoice.status}, {hoursLabel(row.invoice.billedSeconds)} billed)
                    {row.invoice.billedSeconds !== row.seconds ? `: ${hoursLabel(row.seconds)} logged now` : ""}. Tick to bill again.
                  </span>
                )}
                {on && <VaMath row={row} purpose={purpose} onPurpose={(v) => setPick(row.va.id, { purpose: v })} />}
              </div>
            ))}
          </div>
          <div className="vfi-ledger vfi-ledger--summary">
            <span className="vfi-ledger__title">Summary · {picked.length} VA{picked.length === 1 ? "" : "s"}</span>
            <Line label="Maintenance fees" value={total - training} />
            <Line label="Training fees (first 6 months)" value={training} />
            <Line label="GoCWGL invoice total" value={total} strong />
            <span className="vfi-ledger__rule" />
            <Line label={`Paid by the client to the VA${picked.length === 1 ? "" : "s"} directly`} note={`${formatCentsExact(vaHours)} − ${formatCentsExact(training)} training fee`} value={vaHours - training} muted />
            <Line label={`Client’s total for ${m}`} note="VA invoices + this invoice" value={vaHours - training + total} />
          </div>
          {!picks.length && (
            <span className="text-small">{client ? `No VA worked for ${client.name} in ${m}.` : "Choose a client to see their VAs and hours."}</span>
          )}
        </section>

        <div className="form-grid">
          <Field label="Saved payment link" htmlFor="vfi-saved" hint="Or paste a new link below.">
            <Select
              id="vfi-saved"
              value={saved}
              placeholder={savedOptions.length ? "Pick a saved link…" : "No saved links yet"}
              disabled={!savedOptions.length}
              options={savedOptions}
              onChange={(e) => {
                const o = options.find((x) => x.id === e.target.value);
                setSaved(e.target.value);
                if (o) {
                  setPayUrl(o.paymentUrl);
                  setMethod((PAYMENT_METHODS.some((p) => p.value === o.method) ? o.method : "other") as PaymentMethod);
                }
              }}
            />
          </Field>
          <Field label="Payment method" htmlFor="vfi-method" required>
            <Select id="vfi-method" value={method} options={PAYMENT_METHODS} onChange={(e) => setMethod(e.target.value as PaymentMethod)} />
          </Field>
        </div>
        <Field
          label="Payment link"
          htmlFor="vfi-url"
          required
          hint={`Create a ${paymentMethodLabel(method)} payment request for ${formatCentsExact(total)} and paste its link. The Pay button in the invoice email opens it.`}
        >
          <Input
            id="vfi-url"
            type="url"
            value={payUrl}
            placeholder="https://wise.com/pay/r/…"
            onChange={(e) => {
              setPayUrl(e.target.value);
              setSaved("");
              setError("");
            }}
          />
        </Field>
        <div className="form-grid">
          <Field label="Due" htmlFor="vfi-due">
            <Select
              id="vfi-due"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              options={[
                { value: "0", label: "On receipt" },
                { value: "3", label: "In 3 days" },
                { value: "7", label: "In 7 days" },
              ]}
            />
          </Field>
        </div>
        <Field label="Note to the client" htmlFor="vfi-note">
          <Textarea id="vfi-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <FormError error={error ? new Error(error) : create.error} />
      </div>
    </Modal>
  );
}

/**
 * Finance › Bill a client › Maintenance fee: pick the client and the month, then their VAs (one or several), and send
 * GoCWGL's maintenance fee invoice with the payment method and link. Same form as Finance › VA hours › Create invoice.
 */
export function MaintenanceFeeModal({ top, onClose, onDone }: { top: ReactNode; onClose: () => void; onDone: (message: string) => void }) {
  const contacts = useAllContacts().data ?? [];
  const [clientId, setClientId] = useState("");
  const [month, setMonth] = useState(lastMonth);
  const report = useVaHours(month);
  const rows = (report.data?.rows ?? []).filter((r) => r.client.id === clientId);
  // Clients with VA hours or VAs that month first (they're the ones to bill).
  const withVas = new Set((report.data?.rows ?? []).map((r) => r.client.id));
  const choices = [...contacts]
    .sort((a, b) => Number(withVas.has(b.id)) - Number(withVas.has(a.id)) || contactName(a).localeCompare(contactName(b)))
    .map((c) => ({ value: c.id, label: `${contactName(c)}${withVas.has(c.id) ? " · has VAs" : ""} — ${c.email}` }));
  const c = contacts.find((x) => x.id === clientId);
  const client = c ? { id: c.id, name: c.company || contactName(c) } : null;

  return (
    <VaFeeInvoiceModal
      // Start over when the client, month or their hours change.
      key={`${clientId}-${month}-${report.data ? "1" : "0"}`}
      client={client}
      rows={rows}
      month={report.data?.month ?? `${month}-01`}
      title="Maintenance fee"
      onClose={onClose}
      onDone={onDone}
      top={
        <>
          {top}
          <div className="form-grid">
            <Field label="Client" htmlFor="mf-client" required>
              <Select id="mf-client" value={clientId} placeholder="Choose a client…" options={choices} onChange={(e) => setClientId(e.target.value)} />
            </Field>
            <Field label="Month billed" htmlFor="mf-month" hint={report.data ? `Send on ${formatLong(report.data.invoiceOn)}` : undefined}>
              <Input id="mf-month" type="month" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} />
            </Field>
          </div>
        </>
      }
    />
  );
}

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const thisMonth = () => ym(new Date());
/** The month the invoice on the 1st covers. */
const lastMonth = () => {
  const d = new Date();
  return ym(new Date(d.getFullYear(), d.getMonth() - 1, 1));
};


/** One line of a statement: label (and how it's worked out) on the left, the amount on the right. */
function Line({
  label,
  note,
  value,
  shown,
  strong,
  muted,
  minus,
}: {
  label: ReactNode;
  note?: string;
  value: number;
  /** Shown instead of the amount (e.g. "2.2h"). */
  shown?: string;
  strong?: boolean;
  muted?: boolean;
  minus?: boolean;
}) {
  return (
    <div className={["vfi-line", strong && "is-strong", muted && "is-muted", minus && "is-minus"].filter(Boolean).join(" ")}>
      <span className="vfi-line__label">
        {label}
        {note && <small>{note}</small>}
      </span>
      <span className="vfi-line__value">
        {shown ?? `${minus && value ? "− " : ""}${formatCentsExact(value)}`}
      </span>
    </div>
  );
}

/** Why there's no training fee for a VA this month. */
function noTrainingReason(row: VaHoursRow): string {
  if (row.trainingRateCents == null) return "Not applicable to this VA.";
  if (row.trainingEndsOn && new Date(`${row.trainingEndsOn}T00:00:00Z`) <= new Date()) return "The VA is past their first 6 months with this client.";
  return "No billable hours in the first 6 months.";
}

/** One VA as a short statement: A · their work, B · the training fee, C · who bills what. */
function VaMath({ row, purpose, onPurpose }: { row: VaHoursRow; purpose: string; onPurpose: (v: string) => void }) {
  const rate = row.billableSeconds ? Math.round((row.valueCents * 3600) / row.billableSeconds) : 0;
  const fee = row.maintenanceFeeCents ?? 0;
  const training = row.trainingFeeCents;
  return (
    <div className="vfi-ledger">
      <span className="vfi-ledger__title">A · The VA’s work</span>
      <Line label="Billable hours" value={0} shown={hoursLabel(row.billableSeconds)} muted />
      <Line label="Hourly rate" value={rate} muted />
      <Line label="Amount for the hours" note={`${hoursLabel(row.billableSeconds)} × ${formatCentsExact(rate)} per hour`} value={row.valueCents} />

      <span className="vfi-ledger__title">B · Training fee (first 6 months)</span>
      {training ? (
        <Line label="Training fee" note={`${hoursLabel(row.trainingSeconds)} × ${formatCentsExact(row.trainingRateCents)} per hour`} value={training} />
      ) : (
        <span className="vfi-ledger__none">None this month. {noTrainingReason(row)}</span>
      )}

      <span className="vfi-ledger__title">C · Who bills the client</span>
      <Line
        label={`${row.va.name}’s invoice`}
        note={training ? `${formatCentsExact(row.valueCents)} − ${formatCentsExact(training)} training fee` : "The full amount for the hours"}
        value={row.valueCents - training}
        muted
      />
      {fee ? (
        <div className="vfi-line vfi-line--input">
          <Field label="Maintenance fee (description on the invoice)" htmlFor={`vfi-p-${row.va.id}`}>
            <Input id={`vfi-p-${row.va.id}`} size="sm" value={purpose} onChange={(e) => onPurpose(e.target.value)} />
          </Field>
          <span className="vfi-line__value">{formatCentsExact(fee)}</span>
        </div>
      ) : (
        <Line label="Maintenance fee" note="None on file (open project or not set)" value={0} muted />
      )}
      {training > 0 && <Line label="Training fee" note="From B" value={training} />}
      <Line label={`GoCWGL invoice for ${row.va.name}`} note={`${formatCentsExact(fee)} maintenance + ${formatCentsExact(training)} training`} value={fee + training} strong />
    </div>
  );
}

/** Weeks in the billed month (e.g. 30 days ÷ 7 ≈ 4.29), to turn a weekly plan into the month's planned hours. */
function weeksIn(month: string): number {
  const d = new Date(`${month.slice(0, 7)}-01T12:00:00Z`);
  const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return days / 7;
}

/**
 * The client's plan for this VA (10, 20 or 40 hours a week), what that comes to for the month, and the hours logged
 * against it, so the admin can see at a glance whether the month matches the plan.
 */
function PlanHours({ row, month }: { row: VaHoursRow; month: string }) {
  if (!row.hoursPerWeek) {
    return (
      <div className="vfi-plan is-none">
        <span className="vfi-plan__label">Client’s plan</span>
        <strong>No weekly hours on file</strong>
        <span className="text-small">Open project, or the hours weren’t set when the VA was matched.</span>
      </div>
    );
  }
  const planned = Math.round(row.hoursPerWeek * weeksIn(month) * 3600);
  const share = planned ? Math.min(1.5, row.seconds / planned) : 0;
  const diff = row.seconds - planned;
  const status = Math.abs(diff) <= planned * 0.1 ? "On plan" : diff > 0 ? `${hoursLabel(diff)} over plan` : `${hoursLabel(-diff)} under plan`;
  return (
    <div className="vfi-plan">
      <span className="vfi-plan__label">Client’s plan</span>
      <strong>{row.hoursPerWeek} hours a week</strong>
      <span className="text-small">
        ≈ {hoursLabel(planned)} for the month · {hoursLabel(row.seconds)} logged ({Math.round(share * 100)}%) · {status}
      </span>
      <span className="vfi-plan__bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, share * 100)}%` }} />
      </span>
    </div>
  );
}
