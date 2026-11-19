"use client";

import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
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

/** "May 18, 2027". */
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** The client's first-6-months training period, when it's still running (VA portal). */
export type TrainingPeriod = { endsOn: string; daysLeft: number; feeCents: number };

type Audience = "client" | "va" | "staff";

/** The wording for each portal; the numbers are the same everywhere (they come from the invoice's lines). */
const COPY: Record<
  Audience,
  { title: string; intro: string; rate: string; noFee: string; result: string; toVa: string; toVaNote: string; goNote: string; total: string; totalNote: string }
> = {
  client: {
    title: "Billing summary",
    intro: "How this invoice is worked out, and who bills what.",
    rate: "each VA’s rate",
    noFee: "Not charged on these hours",
    result: "Your VA’s invoice",
    toVa: "You pay your VA",
    toVaNote: "Directly, using the payment details on this invoice",
    goNote: "Added to your monthly maintenance fee invoice",
    total: "Your total for these hours",
    totalNote: "Your monthly maintenance fee is billed separately.",
  },
  va: {
    title: "Your pay",
    intro: "Your billable hours, less GoCWGL’s training fee.",
    rate: "each client’s rate",
    noFee: "Not charged: you keep your full rate",
    result: "Your invoice total",
    toVa: "The client pays you",
    toVaNote: "Directly, using your payment details",
    goNote: "Billed by GoCWGL to the client. Not paid by you.",
    total: "Client’s total for these hours",
    totalNote: "",
  },
  staff: {
    title: "Billing summary",
    intro: "The same breakdown the VA and the client see.",
    rate: "the VA’s rate",
    noFee: "Not charged (past the first 6 months, or an older match)",
    result: "VA’s invoice total",
    toVa: "Client pays the VA",
    toVaNote: "Directly, outside GoCWGL",
    goNote: "Add it to this client’s maintenance fee invoice",
    total: "Client’s total for these hours",
    totalNote: "Plus the monthly maintenance fee.",
  },
};

/**
 * The calculation and who's billed what on VA invoices in all three portals, as a short statement: billable hours ×
 * rate, less the first-6-months training fee, gives the VA's invoice; then who pays whom. In the VA portal `period`
 * adds how long the training fee still applies for this client. GoCWGL's monthly maintenance fee isn't part of it.
 */
export function BillingBreakdown({ totals: t, audience, period }: { totals: BillingTotals; audience: Audience; period?: TrainingPeriod | null }) {
  const c = COPY[audience];
  const va = t.grossCents - t.trainingCents;
  const rate = t.rateCents != null ? `${formatCentsExact(t.rateCents)}/hr` : c.rate;
  const fee = formatCentsExact(t.feeCents ?? period?.feeCents ?? 100);
  const feeDetail = t.trainingCents
    ? `${hoursLabel(t.trainingSeconds)} × ${fee}/hr${period ? ` · until ${dayLabel(period.endsOn)}` : " · first 6 months with the client"}`
    : period
      ? `${fee}/hr on billable hours until ${dayLabel(period.endsOn)}`
      : c.noFee;

  return (
    <section className="bill" aria-label={c.title}>
      <header className="bill__head">
        <span className="bill__icon" aria-hidden="true">
          <Icon name="invoice" size={15} />
        </span>
        <span className="bill__heading">
          <h3 className="bill__title">{c.title}</h3>
          <span className="bill__intro">{c.intro}</span>
        </span>
        {period && (
          <span className={cn("bill__period", period.daysLeft <= 30 && "is-soon")} title={`Training fee ends ${dayLabel(period.endsOn)}`}>
            <Icon name="calendar" size={12} />
            <span>
              <b>{period.daysLeft}</b> {period.daysLeft === 1 ? "day" : "days"} left of training fee
            </span>
          </span>
        )}
      </header>

      <dl className="bill__rows">
        <div className="bill__row">
          <dt>
            Billable hours
            <small>
              {hoursLabel(t.billableSeconds)} × {rate}
            </small>
          </dt>
          <dd>{formatCentsExact(t.grossCents)}</dd>
        </div>
        <div className={cn("bill__row", t.trainingCents ? "is-minus" : "is-zero")}>
          <dt>
            GoCWGL training fee
            <small>{feeDetail}</small>
          </dt>
          <dd>{t.trainingCents ? `− ${formatCentsExact(t.trainingCents)}` : formatCentsExact(0)}</dd>
        </div>
        <div className="bill__row is-total">
          <dt>{c.result}</dt>
          <dd>{formatCentsExact(va)}</dd>
        </div>
      </dl>

      <div className="bill__split">
        <div className="bill__party">
          <span className="bill__label">{c.toVa}</span>
          <strong>{formatCentsExact(va)}</strong>
          <small>{c.toVaNote}</small>
        </div>
        <div className="bill__party">
          <span className="bill__label">GoCWGL training fee</span>
          <strong>{formatCentsExact(t.trainingCents)}</strong>
          <small>{c.goNote}</small>
        </div>
      </div>

      <p className="bill__foot">
        <span>
          {c.total}: <b>{formatCentsExact(t.grossCents)}</b>
        </span>
        {c.totalNote && <span>{c.totalNote}</span>}
      </p>
    </section>
  );
}
