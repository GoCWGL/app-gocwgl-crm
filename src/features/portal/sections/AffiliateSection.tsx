"use client";

import { useState } from "react";
import { Badge, Button, Checkbox, ErrorState, FormError, Icon, IconTile, Loading, StatGrid } from "@/components/ui";
import { crmBonusState, formatReferralCode, referralLink, vaBonusState } from "@/data/affiliates";
import { BONUS_DAYS, BONUS_HOURS } from "@/lib/referralBonus";
import { copyToClipboard } from "@/lib/utils";
import type { PortalAffiliateOut } from "@/utils/api/models";
import { errorMessage } from "@/utils/errors";
import { formatShort } from "@/utils/format/dates";
import { formatCents } from "@/utils/format/money";
import { useAcceptAffiliateTerms, useClaimClientCrmBonus, useClaimClientVaBonus, useMyAffiliate } from "@/utils/hooks/useAffiliates";
import { PayoutCard } from "../components/PayoutCard";
import { usePortal } from "../state/PortalContext";

type Referral = PortalAffiliateOut["referrals"][number];
type Money = (cents: number) => string;

/**
 * Affiliate: the client's referral ID, the list of everyone who signed up with it, and how each bonus works.
 * CRM bonus: in progress until the referred client has paid the full price, then the client claims it. VA bonus: a countdown of 30 days of 8+ hours by
 * their hourly VAs, then the client claims it. The GoCWGL team pays both.
 */
export function AffiliateSection() {
  const { notify } = usePortal();
  const query = useMyAffiliate();

  if (query.isPending) return <Loading text="Loading your referrals…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  const a = query.data;
  const money: Money = (cents) => formatCents(cents, a.currency);

  if (!a.unlocked) {
    return (
      <section className="card affiliate-locked">
        <IconTile tone="slate" size="lg">
          <Icon name="lock" size={20} />
        </IconTile>
        <span className="text-strong affiliate-hero__title">You’re not in the affiliate program right now</span>
        <p className="text-small">Contact your GoCWGL team if you think this is a mistake.</p>
      </section>
    );
  }
  const accepted = !!a.termsAcceptedAt;
  const link = referralLink(a.referralCode);

  return (
    <div className="page-stack">
      <section className="card affiliate-hero">
        <div className="cluster cluster--nowrap affiliate-hero__head">
          <IconTile tone="amber" size="lg">
            <Icon name="gift" size={20} />
          </IconTile>
          <div className="stack stack--4 u-grow">
            <span className="text-strong affiliate-hero__title">Refer a business and earn</span>
            <span className="text-small">
              {money(a.customBonusCents)} when they fully pay for a CRM package, and {money(a.clientVaBonusCents)} when they work with VAs on
              the hourly rate.
            </span>
          </div>
        </div>

        {!a.enabled && (
          <div className="notice notice--warning" role="status">
            The referral program is paused right now. New sign-ups won’t be linked to you until it’s back on.
          </div>
        )}

        {accepted && (
          <div className="affiliate-hero__code">
            <div className="stack stack--2">
              <span className="kicker kicker--sm kicker--muted">YOUR REFERRAL ID</span>
              <span className="affiliate-hero__id" aria-label={`Referral ID ${a.referralCode.split("").join(" ")}`}>
                {formatReferralCode(a.referralCode)}
              </span>
            </div>
            <div className="cluster cluster--8">
              <Button
                variant="primary"
                onClick={() => {
                  copyToClipboard(a.referralCode);
                  notify("Referral ID copied.");
                }}
              >
                <Icon name="copy" size={14} /> Copy ID
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  copyToClipboard(link);
                  notify("Sign-up link copied. It fills in your referral ID.");
                }}
              >
                <Icon name="link" size={14} /> Copy sign-up link
              </Button>
            </div>
          </div>
        )}
      </section>

      {!accepted && (
        <>
          <HowItWorks crm={money(a.customBonusCents)} va={money(a.clientVaBonusCents)} />
          <AcceptConditions />
        </>
      )}

      <StatGrid
        items={[
          { label: "Referrals", value: String(a.referrals.length), tone: "cyan" },
          { label: "Bonuses earned", value: money(a.earnedCents), tone: "amber" },
          { label: "Paid to you", value: money(a.paidCents), tone: "green" },
          { label: "To be paid", value: money(a.owedCents), tone: a.owedCents ? "amber" : "slate" },
        ]}
      />

      <section className="card card--table" aria-label="Your referrals">
        <div className="affiliate-list__head">
          <span className="kicker">YOUR REFERRALS · {a.referrals.length}</span>
        </div>
        {a.referrals.length === 0 ? (
          <p className="table-empty">No referrals yet. {accepted ? "Share your referral ID and they’ll show up here once they sign up." : "Accept the conditions above to get your referral ID."}</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table referral-table">
              <thead>
                <tr>
                  <th>Business you referred</th>
                  <th>Joined</th>
                  <th>CRM package bonus</th>
                  <th>VA bonus (hourly rate)</th>
                </tr>
              </thead>
              <tbody>
                {a.referrals.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="stack stack--2">
                        <span className="u-strong u-ink">{r.name || r.email}</span>
                        <span className="text-small">{[r.company, r.email].filter(Boolean).join(" · ")}</span>
                      </div>
                    </td>
                    <td>{formatShort(r.joinedAt)}</td>
                    <td>
                      <CrmBonus r={r} money={money} expected={a.customBonusCents} accepted={accepted} />
                    </td>
                    <td>
                      <VaBonus r={r} money={money} accepted={accepted} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {accepted && (
        <>
          <HowItWorks crm={money(a.customBonusCents)} va={money(a.clientVaBonusCents)} />
          <p className="text-small payout-card__secure">
            <Icon name="check" size={12} strokeWidth={2.6} /> You read and accepted these conditions on {formatShort(a.termsAcceptedAt)}.
          </p>
        </>
      )}

      <PayoutCard
        payout={a.payout}
        bonuses={`${money(a.customBonusCents)} for a fully paid CRM package, and ${money(a.clientVaBonusCents)} for VAs on the hourly rate`}
      />
    </div>
  );
}

/** Where the referred client is with their CRM: in progress until it's fully paid, then Claim. */
function CrmBonus({ r, money, expected, accepted }: { r: Referral; money: Money; expected: number; accepted: boolean }) {
  const claim = useClaimClientCrmBonus();
  const state = crmBonusState(r);
  const amount = money(r.bonusCents ?? expected);
  const monthly = r.crmPaymentsTotal > 1;
  return (
    <div className="stack stack--4">
      <span className="cluster cluster--8">
        <span className="data-table__mono u-strong">{amount}</span>
        <Badge tone={state.tone} dot>
          {state.label}
        </Badge>
      </span>
      {state.key === "progress" &&
        (monthly && r.crmPaymentsPaid > 0 ? (
          <Countdown
            label="CRM payments made"
            done={r.crmPaymentsPaid}
            total={r.crmPaymentsTotal}
            unit="payment"
          />
        ) : (
          <span className="text-small">{r.crm === "invoiced" ? "Invoiced · waiting for full payment" : "Requested a CRM · not invoiced yet"}</span>
        ))}
      {state.key === "earned" && (
        <ClaimBonus referralId={r.id} amount={amount} claim={claim} accepted={accepted} reached={`Fully paid${r.crmPaidAt ? ` ${formatShort(r.crmPaidAt)}` : ""}`} />
      )}
      {state.key === "claimed" && r.claimedAt && <span className="text-small">Claimed {formatShort(r.claimedAt)} · on its way</span>}
      {state.key === "paid" && r.bonusPaidAt && <span className="text-small">Paid to you {formatShort(r.bonusPaidAt)}</span>}
    </div>
  );
}

/** The bar and "18 days to go · 12 of 30 days". */
function Countdown({ label, done, total, unit }: { label: string; done: number; total: number; unit: string }) {
  const left = total - done;
  return (
    <span className="affiliate-count">
      <span className="affiliate-count__bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={label}>
        <span style={{ width: `${(done / total) * 100}%` }} />
      </span>
      <span className="text-small">
        <strong>
          {left} {unit}
          {left === 1 ? "" : "s"} to go
        </strong>{" "}
        · {done} of {total} {unit}s
      </span>
    </span>
  );
}

/** The Claim button for an earned bonus (the portal owner's, once the conditions are accepted). */
function ClaimBonus({
  referralId,
  amount,
  claim,
  accepted,
  reached,
}: {
  referralId: string;
  amount: string;
  claim: ReturnType<typeof useClaimClientVaBonus>;
  accepted: boolean;
  /** What was reached, e.g. "Fully paid Nov 23". */
  reached: string;
}) {
  const { readOnly, isOwner, notify } = usePortal();
  return (
    <>
      <span className="text-small">
        {reached}
        {!accepted ? " · accept the conditions above to claim it" : readOnly || !isOwner ? " · the portal owner can claim it" : ""}
      </span>
      {accepted && !readOnly && isOwner && (
        <span>
          <Button
            variant="primary"
            size="sm"
            disabled={claim.isPending}
            onClick={() => claim.mutate(referralId, { onSuccess: () => notify(`Claimed. Your GoCWGL team will send your ${amount}.`) })}
          >
            <Icon name="gift" size={13} /> {claim.isPending ? "Claiming…" : `Claim ${amount}`}
          </Button>
        </span>
      )}
      {claim.error ? (
        <span className="field__error" role="alert">
          {errorMessage(claim.error)}
        </span>
      ) : null}
    </>
  );
}

/** The countdown to the VA bonus (days with 8+ hours, out of 30), then Claim once it's reached. */
function VaBonus({ r, money, accepted }: { r: Referral; money: Money; accepted: boolean }) {
  const claim = useClaimClientVaBonus();
  const state = vaBonusState(r);
  return (
    <div className="stack stack--4">
      <span className="cluster cluster--8">
        <span className="data-table__mono u-strong">{money(r.vaBonusCents)}</span>
        <Badge tone={state.tone} dot>
          {state.label}
        </Badge>
      </span>
      {state.key === "counting" && <Countdown label={`Days with ${BONUS_HOURS}+ hours`} done={r.vaDays} total={r.vaDaysNeeded} unit="day" />}
      {state.key === "earned" && (
        <ClaimBonus referralId={r.id} amount={money(r.vaBonusCents)} claim={claim} accepted={accepted} reached={`${r.vaDaysNeeded} days reached`} />
      )}
      {state.key === "claimed" && r.vaClaimedAt && <span className="text-small">Claimed {formatShort(r.vaClaimedAt)} · on its way</span>}
      {state.key === "paid" && r.vaBonusPaidAt && <span className="text-small">Paid to you {formatShort(r.vaBonusPaidAt)}</span>}
    </div>
  );
}

/** Required before referring: the portal owner ticks that they've read the conditions, then their referral ID shows. */
function AcceptConditions() {
  const { readOnly, isOwner, notify } = usePortal();
  const accept = useAcceptAffiliateTerms();
  const [read, setRead] = useState(false);
  const allowed = !readOnly && isOwner;
  return (
    <section className="card affiliate-accept" aria-label="Accept the conditions">
      <div className="stack stack--8">
        <span className="kicker">BEFORE YOU START REFERRING</span>
        <Checkbox
          brand
          checked={read}
          disabled={!allowed || accept.isPending}
          onChange={(e) => setRead(e.target.checked)}
          label="I’ve read the conditions to earn above and I understand how the CRM and VA bonuses work, including that project requests don’t count."
        />
        {!allowed && <span className="text-small">Only the portal owner can accept these.</span>}
        <FormError error={accept.error} />
      </div>
      <Button
        variant="primary"
        disabled={!allowed || !read || accept.isPending}
        onClick={() => accept.mutate(undefined, { onSuccess: () => notify("Thanks! Your referral ID is ready to share.") })}
      >
        {accept.isPending ? "Saving…" : "Accept and get my referral ID"}
      </Button>
    </section>
  );
}

/** Notes: what earns each bonus, and what doesn't. */
function HowItWorks({ crm, va }: { crm: string; va: string }) {
  return (
    <section className="affiliate-how" aria-label="How the affiliate program works">
      <article className="card affiliate-how__card">
        <span className="kicker">HOW TO REFER</span>
        <span className="text-strong">Share your referral ID</span>
        <ul className="affiliate-how__list">
          <li>Send your sign-up link, or have them type your ID in the Referral ID field when they create their account.</li>
          <li>Forgot it? They can add it in their account settings within 48 hours of signing up.</li>
          <li>They show up in your referral list, where you follow both bonuses.</li>
        </ul>
      </article>
      <article className="card affiliate-how__card">
        <span className="kicker">CRM PACKAGE · {crm}</span>
        <span className="text-strong">Earned once the CRM is paid in full</span>
        <ul className="affiliate-how__list">
          <li>The client you referred buys a Custom CRM package from GoCWGL.</li>
          <li>Paying once: you earn it when their full payment is verified.</li>
          <li>On a 6- or 12-month plan: you earn it after their last payment, not the first.</li>
          <li>Until then it shows as In progress. Once they’ve fully paid, claim your bonus in the list.</li>
        </ul>
      </article>
      <article className="card affiliate-how__card">
        <span className="kicker">VA · {va}</span>
        <span className="text-strong">
          Earned after {BONUS_DAYS} days of {BONUS_HOURS}+ hours
        </span>
        <ul className="affiliate-how__list">
          <li>The client you referred hires a full-time VA, or several VAs who together work at least {BONUS_HOURS} hours a day.</li>
          <li>
            A day counts when their VAs’ tracked time reaches {BONUS_HOURS} hours. The {BONUS_DAYS} days add up and don’t have to be in a row.
          </li>
          <li>When the countdown ends, claim your bonus in the list.</li>
          <li>
            <strong>Hourly rate only.</strong> Project requests aren’t part of the affiliate program.
          </li>
          <li>One VA bonus per client you refer: the first full-time VA, or the first {BONUS_HOURS} hours a day. More VAs don’t add to it.</li>
        </ul>
      </article>
    </section>
  );
}
