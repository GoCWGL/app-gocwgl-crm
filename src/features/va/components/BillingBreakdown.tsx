"use client";

import { Icon } from "@/components/ui";
import { formatCentsExact } from "@/utils/format/money";

/** An invoice line as the API sends it; `deduction` marks the training fee taken off. */
export type InvoiceLineLike = { category: string; seconds: number; rateCents: number; amountCents: number; deduction?: boolean };

export type BillingTotals = {
  billableSeconds: number;
  /** Hours × rate, before anything comes off. */
  grossCents: number;
  /** Billable time inside the first 6 months, and the training fee on it. */
  trainingSeconds: number;
  trainingCents: number;
  /** The single rate when every billable entry has the same one (else null: several rates). */
  rateCents: number | null;
  /** The training fee per hour when one applies. */
  feeCents: number | null;
};

/**
 * An invoice's calculation from its lines: the work lines (hours × rate) and the training fee line the server adds
 * for hours in the VA's first 6 months with the client (negative; GoCWGL bills it to the client instead).
 */
export function invoiceTotals(lines: InvoiceLineLike[]): BillingTotals {
  const t: BillingTotals = { billableSeconds: 0, grossCents: 0, trainingSeconds: 0, trainingCents: 0, rateCents: null, feeCents: null };
  const rates = new Set<number>();
  for (const l of lines) {
    if (l.deduction) {
      t.trainingSeconds += l.seconds;
      t.trainingCents += -l.amountCents;
      t.feeCents = -l.rateCents;
    } else {
      t.billableSeconds += l.seconds;
      t.grossCents += l.amountCents;
      if (l.rateCents) rates.add(l.rateCents);
    }
  }
  t.rateCents = rates.size === 1 ? [...rates][0] : null;
  return t;
}

/** "12h 30m". */
const hoursLabel = (secs: number) => {
  const m = Math.round(secs / 60);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

type Audience = "client" | "va" | "staff";

/** The wording for each portal; the numbers are the same everywhere (they come from the invoice's lines). */
const COPY: Record<
  Audience,
  { intro: string; perRate: string; noFee: string; vaInvoice: string; toVa: string; toVaNote: string; goNote: string; total: string; totalNote: string }
> = {
  client: {
    intro: "How this invoice is worked out, and who bills what.",
    perRate: "× each VA’s rate",
    noFee: "None on this invoice",
    vaInvoice: "Your VA’s invoice",
    toVa: "To your VA",
    toVaNote: "Paid directly to your VA",
    goNote: "Training fee, on GoCWGL’s maintenance fee invoice",
    total: "Your total for these hours",
    totalNote: " · your monthly maintenance fee is billed separately",
  },
  va: {
    intro: "How this invoice is worked out: your pay and GoCWGL’s training fee.",
    perRate: "× each client’s rate",
    noFee: "None on this invoice: you keep your full rate",
    vaInvoice: "Your invoice (your pay)",
    toVa: "To you",
    toVaNote: "Paid to you by the client",
    goNote: "Training fee, billed by GoCWGL to the client",
    total: "Client’s total for these hours",
    totalNote: "",
  },
  staff: {
    intro: "The same breakdown the VA and the client see.",
    perRate: "× the VA’s rate",
    noFee: "None on this invoice (past the first 6 months, or an older match)",
    vaInvoice: "VA’s invoice",
    toVa: "To the VA",
    toVaNote: "The client pays the VA directly",
    goNote: "Training fee: add it to this client’s maintenance fee invoice",
    total: "Client’s total for these hours",
    totalNote: " · plus the monthly maintenance fee",
  },
};

/**
 * The calculation and who's billed what, highlighted on VA invoices in all three portals: billable hours × rate, the
 * first-6-months training fee taken off, the VA's invoice, and the split between the VA and GoCWGL. GoCWGL's monthly
 * maintenance fee isn't part of it (it's a flat fee, billed separately).
 */
export function BillingBreakdown({ totals: t, audience }: { totals: BillingTotals; audience: Audience }) {
  const c = COPY[audience];
  const va = t.grossCents - t.trainingCents;
  const rate = t.rateCents != null ? `× ${formatCentsExact(t.rateCents)}/hr` : c.perRate;
  return (
    <section className="bill" aria-label="Billing breakdown">
      <header className="bill__head">
        <span className="bill__icon" aria-hidden="true">
          <Icon name="invoice" size={16} />
        </span>
        <span className="stack stack--2">
          <h3 className="bill__title">Billing breakdown</h3>
          <span className="text-small">{c.intro}</span>
        </span>
      </header>

      <ol className="bill__calc">
        <li>
          <span className="bill__step">Billable hours</span>
          <span className="bill__math">
            {hoursLabel(t.billableSeconds)} {rate}
          </span>
          <strong className="bill__amt">{formatCentsExact(t.grossCents)}</strong>
        </li>
        <li className={t.trainingCents ? "is-minus" : "is-muted"}>
          <span className="bill__step">Training fee (first 6 months)</span>
          <span className="bill__math">{t.trainingCents ? `${hoursLabel(t.trainingSeconds)} × ${formatCentsExact(t.feeCents)}/hr` : c.noFee}</span>
          <strong className="bill__amt">{t.trainingCents ? `− ${formatCentsExact(t.trainingCents)}` : formatCentsExact(0)}</strong>
        </li>
        <li className="is-result">
          <span className="bill__step">{c.vaInvoice}</span>
          <span className="bill__math">
            {formatCentsExact(t.grossCents)} − {formatCentsExact(t.trainingCents)}
          </span>
          <strong className="bill__amt">{formatCentsExact(va)}</strong>
        </li>
      </ol>

      <div className="bill__tiles">
        <div className="bill__tile">
          <span className="bill__label">
            <Icon name="users" size={13} /> {c.toVa}
          </span>
          <strong className="bill__value">{formatCentsExact(va)}</strong>
          <span className="bill__note">{c.toVaNote}</span>
        </div>
        <div className="bill__tile bill__tile--go">
          <span className="bill__label">
            <Icon name="shield" size={13} /> To GoCWGL
          </span>
          <strong className="bill__value">{formatCentsExact(t.trainingCents)}</strong>
          <span className="bill__note">{c.goNote}</span>
        </div>
        <div className="bill__tile bill__tile--total">
          <span className="bill__label">
            <Icon name="invoice" size={13} /> {c.total}
          </span>
          <strong className="bill__value">{formatCentsExact(t.grossCents)}</strong>
          <span className="bill__note">
            {formatCentsExact(va)} + {formatCentsExact(t.trainingCents)}
            {c.totalNote}
          </span>
        </div>
      </div>
    </section>
  );
}
