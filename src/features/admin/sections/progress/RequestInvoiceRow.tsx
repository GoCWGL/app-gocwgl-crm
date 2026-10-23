"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import type { Tone } from "@/lib/tones";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";

/** What a request card needs to know about its invoice. */
export type RequestInvoice = {
  number: string;
  status: string;
  totalCents: number;
  paidAt?: string | null;
  /** Null when it was issued without an email (the client chose Pay now). */
  lastEmailedAt?: string | null;
  paymentUrl?: string | null;
};

/** Invoice status as the team reads it: "Sent" means the client hasn't paid yet. */
const LABELS: Record<string, { label: string; tone: Tone }> = {
  Sent: { label: "Awaiting payment", tone: "amber" },
  Overdue: { label: "Overdue", tone: "red" },
  Paid: { label: "Paid", tone: "green" },
  Draft: { label: "Not sent", tone: "neutral" },
  Void: { label: "Void", tone: "slate" },
};
const isOpen = (status: string) => status === "Sent" || status === "Overdue" || status === "Draft";

type Confirm = "" | "send" | "paid";

/**
 * The INVOICE line on a funnel or CRM request: whether it was sent and paid, with Send / Resend and Mark paid.
 * Both act on the client (an email, or moving the request along), so each takes a second click.
 */
export function RequestInvoiceRow({
  invoice,
  email,
  newInvoiceLabel,
  canWrite,
  busy,
  sending,
  onSend,
  onMarkPaid,
}: {
  invoice: RequestInvoice | null;
  email: string;
  /** What "Send invoice" creates when there's no invoice yet, e.g. "$15,000 Custom CRM"; omit when it can't create one. */
  newInvoiceLabel?: string;
  canWrite: boolean;
  busy: boolean;
  sending: boolean;
  onSend: () => void;
  onMarkPaid: () => void;
}) {
  const [confirm, setConfirm] = useState<Confirm>("");
  const status = invoice ? (LABELS[invoice.status] ?? { label: invoice.status, tone: "neutral" as Tone }) : null;
  const open = !!invoice && isOpen(invoice.status);
  const emailed = !!invoice?.lastEmailedAt;
  const canSend = canWrite && (open || (!invoice && !!newInvoiceLabel));
  const canMarkPaid = canWrite && open;
  const to = email ? ` to ${email}` : "";

  const question =
    confirm === "send"
      ? invoice
        ? `Email ${invoice.number}${to}${emailed ? " again" : ""}?`
        : `Email a ${newInvoiceLabel} invoice${to}?`
      : invoice
        ? `Mark ${invoice.number} (${formatCents(invoice.totalCents)}) as paid?`
        : "";

  return (
    <div className="cluster cluster--8 crm-request__invoice">
      <span className="kicker kicker--sm kicker--muted">INVOICE</span>
      {invoice && status ? (
        <>
          <span className="text-strong">{invoice.number}</span>
          <span className="text-small">
            {formatCents(invoice.totalCents)}
            {invoice.paidAt
              ? ` · paid ${formatShort(invoice.paidAt)}`
              : emailed
                ? ` · emailed ${formatShort(invoice.lastEmailedAt)}`
                : " · not emailed yet"}
            {invoice.paymentUrl && " · Wise link included"}
          </span>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </>
      ) : (
        <span className="text-small">Not sent yet</span>
      )}

      {(canSend || canMarkPaid) && (
        <>
          <span className="u-spacer" />
          {confirm ? (
            <>
              <span className="text-small">{question}</span>
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setConfirm("");
                  if (confirm === "send") onSend();
                  else onMarkPaid();
                }}
              >
                {confirm === "send" ? (emailed ? "Yes, resend" : "Yes, send invoice") : "Yes, mark paid"}
              </Button>
              <Button size="sm" onClick={() => setConfirm("")}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {canSend && (
                <Button variant={emailed ? "outline" : "accent"} size="sm" disabled={busy} onClick={() => setConfirm("send")}>
                  {sending ? "Sending…" : emailed ? "Resend invoice" : invoice ? "Send invoice" : `Send invoice · ${newInvoiceLabel}`}
                </Button>
              )}
              {canMarkPaid && (
                <Button size="sm" disabled={busy} onClick={() => setConfirm("paid")} title="When their Wise payment has arrived">
                  Mark paid
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
