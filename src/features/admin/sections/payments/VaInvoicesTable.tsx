"use client";

import { useState } from "react";
import { Avatar, Badge, Button, LoadState, Modal } from "@/components/ui";
import { BillingBreakdown, invoiceTotals } from "@/features/va/components/BillingBreakdown";
import { PaymentLines } from "@/features/va/sections/invoices/PaymentLines";
import { hoursLabel } from "@/features/va/sections/invoices/shared";
import { avatarTone } from "@/lib/tones";
import type { StaffVaInvoiceRow } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useStaffVaInvoice, useStaffVaInvoices } from "@/utils/hooks/useVaInvoices";
import { MaintenanceBillingBoard } from "./MaintenanceBillingBoard";

/** What the client pays for an invoice's hours: the VA's invoice plus the training fee taken off it (GoCWGL bills that). */
const grossOf = (i: StaffVaInvoiceRow) => i.amountCents + (i.deductionCents ?? 0);

/**
 * Finance › Billing & invoices › VA invoices: every VA's sent and paid invoices to clients, with the same numbers
 * the VA and the client see: the client's total for the hours, the VA's invoice, and GoCWGL's training fee (first 6
 * months with a client), which GoCWGL bills the client with the maintenance fee.
 */
export function VaInvoicesTable({ onMessage }: { onMessage: (message: string) => void }) {
  const query = useStaffVaInvoices();
  const rows = query.data ?? [];
  const [openId, setOpenId] = useState("");
  const sum = (f: (i: StaffVaInvoiceRow) => number) => rows.reduce((n, i) => n + f(i), 0);
  const training = sum((i) => i.deductionCents ?? 0);

  return (
    <>
      <MaintenanceBillingBoard onMessage={onMessage} />

      <header className="mb-sub">
        <h3 className="mb-sub__title">Invoices VAs sent to clients</h3>
        <span className="text-small">Each VA’s own invoice for their hours, with the $1/hr training fee already taken off.</span>
      </header>
      <div className="va-bill-sum" aria-label="VA invoice totals">
        <div className="va-bill-sum__item">
          <span>Billed to clients for VA hours</span>
          <strong>{formatCentsExact(sum(grossOf))}</strong>
          <small>Hours × each VA’s rate</small>
        </div>
        <div className="va-bill-sum__item">
          <span>To VAs (their invoices)</span>
          <strong>{formatCentsExact(sum((i) => i.amountCents))}</strong>
          <small>{formatCentsExact(sum((i) => (i.status === "paid" ? i.amountCents : 0)))} paid</small>
        </div>
        <div className="va-bill-sum__item va-bill-sum__item--go">
          <span>To GoCWGL (training fee)</span>
          <strong>{formatCentsExact(training)}</strong>
          <small>Bill with each client’s maintenance fee</small>
        </div>
      </div>

      <LoadState query={query} loadingText="Loading VA invoices…" isEmpty={!rows.length} empty="No VA has sent an invoice yet.">
        <table className="data-table data-table--plain billing-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>VA</th>
              <th>Client</th>
              <th>Period</th>
              <th>Hours</th>
              <th className="is-num">Client total</th>
              <th className="is-num">To VA</th>
              <th className="is-num">To GoCWGL</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="is-clickable" onClick={() => setOpenId(i.id)}>
                <td>
                  <button type="button" className="cp-link" onClick={() => setOpenId(i.id)}>
                    {i.number}
                  </button>
                </td>
                <td>
                  <span className="cluster cluster--8">
                    <Avatar name={i.va.name} tone={avatarTone(i.va.id)} size="sm" />
                    {i.va.name}
                  </span>
                </td>
                <td>{i.client ? i.client.company || i.client.name : "—"}</td>
                <td>
                  {formatShort(i.periodStart)} – {formatShort(i.periodEnd)}
                </td>
                <td>{hoursLabel(i.seconds)}</td>
                <td className="is-num u-strong">{formatCentsExact(grossOf(i))}</td>
                <td className="is-num">{formatCentsExact(i.amountCents)}</td>
                <td className="is-num">{i.deductionCents ? formatCentsExact(i.deductionCents) : "—"}</td>
                <td>
                  <StatusBadge i={i} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </LoadState>

      {openId && <StaffVaInvoiceDrawer id={openId} onClose={() => setOpenId("")} />}
    </>
  );
}

function StatusBadge({ i }: { i: StaffVaInvoiceRow }) {
  if (i.status === "paid") return <Badge tone="green" dot>Paid · verified {i.paidAt ? formatShort(i.paidAt) : ""}</Badge>;
  // The client says they paid; the VA verifies it once the money is in their account.
  if (i.clientPaidAt)
    return (
      <Badge tone="sky" dot>
        Client paid {formatShort(i.clientPaidAt)} · VA to verify
      </Badge>
    );
  const late = i.dueDate && i.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <Badge tone={late ? "red" : "amber"} dot>
      {late ? "Overdue" : "Sent"}
      {i.dueDate ? ` · due ${formatShort(i.dueDate)}` : ""}
    </Badge>
  );
}

/** One VA invoice: its lines and the same billing breakdown the VA and client see. */
function StaffVaInvoiceDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useStaffVaInvoice(id);
  const inv = q.data;
  return (
    <Modal
      open
      variant="drawer"
      width={600}
      onClose={onClose}
      titleId="staff-va-invoice"
      kicker="VA INVOICE"
      title={inv ? inv.number : "Invoice"}
      subtitle={
        inv ? `${inv.va.name} → ${inv.client ? inv.client.company || inv.client.name : "client"} · ${formatShort(inv.periodStart)} – ${formatShort(inv.periodEnd)}` : undefined
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <LoadState query={q} loadingText="Loading invoice…">
        {inv && (
          <div className="stack stack--16">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map((l) => (
                  <tr key={`${l.category}-${l.rateCents}`} className={l.deduction ? "is-deduction" : undefined}>
                    <td>{l.category || "Work"}</td>
                    <td>{hoursLabel(l.seconds)}</td>
                    <td>{formatCentsExact(l.rateCents)}/hr</td>
                    <td className="text-strong">{formatCentsExact(l.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <BillingBreakdown totals={invoiceTotals(inv.lines)} audience="staff" />
            {inv.payment && (
              <section className="cp-pay">
                <span className="kicker kicker--sm">VA’S PAYMENT DETAILS</span>
                <strong>{inv.payment.label}</strong>
                <PaymentLines payment={inv.payment} />
              </section>
            )}
            {inv.note && <p className="va-pre">{inv.note}</p>}
          </div>
        )}
      </LoadState>
    </Modal>
  );
}
