"use client";

import { useState } from "react";
import { Button, ConfirmDialog, Icon } from "@/components/ui";
import type { InvoiceClient, VaInvoiceRow } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { todayIso } from "@/utils/format/dates";
import { formatShort } from "@/utils/format/dates";
import { useRejectClientPaid, useSetInvoiceStatus } from "@/utils/hooks/useVaInvoices";
import { clientLabel } from "../../lib/time";

/** The note shown wherever a VA marks invoices paid: GoCWGL tracks client payments from it. */
export const TRACKING_NOTE =
  "GoCWGL uses this to track client payments. When a client pays you, mark that invoice as paid the same day.";

/** Sent and not paid yet: the ones the client marked paid (to verify) first, then oldest due date (no due date last). */
export function unpaidInvoices(rows: VaInvoiceRow[]): VaInvoiceRow[] {
  return rows
    .filter((i) => i.status === "sent")
    .sort(
      (a, b) =>
        Number(!a.clientPaidAt) - Number(!b.clientPaidAt) ||
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
        a.number.localeCompare(b.number),
    );
}

/** Sent, and the client marked it paid in their portal: check the money and verify it. */
export const toVerify = (i: { status: string; clientPaidAt?: string | null }) => i.status === "sent" && !!i.clientPaidAt;

/** Past its due date and still unpaid (not counting ones the client says they paid). */
export const isOverdue = (i: VaInvoiceRow, today = todayIso()) => i.status === "sent" && !i.clientPaidAt && !!i.dueDate && i.dueDate < today;

/** The status badge: Draft · Sent · Overdue · Client paid, verify · Paid (verified). */
export function invoiceBadge(i: VaInvoiceRow, today = todayIso()): { label: string; tone: "slate" | "sky" | "green" | "red" | "amber" } {
  if (toVerify(i)) return { label: "Client paid · verify", tone: "amber" };
  if (isOverdue(i, today)) return { label: "Overdue", tone: "red" };
  if (i.status === "paid") return { label: "Paid · verified", tone: "green" };
  return { label: i.status === "draft" ? "Draft" : "Sent", tone: i.status === "draft" ? "slate" : "sky" };
}

/** What the confirmation shows about the invoice. */
type PayableInvoice = {
  id: string;
  number: string;
  amountCents: number;
  client?: InvoiceClient | null;
  dueDate?: string | null;
  clientPaidAt?: string | null;
  clientPaidNote?: string;
};

/**
 * The client paid this invoice. Asks first (invoice, client and amount), so a stray click doesn't mark it paid: GoCWGL
 * tracks client payments from it.
 */
export function MarkPaidButton({ invoice: inv, size = "sm", label = "Mark paid" }: { invoice: PayableInvoice; size?: "sm" | "md"; label?: string }) {
  const status = useSetInvoiceStatus();
  const [asking, setAsking] = useState(false);
  const client = clientLabel(inv.client);
  // The client already marked it paid: this is the VA confirming the money came in.
  const verify = !!inv.clientPaidAt;
  return (
    <>
      <Button size={size} variant="primary" onClick={() => setAsking(true)}>
        <Icon name={verify ? "shield" : "check"} size={13} /> {verify ? "Verify payment" : label}
      </Button>
      {asking && (
        <ConfirmDialog
          title={verify ? `Verify the payment for ${inv.number}?` : `Mark ${inv.number} as paid?`}
          confirmLabel={verify ? "Yes, it’s in my account" : "Yes, it’s paid"}
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
            {inv.clientPaidAt && (
              <div>
                <dt>Client marked paid</dt>
                <dd>{formatShort(inv.clientPaidAt)}</dd>
              </div>
            )}
            {inv.clientPaidNote && (
              <div>
                <dt>Their reference</dt>
                <dd>{inv.clientPaidNote}</dd>
              </div>
            )}
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

/**
 * The client marked it paid but the money isn't in your account: it goes back to waiting for payment (the client sees
 * Mark as paid again). Asks first.
 */
export function NotReceivedButton({ invoice: inv, size = "sm" }: { invoice: PayableInvoice; size?: "sm" | "md" }) {
  const reject = useRejectClientPaid();
  const [asking, setAsking] = useState(false);
  const client = clientLabel(inv.client);
  return (
    <>
      <Button size={size} variant="outline" onClick={() => setAsking(true)}>
        Not received
      </Button>
      {asking && (
        <ConfirmDialog
          title={`Payment for ${inv.number} not received?`}
          confirmLabel="Not received yet"
          icon="circleX"
          pending={reject.isPending}
          error={reject.error}
          onConfirm={() => reject.mutate(inv.id, { onSuccess: () => setAsking(false) })}
          onClose={() => {
            reject.reset();
            setAsking(false);
          }}
        >
          <p className="paid-confirm__ask">
            {client} marked this invoice paid, but {formatCentsExact(inv.amountCents)} isn’t in your account yet. It goes back to waiting for
            payment, and {client} can mark it paid again.
          </p>
          <p className="paid-confirm__why">
            <Icon name="shield" size={13} /> Payments can take a day or two to arrive. Message {client} before choosing this.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

/** On an invoice the client marked paid: when, their reference, and what to do next. */
export function ClientPaidNotice({ invoice: inv, size = "md" }: { invoice: PayableInvoice & { status: string }; size?: "sm" | "md" }) {
  if (!toVerify(inv)) return null;
  const client = clientLabel(inv.client);
  return (
    <section className="client-paid-notice">
      <Icon name="circleCheck" size={18} />
      <span className="client-paid-notice__body">
        <strong>
          {client} marked this paid on {formatShort(inv.clientPaidAt)}
        </strong>
        {inv.clientPaidNote && <span>Reference: {inv.clientPaidNote}</span>}
        <span className="text-small">Check that {formatCentsExact(inv.amountCents)} is in your account, then verify the payment.</span>
      </span>
      <span className="client-paid-notice__actions">
        <NotReceivedButton invoice={inv} size={size} />
        <MarkPaidButton invoice={inv} size={size} />
      </span>
    </section>
  );
}
