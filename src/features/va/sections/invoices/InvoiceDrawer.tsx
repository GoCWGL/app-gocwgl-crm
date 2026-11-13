"use client";

import { useState } from "react";
import { Badge, Button, FormError, Icon, LoadState, Modal } from "@/components/ui";
import type { VaInvoiceDetail } from "@/utils/api/models";
import { formatLong, formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useDeleteInvoice, useInvoice, useSetInvoiceStatus } from "@/utils/hooks/useVaInvoices";
import { clientLabel } from "../../lib/time";
import { STATUS, hoursLabel, kindLabel, periodLabel } from "./shared";

/** One invoice as the client sees it, with what can be done next (send, mark paid, delete a draft, print). */
export function InvoiceDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useInvoice(id);
  const inv = query.data;
  const status = useSetInvoiceStatus();
  const remove = useDeleteInvoice();
  const [confirm, setConfirm] = useState(false);
  const set = (s: "draft" | "sent" | "paid") => status.mutate({ id, status: s });

  return (
    <Modal
      open
      variant="drawer"
      width={760}
      onClose={onClose}
      titleId="va-invoice"
      kicker="INVOICE"
      title={inv?.number ?? "Invoice"}
      subtitle={inv ? `${clientLabel(inv.client)} · ${periodLabel(inv.periodStart, inv.periodEnd)}` : undefined}
      footer={
        inv && (
          <>
            {inv.status === "draft" &&
              (confirm ? (
                <Button variant="danger-solid" disabled={remove.isPending} onClick={() => remove.mutate(id, { onSuccess: onClose })}>
                  Yes, delete draft
                </Button>
              ) : (
                <Button variant="danger" onClick={() => setConfirm(true)}>
                  Delete draft
                </Button>
              ))}
            {inv.status === "sent" && (
              <Button variant="link" disabled={status.isPending} onClick={() => set("draft")}>
                Back to draft
              </Button>
            )}
            <span className="u-spacer" />
            <Button variant="outline" onClick={() => window.print()}>
              <Icon name="download" size={13} /> Print / PDF
            </Button>
            {inv.status === "draft" && (
              <Button variant="primary" disabled={status.isPending} onClick={() => set("sent")}>
                <Icon name="send" size={13} /> Mark as sent
              </Button>
            )}
            {inv.status === "sent" && (
              <Button variant="primary" disabled={status.isPending} onClick={() => set("paid")}>
                <Icon name="check" size={13} /> Mark as paid
              </Button>
            )}
            {inv.status === "paid" && (
              <Button variant="outline" disabled={status.isPending} onClick={() => set("sent")}>
                Mark unpaid
              </Button>
            )}
          </>
        )
      }
    >
      <FormError error={status.error ?? remove.error} />
      <LoadState query={query} loadingText="Loading invoice…">
        {inv && <InvoiceDoc inv={inv} />}
      </LoadState>
    </Modal>
  );
}

function InvoiceDoc({ inv }: { inv: VaInvoiceDetail }) {
  return (
    <article className="invoice-doc">
      <header className="invoice-doc__head">
        <span className="stack stack--4">
          <span className="invoice-doc__title">INVOICE</span>
          <span className="invoice-doc__number">{inv.number}</span>
        </span>
        <Badge tone={STATUS[inv.status].tone} dot>
          {STATUS[inv.status].label}
          {inv.status === "paid" && inv.paidAt ? ` · ${formatShort(inv.paidAt)}` : ""}
        </Badge>
      </header>

      <div className="invoice-doc__parties">
        <div>
          <span className="invoice-doc__label">From</span>
          <strong>{inv.fromName}</strong>
          <span>{inv.fromEmail}</span>
        </div>
        <div>
          <span className="invoice-doc__label">Bill to</span>
          <strong>{clientLabel(inv.client)}</strong>
          {inv.client?.company && <span>{inv.client.name}</span>}
          {inv.client?.email && <span>{inv.client.email}</span>}
        </div>
        <div>
          <span className="invoice-doc__label">Details</span>
          <span>Issued: {inv.sentAt ? formatLong(inv.sentAt) : "Not sent yet"}</span>
          <span>Due: {inv.dueDate ? formatLong(inv.dueDate) : "—"}</span>
          <span>Period: {periodLabel(inv.periodStart, inv.periodEnd)}</span>
        </div>
      </div>

      <table className="invoice-doc__lines">
        <thead>
          <tr>
            <th>Description</th>
            <th className="is-num">Hours</th>
            <th className="is-num">Rate</th>
            <th className="is-num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l) => (
            <tr key={`${l.category}-${l.rateCents}`}>
              <td>{l.category}</td>
              <td className="is-num">{hoursLabel(l.seconds)}</td>
              <td className="is-num">{formatCentsExact(l.rateCents)}/hr</td>
              <td className="is-num">{formatCentsExact(l.amountCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td className="is-num">{hoursLabel(inv.seconds)}</td>
            <td />
            <td className="is-num invoice-doc__total">{formatCentsExact(inv.amountCents)}</td>
          </tr>
        </tfoot>
      </table>

      {inv.payment && (
        <div className="invoice-doc__pay">
          <span className="invoice-doc__label">How to pay · {kindLabel(inv.payment.kind)}</span>
          <strong>{inv.payment.label}</strong>
          {inv.payment.accountName && <span>Account name: {inv.payment.accountName}</span>}
          {inv.payment.details && <span className="va-pre">{inv.payment.details}</span>}
        </div>
      )}
      {inv.note && (
        <div className="invoice-doc__note">
          <span className="invoice-doc__label">Note</span>
          <p className="va-pre">{inv.note}</p>
        </div>
      )}
    </article>
  );
}
