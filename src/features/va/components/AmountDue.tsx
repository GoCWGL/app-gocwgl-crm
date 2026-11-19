"use client";

import { Icon } from "@/components/ui";
import { formatCentsExact } from "@/utils/format/money";
import type { BillingTotals } from "./BillingBreakdown";

/**
 * The amount the client pays the VA, highlighted on VA invoices: billable hours less the training fee, already
 * deducted. For the VA it's the exact amount to put on a payment link (Wise and the like); for the client, the exact
 * amount to pay.
 */
export function AmountDue({ totals: t, audience, vaName }: { totals: BillingTotals; audience: "va" | "client"; vaName?: string }) {
  const due = t.grossCents - t.trainingCents;
  const amount = formatCentsExact(due);
  const deducted = t.trainingCents > 0;
  return (
    <section className="amount-due" aria-label="Amount to pay">
      <div className="amount-due__main">
        <span className="amount-due__label">{audience === "va" ? "Amount the client pays you" : `Amount to pay ${vaName || "your VA"}`}</span>
        <strong className="amount-due__value">{amount}</strong>
        <span className="amount-due__math">
          {deducted ? (
            <>
              {formatCentsExact(t.grossCents)} billable hours <b>− {formatCentsExact(t.trainingCents)} training fee</b> (already deducted)
            </>
          ) : (
            <>No training fee on this invoice: the full {formatCentsExact(t.grossCents)}</>
          )}
        </span>
      </div>
      <p className="amount-due__tip">
        <Icon name="link" size={14} />
        <span>
          {audience === "va" ? (
            <>
              Using a payment link (like Wise)? Set it to exactly <strong>{amount}</strong>
              {deducted ? ", not your full hours total. The training fee is billed to the client by GoCWGL." : "."}
            </>
          ) : (
            <>
              Pay exactly <strong>{amount}</strong>.
              {deducted ? ` The ${formatCentsExact(t.trainingCents)} training fee is not part of this payment: GoCWGL adds it to your maintenance fee invoice.` : ""}
            </>
          )}
        </span>
      </p>
    </section>
  );
}
