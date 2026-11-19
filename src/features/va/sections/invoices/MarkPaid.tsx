"use client";

import { useState } from "react";
import { Button, ConfirmDialog, Icon } from "@/components/ui";
import type { InvoiceClient, VaInvoiceRow } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { todayIso } from "@/utils/format/dates";
import { useSetInvoiceStatus } from "@/utils/hooks/useVaInvoices";
import { clientLabel } from "../../lib/time";

/** The note shown wherever a VA marks invoices paid: GoCWGL tracks client payments from it. */
export const TRACKING_NOTE =
  "GoCWGL uses this to track client payments. When a client pays you, mark that invoice as paid the same day.";

/** Sent and not paid yet, oldest due date first (no due date last). */
export function unpaidInvoices(rows: VaInvoiceRow[]): VaInvoiceRow[] {
  return rows
    .filter((i) => i.status === "sent")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.number.localeCompare(b.number));
}

/** Past its due date and still unpaid. */
export const isOverdue = (i: VaInvoiceRow, today = todayIso()) => i.status === "sent" && !!i.dueDate && i.dueDate < today;

/** What the confirmation shows about the invoice. */
type PayableInvoice = { id: string; number: string; amountCents: number; client?: InvoiceClient | null; dueDate?: string | null };

/**
 * The client paid this invoice. Asks first (invoice, client and amount), so a stray click doesn't mark it paid: GoCWGL
 * tracks client payments from it.
 */
export function MarkPaidButton({ invoice: inv, size = "sm", label = "Mark paid" }: { invoice: PayableInvoice; size?: "sm" | "md"; label?: string }) {
  const status = useSetInvoiceStatus();
  const [asking, setAsking] = useState(false);
  const client = clientLabel(inv.client);
  return (
    <>
      <Button size={size} variant="primary" onClick={() => setAsking(true)}>
        <Icon name="check" size={13} /> {label}
      </Button>
      {asking && (
        <ConfirmDialog
          title={`Mark ${inv.number} as paid?`}
          confirmLabel="Yes, it’s paid"
          icon="check"
          pending={status.isPending}
          error={status.error}
          onConfirm={() => status.mutate({ id: inv.id, status: "paid" }, { onSuccess: () => setAsking(false) })}
          onClose={() => {
            status.reset();
            setAsking(false);
          }}
        >
          <dl className="paid-confirm">
            <div>
              <dt>Client</dt>
              <dd>{client}</dd>
            </div>
            <div>
              <dt>Invoice</dt>
              <dd>{inv.number}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd className="paid-confirm__amt">{formatCentsExact(inv.amountCents)}</dd>
            </div>
          </dl>
          <p className="paid-confirm__ask">
            Only confirm once <strong>{formatCentsExact(inv.amountCents)}</strong> from {client} is in your account.
          </p>
          <p className="paid-confirm__why">
            <Icon name="shield" size={13} /> GoCWGL uses this to track client payments. If you mark it by mistake, open the invoice and choose Mark unpaid.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
