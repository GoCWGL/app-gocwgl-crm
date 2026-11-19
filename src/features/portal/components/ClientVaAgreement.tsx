"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Button, Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { TeamVa, VaRequestOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useNextMaintenanceInvoice, useVaRequests, useVaTeam } from "@/utils/hooks/useClientWork";
import {
  VA_MAINTENANCE_FEE_DOLLARS,
  VA_TRAINING_FEE_DOLLARS_PER_HOUR,
  VA_TRAINING_MONTHS,
  agreementOf,
  maintenanceFeeOf,
  trainingFeeActive,
} from "../lib/vaAgreement";

const HOURS = [10, 20, 40] as const;

/** A date-only value ("2027-05-18") as "May 18, 2027", without a time-zone shift. */
const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** One section of the client's VA agreement. */
type Clause = { key: string; icon: IconName; title: string; body: ReactNode };

/**
 * The client's VA agreement, section by section: the monthly maintenance fee by hours, what it pays for, the
 * first-6-months training fee ($1 for each hour the VA works, taken off the VA's invoice and billed by GoCWGL with the
 * fee), the VA's pay, invoices through GoCWGL.com, billing, when to pay and changing the hours. The Request a VA
 * popup and the Agreement page show the same text, laid out differently.
 */
const CLAUSES: Clause[] = [
  {
    key: "fee",
    icon: "dollar",
    title: "Monthly maintenance fee",
    body: (
      <p>
        Each VA you request comes with a monthly maintenance fee paid to GoCWGL, set by the hours they work for you. The fee is not your
        VA’s pay: their salary is separate (see “Your VA’s pay” below).
      </p>
    ),
  },
  {
    key: "for",
    icon: "users",
    title: "What the fee is for",
    body: (
      <>
        <p>
          The maintenance fee keeps your VA <strong>physically and mentally well</strong>, so they stay proactive and keep doing great
          work for you. Remote work can be isolating: many VAs leave the VA world because, working from home, they have little reason
          to go out other than buying groceries. The fee pays for the support and activities that keep them engaged. It includes:
        </p>
        <ul>
          <li>
            <strong>VA maintenance:</strong> keeping your VA active with your business, ongoing training in the latest technology
            (including AI tools), and our team’s support for you and your VA.
          </li>
          <li>
            <strong>VA team building:</strong> regular activities that get VAs out of the house and connected with other VAs.
          </li>
          <li>
            <strong>December raffle bonus:</strong> a raffle every December where VAs win bonuses, to thank them for the year’s work.
          </li>
        </ul>
      </>
    ),
  },
  {
    key: "training",
    icon: "graduation",
    title: `Your first ${VA_TRAINING_MONTHS} months: training and onboarding`,
    body: (
      <>
        <p>
          The first few months with a new VA matter most, so we stay closely involved. For the first {VA_TRAINING_MONTHS} months after
          your VA is matched with you, your maintenance fee includes{" "}
          <strong>${VA_TRAINING_FEE_DOLLARS_PER_HOUR} for each hour your VA works for you</strong>. This covers our team getting your VA
          up to speed on your business and checking in regularly to make sure the two of you are working well together. After{" "}
          {VA_TRAINING_MONTHS} months, you simply pay the maintenance fee above.
        </p>
        <p>
          <strong>This doesn’t increase what you pay for your VA’s hours.</strong> The ${VA_TRAINING_FEE_DOLLARS_PER_HOUR} comes out of
          your VA’s hourly rate: it’s deducted from your VA’s invoice, and GoCWGL includes it on your maintenance fee invoice instead.
        </p>
        <p className="vra-doc__example">
          <strong>For example:</strong> if your VA’s rate is $6 an hour and they work 100 hours in a month, their invoice comes to $600
          less a $100 deduction, so you pay your VA $500. GoCWGL’s invoice then adds that $100 to your maintenance fee. Your total for
          those hours is still $600.
        </p>
      </>
    ),
  },
  {
    key: "pay",
    icon: "card",
    title: "Your VA’s pay",
    body: (
      <p>
        The maintenance fee does <strong>not</strong> include your VA’s salary. You pay your VA separately, for the hours they work,{" "}
        <strong>directly to your VA’s own payment method</strong>. GoCWGL doesn’t collect, hold or pass on your VA’s pay.
      </p>
    ),
  },
  {
    key: "invoices",
    icon: "receipt",
    title: "Your VA’s invoices come through GoCWGL.com",
    body: (
      <p>
        Your VA sends every invoice <strong>through GoCWGL.com</strong>, not through a third-party app (such as PayPal, Wise, Upwork or
        Fiverr invoicing). You’ll find them in your portal. This lets GoCWGL see your VA’s hours and invoices, so we can monitor their
        work, check their invoices are right and step in if anything looks off. If your VA asks you to pay an invoice sent any other
        way, please let us know through Request support.
      </p>
    ),
  },
  {
    key: "billing",
    icon: "invoice",
    title: "Billing",
    body: (
      <>
        <p>
          GoCWGL sends your maintenance fee invoice on <strong>the 1st of every month</strong>. It covers the previous month: your
          maintenance fee, plus the training fee for your VA’s hours that month while they’re in their first {VA_TRAINING_MONTHS} months.
          For example, the invoice you receive on December 1 covers November. You’ll find it in the Invoices menu.
        </p>
        <p>Your VA’s invoices for their hours are separate, and you pay them directly to your VA.</p>
      </>
    ),
  },
  {
    key: "when",
    icon: "calendar",
    title: "When to pay",
    body: (
      <p>
        Pay every invoice <strong>within 3 business days of the invoice date</strong>: GoCWGL’s maintenance fee invoices and your VA’s
        invoices for their hours alike.
      </p>
    ),
  },
  {
    key: "hours",
    icon: "clock",
    title: "Changing the hours",
    body: <p>If you change the hours on your request, the fee changes with them and you’ll be asked to accept this agreement again.</p>,
  },
];

/** The maintenance fee for each number of hours a week (`hours` marks one). */
function FeeTable({ hours }: { hours?: number | null }) {
  return (
    <table className="vra-fees">
      <tbody>
        {HOURS.map((h) => (
          <tr key={h} className={h === hours ? "is-on" : undefined}>
            <td>{h} hours a week</td>
            <td>
              ${VA_MAINTENANCE_FEE_DOLLARS[h]} a month
              <small>
                {" "}
                + ${VA_TRAINING_FEE_DOLLARS_PER_HOUR}/hr of VA time for the first {VA_TRAINING_MONTHS} months
              </small>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The client's VA agreement in the Request a VA popup: compact, scrolling next to the checkbox. `hours` marks a fee row. */
export function ClientVaAgreementTerms({ hours }: { hours?: number | null }) {
  return (
    <div className="vra-doc" tabIndex={0} aria-label="VA agreement">
      {CLAUSES.map((c) => (
        <Fragment key={c.key}>
          <h4>{c.title}</h4>
          {c.body}
          {c.key === "fee" && <FeeTable hours={hours} />}
        </Fragment>
      ))}
    </div>
  );
}

/** Sections that span both columns on the Agreement page, so the others pair up. */
const WIDE = new Set(["for", "training", "hours"]);

/**
 * The client's VA agreement as a full document (VA › Agreement): the fees by hours as pricing cards, then every
 * section as a numbered card, all on the page without a scroll box.
 */
export function ClientVaAgreementDocument() {
  return (
    <article className="cagr-doc" aria-label="GoCWGL VA agreement">
      <section className="cagr-doc__pricing" aria-labelledby="cagr-pricing">
        <header className="cagr-doc__section-head">
          <span className="cagr-doc__num">01</span>
          <h4 id="cagr-pricing">{CLAUSES[0].title}</h4>
        </header>
        <div className="cagr-doc__intro">{CLAUSES[0].body}</div>
        <ul className="cagr-tiers">
          {HOURS.map((h) => (
            <li key={h} className={cn("cagr-tier", h === 20 && "cagr-tier--mid")}>
              <span className="cagr-tier__hours">{h} hours a week</span>
              <span className="cagr-tier__price">
                ${VA_MAINTENANCE_FEE_DOLLARS[h]}
                <small>/ month</small>
              </span>
              <span className="cagr-tier__extra">
                + ${VA_TRAINING_FEE_DOLLARS_PER_HOUR}/hr of VA time for the first {VA_TRAINING_MONTHS} months
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ol className="cagr-clauses">
        {CLAUSES.slice(1).map((c, i) => (
          <li key={c.key} className={cn("cagr-clause", WIDE.has(c.key) && "cagr-clause--wide")}>
            <header className="cagr-clause__head">
              <span className="cagr-clause__icon" aria-hidden="true">
                <Icon name={c.icon} size={16} />
              </span>
              <h4 className="cagr-clause__title">{c.title}</h4>
              <span className="cagr-doc__num">{String(i + 2).padStart(2, "0")}</span>
            </header>
            <div className="cagr-clause__body">{c.body}</div>
          </li>
        ))}
      </ol>
    </article>
  );
}

/** The next 1st of the month, and the month it covers ("December 1, 2026" · "November"). */
function nextBilling(now = new Date()) {
  const on = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    on: on.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    covers: now.toLocaleDateString("en-US", { month: "long" }),
  };
}

const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthName = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
/** Hours to one decimal: "12.5". */
const hours = (seconds: number) => String(Math.round((seconds / 3600) * 10) / 10);

/**
 * When GoCWGL bills: the maintenance fee invoice goes out on the 1st of every month and covers the month before (the
 * maintenance fee plus the training fee for the VA's hours that month). With the amount so far for this month, worked
 * out like GoCWGL's own billing: each VA's fee plus the training fee on their hours, split by VA and by kind of fee.
 * Shown on the VA agreement card and on Invoices.
 */
export function MonthlyBillingNote() {
  const fallback = nextBilling();
  const next = useNextMaintenanceInvoice().data;
  const on = next ? longDay(next.invoiceOn) : fallback.on;
  const covers = next ? monthName(next.month) : fallback.covers;
  const vas = next?.vas ?? [];
  const total = next?.totalCents ?? 0;
  const feeShare = total > 0 && next ? (next.maintenanceFeeCents / total) * 100 : 100;

  return (
    <section className="nxi" aria-labelledby="nxi-title">
      <header className="nxi__head">
        <span className="nxi__icon" aria-hidden="true">
          <Icon name="receipt" size={18} />
        </span>
        <span className="nxi__heading">
          <span className="nxi__kicker">
            <span className="nxi__live" aria-hidden="true" /> Upcoming GoCWGL invoice
          </span>
          <h4 id="nxi-title" className="nxi__title">
            Arrives {on}
          </h4>
          <span className="nxi__sub">
            Covers {covers} · Pay within 3 business days
          </span>
        </span>
        {next && (
          <span className="nxi__amount">
            <span className="nxi__amount-label">So far this month</span>
            <strong>{formatCentsExact(total)}</strong>
          </span>
        )}
      </header>

      {next && vas.length > 0 && (
        <>
          <div className="nxi__split">
            <div className="nxi__bar" aria-hidden="true">
              <span className="nxi__bar-fee" style={{ width: `${feeShare}%` }} />
              <span className="nxi__bar-training" style={{ width: `${100 - feeShare}%` }} />
            </div>
            <ul className="nxi__legend">
              <li>
                <span className="nxi__swatch nxi__swatch--fee" aria-hidden="true" />
                Maintenance fees <strong>{formatCentsExact(next.maintenanceFeeCents)}</strong>
              </li>
              <li>
                <span className="nxi__swatch nxi__swatch--training" aria-hidden="true" />
                Training fees <strong>{formatCentsExact(next.trainingFeeCents)}</strong>
              </li>
            </ul>
          </div>

          <div className="nxi__table" role="table" aria-label={`Upcoming invoice by VA, ${covers}`}>
            <div className="nxi__row nxi__row--head" role="row">
              <span role="columnheader">VA</span>
              <span role="columnheader">Maintenance</span>
              <span role="columnheader">Training</span>
              <span role="columnheader">Amount</span>
            </div>
            {vas.map((v) => (
              <div key={v.vaId} className="nxi__row" role="row">
                <span className="nxi__va" role="cell">
                  <span className="nxi__avatar" aria-hidden="true">
                    {initials(v.name)}
                  </span>
                  <span className="nxi__who">
                    <strong>{v.name}</strong>
                    <small>{v.hoursPerWeek ? `${v.hoursPerWeek} hours a week` : "VA"}</small>
                  </span>
                </span>
                <span className="nxi__cell" role="cell" data-label="Maintenance">
                  {formatCentsExact(v.maintenanceFeeCents)}
                  <small>Monthly fee</small>
                </span>
                <span className="nxi__cell" role="cell" data-label="Training">
                  {v.trainingFeeCents > 0 ? (
                    <>
                      {formatCentsExact(v.trainingFeeCents)}
                      <small>
                        {hours(v.trainingSeconds)} h × {formatCentsExact(v.trainingRateCents ?? 0)}
                      </small>
                    </>
                  ) : (
                    <>
                      <span className="nxi__none">—</span>
                      <small>{v.trainingEndsOn && !trainingFeeActive(v.trainingRateCents, v.trainingEndsOn) ? "Training complete" : "No hours yet"}</small>
                    </>
                  )}
                </span>
                <span className="nxi__cell nxi__cell--total" role="cell" data-label="Amount">
                  {formatCentsExact(v.totalCents)}
                </span>
              </div>
            ))}
            {vas.length > 1 && (
              <div className="nxi__row nxi__row--total" role="row">
                <span role="cell">Total so far</span>
                <span className="nxi__cell" role="cell" data-label="Maintenance">
                  {formatCentsExact(next.maintenanceFeeCents)}
                </span>
                <span className="nxi__cell" role="cell" data-label="Training">
                  {formatCentsExact(next.trainingFeeCents)}
                </span>
                <span className="nxi__cell nxi__cell--total" role="cell" data-label="Amount">
                  {formatCentsExact(total)}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      <p className="nxi__foot">
        <Icon name="clock" size={13} />
        <span>
          Each VA’s monthly maintenance fee, plus ${VA_TRAINING_FEE_DOLLARS_PER_HOUR} for each hour they work in their first{" "}
          {VA_TRAINING_MONTHS} months. The amount grows as your VAs log time this month. Your VAs’ own invoices for their hours are separate.
        </span>
      </p>
    </section>
  );
}

/** What the client pays GoCWGL for one VA: the maintenance fee and the training fee, from the request they filled or the direct match. */
function termsOf(va: TeamVa, requests: VaRequestOut[]) {
  const r = requests
    .filter((x) => x.matchedVa?.id === va.vaId && x.engagement !== "project")
    .sort((a, b) => (b.matchedAt ?? "").localeCompare(a.matchedAt ?? ""))[0];
  const fee = r ? maintenanceFeeOf(r) : null;
  return {
    monthlyCents: fee?.cents ?? va.maintenanceFeeCents ?? null,
    hourlyCents: va.hourlyFeeCents ?? fee?.hourlyCents ?? null,
    endsOn: va.hourlyFeeEndsOn ?? r?.hourlyFeeEndsOn ?? null,
    acceptedAt: r ? (agreementOf(r).agreementAcceptedAt ?? null) : null,
  };
}

/** How far through the first 6 months a VA is: 0–1, and the month it's in ("Month 2 of 6"). */
function progress(since: string, endsOn: string): { share: number; month: number } {
  const start = new Date(since).getTime();
  const end = new Date(`${endsOn}T00:00:00Z`).getTime();
  const share = end > start ? Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) : 1;
  return { share, month: Math.min(VA_TRAINING_MONTHS, Math.floor(share * VA_TRAINING_MONTHS) + 1) };
}

/**
 * Client portal › VA (Request VA and Team): the VA agreement the client accepted, laid out like the VA portal's: the
 * terms at a glance, the full agreement on demand, and for each VA on their team where they are in the first 6 months
 * (maintenance fee plus $1/hr now, the maintenance fee alone after).
 */
export function ClientVaAgreementCard() {
  const [open, setOpen] = useState(false);
  const team = useVaTeam().data ?? [];
  const requests = useVaRequests().data ?? [];
  const accepted = requests
    .map((r) => agreementOf(r).agreementAcceptedAt)
    .filter((x): x is string => !!x)
    .sort()
    .at(-1);

  return (
    <section className="agr" aria-labelledby="client-agr-title">
      <header className="agr__head">
        <span className={cn("agr__seal", accepted && "agr__seal--done")} aria-hidden="true">
          <Icon name={accepted ? "circleCheck" : "clipboard"} size={20} />
        </span>
        <span className="agr__heading">
          <span className="agr__kicker agr__kicker--muted">Your VA agreement</span>
          <h3 id="client-agr-title" className="agr__title">
            {accepted ? `Accepted ${formatShort(accepted)}` : "VA agreement"}
          </h3>
          <span className="agr__sub">
            Each VA comes with a monthly maintenance fee based on their hours. It covers VA maintenance, VA team building and a
            December raffle bonus, to keep your VA well and proactive. During their first {VA_TRAINING_MONTHS} months, it also
            includes ${VA_TRAINING_FEE_DOLLARS_PER_HOUR} per hour for training and onboarding. That amount is deducted from your VA’s
            invoice, so your total for the hours stays the same.
          </span>
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <Icon name={open ? "chevronUp" : "chevronDown"} size={13} /> {open ? "Hide agreement" : "View agreement"}
        </Button>
      </header>

      <dl className="agr-facts">
        <div className="agr-facts__item">
          <dt>Maintenance fee</dt>
          <dd>
            ${VA_MAINTENANCE_FEE_DOLLARS[10]}–${VA_MAINTENANCE_FEE_DOLLARS[40]}
            <small> by hours</small>
          </dd>
        </div>
        <div className="agr-facts__item">
          <dt>Training fee</dt>
          <dd>
            ${VA_TRAINING_FEE_DOLLARS_PER_HOUR}
            <small>/hr of VA time</small>
          </dd>
        </div>
        <div className="agr-facts__item">
          <dt>For</dt>
          <dd>
            {VA_TRAINING_MONTHS}
            <small> months per VA</small>
          </dd>
        </div>
      </dl>

      <MonthlyBillingNote />

      {open && <ClientVaAgreementTerms />}

      {team.length > 0 ? (
        <div className="agr__tiles">
          {team.map((va) => (
            <VaTile key={va.vaId} va={va} requests={requests} />
          ))}
        </div>
      ) : (
        <span className="agr__empty">
          <Icon name="users" size={15} /> When GoCWGL matches you with a VA, they show up here with the day their training fee ends.
        </span>
      )}
    </section>
  );
}

/** "Dwayne G" → "DG". */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Whole days from now until a date-only value (0 once it's passed). */
const daysUntil = (iso: string) => Math.max(0, Math.ceil((new Date(`${iso}T00:00:00Z`).getTime() - Date.now()) / 86_400_000));

/** A monthly amount: "$45.00 / month", or "Not set" when there's no maintenance fee on file. */
function Monthly({ cents }: { cents: number | null }) {
  if (cents == null) return <span className="cva-tile__amount cva-tile__amount--unset">Not set</span>;
  return (
    <span className="cva-tile__amount">
      {formatCentsExact(cents)}
      <small>/ month</small>
    </span>
  );
}

/**
 * One VA: where they are in the first 6 months (a six-step track and the day it ends), and what GoCWGL bills for them
 * now and after.
 */
function VaTile({ va, requests }: { va: TeamVa; requests: VaRequestOut[] }) {
  const t = termsOf(va, requests);
  const inTraining = trainingFeeActive(t.hourlyCents, t.endsOn);
  const p = inTraining && t.endsOn ? progress(va.since, t.endsOn) : null;
  return (
    <article className={cn("cva-tile", p ? "is-training" : "is-full")}>
      <header className="cva-tile__head">
        <span className="cva-tile__avatar" aria-hidden="true">
          {initials(va.name)}
        </span>
        <span className="cva-tile__who">
          <strong>{va.name}</strong>
          <span>Matched {formatShort(va.since)}</span>
        </span>
        <span className="cva-tile__status">
          <span className="cva-tile__dot" aria-hidden="true" />
          {p ? "Training period" : "Maintenance only"}
        </span>
      </header>

      {p && t.endsOn && (
        <div className="cva-tile__track">
          <div className="cva-tile__track-head">
            <span>
              Month <strong>{p.month}</strong> of {VA_TRAINING_MONTHS}
            </span>
            <span>{daysUntil(t.endsOn)} days left</span>
          </div>
          <div
            className="cva-tile__steps"
            role="progressbar"
            aria-label={`First ${VA_TRAINING_MONTHS} months with ${va.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(p.share * 100)}
          >
            {Array.from({ length: VA_TRAINING_MONTHS }, (_, i) => {
              const fill = Math.min(1, Math.max(0, p.share * VA_TRAINING_MONTHS - i));
              return (
                <span key={i} className="cva-tile__step">
                  <span style={{ width: `${fill > 0 ? Math.max(12, fill * 100) : 0}%` }} />
                </span>
              );
            })}
          </div>
        </div>
      )}

      <dl className={cn("cva-tile__bill", !p && "cva-tile__bill--single")}>
        {p && t.endsOn ? (
          <>
            <div className="cva-tile__col">
              <dt>Now · training</dt>
              <dd>
                <Monthly cents={t.monthlyCents} />
                {t.hourlyCents ? (
                  <span className="cva-tile__extra">
                    + {formatCentsExact(t.hourlyCents)} / VA hour
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="cva-tile__col cva-tile__col--next">
              <dt>After training</dt>
              <dd>
                <Monthly cents={t.monthlyCents} />
                <span className="cva-tile__extra">
                  <Icon name="calendar" size={11} /> From {formatDay(t.endsOn)}
                </span>
              </dd>
            </div>
          </>
        ) : (
          <div className="cva-tile__col cva-tile__col--next">
            <dt>{t.acceptedAt ? `Agreed ${formatShort(t.acceptedAt)}` : "Maintenance fee"}</dt>
            <dd>
              <Monthly cents={t.monthlyCents} />
              <span className="cva-tile__extra">Training period complete</span>
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}
