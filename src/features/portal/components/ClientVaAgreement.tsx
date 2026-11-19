"use client";

import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { TeamVa, VaRequestOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useVaRequests, useVaTeam } from "@/utils/hooks/useClientWork";
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

/**
 * The client's VA agreement, as they read it before requesting a VA (Request a VA) and on the VA menu's overview:
 * the monthly maintenance fee by hours, the first-6-months training fee ($1 for each hour the VA works, taken off
 * the VA's invoice and billed by GoCWGL with the fee), the VA's pay, billing and when to pay. `hours` marks a row.
 */
export function ClientVaAgreementTerms({ hours }: { hours?: number | null }) {
  return (
    <div className="vra-doc" tabIndex={0} aria-label="VA agreement">
      <h4>Monthly maintenance fee</h4>
      <p>
        Each VA you request comes with a monthly maintenance fee paid to GoCWGL, set by the hours they work for you. The fee is not your
        VA’s pay: their salary is separate (see “Your VA’s pay” below).
      </p>
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
      <h4>What the fee is for</h4>
      <p>
        The maintenance fee keeps your VA <strong>physically and mentally well</strong>, so they stay proactive and keep doing great work
        for you. Remote work can be isolating: many VAs leave the VA world because, working from home, they have little reason to go
        out other than buying groceries. The fee pays for the support and activities that keep them engaged. It includes:
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
      <h4>Your first {VA_TRAINING_MONTHS} months: training and onboarding</h4>
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
        less a $100 deduction, so you pay your VA $500. GoCWGL’s invoice then adds that $100 to your maintenance fee. Your total for those
        hours is still $600.
      </p>
      <h4>Your VA’s pay</h4>
      <p>
        The maintenance fee does <strong>not</strong> include your VA’s salary. You pay your VA separately, for the hours they work,{" "}
        <strong>directly to your VA’s own payment method</strong>. Your VA sends you their invoices, and you’ll find them in your
        portal. GoCWGL doesn’t collect, hold or pass on your VA’s pay.
      </p>
      <h4>Billing</h4>
      <p>
        GoCWGL sends your maintenance fee invoice on <strong>the 1st of every month</strong>. It covers the previous month: your
        maintenance fee, plus the training fee for your VA’s hours that month while they’re in their first {VA_TRAINING_MONTHS} months.
        For example, the invoice you receive on December 1 covers November. You’ll find it in the Invoices menu.
      </p>
      <p>Your VA’s invoices for their hours are separate, and you pay them directly to your VA.</p>
      <h4>When to pay</h4>
      <p>
        Pay every invoice <strong>within 3 business days of the invoice date</strong>: GoCWGL’s maintenance fee invoices and your VA’s
        invoices for their hours alike.
      </p>
      <h4>Changing the hours</h4>
      <p>If you change the hours on your request, the fee changes with them and you’ll be asked to accept this agreement again.</p>
    </div>
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

/**
 * When GoCWGL bills: the maintenance fee invoice goes out on the 1st of every month and covers the month before (the
 * maintenance fee plus the training fee for the VA's hours that month). Shown on the VA agreement card and on Invoices.
 */
export function MonthlyBillingNote() {
  const next = nextBilling();
  return (
    <div className="bill-note" role="note">
      <span className="bill-note__icon" aria-hidden="true">
        <Icon name="calendar" size={16} />
      </span>
      <span className="stack stack--2">
        <strong>Your maintenance fee invoice arrives on the 1st of every month</strong>
        <span className="text-small">
          It covers the previous month: your maintenance fee, plus ${VA_TRAINING_FEE_DOLLARS_PER_HOUR} for each hour your VA worked
          that month while they’re in their first {VA_TRAINING_MONTHS} months. Your next one arrives on <strong>{next.on}</strong> and
          covers {next.covers}.
        </span>
      </span>
    </div>
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

/** "$45/mo" (+ "$1/hr"), or "Not set" when there's no maintenance fee on file. */
function Fee({ cents, hourly }: { cents: number | null; hourly?: number | null }) {
  if (cents == null && !hourly) return <strong className="agr-tile__unset">Not set</strong>;
  return (
    <strong>
      {cents != null ? formatCentsExact(cents) : "—"}
      <em>/mo</em>
      {hourly ? (
        <>
          {" "}
          + {formatCentsExact(hourly)}
          <em>/hr</em>
        </>
      ) : null}
    </strong>
  );
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

/** One VA: where they are in the first 6 months, what GoCWGL bills for them now, and after. */
function VaTile({ va, requests }: { va: TeamVa; requests: VaRequestOut[] }) {
  const t = termsOf(va, requests);
  const inTraining = trainingFeeActive(t.hourlyCents, t.endsOn);
  const p = inTraining && t.endsOn ? progress(va.since, t.endsOn) : null;
  return (
    <div className={cn("agr-tile", !inTraining && "agr-tile--full")}>
      <div className="agr-tile__top">
        <span className="agr-tile__avatar" aria-hidden="true">
          {va.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="agr-tile__who">
          <strong>{va.name}</strong>
          <span>Matched {formatShort(va.since)}</span>
        </span>
        <span className={cn("agr-tile__chip", inTraining ? "is-monitoring" : "is-full")}>
          {p ? `Month ${p.month} of ${VA_TRAINING_MONTHS}` : "Maintenance fee only"}
        </span>
      </div>
      {p && (
        <div
          className="agr-tile__bar"
          role="progressbar"
          aria-label={`First ${VA_TRAINING_MONTHS} months with ${va.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p.share * 100)}
        >
          <span style={{ width: `${Math.max(4, p.share * 100)}%` }} />
        </div>
      )}
      <div className="agr-tile__pay">
        {inTraining && t.endsOn ? (
          <>
            <span className="agr-tile__rate">
              <small>Now</small>
              <Fee cents={t.monthlyCents} hourly={t.hourlyCents} />
            </span>
            <Icon name="arrowRight" size={14} className="agr-tile__arrow" />
            <span className="agr-tile__rate agr-tile__rate--next">
              <small>From {formatDay(t.endsOn)}</small>
              <Fee cents={t.monthlyCents} />
            </span>
          </>
        ) : (
          <span className="agr-tile__rate agr-tile__rate--next">
            <small>{t.acceptedAt ? `Agreed ${formatShort(t.acceptedAt)}` : "Maintenance fee"}</small>
            <Fee cents={t.monthlyCents} />
          </span>
        )}
      </div>
    </div>
  );
}
