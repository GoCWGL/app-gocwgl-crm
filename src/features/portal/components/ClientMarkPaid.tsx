"use client";

import { useState } from "react";
import { Badge, Button, ConfirmDialog, Field, Icon, Input } from "@/components/ui";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useMarkMyInvoicePaid, useUnmarkMyInvoicePaid } from "@/utils/hooks/useBilling";
import { useMarkVaInvoicePaid, useUnmarkVaInvoicePaid } from "@/utils/hooks/useClientWork";

/** What the client sees about an invoice they can mark paid. */
export type ClientPayable = {
  id: string;
  number: string;
  amountCents: number;
  currency?: string;
  clientPaidAt?: string | null;
  clientPaidNote?: string;
};

/** Who checks the payment: the VA for their own invoice, GoCWGL for its invoices. */
type Kind = { kind: "va"; vaName: string } | { kind: "gocwgl" };

const verifier = (k: Kind) => (k.kind === "va" ? k.vaName || "Your VA" : "GoCWGL");

/**
 * Client portal: "Mark as paid" on a sent invoice, with an optional transfer reference, behind a confirmation. Once
 * marked, it shows "Awaiting verification" with Undo until the VA / GoCWGL checks the money came in and verifies it.
 */
export function ClientMarkPaid({ invoice: inv, readOnly, size = "sm", ...who }: { invoice: ClientPayable; readOnly?: boolean; size?: "sm" | "md" } & Kind) {
  const va = useMarkVaInvoicePaid();
  const gocwgl = useMarkMyInvoicePaid();
  const vaUndo = useUnmarkVaInvoicePaid();
  const gocwglUndo = useUnmarkMyInvoicePaid();
  const mark = who.kind === "va" ? va : gocwgl;
  const undo = who.kind === "va" ? vaUndo : gocwglUndo;
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const amount = formatCentsExact(inv.amountCents, inv.currency);
  const by = verifier(who);

  if (inv.clientPaidAt) {
    return (
      <span className="client-paid">
        <Badge tone="sky" dot>
          You marked it paid {formatShort(inv.clientPaidAt)}
        </Badge>
        <span className="text-small client-paid__wait">Waiting for {by} to verify the payment.</span>
        {!readOnly && (
          <Button variant="link" size="sm" disabled={undo.isPending} onClick={() => undo.mutate(inv.id)}>
            {undo.isPending ? "Undoing…" : "Undo"}
          </Button>
        )}
      </span>
    );
  }
  if (readOnly) return null;
  return (
    <>
      <Button size={size} variant="primary" onClick={() => setAsking(true)}>
        <Icon name="check" size={13} /> Mark as paid
      </Button>
      {asking && (
        <ConfirmDialog
          title={`Mark ${inv.number} as paid?`}
          confirmLabel="Yes, I paid it"
          icon="check"
          pending={mark.isPending}
          error={mark.error}
          onConfirm={() => mark.mutate({ id: inv.id, note: note.trim() }, { onSuccess: () => setAsking(false) })}
          onClose={() => {
            mark.reset();
            setAsking(false);
          }}
        >
          <dl className="paid-confirm">
            <div>
              <dt>Invoice</dt>
              <dd>{inv.number}</dd>
            </div>
            <div>
              <dt>Paid to</dt>
              <dd>{by}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd className="paid-confirm__amt">{amount}</dd>
            </div>
          </dl>
          <Field label="Payment reference (optional)" htmlFor={`paid-ref-${inv.id}`} hint="A transfer or transaction ID helps them find your payment.">
            <Input id={`paid-ref-${inv.id}`} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Wise #123456789" />
          </Field>
          <p className="paid-confirm__why">
            <Icon name="shield" size={13} /> {by} is told right away, checks that {amount} came in, and marks it verified. Until then it shows
            as awaiting verification.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
